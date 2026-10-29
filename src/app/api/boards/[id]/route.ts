import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      columns: {
        include: {
          cards: {
            include: {
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
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
      projectContext: true,
      contextDocuments: {
        orderBy: { order: 'asc' },
      },
      installedSkills: {
        include: { skill: true },
      },
    },
  })

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  return NextResponse.json({
    board: {
      ...board,
      isOwner: access.isOwner,
    },
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  const { title, description, isFavorite } = await req.json()

  try {
    const updated = await prisma.board.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(isFavorite !== undefined ? { isFavorite: Boolean(isFavorite) } : {}),
      },
    })

    return NextResponse.json({ board: { ...updated, isOwner: access.isOwner } })
  } catch (error: any) {
    console.error('Update board error:', error)
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  // Security Guard: Only the board owner can delete this board
  if (!access.isOwner) {
    return NextResponse.json(
      { error: 'Hanya pemilik (owner) proyek yang memiliki izin untuk menghapus board ini' },
      { status: 403 }
    )
  }

  try {
    // Double-verify at database record level before deletion
    const existingBoard = await prisma.board.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    })

    if (!existingBoard || existingBoard.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Hanya pemilik (owner) proyek yang memiliki izin untuk menghapus board ini' },
        { status: 403 }
      )
    }

    await prisma.board.delete({ where: { id } })
    return NextResponse.json({ message: 'Board deleted successfully' })
  } catch (error: any) {
    console.error('Delete board error:', error)
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 })
  }
}
