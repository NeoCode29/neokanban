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
    const { title } = await req.json()
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Checklist title is required' }, { status: 400 })
    }

    const card = await prisma.card.findUnique({
      where: { id },
      include: { column: { include: { board: true } } },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const { hasBoardAccess } = await import('@/lib/board-auth')
    const access = await hasBoardAccess(card.column.boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 404 })
    }

    const maxOrder = await prisma.checklistItem.findFirst({
      where: { cardId: id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const order = maxOrder ? maxOrder.order + 1 : 0

    const item = await prisma.checklistItem.create({
      data: {
        cardId: id,
        title: title.trim(),
        order,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error: any) {
    console.error('Create checklist error:', error)
    return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 })
  }
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
    const { itemId, isCompleted, title } = await req.json()

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { card: { include: { column: { include: { board: true } } } } },
    })

    if (!item || item.cardId !== id) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const { hasBoardAccess } = await import('@/lib/board-auth')
    const access = await hasBoardAccess(item.card.column.boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Checklist item not found or access denied' }, { status: 404 })
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(isCompleted !== undefined ? { isCompleted: Boolean(isCompleted) } : {}),
        ...(title !== undefined ? { title: title.trim() } : {}),
      },
    })

    return NextResponse.json({ item: updated })
  } catch (error: any) {
    console.error('Update checklist error:', error)
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')

  if (!itemId) {
    return NextResponse.json({ error: 'itemId query param required' }, { status: 400 })
  }

  try {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { card: { include: { column: { include: { board: true } } } } },
    })

    if (!item || item.cardId !== id) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const { hasBoardAccess } = await import('@/lib/board-auth')
    const access = await hasBoardAccess(item.card.column.boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Checklist item not found or access denied' }, { status: 404 })
    }

    await prisma.checklistItem.delete({ where: { id: itemId } })
    return NextResponse.json({ message: 'Item deleted' })
  } catch (error: any) {
    console.error('Delete checklist error:', error)
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 })
  }
}
