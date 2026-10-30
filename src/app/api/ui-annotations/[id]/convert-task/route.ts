import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBoardAccess } from '@/lib/board-auth'

function sanitizeUtf8(str: string): string {
  return typeof str === 'string' ? str.replace(/\0/g, '') : ''
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

  try {
    const annotation = await prisma.uiAnnotation.findUnique({
      where: { id },
      include: {
        page: true,
        component: true,
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    const boardId = annotation.page?.boardId || annotation.component?.boardId
    if (!boardId) {
      return NextResponse.json({ error: 'Annotation is not linked to any page or component' }, { status: 400 })
    }

    const access = await hasBoardAccess(boardId, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const { columnId } = body || {}

    let targetCol = null
    if (columnId && typeof columnId === 'string') {
      targetCol = await prisma.column.findFirst({
        where: { id: columnId, boardId },
      })
    }

    if (!targetCol) {
      targetCol = await prisma.column.findFirst({
        where: {
          boardId,
          title: { contains: 'To Do', mode: 'insensitive' },
        },
        orderBy: { order: 'asc' },
      })
    }

    if (!targetCol) {
      targetCol = await prisma.column.findFirst({
        where: { boardId },
        orderBy: { order: 'asc' },
      })
    }

    if (!targetCol) {
      return NextResponse.json({ error: 'No column available on this board to place task' }, { status: 400 })
    }

    const maxOrderCard = await prisma.card.findFirst({
      where: { columnId: targetCol.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const order = maxOrderCard ? maxOrderCard.order + 1 : 0

    const targetName = annotation.page?.title || annotation.component?.name || 'UI'
    const commentSummary = annotation.comment.length > 40
      ? annotation.comment.substring(0, 40) + '...'
      : annotation.comment
    const cardTitle = sanitizeUtf8(`[UI Feedback] ${targetName}: ${commentSummary}`)

    const sourceInfo = annotation.page
      ? `Halaman: **${annotation.page.title}** (\`${annotation.page.path}\`)`
      : `Komponen: **${annotation.component?.name}** (\`${annotation.component?.category}\`)`

    const positionInfo = annotation.type === 'BOX'
      ? `Bounding Box (X: ${annotation.posX}%, Y: ${annotation.posY}%, W: ${annotation.width || 0}%, H: ${annotation.height || 0}%)`
      : `Pin Marker (X: ${annotation.posX}%, Y: ${annotation.posY}%)`

    const cardDescription = sanitizeUtf8(
      [
        `### Feedback UI/UX Studio`,
        `- **Sumber**: ${sourceInfo}`,
        `- **Tipe**: ${annotation.type}`,
        `- **Posisi**: ${positionInfo}`,
        `- **Pelapor**: ${annotation.author?.name || annotation.author?.email || 'User'}`,
        `- **Anotasi ID**: \`${annotation.id}\``,
        '',
        '### Catatan Perbaikan:',
        annotation.comment,
      ].join('\n')
    )

    const card = await prisma.card.create({
      data: {
        columnId: targetCol.id,
        title: cardTitle,
        description: cardDescription,
        order,
        priority: 'MEDIUM',
        tags: ['ui-feedback'],
      },
      include: {
        column: {
          select: { id: true, title: true },
        },
      },
    })

    await prisma.uiAnnotation.update({
      where: { id: annotation.id },
      data: { cardId: card.id },
    })

    return NextResponse.json({ success: true, card }, { status: 201 })
  } catch (error) {
    console.error('Failed to convert annotation to task:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
