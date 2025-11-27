import { useEffect, useRef, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeBlockProps {
  inline?: boolean
  className?: string
  children?: React.ReactNode
  [key: string]: any
}

export const CodeBlock = ({ 
  inline, 
  className, 
  children, 
  ...props 
}: CodeBlockProps) => {
  const codeRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState<string>('clamp(0.75em, 1.5vmin, 0.9em)')
  
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  
  useEffect(() => {
    if (inline || !language || !codeRef.current) return
    
    const adjustFontSize = () => {
      const codeElement = codeRef.current
      if (!codeElement) return
      
      // SyntaxHighlighterがレンダリングする内部のdiv要素を取得
      const syntaxHighlighterDiv = codeElement.querySelector('div[class*="language-"]') as HTMLElement
      if (!syntaxHighlighterDiv) return
      
      // スライドコンテナを取得（.proseの親の親）
      const slideContainer = codeElement.closest('.shadow-2xl') as HTMLElement
      if (!slideContainer) return
      
      const slideHeight = slideContainer.clientHeight
      const slidePadding = parseFloat(getComputedStyle(slideContainer).paddingTop) + 
                           parseFloat(getComputedStyle(slideContainer).paddingBottom)
      
      // proseコンテナを取得
      const proseContainer = codeElement.closest('.prose')?.parentElement as HTMLElement
      if (!proseContainer) return
      
      const prosePadding = parseFloat(getComputedStyle(proseContainer).paddingTop) + 
                          parseFloat(getComputedStyle(proseContainer).paddingBottom)
      
      // コードブロック以外のコンテンツの高さを推定
      const codeBlockTop = codeElement.getBoundingClientRect().top - proseContainer.getBoundingClientRect().top
      const availableHeight = slideHeight - slidePadding - prosePadding - codeBlockTop - 40 // 下部の余白
      
      const codeHeight = syntaxHighlighterDiv.scrollHeight
      
      if (codeHeight > availableHeight) {
        const ratio = availableHeight / codeHeight
        const currentFontSize = parseFloat(getComputedStyle(syntaxHighlighterDiv).fontSize) || 14
        const newFontSize = Math.max(currentFontSize * ratio * 0.9, 6) // 最小6px、さらに余裕を持たせる
        setFontSize(`${newFontSize}px`)
      } else {
        setFontSize('clamp(0.75em, 1.5vmin, 0.9em)')
      }
    }
    
    // レンダリング後に調整（複数回試行）
    let attemptCount = 0
    const maxAttempts = 5
    
    const tryAdjust = () => {
      adjustFontSize()
      attemptCount++
      if (attemptCount < maxAttempts) {
        setTimeout(tryAdjust, 150)
      }
    }
    
    const timeoutId = setTimeout(tryAdjust, 100)
    
    const resizeObserver = new ResizeObserver(() => {
      attemptCount = 0
      tryAdjust()
    })
    
    if (codeRef.current) {
      resizeObserver.observe(codeRef.current)
    }
    
    const slideContainer = codeRef.current?.closest('.shadow-2xl')
    if (slideContainer) {
      resizeObserver.observe(slideContainer)
    }
    
    const proseContainer = codeRef.current?.closest('.prose')?.parentElement
    if (proseContainer) {
      resizeObserver.observe(proseContainer)
    }
    
    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [children, inline, language])
  
  if (inline || !language) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }

  return (
    <div ref={codeRef} className="code-block-wrapper">
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{
          margin: '0',
          borderRadius: '0.375rem',
          fontSize: fontSize,
          lineHeight: '1.4',
          overflow: 'hidden',
        }}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  )
}

