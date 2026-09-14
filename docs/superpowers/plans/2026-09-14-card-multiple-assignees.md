# Multiple Card Assignees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to assign multiple team members (mentions) to a kanban card with visual avatar stacks on the card and an interactive member toggle selector in the card detail modal.

**Architecture:** A normalized Prisma pivot model `CardAssignee` (`cardId`, `userId`) with cascading deletes. REST API endpoints handle assignment creation and removal with board membership validation. The Next.js frontend renders an overlapping avatar stack on Kanban cards and a searchable member selector popover in the card detail modal with instant parent state synchronization.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 6, PostgreSQL, Tailwind CSS, Lucide React, TypeScript.

## Global Constraints
- Only verified board members (Board Owner or registered Collaborators) can be assigned to a card.
- All actions must maintain strict type safety (`npx tsc --noEmit`).
- No placeholder code, mock shortcuts, or regressions to existing Kanban drag-and-drop or context features.
- Preserve Counsel Minimalist aesthetic tokens.

---

### Task 1: Database Schema & Migration
**Agent:** `postgres-pro`

**Files:**
- Modify: `prisma/schema.prisma`
- Verify: `npx prisma db push && npx prisma generate`

**Interfaces:**
- Produces: `model CardAssignee` with `card: Card` and `user: User` relations, and `assignees CardAssignee[]` on `Card`.

- [ ] **Step 1: Update Prisma schema**
Add `CardAssignee` model and relation fields to `prisma/schema.prisma`:
```prisma
model CardAssignee {
  id        String   @id @default(cuid())
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([cardId, userId])
  @@index([cardId])
  @@index([userId])
}
```
Add `assignees CardAssignee[]` to `model Card`.
Add `assignedCards CardAssignee[]` to `model User`.

- [ ] **Step 2: Apply schema to PostgreSQL and regenerate Prisma Client**
```bash
npx prisma db push
npx prisma generate
```
Expected: "The database is already in sync" or table `CardAssignee` created, and Prisma Client generated.

- [ ] **Step 3: Commit schema changes**
```bash
git add prisma/schema.prisma
git commit -m "feat(db): add CardAssignee model for multiple card mentions"
```

---

### Task 2: Backend REST API Endpoints & Automated Tests
**Agent:** `nextjs-developer`

**Files:**
- Modify: `src/app/api/boards/[id]/route.ts` (include `assignees` in cards query)
- Modify: `src/app/api/cards/[id]/route.ts` (include `assignees` in card detail query)
- Create: `src/app/api/cards/[id]/assignees/route.ts` (POST assign user)
- Create: `src/app/api/cards/[id]/assignees/[userId]/route.ts` (DELETE unassign user)
- Create: `scripts/test-card-assignees.ts` (Automated verification test)

**Interfaces:**
- Consumes: Prisma model `CardAssignee`, auth helper `getCurrentUser`, `hasBoardAccess`.
- Produces:
  - `POST /api/cards/[id]/assignees` -> `{ assignee: CardAssignee, card: CardData }`
  - `DELETE /api/cards/[id]/assignees/[userId]` -> `{ message: string, card: CardData }`

- [ ] **Step 1: Update `src/app/api/boards/[id]/route.ts` and `src/app/api/cards/[id]/route.ts`**
Include `assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } }` in card queries.

- [ ] **Step 2: Create `src/app/api/cards/[id]/assignees/route.ts`**
Implement `POST` handler:
- Authenticate current user (`getCurrentUser`).
- Find card and check board access (`hasBoardAccess`).
- Validate target `userId` belongs to board (is board owner OR is in `board.members`).
- Upsert or create `CardAssignee`.
- Return updated card with all relations.

- [ ] **Step 3: Create `src/app/api/cards/[id]/assignees/[userId]/route.ts`**
Implement `DELETE` handler:
- Authenticate current user.
- Find card and check board access.
- Delete `CardAssignee` record where `cardId_userId` matches.
- Return updated card.

- [ ] **Step 4: Create and run automated test `scripts/test-card-assignees.ts`**
Run: `npx tsx scripts/test-card-assignees.ts`
Expected: 100% test pass for assigning multiple users, verifying membership validation, unassigning, and cascade deletion.

- [ ] **Step 5: Commit API endpoints and test**
```bash
git add src/app/api/boards/[id]/route.ts src/app/api/cards/[id]/route.ts src/app/api/cards/[id]/assignees scripts/test-card-assignees.ts
git commit -m "feat(api): implement card assignee endpoints and verification tests"
```

---

### Task 3: UI - Avatar Stack on Kanban Card
**Agent:** `nextjs-developer`

**Files:**
- Modify: `src/components/kanban/KanbanCard.tsx`

**Interfaces:**
- Consumes: `assignees` array in `CardData`.
- Produces: Visual avatar stack in the bottom right of `KanbanCard`.

- [ ] **Step 1: Update `CardData` interface in `KanbanCard.tsx`**
```ts
export interface CardAssigneeData {
  id: string
  userId: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string | null
  }
}

export interface CardData {
  // ... existing fields ...
  assignees?: CardAssigneeData[]
}
```

- [ ] **Step 2: Replace static dummy icon with Avatar Stack in `KanbanCard.tsx`**
- Show up to 3 avatars overlapping with -ml-1.5, z-index, colored initials, and title tooltip with user name.
- If more than 3, show first 2 and `+N` indicator.
- If 0 assignees, show neutral unassigned icon.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit KanbanCard update**
```bash
git add src/components/kanban/KanbanCard.tsx
git commit -m "feat(ui): add avatar stack for multiple assignees on kanban card"
```

---

### Task 4: UI - Assignees Section & Member Popover in Modal
**Agent:** `nextjs-developer`

**Files:**
- Modify: `src/components/kanban/CardDetailModal.tsx`

**Interfaces:**
- Consumes: Card detail API, board members list, `POST /api/cards/[id]/assignees`, `DELETE /api/cards/[id]/assignees/[userId]`.
- Produces: Interactive assignees selector in the metadata sidebar with chips and member toggle popover.

- [ ] **Step 1: Fetch board members in `CardDetailModal.tsx`**
When modal opens, fetch `/api/boards/${card.column.boardId}/members` to populate available members (Owner + Collaborators).

- [ ] **Step 2: Build Assignees UI in metadata sidebar**
- Render chips of currently assigned members with initials, name, and remove button (`×`).
- Render `+ Assign member` button that opens a clean popover menu.
- Popover displays list of all board members with checkmarks for assigned ones.
- Clicking a member toggles assignment immediately (adds if absent, deletes if present), updates local modal state, and calls `onCardUpdated(updatedCard)`.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit CardDetailModal update**
```bash
git add src/components/kanban/CardDetailModal.tsx
git commit -m "feat(ui): add interactive member assignee selector in card detail modal"
```

---

### Task 5: End-to-End Verification & Documentation
**Agent:** `nextjs-developer`

**Files:**
- Modify: `task_tracking.md`
- Modify: `walkthrough.md`

- [ ] **Step 1: Run comprehensive test suite**
Run:
```bash
npx tsx scripts/test-card-assignees.ts
npx tsc --noEmit
```
Expected: All tests pass, 0 TypeScript errors.

- [ ] **Step 2: Update documentation artifacts and commit**
Update `task_tracking.md` and `walkthrough.md` with complete implementation details.
