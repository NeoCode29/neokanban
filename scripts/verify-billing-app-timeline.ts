import { chromium } from 'playwright'

async function verifyBillingTimeline() {
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

    // 2. Go to billing app board
    await page.goto('http://localhost:3000/boards/cmuz6480s0001u5wwswuf1zy1', { waitUntil: 'networkidle' })

    // 3. Switch to Timeline tab
    const timelineTab = page.locator('button:has-text("Timeline")')
    await timelineTab.click()
    await page.waitForSelector('text=Tugas / Tahapan')
    await page.waitForTimeout(500)

    // Capture 1: Default view
    await page.screenshot({ path: 'scripts/proof-1-default.png' })
    console.log('📸 Saved scripts/proof-1-default.png')

    // Capture 2: Click Next (>) to shift calendar
    const nextBtn = page.locator('button[title="Berikutnya"]')
    await nextBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'scripts/proof-2-next-shifted.png' })
    console.log('📸 Saved scripts/proof-2-next-shifted.png')

    // Capture 3: Zoom Minggu
    const zoomMinggu = page.locator('button:has-text("Minggu")')
    await zoomMinggu.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'scripts/proof-3-zoom-minggu.png' })
    console.log('📸 Saved scripts/proof-3-zoom-minggu.png')

    // Capture 4: Zoom Bulan
    const zoomBulan = page.locator('button:has-text("Bulan")')
    await zoomBulan.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'scripts/proof-4-zoom-bulan.png' })
    console.log('📸 Saved scripts/proof-4-zoom-bulan.png')

    console.log('✅ ALL BILLING APP TIMELINE SCREENSHOTS CAPTURED!')
  } finally {
    await browser.close()
  }
}

verifyBillingTimeline().catch((err) => {
  console.error(err)
  process.exit(1)
})
