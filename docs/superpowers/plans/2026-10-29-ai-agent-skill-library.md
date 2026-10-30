# AI Agent Skill Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fitur AI Agent Skill Library di NeoKanban lengkap dengan katalog multi-file (`SKILL.md`, `examples/`, `scripts/`), upload skill sendiri (ZIP / multi-file editor), pemasangan skill ke project board, dan pengunduhan/pemasangan ke filesystem lokal via MCP (`install_skill_to_local`).

**Architecture:** Menggunakan model relasional database Prisma (`Skill`, `SkillFile`, `BoardSkill`) yang dipadukan dengan REST API Next.js App Router, halaman katalog responsif `/skills`, dan server stdio MCP yang mengekspos 4 tool baru (`list_skills`, `get_board_skills`, `read_skill_file`, `install_skill_to_local`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma ORM v6, PostgreSQL, Tailwind CSS v4, Lucide React, JSZip, `@modelcontextprotocol/sdk`.

## Global Constraints
- Target direktori utama: `neokanban/`
- Zero schema breaking changes pada relasi yang sudah ada (`User`, `Board`)
- Seluruh endpoint API terproteksi autentikasi (`getCurrentUser` via JWT session / PAT token)
- Preset resmi (`isPreset: true`) dilindungi dari modifikasi destruktif atau penghapusan
- Seluruh langkah TDD wajib memiliki bukti eksekusi sebelum kartu dipindahkan ke `In Review`

---

### Task 1: Skema Database & Seeder Preset Skills

**Agent:** `postgres-pro`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed-skills.ts`
- Modify: `prisma/seed.ts`
- Create: `scripts/test-skills-db.ts`

**Interfaces:**
- Produces: Model `Skill`, `SkillFile`, dan `BoardSkill` pada `@prisma/client`.

- [ ] **Step 1: Write test script untuk model Skill & SkillFile**
  Buat `scripts/test-skills-db.ts` yang memverifikasi bahwa model `Skill`, `SkillFile`, dan `BoardSkill` terdefinisi dan dapat di-query dengan relasi yang benar.

- [ ] **Step 2: Tambahkan model ke `prisma/schema.prisma`**
  Definisikan model `Skill`, `SkillFile`, dan `BoardSkill` beserta relasi bolak-balik ke `User` (`createdSkills`) dan `Board` (`installedSkills`).

- [ ] **Step 3: Generate Prisma Client**
  Jalankan `npx prisma generate` di direktori `neokanban` untuk memperbarui types `@prisma/client`.

- [ ] **Step 4: Buat seeder preset skills di `prisma/seed-skills.ts`**
  Implementasikan seed untuk 4 skill preset terkurasi:
  1. `tdd-workflow`: `SKILL.md` siklus TDD + `examples/sample-test.spec.ts`.
  2. `code-review-gate`: `SKILL.md` checklist review + aturan *Never Auto-Done*.
  3. `security-audit`: `SKILL.md` OWASP sanitasi + `references/security-checklist.md`.
  4. `nextjs-best-practices`: `SKILL.md` App Router Server vs Client component boundaries.

- [ ] **Step 5: Verifikasi dan Commit**
  Jalankan `npx tsc --noEmit` dan `git commit -m "feat(db): add Skill, SkillFile, and BoardSkill models with presets seeder"`.

---

### Task 2: REST API Endpoints untuk Skill Catalog & Board Skills

**Agent:** `nextjs-developer`

**Files:**
- Create: `src/app/api/skills/route.ts`
- Create: `src/app/api/skills/[id]/route.ts`
- Create: `src/app/api/skills/[id]/export/route.ts`
- Create: `src/app/api/boards/[id]/skills/route.ts`
- Create: `src/app/api/boards/[id]/skills/[skillId]/route.ts`
- Create: `scripts/test-skills-api.ts`

**Interfaces:**
- Consumes: `@prisma/client` (`prisma.skill`, `prisma.skillFile`, `prisma.boardSkill`), `@/lib/auth` (`getCurrentUser`), `@/lib/board-auth` (`hasBoardAccess`).
- Produces: Endpoint JSON `/api/skills`, `/api/skills/[id]`, `/api/skills/[id]/export`, dan `/api/boards/[id]/skills`.

- [ ] **Step 1: Write API integration tests**
  Buat `scripts/test-skills-api.ts` yang menguji `GET /api/skills`, `POST /api/skills` (validasi payload & autorisasi), `POST /api/boards/[id]/skills` (linking), dan `DELETE /api/boards/[id]/skills/[skillId]` (unlinking).

- [ ] **Step 2: Implementasi `GET /api/skills` & `POST /api/skills`**
  - `GET`: Query seluruh skill dengan filter `category` dan `role`, menyertakan jumlah board yang memasang.
  - `POST`: Validasi login, generate slug unik, dan simpan skill beserta array `files` dalam satu transaksi Prisma.

- [ ] **Step 3: Implementasi `GET`, `PUT`, `DELETE /api/skills/[id]`**
  - Mengambil detail skill dan file-filenya.
  - Edit/hapus custom skill oleh pemiliknya (proteksi preset).

- [ ] **Step 4: Implementasi Export ZIP `/api/skills/[id]/export`**
  Menggunakan `jszip` untuk mengemas seluruh `SkillFile` menjadi archive `.zip` yang dapat langsung diunduh browser.

- [ ] **Step 5: Implementasi `/api/boards/[id]/skills`**
  - `GET`: Mengambil seluruh skill yang sedang aktif pada board.
  - `POST`: Menautkan skill ke board (`BoardSkill`).
  - `DELETE`: Melepaskan skill dari board.

- [ ] **Step 6: Verifikasi dan Commit**
  Jalankan `scripts/test-skills-api.ts`, jalankan `npx tsc --noEmit`, dan commit: `feat(api): implement REST API for skills catalog, board attachment, and ZIP export`.

---

### Task 3: MCP Server Tools (Termasuk `install_skill_to_local`)

**Agent:** `typescript-pro`

**Files:**
- Modify: `mcp/src/index.ts`
- Modify: `mcp/dist/index.js`
- Create: `scripts/test-mcp-skills.ts`

**Interfaces:**
- Consumes: NeoKanban REST API via `apiRequest`.
- Produces: 4 Tool MCP baru: `list_skills`, `get_board_skills`, `read_skill_file`, dan `install_skill_to_local`.

- [ ] **Step 1: Write failing test script untuk MCP skills**
  Buat `scripts/test-mcp-skills.ts` yang menyimulasikan client MCP memanggil `list_skills`, `get_board_skills`, `read_skill_file`, dan `install_skill_to_local`.

- [ ] **Step 2: Tambahkan tool `list_skills` dan `get_board_skills` di `mcp/src/index.ts`**
  - `list_skills`: Menampilkan ringkasan katalog skill, target role, dan daftar file.
  - `get_board_skills`: Menampilkan skill yang aktif terpasang pada board tertentu beserta instruksi utamanya.

- [ ] **Step 3: Tambahkan tool `read_skill_file` di `mcp/src/index.ts`**
  Membaca spesifik berkas (misal `examples/sample.ts`) dari sebuah skill.

- [ ] **Step 4: Tambahkan tool `install_skill_to_local` di `mcp/src/index.ts`**
  - Mengambil seluruh file dari skill terpilih via API.
  - Menentukan path folder target (default: `.agents/skills/<skillSlug>` di direktori eksekusi lokal).
  - Membuat folder rekursif dengan `fs.promises.mkdir` dan menulis seluruh file fisik ke disk lokal.

- [ ] **Step 5: Build MCP & Verifikasi Stdio**
  Jalankan `npm run mcp:build`, jalankan `scripts/test-mcp-skills.ts`, dan commit: `feat(mcp): add list_skills, get_board_skills, read_skill_file, and install_skill_to_local tools`.

---

### Task 4: Halaman Web Skill Library (`/skills`) & Navigasi Sidebar

**Agent:** `ux-ui-pro-max`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Create: `src/app/(dashboard)/skills/page.tsx`
- Create: `src/components/skills/SkillCard.tsx`
- Create: `src/components/skills/AddToBoardModal.tsx`
- Create: `src/components/skills/SkillDetailModal.tsx`

**Interfaces:**
- Consumes: `/api/skills`, `/api/boards`, `/api/boards/[id]/skills`.
- Produces: Tampilan antarmuka katalog skill, filter kategori, detail viewer file-tree, dan modal pemasangan board.

- [ ] **Step 1: Perbarui `Sidebar.tsx`**
  Tambahkan item menu **`Skill Library`** dengan ikon `Sparkles` / `Layers` dan route `/skills` (lengkap dengan penyesuaian saat sidebar collapse `isCollapsed`).

- [ ] **Step 2: Buat komponen `SkillCard.tsx`**
  Menampilkan nama skill, badge kategori, badge target role, jumlah file, tombol *"Inspect Files"*, *"Add to Board"*, dan *"Download ZIP"*.

- [ ] **Step 3: Buat modal `SkillDetailModal.tsx`**
  Modal inspeksi berkas dengan sidebar daftar file di kiri (`SKILL.md`, `examples/...`) dan `MarkdownViewer` / code block di kanan.

- [ ] **Step 4: Buat modal `AddToBoardModal.tsx`**
  Modal interaktif untuk memilih board target dan menautkan skill dengan 1 klik.

- [ ] **Step 5: Buat halaman `src/app/(dashboard)/skills/page.tsx`**
  Halaman katalog utama dengan Search bar, Filter pill kategori (*All, Testing, Frontend, Backend, Security*), tombol *Upload Skill*, dan grid kartu responsif.

- [ ] **Step 6: Verifikasi dan Commit**
  Verifikasi layout responsif desktop dan mobile, jalankan `npx tsc --noEmit`, dan commit: `feat(ui): add Skill Library catalog page, skill card, file detail viewer, and sidebar link`.

---

### Task 5: Modal Upload Skill (Dukungan ZIP & Multi-File Editor)

**Agent:** `nextjs-developer`

**Files:**
- Create: `src/components/skills/UploadSkillModal.tsx`
- Modify: `src/app/(dashboard)/skills/page.tsx`
- Create: `scripts/test-skill-zip-upload.ts`

**Interfaces:**
- Consumes: `jszip` client-side parsing, `POST /api/skills`.
- Produces: Dialog upload berkas skill (.zip atau editor form manual).

- [ ] **Step 1: Pasang dependensi `jszip` jika belum terpasang**
  Jalankan `npm install jszip @types/jszip`.

- [ ] **Step 2: Buat komponen `UploadSkillModal.tsx`**
  - Tab 1: **Upload ZIP Archive**: Drag-and-drop file `.zip`, otomatis mengekstrak `SKILL.md` (mengambil judul dan deskripsi dari frontmatter) dan memetakan seluruh file pendukung.
  - Tab 2: **Manual Multi-File Editor**: Form input judul, slug, kategori, target role, dan editor untuk menambahkan file baru (`filePath` dan `content`).

- [ ] **Step 3: Integrasikan modal ke `/skills/page.tsx`**
  Hubungkan tombol *"Upload Skill"* dengan modal dan refresh katalog setelah upload berhasil.

- [ ] **Step 4: Verifikasi dan Commit**
  Jalankan tes ekstraksi ZIP `scripts/test-skill-zip-upload.ts`, cek `npx tsc --noEmit`, dan commit: `feat(ui): add UploadSkillModal with zip extraction and multi-file authoring`.

---

### Task 6: Integrasi Active Skills pada Tab Project Context Board

**Agent:** `ux-ui-pro-max`

**Files:**
- Modify: `src/components/context/ProjectContextView.tsx`
- Modify: `src/app/(dashboard)/boards/[id]/page.tsx`

**Interfaces:**
- Consumes: `/api/boards/[id]/skills`.
- Produces: Seksi "Installed AI Skills" di tab Project Context.

- [ ] **Step 1: Update `ProjectContextView.tsx`**
  Tambahkan seksi/tab **"Installed AI Skills"** yang menampilkan daftar skill yang terpasang pada board tersebut beserta status aktifnya.

- [ ] **Step 2: Sediakan tombol Detach / Quick Install**
  Pemilik board dapat langsung mencopot skill atau mengklik tombol *"Browse Skill Library"* untuk memasang skill baru langsung dari tab Project Context.

- [ ] **Step 3: Verifikasi dan Commit**
  Pastikan tampilan selaras dengan estetika Counsel/Linear, cek `npx tsc --noEmit`, dan commit: `feat(context): integrate installed AI skills section into ProjectContextView`.

---

### Task 7: Pengujian Menyeluruh (E2E), Verifikasi Sinkronisasi MCP, dan Dokumentasi

**Agent:** `refactoring-specialist`

**Files:**
- Create: `scripts/test-skills-e2e.ts`
- Modify: `.context/living-context-hub.md`
- Modify: `.context/mcp-specification.md`
- Update: NeoKanban Card Task di Board Live

**Interfaces:**
- Consumes: Seluruh komponen yang telah dibangun.
- Produces: Bukti pengujian end-to-end, pembaruan dokumentasi `.context`, dan laporan verifikasi di kartu board.

- [x] **Step 1: Buat skrip verifikasi E2E `scripts/test-skills-e2e.ts`**
  Menguji seluruh alur:
  1. Membuat/upload skill baru dengan multi-file.
  2. Memasang skill ke board via API.
  3. Membaca skill aktif via MCP `get_board_skills`.
  4. Menguji MCP `install_skill_to_local` dan memverifikasi folder fisik tertulis di disk komputer.
  5. Melepas skill dan membersihkan artefak tes.

- [x] **Step 2: Jalankan skrip E2E dan verifikasi hasil**
  Pastikan seluruh tes lolos 100%.

- [x] **Step 3: Perbarui dokumentasi internal `.context/`**
  Update `mcp-specification.md` (menambahkan dokumentasi 4 tools baru) dan `living-context-hub.md`.

- [x] **Step 4: Security Hardening & Penetration Testing Remediation**
  Audit & Patch OWASP Top 10 vulnerabilities:
  1. VULN-01 (Path Traversal / Zip Slip Prevention): Block traversal in `/api/skills` and MCP `install_skill_to_local`.
  2. VULN-02 (Stored XSS & Malicious Extension Prevention): Block SVG uploads and strictly derive extensions from MIME.
  3. VULN-03 (Production Secret & Test Bypass Guard): Enforce `JWT_SECRET` in production and deactivate test mock auth.
  4. VULN-04 (Brute-Force Rate Limiting & Constant-Time Login): In-memory IP rate limiter and dummy hash verification.
  5. VULN-05 (JavaScript URL Protocol Filtering): Safe link & image filtering in MarkdownViewer.

- [x] **Step 5: Push ke GitHub & Laporkan ke Board**
  Push seluruh commit ke `origin/master` dan posting komentar verifikasi ke kartu task di NeoKanban.

