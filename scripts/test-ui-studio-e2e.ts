import { prisma } from '../src/lib/prisma'

async function runTest() {
  console.log('=== Step 1: Testing UI Studio Database & Prisma Operations ===')

  // Find or create test user and board
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'uistudio-tester@neokanban.dev',
        name: 'UI Studio Tester',
        passwordHash: 'dummy-hash',
      },
    })
    console.log('Created test user:', user.id)
  }

  let board = await prisma.board.findFirst({
    include: { columns: { orderBy: { order: 'asc' } } },
  })

  if (!board) {
    board = await prisma.board.create({
      data: {
        title: 'UI Studio Test Board',
        ownerId: user.id,
        columns: {
          create: [
            { title: 'To Do', order: 0 },
            { title: 'In Progress', order: 1 },
            { title: 'Done', order: 2 },
          ],
        },
      },
      include: { columns: { orderBy: { order: 'asc' } } },
    })
    console.log('Created test board:', board.id)
  }

  if (!board.columns || board.columns.length === 0) {
    const col = await prisma.column.create({
      data: {
        boardId: board.id,
        title: 'To Do',
        order: 0,
      },
    })
    board.columns = [col]
  }

  console.log(`Using user: ${user.email} (${user.id}), board: ${board.title} (${board.id})`)

  // 1. Test Create UiPage via Prisma
  const page = await prisma.uiPage.create({
    data: {
      boardId: board.id,
      title: 'Login Page Prototype',
      path: '/login',
      description: 'Halaman autentikasi utama',
      status: 'IN_PROGRESS',
      htmlContent: '<div class="p-8"><button class="bg-blue-500 text-white p-2">Login</button></div>',
    },
  })
  console.log('✓ UiPage created via Prisma:', page.id)

  // 2. Test Create UiComponent via Prisma
  const comp = await prisma.uiComponent.create({
    data: {
      boardId: board.id,
      name: 'PrimaryButton',
      category: 'Input',
      description: 'Tombol aksi utama',
      htmlContent: '<button style="background:blue;color:white;padding:8px 16px;">Click Me</button>',
    },
  })
  console.log('✓ UiComponent created via Prisma:', comp.id)

  // 3. Test Create UiAnnotation (PIN and BOX) via Prisma
  const pin = await prisma.uiAnnotation.create({
    data: {
      pageId: page.id,
      authorId: user.id,
      type: 'PIN',
      posX: 25.5,
      posY: 40.0,
      comment: 'Warna tombol kurang kontras dengan background',
      status: 'OPEN',
    },
  })
  console.log('✓ UiAnnotation PIN created via Prisma:', pin.id)

  const box = await prisma.uiAnnotation.create({
    data: {
      componentId: comp.id,
      authorId: user.id,
      type: 'BOX',
      posX: 10.0,
      posY: 15.0,
      width: 50.0,
      height: 30.0,
      comment: 'Padding terlalu sempit di layar mobile',
      status: 'OPEN',
    },
  })
  console.log('✓ UiAnnotation BOX created via Prisma:', box.id)

  // 4. Test Convert Annotation to Kanban Task
  const targetCol = board.columns[0]
  const card = await prisma.card.create({
    data: {
      columnId: targetCol.id,
      title: `[UI Feedback] ${page.title}: ${pin.comment.substring(0, 30)}`,
      description: `Posisi: X ${pin.posX}%, Y ${pin.posY}%\nKomentar: ${pin.comment}`,
      order: 9999,
    },
  })
  const updatedPin = await prisma.uiAnnotation.update({
    where: { id: pin.id },
    data: { cardId: card.id },
  })
  if (updatedPin.cardId !== card.id) {
    throw new Error('Failed to link cardId to UiAnnotation')
  }
  console.log('✓ Converted to Kanban Task Card via Prisma:', card.id)

  // Verify relations
  const pageWithAnnotations = await prisma.uiPage.findUnique({
    where: { id: page.id },
    include: { annotations: true },
  })
  if (!pageWithAnnotations || pageWithAnnotations.annotations.length !== 1) {
    throw new Error('UiPage annotations relation mismatch')
  }

  // Cleanup Prisma test records
  await prisma.uiPage.delete({ where: { id: page.id } })
  await prisma.uiComponent.delete({ where: { id: comp.id } })
  await prisma.card.delete({ where: { id: card.id } })
  console.log('✓ Prisma models & relations verified and cleaned up.')

  console.log('\n=== Step 2: Testing UI Studio Next.js Route Handlers ===')

  // Set authenticated test user
  process.env.TEST_AUTH_USER = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
  })

  // Dynamic import of route modules (will fail if routes don't exist yet - RED test)
  const pagesRoute = await import('../src/app/api/boards/[id]/ui-pages/route')
  const pageDetailRoute = await import('../src/app/api/boards/[id]/ui-pages/[pageId]/route')
  const componentsRoute = await import('../src/app/api/boards/[id]/ui-components/route')
  const componentDetailRoute = await import('../src/app/api/boards/[id]/ui-components/[componentId]/route')
  const annotationsRoute = await import('../src/app/api/ui-annotations/route')
  const annotationDetailRoute = await import('../src/app/api/ui-annotations/[id]/route')
  const convertTaskRoute = await import('../src/app/api/ui-annotations/[id]/convert-task/route')

  console.log('✓ All 7 API route handler modules imported successfully!')

  // Route Test 1: POST /api/boards/[id]/ui-pages with null-byte sanitization
  const createPageReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Dashboard Prototype \0 Safe',
      path: '/dashboard',
      description: 'Analytics overview \0 description',
      status: 'IN_PROGRESS',
      htmlContent: '<div class="stats">\0<h1>Stats</h1></div>',
    }),
  })
  const createPageRes = await pagesRoute.POST(createPageReq, { params: Promise.resolve({ id: board.id }) })
  if (createPageRes.status !== 201) {
    const err = await createPageRes.json()
    throw new Error(`Failed to create page via API: ${JSON.stringify(err)}`)
  }
  const { page: createdApiPage } = await createPageRes.json()
  if (createdApiPage.title.includes('\0') || createdApiPage.htmlContent.includes('\0')) {
    throw new Error('Null byte was not sanitized in UiPage!')
  }
  console.log('✓ API POST /api/boards/[id]/ui-pages succeeded & null-byte sanitized:', createdApiPage.id)

  // Route Test 2: GET /api/boards/[id]/ui-pages
  const listPagesReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-pages`)
  const listPagesRes = await pagesRoute.GET(listPagesReq, { params: Promise.resolve({ id: board.id }) })
  const { pages: apiPages } = await listPagesRes.json()
  if (!Array.isArray(apiPages) || !apiPages.some((p: any) => p.id === createdApiPage.id)) {
    throw new Error('Created page not found in GET /api/boards/[id]/ui-pages')
  }
  console.log(`✓ API GET /api/boards/[id]/ui-pages returned ${apiPages.length} pages`)

  // Route Test 3: GET /api/boards/[id]/ui-pages/[pageId]
  const getPageReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-pages/${createdApiPage.id}`)
  const getPageRes = await pageDetailRoute.GET(getPageReq, {
    params: Promise.resolve({ id: board.id, pageId: createdApiPage.id }),
  })
  const { page: fetchedPage } = await getPageRes.json()
  if (fetchedPage.id !== createdApiPage.id) {
    throw new Error('Page mismatch in GET /api/boards/[id]/ui-pages/[pageId]')
  }
  console.log('✓ API GET /api/boards/[id]/ui-pages/[pageId] fetched single page')

  // Route Test 4: PUT /api/boards/[id]/ui-pages/[pageId]
  const updatePageReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-pages/${createdApiPage.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Dashboard Prototype Updated',
      status: 'READY',
    }),
  })
  const updatePageRes = await pageDetailRoute.PUT(updatePageReq, {
    params: Promise.resolve({ id: board.id, pageId: createdApiPage.id }),
  })
  const { page: updatedApiPage } = await updatePageRes.json()
  if (updatedApiPage.title !== 'Dashboard Prototype Updated' || updatedApiPage.status !== 'READY') {
    throw new Error('Update failed in PUT /api/boards/[id]/ui-pages/[pageId]')
  }
  console.log('✓ API PUT /api/boards/[id]/ui-pages/[pageId] updated title and status')

  // Route Test 5: POST /api/boards/[id]/ui-components
  const createCompReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'StatsCard \0 Component',
      category: 'Analytics',
      description: 'Card with chart metric',
      htmlContent: '<div class="card">\0<p>Metrics</p></div>',
    }),
  })
  const createCompRes = await componentsRoute.POST(createCompReq, { params: Promise.resolve({ id: board.id }) })
  if (createCompRes.status !== 201) {
    const err = await createCompRes.json()
    throw new Error(`Failed to create component via API: ${JSON.stringify(err)}`)
  }
  const { component: createdApiComp } = await createCompRes.json()
  if (createdApiComp.name.includes('\0') || createdApiComp.htmlContent.includes('\0')) {
    throw new Error('Null byte was not sanitized in UiComponent!')
  }
  console.log('✓ API POST /api/boards/[id]/ui-components succeeded:', createdApiComp.id)

  // Route Test 6: GET /api/boards/[id]/ui-components
  const listCompsReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-components?category=Analytics`)
  const listCompsRes = await componentsRoute.GET(listCompsReq, { params: Promise.resolve({ id: board.id }) })
  const { components: apiComps } = await listCompsRes.json()
  if (!Array.isArray(apiComps) || !apiComps.some((c: any) => c.id === createdApiComp.id)) {
    throw new Error('Created component not found in GET /api/boards/[id]/ui-components')
  }
  console.log(`✓ API GET /api/boards/[id]/ui-components returned ${apiComps.length} components`)

  // Route Test 7: GET /api/boards/[id]/ui-components/[componentId]
  const getCompReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-components/${createdApiComp.id}`)
  const getCompRes = await componentDetailRoute.GET(getCompReq, {
    params: Promise.resolve({ id: board.id, componentId: createdApiComp.id }),
  })
  const { component: fetchedComp } = await getCompRes.json()
  if (fetchedComp.id !== createdApiComp.id) {
    throw new Error('Component mismatch in GET /api/boards/[id]/ui-components/[componentId]')
  }
  console.log('✓ API GET /api/boards/[id]/ui-components/[componentId] fetched component')

  // Route Test 8: PUT /api/boards/[id]/ui-components/[componentId]
  const updateCompReq = new Request(`http://localhost:3000/api/boards/${board.id}/ui-components/${createdApiComp.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'DataDisplay',
    }),
  })
  const updateCompRes = await componentDetailRoute.PUT(updateCompReq, {
    params: Promise.resolve({ id: board.id, componentId: createdApiComp.id }),
  })
  const { component: updatedApiComp } = await updateCompRes.json()
  if (updatedApiComp.category !== 'DataDisplay') {
    throw new Error('Category update failed in PUT /api/boards/[id]/ui-components/[componentId]')
  }
  console.log('✓ API PUT /api/boards/[id]/ui-components/[componentId] updated category')

  // Route Test 9: POST /api/ui-annotations (PIN on Page)
  const createAnnReq = new Request('http://localhost:3000/api/ui-annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pageId: createdApiPage.id,
      type: 'PIN',
      posX: 50.0,
      posY: 50.0,
      comment: 'Perbaiki kontras warna teks judul di header ini',
    }),
  })
  const createAnnRes = await annotationsRoute.POST(createAnnReq)
  if (createAnnRes.status !== 201) {
    const err = await createAnnRes.json()
    throw new Error(`Failed to create annotation: ${JSON.stringify(err)}`)
  }
  const { annotation: createdAnn } = await createAnnRes.json()
  console.log('✓ API POST /api/ui-annotations created PIN annotation:', createdAnn.id)

  // Route Test 10: PUT /api/ui-annotations/[id] (status toggle)
  const updateAnnReq = new Request(`http://localhost:3000/api/ui-annotations/${createdAnn.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'RESOLVED',
    }),
  })
  const updateAnnRes = await annotationDetailRoute.PUT(updateAnnReq, {
    params: Promise.resolve({ id: createdAnn.id }),
  })
  const { annotation: updatedAnn } = await updateAnnRes.json()
  if (updatedAnn.status !== 'RESOLVED') {
    throw new Error('Failed to update annotation status')
  }
  console.log('✓ API PUT /api/ui-annotations/[id] updated status to RESOLVED')

  // Route Test 11: POST /api/ui-annotations/[id]/convert-task
  const convertReq = new Request(`http://localhost:3000/api/ui-annotations/${createdAnn.id}/convert-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const convertRes = await convertTaskRoute.POST(convertReq, {
    params: Promise.resolve({ id: createdAnn.id }),
  })
  if (convertRes.status !== 200 && convertRes.status !== 201) {
    const err = await convertRes.json()
    throw new Error(`Failed to convert annotation to task: ${JSON.stringify(err)}`)
  }
  const convertData = await convertRes.json()
  if (!convertData.success || !convertData.card) {
    throw new Error('Convert-task response missing success or card')
  }
  console.log('✓ API POST /api/ui-annotations/[id]/convert-task created card:', convertData.card.id, convertData.card.title)

  // Route Test 12: DELETE /api/ui-annotations/[id]
  const deleteAnnRes = await annotationDetailRoute.DELETE(
    new Request(`http://localhost:3000/api/ui-annotations/${createdAnn.id}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id: createdAnn.id }) }
  )
  if (deleteAnnRes.status !== 200) {
    throw new Error('Failed to delete annotation')
  }
  console.log('✓ API DELETE /api/ui-annotations/[id] deleted annotation')

  // Route Test 13: DELETE /api/boards/[id]/ui-components/[componentId]
  const deleteCompRes = await componentDetailRoute.DELETE(
    new Request(`http://localhost:3000/api/boards/${board.id}/ui-components/${createdApiComp.id}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id: board.id, componentId: createdApiComp.id }) }
  )
  if (deleteCompRes.status !== 200) {
    throw new Error('Failed to delete component')
  }
  console.log('✓ API DELETE /api/boards/[id]/ui-components/[componentId] deleted component')

  // Route Test 14: DELETE /api/boards/[id]/ui-pages/[pageId]
  const deletePageRes = await pageDetailRoute.DELETE(
    new Request(`http://localhost:3000/api/boards/${board.id}/ui-pages/${createdApiPage.id}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id: board.id, pageId: createdApiPage.id }) }
  )
  if (deletePageRes.status !== 200) {
    throw new Error('Failed to delete page')
  }
  console.log('✓ API DELETE /api/boards/[id]/ui-pages/[pageId] deleted page')

  // Cleanup created card
  await prisma.card.delete({ where: { id: convertData.card.id } })
  console.log('✓ Converted task card cleaned up.')

  console.log('\n🎉 ALL UI STUDIO BACKEND ENDPOINTS AND TESTS PASSED SUCCESSFULLY!')
}

runTest()
  .catch((e) => {
    console.error('❌ UI Studio E2E Test Failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
