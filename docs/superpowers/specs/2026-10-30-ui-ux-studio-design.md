# Design Specification: UI/UX Studio & Site Map Monitoring with Interactive Preview & Annotations

## 1. Overview & Objective
Fitur **UI/UX Studio** adalah modul monitoring visual dan arsitektur antarmuka di dalam NeoKanban. Fitur ini memungkinkan tim produk, desainer, dan developer untuk:
1. Memetakan struktur navigasi aplikasi (**Peta Halaman / Site Map**).
2. Mendokumentasikan dan memonitor kesiapan komponen desain (**Katalog Komponen UI**).
3. Menyimpan konteks kode HTML, CSS, dan JS interaktif sebagai *living prototype* yang dirender secara aman di dalam sandboxed iframe.
4. Melakukan QA visual langsung di atas preview dengan **Pin Marker** dan **Bounding Box Highlight**.
5. Mengubah catatan perbaikan/feedback visual menjadi kartu tugas di Kanban Board secara instan (*Convert to Kanban Task*).

---

## 2. Architecture & Database Models (Prisma)

Akan ditambahkan 3 model baru pada file `prisma/schema.prisma` dan relasi ke model `Board`, `Card`, serta `User`:

```prisma
model UiPage {
  id          String         @id @default(cuid())
  boardId     String
  board       Board          @relation(fields: [boardId], references: [id], onDelete: Cascade)
  title       String
  path        String         // Contoh: "/login", "/boards/[id]"
  description String?        @db.Text
  status      String         @default("DRAFT") // "DRAFT" | "IN_PROGRESS" | "READY"
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
  name        String         // Contoh: "KanbanCard", "PrimaryButton"
  category    String         @default("General") // "Navigation", "Input", "Card", dll.
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
  type        String       @default("PIN") // "PIN" atau "BOX"
  posX        Float        // Persentase 0-100% horizontal
  posY        Float        // Persentase 0-100% vertikal
  width       Float?       // Persentase lebar (jika type == "BOX")
  height      Float?       // Persentase tinggi (jika type == "BOX")
  comment     String       @db.Text
  status      String       @default("OPEN") // "OPEN" | "RESOLVED"
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

---

## 3. REST API Specifications

### A. Pages API
- **`GET /api/boards/[id]/ui-pages`**
  - Mengambil daftar semua halaman pada board, terurut berdasarkan `order` ascending. Termasuk relasi `annotations` (jumlah open vs resolved).
- **`POST /api/boards/[id]/ui-pages`**
  - Payload: `{ title, path, description?, status?, htmlContent }`
  - Sanitasi UTF-8 pada `htmlContent` untuk mencegah `\0` null-byte error.
- **`GET /api/boards/[id]/ui-pages/[pageId]`**
  - Mengambil detail satu halaman beserta seluruh `annotations` dan relasi pembuat komentar (`author`).
- **`PUT /api/boards/[id]/ui-pages/[pageId]`**
  - Payload update metadata, status, urutan, atau `htmlContent`.
- **`DELETE /api/boards/[id]/ui-pages/[pageId]`**
  - Menghapus halaman dan otomatis men-cascade anotasi terkait.

### B. Components API
- **`GET /api/boards/[id]/ui-components`**
  - Mengambil daftar komponen dengan query parameter opsional `category`.
- **`POST /api/boards/[id]/ui-components`**
  - Payload: `{ name, category, description?, htmlContent }`.
- **`GET /api/boards/[id]/ui-components/[componentId]`**
  - Detail komponen beserta riwayat anotasi.
- **`PUT /api/boards/[id]/ui-components/[componentId]`**
  - Update data komponen atau kode HTML mockup.
- **`DELETE /api/boards/[id]/ui-components/[componentId]`**
  - Menghapus komponen.

### C. Annotations & Kanban Conversion API
- **`POST /api/ui-annotations`**
  - Payload: `{ pageId?, componentId?, type, posX, posY, width?, height?, comment }`.
- **`PUT /api/ui-annotations/[id]`**
  - Update status (`OPEN` <-> `RESOLVED`) atau edit teks komentar.
- **`DELETE /api/ui-annotations/[id]`**
  - Menghapus komentar anotasi.
- **`POST /api/ui-annotations/[id]/convert-task`**
  - Payload: `{ columnId?: string }` (Default: kolom pertama berurutan di board atau kolom "To Do").
  - Menghasilkan kartu tugas `Card` baru di papan Kanban dengan judul:
    `[UI Feedback] <Page Title/Component Name>: <Ringkasan Komentar>`
    dan deskripsi lengkap berisi detail posisi anotasi serta catatan UX.
  - Mengisi `cardId` pada `UiAnnotation`.

---

## 4. Frontend & User Experience Design

### A. Integrasi Tab Board
Di `src/app/(dashboard)/boards/[id]/page.tsx`, ditambahkan tab:
`Kanban Board` | `Living Context` | `Timeline` | `Skills` | **`UI/UX Studio`** (ikon `Palette`).

### B. Tampilan `UiStudioView.tsx`
1. **Sub-Tab Navigation:**
   - `Peta Halaman (Pages)` & `Katalog Komponen (Components)`.
2. **Left Panel (List / Tree View):**
   - Menampilkan daftar entitas, pencarian, dan tombol `+ Tambah Halaman / Komponen`.
   - Menampilkan badge status:
     - `DRAFT` (Abu-abu netral)
     - `IN_PROGRESS` (Kuning / Oranye)
     - `READY` (Hijau emerald)
   - Badge counter feedback: misal `3 issues`.
3. **Center Stage (Interactive Sandboxed Iframe Preview):**
   - Viewport controls: `Desktop (100%)`, `Tablet (768px)`, `Mobile (375px)`.
   - Iframe sandboxed:
     ```html
     <iframe
       sandbox="allow-scripts allow-forms"
       srcDoc={item.htmlContent}
       className="w-full h-full border-0 pointer-events-auto"
     />
     ```
   - **Annotation Overlay Layer:**
     - Toggle `Browse Mode` (interaksi biasa di dalam iframe) vs `Review Mode` (mode inspeksi dengan crosshair).
     - Di `Review Mode`:
       - Klik tunggal -> menaruh Pin Marker (#1, #2, dll.).
       - Klik & drag -> menggambar Bounding Box merah/oranye transparan.
     - Penanda pin / box menampilkan tooltip feedback saat di-hover.
4. **Right Panel (Details & Feedback Sidebar):**
   - Metadata item yang sedang aktif.
   - Form ganti isi HTML (upload file `.html` atau paste teks).
   - Feed anotasi visual:
     - Avatar author dan waktu pembuatan.
     - Isi catatan perbaikan UX.
     - Tombol status `Tandai Selesai` (Resolved).
     - Tombol `Convert to Kanban Task` yang otomatis membuat task di papan.

---

## 5. Security & Isolation Considerations
1. **Iframe Isolation:**
   - Parameter sandbox tidak menyertakan `allow-same-origin`. Hal ini memastikan kode HTML/JS dari prototype tidak dapat mengakses token sesi, cookies, atau localStorage aplikasi utama NeoKanban.
2. **PostgreSQL Encoding Protection:**
   - Semua input teks HTML/CSS/JS dibersihkan dari null byte (`\0`) sebelum disimpan ke database Prisma.
3. **Authorization Check:**
   - Operasi penambahan/pengubahan halaman, komponen, dan anotasi memverifikasi kepemilikan atau keanggotaan pengguna di board terkait.

---

## 6. Verification & Testing Strategy
1. **Prisma Migration / DB Push:** Verifikasi bahwa model `UiPage`, `UiComponent`, dan `UiAnnotation` tergenerate dan tersinkronisasi di database Postgres port 5435.
2. **Automated E2E API Test (`scripts/test-ui-studio-e2e.ts`):**
   - Membuat halaman baru dengan konten HTML interaktif.
   - Membuat komponen UI baru.
   - Menambahkan anotasi Pin dan Box pada halaman.
   - Mengonversi anotasi menjadi kartu tugas Kanban dan memverifikasi keberadaan kartu baru di kolom `To Do`.
   - Menguji toggle status `RESOLVED`.
   - Menguji sanitasi encoding UTF-8.
3. **TypeScript Integrity:** Memastikan `npx tsc --noEmit` lolos tanpa error kompilasi.
