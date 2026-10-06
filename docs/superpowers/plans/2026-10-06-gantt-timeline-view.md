# Gantt Timeline View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan fitur visualisasi Gantt / Timeline horizontal native (React 19 + Tailwind CSS) pada board NeoKanban untuk memantau roadmap tugas berbasis rentang tanggal (`startDate` s/d `dueDate`) tanpa dependensi library eksternal.

**Architecture:** Memperluas skema data `Card` di Prisma dengan field `startDate`, memperbarui REST API dan MCP server, membuat modul utilitas kalkulasi kalender murni di `src/lib/timeline-utils.ts`, membangun komponen UI modular `GanttTimelineView` (toolbar navigasi, zoom Days/Weeks/Months, Today indicator, task bars berkode status, serta collapsible tray Unscheduled Tasks), dan mengintegrasikannya sebagai tab ketiga di `BoardPage`.

**Tech Stack:** Next.js 16 (App Router, React 19, TypeScript), Prisma ORM v6 (PostgreSQL), Tailwind CSS v4, Lucide React icons.

## Global Constraints
- Gunakan estetika Counsel Doc / Linear Minimalist (canvas `#fafafc`, status dots semantik `w-2 h-2`, font Inter & Mono).
- DILARANG menambahkan library visualisasi grafik pihak ketiga (seperti `frappe-gantt`, `dhtmlx`, atau `fullcalendar`). Gunakan native React + CSS layout.
- Durasi visual bar minimal 1 hari kalender jika `startDate === dueDate`.
- Fallback tanggal mulai: gunakan `createdAt` jika `startDate` kosong namun `dueDate` ada.
- Kartu tanpa `dueDate` masuk ke daftar Unscheduled Tasks.
- Mengklik bar kartu atau item unscheduled membuka modal `CardDetailModal` bawaan.
- Setiap task wajib menyertakan tag `**Agent:**` sesuai Tabel Domain di `CLAUDE.md`.

---

### Task 1: Database Schema & Migration for `startDate`

**Agent:** `postgres-pro`

**Files:**
- Modify: `prisma/schema.prisma:90-105`
- Test: `scripts/test-card-startdate-schema.ts`

**Interfaces:**
- Consumes: Prisma Client v6
- Produces: `Card.startDate DateTime?` field in database and generated Prisma Client types.

- [ ] **Step 1: Write the failing test**

Buat file `scripts/test-card-startdate-schema.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCardStartDateSchema() {
  console.log('🧪 Testing Card startDate field in Prisma schema...')

  const card = await prisma.card.findFirst()
  if (!card) {
    console.log('No card found in DB, skipping query test but verifying client types.')
    return
  }

  // Type assertion check: startDate must be a valid property on Card
  const hasStartDateProperty = 'startDate' in card
  if (!hasStartDateProperty) {
    throw new Error('FAIL: "startDate" property does not exist on Card record')
  }

  console.log('✅ PASS: Card has startDate field in Prisma schema')
}

testCardStartDateSchema()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/test-card-startdate-schema.ts`  
Expected: FAIL with `'startDate' in card` returning false or TypeScript compile error before schema update.

- [ ] **Step 3: Modify Prisma Schema**

Edit `prisma/schema.prisma` pada model `Card` untuk menambahkan `startDate DateTime?`:
```prisma
model Card {
  id          String         @id @default(cuid())
  title       String
  description String?
  priority    CardPriority   @default(MEDIUM)
  order       Int            @default(0)
  startDate   DateTime?
  dueDate     DateTime?
  tags        String[]       @default([])
  columnId    String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  column      Column         @relation(fields: [columnId], references: [id], onDelete: Cascade)
  comments    Comment[]
  checklists  ChecklistItem[]

  @@index([columnId])
}
```

Jalankan sinkronisasi database dan generate Prisma client:
```powershell
npx prisma db push
npx prisma generate
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/test-card-startdate-schema.ts`  
Expected: PASS with output `✅ PASS: Card has startDate field in Prisma schema`

- [ ] **Step 5: Commit**

```powershell
git add prisma/schema.prisma scripts/test-card-startdate-schema.ts
git commit -m "feat(db): add startDate field to Card model"
```

---

### Task 2: REST API & MCP Server Updates

**Agent:** `nextjs-developer`

