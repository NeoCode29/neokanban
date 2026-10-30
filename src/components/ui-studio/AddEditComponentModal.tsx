'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Component as ComponentIcon,
  Upload,
  Eye,
  Check,
  Loader2,
  AlertCircle,
  FileCode,
  CheckCircle2,
  Tag,
} from 'lucide-react'
import { UiComponentData } from './types'

interface AddEditComponentModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  component?: UiComponentData | null
  onSaved: (component: UiComponentData) => void
}

const CATEGORY_PRESETS = [
  'Input',
  'Navigation',
  'Feedback',
  'Card',
  'Data Display',
  'Layout',
  'General',
]

const SAMPLE_COMPONENT_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-8 flex items-center justify-center min-h-screen bg-slate-100">
  <!-- Primary Button Component Mockup -->
  <button class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/20 transition-all focus:outline-none focus:ring-4 focus:ring-blue-300">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
    </svg>
    <span>Simpan Tindakan</span>
  </button>
</body>
</html>`

export default function AddEditComponentModal({
  isOpen,
  onClose,
  boardId,
  component,
  onSaved,
}: AddEditComponentModalProps) {
  const isEditing = Boolean(component)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('Input')
  const [description, setDescription] = useState('')
  const [htmlContent, setHtmlContent] = useState('')

  // HTML tabs: 'code' | 'upload' | 'preview'
  const [activeTab, setActiveTab] = useState<'code' | 'upload' | 'preview'>('code')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return

    if (component) {
      setName(component.name || '')
      setCategory(component.category || 'General')
      setDescription(component.description || '')
      setHtmlContent(component.htmlContent || '')
    } else {
      setName('')
      setCategory('Input')
      setDescription('')
      setHtmlContent(SAMPLE_COMPONENT_HTML)
    }
    setUploadedFileName(null)
    setError(null)
    setActiveTab('code')
  }, [isOpen, component])

  if (!isOpen) return null

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
    if (!name.trim()) {
      setError('Nama Komponen wajib diisi')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        name: name.trim(),
        category: category.trim() || 'General',
        description: description.trim() || undefined,
        htmlContent,
      }

      const url = isEditing
        ? `/api/boards/${boardId}/ui-components/${component!.id}`
        : `/api/boards/${boardId}/ui-components`
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menyimpan komponen UI')
      }

      const data = await res.json()
      onSaved(data.component)
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
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <ComponentIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-neutral-900">
                {isEditing ? 'Edit Komponen UI' : 'Tambah Komponen UI'}
              </h3>
              <p className="text-xs text-neutral-500">
                Katalog komponen desain sistem untuk reuse dan standardisasi UX.
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

          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Nama Komponen <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="misal: PrimaryButton, HeroBanner, SearchInput"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all text-neutral-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Kategori Komponen
              </label>
              <input
                type="text"
                placeholder="Pilih preset di bawah atau ketik..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all text-neutral-900"
              />
              {/* Preset pills */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                      category === cat
                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description / UX Guidelines */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Deskripsi Komponen & Pedoman UX
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan kegunaan komponen, state (hover, active, disabled), ukuran, atau catatan aksesibilitas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all text-neutral-900 resize-none"
            />
          </div>

          {/* HTML Content Editor & Uploader */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-700">
                Markup HTML & Style Komponen <span className="text-rose-500">*</span>
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
                      ? 'bg-white text-purple-600 shadow-xs font-semibold'
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
                  <span>HTML Snippet / Tailwind</span>
                  <span>{htmlContent.length} karakter</span>
                </div>
                <textarea
                  rows={9}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Tulis kode HTML komponen di sini..."
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
                    ? 'border-purple-500 bg-purple-50'
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
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-800 mb-1">
                  Tarik dan Lepas file snippet .html di sini
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
              <div className="rounded-xl border border-neutral-300 overflow-hidden bg-neutral-100 flex flex-col h-56">
                <div className="px-3 py-1 bg-neutral-200 text-neutral-600 text-[11px] font-medium flex items-center justify-between">
                  <span>Pratinjau Sandbox</span>
                  <span className="text-[10px] text-neutral-500">allow-scripts allow-forms</span>
                </div>
                <iframe
                  sandbox="allow-scripts allow-forms"
                  srcDoc={htmlContent || '<p style="padding:20px;text-align:center;">Konten kosong</p>'}
                  className="w-full flex-1 border-0 bg-white"
                  title="Quick Component Preview"
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
            disabled={loading || !name.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Komponen'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
