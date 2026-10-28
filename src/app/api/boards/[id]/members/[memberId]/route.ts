import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'
import { SPECIALIZATION_ROLES } from '@/lib/member-roles'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { role } = await req.json()
    if (!role || !SPECIALIZATION_ROLES.some((r) => r.id === role)) {
      return NextResponse.json(
        { error: 'Invalid specialization role. Must be one of FRONTEND_SPECIALIST, BACKEND_SPECIALIST, FULLSTACK, REVIEWER, or COLLABORATOR.' },
        { status: 400 }
      )
    }

    const { id: boardId, memberId } = await params
    const access = await hasBoardAccess(boardId, user.id)
    if (!access.hasAccess || !access.isOwner) {
      return NextResponse.json({ error: 'Only the board owner can update member roles' }, { status: 403 })
    }

    const memberRecord = await prisma.boardMember.findUnique({
      where: { id: memberId },
    })

    if (!memberRecord || memberRecord.boardId !== boardId) {
      return NextResponse.json({ error: 'Member not found on this board' }, { status: 404 })
    }

    const updated = await prisma.boardMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({ member: updated })
  } catch (error: any) {
    console.error('Update member role error:', error)
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: boardId, memberId } = await params
  const access = await hasBoardAccess(boardId, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
  }

  try {
    const memberRecord = await prisma.boardMember.findUnique({
      where: { id: memberId },
    })

    if (!memberRecord || memberRecord.boardId !== boardId) {
      return NextResponse.json({ error: 'Member not found on this board' }, { status: 404 })
    }

    // Allowed if caller is the Owner OR the member is removing themselves
    const isSelf = memberRecord.userId === user.id
    if (!access.isOwner && !isSelf) {
      return NextResponse.json({ error: 'You do not have permission to remove this member' }, { status: 403 })
    }

    await prisma.boardMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error: any) {
    console.error('Delete member error:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
