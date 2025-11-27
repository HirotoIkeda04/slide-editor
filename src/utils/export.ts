import { toPng } from 'html-to-image'
import PptxGenJS from 'pptxgenjs'
import type { RefObject } from 'react'
import type { SlideFormat } from '../types'
import { formatConfigs } from '../constants/formatConfigs'

export const getPptSizeForFormat = (format: SlideFormat): { w: number; h: number; layoutName: string } => {
  // sizes in inches
  switch (format) {
    case 'webinar':
    case 'meeting':
    case 'seminar':
    case 'conference':
      return { w: 13.33, h: 7.5, layoutName: 'LAYOUT_16x9_CUSTOM' }
    case 'instastory':
      return { w: 7.5, h: 13.33, layoutName: 'LAYOUT_9x16_CUSTOM' }
    case 'instapost':
      return { w: 12, h: 15, layoutName: 'LAYOUT_4x5_CUSTOM' }
    case 'a4':
    default:
      return { w: 8.27, h: 11.69, layoutName: 'LAYOUT_A4_P_CUSTOM' }
  }
}

export const getToneBgColor = (tone: string): string => {
  switch (tone) {
    case 'simple':
      return '#f5f5f5'
    case 'casual':
      return '#25b7c0'
    case 'luxury':
      return '#2a2a2a'
    case 'warm':
    default:
      return '#FAF9F5'
  }
}

export const estimateAverageColorFromDataUrl = (dataUrl: string): Promise<string> => {
  return new Promise(resolve => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        // downscale for performance
        const targetW = 64
        const ratio = img.width ? targetW / img.width : 1
        canvas.width = Math.max(1, Math.min(targetW, img.width))
        canvas.height = Math.max(1, Math.round((img.height || 1) * ratio))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve('#333333')
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]
          if (a > 0) {
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count++
          }
        }
        if (count > 0) {
          r = Math.round(r / count)
          g = Math.round(g / count)
          b = Math.round(b / count)
          resolve(`#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`)
        } else {
          resolve('#333333')
        }
      }
      img.onerror = () => {
        resolve('#333333')
      }
      img.src = dataUrl
    } catch (e) {
      resolve('#333333')
    }
  })
}

const waitForRender = (): Promise<void> => {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
}

