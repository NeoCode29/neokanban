import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_BASE_URL = (process.env.NEOKANBAN_API_URL || 'http://localhost:3000').replace(/\/$/, '')

/**
 * Universal HTTP helper to communicate with the NeoKanban REST API using Bearer PAT tokens.
 * Eliminates the need for direct database credentials (DATABASE_URL) in AI clients.
 */
async function apiRequest<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: any
    token?: string
  } = {}
): Promise<T> {
  const token = options.token || process.env.NEOKANBAN_PAT
  if (!token) {
    throw new Error(
      'Authentication failed: NEOKANBAN_PAT environment variable or token parameter is missing. Generate a token in NeoKanban Settings.'
    )
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (!res.ok) {
      let errorMsg = `API Error ${res.status}: ${res.statusText}`
      try {
        const errData = await res.json()
        if (errData?.error) errorMsg = errData.error
      } catch {
        const text = await res.text()
        if (text) errorMsg = text
      }
      throw new Error(errorMsg)
    }

    return res.json()
  } catch (err: any) {
    if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
      throw new Error(
        `Failed to connect to NeoKanban server at "${API_BASE_URL}". Ensure the server is running and NEOKANBAN_API_URL is correct.`
      )
    }
    throw err
  }
}

const server = new McpServer({
  name: 'NeoKanban AI MCP Server',
  version: '2.0.0',
})

// 1. Tool: list_boards
server.tool(
  'list_boards',
  'Lists all project boards accessible by the authenticated user (both owned and shared boards) with task counts and collaboration status.',
  {
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ token }) => {
    const data = await apiRequest<{ boards: any[] }>('/api/boards', { token })

    const result = data.boards.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      isFavorite: b.isFavorite,
      isOwner: b.isOwner,
      ownerName: b.ownerName,
      memberCount: b.memberCount || 0,
      columns: b.columns.map((c: any) => `${c.title} (${c._count?.cards || 0} cards)`),
      totalCards: b.cardCount,
    }))

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }
)

// 2. Tool: list_board_members
server.tool(
  'list_board_members',
  'Lists the owner and all team collaborators for a project board.',
  {
    boardId: z.string().describe('The ID of the board'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, token }) => {
    const data = await apiRequest<{ owner: any; members: any[]; isOwner: boolean }>(
      `/api/boards/${boardId}/members`,
      { token }
    )

    const membersList = [
      {
        id: data.owner.id,
        name: data.owner.name,
        email: data.owner.email,
        role: 'OWNER',
      },
      ...data.members.map((m: any) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role || 'COLLABORATOR',
      })),
    ]

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              boardId,
              isOwner: data.isOwner,
              members: membersList,
            },
            null,
            2
          ),
        },
      ],
    }
  }
)

// 3. Tool: list_board_context_files
server.tool(
  'list_board_context_files',
  'Lists all living context files/documents available in a board (e.g. guidelines.md, tech-stack.md, architecture.md).',
  {
    boardId: z.string().describe('The ID of the board'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, token }) => {
    const data = await apiRequest<{ documents: any[]; boardTitle: string }>(
      `/api/boards/${boardId}/context`,
      { token }
    )

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              boardId,
              boardTitle: data.boardTitle,
              files: data.documents.map((d: any) => ({
                id: d.id,
                title: d.title,
                fileName: d.fileName,
                order: d.order,
                updatedAt: d.updatedAt,
              })),
            },
            null,
            2
          ),
        },
      ],
    }
  }
)

