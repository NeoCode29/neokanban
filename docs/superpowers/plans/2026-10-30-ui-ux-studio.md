# UI/UX Studio & Site Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fitur UI/UX Studio di NeoKanban untuk memonitor Peta Halaman (Site Map) dan Katalog Komponen dengan live HTML/CSS/JS preview di sandboxed iframe, visual pin & bounding box review annotations, serta 1-click konversi ke Kanban Card.

**Architecture:** Next.js 15 App Router + Prisma ORM (PostgreSQL) + Sandboxed Iframe (tanpa `allow-same-origin` untuk isolasi sesi) + Canvas overlay responsif persentase (0-100%) untuk anotasi visual pin/box.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma 6.4.1, Lucide React.

## Global Constraints
- Database PostgreSQL berjalan di `localhost:5435` (Docker container `neokanban-postgres`).
- Eksekusi prisma migrate via `npx prisma db push --skip-generate` untuk menghindari conflict file locking engine di dev server Next.js.
- Input string HTML wajib dibersihkan dari null-byte (`\0`) via helper `sanitizeUtf8` untuk menghindari Postgres Error 22021.
- Iframe sandbox tidak boleh menyertakan `allow-same-origin` demi keamanan.

---

### Task 1: Prisma Schema & Database Models

**Files:**
- Modify: `neokanban/prisma/schema.prisma`
- Test: `neokanban/scripts/test-ui-schema.ts`

**Interfaces:**
- Produces: `prisma.uiPage`, `prisma.uiComponent`, `prisma.uiAnnotation`

