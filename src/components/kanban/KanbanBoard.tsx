'use client'

import { useState, useEffect } from 'react'
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
  onCardAdded?: (columnId: string, card: CardData) => void
  onColumnAdded?: (column: ColumnData) => void
  onColumnUpdated?: (column: ColumnData) => void
  onColumnDeleted?: (columnId: string, transferToColumnId?: string) => void
}

export default function KanbanBoard({
  boardId,
  initialColumns,
  onCardClick,
  onRefresh,
  onCardAdded,
  onColumnAdded,
  onColumnUpdated,
  onColumnDeleted,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnData[]>(initialColumns)

  // Re-sync columns when parent filters or reloads columns
  useEffect(() => {
    setColumns(initialColumns)
  }, [initialColumns])

  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [addingColumnLoading, setAddingColumnLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
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
    if (card) setActiveCard(card)
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

    if (activeCol.id !== overCol.id) {
      setColumns((prev) => {
        const activeCards = [...activeCol.cards]
        const overCards = [...overCol.cards]

        const activeIndex = activeCards.findIndex((c) => c.id === activeId)
        const [movedCard] = activeCards.splice(activeIndex, 1)
        if (!movedCard) return prev

        movedCard.columnId = overCol.id

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
    const currentColumn = findColumnOfCard(activeId)
    if (!currentColumn) return

    const cardIndex = currentColumn.cards.findIndex((c) => c.id === activeId)
    if (cardIndex < 0) return

    try {
      const res = await fetch(`/api/cards/${activeId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId: currentColumn.id,
          targetOrder: cardIndex,
        }),
      })
      if (res.ok) {
        onRefresh()
      }
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
        onCardAdded?.(columnId, card)
        onRefresh()
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
        onColumnAdded?.(column)
        onRefresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAddingColumnLoading(false)
    }
  }

  const handleColumnUpdated = (updated: ColumnData) => {
    setColumns((prev) =>
      prev.map((c) =>
        c.id === updated.id
          ? { ...c, title: updated.title, colorCode: updated.colorCode }
          : c
      )
    )
    if (onColumnUpdated) onColumnUpdated(updated)
    onRefresh()
  }

  const handleColumnDeleted = (deletedColumnId: string, transferToColumnId?: string) => {
    setColumns((prev) => {
      const deletedCol = prev.find((c) => c.id === deletedColumnId)
      if (transferToColumnId && deletedCol) {
        return prev
          .filter((c) => c.id !== deletedColumnId)
          .map((c) =>
            c.id === transferToColumnId
              ? { ...c, cards: [...c.cards, ...deletedCol.cards] }
              : c
          )
      }
      return prev.filter((c) => c.id !== deletedColumnId)
    })
    if (onColumnDeleted) onColumnDeleted(deletedColumnId, transferToColumnId)
    onRefresh()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-start gap-3 overflow-x-auto pb-6 pt-1">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            boardId={boardId}
            column={column}
            otherColumns={columns.filter((c) => c.id !== column.id)}
            onCardClick={onCardClick}
            onAddCard={handleAddCard}
            onColumnUpdated={handleColumnUpdated}
            onColumnDeleted={handleColumnDeleted}
          />
        ))}

        {/* Add Column Button */}
        <div className="w-64 shrink-0">
          {isAddingColumn ? (
            <form
              onSubmit={handleCreateColumn}
              className="bg-white border border-neutral-200 rounded-2xl p-3 shadow-xs"
            >
              <input
                autoFocus
                type="text"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Column name..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 mb-2.5"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingColumnLoading || !newColumnTitle.trim()}
                  className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {addingColumnLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Add</span>
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full py-3 px-3 rounded-2xl border border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-100/60 text-xs font-medium text-neutral-500 hover:text-neutral-800 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add column</span>
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rotate-1 shadow-xl">
            <KanbanCard card={activeCard} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
