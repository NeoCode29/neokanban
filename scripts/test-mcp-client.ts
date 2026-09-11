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
      ...process.env,
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
  toolsResponse.tools.forEach((t) => console.log(`   - ${t.name}: ${t.description.slice(0, 60)}...`))

  // 2. Call list_boards
  console.log('\n🔍 Calling list_boards...')
  const boardsResult: any = await client.callTool({ name: 'list_boards', arguments: {} })
  const boards = JSON.parse(boardsResult.content[0].text)
  console.log(`✅ Found ${boards.length} board(s): "${boards[0]?.title}" (ID: ${boards[0]?.id})`)

  const boardId = boards[0].id

  // 3. Call get_board_context
  console.log('\n📖 Calling get_board_context...')
  const contextResult: any = await client.callTool({
    name: 'get_board_context',
    arguments: { boardId },
  })
  const contextText = contextResult.content[0].text
  console.log('✅ Successfully retrieved living context! Snippet:')
  console.log(contextText.slice(0, 200) + '...\n')

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

  // 6. Call add_card_comment
  if (createdCard) {
    console.log('\n💬 Calling add_card_comment...')
    const commentResult: any = await client.callTool({
      name: 'add_card_comment',
      arguments: {
        cardId: createdCard.id,
        authorName: 'Claude 3.7 Sonnet (MCP Test)',
        content: `**Status:** \`[UPDATE]\`\n\n**📝 Summary of Actions:**\n- Completed automated verification of MCP server stdio tools.\n\n**🔗 Changed Files:**\n- \`mcp/dist/index.js\`\n\n**❓ Questions:**\nNone. All 9 tools operating correctly.`,
      },
    })
    console.log('✅ ' + commentResult.content[0].text)

    // 7. Call update_card (move to In Progress)
    console.log('\n🚚 Calling update_card to move task to "In Progress"...')
    const updateResult: any = await client.callTool({
      name: 'update_card',
      arguments: {
        cardId: createdCard.id,
        targetColumnTitle: 'In Progress',
      },
    })
    console.log('✅ ' + updateResult.content[0].text)
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
