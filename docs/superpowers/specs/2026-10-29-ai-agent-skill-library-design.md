# Spesifikasi Desain: AI Agent Skill Library (Katalog Multi-File & Sinkronisasi Lokal MCP)

**Tanggal:** 29 Oktober 2026  
**Status:** Draf Disetujui (Approved Design)  
**Target Proyek:** `neokanban` (Next.js 16 App Router, Prisma ORM, Tailwind CSS, MCP Server)

---

## 1. Latar Belakang & Motivasi

Sebagai platform manajemen tugas bergaya Kanban yang *AI-native*, **NeoKanban** tidak hanya berfungsi mencatat kartu tugas untuk developer manusia, melainkan juga memandu dan mendelegasikan tugas ke AI coding agents (seperti Claude Desktop, Cursor, Antigravity, OpenHands).

Saat ini, aturan kerja dan panduan pengerjaan disimpan secara statis per board di dalam *Living Context* (`ProjectContext` / `ContextDocument`). Namun terdapat beberapa keterbatasan:
1. **Tidak Ada Reusability Lintas Proyek:** Jika sebuah tim memiliki standar kerja (misalnya aturan *Test-Driven Development (TDD)*, checklist *Security Audit*, atau aturan arsitektur *Next.js 16*), aturan tersebut harus dibuat ulang secara manual di setiap papan proyek.
2. **Ketiadaan Hub / Katalog Keahlian AI:** Tidak ada ruang katalog (*Skill Library*) terpusat tempat developer dan agen AI dapat menjelajahi keahlian siap pakai (*preset skills*) maupun membagikan keahlian khusus yang telah dibuat.
3. **Belum Ada Sinkronisasi ke Lokal via MCP:** Agent AI lokal yang menjalankan sesi di komputer user tidak dapat mengunduh atau menyinkronkan folder skill dari NeoKanban ke workspace lokal mereka (`.agents/skills/` atau `.claude/skills/`).

---

## 2. Tujuan & Kriteria Keberhasilan (Success Criteria)

1. **Struktur Multi-File Package (Folder-File Standard):**
   - Setiap Skill tidak sekadar teks tunggal, melainkan struktur direktori utuh yang menaungi berkas `SKILL.md` (instruksi & metadata), folder `examples/` (contoh kode implementasi), dan `scripts/` (skrip helper/verifikasi).
2. **Dual-Mode Consumption (Board-Linked & Local Sync):**
   - **Mode A (Board-Linked / Cloud):** Skill dapat dikaitkan (*attach*) ke board tertentu di web NeoKanban, otomatis menjadi aturan eksekusi aktif bagi task di board tersebut.
   - **Mode B (Local Download & Installation via MCP):** AI Agent lokal dapat mengunduh seluruh bundle folder skill dan menulisnya langsung ke disk lokal (`.agents/skills/<skill-slug>/`) melalui tool MCP `install_skill_to_local`.
3. **Katalog & Manajemen Skill di Web UI (`/skills`):**
   - Menu navigasi baru di `Sidebar.tsx`: **Skill Library**.
   - Halaman katalog lengkap dengan pencarian, filter kategori (*Testing, Frontend, Backend, Security, Architecture*), dan target role (*Frontend Specialist, Backend Specialist, Reviewer, All*).
   - Modal preview berkas skill multi-file (membaca `SKILL.md` dan file referensi).
   - Fitur upload skill baru (baik via file `.zip` / folder maupun editor interaktif).
   - Tombol *"Add to Board"* (memasang skill ke board pilihan) dan *"Download ZIP"* (mengunduh berkas bundle skill ke komputer).
4. **Tool MCP yang Lengkap:**
   - `list_skills`: Menampilkan katalog seluruh skill yang tersedia.
   - `get_board_skills`: Mengambil seluruh skill yang sedang aktif pada board tertentu.
   - `read_skill_file`: Membaca konten file tertentu di dalam pohon folder skill.
   - `install_skill_to_local`: Mengunduh dan menulis struktur folder skill langsung ke direktori lokal user.
