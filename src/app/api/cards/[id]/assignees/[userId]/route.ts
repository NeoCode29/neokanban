import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: cardId, userId: targetUserId } = await params

  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: {
          include: {
            board: true,
          },
        },
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const access = await hasBoardAccess(card.column.boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Access denied to this board' }, { status: 403 })
    }

    // Delete the assignment
    await prisma.cardAssignee.deleteMany({
      where: {
        cardId,
        userId: targetUserId,
      },
    })

    // Fetch full updated card to sync client state seamlessly
    const updatedCard = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        checklists: { orderBy: { order: 'asc' } },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: { select: { comments: true } },
      },
    })

    return NextResponse.json({ message: 'Assignee removed successfully', card: updatedCard })
  } catch (error: any) {
    console.error('Remove assignee error:', error)
    return NextResponse.json({ error: 'Failed to remove assignee' }, { status: 500 })
  }
}
