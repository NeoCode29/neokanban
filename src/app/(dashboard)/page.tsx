'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Star,
  FolderKanban,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Loader2,
  X,
} from 'lucide-react'

interface BoardItem {
  id: string
  title: string
  description: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  columnCount: number
  cardCount: number
  columns: { id: string; title: string; _count: { cards: number } }[]
}

export default function DashboardPage() {
  const [boards, setBoards] = useState<BoardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch('/api/boards')
      if (res.ok) {
        const data = await res.json()
        setBoards(data.boards || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      })

      if (res.ok) {
        setTitle('')
        setDescription('')
        setIsModalOpen(false)
        fetchBoards()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const toggleFavorite = async (e: React.MouseEvent, board: BoardItem) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !board.isFavorite }),
      })

      if (res.ok) {
        setBoards((prev) =>
          prev.map((b) => (b.id === board.id ? { ...b, isFavorite: !b.isFavorite } : b))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const displayedBoards =
    filter === 'favorites' ? boards.filter((b) => b.isFavorite) : boards

  return (
    <div className="space-y-6">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Projects
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your sprint boards, living project context, and AI tasks.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New project</span>
        </button>
      </div>

      {/* 2. Filter Pill Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100/90 rounded-xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            filter === 'all'
              ? 'bg-white text-neutral-900 shadow-xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          All ({boards.length})
        </button>
        <button
          onClick={() => setFilter('favorites')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            filter === 'favorites'
              ? 'bg-white text-neutral-900 shadow-xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Starred ({boards.filter((b) => b.isFavorite).length})
        </button>
      </div>

      {/* 3. Boards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-700" />
          <p className="text-xs">Loading projects...</p>
        </div>
      ) : displayedBoards.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-neutral-300 rounded-2xl p-6 bg-white">
          <p className="text-sm font-medium text-neutral-800">No projects found</p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
            Create a project board to organize your tasks and team context.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedBoards.map((board) => (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className="group bg-white hover:border-neutral-300 border border-neutral-200/90 rounded-xl p-5 transition-all flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-950 transition-colors line-clamp-1">
                    {board.title}
                  </h3>
                  <button
                    onClick={(e) => toggleFavorite(e, board)}
                    className={`p-1 rounded transition-colors shrink-0 ${
                      board.isFavorite
                        ? 'text-amber-500 hover:text-amber-600'
                        : 'text-neutral-300 hover:text-neutral-500'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>

                <p className="text-xs text-neutral-500 line-clamp-2 min-h-[32px] mb-3">
                  {board.description || 'No description provided.'}
                </p>

                {/* Columns Preview */}
                <div className="flex items-center gap-1 mb-4 overflow-hidden">
                  {board.columns.map((col) => (
                    <span
                      key={col.id}
                      className="px-2 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-[10px] text-neutral-500 font-mono whitespace-nowrap"
                    >
                      {col.title}: <span className="text-neutral-800 font-medium">{col._count.cards}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-neutral-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                    {board.cardCount} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <span className="flex items-center gap-1 text-neutral-800 group-hover:translate-x-0.5 transition-transform text-xs font-semibold">
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-semibold text-neutral-900 mb-1">Create New Project</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Includes Kanban columns and living context templates.
            </p>

            <form onSubmit={handleCreateBoard} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Core Web App"
                  required
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of project scope..."
                  rows={3}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
