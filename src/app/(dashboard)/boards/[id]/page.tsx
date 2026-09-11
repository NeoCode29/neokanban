'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Kanban,
  BookOpen,
  Star,
  Trash2,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<'kanban' | 'context'>('kanban')
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
    if (!confirm('Are you sure you want to delete this board and all its tasks?')) return
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

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">Loading project board...</p>
      </div>
    )
  }

  if (!board) return null

  return (
    <div className="space-y-6">
      {/* Board Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors shrink-0"
            title="Back to All Boards"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {board.title}
              </h1>
              <button
                onClick={toggleFavorite}
                className={`p-1.5 rounded-lg transition-colors ${
                  board.isFavorite
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
            </div>
            {board.description && (
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl line-clamp-1">
                {board.description}
              </p>
            )}
          </div>
        </div>

        {/* Tab Controls & Settings */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-sm">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'kanban'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>

            <button
              onClick={() => setActiveTab('context')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'context'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Project Context</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>

          <button
            onClick={handleDeleteBoard}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            title="Delete Board"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      {activeTab === 'kanban' ? (
        <KanbanBoard
          boardId={board.id}
          initialColumns={board.columns}
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

      {/* Card Detail Modal */}
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
