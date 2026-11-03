interface ContextDoc {
  id: string
  fileName: string
  content: string
}

interface ComponentItem {
  name: string
}

function findUnimportedHtml(docs: ContextDoc[], components: ComponentItem[]): ContextDoc[] {
  return docs.filter((d) => {
    if (!d.fileName.toLowerCase().endsWith('.html')) return false
    const baseName = d.fileName.replace(/\.html$/i, '')
    return !components.some((c) => c.name.toLowerCase() === baseName.toLowerCase())
  })
}

const mockDocs = [
  { id: '1', fileName: 'guide.md', content: '# Guide' },
  { id: '2', fileName: 'login-screen.html', content: '<div class="login"></div>' },
  { id: '3', fileName: 'button.html', content: '<button>Click</button>' },
]

const mockComps = [{ name: 'button' }]

const unimported = findUnimportedHtml(mockDocs, mockComps)
console.log('Unimported count:', unimported.length)
if (unimported.length !== 1 || unimported[0].fileName !== 'login-screen.html') {
  throw new Error('Detection logic failed!')
}
console.log('Detection logic PASS!')
