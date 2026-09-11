'use client'

import ReactMarkdown from 'react-markdown'

interface MarkdownViewerProps {
  content: string
  className?: string
}

export default function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  if (!content || !content.trim()) {
    return <span className="text-xs text-neutral-400 italic">No content provided.</span>
  }

  return (
    <div className={`prose prose-neutral prose-xs sm:prose-sm max-w-none text-neutral-700 ${className}`}>
      <ReactMarkdown
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
