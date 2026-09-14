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
  Calendar,
  Flag,
  Clock,
  Check,
  Loader2,
  Columns,
  Users,
  UserPlus,
} from 'lucide-react'
import { CardData, getInitials, getAvatarColor } from './KanbanCard'
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
  const [columnName, setColumnName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [previewDesc, setPreviewDesc] = useState(false)

  // Assignee states
  const [boardCandidates, setBoardCandidates] = useState<
    Array<{ id: string; name: string | null; email: string; avatarUrl?: string | null }>
  >([])
  const [showAssigneePopover, setShowAssigneePopover] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [assigningLoading, setAssigningLoading] = useState(false)

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
          setColumnName(c.column?.title || 'Board Column')
          if (c.dueDate) {
            setDueDate(new Date(c.dueDate).toISOString().split('T')[0])
          }

          // Fetch board members for assignee selection
          if (c.column?.boardId) {
            fetch(`/api/boards/${c.column.boardId}/members`)
              .then((res) => (res.ok ? res.json() : null))
              .then((memData) => {
                if (memData) {
                  const list: Array<{ id: string; name: string | null; email: string; avatarUrl?: string | null }> = []
                  if (memData.owner) list.push(memData.owner)
                  if (memData.members) {
                    memData.members.forEach((m: any) => {
                      if (m.user && !list.some((u) => u.id === m.user.id)) {
                        list.push(m.user)
                      }
                    })
                  }
                  setBoardCandidates(list)
                }
              })
              .catch(console.error)
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [cardId])

  const handleSaveDetails = async (overrides?: Partial<{
    title: string
    description: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    dueDate: string
    tags: string[]
  }>) => {
    const curTitle = overrides?.title !== undefined ? overrides.title : title
    if (!curTitle.trim()) return

    setSaving(true)
    setSavedSuccess(false)

    try {
      const curDesc = overrides?.description !== undefined ? overrides.description : description
      const curPri = overrides?.priority !== undefined ? overrides.priority : priority
      const curDue = overrides?.dueDate !== undefined ? overrides.dueDate : dueDate
      const curTags = overrides?.tags !== undefined ? overrides.tags : tags

      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: curTitle.trim(),
          description: curDesc,
          priority: curPri,
          dueDate: curDue ? new Date(curDue).toISOString() : null,
          tags: curTags,
        }),
      })

      if (res.ok) {
        const { card: updated } = await res.json()
        setCard(updated)
        onCardUpdated(updated)
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 2000)
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
        const nextTags = [...tags, newTag]
        setTags(nextTags)
        handleSaveDetails({ tags: nextTags })
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove)
    setTags(nextTags)
    handleSaveDetails({ tags: nextTags })
  }

  const handleToggleAssignee = async (targetUserId: string) => {
    if (!card) return
    const isAssigned = card.assignees?.some((a) => a.userId === targetUserId)
    setAssigningLoading(true)

    try {
      if (isAssigned) {
        const res = await fetch(`/api/cards/${cardId}/assignees/${targetUserId}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          const data = await res.json()
          if (data.card) {
            setCard(data.card)
            onCardUpdated(data.card)
          }
        }
      } else {
        const res = await fetch(`/api/cards/${cardId}/assignees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: targetUserId }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.card) {
            setCard(data.card)
            onCardUpdated(data.card)
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle assignee:', err)
    } finally {
      setAssigningLoading(false)
    }
  }

  const handleRemoveAssignee = async (targetUserId: string) => {
    if (!card) return
    try {
      const res = await fetch(`/api/cards/${cardId}/assignees/${targetUserId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.card) {
          setCard(data.card)
          onCardUpdated(data.card)
        }
      }
    } catch (err) {
      console.error('Failed to remove assignee:', err)
    }
  }

  const priorityColors = {
    LOW: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
    URGENT: 'bg-red-50 text-red-700 border-red-200',
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-900/20 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600 shadow-xl">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-800" />
          <span className="text-xs">Loading task details...</span>
        </div>
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/25 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-neutral-200/90 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between gap-3 bg-neutral-50/50">
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
            <Columns className="w-3.5 h-3.5 text-neutral-400" />
            <span>{columnName}</span>
            <span className="text-neutral-300">/</span>
            <span className="text-neutral-700 truncate max-w-xs">{title || 'Untitled Task'}</span>
          </div>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            {saving && (
              <span className="text-xs text-neutral-400 font-medium flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </span>
            )}

            <button
              onClick={handleDeleteCard}
              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded-lg transition-colors ml-1"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Content: 2-Column Notion / Linear Style */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto">
          {/* Main Left Pane (Title, Description, Checklist, Activity) */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Title Input */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleSaveDetails()}
                className="w-full text-xl font-bold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-neutral-900 focus:outline-none transition-colors px-0 py-1"
                placeholder="Task title..."
              />
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Description</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDescription(standardDescriptionTemplate)
                      handleSaveDetails({ description: standardDescriptionTemplate })
                    }}
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors underline"
                  >
                    Insert Template
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewDesc(!previewDesc)}
                    className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100/80 hover:bg-neutral-100 border border-neutral-200 transition-colors"
                  >
                    {previewDesc ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{previewDesc ? 'Edit' : 'Preview'}</span>
                  </button>
                </div>
              </div>

              {previewDesc ? (
                <div className="min-h-[140px] p-4 rounded-xl bg-neutral-50/60 border border-neutral-200 overflow-y-auto">
                  <MarkdownViewer content={description} />
                </div>
              ) : (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleSaveDetails()}
                  rows={6}
                  placeholder="Describe technical requirements, context, or acceptance criteria..."
                  className="w-full bg-neutral-50/60 border border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 leading-relaxed resize-y font-mono"
                />
              )}
            </div>

            {/* Acceptance Criteria / Checklist */}
            <div className="pt-4 border-t border-neutral-100">
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

            {/* Comments & Activity Log */}
            <div className="pt-4 border-t border-neutral-100">
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

          {/* Right Properties Sidebar */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-neutral-100 p-6 space-y-6 bg-[#fafafc]/60 shrink-0">
            <div>
              <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                Properties
              </h4>

              {/* Assignees (Multiple) */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Assignees</span>
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAssigneePopover(!showAssigneePopover)}
                      className="text-[11px] text-neutral-600 hover:text-neutral-900 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-200/60 transition-colors"
                      title="Assign member"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Assign</span>
                    </button>

                    {/* Member Selector Popover */}
                    {showAssigneePopover && (
                      <div className="absolute right-0 top-6 w-64 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in space-y-1.5">
                        <div className="flex items-center justify-between px-1 pb-1 border-b border-neutral-100">
                          <span className="text-[11px] font-semibold text-neutral-700">Assign Member</span>
                          <button
                            type="button"
                            onClick={() => setShowAssigneePopover(false)}
                            className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {boardCandidates.length > 4 && (
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Search members..."
                            className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400"
                          />
                        )}

                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {boardCandidates
                            .filter((m) => {
                              if (!memberSearch.trim()) return true
                              const q = memberSearch.toLowerCase()
                              return (m.name && m.name.toLowerCase().includes(q)) || m.email.toLowerCase().includes(q)
                            })
                            .map((m) => {
                              const isAssigned = card?.assignees?.some((a) => a.userId === m.id)
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  disabled={assigningLoading}
                                  onClick={() => handleToggleAssignee(m.id)}
                                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-left text-xs group disabled:opacity-50"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${getAvatarColor(
                                        m.id
                                      )}`}
                                    >
                                      {getInitials(m.name || m.email)}
                                    </div>
                                    <div className="truncate">
                                      <p className="font-medium text-neutral-900 truncate leading-tight">
                                        {m.name || m.email}
                                      </p>
                                      <p className="text-[10px] text-neutral-400 truncate leading-tight">
                                        {m.email}
                                      </p>
                                    </div>
                                  </div>
                                  {isAssigned && (
                                    <Check className="w-3.5 h-3.5 text-neutral-800 shrink-0 ml-1" />
                                  )}
                                </button>
                              )
                            })}
                          {boardCandidates.length === 0 && (
                            <p className="text-[11px] text-neutral-400 p-2 text-center">
                              No members available.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Members Chips */}
                <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                  {card?.assignees && card.assignees.length > 0 ? (
                    card.assignees.map((a) => (
                      <span
                        key={a.id || a.userId}
                        className="inline-flex items-center gap-1 text-[11px] pl-1 pr-1.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200/80 text-neutral-800 shadow-2xs"
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${getAvatarColor(
                            a.user.id
                          )}`}
                        >
                          {getInitials(a.user.name || a.user.email)}
                        </span>
                        <span className="truncate max-w-[90px] font-medium">
                          {a.user.name || a.user.email.split('@')[0]}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignee(a.user.id)}
                          className="hover:text-red-600 text-neutral-400 rounded p-0.5 transition-colors"
                          title="Remove assignment"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-neutral-400 italic py-0.5">No members assigned</p>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5 mb-4">
                <label className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Priority</span>
                </label>
                <select
                  value={priority}
                  onChange={(e) => {
                    const newPri = e.target.value as any
                    setPriority(newPri)
                    handleSaveDetails({ priority: newPri })
                  }}
                  className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none transition-all cursor-pointer ${priorityColors[priority]}`}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5 mb-4">
                <label className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Due Date</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value)
                    handleSaveDetails({ dueDate: e.target.value })
                  }}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-neutral-400 transition-colors"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5 mb-4">
                <label className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Tags</span>
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200/80 text-neutral-700"
                    >
                      #{t}
                      <button
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-red-500 text-neutral-400"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="+ Add tag..."
                  className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400"
                />
              </div>

              {/* Timestamps */}
              <div className="pt-4 border-t border-neutral-200/60 text-[11px] text-neutral-400 space-y-1 font-mono">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  <span>
                    Created: {card.createdAt ? new Date(card.createdAt).toLocaleDateString() : 'Today'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
