import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'

// In-memory rate limiting map: ip -> { count: number, resetAt: number }
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60 * 1000

// Constant-time dummy hash to mitigate user enumeration timing attacks
const DUMMY_HASH = '$2a$10$wK6n2Z1QO7n6L0qV1R3Yy.8BfU0q2N4x7k9J1L3M5O7P9Q1R3S5T'

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || '127.0.0.1'
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const now = Date.now()

  // 1. Check rate limit
  const record = loginAttempts.get(ip)
  if (record && record.resetAt > now) {
    if (record.count >= MAX_ATTEMPTS) {
      const waitSeconds = Math.ceil((record.resetAt - now) / 1000)
      return NextResponse.json(
        { error: `Too many failed login attempts. Please try again in ${waitSeconds} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(waitSeconds) },
        }
      )
    }
  } else if (record && record.resetAt <= now) {
    loginAttempts.delete(ip)
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    })

    // 2. Timing attack mitigation: always execute bcrypt compare
    let isMatch = false
    if (user) {
      isMatch = await verifyPassword(password, user.passwordHash)
    } else {
      await verifyPassword(password, DUMMY_HASH)
    }

    if (!user || !isMatch) {
      // Increment failed attempt counter
      const current = loginAttempts.get(ip)
      if (current && current.resetAt > now) {
        current.count += 1
      } else {
        loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
      }

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Reset rate limit on successful login
    loginAttempts.delete(ip)

    const token = await createSession(user.id)
    await setSessionCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      message: 'Logged in successfully',
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 })
  }
}
