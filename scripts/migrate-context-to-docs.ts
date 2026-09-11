import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const boards = await prisma.board.findMany({
    include: {
      projectContext: true,
      contextDocuments: true,
    },
  })

  console.log(`Found ${boards.length} boards. Checking context documents...`)

  for (const board of boards) {
    if (board.contextDocuments.length === 0) {
      console.log(`Creating default context documents for board "${board.title}" (${board.id})...`)

      const old = board.projectContext

      const guidelinesContent =
        old?.guidelinesMarkdown ||
        `# Project Guidelines & Coding Standards\n\n1. **Architecture:** Use Next.js App Router with Server Actions & clean Route Handlers.\n2. **Type Safety:** TypeScript strict mode enabled. Avoid \`any\` types.\n3. **Database Rules:** Use Prisma ORM with relational integrity.\n4. **Clean Code:** Keep components atomic, focused, and small.\n5. **AI Synchronization:** Check these guidelines before proposing implementation plans.`

      const techStackContent =
        old?.techStackMarkdown ||
        `# Tech Stack Specifications\n\n- **Framework:** Next.js 16 (App Router, Turbopack)\n- **Database:** PostgreSQL 16 on Docker (port 5435)\n- **ORM:** Prisma ORM 6.4.1\n- **Styling:** Tailwind CSS\n- **AI Protocol:** Model Context Protocol (MCP) via stdio\n- **Drag and Drop:** @dnd-kit/core & @dnd-kit/sortable`

      const conventionsContent =
        old?.conventionsMarkdown ||
        `# Team & Git Conventions\n\n- **Branching Strategy:** Feature branches branched from master.\n- **Commit Messages:** Conventional Commits (\`feat:\`, \`fix:\`, \`refactor:\`, \`docs:\`).\n- **Definition of Done (DoD):** All unit tests pass, type-check with zero errors, and manual walkthrough verified.`

      const messagingContent =
        old?.messagingStandards ||
        `# Communication & Messaging Standards\n\n- **High Informative Density:** Avoid fluffy pleasantries. Lead with exact file paths, diffs, and verification steps.\n- **Task Statuses:** Tag messages with \`[UPDATE]\`, \`[BLOCKER]\`, \`[RFC]\`, or \`[COMPLETED]\`.\n- **Log Consistency:** When updating tasks via MCP, format activity logs using the standard action summary template.`

      await prisma.contextDocument.createMany({
        data: [
          {
            boardId: board.id,
            title: 'Core Guidelines & Architecture',
            fileName: 'guidelines.md',
            content: guidelinesContent,
            order: 0,
          },
          {
            boardId: board.id,
            title: 'Tech Stack Specifications',
            fileName: 'tech-stack.md',
            content: techStackContent,
            order: 1,
          },
          {
            boardId: board.id,
            title: 'Team & Git Conventions',
            fileName: 'conventions.md',
            content: conventionsContent,
            order: 2,
          },
          {
            boardId: board.id,
            title: 'Communication & Message Standards',
            fileName: 'messaging-standards.md',
            content: messagingContent,
            order: 3,
          },
        ],
      })
      console.log(`Successfully created 4 documents for board "${board.title}".`)
    } else {
      console.log(`Board "${board.title}" already has ${board.contextDocuments.length} documents. Skipping.`)
    }
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
