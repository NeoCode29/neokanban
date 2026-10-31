### Task 1: Prisma Schema & Database Models

**Files:**
- Modify: `neokanban/prisma/schema.prisma`
- Test: `neokanban/scripts/test-ui-schema.ts`

**Interfaces:**
- Produces: `prisma.uiPage`, `prisma.uiComponent`, `prisma.uiAnnotation`

**Global Constraints:**
- Database PostgreSQL di localhost:5435
- Gunakan `npx prisma db push --skip-generate` lalu `npx prisma generate`
- TDD RED-GREEN-REFACTOR

**Steps:**
1. Buat test failing `scripts/test-ui-schema.ts` yang mengecek `(prisma as any).uiPage.count()`.
2. Jalankan dan pastikan gagal.
3. Update `prisma/schema.prisma` dengan model `UiPage`, `UiComponent`, `UiAnnotation` dan relasi di `Board`, `User`, `Card`.
4. Jalankan `npx prisma db push --skip-generate` dan `npx prisma generate`.
5. Jalankan `scripts/test-ui-schema.ts` dan pastikan PASS.
6. Commit dengan pesan: `feat(db): add UiPage, UiComponent, and UiAnnotation models`.

