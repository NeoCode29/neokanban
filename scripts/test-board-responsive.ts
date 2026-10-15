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
