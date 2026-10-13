# Bamboo Kanban Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan logo resmi web NeoKanban berupa metafora bambu berbentuk kolom kanban (*Asymmetric Staggered Trilog*) sebagai komponen React modular, aset SVG publik, dan favicon, serta mengintegrasikannya ke Sidebar navigation dan halaman autentikasi.

**Architecture:** Membangun komponen client React `BambooLogo.tsx` dengan varian `monochrome` dan `badge`, file aset SVG murni untuk publik & favicon App Router `src/app/icon.svg`, lalu menggantikan seluruh placeholder segitiga `▲` di `Sidebar.tsx` dan memperbarui header brand di halaman login/register.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS, TypeScript, SVG.

## Global Constraints
- Resolusi dasar SVG: `viewBox="0 0 32 32"`
- Gaya visual: Monokrom Counsel/Linear (palet `#171717`, `#fafafa`, `#e4e4e7`, `#d4d4d8`, dan `currentColor`)
- Tidak ada dependensi library ikon eksternal baru (native React SVG)
- Mendukung mode responsif dan status sidebar collapsed (`w-16`) maupun expanded (`w-64`)

---

### Task 1: BambooLogo Component and Pure SVG Asset

**Agent:** `ux-ui-pro-max`

**Files:**
- Create: `src/components/ui/BambooLogo.tsx`
- Create: `public/bamboo-logo.svg`
- Test: `scripts/test-bamboo-logo.ts`

**Interfaces:**
- Produces: `BambooLogo` component (`export default function BambooLogo(props: BambooLogoProps): JSX.Element`)
- Types: `BambooLogoProps` (`size?: number`, `className?: string`, `variant?: 'monochrome' | 'badge'`, `badgeSize?: number`)

- [ ] **Step 1: Write the test script for BambooLogo rendering**

Buat file test `scripts/test-bamboo-logo.ts` untuk memverifikasi komponen dan SVG vector ter-render dengan valid:

```typescript
import fs from 'fs'
import path from 'path'

console.log('🧪 Testing BambooLogo Component and SVG Asset...')

// 1. Check public/bamboo-logo.svg exists and contains valid SVG coordinates
const svgPath = path.join(process.cwd(), 'public', 'bamboo-logo.svg')
if (!fs.existsSync(svgPath)) {
  console.error('❌ Failed: public/bamboo-logo.svg does not exist!')
  process.exit(1)
}

const svgContent = fs.readFileSync(svgPath, 'utf-8')
if (!svgContent.includes('viewBox="0 0 32 32"') || !svgContent.includes('<path')) {
  console.error('❌ Failed: public/bamboo-logo.svg missing viewBox or path definition!')
  process.exit(1)
}

// 2. Check src/components/ui/BambooLogo.tsx exists and exports valid props
const componentPath = path.join(process.cwd(), 'src', 'components', 'ui', 'BambooLogo.tsx')
if (!fs.existsSync(componentPath)) {
  console.error('❌ Failed: src/components/ui/BambooLogo.tsx does not exist!')
  process.exit(1)
}

const componentContent = fs.readFileSync(componentPath, 'utf-8')
if (
  !componentContent.includes('export default function BambooLogo') ||
  !componentContent.includes('BambooLogoProps') ||
  !componentContent.includes("variant === 'badge'")
) {
  console.error('❌ Failed: BambooLogo.tsx missing required component props or export!')
  process.exit(1)
}

console.log('✅ PASS: BambooLogo component and SVG vector verified successfully!')
process.exit(0)
```

- [ ] **Step 2: Run test to verify it fails**

Jalankan perintah pengujian:
```bash
npx tsx scripts/test-bamboo-logo.ts
```
Expected: FAIL (karena file SVG dan komponen belum dibuat atau belum sesuai spesifikasi).

- [ ] **Step 3: Implement public/bamboo-logo.svg**

