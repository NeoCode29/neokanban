'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckSquare,
  ShieldCheck,
  FolderKanban,
  CheckCircle2,
  Clock,
  MessageSquare,
  Users,
  ChevronRight,
  Loader2,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import CardDetailModal from '@/components/kanban/CardDetailModal'
import { CardData, getInitials, getAvatarColor } from '@/components/kanban/KanbanCard'

interface ReviewCard {
  id: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | null
  tags: string[]
  updatedAt: string
  column: {
    id: string
    title: string
    board: {
      id: string
      title: string
    }
  }
  assignees: Array<{
    user: {
      id: string
      name: string
      email: string
      avatarUrl: string | null
    }
  }>
  checklists: Array<{
    id: string
    title: string
    isCompleted: boolean
  }>
  _count: {
    comments: number
  }
}

export default function ReviewQueuePage() {
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const fetchReviewQueue = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/reviews')
      if (res.ok) {
        const data = await res.json()
        setCards(data.cards || [])
      }
    } catch (err) {
      console.error('Failed to load review queue:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviewQueue()
  }, [fetchReviewQueue])

  const getPriorityBadge = (priority: ReviewCard['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-50 text-red-700 border-red-200/60'
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200/60'
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200/60'
      default:
        return 'bg-neutral-100 text-neutral-600 border-neutral-200/60'
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              Review Queue
            </h1>
            {!loading && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-white shadow-2xs">
                {cards.length}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Central verification gate for tasks completed by AI agents & team members awaiting review.
          </p>
        </div>

        <button
          onClick={fetchReviewQueue}
          disabled={loading}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200/80 bg-white hover:bg-neutral-50 shadow-2xs transition-colors flex items-center gap-1.5"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-800" />
          <p className="text-xs">Loading review queue...</p>
        </div>
      ) : cards.length === 0 ? (
        /* Empty State */
        <div className="py-20 px-4 bg-white border border-neutral-200/80 rounded-2xl text-center flex flex-col items-center justify-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-base text-neutral-900">
            All Caught Up!
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mt-1">
            No cards are currently awaiting review. Tasks moved to the Review column across all your boards will automatically appear here.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            <span>Back to Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        /* Cards List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const completedChecklists = card.checklists.filter((c) => c.isCompleted).length
            const totalChecklists = card.checklists.length
            const progressPercent = totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0

            return (
              <div
                key={card.id}
                className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-neutral-300 transition-all flex flex-col justify-between gap-4 group"
              >
                {/* Top: Board Tag & Priority */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <Link
                      href={`/boards/${card.column.board.id}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors bg-neutral-100/70 hover:bg-neutral-200/60 px-2 py-0.5 rounded-md"
                    >
                      <FolderKanban className="w-3 h-3 text-neutral-400" />
                      <span className="truncate max-w-[150px]">{card.column.board.title}</span>
                      <ChevronRight className="w-2.5 h-2.5 text-neutral-300" />
                    </Link>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                        card.priority
                      )}`}
                    >
                      {card.priority}
                    </span>
                  </div>

                  {/* Card Title */}
                  <h3
                    onClick={() => setSelectedCardId(card.id)}
                    className="font-semibold text-sm text-neutral-900 hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                  >
                    {card.title}
                  </h3>

                  {/* Checklist Progress */}
                  {totalChecklists > 0 && (
                    <div className="mt-3 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium mb-1.5">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Acceptance Criteria / TDD Steps</span>
                        </span>
                        <span className="font-mono text-neutral-700 font-semibold">
                          {completedChecklists}/{totalChecklists} ({progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200/70 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom: Assignees & Action Button */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Assignees Avatars */}
                    {card.assignees.length > 0 ? (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {card.assignees.map(({ user }) => {
                          const initials = getInitials(user.name)
                          const colorClass = getAvatarColor(user.name)
                          return user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={user.id}
                              src={user.avatarUrl}
                              alt={user.name}
                              title={user.name}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                            />
                          ) : (
                            <div
                              key={user.id}
                              title={user.name}
                              className={`inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white text-[9px] font-bold text-white ${colorClass}`}
                            >
                              {initials}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">Unassigned</span>
                    )}

                    {/* Comments Count */}
                    {card._count.comments > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
                        <MessageSquare className="w-3 h-3" />
                        <span>{card._count.comments}</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedCardId(card.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-900 hover:text-white transition-all shadow-2xs"
                  >
                    <span>Inspect & Review</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Card Detail Modal for Review */}
      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={(updated) => {
            fetchReviewQueue()
          }}
          onCardDeleted={(deletedId) => {
            setSelectedCardId(null)
            fetchReviewQueue()
          }}
        />
      )}
    </div>
  )
}
