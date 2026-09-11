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

  const comments = await prisma.comment.findMany({
    where: { cardId: id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ comments })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { content, isAiGenerated, authorName } = await req.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    const card = await prisma.card.findUnique({
      where: { id },
      include: { column: { include: { board: true } } },
    })

    if (!card || card.column.board.ownerId !== user.id) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        cardId: id,
        userId: isAiGenerated ? null : user.id,
        authorName: authorName?.trim() || user.name,
        isAiGenerated: Boolean(isAiGenerated),
        content: content.trim(),
      },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error: any) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
