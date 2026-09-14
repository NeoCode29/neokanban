import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Priority } from '@prisma/client'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { columnId, title, description, priority, tags } = await req.json()

    if (!columnId || !title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Column ID and title are required' }, { status: 400 })
    }

    // Verify column exists and user has access to board
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    })

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    const { hasBoardAccess } = await import('@/lib/board-auth')
    const access = await hasBoardAccess(column.boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    // Find highest order in this column
    const maxOrderCard = await prisma.card.findFirst({
      where: { columnId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const order = maxOrderCard ? maxOrderCard.order + 1 : 0

    const card = await prisma.card.create({
      data: {
        columnId,
        title: title.trim(),
        description: description?.trim() || '',
        priority: (priority as Priority) || Priority.MEDIUM,
        tags: Array.isArray(tags) ? tags : [],
        order,
      },
      include: {
        checklists: true,
        _count: { select: { comments: true } },
      },
    })

    return NextResponse.json({ card }, { status: 201 })
  } catch (error: any) {
    console.error('Create card error:', error)
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 })
  }
}
