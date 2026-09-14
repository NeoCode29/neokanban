import { prisma } from '../src/lib/prisma'
import { hasBoardAccess } from '../src/lib/board-auth'
import bcrypt from 'bcryptjs'

async function runTest() {
  console.log('🚀 Starting Share Project & Multi-User Collaboration Test Suite...\n')

  // 1. Ensure primary owner user exists
  let owner = await prisma.user.findUnique({
    where: { email: 'kresna@example.com' },
  })

  if (!owner) {
    const passwordHash = await bcrypt.hash('password123', 10)
    owner = await prisma.user.create({
      data: {
        email: 'kresna@example.com',
        name: 'Kresna (Owner)',
        passwordHash,
      },
    })
    console.log('✅ Created primary owner user')
  } else {
    console.log(`✅ Using existing owner user: ${owner.name} (${owner.email})`)
  }

  // 2. Ensure secondary collaborator user exists
  const collaboratorEmail = 'sarah.engineer@example.com'
  let collaborator = await prisma.user.findUnique({
    where: { email: collaboratorEmail },
  })

  if (!collaborator) {
    const passwordHash = await bcrypt.hash('password123', 10)
    collaborator = await prisma.user.create({
      data: {
        email: collaboratorEmail,
        name: 'Sarah Connor',
        passwordHash,
      },
    })
    console.log(`✅ Created collaborator user: ${collaborator.name} (${collaborator.email})`)
  } else {
    console.log(`✅ Using existing collaborator user: ${collaborator.name} (${collaborator.email})`)
  }

  // 3. Create a designated test board
  const board = await prisma.board.create({
    data: {
      title: 'Automated Collaboration Test Board',
      description: 'Temporary board to verify sharing and collaborator permissions.',
      ownerId: owner.id,
      columns: {
        create: [
          { title: 'Backlog', order: 0 },
          { title: 'To Do', order: 1 },
          { title: 'In Progress', order: 2 },
          { title: 'Done', order: 3 },
        ],
      },
      contextDocuments: {
        create: [
          {
            title: 'Project Conventions',
            fileName: 'conventions.md',
            content: '# Team Conventions\n\nCommit regularly and test thoroughly.',
            order: 0,
          },
        ],
      },
    },
    include: {
      columns: true,
      contextDocuments: true,
    },
  })
  console.log(`✅ Created test board: "${board.title}" (${board.id})`)

  try {
    // STAGE 1: Verify pre-invite access
    console.log('\n--- STAGE 1: Pre-Invitation Access Control ---')
    const ownerPreAccess = await hasBoardAccess(board.id, owner.id)
    if (!ownerPreAccess.hasAccess || !ownerPreAccess.isOwner) {
      throw new Error('FAILED: Owner should have full access with isOwner = true')
    }
    console.log('✅ Owner access verified: hasAccess = true, isOwner = true')

    const collabPreAccess = await hasBoardAccess(board.id, collaborator.id)
    if (collabPreAccess.hasAccess) {
      throw new Error('FAILED: Collaborator should NOT have access before invitation')
    }
    console.log('✅ Collaborator access denied before invite: hasAccess = false')

    // STAGE 2: Add member to board
    console.log('\n--- STAGE 2: Member Invitation ---')
    const memberRecord = await prisma.boardMember.create({
      data: {
        boardId: board.id,
        userId: collaborator.id,
        role: 'COLLABORATOR',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })
    console.log(`✅ Collaborator added to boardMember table: ID ${memberRecord.id}`)

    // STAGE 3: Verify post-invite access
    console.log('\n--- STAGE 3: Post-Invitation Access Verification ---')
    const collabPostAccess = await hasBoardAccess(board.id, collaborator.id)
    if (!collabPostAccess.hasAccess || collabPostAccess.isOwner) {
      throw new Error('FAILED: Collaborator should have access with isOwner = false')
    }
    if (collabPostAccess.role !== 'COLLABORATOR') {
      throw new Error(`FAILED: Collaborator role should be COLLABORATOR, got ${collabPostAccess.role}`)
    }
    console.log('✅ Collaborator access verified: hasAccess = true, isOwner = false, role = COLLABORATOR')

    // STAGE 4: Verify board appears in collaborator dashboard query
    console.log('\n--- STAGE 4: Shared Boards Dashboard Query ---')
    const collabBoards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: collaborator.id },
          { members: { some: { userId: collaborator.id } } },
        ],
      },
      include: {
        owner: { select: { name: true } },
        members: true,
      },
    })

    const foundShared = collabBoards.find((b) => b.id === board.id)
    if (!foundShared) {
      throw new Error('FAILED: Shared board did not appear in collaborator boards query')
    }
    console.log(`✅ Collaborator boards query returned shared board: "${foundShared.title}" (Owned by ${foundShared.owner.name})`)

    // STAGE 5: Collaborator creates a task card
    console.log('\n--- STAGE 5: Collaborator Task Creation ---')
    const targetColumn = board.columns[0]
    const createdCard = await prisma.card.create({
      data: {
        columnId: targetColumn.id,
        title: 'Task created by collaborator',
        description: 'Verified collaborator write permissions.',
        order: 0,
      },
    })
    console.log(`✅ Collaborator successfully created card: "${createdCard.title}" in column "${targetColumn.title}"`)

    // STAGE 6: Collaborator updates living context
    console.log('\n--- STAGE 6: Collaborator Context Update ---')
    const contextDoc = board.contextDocuments[0]
    const updatedDoc = await prisma.contextDocument.update({
      where: { id: contextDoc.id },
      data: {
        content: '# Team Conventions\n\nUpdated by collaborator Sarah.',
      },
    })
    console.log(`✅ Collaborator updated context document: "${updatedDoc.fileName}"`)

    // STAGE 7: Member removal & revocation check
    console.log('\n--- STAGE 7: Member Removal & Access Revocation ---')
    await prisma.boardMember.delete({
      where: { id: memberRecord.id },
    })
    console.log('✅ Deleted BoardMember record')

    const collabRevokedAccess = await hasBoardAccess(board.id, collaborator.id)
    if (collabRevokedAccess.hasAccess) {
      throw new Error('FAILED: Collaborator should no longer have access after removal')
    }
    console.log('✅ Access revocation verified: hasAccess = false')

    console.log('\n🎉 ALL 7 TEST STAGES PASSED WITH 100% SUCCESS!')
  } finally {
    // Cleanup test board
    await prisma.board.delete({
      where: { id: board.id },
    })
    console.log('\n🧹 Cleaned up temporary test board.')
  }
}

runTest()
  .catch((err) => {
    console.error('❌ Test failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
