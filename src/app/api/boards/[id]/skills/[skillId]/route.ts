import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: boardId, skillId } = await params
    const access = await hasBoardAccess(boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    // skillId can be either id or slug
    const targetSkill = await prisma.skill.findFirst({
      where: { OR: [{ id: skillId }, { slug: skillId }] },
    })

    const actualSkillId = targetSkill ? targetSkill.id : skillId

    await prisma.boardSkill.deleteMany({
      where: {
        boardId,
        skillId: actualSkillId,
      },
    })

    return NextResponse.json({ success: true, message: 'Skill detached from board' })
  } catch (error: any) {
    console.error('Failed to detach skill from board:', error)
    return NextResponse.json(
      { error: 'Failed to detach skill from board', details: error.message },
      { status: 500 }
    )
  }
}

