# Specification: Multiple Card Assignees (Mention Teman di Card)

## 1. Overview
Fitur ini memungkinkan pengguna untuk menugaskan satu atau beberapa anggota proyek (*multiple assignees / mention teman*) pada sebuah kartu tugas di NeoKanban. Penugasan ini terlihat secara visual pada papan kanban berupa tumpukan avatar (*avatar stack*) dan dapat dikelola secara interaktif melalui sidebar modal detail kartu. Hanya anggota proyek yang sah (Owner dan Collaborators) yang dapat ditugaskan pada kartu di board tersebut.

---

## 2. Architecture & Data Model

### 2.1 Prisma Schema Changes (`prisma/schema.prisma`)
Menambahkan model pivot relasional `CardAssignee` dengan cascading delete:

```prisma
model CardAssignee {
  id        String   @id @default(cuid())
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([cardId, userId])
  @@index([cardId])
  @@index([userId])
}
```

Pembaruan pada model `Card`:
```prisma
model Card {
  // ... field eksisting ...
  assignees CardAssignee[]
}
```

Pembaruan pada model `User`:
```prisma
model User {
  // ... field eksisting ...
  assignedCards CardAssignee[]
}
```

---

## 3. REST API Design

### 3.1 Endpoint Pembaruan Query Eksisting
1. **`GET /api/boards/[id]`**:
   - Query kartu di dalam kolom meng-include `assignees`:
     ```ts
     assignees: {
       include: {
         user: {
           select: { id: true, name: true, email: true, avatarUrl: true },
         },
       },
     }
     ```
   - Memastikan kartu di papan kanban langsung memiliki data assignee tanpa perlu query individual.

2. **`GET /api/cards/[id]`**:
   - Menyertakan data relasi `assignees` lengkap beserta profil user untuk modal detail kartu.

### 3.2 Endpoint Baru Manajemen Assignee
1. **`POST /api/cards/[id]/assignees`**:
   - **Autentikasi**: Wajib login dan memiliki akses ke board (Owner atau Collaborator).
   - **Body**: `{ userId: string }`
   - **Validasi**:
     - User target harus merupakan anggota proyek yang sah (Owner board atau terdaftar di `BoardMember`).
     - Mencegah penugasan duplikat (`@@unique([cardId, userId])`).
   - **Response**: `{ assignee: CardAssignee, card: UpdatedCard }` (HTTP 201 Created).

2. **`DELETE /api/cards/[id]/assignees/[userId]`**:
   - **Autentikasi**: Wajib login dan memiliki akses ke board.
   - **Operasi**: Menghapus record `CardAssignee` untuk `cardId` dan `userId` terkait.
   - **Response**: `{ message: 'Assignee removed', card: UpdatedCard }` (HTTP 200 OK).

---

## 4. UI / UX Design & Components

### 4.1 Kartu Kanban (`src/components/kanban/KanbanCard.tsx`)
- **Tumpukan Avatar (Avatar Stack)**:
  - Menggantikan ikon dummy statis di baris footer kartu.
  - Menampilkan lingkaran avatar inisial (misal: "KD", "SC") dengan border putih tipis yang saling bertumpuk (*overlapping*).
  - Jika jumlah assignee > 3, menampilkan 2 avatar pertama ditambah badge counter ringkas (misal: `+2`).
  - Tooltip browser / title menampilkan nama lengkap anggota saat diarahkan kursor.
  - Jika kartu belum memiliki assignee, menampilkan ikon user minimalis yang subtle.

### 4.2 Modal Detail Kartu (`src/components/kanban/CardDetailModal.tsx`)
- **Bagian *"Assignees"* di Metadata Sidebar**:
  - Diletakkan di urutan paling atas sidebar kanan (sebelum *Priority*).
  - **Daftar Tag/Chip Assignee**:
    - Chip pill berisi inisial avatar berwarna, nama panggilan, dan tombol silang `×` untuk melepas penugasan.
  - **Tombol *"Assign member"* & Popover Selector**:
    - Tombol `+ Assign member` yang membuka popover dropdown daftar seluruh anggota board (Owner + Collaborators).
    - Menampilkan status centang (*checkbox*) untuk anggota yang sudah ditugaskan.
    - Mengklik anggota dalam dropdown akan melakukan aksi *toggle* (menambahkan jika belum ada, melepas jika sudah ada).
- **Sinkronisasi Instan**:
  - Setiap perubahan assignee langsung memanggil callback `onCardUpdated(updatedCard)` sehingga tampilan kartu di kanban board seketika terbarui.

---

## 5. Verification & Testing Plan

1. **Database Migration**:
   - Menjalankan `npx prisma db push` dan `npx prisma generate`.
2. **Automated Test Suite (`scripts/test-card-assignees.ts`)**:
   - Menyiapkan board dengan Owner dan Collaborator.
   - Membuat kartu uji.
   - Menugaskan Owner dan Collaborator sekaligus (*multiple assignees*).
   - Memverifikasi data relasi tersimpan benar dan dicek via `findUnique`.
   - Menguji pencegahan penugasan user di luar board.
   - Menguji pelepasan salah satu assignee (*unassign*).
   - Memverifikasi cascading delete saat kartu dihapus.
3. **Type Safety & Build Check**:
   - Menjalankan `npx tsc --noEmit`.
