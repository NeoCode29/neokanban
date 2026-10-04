'use client'

import { useState } from 'react'
import { X, Settings2, Trash2, Check, AlertTriangle, Loader2, ArrowRight } from 'lucide-react'
import { ColumnData } from './KanbanColumn'

interface ColumnSettingsModalProps {
  boardId: string
  column: ColumnData
  otherColumns: ColumnData[]
  isOpen: boolean
  onClose: () => void
  onColumnUpdated: (updatedCol: ColumnData) => void
  onColumnDeleted: (deletedColumnId: string, transferToColumnId?: string) => void
}

const COLOR_PRESETS = [
  { label: 'Slate', color: '#64748b' },
  { label: 'Amber', color: '#f59e0b' },
  { label: 'Blue', color: '#3b82f6' },
  { label: 'Purple', color: '#8b5cf6' },
  { label: 'Emerald', color: '#10b981' },
  { label: 'Rose', color: '#ef4444' },
]

export default function ColumnSettingsModal({
  boardId,
  column,
  otherColumns,
  isOpen,
  onClose,
  onColumnUpdated,
  onColumnDeleted,
}: ColumnSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'delete'>('edit')
  const [title, setTitle] = useState(column.title)
  const [colorCode, setColorCode] = useState(column.colorCode || '#64748b')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Deletion states
  const [deleteMode, setDeleteMode] = useState<'transfer' | 'hard'>('transfer')
  const [targetColumnId, setTargetColumnId] = useState<string>(
    otherColumns[0]?.id || ''
  )

  if (!isOpen) return null

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/boards/${boardId}/columns/${column.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          colorCode,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update column')
      }

      const { column: updated } = await res.json()
      onColumnUpdated(updated)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const query =
        column.cards.length > 0 && deleteMode === 'transfer' && targetColumnId
          ? `?transferToColumnId=${targetColumnId}`
          : ''

      const res = await fetch(
        `/api/boards/${boardId}/columns/${column.id}${query}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete column')
      }

      onColumnDeleted(
        column.id,
        deleteMode === 'transfer' ? targetColumnId : undefined
      )
      onClose()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-800">
              <Settings2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">
              Column Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-neutral-100 bg-neutral-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'edit'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            General & Appearance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('delete')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'delete'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-500 hover:text-red-600'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Column</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="m-5 mb-0 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {/* Tab 1: Edit Details */}
        {activeTab === 'edit' && (
          <form onSubmit={handleUpdate} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Column Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. In Review, QA Testing"
                className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Badge Color
              </label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => setColorCode(preset.color)}
                    style={{ backgroundColor: preset.color }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-2xs hover:scale-105 transition-transform"
                    title={preset.label}
                  >
                    {colorCode === preset.color && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
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
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Delete Column */}
        {activeTab === 'delete' && (
          <div className="p-5 space-y-4">
            {otherColumns.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  You cannot delete the only column remaining on this board. A board must have at least one column.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3.5 bg-red-50/60 border border-red-200/80 rounded-xl text-red-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Danger Zone</span>
                  </div>
                  <p>
                    Are you sure you want to delete the column{' '}
                    <strong className="font-semibold">"{column.title}"</strong>?
                  </p>
                </div>

                {column.cards.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-600">
                      This column currently holds{' '}
                      <strong className="text-neutral-900">{column.cards.length} card(s)</strong>.
                      Choose what to do with them:
                    </p>

                    <div className="space-y-2">
                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="deleteMode"
                          checked={deleteMode === 'transfer'}
                          onChange={() => setDeleteMode('transfer')}
                          className="mt-0.5"
                        />
                        <div className="text-xs">
                          <p className="font-semibold text-neutral-800">
                            Move cards to another column (Recommended)
                          </p>
                          <p className="text-neutral-500 text-[11px] mt-0.5">
                            Preserves task cards, checklist progress, and comment history.
                          </p>

                          {deleteMode === 'transfer' && (
                            <div className="mt-2">
                              <select
                                value={targetColumnId}
                                onChange={(e) => setTargetColumnId(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10"
                              >
                                {otherColumns.map((col) => (
                                  <option key={col.id} value={col.id}>
                                    Move to: {col.title} ({col.cards.length} cards)
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-red-200/80 bg-red-50/20 hover:bg-red-50/40 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="deleteMode"
                          checked={deleteMode === 'hard'}
                          onChange={() => setDeleteMode('hard')}
                          className="mt-0.5 text-red-600"
                        />
                        <div className="text-xs">
                          <p className="font-semibold text-red-700">
                            Permanently delete all {column.cards.length} cards
                          </p>
                          <p className="text-red-500/80 text-[11px] mt-0.5">
                            Cards, checklists, and discussions will be lost forever.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">
                    This column is empty. Deleting it will not affect any cards.
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Delete Column</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
