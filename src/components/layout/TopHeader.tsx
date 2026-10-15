'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Menu } from 'lucide-react'
import { useSidebar } from '@/components/layout/SidebarContext'

export default function TopHeader() {
  const pathname = usePathname()
  const { toggleMobile } = useSidebar()

  // Determine breadcrumb label
  let pageName = 'Projects'
  if (pathname === '/settings') pageName = 'AI Tokens & Settings'
  else if (pathname === '/reviews') pageName = 'Review Queue'
  else if (pathname.startsWith('/boards/')) pageName = 'Kanban Board'

  return (
    <header className="h-14 border-b border-neutral-200/80 bg-white/70 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Hamburger Toggle Button for Mobile/Tablet */}
        <button
          onClick={toggleMobile}
          className="lg:hidden p-1.5 -ml-1 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
          title="Open navigation menu"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Responsive Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-neutral-900 font-semibold truncate max-w-[180px] sm:max-w-xs md:max-w-md">
            {pageName}
          </span>
        </div>
      </div>
    </header>
  )
}

