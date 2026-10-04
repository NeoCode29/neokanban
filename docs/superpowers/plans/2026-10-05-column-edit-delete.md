# NeoKanban Custom Column Edit & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to edit column titles and colors, as well as safely delete columns with card migration.

**Architecture:** Next.js 15 App Router route handlers with Prisma ORM transactions, React 19 Client components with modal dialogs, Tailwind CSS.

**Tech Stack:** Next.js 15, Prisma ORM 6.4, Tailwind CSS, Lucide React, TypeScript.

## Global Constraints
- Preserve board data integrity: never delete the only remaining column on a board.
- Authenticate all endpoints with `getCurrentUser()` and verify access with `hasBoardAccess()`.
- Use TDD-style testing and verification before every commit.

---

### Task 1: Backend API for Column Update and Delete

**Agent:** `nextjs-developer`

**Files:**
- Create: `src/app/api/boards/[id]/columns/[columnId]/route.ts`
- Create: `scripts/test-column-api.ts`

**Interfaces:**
- Consumes: `@/lib/auth`, `@/lib/prisma`, `@/lib/board-auth`
- Produces: `PATCH` and `DELETE` on `/api/boards/[id]/columns/[columnId]`

- [ ] **Step 1: Write integration test script `scripts/test-column-api.ts`**

Create `scripts/test-column-api.ts`:
```typescript
import { prisma } from '../src/lib/prisma'

async function run() {
  console.log('--- Testing Column API Backend Logic ---')
  const board = await prisma.board.findFirst({
    include: { columns: { orderBy: { order: 'asc' } } }
  })
  if (!board) throw new Error('No board found for testing')

  console.log(`Using board: "${board.title}" (${board.id}) with ${board.columns.length} columns`)

  // 1. Create temporary column
  const tempCol = await prisma.column.create({
    data: {
      boardId: board.id,
      title: 'Temporary Test Column',
      colorCode: '#ec4899',
      order: 99
    }
  })
  console.log(`Created temp column: ${tempCol.id}`)

  // 2. Update column
  const updatedCol = await prisma.column.update({
    where: { id: tempCol.id },
    data: { title: 'Updated Test Column', colorCode: '#3b82f6' }
  })
  if (updatedCol.title !== 'Updated Test Column' || updatedCol.colorCode !== '#3b82f6') {
    throw new Error('Update failed')
  }
  console.log('Update verified successfully.')

  // 3. Delete column
  await prisma.column.delete({ where: { id: tempCol.id } })
  const deletedCheck = await prisma.column.findUnique({ where: { id: tempCol.id } })
  if (deletedCheck) throw new Error('Delete failed')
  console.log('Delete verified successfully.')

  console.log('✅ All Column API database operations passed!')
}

run().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Run test script to verify database operations**

Run: `npx tsx scripts/test-column-api.ts`
Expected: Passes with ✅.

- [ ] **Step 3: Implement route handler `src/app/api/boards/[id]/columns/[columnId]/route.ts`**

Create `src/app/api/boards/[id]/columns/[columnId]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, columnId } = await params

  try {
    const access = await hasBoardAccess(id, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    const { title, colorCode } = await req.json()
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Column title is required' }, { status: 400 })
    }

    const column = await prisma.column.findFirst({
      where: { id: columnId, boardId: id },
    })
    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: {
        title: title.trim(),
        colorCode: colorCode || column.colorCode,
      },
      include: {
        cards: {
          include: {
            checklists: true,
            _count: { select: { comments: true } },
          },
        },
      },
    })

    return NextResponse.json({ column: updatedColumn })
  } catch (error: any) {
    console.error('Error updating column:', error)
    return NextResponse.json({ error: 'Failed to update column' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, columnId } = await params
  const url = new URL(req.url)
  const transferToColumnId = url.searchParams.get('transferToColumnId')

  try {
    const access = await hasBoardAccess(id, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    // Ensure the board has more than 1 column
    const columnCount = await prisma.column.count({ where: { boardId: id } })
    if (columnCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only column remaining on the board' },
        { status: 400 }
      )
    }

    const column = await prisma.column.findFirst({
      where: { id: columnId, boardId: id },
      include: { cards: true },
    })
    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    let transferredCards = 0

    // Transfer cards if target column specified
    if (transferToColumnId) {
      const targetColumn = await prisma.column.findFirst({
        where: { id: transferToColumnId, boardId: id },
      })
      if (!targetColumn) {
        return NextResponse.json({ error: 'Target transfer column not found' }, { status: 400 })
      }

      const updateResult = await prisma.card.updateMany({
        where: { columnId },
        data: { columnId: transferToColumnId },
      })
      transferredCards = updateResult.count
    }

    // Delete column
    await prisma.column.delete({ where: { id: columnId } })

    return NextResponse.json({ success: true, transferredCards })
  } catch (error: any) {
    console.error('Error deleting column:', error)
    return NextResponse.json({ error: 'Failed to delete column' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/boards/[id]/columns/[columnId]/route.ts scripts/test-column-api.ts
git commit -m "feat(api): add PATCH and DELETE handlers for board columns"
```

---

### Task 2: Build `ColumnSettingsModal.tsx` Component

**Agent:** `ux-ui-pro-max`

**Files:**
- Create: `src/components/kanban/ColumnSettingsModal.tsx`

**Interfaces:**
- Consumes: `ColumnData`
- Produces: `<ColumnSettingsModal isOpen={boolean} column={ColumnData} otherColumns={ColumnData[]} onClose={() => void} onUpdated={(col) => void} onDeleted={(colId, transferId) => void} />`

- [ ] **Step 1: Implement `src/components/kanban/ColumnSettingsModal.tsx`**

Create `src/components/kanban/ColumnSettingsModal.tsx`:
- Tabs: "Edit Details" and "Delete Column".
- Color picker presets: `#64748b` (Slate), `#f59e0b` (Amber), `#3b82f6` (Blue), `#8b5cf6` (Purple), `#10b981` (Emerald), `#ef4444` (Rose).
- Safe deletion section with transfer dropdown if cards count > 0.
- Confirmation buttons and loading spinners.

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/kanban/ColumnSettingsModal.tsx
git commit -m "feat(ui): add ColumnSettingsModal component for edit and safe delete"
```

---

### Task 3: Integrate Column Menu in `KanbanColumn.tsx` and `KanbanBoard.tsx`

**Agent:** `ux-ui-pro-max`

**Files:**
- Modify: `src/components/kanban/KanbanColumn.tsx`
- Modify: `src/components/kanban/KanbanBoard.tsx`

**Interfaces:**
- Consumes: `ColumnSettingsModal`
- Produces: `•••` action button on column header, state synchronization for column updates and deletions.

- [ ] **Step 1: Update `KanbanColumn.tsx`**
- Add `MoreHorizontal` button in header.
- Render `ColumnSettingsModal` when clicked.
- Pass `otherColumns` and callbacks.

- [ ] **Step 2: Update `KanbanBoard.tsx`**
- Implement `onColumnUpdated` and `onColumnDeleted` handlers.
- Handle state updates when cards are transferred between columns.

- [ ] **Step 3: Run full typecheck and build**

Run: `npx tsc --noEmit` and `npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/kanban/KanbanColumn.tsx src/components/kanban/KanbanBoard.tsx
git commit -m "feat(ui): connect ColumnSettingsModal to KanbanColumn and KanbanBoard"
```
