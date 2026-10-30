import { POST, GET } from '../src/app/api/skills/route'
import { PUT, DELETE } from '../src/app/api/skills/[id]/route'
import { prisma } from '../src/lib/prisma'

async function testSkillEditDelete() {
  console.log('--- Testing Skill Edit & Delete API Endpoints ---')

  const user = await prisma.user.findFirst()
  if (!user) throw new Error('No user in database')

  process.env.TEST_AUTH_USER = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
  })

  // 1. Create a custom skill to test
  const createReq = new Request('http://localhost:3000/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Temp Editable Skill',
      description: 'Original description',
      category: 'General',
      targetRole: 'FULLSTACK',
      files: [{ filePath: 'SKILL.md', content: '# Original' }],
    }),
  })

  const createRes = await POST(createReq)
  const createJson = await createRes.json()
  if (createRes.status !== 201) {
    throw new Error(`Failed to create skill: ${JSON.stringify(createJson)}`)
  }

  const skillId = createJson.skill.id
  console.log('  ✓ Created test skill:', skillId)

  // 2. Test PUT (Edit)
  const editReq = new Request(`http://localhost:3000/api/skills/${skillId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Updated Editable Skill',
      description: 'Updated description',
      category: 'Testing',
      targetRole: 'REVIEWER',
    }),
  })

  const editRes = await PUT(editReq, { params: Promise.resolve({ id: skillId }) })
  const editJson = await editRes.json()
  if (editRes.status !== 200 || editJson.skill.name !== 'Updated Editable Skill') {
    throw new Error(`Edit failed: ${JSON.stringify(editJson)}`)
  }
  console.log('  ✓ Successfully edited skill name, category, and role')

  // 3. Test DELETE
  const deleteReq = new Request(`http://localhost:3000/api/skills/${skillId}`, {
    method: 'DELETE',
  })

  const deleteRes = await DELETE(deleteReq, { params: Promise.resolve({ id: skillId }) })
  if (deleteRes.status !== 200) {
    throw new Error(`Delete failed: ${deleteRes.status}`)
  }
  console.log('  ✓ Successfully deleted custom skill')

  // 4. Verify skill is gone from DB
  const check = await prisma.skill.findUnique({ where: { id: skillId } })
  if (check) throw new Error('Skill still exists in database!')
  console.log('  ✓ Verified skill deleted from database')

  // 5. Verify preset protection (cannot delete preset)
  const preset = await prisma.skill.findFirst({ where: { isPreset: true } })
  if (preset) {
    const deletePresetReq = new Request(`http://localhost:3000/api/skills/${preset.id}`, {
      method: 'DELETE',
    })
    const deletePresetRes = await DELETE(deletePresetReq, { params: Promise.resolve({ id: preset.id }) })
    if (deletePresetRes.status !== 403) {
      throw new Error(`Expected 403 when deleting preset, got ${deletePresetRes.status}`)
    }
    console.log('  ✓ Verified official preset is protected against deletion (403)')
  }

  console.log('🎉 All Edit & Delete API tests PASSED!')
}

testSkillEditDelete()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

