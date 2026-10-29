'use client'

import React, { useState } from 'react'
import {
  X,
  Upload,
  FileArchive,
  FileText,
  Code2,
  Loader2,
  CheckCircle2,
  FolderTree,
  AlertCircle,
} from 'lucide-react'
import JSZip from 'jszip'
import { SPECIALIZATION_ROLES } from '@/lib/member-roles'

interface UploadSkillModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ExtractedFile {
  filePath: string
  content: string
}

export default function UploadSkillModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadSkillModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [targetRole, setTargetRole] = useState('FULLSTACK')

  // In-memory extracted files (not rendered in heavy textareas)
  const [files, setFiles] = useState<ExtractedFile[]>([])
  const [zipFileName, setZipFileName] = useState<string | null>(null)
  const [isProcessingZip, setIsProcessingZip] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleReset = () => {
    setName('')
    setSlug('')
    setDescription('')
    setCategory('General')
    setTargetRole('FULLSTACK')
    setZipFileName(null)
    setFiles([])
    setError(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  // Handle ZIP file selection or drop
  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingZip(true)
    setError(null)
    setZipFileName(file.name)

    try {
      const zip = await JSZip.loadAsync(file)
      const extracted: ExtractedFile[] = []

      const entries = Object.keys(zip.files)
      for (const relativePath of entries) {
        const entry = zip.files[relativePath]
        // Skip directory nodes and hidden/macOS meta files
        if (entry.dir || relativePath.startsWith('__MACOSX') || relativePath.includes('/.')) {
          continue
        }

        const content = await entry.async('string')
        extracted.push({
          filePath: relativePath.replace(/^[/\\]+/, ''),
          content,
        })
      }

      if (extracted.length === 0) {
        throw new Error('File ZIP kosong atau tidak berisi file teks yang valid.')
      }

      setFiles(extracted)

      // Try to parse SKILL.md frontmatter for auto-population
      const skillMd = extracted.find(
        (f) => f.filePath.toLowerCase() === 'skill.md' || f.filePath.toLowerCase().endsWith('/skill.md')
      )

      if (skillMd) {
        const text = skillMd.content
        const nameMatch = text.match(/name:\s*([^\n\r]+)/i)
        const descMatch = text.match(/description:\s*([^\n\r]+)/i)
        const catMatch = text.match(/category:\s*([^\n\r]+)/i)
        const roleMatch = text.match(/role:\s*([^\n\r]+)/i)

        if (nameMatch?.[1]) {
          const raw = nameMatch[1].trim().replace(/^['"]|['"]$/g, '')
          setName(raw)
          setSlug(raw.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))
        } else {
          const fallback = file.name.replace(/\.zip$/i, '')
          setName(fallback)
          setSlug(fallback.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))
        }

        if (descMatch?.[1]) {
          setDescription(descMatch[1].trim().replace(/^['"]|['"]$/g, ''))
        }
        if (catMatch?.[1]) {
          setCategory(catMatch[1].trim().replace(/^['"]|['"]$/g, ''))
        }
        if (roleMatch?.[1]) {
          const matched = roleMatch[1].trim().toUpperCase()
          if (SPECIALIZATION_ROLES.some((r) => r.id === matched)) {
            setTargetRole(matched)
          }
        }
      } else {
        const fallback = file.name.replace(/\.zip$/i, '')
        setName(fallback)
        setSlug(fallback.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))
      }
    } catch (err: any) {
      setError(`Gagal membaca ZIP: ${err.message}`)
      setFiles([])
    } finally {
      setIsProcessingZip(false)
    }
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      setError('Silakan pilih file archive .zip yang valid terlebih dahulu.')
      return
    }
    if (!name.trim()) {
      setError('Nama skill wajib diisi.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim(),
          category: category.trim(),
          targetRole,
          files,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan skill.')
      }

      handleReset()
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative flex flex-col w-full max-w-xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-neutral-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <FileArchive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Upload Skill Archive (.zip)</h2>
              <p className="text-[11px] text-neutral-500">
                Unggah paket skill ZIP yang berisi SKILL.md dan file pendukung
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200/80 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Simple Clean ZIP Dropzone */}
          <div className="relative border-2 border-dashed border-neutral-200 hover:border-neutral-400 rounded-2xl p-6 text-center transition-all bg-neutral-50/60 hover:bg-neutral-50 cursor-pointer">
            <input
              type="file"
              accept=".zip"
              onChange={handleZipFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-neutral-800">
                {zipFileName ? zipFileName : 'Pilih atau seret file .zip skill Anda ke sini'}
              </span>
              <span className="text-[11px] text-neutral-400 mt-0.5">
                Mendukung bundle SKILL.md, examples/, scripts/, dll.
              </span>
            </div>
          </div>

          {isProcessingZip && (
            <div className="flex items-center justify-center py-2 text-xs text-neutral-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
              Mengekstrak berkas ZIP...
            </div>
          )}

          {/* Extracted Files Summary (Lightweight Pills, No Textareas!) */}
          {files.length > 0 && !isProcessingZip && (
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-neutral-500" />
                  Berkas Terdeteksi ({files.length})
                </span>
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Siap diunggah
                </span>
              </div>

              {/* Fast Compact Path Badges */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {files.map((f, i) => {
                  const isMd = f.filePath.toLowerCase().endsWith('.md')
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-[11px] font-mono text-neutral-700 shadow-2xs"
                    >
                      {isMd ? (
                        <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                      ) : (
                        <Code2 className="w-3 h-3 text-blue-500 shrink-0" />
                      )}
                      <span className="truncate max-w-[200px]">{f.filePath}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Metadata Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Nama Skill *
              </label>
              <input
                type="text"
                placeholder="Contoh: Next.js Best Practices"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))
                }}
                className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                placeholder="contoh: nextjs-best-practices"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                className="w-full px-3 py-2 text-xs bg-neutral-50 font-mono rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="General">General</option>
                <option value="Testing">Testing</option>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Security">Security</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Role Spesialisasi Target
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none cursor-pointer"
              >
                {SPECIALIZATION_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
              Deskripsi
            </label>
            <textarea
              rows={2}
              placeholder="Deskripsi singkat fungsi dan tujuan skill ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isProcessingZip || files.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Mengunggah...
                </>
              ) : (
                'Upload Skill'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
