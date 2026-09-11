import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { PrismaClient, Priority } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

async function authenticateUser(tokenOverride?: string) {
  const token = tokenOverride || process.env.NEOKANBAN_PAT
  if (!token) {
    throw new Error(
      'Authentication failed: NEOKANBAN_PAT environment variable or token parameter is missing. Generate a token in NeoKanban Settings.'
    )
  }

  const tokenHash = hashToken(token)
  const record = await prisma.personalAccessToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })

  if (!record || !record.user) {
    throw new Error('Authentication failed: Invalid or revoked NeoKanban Personal Access Token.')
  }

  // Update lastUsedAt asynchronously
  prisma.personalAccessToken
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => console.error('Error updating PAT lastUsedAt:', err))

  return record.user
}

const server = new McpServer({
  name: 'NeoKanban AI MCP Server',
  version: '1.0.0',
})

// 1. Tool: list_boards
server.tool(
  'list_boards',
  'Lists all project boards accessible by the authenticated user with status and task counts.',
  {
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ token }) => {
    const user = await authenticateUser(token)
    const boards = await prisma.board.findMany({
      where: { ownerId: user.id },
      include: {
        columns: {
          select: {
            id: true,
            title: true,
            _count: { select: { cards: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    })

    const result = boards.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      isFavorite: b.isFavorite,
      columns: b.columns.map((c) => `${c.title} (${c._count.cards} cards)`),
      totalCards: b.columns.reduce((sum, col) => sum + col._count.cards, 0),
    }))

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }
)

// 2. Tool: list_board_context_files
server.tool(
  'list_board_context_files',
  'Lists all living context files/documents available in a board (e.g. guidelines.md, tech-stack.md, architecture.md).',
  {
    boardId: z.string().describe('The ID of the board'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, token }) => {
    const user = await authenticateUser(token)
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        contextDocuments: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, title: true, fileName: true, order: true, updatedAt: true },
        },
      },
    })

    if (!board || board.ownerId !== user.id) {
      throw new Error(`Board with ID ${boardId} not found or unauthorized.`)
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              boardId: board.id,
              boardTitle: board.title,
              files: board.contextDocuments,
            },
            null,
            2
          ),
        },
      ],
    }
  }
)

// 3. Tool: get_board_context
server.tool(
  'get_board_context',
  'Retrieves the living project context files for a board. Can fetch a specific file by fileName or retrieve the entire context bundle.',
  {
    boardId: z.string().describe('The ID of the board'),
    fileName: z.string().optional().describe('Optional file name, e.g. "guidelines.md" or "architecture.md"'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, fileName, token }) => {
    const user = await authenticateUser(token)
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        contextDocuments: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
        projectContext: true,
      },
    })

    if (!board || board.ownerId !== user.id) {
      throw new Error(`Board with ID ${boardId} not found or unauthorized.`)
    }

    // Specific file requested
    if (fileName && fileName.trim()) {
      const cleanName = fileName.trim().toLowerCase()
      const doc = board.contextDocuments.find(
        (d) => d.fileName.toLowerCase() === cleanName || d.title.toLowerCase() === cleanName
      )

      if (!doc) {
        throw new Error(`Context file "${fileName}" not found in board "${board.title}". Available files: ${board.contextDocuments.map((d) => d.fileName).join(', ')}`)
      }

      return {
        content: [
          {
            type: 'text',
            text: `# ${doc.title} (\`${doc.fileName}\`)\n\n${doc.content}`,
          },
        ],
      }
    }

    // Return complete context bundle
    if (board.contextDocuments.length > 0) {
      const fileListHeader = board.contextDocuments
        .map((d) => `- \`${d.fileName}\`: ${d.title}`)
        .join('\n')

      const fullFilesContent = board.contextDocuments
        .map((d) => `## 📄 ${d.title} (\`${d.fileName}\`)\n\n${d.content}\n\n---`)
        .join('\n\n')

      const bundle = `# Living Project Context for: "${board.title}"\n\n### Available Context Files:\n${fileListHeader}\n\n---\n\n${fullFilesContent}`

      return {
        content: [{ type: 'text', text: bundle }],
      }
    }

    const legacy = board.projectContext || {
      guidelinesMarkdown: 'No guidelines defined.',
      techStackMarkdown: 'No tech stack specified.',
      conventionsMarkdown: 'No conventions specified.',
      messagingStandards: 'No message standards specified.',
    }

    const fallbackContext = `# Living Project Context for: "${board.title}"\n\n## 1. Core Guidelines\n${legacy.guidelinesMarkdown}\n\n## 2. Tech Stack\n${legacy.techStackMarkdown}\n\n## 3. Conventions\n${legacy.conventionsMarkdown}\n\n## 4. Message Standards\n${legacy.messagingStandards}`

    return {
      content: [{ type: 'text', text: fallbackContext }],
    }
  }
)

