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
      className={`w-72 sm:w-80 shrink-0 bg-slate-900/40 rounded-xl border border-slate-800 flex flex-col max-h-[calc(100vh-12rem)] transition-all ${
        isOver ? 'border-blue-500/50 bg-slate-900/70' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: column.colorCode || '#3b82f6' }}
          />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            {column.title}
          </h3>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {column.cards.length}
          </span>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Add task"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards Container */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto min-h-[100px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {column.cards.length === 0 && !isAdding && (
          <div className="h-20 flex items-center justify-center border border-dashed border-slate-800/60 rounded-lg text-xs text-slate-500 font-mono">
            Empty column
          </div>
        )}

        {/* Quick Add Form */}
        {isAdding && (
          <form onSubmit={handleCreateCard} className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-md">
            <textarea
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none mb-2"
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
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                disabled={loading || !newTitle.trim()}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Add</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bottom Add button */}
      {!isAdding && (
        <div className="p-2 pt-0">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-1.5 px-2 rounded-lg hover:bg-slate-800/60 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add card</span>
          </button>
        </div>
      )}
    </div>
  )
}
