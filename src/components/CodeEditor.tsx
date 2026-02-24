import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CodeEditorProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  loading?: boolean
}

const visualBase = 'bg-muted dark:bg-[#1a1a2e] border border-border rounded-lg'
const textareaBase = 'resize-none p-4 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'

const CodeEditor = forwardRef<HTMLTextAreaElement, CodeEditorProps>(function CodeEditor({ loading, className, ...props }, ref) {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-full', visualBase, className)}>
        <span className="text-sm text-muted-foreground animate-pulse">Loading file...</span>
      </div>
    )
  }

  return (
    <textarea
      ref={ref}
      className={cn(visualBase, textareaBase, className)}
      spellCheck={false}
      {...props}
    />
  )
})

export default CodeEditor