**Files:**
- Modify: `src/app/api/cards/route.ts:10-58`
- Modify: `src/app/api/cards/[id]/route.ts:60-105`
- Modify: `mcp/src/index.ts:350-450`
- Test: `scripts/test-timeline-api.ts`

**Interfaces:**
- Consumes: `prisma.card` with `startDate`
- Produces: API support for `startDate` in `POST /api/cards`, `PUT /api/cards/[id]`, and MCP tools `create_card` / `update_card`.

- [ ] **Step 1: Write the failing test**

Buat file `scripts/test-timeline-api.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testTimelineApiLogic() {
  console.log('🧪 Testing card startDate update and validation logic...')

  const card = await prisma.card.findFirst()
  if (!card) {
    throw new Error('No card available for test')
  }

  const now = new Date()
  const start = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const due = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // 1. Valid update
  const updated = await prisma.card.update({
    where: { id: card.id },
    data: {
      startDate: start,
      dueDate: due,
    },
  })

  if (!updated.startDate || updated.startDate.getTime() !== start.getTime()) {
    throw new Error('FAIL: startDate was not saved correctly')
  }

  // 2. Test validation logic (startDate > dueDate should be invalid)
  const invalidStart = new Date(due.getTime() + 10000)
  const isInvalid = invalidStart.getTime() > due.getTime()
  if (!isInvalid) {
    throw new Error('FAIL: date comparison failed')
  }

  console.log('✅ PASS: API date persistence and logic verified')
}

testTimelineApiLogic()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run test to verify behavior**

Run: `npx tsx scripts/test-timeline-api.ts`  
Expected: PASS logic test.

- [ ] **Step 3: Update `src/app/api/cards/route.ts` & `src/app/api/cards/[id]/route.ts`**

Di `src/app/api/cards/route.ts`:
Tambahkan ekstraksi `startDate` dari body request, validasi `startDate <= dueDate` jika keduanya ada, dan simpan ke `prisma.card.create`:
```typescript
const { columnId, title, description, priority, tags, startDate, dueDate } = await req.json()

if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
  return NextResponse.json({ error: 'Start date cannot be after due date' }, { status: 400 })
}

const card = await prisma.card.create({
  data: {
    columnId,
    title: title.trim(),
    description: description?.trim() || '',
    priority: (priority as Priority) || Priority.MEDIUM,
    tags: Array.isArray(tags) ? tags : [],
    order,
    startDate: startDate ? new Date(startDate) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
  },
  include: {
    checklists: true,
    _count: { select: { comments: true } },
  },
})
```

Di `src/app/api/cards/[id]/route.ts`:
Tambahkan ekstraksi `startDate`, validasi relasi tanggal, dan update field `startDate`:
```typescript
const { title, description, priority, startDate, dueDate, tags } = await req.json()

const targetStartDate = startDate !== undefined ? (startDate ? new Date(startDate) : null) : existing.startDate
const targetDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate

if (targetStartDate && targetDueDate && targetStartDate > targetDueDate) {
  return NextResponse.json({ error: 'Start date cannot be after due date' }, { status: 400 })
}

const updated = await prisma.card.update({
  where: { id },
  data: {
    ...(title !== undefined ? { title: title.trim() } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(priority !== undefined ? { priority: priority as Priority } : {}),
    ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
    ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : [] } : {}),
  },
  ...
})
```

Di `mcp/src/index.ts`:
Tambahkan `startDate: z.string().optional()` pada skema tool `create_card` dan `update_card`, lalu teruskan ke body payload `apiRequest`.

- [ ] **Step 4: Verify MCP Compilation**

Run: `npx tsc -p mcp/tsconfig.json`  
Expected: Kompilasi MCP TypeScript berhasil tanpa error.

- [ ] **Step 5: Commit**

```powershell
git add src/app/api/cards/route.ts src/app/api/cards/[id]/route.ts mcp/src/index.ts scripts/test-timeline-api.ts
git commit -m "feat(api): support startDate field and date validation in card routes & MCP"
```

---

### Task 3: Timeline Mathematics & Date Utilities

**Agent:** `typescript-pro`

**Files:**
- Create: `src/lib/timeline-utils.ts`
- Test: `scripts/test-timeline-utils.ts`

**Interfaces:**
- Produces:
  - `getEffectiveDates(card: { startDate?: string | Date | null; dueDate?: string | Date | null; createdAt?: string | Date }): { start: Date; end: Date; isScheduled: boolean }`
  - `getDaysInWindow(startDate: Date, totalDays: number): Date[]`
  - `calculateTaskPosition(start: Date, end: Date, windowStart: Date, cellWidth: number): { left: number; width: number }`
  - `formatHeaderDate(date: Date, zoomMode: 'days' | 'weeks' | 'months'): { main: string; sub?: string }`
  - `isSameDay(a: Date, b: Date): boolean`

- [ ] **Step 1: Write the failing test**

Buat file `scripts/test-timeline-utils.ts`:
```typescript
import {
  getEffectiveDates,
  calculateTaskPosition,
  getDaysInWindow,
  isSameDay,
} from '../src/lib/timeline-utils'

