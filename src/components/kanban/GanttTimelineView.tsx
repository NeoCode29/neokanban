'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarRange,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { ColumnData } from './KanbanColumn'
import { CardData } from './KanbanCard'
import {
  getEffectiveDates,
  getDaysInWindow,
  calculateTaskPosition,
  formatHeaderDate,
  isSameDay,
  startOfDay,
} from '@/lib/timeline-utils'

interface GanttTimelineViewProps {
  columns: ColumnData[]
  onCardClick: (cardId: string) => void
}

export default function GanttTimelineView({ columns, onCardClick }: GanttTimelineViewProps) {
  const [zoomMode, setZoomMode] = useState<'days' | 'weeks' | 'months'>('days')
  const [windowOffsetDays, setWindowOffsetDays] = useState(0)
  const [showUnscheduled, setShowUnscheduled] = useState(false)

  const today = useMemo(() => startOfDay(new Date()), [])

  // Window range calculation
  const totalDays = zoomMode === 'months' ? 60 : zoomMode === 'weeks' ? 28 : 21
  const cellWidth = zoomMode === 'months' ? 28 : zoomMode === 'weeks' ? 36 : 48

  const windowStartDate = useMemo(() => {
    const base = new Date(today)
    // Center around today with offset
    base.setDate(base.getDate() - 4 + windowOffsetDays)
    return startOfDay(base)
  }, [today, windowOffsetDays])

  const daysInWindow = useMemo(() => {
    return getDaysInWindow(windowStartDate, totalDays)
  }, [windowStartDate, totalDays])

  // Extract all cards and classify into scheduled vs unscheduled
  const { scheduledCardsByColumn, unscheduledCards } = useMemo(() => {
    const scheduledByCol: Array<{ column: ColumnData; cards: Array<{ card: CardData; start: Date; end: Date }> }> = []
    const unscheduled: Array<{ column: ColumnData; card: CardData }> = []

    columns.forEach((col) => {
      const scheduledInCol: Array<{ card: CardData; start: Date; end: Date }> = []
      col.cards.forEach((card) => {
        const { start, end, isScheduled } = getEffectiveDates(card)
        if (isScheduled) {
          scheduledInCol.push({ card, start, end })
        } else {
          unscheduled.push({ column: col, card })
        }
      })
      scheduledByCol.push({ column: col, cards: scheduledInCol })
    })

    return { scheduledCardsByColumn: scheduledByCol, unscheduledCards: unscheduled }
  }, [columns])

  const getStatusColor = (colTitle: string) => {
    const lower = colTitle.toLowerCase()
    if (lower.includes('done')) return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    if (lower.includes('review')) return 'bg-purple-100 text-purple-800 border-purple-300'
    if (lower.includes('progress')) return 'bg-amber-100 text-amber-800 border-amber-300'
    if (lower.includes('to do') || lower.includes('todo')) return 'bg-blue-100 text-blue-800 border-blue-300'
    return 'bg-slate-100 text-slate-800 border-slate-300'
  }

  const getStatusDot = (colTitle: string) => {
    const lower = colTitle.toLowerCase()
    if (lower.includes('done')) return 'bg-emerald-500'
    if (lower.includes('review')) return 'bg-purple-500'
    if (lower.includes('progress')) return 'bg-amber-500'
    if (lower.includes('to do') || lower.includes('todo')) return 'bg-blue-500'
    return 'bg-slate-400'
  }

  return (
    <div className="flex flex-col h-full bg-[#fafafc] border border-neutral-200/80 rounded-xl shadow-xs overflow-hidden">
      {/* 1. Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border-b border-neutral-200/80 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWindowOffsetDays((prev) => prev - (zoomMode === 'months' ? 14 : 7))}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 transition"
            title="Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWindowOffsetDays(0)}
            className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 rounded-lg transition"
          >
            Hari Ini
          </button>
          <button
            onClick={() => setWindowOffsetDays((prev) => prev + (zoomMode === 'months' ? 14 : 7))}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 transition"
            title="Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-neutral-600 ml-2">
            {windowStartDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom switcher */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60">
            {(['days', 'weeks', 'months'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setZoomMode(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition ${
                  zoomMode === mode
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {mode === 'days' ? 'Hari' : mode === 'weeks' ? 'Minggu' : 'Bulan'}
              </button>
            ))}
          </div>

          {/* Unscheduled Tray Button */}
          <button
            onClick={() => setShowUnscheduled((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition ${
              showUnscheduled
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Belum Terjadwal ({unscheduledCards.length})</span>
            {showUnscheduled ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Main Dual-Pane Canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: Task List */}
        <div className="w-64 sm:w-72 border-r border-neutral-200/80 bg-white flex flex-col shrink-0">
          <div className="h-10 px-3 flex items-center border-b border-neutral-200/80 bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Tugas / Tahapan
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {scheduledCardsByColumn.map(({ column, cards }) => (
              <div key={column.id} className="py-2">
                <div className="px-3 py-1 flex items-center justify-between text-xs font-semibold text-neutral-700">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(column.title)}`} />
                    <span>{column.title}</span>
                  </div>
                  <span className="text-neutral-400 font-normal">({cards.length})</span>
                </div>
                {cards.map(({ card }) => (
                  <div
                    key={card.id}
                    onClick={() => onCardClick(card.id)}
                    className="h-10 px-3 flex items-center gap-2 hover:bg-neutral-50 cursor-pointer transition text-xs text-neutral-800 truncate"
                  >
                    <span className="truncate flex-1 font-medium">{card.title}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Timeline Grid Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-white relative">
          <div style={{ width: totalDays * cellWidth, minWidth: '100%' }}>
            {/* Header Kalender */}
            <div className="h-10 flex border-b border-neutral-200/80 bg-neutral-50 sticky top-0 z-10">
              {daysInWindow.map((day, idx) => {
                const isCurrent = isSameDay(day, today)
                const headerInfo = formatHeaderDate(day, zoomMode)
                return (
                  <div
                    key={idx}
                    style={{ width: cellWidth }}
                    className={`flex flex-col items-center justify-center border-r border-neutral-200/60 text-center shrink-0 ${
                      isCurrent ? 'bg-amber-50/80 font-bold text-amber-900' : 'text-neutral-600'
                    }`}
                  >
                    <span className="text-[11px] leading-tight font-semibold">{headerInfo.main}</span>
                    {headerInfo.sub && <span className="text-[9px] text-neutral-400">{headerInfo.sub}</span>}
                  </div>
                )
              })}
            </div>

            {/* Rows & Bars */}
            <div className="relative divide-y divide-neutral-100">
              {/* Vertical Today Line */}
              {daysInWindow.some((d) => isSameDay(d, today)) && (
                <div
                  style={{
                    left:
                      daysInWindow.findIndex((d) => isSameDay(d, today)) * cellWidth + cellWidth / 2,
                  }}
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-5 pointer-events-none"
                />
              )}

              {scheduledCardsByColumn.map(({ column, cards }) => (
                <div key={column.id} className="py-2">
                  <div className="h-6" /> {/* Spacer untuk header column */}
                  {cards.map(({ card, start, end }) => {
                    const { left, width } = calculateTaskPosition(start, end, windowStartDate, cellWidth)
                    return (
                      <div key={card.id} className="h-10 relative flex items-center">
                        <div
                          onClick={() => onCardClick(card.id)}
                          style={{
                            left: Math.max(left, 0),
                            width: Math.max(width, cellWidth),
                          }}
                          className={`absolute h-7 rounded-md px-2 flex items-center gap-1.5 border shadow-xs cursor-pointer transition hover:opacity-90 overflow-hidden text-xs font-medium ${getStatusColor(
                            column.title
                          )}`}
                          title={`${card.title} (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`}
                        >
                          <span className="truncate flex-1">{card.title}</span>
                          {card.checklists?.length > 0 && (
                            <span className="text-[10px] bg-white/70 px-1 py-0.5 rounded text-neutral-600 shrink-0">
                              {card.checklists.filter((c) => c.isCompleted).length}/{card.checklists.length}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Collapsible Unscheduled Tasks Drawer */}
        {showUnscheduled && (
          <div className="w-80 border-l border-neutral-200/80 bg-neutral-50/70 p-4 overflow-y-auto shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Kartu Tanpa Jadwal
              </h4>
              <span className="text-xs bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full font-semibold">
                {unscheduledCards.length}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
              Klik kartu di bawah untuk menentukan tanggal mulai dan tenggat waktu agar muncul di timeline.
            </p>
            <div className="space-y-2 flex-1">
              {unscheduledCards.map(({ column, card }) => (
                <div
                  key={card.id}
                  onClick={() => onCardClick(card.id)}
                  className="p-3 bg-white border border-neutral-200 rounded-lg shadow-xs hover:border-neutral-300 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase">
                      {column.title}
                    </span>
                    <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                      {card.priority}
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-neutral-900 mb-1">{card.title}</h5>
                  <div className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                    <CalendarRange className="w-3 h-3" />
                    <span>Atur Tanggal</span>
                  </div>
                </div>
              ))}
              {unscheduledCards.length === 0 && (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  Semua kartu telah memiliki tenggat waktu!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
