import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: boardId } = await params
    const access = await hasBoardAccess(boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    const installedSkills = await prisma.boardSkill.findMany({
      where: { boardId },
      include: {
        skill: {
          include: {
            files: {
              select: { id: true, filePath: true, createdAt: true },
            },
            author: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { installedAt: 'desc' },
    })

    return NextResponse.json({
      boardId,
      skills: installedSkills.map((bs) => ({
        ...bs.skill,
        installedAt: bs.installedAt,
      })),
    })
  } catch (error: any) {
    console.error('Failed to get board skills:', error)
    return NextResponse.json(
      { error: 'Failed to get board skills', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { skillId, skillSlug } = body

    if (!skillId && !skillSlug) {
      return NextResponse.json(
        { error: 'Field "skillId" or "skillSlug" is required' },
        { status: 400 }
      )
    }

    const { id: boardId } = await params
    const access = await hasBoardAccess(boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    const skill = await prisma.skill.findFirst({
      where: {
        OR: [
          ...(skillId ? [{ id: skillId }] : []),
          ...(skillSlug ? [{ slug: skillSlug }] : []),
        ],
      },
    })

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    // Upsert or create relation
    const boardSkill = await prisma.boardSkill.upsert({
      where: {
        boardId_skillId: {
          boardId,
          skillId: skill.id,
        },
      },
      update: {},
      create: {
        boardId,
        skillId: skill.id,
      },
      include: {
        skill: true,
      },
    })

    return NextResponse.json({ success: true, boardSkill }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to attach skill to board:', error)
    return NextResponse.json(
      { error: 'Failed to attach skill to board', details: error.message },
      { status: 500 }
    )
  }
}
