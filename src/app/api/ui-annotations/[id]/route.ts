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

  try {
    const annotation = await prisma.uiAnnotation.findUnique({
      where: { id },
      include: {
        page: { select: { boardId: true } },
        component: { select: { boardId: true } },
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
        card: { select: { id: true, title: true, columnId: true } },
      },
    })

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    const boardId = annotation.page?.boardId || annotation.component?.boardId
    if (!boardId) {
      return NextResponse.json({ error: 'Invalid annotation parent' }, { status: 400 })
    }

    const access = await hasBoardAccess(boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    return NextResponse.json({ annotation })
  } catch (error) {
    console.error('Failed to get UI annotation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
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

  try {
    const annotation = await prisma.uiAnnotation.findUnique({
      where: { id },
      include: {
        page: { select: { boardId: true } },
        component: { select: { boardId: true } },
      },
    })

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    const boardId = annotation.page?.boardId || annotation.component?.boardId
    if (!boardId) {
      return NextResponse.json({ error: 'Invalid annotation parent' }, { status: 400 })
    }

    const access = await hasBoardAccess(boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    const body = await req.json()
    const { status, comment } = body

    const updateData: any = {}
    if (status !== undefined && typeof status === 'string') {
      updateData.status = sanitizeUtf8(status.trim())
    }
    if (comment !== undefined && typeof comment === 'string') {
      // Security Hardening: Batasi panjang komentar anotasi (Max 1,000 karakter)
      if (comment.trim().length > 1000) {
        return NextResponse.json({ error: 'Comment exceeds maximum length of 1,000 characters' }, { status: 400 })
      }
      updateData.comment = sanitizeUtf8(comment.trim())
    }

    const updated = await prisma.uiAnnotation.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
        card: { select: { id: true, title: true, columnId: true } },
      },
    })

    return NextResponse.json({ annotation: updated })
  } catch (error) {
    console.error('Failed to update UI annotation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
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

  try {
    const annotation = await prisma.uiAnnotation.findUnique({
      where: { id },
      include: {
        page: { select: { boardId: true } },
        component: { select: { boardId: true } },
      },
    })

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    const boardId = annotation.page?.boardId || annotation.component?.boardId
    if (!boardId) {
      return NextResponse.json({ error: 'Invalid annotation parent' }, { status: 400 })
    }

    const access = await hasBoardAccess(boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    await prisma.uiAnnotation.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Annotation deleted successfully' })
  } catch (error) {
    console.error('Failed to delete UI annotation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