Buat file `public/bamboo-logo.svg`:
```xml
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Stalk 1 (Left Column: 2 segments) -->
  <path d="M5 11.5L11 8.5V17.5C11 18.05 10.55 18.5 10 18.5H6C5.45 18.5 5 18.05 5 17.5V11.5Z" fill="#fafafa"/>
  <path d="M5 20.5H11V26C11 27.1 10.1 28 9 28H7C5.9 28 5 27.1 5 26V20.5Z" fill="#d4d4d8"/>

  <!-- Stalk 2 (Center Column: Tallest, 3 segments) -->
  <path d="M13 6.5L19 3.5V11.5C19 12.05 18.55 12.5 18 12.5H14C13.45 12.5 13 12.05 13 11.5V6.5Z" fill="#fafafa"/>
  <rect x="13" y="14.5" width="6" height="5" rx="1" fill="#e4e4e7"/>
  <path d="M13 21.5H19V26C19 27.1 18.1 28 17 28H15C13.9 28 13 27.1 13 26V21.5Z" fill="#a1a1aa"/>

  <!-- Stalk 3 (Right Column: Shorter, 2 segments) -->
  <path d="M21 15.5L27 12.5V19.5C27 20.05 26.55 20.5 26 20.5H22C21.45 20.5 21 20.05 21 19.5V15.5Z" fill="#fafafa"/>
  <path d="M21 22.5H27V26C27 27.1 26.1 28 25 28H23C21.9 28 21 27.1 21 26V22.5Z" fill="#d4d4d8"/>
</svg>
```

- [ ] **Step 4: Implement src/components/ui/BambooLogo.tsx**

Buat file komponen React `src/components/ui/BambooLogo.tsx`:
```tsx
'use client'

export interface BambooLogoProps {
  size?: number
  className?: string
  variant?: 'monochrome' | 'badge'
  badgeSize?: number
}

export default function BambooLogo({
  size = 20,
  className = '',
  variant = 'badge',
  badgeSize,
}: BambooLogoProps) {
  const isBadge = variant === 'badge'

  const c1 = isBadge ? '#fafafa' : 'currentColor'
  const c2 = isBadge ? '#e4e4e7' : 'currentColor'
  const c3 = isBadge ? '#d4d4d8' : 'currentColor'

  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Stalk 1 (Left Column: 2 segments) */}
      <path
        d="M5 11.5L11 8.5V17.5C11 18.05 10.55 18.5 10 18.5H6C5.45 18.5 5 18.05 5 17.5V11.5Z"
        fill={c1}
      />
      <path
        d="M5 20.5H11V26C11 27.1 10.1 28 9 28H7C5.9 28 5 27.1 5 26V20.5Z"
        fill={c2}
      />

      {/* Stalk 2 (Center Column: Tallest, 3 segments) */}
      <path
        d="M13 6.5L19 3.5V11.5C19 12.05 18.55 12.5 18 12.5H14C13.45 12.5 13 12.05 13 11.5V6.5Z"
        fill={c1}
      />
      <rect x="13" y="14.5" width="6" height="5" rx="1" fill={c2} />
      <path
        d="M13 21.5H19V26C19 27.1 18.1 28 17 28H15C13.9 28 13 27.1 13 26V21.5Z"
        fill={c3}
      />

      {/* Stalk 3 (Right Column: Shorter, 2 segments) */}
      <path
        d="M21 15.5L27 12.5V19.5C27 20.05 26.55 20.5 26 20.5H22C21.45 20.5 21 20.05 21 19.5V15.5Z"
        fill={c1}
      />
      <path
        d="M21 22.5H27V26C27 27.1 26.1 28 25 28H23C21.9 28 21 27.1 21 26V22.5Z"
        fill={c2}
      />
    </svg>
  )

  if (isBadge) {
    const bSize = badgeSize || Math.round(size * 1.5)
    return (
      <div
        style={{ width: bSize, height: bSize }}
        className="rounded-lg bg-neutral-900 flex items-center justify-center shadow-xs shrink-0"
      >
        {svgContent}
      </div>
    )
  }

  return svgContent
}
```

