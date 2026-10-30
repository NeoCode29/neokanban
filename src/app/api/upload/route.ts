import { NextResponse } from 'next/server'
import * as auth from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const user = await auth.getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Strict allowed image MIME types (SVG disallowed to prevent Stored XSS)
    const MIME_TO_EXT: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    }

    const ext = MIME_TO_EXT[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed. SVG is disallowed for security reasons.' },
        { status: 400 }
      )
    }

    // Max 10MB
    const maxSizeBytes = 10 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: 'File size exceeds limit of 10MB.' },
        { status: 400 }
      )
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.promises.mkdir(uploadDir, { recursive: true })

    // Strict random file name with validated extension (never trust file.name extension)
    const randomHex = crypto.randomBytes(8).toString('hex')
    const fileName = `${Date.now()}-${randomHex}${ext}`
    const targetPath = path.join(uploadDir, fileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.promises.writeFile(targetPath, buffer)

    return NextResponse.json({
      url: `/uploads/${fileName}`,
      fileName: file.name.replace(/[^\w\s.-]/g, ''),
      size: file.size,
    })
  } catch (error: any) {
    console.error('Error handling file upload:', error)
    return NextResponse.json(
      { error: 'Failed to upload image. Please try again.' },
      { status: 500 }
    )
  }
}
