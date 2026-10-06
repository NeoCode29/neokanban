# Fitur Gantt Timeline View — Desain & Spesifikasi

- **Tanggal:** 2026-10-06
- **Status:** Approved
- **Proyek:** NeoKanban
- **Tujuan:** Menyediakan visualisasi roadmap horizontal berbasis tanggal (*Timeline / Gantt View*) yang terintegrasi secara mulus dengan papan Kanban dan estetika *Counsel Minimalist & Linear*, tanpa dependensi library eksternal.

---

## 1. Problem Statement & Latar Belakang

1. **Kebutuhan Visibilitas Waktu:**  
   Papan Kanban sangat efektif untuk melacak alur status kerja harian (*flow of work*), namun kurang memberikan gambaran proyeksi jadwal kalender, durasi tugas, dan tenggat waktu rilis secara visual (*temporal visibility*).
2. **Kesesuaian AI-Native Collaboration:**  
   Dalam alur kolaborasi manusia dan agen AI (Antigravity/Claude/Cursor), tugas sering kali memiliki tanggal mulai (*start date*) dan tenggat (*due date*) yang terencana. Visualisasi roadmap membantu mengidentifikasi overlap pengerjaan dan milestone rilis.
3. **Prinsip Bebas Dependensi Eksternal:**  
   Banyak library Gantt chart pihak ketiga membawa dependensi berat, manipulasi DOM kaku yang rentan bermasalah di React 19 / Next.js 16 App Router, dan styling bawaan yang bertabrakan dengan desain Counsel/Linear NeoKanban. Solusi harus berupa **Native Custom React Component**.

---

## 2. Arsitektur Data & Model Prisma

### 2.1. Perubahan Skema (`prisma/schema.prisma`)
Pada model `Card`, ditambahkan field `startDate`:

