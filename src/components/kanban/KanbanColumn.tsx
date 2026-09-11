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
      className={`w-72 sm:w-80 shrink-0 bg-[#f4f5f7] rounded-2xl p-3 flex flex-col max-h-[calc(100vh-13rem)] transition-all ${
        isOver ? 'ring-2 ring-neutral-300 bg-neutral-200/60' : ''
      }`}
    >
      {/* Column Header: Status Dot & Title */}
      <div className="px-1 py-1.5 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: column.colorCode || '#64748b' }}
          />
          <h3 className="text-xs font-semibold text-neutral-800 tracking-tight">
            {column.title}
          </h3>
          <span className="text-[11px] font-medium text-neutral-400">
            {column.cards.length}
          </span>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/80 rounded-md transition-colors"
          title="Add card"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards List */}
      <div className="flex-1 space-y-3 overflow-y-auto min-h-[100px] px-0.5">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {column.cards.length === 0 && !isAdding && (
          <div className="h-24 flex items-center justify-center border border-dashed border-neutral-300/80 rounded-xl text-xs text-neutral-400">
            No tasks in this list
          </div>
        )}

        {/* Quick Add Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateCard}
            className="bg-white border border-neutral-200 rounded-xl p-3 shadow-sm animate-in fade-in"
          >
            <textarea
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              rows={2}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 resize-none mb-2"
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
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={loading || !newTitle.trim()}
                className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Add</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bottom Add Card Button */}
      {!isAdding && (
        <div className="pt-2">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-1.5 rounded-lg hover:bg-neutral-200/60 text-xs font-medium text-neutral-500 hover:text-neutral-800 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add card</span>
          </button>
        </div>
      )}
    </div>
  )
}
