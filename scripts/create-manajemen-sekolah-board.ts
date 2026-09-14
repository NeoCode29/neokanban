import { PrismaClient, Priority } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

const USER_PAT = 'neokan_pat_0441f71a8211a6417fef3d413a66408a6d08d0b30b4d71ef'

async function main() {
  console.log('🚀 Creating "Manajemen Sekolah" Board in NeoKanban...')

  // Authenticate user via PAT
  const tokenHash = crypto.createHash('sha256').update(USER_PAT).digest('hex')
  const patRecord = await prisma.personalAccessToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!patRecord || !patRecord.user) {
    throw new Error('User not found for the given PAT')
  }

  const user = patRecord.user
  console.log(`👤 Authenticated user: ${user.name} (${user.email})`)

  const boardTitle = 'Manajemen Sekolah'
  let board = await prisma.board.findFirst({
    where: {
      ownerId: user.id,
      title: { equals: boardTitle, mode: 'insensitive' },
    },
    include: { columns: true },
  })

  if (!board) {
    console.log(`Creating board "${boardTitle}"...`)
    board = await prisma.board.create({
      data: {
        title: boardTitle,
        description: 'Sistem Informasi Manajemen Sekolah Terintegrasi (Akademik, SDM, Siswa, Kelas/Jadwal, Absensi, Registrasi RFID/Fingerprint)',
        ownerId: user.id,
        isFavorite: true,
        columns: {
          create: [
            { title: 'Backlog', order: 0, colorCode: '#64748b' },
            { title: 'To Do', order: 1, colorCode: '#3b82f6' },
            { title: 'In Progress', order: 2, colorCode: '#f59e0b' },
            { title: 'In Review', order: 3, colorCode: '#8b5cf6' },
            { title: 'Done', order: 4, colorCode: '#10b981' },
          ],
        },
        projectContext: {
          create: {
            guidelinesMarkdown: '1. NestJS + Prisma ORM + PostgreSQL untuk Backend.\n2. ReactJS (Vite) + Tailwind CSS + DataTables untuk Frontend.\n3. Superpowers Framework & TDD cycle.',
            techStackMarkdown: '- Backend: NestJS 10, Prisma ORM, PostgreSQL\n- Frontend: React 18, Vite, Tailwind CSS, DataTables\n- Protocols: REST API, Hardware Integration (RFID/Fingerprint)',
            conventionsMarkdown: 'Modular structure by feature, DTO validation with class-validator, comprehensive error filtering.',
            messagingStandards: 'Standard HTTP status codes, structured JSON responses.',
          },
        },
      },
      include: { columns: true },
    })
    console.log(`✅ Board created with ID: ${board.id}`)
  } else {
    console.log(`ℹ️ Board already exists with ID: ${board.id}`)
  }

  // Find "To Do" column
  const todoColumn = board.columns.find(
    (c) => c.title.toLowerCase() === 'to do'
  ) || board.columns[0]

  const taskTitle = 'Inisialisasi repo'
  const existingCard = await prisma.card.findFirst({
    where: {
      columnId: todoColumn.id,
      title: { equals: taskTitle, mode: 'insensitive' },
    },
  })

  if (!existingCard) {
    console.log(`Creating task "${taskTitle}" in column "${todoColumn.title}"...`)
    const card = await prisma.card.create({
      data: {
        columnId: todoColumn.id,
        title: taskTitle,
        description: `### 🎯 Objective\nInisialisasi dan sinkronisasi repositori Git untuk proyek Manajemen Sekolah (Frontend dan Backend).\n\n### 📋 Acceptance Criteria\n- [x] Struktur direktori backend (NestJS) & frontend (React/Vite) siap\n- [x] Remote git frontend: \`https://github.com/NeoCode29/sistem-manajemen-sekolah-frontend.git\`\n- [x] Remote git backend: \`https://github.com/NeoCode29/sistem-manajemen-sekolah-backend.git\`\n- [ ] Sinkronisasi dan verifikasi tracking branch repository`,
        priority: Priority.HIGH,
        tags: ['git', 'repo', 'initialization', 'setup'],
        order: 0,
      },
    })

    await prisma.checklistItem.createMany({
      data: [
        { cardId: card.id, title: 'Cek remote git backend & frontend', isCompleted: true, order: 0 },
        { cardId: card.id, title: 'Inisialisasi & verifikasi git branch', isCompleted: false, order: 1 },
        { cardId: card.id, title: 'Commit struktur awal & push ke origin', isCompleted: false, order: 2 },
      ],
    })

    console.log(`✅ Card created with ID: ${card.id}`)
  } else {
    console.log(`ℹ️ Card "${taskTitle}" already exists with ID: ${existingCard.id}`)
  }

  console.log(`\n🎉 Done! Board: http://localhost:3000/boards/${board.id}`)
}

main()
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
