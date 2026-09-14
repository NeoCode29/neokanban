# Share Project & Multi-User Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow NeoKanban board owners to invite other registered users by email to collaborate on their project boards with full task/context editing privileges.

**Architecture:** Add an explicit `BoardMember` relational table in PostgreSQL via Prisma, introduce a centralized `hasBoardAccess` authorization helper, expose REST endpoints for member management (`/api/boards/[id]/members`), and provide an elegant `ShareBoardModal` dialog accessible from the board header.

**Tech Stack:** Next.js 16 (App Router), Prisma ORM 6, PostgreSQL 16, Tailwind CSS, Lucide React icons, TypeScript.

## Global Constraints
- Target database: PostgreSQL running on container `neokanban-postgres` (port 5435).
- Access rule: Collaborators have full read/write access to cards and context documents, but only the Owner can delete the board or manage member invitations.
- Aesthetics: Counsel Minimalist palette (`#fafafc`, `border-neutral-200`, subtle badges).
- No mock/placeholder data: Every change must be verified against active database and running Next.js endpoints.

---

### Task 1: Database Schema & Prisma Model Migration

**Agent:** postgres-pro

**Files:**
- Modify: `prisma/schema.prisma:17-55`

**Interfaces:**
- Produces: `BoardMember` model with relations to `User` and `Board`, supporting unique `(boardId, userId)`.

- [ ] **Step 1: Update Prisma schema with BoardMember model**

Modify `prisma/schema.prisma`:
```prisma
model User {
  id           String                @id @default(cuid())
  email        String                @unique
  name         String
  passwordHash String
  avatarUrl    String?
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt
  boards       Board[]               @relation("BoardOwner")
  memberBoards BoardMember[]
  tokens       PersonalAccessToken[]
  comments     Comment[]
}

model Board {
  id               String            @id @default(cuid())
  title            String
  description      String?
  isFavorite       Boolean           @default(false)
  ownerId          String
  owner            User              @relation("BoardOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members          BoardMember[]
  columns          Column[]
  projectContext   ProjectContext?
  contextDocuments ContextDocument[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}

model BoardMember {
  id        String   @id @default(cuid())
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      String   @default("COLLABORATOR")
  createdAt DateTime @default(now())

  @@unique([boardId, userId])
  @@index([boardId])
  @@index([userId])
}
```

- [ ] **Step 2: Push database schema changes**

Run: `npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 3: Generate updated Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client"

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add BoardMember relation model to Prisma schema"
```

---

### Task 2: Centralized Board Authorization Helper

**Agent:** nextjs-developer

**Files:**
- Create: `src/lib/board-auth.ts`

**Interfaces:**
- Produces: `hasBoardAccess(boardId: string, userId: string): Promise<{ hasAccess: boolean; isOwner: boolean; role: 'OWNER' | 'COLLABORATOR' | null; board: any | null }>`

- [ ] **Step 1: Implement `src/lib/board-auth.ts`**

```ts
import { prisma } from '@/lib/prisma'

export interface BoardAccessResult {
  hasAccess: boolean
  isOwner: boolean
  role: 'OWNER' | 'COLLABORATOR' | null
  board: any | null
}

export async function hasBoardAccess(boardId: string, userId: string): Promise<BoardAccessResult> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: {
        select: { userId: true, role: true },
      },
    },
  })

  if (!board) {
    return { hasAccess: false, isOwner: false, role: null, board: null }
  }

  if (board.ownerId === userId) {
    return { hasAccess: true, isOwner: true, role: 'OWNER', board }
  }

  const membership = board.members.find((m) => m.userId === userId)
  if (membership) {
    return { hasAccess: true, isOwner: false, role: 'COLLABORATOR', board }
  }

  return { hasAccess: false, isOwner: false, role: null, board: null }
}
```

