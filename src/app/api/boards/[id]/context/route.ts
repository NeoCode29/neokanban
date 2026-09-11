import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      contextDocuments: {
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!board || board.ownerId !== user.id) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  return NextResponse.json({
    documents: board.contextDocuments,
    boardTitle: board.title,
  })
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
    const board = await prisma.board.findUnique({
      where: { id },
    })

    if (!board || board.ownerId !== user.id) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const { title, fileName, content, order } = await req.json()

    if (!fileName || !fileName.trim()) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 })
    }

    const cleanFileName = fileName.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '-')

    const existing = await prisma.contextDocument.findUnique({
      where: {
        boardId_fileName: {
          boardId: id,
          fileName: cleanFileName,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `File "${cleanFileName}" already exists in this project.` },
        { status: 400 }
      )
    }

    const docCount = await prisma.contextDocument.count({ where: { boardId: id } })

    const document = await prisma.contextDocument.create({
      data: {
        boardId: id,
        fileName: cleanFileName,
        title: title?.trim() || cleanFileName,
        content: content || '',
        order: order !== undefined ? order : docCount,
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error: any) {
    console.error('Create context document error:', error)
    return NextResponse.json({ error: 'Failed to create context document' }, { status: 500 })
  }
}
