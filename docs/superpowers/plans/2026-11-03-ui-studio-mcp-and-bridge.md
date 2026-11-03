# UI Studio MCP Suite, Living Context Bridge & Dynamic Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan 8 tool MCP native untuk UI Studio (pages & components), mengintegrasikan Living Context bridge di `UiStudioView.tsx` (impor cepat 1-klik), dan mengonversi filter kategori menjadi dinamis.

**Architecture:** 
- MCP Daemon di `mcp/src/index.ts` mengekspos 8 tool REST-mapped yang memanggil endpoint `/api/boards/[id]/ui-components` dan `/api/boards/[id]/ui-pages` dengan Bearer PAT token.
- `UiStudioView.tsx` memuat Living Context (`/api/boards/[id]/context`), mendeteksi dokumen `.html` baru, dan menampilkan banner aksi cepat untuk membuka `AddEditComponentModal` dengan data pra-isi.
- Filter kategori menggunakan `useMemo` berbasis `components.map(c => c.category)` dengan fallback state safety ke `'All'`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, `@modelcontextprotocol/sdk`, Prisma 6.4.

## Global Constraints
- Database PostgreSQL berjalan di `localhost:5435` (`neokanban-postgres`).
- Endpoint API sudah memiliki sanitasi null-byte (`sanitizeUtf8`) dan batasan payload HTML (2MB).
- Bearer PAT token diambil dari `NEOKANBAN_PAT` atau file `.neokanban.json`.
- Seluruh kode harus lolos `npm run mcp:build` dan `npm run build`.

---

### Task 1: MCP Server Suite for UI Studio (8 Tools)

**Agent:** backend-specialist  
**Files:**
- Modify: `neokanban/mcp/src/index.ts`
- Test: `neokanban/scripts/test-mcp-ui-studio-tools.ts`
- Build Output: `neokanban/mcp/dist/index.js`

**Interfaces:**
- Produces MCP tools:
  - `list_ui_components({ boardId: string, category?: string, token?: string })`
  - `create_ui_component({ boardId: string, name: string, category?: string, description?: string, htmlContent: string, order?: number, token?: string })`
  - `update_ui_component({ boardId: string, componentId: string, name?: string, category?: string, description?: string, htmlContent?: string, order?: number, token?: string })`
  - `delete_ui_component({ boardId: string, componentId: string, token?: string })`
  - `list_ui_pages({ boardId: string, token?: string })`
  - `create_ui_page({ boardId: string, title: string, path: string, htmlContent: string, status?: 'DRAFT' | 'IN_PROGRESS' | 'READY', description?: string, order?: number, token?: string })`
  - `update_ui_page({ boardId: string, pageId: string, title?: string, path?: string, htmlContent?: string, status?: 'DRAFT' | 'IN_PROGRESS' | 'READY', description?: string, order?: number, token?: string })`
  - `delete_ui_page({ boardId: string, pageId: string, token?: string })`

- [ ] **Step 1: Write failing test script for UI Studio MCP tools**
Create `neokanban/scripts/test-mcp-ui-studio-tools.ts`:
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import path from 'path'
import fs from 'fs'

async function getPatToken(): Promise<string> {
  if (process.env.NEOKANBAN_PAT) return process.env.NEOKANBAN_PAT
  const configPath = path.resolve(process.cwd(), '.neokanban.json')
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    if (config.patToken) return config.patToken
  }
  throw new Error('NEOKANBAN_PAT not found in env or .neokanban.json')
}

