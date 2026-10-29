import JSZip from 'jszip'

// Test script for ZIP creation and unpacking used in UploadSkillModal
async function testZipUploadLogic() {
  console.log('--- Testing Skill ZIP Extraction Logic ---')

  const sampleZip = new JSZip()
  sampleZip.file(
    'SKILL.md',
    `---
name: "Custom Testing Skill"
description: "A wonderful custom testing skill"
category: "Testing"
role: "BACKEND_SPECIALIST"
---

# Instructions
Follow these steps strictly.`
  )
  sampleZip.file('examples/sample.spec.ts', 'console.log("running spec");')
  sampleZip.file('references/docs.md', '# Additional documentation')

  const buffer = await sampleZip.generateAsync({ type: 'nodebuffer' })
  console.log(`Generated sample zip (${buffer.length} bytes)`)

  // Unpack
  const unpacked = await JSZip.loadAsync(buffer)
  const entries = Object.keys(unpacked.files).filter((k) => !unpacked.files[k].dir)
  console.log('Unpacked entries (excluding dirs):', entries)

  if (entries.length !== 3) {
    throw new Error(`Expected 3 files, got ${entries.length}`)
  }

  // Parse frontmatter
  const skillMdContent = await unpacked.file('SKILL.md')?.async('string')
  if (!skillMdContent) {
    throw new Error('SKILL.md not found in unpacked zip')
  }

  const nameMatch = skillMdContent.match(/name:\s*([^\n\r]+)/i)
  const descMatch = skillMdContent.match(/description:\s*([^\n\r]+)/i)
  const roleMatch = skillMdContent.match(/role:\s*([^\n\r]+)/i)

  const parsedName = nameMatch?.[1]?.replace(/^['"]|['"]$/g, '')
  const parsedDesc = descMatch?.[1]?.replace(/^['"]|['"]$/g, '')
  const parsedRole = roleMatch?.[1]?.replace(/^['"]|['"]$/g, '')

  console.log('Extracted name:', parsedName)
  console.log('Extracted description:', parsedDesc)
  console.log('Extracted role:', parsedRole)

  if (parsedName !== 'Custom Testing Skill') {
    throw new Error(`Expected name "Custom Testing Skill", got "${parsedName}"`)
  }
  if (parsedRole !== 'BACKEND_SPECIALIST') {
    throw new Error(`Expected role "BACKEND_SPECIALIST", got "${parsedRole}"`)
  }

  console.log('✅ ZIP upload & frontmatter extraction logic verified!')
}

testZipUploadLogic().catch((err) => {
  console.error('❌ Test failed:', err.message)
  process.exit(1)
})
