import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { title, colorCode } = await req.json()

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Column title is required' }, { status: 400 })
    }

    const board = await prisma.board.findUnique({
      where: { id },
    })

    if (!board || board.ownerId !== user.id) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const maxOrder = await prisma.column.findFirst({
      where: { boardId: id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const order = maxOrder ? maxOrder.order + 1 : 0

    const column = await prisma.column.create({
      data: {
        boardId: id,
        title: title.trim(),
        colorCode: colorCode || '#64748b',
        order,
      },
      include: {
        cards: {
          include: {
            checklists: true,
            _count: { select: { comments: true } },
          },
        },
      },
    })

    return NextResponse.json({ column }, { status: 201 })
  } catch (error: any) {
    console.error('Create column error:', error)
    return NextResponse.json({ error: 'Failed to create column' }, { status: 500 })
  }
}
