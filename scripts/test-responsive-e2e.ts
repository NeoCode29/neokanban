import { execSync } from 'node:child_process'

console.log('Running Task 5 E2E Verification...')

// 1. Run all unit tests
console.log('\n--- 1. Testing SidebarContext ---')
execSync('npx tsx scripts/test-sidebar-context.ts', { stdio: 'inherit' })

console.log('\n--- 2. Testing Sidebar Mobile Drawer ---')
execSync('npx tsx scripts/test-sidebar-drawer.ts', { stdio: 'inherit' })

console.log('\n--- 3. Testing Board Responsive Layout ---')
execSync('npx tsx scripts/test-board-responsive.ts', { stdio: 'inherit' })

console.log('\n--- 4. Testing Modals Mobile Viewport ---')
execSync('npx tsx scripts/test-modals-responsive.ts', { stdio: 'inherit' })

console.log('\n--- 5. Testing CardDetailModal & Drag-and-Drop ---')
execSync('npx tsx scripts/test-card-modal-and-drag.ts', { stdio: 'inherit' })

// 2. TypeScript compilation check
console.log('\n--- 6. Verifying TypeScript compilation (tsc --noEmit) ---')
execSync('npx tsc --noEmit', { stdio: 'inherit' })

console.log('\n🎉 ALL RESPONSIVE VERIFICATION CHECKS PASSED!')