5. **Preset Awal Terkurasi (Seeded Presets):**
   - Menyediakan 4 skill bawaan standar industri:
     - `tdd-workflow`: Siklus RED-GREEN-REFACTOR dan panduan penulisan tes sebelum kode implementasi.
     - `code-review-gate`: Standar evaluasi review kualitas kode dan aturan *Never Auto-Done*.
     - `security-audit`: Sanitasi input, mitigasi OWASP, dan proteksi otorisasi data.
     - `nextjs-best-practices`: Arsitektur App Router, batas Server vs Client Component, dan optimasi performa.

---

## 3. Arsitektur Data & Model Database (`prisma/schema.prisma`)

Tiga model relasional baru ditambahkan ke Prisma:

```prisma
model Skill {
  id          String       @id @default(cuid())
  slug        String       @unique // Identifier unik, e.g. "tdd-workflow"
  name        String       // Nama tampilan, e.g. "Test-Driven Development (TDD)"
  description String       // Ringkasan kegunaan skill
  category    String       // "TESTING", "FRONTEND", "BACKEND", "SECURITY", "ARCHITECTURE"
  targetRole  String       @default("ALL") // "FRONTEND_SPECIALIST", "BACKEND_SPECIALIST", "REVIEWER", "ALL"
  isPreset    Boolean      @default(false) // True jika skill resmi bawaan sistem
  authorId    String?
  author      User?        @relation("UserCreatedSkills", fields: [authorId], references: [id], onDelete: SetNull)
  
  files       SkillFile[]  // 📂 Daftar berkas dalam package skill
  boardSkills BoardSkill[] // 🔗 Relasi many-to-many ke board
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([category])
  @@index([targetRole])
}

model SkillFile {
  id        String   @id @default(cuid())
  skillId   String
  skill     Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  filePath  String   // Path relatif, e.g. "SKILL.md", "examples/spec.ts", "scripts/check.sh"
  content   String   @default("") // Konten teks
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([skillId, filePath])
  @@index([skillId])
}

model BoardSkill {
  id          String   @id @default(cuid())
  boardId     String
  board       Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  skillId     String
  skill       Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  installedAt DateTime @default(now())

  @@unique([boardId, skillId])
  @@index([boardId])
  @@index([skillId])
}
```

*Relasi di model yang sudah ada:*
- `User`: `createdSkills Skill[] @relation("UserCreatedSkills")`
- `Board`: `installedSkills BoardSkill[]`

---

## 4. Desain REST API Handlers

Semua route handler Next.js ditempatkan di `src/app/api/skills/` dan `src/app/api/boards/[id]/skills/`:

| Method | Endpoint | Deskripsi & Autentikasi |
| :--- | :--- | :--- |
| `GET` | `/api/skills` | Mengambil seluruh katalog skill dengan filter query `?category=` & `?role=`. |
| `POST` | `/api/skills` | Membuat skill baru beserta daftar `files` (`SKILL.md`, `examples/...`). |
| `GET` | `/api/skills/[id]` | Mengambil data lengkap skill termasuk seluruh daftar `files`. |
| `PUT` | `/api/skills/[id]` | Memperbarui metadata dan file skill (hanya oleh author atau admin). |
| `DELETE` | `/api/skills/[id]` | Menghapus custom skill (preset dilindungi). |
| `GET` | `/api/skills/[id]/export` | Mengunduh bundle folder skill sebagai berkas `.zip`. |
| `GET` | `/api/boards/[id]/skills` | Mengambil daftar skill aktif yang terpasang pada board tertentu. |
| `POST` | `/api/boards/[id]/skills` | Menautkan skill ke board. Payload: `{ skillId }`. |
| `DELETE` | `/api/boards/[id]/skills/[skillId]` | Mencopot skill dari board. |

---

## 5. Integrasi Server MCP (`mcp/src/index.ts`)

Menambahkan 4 tool MCP baru (meningkatkan total dari 18 menjadi 22 tools AI):

### 1. `list_skills`
- **Tujuan**: Menampilkan seluruh katalog skill di library.
- **Output**: Array objek berisi `slug`, `name`, `description`, `category`, `targetRole`, `fileCount`, dan daftar path berkas.

### 2. `get_board_skills`
- **Tujuan**: Mengambil seluruh skill yang aktif terpasang pada board yang sedang dikerjakan agent.
- **Input**: `{ boardId: string }`
- **Output**: Detail skill beserta konten berkas utama `SKILL.md` agar agent langsung memahami aturan kerja board.

