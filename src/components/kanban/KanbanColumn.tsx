'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import KanbanCard, { CardData } from './KanbanCard'
import { Plus, X, Loader2 } from 'lucide-react'

export interface ColumnData {
  id: string
  title: string
  order: number
  colorCode?: string | null
  cards: CardData[]
}

interface KanbanColumnProps {
  column: ColumnData
  onCardClick: (card: CardData) => void
  onAddCard: (columnId: string, title: string) => Promise<void>
}

export default function KanbanColumn({
  column,
  onCardClick,
  onAddCard,
}: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  })

  const cardIds = column.cards.map((c) => c.id)

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setLoading(true)
    try {
      await onAddCard(column.id, newTitle.trim())
      setNewTitle('')
      setIsAdding(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`w-72 sm:w-80 shrink-0 bg-slate-925/80 backdrop-blur-md rounded-2xl border border-slate-800/80 flex flex-col max-h-[calc(100vh-14rem)] transition-all ${
        isOver ? 'ring-2 ring-blue-500/40 border-blue-500/30' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 pb-2 flex items-center justify-between border-b border-slate-800/40">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: column.colorCode || '#3b82f6' }}
          />
          <h3 className="text-sm font-semibold text-slate-200 tracking-tight">
            {column.title}
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400">
            {column.cards.length}
          </span>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="Add task to column"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Scroll Container */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto min-h-[120px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {column.cards.length === 0 && !isAdding && (
          <div className="h-24 flex items-center justify-center border border-dashed border-slate-800/60 rounded-xl text-xs text-slate-500">
            Drop cards here
          </div>
        )}

        {/* Quick Add Form */}
        {isAdding && (
          <form onSubmit={handleCreateCard} className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-lg animate-in fade-in zoom-in-95">
            <textarea
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none mb-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleCreateCard(e)
                }
              }}
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={loading || !newTitle.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Add Task</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bottom Add Card trigger if not active */}
      {!isAdding && (
        <div className="p-2 pt-0">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2 px-3 rounded-xl border border-transparent hover:border-slate-800/80 hover:bg-slate-900/60 text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add a task</span>
          </button>
        </div>
      )}
    </div>
  )
}
