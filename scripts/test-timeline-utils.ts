import {
  getEffectiveDates,
  calculateTaskPosition,
  getDaysInWindow,
  isSameDay,
} from '../src/lib/timeline-utils'

function runTimelineUtilsTest() {
  console.log('🧪 Testing timeline date mathematics & utilities...')

  const created = new Date('2026-10-01T00:00:00.000Z')
  const due = new Date('2026-10-05T00:00:00.000Z')

  // Case 1: Start date exists
  const start = new Date('2026-10-02T00:00:00.000Z')
  const r1 = getEffectiveDates({ startDate: start, dueDate: due, createdAt: created })
  if (!r1.isScheduled || !isSameDay(r1.start, start) || !isSameDay(r1.end, due)) {
    throw new Error('FAIL: getEffectiveDates with explicit startDate failed')
  }

  // Case 2: Fallback to createdAt when startDate is null
  const r2 = getEffectiveDates({ startDate: null, dueDate: due, createdAt: created })
  if (!r2.isScheduled || !isSameDay(r2.start, created)) {
    throw new Error('FAIL: getEffectiveDates fallback to createdAt failed')
  }

  // Case 3: Unscheduled card (dueDate null)
  const r3 = getEffectiveDates({ startDate: null, dueDate: null, createdAt: created })
  if (r3.isScheduled) {
    throw new Error('FAIL: card without dueDate should not be scheduled')
  }

  // Case 4: Position calculation
  const windowStart = new Date('2026-10-01T00:00:00.000Z')
  const cellWidth = 40
  const pos = calculateTaskPosition(start, due, windowStart, cellWidth)
  // start is 1 day after windowStart -> left = 1 * 40 = 40
  // duration is 3 days -> width = 3 * 40 = 120
  if (pos.left !== 40 || pos.width !== 120) {
    throw new Error(`FAIL: calculateTaskPosition expected left: 40, width: 120, got left: ${pos.left}, width: ${pos.width}`)
  }

  // Case 5: Days in window
  const days = getDaysInWindow(windowStart, 7)
  if (days.length !== 7 || !isSameDay(days[0], windowStart)) {
    throw new Error('FAIL: getDaysInWindow length or start day mismatch')
  }

  console.log('✅ PASS: All timeline utils tests passed successfully')
}

runTimelineUtilsTest()
