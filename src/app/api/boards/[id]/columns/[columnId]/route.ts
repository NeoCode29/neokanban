import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'
import { isProtectedColumn } from '@/lib/column-utils'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, columnId } = await params

  try {
    const access = await hasBoardAccess(id, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    const { title, colorCode } = await req.json()
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Column title is required' }, { status: 400 })
    }

    const column = await prisma.column.findFirst({
      where: { id: columnId, boardId: id },
    })
    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: {
        title: title.trim(),
        colorCode: colorCode || column.colorCode,
      },
      include: {
        cards: {
          include: {
            checklists: true,
            _count: { select: { comments: true } },
          },
        },
      },
    })

    return NextResponse.json({ column: updatedColumn })
  } catch (error: any) {
    console.error('Error updating column:', error)
    return NextResponse.json({ error: 'Failed to update column' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, columnId } = await params
  const url = new URL(req.url)
  const transferToColumnId = url.searchParams.get('transferToColumnId')

  try {
    const access = await hasBoardAccess(id, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    // Ensure the board has more than 1 column
    const columnCount = await prisma.column.count({ where: { boardId: id } })
    if (columnCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only column remaining on the board' },
        { status: 400 }
      )
    }

    const column = await prisma.column.findFirst({
      where: { id: columnId, boardId: id },
      include: { cards: true },
    })
    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    // Safeguard: Check if this column is a protected system column
    if (isProtectedColumn(column.title)) {
      return NextResponse.json(
        {
          error: `Kolom standar "${column.title}" merupakan kolom sistem yang dilindungi dan tidak dapat dihapus.`,
          code: 'PROTECTED_COLUMN',
        },
        { status: 403 }
      )
    }

    let transferredCards = 0

    // Transfer cards if target column specified
    if (transferToColumnId) {
      const targetColumn = await prisma.column.findFirst({
        where: { id: transferToColumnId, boardId: id },
      })
      if (!targetColumn) {
        return NextResponse.json({ error: 'Target transfer column not found' }, { status: 400 })
      }

      const updateResult = await prisma.card.updateMany({
        where: { columnId },
        data: { columnId: transferToColumnId },
      })
      transferredCards = updateResult.count
    }

    // Delete column
    await prisma.column.delete({ where: { id: columnId } })

    return NextResponse.json({ success: true, transferredCards })
  } catch (error: any) {
    console.error('Error deleting column:', error)
    return NextResponse.json({ error: 'Failed to delete column' }, { status: 500 })
  }
}
