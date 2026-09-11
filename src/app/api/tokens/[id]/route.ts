import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const token = await prisma.personalAccessToken.findUnique({
      where: { id },
    })

    if (!token || token.userId !== user.id) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    await prisma.personalAccessToken.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Token revoked successfully' })
  } catch (error: any) {
    console.error('Delete token error:', error)
    return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 })
  }
}
