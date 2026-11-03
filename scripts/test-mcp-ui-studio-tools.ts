import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'path'
import fs from 'fs'

async function getPatToken(): Promise<string> {
  if (process.env.NEOKANBAN_PAT) return process.env.NEOKANBAN_PAT
  const configPath = path.resolve(process.cwd(), '.neokanban.json')
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (config.patToken) return config.patToken
    } catch {}
  }
  return 'dummy_pat_token_for_test'
}

async function main() {
  console.log('Testing MCP UI Studio Tools...')
  const token = await getPatToken()

  const serverModule = path.resolve(process.cwd(), 'mcp/dist/index.js')
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverModule],
    env: {
      ...process.env,
      NEOKANBAN_PAT: token,
      NEOKANBAN_API_URL: 'http://localhost:3000',
    },
  })

  const client = new Client(
    { name: 'test-ui-studio-client', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)
  console.log('Connected to MCP server.')

  const { tools } = await client.listTools()
  const toolNames = tools.map((t) => t.name)
  console.log('Available MCP tools count:', toolNames.length)

  const expectedTools = [
    'list_ui_components',
    'create_ui_component',
    'update_ui_component',
    'delete_ui_component',
    'list_ui_pages',
    'create_ui_page',
    'update_ui_page',
    'delete_ui_page',
  ]

  for (const name of expectedTools) {
    if (!toolNames.includes(name)) {
      throw new Error(`Expected MCP tool "${name}" not found in server tools!`)
    }
  }

  console.log('All 8 UI Studio MCP tools are registered successfully!')
  await client.close()
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
