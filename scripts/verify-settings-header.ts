import { chromium } from 'playwright'

async function verifySettingsHeader() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'kresna@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.includes('/login'))

    await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' })
    await page.waitForSelector('text=Personal Access Tokens (MCP)')
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'scripts/settings-header-proof.png' })
    console.log('📸 Saved scripts/settings-header-proof.png')
  } finally {
    await browser.close()
  }
}

verifySettingsHeader().catch((err) => {
  console.error(err)
  process.exit(1)
})
