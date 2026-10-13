import fs from 'fs'
import path from 'path'

console.log('🧪 Testing Auth Pages Logo and App Icon Metadata...')

// 1. Check icon.svg
const iconPath = path.join(process.cwd(), 'src', 'app', 'icon.svg')
if (!fs.existsSync(iconPath)) {
  console.error('❌ Failed: src/app/icon.svg does not exist!')
  process.exit(1)
}

// 2. Check login page renders BambooLogo
const loginPath = path.join(process.cwd(), 'src', 'app', '(auth)', 'login', 'page.tsx')
const loginContent = fs.readFileSync(loginPath, 'utf-8')
if (!loginContent.includes('BambooLogo')) {
  console.error('❌ Failed: login/page.tsx does not include BambooLogo!')
  process.exit(1)
}

// 3. Check register page renders BambooLogo
const registerPath = path.join(process.cwd(), 'src', 'app', '(auth)', 'register', 'page.tsx')
const registerContent = fs.readFileSync(registerPath, 'utf-8')
if (!registerContent.includes('BambooLogo')) {
  console.error('❌ Failed: register/page.tsx does not include BambooLogo!')
  process.exit(1)
}

console.log('✅ PASS: Auth pages and app icon metadata verified successfully!')
process.exit(0)
