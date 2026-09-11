'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  ChevronDown,
  LayoutGrid,
  List,
  Star,
  Trash2,
  BookOpen,
  Kanban as KanbanIcon,
  Loader2,
} from 'lucide-react'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import CardDetailModal from '@/components/kanban/CardDetailModal'
import { CardData } from '@/components/kanban/KanbanCard'
import { ColumnData } from '@/components/kanban/KanbanColumn'
import ProjectContextView, { ProjectContextData } from '@/components/context/ProjectContextView'

interface BoardDetail {
  id: string
  title: string
  description: string | null
  isFavorite: boolean
  columns: ColumnData[]
  projectContext: ProjectContextData | null
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [board, setBoard] = useState<BoardDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'board' | 'context'>('board')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${id}`)
      if (res.ok) {
        const data = await res.json()
        setBoard(data.board)
      } else if (res.status === 404) {
        router.push('/')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const toggleFavorite = async () => {
    if (!board) return
    try {
      const res = await fetch(`/api/boards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !board.isFavorite }),
      })
      if (res.ok) {
        setBoard({ ...board, isFavorite: !board.isFavorite })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteBoard = async () => {
    if (!confirm('Are you sure you want to delete this board?')) return
    try {
      const res = await fetch(`/api/boards/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/')
    } catch (err) {
      console.error(err)
    }
  }

  const handleCardUpdated = (updatedCard: CardData) => {
    if (!board) return
    setBoard({
      ...board,
      columns: board.columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
      })),
    })
  }

  const handleCardDeleted = (cardId: string) => {
    if (!board) return
    setBoard({
      ...board,
      columns: board.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => c.id !== cardId),
      })),
    })
  }

  const handleQuickAddTask = async () => {
    if (!board || board.columns.length === 0) return
    const targetCol = board.columns[0]
    const title = prompt('Enter task title:')
    if (!title || !title.trim()) return

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId: targetCol.id, title: title.trim() }),
      })

      if (res.ok) {
        const { card } = await res.json()
        setBoard({
          ...board,
          columns: board.columns.map((col) =>
            col.id === targetCol.id ? { ...col, cards: [...col.cards, card] } : col
          ),
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-800" />
        <p className="text-xs">Loading board...</p>
      </div>
    )
  }

  if (!board) return null

  // Filter columns if a specific status is chosen
  const displayedColumns =
    activeFilter === 'all'
      ? board.columns
      : board.columns.filter((c) => c.title.toLowerCase() === activeFilter.toLowerCase())

  return (
    <div className="space-y-6">
      {/* 1. Top Title Row with Black Action Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {board.title}
          </h1>
          <button
            onClick={toggleFavorite}
            className={`p-1 rounded transition-colors ${
              board.isFavorite
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-neutral-300 hover:text-neutral-500'
            }`}
            title="Star board"
          >
            <Star className="w-4 h-4 fill-current" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickAddTask}
            className="bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New task</span>
          </button>

          <button
            onClick={handleDeleteBoard}
            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded-lg transition-colors"
            title="Delete Board"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Controls & Filter Bar (Pill tabs on left, actions on right) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        {/* Left: Rounded Pill Filter Bar */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100/90 rounded-xl w-fit">
          <button
            onClick={() => {
              setActiveTab('board')
              setActiveFilter('all')
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'board' && activeFilter === 'all'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All
          </button>

          {board.columns.map((col) => (
            <button
              key={col.id}
              onClick={() => {
                setActiveTab('board')
                setActiveFilter(col.title)
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'board' && activeFilter === col.title
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {col.title}
            </button>
          ))}

          {/* Project Context Tab in the pill control */}
          <button
            onClick={() => setActiveTab('context')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'context'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
            <span>Project Context</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </button>
        </div>

        {/* Right: Quick actions (Search, Sort dropdown, Layout icons) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200/80 bg-white"
            title="Filter search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-neutral-200/80 rounded-lg text-xs font-medium text-neutral-700 shadow-xs cursor-pointer hover:bg-neutral-50">
            <span>Recently updated</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </div>

          <div className="flex items-center p-0.5 bg-neutral-100 rounded-lg border border-neutral-200/60">
            <button
              onClick={() => setActiveTab('board')}
              className={`p-1 rounded-md transition-colors ${
                activeTab === 'board' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-400 hover:text-neutral-700'
              }`}
              title="Kanban View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('board')}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 transition-colors"
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Area */}
      {activeTab === 'board' ? (
        <KanbanBoard
          boardId={board.id}
          initialColumns={displayedColumns}
          onCardClick={(card) => setSelectedCardId(card.id)}
          onRefresh={fetchBoard}
        />
      ) : (
        <ProjectContextView
          boardId={board.id}
          boardTitle={board.title}
          initialContext={board.projectContext}
        />
      )}

      {/* 4. Card Detail Modal */}
      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={handleCardUpdated}
          onCardDeleted={handleCardDeleted}
        />
      )}
    </div>
  )
}
