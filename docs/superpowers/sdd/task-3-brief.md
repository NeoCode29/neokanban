# Task 3 Brief: Living Context Bridge in UI Studio Web

**Role:** Frontend Specialist  
**Workspace:** `c:\Users\kresna\Documents\Workspace\neokanban`  
**Plan:** `docs/superpowers/plans/2026-11-03-ui-studio-mcp-and-bridge.md`

## Objective
Implement an interactive bridge banner in `UiStudioView.tsx` that detects HTML documents from Living Context (`/api/boards/${boardId}/context`) and provides a 1-click quick import into UI Studio Catalog.

## Instructions
1. Write verification script `scripts/test-context-bridge-detection.ts` to test unimported HTML filtering logic. Run `npx tsx scripts/test-context-bridge-detection.ts` to verify pass.
2. In `src/components/ui-studio/UiStudioView.tsx`:
   - Add state: `contextDocs` (array) and `dismissedBridgeBanner` (boolean).
   - In `fetchAllData`, also fetch `/api/boards/${boardId}/context` and store `data.documents || []` into `contextDocs`.
   - Add memoized `unimportedHtmlDocs` filtering files ending with `.html` whose basename does not match any existing component name.
   - Also add state `initialComponentValues` for pre-filling `AddEditComponentModal` when importing from context.
   - Update `AddEditComponentModal` to support optional `initialValues?: { name?: string; category?: string; description?: string; htmlContent?: string } | null`.
   - In UI Studio sub-tab `'components'`, render the notification banner above the component listing if `unimportedHtmlDocs.length > 0 && !dismissedBridgeBanner`.
   - Banner action: Clicking `[ + Import ke Catalog ]` sets `initialComponentValues` with `{ name: doc.fileName.replace(/\.html$/i, ''), category: 'General', description: 'Diimpor dari Living Context: ' + doc.fileName, htmlContent: doc.content }` and opens `AddEditComponentModal`.
   - Clicking `(X)` dismisses the banner for the current session.
3. Test and verify build with `npm run build`.
4. Commit:
   ```bash
   git add src/components/ui-studio/UiStudioView.tsx src/components/ui-studio/AddEditComponentModal.tsx scripts/test-context-bridge-detection.ts
   git commit -m "feat(ui-studio): add Living Context bridge banner for importing HTML documents"
   ```
5. Write report to `docs/superpowers/sdd/task-3-report.md`.