async function main() {
  console.log('Testing MCP UI Studio Tools...')
  const token = await getPatToken()

  const serverModule = path.resolve(process.cwd(), 'mcp/dist/index.js')
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverModule],
    env: {
      ...process.env,
      NEOKANBAN_PAT: token,
      NEOKANBAN_API_URL: 'http://localhost:3000',
    },
  })

  const client = new Client(
    { name: 'test-ui-studio-client', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)
  console.log('Connected to MCP server.')

  const { tools } = await client.listTools()
  const toolNames = tools.map((t) => t.name)
  console.log('Available MCP tools count:', toolNames.length)

  const expectedTools = [
    'list_ui_components',
    'create_ui_component',
    'update_ui_component',
    'delete_ui_component',
    'list_ui_pages',
    'create_ui_page',
    'update_ui_page',
    'delete_ui_page',
  ]

  for (const name of expectedTools) {
    if (!toolNames.includes(name)) {
      throw new Error(`Expected MCP tool "${name}" not found in server tools!`)
    }
  }

  console.log('All 8 UI Studio MCP tools are registered successfully!')
  await client.close()
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Run test to verify it fails before MCP implementation**
Run: `npx tsx scripts/test-mcp-ui-studio-tools.ts`
Expected: FAIL (`Expected MCP tool "list_ui_components" not found`)

- [ ] **Step 3: Implement 8 UI Studio MCP Tools in `mcp/src/index.ts`**
In `neokanban/mcp/src/index.ts`, add:
```typescript
// ============================================================================
// UI Studio Tools: Components & Pages
// ============================================================================

server.tool(
  'list_ui_components',
  'Lists all UI Studio components for a board with category filter and annotation summaries.',
  {
    boardId: z.string().describe('Target board ID'),
    category: z.string().optional().describe('Optional category filter (e.g. Navigation, Card)'),
    token: z.string().optional().describe('Personal Access Token override'),
  },
  async ({ boardId, category, token }) => {
    const query = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''
    const data = await apiRequest<{ components: any[] }>(`/api/boards/${boardId}/ui-components${query}`, { token })
    return {
      content: [{ type: 'text', text: JSON.stringify(data.components, null, 2) }],
    }
  }
)

server.tool(
  'create_ui_component',
  'Creates a new reusable UI Studio component for a board.',
  {
    boardId: z.string().describe('Target board ID'),
    name: z.string().describe('Component name (e.g. HeroBanner, Navbar)'),
    category: z.string().default('General').describe('Category preset or custom group'),
    description: z.string().optional().describe('Description or specifications'),
    htmlContent: z.string().describe('Raw HTML/CSS/JS markup of the component'),
    order: z.number().optional().describe('Display sorting order'),
    token: z.string().optional().describe('Personal Access Token override'),
  },
  async ({ boardId, name, category, description, htmlContent, order, token }) => {
    const data = await apiRequest<{ component: any }>(`/api/boards/${boardId}/ui-components`, {
      method: 'POST',
      token,
      body: { name, category, description, htmlContent, order },
    })
    return {
      content: [{ type: 'text', text: JSON.stringify(data.component, null, 2) }],
    }
  }
)

server.tool(
  'update_ui_component',
  'Updates an existing UI Studio component (markup, name, category, or order).',
  {
    boardId: z.string().describe('Target board ID'),
    componentId: z.string().describe('Target component ID'),
    name: z.string().optional().describe('Updated name'),
    category: z.string().optional().describe('Updated category'),
    description: z.string().optional().describe('Updated description'),
    htmlContent: z.string().optional().describe('Updated HTML/CSS/JS markup'),
    order: z.number().optional().describe('Updated display order'),
    token: z.string().optional().describe('Personal Access Token override'),
  },
  async ({ boardId, componentId, name, category, description, htmlContent, order, token }) => {
    const data = await apiRequest<{ component: any }>(`/api/boards/${boardId}/ui-components/${componentId}`, {
      method: 'PUT',
      token,
      body: { name, category, description, htmlContent, order },
    })
    return {
      content: [{ type: 'text', text: JSON.stringify(data.component, null, 2) }],
    }
  }
)

server.tool(
  'delete_ui_component',
  'Deletes a UI Studio component from a board.',
  {
    boardId: z.string().describe('Target board ID'),
    componentId: z.string().describe('Target component ID to delete'),
    token: z.string().optional().describe('Personal Access Token override'),
  },
  async ({ boardId, componentId, token }) => {
    const data = await apiRequest<{ message: string }>(`/api/boards/${boardId}/ui-components/${componentId}`, {
      method: 'DELETE',
      token,
    })
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

server.tool(
  'list_ui_pages',
  'Lists all prototype site map pages for a board.',
  {
    boardId: z.string().describe('Target board ID'),
    token: z.string().optional().describe('Personal Access Token override'),
  },
  async ({ boardId, token }) => {
    const data = await apiRequest<{ pages: any[] }>(`/api/boards/${boardId}/ui-pages`, { token })
    return {
      content: [{ type: 'text', text: JSON.stringify(data.pages, null, 2) }],
    }
  }
)

server.tool(
  'create_ui_page',
  'Creates a new prototype site map page in UI Studio.',
  {
    boardId: z.string().describe('Target board ID'),
    title: z.string().describe('Page title (e.g. Checkout Page)'),
    path: z.string().describe('URL route path (e.g. /checkout)'),
    htmlContent: z.string().describe('Raw HTML/CSS/JS markup of the full page'),
    status: z.enum(['DRAFT', 'IN_PROGRESS', 'READY']).default('DRAFT').describe('Development status'),
    description: z.string().optional().describe('Page requirements or notes'),
    order: z.number().optional().describe('Display order'),
    token: z.string().optional().describe('Personal Access Token override'),
  },
  async ({ boardId, title, path, htmlContent, status, description, order, token }) => {
    const data = await apiRequest<{ page: any }>(`/api/boards/${boardId}/ui-pages`, {
      method: 'POST',
      token,
      body: { title, path, htmlContent, status, description, order },
    })
    return {
      content: [{ type: 'text', text: JSON.stringify(data.page, null, 2) }],
    }
  }
)

server.tool(
  'update_ui_page',
  'Updates an existing UI Studio prototype page.',
  {
    boardId: z.string().describe('Target board ID'),
    pageId: z.string().describe('Target page ID to update'),
    title: z.string().optional().describe('Updated page title'),
    path: z.string().optional().describe('Updated route path'),
    htmlContent: z.string().optional().describe('Updated HTML markup'),
    status: z.enum(['DRAFT', 'IN_PROGRESS', 'READY']).optional().describe('Updated development status'),
    description: z.string().optional().describe('Updated description'),
    order: z.number().optional().describe('Updated display order'),
    token: z.string().optional().describe('Personal Access Token override'),
  },
  async ({ boardId, pageId, title, path, htmlContent, status, description, order, token }) => {
    const data = await apiRequest<{ page: any }>(`/api/boards/${boardId}/ui-pages/${pageId}`, {
      method: 'PUT',
      token,
      body: { title, path, htmlContent, status, description, order },
    })
    return {
      content: [{ type: 'text', text: JSON.stringify(data.page, null, 2) }],
    }
  }
)

server.tool(
  'delete_ui_page',
  'Deletes a prototype page from a board in UI Studio.',
  {
    boardId: z.string().describe('Target board ID'),
    pageId: z.string().describe('Target page ID to delete'),
    token: z.string().optional().describe('Personal Access Token override'),
  },
  async ({ boardId, pageId, token }) => {
    const data = await apiRequest<{ message: string }>(`/api/boards/${boardId}/ui-pages/${pageId}`, {
      method: 'DELETE',
      token,
    })
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)
```

- [ ] **Step 4: Build MCP Server and run test to verify pass**
Run:
```bash
npm run mcp:build
npx tsx scripts/test-mcp-ui-studio-tools.ts
```
Expected: PASS (`All 8 UI Studio MCP tools are registered successfully!`)

- [ ] **Step 5: Commit Task 1**
```bash
git add mcp/src/index.ts mcp/dist/index.js scripts/test-mcp-ui-studio-tools.ts
git commit -m "feat(mcp): add 8 native MCP tools for UI Studio components and pages"
```

---

### Task 2: Dynamic Category Filter in UI Studio Web

**Agent:** frontend-specialist  
**Files:**
- Modify: `neokanban/src/components/ui-studio/UiStudioView.tsx:50-105`
- Modify: `neokanban/src/components/ui-studio/AddEditComponentModal.tsx`

**Interfaces:**
- Replaces static `CATEGORY_PRESETS` with `dynamicCategories` derived from `components`.
- Ensures state safety: if selected category is missing, resets to `'All'`.
- Passes `existingCategories` to `AddEditComponentModal` as preset suggestions.

- [ ] **Step 1: Write test script to verify dynamic category extraction logic**
Create `neokanban/scripts/test-dynamic-categories.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify logic**
Run: `npx tsx scripts/test-dynamic-categories.ts`
Expected: PASS

- [ ] **Step 3: Update `UiStudioView.tsx` with `dynamicCategories` and fallback safety**
Replace static array in `src/components/ui-studio/UiStudioView.tsx`:
```typescript
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>()
    components.forEach((c) => {
      if (c.category && c.category.trim()) {
        cats.add(c.category.trim())
      }
    })
    return ['All', ...Array.from(cats).sort()]
  }, [components])

  useEffect(() => {
    if (selectedCategory !== 'All' && !dynamicCategories.includes(selectedCategory)) {
      setSelectedCategory('All')
    }
  }, [dynamicCategories, selectedCategory])
