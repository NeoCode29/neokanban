'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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

  const cardsContainerRef = useRef<HTMLDivElement>(null)
  const cardsEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (cardsContainerRef.current) {
      cardsContainerRef.current.scrollTo({
        top: cardsContainerRef.current.scrollHeight,
        behavior,
      })
    }
  }, [])

  // Auto-scroll to bottom on mount, when cards are added, or when add form opens
  useEffect(() => {
    scrollToBottom('auto')
    const timer = setTimeout(() => {
      scrollToBottom('auto')
    }, 50)
    return () => clearTimeout(timer)
  }, [column.cards.length, isAdding, scrollToBottom])

  const handleOpenAdd = () => {
    setIsAdding(true)
    setTimeout(() => {
      scrollToBottom('smooth')
    }, 50)
  }

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

  const getStatusColor = (title: string, customColor?: string | null) => {
    if (customColor) return customColor
    const t = title.toLowerCase()
    if (t.includes('backlog') || t.includes('draft')) return '#64748b'
    if (t.includes('to do') || t.includes('todo') || t.includes('awaiting')) return '#f59e0b'
    if (t.includes('progress') || t.includes('doing')) return '#3b82f6'
    if (t.includes('review')) return '#8b5cf6'
    if (t.includes('done') || t.includes('signed') || t.includes('complete')) return '#10b981'
    return '#94a3b8'
  }

  return (
    <div
      ref={setNodeRef}
      className={`w-72 sm:w-80 shrink-0 bg-[#f4f5f7] rounded-2xl p-3 flex flex-col max-h-[calc(100vh-12rem)] transition-all ${
        isOver ? 'ring-2 ring-neutral-300/80 bg-[#edf0f4]' : ''
      }`}
    >
      {/* Column Header: Status Dot & Title */}
      <div className="px-1.5 py-1 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: getStatusColor(column.title, column.colorCode) }}
          />
          <h3 className="text-[13px] font-semibold text-neutral-800 tracking-tight">
            {column.title}
          </h3>
          <span className="text-[11px] font-normal text-neutral-400">
            {column.cards.length}
          </span>
        </div>

        <button
          onClick={handleOpenAdd}
          className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-md transition-colors"
          title="Add card"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards List */}
      <div
        ref={cardsContainerRef}
        className="flex-1 space-y-3 overflow-y-auto min-h-[80px] px-0.5"
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {column.cards.length === 0 && !isAdding && (
          <div className="h-16 flex items-center justify-center rounded-xl transition-all" />
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
        <div ref={cardsEndRef} />
      </div>

      {/* Bottom Add Card Button */}
      {!isAdding && (
        <div className="pt-2">
          <button
            onClick={handleOpenAdd}
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
