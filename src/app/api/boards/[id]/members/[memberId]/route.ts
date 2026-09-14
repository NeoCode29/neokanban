import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

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
