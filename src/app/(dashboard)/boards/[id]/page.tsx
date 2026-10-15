'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Star,
  Trash2,
  MoreHorizontal,
  BookOpen,
  Kanban as KanbanIcon,
  Loader2,
  Users,
  Search,
  X,
  CalendarRange,
} from 'lucide-react'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import CardDetailModal from '@/components/kanban/CardDetailModal'
import ShareBoardModal from '@/components/kanban/ShareBoardModal'
import GanttTimelineView from '@/components/kanban/GanttTimelineView'
import { CardData } from '@/components/kanban/KanbanCard'
import { ColumnData } from '@/components/kanban/KanbanColumn'
import ProjectContextView, { ContextDocument } from '@/components/context/ProjectContextView'

interface BoardDetail {
  id: string
  title: string
  description: string | null
  isFavorite: boolean
  isOwner?: boolean
  members?: any[]
  columns: ColumnData[]
  projectContext?: any
  contextDocuments?: ContextDocument[]
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [board, setBoard] = useState<BoardDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'board' | 'context' | 'timeline'>('board')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

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
    if (!board?.isOwner) {
      alert('Hanya pemilik (owner) proyek yang memiliki izin untuk menghapus board ini.')
      return
    }

    const confirmMessage = `Apakah Anda yakin ingin menghapus board "${board.title}"?\n\nPERINGATAN: Semua kolom, kartu tugas, dan dokumen Living Context akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`
    if (!confirm(confirmMessage)) return

    try {
      const res = await fetch(`/api/boards/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/')
      } else {
        const data = await res.json()
        alert(data.error || 'Gagal menghapus board')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat menghapus board')
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

  const handleCardAdded = (columnId: string, card: CardData) => {
    setBoard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
        ),
      }
    })
  }

  const handleColumnAdded = (newColumn: ColumnData) => {
    setBoard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        columns: [...prev.columns, newColumn],
      }
    })
  }

  const handleColumnUpdated = (updatedColumn: ColumnData) => {
    setBoard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        columns: prev.columns.map((c) =>
          c.id === updatedColumn.id
            ? { ...c, title: updatedColumn.title, colorCode: updatedColumn.colorCode }
            : c
        ),
      }
    })
  }

  const handleColumnDeleted = (deletedColumnId: string, transferToColumnId?: string) => {
    setBoard((prev) => {
      if (!prev) return prev
      const deletedCol = prev.columns.find((c) => c.id === deletedColumnId)
      if (transferToColumnId && deletedCol) {
        return {
          ...prev,
          columns: prev.columns
            .filter((c) => c.id !== deletedColumnId)
            .map((c) =>
              c.id === transferToColumnId
                ? { ...c, cards: [...c.cards, ...deletedCol.cards] }
                : c
            ),
        }
      }
      return {
        ...prev,
        columns: prev.columns.filter((c) => c.id !== deletedColumnId),
      }
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

  const [showMenu, setShowMenu] = useState(false)

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-800" />
        <p className="text-xs">Loading board...</p>
      </div>
    )
  }

  if (!board) return null

  // Calculate total cards
  const totalCards = board.columns.reduce((sum, col) => sum + col.cards.length, 0)

  // Filter columns & search cards
  const displayedColumns = board.columns
    .filter((c) => (activeFilter === 'all' ? true : c.title.toLowerCase() === activeFilter.toLowerCase()))
    .map((col) => ({
      ...col,
      cards: searchQuery.trim()
        ? col.cards.filter(
            (c) =>
              c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : col.cards,
    }))

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* 1. Top Title Row with Black Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            {board.title}
          </h1>
          
          <button
            onClick={toggleFavorite}
            className={`p-1 rounded-md transition-colors ${
              board.isFavorite
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-neutral-300 hover:text-neutral-500'
            }`}
            title="Star board"
          >
            <Star className="w-4 h-4 fill-current" />
          </button>

          {/* Owner Only: Board Options Menu */}
          {board.isOwner ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                title="Board options (Owner only)"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute left-0 mt-1 w-36 bg-white border border-neutral-200 rounded-xl shadow-lg p-1 z-30 animate-in fade-in">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      handleDeleteBoard()
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete board</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              <Users className="w-3 h-3" />
              <span>Collaborator</span>
            </span>
          )}
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex-1 sm:flex-initial justify-center bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Share board with team"
          >
            <Users className="w-3.5 h-3.5 text-neutral-500" />
            <span>Share</span>
            {board.members && board.members.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-neutral-100 text-[10px] text-neutral-600 font-mono">
                {board.members.length}
              </span>
            )}
          </button>

          <button
            onClick={handleQuickAddTask}
            className="flex-1 sm:flex-initial justify-center bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New task</span>
          </button>
        </div>
      </div>

      {/* 2. Tier 1: Primary View Switcher */}
      <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'board'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <KanbanIcon className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'board' ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              {totalCards}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('context')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'context'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Living Context</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'timeline'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>
        </div>
      </div>

      {/* 3. Tier 2: Column Filters & Quick Search (Only active in Kanban Board view) */}
      {activeTab === 'board' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
          {/* Column Filters Pills with Mobile Search Toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#eeeff2] rounded-xl w-full sm:w-fit border border-neutral-200/50 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs transition-all shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 font-medium'
                }`}
              >
                All
              </button>

              {board.columns.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setActiveFilter(col.title)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs transition-all shrink-0 ${
                    activeFilter.toLowerCase() === col.title.toLowerCase()
                      ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60 font-semibold'
                      : 'text-neutral-500 hover:text-neutral-800 font-medium'
                  }`}
                >
                  {col.title}
                </button>
              ))}
            </div>

            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className={`sm:hidden p-1.5 rounded-xl border transition-colors shrink-0 ${
                showMobileSearch || searchQuery
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
              }`}
              title="Search cards"
              aria-label="Toggle search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Search Cards (Visible on desktop or when toggled on mobile) */}
          {(showMobileSearch || searchQuery) && (
            <div className="relative w-full sm:w-64 shrink-0 sm:block animate-in fade-in">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                autoFocus={showMobileSearch}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards in board..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Desktop permanent search when not in mobile toggle mode */}
          {!showMobileSearch && !searchQuery && (
            <div className="relative hidden sm:block w-64 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards in board..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Main Workspace Area */}
      {activeTab === 'board' ? (
        <KanbanBoard
          boardId={board.id}
          initialColumns={displayedColumns}
          onCardClick={(card) => setSelectedCardId(card.id)}
          onRefresh={fetchBoard}
          onCardAdded={handleCardAdded}
          onColumnAdded={handleColumnAdded}
          onColumnUpdated={handleColumnUpdated}
          onColumnDeleted={handleColumnDeleted}
        />
      ) : activeTab === 'context' ? (
        <ProjectContextView
          boardId={board.id}
          boardTitle={board.title}
          initialDocuments={board.contextDocuments}
        />
      ) : (
        <div className="flex-1 overflow-hidden min-h-[550px]">
          <GanttTimelineView
            columns={board.columns}
            onCardClick={(cardId) => setSelectedCardId(cardId)}
          />
        </div>
      )}

      {/* 4. Card Detail Modal */}
      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          columns={board.columns}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={handleCardUpdated}
          onCardDeleted={handleCardDeleted}
          onCardMoved={() => fetchBoard()}
        />
      )}

      {/* 5. Share Board Modal */}
      {showShareModal && (
        <ShareBoardModal
          boardId={board.id}
          boardTitle={board.title}
          onClose={() => setShowShareModal(false)}
          onMembersChange={() => fetchBoard()}
        />
      )}
    </div>
  )
}
