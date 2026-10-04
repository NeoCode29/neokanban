import { prisma } from '../src/lib/prisma'

async function run() {
  console.log('--- Testing Column API Backend Logic ---')
  const board = await prisma.board.findFirst({
    include: { columns: { orderBy: { order: 'asc' } } }
  })
  if (!board) throw new Error('No board found for testing')

  console.log(`Using board: "${board.title}" (${board.id}) with ${board.columns.length} columns`)

  // 1. Create temporary column
  const tempCol = await prisma.column.create({
    data: {
      boardId: board.id,
      title: 'Temporary Test Column',
      colorCode: '#ec4899',
      order: 99
    }
  })
  console.log(`Created temp column: ${tempCol.id}`)

  // 2. Update column
  const updatedCol = await prisma.column.update({
    where: { id: tempCol.id },
    data: { title: 'Updated Test Column', colorCode: '#3b82f6' }
  })
  if (updatedCol.title !== 'Updated Test Column' || updatedCol.colorCode !== '#3b82f6') {
    throw new Error('Update failed')
  }
  console.log('Update verified successfully.')

  // 3. Delete column
  await prisma.column.delete({ where: { id: tempCol.id } })
  const deletedCheck = await prisma.column.findUnique({ where: { id: tempCol.id } })
  if (deletedCheck) throw new Error('Delete failed')
  console.log('Delete verified successfully.')

  console.log('✅ All Column API database operations passed!')
}

run().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