```
And pass `existingCategories={dynamicCategories.filter((c) => c !== 'All')}` to `AddEditComponentModal`.

- [ ] **Step 4: Update `AddEditComponentModal.tsx` to accept and display existing category suggestions**
In `src/components/ui-studio/AddEditComponentModal.tsx`, add `existingCategories?: string[]` to props and add a suggestion datalist or quick pills under the Category text input.

- [ ] **Step 5: Verify build & commit Task 2**
Run: `npm run build`
Commit:
```bash
git add src/components/ui-studio/UiStudioView.tsx src/components/ui-studio/AddEditComponentModal.tsx scripts/test-dynamic-categories.ts
git commit -m "feat(ui-studio): add dynamic category filter and category suggestions"
```

---

### Task 3: Living Context Bridge in UI Studio Web

**Agent:** frontend-specialist  
**Files:**
- Modify: `neokanban/src/components/ui-studio/UiStudioView.tsx`

**Interfaces:**
- Consumes: `GET /api/boards/${boardId}/context`
- Produces: Banner in UI Studio subTab `'components'` with 1-click modal import trigger.

- [ ] **Step 1: Write verification script to test Living Context detection**
Create `neokanban/scripts/test-context-bridge-detection.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify detection logic**
Run: `npx tsx scripts/test-context-bridge-detection.ts`
Expected: PASS

