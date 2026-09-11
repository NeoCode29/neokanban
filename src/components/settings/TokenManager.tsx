'use client'

import { useState, useEffect, useCallback } from 'react'
import { Key, Plus, Trash2, Copy, Check, Terminal, Cpu, Loader2 } from 'lucide-react'

interface TokenItem {
  id: string
  name: string
  tokenHint: string
  createdAt: string
  lastUsedAt: string | null
}

export default function TokenManager() {
  const [tokens, setTokens] = useState<TokenItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tokenName, setTokenName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState(false)
  const [error, setError] = useState('')

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens')
      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenName.trim()) return

    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tokenName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create token')

      setNewToken(data.rawToken)
      setTokenName('')
      fetchTokens()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this AI access token?')) return

    try {
      const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTokens((prev) => prev.filter((t) => t.id !== id))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCopyToken = () => {
    if (!newToken) return
    navigator.clipboard.writeText(newToken)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  const mcpConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        neokanban: {
          command: 'node',
          args: ['c:/Users/kresna/Documents/Workspace/neokanban/mcp/dist/index.js'],
          env: {
            DATABASE_URL: 'postgresql://postgres:postgres@localhost:5435/neokanban?schema=public',
            NEOKANBAN_PAT: newToken || 'YOUR_PAT_TOKEN_HERE',
          },
        },
      },
    },
    null,
    2
  )

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(mcpConfigSnippet)
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* New Token Banner */}
      {newToken && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-emerald-300">Personal Access Token Generated</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Copy this token now. It will not be shown again.
              </p>

              <div className="mt-3 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                <code className="text-xs font-mono text-emerald-400 flex-1 break-all select-all">
                  {newToken}
                </code>
                <button
                  onClick={handleCopyToken}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors shrink-0"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    MCP Configuration (Claude Desktop / Cursor):
                  </span>
                  <button
                    onClick={handleCopyConfig}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {copiedConfig ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedConfig ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {mcpConfigSnippet}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Token Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          Generate New AI Access Token
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 mb-3">
          Allows AI assistants to query living context and manage tasks via MCP.
        </p>

        {error && (
          <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Token name (e.g. Claude Desktop)..."
            required
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Generate</span>
          </button>
        </form>
      </div>

      {/* Token List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              Active AI Access Tokens
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Authorized tokens</p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
            {tokens.length}
          </span>
        </div>

        {loading ? (
          <div className="py-6 flex justify-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
            No active tokens. Generate one above to connect AI clients.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {tokens.map((token) => (
              <div key={token.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">{token.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-950 text-slate-400 rounded border border-slate-800">
                      {token.tokenHint}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                    <span>Created: {new Date(token.createdAt).toLocaleDateString()}</span>
                    <span>Last used: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(token.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                  title="Revoke Token"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
