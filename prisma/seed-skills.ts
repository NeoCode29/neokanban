import { PrismaClient } from '@prisma/client'

export const PRESET_SKILLS = [
  {
    slug: 'tdd-workflow',
    name: 'Test-Driven Development (TDD) Workflow',
    description: 'Disiplin alur kerja RED-GREEN-REFACTOR dengan verifikasi ketat sebelum implementasi kode.',
    category: 'Testing',
    targetRole: 'FULLSTACK',
    isPreset: true,
    files: [
      {
        filePath: 'SKILL.md',
        content: `---
name: tdd-workflow
description: Enforce RED-GREEN-REFACTOR cycle with strict verification before writing implementation code.
category: Testing
role: FULLSTACK
---

# Test-Driven Development (TDD) Workflow

## Core Philosophy
Never write production code unless you have first written a failing test that demonstrates the need for that code.

## The Cycle
1. **RED**: Write a minimal failing test representing desired behavior. Run test and verify it fails with the expected error.
2. **GREEN**: Write the minimal amount of code necessary to make the test pass. Do not write ahead.
3. **REFACTOR**: Clean up code, remove duplication, and optimize structure while keeping all tests passing.

## Verification Gate
- Test must fail first (proving test validity).
- Test must pass after code implementation.
- All regression suites must remain green.`,
      },
      {
        filePath: 'examples/sample-test.spec.ts',
        content: `import { describe, it, expect } from 'vitest'

describe('User Authentication & Role Validation', () => {
  it('should reject invalid specialization roles with 400 Bad Request', () => {
    const invalidRole = 'SUPER_ADMIN_CUSTOM'
    const validRoles = ['FRONTEND_SPECIALIST', 'BACKEND_SPECIALIST', 'FULLSTACK', 'REVIEWER', 'COLLABORATOR']
    
    expect(validRoles.includes(invalidRole)).toBe(false)
  })
})`,
      },
    ],
  },
  {
    slug: 'code-review-gate',
    name: 'Code Review Gate & Verification',
    description: 'Standard operasional verifikasi ketat dan aturan Never Auto-Done sebelum perubahan di-merge ke master.',
    category: 'General',
    targetRole: 'REVIEWER',
    isPreset: true,
    files: [
      {
        filePath: 'SKILL.md',
        content: `---
name: code-review-gate
description: Standard operational verification procedure enforcing Never Auto-Done review gate before master merges.
category: General
role: REVIEWER
---

# Code Review Gate Protocol

## 1. Aturan Wajib: Never Auto-Done
- Subagent / developer dilarang memindahkan kartu langsung ke \`Done\`.
- Kartu wajib dipindahkan ke \`In Review\` dengan melampirkan laporan verifikasi.
- Pemilik proyek (Owner) yang berhak memindahkan ke \`Done\` setelah validasi akhir.

## 2. Checklist Review
- [ ] TypeScript check (\`npx tsc --noEmit\`) bersih dengan 0 error.
- [ ] Tidak ada kebocoran rahasia (token PAT mentah, string password, atau .env).
- [ ] Bukti eksekusi tes atau verifikasi API terlampir lengkap di komentar.
- [ ] UI konsisten dengan desain tema Counsel/Linear (#fafafc, subtle borders).`,
      },
      {
        filePath: 'references/review-checklist.md',
        content: `### Template Verification Report
\`\`\`markdown
### 🧪 Verification & Review Report
- **Agent Assigned:** <domain-agent>
- **Git Branch:** <feat-branch>
- **Status Pengujian:** ✅ 100% Passed
- **Files Modified:**
  - src/...
- **Commit Hash:** <hash>
\`\`\``,
      },
    ],
  },
  {
    slug: 'security-audit',
    name: 'Security Audit & OWASP Top 10',
    description: 'Panduan audit keamanan aplikasi, sanitasi input, proteksi SQL/XSS, dan mitigasi kebocoran kredensial.',
    category: 'Security',
    targetRole: 'BACKEND_SPECIALIST',
    isPreset: true,
    files: [
      {
        filePath: 'SKILL.md',
        content: `---
name: security-audit
description: Security auditing guide for input sanitation, secret protection, and authorization boundary defense.
category: Security
role: BACKEND_SPECIALIST
---

# Security Audit Standards

## 1. Parameter Validation
- Gunakan schema validation (Zod) untuk seluruh input request.
- Hindari deserialisasi data tak terpercaya tanpa validasi ketat.

## 2. Authentication & Authorization Boundaries
- Selalu verifikasi session token atau PAT token sebelum memproses request sensitif.
- Periksa kepemilikan board (\`hasBoardAccess\` / role check) sebelum operasi database.

## 3. Secret Protection
- Kredensial tidak boleh dicatat dalam log, comment, atau commit git.
- Gunakan SHA-256 hash untuk token hint comparison.`,
      },
      {
        filePath: 'references/security-checklist.md',
        content: `# OWASP Top 10 Defensive Checklist
- [x] Broken Access Control: Validasi \`board.ownerId\` atau \`board.members\` di setiap endpoint.
- [x] Cryptographic Failures: Password di-hash dengan bcrypt, token sesi diverifikasi via JWT signed key.
- [x] Injection: Prisma parameterization mencegah SQL Injection secara default.
- [x] Security Misconfiguration: Middleware memproteksi rute sensitif.`,
      },
    ],
  },
  {
    slug: 'nextjs-best-practices',
    name: 'Next.js App Router Architecture',
    description: 'Praktek terbaik arsitektur Next.js 15/16 App Router, pemisahan Server vs Client Component, dan optimasi performa.',
    category: 'Frontend',
    targetRole: 'FRONTEND_SPECIALIST',
    isPreset: true,
    files: [
      {
        filePath: 'SKILL.md',
        content: `---
name: nextjs-best-practices
description: Best practices for Next.js App Router, Server Actions, Client boundary isolation, and performance.
category: Frontend
role: FRONTEND_SPECIALIST
---

# Next.js App Router Architecture Best Practices

## 1. Boundary Isolation
- Gunakan Server Component sebagai default.
- Tambahkan direktif \`'use client'\` hanya pada komponen interaktif (state, hooks, event listeners).
- Geser client boundaries sejauh mungkin ke daun pohon komponen (leaf nodes).

## 2. Route Handlers
- Tempatkan endpoint API di \`src/app/api/.../route.ts\`.
- Gunakan \`NextResponse.json\` dengan HTTP status codes semantik (200, 201, 400, 401, 403, 404, 500).

## 3. Styling & UX
- Manfaatkan utilitas Tailwind CSS v4 untuk styling terstruktur.
- Gunakan warna canvas elegan \`#fafafc\`, border halus \`border-slate-200/60\`, dan hover micro-interactions.`,
      },
      {
        filePath: 'examples/server-action-pattern.ts',
        content: `// Example: API Route Handler with proper status codes & error handling
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, user })
}`,
      },
    ],
  },
]

