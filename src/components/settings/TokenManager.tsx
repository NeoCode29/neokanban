'use client'

import { useState, useEffect, useCallback } from 'react'
import { Key, Plus, Trash2, Copy, Check, Terminal, ShieldAlert, Cpu, Loader2 } from 'lucide-react'

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
    if (!confirm('Are you sure you want to revoke this AI access token? AI agents using this token will lose access.')) {
      return
    }

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
            NEOKANBAN_PAT: newToken || 'YOUR_NEOKANBAN_PAT_TOKEN_HERE',
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
    <div className="space-y-8">
      {/* Newly Created Token Banner */}
      {newToken && (
        <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Key className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-emerald-300">Personal Access Token Generated!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Make sure to copy your Personal Access Token now. You won&apos;t be able to see it again!
              </p>

              <div className="mt-4 flex items-center gap-2 bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3">
                <code className="text-sm font-mono text-emerald-400 flex-1 break-all select-all">
                  {newToken}
                </code>
                <button
                  onClick={handleCopyToken}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedToken ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Token</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    AI MCP Client Configuration (Claude Desktop / Cursor):
                  </span>
                  <button
                    onClick={handleCopyConfig}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {copiedConfig ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedConfig ? 'Copied Snippet' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {mcpConfigSnippet}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Token Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          Generate New AI Access Token
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Tokens allow AI agents (Claude, Cursor, Antigravity) to read your project guidelines and manage tasks via MCP.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="e.g. Claude Desktop (Work Laptop) or Cursor AI"
            required
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all shrink-0 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Generate Token</span>
          </button>
        </form>
      </div>

      {/* Token List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              Active AI Access Tokens
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Tokens currently authorized to access your boards</p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full font-medium">
            {tokens.length} {tokens.length === 1 ? 'Token' : 'Tokens'}
          </span>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl">
            <p className="text-sm text-slate-400">No active tokens yet.</p>
            <p className="text-xs text-slate-500 mt-1">Generate a token above to connect NeoKanban with your AI tools.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {tokens.map((token) => (
              <div key={token.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{token.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-950 text-slate-400 rounded-md border border-slate-800">
                      {token.tokenHint}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                    <span>Created: {new Date(token.createdAt).toLocaleDateString()}</span>
                    <span>
                      Last used: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(token.id)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors self-start sm:self-center"
                  title="Revoke Token"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
