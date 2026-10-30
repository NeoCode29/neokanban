import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

function sanitizeUtf8(str: string): string {
  return typeof str === 'string' ? str.replace(/\0/g, '') : ''
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { pageId, componentId, type, posX, posY, width, height, comment } = body

    if (!pageId && !componentId) {
      return NextResponse.json({ error: 'pageId or componentId is required' }, { status: 400 })
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 })
    }

    // Security Hardening: Batasi panjang komentar anotasi (Max 1,000 karakter)
    if (comment.trim().length > 1000) {
      return NextResponse.json({ error: 'Comment exceeds maximum length of 1,000 characters' }, { status: 400 })
    }

    if (typeof posX !== 'number' || typeof posY !== 'number') {
      return NextResponse.json({ error: 'posX and posY are required numbers' }, { status: 400 })
    }

    // Verify parent exists and user has board access
    if (pageId) {
      const page = await prisma.uiPage.findUnique({
        where: { id: pageId },
        select: { boardId: true },
      })
      if (!page) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      const access = await hasBoardAccess(page.boardId, user.id)
      if (!access.hasAccess) {
        return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
      }
    } else if (componentId) {
      const comp = await prisma.uiComponent.findUnique({
        where: { id: componentId },
        select: { boardId: true },
      })
      if (!comp) {
        return NextResponse.json({ error: 'Component not found' }, { status: 404 })
      }
      const access = await hasBoardAccess(comp.boardId, user.id)
      if (!access.hasAccess) {
        return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
      }
    }

    const annotation = await prisma.uiAnnotation.create({
      data: {
        pageId: pageId || null,
        componentId: componentId || null,
        authorId: user.id,
        type: type === 'BOX' ? 'BOX' : 'PIN',
        posX: Number(posX),
        posY: Number(posY),
        width: typeof width === 'number' ? width : null,
        height: typeof height === 'number' ? height : null,
        comment: sanitizeUtf8(comment.trim()),
        status: 'OPEN',
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({ annotation }, { status: 201 })
  } catch (error) {
    console.error('Failed to create UI annotation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
