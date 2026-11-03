# Task 2 Brief: Dynamic Category Filter in UI Studio Web

**Role:** Frontend Specialist  
**Workspace:** `c:\Users\kresna\Documents\Workspace\neokanban`  
**Plan:** `docs/superpowers/plans/2026-11-03-ui-studio-mcp-and-bridge.md`

## Objective
Convert static category presets in UI Studio to dynamic categories derived from actual component data with fallback safety:
1. Write verification script `scripts/test-dynamic-categories.ts` for dynamic extraction.
2. In `src/components/ui-studio/UiStudioView.tsx`:
   - Replace static `CATEGORY_PRESETS` array with `dynamicCategories` memoized from `components.map(c => c.category)`.
   - Add `useEffect` fallback: if `selectedCategory !== 'All'` and not in `dynamicCategories`, reset to `'All'`.
   - Pass existing categories to `AddEditComponentModal` via `existingCategories`.
3. In `src/components/ui-studio/AddEditComponentModal.tsx`:
   - Accept optional `existingCategories?: string[]`.
   - Provide a category suggestions datalist or preset chips under the Category input.
4. Verify with `npm run build`.
5. Commit:
   ```bash
   git add src/components/ui-studio/UiStudioView.tsx src/components/ui-studio/AddEditComponentModal.tsx scripts/test-dynamic-categories.ts
   git commit -m "feat(ui-studio): add dynamic category filter and category suggestions"
   ```
6. Write report to `docs/superpowers/sdd/task-2-report.md`.
