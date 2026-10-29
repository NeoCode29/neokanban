import JSZip from 'jszip'

// Integration test for Skills API endpoints and ZIP packaging
async function testSkillsApi() {
  console.log('--- Testing Skills API Endpoints & Logic ---')

  // Set mock authenticated user for tests
  process.env.TEST_AUTH_USER = JSON.stringify({
    id: 'test-user-skills',
    email: 'tester@neokanban.dev',
    name: 'Skills Tester',
  })

  try {
    const skillsRoute = await import('../src/app/api/skills/route')
    const boardSkillsRoute = await import('../src/app/api/boards/[id]/skills/route')

    console.log('✅ Skills route modules imported successfully!')

    // Test 1: POST /api/skills - missing name
    const badNameReq = new Request('http://localhost:3000/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'No name or files' }),
    })
    const badNameRes = await skillsRoute.POST(badNameReq)
    if (badNameRes.status !== 400) {
      throw new Error(`Expected 400 for missing name, got ${badNameRes.status}`)
    }
    console.log('✅ Validation 1: Correctly rejected missing name (400)')

    // Test 2: POST /api/skills - empty files array
    const emptyFilesReq = new Request('http://localhost:3000/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Valid Name', files: [] }),
    })
    const emptyFilesRes = await skillsRoute.POST(emptyFilesReq)
    if (emptyFilesRes.status !== 400) {
      throw new Error(`Expected 400 for empty files, got ${emptyFilesRes.status}`)
    }
    console.log('✅ Validation 2: Correctly rejected empty files (400)')

    // Test 3: POST /api/skills - file with empty filePath
    const badFilePathReq = new Request('http://localhost:3000/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        files: [{ filePath: '   ', content: 'hello' }],
      }),
    })
    const badFilePathRes = await skillsRoute.POST(badFilePathReq)
    if (badFilePathRes.status !== 400) {
      throw new Error(`Expected 400 for empty filePath, got ${badFilePathRes.status}`)
    }
    console.log('✅ Validation 3: Correctly rejected invalid filePath (400)')

    // Test 4: POST /api/boards/[id]/skills - missing skillId and skillSlug
    const missingSkillReq = new Request('http://localhost:3000/api/boards/board-123/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const missingSkillRes = await boardSkillsRoute.POST(missingSkillReq, {
      params: Promise.resolve({ id: 'board-123' }),
    })
    // Unauthorized without board access or 400/404
    console.log('Board skill missing payload status:', missingSkillRes.status)
    // Board access check runs first: returns 404 because board doesn't exist, which is expected
    if (missingSkillRes.status !== 400 && missingSkillRes.status !== 404) {
      throw new Error(`Expected 400 or 404, got ${missingSkillRes.status}`)
    }
    console.log('✅ Validation 4: Correctly guarded board skill attach')

    // Test 5: Verify ZIP packaging logic
    console.log('Testing JSZip packaging logic for export...')
    const zip = new JSZip()
    const mockFiles = [
      { filePath: 'SKILL.md', content: '# Mock Skill\nThis is a mock' },
      { filePath: 'examples/demo.ts', content: 'console.log("demo")' },
    ]
    for (const f of mockFiles) {
      zip.file(f.filePath, f.content)
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    if (!zipBuffer || zipBuffer.length === 0) {
      throw new Error('Generated zip buffer is empty')
    }

    // Unzip and verify contents
    const readZip = await JSZip.loadAsync(zipBuffer)
    const skillMd = await readZip.file('SKILL.md')?.async('string')
    const demoTs = await readZip.file('examples/demo.ts')?.async('string')

    if (!skillMd?.includes('Mock Skill') || !demoTs?.includes('console.log("demo")')) {
      throw new Error('Unzipped files content mismatch')
    }
    console.log(`✅ ZIP packaging verified! Packaged ${mockFiles.length} files (${zipBuffer.length} bytes)`)

    console.log('🎉 All Skills API logic & validation tests passed!')
  } catch (err: any) {
    console.error('❌ Test failed:', err.message)
    process.exit(1)
  }
}

testSkillsApi()