// 4. Tool: get_board_context
server.tool(
  'get_board_context',
  'Retrieves the living project context files for a board. Can fetch a specific file by fileName or retrieve the entire context bundle.',
  {
    boardId: z.string().describe('The ID of the board'),
    fileName: z.string().optional().describe('Optional file name, e.g. "guidelines.md" or "architecture.md"'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, fileName, token }) => {
    const data = await apiRequest<{ documents: any[]; boardTitle: string }>(
      `/api/boards/${boardId}/context`,
      { token }
    )

    // Specific file requested
    if (fileName && fileName.trim()) {
      const cleanName = fileName.trim().toLowerCase()
      const doc = data.documents.find(
        (d: any) => d.fileName.toLowerCase() === cleanName || d.title.toLowerCase() === cleanName
      )

      if (!doc) {
        throw new Error(
          `Context file "${fileName}" not found in board "${data.boardTitle}". Available files: ${data.documents
            .map((d: any) => d.fileName)
            .join(', ')}`
        )
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
    if (data.documents.length > 0) {
      const fileListHeader = data.documents
        .map((d: any) => `- \`${d.fileName}\`: ${d.title}`)
        .join('\n')

      const fullFilesContent = data.documents
        .map((d: any) => `## 📄 ${d.title} (\`${d.fileName}\`)\n\n${d.content}\n\n---`)
        .join('\n\n')

      const bundle = `# Living Project Context for: "${data.boardTitle}"\n\n### Available Context Files:\n${fileListHeader}\n\n---\n\n${fullFilesContent}`

      return {
        content: [{ type: 'text', text: bundle }],
      }
    }

    return {
      content: [{ type: 'text', text: `No context documents found for board "${data.boardTitle}".` }],
    }
  }
)

// 5. Tool: update_board_context
server.tool(
  'update_board_context',
  'Creates or updates a living project context file on a board (e.g. fileName: "guidelines.md", content: "..."). Accessible by board owners and collaborators.',
  {
    boardId: z.string().describe('The ID of the board'),
    fileName: z.string().describe('File name to create or update (e.g. "guidelines.md", "architecture.md", "api-spec.json")'),
    content: z.string().optional().describe('The updated content for the file'),
    title: z.string().optional().describe('Optional human-readable title for the file'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, fileName, content, title, token }) => {
    const cleanFileName = fileName.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '-')
    const fileTitle = title?.trim() || cleanFileName

    const data = await apiRequest<{ document: any }>(`/api/boards/${boardId}/context`, {
      method: 'POST',
      body: {
        fileName: cleanFileName,
        title: fileTitle,
        content: content || '',
      },
      token,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Context file "${data.document.fileName}" (${data.document.title}) has been successfully saved.`,
        },
      ],
    }
  }
)

// 6. Tool: get_board_cards
server.tool(
  'get_board_cards',
  'Gets all columns and task cards from a board with assigned members. Optionally filter by column title (e.g. "To Do", "In Progress", "Review", "Done").',
  {
    boardId: z.string().describe('The ID of the board'),
    columnTitle: z.string().optional().describe('Optional column name filter, e.g. "In Progress"'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, columnTitle, token }) => {
    const data = await apiRequest<{ board: any }>(`/api/boards/${boardId}`, { token })
    let columns = data.board.columns || []

    if (columnTitle) {
      columns = columns.filter(
        (c: any) => c.title.toLowerCase() === columnTitle.toLowerCase().trim()
      )
    }

    const result = columns.map((col: any) => ({
      columnId: col.id,
      columnTitle: col.title,
      cards: (col.cards || []).map((card: any) => ({
        id: card.id,
        title: card.title,
        priority: card.priority,
        tags: card.tags,
        assignees: (card.assignees || []).map((a: any) => a.user?.name || a.user?.email),
        checklists: `${(card.checklists || []).filter((c: any) => c.isCompleted).length}/${(card.checklists || []).length} completed`,
        commentCount: card._count?.comments || 0,
        descriptionPreview: card.description?.slice(0, 120) || '',
      })),
    }))

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }
)

// 7. Tool: get_card_details
server.tool(
  'get_card_details',
  'Retrieves full detailed information for a specific task card, including assigned members, markdown description, checklists, and activity log.',
  {
    cardId: z.string().describe('The ID of the card'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ cardId, token }) => {
    const data = await apiRequest<{ card: any }>(`/api/cards/${cardId}`, { token })
    const card = data.card

    const details = {
      id: card.id,
      board: { id: card.column?.board?.id, title: card.column?.board?.title },
      column: { id: card.column?.id, title: card.column?.title },
      title: card.title,
      description: card.description,
      priority: card.priority,
      tags: card.tags,
      dueDate: card.dueDate,
      assignees: (card.assignees || []).map((a: any) => ({
        id: a.user?.id,
        name: a.user?.name,
        email: a.user?.email,
      })),
      checklists: (card.checklists || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        isCompleted: c.isCompleted,
      })),
      comments: (card.comments || []).map((cm: any) => ({
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

// 8. Tool: create_card
server.tool(
  'create_card',
  'Creates a new task card in a specified column of a board. Can optionally assign team members by email or name.',
  {
    boardId: z.string().describe('The ID of the board'),
    columnTitle: z.string().describe('Title of target column, e.g. "To Do" or "Backlog"'),
    title: z.string().describe('Title of the task card'),
    description: z.string().optional().describe('Markdown description of the task'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Task priority'),
    startDate: z.string().optional().describe('Optional start date (ISO or YYYY-MM-DD)'),
    dueDate: z.string().optional().describe('Optional due date (ISO or YYYY-MM-DD)'),
    tags: z.array(z.string()).optional().describe('List of tag strings, e.g. ["backend", "api"]'),
    assignees: z.array(z.string()).optional().describe('Optional list of member emails or names to assign to this card'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, columnTitle, title, description, priority, startDate, dueDate, tags, assignees, token }) => {
    // 1. Fetch board to get target column ID
    const boardData = await apiRequest<{ board: any }>(`/api/boards/${boardId}`, { token })
    const targetCol = boardData.board.columns?.find(
      (c: any) => c.title.toLowerCase() === columnTitle.toLowerCase().trim()
    )

    if (!targetCol) {
      const available = (boardData.board.columns || []).map((c: any) => `"${c.title}"`).join(', ')
      throw new Error(
        `Column "${columnTitle}" not found in board "${boardData.board.title}". Available columns: ${available}`
      )
    }

    // 2. Create card via API
    const createData = await apiRequest<{ card: any }>('/api/cards', {
      method: 'POST',
      body: {
        columnId: targetCol.id,
        title: title.trim(),
        startDate,
        dueDate,
      },
      token,
    })

    const card = createData.card

    // 3. Update description, priority, tags if provided
    if (description || priority || tags) {
      await apiRequest(`/api/cards/${card.id}`, {
        method: 'PUT',
        body: {
          description: description?.trim() || '',
          priority: priority || 'MEDIUM',
          tags: tags || [],
          ...(startDate !== undefined ? { startDate } : {}),
          ...(dueDate !== undefined ? { dueDate } : {}),
        },
        token,
      })
    }

    // 4. Assign members if specified
    const assignedNames: string[] = []
    if (assignees && assignees.length > 0) {
      const membersData = await apiRequest<{ owner: any; members: any[] }>(
        `/api/boards/${boardId}/members`,
        { token }
      )
      const allMembers = [membersData.owner, ...membersData.members.map((m: any) => m.user)]

      for (const query of assignees) {
        const clean = query.trim().toLowerCase()
        const matched = allMembers.find(
          (m: any) =>
            m.id === query ||
            m.email.toLowerCase() === clean ||
            (m.name && m.name.toLowerCase().includes(clean))
        )
        if (matched) {
          try {
            await apiRequest(`/api/cards/${card.id}/assignees`, {
              method: 'POST',
              body: { userId: matched.id },
              token,
            })
            assignedNames.push(matched.name || matched.email)
          } catch (e) {
            console.error(`Failed to assign member ${matched.name}:`, e)
          }
        }
      }
    }

    const assignedSummary = assignedNames.length > 0 ? `\nAssignees: ${assignedNames.join(', ')}` : ''

    return {
      content: [
        {
          type: 'text',
          text: `Card created successfully in column "${targetCol.title}":\nID: ${card.id}\nTitle: ${card.title}\nPriority: ${priority || 'MEDIUM'}${assignedSummary}`,
        },
      ],
    }
  }
)

// 9. Tool: update_card
server.tool(
  'update_card',
  'Updates a task card, including title, description, priority, or moving between columns.',
  {
    cardId: z.string().describe('The ID of the card to update'),
    title: z.string().optional().describe('New title of the card'),
    description: z.string().optional().describe('New markdown description'),
    targetColumnTitle: z.string().optional().describe('Move to this column, e.g. "Done" or "In Review"'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('New priority'),
    startDate: z.string().optional().describe('Optional start date (ISO or YYYY-MM-DD)'),
    dueDate: z.string().optional().describe('Optional due date (ISO or YYYY-MM-DD)'),
    tags: z.array(z.string()).optional().describe('Updated tag list'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ cardId, title, description, targetColumnTitle, priority, startDate, dueDate, tags, token }) => {
    // 1. Move to column if requested
    if (targetColumnTitle) {
      const cardData = await apiRequest<{ card: any }>(`/api/cards/${cardId}`, { token })
      const boardId = cardData.card.column?.boardId || cardData.card.column?.board?.id
      if (boardId) {
        const boardData = await apiRequest<{ board: any }>(`/api/boards/${boardId}`, { token })
        const targetCol = boardData.board.columns?.find(
          (c: any) => c.title.toLowerCase() === targetColumnTitle.toLowerCase().trim()
        )
        if (!targetCol) {
          const available = (boardData.board.columns || []).map((c: any) => `"${c.title}"`).join(', ')
          throw new Error(`Target column "${targetColumnTitle}" not found. Available: ${available}`)
        }
        await apiRequest(`/api/cards/${cardId}/move`, {
          method: 'POST',
          body: { targetColumnId: targetCol.id, targetOrder: 0 },
          token,
        })
      }
    }

    // 2. Update metadata
    const updateData = await apiRequest<{ card: any }>(`/api/cards/${cardId}`, {
      method: 'PUT',
      body: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(tags !== undefined ? { tags } : {}),
      },
      token,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Card "${updateData.card.title}" (ID: ${updateData.card.id}) updated successfully.`,
        },
      ],
    }
  }
)

