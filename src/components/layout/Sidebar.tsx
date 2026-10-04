'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  KeyRound,
  LogOut,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Star,
  Plus,
} from 'lucide-react'
import CreateBoardModal from '@/components/kanban/CreateBoardModal'

interface BoardItem {
  id: string
  title: string
  isFavorite?: boolean
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [boards, setBoards] = useState<BoardItem[]>([])
  const [reviewCount, setReviewCount] = useState<number>(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl: string | null } | null>(null)

  useEffect(() => {
    // 1. Fetch current user
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser(d.user)
      })
      .catch(console.error)

    // 2. Fetch boards
    fetch('/api/boards')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.boards) setBoards(d.boards)
      })
      .catch(console.error)

    // 3. Fetch review count for badge
    fetch('/api/reviews')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (typeof d?.total === 'number') setReviewCount(d.total)
      })
      .catch(console.error)
  }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const favoriteBoards = boards.filter((b) => b.isFavorite)
  const recentBoards = boards.filter((b) => !b.isFavorite).slice(0, 5)

  return (
    <>
      <aside
        className={`h-screen sticky top-0 bg-[#f9fafb] border-r border-neutral-200/80 flex flex-col justify-between transition-all duration-200 z-30 select-none ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Top Brand Header */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-200/60 shrink-0">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  ▲
                </div>
                <span className="font-semibold text-sm text-neutral-900 tracking-tight">
                  NeoKanban
                </span>
              </Link>
            )}

            {collapsed && (
              <div className="w-7 h-7 mx-auto rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
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

          {/* Primary Navigation Items */}
          <nav className="p-3 space-y-1 shrink-0">
            {/* 1. Dashboard */}
            <Link
              href="/"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-neutral-200/70 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40'
              }`}
              title="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-neutral-500" />
              {!collapsed && <span>Dashboard</span>}
            </Link>

            {/* 2. Review Queue (Superpowers Never Auto-Done Hub) */}
            <Link
              href="/reviews"
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                pathname === '/reviews'
                  ? 'bg-neutral-200/70 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40'
              }`}
              title="Review Queue"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckSquare className="w-4 h-4 shrink-0 text-neutral-500" />
                {!collapsed && <span className="truncate">Review Queue</span>}
              </div>
              {!collapsed && reviewCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200/60 animate-pulse">
                  {reviewCount}
                </span>
              )}
            </Link>

            {/* 3. AI Tokens & MCP */}
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

          {/* Boards Section (when not collapsed) */}
          {!collapsed && (
            <div className="px-3 py-2 flex-1 flex flex-col min-h-0">
              {/* Section Header with Quick "+ New Board" button */}
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                <span>Projects & Boards</span>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-1 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-md transition-colors"
                  title="Create new board"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Favorites Subsection */}
              {favoriteBoards.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  <div className="px-2 pt-1 pb-0.5 text-[10px] font-medium text-neutral-400 flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                    <span>Favorites</span>
                  </div>
                  {favoriteBoards.map((b) => (
                    <Link
                      key={b.id}
                      href={`/boards/${b.id}`}
                      className={`block truncate px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        pathname === `/boards/${b.id}`
                          ? 'text-neutral-900 font-semibold bg-neutral-200/70'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40'
                      }`}
                      title={b.title}
                    >
                      {b.title}
                    </Link>
                  ))}
                </div>
              )}

              {/* Recent Boards Subsection */}
              {recentBoards.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {favoriteBoards.length > 0 && (
                    <div className="px-2 pt-1 pb-0.5 text-[10px] font-medium text-neutral-400">
                      Recent
                    </div>
                  )}
                  {recentBoards.map((b) => (
                    <Link
                      key={b.id}
                      href={`/boards/${b.id}`}
                      className={`block truncate px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        pathname === `/boards/${b.id}`
                          ? 'text-neutral-900 font-semibold bg-neutral-200/70'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40'
                      }`}
                      title={b.title}
                    >
                      {b.title}
                    </Link>
                  ))}
                </div>
              )}

              {boards.length === 0 && (
                <p className="px-2 py-3 text-[11px] text-neutral-400 italic">
                  No boards created yet.
                </p>
              )}
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-neutral-200/60 shrink-0">
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
                  <p className="text-xs font-semibold text-neutral-900 truncate leading-tight">
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

      {/* Global Create Board Modal */}
      <CreateBoardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(boardId) => {
          fetch('/api/boards')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d?.boards) setBoards(d.boards)
            })
          router.push(`/boards/${boardId}`)
        }}
      />
    </>
  )
}
