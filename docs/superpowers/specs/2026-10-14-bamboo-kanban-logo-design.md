# Fitur Logo Bamboo Kanban — Desain & Spesifikasi

- **Tanggal:** 2026-10-14
- **Status:** Approved
- **Proyek:** NeoKanban
- **Tujuan:** Merancang dan mengimplementasikan logo resmi web NeoKanban berupa metafora batang bambu yang membentuk 3 pilar kolom Kanban (*Asymmetric Staggered Trilog*) dengan estetika monokrom modern bergaya Counsel/Linear.

---

## 1. Problem Statement & Latar Belakang

1. **Kebutuhan Identitas Visual yang Khas:**  
   Saat ini, antarmuka NeoKanban (termasuk pada sidebar navigation dan halaman autentikasi) masih menggunakan ikon placeholder darurat berupa segitiga (`▲`) yang belum mencerminkan identitas brand unik platform.
2. **Harmonisasi Simbolisme Bambu & Alur Kerja Kanban:**  
   Bambu melambangkan pertumbuhan berkelanjutan (*sustainable growth*), ketahanan (*resilience*), dan struktur beruas (*segmented nodes*). Karakteristik ruas bambu secara alami memiliki kesamaan bentuk dengan kartu-kartu tugas (*cards*) di dalam kolom Kanban.
3. **Estetika Monokrom & Tech-Forward:**  
   NeoKanban mengusung gaya visual *Counsel Minimalist* yang bersih, berfokus pada tipografi dan palet abu-abu gelap netral (`neutral-900`/graphite). Logo harus berwujud vektor murni (*crisp SVG*) tanpa efek skeuomorfik yang berlebihan, sehingga tajam di segala resolusi layar.

---

## 2. Geometri Vektor & Anatomi SVG

### 2.1. ViewBox & Grid Geometris
* **ViewBox:** `0 0 32 32` (skala dasar 32×32 pixel, ideal untuk scaling 1:1 ke ukuran 16px, 20px, 24px, 28px, 32px, hingga 64px).
* **Dimensi Batang & Kolom:**
  * **Lebar Batang Bambu:** `6px` per batang.
  * **Celah Antar Batang (Column Spacing):** `2px`.
  * **Rentang Koordinat Horizontal:**
    * Pilar 1 (Kiri): $X = 5 \dots 11$
    * Pilar 2 (Tengah): $X = 13 \dots 19$
    * Pilar 3 (Kanan): $X = 21 \dots 27$
  * **Celah Sekat Antar Kartu (Card Slits):** `1.5px`–`2px` celah horizontal bersih untuk membedakan tiap kartu tugas.

### 2.2. Struktur 3 Batang Bambu (The Asymmetric Staggered Trilog)
1. **Pilar Kiri (Kolom "To Do" / 2 Ruas Kartu):**
   * **Ruas Atas (Card 1):** Ujung atas miring serong 45° khas potongan bambu Jepang (*kadomatsu cut*) dari kiri bawah ke kanan atas (`M5 11.5 L11 8.5 V17.5 C11 18.05 10.55 18.5 10 18.5 H6 C5.45 18.5 5 18.05 5 17.5 V11.5 Z`).
   * **Ruas Bawah (Card 2):** Dasar tiang dengan sudut bawah beradius halus (`rx=1.5`) menyentuh dasar $Y = 28$ (`M5 20.5 H11 V26 C11 27.1 10.1 28 9 28 H7 C5.9 28 5 27.1 5 26 V20.5 Z`).
