"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
function hashToken(rawToken) {
    return crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
}
async function authenticateUser(tokenOverride) {
    const token = tokenOverride || process.env.NEOKANBAN_PAT;
    if (!token) {
        throw new Error('Authentication failed: NEOKANBAN_PAT environment variable or token parameter is missing. Generate a token in NeoKanban Settings.');
    }
    const tokenHash = hashToken(token);
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
    });
    if (!record || !record.user) {
        throw new Error('Authentication failed: Invalid or revoked NeoKanban Personal Access Token.');
    }
    // Update lastUsedAt asynchronously
    prisma.personalAccessToken
        .update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
    })
        .catch((err) => console.error('Error updating PAT lastUsedAt:', err));
    return record.user;
}
/**
 * Validates that a user has access to a board (either as Owner or Collaborator).
 */
async function verifyBoardAccess(boardId, userId) {
    const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: {
                include: {
                    user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                },
            },
            contextDocuments: {
                orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            },
            projectContext: true,
            columns: {
                orderBy: { order: 'asc' },
            },
        },
    });
    if (!board)
        return null;
    const isOwner = board.ownerId === userId;
    const isMember = board.members.some((m) => m.userId === userId);
    if (!isOwner && !isMember)
        return null;
    return { board, isOwner };
}
const server = new mcp_js_1.McpServer({
    name: 'NeoKanban AI MCP Server',
    version: '1.2.0',
});
// 1. Tool: list_boards
server.tool('list_boards', 'Lists all project boards accessible by the authenticated user (both owned and shared boards) with task counts and collaboration status.', {
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ token }) => {
    const user = await authenticateUser(token);
    const boards = await prisma.board.findMany({
        where: {
            OR: [
                { ownerId: user.id },
                { members: { some: { userId: user.id } } },
            ],
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, role: true } },
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
    });
    const result = boards.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        isFavorite: b.isFavorite,
        isOwner: b.ownerId === user.id,
        ownerName: b.owner.name || b.owner.email,
        memberCount: b.members.length,
        columns: b.columns.map((c) => `${c.title} (${c._count.cards} cards)`),
        totalCards: b.columns.reduce((sum, col) => sum + col._count.cards, 0),
    }));
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// 2. Tool: list_board_members
server.tool('list_board_members', 'Lists the owner and all team collaborators for a project board.', {
    boardId: zod_1.z.string().describe('The ID of the board'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ boardId, token }) => {
    const user = await authenticateUser(token);
    const access = await verifyBoardAccess(boardId, user.id);
    if (!access) {
        throw new Error(`Board with ID ${boardId} not found or unauthorized.`);
    }
    const { board } = access;
    const membersList = [
        {
            id: board.owner.id,
            name: board.owner.name,
            email: board.owner.email,
            role: 'OWNER',
        },
        ...board.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role || 'COLLABORATOR',
        })),
    ];
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    boardId: board.id,
                    boardTitle: board.title,
                    isOwner: access.isOwner,
                    members: membersList,
                }, null, 2),
            },
        ],
    };
});
// 3. Tool: list_board_context_files
server.tool('list_board_context_files', 'Lists all living context files/documents available in a board (e.g. guidelines.md, tech-stack.md, architecture.md).', {
    boardId: zod_1.z.string().describe('The ID of the board'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ boardId, token }) => {
    const user = await authenticateUser(token);
    const access = await verifyBoardAccess(boardId, user.id);
    if (!access) {
        throw new Error(`Board with ID ${boardId} not found or unauthorized.`);
    }
    const { board } = access;
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    boardId: board.id,
                    boardTitle: board.title,
                    files: board.contextDocuments.map((d) => ({
                        id: d.id,
                        title: d.title,
                        fileName: d.fileName,
                        order: d.order,
                        updatedAt: d.updatedAt,
                    })),
                }, null, 2),
            },
        ],
    };
});
// 4. Tool: get_board_context
server.tool('get_board_context', 'Retrieves the living project context files for a board. Can fetch a specific file by fileName or retrieve the entire context bundle.', {
    boardId: zod_1.z.string().describe('The ID of the board'),
    fileName: zod_1.z.string().optional().describe('Optional file name, e.g. "guidelines.md" or "architecture.md"'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ boardId, fileName, token }) => {
    const user = await authenticateUser(token);
    const access = await verifyBoardAccess(boardId, user.id);
    if (!access) {
        throw new Error(`Board with ID ${boardId} not found or unauthorized.`);
    }
    const { board } = access;
    // Specific file requested
    if (fileName && fileName.trim()) {
        const cleanName = fileName.trim().toLowerCase();
        const doc = board.contextDocuments.find((d) => d.fileName.toLowerCase() === cleanName || d.title.toLowerCase() === cleanName);
        if (!doc) {
            throw new Error(`Context file "${fileName}" not found in board "${board.title}". Available files: ${board.contextDocuments
                .map((d) => d.fileName)
                .join(', ')}`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `# ${doc.title} (\`${doc.fileName}\`)\n\n${doc.content}`,
                },
            ],
        };
    }
    // Return complete context bundle
    if (board.contextDocuments.length > 0) {
        const fileListHeader = board.contextDocuments
            .map((d) => `- \`${d.fileName}\`: ${d.title}`)
            .join('\n');
        const fullFilesContent = board.contextDocuments
            .map((d) => `## 📄 ${d.title} (\`${d.fileName}\`)\n\n${d.content}\n\n---`)
            .join('\n\n');
        const bundle = `# Living Project Context for: "${board.title}"\n\n### Available Context Files:\n${fileListHeader}\n\n---\n\n${fullFilesContent}`;
        return {
            content: [{ type: 'text', text: bundle }],
        };
    }
    const legacy = board.projectContext || {
        guidelinesMarkdown: 'No guidelines defined.',
        techStackMarkdown: 'No tech stack specified.',
        conventionsMarkdown: 'No conventions specified.',
        messagingStandards: 'No message standards specified.',
    };
    const fallbackContext = `# Living Project Context for: "${board.title}"\n\n## 1. Core Guidelines\n${legacy.guidelinesMarkdown}\n\n## 2. Tech Stack\n${legacy.techStackMarkdown}\n\n## 3. Conventions\n${legacy.conventionsMarkdown}\n\n## 4. Message Standards\n${legacy.messagingStandards}`;
    return {
        content: [{ type: 'text', text: fallbackContext }],
    };
});
// 5. Tool: update_board_context
server.tool('update_board_context', 'Creates or updates a living project context file on a board (e.g. fileName: "guidelines.md", content: "..."). Accessible by board owners and collaborators.', {
    boardId: zod_1.z.string().describe('The ID of the board'),
    fileName: zod_1.z.string().optional().describe('File name to create or update (e.g. "guidelines.md", "architecture.md", "api-spec.json")'),
    content: zod_1.z.string().optional().describe('The updated content for the file'),
    title: zod_1.z.string().optional().describe('Optional human-readable title for the file'),
    guidelinesMarkdown: zod_1.z.string().optional().describe('Legacy: Updated coding guidelines markdown'),
    techStackMarkdown: zod_1.z.string().optional().describe('Legacy: Updated tech stack markdown'),
    conventionsMarkdown: zod_1.z.string().optional().describe('Legacy: Updated conventions markdown'),
    messagingStandards: zod_1.z.string().optional().describe('Legacy: Updated messaging standards markdown'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ boardId, fileName, content, title, guidelinesMarkdown, techStackMarkdown, conventionsMarkdown, messagingStandards, token, }) => {
    const user = await authenticateUser(token);
    const access = await verifyBoardAccess(boardId, user.id);
    if (!access) {
        throw new Error(`Board with ID ${boardId} not found or unauthorized.`);
    }
    const { board } = access;
    // Modern multi-file update
    if (fileName && fileName.trim()) {
        const cleanFileName = fileName.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '-');
        const fileContent = content || '';
        const fileTitle = title?.trim() || cleanFileName;
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
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Context file "${updatedDoc.fileName}" (${updatedDoc.title}) on board "${board.title}" has been successfully saved at ${updatedDoc.updatedAt.toISOString()}.`,
                },
            ],
        };
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
    });
    return {
        content: [
            {
                type: 'text',
                text: `Project context for board "${board.title}" has been updated successfully at ${updated.updatedAt.toISOString()}.`,
            },
        ],
    };
});
// 6. Tool: get_board_cards
server.tool('get_board_cards', 'Gets all columns and task cards from a board with assigned members. Optionally filter by column title (e.g. "To Do", "In Progress", "Review", "Done").', {
    boardId: zod_1.z.string().describe('The ID of the board'),
    columnTitle: zod_1.z.string().optional().describe('Optional column name filter, e.g. "In Progress"'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ boardId, columnTitle, token }) => {
    const user = await authenticateUser(token);
    const access = await verifyBoardAccess(boardId, user.id);
    if (!access) {
        throw new Error(`Board with ID ${boardId} not found or unauthorized.`);
    }
    const columns = await prisma.column.findMany({
        where: {
            boardId,
            ...(columnTitle ? { title: { equals: columnTitle, mode: 'insensitive' } } : {}),
        },
        include: {
            cards: {
                include: {
                    assignees: {
                        include: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                    },
                    checklists: { select: { id: true, title: true, isCompleted: true } },
                    _count: { select: { comments: true } },
                },
                orderBy: { order: 'asc' },
            },
        },
        orderBy: { order: 'asc' },
    });
    const result = columns.map((col) => ({
        columnId: col.id,
        columnTitle: col.title,
        cards: col.cards.map((card) => ({
            id: card.id,
            title: card.title,
            priority: card.priority,
            tags: card.tags,
            assignees: card.assignees.map((a) => a.user.name || a.user.email),
            checklists: `${card.checklists.filter((c) => c.isCompleted).length}/${card.checklists.length} completed`,
            commentCount: card._count.comments,
            descriptionPreview: card.description.slice(0, 120),
        })),
    }));
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// 7. Tool: get_card_details
server.tool('get_card_details', 'Retrieves full detailed information for a specific task card, including assigned members, markdown description, checklists, and activity log.', {
    cardId: zod_1.z.string().describe('The ID of the card'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ cardId, token }) => {
    const user = await authenticateUser(token);
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            column: { include: { board: true } },
            assignees: {
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
            },
            checklists: { orderBy: { order: 'asc' } },
            comments: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!card)
        throw new Error(`Card with ID ${cardId} not found.`);
    const access = await verifyBoardAccess(card.column.boardId, user.id);
    if (!access) {
        throw new Error(`Card with ID ${cardId} not found or unauthorized.`);
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
        assignees: card.assignees.map((a) => ({
            id: a.user.id,
            name: a.user.name,
            email: a.user.email,
        })),
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
    };
    return {
        content: [{ type: 'text', text: JSON.stringify(details, null, 2) }],
    };
});
// 8. Tool: create_card
server.tool('create_card', 'Creates a new task card in a specified column of a board. Can optionally assign team members by email or name.', {
    boardId: zod_1.z.string().describe('The ID of the board'),
    columnTitle: zod_1.z.string().describe('Title of target column, e.g. "To Do" or "Backlog"'),
    title: zod_1.z.string().describe('Title of the task card'),
    description: zod_1.z.string().optional().describe('Markdown description of the task'),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Task priority'),
    tags: zod_1.z.array(zod_1.z.string()).optional().describe('List of tag strings, e.g. ["backend", "api"]'),
    assignees: zod_1.z.array(zod_1.z.string()).optional().describe('Optional list of member emails or names to assign to this card'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ boardId, columnTitle, title, description, priority, tags, assignees, token }) => {
    const user = await authenticateUser(token);
    const access = await verifyBoardAccess(boardId, user.id);
    if (!access) {
        throw new Error(`Board with ID ${boardId} not found or unauthorized.`);
    }
    const { board } = access;
    const targetCol = board.columns.find((c) => c.title.toLowerCase() === columnTitle.toLowerCase().trim());
    if (!targetCol) {
        const available = board.columns.map((c) => `"${c.title}"`).join(', ');
        throw new Error(`Column "${columnTitle}" not found in board "${board.title}". Available columns: ${available}`);
    }
    const maxOrder = await prisma.card.findFirst({
        where: { columnId: targetCol.id },
        orderBy: { order: 'desc' },
        select: { order: true },
    });
    const order = maxOrder ? maxOrder.order + 1 : 0;
    const card = await prisma.card.create({
        data: {
            columnId: targetCol.id,
            title: title.trim(),
            description: description?.trim() || '',
            priority: priority || client_1.Priority.MEDIUM,
            tags: tags || [],
            order,
        },
    });
    // Assign members if specified
    const assignedNames = [];
    if (assignees && assignees.length > 0) {
        const allMembers = [board.owner, ...board.members.map((m) => m.user)];
        for (const query of assignees) {
            const clean = query.trim().toLowerCase();
            const matched = allMembers.find((m) => m.id === query ||
                m.email.toLowerCase() === clean ||
                (m.name && m.name.toLowerCase().includes(clean)));
            if (matched) {
                await prisma.cardAssignee.upsert({
                    where: { cardId_userId: { cardId: card.id, userId: matched.id } },
                    create: { cardId: card.id, userId: matched.id },
                    update: {},
                });
                assignedNames.push(matched.name || matched.email);
            }
        }
    }
    const assignedSummary = assignedNames.length > 0 ? `\nAssignees: ${assignedNames.join(', ')}` : '';
    return {
        content: [
            {
                type: 'text',
                text: `Card created successfully in column "${targetCol.title}":\nID: ${card.id}\nTitle: ${card.title}\nPriority: ${card.priority}${assignedSummary}`,
            },
        ],
    };
});
// 9. Tool: update_card
server.tool('update_card', 'Updates a task card, including title, description, priority, moving between columns, or updating assigned members.', {
    cardId: zod_1.z.string().describe('The ID of the card to update'),
    title: zod_1.z.string().optional().describe('New title of the card'),
    description: zod_1.z.string().optional().describe('New markdown description'),
    targetColumnTitle: zod_1.z.string().optional().describe('Move to this column, e.g. "Done" or "In Review"'),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('New priority'),
    tags: zod_1.z.array(zod_1.z.string()).optional().describe('Updated tag list'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ cardId, title, description, targetColumnTitle, priority, tags, token, }) => {
    const user = await authenticateUser(token);
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: { column: { include: { board: { include: { columns: true } } } } },
    });
    if (!card)
        throw new Error(`Card with ID ${cardId} not found.`);
    const access = await verifyBoardAccess(card.column.boardId, user.id);
    if (!access) {
        throw new Error(`Card with ID ${cardId} not found or unauthorized.`);
    }
    let nextColumnId = card.columnId;
    if (targetColumnTitle) {
        const match = card.column.board.columns.find((c) => c.title.toLowerCase() === targetColumnTitle.toLowerCase().trim());
        if (!match) {
            const available = card.column.board.columns.map((c) => `"${c.title}"`).join(', ');
            throw new Error(`Target column "${targetColumnTitle}" not found. Available: ${available}`);
        }
        nextColumnId = match.id;
    }
    const updated = await prisma.card.update({
        where: { id: cardId },
        data: {
            ...(title !== undefined ? { title: title.trim() } : {}),
            ...(description !== undefined ? { description: description.trim() } : {}),
            ...(priority !== undefined ? { priority: priority } : {}),
            ...(tags !== undefined ? { tags } : {}),
            ...(nextColumnId !== card.columnId ? { columnId: nextColumnId } : {}),
        },
        include: { column: true },
    });
    return {
        content: [
            {
                type: 'text',
                text: `Card "${updated.title}" (ID: ${updated.id}) updated successfully. Current column: "${updated.column.title}".`,
            },
        ],
    };
});
// 10. Tool: assign_card_member
server.tool('assign_card_member', 'Assigns/mentions a team member on a card by user email, name, or user ID.', {
    cardId: zod_1.z.string().describe('The ID of the card'),
    member: zod_1.z.string().describe('Email, name, or user ID of the board member to assign'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ cardId, member, token }) => {
    const user = await authenticateUser(token);
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            column: {
                include: {
                    board: {
                        include: {
                            owner: true,
                            members: { include: { user: true } },
                        },
                    },
                },
            },
        },
    });
    if (!card)
        throw new Error(`Card with ID ${cardId} not found.`);
    const access = await verifyBoardAccess(card.column.boardId, user.id);
    if (!access) {
        throw new Error(`Access denied to board "${card.column.board.title}".`);
    }
    const board = card.column.board;
    const cleanQuery = member.trim().toLowerCase();
    const candidates = [board.owner, ...board.members.map((m) => m.user)];
    const matched = candidates.find((c) => c.id === member ||
        c.email.toLowerCase() === cleanQuery ||
        (c.name && c.name.toLowerCase().includes(cleanQuery)));
    if (!matched) {
        const available = candidates.map((c) => `${c.name} (${c.email})`).join(', ');
        throw new Error(`Member "${member}" not found in board members. Available members: ${available}`);
    }
    await prisma.cardAssignee.upsert({
        where: {
            cardId_userId: {
                cardId,
                userId: matched.id,
            },
        },
        create: {
            cardId,
            userId: matched.id,
        },
        update: {},
    });
    return {
        content: [
            {
                type: 'text',
                text: `Successfully assigned ${matched.name || matched.email} to card "${card.title}".`,
            },
        ],
    };
});
// 11. Tool: unassign_card_member
server.tool('unassign_card_member', 'Removes an assigned member from a card by user email, name, or user ID.', {
    cardId: zod_1.z.string().describe('The ID of the card'),
    member: zod_1.z.string().describe('Email, name, or user ID of the board member to unassign'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ cardId, member, token }) => {
    const user = await authenticateUser(token);
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            column: {
                include: {
                    board: {
                        include: {
                            owner: true,
                            members: { include: { user: true } },
                        },
                    },
                },
            },
            assignees: { include: { user: true } },
        },
    });
    if (!card)
        throw new Error(`Card with ID ${cardId} not found.`);
    const access = await verifyBoardAccess(card.column.boardId, user.id);
    if (!access) {
        throw new Error(`Access denied to board "${card.column.board.title}".`);
    }
    const cleanQuery = member.trim().toLowerCase();
    const targetAssignee = card.assignees.find((a) => a.userId === member ||
        a.user.email.toLowerCase() === cleanQuery ||
        (a.user.name && a.user.name.toLowerCase().includes(cleanQuery)));
    if (!targetAssignee) {
        const current = card.assignees.map((a) => `${a.user.name} (${a.user.email})`).join(', ');
        throw new Error(`Member "${member}" is not assigned to this card. Current assignees: ${current || 'None'}`);
    }
    await prisma.cardAssignee.delete({
        where: { id: targetAssignee.id },
    });
    return {
        content: [
            {
                type: 'text',
                text: `Successfully removed ${targetAssignee.user.name || targetAssignee.user.email} from card "${card.title}".`,
            },
        ],
    };
});
// 12. Tool: add_card_comment
server.tool('add_card_comment', 'Adds a comment or execution status log to a task card. The comment is automatically tagged as AI-generated (isAiGenerated: true). Should follow standard messaging format (Status, Actions, Changed Files, Blockers).', {
    cardId: zod_1.z.string().describe('The ID of the card to comment on'),
    content: zod_1.z.string().describe('The markdown content of the comment'),
    authorName: zod_1.z.string().optional().describe('Name of the AI Assistant, e.g. "Claude (via MCP)"'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ cardId, content, authorName, token }) => {
    const user = await authenticateUser(token);
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: { column: { include: { board: true } } },
    });
    if (!card)
        throw new Error(`Card with ID ${cardId} not found.`);
    const access = await verifyBoardAccess(card.column.boardId, user.id);
    if (!access) {
        throw new Error(`Card with ID ${cardId} not found or unauthorized.`);
    }
    const comment = await prisma.comment.create({
        data: {
            cardId,
            authorName: authorName?.trim() || 'AI Assistant (via MCP)',
            isAiGenerated: true,
            content: content.trim(),
        },
    });
    return {
        content: [
            {
                type: 'text',
                text: `Comment posted to card "${card.title}" successfully (ID: ${comment.id}).`,
            },
        ],
    };
});
// 13. Tool: manage_checklist
server.tool('manage_checklist', 'Manages subtasks or acceptance criteria items on a card (add new item, toggle completion, or delete item).', {
    cardId: zod_1.z.string().describe('The ID of the card'),
    action: zod_1.z.enum(['add', 'toggle', 'delete']).describe('The action to perform'),
    title: zod_1.z.string().optional().describe('Title of the checklist item (required for "add")'),
    itemId: zod_1.z.string().optional().describe('The checklist item ID (required for "toggle" or "delete")'),
    isCompleted: zod_1.z.boolean().optional().describe('The completed boolean state (used for "toggle")'),
    token: zod_1.z.string().optional().describe('Optional Personal Access Token override'),
}, async ({ cardId, action, title, itemId, isCompleted, token }) => {
    const user = await authenticateUser(token);
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: { column: { include: { board: true } } },
    });
    if (!card)
        throw new Error(`Card with ID ${cardId} not found.`);
    const access = await verifyBoardAccess(card.column.boardId, user.id);
    if (!access) {
        throw new Error(`Card with ID ${cardId} not found or unauthorized.`);
    }
    if (action === 'add') {
        if (!title?.trim())
            throw new Error('title is required for "add" action');
        const maxOrder = await prisma.checklistItem.findFirst({
            where: { cardId },
            orderBy: { order: 'desc' },
            select: { order: true },
        });
        const order = maxOrder ? maxOrder.order + 1 : 0;
        const item = await prisma.checklistItem.create({
            data: { cardId, title: title.trim(), order },
        });
        return {
            content: [
                { type: 'text', text: `Checklist item added: "${item.title}" (ID: ${item.id})` },
            ],
        };
    }
    if (action === 'toggle') {
        if (!itemId)
            throw new Error('itemId is required for "toggle" action');
        const updated = await prisma.checklistItem.update({
            where: { id: itemId },
            data: { isCompleted: isCompleted !== undefined ? isCompleted : true },
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Checklist item "${updated.title}" set to ${updated.isCompleted ? 'COMPLETED' : 'INCOMPLETE'}.`,
                },
            ],
        };
    }
    if (action === 'delete') {
        if (!itemId)
            throw new Error('itemId is required for "delete" action');
        await prisma.checklistItem.delete({ where: { id: itemId } });
        return {
            content: [{ type: 'text', text: `Checklist item ${itemId} deleted.` }],
        };
    }
    throw new Error(`Unknown action "${action}"`);
});
async function run() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('NeoKanban MCP Server running on stdio transport.');
}
run().catch((err) => {
    console.error('Fatal MCP Server error:', err);
    process.exit(1);
});
