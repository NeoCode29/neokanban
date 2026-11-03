# UI Studio MCP Suite, Living Context Bridge & Dynamic Categories Design

**Date:** 2026-11-03  
**Status:** Approved  
**Target Project:** NeoKanban (`neokanban`)  
**Branch:** `feat/ui-ux-studio`  

---

## 1. Executive Summary & Purpose

NeoKanban menyediakan antarmuka **UI/UX Studio** untuk mengelola peta prototipe rute halaman (`UiPage`) dan katalog komponen desain (`UiComponent`) beserta anotasi tinjauan visual (`UiAnnotation`). 

Pembaruan ini bertujuan untuk:
1. **Mengekspos operasi UI Studio ke Agen AI** melalui 8 tool native MCP (Model Context Protocol).
2. **Menjembatani Living Context dan UI Studio**, memungkinkan pengguna/agen mendeteksi dan mengimpor file HTML yang disimpan di Living Context ke katalog komponen secara mulus (1-klik modal import).
3. **Menerapkan Filter Kategori Dinamis** di UI Studio Web, sehingga kategori filter disesuaikan otomatis dengan kategori yang ada pada basis data tanpa ketergantungan pada daftar statis.

---

## 2. Arsitektur & Perubahan Sistem

### 2.1. MCP Server Suite (`mcp/src/index.ts`)
Model Context Protocol daemon berjalan di `mcp/src/index.ts` dan berkomunikasi ke Next.js Route Handlers menggunakan fungsi pembantu universal `apiRequest` dengan Bearer PAT token.

#### Delapan (8) Tool MCP Baru:
1. **`list_ui_components`**
   - **Argumen:**
     - `boardId` (string, required): ID board target.
     - `category` (string, optional): Filter kategori tertentu.
     - `token` (string, optional): PAT override.
   - **Endpoint REST:** `GET /api/boards/${boardId}/ui-components?category=${category || ''}`
   - **Return:** Daftar komponen dengan metadata ID, nama, kategori, deskripsi, urutan, ringkasan htmlContent, dan ringkasan anotasi/review pin.

2. **`create_ui_component`**
   - **Argumen:**
     - `boardId` (string, required)
     - `name` (string, required)
     - `category` (string, optional, default: `"General"`)
     - `description` (string, optional)
     - `htmlContent` (string, required)
     - `order` (number, optional)
     - `token` (string, optional)
   - **Endpoint REST:** `POST /api/boards/${boardId}/ui-components`

3. **`update_ui_component`**
   - **Argumen:**
     - `boardId` (string, required)
     - `componentId` (string, required)
     - `name` (string, optional)
     - `category` (string, optional)
     - `description` (string, optional)
     - `htmlContent` (string, optional)
     - `order` (number, optional)
     - `token` (string, optional)
   - **Endpoint REST:** `PUT /api/boards/${boardId}/ui-components/${componentId}`

4. **`delete_ui_component`**
   - **Argumen:**
     - `boardId` (string, required)
     - `componentId` (string, required)
     - `token` (string, optional)
   - **Endpoint REST:** `DELETE /api/boards/${boardId}/ui-components/${componentId}`

5. **`list_ui_pages`**
   - **Argumen:**
     - `boardId` (string, required)
     - `status` (string, optional)
     - `token` (string, optional)
   - **Endpoint REST:** `GET /api/boards/${boardId}/ui-pages`

6. **`create_ui_page`**
   - **Argumen:**
     - `boardId` (string, required)
     - `title` (string, required)
     - `path` (string, required)
     - `htmlContent` (string, required)
     - `status` (enum `DRAFT` | `IN_PROGRESS` | `READY`, default: `DRAFT`)
     - `description` (string, optional)
     - `order` (number, optional)
     - `token` (string, optional)
   - **Endpoint REST:** `POST /api/boards/${boardId}/ui-pages`

