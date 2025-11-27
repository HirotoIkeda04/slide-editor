import { useRef, useEffect } from 'react'
import type { Slide, SlideFormat, Tone, Item } from '../../types'
import { extractSlideTitle } from '../../utils/markdown'
import { Preview } from '../preview/Preview'

interface SlideCarouselProps {
  slides: Slide[]
  currentIndex: number
  currentFormat: SlideFormat
  currentTone: Tone
  items: Item[]
  setCurrentIndex: (index: number) => void
}

export const SlideCarousel = ({ slides, currentIndex, currentFormat, currentTone, items, setCurrentIndex }: SlideCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null)

  // 選択中のスライドがカルーセルに表示されるようにスクロール位置を調整
  useEffect(() => {
    if (carouselRef.current) {
      const currentSlide = carouselRef.current.querySelector(`[data-slide-index="${currentIndex}"]`) as HTMLElement
      if (currentSlide) {
        currentSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [currentIndex])

  // カルーセルの高さに基づいてスライドのサイズを計算
  const carouselHeight = 120 // 固定高さ
  const titleHeight = 20 // タイトル部分の高さ（概算）
  const padding = 8 // 上下のパディング
  const availableHeight = carouselHeight - titleHeight - padding
  
  // アスペクト比に基づいて幅を計算
  const getSlideDimensions = (format: SlideFormat) => {
    let slideWidth: number
    let slideHeight: number
    if (['webinar', 'meeting', 'seminar', 'conference'].includes(format)) {
      // 16:9
      slideHeight = availableHeight
      slideWidth = slideHeight * (16 / 9)
    } else if (format === 'instastory') {
      // 9:16
      slideHeight = availableHeight
      slideWidth = slideHeight * (9 / 16)
    } else if (format === 'a4') {
      // 210:297
      slideHeight = availableHeight
      slideWidth = slideHeight * (210 / 297)
    } else {
      // 4:5 (instapost)
      slideHeight = availableHeight
      slideWidth = slideHeight * (4 / 5)
    }
    return { slideWidth, slideHeight }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setCurrentIndex(Math.max(0, currentIndex - 1))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))
    }
  }

  return (
    <div className="px-2" style={{ marginTop: '16px', height: '120px' }}>
      <div className="flex items-center gap-2 h-full">
        {/* 前へボタン */}
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="rounded-lg transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          style={{ 
            width: '36px', 
            height: '36px', 
            backgroundColor: '#3a3a3a', 
            color: '#e5e7eb',
            border: '1px solid #4a4a4a'
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = '#4a4a4a'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3a3a3a'
          }}
        >
          <span className="material-icons text-lg">chevron_left</span>
        </button>

        {/* カルーセル */}
        <div className="flex-1 relative min-w-0 overflow-hidden h-full">
          {/* 左側のフェード */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, rgba(51, 51, 51, 1), rgba(51, 51, 51, 0))'
            }}
          />
          {/* 右側のフェード */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(to left, rgba(51, 51, 51, 1), rgba(51, 51, 51, 0))'
            }}
          />
          <div 
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto pb-2 no-scrollbar items-center h-full outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            {slides.map((slide, idx) => {
              const slideTitle = extractSlideTitle(slide.content)
              const { slideWidth, slideHeight } = getSlideDimensions(currentFormat)
              // このサムネイル用の単一スライド配列を作成
              const thumbnailSlides = [{ content: slide.content, layout: slide.layout }]
              
              return (
                <div key={idx} className="flex flex-col items-center flex-shrink-0" style={{ width: `${slideWidth}px` }} data-slide-index={idx}>
                  <button
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all border rounded-lg cursor-pointer overflow-hidden ${
                      idx === currentIndex ? 'shadow-lg' : ''
                    }`}
                    style={{
                      width: `${slideWidth}px`,
                      height: `${slideHeight}px`,
                      borderWidth: idx === currentIndex ? '3px' : '1px',
                      borderColor: idx === currentIndex ? '#FFCB6B' : '#d1d5db',
                      backgroundColor: '#ffffff',
                      padding: 0
                    }}
                    tabIndex={-1}
                    aria-label={`Go to slide ${idx + 1}`}
                  >
                    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                      <Preview
                        slides={thumbnailSlides}
                        currentIndex={0}
                        currentFormat={currentFormat}
                        currentTone={currentTone}
                        previewRef={{ current: null }}
                        items={items}
                        isThumbnail={true}
                        thumbnailHeight={slideHeight}
                      />
                    </div>
                  </button>
                  {/* スライド番号とタイトル */}
                  <div 
                    className="text-left text-sm w-full"
                    style={{ 
                      marginTop: '4px',
                      color: idx === currentIndex ? '#FFCB6B' : '#6b7280',
                      fontSize: '12px',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {idx + 1}. {slideTitle}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 次へボタン */}
        <button
          onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))}
          disabled={currentIndex >= slides.length - 1}
          className="rounded-lg transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          style={{ 
            width: '36px', 
            height: '36px', 
            backgroundColor: '#3a3a3a', 
            color: '#e5e7eb',
            border: '1px solid #4a4a4a'
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = '#4a4a4a'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3a3a3a'
          }}
        >
          <span className="material-icons text-lg">chevron_right</span>
        </button>
      </div>
    </div>
  )
}


