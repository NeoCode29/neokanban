import fs from 'fs'
import path from 'path'

console.log('🧪 Testing BambooLogo Component and SVG Asset...')

// 1. Check public/bamboo-logo.svg exists and contains valid SVG coordinates
const svgPath = path.join(process.cwd(), 'public', 'bamboo-logo.svg')
if (!fs.existsSync(svgPath)) {
  console.error('❌ Failed: public/bamboo-logo.svg does not exist!')
  process.exit(1)
}

const svgContent = fs.readFileSync(svgPath, 'utf-8')
if (!svgContent.includes('viewBox="0 0 32 32"') || !svgContent.includes('<path')) {
  console.error('❌ Failed: public/bamboo-logo.svg missing viewBox or path definition!')
  process.exit(1)
}

// 2. Check src/components/ui/BambooLogo.tsx exists and exports valid props
const componentPath = path.join(process.cwd(), 'src', 'components', 'ui', 'BambooLogo.tsx')
if (!fs.existsSync(componentPath)) {
  console.error('❌ Failed: src/components/ui/BambooLogo.tsx does not exist!')
  process.exit(1)
}

const componentContent = fs.readFileSync(componentPath, 'utf-8')
if (
  !componentContent.includes('export default function BambooLogo') ||
  !componentContent.includes('BambooLogoProps') ||
  !componentContent.includes("isBadge")
) {
  console.error('❌ Failed: BambooLogo.tsx missing required component props or export!')
  process.exit(1)
}

console.log('✅ PASS: BambooLogo component and SVG vector verified successfully!')
process.exit(0)
