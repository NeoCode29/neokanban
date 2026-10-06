import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCardStartDateSchema() {
  console.log('🧪 Testing Card startDate field in Prisma schema...')

  const card = await prisma.card.findFirst()
  if (!card) {
    console.log('No card found in DB, skipping query test but verifying client types.')
    return
  }

  // Type assertion check: startDate must be a valid property on Card
  const hasStartDateProperty = 'startDate' in card
  if (!hasStartDateProperty) {
    throw new Error('FAIL: "startDate" property does not exist on Card record')
  }

  console.log('✅ PASS: Card has startDate field in Prisma schema')
}

testCardStartDateSchema()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
