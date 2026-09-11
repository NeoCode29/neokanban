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

### 3. 🤖 Model Context Protocol (MCP) Server
- **Native Stdio Protocol:** Runs locally via `@modelcontextprotocol/sdk` (`npm run mcp`), compatible with:
  - **Claude Desktop**
  - **Cursor AI**
  - **Antigravity / VS Code**
- **Personal Access Tokens (PAT):** Secure cryptographic API keys generated in user settings (`/settings`).
- **9 Specialized AI Tools:**
  - `list_boards`: List all accessible boards and task statistics.
  - `get_board_context`: Read living project guidelines and standards.
  - `update_board_context`: Enhance or update project documentation.
  - `get_board_cards`: Query columns and task summaries (with column filters).
  - `get_card_details`: Full task specifications, checklists, and activity log.
  - `create_card`: Break down user requests into standardized Kanban cards.
  - `update_card`: Move tasks across columns or modify details.
  - `add_card_comment`: Post execution updates automatically tagged with `isAiGenerated: true`.
  - `manage_checklist`: Add, toggle, or delete acceptance criteria items.

---

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components & Route Handlers)
- **Database & ORM:** PostgreSQL 16 (Docker) with Prisma ORM 6.4
- **Styling:** Tailwind CSS, Lucide React Icons
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