// 10. Tool: assign_card_member
server.tool(
  'assign_card_member',
  'Assigns/mentions a team member on a card by user email, name, or user ID.',
  {
    cardId: z.string().describe('The ID of the card'),
    member: z.string().describe('Email, name, or user ID of the board member to assign'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ cardId, member, token }) => {
    const cardData = await apiRequest<{ card: any }>(`/api/cards/${cardId}`, { token })
    const boardId = cardData.card.column?.boardId || cardData.card.column?.board?.id

    const membersData = await apiRequest<{ owner: any; members: any[] }>(
      `/api/boards/${boardId}/members`,
      { token }
    )
    const cleanQuery = member.trim().toLowerCase()
    const allMembers = [membersData.owner, ...membersData.members.map((m: any) => m.user)]

    const matched = allMembers.find(
      (c: any) =>
        c.id === member ||
        c.email.toLowerCase() === cleanQuery ||
        (c.name && c.name.toLowerCase().includes(cleanQuery))
    )

    if (!matched) {
      const available = allMembers.map((c: any) => `${c.name} (${c.email})`).join(', ')
      throw new Error(
        `Member "${member}" not found in board members. Available members: ${available}`
      )
    }

    await apiRequest(`/api/cards/${cardId}/assignees`, {
      method: 'POST',
      body: { userId: matched.id },
      token,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Successfully assigned ${matched.name || matched.email} to card "${cardData.card.title}".`,
        },
      ],
    }
  }
)

// 11. Tool: unassign_card_member
server.tool(
  'unassign_card_member',
  'Removes an assigned member from a card by user email, name, or user ID.',
  {
    cardId: z.string().describe('The ID of the card'),
    member: z.string().describe('Email, name, or user ID of the board member to unassign'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ cardId, member, token }) => {
    const cardData = await apiRequest<{ card: any }>(`/api/cards/${cardId}`, { token })
    const cleanQuery = member.trim().toLowerCase()

    const targetAssignee = (cardData.card.assignees || []).find(
      (a: any) =>
        a.userId === member ||
        a.user?.id === member ||
        a.user?.email.toLowerCase() === cleanQuery ||
        (a.user?.name && a.user?.name.toLowerCase().includes(cleanQuery))
    )

    if (!targetAssignee) {
      const current = (cardData.card.assignees || [])
        .map((a: any) => `${a.user?.name} (${a.user?.email})`)
        .join(', ')
      throw new Error(
        `Member "${member}" is not assigned to this card. Current assignees: ${current || 'None'}`
      )
    }

    await apiRequest(`/api/cards/${cardId}/assignees/${targetAssignee.userId || targetAssignee.user.id}`, {
      method: 'DELETE',
      token,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Successfully removed ${targetAssignee.user?.name || targetAssignee.user?.email} from card "${cardData.card.title}".`,
        },
      ],
    }
  }
)

