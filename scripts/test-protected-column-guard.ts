import { prisma } from '../src/lib/prisma'
import { isProtectedColumn } from '../src/lib/column-utils'

async function runGuardTests() {
  console.log('🛡️ Testing Column Safeguard & Protected Column Deletion...\n')

  // 1. Unit tests for isProtectedColumn helper
  const protectedNames = ['Backlog', 'backlog', 'To Do', 'TODO', 'In Progress', 'progress', 'In Review', 'review', 'Done', 'DONE']
  for (const name of protectedNames) {
    if (!isProtectedColumn(name)) {
      throw new Error(`FAIL: "${name}" should be recognized as a protected column`)
    }
  }
  console.log('✅ Unit Test 1: All standard column titles correctly identified as protected')

  const customNames = ['Custom Column', 'QA Testing', 'Deploy Staging', 'Archive', 'random 123']
  for (const name of customNames) {
    if (isProtectedColumn(name)) {
      throw new Error(`FAIL: "${name}" should NOT be recognized as protected`)
    }
  }
  console.log('✅ Unit Test 2: Custom column titles correctly allowed for deletion')

  // 2. Integration test against HTTP API
  const board = await prisma.board.findFirst({
    where: { title: 'Manajemen Sekolah' },
    include: { columns: true, owner: { include: { tokens: true } } },
  })
  if (!board) throw new Error('Board "Manajemen Sekolah" not found')

  const pat = 'neokan_pat_0441f71a8211a6417fef3d413a66408a6d08d0b30b4d71ef'

  // Find a protected column (e.g. "To Do")
  const todoCol = board.columns.find((c) => isProtectedColumn(c.title))
  if (!todoCol) throw new Error('No protected column found on board')

  console.log(`\n🔒 Testing DELETE on protected column "${todoCol.title}" (${todoCol.id})...`)
  const deleteProtectedRes = await fetch(
    `http://localhost:3000/api/boards/${board.id}/columns/${todoCol.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pat}` },
    }
  )

  const protectedData = await deleteProtectedRes.json()
  console.log(`  Response status: ${deleteProtectedRes.status}`)
  console.log(`  Response body:`, protectedData)

  if (deleteProtectedRes.status !== 403 || protectedData.code !== 'PROTECTED_COLUMN') {
    throw new Error('FAIL: Deleting protected column should return 403 PROTECTED_COLUMN')
  }
  console.log('✅ PASS: Protected column deletion was successfully blocked by backend API guard!')

  // 3. Create a custom column and verify it CAN be deleted
  console.log('\n➕ Creating custom test column "Temporary Safe Delete Column"...')
  const createColRes = await fetch(
    `http://localhost:3000/api/boards/${board.id}/columns`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Temporary Safe Delete Column', colorCode: '#ec4899' }),
    }
  )
  const { column: customCol } = await createColRes.json()
  console.log(`  Created custom column: ${customCol.id} ("${customCol.title}")`)

  console.log(`🗑️ Testing DELETE on custom column...`)
  const deleteCustomRes = await fetch(
    `http://localhost:3000/api/boards/${board.id}/columns/${customCol.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pat}` },
    }
  )
  const customDeleteData = await deleteCustomRes.json()
  console.log(`  Response status: ${deleteCustomRes.status}`)
  console.log(`  Response body:`, customDeleteData)

  if (deleteCustomRes.status !== 200 || !customDeleteData.success) {
    throw new Error('FAIL: Custom column deletion should succeed')
  }
  console.log('✅ PASS: Custom column was successfully deleted without blocking!')

  console.log('\n🎉 ALL COLUMN SAFEGUARD TESTS PASSED 100%!')
}

runGuardTests()
  .catch((err) => {
    console.error('❌ Test failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
