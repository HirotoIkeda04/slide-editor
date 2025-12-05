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

  // メッセージタイプに応じたスタイルを決定
  const getMessageStyle = () => {
    switch (currentMessage.type) {
      case 'warning':
        return {
          backgroundColor: '#2b2b2b',
          borderColor: '#F5E6D3',
          color: '#F5E6D3',
        }
      case 'error':
        return {
          backgroundColor: '#2b2b2b',
          borderColor: '#ff7373',
          color: '#ff7373',
        }
      case 'info':
      default:
        return {
          backgroundColor: '#2b2b2b',
          borderColor: '#82aaff',
          color: '#82aaff',
        }
    }
  }

  const messageStyle = getMessageStyle()

  return (
    <div
      className="border flex items-center gap-1"
      style={{
        ...messageStyle,
        fontSize: '10px',
        padding: '6px 10px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* 上向き矢印（前へ） */}
      {hasMultiple && (
        <button
          onClick={handlePrevious}
          className="font-semibold text-[#e5e7eb] transition-colors hover:text-white"
          style={{
            background: 'transparent',
            border: 'none',
            lineHeight: 1,
            fontSize: '10px',
            padding: '0 2px'
          }}
          aria-label="前の問題"
        >
          ∧
        </button>
      )}

      {/* 問題番号と総数 */}
      {hasMultiple && (
        <span style={{ minWidth: '24px', textAlign: 'center', color: '#e5e7eb', fontSize: '8px' }}>
          {currentIndex + 1}/{messages.length}
        </span>
      )}

      {/* 下向き矢印（次へ） */}
      {hasMultiple && (
        <button
          onClick={handleNext}
          className="font-semibold text-[#e5e7eb] transition-colors hover:text-white"
          style={{
            background: 'transparent',
            border: 'none',
            lineHeight: 1,
            fontSize: '10px',
            padding: '0 2px'
          }}
          aria-label="次の問題"
        >
          ∨
        </button>
      )}

      {/* メッセージ */}
      <div className="flex-1 flex items-center gap-2" style={{ marginLeft: hasMultiple ? '8px' : '0', minWidth: 0 }}>
        <span className="font-mono" style={{ color: messageStyle.color, fontSize: '10px', flexShrink: 0 }}>
          L{currentMessage.line}
        </span>
        <span 
          className="leading-tight" 
          style={{ 
            fontSize: '10px',
            wordBreak: 'break-word',
            color: messageStyle.color,
          }}
        >
          {currentMessage.message}
        </span>
      </div>
    </div>
  )
}

