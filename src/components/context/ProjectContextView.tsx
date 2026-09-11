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
  Sparkles,
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
      desc: 'Coding rules, architectural integrity, and standards',
    },
    {
      key: 'techStackMarkdown',
      label: 'Tech Stack',
      icon: Cpu,
      desc: 'Frameworks, packages, and infrastructure specs',
    },
    {
      key: 'conventionsMarkdown',
      label: 'Conventions',
      icon: GitBranch,
      desc: 'Branching, PR format, and Definition of Done',
    },
    {
      key: 'messagingStandards',
      label: 'Message Standards',
      icon: MessageSquareCode,
      desc: 'Structured templates for tasks and status logs',
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
        setTimeout(() => setSaveSuccess(false), 3000)
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

## 4. Communication & Message Standards
${context.messagingStandards}
`
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generateFullContextPrompt())
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with AI Synchronization Status */}
      <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900 border border-blue-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Living Project Context Hub</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active in MCP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              These guidelines are served directly to AI agents (Claude Desktop, Cursor, Antigravity) via the MCP tool <code className="text-blue-300 font-mono">get_board_context</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={handleCopyPrompt}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
            title="Copy as System Prompt for external chatbots"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPrompt ? 'Copied Full Prompt' : 'Copy for AI Prompt'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saveSuccess ? 'Saved!' : 'Save Context'}</span>
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-blue-950/30 border-blue-500/40 shadow-md shadow-blue-500/5'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {tab.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{tab.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Split Pane Editor & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor Pane */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              Markdown Source Editor
            </span>
            <span className="text-[11px] text-slate-500">Live preview on the right</span>
          </div>

          <textarea
            value={context[activeTab]}
            onChange={(e) => setContext({ ...context, [activeTab]: e.target.value })}
            rows={18}
            placeholder="Write markdown documentation, rules, and specifications here..."
            className="w-full flex-1 bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none"
          />
        </div>

        {/* Live Preview Pane */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Live Rendered Documentation
            </span>
            <span className="text-[11px] text-slate-500">How team and AI read it</span>
          </div>

          <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 overflow-y-auto max-h-[460px]">
            <MarkdownViewer content={context[activeTab]} />
          </div>
        </div>
      </div>
    </div>
  )
}
