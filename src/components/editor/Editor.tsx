import { useState, useEffect, useRef, useCallback } from 'react'
import type { ConsoleMessage, EditorLine, EditorSelection } from '../../types'
import './Editor.css'

// UUID generator
const generateId = (): string => {
  return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Attribute display width (fixed, right-aligned)
// const ATTRIBUTE_WIDTH = 5 // characters (currently unused)

interface EditorProps {
  lines: EditorLine[]
  setLines: (lines: EditorLine[]) => void
  isComposing: boolean
  setIsComposing: (isComposing: boolean) => void
  errorMessages: ConsoleMessage[]
  onCurrentLineChange?: (lineIndex: number, attribute: string | null) => void
  onSelectionChange?: (selection: EditorSelection | null) => void
}

export const Editor = ({
  lines,
  setLines,
  isComposing,
  setIsComposing,
  errorMessages,
  onCurrentLineChange,
  onSelectionChange,
}: EditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [selection, setSelection] = useState<EditorSelection | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ line: number; char: number } | null>(null)
  const lastClickRef = useRef<{ time: number; line: number; char: number } | null>(null)
  const shiftAnchorRef = useRef<{ line: number; char: number } | null>(null)

  // Error lines set
  const errorLines = new Set(errorMessages.map(msg => msg.line))

  // Notify parent of current line change
  useEffect(() => {
    if (onCurrentLineChange && lines[currentLineIndex]) {
      onCurrentLineChange(currentLineIndex, lines[currentLineIndex].attribute)
    }
  }, [currentLineIndex, lines, onCurrentLineChange])

  // Notify parent of selection change
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selection)
    }
  }, [selection, onSelectionChange])

  // Focus input when current line changes
  const focusLine = useCallback((lineIndex: number, cursorPos?: number) => {
    const input = inputRefs.current[lineIndex]
    if (input) {
      input.focus()
      if (cursorPos !== undefined) {
        input.setSelectionRange(cursorPos, cursorPos)
      }
    }
  }, [])

  // Handle text change for a line (optionally update attribute)
  const handleTextChange = useCallback((
    lineIndex: number,
    newText: string,
    newAttribute?: string | null
  ) => {
    const newLines = [...lines]
    const updatedLine = { ...newLines[lineIndex], text: newText }
    if (newAttribute !== undefined) {
      updatedLine.attribute = newAttribute
    }
    newLines[lineIndex] = updatedLine
    setLines(newLines)
  }, [lines, setLines])

  // Handle key down for line navigation and special keys
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, lineIndex: number) => {
    const input = e.currentTarget
    const { selectionStart, selectionEnd, value } = input

    // Arrow Up - move to previous line
    if (e.key === 'ArrowUp' && lineIndex > 0) {
      e.preventDefault()
      const prevLine = lines[lineIndex - 1]
      const cursorPos = Math.min(selectionStart || 0, prevLine.text.length)
      setCurrentLineIndex(lineIndex - 1)
      setTimeout(() => focusLine(lineIndex - 1, cursorPos), 0)
      return
    }

    // Arrow Down - move to next line
    if (e.key === 'ArrowDown' && lineIndex < lines.length - 1) {
      e.preventDefault()
      const nextLine = lines[lineIndex + 1]
      const cursorPos = Math.min(selectionStart || 0, nextLine.text.length)
      setCurrentLineIndex(lineIndex + 1)
      setTimeout(() => focusLine(lineIndex + 1, cursorPos), 0)
      return
    }

    // Arrow Left at start - move to end of previous line
    if (e.key === 'ArrowLeft' && selectionStart === 0 && selectionEnd === 0 && lineIndex > 0) {
      e.preventDefault()
      const prevLine = lines[lineIndex - 1]
      setCurrentLineIndex(lineIndex - 1)
      setTimeout(() => focusLine(lineIndex - 1, prevLine.text.length), 0)
      return
    }

    // Arrow Right at end - move to start of next line
    if (e.key === 'ArrowRight' && selectionStart === value.length && lineIndex < lines.length - 1) {
      e.preventDefault()
      setCurrentLineIndex(lineIndex + 1)
      setTimeout(() => focusLine(lineIndex + 1, 0), 0)
      return
    }

    // Enter - create new line
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault()
      const beforeCursor = value.slice(0, selectionStart || 0)
      const afterCursor = value.slice(selectionEnd || 0)

      // Determine if we should continue list attribute
      const currentAttribute = lines[lineIndex].attribute
      let newAttribute: string | null = null
      
      if (currentAttribute === '-' || currentAttribute === '*') {
        newAttribute = currentAttribute
      } else if (currentAttribute?.match(/^\d+\.$/)) {
        // Increment numbered list
        const num = parseInt(currentAttribute)
        newAttribute = `${num + 1}.`
      } else if (currentAttribute?.match(/^[A-Z]\.$/)) {
        // Increment alphabetic list
        const char = currentAttribute.charCodeAt(0)
        if (char < 90) { // Z
          newAttribute = `${String.fromCharCode(char + 1)}.`
        }
      }

      const newLines = [...lines]
      newLines[lineIndex] = { ...newLines[lineIndex], text: beforeCursor }
      newLines.splice(lineIndex + 1, 0, {
        id: generateId(),
        attribute: newAttribute,
        text: afterCursor,
      })
      
      // Renumber subsequent numbered lists if needed
      if (newAttribute?.match(/^\d+\.$/)) {
        for (let i = lineIndex + 2; i < newLines.length; i++) {
          const attr = newLines[i].attribute
          if (attr?.match(/^\d+\.$/)) {
            const num = parseInt(attr)
            newLines[i] = { ...newLines[i], attribute: `${num + 1}.` }
            } else {
              break
            }
          }
      }

      setLines(newLines)
      setCurrentLineIndex(lineIndex + 1)
      setTimeout(() => focusLine(lineIndex + 1, 0), 0)
      return
    }

    // Delete or Backspace with selection in input field
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectionStart !== selectionEnd) {
      e.preventDefault()
      const beforeSelection = value.slice(0, selectionStart || 0)
      const afterSelection = value.slice(selectionEnd || 0)
      const indent = getLeadingWhitespace(lines[lineIndex].text)
      handleTextChange(lineIndex, indent + beforeSelection + afterSelection)
      setTimeout(() => {
        const input = inputRefs.current[lineIndex]
        if (input) {
          input.setSelectionRange(selectionStart || 0, selectionStart || 0)
        }
      }, 0)
      return
    }

    // Backspace at start of text content
    if (e.key === 'Backspace' && selectionStart === 0 && selectionEnd === 0) {
      e.preventDefault()
      const currentLine = lines[lineIndex]
      const indent = getLeadingWhitespace(currentLine.text)
      
      // インデントがある場合は、インデントを1文字削除
      if (indent.length > 0) {
        const newIndent = indent.slice(0, -1)
        const textWithoutIndent = getTextWithoutLeadingWhitespace(currentLine.text)
        handleTextChange(lineIndex, newIndent + textWithoutIndent)
        return
      }
      
      // 前の行がある場合は前の行とマージ（属性値は保持）
      if (lineIndex > 0) {
        const prevLine = lines[lineIndex - 1]
        const prevTextWithoutIndent = getTextWithoutLeadingWhitespace(prevLine.text)
        const cursorPos = prevTextWithoutIndent.length

        const newLines = [...lines]
        // 現在の行のテキスト（インデントなし）を前の行に追加
        const currentTextWithoutIndent = getTextWithoutLeadingWhitespace(currentLine.text)
        newLines[lineIndex - 1] = {
          ...prevLine,
          text: prevLine.text + currentTextWithoutIndent,
        }
        newLines.splice(lineIndex, 1)

        setLines(newLines)
        setCurrentLineIndex(lineIndex - 1)
        setTimeout(() => focusLine(lineIndex - 1, cursorPos), 0)
      }
      return
    }

    // Delete at end - merge with next line
    if (e.key === 'Delete' && selectionStart === value.length && lineIndex < lines.length - 1) {
      e.preventDefault()
      const nextLine = lines[lineIndex + 1]

      const newLines = [...lines]
      newLines[lineIndex] = {
        ...lines[lineIndex],
        text: value + nextLine.text,
      }
      newLines.splice(lineIndex + 1, 1)

      setLines(newLines)
      return
    }

    // Tab - 見出し属性値の切り替え + インデント（最大3レベル）
    if (e.key === 'Tab') {
      e.preventDefault()
      const currentLine = lines[lineIndex]
      const currentAttribute = currentLine.attribute
      const currentIndent = getLeadingWhitespace(currentLine.text)
      const textWithoutIndent = getTextWithoutLeadingWhitespace(currentLine.text)
      
      if (e.shiftKey) {
        // Shift+Tab: インデントを1つ減らす + 見出しレベルを上げる
        const newIndent = currentIndent.length > 0 ? currentIndent.slice(0, -1) : currentIndent
        
        // 見出し属性値の切り替え: null -> ### -> ## -> #
        let newAttribute: string | null | undefined = undefined
        if (currentAttribute === null) {
          newAttribute = '###'
        } else if (currentAttribute === '###') {
          newAttribute = '##'
        } else if (currentAttribute === '##') {
          newAttribute = '#'
        }
        // # の場合はそのまま（これ以上上げられない）
        
        if (newIndent !== currentIndent || newAttribute !== undefined) {
          handleTextChange(lineIndex, newIndent + textWithoutIndent, newAttribute)
        }
      } else {
        // Tab: インデントを1つ増やす + 見出しレベルを下げる
        const newIndent = currentIndent.length < 3 ? currentIndent + '\t' : currentIndent
        
        // 見出し属性値の切り替え: # -> ## -> ### -> null
        let newAttribute: string | null | undefined = undefined
        if (currentAttribute === '#') {
          newAttribute = '##'
        } else if (currentAttribute === '##') {
          newAttribute = '###'
        } else if (currentAttribute === '###') {
          newAttribute = null
        }
        // null の場合はそのまま（これ以上下げられない）
        
        if (newIndent !== currentIndent || newAttribute !== undefined) {
          handleTextChange(lineIndex, newIndent + textWithoutIndent, newAttribute)
        }
      }
      return
    }

    // Cmd+A - select all
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault()
      setSelection({
        startLine: 0,
        startChar: 0,
        endLine: lines.length - 1,
        endChar: lines[lines.length - 1].text.length,
      })
      return
    }

    // Cmd+B or Ctrl+B - bold selection in input field
    // Only process if there's no global selection (global selection takes priority)
    if ((e.metaKey || e.ctrlKey) && e.key === 'b' && selectionStart !== selectionEnd && !selection) {
      e.preventDefault()
      const indent = getLeadingWhitespace(lines[lineIndex].text)
      const indentLength = indent.length
      const selectedText = value.slice(selectionStart || 0, selectionEnd || 0)
      
      // Check if already bold (surrounded by **)
      const isBold = selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4
      
      if (isBold) {
        // Remove **
        const unboldedText = selectedText.slice(2, -2)
        const beforeSelection = value.slice(0, selectionStart || 0)
        const afterSelection = value.slice(selectionEnd || 0)
        handleTextChange(lineIndex, indent + beforeSelection + unboldedText + afterSelection)
        setTimeout(() => {
          const input = inputRefs.current[lineIndex]
          if (input) {
            const newCursorPos = (selectionStart || 0) + unboldedText.length
            input.setSelectionRange(newCursorPos, newCursorPos)
          }
        }, 0)
      } else {
        // Add **
        const boldedText = '**' + selectedText + '**'
        const beforeSelection = value.slice(0, selectionStart || 0)
        const afterSelection = value.slice(selectionEnd || 0)
        handleTextChange(lineIndex, indent + beforeSelection + boldedText + afterSelection)
        setTimeout(() => {
          const input = inputRefs.current[lineIndex]
          if (input) {
            const newSelectionStart = (selectionStart || 0) + 2
            const newSelectionEnd = newSelectionStart + selectedText.length
            input.setSelectionRange(newSelectionStart, newSelectionEnd)
          }
        }, 0)
      }
      return
    }
  }, [lines, setLines, isComposing, focusLine, handleTextChange])

  // Handle focus on a line
  const handleFocus = useCallback((lineIndex: number) => {
    setCurrentLineIndex(lineIndex)
    setSelection(null)
  }, [])

  // Get attribute display string (inline, next to text with one space)
  const getAttributeDisplay = (attribute: string | null): string => {
    if (!attribute) {
      // 属性値がない場合は空文字列を返す
      return ''
    }
    // 属性値 + 半角スペース1つ
    return attribute + ' '
  }
  
  // Get CSS class for attribute display based on attribute type
  const getAttributeDisplayClass = (attribute: string | null): string => {
    if (!attribute) {
      return ''
    }
    if (attribute.startsWith('#')) {
      return 'editor-attribute-heading'
    }
    if (attribute === '!') {
      return 'editor-attribute-key-message'
    }
    return ''
  }
  
  // テキスト内容をシンタックスハイライト用のReact要素に変換
  const renderSyntaxHighlight = (text: string): JSX.Element => {
    const parts: Array<{ text: string; className?: string }> = []
    let lastIndex = 0
    
    // レイアウトタイプ: [表紙] [目次] [まとめ] - 紫
    const layoutPattern = /(\[[表紙目次まとめ]+\])/g
    let match
    const layoutMatches: Array<{ index: number; length: number }> = []
    while ((match = layoutPattern.exec(text)) !== null) {
      layoutMatches.push({ index: match.index, length: match[0].length })
    }
    
    // 比率・配置指定: {2} {mid} {2 mid} - オレンジ
    const ratioPattern = /\{([^}]+)\}/g
    const ratioMatches: Array<{ index: number; length: number }> = []
    while ((match = ratioPattern.exec(text)) !== null) {
      ratioMatches.push({ index: match.index, length: match[0].length })
    }
    
    // アイテム参照: @アイテム名 または [[sheet:xxx]] - 緑
    const itemPattern1 = /@([^\s@]+)/g
    const itemPattern2 = /\[\[sheet:([^\]]+)\]\]/g
    const itemMatches: Array<{ index: number; length: number }> = []
    while ((match = itemPattern1.exec(text)) !== null) {
      itemMatches.push({ index: match.index, length: match[0].length })
    }
    while ((match = itemPattern2.exec(text)) !== null) {
      itemMatches.push({ index: match.index, length: match[0].length })
    }
    
    // すべてのマッチをインデックス順にソート
    const allMatches = [
      ...layoutMatches.map(m => ({ ...m, className: 'editor-syntax-layout-type' })),
      ...ratioMatches.map(m => ({ ...m, className: 'editor-syntax-ratio-spec' })),
      ...itemMatches.map(m => ({ ...m, className: 'editor-syntax-item-ref' }))
    ].sort((a, b) => a.index - b.index)
    
    // 重複を除去（最初のマッチを優先）
    const uniqueMatches: Array<{ index: number; length: number; className: string }> = []
    for (const m of allMatches) {
      const overlaps = uniqueMatches.some(
        um => m.index < um.index + um.length && m.index + m.length > um.index
      )
      if (!overlaps) {
        uniqueMatches.push(m)
      }
    }
    
    // テキストを分割してパーツを作成
    for (const m of uniqueMatches) {
      if (m.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, m.index) })
      }
      parts.push({ text: text.substring(m.index, m.index + m.length), className: m.className })
      lastIndex = m.index + m.length
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex) })
    }
    
    return (
      <span className="editor-syntax-overlay">
        {parts.map((part, idx) => (
          <span key={idx} className={part.className}>
            {part.text}
          </span>
        ))}
      </span>
    )
  }

  // Extract leading whitespace (tabs/spaces) from text
  const getLeadingWhitespace = (text: string): string => {
    const match = text.match(/^[\t ]+/)
    return match ? match[0] : ''
  }

  // Get text without leading whitespace
  const getTextWithoutLeadingWhitespace = (text: string): string => {
    return text.replace(/^[\t ]+/, '')
  }

  // Detect attribute typed at the start of the input and return remaining text
  const extractAttributeFromInput = (text: string): { attribute?: string | null; text: string } => {
    const patterns: Array<{ regex: RegExp; getAttribute: (match: RegExpMatchArray) => string | null }> = [
      { regex: /^(#{1,3})\s+/, getAttribute: (match) => match[1] },
      { regex: /^-\s+/, getAttribute: () => '-' },
      { regex: /^\*\s+/, getAttribute: () => '*' },
      { regex: /^!\s+/, getAttribute: () => '!' },
      { regex: /^(\d+)\.\s+/, getAttribute: (match) => `${match[1]}.` },
      { regex: /^([A-Za-z])\.\s+/, getAttribute: (match) => `${match[1].toUpperCase()}.` },
    ]

    for (const { regex, getAttribute } of patterns) {
      const match = text.match(regex)
      if (match) {
        return {
          attribute: getAttribute(match),
          text: text.slice(match[0].length),
        }
      }
    }

    return { attribute: undefined, text }
  }

  // Calculate position from mouse event
  const getPositionFromMouse = useCallback((e: React.MouseEvent): { line: number; char: number } | null => {
    const container = containerRef.current
    if (!container) return null

    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top + container.scrollTop
    const lineHeight = 18 // Match CSS line height
    const lineIndex = Math.min(Math.max(0, Math.floor(y / lineHeight)), lines.length - 1)

    // Get the input element for this line to calculate character position
    const input = inputRefs.current[lineIndex]
    if (!input) return { line: lineIndex, char: 0 }

    const inputRect = input.getBoundingClientRect()
    const x = e.clientX - inputRect.left
    const charWidth = 7.2 // Approximate monospace char width
    const charIndex = Math.max(0, Math.min(Math.round(x / charWidth), lines[lineIndex].text.length))

    return { line: lineIndex, char: charIndex }
  }, [lines])

  // Find word boundaries for double-click selection
  const findWordBoundaries = useCallback((text: string, charIndex: number): { start: number; end: number } => {
    const wordRegex = /[\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g
    let match
    while ((match = wordRegex.exec(text)) !== null) {
      if (charIndex >= match.index && charIndex <= match.index + match[0].length) {
        return { start: match.index, end: match.index + match[0].length }
      }
    }
    // If not in a word, select single character or nothing
    return { start: charIndex, end: Math.min(charIndex + 1, text.length) }
  }, [])

  // Handle mouse down for selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle left click
    if (e.button !== 0) return

    const pos = getPositionFromMouse(e)
    if (!pos) return

    const now = Date.now()
    const lastClick = lastClickRef.current

    // Check for Shift+click for range selection
    if (e.shiftKey && shiftAnchorRef.current) {
      const anchor = shiftAnchorRef.current
      let startLine = anchor.line
      let startChar = anchor.char
      let endLine = pos.line
      let endChar = pos.char

      // Normalize selection
      if (endLine < startLine || (endLine === startLine && endChar < startChar)) {
        [startLine, startChar, endLine, endChar] = [endLine, endChar, startLine, startChar]
      }

      setSelection({ startLine, startChar, endLine, endChar })
      setCurrentLineIndex(pos.line)
      setTimeout(() => focusLine(pos.line, pos.char), 0)
      return
    }

    // Set shift anchor for future Shift+clicks
    shiftAnchorRef.current = pos

    // Triple-click detection (select entire line)
    if (lastClick && now - lastClick.time < 500 && lastClick.line === pos.line) {
      // Check if this is a triple click (previous was a double click)
      const lineText = lines[pos.line]?.text || ''
      if (selection && 
          selection.startLine === pos.line && 
          selection.endLine === pos.line &&
          selection.startChar === 0 &&
          selection.endChar !== lineText.length) {
        // This is a triple click - select entire line including newline
        setSelection({
          startLine: pos.line,
          startChar: 0,
          endLine: pos.line,
          endChar: lineText.length,
        })
        lastClickRef.current = { time: now, line: pos.line, char: pos.char }
        return
      }
    }

    // Double-click detection (select word)
    if (lastClick && now - lastClick.time < 300 && lastClick.line === pos.line && Math.abs(lastClick.char - pos.char) < 2) {
      const lineText = lines[pos.line]?.text || ''
      const { start, end } = findWordBoundaries(lineText, pos.char)
      setSelection({
        startLine: pos.line,
        startChar: start,
        endLine: pos.line,
        endChar: end,
      })
      lastClickRef.current = { time: now, line: pos.line, char: pos.char }
      return
    }

    // Single click - start drag selection
    lastClickRef.current = { time: now, line: pos.line, char: pos.char }
    setIsDragging(true)
    dragStartRef.current = pos
    setSelection(null)
    setCurrentLineIndex(pos.line)
  }, [getPositionFromMouse, lines, selection, findWordBoundaries, focusLine])

  // Handle mouse move for selection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return

    const pos = getPositionFromMouse(e)
    if (!pos) return

    const start = dragStartRef.current
    const end = pos

    // Normalize selection (start should be before end)
    let startLine = start.line
    let startChar = start.char
    let endLine = end.line
    let endChar = end.char

    if (endLine < startLine || (endLine === startLine && endChar < startChar)) {
      [startLine, startChar, endLine, endChar] = [endLine, endChar, startLine, startChar]
    }

    setSelection({ startLine, startChar, endLine, endChar })
  }, [isDragging, getPositionFromMouse])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  // Global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  // Render selection highlight for a line
  const renderSelectionHighlight = useCallback((lineIndex: number, text: string) => {
    if (!selection) return null

    const { startLine, startChar, endLine, endChar } = selection

    if (lineIndex < startLine || lineIndex > endLine) return null

    let start = 0
    let end = text.length

    if (lineIndex === startLine) start = startChar
    if (lineIndex === endLine) end = endChar

    if (start >= end) return null

    const charWidth = 7.2 // Approximate monospace char width
    const left = start * charWidth
    const width = (end - start) * charWidth

    return (
      <div
        className="selection-highlight"
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: 0,
          width: `${width}px`,
          height: '100%',
          backgroundColor: 'rgba(59, 130, 246, 0.3)',
          pointerEvents: 'none',
        }}
      />
    )
  }, [selection])

  // Handle copy
  const handleCopy = useCallback(() => {
    if (!selection) return

    const { startLine, startChar, endLine, endChar } = selection
    let text = ''

    for (let i = startLine; i <= endLine; i++) {
      const line = lines[i]
      const lineText = line.text
      let start = 0
      let end = lineText.length

      if (i === startLine) start = startChar
      if (i === endLine) end = endChar

      text += lineText.slice(start, end)
      if (i < endLine) text += '\n'
    }

    navigator.clipboard.writeText(text)
  }, [selection, lines])

  // Handle delete selection (without copying to clipboard)
  const handleDeleteSelection = useCallback(() => {
    if (!selection) return

    const { startLine, startChar, endLine, endChar } = selection
    const newLines = [...lines]

    if (startLine === endLine) {
      // Single line delete
      const line = newLines[startLine]
      newLines[startLine] = {
        ...line,
        text: line.text.slice(0, startChar) + line.text.slice(endChar),
      }
    } else {
      // Multi-line delete
      const firstLine = newLines[startLine]
      const lastLine = newLines[endLine]
      newLines[startLine] = {
        ...firstLine,
        text: firstLine.text.slice(0, startChar) + lastLine.text.slice(endChar),
      }
      newLines.splice(startLine + 1, endLine - startLine)
    }

    setLines(newLines)
    setSelection(null)
    setCurrentLineIndex(startLine)
    setTimeout(() => focusLine(startLine, startChar), 0)
  }, [selection, lines, setLines, focusLine])

  // Handle bold formatting (toggle ** around selection)
  const handleBold = useCallback(() => {
    if (!selection) return

    const { startLine, startChar, endLine, endChar } = selection
    const newLines = [...lines]

    if (startLine === endLine) {
      // Single line bold
      const line = newLines[startLine]
      const selectedText = line.text.slice(startChar, endChar)
      
      // Check if already bold (surrounded by **)
      const isBold = selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4
      
      if (isBold) {
        // Remove **
        const unboldedText = selectedText.slice(2, -2)
        newLines[startLine] = {
          ...line,
          text: line.text.slice(0, startChar) + unboldedText + line.text.slice(endChar),
        }
        // Clear selection after unbolding
        setSelection(null)
      } else {
        // Add **
        const boldedText = '**' + selectedText + '**'
        newLines[startLine] = {
          ...line,
          text: line.text.slice(0, startChar) + boldedText + line.text.slice(endChar),
        }
        // Update selection to include the ** markers
        setSelection({
          startLine,
          startChar,
          endLine,
          endChar: startChar + boldedText.length,
        })
      }
    } else {
      // Multi-line bold - apply to each line's selected portion
      let totalAddedChars = 0
      for (let i = startLine; i <= endLine; i++) {
        const line = newLines[i]
        let lineStart = 0
        let lineEnd = line.text.length
        
        if (i === startLine) lineStart = startChar
        if (i === endLine) lineEnd = endChar
        
        const selectedText = line.text.slice(lineStart, lineEnd)
        const isBold = selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4
        
        if (isBold) {
          const unboldedText = selectedText.slice(2, -2)
          newLines[i] = {
            ...line,
            text: line.text.slice(0, lineStart) + unboldedText + line.text.slice(lineEnd),
          }
          if (i === endLine) {
            totalAddedChars -= 4 // Removed **
          }
        } else {
          const boldedText = '**' + selectedText + '**'
          newLines[i] = {
            ...line,
            text: line.text.slice(0, lineStart) + boldedText + line.text.slice(lineEnd),
          }
          if (i === endLine) {
            totalAddedChars += 4 // Added **
          }
        }
      }
      
      // Update selection end position
      setSelection({
        startLine,
        startChar,
        endLine,
        endChar: endChar + totalAddedChars,
      })
    }

    setLines(newLines)
    setCurrentLineIndex(startLine)
    setTimeout(() => focusLine(startLine, startChar), 0)
  }, [selection, lines, setLines, focusLine])

  // Handle cut
  const handleCut = useCallback(() => {
    handleCopy()
    handleDeleteSelection()
  }, [handleCopy, handleDeleteSelection])

  // Handle paste
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      const pasteLines = text.split('\n')

      let insertLineIndex = currentLineIndex
      let insertCharIndex = inputRefs.current[currentLineIndex]?.selectionStart || 0

      // If there's a selection, delete it first
      if (selection) {
        const { startLine, startChar, endLine, endChar } = selection
        const newLines = [...lines]

        if (startLine === endLine) {
          const line = newLines[startLine]
          newLines[startLine] = {
            ...line,
            text: line.text.slice(0, startChar) + line.text.slice(endChar),
          }
        } else {
          const firstLine = newLines[startLine]
          const lastLine = newLines[endLine]
          newLines[startLine] = {
            ...firstLine,
            text: firstLine.text.slice(0, startChar) + lastLine.text.slice(endChar),
          }
          newLines.splice(startLine + 1, endLine - startLine)
        }

        insertLineIndex = startLine
        insertCharIndex = startChar
        setLines(newLines)
        setSelection(null)
      }

      // Insert pasted content
      const newLines = [...lines]
      const currentLine = newLines[insertLineIndex]
      const beforeCursor = currentLine.text.slice(0, insertCharIndex)
      const afterCursor = currentLine.text.slice(insertCharIndex)

      if (pasteLines.length === 1) {
        // Single line paste
        newLines[insertLineIndex] = {
          ...currentLine,
          text: beforeCursor + pasteLines[0] + afterCursor,
        }
        setLines(newLines)
        const newCursorPos = insertCharIndex + pasteLines[0].length
        setTimeout(() => focusLine(insertLineIndex, newCursorPos), 0)
              } else {
        // Multi-line paste
        newLines[insertLineIndex] = {
          ...currentLine,
          text: beforeCursor + pasteLines[0],
        }

        const newPastedLines: EditorLine[] = pasteLines.slice(1, -1).map(text => ({
          id: generateId(),
          attribute: null,
          text,
        }))

        newPastedLines.push({
          id: generateId(),
          attribute: null,
          text: pasteLines[pasteLines.length - 1] + afterCursor,
        })

        newLines.splice(insertLineIndex + 1, 0, ...newPastedLines)
        setLines(newLines)

        const lastPastedLineIndex = insertLineIndex + pasteLines.length - 1
        const lastPastedLineText = pasteLines[pasteLines.length - 1]
        setCurrentLineIndex(lastPastedLineIndex)
        setTimeout(() => focusLine(lastPastedLineIndex, lastPastedLineText.length), 0)
      }
    } catch (err) {
      console.error('Failed to paste:', err)
    }
  }, [selection, lines, setLines, currentLineIndex, focusLine])

  // Handle keyboard shortcuts for copy/cut/paste, bold, and delete selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Delete/Backspace with global selection
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        e.preventDefault()
        handleDeleteSelection()
        return
      }

      // Handle Bold (Cmd+B or Ctrl+B)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b' && selection) {
        e.preventDefault()
        handleBold()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        handleCopy()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        handleCut()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        handlePaste()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selection, handleCopy, handleCut, handlePaste, handleDeleteSelection, handleBold])

  return (
    <div 
      ref={containerRef}
      className="editor-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Line number column */}
      <div className="editor-line-numbers">
        {lines.map((_, idx) => {
            const lineNumber = idx + 1
          const isCurrentLine = idx === currentLineIndex
            const hasError = errorLines.has(lineNumber)

          let lineColor = '#666'
          if (hasError) {
            lineColor = '#ff7373'
          } else if (isCurrentLine) {
            lineColor = '#9ca3af'
          }

            return (
            <div key={idx} className="editor-line-number" style={{ color: lineColor }}>
                {lineNumber}
              </div>
            )
          })}
        {/* Bottom spacer for FloatingNavBar clearance */}
        <div className="editor-bottom-spacer" />
        </div>

      {/* Content area */}
      <div className="editor-content">
        {lines.map((line, idx) => (
          <div
            key={line.id}
            className={`editor-line ${idx === currentLineIndex ? 'current' : ''}`}
          >
            {/* Leading whitespace (indent) */}
            <span className="editor-indent">
              {getLeadingWhitespace(line.text)}
            </span>

            {/* Attribute display (inline, next to text) */}
            <span className={`editor-attribute ${getAttributeDisplayClass(line.attribute)}`}>
              {getAttributeDisplay(line.attribute)}
            </span>

            {/* Text input with selection highlight (without leading whitespace) */}
            <div className="editor-text-wrapper">
              {renderSelectionHighlight(idx, getTextWithoutLeadingWhitespace(line.text))}
              {/* シンタックスハイライトのオーバーレイ */}
              {renderSyntaxHighlight(getTextWithoutLeadingWhitespace(line.text))}
              <input
                ref={(el) => { inputRefs.current[idx] = el }}
                type="text"
                className="editor-text-input"
                value={getTextWithoutLeadingWhitespace(line.text)}
                onChange={(e) => {
                  const indent = getLeadingWhitespace(line.text)
                  const newValue = e.target.value
                  // 行頭での属性入力のみをチェック（パフォーマンス最適化）
                  // 属性パターン（# , - , * など）で始まる場合のみ抽出を試みる
                  const firstChar = newValue.charAt(0)
                  if (firstChar === '#' || firstChar === '-' || firstChar === '*' || firstChar === '!' || /^[0-9A-Za-z]/.test(firstChar)) {
                    const { attribute: newAttribute, text: textWithoutAttribute } = extractAttributeFromInput(newValue)
                    if (newAttribute !== undefined) {
                      handleTextChange(idx, indent + textWithoutAttribute, newAttribute)
                      return
                    }
                  }
                  handleTextChange(idx, indent + newValue)
                }}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onFocus={() => handleFocus(idx)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                spellCheck={false}
              />
            </div>
        </div>
        ))}
        {/* Bottom spacer for FloatingNavBar clearance */}
        <div className="editor-bottom-spacer" />
      </div>
    </div>
  )
}