- [ ] **Step 5: Run test to verify it passes**

Jalankan:
```bash
npx tsx scripts/test-bamboo-logo.ts
```
Expected: PASS with "✅ PASS: BambooLogo component and SVG vector verified successfully!"

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/BambooLogo.tsx public/bamboo-logo.svg scripts/test-bamboo-logo.ts
git commit -m "feat(ui): implement BambooLogo component and svg asset"
```

---

### Task 2: Integrate BambooLogo into Sidebar Navigation

**Agent:** `ux-ui-pro-max`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx:80-97`
- Test: `scripts/test-sidebar-logo-integration.ts`

**Interfaces:**
- Consumes: `BambooLogo` from `@/components/ui/BambooLogo`

- [ ] **Step 1: Write integration test for Sidebar header**

Buat file test `scripts/test-sidebar-logo-integration.ts`:
```typescript
import fs from 'fs'
import path from 'path'

console.log('🧪 Testing Sidebar Logo Integration...')

const sidebarPath = path.join(process.cwd(), 'src', 'components', 'layout', 'Sidebar.tsx')
const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8')

// Must import BambooLogo
if (!sidebarContent.includes("import BambooLogo from '@/components/ui/BambooLogo'")) {
  console.error('❌ Failed: Sidebar.tsx does not import BambooLogo!')
  process.exit(1)
}

// Must NOT contain placeholder ▲
if (sidebarContent.includes('▲')) {
  console.error('❌ Failed: Sidebar.tsx still contains placeholder triangle (▲)!')
  process.exit(1)
}

// Must render BambooLogo
if (!sidebarContent.includes('<BambooLogo')) {
  console.error('❌ Failed: Sidebar.tsx does not render BambooLogo component!')
  process.exit(1)
}

console.log('✅ PASS: Sidebar logo integration verified successfully!')
process.exit(0)
```

- [ ] **Step 2: Run test to verify it fails**

Jalankan:
```bash
npx tsx scripts/test-sidebar-logo-integration.ts
```
Expected: FAIL (karena `Sidebar.tsx` masih memiliki placeholder `▲`).

- [ ] **Step 3: Update src/components/layout/Sidebar.tsx**

Perbarui baris 80-97 di `src/components/layout/Sidebar.tsx`:
```tsx
          <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-200/60 shrink-0">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2.5">
                <BambooLogo variant="badge" size={16} badgeSize={28} />
                <span className="font-semibold text-sm text-neutral-900 tracking-tight">
                  NeoKanban
                </span>
              </Link>
            )}

            {collapsed && (
              <div className="mx-auto">
                <BambooLogo variant="badge" size={16} badgeSize={28} />
              </div>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-md transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
```

- [ ] **Step 4: Run test to verify it passes**

Jalankan:
```bash
npx tsx scripts/test-sidebar-logo-integration.ts
```
Expected: PASS with "✅ PASS: Sidebar logo integration verified successfully!"

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx scripts/test-sidebar-logo-integration.ts
git commit -m "feat(ui): integrate BambooLogo into Sidebar navigation header"
```

---

### Task 3: Auth Pages Integration & Next.js App Icon Metadata

**Agent:** `nextjs-developer`

**Files:**
- Create: `src/app/icon.svg`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Test: `scripts/test-auth-and-icon.ts`

**Interfaces:**
- Consumes: `BambooLogo` from `@/components/ui/BambooLogo`
- Produces: `src/app/icon.svg` (Next.js automatically serves as tab favicon)

- [ ] **Step 1: Write verification test for Auth pages and App Icon**

Buat file test `scripts/test-auth-and-icon.ts`:
```typescript
import fs from 'fs'
import path from 'path'

console.log('🧪 Testing Auth Pages Logo and App Icon Metadata...')

