import type { Slide, SlideFormat } from '../../types'
import { savePresentation } from '../../utils/slides'
import { exportSlideAsImage, exportAllSlidesAsImages, exportCurrentAsPptx } from '../../utils/export'
import { formatConfigs } from '../../constants/formatConfigs'
import type { RefObject } from 'react'

interface ExportModalProps {
  show: boolean
  onClose: () => void
  slides: Slide[]
  currentIndex: number
  currentFormat: SlideFormat
  previewRef: RefObject<HTMLDivElement | null>
  isBulkExporting: boolean
  isPptExporting: boolean
  editorContent: string
  setCurrentIndex: (index: number) => void
  setIsBulkExporting: (isExporting: boolean) => void
  setIsPptExporting: (isExporting: boolean) => void
}

export const ExportModal = ({
  show,
  onClose,
  slides,
  currentIndex,
  currentFormat,
  previewRef,
  isBulkExporting,
  isPptExporting,
  editorContent,
  setCurrentIndex,
  setIsBulkExporting,
  setIsPptExporting
}: ExportModalProps) => {
  if (!show) return null

  const handleSave = () => {
    savePresentation(editorContent)
    onClose()
  }

  const handleExportImage = async () => {
    await exportSlideAsImage(previewRef, currentIndex, currentFormat)
    onClose()
  }

  const handleExportAllImages = async () => {
    await exportAllSlidesAsImages(previewRef, slides, currentIndex, setCurrentIndex, isBulkExporting, setIsBulkExporting, currentFormat)
    onClose()
  }

  const handleExportPptx = async () => {
    await exportCurrentAsPptx(previewRef, slides, currentFormat, formatConfigs, currentIndex, setCurrentIndex, isPptExporting, setIsPptExporting)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="rounded-lg shadow-xl p-6"
        style={{ backgroundColor: '#2b2b2b', border: '1px solid #3a3a3a', minWidth: '400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold" style={{ color: '#e5e7eb' }}>保存</h2>
          <button
            onClick={onClose}
            className="rounded-lg transition-colors flex items-center justify-center"
            style={{ 
              width: '32px', 
              height: '32px', 
              backgroundColor: '#3a3a3a', 
              color: '#e5e7eb',
              border: '1px solid #4a4a4a'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4a4a4a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3a3a3a'
            }}
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-3 rounded-lg transition-colors border hover:opacity-80 flex items-center gap-3 text-left"
            style={{ backgroundColor: '#3a3a3a', borderColor: '#4a4a4a', color: '#e5e7eb' }}
          >
            <span className="material-icons">save</span>
            <div className="flex-1">
              <div className="font-medium">テキストとして保存</div>
              <div className="text-sm opacity-70">マークダウンファイルとして保存</div>
            </div>
          </button>
          <button
            onClick={handleExportImage}
            disabled={slides.length === 0 || isBulkExporting}
            className="px-4 py-3 rounded-lg transition-colors border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-left"
            style={{ backgroundColor: '#3a3a3a', borderColor: '#4a4a4a', color: '#e5e7eb' }}
          >
            <span className="material-icons">image</span>
            <div className="flex-1">
              <div className="font-medium">画像として保存</div>
              <div className="text-sm opacity-70">現在のスライドをPNG画像として保存</div>
            </div>
          </button>
          <button
            onClick={handleExportAllImages}
            disabled={slides.length === 0 || isBulkExporting}
            className="px-4 py-3 rounded-lg transition-colors border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-left"
            style={{ backgroundColor: '#3a3a3a', borderColor: '#4a4a4a', color: '#e5e7eb' }}
          >
            <span className="material-icons">folder</span>
            <div className="flex-1">
              <div className="font-medium">全スライドを画像として保存</div>
              <div className="text-sm opacity-70">すべてのスライドをPNG画像として保存</div>
            </div>
          </button>
          <button 
            onClick={handleExportPptx}
            disabled={slides.length === 0 || isPptExporting}
            className="px-4 py-3 rounded-lg transition-colors border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-left"
            style={{ backgroundColor: '#3a3a3a', borderColor: '#4a4a4a', color: '#e5e7eb' }}
          >
            <span className="material-icons">description</span>
            <div className="flex-1">
              <div className="font-medium">PowerPointとして保存</div>
              <div className="text-sm opacity-70">現在のフォーマットでPPTXファイルとして保存</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

