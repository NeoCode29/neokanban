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