// 1. Check icon.svg
const iconPath = path.join(process.cwd(), 'src', 'app', 'icon.svg')
if (!fs.existsSync(iconPath)) {
  console.error('❌ Failed: src/app/icon.svg does not exist!')
  process.exit(1)
}

// 2. Check login page renders BambooLogo
const loginPath = path.join(process.cwd(), 'src', 'app', '(auth)', 'login', 'page.tsx')
const loginContent = fs.readFileSync(loginPath, 'utf-8')
if (!loginContent.includes('BambooLogo')) {
  console.error('❌ Failed: login/page.tsx does not include BambooLogo!')
  process.exit(1)
}

// 3. Check register page renders BambooLogo
const registerPath = path.join(process.cwd(), 'src', 'app', '(auth)', 'register', 'page.tsx')
const registerContent = fs.readFileSync(registerPath, 'utf-8')
if (!registerContent.includes('BambooLogo')) {
  console.error('❌ Failed: register/page.tsx does not include BambooLogo!')
  process.exit(1)
}

console.log('✅ PASS: Auth pages and app icon metadata verified successfully!')
process.exit(0)
```

- [ ] **Step 2: Run test to verify it fails**

Jalankan:
```bash
npx tsx scripts/test-auth-and-icon.ts
```
Expected: FAIL.

- [ ] **Step 3: Create src/app/icon.svg**

Buat file `src/app/icon.svg` (ikon tab browser Next.js):
```xml
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#171717"/>
  <path d="M5 11.5L11 8.5V17.5C11 18.05 10.55 18.5 10 18.5H6C5.45 18.5 5 18.05 5 17.5V11.5Z" fill="#fafafa"/>
  <path d="M5 20.5H11V26C11 27.1 10.1 28 9 28H7C5.9 28 5 27.1 5 26V20.5Z" fill="#d4d4d8"/>
  <path d="M13 6.5L19 3.5V11.5C19 12.05 18.55 12.5 18 12.5H14C13.45 12.5 13 12.05 13 11.5V6.5Z" fill="#fafafa"/>
  <rect x="13" y="14.5" width="6" height="5" rx="1" fill="#e4e4e7"/>
  <path d="M13 21.5H19V26C19 27.1 18.1 28 17 28H15C13.9 28 13 27.1 13 26V21.5Z" fill="#a1a1aa"/>
  <path d="M21 15.5L27 12.5V19.5C27 20.05 26.55 20.5 26 20.5H22C21.45 20.5 21 20.05 21 19.5V15.5Z" fill="#fafafa"/>
  <path d="M21 22.5H27V26C27 27.1 26.1 28 25 28H23C21.9 28 21 27.1 21 26V22.5Z" fill="#d4d4d8"/>
</svg>
```

- [ ] **Step 4: Update src/app/(auth)/login/page.tsx and register/page.tsx**

Tambahkan `BambooLogo` di header form auth:
```tsx
import BambooLogo from '@/components/ui/BambooLogo'
```
Dan render di bagian header box auth:
```tsx
<div className="flex justify-center mb-4">
  <BambooLogo variant="badge" size={24} badgeSize={44} />
</div>
```

- [ ] **Step 5: Run test to verify it passes**

Jalankan:
```bash
npx tsx scripts/test-auth-and-icon.ts
```
Expected: PASS with "✅ PASS: Auth pages and app icon metadata verified successfully!"

- [ ] **Step 6: Commit**

```bash
git add src/app/icon.svg src/app/(auth)/login/page.tsx src/app/(auth)/register/page.tsx scripts/test-auth-and-icon.ts
git commit -m "feat(auth): integrate BambooLogo in auth pages and add app icon metadata"
```

---

### Task 4: Whole-Project Build & Regression Verification

**Agent:** `nextjs-developer`

**Files:**
- Test: `npm run build`

- [ ] **Step 1: Run Next.js production build check**

Jalankan:
```bash
npm run build
```
Expected: Build berhasil tanpa error TypeScript atau layout breaking.

- [ ] **Step 2: Commit any final sync**

```bash
git status
```
