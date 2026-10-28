import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'path'

async function runMcpTest() {
  console.log('--- Testing Built NeoKanban MCP Server ---')

  const serverScript = path.resolve(process.cwd(), 'mcp/dist/index.js')
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverScript],
    env: {
      NEOKANBAN_API_URL: 'https://neoproject.my.id/neokanban',
      NEOKANBAN_PAT: 'neokan_pat_05cd0774759859f00a8df6342b422255e733f803d6d7e6f6',
    },
  })

  const client = new Client(
    { name: 'NeoKanban-Verification-Client', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)
  console.log('✅ Connected to MCP server via stdio!')

  // 1. List tools
  const toolsResponse = await client.listTools()
  console.log(`📋 Total Registered Tools: ${toolsResponse.tools.length}`)
  const hasUpdateMemberRole = toolsResponse.tools.some((t) => t.name === 'update_member_role')
  console.log('Contains update_member_role:', hasUpdateMemberRole)

  if (!hasUpdateMemberRole) {
    throw new Error('Tool update_member_role is missing!')
  }

  // 2. Call list_board_members
  const listMembersRes = await client.callTool({
    name: 'list_board_members',
    arguments: {
      boardId: 'cmvrjkpyw007gvaavbia72oe5', // Sistem Neokan
    },
  })

  console.log('\nlist_board_members output:')
  console.log(JSON.stringify(listMembersRes, null, 2))

  console.log('\n✅ ALL MCP SERVER CHECKS PASSED!')
  await client.close()
  process.exit(0)
}

runMcpTest().catch((err) => {
  console.error('❌ MCP test failed:', err)
  process.exit(1)
})