- [ ] **Step 2: Verify helper with TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/board-auth.ts
git commit -m "feat(auth): add centralized hasBoardAccess authorization helper"
```

---

### Task 3: Board Member API Endpoints

**Agent:** nextjs-developer

**Files:**
- Create: `src/app/api/boards/[id]/members/route.ts`
- Create: `src/app/api/boards/[id]/members/[memberId]/route.ts`

**Interfaces:**
- Consumes: `getCurrentUser` from `@/lib/auth`, `hasBoardAccess` from `@/lib/board-auth`
- Produces:
  - `GET /api/boards/[id]/members`: List members + owner info
  - `POST /api/boards/[id]/members`: Invite user by email
  - `DELETE /api/boards/[id]/members/[memberId]`: Remove member or leave

- [ ] **Step 1: Create `src/app/api/boards/[id]/members/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: boardId } = await params
  const access = await hasBoardAccess(boardId, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  return NextResponse.json({
    owner: board.owner,
    members: board.members,
    isOwner: access.isOwner,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: boardId } = await params
  const access = await hasBoardAccess(boardId, user.id)
  if (!access.hasAccess || !access.isOwner) {
    return NextResponse.json({ error: 'Only the board owner can invite members' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const targetUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })

  if (!targetUser) {
    return NextResponse.json({ error: `User with email "${normalizedEmail}" not found` }, { status: 404 })
  }

  if (targetUser.id === access.board.ownerId) {
    return NextResponse.json({ error: 'User is already the owner of this board' }, { status: 400 })
  }

  const existingMember = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: {
        boardId,
        userId: targetUser.id,
      },
    },
  })

  if (existingMember) {
    return NextResponse.json({ error: 'User is already a collaborator on this board' }, { status: 400 })
  }

  const member = await prisma.boardMember.create({
    data: {
      boardId,
      userId: targetUser.id,
      role: 'COLLABORATOR',
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  })

  return NextResponse.json({ member }, { status: 201 })
}
```

- [ ] **Step 2: Create `src/app/api/boards/[id]/members/[memberId]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: boardId, memberId } = await params
  const access = await hasBoardAccess(boardId, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
  }

  const memberRecord = await prisma.boardMember.findUnique({
    where: { id: memberId },
  })

  if (!memberRecord || memberRecord.boardId !== boardId) {
    return NextResponse.json({ error: 'Member not found on this board' }, { status: 404 })
  }

  // Allowed if caller is the Owner OR the member is removing themselves
  const isSelf = memberRecord.userId === user.id
  if (!access.isOwner && !isSelf) {
    return NextResponse.json({ error: 'You do not have permission to remove this member' }, { status: 403 })
  }

  await prisma.boardMember.delete({
    where: { id: memberId },
  })

  return NextResponse.json({ message: 'Member removed successfully' })
}
```

- [ ] **Step 3: Verify with TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/boards/[id]/members
git commit -m "feat(api): implement board member listing, invitation, and removal endpoints"
```

---

### Task 4: Update Existing Board & Resource Endpoints for Shared Access

**Agent:** nextjs-developer

**Files:**
- Modify: `src/app/api/boards/route.ts`
- Modify: `src/app/api/boards/[id]/route.ts`
- Modify: `src/app/api/cards/[id]/route.ts`

**Interfaces:**
- Consumes: `hasBoardAccess` from `@/lib/board-auth`
- Produces: Collaborative board queries for dashboard, board details, and card CRUD.

- [ ] **Step 1: Update `src/app/api/boards/route.ts`**

Update `GET` to query boards where user is owner OR member, and include `isOwner` and `memberCount`:
```ts
  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { select: { id: true } },
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
  })

  const formattedBoards = boards.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    isFavorite: b.isFavorite,
    isOwner: b.ownerId === user.id,
    ownerName: b.owner.name,
    memberCount: b.members.length,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    columnCount: b.columns.length,
    cardCount: b.columns.reduce((sum, col) => sum + col._count.cards, 0),
    columns: b.columns,
  }))
```

- [ ] **Step 2: Update `src/app/api/boards/[id]/route.ts`**

Update `GET` to check access via `hasBoardAccess` and return `isOwner`:
```ts
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }
```
And ensure `DELETE` strictly requires `access.isOwner`:
```ts
  if (!access.isOwner) {
    return NextResponse.json({ error: 'Only the board owner can delete this board' }, { status: 403 })
  }
```

- [ ] **Step 3: Update `src/app/api/cards/[id]/route.ts`**

