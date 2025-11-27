import { useEffect, useRef } from 'react'
import type { Slide, SlideFormat, Tone, Item } from '../../types'
import { Preview } from '../preview/Preview'
import './SlideShowView.css'

interface SlideShowViewProps {
  slides: Slide[]
  currentIndex: number
  currentFormat: SlideFormat
  currentTone: Tone
  items: Item[]
  onClose: () => void
  onNavigate: (index: number) => void
}

export const SlideShowView = ({
  slides,
  currentIndex,
  currentFormat,
  currentTone,
  items,
  onClose,
  onNavigate
}: SlideShowViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentIndex < slides.length - 1) {
          onNavigate(currentIndex + 1)
        }
      } else if (e.key === 'Home') {
        e.preventDefault()
        onNavigate(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        onNavigate(slides.length - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentIndex, slides.length, onClose, onNavigate])

  // クリックで次へ進む
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width

    // 左側をクリック → 前のスライド
    if (clickX < width / 2) {
      if (currentIndex > 0) {
        onNavigate(currentIndex - 1)
      }
    } else {
      // 右側をクリック → 次のスライド
      if (currentIndex < slides.length - 1) {
        onNavigate(currentIndex + 1)
      }
    }
  }

  if (slides.length === 0) {
    return (
      <div className="slideshow-container" ref={containerRef}>
        <div className="slideshow-empty">
          <p>スライドがありません</p>
          <button onClick={onClose} className="slideshow-close-button">
            <span className="material-icons">close</span>
            閉じる
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="slideshow-container" ref={containerRef} onClick={handleClick}>
      {/* 閉じるボタン */}
      <button
        onClick={onClose}
        className="slideshow-close-button"
        title="ESCキーでも閉じられます"
      >
        <span className="material-icons">close</span>
      </button>

      {/* スライド番号表示 */}
      <div className="slideshow-slide-number">
        {currentIndex + 1} / {slides.length}
      </div>

      {/* ナビゲーションヒント */}
      <div className="slideshow-hint">
        <div className="slideshow-hint-item">
          <span className="material-icons">keyboard_arrow_left</span>
          <span>前へ</span>
        </div>
        <div className="slideshow-hint-item">
          <span className="material-icons">keyboard_arrow_right</span>
          <span>次へ</span>
        </div>
        <div className="slideshow-hint-item">
          <span className="material-icons">close</span>
          <span>ESC</span>
        </div>
      </div>

      {/* スライドプレビュー */}
      <div className="slideshow-slide-wrapper">
        <Preview
          slides={slides}
          currentIndex={currentIndex}
          currentFormat={currentFormat}
          currentTone={currentTone}
          previewRef={previewRef}
          items={items}
          isSlideShow={true}
        />
      </div>
    </div>
  )
}

