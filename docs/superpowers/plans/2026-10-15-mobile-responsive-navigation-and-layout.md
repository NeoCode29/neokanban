# Mobile Responsive Navigation & Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menjadikan seluruh dashboard NeoKanban (Sidebar drawer mobile, TopHeader hamburger, Board header & view switcher, dan dialog modal) sepenuhnya responsif di semua ukuran layar (Mobile 375px, Tablet 768px, Desktop 1280px+) tanpa regresi pada fitur desktop.

**Architecture:** Membangun `SidebarContext` untuk mengelola state slide-over drawer mobile dan collapse desktop secara terpusat. Mengintegrasikan tombol hamburger di `TopHeader` (`lg:hidden`), merombak `Sidebar` agar memiliki mode slide-over dengan backdrop di mobile (`lg:hidden`) dan mempertahankan sticky desktop sidebar (`hidden lg:flex`). Menstandarisasi layout `BoardPage` dan seluruh komponen modal agar adaptif terhadap viewport kecil.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons.

## Global Constraints

- Wajib mempertahankan fungsionalitas desktop yang sudah ada (collapse `w-16` vs expand `w-64`, drag-and-drop `@dnd-kit`, living context, timeline).
- Mobile breakpoint mengikuti standar Tailwind (`lg: 1024px` untuk pemisahan desktop sidebar vs mobile drawer; `sm: 640px` untuk penataan kolom dan modal).
- Zero build / lint errors: `npm run build` harus exit code 0.
- Setiap task wajib menyertakan tag **Agent:** sesuai tabel domain `CLAUDE.md`.

---

### Task 1: Navigation State Management & Mobile Hamburger Header

**Agent:** `nextjs-developer`

**Files:**
- Create: `src/components/layout/SidebarContext.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/layout/TopHeader.tsx`
- Test: `scripts/test-sidebar-context.ts`

**Interfaces:**
- Produces: `useSidebar()` hook returning `{ isMobileOpen, openMobile, closeMobile, toggleMobile, isCollapsed, toggleCollapsed }`.

- [ ] **Step 1: Write the failing test for SidebarContext & TopHeader**

```typescript
// scripts/test-sidebar-context.ts
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('Testing Task 1: SidebarContext & TopHeader...')

const contextPath = path.resolve('src/components/layout/SidebarContext.tsx')
const layoutPath = path.resolve('src/app/(dashboard)/layout.tsx')
const headerPath = path.resolve('src/components/layout/TopHeader.tsx')

assert.ok(fs.existsSync(contextPath), 'SidebarContext.tsx must exist')
const contextContent = fs.readFileSync(contextPath, 'utf-8')
assert.ok(contextContent.includes('useSidebar'), 'SidebarContext must export useSidebar')
assert.ok(contextContent.includes('isMobileOpen'), 'SidebarContext must provide isMobileOpen')

const layoutContent = fs.readFileSync(layoutPath, 'utf-8')
assert.ok(layoutContent.includes('SidebarProvider'), 'layout.tsx must wrap children in SidebarProvider')

const headerContent = fs.readFileSync(headerPath, 'utf-8')
assert.ok(headerContent.includes('useSidebar'), 'TopHeader must use useSidebar hook')
assert.ok(headerContent.includes('lg:hidden'), 'TopHeader must include hamburger button with lg:hidden')

console.log('✅ Task 1 test passed!')
```

- [ ] **Step 2: Run test to confirm it fails (RED)**

```powershell
npx tsx scripts/test-sidebar-context.ts
```
*Expected: Error file does not exist.*

- [ ] **Step 3: Implement `SidebarContext.tsx`**

```tsx
// src/components/layout/SidebarContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface SidebarContextType {
  isMobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
  toggleMobile: () => void
  isCollapsed: boolean
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  // Auto close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const openMobile = () => setIsMobileOpen(true)
  const closeMobile = () => setIsMobileOpen(false)
  const toggleMobile = () => setIsMobileOpen((prev) => !prev)
  const toggleCollapsed = () => setIsCollapsed((prev) => !prev)

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        openMobile,
        closeMobile,
        toggleMobile,
        isCollapsed,
        toggleCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
```

