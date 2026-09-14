import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  DEFAULT_PROJECT_GUIDELINES,
  DEFAULT_TECH_STACK,
  DEFAULT_CONVENTIONS,
  DEFAULT_MESSAGING_STANDARDS,
} from '@/lib/default-context'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        select: { id: true },
      },
      columns: {
        select: {
          id: true,
          title: true,
          _count: {
            select: { cards: true },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
  })

  const formattedBoards = boards.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    isFavorite: b.isFavorite,
    isOwner: b.ownerId === user.id,
    ownerName: b.owner.name,
    memberCount: b.members.length,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    columnCount: b.columns.length,
    cardCount: b.columns.reduce((sum, col) => sum + col._count.cards, 0),
    columns: b.columns,
  }))

  return NextResponse.json({ boards: formattedBoards })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { title, description } = await req.json()

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Board title is required' }, { status: 400 })
    }

    const board = await prisma.board.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        ownerId: user.id,
        columns: {
          create: [
            { title: 'Backlog', order: 0, colorCode: '#64748b' },
            { title: 'To Do', order: 1, colorCode: '#3b82f6' },
            { title: 'In Progress', order: 2, colorCode: '#f59e0b' },
            { title: 'In Review', order: 3, colorCode: '#8b5cf6' },
            { title: 'Done', order: 4, colorCode: '#10b981' },
          ],
        },
        projectContext: {
          create: {
            guidelinesMarkdown: DEFAULT_PROJECT_GUIDELINES,
            techStackMarkdown: DEFAULT_TECH_STACK,
            conventionsMarkdown: DEFAULT_CONVENTIONS,
            messagingStandards: DEFAULT_MESSAGING_STANDARDS,
          },
        },
      },
      include: {
        columns: true,
        projectContext: true,
      },
    })

    return NextResponse.json({ board }, { status: 201 })
  } catch (error: any) {
    console.error('Create board error:', error)
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
  }
}
