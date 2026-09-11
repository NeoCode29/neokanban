import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const board = await prisma.board.findUnique({
    where: { id },
    include: { projectContext: true },
  })

  if (!board || board.ownerId !== user.id) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  return NextResponse.json({ context: board.projectContext })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const board = await prisma.board.findUnique({
      where: { id },
    })

    if (!board || board.ownerId !== user.id) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const {
      guidelinesMarkdown,
      techStackMarkdown,
      conventionsMarkdown,
      messagingStandards,
    } = await req.json()

    const context = await prisma.projectContext.upsert({
      where: { boardId: id },
      update: {
        ...(guidelinesMarkdown !== undefined ? { guidelinesMarkdown } : {}),
        ...(techStackMarkdown !== undefined ? { techStackMarkdown } : {}),
        ...(conventionsMarkdown !== undefined ? { conventionsMarkdown } : {}),
        ...(messagingStandards !== undefined ? { messagingStandards } : {}),
      },
      create: {
        boardId: id,
        guidelinesMarkdown: guidelinesMarkdown || '',
        techStackMarkdown: techStackMarkdown || '',
        conventionsMarkdown: conventionsMarkdown || '',
        messagingStandards: messagingStandards || '',
      },
    })

    return NextResponse.json({ context })
  } catch (error: any) {
    console.error('Update context error:', error)
    return NextResponse.json({ error: 'Failed to update project context' }, { status: 500 })
  }
}