- [ ] **Step 4: Update `layout.tsx` to wrap with `SidebarProvider`**

```tsx
// src/app/(dashboard)/layout.tsx
import Sidebar from '@/components/layout/Sidebar'
import TopHeader from '@/components/layout/TopHeader'
import { SidebarProvider } from '@/components/layout/SidebarContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#fcfcfd] text-neutral-900 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader />
          <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
```

- [ ] **Step 5: Update `TopHeader.tsx` to include mobile hamburger toggle**

```tsx
// src/components/layout/TopHeader.tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Menu } from 'lucide-react'
import { useSidebar } from '@/components/layout/SidebarContext'

export default function TopHeader() {
  const pathname = usePathname()
  const { toggleMobile } = useSidebar()

  let pageName = 'Projects'
  if (pathname === '/settings') pageName = 'AI Tokens & Settings'
  else if (pathname === '/reviews') pageName = 'Review Queue'
  else if (pathname.startsWith('/boards/')) pageName = 'Kanban Board'

  return (
    <header className="h-14 border-b border-neutral-200/80 bg-white/70 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Hamburger Toggle Button for Mobile/Tablet */}
        <button
          onClick={toggleMobile}
          className="lg:hidden p-1.5 -ml-1 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
          title="Open navigation menu"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Responsive Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-neutral-900 font-semibold truncate max-w-[180px] sm:max-w-xs md:max-w-md">
            {pageName}
          </span>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 6: Run test to confirm it passes (GREEN)**

```powershell
npx tsx scripts/test-sidebar-context.ts
```

- [ ] **Step 7: Commit Task 1 changes**

```powershell
git add src/components/layout/SidebarContext.tsx src/app/(dashboard)/layout.tsx src/components/layout/TopHeader.tsx scripts/test-sidebar-context.ts
git commit -m "feat(ui): add SidebarContext and mobile hamburger toggle in TopHeader"
```

---

### Task 2: Responsive Sidebar with Mobile Slide-Over Drawer

**Agent:** `ux-ui-pro-max`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `scripts/test-sidebar-drawer.ts`

**Interfaces:**
- Consumes: `useSidebar()` from `SidebarContext.tsx`
- Produces: Dual-mode sidebar rendering (Desktop sticky sidebar `hidden lg:flex` + Mobile slide-over drawer `lg:hidden`).

- [ ] **Step 1: Write the failing test for Sidebar Drawer**

```typescript
// scripts/test-sidebar-drawer.ts
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('Testing Task 2: Sidebar Mobile Drawer...')

const sidebarPath = path.resolve('src/components/layout/Sidebar.tsx')
const content = fs.readFileSync(sidebarPath, 'utf-8')

assert.ok(content.includes('useSidebar'), 'Sidebar must consume useSidebar')
assert.ok(content.includes('isMobileOpen'), 'Sidebar must read isMobileOpen')
assert.ok(content.includes('closeMobile'), 'Sidebar must provide close button calling closeMobile')
assert.ok(content.includes('hidden lg:flex'), 'Desktop sidebar must be hidden on mobile (hidden lg:flex)')
assert.ok(content.includes('fixed inset-0'), 'Mobile drawer backdrop must be present')

