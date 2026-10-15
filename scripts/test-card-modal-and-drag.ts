import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('Testing CardDetailModal & Drag-and-Drop Enhancements...')

// 1. Check CardDetailModal.tsx
const modalFile = path.resolve('src/components/kanban/CardDetailModal.tsx')
const modalContent = fs.readFileSync(modalFile, 'utf-8')

assert.ok(
  modalContent.includes('Konten & Checklist') && modalContent.includes('Properti & Status'),
  'CardDetailModal must have mobile tabs for Content and Properties'
)
assert.ok(
  modalContent.includes('handleMoveColumn'),
  'CardDetailModal must have a handleMoveColumn function to directly move cards'
)
assert.ok(
  modalContent.includes('overflow-hidden min-h-0'),
  'CardDetailModal main flex container must prevent scroll trapping'
)
console.log('✅ CardDetailModal mobile layout & direct move passed!')

// 2. Check KanbanCard.tsx
const cardFile = path.resolve('src/components/kanban/KanbanCard.tsx')
const cardContent = fs.readFileSync(cardFile, 'utf-8')

assert.ok(
  cardContent.includes('touch-none'),
  'KanbanCard drag handle must have touch-none to prevent touch scrolling conflict'
)
assert.ok(
  cardContent.includes('opacity-80 sm:opacity-0'),
  'KanbanCard drag handle must be clearly visible on mobile touch screens'
)
console.log('✅ KanbanCard touch drag handle passed!')

// 3. Check KanbanBoard.tsx
const boardFile = path.resolve('src/components/kanban/KanbanBoard.tsx')
const boardContent = fs.readFileSync(boardFile, 'utf-8')

assert.ok(
  boardContent.includes('TouchSensor') && boardContent.includes('MouseSensor'),
  'KanbanBoard must configure TouchSensor and MouseSensor'
)
console.log('✅ KanbanBoard dnd-kit touch sensors passed!')

console.log('\n🎉 ALL CARD MODAL & DRAG TESTS PASSED!')
