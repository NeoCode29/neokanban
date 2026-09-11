'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import KanbanColumn, { ColumnData } from './KanbanColumn'
import KanbanCard, { CardData } from './KanbanCard'
import { Plus, Loader2 } from 'lucide-react'

interface KanbanBoardProps {
  boardId: string
  initialColumns: ColumnData[]
  onCardClick: (card: CardData) => void
  onRefresh: () => void
}

export default function KanbanBoard({
  boardId,
  initialColumns,
  onCardClick,
  onRefresh,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnData[]>(initialColumns)
  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [addingColumnLoading, setAddingColumnLoading] = useState(false)

  // Configure sensors for touch and mouse
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts to allow clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const findCard = (cardId: string): CardData | undefined => {
    for (const col of columns) {
      const card = col.cards.find((c) => c.id === cardId)
      if (card) return card
    }
    return undefined
  }

  const findColumnOfCard = (cardId: string): ColumnData | undefined => {
    return columns.find((col) => col.cards.some((c) => c.id === cardId))
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const card = findCard(active.id as string)
    if (card) {
      setActiveCard(card)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeCol = findColumnOfCard(activeId)
    const overCol =
      columns.find((col) => col.id === overId) || findColumnOfCard(overId)

    if (!activeCol || !overCol) return

    // If dragging across different columns during dragOver, move card visually
    if (activeCol.id !== overCol.id) {
      setColumns((prev) => {
        const activeCards = [...activeCol.cards]
        const overCards = [...overCol.cards]

        const activeIndex = activeCards.findIndex((c) => c.id === activeId)
        const [movedCard] = activeCards.splice(activeIndex, 1)

        if (!movedCard) return prev

        movedCard.columnId = overCol.id

        // Determine insert index
        const overIndex = overCards.findIndex((c) => c.id === overId)
        if (overIndex >= 0) {
          overCards.splice(overIndex, 0, movedCard)
        } else {
          overCards.push(movedCard)
        }

        return prev.map((col) => {
          if (col.id === activeCol.id) return { ...col, cards: activeCards }
          if (col.id === overCol.id) return { ...col, cards: overCards }
          return col
        })
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const currentColumn = findColumnOfCard(activeId)
    if (!currentColumn) return

    // Determine target index in current column
    const cardIndex = currentColumn.cards.findIndex((c) => c.id === activeId)
    if (cardIndex < 0) return

    // Sync move with backend API
    try {
      await fetch(`/api/cards/${activeId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId: currentColumn.id,
          targetOrder: cardIndex,
        }),
      })
    } catch (err) {
      console.error('Failed to sync card move:', err)
      onRefresh()
    }
  }

  const handleAddCard = async (columnId: string, title: string) => {
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, title }),
      })

      if (res.ok) {
        const { card } = await res.json()
        setColumns((prev) =>
          prev.map((col) =>
            col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
          )
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColumnTitle.trim()) return

    setAddingColumnLoading(true)
    try {
      const res = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newColumnTitle.trim() }),
      })

      if (res.ok) {
        const { column } = await res.json()
        setColumns((prev) => [...prev, column])
        setNewColumnTitle('')
        setIsAddingColumn(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAddingColumnLoading(false)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-start gap-4 overflow-x-auto pb-8 pt-1">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onCardClick={onCardClick}
            onAddCard={handleAddCard}
          />
        ))}

        {/* Add Column Button / Form */}
        <div className="w-72 shrink-0">
          {isAddingColumn ? (
            <form
              onSubmit={handleCreateColumn}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl animate-in fade-in"
            >
              <input
                autoFocus
                type="text"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Column name (e.g. Testing)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-3"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingColumnLoading || !newColumnTitle.trim()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  {addingColumnLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Add Column</span>
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full py-3 px-4 rounded-2xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/60 text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Column</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Drag Overlay */}
      <DragOverlay>
        {activeCard ? (
          <div className="rotate-2 scale-105 shadow-2xl">
            <KanbanCard card={activeCard} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
