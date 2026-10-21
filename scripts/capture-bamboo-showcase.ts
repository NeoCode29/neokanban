import { chromium } from 'playwright'

async function captureShowcase() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1200, height: 750 } })
  const page = await context.newPage()

  try {
    await page.goto('http://localhost:3000/bamboo-showcase.html', { waitUntil: 'networkidle' })
    await page.screenshot({ path: 'scripts/bamboo-showcase-proof.png', fullPage: true })
    console.log('📸 Saved scripts/bamboo-showcase-proof.png')
  } finally {
    await browser.close()
  }
}

captureShowcase().catch((err) => {
  console.error(err)
  process.exit(1)
})
