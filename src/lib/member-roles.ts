export interface SpecializationRole {
  id: string
  label: string
  color: string
  dotColor: string
  description: string
}

export const SPECIALIZATION_ROLES: SpecializationRole[] = [
  {
    id: 'FRONTEND_SPECIALIST',
    label: 'Frontend Specialist',
    color: 'text-cyan-700 bg-cyan-50 border-cyan-200/80',
    dotColor: 'bg-cyan-500',
    description: 'UI/UX, React components, Tailwind styling, animations',
  },
  {
    id: 'BACKEND_SPECIALIST',
    label: 'Backend Specialist',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200/80',
    dotColor: 'bg-indigo-500',
    description: 'API route handlers, Prisma queries, auth & data modeling',
  },
  {
    id: 'FULLSTACK',
    label: 'Fullstack',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
    dotColor: 'bg-emerald-500',
    description: 'End-to-end feature delivery across frontend and backend',
  },
  {
    id: 'REVIEWER',
    label: 'Reviewer',
    color: 'text-amber-700 bg-amber-50 border-amber-200/80',
    dotColor: 'bg-amber-500',
    description: 'Verification, QA review, and approving tasks in Review Queue',
  },
  {
    id: 'COLLABORATOR',
    label: 'Collaborator',
    color: 'text-neutral-700 bg-neutral-100 border-neutral-200/80',
    dotColor: 'bg-neutral-400',
    description: 'General team contributor',
  },
]

export type SpecializationRoleId =
  | 'FRONTEND_SPECIALIST'
  | 'BACKEND_SPECIALIST'
  | 'FULLSTACK'
  | 'REVIEWER'
  | 'COLLABORATOR'

export function getRoleMeta(roleId?: string | null): SpecializationRole {
  const found = SPECIALIZATION_ROLES.find((r) => r.id === roleId)
  return found || SPECIALIZATION_ROLES[4] // default Collaborator
}
