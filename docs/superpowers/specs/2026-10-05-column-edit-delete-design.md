# NeoKanban Custom Column Edit & Safe Delete — Design Specification

- **Date:** 2026-10-05
- **Status:** Approved
- **Scope:** Column Editing, Color Customization, Safe Deletion with Card Migration

---

## 1. Overview & Objective

Users need the ability to customize Kanban board columns beyond creation:
1. **Edit Column**: Rename column title and customize color codes/badges.
2. **Delete Column**: Safely remove unwanted columns without accidental card data loss by providing an optional card transfer mechanism.
3. **Guardrails**: Ensure boards always have at least one column, and protect users when deleting columns containing cards.

---

## 2. API Endpoints

### A. Update Column (`PATCH /api/boards/[id]/columns/[columnId]`)
- **Request Body**:
  ```json
  {
    "title": "In Code Review",
    "colorCode": "#8b5cf6"
  }
  ```
- **Validation**:
  - `title` must be non-empty string.
  - User must have edit access to the board (`hasBoardAccess`).
- **Response**: Updated `Column` object with cards count.

### B. Delete Column (`DELETE /api/boards/[id]/columns/[columnId]`)
- **Query Parameter**:
  - `transferToColumnId` (optional `string`): ID of another column within the same board to receive existing cards.
- **Behavior**:
  - Prevent deletion if it is the only column remaining on the board.
  - If `transferToColumnId` is provided:
    - Verifies the target column belongs to the same board.
    - Executes `prisma.card.updateMany` setting `columnId = transferToColumnId`.
  - Deletes the column via `prisma.column.delete`.
- **Response**: `{ success: true, transferredCards: number }`.

---

## 3. UI Components & Interactions

### A. Column Header Menu (`src/components/kanban/KanbanColumn.tsx`)
- Add a `•••` (`MoreHorizontal`) button in the column header next to the `+` button.
- Clicking opens a popover or triggers the unified `ColumnSettingsModal`.

### B. Unified Column Settings Modal (`src/components/kanban/ColumnSettingsModal.tsx`)
- **Edit Mode**:
  - Input field for Column Title (auto-focused, required).
  - Color Swatches:
    - 🔘 `#64748b` (Slate / Backlog)
    - 🟡 `#f59e0b` (Amber / To Do)
    - 🔵 `#3b82f6` (Blue / In Progress)
    - 🟣 `#8b5cf6` (Purple / Review)
    - 🟢 `#10b981` (Emerald / Done)
    - 🔴 `#ef4444` (Rose / Urgent)
  - Live status dot preview.
  - Save button.
- **Delete Mode**:
  - If column has 0 cards: Simple one-click deletion confirmation.
  - If column has >0 cards:
    - Warning banner: "This column currently contains X cards."
    - Option 1 (Recommended): "Move all cards to another column" with dropdown selection of other columns on the board.
    - Option 2: "Delete column and permanently delete all X cards."
  - Delete button disabled if trying to delete the last remaining column on the board.

### C. Kanban Board State Updates (`src/components/kanban/KanbanBoard.tsx`)
- `handleColumnUpdated(updatedCol: ColumnData)`: Updates column title and color in state.
- `handleColumnDeleted(columnId: string, transferToColumnId?: string)`:
  - If cards transferred: Re-assigns cards to target column in local state.
  - Removes the deleted column from `columns` state.
