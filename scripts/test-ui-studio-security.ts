import { prisma } from '../src/lib/prisma'
import { POST as createPage } from '../src/app/api/boards/[id]/ui-pages/route'
import { POST as createComponent } from '../src/app/api/boards/[id]/ui-components/route'
import { POST as createAnnotation } from '../src/app/api/ui-annotations/route'

async function runSecurityTests() {
  console.log('=== Running Security Hardening Tests for UI/UX Studio ===\n')

  const user = await prisma.user.findFirst()
  const board = await prisma.board.findFirst()
  if (!user || !board) {
    throw new Error('Test user or board missing')
  }

  process.env.TEST_AUTH_USER = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  let passed = 0
  let failed = 0

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${msg}`)
      failed++
    }
  }

  // TEST 1: Reject Oversized HTML in ui-pages (> 2MB)
  console.log('Test 1: Oversized HTML Payload Protection (Pages)')
  const oversizedHtml = 'A'.repeat(2.5 * 1024 * 1024) // 2.5 MB
  const pageReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Oversized Page Attack',
      path: '/attack',
      htmlContent: oversizedHtml,
    }),
  })
  const pageRes = await createPage(pageReq, { params: Promise.resolve({ id: board.id }) })
  const pageData = await pageRes.json()
  assert(pageRes.status === 400, 'Returns HTTP 400 Bad Request on oversized HTML')
  assert(pageData.error.includes('exceeds maximum allowed size'), 'Rejection message specifically notes 2MB limit')

  // TEST 2: Reject Oversized HTML in ui-components (> 2MB)
  console.log('\nTest 2: Oversized HTML Payload Protection (Components)')
  const compReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'OversizedComponent',
      category: 'Input',
      htmlContent: oversizedHtml,
    }),
  })
  const compRes = await createComponent(compReq, { params: Promise.resolve({ id: board.id }) })
  const compData = await compRes.json()
  assert(compRes.status === 400, 'Returns HTTP 400 Bad Request on oversized component HTML')
  assert(compData.error.includes('exceeds maximum allowed size'), 'Rejection message specifically notes 2MB limit')

  // TEST 3: Reject Oversized Comment in ui-annotations (> 1000 chars)
  console.log('\nTest 3: Oversized Comment Flood Protection (Annotations)')
  const oversizedComment = 'X'.repeat(1050)
  const annReq = new Request('http://localhost:3000/api/ui-annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pageId: 'nonexistent-page',
      posX: 10,
      posY: 10,
      comment: oversizedComment,
    }),
  })
  const annRes = await createAnnotation(annReq)
  const annData = await annRes.json()
  assert(annRes.status === 400, 'Returns HTTP 400 Bad Request on oversized comment')
  assert(annData.error.includes('maximum length of 1,000 characters'), 'Rejection message specifies 1,000 char limit')

  // TEST 4: Null-byte injection sanitization
  console.log('\nTest 4: Null-Byte UTF-8 Sanitization')
  const cleanReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Valid\0 Page\0',
      path: '/sanitized',
      htmlContent: '<div>Safe\0 Content</div>',
    }),
  })
  const cleanRes = await createPage(cleanReq, { params: Promise.resolve({ id: board.id }) })
  const cleanData = await cleanRes.json()
  assert(cleanRes.status === 201, 'Creates page successfully without Postgres UTF-8 0x00 error')
  assert(cleanData.page.title === 'Valid Page', 'Null-bytes stripped cleanly from title')
  assert(cleanData.page.htmlContent === '<div>Safe Content</div>', 'Null-bytes stripped cleanly from HTML')

  // Cleanup created page
  if (cleanData.page?.id) {
    await prisma.uiPage.delete({ where: { id: cleanData.page.id } })
  }

  console.log(`\n=== Verification Complete: ${passed} Passed, ${failed} Failed ===`)
  if (failed > 0) {
    process.exit(1)
  }
}

runSecurityTests().catch((e) => {
  console.error(e)
  process.exit(1)
})

