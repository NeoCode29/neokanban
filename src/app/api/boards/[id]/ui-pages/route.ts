import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

function sanitizeUtf8(str: string): string {
  return typeof str === 'string' ? str.replace(/\0/g, '') : ''
}

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

  try {
    const pages = await prisma.uiPage.findMany({
      where: { boardId: id },
      include: {
        annotations: {
          select: {
            id: true,
            type: true,
            status: true,
            posX: true,
            posY: true,
            width: true,
            height: true,
            comment: true,
            cardId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('Failed to fetch UI pages:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(
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

  try {
    const body = await req.json()
    const { title, path, description, status, htmlContent, order } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    let pageOrder = typeof order === 'number' ? order : 0
    if (typeof order !== 'number') {
      const maxOrderPage = await prisma.uiPage.findFirst({
        where: { boardId: id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      pageOrder = maxOrderPage ? maxOrderPage.order + 1 : 0
    }

    const page = await prisma.uiPage.create({
      data: {
        boardId: id,
        title: sanitizeUtf8(title.trim()),
        path: sanitizeUtf8(path && typeof path === 'string' ? path.trim() : '/'),
        description: description && typeof description === 'string' ? sanitizeUtf8(description.trim()) : null,
        status: status && typeof status === 'string' ? sanitizeUtf8(status.trim()) : 'DRAFT',
        htmlContent: sanitizeUtf8(htmlContent || ''),
        order: pageOrder,
      },
      include: {
        annotations: {
          select: {
            id: true,
            type: true,
            status: true,
            posX: true,
            posY: true,
            width: true,
            height: true,
            comment: true,
            cardId: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({ page }, { status: 201 })
  } catch (error) {
    console.error('Failed to create UI page:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