2. **Pilar Tengah (Kolom "In Progress" / 3 Ruas Kartu — Titik Puncak Dinamis):**
   * Pilar tertinggi sebagai fokus sentral aktivitas pengerjaan tugas.
   * **Ruas Atas (Card 1):** Puncak potongan serong paling tinggi (`M13 6.5 L19 3.5 V11.5 C19 12.05 18.55 12.5 18 12.5 H14 C13.45 12.5 13 12.05 13 11.5 V6.5 Z`).
   * **Ruas Tengah (Card 2):** Blok kartu persegi panjang ramping (`x=13, y=14.5, width=6, height=5, rx=1`).
   * **Ruas Bawah (Card 3):** Dasar tiang dengan radius bawah lembut menyentuh dasar $Y = 28$.
3. **Pilar Kanan (Kolom "Done" / 2 Ruas Kartu):**
   * Pilar dengan ketinggian sedang-rendah, merepresentasikan tugas yang telah selesai ditata rapi.
   * **Ruas Atas (Card 1):** Potongan serong pada ketinggian $Y = 15.5 \dots 12.5$.
   * **Ruas Bawah (Card 2):** Dasar tiang menyentuh dasar $Y = 28$.

### 2.3. Palet Warna Monokrom (Tonal Shading)
* **Varian Badge (Dark Container, background `#171717` / `neutral-900`):**
  * Ruas Atas / Highlight: `#fafafa`
  * Ruas Tengah: `#e4e4e7`
  * Ruas Bawah / Dasar: `#d4d4d8`
* **Varian Standalone (Transparent Vector):**
  * Menggunakan `currentColor` (default `neutral-900` pada latar terang, atau adaptif sesuai class Tailwind induk).

---

## 3. Arsitektur Komponen React

### 3.1. Spesifikasi File
* **File Target:** `src/components/ui/BambooLogo.tsx`
* **Directive:** `'use client'`
* **Interface Props:**
  ```typescript
  export interface BambooLogoProps {
    size?: number // Ukuran dimensi SVG dalam pixel (default: 20)
    className?: string // Styling Tailwind kustom
    variant?: 'monochrome' | 'badge' // 'badge' (dark rounded box) atau 'monochrome' (pure svg)
    badgeSize?: number // Ukuran kontainer badge jika variant='badge' (default: Math.round(size * 1.5))
  }
  ```

### 3.2. Implementasi Komponen
* Komponen bersifat modular, tanpa dependensi library eksternal, dan berukuran kecil (<100 baris kode).
* Saat `variant === 'badge'`, komponen membungkus SVG di dalam kontainer:
  ```tsx
  <div
    style={{ width: bSize, height: bSize }}
    className="rounded-lg bg-neutral-900 flex items-center justify-center shadow-xs shrink-0"
  >
    {svgContent}
  </div>
  ```

---

## 4. Rencana Integrasi Sistem & Penempatan UI

1. **Sidebar Navigation Header (`src/components/layout/Sidebar.tsx`):**
   * Menggantikan tag placeholder `▲` di bagian atas sidebar:
     * Kondisi Expanded: `<BambooLogo variant="badge" size={18} badgeSize={28} />` berdampingan dengan teks "NeoKanban".
     * Kondisi Collapsed: `<BambooLogo variant="badge" size={18} badgeSize={28} />` tepat di tengah kontainer header.
2. **Halaman Autentikasi (`src/app/(auth)/login/page.tsx` & `register/page.tsx`):**
   * Menampilkan identitas logo brand di atas form input.
3. **Next.js App Icon Metadata (`src/app/icon.svg`):**
   * Menyediakan file SVG murni di route metadata Next.js sehingga otomatis menjadi favicon resmi aplikasi di tab browser.

---

## 5. Rencana Pengujian & Verifikasi

1. **Uji Tampilan Visual UI:**
   * Memastikan logo ter-render dengan tajam pada Sidebar saat expanded (`w-64`) dan collapsed (`w-16`).
   * Memastikan tidak terjadi layout shift atau overflow visual.
2. **Uji Kompatibilitas Build & Tipe:**
   * Menjalankan pemeriksaan `npm run build` atau `npx next lint` untuk memastikan tidak ada error kompilasi TypeScript atau SSR hydration issue.
