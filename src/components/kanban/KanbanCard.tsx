'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, CheckSquare, MessageSquare, User, Bot, GripVertical } from 'lucide-react'

export interface CardData {
  id: string
  columnId: string
  title: string
  description: string
  order: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  tags: string[]
  dueDate?: string | null
  createdAt?: string
  checklists: { id: string; isCompleted: boolean; title: string }[]
  _count?: { comments: number }
}

interface KanbanCardProps {
  card: CardData
  onClick: (card: CardData) => void
}

export default function KanbanCard({ card, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'Card',
      card,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const completedChecklists = card.checklists?.filter((c) => c.isCompleted).length || 0
  const totalChecklists = card.checklists?.length || 0

  // Format date like "May 29, 2026"
  const formattedDate = card.dueDate
    ? new Date(card.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : card.createdAt
    ? new Date(card.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No date'

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(card)}
      className={`group relative bg-white hover:border-neutral-300/90 border border-neutral-200/90 rounded-xl p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)] transition-all cursor-pointer select-none ${
        isDragging ? 'opacity-30 border-neutral-400 ring-2 ring-neutral-200' : ''
      }`}
    >
      {/* Top Title & Drag Indicator */}
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <h4 className="text-[13px] font-semibold text-neutral-800 group-hover:text-neutral-950 leading-snug">
          {card.title}
        </h4>

        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="text-neutral-300 hover:text-neutral-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Subtitle / Category / Tags */}
      <p className="text-[11px] text-neutral-500 mb-3 truncate font-normal">
        {card.tags && card.tags.length > 0
          ? card.tags.map((t) => `#${t}`).join(' ')
          : card.description
          ? card.description.replace(/[#*`_]/g, '').slice(0, 45)
          : 'Task specification'}
      </p>

      {/* Footer Row: Date on left, indicators/avatar on right */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2.5 border-t border-neutral-100">
        <div className="flex items-center gap-1.5 font-normal text-neutral-500">
          <Calendar className="w-3 h-3 text-neutral-400" />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2">
          {totalChecklists > 0 && (
            <span
              className={`flex items-center gap-1 font-medium ${
                completedChecklists === totalChecklists
                  ? 'text-emerald-600'
                  : 'text-neutral-500'
              }`}
              title="Checklists"
            >
              <CheckSquare className="w-3 h-3" />
              <span>
                {completedChecklists}/{totalChecklists}
              </span>
            </span>
          )}

          {(card._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-neutral-500" title="Comments">
              <MessageSquare className="w-3 h-3" />
              <span>{card._count?.comments}</span>
            </span>
          )}

          {/* Minimal Avatar / AI badge */}
          <div className="w-5 h-5 rounded-full bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-500">
            <User className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>
    </div>
  )
}
