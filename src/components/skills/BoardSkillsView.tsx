'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Plus,
  Trash2,
  Download,
  FolderTree,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { getRoleMeta } from '@/lib/member-roles'
import SkillDetailModal from './SkillDetailModal'
import { SkillItem } from './SkillCard'

interface BoardSkillsViewProps {
  boardId: string
  boardTitle: string
}

export default function BoardSkillsView({ boardId, boardTitle }: BoardSkillsViewProps) {
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inspectSkill, setInspectSkill] = useState<SkillItem | null>(null)
  const [detachingId, setDetachingId] = useState<string | null>(null)

  // Attach modal state
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [allSkills, setAllSkills] = useState<SkillItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [attachingId, setAttachingId] = useState<string | null>(null)

  const fetchBoardSkills = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/boards/${boardId}/skills`)
      if (res.ok) {
        const data = await res.json()
        setSkills(data.skills || [])
      }
    } catch (err) {
      console.error('Failed to fetch board skills:', err)
    } finally {
      setLoading(false)
    }
  }, [boardId])

  useEffect(() => {
    fetchBoardSkills()
  }, [fetchBoardSkills])

  // Fetch full library when opening quick attach dialog
  const handleOpenCatalogModal = async () => {
    setShowCatalogModal(true)
    setLoadingCatalog(true)
    try {
      const res = await fetch('/api/skills')
      if (res.ok) {
        const data = await res.json()
        setAllSkills(data.skills || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingCatalog(false)
    }
  }

  const handleAttachSkill = async (skill: SkillItem) => {
    setAttachingId(skill.id)
    try {
      const res = await fetch(`/api/boards/${boardId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: skill.id, skillSlug: skill.slug }),
      })
      if (res.ok) {
        await fetchBoardSkills()
        setShowCatalogModal(false)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to attach skill')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setAttachingId(null)
    }
  }

  const handleDetach = async (skill: SkillItem) => {
    if (!confirm(`Lepaskan skill "${skill.name}" dari board ini?`)) return

    setDetachingId(skill.id)
    try {
      const res = await fetch(`/api/boards/${boardId}/skills/${skill.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== skill.id))
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to detach skill')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setDetachingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Hero */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900">
                Equipped AI Agent Skills
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                MCP Synced
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
              Paket skill, panduan TDD, standar review, dan aturan keamanan yang dipasang pada board &ldquo;{boardTitle}&rdquo;. AI Agent membaca instruksi ini secara otomatis sebelum mengerjakan tugas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <Link
            href="/skills"
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <span>Skill Library</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
          </Link>

          <button
            onClick={handleOpenCatalogModal}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Equip Skill</span>
          </button>
        </div>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-neutral-200/60 bg-white p-5 animate-pulse flex flex-col justify-between"
            >
              <div>
                <div className="h-5 w-24 bg-neutral-200 rounded-md mb-3" />
                <div className="h-4 w-3/4 bg-neutral-200 rounded-md mb-2" />
                <div className="h-3 w-1/2 bg-neutral-100 rounded-md" />
              </div>
              <div className="h-7 w-full bg-neutral-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-3 border border-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">Belum ada skill yang terpasang</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
            Pasang skill terkurasi seperti <strong>TDD Workflow</strong>, <strong>Code Review Gate</strong>, atau <strong>Security Audit</strong> agar AI Agent menjalankan protokol engineering tim Anda.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={handleOpenCatalogModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Equip Skill dari Library
            </button>
            <Link
              href="/skills"
              className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors inline-flex items-center gap-1"
            >
              Jelajahi Library
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {skills.map((skill) => {
            const roleMeta = getRoleMeta(skill.targetRole)
            const fileCount = skill.files?.length || 0

            return (
              <div
                key={skill.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-5 transition-all hover:border-neutral-300 hover:shadow-sm"
              >
                <div>
                  {/* Badges Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {skill.isPreset ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200/60">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Preset
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 border border-neutral-200">
                          <Layers className="w-3 h-3 text-neutral-400" />
                          Custom
                        </span>
                      )}

                      <span className="rounded-md bg-blue-50/80 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200/40">
                        {skill.category || 'General'}
                      </span>

                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium border ${roleMeta.color}`}>
                        {roleMeta.label}
                      </span>
                    </div>

                    <button
                      onClick={() => window.open(`/api/skills/${skill.slug || skill.id}/export`, '_blank')}
                      title="Download ZIP"
                      className="text-neutral-400 hover:text-neutral-800 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3.5">
                    <h3
                      onClick={() => setInspectSkill(skill)}
                      className="text-sm font-semibold text-neutral-900 group-hover:text-blue-600 cursor-pointer transition-colors"
                    >
                      {skill.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                      {skill.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Manifest info */}
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-neutral-400">
                    <div className="flex items-center gap-1">
                      <FolderTree className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Active on this board</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setInspectSkill(skill)}
                    className="text-xs font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    Inspect Files
                  </button>

                  <button
                    onClick={() => handleDetach(skill)}
                    disabled={detachingId === skill.id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    title="Lepaskan skill dari board ini"
                  >
                    {detachingId === skill.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Detach</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Equip Modal (Catalog Selector) */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative flex flex-col w-full max-w-xl max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-neutral-200/80 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Equip Skill to {boardTitle}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Pilih skill dari library untuk dipasang ke board ini
                </p>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingCatalog ? (
                <div className="py-12 flex items-center justify-center text-xs text-neutral-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading library...
                </div>
              ) : allSkills.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-400">
                  Tidak ada skill di library.
                </div>
              ) : (
                allSkills.map((sk) => {
                  const isInstalled = skills.some((s) => s.id === sk.id || s.slug === sk.slug)
                  const meta = getRoleMeta(sk.targetRole)

                  return (
                    <div
                      key={sk.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200/80 hover:border-neutral-300 transition-all bg-white"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-900 truncate">
                            {sk.name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                          {sk.description || 'No description'}
                        </p>
                      </div>

                      {isInstalled ? (
                        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 shrink-0">
                          Installed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAttachSkill(sk)}
                          disabled={attachingId === sk.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0 shadow-xs disabled:opacity-50"
                        >
                          {attachingId === sk.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Equip
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex justify-end">
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Skill Modal */}
      <SkillDetailModal
        skill={inspectSkill}
        isOpen={!!inspectSkill}
        onClose={() => setInspectSkill(null)}
        onAddToBoard={() => setInspectSkill(null)}
      />
    </div>
  )
}

