'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Crosshair,
  RotateCw,
  MessageSquarePlus,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Kanban,
  Check,
  Loader2,
  Layers,
  HelpCircle,
} from 'lucide-react'
import {
  UiAnnotationData,
  ViewportDevice,
  CanvasInteractionMode,
  CreateAnnotationPayload,
} from './types'

interface PreviewCanvasProps {
  htmlContent: string
  title?: string
  annotations?: UiAnnotationData[]
  mode?: CanvasInteractionMode
  onModeChange?: (mode: CanvasInteractionMode) => void
  onAddAnnotation?: (payload: CreateAnnotationPayload) => Promise<void> | void
  selectedAnnotationId?: string | null
  onSelectAnnotation?: (id: string | null) => void
  isSubmittingAnnotation?: boolean
  className?: string
  readOnly?: boolean
}

interface DraftBox {
  startX: number
  startY: number
  curX: number
  curY: number
}

interface PendingAnnotation {
  type: 'PIN' | 'BOX'
  posX: number
  posY: number
  width?: number
  height?: number
}

export default function PreviewCanvas({
  htmlContent,
  title = 'Interactive Preview',
  annotations = [],
  mode: controlledMode,
  onModeChange,
  onAddAnnotation,
  selectedAnnotationId,
  onSelectAnnotation,
  isSubmittingAnnotation = false,
  className = '',
  readOnly = false,
}: PreviewCanvasProps) {
  // Device Viewport state
  const [device, setDevice] = useState<ViewportDevice>('desktop')
  // Interaction mode (browse vs review)
  const [uncontrolledMode, setUncontrolledMode] = useState<CanvasInteractionMode>('browse')
  const mode = controlledMode ?? uncontrolledMode

  const setMode = useCallback(
    (newMode: CanvasInteractionMode) => {
      if (onModeChange) {
        onModeChange(newMode)
      } else {
        setUncontrolledMode(newMode)
      }
    },
    [onModeChange]
  )

  // Refresh key for iframe reload
  const [iframeKey, setIframeKey] = useState(0)

  // Canvas drawing & creation states
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [draftBox, setDraftBox] = useState<DraftBox | null>(null)
  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null)
  const [commentText, setCommentText] = useState('')
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null)
  const [showAnnotations, setShowAnnotations] = useState(true)

  // Reset pending state when mode changes or when htmlContent changes
  useEffect(() => {
    setPendingAnnotation(null)
    setDraftBox(null)
    setIsDrawing(false)
    setCommentText('')
  }, [mode, htmlContent])

  // Sort annotations chronologically for consistent numbering #1, #2, ...
  const sortedAnnotations = useMemo(() => {
    return [...annotations].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeA - timeB
    })
  }, [annotations])

  // Map annotation ID to its display number index (1-based)
  const annotationIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    sortedAnnotations.forEach((item, idx) => {
      map.set(item.id, idx + 1)
    })
    return map
  }, [sortedAnnotations])

  // Count open and resolved
  const counts = useMemo(() => {
    const open = annotations.filter((a) => a.status === 'OPEN').length
    const resolved = annotations.filter((a) => a.status === 'RESOLVED').length
    return { open, resolved, total: annotations.length }
  }, [annotations])

  // Mouse handlers for drawing pin/box
  const getCoordinatesFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    // Calculate percentages (0 - 100%)
    const rawX = ((e.clientX - rect.left) / rect.width) * 100
    const rawY = ((e.clientY - rect.top) / rect.height) * 100
    const x = Math.max(0, Math.min(100, Math.round(rawX * 100) / 100))
    const y = Math.max(0, Math.min(100, Math.round(rawY * 100) / 100))
    return { x, y }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'review' || readOnly) return
    // Prevent drawing when clicking on existing pin/box or pending popover
    if ((e.target as HTMLElement).closest('.annotation-marker') || (e.target as HTMLElement).closest('.annotation-popover')) {
      return
    }

    const { x, y } = getCoordinatesFromEvent(e)
    setIsDrawing(true)
    setDraftBox({ startX: x, startY: y, curX: x, curY: y })
    setPendingAnnotation(null)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !draftBox) return
    const { x, y } = getCoordinatesFromEvent(e)
    setDraftBox((prev) => (prev ? { ...prev, curX: x, curY: y } : null))
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !draftBox) return
    setIsDrawing(false)

    const { x, y } = getCoordinatesFromEvent(e)
    const deltaX = Math.abs(x - draftBox.startX)
    const deltaY = Math.abs(y - draftBox.startY)

    // Threshold for drag vs click: > 2% width or height is treated as bounding box
    if (deltaX > 2 || deltaY > 2) {
      const posX = Math.min(draftBox.startX, x)
      const posY = Math.min(draftBox.startY, y)
      const width = Math.max(1, deltaX)
      const height = Math.max(1, deltaY)

      setPendingAnnotation({
        type: 'BOX',
        posX,
        posY,
        width,
        height,
      })
    } else {
      // Single click: PIN marker
      setPendingAnnotation({
        type: 'PIN',
        posX: draftBox.startX,
        posY: draftBox.startY,
      })
    }

    setDraftBox(null)
    setCommentText('')
  }

  const handleCancelPending = () => {
    setPendingAnnotation(null)
    setCommentText('')
  }

  const handleSavePending = async () => {
    if (!pendingAnnotation || !commentText.trim() || !onAddAnnotation) return
    await onAddAnnotation({
      type: pendingAnnotation.type,
      posX: pendingAnnotation.posX,
      posY: pendingAnnotation.posY,
      width: pendingAnnotation.width,
      height: pendingAnnotation.height,
      comment: commentText.trim(),
    })
    setPendingAnnotation(null)
    setCommentText('')
  }

  // Device width classes: fixed paper container sizes so percentages always map to the exact paper dimensions!
  const getDeviceContainerClass = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px] h-[667px] shrink-0 my-auto shadow-2xl rounded-2xl border-4 border-neutral-800 bg-white'
      case 'tablet':
        return 'w-[768px] h-[95%] shrink-0 my-auto shadow-2xl rounded-xl border border-neutral-700 bg-white'
      case 'desktop':
      default:
        // Fixed standard 1200px viewport or full width max-w-[1280px] to keep 100% stable aspect ratio
        return 'w-full max-w-[1280px] h-full shadow-xl rounded-xl border border-neutral-800 bg-white'
    }
  }

  return (
    <div className={`flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Top Toolbar */}
      <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Device Switcher */}
        <div className="flex items-center gap-1 bg-neutral-800/80 p-1 rounded-xl border border-neutral-700/60">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              device === 'desktop'
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/40'
            }`}
            title="Desktop (100% lebar)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              device === 'tablet'
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/40'
            }`}
            title="Tablet (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
            <span className="text-[10px] text-neutral-500 hidden md:inline">768px</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              device === 'mobile'
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/40'
            }`}
            title="Mobile (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
            <span className="text-[10px] text-neutral-500 hidden md:inline">375px</span>
          </button>
        </div>

        {/* Center: Mode Switcher (Browse vs Review) */}
        {!readOnly && (
          <div className="flex items-center gap-1 bg-neutral-800/80 p-1 rounded-xl border border-neutral-700/60">
            <button
              type="button"
              onClick={() => setMode('browse')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'browse'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/40'
              }`}
              title="Mode Jelajah: Interaksi langsung dengan tombol & link di prototype"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Browse</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('review')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'review'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/40'
              }`}
              title="Mode Review: Klik untuk pasang Pin, drag untuk buat Kotak anotasi"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Review</span>
            </button>
          </div>
        )}

        {/* Right: Actions & Stats */}
        <div className="flex items-center gap-2">
          {/* Annotation Counter Pills */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`px-2 py-1 rounded-md border transition-colors flex items-center gap-1 ${
                showAnnotations
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-500'
              }`}
              title={showAnnotations ? 'Sembunyikan anotasi' : 'Tampilkan anotasi'}
            >
              <Layers className="w-3 h-3" />
              <span>{counts.total} Catatan</span>
            </button>

            {counts.open > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]">
                {counts.open} Open
              </span>
            )}
            {counts.resolved > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                {counts.resolved} Resolved
              </span>
            )}
          </div>

          {/* Reload Iframe button */}
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Muat ulang preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mode Instruction Banner */}
      {mode === 'review' && !readOnly && (
        <div className="bg-rose-950/70 border-b border-rose-800/50 px-4 py-1.5 text-xs text-rose-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>
              <strong>Mode Review Aktif:</strong> Klik pada preview untuk menaruh <strong>Pin (#)</strong>, atau drag untuk menggambar <strong>Kotak Highlight</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMode('browse')}
            className="text-[11px] underline hover:text-white"
          >
            Kembali ke Mode Jelajah
          </button>
        </div>
      )}

      {/* Canvas Viewport Workspace with Dot Grid Pattern */}
      <div
        className="flex-1 relative overflow-auto p-4 flex items-center justify-center select-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Frame Wrapper with chosen Device Width */}
        <div className={`relative transition-all duration-300 overflow-hidden flex flex-col ${getDeviceContainerClass()}`}>
          {/* Mobile/Tablet Chrome Header (decorative) */}
          {device === 'mobile' && (
            <div className="h-6 bg-neutral-900 flex items-center justify-between px-5 text-[10px] text-neutral-400 shrink-0 select-none">
              <span>9:41</span>
              <div className="w-16 h-3 bg-black rounded-full" />
              <span>100%</span>
            </div>
          )}
          {device === 'tablet' && (
            <div className="h-5 bg-neutral-900/90 flex items-center justify-center text-[10px] text-neutral-400 shrink-0 select-none">
              <span className="w-2 h-2 rounded-full bg-neutral-700" />
            </div>
          )}

          {/* Content Container (Holds Iframe and Absolute Overlay Layer) */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`relative flex-1 w-full h-full overflow-hidden ${
              mode === 'review' ? 'cursor-crosshair' : 'cursor-default'
            }`}
          >
            {/* Sandboxed Iframe (Isolation: NO allow-same-origin) */}
            <iframe
              key={iframeKey}
              sandbox="allow-scripts allow-forms"
              srcDoc={
                htmlContent && htmlContent.trim()
                  ? htmlContent
                  : `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-center;height:100vh;margin:0;background:#fafafa;color:#888;"><div style="text-align:center;padding:40px;"><h3>Konten HTML Belum Tersedia</h3><p>Gunakan tombol Edit atau Upload untuk memasukkan mockup HTML.</p></div></body></html>`
              }
              className={`w-full h-full border-0 bg-white transition-opacity ${
                mode === 'review' ? 'pointer-events-none' : 'pointer-events-auto'
              }`}
              title={title}
            />

            {/* Empty state overlay when no html */}
            {(!htmlContent || !htmlContent.trim()) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50/90 pointer-events-none p-6 text-center">
                <Layers className="w-10 h-10 text-neutral-300 mb-2" />
                <h4 className="font-semibold text-sm text-neutral-700">Mockup Belum Memiliki Konten HTML</h4>
                <p className="text-xs text-neutral-400 max-w-sm mt-1">
                  Tambahkan kode markup HTML atau upload file .html untuk mulai mereview prototype ini.
                </p>
              </div>
            )}

            {/* Overlay Layer for Annotations & Drawing */}
            {showAnnotations && (
              <div className="absolute inset-0 pointer-events-none">
                {/* 1. Existing Annotations Markers */}
                {sortedAnnotations.map((item) => {
                  const number = annotationIndexMap.get(item.id) || 1
                  const isResolved = item.status === 'RESOLVED'
                  const isSelected = selectedAnnotationId === item.id
                  const isHovered = hoveredAnnotationId === item.id

                  if (item.type === 'BOX' && item.width && item.height) {
                    return (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectAnnotation?.(item.id)
                        }}
                        onMouseEnter={() => setHoveredAnnotationId(item.id)}
                        onMouseLeave={() => setHoveredAnnotationId(null)}
                        className={`annotation-marker absolute pointer-events-auto transition-all cursor-pointer rounded-md ${
                          isSelected
                            ? 'border-2 border-blue-500 bg-blue-500/25 ring-4 ring-blue-500/30 z-30 shadow-lg'
                            : isResolved
                            ? 'border-2 border-dashed border-emerald-500 bg-emerald-500/15 hover:bg-emerald-500/30 z-10'
                            : 'border-2 border-dashed border-rose-500 bg-rose-500/20 hover:bg-rose-500/35 z-20'
                        }`}
                        style={{
                          left: `${item.posX}%`,
                          top: `${item.posY}%`,
                          width: `${item.width}%`,
                          height: `${item.height}%`,
                        }}
                      >
                        {/* Box Number Tag */}
                        <div
                          className={`absolute -top-3.5 left-1 px-1.5 py-0.2 text-[10px] font-bold rounded shadow-sm flex items-center gap-1 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : isResolved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          <span>#{number}</span>
                          {isResolved && <Check className="w-2.5 h-2.5" />}
                        </div>

                        {/* Tooltip on Hover */}
                        {(isHovered || isSelected) && (
                          <div
                            className={`absolute left-0 top-full mt-1.5 z-40 bg-neutral-900 text-white text-xs p-2.5 rounded-xl shadow-2xl border border-neutral-700 min-w-[200px] max-w-xs pointer-events-auto`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-[11px] text-neutral-300">
                                #{number} • Bounding Box
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  isResolved
                                    ? 'bg-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-500/30 text-rose-300'
                                }`}
                              >
                                {isResolved ? 'Selesai' : 'Open'}
                              </span>
                            </div>
                            <p className="text-neutral-200 text-xs line-clamp-3 mb-1.5">
                              {item.comment}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
                              <span>{item.author?.name || 'Reviewer'}</span>
                              {item.cardId && (
                                <span className="text-blue-400 flex items-center gap-0.5">
                                  <Kanban className="w-3 h-3" /> Task
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Default: PIN Marker
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectAnnotation?.(item.id)
                      }}
                      onMouseEnter={() => setHoveredAnnotationId(item.id)}
                      onMouseLeave={() => setHoveredAnnotationId(null)}
                      className={`annotation-marker absolute pointer-events-auto transition-transform cursor-pointer -translate-x-1/2 -translate-y-1/2 ${
                        isSelected ? 'z-30 scale-125' : isHovered ? 'z-25 scale-110' : 'z-20'
                      }`}
                      style={{
                        left: `${item.posX}%`,
                        top: `${item.posY}%`,
                      }}
                    >
                      {/* Pulsing ring for OPEN pins */}
                      {!isResolved && !isSelected && (
                        <span className="absolute -inset-1 rounded-full bg-rose-500 opacity-50 animate-ping pointer-events-none" />
                      )}

                      {/* Pin Circle */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shadow-lg border-2 border-white transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white ring-4 ring-blue-400/60'
                            : isResolved
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-rose-600 text-white hover:bg-rose-700'
                        }`}
                      >
                        {number}
                      </div>

                      {/* Tooltip on Hover */}
                      {(isHovered || isSelected) && (
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-40 bg-neutral-900 text-white text-xs p-2.5 rounded-xl shadow-2xl border border-neutral-700 min-w-[200px] max-w-xs pointer-events-auto`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-[11px] text-neutral-300">
                              #{number} • Pin Marker
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                isResolved
                                  ? 'bg-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-500/30 text-rose-300'
                              }`}
                            >
                              {isResolved ? 'Selesai' : 'Open'}
                            </span>
                          </div>
                          <p className="text-neutral-200 text-xs line-clamp-3 mb-1.5">
                            {item.comment}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
                            <span>{item.author?.name || 'Reviewer'}</span>
                            {item.cardId && (
                              <span className="text-blue-400 flex items-center gap-0.5">
                                <Kanban className="w-3 h-3" /> Task
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* 2. Live Drawing Bounding Box */}
                {isDrawing && draftBox && (
                  <div
                    className="absolute border-2 border-dashed border-rose-500 bg-rose-500/20 rounded pointer-events-none z-30"
                    style={{
                      left: `${Math.min(draftBox.startX, draftBox.curX)}%`,
                      top: `${Math.min(draftBox.startY, draftBox.curY)}%`,
                      width: `${Math.abs(draftBox.curX - draftBox.startX)}%`,
                      height: `${Math.abs(draftBox.curY - draftBox.startY)}%`,
                    }}
                  >
                    <span className="absolute -top-4 left-0 px-1 py-0.2 bg-rose-600 text-white text-[9px] font-bold rounded">
                      Box Highlight
                    </span>
                  </div>
                )}

                {/* 3. Popover Form for Creating New Annotation */}
                {pendingAnnotation && (
                  <div
                    className="annotation-popover absolute z-50 pointer-events-auto"
                    style={{
                      // Clamp position so popover doesn't overflow container bounds
                      left: pendingAnnotation.posX > 65 ? 'auto' : `${pendingAnnotation.posX}%`,
                      right: pendingAnnotation.posX > 65 ? `${100 - pendingAnnotation.posX}%` : 'auto',
                      top: pendingAnnotation.posY > 65 ? 'auto' : `${pendingAnnotation.posY}%`,
                      bottom: pendingAnnotation.posY > 65 ? `${100 - pendingAnnotation.posY}%` : 'auto',
                    }}
                  >
                    {/* Visual marker of the pending point */}
                    {pendingAnnotation.type === 'PIN' ? (
                      <div className="w-4 h-4 rounded-full bg-rose-600 ring-4 ring-rose-400/50 -translate-x-1/2 -translate-y-1/2 mb-1 animate-bounce" />
                    ) : (
                      <div
                        className="border-2 border-dashed border-rose-500 bg-rose-500/20 rounded mb-1 pointer-events-none"
                        style={{
                          width: `${pendingAnnotation.width || 10}%`,
                          height: `${pendingAnnotation.height || 10}%`,
                        }}
                      />
                    )}

                    {/* Popover Card */}
                    <div className="w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-neutral-200 p-3.5 animate-in fade-in zoom-in-95 text-neutral-900">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                          <MessageSquarePlus className="w-3.5 h-3.5 text-rose-600" />
                          <span>
                            {pendingAnnotation.type === 'BOX'
                              ? 'Tambah Bounding Box'
                              : 'Tambah Pin Catatan'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelPending}
                          className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        <textarea
                          autoFocus
                          rows={3}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                              handleSavePending()
                            } else if (e.key === 'Escape') {
                              handleCancelPending()
                            }
                          }}
                          placeholder="Tulis masukan feedback, kritik tata letak, warna, atau catatan UX..."
                          className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 resize-none text-neutral-800"
                        />

                        <div className="flex items-center justify-between text-[11px] text-neutral-400">
                          <span>Posisi: {pendingAnnotation.posX.toFixed(0)}%, {pendingAnnotation.posY.toFixed(0)}%</span>
                          <span className="text-[10px]">Ctrl+Enter untuk simpan</span>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelPending}
                            className="px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={!commentText.trim() || isSubmittingAnnotation}
                            onClick={handleSavePending}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
                          >
                            {isSubmittingAnnotation ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Menyimpan...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Simpan Catatan</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
