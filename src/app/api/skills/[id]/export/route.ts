import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import JSZip from 'jszip'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const skill = await prisma.skill.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { files: true },
    })

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const zip = new JSZip()
    for (const file of skill.files) {
      // Normalize slashes for zip entries
      const normalizedPath = file.filePath.replace(/\\/g, '/').replace(/^\/+/, '')
      zip.file(normalizedPath, file.content)
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    return new Response(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${skill.slug}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('Failed to export skill zip:', error)
    return NextResponse.json(
      { error: 'Failed to export skill', details: error.message },
      { status: 500 }
    )
  }
}
