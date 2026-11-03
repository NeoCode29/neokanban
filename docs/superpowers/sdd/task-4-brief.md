# Task 4 Brief: End-to-End Build & Production Verification

**Role:** QA Tester  
**Workspace:** `c:\Users\kresna\Documents\Workspace\neokanban`  
**Plan:** `docs/superpowers/plans/2026-11-03-ui-studio-mcp-and-bridge.md`

## Objective
Execute full end-to-end build and regression tests for all newly implemented features (MCP UI Studio tools, dynamic categories, living context bridge), ensure clean git tree, and push commits to `origin/feat/ui-ux-studio`.

## Instructions
1. Run `npm run mcp:build` and verify compilation.
2. Run `npm run build` and verify clean Next.js build.
3. Run the verification test suite:
   - `npx tsx scripts/test-mcp-ui-studio-tools.ts`
   - `npx tsx scripts/test-dynamic-categories.ts`
   - `npx tsx scripts/test-context-bridge-detection.ts`
4. Verify `git status` in `c:\Users\kresna\Documents\Workspace\neokanban`.
5. Push to GitHub: `git push origin feat/ui-ux-studio`.
6. Write test results to `docs/superpowers/sdd/task-4-report.md`.
