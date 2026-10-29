'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Sparkles, Search, Plus, Filter, RefreshCw } from 'lucide-react'
import SkillCard, { SkillItem } from '@/components/skills/SkillCard'
import SkillDetailModal from '@/components/skills/SkillDetailModal'
import AddToBoardModal from '@/components/skills/AddToBoardModal'
import UploadSkillModal from '@/components/skills/UploadSkillModal'
import EditSkillModal from '@/components/skills/EditSkillModal'
import { SPECIALIZATION_ROLES } from '@/lib/member-roles'

const CATEGORIES = ['All', 'Testing', 'Frontend', 'Backend', 'Security', 'General']

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedRole, setSelectedRole] = useState('All')

  // Modals state
  const [inspectSkill, setInspectSkill] = useState<SkillItem | null>(null)
  const [boardTargetSkill, setBoardTargetSkill] = useState<SkillItem | null>(null)
  const [editTargetSkill, setEditTargetSkill] = useState<SkillItem | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const handleDeleteSkill = async (skill: SkillItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus skill "${skill.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return
    }

    try {
      const res = await fetch(`/api/skills/${skill.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Gagal menghapus skill.')
        return
      }
      fetchSkills()
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`)
    }
  }

  const fetchSkills = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'All') params.append('category', selectedCategory)
      if (selectedRole !== 'All') params.append('role', selectedRole)
      if (search.trim()) params.append('search', search.trim())

      const res = await fetch(`/api/skills?${params.toString()}`)
      const data = await res.json()
      if (res.ok && data?.skills) {
        setSkills(data.skills)
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, selectedRole, search])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  return (
    <div className="min-h-screen bg-[#fafafc] pb-24">
      {/* Top Header Hero */}
      <div className="border-b border-neutral-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                  AI Agent Skill Library
                </h1>
              </div>
              <p className="mt-1.5 text-xs text-neutral-500 max-w-2xl">
                Jelajahi, inspeksi, dan pasang paket skill terkurasi ke papan proyek NeoKanban atau unduh ke komputer lokal via MCP.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSkills()}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200"
                title="Refresh library"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Upload Skill
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-6 border-t border-neutral-100">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search skills by name, description, or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/80 focus:bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all placeholder:text-neutral-400"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-neutral-100/80 p-1 rounded-xl border border-neutral-200/80 overflow-x-auto">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      selectedCategory === cat
                        ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Role Dropdown */}
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="pl-3 pr-8 py-2 text-xs font-medium bg-neutral-50 hover:bg-neutral-100/80 rounded-xl border border-neutral-200 focus:outline-none text-neutral-700 cursor-pointer transition-colors"
                >
                  <option value="All">All Specializations</option>
                  {SPECIALIZATION_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 rounded-xl border border-neutral-200/60 bg-white p-5 animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="h-5 w-24 bg-neutral-200 rounded-md mb-4" />
                  <div className="h-4 w-3/4 bg-neutral-200 rounded-md mb-2" />
                  <div className="h-3 w-full bg-neutral-100 rounded-md mb-1" />
                  <div className="h-3 w-2/3 bg-neutral-100 rounded-md" />
                </div>
                <div className="h-8 w-full bg-neutral-100 rounded-lg" />
              </div>
            ))}
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-3 border border-amber-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">No skills found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              {search || selectedCategory !== 'All' || selectedRole !== 'All'
                ? 'Tidak ada skill yang cocok dengan kriteria filter Anda. Coba reset filter.'
                : 'Belum ada skill yang tersedia di library. Unggah skill kustom pertama Anda!'}
            </p>
            {(search || selectedCategory !== 'All' || selectedRole !== 'All') && (
              <button
                onClick={() => {
                  setSearch('')
                  setSelectedCategory('All')
                  setSelectedRole('All')
                }}
                className="mt-4 px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onInspect={(s) => setInspectSkill(s)}
                onAddToBoard={(s) => setBoardTargetSkill(s)}
                onEdit={(s) => setEditTargetSkill(s)}
                onDelete={(s) => handleDeleteSkill(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <SkillDetailModal
        skill={inspectSkill}
        isOpen={!!inspectSkill}
        onClose={() => setInspectSkill(null)}
        onAddToBoard={(s) => {
          setInspectSkill(null)
          setBoardTargetSkill(s)
        }}
        onEdit={(s) => setEditTargetSkill(s)}
        onDelete={(s) => handleDeleteSkill(s)}
      />

      <AddToBoardModal
        skill={boardTargetSkill}
        isOpen={!!boardTargetSkill}
        onClose={() => setBoardTargetSkill(null)}
        onSuccess={() => fetchSkills()}
      />

      <EditSkillModal
        skill={editTargetSkill}
        isOpen={!!editTargetSkill}
        onClose={() => setEditTargetSkill(null)}
        onSuccess={() => fetchSkills()}
      />

      <UploadSkillModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false)
          fetchSkills()
        }}
      />
    </div>
  )
}

