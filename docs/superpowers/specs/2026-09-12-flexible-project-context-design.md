# Design Spec: Flexible Multi-File Project Context Hub for NeoKanban

**Date:** 2026-09-12  
**Status:** Approved by User  
**Target:** Flexible, scalable file storage for project context and AI MCP integration.

---

## 1. Background & Problem Statement
Currently, `ProjectContext` in NeoKanban is constrained to a 1-to-1 database record containing four hardcoded fields:
- `guidelinesMarkdown`
- `techStackMarkdown`
- `conventionsMarkdown`
- `messagingStandards`

While useful for initial bootstrapping, development teams and AI agents need to store arbitrary context documents per board, such as:
- `architecture.md`
- `api-spec.json`
- `database-schema.sql`
- `design-system.md`
- `deployment-runbook.md`
- `testing-guidelines.md`

This specification defines the migration to a flexible **Context Document Hub**, providing a file navigator sidebar, multi-file CRUD operations, split-pane editing, and full Model Context Protocol (MCP) support for AI agents.

---

## 2. Architecture & Data Model

### 2.1 Prisma Schema Migration
Replace the static `ProjectContext` model with a 1-to-many `ContextDocument` model:

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
  title     String   // e.g. "Core Guidelines", "API Endpoints"
  fileName  String   // e.g. "guidelines.md", "api-spec.json", "schema.sql"
  content   String   @default("")
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([boardId, fileName])
  @@index([boardId])
}
```

### 2.2 Backward Compatibility & Seeding
When migrating or creating a new board, the system auto-initializes standard default files if none exist:
1. `guidelines.md` (Title: "Core Guidelines & Architecture")
2. `tech-stack.md` (Title: "Tech Stack Specifications")
3. `conventions.md` (Title: "Team & Git Conventions")
4. `messaging-standards.md` (Title: "Communication & Messaging Standards")

---

## 3. API Endpoints Specification

### 3.1 REST Routes
- **`GET /api/boards/[id]/context`**
  - Returns: `{ documents: ContextDocument[] }`
- **`POST /api/boards/[id]/context`**
  - Body: `{ title: string, fileName: string, content?: string }`
  - Validates: Unique `fileName` per board.
  - Returns: `{ document: ContextDocument }`
- **`PUT /api/boards/[id]/context/[docId]`**
  - Body: `{ title?: string, fileName?: string, content?: string }`
  - Returns: `{ document: ContextDocument }`
- **`DELETE /api/boards/[id]/context/[docId]`**
  - Deletes the specified context document.
  - Returns: `{ success: true }`

---

## 4. MCP (Model Context Protocol) Server Evolution

The stdio MCP server (`neokanban/mcp/dist/index.js`) will be updated to handle multi-file context:
- **`get_board_context` tool**:
  - Parameters:
    - `board_id` (string, required)
    - `file_name` (string, optional)
  - Behavior:
    - If `file_name` is provided, returns the specific document content.
    - If `file_name` is omitted, returns a complete catalog of available context files with their summaries and full markdown bundle for the AI prompt.
- **`update_board_context` tool**:
  - Parameters:
    - `board_id` (string, required)
    - `file_name` (string, required)
    - `content` (string, required)
    - `title` (string, optional)
  - Behavior:
    - Upserts: creates the document if it doesn't exist, or updates its content if found.
- **`list_board_context_files` tool**:
  - Parameters: `board_id` (string, required)
  - Returns: Array of `{ id, title, fileName, updatedAt }`.

---

## 5. UI/UX: File Navigator & Split-Pane Editor

### 5.1 Layout in "Project Context" Tab
- **Left Panel (File Navigator - `w-64 border-r border-neutral-200 bg-[#fafafc]`)**:
  - Header with `Project Files`, file counter badge, and `+ New file` button.
  - Search/filter input for finding files.
  - File list items:
    - File extension icon (`.md`, `.json`, `.sql`, `.ts`, code icon).
    - File name (`guidelines.md`) and human-readable title (`Core Guidelines`).
    - Active state: White card with subtle shadow and border (`bg-white border-neutral-200/90 shadow-xs`).
    - Hover actions: Rename and Delete file buttons.
- **Right Panel (Editor & Preview)**:
  - Header:
    - File name breadcrumb + title editor.
    - Status indicator (`✓ Saved` / `Saving...`).
    - `Copy File / Prompt` button.
    - `Write / Preview` toggle (or side-by-side split view on wide screens).
    - `Save` button (black pill button).
  - Main Area:
    - Monospaced code/markdown editor with clean light styling.
    - Live Markdown preview rendered via `MarkdownViewer`.

---

## 6. Verification & Test Plan
1. **Prisma Push & DB Sync**:
   - Run `npx prisma db push` with Docker PostgreSQL (port 5435).
2. **API Endpoint Verification**:
   - Test creating, listing, updating, and deleting context files.
3. **MCP Stdio Protocol Verification**:
   - Recompile MCP server (`npm run build`).
   - Run automated test client to verify `get_board_context`, `update_board_context`, and multi-file listing.
4. **Browser UI Verification**:
   - Open browser subagent, create a custom file (e.g. `architecture.md` and `api.json`), edit, save, verify live preview and deletion.
