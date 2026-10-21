export interface CardDateInfo {
  startDate?: string | Date | null
  dueDate?: string | Date | null
  createdAt?: string | Date
}

export interface TaskPositionResult {
  left: number
  width: number
  isVisible: boolean
  isClippedLeft: boolean
  isClippedRight: boolean
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
  cellWidth: number,
  totalDays?: number
): TaskPositionResult {
  const msPerDay = 1000 * 60 * 60 * 24
  const startDay = startOfDay(taskStart)
  const endDay = startOfDay(taskEnd)
  const winStart = startOfDay(windowStart)
  const winEnd = totalDays ? new Date(winStart.getTime() + totalDays * msPerDay) : null

  // 1. Cek apakah task sepenuhnya di luar jendela (off-screen)
  if (endDay.getTime() < winStart.getTime()) {
    return { left: 0, width: 0, isVisible: false, isClippedLeft: false, isClippedRight: false }
  }
  if (winEnd && startDay.getTime() >= winEnd.getTime()) {
    return { left: 0, width: 0, isVisible: false, isClippedLeft: false, isClippedRight: false }
  }

  // 2. Hitung clamping untuk bagian yang tampak di viewport
  const isClippedLeft = startDay.getTime() < winStart.getTime()
  const isClippedRight = winEnd ? endDay.getTime() > winEnd.getTime() : false

  const visibleStart = isClippedLeft ? winStart : startDay
  const visibleEnd = isClippedRight && winEnd ? winEnd : endDay

  const offsetDays = Math.round((visibleStart.getTime() - winStart.getTime()) / msPerDay)
  let visibleDays = Math.round((visibleEnd.getTime() - visibleStart.getTime()) / msPerDay)

  // Minimal 1 hari agar bar terlihat jelas jika durasi 0 atau taskStart == taskEnd
  if (visibleDays < 1) visibleDays = 1

  const left = offsetDays * cellWidth
  const width = visibleDays * cellWidth

  return {
    left,
    width,
    isVisible: true,
    isClippedLeft,
    isClippedRight,
  }
}

export function formatHeaderDate(
  date: Date,
  zoomMode: 'days' | 'weeks' | 'months' = 'days'
): { main: string; sub?: string } {
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

  if (zoomMode === 'months') {
    return {
      main: `${date.getDate()}`,
      sub: monthNames[date.getMonth()],
    }
  }

  if (zoomMode === 'weeks') {
    return {
      main: `${date.getDate()}`,
      sub: `W${getWeekNumber(date)}`,
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
