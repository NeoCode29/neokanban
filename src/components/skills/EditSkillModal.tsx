'use client'

import React, { useState, useEffect } from 'react'
import { X, Edit3, Loader2, AlertCircle } from 'lucide-react'
import { SPECIALIZATION_ROLES } from '@/lib/member-roles'
import { SkillItem } from './SkillCard'

interface EditSkillModalProps {
  skill: SkillItem | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditSkillModal({
  skill,
  isOpen,
  onClose,
  onSuccess,
}: EditSkillModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [targetRole, setTargetRole] = useState('FULLSTACK')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (skill && isOpen) {
      setName(skill.name || '')
      setDescription(skill.description || '')
      setCategory(skill.category || 'General')
      setTargetRole(skill.targetRole || 'FULLSTACK')
      setError(null)
    }
  }, [skill, isOpen])

  if (!isOpen || !skill) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama skill wajib diisi.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
          targetRole,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui skill.')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative flex flex-col w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Edit Skill</h2>
              <p className="text-[11px] text-neutral-500 font-mono">
                {skill.slug}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200/80 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
              Nama Skill *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                Role Spesialisasi
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
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

