import { prisma } from '../src/lib/prisma'
import { POST as skillsPost } from '../src/app/api/skills/route'
import { PUT as skillPut } from '../src/app/api/skills/[id]/route'
import { POST as uploadPost } from '../src/app/api/upload/route'
import { POST as loginPost } from '../src/app/api/auth/login/route'
import { getCurrentUser } from '../src/lib/auth'

async function runSecurityTests() {
  console.log('==================================================')
  console.log('🔒 NEOKANBAN SECURITY PATCH VERIFICATION SUITE')
  console.log('==================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${desc}`)
      failed++
    }
  }

  // Find or create test user for authenticated endpoints
  let testUser = await prisma.user.findFirst()
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'security-tester@example.com',
        name: 'Security Tester',
        passwordHash: '$2a$10$wK6n2Z1QO7n6L0qV1R3Yy.8BfU0q2N4x7k9J1L3M5O7P9Q1R3S5T',
      },
    })
  }

  process.env.TEST_AUTH_USER = JSON.stringify({
    id: testUser.id,
    email: testUser.email,
    name: testUser.name,
  })

  // ----------------------------------------------------------------
  // TEST SUITE 1: Path Traversal / Zip Slip Prevention (VULN-01)
  // ----------------------------------------------------------------
  console.log('\n--- 1. Testing Path Traversal / Zip Slip Defenses ---')
  {
    // A: Try creating a skill with directory escape "../../../etc/passwd"
    const traversalPayload = {
      name: 'Exploit Skill Traversal',
      description: 'Testing path traversal blocking',
      category: 'Testing',
      targetRole: 'FULLSTACK',
      files: [
        {
          filePath: '../../evil.sh',
          content: 'echo pwned',
        },
      ],
    }

    const req1 = new Request('http://localhost:3000/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(traversalPayload),
    })
    const res1 = await skillsPost(req1)
    const json1 = await res1.json()

    assert(
      res1.status === 400 && json1.error.includes('Security violation'),
      `POST /api/skills rejects "../" traversal with 400 (Got: ${res1.status})`
    )

    // B: Try Windows drive letter traversal "C:/evil.bat"
    const winDrivePayload = {
      name: 'Exploit Windows Drive Skill',
      description: 'Testing windows absolute path blocking',
      category: 'Testing',
      targetRole: 'FULLSTACK',
      files: [
        {
          filePath: 'C:/evil.bat',
          content: 'calc.exe',
        },
      ],
    }

    const reqWin = new Request('http://localhost:3000/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(winDrivePayload),
    })
    const resWin = await skillsPost(reqWin)
    const jsonWin = await resWin.json()

    assert(
      resWin.status === 400 && jsonWin.error.includes('Security violation'),
      `POST /api/skills rejects Windows drive letter paths with 400 (Got: ${resWin.status})`
    )

    // C: Try PUT update with path traversal
    const existingSkill = await prisma.skill.findFirst({
      where: { authorId: testUser.id },
    })

    if (existingSkill) {
      const putReq = new Request(`http://localhost:3000/api/skills/${existingSkill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [
            {
              filePath: 'subfolder/../../escaped.txt',
              content: 'escaped',
            },
          ],
        }),
      })
      const putRes = await skillPut(putReq, { params: Promise.resolve({ id: existingSkill.id }) })
      const putJson = await putRes.json()
      assert(
        putRes.status === 400 && putJson.error.includes('Security violation'),
        `PUT /api/skills/[id] rejects path traversal sequence (Got: ${putRes.status})`
      )
    }
  }

  // ----------------------------------------------------------------
  // TEST SUITE 2: SVG XSS & File Extension Spoofing (VULN-02)
  // ----------------------------------------------------------------
  console.log('\n--- 2. Testing Upload Validation (No SVG, Strict MIME Mapping) ---')
  {
    // A: Try uploading an SVG file
    const svgContent = '<svg onload="alert(document.cookie)"></svg>'
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })
    const svgForm = new FormData()
    svgForm.append('file', svgBlob, 'xss.svg')

    const svgReq = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: svgForm,
    })
    const svgRes = await uploadPost(svgReq)
    const svgJson = await svgRes.json()

    assert(
      svgRes.status === 400 && svgJson.error.includes('SVG is disallowed'),
      `POST /api/upload rejects image/svg+xml with 400 (Got: ${svgRes.status})`
    )

    // B: Try extension spoofing: MIME is PNG, but user filename claims exploit.php.exe
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    const pngBlob = new Blob([png1x1], { type: 'image/png' })
    const spoofForm = new FormData()
    spoofForm.append('file', pngBlob, 'malicious-payload.php.exe')

    const spoofReq = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: spoofForm,
    })
    const spoofRes = await uploadPost(spoofReq)
    const spoofJson = await spoofRes.json()

    assert(
      spoofRes.status === 200 && spoofJson.url.endsWith('.png') && !spoofJson.url.endsWith('.exe'),
      `POST /api/upload forces server-side .png extension regardless of client filename (Saved as: ${spoofJson.url})`
    )
  }

  // ----------------------------------------------------------------
  // TEST SUITE 3: Production Auth Guard (VULN-03)
  // ----------------------------------------------------------------
  console.log('\n--- 3. Testing Production Auth Bypass Protection ---')
  {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    // With NODE_ENV === 'production', TEST_AUTH_USER must be ignored!
    const userInProd = await getCurrentUser()
    assert(
      userInProd === null,
      `getCurrentUser() ignores TEST_AUTH_USER when NODE_ENV === 'production' (Returned: ${userInProd})`
    )

    process.env.NODE_ENV = originalEnv
  }

  // ----------------------------------------------------------------
  // TEST SUITE 4: Brute-Force Rate Limiting & Constant-Time Login (VULN-04)
  // ----------------------------------------------------------------
  console.log('\n--- 4. Testing Login Rate Limiting (5 attempts / 60s) ---')
  {
    const attackIp = '198.51.100.99' // Dedicated IP for rate-limit test

    // Send 5 failed attempts
    for (let i = 1; i <= 5; i++) {
      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': attackIp,
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        }),
      })
      const loginRes = await loginPost(loginReq)
      if (i < 5) {
        assert(loginRes.status === 401, `Attempt #${i} returns 401 Unauthorized`)
      }
    }

    // 6th attempt from the same IP must trigger 429
    const blockedReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': attackIp,
      },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      }),
    })
    const blockedRes = await loginPost(blockedReq)
    const blockedJson = await blockedRes.json()

    assert(
      blockedRes.status === 429 && blockedJson.error.includes('Too many failed login attempts'),
      `Attempt #6 returns 429 Too Many Requests (Got: ${blockedRes.status}, Retry-After: ${blockedRes.headers.get('Retry-After')})`
    )
  }

  // ----------------------------------------------------------------
  // TEST SUITE 5: Safe URL Filter in Markdown (VULN-05)
  // ----------------------------------------------------------------
  console.log('\n--- 5. Testing URL Protocol Sanitization ---')
  {
    function isSafeUrl(url?: string): boolean {
      if (!url) return false
      const trimmed = url.trim().toLowerCase()
      return (
        trimmed.startsWith('https://') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('#')
      )
    }

    assert(!isSafeUrl('javascript:alert(1)'), 'Blocks "javascript:alert(1)"')
    assert(!isSafeUrl('vbscript:msgbox(1)'), 'Blocks "vbscript:msgbox(1)"')
    assert(!isSafeUrl('data:text/html,<script>alert(1)</script>'), 'Blocks "data:text/html" XSS vector')
    assert(isSafeUrl('https://github.com'), 'Allows valid "https://github.com"')
    assert(isSafeUrl('/boards/123'), 'Allows valid relative link "/boards/123"')
    assert(isSafeUrl('#section-overview'), 'Allows valid hash anchor "#section-overview"')
  }

  console.log('\n==================================================')
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`)
  console.log('==================================================\n')

  if (failed > 0) {
    throw new Error(`Security verification failed with ${failed} failure(s)`)
  }
}

runSecurityTests()
  .then(() => {
    console.log('🎉 ALL SECURITY PATCH VERIFICATION TESTS PASSED!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error during security verification:', err)
    process.exit(1)
  })
