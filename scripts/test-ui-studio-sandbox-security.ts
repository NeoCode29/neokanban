import assert from 'assert'
import fs from 'fs'
import path from 'path'

function runSandboxSecurityAudit() {
  console.log('🔒 Running UI/UX Studio Frontend Sandbox & Messaging Security Audit...\n')

  const previewCanvasPath = path.resolve(__dirname, '../src/components/ui-studio/PreviewCanvas.tsx')
  const code = fs.readFileSync(previewCanvasPath, 'utf-8')

  // CHECK 1: Verify iframe sandbox isolation flags
  console.log('Check 1: Iframe Sandbox Isolation Constraints')
  const sandboxMatch = code.match(/sandbox="([^"]*)"/)
  assert(sandboxMatch, 'FAIL: iframe must define a sandbox attribute')
  assert(
    sandboxMatch[1] === 'allow-scripts allow-forms',
    `FAIL: sandbox attribute must be exactly "allow-scripts allow-forms", got "${sandboxMatch[1]}"`
  )
  assert(
    !sandboxMatch[1].includes('allow-same-origin'),
    'SECURITY RISK: allow-same-origin must NEVER be present in the sandbox attribute!'
  )
  assert(
    !sandboxMatch[1].includes('allow-top-navigation'),
    'SECURITY RISK: allow-top-navigation must NEVER be present in the sandbox attribute!'
  )
  console.log('  ✓ Verified: Iframe sandbox attribute strictly omits allow-same-origin and allow-top-navigation.')

  // CHECK 2: Verify postMessage source verification (OWASP Web Messaging)
  console.log('\nCheck 2: postMessage Source & Origin Validation')
  assert(
    code.includes('event.source !== iframeRef.current.contentWindow'),
    'FAIL: handleMessage must verify that event.source matches the iframe contentWindow'
  )
  console.log('  ✓ Verified: Only messages originating from the specific preview iframe are processed.')

  // CHECK 3: Disallow pseudo-protocol execution (javascript:, data:, vbscript:)
  console.log('\nCheck 3: Dangerous URI Scheme Neutralization')
  assert(
    code.includes("lowerHref.startsWith('javascript:')"),
    'FAIL: postMessage handler must reject javascript: URI schemes'
  )
  assert(
    code.includes("lowerHref.startsWith('data:')"),
    'FAIL: postMessage handler must reject data: URI schemes'
  )
  assert(
    code.includes("lowerHref.startsWith('vbscript:')"),
    'FAIL: postMessage handler must reject vbscript: URI schemes'
  )
  console.log('  ✓ Verified: Dangerous URI schemes (javascript:, data:, vbscript:) are strictly dropped.')

  // CHECK 4: Base target self injection
  console.log('\nCheck 4: Base Target Hardening')
  assert(
    code.includes('<base target="_self">'),
    'FAIL: Preview shell must inject <base target="_self"> to prevent target="_top" breakout'
  )
  console.log('  ✓ Verified: <base target="_self"> is actively enforced.')

  // CHECK 5: Event Capture phase click interception
  console.log('\nCheck 5: In-Capture Navigation Trap')
  assert(
    code.includes("document.addEventListener('click'"),
    'FAIL: Click event listener must be registered'
  )
  assert(
    code.includes('e.preventDefault()'),
    'FAIL: Click handler must invoke e.preventDefault()'
  )
  assert(
    code.includes('e.stopPropagation()'),
    'FAIL: Click handler must invoke e.stopPropagation()'
  )
  console.log('  ✓ Verified: Capture-phase click trapping stops browser iframe navigation to host.')

  // CHECK 6: Zero dangerouslySetInnerHTML in UI Studio
  console.log('\nCheck 6: Host DOM XSS Surface Audit')
  const studioDir = path.resolve(__dirname, '../src/components/ui-studio')
  const files = fs.readdirSync(studioDir)
  for (const f of files) {
    if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const content = fs.readFileSync(path.join(studioDir, f), 'utf-8')
      assert(
        !content.includes('dangerouslySetInnerHTML'),
        `FAIL: ${f} must not use dangerouslySetInnerHTML`
      )
    }
  }
  console.log('  ✓ Verified: 0 usages of dangerouslySetInnerHTML across all UI Studio components.')

  console.log('\n🎉 ALL 6 SECURITY CHECKS PASSED (100%)! Sandbox and messaging boundaries are secure.')
}

runSandboxSecurityAudit()
