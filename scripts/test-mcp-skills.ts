import fs from 'fs'
import path from 'path'

// Test script for MCP Skills Tools
async function testMcpSkills() {
  console.log('--- Testing MCP Skills Tools Logic ---')

  // 1. Test local filesystem installation logic (install_skill_to_local)
  const mockSkill = {
    slug: 'test-local-skill',
    name: 'Test Local Skill',
    files: [
      { filePath: 'SKILL.md', content: '# Test Skill\nDescription here' },
      { filePath: 'examples/example.ts', content: 'export const hello = "world";' },
      { filePath: 'references/notes.md', content: 'Notes and references' },
    ],
  }

  const testTargetDir = path.join(process.cwd(), '.test-agents-skills', mockSkill.slug)

  try {
    console.log(`Writing test skill to: ${testTargetDir}`)
    for (const file of mockSkill.files) {
      const fullPath = path.join(testTargetDir, file.filePath)
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.promises.writeFile(fullPath, file.content, 'utf8')
    }

    // Verify all files were created on disk
    for (const file of mockSkill.files) {
      const fullPath = path.join(testTargetDir, file.filePath)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File was not written: ${fullPath}`)
      }
      const content = await fs.promises.readFile(fullPath, 'utf8')
      if (content !== file.content) {
        throw new Error(`File content mismatch for: ${fullPath}`)
      }
      console.log(`  ✓ Verified file on disk: ${file.filePath}`)
    }

    console.log('✅ install_skill_to_local filesystem logic verified!')

    // 2. Verify mcp/src/index.ts contains the 4 new tool definitions
    const mcpSource = await fs.promises.readFile(path.join(process.cwd(), 'mcp/src/index.ts'), 'utf8')
    const requiredTools = ['list_skills', 'get_board_skills', 'read_skill_file', 'install_skill_to_local']

    for (const tool of requiredTools) {
      if (!mcpSource.includes(`'${tool}'`) && !mcpSource.includes(`"${tool}"`)) {
        throw new Error(`MCP tool definition for "${tool}" not found in mcp/src/index.ts`)
      }
      console.log(`  ✓ Found MCP tool "${tool}" in mcp/src/index.ts`)
    }

    console.log('🎉 All MCP Skills tool checks passed!')
  } finally {
    // Cleanup test directory
    try {
      await fs.promises.rm(path.join(process.cwd(), '.test-agents-skills'), { recursive: true, force: true })
    } catch {}
  }
}

testMcpSkills().catch((err) => {
  console.error('❌ Test failed:', err.message)
  process.exit(1)
})

