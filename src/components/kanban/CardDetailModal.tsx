'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Trash2,
  Save,
  Tag,
  FileText,
  Eye,
  Edit3,
  Loader2,
} from 'lucide-react'
import { CardData } from './KanbanCard'
import ChecklistSection, { ChecklistItemData } from './ChecklistSection'
import CommentSection, { CommentData } from './CommentSection'
import MarkdownViewer from '../ui/MarkdownViewer'

interface CardDetailModalProps {
  cardId: string
  onClose: () => void
  onCardUpdated: (updatedCard: CardData) => void
  onCardDeleted: (cardId: string) => void
}

export default function CardDetailModal({
  cardId,
  onClose,
  onCardUpdated,
  onCardDeleted,
}: CardDetailModalProps) {
  const [card, setCard] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [previewDesc, setPreviewDesc] = useState(false)

  const standardDescriptionTemplate = `### 🎯 Objective
[What problem or user feature does this task address?]

### 📋 Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

### 🛠 Scope & Constraints
- Target files: \`src/...\`
- Technical notes: ...

### 🧪 Verification Plan
[Steps to test or automated command]`

  useEffect(() => {
    fetch(`/api/cards/${cardId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.card) {
          const c = data.card
          setCard(c)
          setTitle(c.title)
          setDescription(c.description || '')
          setPriority(c.priority)
          setTags(c.tags || [])
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [cardId])

  const handleSaveDetails = async () => {
    if (!title.trim()) return
    setSaving(true)

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          priority,
          tags,
        }),
      })

      if (res.ok) {
        const { card: updated } = await res.json()
        setCard(updated)
        onCardUpdated(updated)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCard = async () => {
    if (!confirm('Are you sure you want to permanently delete this task?')) return

    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' })
      if (res.ok) {
        onCardDeleted(cardId)
        onClose()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span>Loading task details...</span>
        </div>
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/40">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveDetails}
              className="w-full text-lg sm:text-xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none transition-colors px-1 py-0.5 rounded"
              placeholder="Task Title"
            />
            <div className="flex items-center gap-3 mt-2 px-1">
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as any)
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="LOW">Priority: LOW</option>
                <option value="MEDIUM">Priority: MEDIUM</option>
                <option value="HIGH">Priority: HIGH</option>
                <option value="URGENT">Priority: URGENT</option>
              </select>

              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteCard}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Tags</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400 text-slate-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Add tag (Press Enter)"
                className="bg-transparent border border-dashed border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description Section with Standard Template Button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Description & Objective</span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDescription(standardDescriptionTemplate)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Insert Standard Task Template
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDesc(!previewDesc)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800"
                >
                  {previewDesc ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{previewDesc ? 'Edit' : 'Preview'}</span>
                </button>
              </div>
            </div>

            {previewDesc ? (
              <div className="min-h-[140px] p-4 rounded-xl bg-slate-950/80 border border-slate-800 overflow-y-auto">
                <MarkdownViewer content={description} />
              </div>
            ) : (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSaveDetails}
                rows={7}
                placeholder="Describe requirements, acceptance criteria, or technical details..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono resize-y leading-relaxed"
              />
            )}
          </div>

          {/* Checklist Section */}
          <div className="pt-4 border-t border-slate-800/80">
            <ChecklistSection
              cardId={card.id}
              checklists={card.checklists as ChecklistItemData[]}
              onUpdate={(updatedChecklists) => {
                const nextCard = { ...card, checklists: updatedChecklists }
                setCard(nextCard)
                onCardUpdated(nextCard)
              }}
            />
          </div>

          {/* Comments & Activity Section */}
          <div className="pt-4 border-t border-slate-800/80">
            <CommentSection
              cardId={card.id}
              comments={(card as any).comments || []}
              onAddComment={(newComment: CommentData) => {
                const currentComments = (card as any).comments || []
                const nextCard = {
                  ...card,
                  comments: [newComment, ...currentComments],
                  _count: { comments: currentComments.length + 1 },
                }
                setCard(nextCard as any)
                onCardUpdated(nextCard as any)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
