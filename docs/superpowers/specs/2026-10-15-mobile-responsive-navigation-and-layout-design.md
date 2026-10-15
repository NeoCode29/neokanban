# Spesifikasi Desain: Peningkatan Responsif Komprehensif NeoKanban (Mobile Drawer & Adaptive App Shell)

**Tanggal:** 15 Oktober 2026  
**Status:** Draf Disetujui (Approved Design)  
**Target Proyek:** `neokanban` (Next.js 15 App Router, Tailwind CSS, Lucide Icons)

---

## 1. Latar Belakang & Masalah

Saat ini, platform **NeoKanban** dioptimalkan terutama untuk tampilan layar desktop (viewport $\ge$ 1024px). Terdapat beberapa kelemahan pada layar smartphone dan tablet (viewport $<$ 1024px):
1. **Sidebar Statis:** Komponen `Sidebar.tsx` bersifat permanen dengan lebar tetap (`w-64` atau `w-16`). Pada layar kecil, sidebar memakan sebagian besar area layar atau menekan layout utama.
2. **Tidak Ada Tombol Navigasi Mobile:** `TopHeader.tsx` tidak memiliki tombol hamburger menu untuk membuka atau menutup navigasi di smartphone/tablet.
3. **Board Header & Tab Overflow:** Pada `BoardPage`, judul board, status favorite, menu hapus/kolaborator, tombol aksi (`Share`, `New task`), serta tab switcher (*Kanban Board*, *Living Context*, *Timeline*) bertumpuk kaku dan memicu layout break saat dibuka di resolusi 360px - 640px.
4. **Modal Viewport Overflow:** Komponen dialog modal (`CardDetailModal`, `ColumnSettingsModal`, `CreateBoardModal`, `ShareBoardModal`) memiliki lebar kaku tanpa batas maksimal viewport kecil, sehingga elemen atau tombol aksi dapat terpotong di layar HP.

---

## 2. Tujuan & Kriteria Keberhasilan (Success Criteria)

1. **Mobile Drawer Navigation:**
   - Di layar mobile & tablet (`< 1024px` / `lg`), sidebar desktop disembunyikan.
   - Tombol Hamburger Menu (`Menu` icon) hadir di `TopHeader.tsx` untuk membuka drawer navigasi slide-over dari sisi kiri dengan backdrop semi-transparan.
   - Drawer dapat ditutup dengan tombol `X`, klik backdrop luar, atau otomatis saat navigasi berpindah halaman (`pathname` change).
2. **Desktop Sidebar Preserved:**
   - Di layar desktop (`>= 1024px`), sidebar tetap berfungsi seperti sedia kala lengkap dengan tombol toggle collapse/expand (`w-16` vs `w-64`).
3. **Adaptive Board Header & View Switcher:**
   - Header papan di `BoardPage` mengadopsi flex-col di mobile dan flex-row di desktop.
   - Tab switcher (*Kanban*, *Context*, *Timeline*) dan filter pill kolom mendukung horizontal touch-scroll tanpa merusak lebar halaman (`overflow-x-auto no-scrollbar`).
   - Quick Search bar di papan menyesuaikan lebar penuh di mobile dan lebar tetap di desktop.
4. **Responsive Modals:**
   - Semua modal memiliki constraint `max-w-[95vw] sm:max-w-2xl` dengan `max-h-[90vh] overflow-y-auto` agar selalu pas di viewport smartphone.
5. **Zero Regression:**
   - Seluruh fungsionalitas drag-and-drop `@dnd-kit`, living context, timeline, dan API call tetap berjalan 100% normal.

---

## 3. Arsitektur Teknis & Perubahan Komponen

### A. Context State Navigasi: `SidebarContext`
Untuk mengkoordinasikan tombol hamburger di `TopHeader` dengan drawer di `Sidebar`, dibuat context React ringan di `src/components/layout/SidebarContext.tsx`:
```typescript
interface SidebarContextType {
  isMobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
  toggleMobile: () => void
  isCollapsed: boolean
  toggleCollapsed: () => void
}
```
Provider ini dibungkus pada `DashboardLayout` (`src/app/(dashboard)/layout.tsx`).

### B. Komponen `TopHeader.tsx`
- Menambahkan tombol menu mobile (`Menu` dari `lucide-react`) dengan styling `lg:hidden p-1.5 -ml-1 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100`.
- Menjaga breadcrumbs tetap rapi dengan kelas `truncate max-w-[200px] sm:max-w-md`.

### C. Komponen `Sidebar.tsx`
- **Bagian Desktop (`hidden lg:flex`):**
  - Menggunakan state `isCollapsed` dari context atau local state.
  - Sticky di kiri, tinggi layar penuh, transisi lebar `w-16` / `w-64`.
- **Bagian Mobile Drawer (`lg:hidden`):**
  - Render saat `isMobileOpen = true`.
  - Backdrop: `fixed inset-0 bg-neutral-900/50 backdrop-blur-xs z-40 transition-opacity`.
  - Drawer Container: `fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#f9fafb] z-50 shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out`.
  - Dilengkapi tombol tutup `X` di header drawer.
  - Menggunakan `useEffect` untuk memanggil `closeMobile()` ketika `pathname` berubah.

### D. Komponen `BoardPage` (`src/app/(dashboard)/boards/[id]/page.tsx`)
- Baris judul utama diubah menjadi:
  ```tsx
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    {/* Title & info badges */}
    {/* Action buttons (Share & New Task) */}
  </div>
  ```
- Tombol aksi:
  ```tsx
  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
    <button className="flex-1 sm:flex-initial ...">Share</button>
    <button className="flex-1 sm:flex-initial ...">New task</button>
  </div>
  ```
- Tier 1 View Switcher:
  ```tsx
  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
    {/* Tabs */}
  </div>
  ```
- Tier 2 Filter & Search:
  ```tsx
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar ...">...</div>
    <div className="relative w-full sm:w-64">...</div>
  </div>
  ```

### E. Standardisasi Dialog Modal
- `CardDetailModal.tsx`, `ColumnSettingsModal.tsx`, `CreateBoardModal.tsx`, `ShareBoardModal.tsx`:
  - Kontainer dialog: `w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6`.

---

## 4. Rencana Pengujian & Verifikasi

1. **Responsiveness Test (Multi-Viewport Verification)**:
   - Mobile: 375px (iPhone SE / iPhone 13 mini) & 414px.
   - Tablet: 768px (iPad Mini / Portrait tablet).
   - Desktop: 1280px & 1440px.
2. **Interaksi Drawer**:
   - Klik tombol hamburger di mobile -> drawer terbuka mulus dari kiri.
   - Klik tautan navigasi -> halaman berpindah dan drawer tertutup otomatis.
   - Klik backdrop gelap atau tombol silang -> drawer tertutup.
3. **Fungsionalitas Kanban & Modal**:
   - Membuka modal detail kartu di viewport mobile tidak terpotong atau keluar batas layar.
   - Filter kolom dan tab switcher dapat digeser horizontal tanpa memicu horizontal scrolling pada seluruh halaman.
4. **Build & Lint Check**:
   - `npm run build` di `neokanban` sukses tanpa TypeScript error.

---
