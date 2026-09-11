'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, ChevronRight } from 'lucide-react'

export default function TopHeader() {
  const pathname = usePathname()

  // Determine breadcrumb label
  let pageName = 'Projects'
  if (pathname === '/settings') pageName = 'AI Tokens & Settings'
  else if (pathname.startsWith('/boards/')) pageName = 'Kanban Board'

  return (
    <header className="h-14 border-b border-neutral-200/80 bg-white/70 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
        <Link href="/" className="hover:text-neutral-900 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-neutral-900 font-semibold">{pageName}</span>
      </div>

      {/* Center Search Pill */}
      <div className="hidden sm:flex items-center gap-2 bg-neutral-100/80 hover:bg-neutral-100 border border-neutral-200/80 rounded-full px-3.5 py-1.5 w-64 md:w-80 transition-all text-xs text-neutral-500 cursor-text">
        <Search className="w-3.5 h-3.5 text-neutral-400" />
        <span className="flex-1">Search tasks, rules...</span>
        <kbd className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-400">
          /
        </kbd>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