// 4. Tool: update_board_context
server.tool(
  'update_board_context',
  'Creates or updates a living project context file on a board (e.g. fileName: "guidelines.md", content: "...").',
  {
    boardId: z.string().describe('The ID of the board'),
    fileName: z.string().optional().describe('File name to create or update (e.g. "guidelines.md", "architecture.md", "api-spec.json")'),
    content: z.string().optional().describe('The updated content for the file'),
    title: z.string().optional().describe('Optional human-readable title for the file'),
    guidelinesMarkdown: z.string().optional().describe('Legacy: Updated coding guidelines markdown'),
    techStackMarkdown: z.string().optional().describe('Legacy: Updated tech stack markdown'),
    conventionsMarkdown: z.string().optional().describe('Legacy: Updated conventions markdown'),
    messagingStandards: z.string().optional().describe('Legacy: Updated messaging standards markdown'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({
    boardId,
    fileName,
    content,
    title,
    guidelinesMarkdown,
    techStackMarkdown,
    conventionsMarkdown,
    messagingStandards,
    token,
  }) => {
    const user = await authenticateUser(token)
    const board = await prisma.board.findUnique({ where: { id: boardId } })
    if (!board || board.ownerId !== user.id) {
      throw new Error(`Board with ID ${boardId} not found or unauthorized.`)
    }

    // Modern multi-file update
    if (fileName && fileName.trim()) {
      const cleanFileName = fileName.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '-')
      const fileContent = content || ''
      const fileTitle = title?.trim() || cleanFileName

      const updatedDoc = await prisma.contextDocument.upsert({
        where: {
          boardId_fileName: {
            boardId,
            fileName: cleanFileName,
          },
        },
        update: {
          content: fileContent,
          ...(title ? { title: fileTitle } : {}),
        },
        create: {
          boardId,
          fileName: cleanFileName,
          title: fileTitle,
          content: fileContent,
        },
      })

      return {
        content: [
          {
            type: 'text',
            text: `Context file "${updatedDoc.fileName}" (${updatedDoc.title}) on board "${board.title}" has been successfully saved at ${updatedDoc.updatedAt.toISOString()}.`,
          },
        ],
      }
    }

    // Legacy updates
    const updated = await prisma.projectContext.upsert({
      where: { boardId },
      update: {
        ...(guidelinesMarkdown !== undefined ? { guidelinesMarkdown } : {}),
        ...(techStackMarkdown !== undefined ? { techStackMarkdown } : {}),
        ...(conventionsMarkdown !== undefined ? { conventionsMarkdown } : {}),
        ...(messagingStandards !== undefined ? { messagingStandards } : {}),
      },
      create: {
        boardId,
        guidelinesMarkdown: guidelinesMarkdown || '',
        techStackMarkdown: techStackMarkdown || '',
        conventionsMarkdown: conventionsMarkdown || '',
        messagingStandards: messagingStandards || '',
      },
    })

    return {
      content: [
        {
          type: 'text',
          text: `Project context for board "${board.title}" has been updated successfully at ${updated.updatedAt.toISOString()}.`,
        },
      ],
    }
  }
)

// 4. Tool: get_board_cards
server.tool(
  'get_board_cards',
  'Gets all columns and task cards from a board. Optionally filter by column title (e.g. "To Do", "In Progress", "Review", "Done").',
  {
    boardId: z.string().describe('The ID of the board'),
    columnTitle: z.string().optional().describe('Optional column name filter, e.g. "In Progress"'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, columnTitle, token }) => {
    const user = await authenticateUser(token)
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          where: columnTitle
            ? { title: { equals: columnTitle, mode: 'insensitive' } }
            : undefined,
          include: {
            cards: {
              include: {
                checklists: { select: { id: true, title: true, isCompleted: true } },
                _count: { select: { comments: true } },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!board || board.ownerId !== user.id) {
      throw new Error(`Board with ID ${boardId} not found or unauthorized.`)
    }

    const result = board.columns.map((col) => ({
      columnId: col.id,
      columnTitle: col.title,
      cards: col.cards.map((card) => ({
        id: card.id,
        title: card.title,
        priority: card.priority,
        tags: card.tags,
        checklists: `${card.checklists.filter((c) => c.isCompleted).length}/${card.checklists.length} completed`,
        commentCount: card._count.comments,
        descriptionPreview: card.description.slice(0, 120),
      })),
    }))

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }
)

// 5. Tool: get_card_details
server.tool(
  'get_card_details',
  'Retrieves full detailed information for a specific task card, including full markdown description, checklists, and activity log.',
  {
    cardId: z.string().describe('The ID of the card'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ cardId, token }) => {
    const user = await authenticateUser(token)
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { include: { board: true } },
        checklists: { orderBy: { order: 'asc' } },
        comments: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!card || card.column.board.ownerId !== user.id) {
      throw new Error(`Card with ID ${cardId} not found or unauthorized.`)
    }

    const details = {
      id: card.id,
      board: { id: card.column.board.id, title: card.column.board.title },
      column: { id: card.column.id, title: card.column.title },
      title: card.title,
      description: card.description,
      priority: card.priority,
      tags: card.tags,
      dueDate: card.dueDate,
      checklists: card.checklists.map((c) => ({
        id: c.id,
        title: c.title,
        isCompleted: c.isCompleted,
      })),
      comments: card.comments.map((cm) => ({
        id: cm.id,
        authorName: cm.authorName,
        isAiGenerated: cm.isAiGenerated,
        content: cm.content,
        createdAt: cm.createdAt,
      })),
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(details, null, 2) }],
    }
  }
)

