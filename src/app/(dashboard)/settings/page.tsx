import TokenManager from '@/components/settings/TokenManager'
import { KeyRound, Sparkles } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
          <span>Integrations & Security</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2.5">
          <KeyRound className="w-5 h-5 text-neutral-800" />
          Personal Access Tokens (MCP)
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Configure secure authentication keys for AI assistants like Claude Desktop, Cursor, and Antigravity to interact with your NeoKanban projects.
        </p>
      </div>

      <TokenManager />
    </div>
  )
}
