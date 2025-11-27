import { useEffect, useRef, useState } from 'react'
import type { SlideFormat } from '../../types'
import { formatConfigs } from '../../constants/formatConfigs'

interface FormatTabsProps {
  currentFormat: SlideFormat
  onFormatChange: (format: SlideFormat) => void
}

export const FormatTabs = ({ currentFormat, onFormatChange }: FormatTabsProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [needsScroll, setNeedsScroll] = useState(false)
  const needsScrollRef = useRef(false)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, description: string) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const tooltipWidth = 280 // max-widthと同じ値
    const tooltipHalfWidth = tooltipWidth / 2
    const padding = 10 // 画面端からの余白
    
    // ツールチップの中央位置を計算
    let x = rect.left + rect.width / 2
    
    // 画面の左端を超えないように調整
    if (x - tooltipHalfWidth < padding) {
      x = tooltipHalfWidth + padding
    }
    
    // 画面の右端を超えないように調整
    if (x + tooltipHalfWidth > window.innerWidth - padding) {
      x = window.innerWidth - tooltipHalfWidth - padding
    }
    
    setTooltip({
      text: description,
      x: x,
      y: rect.top - 10
    })
  }

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip(null)
    }, 100)
  }

  useEffect(() => {
    let animationFrameId: number | null = null
    let rafId1: number
    let rafId2: number
    
    const checkScrollNeeded = () => {
      if (containerRef.current) {
        const container = containerRef.current
        const scrollWidth = container.scrollWidth
        const clientWidth = container.clientWidth
        
        // より確実な判定: 実際のタブの幅の合計を計算
        const tabs = container.querySelectorAll('.preview-tab')
        let totalTabsWidth = 0
        tabs.forEach(tab => {
          const rect = tab.getBoundingClientRect()
          totalTabsWidth += rect.width
        })
        
        // scrollWidthとclientWidthの比較、またはタブの幅の合計とclientWidthの比較
        const needsScrollValue = scrollWidth > clientWidth || totalTabsWidth > clientWidth
        
        // デバッグログ（開発時のみ）
        if (import.meta.env.DEV) {
          console.log('[FormatTabs] Scroll check:', {
            scrollWidth,
            clientWidth,
            totalTabsWidth,
            needsScroll: needsScrollValue,
            currentFormat,
            scrollLeft: container.scrollLeft,
            tabsCount: tabs.length
          })
        }
        
        const previousNeedsScroll = needsScrollRef.current
        needsScrollRef.current = needsScrollValue
        setNeedsScroll(needsScrollValue)
        
        // スクロールが必要ない場合、scrollLeftを0に固定
        if (!needsScrollValue) {
          container.scrollLeft = 0
          // ループを開始（まだ開始されていない場合）
          if (previousNeedsScroll !== false || animationFrameId === null) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId)
            const checkScrollLeft = () => {
              if (containerRef.current && !needsScrollRef.current) {
                if (containerRef.current.scrollLeft !== 0) {
                  containerRef.current.scrollLeft = 0
                }
                animationFrameId = requestAnimationFrame(checkScrollLeft)
              } else {
                animationFrameId = null
              }
            }
            animationFrameId = requestAnimationFrame(checkScrollLeft)
          }
        } else {
          // スクロールが必要な場合、ループを停止
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
          }
          // スクロールが必要な場合でも、scrollLeftが範囲外にならないようにする
          const maxScrollLeft = container.scrollWidth - container.clientWidth
          if (container.scrollLeft > maxScrollLeft) {
            container.scrollLeft = maxScrollLeft
          }
        }
      }
    }

    // レンダリング完了を確実に待つため、requestAnimationFrameを2回使用
    const scheduleCheck = () => {
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          checkScrollNeeded()
        })
      })
    }

    // 初回チェック
    scheduleCheck()

    // リサイズ時にチェック
    const resizeObserver = new ResizeObserver(() => {
      scheduleCheck()
    })
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    // ウィンドウリサイズ時にもチェック
    window.addEventListener('resize', scheduleCheck)

    // スクロールイベントを監視して、スクロールが必要ない場合は即座にscrollLeftを0にリセット
    const handleScroll = (e: Event) => {
      if (containerRef.current && !needsScrollRef.current) {
        containerRef.current.scrollLeft = 0
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }

    // スクロールイベントを監視して、スクロールが必要ない場合は無効化
    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current && !needsScrollRef.current) {
        containerRef.current.scrollLeft = 0
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (containerRef.current && !needsScrollRef.current) {
        containerRef.current.scrollLeft = 0
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }
    }

    // マウスダウン時のスクロールも防止
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !needsScrollRef.current) {
        // スクロールバーをクリックした場合も防止
        const target = e.target as HTMLElement
        if (target === containerRef.current || containerRef.current.contains(target)) {
          containerRef.current.scrollLeft = 0
        }
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: false, capture: true })
      container.addEventListener('wheel', handleWheel, { passive: false, capture: true })
      container.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
      container.addEventListener('mousedown', handleMouseDown, { passive: false, capture: true })
    }

    return () => {
      if (rafId1) cancelAnimationFrame(rafId1)
      if (rafId2) cancelAnimationFrame(rafId2)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleCheck)
      if (container) {
        container.removeEventListener('scroll', handleScroll, true)
        container.removeEventListener('wheel', handleWheel, true)
        container.removeEventListener('touchmove', handleTouchMove, true)
        container.removeEventListener('mousedown', handleMouseDown, true)
      }
    }
  }, [currentFormat])

  return (
    <div 
      ref={containerRef}
      className={`preview-tab-list flex gap-0 ${needsScroll ? 'preview-tab-list-scrollable' : ''}`}
    >
      {(Object.keys(formatConfigs) as SlideFormat[]).map(format => (
        <button
          key={format}
          onClick={() => onFormatChange(format)}
          className={`preview-tab ${currentFormat === format ? 'active' : ''}`}
          type="button"
          data-tooltip={formatConfigs[format].description}
          onMouseEnter={(e) => handleMouseEnter(e, formatConfigs[format].description)}
          onMouseLeave={handleMouseLeave}
        >
          {format === 'meeting' || format === 'seminar' || format === 'conference' ? (
            <span className="tab-icon-text">
              {format === 'meeting' ? 'S' : format === 'seminar' ? 'M' : 'L'}
            </span>
          ) : format === 'instapost' ? (
            <svg className="tab-instagram-icon" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.23 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          ) : (
            <span className="material-icons text-lg">{formatConfigs[format].icon}</span>
          )}
          {currentFormat === format && (() => {
            const name = formatConfigs[format].name
            // アスペクト比の部分（括弧内）を抽出
            const match = name.match(/^(.+?)\s*\((.+?)\)$/)
            if (match) {
              const [, baseName, aspectRatio] = match
              return (
                <span className="tab-main-text">
                  <span className="tab-name">{baseName}</span>
                  <span className="tab-aspect-ratio">({aspectRatio})</span>
                </span>
              )
            }
            return <span className="tab-main-text">{name}</span>
          })()}
        </button>
      ))}
      {tooltip && (
        <div
          className="preview-tab-tooltip-fixed"
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 10000
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}