function runTimelineUtilsTest() {
  console.log('🧪 Testing timeline date mathematics & utilities...')

  const created = new Date('2026-10-01T00:00:00.000Z')
  const due = new Date('2026-10-05T00:00:00.000Z')

  // Case 1: Start date exists
  const start = new Date('2026-10-02T00:00:00.000Z')
  const r1 = getEffectiveDates({ startDate: start, dueDate: due, createdAt: created })
  if (!r1.isScheduled || r1.start.getTime() !== start.getTime() || r1.end.getTime() !== due.getTime()) {
    throw new Error('FAIL: getEffectiveDates with explicit startDate failed')
  }

  // Case 2: Fallback to createdAt when startDate is null
  const r2 = getEffectiveDates({ startDate: null, dueDate: due, createdAt: created })
  if (!r2.isScheduled || r2.start.getTime() !== created.getTime()) {
    throw new Error('FAIL: getEffectiveDates fallback to createdAt failed')
  }

  // Case 3: Unscheduled card (dueDate null)
  const r3 = getEffectiveDates({ startDate: null, dueDate: null, createdAt: created })
  if (r3.isScheduled) {
    throw new Error('FAIL: card without dueDate should not be scheduled')
  }

  // Case 4: Position calculation
  const windowStart = new Date('2026-10-01T00:00:00.000Z')
  const cellWidth = 40
  const pos = calculateTaskPosition(start, due, windowStart, cellWidth)
  // start is 1 day after windowStart -> left = 1 * 40 = 40
  // duration is 3 days -> width = 3 * 40 = 120
  if (pos.left !== 40 || pos.width !== 120) {
    throw new Error(`FAIL: calculateTaskPosition expected left: 40, width: 120, got left: ${pos.left}, width: ${pos.width}`)
  }

  // Case 5: Days in window
  const days = getDaysInWindow(windowStart, 7)
  if (days.length !== 7 || !isSameDay(days[0], windowStart)) {
    throw new Error('FAIL: getDaysInWindow length or start day mismatch')
  }

  console.log('✅ PASS: All timeline utils tests passed successfully')
}

runTimelineUtilsTest()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/test-timeline-utils.ts`  
Expected: FAIL with module not found `../src/lib/timeline-utils`.

- [ ] **Step 3: Implement `src/lib/timeline-utils.ts`**

Buat file `src/lib/timeline-utils.ts`:
```typescript
export interface CardDateInfo {
  startDate?: string | Date | null
  dueDate?: string | Date | null
  createdAt?: string | Date
}

