'use client'

import React, { useState } from 'react'
import {
  X,
  Upload,
  FileArchive,
  FileCode,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  FolderTree,
} from 'lucide-react'
import JSZip from 'jszip'
import { SPECIALIZATION_ROLES } from '@/lib/member-roles'

interface UploadSkillModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface SkillFileInput {
  filePath: string
  content: string
}

export default function UploadSkillModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadSkillModalProps) {
  const [activeTab, setActiveTab] = useState<'zip' | 'manual'>('zip')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [targetRole, setTargetRole] = useState('FULLSTACK')

  // Files state
  const [files, setFiles] = useState<SkillFileInput[]>([
    {
      filePath: 'SKILL.md',
      content: `---\nname: my-custom-skill\ndescription: Custom skill description\n---\n\n# My Custom Skill\n\n## Instructions\nAdd instructions for AI Agents here.`,
    },
  ])

  // Upload/Processing state
  const [zipFileName, setZipFileName] = useState<string | null>(null)
  const [isProcessingZip, setIsProcessingZip] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  // Reset form
  const handleReset = () => {
    setName('')
    setSlug('')
    setDescription('')
    setCategory('General')
    setTargetRole('FULLSTACK')
    setZipFileName(null)
    setFiles([
      {
        filePath: 'SKILL.md',
        content: `---\nname: my-custom-skill\ndescription: Custom skill description\n---\n\n# My Custom Skill\n\n## Instructions\nAdd instructions for AI Agents here.`,
      },
    ])
    setError(null)
  }

  // Handle ZIP file drop or selection
  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingZip(true)
    setError(null)
    setZipFileName(file.name)

    try {
      const zip = await JSZip.loadAsync(file)
      const extractedFiles: SkillFileInput[] = []

      // Iterate through files in zip
      const entries = Object.keys(zip.files)
      for (const relativePath of entries) {
        const zipEntry = zip.files[relativePath]
        // Skip directory entries and macOS metadata
        if (zipEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.includes('/.')) {
          continue
        }

        const content = await zipEntry.async('string')
        extractedFiles.push({
          filePath: relativePath.replace(/^[/\\]+/, ''),
          content,
        })
      }

      if (extractedFiles.length === 0) {
        throw new Error('ZIP archive is empty or contains no valid text files.')
      }

      setFiles(extractedFiles)

      // Try to parse SKILL.md for defaults
      const skillMd = extractedFiles.find(
        (f) => f.filePath.toLowerCase() === 'skill.md' || f.filePath.toLowerCase().endsWith('/skill.md')
      )

      if (skillMd) {
        const text = skillMd.content
        // Simple frontmatter parsing
        const nameMatch = text.match(/name:\s*([^\n\r]+)/i)
        const descMatch = text.match(/description:\s*([^\n\r]+)/i)
        const catMatch = text.match(/category:\s*([^\n\r]+)/i)
        const roleMatch = text.match(/role:\s*([^\n\r]+)/i)

        if (nameMatch?.[1]) {
          const rawName = nameMatch[1].trim().replace(/^['"]|['"]$/g, '')
          setName(rawName)
          setSlug(rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))
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
          const matchedRole = roleMatch[1].trim().toUpperCase()
          if (SPECIALIZATION_ROLES.some((r) => r.id === matchedRole)) {
            setTargetRole(matchedRole)
          }
        }
      } else {
        const fallback = file.name.replace(/\.zip$/i, '')
        setName(fallback)
        setSlug(fallback.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))
      }
    } catch (err: any) {
      setError(`Failed to read ZIP: ${err.message}`)
    } finally {
      setIsProcessingZip(false)
    }
  }

  // Handle manual file addition
  const handleAddFile = () => {
    setFiles([...files, { filePath: `examples/file-${files.length}.ts`, content: '' }])
  }

  const handleRemoveFile = (index: number) => {
    if (files.length <= 1) {
      setError('A skill must have at least one file.')
      return
    }
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpdateFile = (index: number, key: 'filePath' | 'content', value: string) => {
    const updated = [...files]
    updated[index][key] = value
    setFiles(updated)
  }

  // Submit to POST /api/skills
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Skill name is required.')
      return
    }
    if (files.length === 0) {
      setError('At least one file is required.')
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
        throw new Error(data.error || 'Failed to upload skill.')
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
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-neutral-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Upload Skill to Library</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Publish a custom AI Agent skill bundle (ZIP archive or multi-file editor)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-100 px-6 pt-3 bg-neutral-50/20">
          <button
            type="button"
            onClick={() => setActiveTab('zip')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'zip'
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            Upload ZIP Archive
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Multi-File Editor
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200/80 rounded-xl">
              {error}
            </div>
          )}

          {activeTab === 'zip' && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div className="relative border-2 border-dashed border-neutral-200 hover:border-neutral-400 rounded-2xl p-6 text-center transition-all bg-neutral-50/50">
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
                    {zipFileName ? zipFileName : 'Click or drop .zip skill bundle here'}
                  </span>
                  <span className="text-[11px] text-neutral-400 mt-1">
                    ZIP should contain SKILL.md, examples/, scripts/, or docs
                  </span>
                </div>
              </div>

              {isProcessingZip && (
                <div className="flex items-center justify-center py-2 text-xs text-neutral-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                  Extracting skill files...
                </div>
              )}

              {zipFileName && !isProcessingZip && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Extracted <strong>{files.length}</strong> {files.length === 1 ? 'file' : 'files'} from archive.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Common Metadata Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Skill Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Next.js Best Practices"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))
                }}
                className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Skill Slug
              </label>
              <input
                type="text"
                placeholder="e.g. nextjs-best-practices"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                className="w-full px-3 py-2 text-xs bg-neutral-50 font-mono rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Category
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
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Target Specialization Role
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
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of what this skill enables or checks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Files Editor Section */}
          <div className="pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-neutral-400" />
                Skill Files ({files.length})
              </span>
              <button
                type="button"
                onClick={handleAddFile}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add File
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-neutral-50/70 rounded-xl border border-neutral-200 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="filePath (e.g. SKILL.md, examples/sample.ts)"
                      value={file.filePath}
                      onChange={(e) => handleUpdateFile(idx, 'filePath', e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs font-mono bg-white rounded-lg border border-neutral-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={activeTab === 'zip' ? 2 : 4}
                    placeholder="File content..."
                    value={file.content}
                    onChange={(e) => handleUpdateFile(idx, 'content', e.target.value)}
                    className="w-full p-2 text-xs font-mono bg-white rounded-lg border border-neutral-200 focus:outline-none leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isProcessingZip}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Skill'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
