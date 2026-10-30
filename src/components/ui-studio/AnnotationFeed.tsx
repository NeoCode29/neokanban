'use client'

import React, { useState, useMemo } from 'react'
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  Kanban,
  Trash2,
  Check,
  RotateCcw,
  Loader2,
  Filter,
  User as UserIcon,
  Search,
  ExternalLink,
  MapPin,
  BoxSelect,
  Layers,
} from 'lucide-react'
import { UiAnnotationData } from './types'

interface AnnotationFeedProps {
  annotations: UiAnnotationData[]
  selectedAnnotationId?: string | null
  onSelectAnnotation?: (id: string | null) => void
  onToggleStatus?: (annotationId: string, currentStatus: string) => Promise<void> | void
  onConvertToTask?: (annotationId: string) => Promise<void> | void
  onDeleteAnnotation?: (annotationId: string) => Promise<void> | void
  isConvertingId?: string | null
  className?: string
  readOnly?: boolean
}

function formatRelativeTime(dateInput: string | Date): string {
  try {
    const date = new Date(dateInput)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSec < 60) return 'Baru saja'
    if (diffMin < 60) return `${diffMin}m lalu`
    if (diffHours < 24) return `${diffHours}j lalu`
    if (diffDays < 7) return `${diffDays}h lalu`
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  } catch {
    return 'Waktu tidak valid'
  }
}

