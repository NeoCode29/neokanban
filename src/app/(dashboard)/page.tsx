'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Star,
  Layers,
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            Projects & Workspaces
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize tasks with living context standards and AI assistance.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Board</span>
        </button>
      </div>

      {/* Boards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-xs">Loading boards...</p>
        </div>
      ) : boards.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl p-6 bg-slate-900/20">
          <p className="text-sm font-medium text-slate-300">No project boards found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create your first Kanban board to start managing tasks and project standards.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Board</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {board.title}
                  </h3>
                  <button
                    onClick={(e) => toggleFavorite(e, board)}
                    className={`p-1 rounded transition-colors shrink-0 ${
                      board.isFavorite
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-3">
                  {board.description || 'No description provided.'}
                </p>

                {/* Columns Preview */}
                <div className="flex items-center gap-1 mb-4 overflow-hidden">
                  {board.columns.map((col) => (
                    <span
                      key={col.id}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-mono whitespace-nowrap"
                    >
                      {col.title}: <span className="text-slate-200">{col._count.cards}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                    {board.cardCount} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <span className="flex items-center gap-1 text-blue-400 group-hover:translate-x-0.5 transition-transform text-xs font-medium">
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-semibold text-white mb-1">Create New Board</h3>
            <p className="text-xs text-slate-400 mb-4">
              Includes standard engineering columns and living context templates.
            </p>

            <form onSubmit={handleCreateBoard} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Board Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Core Web Platform"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the board purpose..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Board</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
