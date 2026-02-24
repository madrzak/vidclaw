import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Components } from 'react-markdown'
import type { ClassAttributes, HTMLAttributes } from 'react'
import type { ExtraProps } from 'react-markdown'

const extToLang: Record<string, string> = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  py: 'python', sh: 'bash', json: 'json', yml: 'yaml', yaml: 'yaml',
  css: 'css', html: 'html', md: 'markdown',
}

interface FilePreviewProps {
  path: string
  content: string | null | undefined
}

type CodeProps = ClassAttributes<HTMLElement> & HTMLAttributes<HTMLElement> & ExtraProps

const markdownComponents: Components = {
  code({ node, className, children, ...props }: CodeProps) {
    const match = /language-(\w+)/.exec(className || '')
    const isBlock = node?.position !== undefined && node.tagName === 'code' && node.properties?.className !== undefined
    const isInline = !match && !isBlock
    return !isInline && match ? (
      <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...(props as Record<string, unknown>)}>
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>{children}</code>
    )
  },
}

export default function FilePreview({ path, content }: FilePreviewProps) {
  if (content === null || content === undefined) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const isMarkdown = ext === 'md'

  if (isMarkdown) {
    return (
      <div className="p-4 prose dark:prose-invert prose-sm max-w-none">
        <ReactMarkdown components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  const lang = extToLang[ext]
  if (lang) {
    return (
      <SyntaxHighlighter style={oneDark} language={lang} customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8rem' }}>
        {content}
      </SyntaxHighlighter>
    )
  }

  return <pre className="p-4 text-sm whitespace-pre-wrap font-mono text-foreground">{content}</pre>
}
