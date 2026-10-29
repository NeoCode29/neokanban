'use client'

import React from 'react'
import { Sparkles, Download, Layers, FolderTree, Plus, ShieldCheck, Edit3, Trash2 } from 'lucide-react'
import { getRoleMeta } from '@/lib/member-roles'

export interface SkillItem {
  id: string
  slug: string
  name: string
  description: string
  category: string
  targetRole: string
  isPreset: boolean
  author?: { id: string; name: string } | null
  files: { id: string; filePath: string }[]
  _count?: { boardSkills: number; files: number }
  createdAt?: string
}

interface SkillCardProps {
  skill: SkillItem
  onInspect: (skill: SkillItem) => void
  onAddToBoard: (skill: SkillItem) => void
  onEdit?: (skill: SkillItem) => void
  onDelete?: (skill: SkillItem) => void
}

export default function SkillCard({
  skill,
  onInspect,
  onAddToBoard,
  onEdit,
  onDelete,
}: SkillCardProps) {
  const roleMeta = getRoleMeta(skill.targetRole)
  const fileCount = skill._count?.files ?? skill.files?.length ?? 0
  const boardCount = skill._count?.boardSkills ?? 0

  const handleDownloadZip = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`/api/skills/${skill.slug || skill.id}/export`, '_blank')
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-neutral-200/80 bg-white p-5 transition-all hover:border-neutral-300 hover:shadow-sm">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
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

            {/* Target Role Tag */}
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium border ${roleMeta.color}`}
            >
              {roleMeta.label}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            {!skill.isPreset && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(skill)
                }}
                title="Edit Skill"
                className="text-neutral-400 hover:text-neutral-800 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {!skill.isPreset && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(skill)
                }}
                title="Hapus Skill"
                className="text-neutral-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Quick ZIP Export */}
            <button
              onClick={handleDownloadZip}
              title="Download Skill bundle (.ZIP)"
              className="text-neutral-400 hover:text-neutral-800 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div className="mt-3.5">
          <h3
            onClick={() => onInspect(skill)}
            className="text-sm font-semibold text-neutral-900 group-hover:text-blue-600 cursor-pointer transition-colors"
          >
            {skill.name}
          </h3>
          <p className="mt-1.5 text-xs text-neutral-500 line-clamp-2 leading-relaxed">
            {skill.description || 'No description provided.'}
          </p>
        </div>

        {/* Manifest Preview */}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-neutral-400">
          <div className="flex items-center gap-1">
            <FolderTree className="w-3.5 h-3.5 text-neutral-400" />
            <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
          </div>
          {boardCount > 0 && (
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Used on {boardCount} {boardCount === 1 ? 'board' : 'boards'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-5 pt-3.5 border-t border-neutral-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onInspect(skill)}
          className="text-xs font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          Inspect Files
        </button>

        <button
          onClick={() => onAddToBoard(skill)}
          className="inline-flex items-center gap-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1.5 rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add to Board
        </button>
      </div>
    </div>
  )
}
