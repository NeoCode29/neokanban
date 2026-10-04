'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FolderPlus, Loader2 } from 'lucide-react'

interface CreateBoardModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (boardId: string) => void
}

export default function CreateBoardModal({ isOpen, onClose, onCreated }: CreateBoardModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create board')
      }

      const { board } = await res.json()
      setTitle('')
      setDescription('')
      onClose()

      if (onCreated) {
        onCreated(board.id)
      } else {
        router.push(`/boards/${board.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-800">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Create New Project Board</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Board Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mobile App Redesign, Backend API"
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project and deliverables..."
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Board</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
