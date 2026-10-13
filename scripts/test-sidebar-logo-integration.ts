import fs from 'fs'
import path from 'path'

console.log('🧪 Testing Sidebar Logo Integration...')

const sidebarPath = path.join(process.cwd(), 'src', 'components', 'layout', 'Sidebar.tsx')
const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8')

// Must import BambooLogo
if (!sidebarContent.includes("import BambooLogo from '@/components/ui/BambooLogo'")) {
  console.error('❌ Failed: Sidebar.tsx does not import BambooLogo!')
  process.exit(1)
}

// Must NOT contain placeholder ▲
if (sidebarContent.includes('▲')) {
  console.error('❌ Failed: Sidebar.tsx still contains placeholder triangle (▲)!')
  process.exit(1)
}

// Must render BambooLogo
if (!sidebarContent.includes('<BambooLogo')) {
  console.error('❌ Failed: Sidebar.tsx does not render BambooLogo component!')
  process.exit(1)
}

console.log('✅ PASS: Sidebar logo integration verified successfully!')
process.exit(0)
