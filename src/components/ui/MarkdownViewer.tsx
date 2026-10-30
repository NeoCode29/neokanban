'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewerProps {
  content: string
  className?: string
}

function isSafeUrl(url?: string): boolean {
  if (!url) return false
  const trimmed = url.trim().toLowerCase()
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  )
}

function isSafeImageUrl(src?: any): boolean {
  if (!src || typeof src !== 'string') return false
  const trimmed = src.trim().toLowerCase()
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  )
}

export default function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  if (!content || !content.trim()) {
    return <span className="text-xs text-neutral-400 italic">No content provided.</span>
  }

  return (
    <div className={`prose prose-neutral prose-xs sm:prose-sm max-w-none text-neutral-700 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-neutral-900 border-b border-neutral-200 pb-1 mt-3 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-semibold text-neutral-800 mt-2.5 mb-1.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-medium text-neutral-700 mt-2 mb-1">{children}</h3>
          ),
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2 text-xs text-neutral-600">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2 text-xs text-neutral-600">{children}</ol>,
          li: ({ children }) => <li className="text-neutral-700">{children}</li>,
          p: ({ children }) => <p className="my-1.5 leading-relaxed text-xs text-neutral-700">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-neutral-300 pl-3 my-2 italic text-xs text-neutral-600">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => {
            const safe = isSafeUrl(href)
            return (
              <a
                href={safe ? href : '#'}
                target={safe ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={!safe ? (e) => e.preventDefault() : undefined}
                className="text-neutral-900 font-medium underline underline-offset-2 hover:text-neutral-600 transition-colors"
              >
                {children}
              </a>
            )
          },
          img: ({ src, alt }) => {
            const srcStr = typeof src === 'string' ? src : ''
            const safeSrc = isSafeImageUrl(srcStr) ? srcStr : ''
            if (!safeSrc) return null
            return (
              <img
                src={safeSrc}
                alt={alt || ''}
                loading="lazy"
                className="rounded-xl border border-neutral-200/80 my-2 max-w-full h-auto object-contain shadow-2xs hover:shadow-md transition-shadow cursor-pointer"
              />
            )
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-neutral-200/90 shadow-2xs bg-white">
              <table className="min-w-full divide-y divide-neutral-200 text-xs text-neutral-800 font-sans border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-50/90 text-neutral-900 border-b border-neutral-200/80">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-neutral-100 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-neutral-50/60 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-neutral-900 tracking-tight border-r border-neutral-200/60 last:border-r-0 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-xs text-neutral-700 border-r border-neutral-100 last:border-r-0 align-top">
              {children}
            </td>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-mono text-[11px] text-neutral-800">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 font-mono text-xs overflow-x-auto my-2 text-neutral-800">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