export async function seedPresetSkills(prisma: PrismaClient) {
  console.log('Seeding preset skills...')
  for (const preset of PRESET_SKILLS) {
    const existing = await prisma.skill.findUnique({
      where: { slug: preset.slug },
      include: { files: true },
    })

    if (existing) {
      console.log(`- Preset skill "${preset.name}" already exists, updating files...`)
      await prisma.skill.update({
        where: { id: existing.id },
        data: {
          name: preset.name,
          description: preset.description,
          category: preset.category,
          targetRole: preset.targetRole,
          isPreset: true,
        },
      })

      // Upsert files
      for (const file of preset.files) {
        const fileExists = existing.files.find((f) => f.filePath === file.filePath)
        if (fileExists) {
          await prisma.skillFile.update({
            where: { id: fileExists.id },
            data: { content: file.content },
          })
        } else {
          await prisma.skillFile.create({
            data: {
              skillId: existing.id,
              filePath: file.filePath,
              content: file.content,
            },
          })
        }
      }
    } else {
      console.log(`- Creating preset skill "${preset.name}"...`)
      await prisma.skill.create({
        data: {
          slug: preset.slug,
          name: preset.name,
          description: preset.description,
          category: preset.category,
          targetRole: preset.targetRole,
          isPreset: true,
          files: {
            create: preset.files.map((f) => ({
              filePath: f.filePath,
              content: f.content,
            })),
          },
        },
      })
    }
  }
  console.log('✅ Preset skills seeded successfully!')
}

if (require.main === module) {
  const prisma = new PrismaClient()
  seedPresetSkills(prisma)
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}

