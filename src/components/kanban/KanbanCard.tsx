'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckSquare, MessageSquare, GripVertical, AlertTriangle } from 'lucide-react'

export interface CardData {
  id: string
  columnId: string
  title: string
  description: string
  order: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  tags: string[]
  dueDate?: string | null
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

  const priorityColors = {
    URGENT: 'bg-red-500/10 text-red-400 border-red-500/20',
    HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    LOW: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(card)}
      className={`group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer ${
        isDragging ? 'opacity-30 border-blue-500/50 ring-2 ring-blue-500/20' : ''
      }`}
    >
      {/* Header: Priority & Drag Handle */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            priorityColors[card.priority] || priorityColors.MEDIUM
          }`}
        >
          {card.priority}
        </span>

        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="text-slate-600 hover:text-slate-400 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          title="Drag card"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title */}
      <h4 className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-white leading-snug mb-2.5">
        {card.title}
      </h4>

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Metrics */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/50">
        <div className="flex items-center gap-3">
          {totalChecklists > 0 && (
            <span
              className={`flex items-center gap-1 font-medium ${
                completedChecklists === totalChecklists
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>
                {completedChecklists}/{totalChecklists}
              </span>
            </span>
          )}

          {(card._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <MessageSquare className="w-3 h-3" />
              <span>{card._count?.comments}</span>
            </span>
          )}
        </div>

        {card.priority === 'URGENT' && (
          <span className="text-red-400" title="Urgent Task">
            <AlertTriangle className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  )
}
