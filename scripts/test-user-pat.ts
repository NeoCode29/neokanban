import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'path'

const USER_PAT = process.env.NEOKANBAN_PAT || 'neokan_pat_placeholder'

async function main() {
  console.log('--- Testing NeoKanban MCP with Provided PAT ---')
  console.log('🔑 Token:', USER_PAT.slice(0, 15) + '...' + USER_PAT.slice(-4))

  const serverScript = path.resolve(process.cwd(), 'mcp/dist/index.js')
  console.log('📡 Spawning MCP server at:', serverScript)

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverScript],
    env: {
      ...process.env,
      NEOKANBAN_PAT: USER_PAT,
    },
  })

  const client = new Client(
    { name: 'Antigravity-MCP-Direct-Runner', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)
  console.log('✅ Connected to NeoKanban MCP Server via Stdio!')

  // 1. List boards
  console.log('\n🔍 [1/6] Calling list_boards...')
  const boardsResult: any = await client.callTool({ name: 'list_boards', arguments: {} })
  const boards = JSON.parse(boardsResult.content[0].text)
  console.log(`Found ${boards.length} board(s):`)
  boards.forEach((b: any) => {
    console.log(`  - Board: "${b.title}" (ID: ${b.id}) | Columns: ${b.columns.length} | Tasks: ${b.totalCards}`)
  })

  if (boards.length === 0) {
    console.log('No boards found for this user PAT.')
    await client.close()
    return
  }

  const activeBoard = boards[0]
  const boardId = activeBoard.id

  // 2. List context files
  console.log(`\n📂 [2/6] Calling list_board_context_files for "${activeBoard.title}"...`)
  const filesResult: any = await client.callTool({
    name: 'list_board_context_files',
    arguments: { boardId },
  })
  const filesData = JSON.parse(filesResult.content[0].text)
  console.log(`Found ${filesData.files.length} living context file(s):`)
  filesData.files.forEach((f: any) => {
    console.log(`  - ${f.fileName}: ${f.title} (Updated: ${f.updatedAt})`)
  })

  // 3. Get board cards
  console.log(`\n📋 [3/6] Calling get_board_cards for "${activeBoard.title}"...`)
  const cardsResult: any = await client.callTool({
    name: 'get_board_cards',
    arguments: { boardId },
  })
  const columns = JSON.parse(cardsResult.content[0].text)
  columns.forEach((col: any) => {
    console.log(`  Column: [${col.columnTitle}] (${col.cards.length} cards)`)
    col.cards.forEach((c: any) => {
      console.log(`    * [${c.priority}] ${c.title} (${c.id})`)
    })
  })

  // 4. Create an Antigravity task card
  console.log(`\n📝 [4/6] Creating Antigravity Verification Card in "To Do"...`)
  const createResult: any = await client.callTool({
    name: 'create_card',
    arguments: {
      boardId,
      columnTitle: 'To Do',
      title: 'Antigravity Direct MCP Agent Integration',
      description: `### 🎯 Objective\nVerify that Antigravity can directly connect and manipulate NeoKanban boards using the user PAT.\n\n### 📋 Acceptance Criteria\n- [ ] Connected via MCP stdio transport\n- [ ] Verified PAT authentication\n- [ ] Checklist and Comment logged`,
      priority: 'HIGH',
      tags: ['antigravity', 'mcp-direct', 'ai-agent'],
    },
  })
  console.log('✅ ' + createResult.content[0].text)

  // Re-fetch cards to find the created one
  const refetchCards: any = await client.callTool({
    name: 'get_board_cards',
    arguments: { boardId, columnTitle: 'To Do' },
  })
  const todoCols = JSON.parse(refetchCards.content[0].text)
  const myCard = todoCols[0]?.cards.find((c: any) => c.title === 'Antigravity Direct MCP Agent Integration')

  if (myCard) {
    // 5. Add checklist & comment
    console.log(`\n☑️ [5/6] Adding subtask checklist to card "${myCard.title}"...`)
    await client.callTool({
      name: 'manage_checklist',
      arguments: {
        cardId: myCard.id,
        action: 'add',
        title: 'Authenticate using User PAT key',
      },
    })
    console.log('✅ Checklist subtask added.')

    console.log(`\n💬 [6/6] Logging comment from Antigravity agent...`)
    const commentResult: any = await client.callTool({
      name: 'add_card_comment',
      arguments: {
        cardId: myCard.id,
        authorName: 'Antigravity (Direct MCP)',
        content: `**Status:** \`[CONNECTED]\`\n\n**📝 Actions:**\n- Successfully authenticated via user PAT (\`neokan_pat_044...71ef\`).\n- Read board hierarchy and living context documents.\n- Created verification task with subtask checklist.\n\n**🤖 Agent:** Antigravity AI Assistant`,
      },
    })
    console.log('✅ ' + commentResult.content[0].text)
  }

  await client.close()
  console.log('\n🎉 DIRECT MCP TEST WITH USER PAT COMPLETED SUCCESSFULLY!')
}

main().catch((err) => {
  console.error('❌ MCP Error:', err)
  process.exit(1)
})