console.log('✅ Task 2 test passed!')
```

- [ ] **Step 2: Run test to confirm it fails (RED)**

```powershell
npx tsx scripts/test-sidebar-drawer.ts
```

- [ ] **Step 3: Refactor `Sidebar.tsx` with shared NavContent & Mobile Drawer**

Modifikasi `Sidebar.tsx` untuk:
1. Menghubungkan state `isCollapsed` dan `toggleCollapsed` ke `useSidebar()`.
2. Mengekstrak konten navigasi (logo, tautan utama, board list, review badge, profil user, tombol logout) menjadi helper render reusable.
3. Merender Desktop Sidebar: `<aside className="hidden lg:flex h-screen sticky top-0 ...">`.
4. Merender Mobile Drawer:
   ```tsx
   {isMobileOpen && (
     <div className="lg:hidden fixed inset-0 z-50 flex">
       {/* Backdrop */}
       <div
         onClick={closeMobile}
         className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
       />
       {/* Drawer Panel */}
       <aside className="relative w-72 max-w-[85vw] bg-[#f9fafb] border-r border-neutral-200/80 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
         {/* Close Button X & Shared NavContent */}
       </aside>
     </div>
   )}
   ```

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

```powershell
npx tsx scripts/test-sidebar-drawer.ts
```

- [ ] **Step 5: Commit Task 2 changes**

```powershell
git add src/components/layout/Sidebar.tsx scripts/test-sidebar-drawer.ts
git commit -m "feat(ui): implement mobile slide-over drawer with backdrop in Sidebar"
```

---

### Task 3: Adaptive Board Header, View Switcher & Filter Bar

**Agent:** `ux-ui-pro-max`

**Files:**
- Modify: `src/app/(dashboard)/boards/[id]/page.tsx`
- Test: `scripts/test-board-responsive.ts`

**Interfaces:**
- Consumes: `BoardDetail`, `activeTab`, `activeFilter`, `searchQuery`.

- [ ] **Step 1: Write the failing test for BoardPage responsive classes**

```typescript
// scripts/test-board-responsive.ts
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('Testing Task 3: BoardPage Responsive Layout...')

const pagePath = path.resolve('src/app/(dashboard)/boards/[id]/page.tsx')
const content = fs.readFileSync(pagePath, 'utf-8')

assert.ok(content.includes('flex flex-col sm:flex-row'), 'Board header must be flex-col on mobile and flex-row on desktop')
assert.ok(content.includes('overflow-x-auto'), 'Tier 1 switcher and Tier 2 filters must support overflow-x-auto')
assert.ok(content.includes('w-full sm:w-auto'), 'Action buttons must be w-full on mobile')

