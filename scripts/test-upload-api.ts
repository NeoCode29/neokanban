import fs from 'fs'
import path from 'path'
import { POST } from '../src/app/api/upload/route'

async function runUploadTests() {
  console.log('--- Testing /api/upload Route Handler ---')

  // 1. Unauthorized request
  delete process.env.TEST_AUTH_USER
  const unauthReq = new Request('http://localhost:3000/api/upload', {
    method: 'POST',
    body: new FormData(),
  })
  const unauthRes = await POST(unauthReq)
  console.log('1. Unauthorized status:', unauthRes.status)
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401, got ${unauthRes.status}`)
  }

  // Set authenticated test user
  process.env.TEST_AUTH_USER = JSON.stringify({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  })

  // 2. Request with invalid file type (e.g. text file)
  const badFormData = new FormData()
  const textBlob = new Blob(['hello world'], { type: 'text/plain' })
  badFormData.append('file', textBlob, 'notes.txt')
  const badReq = new Request('http://localhost:3000/api/upload', {
    method: 'POST',
    body: badFormData,
  })
  const badRes = await POST(badReq)
  console.log('2. Invalid file type status:', badRes.status)
  if (badRes.status !== 400) {
    throw new Error(`Expected 400 for text/plain, got ${badRes.status}`)
  }

  // 3. Request with valid PNG image
  // 1x1 transparent PNG bytes
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const pngBuffer = Buffer.from(pngBase64, 'base64')
  const pngBlob = new Blob([pngBuffer], { type: 'image/png' })

  const validFormData = new FormData()
  validFormData.append('file', pngBlob, 'screenshot-proof.png')
  const validReq = new Request('http://localhost:3000/api/upload', {
    method: 'POST',
    body: validFormData,
  })
  const validRes = await POST(validReq)
  console.log('3. Valid upload status:', validRes.status)
  if (validRes.status !== 200) {
    const errText = await validRes.text()
    throw new Error(`Expected 200, got ${validRes.status}: ${errText}`)
  }

  const result = await validRes.json()
  console.log('Upload result:', result)

  // Verify file was written to disk
  const writtenFilePath = path.join(process.cwd(), 'public', result.url)
  const exists = fs.existsSync(writtenFilePath)
  console.log('File exists on disk at public/uploads:', exists)

  if (!exists) {
    throw new Error('Uploaded file does not exist on disk!')
  }

  // Clean up test file
  fs.unlinkSync(writtenFilePath)
  console.log('Cleaned up test file:', writtenFilePath)

  delete process.env.TEST_AUTH_USER
  console.log('✅ ALL UPLOAD API TESTS PASSED SUCCESSFULLY!')
}

runUploadTests()
  .then(() => process.exit(0))
  .catch((err) => {
    delete process.env.TEST_AUTH_USER
    console.error('❌ Upload test failed:', err)
    process.exit(1)
  })

