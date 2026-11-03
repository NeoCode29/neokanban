# Task 1 Brief: MCP Server Suite for UI Studio (8 Tools)

**Role:** Backend Specialist  
**Workspace:** `c:\Users\kresna\Documents\Workspace\neokanban`  
**Plan:** `docs/superpowers/plans/2026-11-03-ui-studio-mcp-and-bridge.md`

## Objective
Implement 8 new native MCP tools in `mcp/src/index.ts` to manage UI Studio components and prototype pages via the REST API helper `apiRequest`:
1. `list_ui_components`
2. `create_ui_component`
3. `update_ui_component`
4. `delete_ui_component`
5. `list_ui_pages`
6. `create_ui_page`
7. `update_ui_page`
8. `delete_ui_page`

## Instructions
1. Write failing test in `scripts/test-mcp-ui-studio-tools.ts` that launches `mcp/dist/index.js` via MCP Client and asserts all 8 tool names exist.
2. Run test to verify failure (`npx tsx scripts/test-mcp-ui-studio-tools.ts`).
3. Add the 8 tools into `mcp/src/index.ts` using `server.tool(...)` and `zod` schemas.
4. Run `npm run mcp:build` and re-run `npx tsx scripts/test-mcp-ui-studio-tools.ts` to verify pass.
5. Commit changes:
   ```bash
   git add mcp/src/index.ts mcp/dist/index.js scripts/test-mcp-ui-studio-tools.ts
   git commit -m "feat(mcp): add 8 native MCP tools for UI Studio components and pages"
   ```
6. Write summary to `docs/superpowers/sdd/task-1-report.md` and report back.
