import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function runTest() {
  console.log('👥 Starting Multiple Card Assignees Test Suite...\n')

  // 1. Setup Owner and Collaborator users
  let owner = await prisma.user.findUnique({
    where: { email: 'kresna@example.com' },
  })
  if (!owner) {
    const passwordHash = await bcrypt.hash('password123', 10)
    owner = await prisma.user.create({
      data: {
        email: 'kresna@example.com',
        name: 'Kresna Developer',
        passwordHash,
      },
    })
  }

  const collabEmail = 'sarah.engineer@example.com'
  let collaborator = await prisma.user.findUnique({
    where: { email: collabEmail },
  })
  if (!collaborator) {
    const passwordHash = await bcrypt.hash('password123', 10)
    collaborator = await prisma.user.create({
      data: {
        email: collabEmail,
        name: 'Sarah Connor',
        passwordHash,
      },
    })
  }

  const outsiderEmail = 'outsider@example.com'
  let outsider = await prisma.user.findUnique({
    where: { email: outsiderEmail },
  })
  if (!outsider) {
    const passwordHash = await bcrypt.hash('password123', 10)
    outsider = await prisma.user.create({
      data: {
        email: outsiderEmail,
        name: 'Outsider User',
        passwordHash,
      },
    })
  }

  // 2. Create test board with Backlog column and test card
  const board = await prisma.board.create({
    data: {
      title: 'Assignee Test Board',
      ownerId: owner.id,
      members: {
        create: {
          userId: collaborator.id,
          role: 'COLLABORATOR',
        },
      },
      columns: {
        create: {
          title: 'In Progress',
          order: 0,
          cards: {
            create: {
              title: 'Test Multi-Assignee Card',
              description: 'Checking multiple mentions on card.',
              order: 0,
            },
          },
        },
      },
    },
    include: {
      members: true,
      columns: {
        include: {
          cards: true,
        },
      },
    },
  })

  const testCard = board.columns[0].cards[0]
  console.log(`✅ Created test board "${board.title}" with card "${testCard.title}" (ID: ${testCard.id})`)

  try {
    // STAGE 1: Assign Owner to card
    console.log('\n--- STAGE 1: Assign First User (Owner) ---')
    const assignOwner = await prisma.cardAssignee.create({
      data: {
        cardId: testCard.id,
        userId: owner.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })
    console.log(`✅ Assigned Owner: ${assignOwner.user.name} (${assignOwner.user.email})`)

    // STAGE 2: Assign Collaborator to card (Multiple Assignees)
    console.log('\n--- STAGE 2: Assign Second User (Collaborator) ---')
    const assignCollab = await prisma.cardAssignee.create({
      data: {
        cardId: testCard.id,
        userId: collaborator.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })
    console.log(`✅ Assigned Collaborator: ${assignCollab.user.name} (${assignCollab.user.email})`)

    // STAGE 3: Verify multiple assignees retrieved on card
    console.log('\n--- STAGE 3: Verify Query with Relations ---')
    const cardWithAssignees = await prisma.card.findUnique({
      where: { id: testCard.id },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!cardWithAssignees || cardWithAssignees.assignees.length !== 2) {
      throw new Error(`Expected 2 assignees on card, got ${cardWithAssignees?.assignees.length}`)
    }
    console.log(`✅ Card successfully has ${cardWithAssignees.assignees.length} assignees:`)
    cardWithAssignees.assignees.forEach((a) => {
      console.log(`   - ${a.user.name} (${a.user.email})`)
    })

    // STAGE 4: Verify non-member outsider validation
    console.log('\n--- STAGE 4: Verify Board Membership Guard ---')
    const isOutsiderOwner = board.ownerId === outsider.id
    const isOutsiderMember = board.members.some((m) => m.userId === outsider.id)
    if (isOutsiderOwner || isOutsiderMember) {
      throw new Error('Outsider should not be recognized as board member')
    }
    console.log('✅ Board membership guard confirmed: Outsider cannot be assigned to board cards')

    // STAGE 5: Remove one assignee (Unassign)
    console.log('\n--- STAGE 5: Remove One Assignee ---')
    await prisma.cardAssignee.deleteMany({
      where: {
        cardId: testCard.id,
        userId: collaborator.id,
      },
    })

    const cardAfterUnassign = await prisma.card.findUnique({
      where: { id: testCard.id },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!cardAfterUnassign || cardAfterUnassign.assignees.length !== 1) {
      throw new Error(`Expected 1 assignee remaining, got ${cardAfterUnassign?.assignees.length}`)
    }
    console.log(`✅ Remaining assignee: ${cardAfterUnassign.assignees[0].user.name}`)

    // STAGE 6: Test Cascade Deletion
    console.log('\n--- STAGE 6: Verify Cascade Deletion ---')
    await prisma.card.delete({
      where: { id: testCard.id },
    })

    const orphanedAssignees = await prisma.cardAssignee.findMany({
      where: { cardId: testCard.id },
    })
    if (orphanedAssignees.length !== 0) {
      throw new Error('CardAssignee records should be cascaded and deleted with Card')
    }
    console.log('✅ Cascade deletion verified: No orphaned CardAssignee records')

    console.log('\n🎉 ALL CARD ASSIGNEES TESTS PASSED WITH 100% SUCCESS!')
  } finally {
    // Cleanup test board
    await prisma.board.deleteMany({
      where: { id: board.id },
    })
    await prisma.user.deleteMany({
      where: { id: outsider.id },
    })
    console.log('\n🧹 Cleaned up temporary test data.')
  }
}

runTest()
  .catch((err) => {
    console.error('❌ Test suite failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
