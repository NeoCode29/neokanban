'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, CheckSquare, MessageSquare, User, Bot, GripVertical } from 'lucide-react'

export interface CardAssigneeData {
  id: string
  userId: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string | null
  }
}

export interface CardData {
  id: string
  columnId: string
  title: string
  description: string
  order: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  tags: string[]
  startDate?: string | null
  dueDate?: string | null
  createdAt?: string
  assignees?: CardAssigneeData[]
  checklists: { id: string; isCompleted: boolean; title: string }[]
  _count?: { comments: number }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || 'U'
}

export const AVATAR_COLORS = [
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
]

export function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
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
          aria-label="Drag to reorder card"
          className="text-neutral-400 sm:text-neutral-300 hover:text-neutral-600 p-2 sm:p-0.5 -mr-1 -mt-1 sm:mr-0 sm:mt-0 rounded opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 touch-none"
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

          {/* Avatar Stack for Multiple Assignees */}
          {card.assignees && card.assignees.length > 0 ? (
            <div className="flex items-center -space-x-1.5 overflow-hidden pl-1">
              {card.assignees.slice(0, 3).map((a, idx) => (
                <div
                  key={a.id || a.userId}
                  title={a.user.name || a.user.email}
                  style={{ zIndex: 10 - idx }}
                  className={`w-5 h-5 rounded-full border border-white flex items-center justify-center text-[9px] font-bold shadow-2xs transition-transform hover:scale-110 hover:z-20 cursor-default ${getAvatarColor(
                    a.user.id
                  )}`}
                >
                  {getInitials(a.user.name || a.user.email)}
                </div>
              ))}
              {card.assignees.length > 3 && (
                <div
                  title={`${card.assignees.length - 3} more assignees`}
                  style={{ zIndex: 5 }}
                  className="w-5 h-5 rounded-full border border-white bg-neutral-100 text-neutral-600 flex items-center justify-center text-[8px] font-bold shadow-2xs"
                >
                  +{card.assignees.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div
              title="Unassigned"
              className="w-5 h-5 rounded-full bg-neutral-100/80 border border-neutral-200/80 flex items-center justify-center text-neutral-400"
            >
              <User className="w-2.5 h-2.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
