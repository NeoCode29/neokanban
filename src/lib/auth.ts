import { cookies, headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from './prisma'
import crypto from 'crypto'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'neokanban-super-secret-jwt-key-2026-fallback-secret'
)
const COOKIE_NAME = 'neokanban_session'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string }
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  try {
    // 1. Check Authorization: Bearer header (for Personal Access Tokens / API / MCP clients)
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.replace('Bearer ', '').trim()
      if (rawToken.startsWith('neokan_pat_')) {
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
        const patRecord = await prisma.personalAccessToken.findUnique({
          where: { tokenHash },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
          },
        })

        if (patRecord?.user) {
          // Asynchronously update lastUsedAt
          prisma.personalAccessToken
            .update({
              where: { id: patRecord.id },
              data: { lastUsedAt: new Date() },
            })
            .catch(() => {})

          return patRecord.user
        }
      }
    }

    // 2. Fallback to Cookie Session (for Web browser users)
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const session = await verifySession(token)
    if (!session?.userId) return null

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    return user
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