export default function AnnotationFeed({
  annotations = [],
  selectedAnnotationId,
  onSelectAnnotation,
  onToggleStatus,
  onConvertToTask,
  onDeleteAnnotation,
  isConvertingId = null,
  className = '',
  readOnly = false,
}: AnnotationFeedProps) {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Sort annotations chronologically (earliest first) to establish consistent numbering #1, #2, ...
  const sortedAnnotations = useMemo(() => {
    return [...annotations].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeA - timeB
    })
  }, [annotations])

  // Map each annotation to its number
  const numberMap = useMemo(() => {
    const map = new Map<string, number>()
    sortedAnnotations.forEach((item, idx) => {
      map.set(item.id, idx + 1)
    })
    return map
  }, [sortedAnnotations])

  // Filtered list
  const filteredAnnotations = useMemo(() => {
    return sortedAnnotations.filter((item) => {
      if (filterStatus === 'OPEN' && item.status !== 'OPEN') return false
      if (filterStatus === 'RESOLVED' && item.status !== 'RESOLVED') return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const commentMatch = item.comment.toLowerCase().includes(query)
        const authorMatch = item.author?.name?.toLowerCase().includes(query)
        return commentMatch || authorMatch
      }

      return true
    })
  }, [sortedAnnotations, filterStatus, searchQuery])

  // Counts
  const counts = useMemo(() => {
    const open = annotations.filter((a) => a.status === 'OPEN').length
    const resolved = annotations.filter((a) => a.status === 'RESOLVED').length
    return { all: annotations.length, open, resolved }
  }, [annotations])

  const handleToggle = async (id: string, currentStatus: string) => {
    if (!onToggleStatus || readOnly) return
    setTogglingId(id)
    try {
      await onToggleStatus(id, currentStatus)
    } finally {
      setTogglingId(null)
    }
  }

  const handleConvert = async (id: string) => {
    if (!onConvertToTask || readOnly) return
    await onConvertToTask(id)
  }

  const handleDelete = async (id: string) => {
    if (!onDeleteAnnotation || readOnly) return
    if (!window.confirm('Hapus catatan anotasi ini?')) return
    setDeletingId(id)
    try {
      await onDeleteAnnotation(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={`flex flex-col h-full bg-white border-l border-neutral-200 select-none ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-neutral-100 flex flex-col gap-3 shrink-0 bg-neutral-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-neutral-900">Catatan Review UX</h3>
              <p className="text-[11px] text-neutral-500">
                {counts.open} terbuka • {counts.resolved} diselesaikan
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/80">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors text-center ${
              filterStatus === 'ALL'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('OPEN')}
            className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors text-center ${
              filterStatus === 'OPEN'
                ? 'bg-white text-rose-600 shadow-xs font-semibold'
                : 'text-neutral-500 hover:text-rose-600'
            }`}
          >
            Open ({counts.open})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('RESOLVED')}
            className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors text-center ${
              filterStatus === 'RESOLVED'
                ? 'bg-white text-emerald-600 shadow-xs font-semibold'
                : 'text-neutral-500 hover:text-emerald-600'
            }`}
          >
            Selesai ({counts.resolved})
          </button>
        </div>

        {/* Search */}
        {annotations.length > 5 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
        )}
      </div>

      {/* Annotation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredAnnotations.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-neutral-700">
              {filterStatus === 'OPEN'
                ? 'Semua feedback sudah diselesaikan!'
                : filterStatus === 'RESOLVED'
                ? 'Belum ada catatan yang ditandai selesai'
                : 'Belum ada catatan anotasi'}
            </p>
            <p className="text-[11px] text-neutral-400 max-w-[220px] mt-1">
              Gunakan Review Mode pada canvas preview untuk menaruh pin komentar atau kotak highlight.
            </p>
          </div>
        ) : (
          filteredAnnotations.map((item) => {
            const number = numberMap.get(item.id) || 1
            const isSelected = selectedAnnotationId === item.id
            const isResolved = item.status === 'RESOLVED'
            const isConverting = isConvertingId === item.id
            const isToggling = togglingId === item.id
            const isDeleting = deletingId === item.id

            return (
              <div
                key={item.id}
                onClick={() => onSelectAnnotation?.(item.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-400/30 shadow-sm'
                    : isResolved
                    ? 'border-neutral-200 bg-neutral-50/60 opacity-80 hover:opacity-100 hover:bg-neutral-50'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-xs'
                }`}
              >
                {/* Top Row: Pin Number + Type + Status Badge + Time */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {/* Number Badge */}
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shadow-xs ${
                        isResolved
                          ? 'bg-emerald-600'
                          : isSelected
                          ? 'bg-blue-600'
                          : 'bg-rose-600'
                      }`}
                    >
                      #{number}
                    </span>

                    {/* Type Indicator */}
                    <span className="flex items-center gap-1 text-[10px] text-neutral-500 font-medium bg-neutral-100 px-1.5 py-0.5 rounded">
                      {item.type === 'BOX' ? (
                        <>
                          <BoxSelect className="w-3 h-3 text-orange-500" />
                          <span>Kotak</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>Pin</span>
                        </>
                      )}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isResolved ? 'Selesai' : 'Open'}
                    </span>
                  </div>

                  <span className="text-[10px] text-neutral-400">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>

                {/* Comment Text */}
                <p className="text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed mb-2.5">
                  {item.comment}
                </p>

                {/* Author Info */}
                <div className="flex items-center justify-between text-[11px] text-neutral-500 pb-2 mb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-1.5">
                    {item.author?.avatarUrl ? (
                      <img
                        src={item.author.avatarUrl}
                        alt={item.author.name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-[9px] font-semibold">
                        {item.author?.name ? item.author.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <span className="truncate max-w-[120px] font-medium text-neutral-700">
                      {item.author?.name || 'Reviewer'}
                    </span>
                  </div>

                  {/* Position Coordinates */}
                  <span className="text-[10px] text-neutral-400 font-mono">
                    X: {item.posX.toFixed(0)}% • Y: {item.posY.toFixed(0)}%
                  </span>
                </div>

                {/* Kanban Task Link if Converted */}
                {item.cardId && (
                  <div className="mb-2 p-1.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between text-[11px] text-blue-800">
                    <div className="flex items-center gap-1.5 truncate">
                      <Kanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-medium truncate">
                        {item.card?.title || `Task #${item.cardId.slice(0, 8)}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold px-1.5 py-0.2 bg-blue-100 rounded shrink-0">
                      Terkait Kanban
                    </span>
                  </div>
                )}

                {/* Action Buttons Row */}
                {!readOnly && (
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <div className="flex items-center gap-1">
                      {/* Toggle Status (Mark Resolved / Reopen) */}
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggle(item.id, item.status)
                        }}
                        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                          isResolved
                            ? 'text-neutral-600 bg-white hover:bg-neutral-100 border-neutral-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                        }`}
                        title={isResolved ? 'Buka kembali feedback' : 'Tandai selesai'}
                      >
                        {isToggling ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isResolved ? (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            <span>Buka Lagi</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Tandai Selesai</span>
                          </>
                        )}
                      </button>

                      {/* Convert to Kanban Task (only if not already converted) */}
                      {!item.cardId && (
                        <button
                          type="button"
                          disabled={isConverting}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleConvert(item.id)
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                          title="Buat Kartu Tugas Kanban dari masukan ini"
                        >
                          {isConverting ? (
                            <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-purple-600" />
                          )}
                          <span>Jadikan Task</span>
                        </button>
                      )}
                    </div>

                    {/* Delete Annotation Button */}
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id)
                      }}
                      className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus catatan anotasi"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
