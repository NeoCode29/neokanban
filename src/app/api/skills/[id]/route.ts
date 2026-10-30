import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function sanitizeUtf8(str: string): string {
  return typeof str === 'string' ? str.replace(/\0/g, '') : ''
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const skill = await prisma.skill.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        files: {
          orderBy: { filePath: 'asc' },
        },
        _count: {
          select: { boardSkills: true },
        },
      },
    })

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    return NextResponse.json({ skill })
  } catch (error: any) {
    console.error('Failed to get skill:', error)
    return NextResponse.json(
      { error: 'Failed to get skill', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const skill = await prisma.skill.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { files: true },
    })

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    if (skill.isPreset) {
      return NextResponse.json(
        { error: 'Official preset skills cannot be modified' },
        { status: 403 }
      )
    }

    if (skill.authorId && skill.authorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the author can update this skill' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { name, description, category, targetRole, files } = body

    const updateData: any = {}
    if (typeof name === 'string' && name.trim().length >= 2) {
      updateData.name = sanitizeUtf8(name.trim())
    }
    if (typeof description === 'string') {
      updateData.description = sanitizeUtf8(description.trim())
    }
    if (typeof category === 'string' && category.trim()) {
      updateData.category = sanitizeUtf8(category.trim())
    }
    if (typeof targetRole === 'string' && targetRole.trim()) {
      updateData.targetRole = sanitizeUtf8(targetRole.trim())
    }

    // If files are provided, update them
    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        const checkPath = sanitizeUtf8(String(f.filePath || '').trim().replace(/\\/g, '/').replace(/^\/+/, ''))
        const segments = checkPath.split('/')
        if (segments.includes('..') || checkPath.includes('..') || /^[a-zA-Z]:/.test(checkPath)) {
          return NextResponse.json(
            { error: `Security violation: Path traversal sequence '..' is not allowed in filePath "${f.filePath}"` },
            { status: 400 }
          )
        }
      }

      // Delete old files and re-create in transaction
      await prisma.$transaction([
        prisma.skillFile.deleteMany({ where: { skillId: skill.id } }),
        prisma.skillFile.createMany({
          data: files
            .map((f: any) => ({
              skillId: skill.id,
              filePath: sanitizeUtf8(String(f.filePath || '').trim().replace(/\\/g, '/').replace(/^\/+/, '')),
              content: sanitizeUtf8(typeof f.content === 'string' ? f.content : ''),
            }))
            .filter((f: any) => Boolean(f.filePath)),
        }),
        prisma.skill.update({
          where: { id: skill.id },
          data: updateData,
        }),
      ])
    } else if (Object.keys(updateData).length > 0) {
      await prisma.skill.update({
        where: { id: skill.id },
        data: updateData,
      })
    }

    const updated = await prisma.skill.findUnique({
      where: { id: skill.id },
      include: { files: true, author: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ skill: updated })
  } catch (error: any) {
    console.error('Failed to update skill:', error)
    return NextResponse.json(
      { error: 'Failed to update skill', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const skill = await prisma.skill.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    })

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    if (skill.isPreset) {
      return NextResponse.json(
        { error: 'Official preset skills cannot be deleted' },
        { status: 403 }
      )
    }

    if (skill.authorId && skill.authorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the author can delete this skill' },
        { status: 403 }
      )
    }

    await prisma.skill.delete({ where: { id: skill.id } })

    return NextResponse.json({ success: true, message: 'Skill deleted' })
  } catch (error: any) {
    console.error('Failed to delete skill:', error)
    return NextResponse.json(
      { error: 'Failed to delete skill', details: error.message },
      { status: 500 }
    )
  }
}

