import { prisma } from '@/lib/prisma'

export interface BoardAccessResult {
  hasAccess: boolean
  isOwner: boolean
  role: 'OWNER' | 'COLLABORATOR' | null
  board: any | null
}

/**
 * Validates whether a user has access to a given board.
 * Returns hasAccess = true if user is the Owner OR a registered BoardMember.
 */
export async function hasBoardAccess(boardId: string, userId: string): Promise<BoardAccessResult> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: {
        select: { userId: true, role: true },
      },
    },
  })

  if (!board) {
    return { hasAccess: false, isOwner: false, role: null, board: null }
  }

  if (board.ownerId === userId) {
    return { hasAccess: true, isOwner: true, role: 'OWNER', board }
  }

  const membership = board.members.find((m) => m.userId === userId)
  if (membership) {
    return { hasAccess: true, isOwner: false, role: 'COLLABORATOR', board }
  }

  return { hasAccess: false, isOwner: false, role: null, board: null }
}
