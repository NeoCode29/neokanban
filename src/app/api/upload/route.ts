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

    // Allowed image types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, GIF, and SVG images are allowed.' },
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

    const originalExt = path.extname(file.name).toLowerCase()
    const fallbackExt =
      file.type === 'image/png'
        ? '.png'
        : file.type === 'image/webp'
        ? '.webp'
        : file.type === 'image/gif'
        ? '.gif'
        : file.type === 'image/svg+xml'
        ? '.svg'
        : '.jpg'

    const ext = originalExt || fallbackExt
    const randomHex = crypto.randomBytes(8).toString('hex')
    const fileName = `${Date.now()}-${randomHex}${ext}`
    const targetPath = path.join(uploadDir, fileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.promises.writeFile(targetPath, buffer)

    return NextResponse.json({
      url: `/uploads/${fileName}`,
      fileName: file.name,
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
