import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: cardId } = await params
  const { userId: targetUserId } = await req.json()

  if (!targetUserId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    // 1. Find card and its board
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: {
          include: {
            board: {
              include: {
                members: { select: { userId: true } },
              },
            },
          },
        },
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const board = card.column.board
    const access = await hasBoardAccess(board.id, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Access denied to this board' }, { status: 403 })
    }

    // 2. Validate that target user is either the Board Owner or a Board Collaborator
    const isTargetOwner = board.ownerId === targetUserId
    const isTargetMember = board.members.some((m) => m.userId === targetUserId)

    if (!isTargetOwner && !isTargetMember) {
      return NextResponse.json(
        { error: 'User yang ingin ditugaskan harus menjadi anggota/pemilik dari board ini' },
        { status: 400 }
      )
    }

    // 3. Upsert assignee record
    const assignee = await prisma.cardAssignee.upsert({
      where: {
        cardId_userId: {
          cardId,
          userId: targetUserId,
        },
      },
      create: {
        cardId,
        userId: targetUserId,
      },
      update: {},
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    })

    // 4. Fetch full updated card to sync client state seamlessly
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

    return NextResponse.json({ assignee, card: updatedCard }, { status: 201 })
  } catch (error: any) {
    console.error('Assign user error:', error)
    return NextResponse.json({ error: 'Failed to assign user to card' }, { status: 500 })
  }
}
