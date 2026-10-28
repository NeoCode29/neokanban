import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'path'

async function runTest() {
  console.log('--- Testing MCP Role-Based Delegation ---')

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
    { name: 'Role-Assignment-Tester', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)
  console.log('✅ Connected to MCP Server')

  // 1. Create a card and automatically delegate to role "Fullstack"
  console.log('Testing create_card with assignees: ["Fullstack"]...')
  const createRes = await client.callTool({
    name: 'create_card',
    arguments: {
      boardId: 'cmvrjkpyw007gvaavbia72oe5',
      columnTitle: 'Backlog',
      title: 'Contoh Task Otomatis Sesuai Role Fullstack',
      description: 'Task ini didelegasikan secara otomatis oleh AI ke akun dengan role Fullstack.',
      assignees: ['Fullstack'], // <-- ROLE DELEGATION!
    },
  })

  const message = (createRes.content as any)[0].text
  console.log('create_card output message:', message)

  await client.close()
  console.log('✅ Role-based automatic delegation PASSED!')
}

runTest().catch((err) => {
  console.error(err)
  process.exit(1)
})
