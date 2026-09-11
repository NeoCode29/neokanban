'use client'

import { useState } from 'react'
import { MessageSquare, Bot, User, Send, FileText, Loader2 } from 'lucide-react'
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span>Activity & Team / AI Log</span>
        </h4>
        <button
          type="button"
          onClick={() => setContent((prev) => (prev ? `${prev}\n\n${standardTemplate}` : standardTemplate))}
          className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <FileText className="w-3 h-3" />
          <span>Insert Standard Log Template</span>
        </button>
      </div>

      {/* Add Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a status update or team comment (Markdown supported)..."
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Post Update</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 pt-2">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-4">No activity or comments recorded yet.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3.5 rounded-xl border ${
                comment.isAiGenerated
                  ? 'bg-purple-950/20 border-purple-500/30'
                  : 'bg-slate-950/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {comment.isAiGenerated ? (
                    <div className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <span className="text-xs font-semibold text-slate-200">
                    {comment.authorName}
                  </span>

                  {comment.isAiGenerated && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      AI Agent (MCP)
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-slate-500">
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
