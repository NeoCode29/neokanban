import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

function sanitizeUtf8(str: string): string {
  return typeof str === 'string' ? str.replace(/\0/g, '') : ''
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, pageId } = await params
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  try {
    const page = await prisma.uiPage.findFirst({
      where: { id: pageId, boardId: id },
      include: {
        annotations: {
          include: {
            author: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            card: {
              select: { id: true, title: true, columnId: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Failed to fetch UI page:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, pageId } = await params
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  try {
    const existing = await prisma.uiPage.findFirst({
      where: { id: pageId, boardId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    const body = await req.json()
    const { title, path, description, status, htmlContent, order } = body

    const updateData: any = {}
    if (title !== undefined && typeof title === 'string') {
      updateData.title = sanitizeUtf8(title.trim())
    }
    if (path !== undefined && typeof path === 'string') {
      updateData.path = sanitizeUtf8(path.trim())
    }
    if (description !== undefined) {
      updateData.description = description && typeof description === 'string' ? sanitizeUtf8(description.trim()) : null
    }
    if (status !== undefined && typeof status === 'string') {
      updateData.status = sanitizeUtf8(status.trim())
    }
    if (htmlContent !== undefined && typeof htmlContent === 'string') {
      updateData.htmlContent = sanitizeUtf8(htmlContent)
    }
    if (order !== undefined && typeof order === 'number') {
      updateData.order = order
    }

    const updated = await prisma.uiPage.update({
      where: { id: pageId },
      data: updateData,
      include: {
        annotations: {
          include: {
            author: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            card: {
              select: { id: true, title: true, columnId: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ page: updated })
  } catch (error) {
    console.error('Failed to update UI page:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, pageId } = await params
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  try {
    const existing = await prisma.uiPage.findFirst({
      where: { id: pageId, boardId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    await prisma.uiPage.delete({
      where: { id: pageId },
    })

    return NextResponse.json({ success: true, message: 'Page deleted successfully' })
  } catch (error) {
    console.error('Failed to delete UI page:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
