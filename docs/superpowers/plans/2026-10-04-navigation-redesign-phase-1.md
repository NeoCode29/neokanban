# NeoKanban Navigation Redesign (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize NeoKanban navigation by adding a dedicated Review Queue hub (`/reviews`), grouping sidebar boards into Favorites/Recent with quick creation, and decoupling Board View tabs from column filters.

**Architecture:** App Router Next.js 15, React 19 Client/Server components, Prisma ORM queries for review cards aggregation, Tailwind CSS for modern pill navigation and tooltips.

**Tech Stack:** Next.js 15, React 19, Prisma ORM 6.4, Tailwind CSS, Lucide React, TypeScript.

## Global Constraints
- All API routes must authenticate via existing JWT session cookie (`jose` / `jwtVerify`).
- Keep all existing dnd-kit interactions and modal behaviors intact.
- Never write credentials or secrets into card details or logs.
- Follow the Tabel Domain for Agent tagging per task.

---

### Task 1: Aggregation API for Review Queue (`GET /api/reviews`)

**Agent:** `nextjs-developer`

**Files:**
- Create: `src/app/api/reviews/route.ts`
- Test: `scripts/test-reviews-api.ts`

**Interfaces:**
- Consumes: Prisma Client (`@/lib/prisma`), JWT session cookie (`@/lib/auth`)
- Produces: `GET /api/reviews` returning `{ cards: ReviewCardItem[], total: number }`

- [ ] **Step 1: Write test script to verify review cards endpoint**

