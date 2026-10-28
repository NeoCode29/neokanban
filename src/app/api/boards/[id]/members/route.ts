import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'
import { SPECIALIZATION_ROLES } from '@/lib/member-roles'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: boardId } = await params
  const access = await hasBoardAccess(boardId, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  return NextResponse.json({
    owner: board.owner,
    members: board.members,
    isOwner: access.isOwner,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: boardId } = await params
  const access = await hasBoardAccess(boardId, user.id)
  if (!access.hasAccess || !access.isOwner) {
    return NextResponse.json({ error: 'Only the board owner can invite members' }, { status: 403 })
  }

  try {
    const { email, role } = await req.json()
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const assignedRole = SPECIALIZATION_ROLES.some((r) => r.id === role)
      ? role
      : 'COLLABORATOR'

    const normalizedEmail = email.trim().toLowerCase()

    const targetUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, avatarUrl: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: `User with email "${normalizedEmail}" not found` }, { status: 404 })
    }

    if (targetUser.id === access.board.ownerId) {
      return NextResponse.json({ error: 'User is already the owner of this board' }, { status: 400 })
    }

    const existingMember = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: targetUser.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a collaborator on this board' }, { status: 400 })
    }

    const member = await prisma.boardMember.create({
      data: {
        boardId,
        userId: targetUser.id,
        role: assignedRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error: any) {
    console.error('Invite member error:', error)
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 })
  }
}
