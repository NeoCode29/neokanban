'use client'

import { useState } from 'react'
import { CheckSquare, Plus, Trash2, CheckCircle, Loader2 } from 'lucide-react'

export interface ChecklistItemData {
  id: string
  title: string
  isCompleted: boolean
  order: number
}

interface ChecklistSectionProps {
  cardId: string
  checklists: ChecklistItemData[]
  onUpdate: (updatedChecklists: ChecklistItemData[]) => void
}

export default function ChecklistSection({
  cardId,
  checklists,
  onUpdate,
}: ChecklistSectionProps) {
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const completedCount = checklists.filter((c) => c.isCompleted).length
  const totalCount = checklists.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleToggle = async (item: ChecklistItemData) => {
    setTogglingId(item.id)
    const newStatus = !item.isCompleted

    // Optimistic update
    const nextList = checklists.map((c) =>
      c.id === item.id ? { ...c, isCompleted: newStatus } : c
    )
    onUpdate(nextList)

    try {
      await fetch(`/api/cards/${cardId}/checklists`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, isCompleted: newStatus }),
      })
    } catch (err) {
      console.error('Failed to toggle checklist item:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setAdding(true)
    try {
      const res = await fetch(`/api/cards/${cardId}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      })

      if (res.ok) {
        const { item } = await res.json()
        onUpdate([...checklists, item])
        setNewTitle('')
      }
    } catch (err) {
      console.error('Failed to add checklist item:', err)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    onUpdate(checklists.filter((c) => c.id !== itemId))
    try {
      await fetch(`/api/cards/${cardId}/checklists?itemId=${itemId}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.error('Failed to delete checklist item:', err)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-blue-400" />
          <span>Subtasks & Checklist</span>
        </h4>
        <span className="text-xs font-medium text-slate-400">
          {completedCount}/{totalCount} ({progressPercent}%)
        </span>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Checklist Items List */}
      <div className="space-y-1.5">
        {checklists.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 transition-all"
          >
            <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
              <input
                type="checkbox"
                checked={item.isCompleted}
                onChange={() => handleToggle(item)}
                disabled={togglingId === item.id}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
              <span
                className={`text-xs select-none break-all transition-all ${
                  item.isCompleted
                    ? 'line-through text-slate-500'
                    : 'text-slate-200 group-hover:text-white'
                }`}
              >
                {item.title}
              </span>
            </label>

            <button
              onClick={() => handleDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition-all"
              title="Delete item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Item */}
      <form onSubmit={handleAdd} className="flex gap-2 pt-1">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add an acceptance criteria or subtask..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={adding || !newTitle.trim()}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          <span>Add</span>
        </button>
      </form>
    </div>
  )
}
