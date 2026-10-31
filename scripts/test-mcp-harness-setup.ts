import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import fs from 'fs'
import path from 'path'

const API_BASE_URL = process.env.NEOKANBAN_API_URL || 'https://neoproject.my.id/neokanban'
const PAT_TOKEN =
  process.env.NEOKANBAN_PAT ||
  (() => {
    try {
      const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '.neokanban.json'), 'utf-8'))
      return config.patToken || ''
    } catch {
      return ''
    }
  })()

const SANDBOX_DIR = path.resolve(process.cwd(), 'test-sandbox')

async function cleanupDirectory(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    await fs.promises.rm(dirPath, { recursive: true, force: true })
  }
}

async function runHarnessSetupE2ETest() {
  console.log('====================================================')
  console.log('🧪 Starting MCP Harness Setup & Safe Upgrade Test Suite')
  console.log('====================================================\n')

  // Step 0: Ensure fresh sandbox
  await cleanupDirectory(SANDBOX_DIR)

  const serverScript = path.resolve(process.cwd(), 'mcp/dist/index.js')
  if (!fs.existsSync(serverScript)) {
    throw new Error(`MCP server script not found at ${serverScript}. Please build MCP first.`)
  }

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverScript],
    env: {
      NEOKANBAN_API_URL: API_BASE_URL,
      NEOKANBAN_PAT: PAT_TOKEN,
    },
  })

  const client = new Client(
    { name: 'Harness-Setup-Tester', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)
  console.log('✅ Connected to MCP Server via stdio')

  // 1. Verify tools exist on server
  console.log('\n[1/5] Listing available MCP tools...')
  const toolsRes = await client.listTools()
  const toolNames = toolsRes.tools.map((t) => t.name)

  if (!toolNames.includes('setup_project_harness')) {
    throw new Error('Tool "setup_project_harness" is not registered on MCP Server!')
  }
  if (!toolNames.includes('upgrade_harness')) {
    throw new Error('Tool "upgrade_harness" is not registered on MCP Server!')
  }
  console.log('  ✓ "setup_project_harness" is registered')
  console.log('  ✓ "upgrade_harness" is registered')

  let createdBoardId: string | null = null

  try {
    // 2. Call setup_project_harness
    console.log('\n[2/5] Calling setup_project_harness...')
    const setupResult = await client.callTool({
      name: 'setup_project_harness',
      arguments: {
        boardTitle: 'Test MCP Harness Sandbox Board',
        targetDir: 'test-sandbox',
        stackType: 'monorepo',
        authorRole: 'all-roles',
        token: PAT_TOKEN,
      },
    })

    const setupText = (setupResult.content as any)[0]?.text || ''
    console.log('Output:\n' + setupText)

    // Extract boardId from output
    const match = setupText.match(/ID: `([^`]+)`/)
    if (match && match[1]) {
      createdBoardId = match[1]
      console.log(`  ✓ Board ID resolved: ${createdBoardId}`)
    }

    // 3. Verify Sandbox Filesystem
    console.log('\n[3/5] Verifying scaffolded files in test-sandbox...')
    const requiredFiles = [
      '.agents/skills',
      '.agents/rules',
      'docs/context/INDEX.md',
      'docs/context/ARCHITECTURE.md',
      'scripts/kanban.ts',
      'AGENTS.md',
      'HARNESS.md',
      '.neokanban.json',
      '.gitignore',
      'client/.gitkeep',
      'server/.gitkeep',
    ]

    for (const file of requiredFiles) {
      const fullPath = path.resolve(SANDBOX_DIR, file)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Expected file or directory does not exist: ${file}`)
      }
      console.log(`  ✓ File verified: ${file}`)
    }

    // Verify .neokanban.json content
    const neokanbanJson = JSON.parse(
      fs.readFileSync(path.resolve(SANDBOX_DIR, '.neokanban.json'), 'utf-8')
    )
    if (neokanbanJson.boardId !== createdBoardId) {
      throw new Error(
        `Mismatch boardId in .neokanban.json: expected ${createdBoardId}, got ${neokanbanJson.boardId}`
      )
    }
    if (neokanbanJson.stackType !== 'monorepo') {
      throw new Error(`Mismatch stackType in .neokanban.json: got ${neokanbanJson.stackType}`)
    }
    console.log('  ✓ .neokanban.json correctly structured')

    // Verify .gitignore content
    const gitignoreContent = fs.readFileSync(
      path.resolve(SANDBOX_DIR, '.gitignore'),
      'utf-8'
    )
    if (!gitignoreContent.includes('.neokanban.json')) {
      throw new Error('.gitignore does not include .neokanban.json')
    }
    console.log('  ✓ .gitignore properly secured credentials')

    // 4. Verify Living Context API
    if (createdBoardId) {
      console.log('\n[4/5] Verifying Living Context synced to NeoKanban Board...')
      const ctxUrl = `${API_BASE_URL}/api/boards/${createdBoardId}/context`
      const ctxRes = await fetch(ctxUrl, {
        headers: { Authorization: `Bearer ${PAT_TOKEN}` },
      })
      if (!ctxRes.ok) {
        throw new Error(`Failed to fetch board context: ${ctxRes.statusText}`)
      }
      const ctxData = (await ctxRes.json()) as { documents: any[] }
      console.log(`  ✓ Synced Living Context documents count: ${ctxData.documents?.length || 0}`)
      if (!ctxData.documents || ctxData.documents.length === 0) {
        throw new Error('No context documents found on NeoKanban board!')
      }
    }

    // 5. Test upgrade_harness (Safe Selective Upgrade)
    console.log('\n[5/5] Testing upgrade_harness with protected user context...')
    const customUserFile = path.resolve(SANDBOX_DIR, 'docs/context/FEATURE_CUSTOM.md')
    const customContent = '# Custom User Feature\nThis should never be overwritten.'
    fs.writeFileSync(customUserFile, customContent, 'utf-8')

    // Modify ARCHITECTURE.md with user edits
    const archFile = path.resolve(SANDBOX_DIR, 'docs/context/ARCHITECTURE.md')
    const modifiedArchContent = '# User Modified Architecture'
    fs.writeFileSync(archFile, modifiedArchContent, 'utf-8')

    const upgradeResult = await client.callTool({
      name: 'upgrade_harness',
      arguments: {
        targetDir: 'test-sandbox',
      },
    })

    const upgradeText = (upgradeResult.content as any)[0]?.text || ''
    console.log('Output:\n' + upgradeText)

    // Verify preserved files
    const preservedArch = fs.readFileSync(archFile, 'utf-8')
    if (preservedArch !== modifiedArchContent) {
      throw new Error('docs/context/ARCHITECTURE.md was overwritten during upgrade!')
    }
    console.log('  ✓ Protected file docs/context/ARCHITECTURE.md preserved!')

    const preservedCustom = fs.readFileSync(customUserFile, 'utf-8')
    if (preservedCustom !== customContent) {
      throw new Error('docs/context/FEATURE_CUSTOM.md was altered during upgrade!')
    }
    console.log('  ✓ Custom file docs/context/FEATURE_CUSTOM.md preserved!')

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!')
  } finally {
    // Teardown: close MCP client
    await client.close()

    // Clean up created board if applicable
    if (createdBoardId) {
      console.log(`\n🧹 Cleaning up test board ${createdBoardId}...`)
      try {
        const delRes = await fetch(`${API_BASE_URL}/api/boards/${createdBoardId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${PAT_TOKEN}` },
        })
        if (delRes.ok) {
          console.log(`  ✓ Board ${createdBoardId} deleted successfully.`)
        } else {
          console.log(`  Note: Board deletion returned ${delRes.status}`)
        }
      } catch (err) {
        console.error('  Failed to clean up test board:', err)
      }
    }

    // Clean up test-sandbox directory
    console.log('🧹 Cleaning up test-sandbox directory...')
    await cleanupDirectory(SANDBOX_DIR)
    console.log('  ✓ test-sandbox removed.')
  }
}

runHarnessSetupE2ETest().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err)
  process.exit(1)
})