// 12. Tool: add_card_comment
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
    const commentData = await apiRequest<{ comment: any }>(`/api/cards/${cardId}/comments`, {
      method: 'POST',
      body: {
        content: content.trim(),
        authorName: authorName?.trim() || 'AI Assistant (via MCP)',
        isAiGenerated: true,
      },
      token,
    })

    return {
      content: [
        {
          type: 'text',
          text: `Comment posted successfully (ID: ${commentData.comment.id}).`,
        },
      ],
    }
  }
)

// 13. Tool: manage_checklist
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
    if (action === 'add') {
      if (!title?.trim()) throw new Error('title is required for "add" action')
      const data = await apiRequest<{ item: any }>(`/api/cards/${cardId}/checklists`, {
        method: 'POST',
        body: { title: title.trim() },
        token,
      })
      return {
        content: [
          { type: 'text', text: `Checklist item added: "${data.item.title}" (ID: ${data.item.id})` },
        ],
      }
    }

    if (action === 'toggle') {
      if (!itemId) throw new Error('itemId is required for "toggle" action')
      const data = await apiRequest<{ item: any }>(`/api/cards/${cardId}/checklists`, {
        method: 'PUT',
        body: { itemId, isCompleted: isCompleted !== undefined ? isCompleted : true },
        token,
      })
      return {
        content: [
          {
            type: 'text',
            text: `Checklist item "${data.item.title}" set to ${data.item.isCompleted ? 'COMPLETED' : 'INCOMPLETE'}.`,
          },
        ],
      }
    }

    if (action === 'delete') {
      if (!itemId) throw new Error('itemId is required for "delete" action')
      await apiRequest(`/api/cards/${cardId}/checklists?itemId=${itemId}`, {
        method: 'DELETE',
        token,
      })
      return {
        content: [{ type: 'text', text: `Checklist item ${itemId} deleted.` }],
      }
    }

    throw new Error(`Unknown action "${action}"`)
  }
)