console.log('✅ Task 3 test passed!')
```

- [ ] **Step 2: Run test to confirm it fails (RED)**

```powershell
npx tsx scripts/test-board-responsive.ts
```

- [ ] **Step 3: Update `BoardPage` layout classes**

1. Title bar & Actions:
   - Wrapper: `flex flex-col sm:flex-row sm:items-center justify-between gap-3`.
   - Title & badges: `flex items-center flex-wrap gap-2 sm:gap-3`.
   - Action buttons: `flex items-center gap-2 w-full sm:w-auto justify-end`.
2. Tier 1 View Switcher:
   - Wrapper: `flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200/80 no-scrollbar`.
   - Buttons: beri `shrink-0` agar tidak terjepit.
3. Tier 2 Filter Pills:
   - Filter pills wrapper: `flex items-center gap-1 p-1 bg-[#eeeff2] rounded-xl w-full sm:w-fit border border-neutral-200/50 overflow-x-auto no-scrollbar`.
   - Search input wrapper: `relative w-full sm:w-64 shrink-0`.

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

```powershell
npx tsx scripts/test-board-responsive.ts
```

- [ ] **Step 5: Commit Task 3 changes**

```powershell
git add src/app/(dashboard)/boards/[id]/page.tsx scripts/test-board-responsive.ts
git commit -m "feat(ui): make BoardPage header, view switcher, and filter bar mobile-adaptive"
```

---

### Task 4: Responsive Viewport Constraints on Modals

**Agent:** `ux-ui-pro-max`

**Files:**
- Modify: `src/components/kanban/CardDetailModal.tsx`
- Modify: `src/components/kanban/ColumnSettingsModal.tsx`
- Modify: `src/components/kanban/CreateBoardModal.tsx`
- Modify: `src/components/kanban/ShareBoardModal.tsx`
- Test: `scripts/test-modals-responsive.ts`

- [ ] **Step 1: Write the failing test for Modal Viewport Constraints**

```typescript
// scripts/test-modals-responsive.ts
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('Testing Task 4: Responsive Modals...')

const files = [
  'src/components/kanban/CardDetailModal.tsx',
  'src/components/kanban/ColumnSettingsModal.tsx',
  'src/components/kanban/CreateBoardModal.tsx',
  'src/components/kanban/ShareBoardModal.tsx',
]

for (const rel of files) {
  const content = fs.readFileSync(path.resolve(rel), 'utf-8')
  assert.ok(
    content.includes('max-w-[95vw]') || content.includes('w-[95vw]') || content.includes('max-h-[90vh]'),
    `${rel} must have mobile viewport constraints (e.g. max-w-[95vw] or max-h-[90vh])`
  )
}

console.log('✅ Task 4 test passed!')
```

- [ ] **Step 2: Run test to confirm it fails (RED)**

```powershell
npx tsx scripts/test-modals-responsive.ts
```

- [ ] **Step 3: Update Modal Containers with Adaptive Sizing**

Untuk setiap modal:
- Kontainer dialog: `w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl`.
- Header modal: beri tombol close yang nyaman di sentuh (`p-2 -mr-1 text-neutral-400 hover:text-neutral-700`).
- Padding form dan aksi footer dibuat responsif (`p-4 sm:p-6`, `flex flex-col-reverse sm:flex-row justify-end gap-2`).

- [ ] **Step 4: Run test to confirm it passes (GREEN)**

```powershell
npx tsx scripts/test-modals-responsive.ts
```

- [ ] **Step 5: Commit Task 4 changes**

```powershell
git add src/components/kanban/CardDetailModal.tsx src/components/kanban/ColumnSettingsModal.tsx src/components/kanban/CreateBoardModal.tsx src/components/kanban/ShareBoardModal.tsx scripts/test-modals-responsive.ts
git commit -m "feat(ui): enforce mobile viewport constraints on all kanban modals"
```

---

### Task 5: End-to-End Build & Multi-Viewport Verification

**Agent:** `nextjs-developer`

**Files:**
- Create: `scripts/test-responsive-e2e.ts`

- [ ] **Step 1: Write E2E verification script**

```typescript
// scripts/test-responsive-e2e.ts
import { execSync } from 'node:child_process'

console.log('Running Task 5 E2E Verification...')

// 1. Run all unit tests
console.log('Executing test-sidebar-context...')
execSync('npx tsx scripts/test-sidebar-context.ts', { stdio: 'inherit' })

console.log('Executing test-sidebar-drawer...')
execSync('npx tsx scripts/test-sidebar-drawer.ts', { stdio: 'inherit' })

console.log('Executing test-board-responsive...')
execSync('npx tsx scripts/test-board-responsive.ts', { stdio: 'inherit' })

console.log('Executing test-modals-responsive...')
execSync('npx tsx scripts/test-modals-responsive.ts', { stdio: 'inherit' })

// 2. TypeScript compilation check
console.log('Verifying TypeScript compilation...')
execSync('npx tsc --noEmit', { stdio: 'inherit' })

console.log('🎉 ALL RESPONSIVE VERIFICATION CHECKS PASSED!')
```

- [ ] **Step 2: Run E2E verification script**

```powershell
npx tsx scripts/test-responsive-e2e.ts
```

- [ ] **Step 3: Run production build check**

```powershell
npm run build
```
*Expected: Exit code 0.*

- [ ] **Step 4: Commit Task 5 changes**

```powershell
git add scripts/test-responsive-e2e.ts
git commit -m "test: add comprehensive responsive layout verification suite"
```
