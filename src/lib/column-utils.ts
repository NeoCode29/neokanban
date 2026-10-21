/**
 * Utility functions and constants for Kanban column management and safeguards.
 */

export const PROTECTED_SYSTEM_COLUMNS = [
  'backlog',
  'to do',
  'todo',
  'in progress',
  'progress',
  'in review',
  'review',
  'done',
] as const

/**
 * Checks if a column title represents a protected system column
 * that must not be deleted (Backlog, To Do, In Progress, In Review / Review, Done).
 */
export function isProtectedColumn(title: string): boolean {
  if (!title) return false
  const normalized = title.trim().toLowerCase()
  return (PROTECTED_SYSTEM_COLUMNS as readonly string[]).includes(normalized)
}
