### Task 2: Backend REST APIs for Pages, Components, Annotations & Convert-to-Task

**Files:**
- Create: `neokanban/src/app/api/boards/[id]/ui-pages/route.ts`
- Create: `neokanban/src/app/api/boards/[id]/ui-pages/[pageId]/route.ts`
- Create: `neokanban/src/app/api/boards/[id]/ui-components/route.ts`
- Create: `neokanban/src/app/api/boards/[id]/ui-components/[componentId]/route.ts`
- Create: `neokanban/src/app/api/ui-annotations/route.ts`
- Create: `neokanban/src/app/api/ui-annotations/[id]/route.ts`
- Create: `neokanban/src/app/api/ui-annotations/[id]/convert-task/route.ts`
- Test: `neokanban/scripts/test-ui-studio-e2e.ts`

**Endpoints & Specifications:**
1. `GET /api/boards/[id]/ui-pages`: List all `uiPages` for board, ordered by `order asc`. Include `annotations` (id, status, type).
2. `POST /api/boards/[id]/ui-pages`: Create `uiPage` ({ title, path, description, status, htmlContent }). Sanitize null byte `\0` in `htmlContent`. Verify board access / auth user.
3. `GET /api/boards/[id]/ui-pages/[pageId]`: Get single page with all `annotations` (include author { id, name, email }).
4. `PUT /api/boards/[id]/ui-pages/[pageId]`: Update title, path, description, status, htmlContent, order.
5. `DELETE /api/boards/[id]/ui-pages/[pageId]`: Delete page.
6. `GET /api/boards/[id]/ui-components`: List components for board, optional `?category=...`. Include `annotations`.
7. `POST /api/boards/[id]/ui-components`: Create component ({ name, category, description, htmlContent }). Sanitize null bytes.
8. `GET /api/boards/[id]/ui-components/[componentId]`: Get single component with all annotations.
9. `PUT /api/boards/[id]/ui-components/[componentId]`: Update name, category, description, htmlContent, order.
10. `DELETE /api/boards/[id]/ui-components/[componentId]`: Delete component.
11. `POST /api/ui-annotations`: Create annotation ({ pageId?, componentId?, type, posX, posY, width?, height?, comment }). Author is authenticated user.
12. `PUT /api/ui-annotations/[id]`: Update status ('OPEN' | 'RESOLVED') or comment.
13. `DELETE /api/ui-annotations/[id]`: Delete annotation.
14. `POST /api/ui-annotations/[id]/convert-task`:
    - Create a new `Card` in target column (or first column of board, or column with name containing 'To Do').
    - Card Title: `[UI Feedback] <Page/Component title>: <Comment first 40 chars>`
    - Card Description: Posisi, feedback comment, author, dan referensi URL.
    - Set `cardId` on `uiAnnotation`.
    - Return `{ success: true, card }`.

**Security & Quality Constraints:**
- Use `getCurrentUser()` from `@/lib/auth`. Return 401 if unauthorized.
- Sanitize HTML content with `str.replace(/\0/g, '')`.
- `npx tsc --noEmit` must pass with 0 errors.
- Run `npx tsx scripts/test-ui-studio-e2e.ts` and ensure it passes.
- Commit with: `feat(api): implement UI/UX studio routes for pages, components, and annotations`.

