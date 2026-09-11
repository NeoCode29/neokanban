'use client'

import { useState } from 'react'
import {
  BookOpen,
  Cpu,
  GitBranch,
  MessageSquareCode,
  Save,
  Copy,
  Check,
  Loader2,
  FileCode,
} from 'lucide-react'
import MarkdownViewer from '../ui/MarkdownViewer'

export interface ProjectContextData {
  id: string
  boardId: string
  guidelinesMarkdown: string
  techStackMarkdown: string
  conventionsMarkdown: string
  messagingStandards: string
  updatedAt: string
}

interface ProjectContextViewProps {
  boardTitle: string
  initialContext: ProjectContextData | null
  boardId: string
}

type SectionKey =
  | 'guidelinesMarkdown'
  | 'techStackMarkdown'
  | 'conventionsMarkdown'
  | 'messagingStandards'

export default function ProjectContextView({
  boardTitle,
  initialContext,
  boardId,
}: ProjectContextViewProps) {
  const [activeTab, setActiveTab] = useState<SectionKey>('guidelinesMarkdown')
  const [context, setContext] = useState<ProjectContextData>(
    initialContext || {
      id: '',
      boardId,
      guidelinesMarkdown: '',
      techStackMarkdown: '',
      conventionsMarkdown: '',
      messagingStandards: '',
      updatedAt: new Date().toISOString(),
    }
  )

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  const tabs: { key: SectionKey; label: string; icon: any; desc: string }[] = [
    {
      key: 'guidelinesMarkdown',
      label: 'Core Guidelines',
      icon: BookOpen,
      desc: 'Coding rules & architecture',
    },
    {
      key: 'techStackMarkdown',
      label: 'Tech Stack',
      icon: Cpu,
      desc: 'Packages & tech specs',
    },
    {
      key: 'conventionsMarkdown',
      label: 'Conventions',
      icon: GitBranch,
      desc: 'Git commits & DoD',
    },
    {
      key: 'messagingStandards',
      label: 'Message Standards',
      icon: MessageSquareCode,
      desc: 'Task & comment templates',
    },
  ]

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)

    try {
      const res = await fetch(`/api/boards/${boardId}/context`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guidelinesMarkdown: context.guidelinesMarkdown,
          techStackMarkdown: context.techStackMarkdown,
          conventionsMarkdown: context.conventionsMarkdown,
          messagingStandards: context.messagingStandards,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setContext(data.context)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2500)
      }
    } catch (err) {
      console.error('Failed to save project context:', err)
    } finally {
      setSaving(false)
    }
  }

  const generateFullContextPrompt = () => {
    return `# PROJECT CONTEXT: ${boardTitle}

## 1. Core Guidelines & Standards
${context.guidelinesMarkdown}

## 2. Tech Stack Specifications
${context.techStackMarkdown}

## 3. Team & Git Conventions
${context.conventionsMarkdown}

## 4. Communication & Messaging Standards
${context.messagingStandards}
`
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generateFullContextPrompt())
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Project Context & Guidelines
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
              MCP Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Living guidelines served automatically to AI agents via MCP tool <code className="text-blue-400 font-mono">get_board_context</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={handleCopyPrompt}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saveSuccess ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isActive
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">{tab.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Split Pane Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Editor */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              Markdown Editor
            </span>
          </div>

          <textarea
            value={context[activeTab]}
            onChange={(e) => setContext({ ...context, [activeTab]: e.target.value })}
            rows={18}
            placeholder="Write markdown documentation here..."
            className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
          />
        </div>

        {/* Live Preview */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col">
          <div className="pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
            Rendered Preview
          </div>

          <div className="flex-1 bg-slate-950/60 border border-slate-800 rounded-lg p-3 overflow-y-auto max-h-[440px]">
            <MarkdownViewer content={context[activeTab]} />
          </div>
        </div>
      </div>
    </div>
  )
}
