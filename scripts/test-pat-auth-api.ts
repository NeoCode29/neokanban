import { prisma } from '../src/lib/prisma'
import crypto from 'crypto'

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

async function testPatApi() {
  console.log('🧪 Testing Next.js API with PAT Bearer Token...')

  // 1. Get or create test user and token
  const user = await prisma.user.findUnique({
    where: { email: 'kresna@example.com' },
  })
  if (!user) throw new Error('User not found')

  const rawToken = `neokan_pat_${crypto.randomBytes(24).toString('hex')}`
  const tokenHash = hashToken(rawToken)
  const tokenHint = `${rawToken.slice(0, 15)}...${rawToken.slice(-4)}`

  const pat = await prisma.personalAccessToken.create({
    data: {
      userId: user.id,
      name: 'API Test Token',
      tokenHash,
      tokenHint,
    },
  })

  try {
    // 2. Call GET /api/boards via HTTP
    const res = await fetch('http://localhost:3000/api/boards', {
      headers: {
        Authorization: `Bearer ${rawToken}`,
      },
    })

    console.log(`HTTP Status: ${res.status} ${res.statusText}`)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`API call failed: ${err}`)
    }

    const data = await res.json()
    console.log(`✅ Successfully authenticated via PAT! Found ${data.boards?.length} board(s).`)
    console.log(`First board title: "${data.boards?.[0]?.title}"`)
  } finally {
    await prisma.personalAccessToken.delete({
      where: { id: pat.id },
    })
    console.log('🧹 Cleaned up test PAT.')
  }
}

testPatApi()
  .catch((err) => {
    console.error('❌ PAT API test failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