```prisma
model Card {
  id          String         @id @default(cuid())
  title       String
  description String?
  priority    CardPriority   @default(MEDIUM)
  order       Int            @default(0)
  startDate   DateTime?      // Tanggal mulai pengerjaan kartu
  dueDate     DateTime?      // Tanggal target selesai / jatuh tempo
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

### 2.2. Aturan Fallback & Penentuan Tanggal
1. **Effective Start Date:**
   - Jika `startDate` terdefinisi, gunakan `startDate`.
   - Jika `startDate` bernilai `null` namun `dueDate` terdefinisi, fallback ke `createdAt`.
2. **Effective End Date:**
   - Menggunakan nilai `dueDate`.
3. **Minimum Visual Duration:**
   - Jika `startDate === dueDate` (atau selisih kurang dari 1 hari), lebar bar dihitung minimal 1 hari kalender agar bar tetap mudah dilihat dan diinteraksikan.

---

## 3. Spesifikasi REST API & MCP Server

### 3.1. Pembaruan Endpoint REST API
- **`POST /api/cards`** & **`PUT /api/cards/[id]`**:
  - Menerima properti opsional `startDate?: string | null` (format ISO 8601).
  - Validasi: Jika `startDate` dan `dueDate` keduanya dikirim dan `startDate > dueDate`, API mengembalikan respons HTTP `400 Bad Request` dengan pesan error yang jelas.
  - Saat `PUT`, mengupdate field `startDate` di database via Prisma.
- **`GET /api/boards/[id]`**:
  - Model `Card` dalam relasi `columns.cards` otomatis mengembalikan `startDate` ke frontend.

### 3.2. Pembaruan MCP Server Daemon (`mcp/src/index.ts`)
- Menambahkan parameter opsional `startDate` pada skema Zod tool:
  - `create_card`: `{ ..., startDate: z.string().optional() }`
  - `update_card`: `{ ..., startDate: z.string().optional() }`
- Memastikan agen AI dapat membuat dan memindahkan kartu dengan estimasi tanggal mulai secara programatik.

---

## 4. Arsitektur Frontend & Antarmuka Pengguna

### 4.1. Navigasi Tab pada Board Page (`src/app/(dashboard)/boards/[id]/page.tsx`)
Tab switcher di header halaman Board diperluas menjadi 3 opsi:
- **`board`**: Tampilan Kanban drag-and-drop (`KanbanBoard`).
- **`context`**: Tampilan Living Project Context Hub (`ProjectContextView`).
- **`timeline`**: Tampilan Gantt / Timeline Roadmap (`GanttTimelineView`).

### 4.2. Komponen `GanttTimelineView` (`src/components/kanban/GanttTimelineView.tsx`)
Komponen native modular yang terdiri dari 3 blok fungsional:

1. **Top Controls Toolbar:**
   - Navigasi Kalender: Tombol `<` (mundur 1 periode), `Hari Ini` (lompat ke tanggal sekarang), `>` (maju 1 periode).
   - Label Periode: Format teks ramah pengguna (contoh: `"Oktober 2026"` atau `"01 Okt - 31 Okt 2026"`).
   - Zoom Mode Switcher: Tombol pill segmented `Days` (harian), `Weeks` (mingguan), `Months` (bulanan).
   - Toggle Unscheduled Tray: Tombol dengan counter kartu tanpa tanggal `[Unscheduled (N)]`.

2. **Dual-Pane Grid Layout:**
   - **Left Pane (Task Hierarchy Table, lebar `w-72`):**
     - Mengelompokkan tugas berdasarkan kolom kanban (To Do, In Progress, In Review, Done).
     - Menampilkan status dot semantik (`w-2 h-2 rounded-full`), judul kartu (truncated), badge prioritas, dan tanggal ringkas.
     - Mengklik baris akan membuka `CardDetailModal`.
   - **Right Pane (Timeline Calendar Canvas, horizontal scroll):**
     - Header kalender bertingkat dengan penanda hari/tanggal.
     - Penanda vertikal hari ini (**Today Indicator**) dengan garis aksen lembut dan pill penunjuk.
     - Task Bar horizontal:
       - `left`: dihitung dari selisih hari antara `effectiveStartDate` dan `windowStartDate`.
       - `width`: dihitung dari durasi hari antara `effectiveStartDate` dan `effectiveEndDate`.
       - Warna bar mencerminkan status kolom:
         - Backlog: `bg-slate-100 text-slate-800 border-slate-200`
         - To Do: `bg-blue-50 text-blue-800 border-blue-200`
         - In Progress: `bg-amber-50 text-amber-800 border-amber-200`
         - In Review: `bg-purple-50 text-purple-800 border-purple-200`
         - Done: `bg-emerald-50 text-emerald-800 border-emerald-200`
       - Di dalam bar: Judul kartu dan counter checklist (misal: `2/3`).
       - Klik pada bar: Membuka `CardDetailModal` untuk kartu tersebut.

3. **Unscheduled Tasks Side Tray (Collapsible Drawer):**
   - Menampung kartu yang memiliki `dueDate === null`.
   - Setiap kartu menampilkan status kolom, judul, dan tombol pintas *"Set Schedule"* yang langsung membuka modal kartu untuk mengisi `startDate` dan `dueDate`.

### 4.3. Pembaruan `CardDetailModal` (`src/components/kanban/CardDetailModal.tsx`)
- Menambahkan form field input tanggal:
  - **Start Date:** Input tipe `date` untuk mengatur tanggal mulai.
  - **Due Date:** Input tipe `date` yang sudah ada.
- Ketika salah satu tanggal diubah, perubahan disimpan ke server melalui endpoint API `PUT /api/cards/[id]`.

---

## 5. Date Helper & Timeline Mathematics (`src/lib/timeline-utils.ts`)

Untuk menjaga kode komponen tetap bersih dan mudah diuji secara modular, logika perhitungan kalender dipisahkan ke modul utilitas tersendiri:
- `getDaysInWindow(startDate: Date, daysCount: number): Date[]`: Menghasilkan array tanggal untuk kolom kalender.
- `calculateTaskPosition(taskStart: Date, taskEnd: Date, windowStart: Date, cellWidth: number)`: Menghitung nilai CSS `left` dan `width` dalam satuan piksel.
- `formatDateLabel(date: Date, zoomMode: 'days' | 'weeks' | 'months')`: Format judul kolom kalender.
- `isToday(date: Date)`: Menentukan kolom yang merupakan hari ini.

---

## 6. Rencana Pengujian & Verifikasi (Testing Strategy)

1. **Database Migration:**
   - Eksekusi `npx prisma db push` berhasil tanpa konflik data existing.
2. **REST API & Schema Validation:**
   - Tes skenario valid: menyimpan `startDate` dan `dueDate` yang valid.
   - Tes skenario invalid: menyimpan `startDate > dueDate` menghasilkan error validasi yang tepat.
3. **Komponen Visual Timeline:**
   - Kartu dengan tanggal tampil di posisi piksel yang akurat pada mode *Days*, *Weeks*, dan *Months*.
   - Kartu tanpa `dueDate` terdaftar pada panel *Unscheduled Tasks*.
   - Klik pada bar kartu membuka `CardDetailModal` dengan data yang sesuai.
   - Pengubahan tanggal di modal memperbarui posisi bar di timeline secara reaktif.
4. **Type Safety & Build:**
   - `npx tsc --noEmit` lolos tanpa error tipe data TypeScript.
   - `npm run build` berhasil melakukan kompilasi penuh Next.js 16 tanpa error SSR/client hydration.
