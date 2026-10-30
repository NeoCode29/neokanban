'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Compass,
  Box,
  Plus,
  Search,
  X,
  Edit3,
  Trash2,
  Eye,
  Crosshair,
  MessageSquare,
  AlertCircle,
  Loader2,
  ExternalLink,
  Code2,
  Tag,
  Palette,
  CheckCircle2,
  Clock,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Filter,
} from 'lucide-react'
import {
  UiPageData,
  UiComponentData,
  UiAnnotationData,
  CanvasInteractionMode,
  CreateAnnotationPayload,
} from './types'
import PreviewCanvas from './PreviewCanvas'
import AnnotationFeed from './AnnotationFeed'
import AddEditPageModal from './AddEditPageModal'
import AddEditComponentModal from './AddEditComponentModal'

interface UiStudioViewProps {
  boardId: string
  boardTitle: string
  isOwner?: boolean
}

const CATEGORY_PRESETS = [
  'All',
  'Input',
  'Navigation',
  'Feedback',
  'Card',
  'Data Display',
  'Layout',
  'General',
]

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-300',
    dotClass: 'bg-neutral-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  READY: {
    label: 'Ready',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
}

export default function UiStudioView({
  boardId,
  boardTitle,
  isOwner = false,
}: UiStudioViewProps) {
  // Navigation sub-tab: 'pages' vs 'components'
  const [subTab, setSubTab] = useState<'pages' | 'components'>('pages')

  // Data states
  const [pages, setPages] = useState<UiPageData[]>([])
  const [components, setComponents] = useState<UiComponentData[]>([])
  const [loading, setLoading] = useState(true)

  // Selected item IDs
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Canvas & Annotation interactions
  const [canvasMode, setCanvasMode] = useState<CanvasInteractionMode>('browse')
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [isSubmittingAnnotation, setIsSubmittingAnnotation] = useState(false)
  const [convertingAnnotationId, setConvertingAnnotationId] = useState<string | null>(null)

  // Mobile / layout responsive toggles
  const [showRightFeed, setShowRightFeed] = useState(true)

  // Modals state
  const [showPageModal, setShowPageModal] = useState(false)
  const [editingPage, setEditingPage] = useState<UiPageData | null>(null)

  const [showComponentModal, setShowComponentModal] = useState(false)
  const [editingComponent, setEditingComponent] = useState<UiComponentData | null>(null)

  // 1. Initial Data Fetching
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    try {
      const [pagesRes, compsRes] = await Promise.all([
        fetch(`/api/boards/${boardId}/ui-pages`),
        fetch(`/api/boards/${boardId}/ui-components`),
      ])

      let loadedPages: UiPageData[] = []
      let loadedComps: UiComponentData[] = []

      if (pagesRes.ok) {
        const pagesData = await pagesRes.json()
        loadedPages = pagesData.pages || []
        setPages(loadedPages)
      }

      if (compsRes.ok) {
        const compsData = await compsRes.json()
        loadedComps = compsData.components || []
        setComponents(loadedComps)
      }

      // Default selection if available
      if (loadedPages.length > 0 && !selectedPageId) {
        setSelectedPageId(loadedPages[0].id)
      }
      if (loadedComps.length > 0 && !selectedComponentId) {
        setSelectedComponentId(loadedComps[0].id)
      }
    } catch (err) {
      console.error('Failed to load UI Studio items:', err)
    } finally {
      setLoading(false)
    }
  }, [boardId, selectedPageId, selectedComponentId])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Fetch full details of single page when selected
  const fetchPageDetail = useCallback(
    async (pageId: string) => {
      try {
        const res = await fetch(`/api/boards/${boardId}/ui-pages/${pageId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.page) {
            setPages((prev) =>
              prev.map((p) => (p.id === data.page.id ? data.page : p))
            )
          }
        }
      } catch (err) {
        console.error('Failed to fetch page detail:', err)
      }
    },
    [boardId]
  )

  // Fetch full details of single component when selected
  const fetchComponentDetail = useCallback(
    async (componentId: string) => {
      try {
        const res = await fetch(`/api/boards/${boardId}/ui-components/${componentId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.component) {
            setComponents((prev) =>
              prev.map((c) => (c.id === data.component.id ? data.component : c))
            )
          }
        }
      } catch (err) {
        console.error('Failed to fetch component detail:', err)
      }
    },
    [boardId]
  )

  useEffect(() => {
    if (subTab === 'pages' && selectedPageId) {
      fetchPageDetail(selectedPageId)
    }
  }, [subTab, selectedPageId, fetchPageDetail])

  useEffect(() => {
    if (subTab === 'components' && selectedComponentId) {
      fetchComponentDetail(selectedComponentId)
    }
  }, [subTab, selectedComponentId, fetchComponentDetail])

  // Currently active item
  const activePage = useMemo(() => {
    return pages.find((p) => p.id === selectedPageId) || pages[0] || null
  }, [pages, selectedPageId])

  const activeComponent = useMemo(() => {
    return (
      components.find((c) => c.id === selectedComponentId) ||
      components[0] ||
      null
    )
  }, [components, selectedComponentId])

  const activeItem = subTab === 'pages' ? activePage : activeComponent
  const currentAnnotations = useMemo(() => {
    return activeItem?.annotations || []
  }, [activeItem])

  // Filtered lists
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        page.title.toLowerCase().includes(q) ||
        page.path.toLowerCase().includes(q) ||
        (page.description && page.description.toLowerCase().includes(q))
      )
    })
  }, [pages, searchQuery])

  const filteredComponents = useMemo(() => {
    return components.filter((comp) => {
      if (
        selectedCategory !== 'All' &&
        comp.category.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        comp.name.toLowerCase().includes(q) ||
        comp.category.toLowerCase().includes(q) ||
        (comp.description && comp.description.toLowerCase().includes(q))
      )
    })
  }, [components, searchQuery, selectedCategory])

  // Count open issues helper
  const getOpenIssuesCount = (item: UiPageData | UiComponentData) => {
    return (item.annotations || []).filter((a) => a.status === 'OPEN').length
  }

  // --- Handlers for Page CRUD ---
  const handleOpenAddPage = () => {
    setEditingPage(null)
    setShowPageModal(true)
  }

  const handleOpenEditPage = (page: UiPageData, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPage(page)
    setShowPageModal(true)
  }

  const handleDeletePage = async (page: UiPageData, e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      !window.confirm(
        `Hapus halaman "${page.title}" (${page.path})?\nSemua catatan review di halaman ini akan dihapus secara permanen.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/boards/${boardId}/ui-pages/${page.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus halaman')
      }

      setPages((prev) => {
        const remaining = prev.filter((p) => p.id !== page.id)
        if (selectedPageId === page.id) {
          setSelectedPageId(remaining.length > 0 ? remaining[0].id : null)
        }
        return remaining
      })
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus halaman.')
    }
  }

  const handlePageSaved = (savedPage: UiPageData) => {
    setPages((prev) => {
      const exists = prev.some((p) => p.id === savedPage.id)
      if (exists) {
        return prev.map((p) => (p.id === savedPage.id ? savedPage : p))
      }
      return [savedPage, ...prev]
    })
    setSelectedPageId(savedPage.id)
    setShowPageModal(false)
    setEditingPage(null)
  }

  // --- Handlers for Component CRUD ---
  const handleOpenAddComponent = () => {
    setEditingComponent(null)
    setShowComponentModal(true)
  }

  const handleOpenEditComponent = (
    comp: UiComponentData,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    setEditingComponent(comp)
    setShowComponentModal(true)
  }

  const handleDeleteComponent = async (
    comp: UiComponentData,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    if (
      !window.confirm(
        `Hapus komponen "${comp.name}"?\nSemua catatan review di komponen ini akan dihapus secara permanen.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(
        `/api/boards/${boardId}/ui-components/${comp.id}`,
        {
          method: 'DELETE',
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus komponen')
      }

      setComponents((prev) => {
        const remaining = prev.filter((c) => c.id !== comp.id)
        if (selectedComponentId === comp.id) {
          setSelectedComponentId(remaining.length > 0 ? remaining[0].id : null)
        }
        return remaining
      })
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus komponen.')
    }
  }

  const handleComponentSaved = (savedComp: UiComponentData) => {
    setComponents((prev) => {
      const exists = prev.some((c) => c.id === savedComp.id)
      if (exists) {
        return prev.map((c) => (c.id === savedComp.id ? savedComp : c))
      }
      return [savedComp, ...prev]
    })
    setSelectedComponentId(savedComp.id)
    setShowComponentModal(false)
    setEditingComponent(null)
  }

  // --- Handlers for Annotation Feed ---
  const handleAddAnnotation = async (payload: CreateAnnotationPayload) => {
    if (!activeItem) return
    setIsSubmittingAnnotation(true)

    try {
      const isPage = subTab === 'pages'
      const body = {
        type: payload.type,
        posX: payload.posX,
        posY: payload.posY,
        width: payload.width,
        height: payload.height,
        comment: payload.comment,
        pageId: isPage ? activeItem.id : undefined,
        componentId: !isPage ? activeItem.id : undefined,
      }

      const res = await fetch('/api/ui-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menambahkan catatan')
      }

      const { annotation } = await res.json()

      // Update state
      if (isPage) {
        setPages((prev) =>
          prev.map((p) => {
            if (p.id === activeItem.id) {
              const updatedAnns = [...(p.annotations || []), annotation]
              return { ...p, annotations: updatedAnns }
            }
            return p
          })
        )
      } else {
        setComponents((prev) =>
          prev.map((c) => {
            if (c.id === activeItem.id) {
              const updatedAnns = [...(c.annotations || []), annotation]
              return { ...c, annotations: updatedAnns }
            }
            return c
          })
        )
      }

      setSelectedAnnotationId(annotation.id)
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan catatan')
    } finally {
      setIsSubmittingAnnotation(false)
    }
  }

  const handleToggleStatus = async (
    annotationId: string,
    currentStatus: string
  ) => {
    const nextStatus = currentStatus === 'OPEN' ? 'RESOLVED' : 'OPEN'
    try {
      const res = await fetch(`/api/ui-annotations/${annotationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal memperbarui status catatan')
      }

      const { annotation: updated } = await res.json()

      if (subTab === 'pages') {
        setPages((prev) =>
          prev.map((p) => {
            if (p.id === activeItem?.id) {
              return {
                ...p,
                annotations: (p.annotations || []).map((a) =>
                  a.id === updated.id ? updated : a
                ),
              }
            }
            return p
          })
        )
      } else {
        setComponents((prev) =>
          prev.map((c) => {
            if (c.id === activeItem?.id) {
              return {
                ...c,
                annotations: (c.annotations || []).map((a) =>
                  a.id === updated.id ? updated : a
                ),
              }
            }
            return c
          })
        )
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status catatan.')
    }
  }

  const handleConvertToTask = async (annotationId: string) => {
    setConvertingAnnotationId(annotationId)
    try {
      const res = await fetch(
        `/api/ui-annotations/${annotationId}/convert-task`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengonversi catatan ke kartu Kanban')
      }

      const data = await res.json()
      const updatedAnnotation = data.annotation || (data.card ? { id: annotationId, cardId: data.card.id } : null)

      if (updatedAnnotation && updatedAnnotation.id) {
        if (subTab === 'pages') {
          setPages((prev) =>
            prev.map((p) => {
              if (p.id === activeItem?.id) {
                return {
                  ...p,
                  annotations: (p.annotations || []).map((a) =>
                    a.id === updatedAnnotation.id ? { ...a, ...updatedAnnotation } : a
                  ),
                }
              }
              return p
            })
          )
        } else {
          setComponents((prev) =>
            prev.map((c) => {
              if (c.id === activeItem?.id) {
                return {
                  ...c,
                  annotations: (c.annotations || []).map((a) =>
                    a.id === updatedAnnotation.id ? { ...a, ...updatedAnnotation } : a
                  ),
                }
              }
              return c
            })
          )
        }
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengonversi catatan ke task Kanban.')
    } finally {
      setConvertingAnnotationId(null)
    }
  }

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      const res = await fetch(`/api/ui-annotations/${annotationId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus catatan')
      }

      if (subTab === 'pages') {
        setPages((prev) =>
          prev.map((p) => {
            if (p.id === activeItem?.id) {
              return {
                ...p,
                annotations: (p.annotations || []).filter(
                  (a) => a.id !== annotationId
                ),
              }
            }
            return p
          })
        )
      } else {
        setComponents((prev) =>
          prev.map((c) => {
            if (c.id === activeItem?.id) {
              return {
                ...c,
                annotations: (c.annotations || []).filter(
                  (a) => a.id !== annotationId
                ),
              }
            }
            return c
          })
        )
      }

      if (selectedAnnotationId === annotationId) {
        setSelectedAnnotationId(null)
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus catatan.')
    }
  }

  // Header active item info helpers
  const activeTitle = subTab === 'pages' ? (activePage?.title || 'Pilih Halaman') : (activeComponent?.name || 'Pilih Komponen')
  const activeSubtitle = subTab === 'pages' ? activePage?.path : activeComponent?.category
  const activeStatusMeta = activePage ? STATUS_CONFIG[activePage.status] || STATUS_CONFIG.DRAFT : null
  const openCount = currentAnnotations.filter((a) => a.status === 'OPEN').length

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Top Banner / Header Info */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl px-5 py-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Palette className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
                UI/UX Studio & Interactive Prototype
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Live Canvas
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Pratinjau antarmuka web, katalog komponen desain sistem, dan feedback visual terintegrasi Kanban.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => {
              if (subTab === 'pages') handleOpenAddPage()
              else handleOpenAddComponent()
            }}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {subTab === 'pages' ? 'Tambah Halaman' : 'Tambah Komponen'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Main 3-Column Workspace Container */}
      <div className="flex flex-col xl:flex-row bg-white border border-neutral-200/90 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-215px)] min-h-[640px]">
        {/* ======================================================== */}
        {/* COLUMN 1: LEFT NAVIGATOR (SITE TREE & COMPONENT CATALOG) */}
        {/* ======================================================== */}
        <aside className="w-full xl:w-80 bg-[#fafafc] border-b xl:border-b-0 xl:border-r border-neutral-200/80 flex flex-col shrink-0 select-none">
          {/* Sub-tab Pill Switcher */}
          <div className="p-3 border-b border-neutral-200/70">
            <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-200/60 rounded-xl">
              <button
                onClick={() => {
                  setSubTab('pages')
                  setSearchQuery('')
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  subTab === 'pages'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>Peta Halaman</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    subTab === 'pages'
                      ? 'bg-neutral-100 text-neutral-700'
                      : 'bg-neutral-300/60 text-neutral-600'
                  }`}
                >
                  {pages.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setSubTab('components')
                  setSearchQuery('')
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  subTab === 'components'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-purple-600" />
                <span>Komponen</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    subTab === 'components'
                      ? 'bg-neutral-100 text-neutral-700'
                      : 'bg-neutral-300/60 text-neutral-600'
                  }`}
                >
                  {components.length}
                </span>
              </button>
            </div>
          </div>

          {/* Search bar & Category filter */}
          <div className="p-3 border-b border-neutral-200/70 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  subTab === 'pages'
                    ? 'Cari nama atau rute URL...'
                    : 'Cari nama komponen...'
                }
                className="w-full h-8 pl-8 pr-7 bg-white border border-neutral-200/90 rounded-lg text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 shadow-2xs"
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

            {/* Category filter pills for Components */}
            {subTab === 'components' && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                {CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap transition-colors ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-neutral-900 text-white font-medium'
                        : 'bg-neutral-200/60 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">Memuat data...</span>
              </div>
            ) : subTab === 'pages' ? (
              filteredPages.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <Compass className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500 font-medium">
                    {searchQuery
                      ? 'Tidak ada halaman yang cocok'
                      : 'Belum ada halaman prototype'}
                  </p>
                  <button
                    onClick={handleOpenAddPage}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-neutral-900 hover:underline font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat halaman pertama</span>
                  </button>
                </div>
              ) : (
                filteredPages.map((page) => {
                  const isSelected = activePage?.id === page.id
                  const statusMeta =
                    STATUS_CONFIG[page.status] || STATUS_CONFIG.DRAFT
                  const openIssues = getOpenIssuesCount(page)

                  return (
                    <div
                      key={page.id}
                      onClick={() => setSelectedPageId(page.id)}
                      className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white border-neutral-900 shadow-xs ring-1 ring-neutral-900/10'
                          : 'bg-white hover:bg-neutral-50 border-neutral-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-neutral-900 truncate">
                              {page.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-neutral-500 truncate bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200/50">
                              {page.path}
                            </span>
                          </div>
                        </div>

                        {/* Actions on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleOpenEditPage(page, e)}
                            className="p-1 hover:bg-neutral-200/70 rounded-md text-neutral-500 hover:text-neutral-900 transition-colors"
                            title="Edit metadata halaman"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePage(page, e)}
                            className="p-1 hover:bg-rose-100 rounded-md text-neutral-400 hover:text-rose-600 transition-colors"
                            title="Hapus halaman"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Status & Open Issues pill row */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${statusMeta.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`}
                          />
                          <span>{statusMeta.label}</span>
                        </span>

                        {openIssues > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>
                              {openIssues} issue{openIssues > 1 ? 's' : ''}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )
            ) : filteredComponents.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Box className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs text-neutral-500 font-medium">
                  {searchQuery
                    ? 'Tidak ada komponen yang cocok'
                    : 'Belum ada komponen desain'}
                </p>
                <button
                  onClick={handleOpenAddComponent}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-neutral-900 hover:underline font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat komponen pertama</span>
                </button>
              </div>
            ) : (
              filteredComponents.map((comp) => {
                const isSelected = activeComponent?.id === comp.id
                const openIssues = getOpenIssuesCount(comp)

                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedComponentId(comp.id)}
                    className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white border-neutral-900 shadow-xs ring-1 ring-neutral-900/10'
                        : 'bg-white hover:bg-neutral-50 border-neutral-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-neutral-900 truncate block">
                          {comp.name}
                        </span>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
                          {comp.category}
                        </span>
                      </div>

                      {/* Actions on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleOpenEditComponent(comp, e)}
                          className="p-1 hover:bg-neutral-200/70 rounded-md text-neutral-500 hover:text-neutral-900 transition-colors"
                          title="Edit komponen"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteComponent(comp, e)}
                          className="p-1 hover:bg-rose-100 rounded-md text-neutral-400 hover:text-rose-600 transition-colors"
                          title="Hapus komponen"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Open Issues Pill */}
                    {openIssues > 0 && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>
                            {openIssues} issue{openIssues > 1 ? 's' : ''}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* ======================================================== */}
        {/* COLUMN 2: CENTER STAGE PREVIEW CANVAS                    */}
        {/* ======================================================== */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-neutral-100/60">
          {/* Stage Top Bar */}
          <div className="px-4 py-2.5 bg-white border-b border-neutral-200/80 flex items-center justify-between gap-3 shrink-0">
            {/* Left: Item Title & Badges */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                    {activeTitle}
                  </h3>
                  {activeSubtitle && (
                    <span className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200/60 truncate">
                      {activeSubtitle}
                    </span>
                  )}
                  {activeStatusMeta && (
                    <span
                      className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium border ${activeStatusMeta.badgeClass}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${activeStatusMeta.dotClass}`}
                      />
                      <span>{activeStatusMeta.label}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Mode Switcher & Feedback Sidebar Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Interaction Mode Pill Switcher */}
              <div className="flex items-center p-0.5 bg-neutral-100 rounded-xl border border-neutral-200/80">
                <button
                  onClick={() => setCanvasMode('browse')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    canvasMode === 'browse'
                      ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900 font-medium'
                  }`}
                  title="Interaksi normal dengan halaman web/komponen"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden md:inline">Browse Mode</span>
                </button>

                <button
                  onClick={() => setCanvasMode('review')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    canvasMode === 'review'
                      ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900 font-medium'
                  }`}
                  title="Mode Review UX: Klik atau drag di kanvas untuk memberi catatan"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Review Mode</span>
                </button>
              </div>

              {/* Toggle Feedback Panel */}
              <button
                onClick={() => setShowRightFeed(!showRightFeed)}
                className={`p-1.5 rounded-xl border text-xs flex items-center gap-1 transition-colors ${
                  showRightFeed
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
                title={showRightFeed ? 'Tutup panel catatan' : 'Buka panel catatan'}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono px-1 rounded-full bg-rose-500 text-white font-semibold">
                  {currentAnnotations.length}
                </span>
              </button>
            </div>
          </div>

          {/* Center Canvas Area */}
          <div className="flex-1 overflow-hidden relative">
            {activeItem ? (
              <PreviewCanvas
                htmlContent={activeItem.htmlContent}
                title={activeTitle}
                annotations={currentAnnotations}
                mode={canvasMode}
                onModeChange={setCanvasMode}
                onAddAnnotation={handleAddAnnotation}
                selectedAnnotationId={selectedAnnotationId}
                onSelectAnnotation={setSelectedAnnotationId}
                isSubmittingAnnotation={isSubmittingAnnotation}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-neutral-200/80 flex items-center justify-center text-neutral-400 mb-4">
                  <Palette className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-neutral-900">
                  {subTab === 'pages'
                    ? 'Belum Ada Halaman Prototype'
                    : 'Belum Ada Komponen UI'}
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-5">
                  Tambahkan berkas HTML prototipe atau komponen desain sistem untuk mulai menguji interaksi dan mengumpulkan catatan review.
                </p>
                <button
                  onClick={() => {
                    if (subTab === 'pages') handleOpenAddPage()
                    else handleOpenAddComponent()
                  }}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {subTab === 'pages'
                      ? 'Buat Halaman Baru'
                      : 'Buat Komponen Baru'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* COLUMN 3: RIGHT FEEDBACK & ANNOTATION FEED               */}
        {/* ======================================================== */}
        {showRightFeed && (
          <aside className="w-full xl:w-88 border-t xl:border-t-0 xl:border-l border-neutral-200/80 flex flex-col shrink-0 overflow-hidden bg-white select-none">
            <AnnotationFeed
              annotations={currentAnnotations}
              selectedAnnotationId={selectedAnnotationId}
              onSelectAnnotation={setSelectedAnnotationId}
              onToggleStatus={handleToggleStatus}
              onConvertToTask={handleConvertToTask}
              onDeleteAnnotation={handleDeleteAnnotation}
              isConvertingId={convertingAnnotationId}
              className="h-full"
              readOnly={false}
            />
          </aside>
        )}
      </div>

      {/* 3. Add/Edit Page Modal */}
      {showPageModal && (
        <AddEditPageModal
          isOpen={showPageModal}
          onClose={() => {
            setShowPageModal(false)
            setEditingPage(null)
          }}
          boardId={boardId}
          page={editingPage}
          onSaved={handlePageSaved}
        />
      )}

      {/* 4. Add/Edit Component Modal */}
      {showComponentModal && (
        <AddEditComponentModal
          isOpen={showComponentModal}
          onClose={() => {
            setShowComponentModal(false)
            setEditingComponent(null)
          }}
          boardId={boardId}
          component={editingComponent}
          onSaved={handleComponentSaved}
        />
      )}
    </div>
  )
}
