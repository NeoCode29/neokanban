'use client'

import React, { useState, useEffect } from 'react'
import { X, FileText, Code2, Download, Copy, Check, Sparkles, FolderTree, Edit3, Trash2 } from 'lucide-react'
import MarkdownViewer from '@/components/ui/MarkdownViewer'
import { getRoleMeta } from '@/lib/member-roles'
import { SkillItem } from './SkillCard'

interface SkillFileDetail {
  id?: string
  filePath: string
  content: string
}

interface SkillDetailModalProps {
  skill: SkillItem | null
  isOpen: boolean
  onClose: () => void
  onAddToBoard: (skill: SkillItem) => void
  onEdit?: (skill: SkillItem) => void
  onDelete?: (skill: SkillItem) => void
}

export default function SkillDetailModal({
  skill,
  isOpen,
  onClose,
  onAddToBoard,
  onEdit,
  onDelete,
}: SkillDetailModalProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [files, setFiles] = useState<SkillFileDetail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen || !skill) return

    setIsLoading(true)
    fetch(`/api/skills/${skill.slug || skill.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.skill?.files) {
          setFiles(data.skill.files)
          setActiveFileIndex(0)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [isOpen, skill])

  if (!isOpen || !skill) return null

  const activeFile = files[activeFileIndex]
  const isMarkdown = activeFile?.filePath.toLowerCase().endsWith('.md')
  const roleMeta = getRoleMeta(skill.targetRole)

  const handleCopy = () => {
    if (!activeFile) return
    navigator.clipboard.writeText(activeFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadZip = () => {
    window.open(`/api/skills/${skill.slug || skill.id}/export`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative flex flex-col w-full max-w-4xl h-[85vh] max-h-[850px] bg-white rounded-2xl shadow-2xl border border-neutral-200/80 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-neutral-900">{skill.name}</h2>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${roleMeta.color}`}>
                  {roleMeta.label}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200">
                  {skill.category}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 max-w-xl truncate">
                {skill.description || 'Skill bundle for AI Agents & team collaboration'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!skill.isPreset && onEdit && (
              <button
                onClick={() => {
                  onEdit(skill)
                  onClose()
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {!skill.isPreset && onDelete && (
              <button
                onClick={() => {
                  onDelete(skill)
                  onClose()
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            )}
            <button
              onClick={handleDownloadZip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download ZIP
            </button>
            <button
              onClick={() => onAddToBoard(skill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs"
            >
              Add to Board
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
            Loading skill manifest and files...
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 divide-x divide-neutral-100">
            {/* Sidebar File Tree */}
            <div className="w-64 bg-neutral-50/70 p-3 overflow-y-auto flex flex-col gap-1 shrink-0">
              <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5" />
                Files ({files.length})
              </div>
              {files.map((file, idx) => {
                const isActive = idx === activeFileIndex
                const isMd = file.filePath.toLowerCase().endsWith('.md')
                return (
                  <button
                    key={file.filePath || idx}
                    onClick={() => setActiveFileIndex(idx)}
                    className={`flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-left transition-colors font-mono ${
                      isActive
                        ? 'bg-white text-neutral-900 font-semibold shadow-xs border border-neutral-200/80'
                        : 'text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900'
                    }`}
                  >
                    {isMd ? (
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-500' : 'text-neutral-400'}`} />
                    ) : (
                      <Code2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-500' : 'text-neutral-400'}`} />
                    )}
                    <span className="truncate">{file.filePath}</span>
                  </button>
                )
              })}
            </div>

            {/* Main File Viewer Pane */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              {activeFile ? (
                <>
                  {/* File Header Bar */}
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-neutral-100 bg-white text-xs font-mono text-neutral-500">
                    <span className="font-semibold text-neutral-700">{activeFile.filePath}</span>
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-sans font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Content
                        </>
                      )}
                    </button>
                  </div>

                  {/* File Content Body */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {isMarkdown ? (
                      <div className="prose prose-sm max-w-none prose-neutral">
                        <MarkdownViewer content={activeFile.content} />
                      </div>
                    ) : (
                      <pre className="p-4 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-xs overflow-x-auto leading-relaxed selection:bg-neutral-700">
                        <code>{activeFile.content}</code>
                      </pre>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
                  Select a file from the sidebar to inspect
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