### 3. `read_skill_file`
- **Tujuan**: Membaca berkas tertentu di dalam package skill (misal file referensi atau contoh kode).
- **Input**: `{ skillSlug: string, filePath: string }`
- **Output**: Konten teks dari file tersebut.

### 4. `install_skill_to_local` ⭐
- **Tujuan**: Mengunduh seluruh berkas folder skill dari library dan menuliskannya langsung ke filesystem komputer lokal tempat MCP daemon berjalan.
- **Input**: 
  - `skillSlug`: string (e.g. `"tdd-workflow"`)
  - `targetDir`: string opsional (default: `.agents/skills/<skillSlug>`)
- **Implementasi**:
  1. MCP melakukan fetch ke `/api/skills/[slug]`.
  2. Membaca seluruh entitas `files` dari skill tersebut.
  3. Menggunakan modul `fs` Node.js lokal untuk membuat folder target secara rekursif (`fs.promises.mkdir`).
  4. Menuliskan setiap file sesuai path relatifnya (`SKILL.md`, `examples/...`).
  5. Mengembalikan laporan keberhasilan instalasi lokal ke agent.

---

## 6. Antarmuka Pengguna (UI/UX)

1. **Pembaruan Navigasi ([`Sidebar.tsx`](file:///c:/Users/kresna/Documents/Workspace/neokanban/src/components/layout/Sidebar.tsx))**:
   - Menambahkan item menu **`Skill Library`** (Ikon `Sparkles` / `Layers`) di antara *Review Queue* dan *AI Tokens*.
2. **Halaman Katalog (`/skills`)**:
   - Header minimalis bergaya Counsel/Linear dengan search bar dan filter chips (*All, Testing, Frontend, Backend, Security*).
   - Tombol **"Upload Skill"** di sudut kanan atas.
   - Grid kartu skill responsif:
     - Judul skill & slug.
     - Badge kategori & target role berwarna.
     - Deskripsi singkat.
     - Tree preview jumlah file (misal: `3 files: SKILL.md, examples/spec.ts, scripts/test.sh`).
     - Aksi cepat:
       - 📌 **"Add to Board"** (Membuka dropdown pemilihan board untuk instalasi 1-klik).
       - 📥 **"Download ZIP"** (Unduh langsung bundle skill).
       - 👁️ **"Inspect Files"** (Membuka modal split editor/preview berkas-berkas di dalam skill).
3. **Modal "Upload Skill" (`UploadSkillModal.tsx`)**:
   - Opsi Tab A: **Upload File `.zip`** (Drag and drop file ZIP, parser otomatis mengekstrak berkas dan membaca judul dari `SKILL.md`).
   - Opsi Tab B: **Manual Multi-File Form** (Input judul, kategori, role, dan editor teks untuk `SKILL.md` serta file tambahan).
4. **Modal Detail & File Viewer (`SkillDetailModal.tsx`)**:
   - Menampilkan sidebar pohon berkas (*file tree*) di sebelah kiri dan Markdown/Code viewer di sebelah kanan.
5. **Section Active Skills pada Board ([`ProjectContextView.tsx`](file:///c:/Users/kresna/Documents/Workspace/neokanban/src/components/context/ProjectContextView.tsx))**:
   - Menambahkan section **"Installed AI Skills"** pada tab Project Context di mana pemilik board dapat melihat dan mencopot skill yang aktif.

---

## 7. Rencana Verifikasi & Pengujian

1. **Skema & Database**:
   - Prisma Client ter-generate dengan model `Skill`, `SkillFile`, dan `BoardSkill`.
   - Skrip seeder `prisma/seed-skills.ts` berhasil menyuntikkan 4 preset awal.
2. **REST API**:
   - Tes CRUD skill via skrip pengujian otomatis `scripts/test-skills-api.ts`.
   - Tes upload dan ekstraksi file ZIP.
   - Tes pemasangan dan pelepasan skill ke board.
3. **MCP Server**:
   - Pengujian stdio client untuk `list_skills`, `get_board_skills`, `read_skill_file`.
   - Pengujian `install_skill_to_local` dengan memverifikasi bahwa file fisik benar-benar tertulis di direktori disk lokal.
4. **UI & Responsivitas**:
   - Verifikasi tampilan navigasi sidebar, katalog grid `/skills`, modal upload, dan modal detail berkas.
   - Zero TypeScript compile error (`npx tsc --noEmit`).
