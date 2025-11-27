import { useState, useEffect, useRef } from 'react'
import type { ConsoleMessage } from '../../types'
import './Editor.css'

interface EditorProps {
  editorContent: string
  setEditorContent: (content: string) => void
  isComposing: boolean
  setIsComposing: (isComposing: boolean) => void
  errorMessages: ConsoleMessage[]
}

export const Editor = ({ editorContent, setEditorContent, isComposing, setIsComposing, errorMessages }: EditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [currentLine, setCurrentLine] = useState(1)

  // カーソル位置から現在の行番号を計算
  useEffect(() => {
    const updateCurrentLine = () => {
      if (textareaRef.current) {
        const textarea = textareaRef.current
        const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart)
        const lineNumber = textBeforeCursor.split('\n').length
        setCurrentLine(lineNumber)
      }
    }

    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener('click', updateCurrentLine)
      textarea.addEventListener('keyup', updateCurrentLine)
      return () => {
        textarea.removeEventListener('click', updateCurrentLine)
        textarea.removeEventListener('keyup', updateCurrentLine)
      }
    }
  }, [editorContent])

  // エラーがある行番号のセットを作成
  const errorLines = new Set(errorMessages.map(msg => msg.line))
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return
    if (isComposing) return
    const target = e.currentTarget
    const { selectionStart, selectionEnd, value } = target
    if (selectionStart !== selectionEnd) return

    const beforeCursor = value.slice(0, selectionStart)
    const currentLineStart = beforeCursor.lastIndexOf('\n') + 1
    const currentLine = beforeCursor.slice(currentLineStart)

    const unorderedListMatch = currentLine.match(/^(\s*)([-*+])\s+/)
    const orderedListMatch = currentLine.match(/^(\s*)(\d+)\.\s+/)

    if (!unorderedListMatch && !orderedListMatch) return

    e.preventDefault()

    const indent = unorderedListMatch?.[1] ?? orderedListMatch?.[1] ?? ''
    let insertText = '\n'

    if (unorderedListMatch) {
      insertText += `${indent}${unorderedListMatch[2]} `
    } else if (orderedListMatch) {
      const nextNumber = Number(orderedListMatch[2]) + 1
      insertText += `${indent}${nextNumber}. `
    }

    const newValue =
      value.slice(0, selectionStart) + insertText + value.slice(selectionEnd)
    const newCursor = selectionStart + insertText.length

    setEditorContent(newValue)
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = newCursor
    })
  }

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const line = document.getElementById('line-number-column')
    if (line) line.scrollTop = (e.target as HTMLTextAreaElement).scrollTop
  }

  return (
    <div className="editor-with-lines flex flex-1 overflow-hidden border" style={{ backgroundColor: '#1e1e1e', borderColor: '#3a3a3a', borderRadius: 0 }}>
      <div
        className="editor-lines font-mono text-xs select-none p-4 text-right border-r overflow-hidden box-border"
        style={{ minWidth: 38, lineHeight: '1.5', boxSizing: 'border-box', backgroundColor: '#222', borderColor: '#3a3a3a', color: '#666' }}
        id="line-number-column"
      >
        {editorContent.split("\n").map((_, idx) => {
          const lineNumber = idx + 1
          const isCurrentLine = lineNumber === currentLine
          const hasError = errorLines.has(lineNumber)
          
          let lineColor = '#666' // デフォルトの色
          if (hasError) {
            lineColor = '#ff7373' // エラーがある行は赤色（優先）
          } else if (isCurrentLine) {
            lineColor = '#9ca3af' // キャレットがある行は薄い白色
          }
          
          return (
            <div key={idx} style={{ color: lineColor }}>
              {lineNumber}
            </div>
          )
        })}
      </div>
      <textarea
        ref={textareaRef}
        value={editorContent}
        onChange={(e) => {
          setEditorContent(e.target.value)
          const textBeforeCursor = e.target.value.substring(0, e.target.selectionStart)
          const lineNumber = textBeforeCursor.split('\n').length
          setCurrentLine(lineNumber)
        }}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          const textarea = e.currentTarget
          const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart)
          const lineNumber = textBeforeCursor.split('\n').length
          setCurrentLine(lineNumber)
        }}
        className="flex-1 p-4 font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent box-border text-white"
        placeholder="スライドの内容を入力..."
        style={{ border: 'none', outline: 'none', minHeight: 0, lineHeight: '1.5', boxSizing: 'border-box' }}
        id="slide-editor-textarea"
        onScroll={handleScroll}
      />
    </div>
  )
}

