import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Boards accessible by current user
    const accessibleBoards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      select: { id: true },
    })

    const boardIds = accessibleBoards.map((b) => b.id)

    // Find cards in review columns for these boards
    const reviewCards = await prisma.card.findMany({
      where: {
        column: {
          boardId: { in: boardIds },
          title: { in: ['Review', 'In Review'], mode: 'insensitive' },
        },
      },
      include: {
        column: {
          include: {
            board: {
              select: { id: true, title: true },
            },
          },
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        checklists: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      cards: reviewCards,
      total: reviewCards.length,
    })
  } catch (error) {
    console.error('Error fetching review cards:', error)
    return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 })
  }
}
