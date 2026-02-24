import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { Code } from 'lucide-react'
import { cn } from '@/lib/utils'

type SizeVariant = 'xs' | 'sm' | 'base'

interface MarkdownRendererProps {
  content: string
  isError?: boolean
  className?: string
  showToggle?: boolean
  size?: SizeVariant
  maxHeight?: string
}

export default function MarkdownRenderer({
  content,
  isError = false,
  className = '',
  showToggle = true,
  size = 'xs',
  maxHeight = 'max-h-64',
}: MarkdownRendererProps) {
  const [showRaw, setShowRaw] = useState<boolean>(false)

  if (!content) return null

  const sizeClasses: Record<SizeVariant, string> = {
    xs: 'prose-xs prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-h4:text-sm prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-code:text-[11px] prose-pre:text-[11px] prose-pre:leading-tight',
    sm: 'prose-sm prose-headings:font-semibold prose-p:text-sm prose-li:text-sm prose-code:text-xs prose-pre:text-xs',
    base: 'prose prose-headings:font-semibold',
  }

  const errorClasses = isError
    ? 'bg-red-500/10 border border-red-500/20 prose-headings:text-red-200 prose-p:text-red-300 prose-code:text-red-200'
    : 'bg-secondary/50 border border-border'

  const rawClasses = isError
    ? 'bg-red-500/10 text-red-300 border border-red-500/20'
    : 'bg-secondary/50 text-foreground/80 border border-border'

  return (
    <div className={className}>
      {showToggle && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isError ? 'Error Output' : 'Output'}
          </h3>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-[10px] px-2 py-0.5 rounded bg-secondary/50 hover:bg-secondary border border-border flex items-center gap-1 transition-colors"
            title={showRaw ? 'Show rendered' : 'Show raw'}
          >
            <Code size={10} />
            {showRaw ? 'Rendered' : 'Raw'}
          </button>
        </div>
      )}

      {showRaw ? (
        <pre className={cn(
          'text-xs font-mono p-3 rounded-lg overflow-auto whitespace-pre-wrap break-words',
          maxHeight,
          rawClasses
        )}>
          {content}
        </pre>
      ) : (
        <div className={cn(
          'prose dark:prose-invert max-w-none p-3 rounded-lg overflow-auto',
          sizeClasses[size],
          'prose-strong:text-foreground prose-em:text-foreground/90',
          'prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
          maxHeight,
          errorClasses
        )}>
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight, rehypeSanitize]}
            remarkPlugins={[remarkGfm]}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