7. **`update_ui_page`**
   - **Argumen:**
     - `boardId` (string, required)
     - `pageId` (string, required)
     - `title` (string, optional)
     - `path` (string, optional)
     - `htmlContent` (string, optional)
     - `status` (enum `DRAFT` | `IN_PROGRESS` | `READY`, optional)
     - `description` (string, optional)
     - `order` (number, optional)
     - `token` (string, optional)
   - **Endpoint REST:** `PUT /api/boards/${boardId}/ui-pages/${pageId}`

8. **`delete_ui_page`**
   - **Argumen:**
     - `boardId` (string, required)
     - `pageId` (string, required)
     - `token` (string, optional)
   - **Endpoint REST:** `DELETE /api/boards/${boardId}/ui-pages/${pageId}`

---

### 2.2. Living Context Bridge di UI Studio Web (`UiStudioView.tsx`)

#### Logika Deteksi
- Saat `fetchAllData` dijalankan, fetch paralel juga dilakukan ke `/api/boards/${boardId}/context`.
- Dokumen disaring untuk menemukan berkas yang berakhiran `.html` (`doc.fileName.toLowerCase().endsWith('.html')`).
- File kandidat yang belum ada di katalog komponen (`!components.some(c => c.name.toLowerCase() === baseName.toLowerCase())`) ditampung dalam state `pendingContextHtmlFiles`.

#### Tampilan Banner & Interaksi
- Tampil di atas galeri komponen jika `subTab === 'components'` dan `pendingContextHtmlFiles.length > 0` serta belum di-dismiss pada sesi berjalan.
- Mengikuti gaya estetika Counsel Minimalist: border tipis, warna aksen halus amber/indigo, typography ringkas.
- Tombol **`[ + Import ke Catalog ]`**:
  - Membuka modal `AddEditComponentModal` dengan data pra-isi:
    - `name`: nama file tanpa ekstensi `.html`
    - `category`: `"General"`
    - `description`: `"Diimpor dari Living Context: ${doc.fileName}"`
    - `htmlContent`: isi string HTML dokumen
- Pengguna dapat meninjau kode, menyesuaikan nama/kategori, dan menekan *Simpan*.

---

### 2.3. Filter Kategori Dinamis (`UiStudioView.tsx` & `AddEditComponentModal.tsx`)

#### Logika Dinamis
- `dynamicCategories`:
  ```typescript
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>()
    components.forEach((c) => {
      if (c.category && c.category.trim()) {
        cats.add(c.category.trim())
      }
    })
    return ['All', ...Array.from(cats).sort()]
  }, [components])
  ```
- **Safety Fallback:**
  ```typescript
  useEffect(() => {
    if (selectedCategory !== 'All' && !dynamicCategories.includes(selectedCategory)) {
      setSelectedCategory('All')
    }
  }, [dynamicCategories, selectedCategory])
  ```
- Menyediakan opsi kategori yang ada sebagai sugesti pada input kategori di `AddEditComponentModal`.

---

## 3. Keamanan & Batasan Sistem

1. **Autentikasi PAT & Board Access:**
   Semua request API dari tool MCP diverifikasi melalui `hasBoardAccess(boardId, userId)` dan Bearer PAT token.
2. **Sanitasi Null-Byte (`sanitizeUtf8`):**
   Mencegah PostgreSQL Error `22021` pada karakter input string HTML yang tidak valid.
3. **Payload Limit:**
   Maksimal ukuran konten HTML komponen/halaman dibatasi hingga 2MB di tingkat route handler.
4. **Isolasi Iframe:**
   Preview komponen dan halaman di canvas UI Studio tetap menggunakan sandbox tanpa `allow-same-origin`.

---

## 4. Rencana Verifikasi & Pengujian

1. **Skrip Uji Otomatis MCP (`scripts/test-mcp-ui-studio-tools.ts`):**
   - Menghubungkan client MCP internal ke `mcp/dist/index.js`.
   - Menguji pemanggilan `list_ui_components`, `create_ui_component`, `update_ui_component`, `delete_ui_component`.
   - Menguji pemanggilan `list_ui_pages`, `create_ui_page`, `update_ui_page`, `delete_ui_page`.
2. **Kompilasi TypeScript & Build:**
   - Menjalankan `npm run mcp:build`.
   - Menjalankan `npm run build` (`next build`).
