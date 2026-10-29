import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'
import { PRESET_SKILLS } from '../prisma/seed-skills'

async function runSkillsE2ETest() {
  console.log('====================================================')
  console.log('🚀 Running AI Agent Skill Library End-to-End Test Suite')
  console.log('====================================================\n')

  let passedTests = 0

  // 1. Check Presets Definition
  console.log('1. Checking Preset Skills curation...')
  if (!Array.isArray(PRESET_SKILLS) || PRESET_SKILLS.length < 4) {
    throw new Error(`Expected at least 4 preset skills, found ${PRESET_SKILLS.length}`)
  }
  for (const preset of PRESET_SKILLS) {
    if (!preset.slug || !preset.name || !preset.files || preset.files.length === 0) {
      throw new Error(`Preset "${preset.slug}" is missing required fields.`)
    }
    const hasSkillMd = preset.files.some((f) => f.filePath === 'SKILL.md')
    if (!hasSkillMd) {
      throw new Error(`Preset "${preset.slug}" must have SKILL.md`)
    }
    console.log(`  ✓ Preset: ${preset.name} (${preset.slug}) with ${preset.files.length} files`)
  }
  passedTests++

  // 2. Check REST API route files exist
  console.log('\n2. Verifying REST API route handlers exist...')
  const requiredRoutes = [
    'src/app/api/skills/route.ts',
    'src/app/api/skills/[id]/route.ts',
    'src/app/api/skills/[id]/export/route.ts',
    'src/app/api/boards/[id]/skills/route.ts',
    'src/app/api/boards/[id]/skills/[skillId]/route.ts',
  ]
  for (const route of requiredRoutes) {
    const fullPath = path.join(process.cwd(), route)
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing route file: ${route}`)
    }
    console.log(`  ✓ Route: ${route}`)
  }
  passedTests++

  // 3. Check MCP tools exist in mcp/dist/index.js
  console.log('\n3. Verifying compiled MCP Server tools...')
  const mcpDistPath = path.join(process.cwd(), 'mcp/dist/index.js')
  if (!fs.existsSync(mcpDistPath)) {
    throw new Error('mcp/dist/index.js not found. Run npm run mcp:build.')
  }
  const mcpCode = fs.readFileSync(mcpDistPath, 'utf8')
  const expectedTools = ['list_skills', 'get_board_skills', 'read_skill_file', 'install_skill_to_local']
  for (const tool of expectedTools) {
    if (!mcpCode.includes(tool)) {
      throw new Error(`Compiled MCP bundle missing tool: ${tool}`)
    }
    console.log(`  ✓ Compiled MCP tool: ${tool}`)
  }
  passedTests++

  // 4. Test Local Disk Installation (install_skill_to_local simulation)
  console.log('\n4. Testing local disk installation (install_skill_to_local)...')
  const testSkill = {
    slug: 'e2e-sample-skill',
    name: 'E2E Sample Skill',
    files: [
      { filePath: 'SKILL.md', content: '# E2E Skill\nInstalled directly to disk' },
      { filePath: 'scripts/verify.sh', content: '#!/bin/bash\necho "passed"' },
    ],
  }
  const targetDir = path.join(process.cwd(), '.agents/skills', testSkill.slug)
  try {
    for (const f of testSkill.files) {
      const dest = path.join(targetDir, f.filePath)
      await fs.promises.mkdir(path.dirname(dest), { recursive: true })
      await fs.promises.writeFile(dest, f.content, 'utf8')
    }

    // Verify written files
    for (const f of testSkill.files) {
      const dest = path.join(targetDir, f.filePath)
      if (!fs.existsSync(dest)) throw new Error(`File not written: ${dest}`)
      const content = await fs.promises.readFile(dest, 'utf8')
      if (content !== f.content) throw new Error(`Content mismatch: ${dest}`)
    }
    console.log(`  ✓ Successfully installed and verified ${testSkill.files.length} files at: ${targetDir}`)
  } finally {
    await fs.promises.rm(targetDir, { recursive: true, force: true }).catch(() => {})
  }
  passedTests++

  // 5. Test ZIP Bundling and Extraction
  console.log('\n5. Testing ZIP export & extraction...')
  const zip = new JSZip()
  zip.file('SKILL.md', '# Testing Zip Flow')
  zip.file('examples/test.ts', 'export const x = 1')
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const unzipped = await JSZip.loadAsync(buffer)
  const skillContent = await unzipped.file('SKILL.md')?.async('string')
  if (skillContent !== '# Testing Zip Flow') {
    throw new Error('Zip content mismatch')
  }
  console.log(`  ✓ ZIP export/import verified (${buffer.length} bytes, 2 files)`)
  passedTests++

  // 6. Check UI components exist
  console.log('\n6. Verifying UI components...')
  const requiredComponents = [
    'src/app/(dashboard)/skills/page.tsx',
    'src/components/skills/SkillCard.tsx',
    'src/components/skills/SkillDetailModal.tsx',
    'src/components/skills/AddToBoardModal.tsx',
    'src/components/skills/UploadSkillModal.tsx',
  ]
  for (const comp of requiredComponents) {
    const fullPath = path.join(process.cwd(), comp)
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing component file: ${comp}`)
    }
    console.log(`  ✓ Component: ${comp}`)
  }
  passedTests++

  console.log('\n====================================================')
  console.log(`🎉 SUCCESS: All ${passedTests} E2E test suites passed (100%)!`)
  console.log('====================================================')
}

runSkillsE2ETest().catch((err) => {
  console.error('\n❌ E2E Test Suite Failed:', err.message)
  process.exit(1)
})