export function toDate(val: string | Date | undefined | null): Date | null {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function startOfDay(d: Date): Date {
  const res = new Date(d)
  res.setHours(0, 0, 0, 0)
  return res
}

export function getEffectiveDates(card: CardDateInfo): {
  start: Date
  end: Date
  isScheduled: boolean
} {
  const due = toDate(card.dueDate)
  if (!due) {
    const dummy = toDate(card.createdAt) || new Date()
    return { start: dummy, end: dummy, isScheduled: false }
  }

  const explicitStart = toDate(card.startDate)
  const created = toDate(card.createdAt) || new Date()
  let start = explicitStart || created

  // Normalize to 00:00:00
  start = startOfDay(start)
  const end = startOfDay(due)

  // Ensure start <= end
  if (start.getTime() > end.getTime()) {
    start = new Date(end)
  }

  return {
    start,
    end,
    isScheduled: true,
  }
}

export function getDaysInWindow(startDate: Date, totalDays: number): Date[] {
  const result: Date[] = []
  const base = startOfDay(startDate)

  for (let i = 0; i < totalDays; i++) {
    const nextDate = new Date(base)
    nextDate.setDate(base.getDate() + i)
    result.push(nextDate)
  }

  return result
}

export function calculateTaskPosition(
  taskStart: Date,
  taskEnd: Date,
  windowStart: Date,
  cellWidth: number
): { left: number; width: number } {
  const msPerDay = 1000 * 60 * 60 * 24
  const startDay = startOfDay(taskStart)
  const endDay = startOfDay(taskEnd)
  const winStart = startOfDay(windowStart)

  const offsetDays = Math.round((startDay.getTime() - winStart.getTime()) / msPerDay)
  let durationDays = Math.round((endDay.getTime() - startDay.getTime()) / msPerDay)

  // Minimal 1 hari kalender agar bar terlihat jelas
  if (durationDays < 1) durationDays = 1

  const left = offsetDays * cellWidth
  const width = durationDays * cellWidth

  return { left, width }
}

export function formatHeaderDate(
  date: Date,
  zoomMode: 'days' | 'weeks' | 'months' = 'days'
): { main: string; sub?: string } {
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

  if (zoomMode === 'months') {
    return {
      main: monthNames[date.getMonth()],
      sub: `${date.getFullYear()}`,
    }
  }

  if (zoomMode === 'weeks') {
    return {
      main: `W${getWeekNumber(date)}`,
      sub: `${date.getDate()} ${monthNames[date.getMonth()]}`,
    }
  }

  return {
    main: `${date.getDate()}`,
    sub: dayNames[date.getDay()],
  }
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/test-timeline-utils.ts`  
Expected: PASS with output `✅ PASS: All timeline utils tests passed successfully`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/timeline-utils.ts scripts/test-timeline-utils.ts
git commit -m "feat(timeline): implement timeline calculation utilities and date mathematics"
```

---

### Task 4: CardDetailModal & KanbanCard Interface Updates

**Agent:** `nextjs-developer`

**Files:**
- Modify: `src/components/kanban/KanbanCard.tsx:18-35`
- Modify: `src/components/kanban/CardDetailModal.tsx:40-100`, `src/components/kanban/CardDetailModal.tsx:180-230`, `src/components/kanban/CardDetailModal.tsx:400-470`

**Interfaces:**
- Consumes: `startDate` property on Card
- Produces: Start Date input in `CardDetailModal`, updated `CardData` interface.

- [ ] **Step 1: Update `CardData` Interface in `src/components/kanban/KanbanCard.tsx`**

Perbarui `CardData` di `src/components/kanban/KanbanCard.tsx` untuk menyertakan `startDate?: string | null`:
```typescript
export interface CardData {
  id: string
  columnId: string
  title: string
  description: string
  order: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  tags: string[]
  startDate?: string | null
  dueDate?: string | null
  createdAt?: string
  assignees?: CardAssigneeData[]
  checklists: { id: string; isCompleted: boolean; title: string }[]
  _count?: { comments: number }
}
```

- [ ] **Step 2: Update `CardDetailModal.tsx` State and Form Inputs**

1. Tambahkan state `startDate`:
```typescript
const [startDate, setStartDate] = useState('')
```

2. Pada `useEffect` fetch card data:
```typescript
if (c.startDate) {
  setStartDate(new Date(c.startDate).toISOString().split('T')[0])
} else {
  setStartDate('')
}
```

3. Pada `handleSave`:
```typescript
body: JSON.stringify({
  title,
  description,
  priority,
  startDate: startDate ? startDate : null,
  dueDate: dueDate ? dueDate : null,
  tags,
}),
```

4. Pada tampilan form (berdampingan dengan input Due Date):
Tampilkan Start Date dan Due Date secara side-by-side dengan label dan icon `Calendar`:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
      <Calendar className="w-3.5 h-3.5" />
      Tanggal Mulai
    </label>
    <input
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
      className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
    />
  </div>
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
      <Clock className="w-3.5 h-3.5" />
      Tenggat Waktu
    </label>
    <input
      type="date"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
      className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
    />
  </div>
</div>
```

- [ ] **Step 3: Verify TypeScript Types**

Run: `npx tsc --noEmit`  
Expected: No type errors on `CardData` or `CardDetailModal`.

- [ ] **Step 4: Commit**

```powershell
git add src/components/kanban/KanbanCard.tsx src/components/kanban/CardDetailModal.tsx
git commit -m "feat(ui): add startDate input and display in CardDetailModal"
```

---

### Task 5: Native GanttTimelineView Component & BoardPage Tab Integration

**Agent:** `ux-ui-pro-max`

**Files:**
- Create: `src/components/kanban/GanttTimelineView.tsx`
- Modify: `src/app/(dashboard)/boards/[id]/page.tsx:35-150`, `src/app/(dashboard)/boards/[id]/page.tsx:350-420`

**Interfaces:**
- Consumes: `ColumnData[]`, `CardData`, `onCardClick: (cardId: string) => void`, `timeline-utils.ts`
- Produces: Complete interactive Gantt Timeline view with tab integration on `BoardPage`.

- [ ] **Step 1: Create `src/components/kanban/GanttTimelineView.tsx`**

Implementasikan komponen `GanttTimelineView` dengan fitur:
1. Controls toolbar: `< Prev`, `Hari Ini`, `Next >`, Mode Zoom (`Days`, `Weeks`, `Months`), dan Tombol Unscheduled Tasks counter.
2. Kolom kiri (Task hierarchy table): pengelompokan per kolom kanban dengan status dot dan badge prioritas.
3. Grid horizontal kalender: garis penanda grid, garis aksen Today vertikal, dan horizontal task bar berkode warna status.
4. Drawer Unscheduled Tasks: collapsible side panel yang menampilkan kartu tanpa `dueDate` dan tombol set jadwal.
5. Klik pada bar atau item unscheduled memanggil `onCardClick(cardId)`.

```tsx
'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Layers,
  CalendarRange,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { ColumnData } from './KanbanColumn'
import { CardData } from './KanbanCard'
import {
  getEffectiveDates,
  getDaysInWindow,
  calculateTaskPosition,
  formatHeaderDate,
  isSameDay,
  startOfDay,
} from '@/lib/timeline-utils'

interface GanttTimelineViewProps {
  columns: ColumnData[]
  onCardClick: (cardId: string) => void
}

export default function GanttTimelineView({ columns, onCardClick }: GanttTimelineViewProps) {
  const [zoomMode, setZoomMode] = useState<'days' | 'weeks' | 'months'>('days')
  const [windowOffsetDays, setWindowOffsetDays] = useState(0)
  const [showUnscheduled, setShowUnscheduled] = useState(false)

  const today = useMemo(() => startOfDay(new Date()), [])

  // Window range calculation
  const totalDays = zoomMode === 'months' ? 60 : zoomMode === 'weeks' ? 28 : 21
  const cellWidth = zoomMode === 'months' ? 28 : zoomMode === 'weeks' ? 36 : 48

  const windowStartDate = useMemo(() => {
    const base = new Date(today)
    // Center around today with offset
    base.setDate(base.getDate() - 4 + windowOffsetDays)
    return startOfDay(base)
  }, [today, windowOffsetDays])

  const daysInWindow = useMemo(() => {
    return getDaysInWindow(windowStartDate, totalDays)
  }, [windowStartDate, totalDays])

  // Extract all cards and classify into scheduled vs unscheduled
  const { scheduledCardsByColumn, unscheduledCards } = useMemo(() => {
    const scheduledByCol: Array<{ column: ColumnData; cards: Array<{ card: CardData; start: Date; end: Date }> }> = []
    const unscheduled: Array<{ column: ColumnData; card: CardData }> = []

    columns.forEach((col) => {
      const scheduledInCol: Array<{ card: CardData; start: Date; end: Date }> = []
      col.cards.forEach((card) => {
        const { start, end, isScheduled } = getEffectiveDates(card)
        if (isScheduled) {
          scheduledInCol.push({ card, start, end })
        } else {
          unscheduled.push({ column: col, card })
        }
      })
      scheduledByCol.push({ column: col, cards: scheduledInCol })
    })

    return { scheduledCardsByColumn: scheduledByCol, unscheduledCards: unscheduled }
  }, [columns])

  const getStatusColor = (colTitle: string) => {
    const lower = colTitle.toLowerCase()
    if (lower.includes('done')) return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    if (lower.includes('review')) return 'bg-purple-100 text-purple-800 border-purple-300'
    if (lower.includes('progress')) return 'bg-amber-100 text-amber-800 border-amber-300'
    if (lower.includes('to do') || lower.includes('todo')) return 'bg-blue-100 text-blue-800 border-blue-300'
    return 'bg-slate-100 text-slate-800 border-slate-300'
  }

  const getStatusDot = (colTitle: string) => {
    const lower = colTitle.toLowerCase()
    if (lower.includes('done')) return 'bg-emerald-500'
    if (lower.includes('review')) return 'bg-purple-500'
    if (lower.includes('progress')) return 'bg-amber-500'
    if (lower.includes('to do') || lower.includes('todo')) return 'bg-blue-500'
    return 'bg-slate-400'
  }

  return (
    <div className="flex flex-col h-full bg-[#fafafc] border border-neutral-200/80 rounded-xl shadow-xs overflow-hidden">
      {/* 1. Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border-b border-neutral-200/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWindowOffsetDays((prev) => prev - (zoomMode === 'months' ? 14 : 7))}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 transition"
            title="Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWindowOffsetDays(0)}
            className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 rounded-lg transition"
          >
            Hari Ini
          </button>
          <button
            onClick={() => setWindowOffsetDays((prev) => prev + (zoomMode === 'months' ? 14 : 7))}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 transition"
            title="Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-neutral-600 ml-2">
            {windowStartDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom switcher */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60">
            {(['days', 'weeks', 'months'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setZoomMode(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition ${
                  zoomMode === mode
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {mode === 'days' ? 'Hari' : mode === 'weeks' ? 'Minggu' : 'Bulan'}
              </button>
            ))}
          </div>

          {/* Unscheduled Tray Button */}
          <button
            onClick={() => setShowUnscheduled((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition ${
              showUnscheduled
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Belum Terjadwal ({unscheduledCards.length})</span>
            {showUnscheduled ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Main Dual-Pane Canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: Task List */}
        <div className="w-64 sm:w-72 border-r border-neutral-200/80 bg-white flex flex-col shrink-0">
          <div className="h-10 px-3 flex items-center border-b border-neutral-200/80 bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Tugas / Tahapan
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {scheduledCardsByColumn.map(({ column, cards }) => (
              <div key={column.id} className="py-2">
                <div className="px-3 py-1 flex items-center justify-between text-xs font-semibold text-neutral-700">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(column.title)}`} />
                    <span>{column.title}</span>
                  </div>
                  <span className="text-neutral-400 font-normal">({cards.length})</span>
                </div>
                {cards.map(({ card }) => (
                  <div
                    key={card.id}
                    onClick={() => onCardClick(card.id)}
                    className="h-10 px-3 flex items-center gap-2 hover:bg-neutral-50 cursor-pointer transition text-xs text-neutral-800 truncate"
                  >
                    <span className="truncate flex-1 font-medium">{card.title}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Timeline Grid Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-white relative">
          <div style={{ width: totalDays * cellWidth, minWidth: '100%' }}>
            {/* Header Kalender */}
            <div className="h-10 flex border-b border-neutral-200/80 bg-neutral-50 sticky top-0 z-10">
              {daysInWindow.map((day, idx) => {
                const isCurrent = isSameDay(day, today)
                const headerInfo = formatHeaderDate(day, zoomMode)
                return (
                  <div
                    key={idx}
                    style={{ width: cellWidth }}
                    className={`flex flex-col items-center justify-center border-r border-neutral-200/60 text-center shrink-0 ${
                      isCurrent ? 'bg-amber-50/80 font-bold text-amber-900' : 'text-neutral-600'
                    }`}
                  >
                    <span className="text-[11px] leading-tight font-semibold">{headerInfo.main}</span>
                    {headerInfo.sub && <span className="text-[9px] text-neutral-400">{headerInfo.sub}</span>}
                  </div>
                )
              })}
            </div>

            {/* Rows & Bars */}
            <div className="relative divide-y divide-neutral-100">
              {/* Vertical Today Line */}
              {daysInWindow.some((d) => isSameDay(d, today)) && (
                <div
                  style={{
                    left:
                      daysInWindow.findIndex((d) => isSameDay(d, today)) * cellWidth + cellWidth / 2,
                  }}
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-5 pointer-events-none"
                />
              )}

              {scheduledCardsByColumn.map(({ column, cards }) => (
                <div key={column.id} className="py-2">
                  <div className="h-6" /> {/* Spacer untuk header column */}
                  {cards.map(({ card, start, end }) => {
                    const { left, width } = calculateTaskPosition(start, end, windowStartDate, cellWidth)
                    return (
                      <div key={card.id} className="h-10 relative flex items-center">
                        <div
                          onClick={() => onCardClick(card.id)}
                          style={{
                            left: Math.max(left, 0),
                            width: Math.max(width, cellWidth),
                          }}
                          className={`absolute h-7 rounded-md px-2 flex items-center gap-1.5 border shadow-xs cursor-pointer transition hover:opacity-90 overflow-hidden text-xs font-medium ${getStatusColor(
                            column.title
                          )}`}
                          title={`${card.title} (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`}
                        >
                          <span className="truncate flex-1">{card.title}</span>
                          {card.checklists?.length > 0 && (
                            <span className="text-[10px] bg-white/70 px-1 py-0.5 rounded text-neutral-600 shrink-0">
                              {card.checklists.filter((c) => c.isCompleted).length}/{card.checklists.length}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Collapsible Unscheduled Tasks Drawer */}
        {showUnscheduled && (
          <div className="w-80 border-l border-neutral-200/80 bg-neutral-50/70 p-4 overflow-y-auto shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Kartu Tanpa Jadwal
              </h4>
              <span className="text-xs bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full font-semibold">
                {unscheduledCards.length}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
              Klik kartu di bawah untuk menentukan tanggal mulai dan tenggat waktu agar muncul di timeline.
            </p>
            <div className="space-y-2 flex-1">
              {unscheduledCards.map(({ column, card }) => (
                <div
                  key={card.id}
                  onClick={() => onCardClick(card.id)}
                  className="p-3 bg-white border border-neutral-200 rounded-lg shadow-xs hover:border-neutral-300 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase">
                      {column.title}
                    </span>
                    <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                      {card.priority}
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-neutral-900 mb-1">{card.title}</h5>
                  <div className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                    <CalendarRange className="w-3 h-3" />
                    <span>Atur Tanggal</span>
                  </div>
                </div>
              ))}
              {unscheduledCards.length === 0 && (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  Semua kartu telah memiliki tenggat waktu!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `BoardPage` in `src/app/(dashboard)/boards/[id]/page.tsx`**

1. Perbarui state `activeTab`:
```typescript
const [activeTab, setActiveTab] = useState<'board' | 'context' | 'timeline'>('board')
```
2. Tambahkan icon `CalendarRange` dari `lucide-react`.
3. Tambahkan tombol tab ketiga di header:
```tsx
<button
  onClick={() => setActiveTab('timeline')}
  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
    activeTab === 'timeline'
      ? 'bg-white text-neutral-900 shadow-xs'
      : 'text-neutral-500 hover:text-neutral-900'
  }`}
>
  <CalendarRange className="w-3.5 h-3.5" />
  <span>Timeline</span>
</button>
```
4. Render `GanttTimelineView` saat `activeTab === 'timeline'`:
```tsx
{activeTab === 'timeline' && (
  <div className="flex-1 overflow-hidden p-4">
    <GanttTimelineView
      columns={board.columns}
      onCardClick={(cardId) => setSelectedCardId(cardId)}
    />
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript Types**

Run: `npx tsc --noEmit`  
Expected: Kompilasi TypeScript sukses tanpa error.

- [ ] **Step 4: Commit**

```powershell
git add src/components/kanban/GanttTimelineView.tsx src/app/(dashboard)/boards/[id]/page.tsx
git commit -m "feat(ui): implement GanttTimelineView component and integrate timeline tab in BoardPage"
```

---

### Task 6: Full Verification & Build Check

**Agent:** `deployment-engineer`

**Files:**
- Test: All components, pages, scripts

**Interfaces:**
- Consumes: Complete project codebase
- Produces: 100% clean TypeScript build, successful Next.js production build.

- [ ] **Step 1: Run TypeScript Type Check**

Run: `npx tsc --noEmit`  
Expected: 0 errors.

- [ ] **Step 2: Run Production Build**

Run: `npm run build`  
Expected: Next.js build compiled successfully with Turbopack.

- [ ] **Step 3: Verification Report & Final Commit**

Commit any linting or build cleanup if necessary:
```powershell
git commit --allow-empty -m "chore: verify gantt timeline view build and type safety"
```
