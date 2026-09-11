'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Layers, Settings, LogOut, LayoutDashboard, Sparkles } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
      .catch(console.error)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">NeoKanban</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                AI Context Active
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                pathname === '/'
                  ? 'bg-slate-800/80 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Boards</span>
            </Link>
            <Link
              href="/settings"
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                pathname === '/settings'
                  ? 'bg-slate-800/80 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>AI Tokens & Settings</span>
            </Link>
          </nav>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3 pr-2 border-r border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800"
              />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
