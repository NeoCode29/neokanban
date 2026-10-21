import { chromium } from 'playwright'

async function verifyColumnSafeguardUI() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  try {
    // 1. Login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'kresna@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.includes('/login'))

    // 2. Go to Manajemen Sekolah
    await page.goto('http://localhost:3000/boards/cmty33gp90001u5x0x7p4575k', { waitUntil: 'networkidle' })

    // 3. Find column settings button for a protected column ("To Do")
    console.log('Finding column settings button...')
    const settingsBtns = page.locator('button[title="Column settings"]')
    await settingsBtns.first().click()

    // 4. Modal should open
    await page.waitForSelector('text=Column Settings')
    console.log('Modal opened.')

    // 5. Click the Protected Column tab (or Delete tab)
    const protectedTab = page.locator('button:has-text("Protected Column"), button:has-text("Delete Column")')
    await protectedTab.click()
    await page.waitForTimeout(400)

    // Check banner text
    const banner = page.locator('text=Kolom Sistem Terproteksi')
    await banner.waitFor({ state: 'visible', timeout: 5000 })
    console.log('Protected banner is visible!')

    // Capture screenshot
    await page.screenshot({ path: 'scripts/protected-column-modal-proof.png' })
    console.log('📸 Saved scripts/protected-column-modal-proof.png')
  } finally {
    await browser.close()
  }
}

verifyColumnSafeguardUI().catch((err) => {
  console.error(err)
  process.exit(1)
})
