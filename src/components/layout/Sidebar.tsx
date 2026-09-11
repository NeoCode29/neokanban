'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  KeyRound,
  LogOut,
  ChevronRight,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'

interface BoardItem {
  id: string
  title: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [boards, setBoards] = useState<BoardItem[]>([])
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl: string | null } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser(d.user)
      })
      .catch(console.error)

    fetch('/api/boards')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.boards) setBoards(d.boards)
      })
      .catch(console.error)
  }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={`h-screen sticky top-0 bg-[#f9fafb] border-r border-neutral-200/80 flex flex-col justify-between transition-all duration-200 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-200/60">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                ▲
              </div>
              <span className="font-semibold text-sm text-neutral-900 tracking-tight">
                NeoKanban
              </span>
            </Link>
          )}

          {collapsed && (
            <div className="w-7 h-7 mx-auto rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
              ▲
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-md transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <Link
            href="/"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              pathname === '/'
                ? 'bg-neutral-200/70 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40'
            }`}
            title="Home"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 text-neutral-500" />
            {!collapsed && <span>Home</span>}
          </Link>

          <Link
            href="/"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              pathname.startsWith('/boards')
                ? 'bg-neutral-200/70 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40'
            }`}
            title="Boards"
          >
            <FolderKanban className="w-4 h-4 shrink-0 text-neutral-500" />
            {!collapsed && <span>Boards & Projects</span>}
          </Link>

          {/* Quick Boards Submenu */}
          {!collapsed && boards.length > 0 && (
            <div className="pl-6 pr-2 py-1 space-y-0.5">
              {boards.slice(0, 4).map((b) => (
                <Link
                  key={b.id}
                  href={`/boards/${b.id}`}
                  className={`block truncate px-2.5 py-1 rounded text-[11px] transition-colors ${
                    pathname === `/boards/${b.id}`
                      ? 'text-neutral-900 font-medium bg-neutral-200/60'
                      : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/30'
                  }`}
                >
                  {b.title}
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/settings"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              pathname === '/settings'
                ? 'bg-neutral-200/70 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40'
            }`}
            title="MCP & AI Tokens"
          >
            <KeyRound className="w-4 h-4 shrink-0 text-neutral-500" />
            {!collapsed && <span>AI Tokens (MCP)</span>}
          </Link>
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-neutral-200/60">
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-neutral-200/40 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
              alt={user?.name || 'User'}
              className="w-7 h-7 rounded-full bg-neutral-200 border border-neutral-300/80 shrink-0"
            />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-900 truncate leading-tight">
                  {user?.name || 'Developer'}
                </p>
                <p className="text-[10px] text-neutral-500 truncate leading-tight">
                  {user?.email || ''}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-200/60 rounded transition-colors shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
