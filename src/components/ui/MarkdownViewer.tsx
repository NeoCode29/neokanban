'use client'

import ReactMarkdown from 'react-markdown'

interface MarkdownViewerProps {
  content: string
  className?: string
}

export default function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  if (!content || !content.trim()) {
    return <span className="text-xs text-slate-500 italic">No content provided.</span>
  }

  return (
    <div className={`prose prose-invert prose-xs sm:prose-sm max-w-none text-slate-300 ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-white border-b border-slate-800 pb-1 mt-3 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-slate-100 mt-3 mb-1.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-blue-400 mt-2.5 mb-1">{children}</h3>
          ),
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2 text-xs">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2 text-xs">{children}</ol>,
          li: ({ children }) => <li className="text-slate-300">{children}</li>,
          p: ({ children }) => <p className="my-1.5 leading-relaxed text-xs">{children}</p>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-blue-300">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto my-2 text-slate-200">
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
