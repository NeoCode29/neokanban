# NeoKanban Navigation Redesign (Phase 1) — Design Specification

- **Date:** 2026-10-04
- **Status:** Approved
- **Scope:** Navigation Menu, Global Review Queue, Board Dual-Tier View

---

## 1. Overview & Objective

NeoKanban requires a more cohesive, agent-aware navigation structure that addresses existing UX pain points:
1. Redundancy between `Home` and `Boards & Projects` routes.
2. Inflexible board listing in the sidebar (fixed at 4 boards without favorites grouping or quick creation).
3. Lack of a dedicated central hub for **Review Queue** (supporting the Superpowers *Never Auto-Done / Review Gate* rule).
4. Confusion on the board detail page where column filters and the *Living Context* view were conflated into a single pill bar.

---

## 2. Architecture & Components

### A. Sidebar Navigation (`src/components/layout/Sidebar.tsx`)
- **Primary Routes**:
  - **Dashboard (`/`)**: Overview of user boards and quick metrics.
  - **Review Queue (`/reviews`)**: Central list of all tasks across boards currently pending human review and verification, complete with an unread/pending count badge.
  - **AI Tokens (MCP) (`/settings`)**: Personal Access Tokens management and MCP server status.
- **Board Organization**:
  - Header: `BOARDS` with an inline `+` button that opens a global `CreateBoardModal`.
  - **Favorites Sub-section**: Filtered by `board.isFavorite === true`.
  - **Recent Projects Sub-section**: Filtered by `board.isFavorite !== true`, up to 5 most recently updated boards.
  - Quick link: "View All Boards" linking to `/`.
- **Collapsed Mode**:
  - Slim 16-width bar with icons and clear tooltips for every navigation item.
- **User Footer**:
  - Current user avatar, name, email, and logout action.

### B. Global Create Board Modal (`src/components/kanban/CreateBoardModal.tsx`)
- Clean modal component triggered from both the Sidebar and the Dashboard.
- Form inputs:
  - Board Title (Required)
  - Description (Optional)
- Submits `POST /api/boards` and redirects automatically to `/boards/${newBoard.id}` upon success.

### C. Review Queue Hub (`src/app/(dashboard)/reviews/page.tsx` & `/api/reviews`)
- **API Endpoint (`GET /api/reviews`)**:
  - Queries all boards owned by or shared with the authenticated user.
  - Extracts all cards where the column title matches `review` or `in review` (case-insensitive).
  - Returns card items with board title, column info, assignees, checklists, and comments count.
- **Page UI (`/reviews`)**:
  - Header with summary: "X tasks awaiting review".
  - Card grid or structured list displaying:
    - Card Title & Priority badge (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
    - Parent Board badge (clickable link to `/boards/${board.id}`).
    - Assignee avatars (identifying human vs `🤖 AI Agent`).
    - Checklist progress bar (e.g. `100% completed`).
    - Quick-click to open `CardDetailModal` for inspecting the structured verification report and approving/moving to `Done`.

### D. Dual-Tier Board Page Navigation (`src/app/(dashboard)/boards/[id]/page.tsx`)
- **Top Row (Board Header)**:
  - Board title, Star/Favorite toggle, Owner options (Delete board), `Share` button, and `+ New task` action button.
- **Tier 1 (View Switcher)**:
  - Tab pills:
    1. `📋 Kanban Board` (badge with total card count).
    2. `🧠 Living Context` (badge with context documents count).
- **Tier 2 (Board Filters — only displayed when "Kanban Board" is active)**:
  - Quick Search Input: `Filter cards by title or tag...`
  - Column filter pills: `All`, `Backlog`, `To Do`, `In Progress`, `Review`, `Done`.
- **When "Living Context" is active**:
  - Replaces column view with full `ProjectContextView` component without filter clutter.

---

## 3. Data Flow & Security
- All API routes enforce authentication via existing JWT cookie session (`jose` / `jwtVerify`).
- Data access is restricted to boards where the user is either the `owner` or an assigned `BoardMember`.
- Token PATs are never exposed in UI responses.

---

## 4. Verification & Testing Criteria
1. **Sidebar Navigation**:
   - `Home`, `Review Queue`, and `AI Tokens` navigate cleanly without redundant routes.
   - Creating a new board via sidebar modal redirects to `/boards/[id]` and updates the sidebar list.
   - Favorited boards appear under ⭐ Favorites.
2. **Review Queue**:
   - Moving any card to `Review` on any board immediately displays it in `/reviews`.
   - Clicking a card opens `CardDetailModal`.
3. **Board Dual-Tier Tabs**:
   - Switching between `Kanban Board` and `Living Context` works seamlessly.
   - Column filters only affect cards in Kanban view.
