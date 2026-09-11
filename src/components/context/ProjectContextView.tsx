'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BookOpen,
  FileCode2,
  Database,
  Code,
  FileText,
  File,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  Save,
  Loader2,
  Sparkles,
  ExternalLink,
  Columns2,
  Eye,
  Edit3,
  X,
  AlertCircle,
} from 'lucide-react'
import MarkdownViewer from '../ui/MarkdownViewer'

export interface ContextDocument {
  id: string
  boardId: string
  fileName: string
  title: string
  content: string
  order: number
  createdAt: string
  updatedAt: string
}

interface ProjectContextViewProps {
  boardId: string
  boardTitle: string
  initialDocuments?: ContextDocument[]
}

type ViewMode = 'split' | 'editor' | 'preview'

export default function ProjectContextView({
  boardId,
  boardTitle,
  initialDocuments,
}: ProjectContextViewProps) {
  const [documents, setDocuments] = useState<ContextDocument[]>(initialDocuments || [])
  const [loading, setLoading] = useState(!initialDocuments)
  const [activeDocId, setActiveDocId] = useState<string | null>(
    initialDocuments && initialDocuments.length > 0 ? initialDocuments[0].id : null
  )

  // Search filter for files
  const [searchQuery, setSearchQuery] = useState('')

  // Editor states
  const [currentContent, setCurrentContent] = useState('')
  const [currentTitle, setCurrentTitle] = useState('')
  const [currentFileName, setCurrentFileName] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('split')

  // Copy feedback
  const [copiedFile, setCopiedFile] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)

  // New File Modal
  const [showNewModal, setShowNewModal] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Delete Confirmation Modal
  const [docToDelete, setDocToDelete] = useState<ContextDocument | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch documents if not provided
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/boards/${boardId}/context`)
      if (res.ok) {
        const data = await res.json()
        const docs: ContextDocument[] = data.documents || []
        setDocuments(docs)
        if (docs.length > 0 && (!activeDocId || !docs.some((d) => d.id === activeDocId))) {
          setActiveDocId(docs[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch context documents:', err)
    } finally {
      setLoading(false)
    }
  }, [boardId, activeDocId])

  useEffect(() => {
    if (!initialDocuments || initialDocuments.length === 0) {
      fetchDocuments()
    }
  }, [boardId, initialDocuments, fetchDocuments])

  // Active document object
  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === activeDocId) || null
  }, [documents, activeDocId])

  // Sync active doc into local editor state
  useEffect(() => {
    if (activeDoc) {
      setCurrentContent(activeDoc.content)
      setCurrentTitle(activeDoc.title)
      setCurrentFileName(activeDoc.fileName)
      setIsDirty(false)
    } else {
      setCurrentContent('')
      setCurrentTitle('')
      setCurrentFileName('')
      setIsDirty(false)
    }
  }, [activeDoc])

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (activeDoc && isDirty) {
          handleSaveDocument()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeDoc, isDirty, currentContent, currentTitle, currentFileName])

  // Filtered documents for file tree/list
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents
    const q = searchQuery.toLowerCase()
    return documents.filter(
      (doc) => doc.fileName.toLowerCase().includes(q) || doc.title.toLowerCase().includes(q)
    )
  }, [documents, searchQuery])

  // Helper to determine file icon and color badge
  const getFileBadge = (fileName: string) => {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
      return {
        icon: BookOpen,
        color: 'bg-blue-50 text-blue-700 border-blue-200/80',
        label: 'MD',
      }
    }
    if (lower.endsWith('.json')) {
      return {
        icon: FileCode2,
        color: 'bg-amber-50 text-amber-700 border-amber-200/80',
        label: 'JSON',
      }
    }
    if (lower.endsWith('.sql')) {
      return {
        icon: Database,
        color: 'bg-purple-50 text-purple-700 border-purple-200/80',
        label: 'SQL',
      }
    }
    if (
      lower.endsWith('.ts') ||
      lower.endsWith('.tsx') ||
      lower.endsWith('.js') ||
      lower.endsWith('.py')
    ) {
      return {
        icon: Code,
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        label: 'CODE',
      }
    }
    return {
      icon: FileText,
      color: 'bg-neutral-100 text-neutral-600 border-neutral-200',
      label: 'DOC',
    }
  }

  // Handle Save
  const handleSaveDocument = async () => {
    if (!activeDoc) return
    setSaving(true)
    setSaveSuccess(false)

    try {
      const res = await fetch(`/api/boards/${boardId}/context/${activeDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle.trim() || activeDoc.title,
          fileName: currentFileName.trim() || activeDoc.fileName,
          content: currentContent,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const updatedDoc = data.document
        setDocuments((prev) =>
          prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
        )
        setIsDirty(false)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to save document.')
      }
    } catch (err) {
      console.error('Error saving document:', err)
      alert('Error saving document.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Create New File
  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFileName.trim()) return

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch(`/api/boards/${boardId}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: newFileName.trim(),
          title: newTitle.trim() || newFileName.trim(),
          content: `# ${newTitle.trim() || newFileName.trim()}\n\nAdd your project documentation, schemas, or instructions here.\n`,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const createdDoc: ContextDocument = data.document
        setDocuments((prev) => [...prev, createdDoc])
        setActiveDocId(createdDoc.id)
        setShowNewModal(false)
        setNewFileName('')
        setNewTitle('')
      } else {
        const err = await res.json()
        setCreateError(err.error || 'Failed to create document.')
      }
    } catch (err) {
      console.error('Failed to create file:', err)
      setCreateError('An error occurred while creating document.')
    } finally {
      setCreating(false)
    }
  }

  // Handle Delete Document
  const handleDeleteDocument = async () => {
    if (!docToDelete) return
    setDeleting(true)

    try {
      const res = await fetch(`/api/boards/${boardId}/context/${docToDelete.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const remaining = documents.filter((d) => d.id !== docToDelete.id)
        setDocuments(remaining)
        if (activeDocId === docToDelete.id) {
          setActiveDocId(remaining.length > 0 ? remaining[0].id : null)
        }
        setDocToDelete(null)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to delete document.')
      }
    } catch (err) {
      console.error('Failed to delete file:', err)
      alert('Error deleting file.')
    } finally {
      setDeleting(false)
    }
  }

  // Copy Active File Content
  const handleCopyFile = () => {
    if (!activeDoc) return
    navigator.clipboard.writeText(currentContent)
    setCopiedFile(true)
    setTimeout(() => setCopiedFile(false), 2000)
  }

  // Copy All Documents as Bundled Prompt
  const handleCopyAll = () => {
    let bundle = `# LIVING PROJECT CONTEXT: ${boardTitle}\n\n`
    bundle += `### Available Files (${documents.length}):\n`
    documents.forEach((doc) => {
      bundle += `- \`${doc.fileName}\`: ${doc.title}\n`
    })
    bundle += `\n---\n\n`

    documents.forEach((doc) => {
      const content = doc.id === activeDocId ? currentContent : doc.content
      bundle += `## File: \`${doc.fileName}\` (${doc.title})\n\n`
      bundle += `${content}\n\n---\n\n`
    })

    navigator.clipboard.writeText(bundle)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  // Preset suggestions for quick new file
  const presets = [
    { fileName: 'architecture.md', title: 'System Architecture & Diagrams' },
    { fileName: 'api-spec.json', title: 'REST & GraphQL API Specifications' },
    { fileName: 'conventions.md', title: 'Code & Commit Conventions' },
    { fileName: 'schema.sql', title: 'Database DDL & Migration Schema' },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner & Info */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl px-5 py-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-900">
                Living Project Context
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                MCP Synced
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Unlimited project documentation, schemas, and guidelines served automatically to AI agents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={handleCopyAll}
            className="px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200/80 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
            title="Copy all documents bundled as an AI context prompt"
          >
            {copiedAll ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-neutral-500" />
            )}
            <span>{copiedAll ? 'Context Copied' : 'Copy All Context'}</span>
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New File</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: File Navigator + Editor / Preview */}
      <div className="flex flex-col lg:flex-row bg-white border border-neutral-200/90 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-215px)] min-h-[580px]">
        {/* Left: File Navigator Sidebar */}
        <aside className="w-full lg:w-72 xl:w-80 bg-[#fafafc] border-b lg:border-b-0 lg:border-r border-neutral-200/80 flex flex-col shrink-0">
          {/* Sidebar Header & Search */}
          <div className="p-3.5 border-b border-neutral-200/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Documents ({documents.length})
              </span>
              <button
                onClick={() => setShowNewModal(true)}
                className="text-xs text-neutral-600 hover:text-neutral-900 font-medium flex items-center gap-1 hover:bg-neutral-200/60 px-2 py-0.5 rounded-md transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full h-8 pl-8 pr-7 bg-white border border-neutral-200/90 rounded-lg text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                <span className="text-xs">Loading files...</span>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-xs text-neutral-500 font-medium">No files found</p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  {searchQuery ? 'Try another search query' : 'Create your first context document'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="mt-3 px-3 py-1 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-lg text-xs font-medium shadow-2xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create Document</span>
                  </button>
                )}
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const isActive = doc.id === activeDocId
                const badge = getFileBadge(doc.fileName)
                const BadgeIcon = badge.icon

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (isDirty && activeDocId !== doc.id) {
                        if (
                          !confirm(
                            'You have unsaved changes in the current document. Discard them?'
                          )
                        ) {
                          return
                        }
                      }
                      setActiveDocId(doc.id)
                    }}
                    className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-white border-neutral-300 shadow-xs'
                        : 'border-transparent hover:bg-neutral-100/70 hover:border-neutral-200/50'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border mt-0.5 ${badge.color}`}
                    >
                      <BadgeIcon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-mono font-medium truncate ${
                            isActive ? 'text-neutral-900 font-semibold' : 'text-neutral-700'
                          }`}
                        >
                          {doc.fileName}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {doc.title || doc.fileName}
                      </p>
                    </div>

                    {/* Delete button (hover/active) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDocToDelete(doc)
                      }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute right-2 top-2.5 p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                      title={`Delete ${doc.fileName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Stats Footer */}
          <div className="p-3 border-t border-neutral-200/70 bg-[#f4f5f7] flex items-center justify-between text-[11px] text-neutral-500">
            <span>{documents.length} context file{documents.length === 1 ? '' : 's'}</span>
            <span className="font-mono text-[10px] text-neutral-400">stdio MCP enabled</span>
          </div>
        </aside>

        {/* Right: Active Document Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {activeDoc ? (
            <>
              {/* Document Action Bar */}
              <header className="px-5 py-3 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                      {currentFileName}
                    </span>
                    <input
                      type="text"
                      value={currentTitle}
                      onChange={(e) => {
                        setCurrentTitle(e.target.value)
                        setIsDirty(true)
                      }}
                      placeholder="Document title..."
                      className="text-xs font-medium text-neutral-700 hover:border-neutral-300 focus:border-neutral-400 focus:bg-white px-2 py-0.5 rounded border border-transparent transition-colors max-w-xs truncate"
                      title="Click to rename document title"
                    />
                  </div>

                  {isDirty ? (
                    <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Unsaved
                    </span>
                  ) : saveSuccess ? (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Saved
                    </span>
                  ) : (
                    <span className="text-[11px] text-neutral-400">
                      Saved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* View Mode Toggle */}
                  <div className="hidden sm:flex items-center p-0.5 bg-neutral-100 rounded-lg border border-neutral-200/70">
                    <button
                      onClick={() => setViewMode('split')}
                      className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                        viewMode === 'split'
                          ? 'bg-white text-neutral-900 shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                      title="Split View (Editor + Preview)"
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                      <span>Split</span>
                    </button>
                    <button
                      onClick={() => setViewMode('editor')}
                      className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                        viewMode === 'editor'
                          ? 'bg-white text-neutral-900 shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                      title="Editor Only"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                        viewMode === 'preview'
                          ? 'bg-white text-neutral-900 shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                      title="Preview Only"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>

                  {/* Copy File Content */}
                  <button
                    onClick={handleCopyFile}
                    className="px-2.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200/80 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
                    title="Copy file contents to clipboard"
                  >
                    {copiedFile ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-neutral-500" />
                    )}
                    <span className="hidden sm:inline">
                      {copiedFile ? 'Copied' : 'Copy'}
                    </span>
                  </button>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveDocument}
                    disabled={saving || !isDirty}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Save changes (Ctrl+S / Cmd+S)"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
              </header>

              {/* Editor / Preview Content Body */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Editor Pane */}
                {(viewMode === 'split' || viewMode === 'editor') && (
                  <div
                    className={`flex flex-col h-full ${
                      viewMode === 'split' ? 'w-full lg:w-1/2 border-r border-neutral-200/70' : 'w-full'
                    }`}
                  >
                    <div className="px-4 py-1.5 bg-neutral-50/70 border-b border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                      <span>Source Editor</span>
                      <span>Markdown supported</span>
                    </div>
                    <textarea
                      value={currentContent}
                      onChange={(e) => {
                        setCurrentContent(e.target.value)
                        setIsDirty(true)
                      }}
                      placeholder="Write your document content here in Markdown, JSON, SQL, etc..."
                      className="flex-1 w-full p-4 bg-transparent resize-none text-xs font-mono text-neutral-800 leading-relaxed placeholder-neutral-400 focus:outline-none overflow-y-auto"
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* Live Rendered Preview Pane */}
                {(viewMode === 'split' || viewMode === 'preview') && (
                  <div
                    className={`flex flex-col h-full bg-[#fafafc]/50 ${
                      viewMode === 'split' ? 'w-full lg:w-1/2' : 'w-full'
                    }`}
                  >
                    <div className="px-4 py-1.5 bg-neutral-50/70 border-b border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Rendered Preview</span>
                      <span className="font-mono text-[10px]">Read-only</span>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto">
                      <MarkdownViewer content={currentContent} />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty State when no document selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-50/40">
              <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200/90 shadow-xs flex items-center justify-center text-neutral-400 mb-3">
                <File className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-800">
                No Document Selected
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-4">
                Select a context document from the left navigator, or create a new one to store project knowledge.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Document</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: New File Creation */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Create Context Document
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Add arbitrary documentation, guidelines, or specs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewFile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  File Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. architecture.md or api-spec.json"
                  value={newFileName}
                  onChange={(e) => {
                    setNewFileName(e.target.value)
                    setCreateError(null)
                  }}
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. System Architecture & Boundaries"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-colors"
                />
              </div>

              {/* Presets */}
              <div>
                <span className="block text-[11px] font-medium text-neutral-500 mb-1.5">
                  Or pick a common template:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p.fileName}
                      type="button"
                      onClick={() => {
                        setNewFileName(p.fileName)
                        setNewTitle(p.title)
                      }}
                      className="text-left px-2.5 py-1.5 rounded-lg border border-neutral-200/80 bg-[#fafafc] hover:bg-neutral-100 hover:border-neutral-300 text-xs transition-colors"
                    >
                      <span className="block font-mono font-medium text-neutral-800 text-[11px]">
                        {p.fileName}
                      </span>
                      <span className="block text-[10px] text-neutral-500 truncate">
                        {p.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newFileName.trim()}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{creating ? 'Creating...' : 'Create Document'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xl w-full max-w-sm p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Delete Document?
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Are you sure you want to delete <code className="font-mono font-semibold text-neutral-800">{docToDelete.fileName}</code>? AI agents will no longer have access to this context file.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-3 py-1.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDocument}
                disabled={deleting}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleting ? 'Deleting...' : 'Delete File'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
