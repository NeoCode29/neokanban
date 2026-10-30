'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  FileCode,
  Upload,
  Eye,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  Compass,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { UiPageData } from './types'

interface AddEditPageModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  page?: UiPageData | null
  onSaved: (page: UiPageData) => void
}

const STATUS_OPTIONS = [
  {
    value: 'DRAFT',
    label: 'Draft',
    description: 'Konsep awal / Mockup kasar',
    badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-300',
    dotClass: 'bg-neutral-400',
  },
  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
    description: 'Sedang direview & dikembangkan',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  {
    value: 'READY',
    label: 'Ready / Final',
    description: 'Disetujui untuk implementasi kode',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
]

const SAMPLE_PAGE_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 font-sans p-6 text-slate-800">
  <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6 border border-slate-200">
    <div class="flex items-center justify-between pb-4 border-b border-slate-100">
      <h1 class="text-xl font-bold text-slate-900">Billing & Invoices</h1>
      <button class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
        + Buat Tagihan Baru
      </button>
    </div>
    <div class="mt-6 space-y-4">
      <div class="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
        <div>
          <p class="font-semibold text-sm">Invoice #INV-2026-001</p>
          <p class="text-xs text-slate-500">PT Maju Mundur • Rp 15.000.000</p>
        </div>
        <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Lunas</span>
      </div>
    </div>
  </div>
</body>
</html>`

export default function AddEditPageModal({
  isOpen,
  onClose,
  boardId,
  page,
  onSaved,
}: AddEditPageModalProps) {
  const isEditing = Boolean(page)

  const [title, setTitle] = useState('')
  const [path, setPath] = useState('/')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [htmlContent, setHtmlContent] = useState('')

  // Active view tab in HTML editor section: 'code' | 'upload' | 'preview'
  const [activeTab, setActiveTab] = useState<'code' | 'upload' | 'preview'>('code')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate state on open or page change
  useEffect(() => {
    if (!isOpen) return

    if (page) {
      setTitle(page.title || '')
      setPath(page.path || '/')
      setDescription(page.description || '')
      setStatus(page.status || 'DRAFT')
      setHtmlContent(page.htmlContent || '')
    } else {
      setTitle('')
      setPath('/')
      setDescription('')
      setStatus('DRAFT')
      setHtmlContent(SAMPLE_PAGE_HTML)
    }
    setUploadedFileName(null)
    setError(null)
    setActiveTab('code')
  }, [isOpen, page])

  if (!isOpen) return null

  // File upload reader
  const handleFile = (file: File) => {
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm') && file.type !== 'text/html') {
      setError('Hanya file berformat .html yang didukung')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === 'string') {
        setHtmlContent(text)
        setUploadedFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
        setActiveTab('preview')
        setError(null)
      }
    }
    reader.onerror = () => {
      setError('Gagal membaca file HTML')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Judul Halaman wajib diisi')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        title: title.trim(),
        path: path.trim() || '/',
        description: description.trim() || undefined,
        status,
        htmlContent,
      }

      const url = isEditing
        ? `/api/boards/${boardId}/ui-pages/${page!.id}`
        : `/api/boards/${boardId}/ui-pages`
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menyimpan halaman prototype')
      }

      const data = await res.json()
      onSaved(data.page)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-neutral-900">
                {isEditing ? 'Edit Halaman Prototype' : 'Tambah Halaman Prototype'}
              </h3>
              <p className="text-xs text-neutral-500">
                Mockup halaman web interaktif untuk peninjauan desain dan alur UX.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Route Path */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Judul Halaman <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="misal: Billing & Invoicing View"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-neutral-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Rute Path (URL)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">
                  /
                </span>
                <input
                  type="text"
                  placeholder="billing/invoices"
                  value={path.startsWith('/') ? path.substring(1) : path}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/^\/+/, '')
                    setPath(`/${clean}`)
                  }}
                  className="w-full text-xs pl-7 pr-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-neutral-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Deskripsi Alur UX & Catatan Desain
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan tujuan halaman, user journey yang diuji, atau pedoman interaksi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-neutral-900 resize-none"
            />
          </div>

          {/* Status Kesiapan */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Status Kesiapan Prototype
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    status === opt.value
                      ? `${opt.badgeClass} ring-2 ring-neutral-400/30 shadow-xs font-semibold`
                      : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${opt.dotClass}`} />
                  <div>
                    <div className="text-xs font-bold text-neutral-900">{opt.label}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* HTML Content Editor & Uploader */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-700">
                Konten HTML Mockup <span className="text-rose-500">*</span>
              </label>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'code'
                      ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Editor Kode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'upload'
                      ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .html</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-white text-blue-600 shadow-xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Cepat</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Code Editor */}
            {activeTab === 'code' && (
              <div className="relative rounded-xl border border-neutral-300 overflow-hidden bg-neutral-950 font-mono text-xs">
                <div className="px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 select-none">
                  <span>HTML / Tailwind / CSS / JS</span>
                  <span>{htmlContent.length} karakter</span>
                </div>
                <textarea
                  rows={10}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Tulis kode HTML lengkap atau komponen di sini..."
                  className="w-full p-3.5 text-neutral-200 bg-transparent focus:outline-none resize-y leading-relaxed font-mono text-[11px]"
                />
              </div>
            )}

            {/* Tab 2: Upload Dropzone */}
            {activeTab === 'upload' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".html,.htm"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0])
                    }
                  }}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-800 mb-1">
                  Tarik dan Lepas file .html di sini
                </h4>
                <p className="text-xs text-neutral-500 mb-3">
                  Atau klik untuk memilih file dari komputer Anda
                </p>
                {uploadedFileName && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terunggah: {uploadedFileName}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Quick Preview */}
            {activeTab === 'preview' && (
              <div className="rounded-xl border border-neutral-300 overflow-hidden bg-neutral-100 flex flex-col h-64">
                <div className="px-3 py-1 bg-neutral-200 text-neutral-600 text-[11px] font-medium flex items-center justify-between">
                  <span>Pratinjau Sandbox</span>
                  <span className="text-[10px] text-neutral-500">allow-scripts allow-forms</span>
                </div>
                <iframe
                  sandbox="allow-scripts allow-forms"
                  srcDoc={htmlContent || '<p style="padding:20px;text-align:center;">Konten kosong</p>'}
                  className="w-full flex-1 border-0 bg-white"
                  title="Quick Page Preview"
                />
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading || !title.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Halaman'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
