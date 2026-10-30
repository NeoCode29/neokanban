import { POST } from '../src/app/api/skills/route'
import { prisma } from '../src/lib/prisma'

async function testNullByteSanitization() {
  console.log('--- Testing PostgreSQL 0x00 Null Byte Sanitization ---')

  // Set mock authenticated user
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found in database for test')
  }

  process.env.TEST_AUTH_USER = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
  })

  // Craft a request containing null byte \0 (which previously crashed PostgreSQL with 22021)
  const payloadWithNullBytes = {
    name: `Test Null Byte Skill \0 Sanitized`,
    description: `Description with \0 null \0 byte`,
    category: `Testing`,
    targetRole: `FULLSTACK`,
    files: [
      {
        filePath: `SKILL.md\0`,
        content: `# Skill Title\0\nThis content had a null byte \0 in UTF-8.`,
      },
      {
        filePath: `examples/test.ts`,
        content: `export const val = "safe \0 clean";`,
      },
    ],
  }

  const req = new Request('http://localhost:3000/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadWithNullBytes),
  })

  const res = await POST(req)
  console.log('POST Response status:', res.status)

  const json = await res.json()
  if (res.status !== 201) {
    console.error('Error response:', json)
    throw new Error(`Expected 201 Created, got ${res.status}: ${json.error || JSON.stringify(json)}`)
  }

  console.log('✅ Created skill with null bytes successfully:', json.skill.id, json.skill.name)

  // Verify that null bytes are stripped in database
  const created = await prisma.skill.findUnique({
    where: { id: json.skill.id },
    include: { files: true },
  })

  if (!created) throw new Error('Skill not found in database')
  if (created.name.includes('\0') || created.description.includes('\0')) {
    throw new Error('Null byte was not stripped from skill record!')
  }
  for (const f of created.files) {
    if (f.filePath.includes('\0') || f.content.includes('\0')) {
      throw new Error(`Null byte was not stripped from file ${f.filePath}!`)
    }
  }

  console.log('✅ Verified zero null bytes stored in PostgreSQL!')

  // Cleanup test record
  await prisma.skill.delete({ where: { id: created.id } })
  console.log('✅ Test record cleaned up.')

  console.log('🎉 PostgreSQL 0x00 Null Byte Sanitization Test PASSED!')
}

testNullByteSanitization()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