Create `scripts/test-reviews-api.ts`:
```typescript
import { prisma } from '../src/lib/prisma'

async function run() {
  console.log('--- Testing Review Queue API logic ---')
  const reviewColumns = await prisma.column.findMany({
    where: {
      title: { in: ['Review', 'In Review'], mode: 'insensitive' }
    },
    include: {
      board: { select: { id: true, title: true } },
      cards: {
        include: {
          assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          checklists: true,
          _count: { select: { comments: true } }
        }
      }
    }
  })

  console.log(`Found ${reviewColumns.length} review columns across all boards.`)
  const totalCards = reviewColumns.reduce((sum, col) => sum + col.cards.length, 0)
  console.log(`Total review cards found: ${totalCards}`)
  console.log('✅ Test passed successfully.')
}

run().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Run test script to verify database queries**

Run: `npx tsx scripts/test-reviews-api.ts`
Expected: Outputs column and card counts without throwing errors.

- [ ] **Step 3: Implement `GET /api/reviews` route handler**

Create `src/app/api/reviews/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch boards accessible by the current user (owned or member)
    const accessibleBoards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: session.userId },
          { members: { some: { userId: session.userId } } }
        ]
      },
      select: { id: true }
    })

    const boardIds = accessibleBoards.map((b) => b.id)

    // Find cards in review columns for these boards
    const reviewCards = await prisma.card.findMany({
      where: {
        column: {
          boardId: { in: boardIds },
          title: { in: ['Review', 'In Review'], mode: 'insensitive' }
        }
      },
      include: {
        column: {
          include: {
            board: {
              select: { id: true, title: true }
            }
          }
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true }
            }
          }
        },
        checklists: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({
      cards: reviewCards,
      total: reviewCards.length
    })
  } catch (error) {
    console.error('Error fetching review cards:', error)
    return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Verify API route compiles cleanly**

Run: `npx tsc --noEmit`
Expected: 0 errors in `src/app/api/reviews/route.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/reviews/route.ts scripts/test-reviews-api.ts
git commit -m "feat(api): add GET /api/reviews endpoint for review queue"
```

---

### Task 2: Create Reusable `CreateBoardModal` Component

**Agent:** `ux-ui-pro-max`

**Files:**
- Create: `src/components/kanban/CreateBoardModal.tsx`
- Modify: `src/app/(dashboard)/page.tsx:28-40`

**Interfaces:**
- Consumes: None
- Produces: `<CreateBoardModal isOpen={boolean} onClose={() => void} onCreated={(boardId) => void} />`

- [ ] **Step 1: Write `CreateBoardModal.tsx` component**

Create `src/components/kanban/CreateBoardModal.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FolderPlus, Loader2 } from 'lucide-react'

interface CreateBoardModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (boardId: string) => void
}

export default function CreateBoardModal({ isOpen, onClose, onCreated }: CreateBoardModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create board')
      }

      const { board } = await res.json()
      setTitle('')
      setDescription('')
      onClose()

      if (onCreated) {
        onCreated(board.id)
      } else {
        router.push(`/boards/${board.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-800">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Create New Project Board</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Board Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mobile App Redesign, Backend API"
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project and deliverables..."
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Board</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck to verify component**

Run: `npx tsc --noEmit`
Expected: 0 errors in `CreateBoardModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/kanban/CreateBoardModal.tsx
git commit -m "feat(ui): add reusable CreateBoardModal component"
```

---

### Task 3: Modernize Sidebar Navigation (`Sidebar.tsx`)

**Agent:** `ux-ui-pro-max`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `CreateBoardModal.tsx`, `GET /api/reviews` (for badge count)
- Produces: Enhanced sidebar with Favorites, Recent, Review Queue badge, and New Board modal.

- [ ] **Step 1: Update `Sidebar.tsx` with new navigation hierarchy and Review Queue badge**

Modify `src/components/layout/Sidebar.tsx`:
- Import `CheckSquare`, `Star`, `Plus` from `lucide-react`.
- Import `CreateBoardModal`.
- Fetch `/api/reviews` to show review count badge.
- Group boards into `favorites` (`isFavorite: true`) and `recent` (`!isFavorite`).
- Add inline `+` button in the `BOARDS` section header to open `CreateBoardModal`.
- Remove the redundant `Boards & Projects` link. Keep `Dashboard` (`/`), `Review Queue` (`/reviews`), and `AI Tokens` (`/settings`).

- [ ] **Step 2: Run typecheck to verify Sidebar**

Run: `npx tsc --noEmit`
Expected: 0 errors in `src/components/layout/Sidebar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(ui): modernize sidebar with review queue, favorites, and create board modal"
```

---

### Task 4: Implement Central Review Queue Hub Page (`/reviews`)

**Agent:** `nextjs-developer`

**Files:**
- Create: `src/app/(dashboard)/reviews/page.tsx`

**Interfaces:**
- Consumes: `GET /api/reviews`, `CardDetailModal.tsx`
- Produces: Review Queue UI showing pending tasks, checklist progress, and verification inspection.

- [ ] **Step 1: Write `src/app/(dashboard)/reviews/page.tsx`**

Create `src/app/(dashboard)/reviews/page.tsx` with:
- Client-side fetch to `/api/reviews`.
- Top header with badge indicating total awaiting review.
- Grid or list card presentation with:
  - Board name badge linking to `/boards/[id]`.
  - Priority badge, title, due date, checklist completion bar.
  - Assignee avatar tags.
  - "Inspect Verification Report & Review" action button opening `CardDetailModal`.
- Empty state: clean card with celebration icon when 0 tasks are waiting in review.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors in `src/app/(dashboard)/reviews/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/reviews/page.tsx
git commit -m "feat(ui): add central Review Queue hub page"
```

---

### Task 5: Dual-Tier Navigation in Board Page (`boards/[id]/page.tsx`)

**Agent:** `ux-ui-pro-max`

**Files:**
- Modify: `src/app/(dashboard)/boards/[id]/page.tsx:272-330`

**Interfaces:**
- Consumes: `ProjectContextView`, `KanbanBoard`
- Produces: Clear visual separation between Tier 1 (View Switcher) and Tier 2 (Kanban Column Filters + Search).

- [ ] **Step 1: Refactor controls bar into Dual-Tier layout**

In `src/app/(dashboard)/boards/[id]/page.tsx`:
- **Tier 1 (Top Bar)**:
  - Tab 1: `Kanban Board` with icon `KanbanIcon` and count badge of total cards.
  - Tab 2: `Living Context` with icon `BookOpen` and count badge of context docs.
- **Tier 2 (Sub-bar — only rendered when `activeTab === 'board'`)**:
  - Left: Pills filter for columns (`All`, `Backlog`, `To Do`, `In Progress`, `Review`, `Done`).
  - Right: Search input `Filter cards...` with quick clear.
- When `activeTab === 'context'`, directly show `ProjectContextView` without the column filter bar.

- [ ] **Step 2: Run typecheck and build validation**

Run: `npm run build`
Expected: Successful Next.js build with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/boards/[id]/page.tsx
git commit -m "feat(ui): decouple board view tabs from column filters with dual-tier navigation"
```
