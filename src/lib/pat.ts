import crypto from 'crypto'
import { prisma } from './prisma'

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export async function generatePat(userId: string, name: string) {
  const randomHex = crypto.randomBytes(24).toString('hex')
  const rawToken = `neokan_pat_${randomHex}`
  const tokenHash = hashToken(rawToken)
  const tokenHint = `${rawToken.slice(0, 15)}...${rawToken.slice(-4)}`

  const tokenRecord = await prisma.personalAccessToken.create({
    data: {
      userId,
      name,
      tokenHash,
      tokenHint,
    },
    select: {
      id: true,
      name: true,
      tokenHint: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return {
    rawToken,
    tokenRecord,
  }
}

export async function validatePat(rawToken: string) {
  if (!rawToken || !rawToken.startsWith('neokan_pat_')) {
    return null
  }

  const tokenHash = hashToken(rawToken)

  const token = await prisma.personalAccessToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  })

  if (!token) return null

  // Update lastUsedAt asynchronously
  prisma.personalAccessToken
    .update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => console.error('Error updating PAT lastUsedAt:', err))

  return token.user
}
