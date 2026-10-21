import TokenManager from '@/components/settings/TokenManager'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Personal Access Tokens (MCP)
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure secure authentication keys for AI assistants like Claude Desktop, Cursor, and Antigravity to interact with your NeoKanban projects.
        </p>
      </div>

      <TokenManager />
    </div>
  )
}
