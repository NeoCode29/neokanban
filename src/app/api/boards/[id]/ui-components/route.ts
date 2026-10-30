import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

function sanitizeUtf8(str: string): string {
  return typeof str === 'string' ? str.replace(/\0/g, '') : ''
}

export async function GET(
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
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const whereClause: any = { boardId: id }
    if (category && category !== 'All') {
      whereClause.category = category
    }

    const components = await prisma.uiComponent.findMany({
      where: whereClause,
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

    return NextResponse.json({ components })
  } catch (error) {
    console.error('Failed to fetch UI components:', error)
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
    const { name, category, description, htmlContent, order } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    let compOrder = typeof order === 'number' ? order : 0
    if (typeof order !== 'number') {
      const maxOrderComp = await prisma.uiComponent.findFirst({
        where: { boardId: id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      compOrder = maxOrderComp ? maxOrderComp.order + 1 : 0
    }

    const component = await prisma.uiComponent.create({
      data: {
        boardId: id,
        name: sanitizeUtf8(name.trim()),
        category: sanitizeUtf8(category && typeof category === 'string' ? category.trim() : 'General'),
        description: description && typeof description === 'string' ? sanitizeUtf8(description.trim()) : null,
        htmlContent: sanitizeUtf8(htmlContent || ''),
        order: compOrder,
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

    return NextResponse.json({ component }, { status: 201 })
  } catch (error) {
    console.error('Failed to create UI component:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