export const captureCurrentSlide = async (
  previewRef: RefObject<HTMLDivElement | null>,
  currentFormat?: SlideFormat
): Promise<string> => {
  if (!previewRef.current) throw new Error('プレビューが見つかりません')
  await waitForRender()
  
  // PostとStoryフォーマットの場合は、実際のスライド要素（余白を除く）をキャプチャ
  if (currentFormat === 'instapost' || currentFormat === 'instastory') {
    const container = previewRef.current
    
    // instapostの場合は、ボーダーを含まないinstapost-inner要素をキャプチャ
    if (currentFormat === 'instapost') {
      // まず、親要素（instapost-frame）のスケール情報を取得
      const frameElement = container.querySelector('[data-slide-element="true"]')
      if (!frameElement || !(frameElement instanceof HTMLElement)) return
      
      const frameRect = frameElement.getBoundingClientRect()
      const frameComputedStyle = window.getComputedStyle(frameElement)
      const frameTransform = frameComputedStyle.transform
      let scaleX = 1
      let scaleY = 1
      
      if (frameTransform && frameTransform !== 'none') {
        const matrix = new DOMMatrix(frameTransform)
        scaleX = matrix.a
        scaleY = matrix.d
      }
      
      // ボーダー幅を取得
      const borderLeft = parseFloat(frameComputedStyle.borderLeftWidth) || 0
      const borderRight = parseFloat(frameComputedStyle.borderRightWidth) || 0
      const borderTop = parseFloat(frameComputedStyle.borderTopWidth) || 0
      const borderBottom = parseFloat(frameComputedStyle.borderBottomWidth) || 0
      
      // 内側要素（ボーダーを含まない）を取得
      const innerElement = container.querySelector('[data-slide-content="true"]')
      if (innerElement && innerElement instanceof HTMLElement) {
        // 内側要素の実際の表示サイズを取得
        const rect = innerElement.getBoundingClientRect()
        const computedStyle = window.getComputedStyle(innerElement)
        const bgColor = computedStyle.backgroundColor || frameComputedStyle.backgroundColor || '#ffffff'
        
        // スケール前のサイズ（実際の要素サイズ）
        const originalWidth = rect.width / scaleX
        const originalHeight = rect.height / scaleY
        
        // 要素を一時的に独立したコンテナに移動してキャプチャ
        const parent = innerElement.parentElement
        const nextSibling = innerElement.nextSibling
        const tempContainer = document.createElement('div')
        tempContainer.style.position = 'absolute'
        tempContainer.style.left = '-9999px'
        tempContainer.style.top = '0'
        tempContainer.style.width = `${originalWidth}px`
        tempContainer.style.height = `${originalHeight}px`
        tempContainer.style.overflow = 'hidden'
        document.body.appendChild(tempContainer)
        
        // 要素を一時的に移動（スケールは親要素で管理されているため、そのまま移動）
        tempContainer.appendChild(innerElement)
        
        // レンダリングを待つ
        await waitForRender()
        
        try {
          const dataUrl = await toPng(innerElement, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: bgColor
          })
          return dataUrl
        } finally {
          // 元の位置に戻す
          if (nextSibling) {
            parent?.insertBefore(innerElement, nextSibling)
          } else {
            parent?.appendChild(innerElement)
          }
          document.body.removeChild(tempContainer)
        }
      }
    }
    
    // instastoryの場合は、ボーダーを除外してキャプチャ
    if (currentFormat === 'instastory') {
      const slideElement = container.querySelector('[data-slide-element="true"]')
      if (slideElement && slideElement instanceof HTMLElement) {
        // 要素の実際の表示サイズを取得（スケール後のサイズ）
        const rect = slideElement.getBoundingClientRect()
        const computedStyle = window.getComputedStyle(slideElement)
        const bgColor = computedStyle.backgroundColor || '#ffffff'
        
        // transform: scale()が適用されている場合、スケール前のサイズを計算
        const transform = computedStyle.transform
        let scaleX = 1
        let scaleY = 1
        
        if (transform && transform !== 'none') {
          const matrix = new DOMMatrix(transform)
          scaleX = matrix.a
          scaleY = matrix.d
        }
        
        // スケール前のサイズ（実際の要素サイズ）
        const originalWidth = rect.width / scaleX
        const originalHeight = rect.height / scaleY
        
        // ボーダー幅を取得して、内側のサイズを計算
        const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0
        const borderRight = parseFloat(computedStyle.borderRightWidth) || 0
        const borderTop = parseFloat(computedStyle.borderTopWidth) || 0
        const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0
        
        // 要素を一時的に独立したコンテナに移動してキャプチャ
        const parent = slideElement.parentElement
        const nextSibling = slideElement.nextSibling
        const tempContainer = document.createElement('div')
        tempContainer.style.position = 'absolute'
        tempContainer.style.left = '-9999px'
        tempContainer.style.top = '0'
        tempContainer.style.width = `${originalWidth}px`
        tempContainer.style.height = `${originalHeight}px`
        tempContainer.style.overflow = 'hidden'
        document.body.appendChild(tempContainer)
        
        // 要素を一時的に移動し、ボーダーを削除
        const originalTransform = slideElement.style.transform
        const originalWidthStyle = slideElement.style.width
        const originalHeightStyle = slideElement.style.height
        const originalBorder = slideElement.style.border
        const originalBorderRadius = slideElement.style.borderRadius
        const originalBoxShadow = slideElement.style.boxShadow
        
        slideElement.style.transform = 'none'
        slideElement.style.width = `${originalWidth}px`
        slideElement.style.height = `${originalHeight}px`
        slideElement.style.border = 'none'
        slideElement.style.borderRadius = '0'
        slideElement.style.boxShadow = 'none'
        
        tempContainer.appendChild(slideElement)
        
        // レンダリングを待つ
        await waitForRender()
        
        try {
          const dataUrl = await toPng(slideElement, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: bgColor
          })
          return dataUrl
        } finally {
          // 元の位置に戻す
          if (nextSibling) {
            parent?.insertBefore(slideElement, nextSibling)
          } else {
            parent?.appendChild(slideElement)
          }
          slideElement.style.transform = originalTransform
          slideElement.style.width = originalWidthStyle
          slideElement.style.height = originalHeightStyle
          slideElement.style.border = originalBorder
          slideElement.style.borderRadius = originalBorderRadius
          slideElement.style.boxShadow = originalBoxShadow
          document.body.removeChild(tempContainer)
        }
      }
    }
  }
  
  // 通常の場合はコンテナ全体をキャプチャ
  const node = previewRef.current
  return await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: window.getComputedStyle(node).backgroundColor || '#ffffff'
  })
}

