import { PrismaClient, Priority } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedPresetSkills } from './seed-skills'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding NeoKanban database...')

  // 1. Create or upsert default user
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'kresna@example.com' },
    update: {},
    create: {
      email: 'kresna@example.com',
      name: 'Kresna Developer',
      passwordHash,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Kresna',
    },
  })

  console.log(`User seeded: ${user.email}`)

  // 2. Create default board
  const board = await prisma.board.create({
    data: {
      title: '🚀 NeoKanban Core Platform',
      description: 'Living Kanban board for NeoKanban engineering team and AI Agents',
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
          guidelinesMarkdown: `# Project Guidelines & Coding Standards

1. **Architecture:** Use Next.js App Router with Server Actions & Route Handlers.
2. **Type Safety:** TypeScript strict mode enabled. Do NOT use \`any\`.
3. **Database:** Prisma ORM for all persistent data with relational constraints.
4. **Component Design:** Atomic, reusable UI components styled with Tailwind CSS.
5. **AI Interaction:** Always review board guidelines via MCP before executing tasks.`,
          techStackMarkdown: `# Tech Stack Specifications

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.8
- **Database:** PostgreSQL via Prisma ORM
- **UI & Styling:** TailwindCSS, Lucide React Icons
- **Drag & Drop:** @dnd-kit (Core & Sortable)
- **AI Protocol:** @modelcontextprotocol/sdk (Stdio Transport)`,
          conventionsMarkdown: `# Development & Git Conventions

- **Branching:** \`feature/<feature-name>\`, \`fix/<bug-name>\`
- **Commits:** Conventional Commits (\`feat:\`, \`fix:\`, \`docs:\`, \`refactor:\`, \`test:\`)
- **Definition of Done:** Code builds, tests pass, type-check clean, PR reviewed.`,
          messagingStandards: `# Communication & Messaging Standards

### 🎯 Standard Card Description
\`\`\`markdown
### 🎯 Objective
[Clear problem statement or feature goal]

### 📋 Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

### 🛠 Scope & Constraints
- Files: \`src/...\`
- Edge cases: ...

### 🧪 Verification Plan
[Manual or automated test steps]
\`\`\`

### 💬 Standard Comment / Progress Log
\`\`\`markdown
**Status:** \`[UPDATE]\` | \`[BLOCKED]\` | \`[NEED_REVIEW]\` | \`[RESOLVED]\`

**📝 Summary:**
- Action 1 completed
- Action 2 completed

**🔗 References / Files:**
- \`src/...\`

**❓ Next Step / Question:**
[Next actions or blockers]
\`\`\``,
        },
      },
    },
    include: {
      columns: true,
    },
  })

  console.log(`Board seeded: ${board.title}`)

  // 3. Add sample cards
  const todoCol = board.columns.find((c) => c.title === 'To Do')
  const inProgCol = board.columns.find((c) => c.title === 'In Progress')
  const doneCol = board.columns.find((c) => c.title === 'Done')

  if (todoCol) {
    await prisma.card.create({
      data: {
        columnId: todoCol.id,
        title: 'Integrasikan Webhook Notifikasi ke Slack/Discord',
        description: `### 🎯 Objective\nMenambahkan webhook alert ketika kartu dipindahkan ke kolom Review atau Done.\n\n### 📋 Acceptance Criteria\n- [ ] Endpoint webhook configurable per board\n- [ ] Mengirim payload JSON ringkas\n\n### 🧪 Verification Plan\nTest trigger webhook dengan mock endpoint.`,
        priority: Priority.MEDIUM,
        tags: ['integration', 'notifications'],
        order: 0,
        checklists: {
          create: [
            { title: 'Buat schema WebhookConfig di database', isCompleted: false, order: 0 },
            { title: 'Implementasi event listener onCardMoved', isCompleted: false, order: 1 },
          ],
        },
      },
    })
  }

  if (inProgCol) {
    const card = await prisma.card.create({
      data: {
        columnId: inProgCol.id,
        title: 'Implementasi MCP Server Stdio Protocol',
        description: `### 🎯 Objective\nMenyediakan 9 tools MCP agar AI dapat mengelola board dan membaca Project Context.\n\n### 📋 Acceptance Criteria\n- [ ] Support Claude Desktop dan Cursor via stdio\n- [ ] Autentikasi dengan Personal Access Token (PAT)\n\n### 🧪 Verification Plan\nJalankan skrip test-mcp-client.ts.`,
        priority: Priority.URGENT,
        tags: ['ai', 'mcp', 'core'],
        order: 0,
        checklists: {
          create: [
            { title: 'Setup @modelcontextprotocol/sdk', isCompleted: true, order: 0 },
            { title: 'Implementasi token auth guard', isCompleted: true, order: 1 },
            { title: 'Registrasi 9 tools MCP', isCompleted: false, order: 2 },
          ],
        },
        comments: {
          create: [
            {
              authorName: 'Claude Agent (via MCP)',
              isAiGenerated: true,
              content: `**Status:** \`[UPDATE]\`\n\n**📝 Tindakan:**\n- Memverifikasi skema database dan tabel PersonalAccessToken.\n- Menyiapkan handler untuk \`get_board_context\` dan \`update_board_context\`.\n\n**🔗 Referensi / File Diubah:**\n- \`mcp/src/index.ts\`\n\n**❓ Next Step:**\nMenyelesaikan implementasi card tools.`,
            },
          ],
        },
      },
    })
    console.log(`Sample in-progress card created: ${card.title}`)
  }

  if (doneCol) {
    await prisma.card.create({
      data: {
        columnId: doneCol.id,
        title: 'Inisialisasi Monorepo NeoKanban & Database PostgreSQL',
        description: `Setup Next.js 15, TailwindCSS, Prisma ORM, dan Docker Compose PostgreSQL.`,
        priority: Priority.HIGH,
        tags: ['setup', 'infra'],
        order: 0,
      },
    })
  }

  // 3. Seed preset skills
  await seedPresetSkills(prisma)

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
