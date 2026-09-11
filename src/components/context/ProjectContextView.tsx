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
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              Project Context & Guidelines
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              MCP Active
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Living guidelines served automatically to AI agents via MCP tool <code className="text-neutral-900 font-semibold font-mono">get_board_context</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={handleCopyPrompt}
            className="px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
            <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
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
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-white border-neutral-300 text-neutral-900 shadow-xs'
                  : 'bg-neutral-100/70 border-neutral-200/60 hover:border-neutral-300 text-neutral-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </div>
              <p className="text-[10px] text-neutral-500 line-clamp-1">{tab.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Split Pane Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 text-[11px] text-neutral-500 font-medium">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-neutral-400" />
              Markdown Editor
            </span>
          </div>

          <textarea
            value={context[activeTab]}
            onChange={(e) => setContext({ ...context, [activeTab]: e.target.value })}
            rows={18}
            placeholder="Write markdown documentation here..."
            className="w-full flex-1 bg-neutral-50/70 border border-neutral-200 rounded-xl p-3 text-xs font-mono text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 leading-relaxed resize-none"
          />
        </div>

        {/* Live Preview */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs flex flex-col">
          <div className="pb-2 mb-2 border-b border-neutral-100 text-[11px] text-neutral-500 font-medium">
            Rendered Preview
          </div>

          <div className="flex-1 bg-neutral-50/70 border border-neutral-200 rounded-xl p-4 overflow-y-auto max-h-[440px]">
            <MarkdownViewer content={context[activeTab]} />
          </div>
        </div>
      </div>
    </div>
  )
}
