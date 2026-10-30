import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

function sanitizeUtf8(str: string): string {
  return typeof str === 'string' ? str.replace(/\0/g, '') : ''
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, componentId } = await params
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  try {
    const component = await prisma.uiComponent.findFirst({
      where: { id: componentId, boardId: id },
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

    if (!component) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 })
    }

    return NextResponse.json({ component })
  } catch (error) {
    console.error('Failed to fetch UI component:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, componentId } = await params
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  try {
    const existing = await prisma.uiComponent.findFirst({
      where: { id: componentId, boardId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, category, description, htmlContent, order } = body

    const updateData: any = {}
    if (name !== undefined && typeof name === 'string') {
      updateData.name = sanitizeUtf8(name.trim())
    }
    if (category !== undefined && typeof category === 'string') {
      updateData.category = sanitizeUtf8(category.trim())
    }
    if (description !== undefined) {
      updateData.description = description && typeof description === 'string' ? sanitizeUtf8(description.trim()) : null
    }
    if (htmlContent !== undefined && typeof htmlContent === 'string') {
      // Security Hardening: Batasi ukuran HTML (Max 2MB)
      if (htmlContent.length > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'HTML content exceeds maximum allowed size (2MB)' }, { status: 400 })
      }
      updateData.htmlContent = sanitizeUtf8(htmlContent)
    }
    if (order !== undefined && typeof order === 'number') {
      updateData.order = order
    }

    const updated = await prisma.uiComponent.update({
      where: { id: componentId },
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

    return NextResponse.json({ component: updated })
  } catch (error) {
    console.error('Failed to update UI component:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, componentId } = await params
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  try {
    const existing = await prisma.uiComponent.findFirst({
      where: { id: componentId, boardId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 })
    }

    await prisma.uiComponent.delete({
      where: { id: componentId },
    })

    return NextResponse.json({ success: true, message: 'Component deleted successfully' })
  } catch (error) {
    console.error('Failed to delete UI component:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
