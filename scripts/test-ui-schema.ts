import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking UI Studio models...')
  const pageCount = await (prisma as any).uiPage.count()
  const compCount = await (prisma as any).uiComponent.count()
  const annCount = await (prisma as any).uiAnnotation.count()
  console.log(`UiPage: ${pageCount}, UiComponent: ${compCount}, UiAnnotation: ${annCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
