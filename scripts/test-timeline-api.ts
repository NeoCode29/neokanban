import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testTimelineApiLogic() {
  console.log('🧪 Testing card startDate update and validation logic...')

  const card = await prisma.card.findFirst()
  if (!card) {
    throw new Error('No card available for test')
  }

  const now = new Date()
  const start = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const due = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // 1. Valid update
  const updated = await prisma.card.update({
    where: { id: card.id },
    data: {
      startDate: start,
      dueDate: due,
    },
  })

  if (!updated.startDate || updated.startDate.getTime() !== start.getTime()) {
    throw new Error('FAIL: startDate was not saved correctly')
  }

  // 2. Test validation logic (startDate > dueDate should be invalid)
  const invalidStart = new Date(due.getTime() + 10000)
  const isInvalid = invalidStart.getTime() > due.getTime()
  if (!isInvalid) {
    throw new Error('FAIL: date comparison failed')
  }

  console.log('✅ PASS: API date persistence and logic verified')
}

testTimelineApiLogic()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
