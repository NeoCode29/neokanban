# Flexible Multi-File Project Context Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the fixed 4-field `ProjectContext` into a flexible, multi-file `ContextDocument` repository supporting arbitrary files (Markdown, JSON, SQL, YAML), full CRUD operations, a sleek file navigator UI, and expanded AI MCP tool capabilities.

**Architecture:** A 1-to-many relation between `Board` and `ContextDocument` in PostgreSQL via Prisma. A suite of REST endpoints (`/api/boards/[id]/context`) handles document CRUD. The stdio MCP server exposes `get_board_context` (multi-file or single file), `update_board_context` (upsert), and `list_board_context_files`. The frontend `ProjectContextView.tsx` features a file navigator sidebar, file search, inline creation/deletion, and split-pane editor with live preview.

**Tech Stack:** Next.js 16 (App Router), Prisma 6.4.1, PostgreSQL 16 (Docker port 5435), Model Context Protocol SDK (`@modelcontextprotocol/sdk`), Tailwind CSS, Lucide Icons, React Markdown.

## Global Constraints
- Database connection string: `postgresql://postgres:postgres@localhost:5435/neokanban?schema=public`
- Unique constraint: `[boardId, fileName]`
- Preserved default seed files: `guidelines.md`, `tech-stack.md`, `conventions.md`, `messaging-standards.md`
- Visual aesthetic: Counsel Doc / Linear light minimalist design

---

