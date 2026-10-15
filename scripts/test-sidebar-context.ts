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
