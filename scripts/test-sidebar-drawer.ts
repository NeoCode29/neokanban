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