export const exportSlideAsImage = async (
  previewRef: RefObject<HTMLDivElement | null>,
  currentIndex: number,
  currentFormat?: SlideFormat
) => {
  try {
    const dataUrl = await captureCurrentSlide(previewRef, currentFormat)
    const link = document.createElement('a')
    link.download = `slide-${currentIndex + 1}.png`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error(error)
    alert('画像の書き出しに失敗しました')
  }
}

export const exportAllSlidesAsImages = async (
  previewRef: RefObject<HTMLDivElement | null>,
  slides: { content: string }[],
  currentIndex: number,
  setCurrentIndex: (index: number) => void,
  isBulkExporting: boolean,
  setIsBulkExporting: (isExporting: boolean) => void,
  currentFormat?: SlideFormat
) => {
  if (slides.length === 0) {
    alert('書き出すスライドがありません')
    return
  }
  if (isBulkExporting) return
  setIsBulkExporting(true)
  const originalIndex = currentIndex
  try {
    for (let i = 0; i < slides.length; i++) {
      if (i !== originalIndex) {
        setCurrentIndex(i)
        await waitForRender()
      }
      const dataUrl = await captureCurrentSlide(previewRef, currentFormat)
      const link = document.createElement('a')
      link.download = `slide-${i + 1}.png`
      link.href = dataUrl
      link.click()
    }
  } catch (error) {
    console.error(error)
    alert('一括書き出しに失敗しました')
  } finally {
    setCurrentIndex(originalIndex)
    await waitForRender()
    setIsBulkExporting(false)
  }
}

export const exportCurrentAsPptx = async (
  previewRef: RefObject<HTMLDivElement | null>,
  slides: { content: string }[],
  currentFormat: SlideFormat,
  formatConfigs: Record<SlideFormat, { icon: string; name: string; ratio: string }>,
  currentIndex: number,
  setCurrentIndex: (index: number) => void,
  isPptExporting: boolean,
  setIsPptExporting: (isExporting: boolean) => void
) => {
  if (slides.length === 0) {
    alert('書き出すスライドがありません')
    return
  }
  if (isPptExporting) return
  setIsPptExporting(true)
  const originalIndex = currentIndex
  try {
    const pptx = new PptxGenJS()
    const { w, h } = getPptSizeForFormat(currentFormat)
    pptx.defineLayout({ name: 'CUSTOM', width: w, height: h })
    pptx.layout = 'CUSTOM'

    for (let i = 0; i < slides.length; i++) {
      if (i !== originalIndex) {
        setCurrentIndex(i)
      }
      const dataUrl = await captureCurrentSlide(previewRef, currentFormat)
      const bgColor = await estimateAverageColorFromDataUrl(dataUrl)
      
      const slide = pptx.addSlide()
      slide.background = { color: bgColor }
      slide.addImage({
        data: dataUrl,
        x: 0,
        y: 0,
        w: w,
        h: h,
      })
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const fileName = `${formatConfigs[currentFormat].name}_${stamp}.pptx`
    await pptx.writeFile({ fileName })
  } catch (e) {
    console.error(e)
    alert('PPTXの書き出しに失敗しました')
  } finally {
    setCurrentIndex(originalIndex)
    await waitForRender()
    setIsPptExporting(false)
  }
}

