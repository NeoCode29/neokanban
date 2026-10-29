'use client'

import React, { useState, useEffect } from 'react'
import { X, Check, Loader2, KanbanSquare } from 'lucide-react'
import { SkillItem } from './SkillCard'

interface BoardOption {
  id: string
  title: string
  description?: string
}

interface AddToBoardModalProps {
  skill: SkillItem | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AddToBoardModal({
  skill,
  isOpen,
  onClose,
  onSuccess,
}: AddToBoardModalProps) {
  const [boards, setBoards] = useState<BoardOption[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    setError(null)
    setSuccessMsg(null)

    fetch('/api/boards')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.boards && data.boards.length > 0) {
          setBoards(data.boards)
          setSelectedBoardId(data.boards[0].id)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [isOpen])

  if (!isOpen || !skill) return null

  const handleAttach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBoardId) return

    setIsSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/boards/${selectedBoardId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: skill.id, skillSlug: skill.slug }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to attach skill to board')
      }

      setSuccessMsg(`Skill "${skill.name}" successfully added to board!`)
      if (onSuccess) onSuccess()
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-200/80 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Add Skill to Board</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Equip an AI Agent on your board with &ldquo;{skill.name}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAttach} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200/80 rounded-xl">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading boards...
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-6 text-xs text-neutral-400">
              No project boards found. Please create a board first.
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-2">
                Select Target Project Board
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {boards.map((b) => (
                  <label
                    key={b.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedBoardId === b.id
                        ? 'border-neutral-900 bg-neutral-50/80 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="board"
                      value={b.id}
                      checked={selectedBoardId === b.id}
                      onChange={() => setSelectedBoardId(b.id)}
                      className="accent-neutral-900"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <KanbanSquare className="w-4 h-4 text-neutral-500 shrink-0" />
                      <span className="text-xs font-medium text-neutral-900 truncate">
                        {b.title}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading || !selectedBoardId}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                'Confirm & Equip'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