- [ ] **Step 3: Implement Context Bridge in `UiStudioView.tsx`**
1. Add state:
```typescript
const [contextDocs, setContextDocs] = useState<any[]>([])
const [dismissedBridgeBanner, setDismissedBridgeBanner] = useState(false)
```
2. In `fetchAllData`:
```typescript
const ctxRes = await fetch(`/api/boards/${boardId}/context`)
if (ctxRes.ok) {
  const ctxData = await ctxRes.json()
  setContextDocs(ctxData.documents || [])
}
```
3. Calculate unimported HTML:
```typescript
const unimportedHtmlDocs = useMemo(() => {
  return contextDocs.filter((d) => {
    if (!d.fileName?.toLowerCase().endsWith('.html')) return false
    const baseName = d.fileName.replace(/\.html$/i, '')
    return !components.some((c) => c.name.toLowerCase() === baseName.toLowerCase())
  })
}, [contextDocs, components])
```
4. Render Counsel Minimalist bridge banner above component listing:
```tsx
{subTab === 'components' && unimportedHtmlDocs.length > 0 && !dismissedBridgeBanner && (
  <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/60 p-3.5 text-sm flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <Code2 className="w-4 h-4 text-amber-700 shrink-0" />
      <span className="text-amber-900 font-medium">
        Ditemukan {unimportedHtmlDocs.length} berkas HTML di Living Context (misal: <code>{unimportedHtmlDocs[0].fileName}</code>).
      </span>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          const doc = unimportedHtmlDocs[0]
          setEditingComponent(null)
          setInitialComponentValues({
            name: doc.fileName.replace(/\.html$/i, ''),
            category: 'General',
            description: `Diimpor dari Living Context (${doc.fileName})`,
            htmlContent: doc.content || '',
          })
          setShowComponentModal(true)
        }}
        className="px-2.5 py-1 text-xs font-semibold bg-amber-600 text-white rounded hover:bg-amber-700 transition"
      >
        + Import ke Catalog
      </button>
      <button
        onClick={() => setDismissedBridgeBanner(true)}
        className="p-1 text-amber-600 hover:text-amber-800"
        title="Tutup banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify build & commit Task 3**
Run: `npm run build`
Commit:
```bash
git add src/components/ui-studio/UiStudioView.tsx scripts/test-context-bridge-detection.ts
git commit -m "feat(ui-studio): add Living Context bridge banner for importing HTML documents"
```

---

### Task 4: End-to-End Build & Production Verification

**Agent:** qa-tester  
**Files:**
- Entire codebase

- [ ] **Step 1: Run MCP build**
Run: `npm run mcp:build`
Expected: Clean compilation to `mcp/dist/index.js` with code 0.

- [ ] **Step 2: Run Full Next.js production build**
Run: `npm run build`
Expected: Compiled successfully with 0 errors.

- [ ] **Step 3: Run comprehensive verification script**
Run: `npx tsx scripts/test-mcp-ui-studio-tools.ts`
Expected: All 8 tools verified.

- [ ] **Step 4: Commit and push**
```bash
git push origin feat/ui-ux-studio
```

