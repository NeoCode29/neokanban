'use client'

import { useState, useRef } from 'react'
import { MessageSquare, Bot, User, Send, FileText, Loader2, Image as ImageIcon } from 'lucide-react'
import MarkdownViewer from '../ui/MarkdownViewer'

export interface CommentData {
  id: string
  authorName: string
  content: string
  isAiGenerated: boolean
  createdAt: string
}

interface CommentSectionProps {
  cardId: string
  comments: CommentData[]
  onAddComment: (comment: CommentData) => void
}

export default function CommentSection({
  cardId,
  comments,
  onAddComment,
}: CommentSectionProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setContent((prev) => (prev ? prev.trimEnd() + '\n' + markdownImg : markdownImg))
    } catch (err) {
      console.error('Upload image error:', err)
      alert('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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

  const standardTemplate = `**Status:** \`[UPDATE]\`

**📝 Summary of Actions:**
- Completed: 

**🔗 Changed Files / References:**
- \`src/...\`

**❓ Blockers or Questions:**
None`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (res.ok) {
        const { comment } = await res.json()
        onAddComment(comment)
        setContent('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
          <span>Activity Log</span>
        </h4>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="text-[11px] text-neutral-600 hover:text-neutral-900 underline flex items-center gap-1 disabled:opacity-50"
            title="Attach image or paste directly (Ctrl+V)"
          >
            {uploadingImage ? (
              <Loader2 className="w-3 h-3 animate-spin text-neutral-500" />
            ) : (
              <ImageIcon className="w-3 h-3 text-neutral-500" />
            )}
            <span>{uploadingImage ? 'Uploading...' : 'Attach Image'}</span>
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
            onClick={() => setContent((prev) => (prev ? `${prev}\n\n${standardTemplate}` : standardTemplate))}
            className="text-[11px] text-neutral-600 hover:text-neutral-900 underline flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            <span>Insert Log Template</span>
          </button>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          placeholder="Leave an update or comment... (Tip: Paste screenshot with Ctrl+V)"
          rows={3}
          className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 resize-none font-mono"
        />
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            <span>Post</span>
          </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-2.5 pt-1">
        {comments.length === 0 ? (
          <p className="text-xs text-neutral-400 italic text-center py-3">No activity recorded yet.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border ${
                comment.isAiGenerated
                  ? 'bg-purple-50/40 border-purple-200/80'
                  : 'bg-neutral-50/60 border-neutral-200/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {comment.isAiGenerated ? (
                    <div className="w-4 h-4 rounded bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Bot className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded bg-neutral-200 text-neutral-600 flex items-center justify-center">
                      <User className="w-3 h-3" />
                    </div>
                  )}

                  <span className="text-xs font-medium text-neutral-900">
                    {comment.authorName}
                  </span>

                  {comment.isAiGenerated && (
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200">
                      AI (MCP)
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-neutral-400 font-mono">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>

              <MarkdownViewer content={comment.content} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
