'use client'

import { useState, useEffect, useRef } from 'react'
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
  Image as ImageIcon,
} from 'lucide-react'
import { CardData, getInitials, getAvatarColor } from './KanbanCard'
import ChecklistSection, { ChecklistItemData } from './ChecklistSection'
import CommentSection, { CommentData } from './CommentSection'
import MarkdownViewer from '../ui/MarkdownViewer'
import { getRoleMeta } from '@/lib/member-roles'

export interface ColumnOption {
  id: string
  title: string
  cards?: any[]
}

interface CardDetailModalProps {
  cardId: string
  columns?: ColumnOption[]
  onClose: () => void
  onCardUpdated: (updatedCard: CardData) => void
  onCardDeleted: (cardId: string) => void
  onCardMoved?: () => void
}

export default function CardDetailModal({
  cardId,
  columns,
  onClose,
  onCardUpdated,
  onCardDeleted,
  onCardMoved,
}: CardDetailModalProps) {
  const [card, setCard] = useState<CardData | null>(null)
  const [columnName, setColumnName] = useState<string>('')
  const [columnsList, setColumnsList] = useState<ColumnOption[]>(columns || [])
  const [mobileTab, setMobileTab] = useState<'content' | 'properties'>('content')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [movingColumn, setMovingColumn] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [previewDesc, setPreviewDesc] = useState(false)

  // Sync columns prop if passed or updated
  useEffect(() => {
    if (columns && columns.length > 0) {
      setColumnsList(columns)
    }
  }, [columns])

  // Assignee states
  const [boardCandidates, setBoardCandidates] = useState<
    Array<{ id: string; name: string | null; email: string; avatarUrl?: string | null; role?: string }>
  >([])
  const [showAssigneePopover, setShowAssigneePopover] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [assigningLoading, setAssigningLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleUploadImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to upload image')
        return
      }
      const data = await res.json()
      const markdownImg = `\n![${file.name || 'image'}](${data.url})\n`
      const updated = (description ? description.trimEnd() + '\n' : '') + markdownImg
      setDescription(updated)
      handleSaveDetails({ description: updated })
    } catch (err) {
      console.error('Upload image error:', err)
      alert('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handlePasteDescription = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          e.preventDefault()
          handleUploadImageFile(file)
          return
        }
      }
    }
  }

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
          if (c.startDate) {
            setStartDate(new Date(c.startDate).toISOString().split('T')[0])
          } else {
            setStartDate('')
          }
          if (c.dueDate) {
            setDueDate(new Date(c.dueDate).toISOString().split('T')[0])
          } else {
            setDueDate('')
          }

          // Fetch board columns if not provided
          if (c.column?.boardId && (!columns || columns.length === 0)) {
            fetch(`/api/boards/${c.column.boardId}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((bData) => {
                if (bData?.columns) {
                  setColumnsList(bData.columns)
                }
              })
              .catch(console.error)
          }

          // Fetch board members for assignee selection
          if (c.column?.boardId) {
            fetch(`/api/boards/${c.column.boardId}/members`)
              .then((res) => (res.ok ? res.json() : null))
              .then((memData) => {
                if (memData) {
                  const list: Array<{ id: string; name: string | null; email: string; avatarUrl?: string | null; role?: string }> = []
                  if (memData.owner) list.push({ ...memData.owner, role: 'OWNER' })
                  if (memData.members) {
                    memData.members.forEach((m: any) => {
                      if (m.user && !list.some((u) => u.id === m.user.id)) {
                        list.push({ ...m.user, role: m.role || 'COLLABORATOR' })
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

  const handleMoveColumn = async (targetColumnId: string) => {
    if (!card || card.columnId === targetColumnId) return
    setMovingColumn(true)

    try {
      const targetCol = columnsList.find((col) => col.id === targetColumnId)
      const targetOrder = targetCol?.cards?.length ?? 0

      const res = await fetch(`/api/cards/${cardId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColumnId,
          targetOrder,
        }),
      })

      if (res.ok) {
        const nextCard = { ...card, columnId: targetColumnId }
        setCard(nextCard)
        setColumnName(targetCol?.title || columnName)
        onCardUpdated(nextCard)
        onCardMoved?.()
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 2000)
      }
    } catch (err) {
      console.error('Failed to move card:', err)
    } finally {
      setMovingColumn(false)
    }
  }

  const handleSaveDetails = async (overrides?: Partial<{
    title: string
    description: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    startDate: string
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
      const curStart = overrides?.startDate !== undefined ? overrides.startDate : startDate
      const curDue = overrides?.dueDate !== undefined ? overrides.dueDate : dueDate
      const curTags = overrides?.tags !== undefined ? overrides.tags : tags

      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: curTitle.trim(),
          description: curDesc,
          priority: curPri,
          startDate: curStart ? new Date(curStart).toISOString() : null,
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
    <div className="fixed inset-0 z-50 bg-neutral-900/25 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-hidden">
      <div className="bg-white border border-neutral-200/90 rounded-2xl w-[95vw] sm:w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-neutral-100 flex items-center justify-between gap-2 sm:gap-3 bg-neutral-50/50 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-neutral-500 font-medium min-w-0">
            <Columns className="w-3.5 h-3.5 text-neutral-400 shrink-0" />

            {/* Quick Column Selector Dropdown */}
            {columnsList.length > 0 ? (
              <div className="relative inline-flex items-center shrink-0">
                <select
                  value={card.columnId}
                  onChange={(e) => handleMoveColumn(e.target.value)}
                  disabled={movingColumn}
                  aria-label="Pindah status kolom"
                  className="bg-neutral-200/70 hover:bg-neutral-200 text-neutral-800 font-semibold px-2 py-0.5 rounded text-[11px] border border-neutral-300/70 focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer appearance-none pr-5 transition-colors disabled:opacity-50"
                >
                  {columnsList.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-1.5 text-[8px] text-neutral-500">▼</span>
              </div>
            ) : (
              <span className="font-semibold text-neutral-700">{columnName}</span>
            )}

            <span className="text-neutral-300">/</span>
            <span className="text-neutral-700 truncate max-w-[110px] sm:max-w-xs">{title || 'Untitled Task'}</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saved</span>
              </span>
            )}
            {saving && (
              <span className="text-xs text-neutral-400 font-medium flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </span>
            )}
            {movingColumn && (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Moving...</span>
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

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden border-b border-neutral-100 bg-neutral-100/70 p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('content')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'content'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Konten & Checklist</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('properties')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'properties'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Properti & Status</span>
          </button>
        </div>

        {/* Modal Main Content: 2-Column Notion / Linear Style */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Main Left Pane (Title, Description, Checklist, Activity) */}
          <div
            className={`flex-1 p-5 sm:p-6 space-y-6 overflow-y-auto ${
              mobileTab === 'content' ? 'block' : 'hidden md:block'
            }`}
          >
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100/80 hover:bg-neutral-100 border border-neutral-200 transition-colors disabled:opacity-50"
                    title="Upload image or paste (Ctrl+V) directly"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-3 h-3 animate-spin text-neutral-500" />
                    ) : (
                      <ImageIcon className="w-3 h-3 text-neutral-500" />
                    )}
                    <span>{uploadingImage ? 'Uploading...' : 'Add Image'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleUploadImageFile(file)
                        e.target.value = ''
                      }
                    }}
                    className="hidden"
                  />

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
                  onPaste={handlePasteDescription}
                  rows={6}
                  placeholder="Describe technical requirements, context, or acceptance criteria... (Tip: You can paste images directly with Ctrl+V)"
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
          <div
            className={`w-full md:w-64 border-t md:border-t-0 md:border-l border-neutral-100 p-5 sm:p-6 space-y-6 bg-[#fafafc]/60 shrink-0 overflow-y-auto ${
              mobileTab === 'properties' ? 'block' : 'hidden md:block'
            }`}
          >
            <div>
              <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                Properties
              </h4>

              {/* Status / Column Quick Move */}
              <div className="space-y-1.5 mb-4">
                <label className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Kolom / Status</span>
                </label>
                {columnsList.length > 0 ? (
                  <select
                    value={card.columnId}
                    onChange={(e) => handleMoveColumn(e.target.value)}
                    disabled={movingColumn}
                    className="w-full text-xs font-medium text-neutral-800 bg-white border border-neutral-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-neutral-400 cursor-pointer disabled:opacity-50"
                  >
                    {columnsList.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs font-medium text-neutral-700 bg-neutral-100/70 border border-neutral-200 rounded-xl px-2.5 py-1.5">
                    {columnName}
                  </div>
                )}
              </div>

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
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${getAvatarColor(
                                        m.id
                                      )}`}
                                    >
                                      {getInitials(m.name || m.email)}
                                    </div>
                                    <div className="truncate flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className="font-medium text-neutral-900 truncate leading-tight">
                                          {m.name || m.email}
                                        </p>
                                        <span
                                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${
                                            m.role === 'OWNER'
                                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                              : getRoleMeta(m.role).color
                                          }`}
                                        >
                                          {m.role === 'OWNER' ? 'Owner' : getRoleMeta(m.role).label}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-neutral-400 truncate leading-tight font-mono">
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
                    card.assignees.map((a) => {
                      const candidate = boardCandidates.find((c) => c.id === a.user.id)
                      const roleMeta =
                        candidate?.role === 'OWNER'
                          ? { label: 'Owner', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
                          : getRoleMeta(candidate?.role)
                      return (
                        <span
                          key={a.id || a.userId}
                          className="inline-flex items-center gap-1.5 text-[11px] pl-1 pr-1.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200/80 text-neutral-800 shadow-2xs"
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
                          {candidate?.role && (
                            <span className={`text-[8px] font-semibold px-1 rounded-sm border ${roleMeta.color}`}>
                              {roleMeta.label}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignee(a.user.id)}
                            className="hover:text-red-600 text-neutral-400 rounded p-0.5 transition-colors"
                            title="Remove assignment"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      )
                    })
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

              {/* Start Date */}
              <div className="space-y-1.5 mb-4">
                <label className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    handleSaveDetails({ startDate: e.target.value })
                  }}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-neutral-400 transition-colors"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-1.5 mb-4">
                <label className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
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
