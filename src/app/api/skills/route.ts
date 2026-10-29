import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper to strip PostgreSQL-incompatible null bytes (0x00)
function sanitizeUtf8(str: string): string {
  return typeof str === 'string' ? str.replace(/\0/g, '') : ''
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    const role = url.searchParams.get('role')
    const search = url.searchParams.get('search')?.toLowerCase()

    const whereClause: any = {}

    if (category && category !== 'All') {
      whereClause.category = category
    }

    if (role && role !== 'All') {
      whereClause.targetRole = role
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skills = await prisma.skill.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        files: {
          select: { id: true, filePath: true, createdAt: true },
        },
        _count: {
          select: { boardSkills: true, files: true },
        },
      },
      orderBy: [{ isPreset: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ skills })
  } catch (error: any) {
    console.error('Failed to fetch skills catalog:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skills catalog', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { name, slug, description, category, targetRole, files } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Field "name" is required and must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Skill must contain at least one file (e.g. SKILL.md)' },
        { status: 400 }
      )
    }

    // Validate files array early
    const validatedFiles: { filePath: string; content: string }[] = []
    for (const f of files) {
      if (!f || typeof f.filePath !== 'string' || !f.filePath.trim()) {
        return NextResponse.json(
          { error: 'Each file must contain a valid filePath' },
          { status: 400 }
        )
      }
      const cleanPath = sanitizeUtf8(f.filePath.trim().replace(/^[/\\]+/, ''))
      const cleanContent = sanitizeUtf8(f.content || '')
      if (cleanPath) {
        validatedFiles.push({
          filePath: cleanPath,
          content: cleanContent,
        })
      }
    }

    if (validatedFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid text files found to store' },
        { status: 400 }
      )
    }

    const cleanName = sanitizeUtf8(name.trim())

    // Generate slug if not supplied
    let baseSlug = (slug || cleanName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!baseSlug) {
      baseSlug = `skill-${Date.now()}`
    }

    // Check slug uniqueness
    const existing = await prisma.skill.findUnique({ where: { slug: baseSlug } })
    const finalSlug = existing ? `${baseSlug}-${Math.random().toString(36).substring(2, 6)}` : baseSlug

    const newSkill = await prisma.skill.create({
      data: {
        name: cleanName,
        slug: finalSlug,
        description: sanitizeUtf8(typeof description === 'string' ? description.trim() : ''),
        category: sanitizeUtf8(typeof category === 'string' && category.trim() ? category.trim() : 'General'),
        targetRole: sanitizeUtf8(typeof targetRole === 'string' && targetRole.trim() ? targetRole.trim() : 'FULLSTACK'),
        isPreset: false,
        authorId: user.id,
        files: {
          create: validatedFiles,
        },
      },
      include: {
        author: { select: { id: true, name: true } },
        files: true,
      },
    })

    return NextResponse.json({ skill: newSkill }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create skill:', error)
    return NextResponse.json(
      { error: 'Failed to create skill', details: error.message },
      { status: 500 }
    )
  }
}
