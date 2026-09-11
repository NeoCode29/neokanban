'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

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
    </header>
  )
}
