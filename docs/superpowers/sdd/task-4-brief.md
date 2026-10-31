### Task 4: UI/UX Studio View & Board Tab Integration

**Files:**
- Create: `neokanban/src/components/ui-studio/UiStudioView.tsx`
- Modify: `neokanban/src/app/(dashboard)/boards/[id]/page.tsx`
- Test: `neokanban/scripts/test-ui-studio-e2e.ts`

**Specifications & Requirements:**
1. **`UiStudioView.tsx`**:
   - Menerima props `{ boardId: string, boardTitle: string, isOwner?: boolean }`.
   - Mengelola state sub-tab: `'pages'` (Peta Halaman / Site Map) vs `'components'` (Katalog Komponen).
   - Fetching data:
     - Mengambil list pages via `GET /api/boards/[boardId]/ui-pages`.
     - Mengambil list components via `GET /api/boards/[boardId]/ui-components`.
   - Layout 3-Kolom yang responsif:
     - **Kolom Kiri (Navigator / Site Tree):**
       - Sub-tab switcher pill: `Peta Halaman` (dengan icon `Compass` / `Map`) & `Katalog Komponen` (dengan icon `Box` / `Component`).
       - Search bar filter.
       - Category filter tabs untuk komponen (`All`, `Input`, `Navigation`, `Feedback`, `Card`, dll.).
       - List item kartu halaman/komponen:
         - Menampilkan title / name dan path URL / category.
         - Badge status: `DRAFT` (slate), `IN_PROGRESS` (amber), `READY` (emerald).
         - Counter badge issue: misal `2 open issues` (rose pill).
         - Tombol edit metadata & tombol delete (dengan konfirmasi).
       - Tombol `+ Tambah Halaman` / `+ Tambah Komponen` yang membuka modal.
     - **Kolom Tengah (Stage Preview):**
       - Menampilkan `PreviewCanvas` untuk halaman / komponen yang sedang dipilih.
       - Header ringkas dengan judul item, path/category, dan status kesiapan.
       - Tombol toggle mode `Browse Mode` vs `Review Mode`.
       - Handler `onAddAnnotation`: memanggil `POST /api/ui-annotations` lalu refresh data anotasi.
     - **Kolom Kanan (Feedback & Catatan Feed):**
       - Menampilkan `AnnotationFeed` dengan live connection ke state anotasi item yang aktif.
       - Handler `onToggleStatus`: memanggil `PUT /api/ui-annotations/[id]`.
       - Handler `onConvertToTask`: memanggil `POST /api/ui-annotations/[id]/convert-task`.
       - Handler `onDeleteAnnotation`: memanggil `DELETE /api/ui-annotations/[id]`.
   - Empty state yang ramah pengguna jika belum ada halaman atau komponen yang dibuat.

2. **Integrasi ke `boards/[id]/page.tsx`**:
   - Tambahkan state `'ui-studio'` pada `activeTab` type:
     `'board' | 'context' | 'timeline' | 'skills' | 'ui-studio'`
   - Tambahkan tombol tab ke-5 di navigation bar header board:
     - Label: **`UI/UX Studio`**
     - Ikon: `Palette` dari `lucide-react`
   - Render `<UiStudioView boardId={board.id} boardTitle={board.title} isOwner={board.isOwner} />` saat `activeTab === 'ui-studio'`.

3. **Verifikasi**:
   - `npx tsc --noEmit` lolos tanpa error.
   - `npx tsx scripts/test-ui-studio-e2e.ts` lolos.
   - Commit & push: `git add src/app/(dashboard)/boards/[id]/page.tsx src/components/ui-studio/UiStudioView.tsx` dan `git commit -m "feat(board): integrate UI/UX Studio tab into board detail view"`.

