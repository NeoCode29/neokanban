import assert from 'assert'

// Simulated shell wrapping logic identical to PreviewCanvas.tsx
function renderPreviewHtml(
  htmlContent: string,
  isComponent: boolean = false,
  backdropTheme: 'dark' | 'light' | 'checker' = 'dark'
): string {
  if (!htmlContent || !htmlContent.trim()) return ''

  const guardScript = `<script id="__neokanban_prototype_guard__">/* guard */</script>`
  const isFullDoc = /<!DOCTYPE\s+html/i.test(htmlContent) || /<html[\s>]/i.test(htmlContent)

  // Case A: Isolated Component Snippet -> Wrap in full Tailwind + Modern Font Shell
  if (!isFullDoc || isComponent) {
    if (isFullDoc) {
      let content = htmlContent
      if (!content.includes('tailwindcss')) {
        const twCdn = `
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
`
        if (/<head[^>]*>/i.test(content)) {
          content = content.replace(/(<head[^>]*>)/i, '$1' + twCdn)
        }
      }
      if (/<head[^>]*>/i.test(content)) {
        content = content.replace(/(<head[^>]*>)/i, '$1<base target="_self">')
      }
      if (/<\/body>/i.test(content)) {
        return content.replace(/<\/body>/i, guardScript + '</body>')
      }
      return content + guardScript
    }

    // Wrap component fragment inside production Tailwind CSS canvas shell
    return `<!DOCTYPE html>
<html lang="id" class="${backdropTheme === 'light' ? 'light' : 'dark'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_self">
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
        },
      },
    }
  </script>
  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <!-- FontAwesome Icons for components using <i class="fa ..."> -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem;
      transition: background-color 0.2s, color 0.2s;
    }
    body.theme-dark {
      background-color: #0b0f17;
      color: #f0f6fc;
    }
    body.theme-light {
      background-color: #f8fafc;
      color: #0f172a;
    }
    body.theme-checker {
      background-color: #1a1f2c;
      background-image: 
        linear-gradient(45deg, #111520 25%, transparent 25%), 
        linear-gradient(-45deg, #111520 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #111520 75%), 
        linear-gradient(-45deg, transparent 75%, #111520 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      color: #f1f5f9;
    }
  </style>
</head>
<body class="theme-${backdropTheme}">
  <div class="component-stage w-full flex items-center justify-center">
    ${htmlContent}
  </div>
  ${guardScript}
</body>
</html>`
  }

  // Case B: Full HTML Document
  let content = htmlContent
  if (!content.includes('tailwindcss')) {
    const twCdn = `
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
`
    if (/<head[^>]*>/i.test(content)) {
      content = content.replace(/(<head[^>]*>)/i, '$1' + twCdn)
    }
  }

  if (/<head[^>]*>/i.test(content)) {
    content = content.replace(/(<head[^>]*>)/i, '$1<base target="_self">')
  }

  if (/<\/body>/i.test(content)) {
    return content.replace(/<\/body>/i, guardScript + '</body>')
  }
  return content + guardScript
}

function runTests() {
  console.log('🧪 Testing UI Component Auto-Shell & Tailwind Injection...')

  // Test 1: Raw component snippet (like Sales Stat Card)
  const statCardFragment = `<div class="bg-[#1b1f2b] p-6 rounded-2xl text-white"><h3>Total sales</h3></div>`
  const result1 = renderPreviewHtml(statCardFragment, true, 'dark')

  assert(result1.includes('<!DOCTYPE html>'), 'Test 1 Failed: Must wrap in DOCTYPE')
  assert(result1.includes('https://cdn.tailwindcss.com'), 'Test 1 Failed: Must include Tailwind CDN')
  assert(result1.includes('component-stage'), 'Test 1 Failed: Must include component-stage wrapper')
  assert(result1.includes('theme-dark'), 'Test 1 Failed: Must apply dark theme class')
  assert(result1.includes('font-family: \'Inter\''), 'Test 1 Failed: Must apply Inter font')
  assert(result1.includes(statCardFragment), 'Test 1 Failed: Must preserve original component HTML')
  console.log('  ✅ Test 1: Component snippet wrapped in modern Tailwind shell successfully.')

  // Test 2: Theme switching for component (Light mode)
  const result2 = renderPreviewHtml(statCardFragment, true, 'light')
  assert(result2.includes('theme-light'), 'Test 2 Failed: Must apply theme-light class')
  assert(result2.includes('class="light"'), 'Test 2 Failed: html tag must have class="light"')
  console.log('  ✅ Test 2: Light mode backdrop applied successfully.')

  // Test 3: Theme switching for component (Checkerboard mode)
  const result3 = renderPreviewHtml(statCardFragment, true, 'checker')
  assert(result3.includes('theme-checker'), 'Test 3 Failed: Must apply theme-checker class')
  console.log('  ✅ Test 3: Checkerboard backdrop applied successfully.')

  // Test 4: Full HTML document that is missing Tailwind CDN
  const fullHtmlWithoutTw = `<!DOCTYPE html><html><head><title>Full Page</title></head><body><h1>Hello</h1></body></html>`
  const result4 = renderPreviewHtml(fullHtmlWithoutTw, false, 'dark')
  assert(result4.includes('https://cdn.tailwindcss.com'), 'Test 4 Failed: Full HTML doc must have Tailwind CDN auto-injected')
  assert(result4.includes('<base target="_self">'), 'Test 4 Failed: Full HTML doc must have base target self')
  console.log('  ✅ Test 4: Full page auto-injected with Tailwind CDN.')

  console.log('\n🎉 ALL 4 TEST SUITES PASSED! Component rendering shell is verified.')
}

runTests()

