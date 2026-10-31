### Task 3: Interactive Sandbox Preview & Annotation Canvas Component

**Files to create:**
- `neokanban/src/components/ui-studio/PreviewCanvas.tsx`
- `neokanban/src/components/ui-studio/AnnotationFeed.tsx`
- `neokanban/src/components/ui-studio/AddEditPageModal.tsx`
- `neokanban/src/components/ui-studio/AddEditComponentModal.tsx`

**Requirements & Features:**
1. **`PreviewCanvas.tsx`**:
   - Viewport device switcher: `Desktop` (100%), `Tablet` (768px), `Mobile` (375px) dengan wrapper berlatar belakang gelap/papan canvas grid yang rapi.
   - Mode Toggle:
     - `Browse Mode` (pointer-events aktif pada iframe, user bisa klik tombol / input di dalam HTML preview).
     - `Review Mode` (pointer-events ke overlay crosshair canvas).
   - Anotasi:
     - Klik pada canvas: menaruh Pin Marker (lingkaran bernomor seperti #1, #2 beranimasi pulse, warna merah jika OPEN, hijau jika RESOLVED).
     - Drag pada canvas: menggambar Bounding Box kotak highlight (border dashed merah/oranye dengan background merah transparan).
     - Muncul popover form kecil saat pin/box ditaruh untuk mengetik komentar anotasi dan tombol "Simpan Catatan".
     - Iframe wajib menggunakan atribut:
       ```html
       <iframe
         sandbox="allow-scripts allow-forms"
         srcDoc={htmlContent}
         className="w-full h-full border-0 bg-white"
       />
       ```
     - Hover pada pin/box memicu preview tooltip komentar.

2. **`AnnotationFeed.tsx`**:
   - Sidebar panel kanan yang menyajikan daftar semua feedback / catatan UX:
     - Menampilkan nomor pin (#1, #2), author name/avatar, timestamp, tipe (PIN/BOX), dan isi komentar.
     - Badge status: `OPEN` vs `RESOLVED`.
     - Tombol toggle status: "Tandai Selesai" / "Buka Kembali" (memanggil `PUT /api/ui-annotations/[id]`).
     - Tombol "Jadikan Task Kanban" (memanggil `POST /api/ui-annotations/[id]/convert-task`).
     - Tautan badge jika sudah menjadi task Kanban (menampilkan ID task dan link).
     - Tombol hapus anotasi.
     - Klik pada item list di sidebar akan menyorot pin/box yang bersangkutan di `PreviewCanvas` (highlight animasi).

3. **`AddEditPageModal.tsx`**:
   - Form modal untuk tambah / edit Halaman:
     - Judul Halaman (e.g. "Billing & Invoicing View")
     - Rute Path (e.g. `/billing/invoices`)
     - Deskripsi Alur UX
     - Status Kesiapan: `DRAFT`, `IN_PROGRESS`, `READY`
     - HTML Content: Textarea besar dengan tabs preview atau drag-and-drop file `.html`.

4. **`AddEditComponentModal.tsx`**:
   - Form modal untuk tambah / edit Komponen UI:
     - Nama Komponen (e.g. "PrimaryButton")
     - Kategori (e.g. "Input", "Navigation", "Feedback", "Card", "General")
     - Deskripsi Komponen / Pedoman UX
     - HTML Content: Textarea / upload file `.html`.

**Verification:**
- Run `npx tsc --noEmit` and ensure 0 TypeScript compilation errors.
- Commit changes with message: `feat(ui): add PreviewCanvas, AnnotationFeed, and Studio modals`.

