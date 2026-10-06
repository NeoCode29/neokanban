export interface CardDateInfo {
  startDate?: string | Date | null
  dueDate?: string | Date | null
  createdAt?: string | Date
}

export function toDate(val: string | Date | undefined | null): Date | null {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function startOfDay(d: Date): Date {
  const res = new Date(d)
  res.setHours(0, 0, 0, 0)
  return res
}

export function getEffectiveDates(card: CardDateInfo): {
  start: Date
  end: Date
  isScheduled: boolean
} {
  const due = toDate(card.dueDate)
  if (!due) {
    const dummy = toDate(card.createdAt) || new Date()
    return { start: dummy, end: dummy, isScheduled: false }
  }

  const explicitStart = toDate(card.startDate)
  const created = toDate(card.createdAt) || new Date()
  let start = explicitStart || created

  // Normalize to 00:00:00
  start = startOfDay(start)
  const end = startOfDay(due)

  // Ensure start <= end
  if (start.getTime() > end.getTime()) {
    start = new Date(end)
  }

  return {
    start,
    end,
    isScheduled: true,
  }
}

export function getDaysInWindow(startDate: Date, totalDays: number): Date[] {
  const result: Date[] = []
  const base = startOfDay(startDate)

  for (let i = 0; i < totalDays; i++) {
    const nextDate = new Date(base)
    nextDate.setDate(base.getDate() + i)
    result.push(nextDate)
  }

  return result
}

export function calculateTaskPosition(
  taskStart: Date,
  taskEnd: Date,
  windowStart: Date,
  cellWidth: number
): { left: number; width: number } {
  const msPerDay = 1000 * 60 * 60 * 24
  const startDay = startOfDay(taskStart)
  const endDay = startOfDay(taskEnd)
  const winStart = startOfDay(windowStart)

  const offsetDays = Math.round((startDay.getTime() - winStart.getTime()) / msPerDay)
  let durationDays = Math.round((endDay.getTime() - startDay.getTime()) / msPerDay)

  // Minimal 1 hari kalender agar bar terlihat jelas
  if (durationDays < 1) durationDays = 1

  const left = offsetDays * cellWidth
  const width = durationDays * cellWidth

  return { left, width }
}

export function formatHeaderDate(
  date: Date,
  zoomMode: 'days' | 'weeks' | 'months' = 'days'
): { main: string; sub?: string } {
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

  if (zoomMode === 'months') {
    return {
      main: monthNames[date.getMonth()],
      sub: `${date.getFullYear()}`,
    }
  }

  if (zoomMode === 'weeks') {
    return {
      main: `W${getWeekNumber(date)}`,
      sub: `${date.getDate()} ${monthNames[date.getMonth()]}`,
    }
  }

  return {
    main: `${date.getDate()}`,
    sub: dayNames[date.getDay()],
  }
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