// 6. Tool: create_card
server.tool(
  'create_card',
  'Creates a new task card in a specified column of a board. Recommended to format description with standard template (Objective, Acceptance Criteria, Scope, Verification).',
  {
    boardId: z.string().describe('The ID of the board'),
    columnTitle: z.string().describe('Title of target column, e.g. "To Do" or "Backlog"'),
    title: z.string().describe('Title of the task card'),
    description: z.string().optional().describe('Markdown description of the task'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Task priority'),
    tags: z.array(z.string()).optional().describe('List of tag strings, e.g. ["backend", "api"]'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, columnTitle, title, description, priority, tags, token }) => {
    const user = await authenticateUser(token)
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { columns: true },
    })

    if (!board || board.ownerId !== user.id) {
      throw new Error(`Board with ID ${boardId} not found or unauthorized.`)
    }

    const targetCol = board.columns.find(
      (c) => c.title.toLowerCase() === columnTitle.toLowerCase().trim()
    )

    if (!targetCol) {
      const available = board.columns.map((c) => `"${c.title}"`).join(', ')
      throw new Error(
        `Column "${columnTitle}" not found in board "${board.title}". Available columns: ${available}`
      )
    }

    const maxOrder = await prisma.card.findFirst({
      where: { columnId: targetCol.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const order = maxOrder ? maxOrder.order + 1 : 0

    const card = await prisma.card.create({
      data: {
        columnId: targetCol.id,
        title: title.trim(),
        description: description?.trim() || '',
        priority: (priority as Priority) || Priority.MEDIUM,
        tags: tags || [],
        order,
      },
    })

    return {
      content: [
        {
          type: 'text',
          text: `Card created successfully in column "${targetCol.title}":\nID: ${card.id}\nTitle: ${card.title}\nPriority: ${card.priority}`,
        },
      ],
    }
  }
)

// 7. Tool: update_card
server.tool(
  'update_card',
  'Updates a task card, including changing its title, description, priority, or moving it to another column (e.g. from "In Progress" to "Review" or "Done").',
  {
    cardId: z.string().describe('The ID of the card to update'),
    title: z.string().optional().describe('New title of the card'),
    description: z.string().optional().describe('New markdown description'),
    targetColumnTitle: z.string().optional().describe('Move to this column, e.g. "Done" or "In Review"'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('New priority'),
    tags: z.array(z.string()).optional().describe('Updated tag list'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({
    cardId,
    title,
    description,
    targetColumnTitle,
    priority,
    tags,
    token,
  }) => {
    const user = await authenticateUser(token)
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { include: { board: { include: { columns: true } } } } },
    })

    if (!card || card.column.board.ownerId !== user.id) {
      throw new Error(`Card with ID ${cardId} not found or unauthorized.`)
    }

    let nextColumnId = card.columnId
    if (targetColumnTitle) {
      const match = card.column.board.columns.find(
        (c) => c.title.toLowerCase() === targetColumnTitle.toLowerCase().trim()
      )
      if (!match) {
        const available = card.column.board.columns.map((c) => `"${c.title}"`).join(', ')
        throw new Error(
          `Target column "${targetColumnTitle}" not found. Available: ${available}`
        )
      }
      nextColumnId = match.id
    }

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(priority !== undefined ? { priority: priority as Priority } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(nextColumnId !== card.columnId ? { columnId: nextColumnId } : {}),
      },
      include: { column: true },
    })

    return {
      content: [
        {
          type: 'text',
          text: `Card "${updated.title}" (ID: ${updated.id}) updated successfully. Current column: "${updated.column.title}".`,
        },
      ],
    }
  }
)

