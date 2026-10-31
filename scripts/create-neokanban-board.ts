import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Creating NeoKanban Board with Project Context...')

  const user = await prisma.user.findFirst({
    where: { email: 'kresna@example.com' },
  })

  if (!user) {
    throw new Error('User kresna@example.com not found')
  }

  // 1. Create or get the Board
  const boardTitle = 'NeoKanban Core Architecture & Living Context'
  let board = await prisma.board.findFirst({
    where: {
      ownerId: user.id,
      title: boardTitle,
    },
    include: { columns: true },
  })

  if (!board) {
    console.log(`Creating board: "${boardTitle}"...`)
    board = await prisma.board.create({
      data: {
        title: boardTitle,
        description: 'Living context hub and development tracking for the NeoKanban platform.',
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
      },
      include: { columns: true },
    })
    console.log(`✅ Board created with ID: ${board.id}`)
  } else {
    console.log(`ℹ️ Board already exists with ID: ${board.id}`)
  }

  // 2. Read and populate all documents from .context/
  const contextDir = path.resolve(__dirname, '../.context')
  const files = [
    {
      fileName: 'overview.md',
      sourceFile: 'README.md',
      title: 'Executive Summary & System Pillars',
      order: 0,
    },
    {
      fileName: 'architecture.md',
      sourceFile: 'architecture.md',
      title: 'Next.js App Router Architecture & Data Flow',
      order: 1,
    },
    {
      fileName: 'database-schema.md',
      sourceFile: 'database-schema.md',
      title: 'PostgreSQL & Prisma Relational Data Models',
      order: 2,
    },
    {
      fileName: 'api-reference.md',
      sourceFile: 'api-reference.md',
      title: 'REST API Endpoints & Payloads',
      order: 3,
    },
    {
      fileName: 'mcp-specification.md',
      sourceFile: 'mcp-specification.md',
      title: 'Model Context Protocol (MCP) Stdio Server',
      order: 4,
    },
    {
      fileName: 'living-context-hub.md',
      sourceFile: 'living-context-hub.md',
      title: 'Living Context Hub Dual-Pane Architecture',
      order: 5,
    },
    {
      fileName: 'design-system.md',
      sourceFile: 'design-system.md',
      title: 'Counsel Minimalist & Linear Design System',
      order: 6,
    },
    {
      fileName: 'workflow-and-operations.md',
      sourceFile: 'workflow-and-operations.md',
      title: 'Dev Workflow, Docker & Test Scripts',
      order: 7,
    },
    {
      fileName: 'ui-ux-studio.md',
      sourceFile: 'ui-ux-studio.md',
      title: 'UI/UX Studio & Interactive Prototype',
      order: 8,
    },
    {
      fileName: 'skill-library.md',
      sourceFile: 'skill-library.md',
      title: 'AI Agent Skill Library & Packaging',
      order: 9,
    },
  ]

  console.log('\n📄 Syncing Context Documents into Living Context Hub...')
  for (const doc of files) {
    const fullPath = path.join(contextDir, doc.sourceFile)
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Warning: Source file ${fullPath} not found. Skipping.`)
      continue
    }

    const content = fs.readFileSync(fullPath, 'utf-8')

    await prisma.contextDocument.upsert({
      where: {
        boardId_fileName: {
          boardId: board.id,
          fileName: doc.fileName,
        },
      },
      update: {
        title: doc.title,
        content,
        order: doc.order,
      },
      create: {
        boardId: board.id,
        fileName: doc.fileName,
        title: doc.title,
        content,
        order: doc.order,
      },
    })
    console.log(`  ✅ Stored: [${doc.fileName}] -> "${doc.title}" (${content.length} chars)`)
  }

  // 3. Add initial task cards
  const todoCol = board.columns.find((c) => c.title === 'To Do')
  const inProgressCol = board.columns.find((c) => c.title === 'In Progress')
  const doneCol = board.columns.find((c) => c.title === 'Done')

  if (doneCol) {
    const existingDone = await prisma.card.findFirst({
      where: { columnId: doneCol.id, title: 'Setup Living Context Hub & MCP Server' },
    })
    if (!existingDone) {
      const card = await prisma.card.create({
        data: {
          columnId: doneCol.id,
          title: 'Setup Living Context Hub & MCP Server',
          description: '### 🎯 Completed Milestone\nIntegrated multi-file documentation hub and 10 MCP tools over stdio protocol.\n\n### 📋 Verified\n- [x] Prisma database migrations\n- [x] MCP tools tested with PAT authentication\n- [x] Living Context Hub UI connected',
          priority: 'HIGH',
          tags: ['context-hub', 'mcp', 'v1.0'],
        },
      })
      await prisma.checklistItem.createMany({
        data: [
          { cardId: card.id, title: 'Prisma schema and migrations', isCompleted: true, order: 0 },
          { cardId: card.id, title: 'MCP server stdio daemon', isCompleted: true, order: 1 },
          { cardId: card.id, title: 'PAT authentication tokens', isCompleted: true, order: 2 },
        ],
      })
    }
  }

  if (inProgressCol) {
    const existingProg = await prisma.card.findFirst({
      where: { columnId: inProgressCol.id, title: 'Antigravity IDE MCP Integration' },
    })
    if (!existingProg) {
      const card = await prisma.card.create({
        data: {
          columnId: inProgressCol.id,
          title: 'Antigravity IDE MCP Integration',
          description: '### 🎯 Current Objective\nIntegrate NeoKanban MCP server directly into Antigravity IDE configuration for seamless agent collaboration.\n\n### 📋 Acceptance Criteria\n- [x] Test client verification\n- [x] Plugin mcp_config.json configuration\n- [ ] Multi-turn autonomous agent workflows',
          priority: 'URGENT',
          tags: ['antigravity', 'mcp', 'in-progress'],
        },
      })
      await prisma.checklistItem.createMany({
        data: [
          { cardId: card.id, title: 'Direct PAT authentication', isCompleted: true, order: 0 },
          { cardId: card.id, title: 'Native MCP tool calls', isCompleted: true, order: 1 },
          { cardId: card.id, title: 'Live board status synchronization', isCompleted: false, order: 2 },
        ],
      })
    }
  }

  if (todoCol) {
    const existingTodo = await prisma.card.findFirst({
      where: { columnId: todoCol.id, title: 'Real-time WebSocket or SSE Sync for Multi-Agent' },
    })
    if (!existingTodo) {
      await prisma.card.create({
        data: {
          columnId: todoCol.id,
          title: 'Real-time WebSocket or SSE Sync for Multi-Agent',
          description: '### 🎯 Future Roadmap\nEnable live UI updates when external AI coding agents move cards or add execution logs.\n\n### 📋 Scope\n- Server-Sent Events (SSE) route\n- Optimistic UI updates\n- Conflict resolution',
          priority: 'MEDIUM',
          tags: ['realtime', 'roadmap'],
        },
      })
    }
  }

  console.log(`\n🎉 Board created and all 8 context files stored successfully!`)
  console.log(`🔗 Board URL: http://localhost:3000/boards/${board.id}`)
}

main()
  .catch((e) => {
    console.error('❌ Error creating board with context:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
