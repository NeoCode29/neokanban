'use client'

export interface BambooLogoProps {
  size?: number
  className?: string
  variant?: 'monochrome' | 'emerald' | 'badge'
  badgeSize?: number
}

export default function BambooLogo({
  size = 20,
  className = '',
  variant = 'badge',
  badgeSize,
}: BambooLogoProps) {
  // SVG Vector Paths for Concept A (Bamboo Kanban Columns)
  // Stalk 1 (Left: Medium, 2 card segments)
  // Stalk 2 (Center: Tallest, 3 card segments)
  // Stalk 3 (Right: Shorter, 2 card segments)

  const isEmerald = variant === 'emerald'
  const isBadge = variant === 'badge'

  const c1 = isEmerald ? '#10b981' : isBadge ? '#fafafa' : 'currentColor'
  const c2 = isEmerald ? '#059669' : isBadge ? '#e4e4e7' : 'currentColor'
  const c3 = isEmerald ? '#047857' : isBadge ? '#d4d4d8' : 'currentColor'

  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Stalk 1 (Left Column: 2 segments) */}
      <path
        d="M5 11.5L11 8.5V17.5C11 18.05 10.55 18.5 10 18.5H6C5.45 18.5 5 18.05 5 17.5V11.5Z"
        fill={c1}
      />
      <path
        d="M5 20.5H11V26C11 27.1 10.1 28 9 28H7C5.9 28 5 27.1 5 26V20.5Z"
        fill={c2}
      />

      {/* Stalk 2 (Center Column: Tallest, 3 segments) */}
      <path
        d="M13 6.5L19 3.5V11.5C19 12.05 18.55 12.5 18 12.5H14C13.45 12.5 13 12.05 13 11.5V6.5Z"
        fill={c1}
      />
      <rect x="13" y="14.5" width="6" height="5" rx="1" fill={c2} />
      <path
        d="M13 21.5H19V26C19 27.1 18.1 28 17 28H15C13.9 28 13 27.1 13 26V21.5Z"
        fill={c3}
      />

      {/* Stalk 3 (Right Column: Shorter, 2 segments) */}
      <path
        d="M21 15.5L27 12.5V19.5C27 20.05 26.55 20.5 26 20.5H22C21.45 20.5 21 20.05 21 19.5V15.5Z"
        fill={c1}
      />
      <path
        d="M21 22.5H27V26C27 27.1 26.1 28 25 28H23C21.9 28 21 27.1 21 26V22.5Z"
        fill={c2}
      />
    </svg>
  )

  if (variant === 'badge') {
    const bSize = badgeSize || Math.round(size * 1.5)
    return (
      <div
        style={{ width: bSize, height: bSize }}
        className="rounded-lg bg-neutral-900 flex items-center justify-center shadow-xs shrink-0"
      >
        {svgContent}
      </div>
    )
  }

  return svgContent
}
