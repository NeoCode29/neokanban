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
    const { targetColumnId, targetOrder } = await req.json()

    if (!targetColumnId || typeof targetOrder !== 'number') {
      return NextResponse.json(
        { error: 'targetColumnId and targetOrder are required' },
        { status: 400 }
      )
    }

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        column: {
          include: { board: true },
        },
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const { hasBoardAccess } = await import('@/lib/board-auth')
    const access = await hasBoardAccess(card.column.boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 404 })
    }

    // Verify target column belongs to same board
    const targetColumn = await prisma.column.findUnique({
      where: { id: targetColumnId },
    })

    if (!targetColumn || targetColumn.boardId !== card.column.boardId) {
      return NextResponse.json({ error: 'Invalid target column' }, { status: 400 })
    }

    // Perform atomic re-indexing
    await prisma.$transaction(async (tx) => {
      // 1. Shift target column cards down to make room
      await tx.card.updateMany({
        where: {
          columnId: targetColumnId,
          order: { gte: targetOrder },
          id: { not: id },
        },
        data: {
          order: { increment: 1 },
        },
      })

      // 2. Move card to target column and order
      await tx.card.update({
        where: { id },
        data: {
          columnId: targetColumnId,
          order: targetOrder,
        },
      })

      // 3. Compact source column if different
      if (card.columnId !== targetColumnId) {
        await tx.card.updateMany({
          where: {
            columnId: card.columnId,
            order: { gt: card.order },
          },
          data: {
            order: { decrement: 1 },
          },
        })
      }
    })

    return NextResponse.json({ message: 'Card moved successfully' })
  } catch (error: any) {
    console.error('Move card error:', error)
    return NextResponse.json({ error: 'Failed to move card' }, { status: 500 })
  }
}
