import { useEffect, useMemo, useCallback, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { Slide, SlideFormat, Tone, SlideLayout, Item, TableItem, ImpressionCode, ImpressionStyleVars } from '../../types'
import { CodeBlock } from '../code/CodeBlock'
import { TableChart } from '../chart/TableChart'
import { convertKeyMessageToHTML, splitContentByH2, hasMultipleH2, expandItemReferences, extractImagesFromContent } from '../../utils/markdown'
import { getItemByName, getItemById, itemToMarkdown } from '../../utils/items'
import { formatConfigs, fontConfigs } from '../../constants/formatConfigs'
import { generateStyleVars } from '../../utils/impressionStyle'
import './Preview.css'

interface PreviewProps {
  slides: Slide[]
  currentIndex: number
  currentFormat: SlideFormat
  currentTone: Tone
  impressionCode?: ImpressionCode // 印象コード（新システム）
  styleOverrides?: Partial<ImpressionStyleVars> // スタイルオーバーライド
  previewRef: React.RefObject<HTMLDivElement | null>
  items: Item[]
  isSlideShow?: boolean // スライドショー表示かどうか
  isThumbnail?: boolean // サムネイル表示かどうか
  thumbnailHeight?: number // サムネイルの高さ（ピクセル）
  onNavigate?: (direction: 'prev' | 'next') => void // スワイプナビゲーション用
  onStartSlideShow?: () => void // スライドショー開始
}

const getLayoutClasses = (layout: SlideLayout | undefined): string => {
  const baseClasses = 'prose prose-lg max-w-none'
  
  switch (layout) {
    case 'cover':
      return `${baseClasses} layout-cover`
    case 'toc':
      return `${baseClasses} layout-toc`
    case 'section':
      return `${baseClasses} layout-section`
    case 'summary':
      return `${baseClasses} layout-summary`
    default:
      return baseClasses
  }
}

export const Preview = ({ slides, currentIndex, currentFormat, currentTone, impressionCode, styleOverrides, previewRef, items, isSlideShow = false, isThumbnail = false, thumbnailHeight, onNavigate, onStartSlideShow }: PreviewProps) => {
  const [scale, setScale] = useState(0.3) // 初期スケールを適切な値に設定（計算完了まで適度なサイズで表示）
  const containerRef = useRef<HTMLDivElement>(null)
  const slideRef = useRef<HTMLDivElement>(null)
  const swipeDeltaXRef = useRef(0) // スワイプの累積deltaXを追跡
  const hasNavigatedRef = useRef(false) // このスワイプで既に移動したかどうか（refで管理）
  const currentIndexRef = useRef(currentIndex) // 最新のcurrentIndexをrefで保持
  const lastNavigateTimeRef = useRef(0) // 最後にナビゲーションが発生した時刻
  const lastNavigateIndexRef = useRef(currentIndex) // 最後にナビゲーションが発生したインデックス
  
  // currentIndexRefを常に最新の値に更新
  currentIndexRef.current = currentIndex

  // 印象コードからスタイル変数を生成（オーバーライド適用）
  const impressionStyles = useMemo(() => {
    if (impressionCode) {
      const base = generateStyleVars(impressionCode)
      if (styleOverrides) {
        const merged = { ...base, ...styleOverrides }
        // fontFamilyがオーバーライドされていて、fontFamilyHeadingがオーバーライドされていない場合、
        // 見出しにもfontFamilyを適用する
        if (styleOverrides.fontFamily && !styleOverrides.fontFamilyHeading) {
          merged.fontFamilyHeading = styleOverrides.fontFamily
        }
        return merged
      }
      return base
    }
    return null
  }, [impressionCode, styleOverrides])

  // スライドの固定サイズを取得
  const slideSize = formatConfigs[currentFormat]
  const fixedWidth = slideSize.width
  const fixedHeight = slideSize.height

  // フォントサイズ設定を取得
  const fontConfig = fontConfigs[currentFormat]
  const baseFontSize = fontConfig.baseFontSize
  const headingFontSize = baseFontSize * fontConfig.headingJumpRate
  const keyMessageFontSize = baseFontSize * fontConfig.keyMessageJumpRate
  const codeFontSize = baseFontSize * fontConfig.codeJumpRate
  const fontFamily = fontConfig.fontFamily

  // スケーリング計算（通常プレビューとスライドショー両方で適用、サムネイルモードではスキップ）
  useEffect(() => {
    // サムネイルモードではスケーリング計算をスキップ
    if (isThumbnail) {
      return
    }

    let retryCount = 0
    const maxRetries = 20 // リトライ回数を増やす

    const calculateScale = () => {
      if (!containerRef.current) {
        // containerRefが設定されていない場合は再試行
        if (retryCount < maxRetries) {
          retryCount++
          requestAnimationFrame(() => {
            setTimeout(calculateScale, 100)
          })
        } else {
          console.warn('[Preview] containerRef not found after max retries')
        }
        return
      }

      // slideRefは後で設定される可能性があるので、必須ではない
      if (!slideRef.current) {
        // slideRefが設定されていない場合も再試行（ただし、containerRefがあれば計算可能）
        if (retryCount < maxRetries) {
          retryCount++
          requestAnimationFrame(() => {
            setTimeout(calculateScale, 100)
          })
        }
        // slideRefがなくても、containerRefがあれば計算を続行
      }

      // 親コンテナ（プレビューエリア）のサイズを取得
      const slideContainer = containerRef.current
      const parentContainer = slideContainer.parentElement

      if (!parentContainer) {
        if (retryCount < maxRetries) {
          retryCount++
          requestAnimationFrame(() => {
            setTimeout(calculateScale, 50)
          })
        }
        return
      }

      const containerWidth = parentContainer.clientWidth
      const containerHeight = parentContainer.clientHeight

      // コンテナのサイズが取得できない場合は再試行
      if (containerWidth === 0 || containerHeight === 0) {
        if (retryCount < maxRetries) {
          retryCount++
          requestAnimationFrame(() => {
            setTimeout(calculateScale, 50)
          })
        }
        return
      }

      // パディングを考慮（App.tsxのプレビューエリアのp-4 = 16px）
      const padding = isSlideShow ? 64 : 16 * 2 // スライドショーでは64px、通常プレビューでは左右32px
      const availableWidth = Math.max(0, containerWidth - padding)
      const availableHeight = Math.max(0, containerHeight - padding)

      if (availableWidth <= 0 || availableHeight <= 0) {
        if (retryCount < maxRetries) {
          retryCount++
          requestAnimationFrame(() => {
            setTimeout(calculateScale, 50)
          })
        }
        return
      }

      // 固定サイズに基づいてスケールを計算
      const scaleX = availableWidth / fixedWidth
      const scaleY = availableHeight / fixedHeight
      
      // スケールが0以下にならないようにする
      const minScale = 0.01
      const maxScale = isSlideShow ? Infinity : 1
      
      // スライドショーでは1を超えても良いが、通常プレビューでは1以下に制限
      const newScale = Math.max(minScale, Math.min(scaleX, scaleY, maxScale))

      console.log('[Preview] Scaling calculation:', {
        containerWidth,
        containerHeight,
        availableWidth,
        availableHeight,
        fixedWidth,
        fixedHeight,
        scaleX,
        scaleY,
        newScale,
        isSlideShow
      })

      setScale(newScale)
      retryCount = 0 // 成功したらリトライカウントをリセット
    }

    // 初回計算を少し遅らせて実行（レンダリング完了を待つ）
    const initialTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        calculateScale()
      })
    }, 100)

    const resizeObserver = new ResizeObserver(() => {
      retryCount = 0 // リサイズ時はリトライカウントをリセット
      requestAnimationFrame(calculateScale)
    })

    // コンテナが設定されたら監視を開始
    const setupObserver = () => {
      if (containerRef.current?.parentElement) {
        resizeObserver.observe(containerRef.current.parentElement)
      }
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current)
      }
    }

    // 少し遅らせてオブザーバーを設定
    setTimeout(setupObserver, 200)

    return () => {
      clearTimeout(initialTimeout)
      resizeObserver.disconnect()
    }
  }, [currentIndex, currentFormat, slides, isSlideShow, fixedWidth, fixedHeight, isThumbnail])

  // currentIndexが変更されたときにログを出力し、ナビゲーション状態をリセット
  useEffect(() => {
    console.log('[Preview] currentIndex changed:', currentIndex, 'lastNavigateIndex:', lastNavigateIndexRef.current)
    currentIndexRef.current = currentIndex
    
    // currentIndexが変更されたら、ナビゲーション状態をリセット
    if (currentIndex !== lastNavigateIndexRef.current) {
      console.log('[Preview] Navigation completed, resetting state')
      hasNavigatedRef.current = false
      swipeDeltaXRef.current = 0
      // lastNavigateIndexRefは更新しない（次のナビゲーションまで保持）
    }
  }, [currentIndex])

  // スワイプ検出（タッチパッド対応）
  useEffect(() => {
    // サムネイルモードやスライドショーモード、またはonNavigateが未定義の場合はスキップ
    if (isThumbnail || isSlideShow || !onNavigate || slides.length === 0) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    let resetTimeout: number | null = null
    let lastWheelTime = 0

    const handleWheel = (e: WheelEvent) => {
      const now = Date.now()
      
      // 最後のナビゲーションから700ms以内は完全にブロック
      if (now - lastNavigateTimeRef.current < 700) {
        console.log('[Preview] Navigation blocked, time since last navigate:', now - lastNavigateTimeRef.current, 'ms')
        e.preventDefault()
        swipeDeltaXRef.current = 0
        return
      }
      
      // currentIndexが変更されていない場合もブロック（移動が完了していない）
      // より厳密にチェック：hasNavigatedRefがtrueで、かつcurrentIndexが変更されていない場合
      if (hasNavigatedRef.current && currentIndex === lastNavigateIndexRef.current) {
        console.log('[Preview] Navigation blocked, currentIndex not changed yet, currentIndex:', currentIndex, 'lastNavigateIndex:', lastNavigateIndexRef.current)
        e.preventDefault()
        swipeDeltaXRef.current = 0
        return
      }
      
      // すべてのwheelイベントをログに記録（デバッグ用）
      const absDeltaX = Math.abs(e.deltaX)
      const absDeltaY = Math.abs(e.deltaY)
      // タッチパッドではdeltaYも同時に発生することがあるため、deltaXが一定以上あれば水平スワイプとして扱う
      // deltaXが0.5以上、かつdeltaXがdeltaYの50%以上ある場合、またはdeltaXがdeltaYより大きい場合
      const isHorizontal = absDeltaX > 0.5 && (absDeltaX > absDeltaY || absDeltaX >= absDeltaY * 0.5)
      
      console.log('[Preview] Wheel event:', {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ,
        deltaMode: e.deltaMode,
        absDeltaX,
        absDeltaY,
        isHorizontal,
        ratio: absDeltaY > 0 ? absDeltaX / absDeltaY : Infinity,
        timeSinceLastNavigate: now - lastNavigateTimeRef.current
      })
      
      // 水平方向のスワイプを処理
      if (isHorizontal) {
        // 水平方向のスワイプを検出
        e.preventDefault() // デフォルトのスクロール動作を防止
        
        // 前回のwheelイベントから一定時間（800ms）経過していたら、新しいスワイプとして扱う
        if (now - lastWheelTime > 800) {
          console.log('[Preview] New swipe detected (timeout reset)')
          swipeDeltaXRef.current = 0
          hasNavigatedRef.current = false
        }
        
        lastWheelTime = now
        swipeDeltaXRef.current += e.deltaX
        
        // currentIndexRefを最新の値に更新（レンダリング時に更新されているが、念のため）
        currentIndexRef.current = currentIndex
        
        console.log('[Preview] Swipe accumulation:', {
          accumulatedDeltaX: swipeDeltaXRef.current,
          hasNavigated: hasNavigatedRef.current,
          currentIndex: currentIndexRef.current,
          currentIndexFromProps: currentIndex,
          lastNavigateIndex: lastNavigateIndexRef.current
        })
        
        // 既に移動済みの場合は、累積値をリセットして次のスワイプを待つ
        if (hasNavigatedRef.current) {
          console.log('[Preview] Already navigated, ignoring swipe')
          swipeDeltaXRef.current = 0
          return
        }
        
        // 閾値（100px相当）を超えたらスライドを移動（感度を下げるため閾値を上げる）
        const threshold = 100
        if (Math.abs(swipeDeltaXRef.current) >= threshold) {
          const currentIdx = currentIndexRef.current // refから最新の値を取得
          const swipeDirection = swipeDeltaXRef.current > 0 ? 'right' : 'left'
          
          // デバッグログ
          console.log('[Preview] Swipe threshold reached:', {
            deltaX: swipeDeltaXRef.current,
            direction: swipeDirection,
            currentIndex: currentIdx,
            slidesLength: slides.length
          })
          
          // 移動済みフラグを先に立てる（連続呼び出しを防ぐ）
          hasNavigatedRef.current = true
          lastNavigateTimeRef.current = now
          lastNavigateIndexRef.current = currentIdx
          
          // スワイプの方向を反転：右にスワイプ（deltaX > 0）= 次のスライド、左にスワイプ（deltaX < 0）= 前のスライド
          if (swipeDeltaXRef.current > 0) {
            // 右にスワイプ = 次のスライドへ
            if (currentIdx < slides.length - 1) {
              console.log('[Preview] Navigating to next (right swipe), currentIndex:', currentIdx, '->', currentIdx + 1)
              onNavigate('next')
            } else {
              console.log('[Preview] Cannot navigate to next, already at last slide, currentIndex:', currentIdx)
              hasNavigatedRef.current = false // 移動できない場合はフラグをリセット
              lastNavigateTimeRef.current = 0 // リセット
            }
          } else {
            // 左にスワイプ = 前のスライドへ
            if (currentIdx > 0) {
              console.log('[Preview] Navigating to prev (left swipe), currentIndex:', currentIdx, '->', currentIdx - 1)
              onNavigate('prev')
            } else {
              console.log('[Preview] Cannot navigate to prev, already at first slide, currentIndex:', currentIdx)
              hasNavigatedRef.current = false // 移動できない場合はフラグをリセット
              lastNavigateTimeRef.current = 0 // リセット
            }
          }
          
          swipeDeltaXRef.current = 0 // リセット
        }
        
        // タイムアウトをクリアして再設定
        if (resetTimeout !== null) {
          clearTimeout(resetTimeout)
        }
        // 移動後は長めのタイムアウトを設定して、連続移動を防ぐ（感度を下げるため）
        const timeoutDuration = hasNavigatedRef.current ? 1500 : 800
        resetTimeout = window.setTimeout(() => {
          console.log('[Preview] Swipe timeout, resetting state, hasNavigated was:', hasNavigatedRef.current)
          swipeDeltaXRef.current = 0
          hasNavigatedRef.current = false
        }, timeoutDuration)
      } else {
        // 垂直方向のスクロールの場合は累積値をリセット
        console.log('[Preview] Vertical scroll detected, resetting swipe state')
        swipeDeltaXRef.current = 0
        hasNavigatedRef.current = false
        if (resetTimeout !== null) {
          clearTimeout(resetTimeout)
          resetTimeout = null
        }
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
      if (resetTimeout !== null) {
        clearTimeout(resetTimeout)
      }
      swipeDeltaXRef.current = 0 // クリーンアップ時にリセット
      hasNavigatedRef.current = false
    }
  }, [slides.length, isThumbnail, isSlideShow, onNavigate])

  // スライドコンテンツを取得（空の場合は空文字列）
  const slideContent = slides.length > 0 ? (slides[currentIndex]?.content || '') : ''
  
  // アイテム参照を展開（useMemoでメモ化してitemsの変更を検知）
  const expandedContent = useMemo(() => {
    const result = expandItemReferences(slideContent, (itemName) => {
    const item = getItemByName(items, itemName)
      console.log('[Preview] Expanding item reference:', itemName, 'found:', !!item, 'type:', item?.type, 'isSlideShow:', isSlideShow)
    return item ? itemToMarkdown(item) : null
  })
    console.log('[Preview] Expanded content length:', result.length, 'isSlideShow:', isSlideShow, 'items count:', items.length)
    console.log('[Preview] Expanded content contains image markdown:', /!\[.*?\]\(data:image\//.test(result))
    return result
  }, [slideContent, items, isSlideShow])
  
  // 画像を抽出（base64 data URLをBlob URLに変換）
  // useMemoを使ってimages配列を安定化し、不要な再生成を防ぐ
  // Blob URLはキャッシュされるため、同じ画像に対しては同じBlob URLが再利用される
  const { html: contentWithPlaceholders, images } = useMemo(() => {
    const result = extractImagesFromContent(expandedContent)
    console.log('[Preview] Found images:', result.images.length, 'isSlideShow:', isSlideShow)
    result.images.forEach((img, idx) => {
      console.log(`[Preview] Image ${idx}:`, { alt: img.alt, placeholder: img.placeholder, blobUrl: img.blobUrl.substring(0, 50) + '...' })
    })
    return result
  }, [expandedContent, isSlideShow])
  
  // 画像情報をMapに変換して高速検索（Blob URLとalt textを保存）
  const imageMap = useMemo(() => {
    const map = new Map<string, { blobUrl: string; alt: string }>()
    images.forEach(image => {
      map.set(image.placeholder, { blobUrl: image.blobUrl, alt: image.alt })
      console.log('[Preview] Added to imageMap:', image.placeholder, '→', image.blobUrl)
    })
    console.log('[Preview] imageMap size:', map.size)
    return map
  }, [images])
  
  // カスタムimgコンポーネントを定義（useCallbackで安定化）
  const CustomImage = useCallback(({ src, alt }: { src?: string; alt?: string }) => {
    console.log('[CustomImage] Called with src:', src, 'alt:', alt, 'isSlideShow:', isSlideShow)
    console.log('[CustomImage] imageMap has src?', src ? imageMap.has(src) : false)
    console.log('[CustomImage] imageMap size:', imageMap.size)
    console.log('[CustomImage] imageMap keys:', Array.from(imageMap.keys()))
    
    // プレースホルダーの場合、Blob URLに置き換え
    if (src && imageMap.has(src)) {
      const imageInfo = imageMap.get(src)!
      const blobUrl = imageInfo.blobUrl
      const imageAlt = imageInfo.alt
      console.log('[CustomImage] Replaced placeholder with Blob URL:', blobUrl)
      
      // アイテム名から画像アイテムを検索してdisplayModeを取得
      const item = getItemByName(items, imageAlt)
      const displayMode = item && item.type === 'image' ? (item.displayMode || 'contain') : 'contain'
      
      console.log('[CustomImage] Display mode:', displayMode, 'for item:', imageAlt, 'isSlideShow:', isSlideShow, 'scale:', scale)
      
      // スライドのパディング（p-12 = 48px * 2 = 96px）とマージンを考慮
      // スライドショーの場合は、スケール後のサイズを考慮してmaxHeightを計算
      const slidePadding = 96 // p-12 = 48px * 2
      const imageMargin = 40 // 1.25em * 2 (上下マージン)
      
      let maxHeightValue: string
      if (displayMode === 'contain') {
        if (isSlideShow) {
          // スライドショーでは、スケール後のサイズを考慮
          // スケール後のスライド高さ = fixedHeight * scale
          const scaledHeight = fixedHeight * scale
          const availableHeight = scaledHeight - slidePadding - imageMargin
          // 利用可能な高さの80%を最大高さとする（より安全なマージン）
          const calculatedMaxHeight = Math.max(100, availableHeight * 0.8)
          maxHeightValue = `${calculatedMaxHeight}px`
          console.log('[CustomImage] Slideshow maxHeight calculation:', {
            fixedHeight,
            scale,
            scaledHeight,
            availableHeight,
            calculatedMaxHeight,
            maxHeightValue
          })
        } else {
          maxHeightValue = '60vh'
        }
      } else {
        maxHeightValue = 'none'
      }
      
      return (
        <div style={{
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
          position: 'relative',
          margin: '1.25em 0'
        }}>
        <img 
          src={blobUrl} 
          alt={imageAlt || alt || ''} 
          style={{ 
            maxWidth: '100%', 
              maxHeight: maxHeightValue,
              width: displayMode === 'cover' ? '100%' : 'auto',
              height: displayMode === 'cover' ? '100%' : 'auto',
            display: 'block',
              objectFit: displayMode,
              boxSizing: 'border-box'
          }} 
        />
        </div>
      )
    }
    if (!src || src.trim() === '') {
      console.warn('[CustomImage] Empty src detected, alt:', alt)
      return <span style={{ color: '#ff7373', fontStyle: 'italic' }}>⚠️ Image source is missing (alt: {alt || 'none'})</span>
    }
    console.log('[CustomImage] Using src as-is:', src)
    return <img src={src} alt={alt || ''} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
  }, [imageMap, items, isSlideShow, fixedHeight, scale])
  
  // カスタムtable-chartコンポーネントを定義（テーブルをチャートとして表示）
  const CustomTableChart = useCallback(({ id, name }: { id?: string; name?: string }) => {
    console.log('[CustomTableChart] Called with id:', id, 'name:', name)
    
    // IDまたは名前でテーブルアイテムを検索
    let tableItem: TableItem | undefined
    if (id) {
      const item = getItemById(items, id)
      if (item && item.type === 'table') {
        tableItem = item as TableItem
      }
    }
    if (!tableItem && name) {
      const item = getItemByName(items, name)
      if (item && item.type === 'table') {
        tableItem = item as TableItem
      }
    }
    
    if (!tableItem) {
      console.warn('[CustomTableChart] Table not found:', id || name)
      return (
        <div style={{ 
          padding: '1rem', 
          color: '#ff7373', 
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          テーブル "{name || id}" が見つかりません
        </div>
      )
    }
    
    return (
      <div style={{ width: '100%', margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
        <TableChart 
          table={tableItem} 
          tone={currentTone}
          width={800}
          height={300}
        />
      </div>
    )
  }, [items, currentTone])
  
  // ReactMarkdownのcomponentsを定義
  const markdownComponents: Components = useMemo(() => ({
    code: CodeBlock,
    img: CustomImage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'table-chart': CustomTableChart as any,
  }), [CustomImage, CustomTableChart])
  
  // プレースホルダーをMarkdownの画像記法に置き換え（react-markdownが処理できる形式）
  const contentWithImages = useMemo(() => {
    let result = contentWithPlaceholders
    images.forEach((image, index) => {
      // Markdownの画像記法を使用（プレースホルダーをsrcに含める）
      const imgMarkdown = `![${image.alt}](${image.placeholder})`
      result = result.replace(image.placeholder, imgMarkdown)
      console.log('[Preview] Replaced placeholder', index, 'with image markdown:', imgMarkdown, 'isSlideShow:', isSlideShow)
    })
    console.log('[Preview] contentWithImages length:', result.length, 'isSlideShow:', isSlideShow)
    console.log('[Preview] contentWithImages contains placeholder:', result.includes('__IMAGE_PLACEHOLDER_'))
    return result
  }, [contentWithPlaceholders, images, isSlideShow])
  
  const convertedContent = useMemo(() => {
    const result = convertKeyMessageToHTML(contentWithImages)
    console.log('[Preview] Converted content length:', result.length)
    console.log('[Preview] Converted content preview:', result.substring(0, 500))
    return result
  }, [contentWithImages])

  // スライドが空の場合は早期リターン（すべてのHooksの後）
  if (slides.length === 0) {
    return <p className="text-gray-400">スライドがありません</p>
  }
  
  const currentSlide = slides[currentIndex]
  const layout = currentSlide?.layout || 'normal'
  const layoutClasses = getLayoutClasses(layout)
  
  // h1区切りフォーマットで複数のh2がある場合、横並び表示用に分割
  const isH1SplitFormat = formatConfigs[currentFormat].slideSplitLevel === 1
  const shouldUseGridLayout = isH1SplitFormat && hasMultipleH2(contentWithPlaceholders) && layout === 'normal'
  const splitResult = shouldUseGridLayout ? splitContentByH2(contentWithPlaceholders) : null
  const h1SectionContent = splitResult ? convertKeyMessageToHTML(splitResult.h1Section) : null
  const h2SectionsContent = splitResult && splitResult.h2Sections.length >= 2 ? splitResult.h2Sections.map(sec => convertKeyMessageToHTML(sec)) : null
  const h2Ratios = splitResult?.h2Ratios ?? []
  
  // 比率からgrid-template-columnsを生成
  const generateGridTemplateColumns = (ratios: (number | null)[], sectionCount: number): string => {
    if (ratios.length === 0 || sectionCount === 0) {
      // フォールバック: 均等分割
      return `repeat(${Math.min(sectionCount, 4)}, 1fr)`
    }
    
    // 各カラムの比率を決定（nullは1として扱う）
    const effectiveRatios = ratios.slice(0, sectionCount).map(r => r ?? 1)
    
    // fr単位で指定
    return effectiveRatios.map(r => `${r}fr`).join(' ')
  }

  // スライドのボーダー色をトーンに応じて決定
  const getBorderColor = () => {
    switch (currentTone) {
      case 'casual':
        return '#9ca3af' // グレー（カジュアルの背景色#25b7c0に対して）
      case 'luxury':
        return '#6b7280' // グレー（ラグジュアリーの背景色#2a2a2aに対して）
      case 'warm':
        return '#333333' // ダークグレー（暖かいの背景色#FAF9F5に対して）
      case 'simple':
      default:
        return '#9ca3af' // グレー（シンプルの背景色#f5f5f5に対して）
    }
  }

  // サムネイルモード用のスケール計算（カルーセルのサイズに合わせる）
  // サムネイルの高さをスライドの実際の高さで割ってスケールを計算
  const thumbnailScale = isThumbnail && thumbnailHeight 
    ? thumbnailHeight / fixedHeight 
    : (isThumbnail ? 0.05 : scale) // フォールバック値
  
  if (isThumbnail) {
    console.log('[Preview] Thumbnail scale calculation:', {
      thumbnailHeight,
      fixedHeight,
      thumbnailScale,
      currentFormat
    })
  }

  // スライドのコンテナスタイル
  const slideContainerStyle: React.CSSProperties = isThumbnail ? {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent' // サムネイルでは背景を透明に
  } : {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative', // スケーリング時の位置調整のため
    backgroundColor: '#1e1e1e' // 外側コンテナの背景色を固定
  }

  // スライドのスタイル（固定サイズとスケーリング適用）
  // ボーダー幅をスケールに応じて調整（スケーリング後も見えるように）
  const borderWidth = isThumbnail ? 0 : Math.max(0.5, 1 / scale) // サムネイルではボーダーなし
  const slideStyle: React.CSSProperties = {
    width: `${fixedWidth}px`,
    height: `${fixedHeight}px`,
    boxSizing: 'border-box',
    transform: `scale(${isThumbnail ? thumbnailScale : scale})`,
    transformOrigin: 'center center',
    transition: isThumbnail ? 'none' : 'transform 0.2s ease-out, border-width 0.2s ease-out',
    flexShrink: 0, // スケーリング時に縮小されないように
    border: isThumbnail ? 'none' : `${borderWidth}px solid ${getBorderColor()}`,
    borderRadius: isThumbnail ? '0' : (impressionStyles?.borderRadius || '4px'),
    boxShadow: isThumbnail ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)',
    // 印象コードからのスタイル適用
    backgroundColor: impressionStyles?.background || '#f5f5f5',
    color: impressionStyles?.text || '#1f2937',
    fontFamily: impressionStyles?.fontFamily || fontFamily,
    // CSS変数を設定してフォントサイズとフォントファミリーを動的に適用
    '--base-font-size': `${baseFontSize}px`,
    '--heading-font-size': `${headingFontSize}px`,
    '--key-message-font-size': `${keyMessageFontSize}px`,
    '--code-font-size': `${codeFontSize}px`,
    '--font-family': impressionStyles?.fontFamily || fontFamily,
    // 印象コードCSS変数
    '--tone-primary': impressionStyles?.primary || '#3B82F6',
    '--tone-primary-light': impressionStyles?.primaryLight || '#60A5FA',
    '--tone-primary-dark': impressionStyles?.primaryDark || '#2563EB',
    '--tone-background': impressionStyles?.background || '#f5f5f5',
    '--tone-background-alt': impressionStyles?.backgroundAlt || '#e5e5e5',
    '--tone-text': impressionStyles?.text || '#1f2937',
    '--tone-text-muted': impressionStyles?.textMuted || '#6b7280',
    '--tone-accent': impressionStyles?.accent || '#F59E0B',
    '--tone-font-family': impressionStyles?.fontFamily || fontFamily,
    '--tone-font-family-heading': impressionStyles?.fontFamilyHeading || impressionStyles?.fontFamily || fontFamily,
    '--tone-font-weight': impressionStyles?.fontWeight?.toString() || '400',
    '--tone-font-weight-heading': impressionStyles?.fontWeightHeading?.toString() || '600',
    '--tone-letter-spacing': impressionStyles?.letterSpacing || '0',
    '--tone-border-radius': impressionStyles?.borderRadius || '4px',
    '--tone-spacing': impressionStyles?.spacing || '1rem',
  } as React.CSSProperties

  if (currentFormat === 'instapost') {
    return (
      <div
        ref={(node) => {
          containerRef.current = node
          if (previewRef) {
            (previewRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          }
        }}
        className={`${isThumbnail ? '' : 'shadow-2xl'} overflow-hidden instapost-wrapper format-instapost ${isThumbnail ? 'instapost-wrapper-thumbnail' : ''} ${isThumbnail ? '' : (isSlideShow ? 'slideshow-slide' : 'h-5/6')}`}
        style={{ ...slideContainerStyle, position: 'relative' }}
      >
        <div
          ref={slideRef}
          className={`instapost-frame ${isThumbnail ? 'instapost-frame-thumbnail' : ''}`}
          style={{
            ...slideStyle,
            '--base-font-size': `${baseFontSize}px`,
            '--heading-font-size': `${headingFontSize}px`,
            '--key-message-font-size': `${keyMessageFontSize}px`,
            '--code-font-size': `${codeFontSize}px`,
            '--font-family': fontFamily,
          } as React.CSSProperties}
          data-slide-element="true"
        >
          <div 
            className={`instapost-inner ${
            layout === 'cover' || layout === 'section' ? 'flex items-start justify-center' : ''
            } ${isThumbnail ? 'instapost-inner-thumbnail' : ''}`}
            data-slide-content="true"
          >
            <div className={`${layoutClasses} ${
              layout === 'cover' || layout === 'section' ? '' : ''
            }`} style={layout === 'cover' || layout === 'section' ? { marginTop: '20%', transform: 'translateY(0)' } : undefined}>
              <ReactMarkdown
                components={markdownComponents}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {convertedContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
        
        {/* YouTubeスタイルのフルスクリーンボタン */}
        {onStartSlideShow && !isSlideShow && !isThumbnail && (
          <button
            className="preview-fullscreen-btn"
            onClick={onStartSlideShow}
            title="スライドショー"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {/* 左上 */}
              <path d="M4 8V4H8" />
              {/* 右上 */}
              <path d="M16 4H20V8" />
              {/* 左下 */}
              <path d="M4 16V20H8" />
              {/* 右下 */}
              <path d="M16 20H20V16" />
            </svg>
          </button>
        )}
      </div>
    )
  }
  
  return (
    <div
      ref={(node) => {
        containerRef.current = node
        if (previewRef) {
          (previewRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      }}
      className={`${isThumbnail ? '' : 'shadow-2xl'} overflow-hidden ${
        isThumbnail ? '' : (isSlideShow ? 'slideshow-slide' : 'h-5/6')
      } ${
        currentFormat === 'a4' ? 'format-a4' :
        currentFormat === 'instastory' ? 'format-instastory' :
        currentFormat === 'webinar' ? 'format-webinar' :
        currentFormat === 'meeting' ? 'format-meeting' :
        currentFormat === 'seminar' ? 'format-seminar' :
        currentFormat === 'conference' ? 'format-conference' :
        ''
      }`}
      style={{ ...slideContainerStyle, position: 'relative' }}
    >
      <div
        ref={slideRef}
        className={`${currentFormat === 'instastory' ? 'text-center' : ''} p-12 ${
          layout === 'cover' || layout === 'section' ? 'flex items-start justify-center' : ''
        }`}
        style={slideStyle}
        data-slide-element={currentFormat === 'instastory' ? 'true' : undefined}
      >
        {shouldUseGridLayout && h1SectionContent && h2SectionsContent && h2SectionsContent.length >= 2 ? (
          <div className={layoutClasses}>
            {/* h1セクションを通常通り表示 */}
            <div>
              <ReactMarkdown
                components={markdownComponents}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {h1SectionContent}
              </ReactMarkdown>
            </div>
            {/* h2セクションを横並びで表示 */}
            <div 
              className="h2-grid-layout"
              style={{
                gridTemplateColumns: generateGridTemplateColumns(h2Ratios, h2SectionsContent.length)
              }}
            >
              {h2SectionsContent.map((section, idx) => (
                <div key={idx} className="h2-grid-item prose">
                  <ReactMarkdown
                    components={markdownComponents}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {section}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`${layoutClasses} ${
            layout === 'cover' || layout === 'section' ? '' : ''
          }`} style={layout === 'cover' || layout === 'section' ? { marginTop: '20%', transform: 'translateY(0)' } : undefined}>
            <ReactMarkdown
              components={markdownComponents}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
            >
              {convertedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
      
      {/* YouTubeスタイルのフルスクリーンボタン */}
      {onStartSlideShow && !isSlideShow && !isThumbnail && (
        <button
          className="preview-fullscreen-btn"
          onClick={onStartSlideShow}
          title="スライドショー"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* 左上 */}
            <path d="M4 8V4H8" />
            {/* 右上 */}
            <path d="M16 4H20V8" />
            {/* 左下 */}
            <path d="M4 16V20H8" />
            {/* 右下 */}
            <path d="M16 20H20V16" />
          </svg>
        </button>
      )}
    </div>
  )
}

