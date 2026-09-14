import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, docId } = await params

  const doc = await prisma.contextDocument.findUnique({
    where: { id: docId },
    include: { board: true },
  })

  if (!doc || doc.boardId !== id) {
    return NextResponse.json({ error: 'Context document not found' }, { status: 404 })
  }

  const { hasBoardAccess } = await import('@/lib/board-auth')
  const access = await hasBoardAccess(id, user.id)
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Context document not found or access denied' }, { status: 404 })
  }

  return NextResponse.json({ document: doc })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, docId } = await params

  try {
    const existing = await prisma.contextDocument.findUnique({
      where: { id: docId },
      include: { board: true },
    })

    if (!existing || existing.boardId !== id) {
      return NextResponse.json({ error: 'Context document not found' }, { status: 404 })
    }

    const { hasBoardAccess } = await import('@/lib/board-auth')
    const access = await hasBoardAccess(id, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Context document not found or access denied' }, { status: 404 })
    }

    const { title, fileName, content, order } = await req.json()

    let cleanFileName: string | undefined = undefined
    if (fileName && typeof fileName === 'string' && fileName.trim()) {
      const sanitized = fileName.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '-')
      cleanFileName = sanitized
      if (sanitized !== existing.fileName) {
        const conflict = await prisma.contextDocument.findUnique({
          where: {
            boardId_fileName: {
              boardId: id,
              fileName: sanitized,
            },
          },
        })
        if (conflict) {
          return NextResponse.json(
            { error: `File "${sanitized}" already exists in this project.` },
            { status: 400 }
          )
        }
      }
    }

    const updated = await prisma.contextDocument.update({
      where: { id: docId },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(cleanFileName !== undefined ? { fileName: cleanFileName } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(order !== undefined ? { order } : {}),
      },
    })

    return NextResponse.json({ document: updated })
  } catch (error: any) {
    console.error('Update context document error:', error)
    return NextResponse.json({ error: 'Failed to update context document' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, docId } = await params

  try {
    const existing = await prisma.contextDocument.findUnique({
      where: { id: docId },
      include: { board: true },
    })

    if (!existing || existing.boardId !== id) {
      return NextResponse.json({ error: 'Context document not found' }, { status: 404 })
    }

    const { hasBoardAccess } = await import('@/lib/board-auth')
    const access = await hasBoardAccess(id, user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Context document not found or access denied' }, { status: 404 })
    }

    await prisma.contextDocument.delete({ where: { id: docId } })

    return NextResponse.json({ success: true, message: 'Document deleted successfully' })
  } catch (error: any) {
    console.error('Delete context document error:', error)
    return NextResponse.json({ error: 'Failed to delete context document' }, { status: 500 })
  }
}
