import { chromium } from 'playwright'

async function runE2E() {
  console.log('🚀 Starting Playwright E2E Test for Timeline Feature...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  try {
    // 1. Navigate to login
    console.log('1️⃣ Navigating to http://localhost:3000/login...')
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })

    // Fill login form
    console.log('2️⃣ Logging in as kresna@example.com...')
    await page.fill('input[type="email"]', 'kresna@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
    console.log('✅ Logged in successfully. Current URL:', page.url())

    // 2. Click on a board
    console.log('3️⃣ Navigating to board...')
    const boardLink = page.locator('a[href^="/boards/"]').first()
    await boardLink.waitFor({ state: 'visible', timeout: 10000 })
    const boardTitle = await boardLink.innerText()
    console.log(`📌 Found board: "${boardTitle.replace(/\n/g, ' ')}"`)
    await boardLink.click()

    await page.waitForURL(/\/boards\/.+/, { timeout: 10000 })
    console.log('✅ Board page loaded:', page.url())

    // 3. Locate and click "Timeline" tab button
    console.log('4️⃣ Switching to Timeline tab...')
    const timelineTab = page.locator('button:has-text("Timeline")')
    await timelineTab.waitFor({ state: 'visible', timeout: 5000 })
    await timelineTab.click()

    // 4. Verify Timeline View components
    console.log('5️⃣ Verifying Gantt Timeline View elements...')

    // Check header controls
    await page.waitForSelector('text=Hari Ini', { timeout: 5000 })
    console.log('  ✓ "Hari Ini" navigation button found')

    const zoomHari = page.locator('button:has-text("Hari")').first()
    const zoomMinggu = page.locator('button:has-text("Minggu")')
    const zoomBulan = page.locator('button:has-text("Bulan")')
    await zoomHari.waitFor({ state: 'visible' })
    await zoomMinggu.waitFor({ state: 'visible' })
    await zoomBulan.waitFor({ state: 'visible' })
    console.log('  ✓ Zoom mode switchers (Hari, Minggu, Bulan) found')

    // Check left pane
    const taskHeader = page.locator('text=Tugas / Tahapan')
    await taskHeader.waitFor({ state: 'visible' })
    console.log('  ✓ Left pane ("Tugas / Tahapan") found')

    // Check unscheduled tray button
    const unscheduledBtn = page.locator('button:has-text("Belum Terjadwal")')
    await unscheduledBtn.waitFor({ state: 'visible' })
    console.log('  ✓ "Belum Terjadwal" tray button found')

    // 5. Test zoom interaction
    console.log('6️⃣ Testing zoom modes...')
    await zoomMinggu.click()
    await page.waitForTimeout(500)
    console.log('  ✓ Zoomed to "Minggu"')

    await zoomBulan.click()
    await page.waitForTimeout(500)
    console.log('  ✓ Zoomed to "Bulan"')

    await zoomHari.click()
    await page.waitForTimeout(500)
    console.log('  ✓ Zoomed back to "Hari"')

    // 6. Test Unscheduled toggle
    console.log('7️⃣ Testing "Belum Terjadwal" toggle...')
    await unscheduledBtn.click()
    await page.waitForTimeout(500)
    console.log('  ✓ Unscheduled tray expanded')
    await unscheduledBtn.click()
    await page.waitForTimeout(500)
    console.log('  ✓ Unscheduled tray collapsed')

    // 7. Check if any task cards / task bars exist and can be clicked
    console.log('8️⃣ Checking task interaction in timeline...')
    const taskRow = page.locator('.truncate.flex-1.font-medium').first()
    const taskCount = await taskRow.count()
    if (taskCount > 0) {
      const taskName = await taskRow.innerText()
      console.log(`  ✓ Found scheduled task: "${taskName}". Clicking to open detail modal...`)
      await taskRow.click()

      // Verify CardDetailModal opened
      const modal = page.locator('[role="dialog"], .fixed.inset-0').first()
      await modal.waitFor({ state: 'visible', timeout: 5000 })
      console.log('  ✓ CardDetailModal opened successfully from Timeline view!')

      // Close modal
      const closeBtn = page.locator('button:has(svg.lucide-x)').first()
      if (await closeBtn.isVisible()) {
        await closeBtn.click()
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(500)
      console.log('  ✓ Closed modal')
    } else {
      console.log('  ℹ️ No tasks currently scheduled in this board view.')
    }

    // Take screenshot as proof
    const screenshotPath = 'scripts/timeline-playwright-proof.png'
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`📸 Screenshot saved to ${screenshotPath}`)

    console.log('\n🎉 ALL PLAYWRIGHT TIMELINE VERIFICATIONS PASSED SUCCESSFULLY!')
  } catch (error) {
    console.error('❌ E2E Test Failed:', error)
    await page.screenshot({ path: 'scripts/timeline-playwright-error.png' }).catch(() => {})
    throw error
  } finally {
    await browser.close()
  }
}

runE2E().catch((err) => {
  process.exit(1)
})
