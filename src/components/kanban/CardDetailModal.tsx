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
    if (!confirm('Are you sure you want to delete this task?')) return

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
      <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 flex items-center gap-3 text-neutral-600 shadow-xl">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-800" />
          <span className="text-xs">Loading task...</span>
        </div>
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-neutral-200/90 rounded-2xl w-full max-w-2xl my-6 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-start justify-between gap-3 bg-neutral-50/50">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveDetails}
              className="w-full text-base font-semibold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:outline-none transition-colors px-1 py-0.5 rounded"
              placeholder="Task Title"
            />
            <div className="flex items-center gap-2.5 mt-2 px-1">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="bg-white border border-neutral-200 rounded-md px-2 py-0.5 text-xs text-neutral-700 font-medium focus:outline-none focus:border-neutral-900"
              >
                <option value="LOW">Priority: LOW</option>
                <option value="MEDIUM">Priority: MEDIUM</option>
                <option value="HIGH">Priority: HIGH</option>
                <option value="URGENT">Priority: URGENT</option>
              </select>

              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="text-xs text-neutral-600 hover:text-neutral-900 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDeleteCard}
              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Tags */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>Tags</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-700"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500 text-neutral-400"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Add tag..."
                className="bg-transparent border border-dashed border-neutral-300 hover:border-neutral-400 rounded-md px-2 py-0.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>Description</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDescription(standardDescriptionTemplate)}
                  className="text-[11px] text-neutral-600 hover:text-neutral-900 underline transition-colors"
                >
                  Insert Standard Template
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDesc(!previewDesc)}
                  className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200"
                >
                  {previewDesc ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{previewDesc ? 'Edit' : 'Preview'}</span>
                </button>
              </div>
            </div>

            {previewDesc ? (
              <div className="min-h-[120px] p-3 rounded-lg bg-neutral-50 border border-neutral-200 overflow-y-auto">
                <MarkdownViewer content={description} />
              </div>
            ) : (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSaveDetails}
                rows={6}
                placeholder="Describe requirements or technical scope..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 font-mono resize-y leading-relaxed"
              />
            )}
          </div>

          {/* Checklist */}
          <div className="pt-3 border-t border-neutral-100">
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

          {/* Comments */}
          <div className="pt-3 border-t border-neutral-100">
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
