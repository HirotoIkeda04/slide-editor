import { useState, useEffect } from 'react'
import type { ConsoleMessage } from '../../types'

interface ToastProps {
  messages: ConsoleMessage[]
}

export const Toast = ({ messages }: ToastProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  // メッセージが変更されたら、最初のメッセージにリセット
  useEffect(() => {
    if (messages.length > 0) {
      setCurrentIndex(0)
    }
  }, [messages])

  // メッセージが0件になったら非表示
  if (messages.length === 0) {
    return null
  }

  const currentMessage = messages[currentIndex]
  const hasMultiple = messages.length > 1

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : messages.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < messages.length - 1 ? prev + 1 : 0))
  }

  return (
    <div
      className="rounded-lg shadow-lg border px-3 py-2 flex items-center gap-1.5"
      style={{
        backgroundColor: '#2b2b2b',
        borderColor: '#3a3a3a',
        color: '#ff7373',
        width: '100%'
      }}
    >
      {/* 上向き矢印（前へ） */}
      {hasMultiple && (
        <button
          onClick={handlePrevious}
          className="text-xs font-semibold text-[#e5e7eb] px-0.5 transition-colors hover:text-white"
          style={{
            background: 'transparent',
            border: 'none',
            lineHeight: 1,
            letterSpacing: '0.05em'
          }}
          aria-label="前の問題"
        >
          ∧
        </button>
      )}

      {/* 問題番号と総数 */}
      {hasMultiple && (
        <span className="text-xs font-medium" style={{ minWidth: '28px', textAlign: 'center', color: '#e5e7eb' }}>
          {currentIndex + 1}/{messages.length}
        </span>
      )}

      {/* 下向き矢印（次へ） */}
      {hasMultiple && (
        <button
          onClick={handleNext}
          className="text-xs font-semibold text-[#e5e7eb] px-0.5 transition-colors hover:text-white"
          style={{
            background: 'transparent',
            border: 'none',
            lineHeight: 1,
            letterSpacing: '0.05em'
          }}
          aria-label="次の問題"
        >
          ∨
        </button>
      )}

      {/* メッセージ */}
      <div className="flex-1 flex items-center gap-3" style={{ marginLeft: '16px' }}>
        <span className="text-xs font-mono" style={{ color: '#ff8f8f' }}>
          L{currentMessage.line}
        </span>
        <span className="text-xs flex-1 leading-snug">
          {currentMessage.message}
        </span>
      </div>
    </div>
  )
}

