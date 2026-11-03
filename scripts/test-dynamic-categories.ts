function extractCategories(components: { category?: string | null }[]): string[] {
  const cats = new Set<string>()
  components.forEach((c) => {
    if (c.category && c.category.trim()) {
      cats.add(c.category.trim())
    }
  })
  return ['All', ...Array.from(cats).sort()]
}

const mockComponents = [
  { category: 'Navigation' },
  { category: 'Card' },
  { category: 'Navigation' },
  { category: '' },
  { category: 'Auth' },
]

const result = extractCategories(mockComponents)
console.log('Result categories:', result)
if (JSON.stringify(result) !== JSON.stringify(['All', 'Auth', 'Card', 'Navigation'])) {
  throw new Error('Categories extraction failed!')
}
console.log('Category extraction logic PASS!')
