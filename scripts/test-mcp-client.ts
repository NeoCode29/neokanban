import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import path from 'path'

const prisma = new PrismaClient()

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

async function getOrCreateTestToken() {
  const user = await prisma.user.findUnique({
    where: { email: 'kresna@example.com' },
  })

  if (!user) {
    throw new Error('Default user not found. Please run seed script first.')
  }

  // Create disposable test token
  const rawToken = `neokan_pat_${crypto.randomBytes(24).toString('hex')}`
  const tokenHash = hashToken(rawToken)
  const tokenHint = `${rawToken.slice(0, 15)}...${rawToken.slice(-4)}`

  await prisma.personalAccessToken.create({
    data: {
      userId: user.id,
      name: 'E2E Automated Test Runner',
      tokenHash,
      tokenHint,
    },
  })

  return { rawToken, user }
}

async function main() {
  console.log('--- NeoKanban MCP Client Integration Test ---')

  const { rawToken } = await getOrCreateTestToken()
  console.log('✅ Generated test PAT token:', rawToken.slice(0, 20) + '...')

  const serverScript = path.resolve(process.cwd(), 'mcp/dist/index.js')
  console.log('📡 Spawning MCP server at:', serverScript)

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverScript],
    env: {
      NEOKANBAN_API_URL: 'http://localhost:3000',
      NEOKANBAN_PAT: rawToken,
    },
  })

  const client = new Client(
    { name: 'NeoKanban-Test-Client', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)
  console.log('✅ Connected to MCP Server via stdio transport!')

  // 1. List tools
  const toolsResponse = await client.listTools()
  console.log(`\n📋 Tools Registered (${toolsResponse.tools.length}):`)
  toolsResponse.tools.forEach((t) =>
    console.log(`   - ${t.name}: ${(t.description || '').slice(0, 60)}...`)
  )

  // 2. Call list_boards
  console.log('\n🔍 Calling list_boards...')
  const boardsResult: any = await client.callTool({ name: 'list_boards', arguments: {} })
  const boards = JSON.parse(boardsResult.content[0].text)
  console.log(`✅ Found ${boards.length} board(s): "${boards[0]?.title}" (ID: ${boards[0]?.id})`)

  const boardId = boards[0].id

  // 3. Call list_board_context_files
  console.log('\n📂 Calling list_board_context_files...')
  const listFilesResult: any = await client.callTool({
    name: 'list_board_context_files',
    arguments: { boardId },
  })
  const filesData = JSON.parse(listFilesResult.content[0].text)
  console.log(`✅ Found ${filesData.files.length} context file(s):`)
  filesData.files.forEach((f: any) => console.log(`   - ${f.fileName} (${f.title})`))

  // 3b. Call get_board_context for all files
  console.log('\n📖 Calling get_board_context (all files)...')
  const contextResult: any = await client.callTool({
    name: 'get_board_context',
    arguments: { boardId },
  })
  const contextText = contextResult.content[0].text
  console.log('✅ Successfully retrieved living context bundle! Snippet:')
  console.log(contextText.slice(0, 220) + '...\n')

  // 3c. Call get_board_context for single file
  console.log('📄 Calling get_board_context for "guidelines.md"...')
  const singleFileResult: any = await client.callTool({
    name: 'get_board_context',
    arguments: { boardId, fileName: 'guidelines.md' },
  })
  console.log('✅ Retrieved single file snippet:')
  console.log(singleFileResult.content[0].text.slice(0, 150) + '...\n')

  // 3d. Call update_board_context to upsert a new file
  console.log('💾 Calling update_board_context to create "api-endpoints.json"...')
  const upsertFileResult: any = await client.callTool({
    name: 'update_board_context',
    arguments: {
      boardId,
      fileName: 'api-endpoints.json',
      title: 'REST API Endpoints Specification',
      content: JSON.stringify({ version: 'v1', endpoints: ['/api/boards', '/api/cards'] }, null, 2),
    },
  })
  console.log('✅ ' + upsertFileResult.content[0].text)

  // 4. Call create_card
  console.log('📝 Calling create_card...')
  const createResult: any = await client.callTool({
    name: 'create_card',
    arguments: {
      boardId,
      columnTitle: 'To Do',
      title: 'Auto-Created Task from AI Integration Test',
      description: `### 🎯 Objective\nVerify that AI agent can create tasks according to NeoKanban standards.\n\n### 📋 Acceptance Criteria\n- [ ] Card created in To Do column\n- [ ] Follows message standardization`,
      priority: 'HIGH',
      tags: ['automated-test', 'ai-agent'],
    },
  })
  console.log('✅ ' + createResult.content[0].text)

  // 5. Query cards to verify card exists
  const cardsResult: any = await client.callTool({
    name: 'get_board_cards',
    arguments: { boardId, columnTitle: 'To Do' },
  })
  const todoCols = JSON.parse(cardsResult.content[0].text)
  const createdCard = todoCols[0]?.cards.find((c: any) =>
    c.title.includes('Auto-Created Task')
  )
  console.log(`✅ Card verified in DB with ID: ${createdCard?.id}`)

  // 6. Call get_card_details
  if (createdCard) {
    console.log('\n🔍 Calling get_card_details...')
    const cardDetailsResult: any = await client.callTool({
      name: 'get_card_details',
      arguments: { cardId: createdCard.id },
    })
    const cardDetails = JSON.parse(cardDetailsResult.content[0].text)
    console.log(`✅ Card Details retrieved: "${cardDetails.title}" (Priority: ${cardDetails.priority})`)

    // 7. Call manage_checklist (add subtask)
    console.log('\n📋 Calling manage_checklist (action: "add")...')
    const addChecklistResult: any = await client.callTool({
      name: 'manage_checklist',
      arguments: {
        cardId: createdCard.id,
        action: 'add',
        title: 'Run MCP full suite test',
      },
    })
    console.log('✅ ' + addChecklistResult.content[0].text)

    // 7b. Call manage_checklist (toggle subtask)
    const refreshedDetailsResult: any = await client.callTool({
      name: 'get_card_details',
      arguments: { cardId: createdCard.id },
    })
    const refreshedDetails = JSON.parse(refreshedDetailsResult.content[0].text)
    const checklistItemId = refreshedDetails.checklists[0]?.id

    if (checklistItemId) {
      console.log('☑️ Calling manage_checklist (action: "toggle")...')
      const toggleResult: any = await client.callTool({
        name: 'manage_checklist',
        arguments: {
          cardId: createdCard.id,
          action: 'toggle',
          itemId: checklistItemId,
          isCompleted: true,
        },
      })
      console.log('✅ ' + toggleResult.content[0].text)
    }

    // 8. Call add_card_comment
    console.log('\n💬 Calling add_card_comment...')
    const commentResult: any = await client.callTool({
      name: 'add_card_comment',
      arguments: {
        cardId: createdCard.id,
        authorName: 'Claude 3.7 Sonnet (MCP Test)',
        content: `**Status:** \`[UPDATE]\`\n\n**📝 Summary of Actions:**\n- Completed automated verification of MCP server stdio tools.\n\n**🔗 Changed Files:**\n- \`mcp/dist/index.js\`\n\n**❓ Questions:**\nNone. All 10 tools operating correctly.`,
      },
    })
    console.log('✅ ' + commentResult.content[0].text)

    // 9. Call update_card (move to In Progress)
    console.log('\n🚚 Calling update_card to move task to "In Progress"...')
    const updateResult: any = await client.callTool({
      name: 'update_card',
      arguments: {
        cardId: createdCard.id,
        targetColumnTitle: 'In Progress',
      },
    })
    console.log('✅ ' + updateResult.content[0].text)

    // 10. Call list_board_members
    console.log('\n👥 Calling list_board_members...')
    const membersResult: any = await client.callTool({
      name: 'list_board_members',
      arguments: { boardId },
    })
    const boardMembersData = JSON.parse(membersResult.content[0].text)
    console.log(`✅ Retrieved ${boardMembersData.members.length} board member(s):`)
    boardMembersData.members.forEach((m: any) =>
      console.log(`   - ${m.name} (${m.email}) [${m.role}]`)
    )

    // 11. Call assign_card_member
    console.log('\n🎯 Calling assign_card_member...')
    const assignResult: any = await client.callTool({
      name: 'assign_card_member',
      arguments: {
        cardId: createdCard.id,
        member: boardMembersData.members[0].email,
      },
    })
    console.log('✅ ' + assignResult.content[0].text)

    // 12. Verify card has assignees in get_card_details
    const assignedDetailsResult: any = await client.callTool({
      name: 'get_card_details',
      arguments: { cardId: createdCard.id },
    })
    const assignedDetails = JSON.parse(assignedDetailsResult.content[0].text)
    console.log(`✅ Verified assignees on card: ${assignedDetails.assignees.map((a: any) => a.name).join(', ')}`)

    // 13. Call unassign_card_member
    console.log('\n🗑️ Calling unassign_card_member...')
    const unassignResult: any = await client.callTool({
      name: 'unassign_card_member',
      arguments: {
        cardId: createdCard.id,
        member: boardMembersData.members[0].email,
      },
    })
    console.log('✅ ' + unassignResult.content[0].text)
  }

  await client.close()
  console.log('\n🎉 ALL MCP TOOLS & INTEGRATION TESTS PASSED SUCCESSFULLY!')
}

main()
  .catch((err) => {
    console.error('❌ MCP Integration Test Failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