In `GET`, `PUT`, and `DELETE` on cards: replace `card.column.board.ownerId !== user.id` with `hasBoardAccess(card.column.boardId, user.id)`:
```ts
  const access = await hasBoardAccess(card.column.board.id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Card not found or access denied' }, { status: 404 })
  }
```

- [ ] **Step 4: Verify with TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/boards/route.ts src/app/api/boards/[id]/route.ts src/app/api/cards/[id]/route.ts
git commit -m "feat(api): expand board and card endpoints to allow shared collaborator access"
```

---

### Task 5: Share Board Modal Component

**Agent:** ux-ui-pro-max

**Files:**
- Create: `src/components/kanban/ShareBoardModal.tsx`

**Interfaces:**
- Produces: `ShareBoardModal` component with props:
  - `boardId: string`
  - `boardTitle: string`
  - `isOwner: boolean`
  - `onClose: () => void`
  - `onMembersChange?: (count: number) => void`

- [ ] **Step 1: Create `src/components/kanban/ShareBoardModal.tsx`**

Build clean modal dialog matching NeoKanban styling:
- Top bar with `Users` icon, board title, and close button (`X`).
- Invite input section for Owner (Email input + "Invite" button with loading state).
- Member roster list:
  - Owner row with badge `Owner`.
  - Collaborators rows with user details, `Collaborator` badge, and "Remove" (for owner) or "Leave" (for current user).
  - Feedback alerts for errors (e.g. email not found, already added).

- [ ] **Step 2: Verify with TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/kanban/ShareBoardModal.tsx
git commit -m "feat(ui): add ShareBoardModal component for managing team collaborators"
```

---

### Task 6: Integrate Share UI in Board View & Dashboard

**Agent:** ux-ui-pro-max

**Files:**
- Modify: `src/app/(dashboard)/boards/[id]/page.tsx:190-210`
- Modify: `src/app/(dashboard)/page.tsx:180-230`

**Interfaces:**
- Consumes: `ShareBoardModal` from `@/components/kanban/ShareBoardModal`
- Produces:
  - Header "Share" button with member count in board view.
  - "Shared" pill badge on project cards on Dashboard.

- [ ] **Step 1: Add Share Button to Board Header**

In `src/app/(dashboard)/boards/[id]/page.tsx`:
- Add state `showShareModal: boolean`.
- Render button next to `+ New task`:
  ```tsx
  <button
    onClick={() => setShowShareModal(true)}
    className="bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
  >
    <Users className="w-3.5 h-3.5 text-neutral-500" />
    <span>Share</span>
  </button>
  ```
- Render `<ShareBoardModal />` when `showShareModal` is true.

- [ ] **Step 2: Add Shared Indicator Badge to Dashboard Cards**

In `src/app/(dashboard)/page.tsx`:
- In board cards, if `!board.isOwner` or `board.memberCount > 0`:
  Render pill badge:
  ```tsx
  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
    <Users className="w-3 h-3" />
    {board.isOwner ? `${board.memberCount} member(s)` : `Shared by ${board.ownerName}`}
  </span>
  ```

- [ ] **Step 3: Verify with TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/boards/[id]/page.tsx src/app/(dashboard)/page.tsx
git commit -m "feat(ui): integrate Share button into board header and shared badges in dashboard"
```

---

### Task 7: Automated Integration Verification & End-to-End Test

**Agent:** nextjs-developer

**Files:**
- Create: `scripts/test-share-collaboration.ts`

**Interfaces:**
- Produces: Comprehensive automated integration test verifying:
  1. Creating a secondary test user (`collaborator@test.com`).
  2. Inviting collaborator to board via API.
  3. Verifying board appears in collaborator's board list.
  4. Verifying collaborator can create card on the board.
  5. Verifying non-owner cannot delete board or invite members.
  6. Verifying collaborator removal revokes access.
  7. Cleanup test entities.

- [ ] **Step 1: Write integration test script `scripts/test-share-collaboration.ts`**

- [ ] **Step 2: Execute integration test**

Run: `npx tsx scripts/test-share-collaboration.ts`
Expected: All 6 test stages pass with 100% success.

- [ ] **Step 3: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-share-collaboration.ts
git commit -m "test: add automated integration test for project sharing and multi-user collaboration"
```
