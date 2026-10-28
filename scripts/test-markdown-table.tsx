import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MarkdownViewer from '../src/components/ui/MarkdownViewer'

const sampleMarkdown = `
# Sample Title

Here is a table:

| Fitur | Status | PIC |
| :--- | :---: | ---: |
| Markdown Tables | Selesai | Frontend Specialist |
| Image Upload | In Progress | Fullstack |
| Role Management | Backlog | Backend Specialist |

Check image:
![Sample Preview](https://example.com/demo.png)
`

async function testMarkdownTable() {
  console.log('--- Testing MarkdownViewer Table & Image Rendering ---')
  const html = renderToStaticMarkup(<MarkdownViewer content={sampleMarkdown} />)
  
  const hasTable = html.includes('<table')
  const hasThead = html.includes('<thead')
  const hasTh = html.includes('Markdown Tables') || html.includes('Fitur')
  const hasImg = html.includes('<img') && html.includes('https://example.com/demo.png')

  console.log('Contains <table:', hasTable)
  console.log('Contains <thead:', hasThead)
  console.log('Contains <th> with Fitur:', hasTh)
  console.log('Contains <img> with demo.png:', hasImg)

  if (hasTable && hasThead && hasTh && hasImg) {
    console.log('✅ ALL CHECKS PASSED: Markdown table and image render properly!')
    process.exit(0)
  } else {
    console.error('❌ FAILED: Output HTML did not contain expected elements.')
    console.error('Rendered HTML:\n', html)
    process.exit(1)
  }
}

testMarkdownTable().catch((err) => {
  console.error(err)
  process.exit(1)
})

