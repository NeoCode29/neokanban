import { prisma } from '../src/lib/prisma'

async function run() {
  console.log('--- Testing Review Queue API Database Logic ---')
  const reviewColumns = await prisma.column.findMany({
    where: {
      title: { in: ['Review', 'In Review'], mode: 'insensitive' }
    },
    include: {
      board: { select: { id: true, title: true } },
      cards: {
        include: {
          assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          checklists: true,
          _count: { select: { comments: true } }
        }
      }
    }
  })

  console.log(`Found ${reviewColumns.length} review columns across boards.`)
  const totalCards = reviewColumns.reduce((sum, col) => sum + col.cards.length, 0)
  console.log(`Total review cards found: ${totalCards}`)
  console.log('✅ Query test passed successfully.')
}

run().catch((err) => {
  console.error('❌ Query test failed:', err)
  process.exit(1)
})
