import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const extToLang = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  py: 'python', sh: 'bash', json: 'json', yml: 'yaml', yaml: 'yaml',
  css: 'css', html: 'html', md: 'markdown',
}

export default function FilePreview({ path, content }) {
  if (content === null || content === undefined) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  const ext = path.split('.').pop().toLowerCase()
  const isMarkdown = ext === 'md'

  if (isMarkdown) {
    return (
      <div className="p-4 prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (
                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>{children}</code>
              )
            }
          }}
        >
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

  return <pre className="p-4 text-sm whitespace-pre-wrap font-mono">{content}</pre>
}