// 14. Tool: create_column
server.tool(
  'create_column',
  'Creates a new column on a board.',
  {
    boardId: z.string().describe('The ID of the board'),
    title: z.string().describe('Title of the new column'),
    colorCode: z.string().optional().describe('Hex color code for the column badge, e.g. #8b5cf6'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, title, colorCode, token }) => {
    const data = await apiRequest<{ column: any }>(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      body: { title: title.trim(), colorCode },
      token,
    })
    return {
      content: [
        {
          type: 'text',
          text: `Column "${data.column.title}" created successfully (ID: ${data.column.id}, Order: ${data.column.order}).`,
        },
      ],
    }
  }
)

// 15. Tool: update_column
server.tool(
  'update_column',
  'Updates an existing column title and/or colorCode on a board.',
  {
    boardId: z.string().describe('The ID of the board'),
    columnId: z.string().describe('The ID of the column to update'),
    title: z.string().describe('New title for the column'),
    colorCode: z.string().optional().describe('New hex color code, e.g. #3b82f6'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, columnId, title, colorCode, token }) => {
    const data = await apiRequest<{ column: any }>(`/api/boards/${boardId}/columns/${columnId}`, {
      method: 'PATCH',
      body: { title: title.trim(), colorCode },
      token,
    })
    return {
      content: [
        {
          type: 'text',
          text: `Column "${data.column.title}" updated successfully (ID: ${data.column.id}).`,
        },
      ],
    }
  }
)

// 16. Tool: delete_column
server.tool(
  'delete_column',
  'Deletes a column from a board. If the column contains cards, specify transferToColumnId to migrate them safely to another column before deletion.',
  {
    boardId: z.string().describe('The ID of the board'),
    columnId: z.string().describe('The ID of the column to delete'),
    transferToColumnId: z
      .string()
      .optional()
      .describe('Optional ID of target column within the same board to transfer existing cards to'),
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ boardId, columnId, transferToColumnId, token }) => {
    const query = transferToColumnId ? `?transferToColumnId=${transferToColumnId}` : ''
    const data = await apiRequest<{ success: boolean; transferredCards: number }>(
      `/api/boards/${boardId}/columns/${columnId}${query}`,
      {
        method: 'DELETE',
        token,
      }
    )
    return {
      content: [
        {
          type: 'text',
          text: `Column ${columnId} deleted successfully. Transferred cards: ${data.transferredCards || 0}.`,
        },
      ],
    }
  }
)

// 17. Tool: get_review_queue
server.tool(
  'get_review_queue',
  'Retrieves all tasks across accessible project boards currently in the Review / In Review column awaiting human verification and approval.',
  {
    token: z.string().optional().describe('Optional Personal Access Token override'),
  },
  async ({ token }) => {
    const data = await apiRequest<{ cards: any[]; total: number }>('/api/reviews', { token })
    const formatted = data.cards.map((c) => ({
      id: c.id,
      title: c.title,
      priority: c.priority,
      board: { id: c.column?.board?.id, title: c.column?.board?.title },
      column: c.column?.title,
      assignees: (c.assignees || []).map((a: any) => a.user?.name || a.user?.email),
      checklistsCompleted: `${(c.checklists || []).filter((i: any) => i.isCompleted).length}/${(c.checklists || []).length}`,
      commentsCount: c._count?.comments || 0,
      updatedAt: c.updatedAt,
    }))
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ total: data.total, cards: formatted }, null, 2),
        },
      ],
    }
  }
)

async function run() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('NeoKanban API-Based MCP Server running on stdio transport.')
}

run().catch((err) => {
  console.error('Fatal MCP Server error:', err)
  process.exit(1)
})
