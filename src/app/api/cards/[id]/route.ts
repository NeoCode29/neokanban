import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Priority } from '@prisma/client'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      column: {
        include: {
          board: true,
        },
      },
      checklists: {
        orderBy: { order: 'asc' },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!card || card.column.board.ownerId !== user.id) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  return NextResponse.json({ card })
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
  const { title, description, priority, dueDate, tags } = await req.json()

  try {
    const existing = await prisma.card.findUnique({
      where: { id },
      include: { column: { include: { board: true } } },
    })

    if (!existing || existing.column.board.ownerId !== user.id) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const updated = await prisma.card.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priority !== undefined ? { priority: priority as Priority } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : [] } : {}),
      },
      include: {
        checklists: { orderBy: { order: 'asc' } },
        _count: { select: { comments: true } },
      },
    })

    return NextResponse.json({ card: updated })
  } catch (error: any) {
    console.error('Update card error:', error)
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.card.findUnique({
      where: { id },
      include: { column: { include: { board: true } } },
    })

    if (!existing || existing.column.board.ownerId !== user.id) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    await prisma.card.delete({ where: { id } })
    return NextResponse.json({ message: 'Card deleted successfully' })
  } catch (error: any) {
    console.error('Delete card error:', error)
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 })
  }
}
