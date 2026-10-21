import {
  getEffectiveDates,
  calculateTaskPosition,
  getDaysInWindow,
  formatHeaderDate,
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

  // Case 4: Position calculation within window
  const windowStart = new Date('2026-10-01T00:00:00.000Z')
  const cellWidth = 40
  const pos = calculateTaskPosition(start, due, windowStart, cellWidth)
  // start is 1 day after windowStart -> left = 1 * 40 = 40
  // duration is 3 days -> width = 3 * 40 = 120
  if (pos.left !== 40 || pos.width !== 120 || !pos.isVisible) {
    throw new Error(`FAIL: calculateTaskPosition expected left: 40, width: 120, got left: ${pos.left}, width: ${pos.width}`)
  }

  // Case 5: Days in window
  const days = getDaysInWindow(windowStart, 7)
  if (days.length !== 7 || !isSameDay(days[0], windowStart)) {
    throw new Error('FAIL: getDaysInWindow length or start day mismatch')
  }

  // Case 6 (BUG FIX): Task starting before window (clipped on left)
  // Example from user screenshot: task 8 Okt - 23 Okt, window 16 Okt (totalDays: 21)
  const taskStartPast = new Date('2026-10-08T00:00:00.000Z')
  const taskDueFuture = new Date('2026-10-23T00:00:00.000Z')
  const winStartShifted = new Date('2026-10-16T00:00:00.000Z')
  const posClipped = calculateTaskPosition(taskStartPast, taskDueFuture, winStartShifted, 48, 21)
  // Left should be 0 (starts at left border of window)
  // Visible duration should be 23 Okt - 16 Okt = 7 days -> 7 * 48 = 336px (NOT 15 days * 48 = 720px!)
  if (posClipped.left !== 0 || posClipped.width !== 336 || !posClipped.isClippedLeft || !posClipped.isVisible) {
    throw new Error(`FAIL: Clamped left calculation failed: left=${posClipped.left}, width=${posClipped.width}, clipped=${posClipped.isClippedLeft}`)
  }

  // Case 7 (BUG FIX): Task completely before window (off-screen past)
  // Window moved to 24 Okt, task ended on 23 Okt
  const winStartPastWindow = new Date('2026-10-24T00:00:00.000Z')
  const posOffscreen = calculateTaskPosition(taskStartPast, taskDueFuture, winStartPastWindow, 48, 21)
  if (posOffscreen.isVisible) {
    throw new Error('FAIL: Task before window should not be visible')
  }

  // Case 8 (BUG FIX): Header date labels for zoom modes
  const testDate = new Date('2026-10-16T00:00:00.000Z')
  const hDays = formatHeaderDate(testDate, 'days')
  const hWeeks = formatHeaderDate(testDate, 'weeks')
  const hMonths = formatHeaderDate(testDate, 'months')

  if (hDays.main !== '16' || hDays.sub !== 'Jum') {
    throw new Error(`FAIL: formatHeaderDate days expected 16 Jum, got ${hDays.main} ${hDays.sub}`)
  }
  if (hWeeks.main !== '16' || !hWeeks.sub?.startsWith('W')) {
    throw new Error(`FAIL: formatHeaderDate weeks expected 16 W..., got ${hWeeks.main} ${hWeeks.sub}`)
  }
  if (hMonths.main !== '16' || hMonths.sub !== 'Okt') {
    throw new Error(`FAIL: formatHeaderDate months expected 16 Okt, got ${hMonths.main} ${hMonths.sub}`)
  }

  console.log('✅ PASS: All timeline utils and bug-fix tests passed successfully!')
}

runTimelineUtilsTest()