- [ ] **Step 1: Write test script to verify models exist in Prisma Client**
Create `neokanban/scripts/test-ui-schema.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking UI Studio models...')
  const pageCount = await (prisma as any).uiPage.count()
  const compCount = await (prisma as any).uiComponent.count()
  const annCount = await (prisma as any).uiAnnotation.count()
  console.log(`UiPage: ${pageCount}, UiComponent: ${compCount}, UiAnnotation: ${annCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run test to verify it fails before schema update**
Run: `npx tsx scripts/test-ui-schema.ts`
Expected: FAIL (Cannot read properties of undefined / model not found)

- [ ] **Step 3: Update `prisma/schema.prisma` with UiPage, UiComponent, and UiAnnotation**
Tambahkan model `UiPage`, `UiComponent`, `UiAnnotation` dan update relasi di `Board`, `User`, dan `Card`:
```prisma
model Board {
  // ... existing fields
  uiPages        UiPage[]
  uiComponents   UiComponent[]
}

model User {
  // ... existing fields
  uiAnnotations  UiAnnotation[]
}

model Card {
  // ... existing fields
  uiAnnotations  UiAnnotation[]
}

model UiPage {
  id          String         @id @default(cuid())
  boardId     String
  board       Board          @relation(fields: [boardId], references: [id], onDelete: Cascade)
  title       String
  path        String
  description String?        @db.Text
  status      String         @default("DRAFT")
  htmlContent String         @db.Text
  order       Int            @default(0)
  annotations UiAnnotation[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([boardId])
}

model UiComponent {
  id          String         @id @default(cuid())
  boardId     String
  board       Board          @relation(fields: [boardId], references: [id], onDelete: Cascade)
  name        String
  category    String         @default("General")
  description String?        @db.Text
  htmlContent String         @db.Text
  order       Int            @default(0)
  annotations UiAnnotation[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([boardId])
}

model UiAnnotation {
  id          String       @id @default(cuid())
  pageId      String?
  page        UiPage?      @relation(fields: [pageId], references: [id], onDelete: Cascade)
  componentId String?
  component   UiComponent? @relation(fields: [componentId], references: [id], onDelete: Cascade)
  authorId    String
  author      User         @relation(fields: [authorId], references: [id], onDelete: Cascade)
  type        String       @default("PIN")
  posX        Float
  posY        Float
  width       Float?
  height      Float?
  comment     String       @db.Text
  status      String       @default("OPEN")
  cardId      String?
  card        Card?        @relation(fields: [cardId], references: [id], onDelete: SetNull)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([pageId])
  @@index([componentId])
  @@index([authorId])
  @@index([cardId])
}
```

Jalankan sinkronisasi database:
`npx prisma db push --skip-generate`
`npx prisma generate`

- [ ] **Step 4: Run test to verify it passes**
Run: `npx tsx scripts/test-ui-schema.ts`
Expected: PASS (UiPage: 0, UiComponent: 0, UiAnnotation: 0)

- [ ] **Step 5: Commit**
```bash
git add prisma/schema.prisma scripts/test-ui-schema.ts
git commit -m "feat(db): add UiPage, UiComponent, and UiAnnotation models"
```

---

### Task 2: Backend REST APIs for Pages & Components

**Files:**
- Create: `neokanban/src/app/api/boards/[id]/ui-pages/route.ts`
- Create: `neokanban/src/app/api/boards/[id]/ui-pages/[pageId]/route.ts`
- Create: `neokanban/src/app/api/boards/[id]/ui-components/route.ts`
- Create: `neokanban/src/app/api/boards/[id]/ui-components/[componentId]/route.ts`
- Create: `neokanban/src/app/api/ui-annotations/route.ts`
- Create: `neokanban/src/app/api/ui-annotations/[id]/route.ts`
- Create: `neokanban/src/app/api/ui-annotations/[id]/convert-task/route.ts`
- Test: `neokanban/scripts/test-ui-studio-e2e.ts`

**Interfaces:**
- `GET /api/boards/[id]/ui-pages` -> `{ pages: UiPage[] }`
- `POST /api/boards/[id]/ui-pages` -> `{ page: UiPage }`
- `GET /api/boards/[id]/ui-components` -> `{ components: UiComponent[] }`
- `POST /api/boards/[id]/ui-components` -> `{ component: UiComponent }`
- `POST /api/ui-annotations` -> `{ annotation: UiAnnotation }`
- `POST /api/ui-annotations/[id]/convert-task` -> `{ success: true, card: Card }`

- [ ] **Step 1: Write the failing E2E test suite**
Create `neokanban/scripts/test-ui-studio-e2e.ts`:
```typescript
import { prisma } from '../src/lib/prisma'

async function runTest() {
  console.log('Testing UI Studio Backend Endpoints...')
  // Ambil user dan board testing
  const user = await prisma.user.findFirst()
  const board = await prisma.board.findFirst({
    include: { columns: { orderBy: { order: 'asc' } } }
  })
  if (!user || !board) throw new Error('No user or board found for testing')

  // 1. Test Create UiPage
  const page = await prisma.uiPage.create({
    data: {
      boardId: board.id,
      title: 'Login Page Prototype',
      path: '/login',
      description: 'Halaman autentikasi utama',
      status: 'IN_PROGRESS',
      htmlContent: '<div class="p-8"><button class="bg-blue-500 text-white p-2">Login</button></div>',
    }
  })
  console.log('✓ UiPage created:', page.id)

  // 2. Test Create UiComponent
  const comp = await prisma.uiComponent.create({
    data: {
      boardId: board.id,
      name: 'PrimaryButton',
      category: 'Input',
      description: 'Tombol aksi utama',
      htmlContent: '<button style="background:blue;color:white;padding:8px 16px;">Click Me</button>'
    }
  })
  console.log('✓ UiComponent created:', comp.id)

  // 3. Test Create UiAnnotation (Pin & Box)
  const pin = await prisma.uiAnnotation.create({
    data: {
      pageId: page.id,
      authorId: user.id,
      type: 'PIN',
      posX: 25.5,
      posY: 40.0,
      comment: 'Warna tombol kurang kontras dengan background',
      status: 'OPEN'
    }
  })
  console.log('✓ UiAnnotation PIN created:', pin.id)

  // 4. Test Convert Annotation to Kanban Task
  const targetCol = board.columns[0]
  if (!targetCol) throw new Error('Board has no columns')

  const card = await prisma.card.create({
    data: {
      columnId: targetCol.id,
      title: `[UI Feedback] ${page.title}: ${pin.comment.substring(0, 30)}`,
      description: `Posisi: X ${pin.posX}%, Y ${pin.posY}%\nKomentar: ${pin.comment}`,
      order: 9999
    }
  })
  await prisma.uiAnnotation.update({
    where: { id: pin.id },
    data: { cardId: card.id, status: 'OPEN' }
  })
  console.log('✓ Converted to Kanban Task Card:', card.id)

  // Cleanup
  await prisma.uiPage.delete({ where: { id: page.id } })
  await prisma.uiComponent.delete({ where: { id: comp.id } })
  await prisma.card.delete({ where: { id: card.id } })
  console.log('✓ All Backend & Conversion steps PASSED!')
}

runTest().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Run test to verify model logic**
Run: `npx tsx scripts/test-ui-studio-e2e.ts`
Expected: PASS

- [ ] **Step 3: Implement API Routes with Auth & UTF-8 Sanitization**
Implementasikan seluruh file route API di `src/app/api/boards/[id]/ui-pages/route.ts`, `[pageId]/route.ts`, `ui-components/route.ts`, `ui-annotations/route.ts`, dan `convert-task/route.ts` dengan penanganan otentikasi JWT dan validasi input.

- [ ] **Step 4: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**
```bash
git add src/app/api/boards/[id]/ui-pages src/app/api/boards/[id]/ui-components src/app/api/ui-annotations scripts/test-ui-studio-e2e.ts
git commit -m "feat(api): implement UI/UX studio routes for pages, components, and annotations"
```

---

### Task 3: Interactive Sandbox Preview & Annotation Canvas Component

**Files:**
- Create: `neokanban/src/components/ui-studio/PreviewCanvas.tsx`
- Create: `neokanban/src/components/ui-studio/AnnotationFeed.tsx`
- Create: `neokanban/src/components/ui-studio/AddEditPageModal.tsx`
- Create: `neokanban/src/components/ui-studio/AddEditComponentModal.tsx`

**Interfaces:**
- `PreviewCanvas` menerima `htmlContent`, `annotations`, `mode` (`browse` | `review`), `onAddAnnotation(type, posX, posY, width, height, comment)`
- `AnnotationFeed` menampilkan list issue, status toggle resolved, dan tombol trigger convert-to-task.

- [ ] **Step 1: Build `PreviewCanvas.tsx`**
Komponen canvas dengan viewport selector (Desktop 100%, Tablet 768px, Mobile 375px), sandboxed iframe, dan overlay absolut responsif berkoordinat persentase (0-100%).
Mendukung:
- Click: Menaruh Pin Marker.
- Drag: Menggambar Kotak Bounding Box.
- Visual Pin hover tooltip dan status badge.

- [ ] **Step 2: Build `AnnotationFeed.tsx`**
Sidebar yang menampilkan feed komentar anotasi:
- Filter status (`Semua`, `Terbuka`, `Selesai`).
- Tombol `Tandai Selesai / Resolved`.
- Tombol `Jadikan Task Kanban` yang memanggil `/api/ui-annotations/[id]/convert-task`.
- Tautan ke kartu Kanban jika sudah dikonversi.

- [ ] **Step 3: Build Modal Tambah & Edit Halaman/Komponen**
Form input dengan drag-and-drop file `.html` atau paste teks HTML/CSS/JS langsung.

- [ ] **Step 4: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**
```bash
git add src/components/ui-studio/
git commit -m "feat(ui): add PreviewCanvas, AnnotationFeed, and Studio modals"
```

---

### Task 4: UI/UX Studio View & Board Tab Integration

**Files:**
- Create: `neokanban/src/components/ui-studio/UiStudioView.tsx`
- Modify: `neokanban/src/app/(dashboard)/boards/[id]/page.tsx`

**Interfaces:**
- Menghubungkan Tab `UI/UX Studio` di halaman board detail.
- State management untuk active sub-tab (`pages` vs `components`), selected page/component, fetch list, dan real-time update saat anotasi bertambah atau dikonversi ke task.

- [ ] **Step 1: Create `UiStudioView.tsx`**
Komponen utama yang menyatukan:
- Sub-tab header (Peta Halaman vs Katalog Komponen).
- List panel kiri dengan status badges (`DRAFT`, `IN_PROGRESS`, `READY`) dan filter pencarian.
- Center stage (`PreviewCanvas`).
- Right sidebar (`AnnotationFeed`).

- [ ] **Step 2: Update `boards/[id]/page.tsx`**
Tambahkan tab `ui-studio` dengan ikon `Palette` di samping `Kanban Board`, `Living Context`, `Timeline`, dan `Skills`.

- [ ] **Step 3: End-to-End Verification**
Jalankan verifikasi lengkap:
1. `npx tsc --noEmit`
2. `npx tsx scripts/test-ui-studio-e2e.ts`
Pastikan dev server Next.js tidak ada error runtime.

- [ ] **Step 4: Commit & Push**
```bash
git add src/app/(dashboard)/boards/[id]/page.tsx src/components/ui-studio/UiStudioView.tsx
git commit -m "feat(board): integrate UI/UX Studio tab into board detail view"
git push origin master
```
