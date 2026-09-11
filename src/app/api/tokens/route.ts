import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePat } from '@/lib/pat'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tokens = await prisma.personalAccessToken.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      tokenHint: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ tokens })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name } = await req.json()
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Token name is required' }, { status: 400 })
    }

    const result = await generatePat(user.id, name.trim())
    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Create token error:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