### Task 1: Prisma Schema Migration & Database Sync

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/migrate-context-to-docs.ts`

**Interfaces:**
- Produces: `ContextDocument` model on Prisma client.

- [ ] **Step 1: Update Prisma schema with ContextDocument model**

Update `prisma/schema.prisma` to add `ContextDocument` and link it to `Board`.

```prisma
model Board {
  id               String            @id @default(cuid())
  title            String
  description      String?
  isFavorite       Boolean           @default(false)
  ownerId          String
  owner            User              @relation("BoardOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  columns          Column[]
  contextDocuments ContextDocument[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}

model ContextDocument {
  id        String   @id @default(cuid())
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  title     String   // e.g. "Coding Standards", "API Specs"
  fileName  String   // e.g. "guidelines.md", "endpoints.json"
  content   String   @default("")
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([boardId, fileName])
  @@index([boardId])
}
```

- [ ] **Step 2: Push database schema and generate Prisma client**

Run: `npx prisma db push`
Expected: Database updated successfully, `ContextDocument` table created.

- [ ] **Step 3: Seed standard context documents for existing boards**

Write and execute `scripts/migrate-context-to-docs.ts` to initialize default context files for any board lacking them.

```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const boards = await prisma.board.findMany({
    include: { contextDocuments: true },
  })

  for (const board of boards) {
    if (board.contextDocuments.length === 0) {
      console.log(`Seeding default context files for board: ${board.title}`)
      await prisma.contextDocument.createMany({
        data: [
          {
            boardId: board.id,
            title: 'Core Guidelines & Architecture',
            fileName: 'guidelines.md',
            content: '# Project Guidelines & Coding Standards\n\n1. **Architecture:** Next.js App Router.\n2. **Type Safety:** TypeScript strict mode.\n3. **Clean Code:** Keep components atomic.',
            order: 0,
          },
          {
            boardId: board.id,
            title: 'Tech Stack Specifications',
            fileName: 'tech-stack.md',
            content: '# Tech Stack\n\n- Next.js 16\n- Prisma ORM\n- Tailwind CSS\n- MCP Server (stdio)',
            order: 1,
          },
          {
            boardId: board.id,
            title: 'Team & Git Conventions',
            fileName: 'conventions.md',
            content: '# Conventions\n\n- Branching: feature branches\n- Commits: Conventional Commits (feat, fix, refactor)\n- Definition of Done: verified builds & tests',
            order: 2,
          },
          {
            boardId: board.id,
            title: 'Communication & Message Standards',
            fileName: 'messaging-standards.md',
            content: '# Messaging Standards\n\n- High informative density\n- Consistent status updates for humans and AI agents',
            order: 3,
          },
        ],
      })
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

- [ ] **Step 4: Execute migration script**

Run: `npx tsx scripts/migrate-context-to-docs.ts`
Expected: Output confirms seeding for existing boards.

- [ ] **Step 5: Commit changes**

```bash
git add prisma/schema.prisma scripts/migrate-context-to-docs.ts
git commit -m "feat(db): introduce ContextDocument model and migration script"
```

---

### Task 2: REST API Endpoints for Multi-File Context

**Files:**
- Create: `src/app/api/boards/[id]/context/route.ts`
- Create: `src/app/api/boards/[id]/context/[docId]/route.ts`

**Interfaces:**
- `GET /api/boards/[id]/context` -> `{ documents: ContextDocument[] }`
- `POST /api/boards/[id]/context` -> `{ document: ContextDocument }`
- `PUT /api/boards/[id]/context/[docId]` -> `{ document: ContextDocument }`
- `DELETE /api/boards/[id]/context/[docId]` -> `{ success: true }`

- [ ] **Step 1: Implement GET and POST in `/api/boards/[id]/context/route.ts`**

Authenticate user, check board ownership, list context documents ordered by `order asc`, or create a new document with unique `fileName`.

- [ ] **Step 2: Implement PUT and DELETE in `/api/boards/[id]/context/[docId]/route.ts`**

Update `title`, `fileName`, and `content`, or delete the document.

- [ ] **Step 3: Test API with automated script**

Run: `npx tsx scripts/test-context-api.ts`
Expected: All CRUD operations return 200 OK.

- [ ] **Step 4: Commit changes**

```bash
git add src/app/api/boards/[id]/context/
git commit -m "feat(api): implement multi-file context document REST endpoints"
```

---

### Task 3: MCP Server Upgrade for Multi-File Living Context

**Files:**
- Modify: `mcp/src/index.ts`
- Modify: `mcp/dist/index.js` (rebuild)
- Test: `scripts/test-mcp-client.ts`

**Interfaces:**
- `get_board_context({ board_id, file_name? })`
- `update_board_context({ board_id, file_name, content, title? })`
- `list_board_context_files({ board_id })`

- [ ] **Step 1: Update MCP tools in `mcp/src/index.ts`**

Add `list_board_context_files` tool.
Enhance `get_board_context` to filter by `file_name` or return an aggregated catalog bundle.
Enhance `update_board_context` to upsert by `fileName`.

- [ ] **Step 2: Rebuild MCP server**

Run: `cd mcp && npm run build && cd ..`
Expected: `mcp/dist/index.js` recompiled cleanly.

- [ ] **Step 3: Run MCP automated test script**

Run: `npx tsx scripts/test-mcp-client.ts`
Expected: All MCP tools pass with 100% success.

- [ ] **Step 4: Commit changes**

```bash
git add mcp/
git commit -m "feat(mcp): support multi-file context querying and upserting"
```

---

### Task 4: UI File Navigator & Redesigned `ProjectContextView.tsx`

**Files:**
- Modify: `src/components/context/ProjectContextView.tsx`
- Modify: `src/app/(dashboard)/boards/[id]/page.tsx` (ensure board query includes context documents)

**Interfaces:**
- Interactive file navigator sidebar with file icons, search bar, and `+ New file` modal.
- Active file editor with Save and Copy actions.
- Live Markdown preview rendered via `MarkdownViewer`.

- [ ] **Step 1: Rebuild `ProjectContextView.tsx`**

Implement:
- Left sidebar (`w-72 border-r border-neutral-200/80 bg-[#fafafc]`):
  - Search filter input for file names.
  - File list with file icon badges based on extension (`.md`, `.json`, `.sql`, `.ts`, etc.).
  - Active file indicator card (`bg-white shadow-xs border border-neutral-200/90`).
  - Delete file button with confirmation.
  - `+ New file` button opening a clean minimal popover/modal.
- Right editor pane:
  - Header: Breadcrumb of active file name, `✓ Saved` feedback, `Copy Content` button, and primary black `Save` button.
  - Split-view: Code editor textarea on left, rendered Markdown on right.

- [ ] **Step 2: Verify `npm run build`**

Run: `npm run build`
Expected: Exit code 0, 0 TypeScript errors.

- [ ] **Step 3: Commit changes**

```bash
git add src/components/context/ProjectContextView.tsx src/app/(dashboard)/boards/[id]/page.tsx
git commit -m "feat(ui): implement file navigator and multi-file context editor"
```

---

### Task 5: End-to-End Browser Verification

**Files:**
- Automated browser session via `browser_subagent`.

- [ ] **Step 1: Launch browser subagent**

Navigate to board page, click `Project Context` tab.
Verify default files (`guidelines.md`, `tech-stack.md`, `conventions.md`, `messaging-standards.md`).
Click `+ New file`, create `api-spec.json` with sample JSON.
Edit, save, verify live preview and file list.
Capture screenshots as evidence.

- [ ] **Step 2: Final commit and walkthrough update**

Update `walkthrough.md` with screenshots and documentation.
Commit to master branch.
