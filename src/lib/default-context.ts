export const DEFAULT_PROJECT_GUIDELINES = `# Project Guidelines & Coding Standards

1. **Architecture:** Use Next.js App Router with Server Actions & clean Route Handlers.
2. **Type Safety:** TypeScript strict mode enabled. Avoid \`any\` types.
3. **Database Rules:** Use Prisma ORM with relational integrity.
4. **Clean Code:** Keep components atomic, focused, and small.
5. **AI Synchronization:** Check these guidelines before proposing implementation plans.`

export const DEFAULT_TECH_STACK = `# Tech Stack Specifications

- **Framework:** Next.js 15 App Router
- **Database:** PostgreSQL via Prisma ORM
- **UI:** Tailwind CSS & Lucide Icons
- **Interactive Drag & Drop:** @dnd-kit
- **AI Tooling Protocol:** @modelcontextprotocol/sdk`

export const DEFAULT_CONVENTIONS = `# Development & Git Conventions

- **Branch Naming:** \`feat/<name>\`, \`fix/<name>\`, \`refactor/<name>\`
- **Commit Messages:** Imperative conventional commits (\`feat:\`, \`fix:\`, \`chore:\`)
- **Review Criteria:** Code compiles, passes linters, satisfies acceptance criteria.`

export const DEFAULT_MESSAGING_STANDARDS = `# Communication & Messaging Standards

### 🎯 Standard Card Description Format
\`\`\`markdown
### 🎯 Objective
[Explain what needs to be solved or built]

### 📋 Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

### 🛠 Scope & Constraints
- Target files: \`src/...\`
- Specific requirements: ...

### 🧪 Verification Plan
[Manual testing or automated commands to verify]
\`\`\`

### 💬 Standard Progress Comment Format (Team & AI)
\`\`\`markdown
**Status:** \`[UPDATE]\` | \`[BLOCKED]\` | \`[NEED_REVIEW]\` | \`[RESOLVED]\`

**📝 Summary of Work:**
- Bullet point 1
- Bullet point 2

**🔗 Changed Files / References:**
- \`src/path/to/file.tsx\`

**❓ Blockers or Follow-up Questions:**
[None or specific question for reviewer]
\`\`\``