// 8. Tool: add_card_comment
server.tool(
  'add_card_comment',
  'Adds a comment or execution status log to a task card. The comment is automatically tagged as AI-generated (isAiGenerated: true). Should follow standard messaging format (Status, Actions, Changed Files, Blockers).',
  {
    cardId: z.string().describe('The ID of the card to comment on'),
    content: z.string().describe('The markdown content of the comment'),
    authorName: z.string().optional().describe('Name of the AI Assistant, e.g. "Claude (via MCP)"'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ cardId, content, authorName, token }) => {
    const user = await authenticateUser(token)
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    })

    if (!card || card.column.board.ownerId !== user.id) {
      throw new Error(`Card with ID ${cardId} not found or unauthorized.`)
    }

    const comment = await prisma.comment.create({
      data: {
        cardId,
        authorName: authorName?.trim() || 'AI Assistant (via MCP)',
        isAiGenerated: true,
        content: content.trim(),
      },
    })

    return {
      content: [
        {
          type: 'text',
          text: `Comment posted to card "${card.title}" successfully (ID: ${comment.id}).`,
        },
      ],
    }
  }
)

// 9. Tool: manage_checklist
server.tool(
  'manage_checklist',
  'Manages subtasks or acceptance criteria items on a card (add new item, toggle completion, or delete item).',
  {
    cardId: z.string().describe('The ID of the card'),
    action: z.enum(['add', 'toggle', 'delete']).describe('The action to perform'),
    title: z.string().optional().describe('Title of the checklist item (required for "add")'),
    itemId: z.string().optional().describe('The checklist item ID (required for "toggle" or "delete")'),
    isCompleted: z.boolean().optional().describe('The completed boolean state (used for "toggle")'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ cardId, action, title, itemId, isCompleted, token }) => {
    const user = await authenticateUser(token)
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    })

    if (!card || card.column.board.ownerId !== user.id) {
      throw new Error(`Card with ID ${cardId} not found or unauthorized.`)
    }

    if (action === 'add') {
      if (!title?.trim()) throw new Error('title is required for "add" action')
      const maxOrder = await prisma.checklistItem.findFirst({
        where: { cardId },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      const order = maxOrder ? maxOrder.order + 1 : 0
      const item = await prisma.checklistItem.create({
        data: { cardId, title: title.trim(), order },
      })
      return {
        content: [
          { type: 'text', text: `Checklist item added: "${item.title}" (ID: ${item.id})` },
        ],
      }
    }

    if (action === 'toggle') {
      if (!itemId) throw new Error('itemId is required for "toggle" action')
      const updated = await prisma.checklistItem.update({
        where: { id: itemId },
        data: { isCompleted: isCompleted !== undefined ? isCompleted : true },
      })
      return {
        content: [
          {
            type: 'text',
            text: `Checklist item "${updated.title}" set to ${updated.isCompleted ? 'COMPLETED' : 'INCOMPLETE'}.`,
          },
        ],
      }
    }

    if (action === 'delete') {
      if (!itemId) throw new Error('itemId is required for "delete" action')
      await prisma.checklistItem.delete({ where: { id: itemId } })
      return {
        content: [{ type: 'text', text: `Checklist item ${itemId} deleted.` }],
      }
    }

    throw new Error(`Unknown action "${action}"`)
  }
)

async function run() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('NeoKanban MCP Server running on stdio transport.')
}

run().catch((err) => {
  console.error('Fatal MCP Server error:', err)
  process.exit(1)
})
