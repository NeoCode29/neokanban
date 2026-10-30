import { PrismaClient } from '@prisma/client'

// Test script to verify Prisma client has Skill, SkillFile, and BoardSkill models
async function testSkillsDb() {
  console.log('--- Testing Prisma Client Skill Models ---')
  const prisma = new PrismaClient()

  try {
    // Check if models exist on prisma instance
    const hasSkill = typeof (prisma as any).skill !== 'undefined'
    const hasSkillFile = typeof (prisma as any).skillFile !== 'undefined'
    const hasBoardSkill = typeof (prisma as any).boardSkill !== 'undefined'

    console.log('prisma.skill exists:', hasSkill)
    console.log('prisma.skillFile exists:', hasSkillFile)
    console.log('prisma.boardSkill exists:', hasBoardSkill)

    if (!hasSkill || !hasSkillFile || !hasBoardSkill) {
      throw new Error('Prisma models (skill, skillFile, boardSkill) are not generated yet!')
    }

    console.log('✅ All Prisma Skill models successfully recognized!')
  } finally {
    await prisma.$disconnect()
  }
}

testSkillsDb().catch((err) => {
  console.error('❌ Test failed:', err.message)
  process.exit(1)
})

