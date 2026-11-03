# 🚀 NeoKanban

> **Modern Kanban Platform with Living AI Context & Model Context Protocol (MCP) Server**  
> Inspired by reverse-engineering [kanbn/kan](https://github.com/kanbn/kan).

NeoKanban is an open-source, modern Kanban task management platform built with **Next.js 15**, **Prisma ORM (PostgreSQL)**, **Tailwind CSS**, and **@dnd-kit**, featuring a **Living Project Context Hub** and a native **MCP (Model Context Protocol) Server** for seamless AI agent integration (Claude Desktop, Cursor, Antigravity).

---

## 🌟 Key Features

### 1. 📋 Modern Drag-and-Drop Kanban Board
- **Smooth Drag-and-Drop:** Built with industry-standard `@dnd-kit` for responsive, accessible, lag-free card reordering and column transfers.
- **Customizable Columns:** Default software engineering workflow (*Backlog*, *To Do*, *In Progress*, *In Review*, *Done*) + ability to add custom columns.
- **Rich Task Details:** Edit markdown descriptions with live preview, set priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and tag tasks.
- **Interactive Checklists:** Acceptance criteria & subtasks with real-time percentage progress bar.
- **Structured Activity Log:** Clean comment stream distinguishing human team members from AI assistants (with special `🤖 AI Agent` badges).

### 2. 🧠 Living Project Context & Knowledge Base
- **Shared Team Memory:** Each board contains a dedicated **Project Context** tab with 4 critical sections:
  1. **Core Guidelines:** Architecture patterns, coding standards, and repository rules.
  2. **Tech Stack:** Exact framework versions, database specs, and libraries.
  3. **Conventions:** Branching strategy, commit format, and Definition of Done.
  4. **Communication & Messaging Standards:** Pre-defined templates for task objectives and status updates.
- **Single Source of Truth:** Eliminates context drift so that team members and AI assistants never write misaligned code.
- **Copy as System Prompt:** Instantly export the full context into prompt preambles for external LLMs.

### 3. 🎨 UI/UX Studio & Living Component Catalog
- **Interactive Prototyping:** Sandboxed iframe renderer with device emulation (Desktop, Tablet, Mobile) and Zen Mode.
- **Visual Review Overlay:** Click-to-pin marker and drag-to-highlight bounding box with 1-click conversion to Kanban task cards (`#ui-feedback`).
- **Living Context Bridge:** Direct 1-click import banner for `.html` prototype documents detected in the Living Context hub.
- **Dynamic Category Filter:** Real-time extraction of design component categories with suggestion datalists.

### 4. 🤖 Model Context Protocol (MCP) Server
- **Native Stdio Protocol:** Runs locally via `@modelcontextprotocol/sdk` (`npm run mcp`), compatible with:
  - **Claude Desktop**
  - **Cursor AI**
  - **Antigravity / VS Code**
- **Personal Access Tokens (PAT):** Secure cryptographic API keys generated in user settings (`/settings`).
- **32 Specialized AI Tools:**
  - **Kanban & Task Management:** `list_boards`, `list_board_members`, `get_board_cards`, `get_card_details`, `create_card`, `update_card`, `assign_card_member`, `unassign_card_member`, `add_card_comment`, `manage_checklist`, `create_column`, `update_column`, `delete_column`, `get_review_queue`, `update_member_role`.
  - **Living Context & AI Skills:** `list_board_context_files`, `get_board_context`, `update_board_context`, `list_skills`, `get_board_skills`, `read_skill_file`, `install_skill_to_local`.
  - **Harness & Orchestration:** `setup_project_harness`, `upgrade_harness`.
  - **UI/UX Studio Suite:** `list_ui_components`, `create_ui_component`, `update_ui_component`, `delete_ui_component`, `list_ui_pages`, `create_ui_page`, `update_ui_page`, `delete_ui_page`.

---

## 🛠 Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React 19, TypeScript)
- **Database & ORM:** PostgreSQL 16 (Docker) with Prisma ORM 6.4
- **Styling:** Tailwind CSS v4, Lucide React Icons
- **Drag & Drop:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **Authentication:** Credentials Auth (Bcrypt + JOSE JWT Session Cookie) + PAT for AI
- **AI Protocol:** `@modelcontextprotocol/sdk` (StdioServerTransport)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v20+ (tested on v24)
- Docker Desktop or local PostgreSQL

### 2. Start PostgreSQL Container
```bash
docker compose up -d
```
*Runs PostgreSQL on port `5435` with user `postgres` and password `postgres`.*

### 3. Setup Database Schema & Seed Sample Board
```bash
npm install
npx prisma db push
npx tsx prisma/seed.ts
```

*Default Demo Credentials:*
- **Email:** `kresna@example.com`
- **Password:** `password123`

### 4. Run Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 Connecting AI (Claude Desktop & Cursor)

### Step 1: Generate a Personal Access Token (PAT)
1. Go to **Settings > AI Tokens** (`http://localhost:3000/settings`).
2. Enter a name (e.g. `Claude Desktop`) and click **Generate Token**.
3. Copy your generated token (starts with `neokan_pat_...`).

### Step 2: Build the MCP Server
```bash
npm run mcp:build
```

### Step 3: Add to Your AI Client Configuration

#### For Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "neokanban": {
      "command": "node",
      "args": ["c:/Users/kresna/Documents/Workspace/neokanban/mcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5435/neokanban?schema=public",
        "NEOKANBAN_PAT": "YOUR_COPIED_PAT_TOKEN"
      }
    }
  }
}
```

#### For Cursor (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "neokanban": {
      "command": "node",
      "args": ["c:/Users/kresna/Documents/Workspace/neokanban/mcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5435/neokanban?schema=public",
        "NEOKANBAN_PAT": "YOUR_COPIED_PAT_TOKEN"
      }
    }
  }
}
```

---

## 🧪 Testing MCP Integration

You can run the built-in automated integration test to verify that the MCP server interacts properly with your database:
```bash
npx tsx scripts/test-mcp-client.ts
```

---

## 📄 License
MIT License. Built for seamless human & AI team collaboration.
