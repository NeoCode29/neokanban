import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  const user = await prisma.user.findUnique({
    where: { email: 'kresna@example.com' },
  })

  if (!user) throw new Error('User kresna@example.com not found')

  const board = await prisma.board.findFirst({
    where: { ownerId: user.id },
  })

  if (!board) throw new Error('No board found')

  console.log(`Testing multi-file context for board "${board.title}" (${board.id})...`)

  // 1. List files
  const docs = await prisma.contextDocument.findMany({
    where: { boardId: board.id },
    orderBy: { order: 'asc' },
  })
  console.log(`Initial document count: ${docs.length}`)
  docs.forEach((d) => console.log(` - ${d.fileName} (${d.title})`))

  // 2. Create custom file
  const testFileName = `test-schema-${Date.now()}.sql`
  const newDoc = await prisma.contextDocument.create({
    data: {
      boardId: board.id,
      title: 'PostgreSQL Database Schema',
      fileName: testFileName,
      content: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);',
      order: docs.length,
    },
  })
  console.log(`Created new document: ${newDoc.fileName} [${newDoc.id}]`)

  // 3. Update custom file
  const updatedDoc = await prisma.contextDocument.update({
    where: { id: newDoc.id },
    data: {
      content: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE);',
    },
  })
  console.log(`Updated content: ${updatedDoc.content}`)

  // 4. Delete custom file
  await prisma.contextDocument.delete({
    where: { id: newDoc.id },
  })
  console.log(`Deleted document: ${testFileName}`)

  console.log('✅ Multi-file context API database operations passed successfully!')
}

test()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
