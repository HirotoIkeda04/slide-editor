import { useState, useEffect, useRef } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import type { Item, TableItem, ImageItem, TextItem, ImageDisplayMode, CellDataType, CellFormat, TableDisplayFormat } from '../../types'
import { cropImage } from '../../utils/imageProcessing'
import { 
  getCellKey, 
  parseCellValue, 
  formatCellValue, 
  validateCellValue, 
  inferCellDataType,
  getDefaultCellFormat
} from '../../utils/tableUtils'
import { FormulaEvaluator } from '../../utils/formulaEvaluator'
import { FloatingNavBar } from '../floatingNavBar/FloatingNavBar'

const MAIN_SLIDE_ITEM_ID = 'main-slide'

interface ItemDetailPanelProps {
  item: Item | null
  onEdit: (item: Item) => void
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void
}

export const ItemDetailPanel = ({ 
  item, 
  onEdit, 
  onUpdateItem,
}: ItemDetailPanelProps) => {
  const [, setDisplayMode] = useState<ImageDisplayMode>('contain')

  // Table specific state
  const [tableData, setTableData] = useState<string[][]>([['', ''], ['', '']])
  const [tableHeaders, setTableHeaders] = useState<string[]>(['', ''])
  const [useHeaders, setUseHeaders] = useState(false)
  const [cellTypes, setCellTypes] = useState<Record<string, CellDataType>>({})
  const [cellFormats, setCellFormats] = useState<Record<string, CellFormat>>({})
  const [mergedCells, setMergedCells] = useState<Array<{ row: number; col: number; rowSpan: number; colSpan: number }>>([])
  const [showFormatDialog, setShowFormatDialog] = useState(false)
  const [formatDialogCell, setFormatDialogCell] = useState<{ row: number; col: number } | null>(null)
  const [formatDialogColumn, setFormatDialogColumn] = useState<number | null>(null)
  const [formatDialogDataType, setFormatDialogDataType] = useState<CellDataType>('text')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isTableExpanded, setIsTableExpanded] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [tableDisplayFormat, setTableDisplayFormat] = useState<TableDisplayFormat>('table')
  const [hiddenRows, setHiddenRows] = useState<number[]>([])
  const [hiddenColumns, setHiddenColumns] = useState<number[]>([])
  const tableScrollViewportRef = useRef<HTMLDivElement | null>(null)
  
  // Image specific state
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [imageDisplayMode, setImageDisplayMode] = useState<ImageDisplayMode>('contain')
  const [showCropTool, setShowCropTool] = useState(false)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imageRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Text specific state
  const [textContent, setTextContent] = useState('')
  
  // Context menu state for Notion-style table
  const [contextMenu, setContextMenu] = useState<{
    type: 'row' | 'column' | 'cell'
    index: number
    cellRow?: number
    cellCol?: number
    x: number
    y: number
  } | null>(null)

  // Selected cell state for formula bar
  const [selectedCell, setSelectedCell] = useState<{
    row: number
    col: number
    isHeader: boolean
  } | null>(null)
  
  // Cell range selection for merging
  const [cellRangeSelection, setCellRangeSelection] = useState<{
    start: { row: number; col: number } | null
    end: { row: number; col: number } | null
  }>({ start: null, end: null })
  const [isDragging, setIsDragging] = useState(false)

  const COLUMN_BASE_WIDTH = 75
  const ROW_HEADER_WIDTH = 40
  const colCount = tableData[0]?.length || 2
  const tableContentWidth = ROW_HEADER_WIDTH + colCount * COLUMN_BASE_WIDTH
  const tableWidthPx = `${tableContentWidth}px`

  const normalizeFullWidthNumberCharacters = (input: string): string => {
    if (!input) return input
    return input
      .replace(/[\uFF10-\uFF19]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xff10 + 0x30))
      .replace(/\uFF0E/g, '.')
      .replace(/\uFF0C/g, ',')
      .replace(/\uFF0D/g, '-')
      .replace(/\uFF0B/g, '+')
      .replace(/\uFF05/g, '%')
  }

  // アイテムが変更されたら編集状態を初期化
  useEffect(() => {
    if (item) {
      initializeEditState(item)
      if (item.type === 'image') {
        const imageItem = item as ImageItem
        setDisplayMode(imageItem.displayMode || 'contain')
      }
      // アイテムが変更されたら拡大状態をリセット
      if (item.type !== 'table') {
        setIsTableExpanded(false)
      }
    }
  }, [item?.id])

  // コンテキストメニューを外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        const target = e.target as HTMLElement
        if (!target.closest('.table-context-menu')) {
          setContextMenu(null)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])
  
  // ドラッグ終了のグローバルリスナー
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
      }
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [isDragging])
  
  // データ型ドロップダウンを外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showTypeDropdown) {
        const target = e.target as HTMLElement
        if (!target.closest('.table-type-dropdown')) {
          setShowTypeDropdown(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTypeDropdown])

  const initializeEditState = (currentItem: Item) => {
    switch (currentItem.type) {
      case 'table':
        const tableItem = currentItem as TableItem
        setTableData(tableItem.data || [['', ''], ['', '']])
        setTableHeaders(tableItem.headers || [])
        setUseHeaders(!!tableItem.headers)
        setCellTypes(tableItem.cellTypes || {})
        setCellFormats(tableItem.cellFormats || {})
        setMergedCells(tableItem.mergedCells || [])
        setTableDisplayFormat(tableItem.displayFormat || 'table')
        setHiddenRows(tableItem.hiddenRows || [])
        setHiddenColumns(tableItem.hiddenColumns || [])
        setValidationErrors({})
        break
      case 'image':
        const imageItem = currentItem as ImageItem
        setImageDataUrl(imageItem.dataUrl)
        setImageAlt(imageItem.alt || '')
        setImageDisplayMode(imageItem.displayMode || 'contain')
        setShowCropTool(false)
        setCrop(undefined)
        setCompletedCrop(undefined)
        break
      case 'text':
        const textItem = currentItem as TextItem
        setTextContent(textItem.content || '')
        break
    }
  }


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const newDataUrl = reader.result as string
      setImageDataUrl(newDataUrl)
      setShowCropTool(false)
      setCrop(undefined)
      setCompletedCrop(undefined)
      
      // 即座に保存
      if (item && item.type === 'image' && onUpdateItem) {
        onUpdateItem(item.id, { dataUrl: newDataUrl } as Partial<ImageItem>)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleApplyCrop = async () => {
    if (!completedCrop || !imageRef.current || !imageDataUrl || !item || !onUpdateItem) return

    try {
      const croppedDataUrl = await cropImage(imageDataUrl, completedCrop)
      setImageDataUrl(croppedDataUrl)
      setShowCropTool(false)
      setCrop(undefined)
      setCompletedCrop(undefined)
      
      // 即座に保存
      if (item.type === 'image') {
        onUpdateItem(item.id, { dataUrl: croppedDataUrl } as Partial<ImageItem>)
      }
    } catch (error) {
      console.error('Failed to crop image:', error)
      alert('Failed to crop image. Please try again.')
    }
  }

  const handleCancelCrop = () => {
    setShowCropTool(false)
    setCrop(undefined)
    setCompletedCrop(undefined)
  }

  // セルの値を取得（数式評価を含む）
  const getCellDisplayValue = (rowIndex: number, colIndex: number): string => {
    const cellKey = getCellKey(rowIndex, colIndex)
    const rawValue = tableData[rowIndex]?.[colIndex] || ''
    
    // 数式の場合、評価を実行
    if (rawValue.trim().startsWith('=')) {
      try {
        const evaluator = new FormulaEvaluator(
          tableData,
          cellTypes,
          (row: number, col: number) => {
            const val = tableData[row]?.[col] || ''
            const key = getCellKey(row, col)
            const type = cellTypes[key] || 'text'
            return { value: val, type }
          }
        )
        const result = evaluator.evaluate(rawValue)
        if (result === null || result === undefined) return ''
        if (typeof result === 'string' && result.startsWith('#')) {
          return result // エラー値
        }
        // 数値の場合はフォーマットを適用
        const cellType = cellTypes[cellKey] || 'text'
        const format = cellFormats[cellKey]
        if (cellType === 'number' && typeof result === 'number') {
          return formatCellValue(result, cellType, format)
        }
        return String(result)
      } catch (error) {
        return '#ERROR!'
      }
    }
    
    // 通常の値の場合、データ型に応じてフォーマット
    const cellType = cellTypes[cellKey] || 'text'
    const format = cellFormats[cellKey]
    
    if (cellType === 'text' || !rawValue) {
      return rawValue
    }
    
    // パースしてフォーマット
    const parsedValue = parseCellValue(rawValue, cellType)
    if (parsedValue === null || parsedValue === undefined || parsedValue === '') {
      return ''
    }
    
    return formatCellValue(parsedValue, cellType, format)
  }

  const handleTableCellChange = (rowIndex: number, colIndex: number, value: string) => {
    if (!item || !onUpdateItem) return
    const normalizedValue = normalizeFullWidthNumberCharacters(value)
    const cellKey = getCellKey(rowIndex, colIndex)
    const cellType = cellTypes[cellKey] || 'text'
    
    // バリデーション
    if (normalizedValue && !validateCellValue(normalizedValue, cellType)) {
      setValidationErrors(prev => ({
        ...prev,
        [cellKey]: `無効な${cellType === 'number' ? '数値' : cellType === 'date' ? '日付' : cellType === 'percentage' ? 'パーセント' : '通貨'}です`
      }))
      return
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[cellKey]
        return newErrors
      })
    }
    
    const newData = [...tableData]
    newData[rowIndex][colIndex] = normalizedValue
    
    // データ型の自動推測（値が入力された場合）
    let updatedCellTypes = { ...cellTypes }
    let updatedCellFormats = { ...cellFormats }
    
    if (normalizedValue && !cellTypes[cellKey]) {
      const inferredType = inferCellDataType(normalizedValue)
      updatedCellTypes[cellKey] = inferredType
      
      // デフォルトフォーマットを設定
      if (inferredType !== 'text') {
        updatedCellFormats[cellKey] = getDefaultCellFormat(inferredType)
      }
    }
    
    setTableData(newData)
    setCellTypes(updatedCellTypes)
    setCellFormats(updatedCellFormats)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes: updatedCellTypes,
        cellFormats: updatedCellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  const handleTableHeaderChange = (colIndex: number, value: string) => {
    if (!item || !onUpdateItem) return
    const normalizedValue = normalizeFullWidthNumberCharacters(value)
    const newHeaders = [...tableHeaders]
    newHeaders[colIndex] = normalizedValue
    setTableHeaders(newHeaders)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: tableData,
        headers: useHeaders ? newHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  const addTableRow = () => {
    if (!item || !onUpdateItem) return
    const colCount = tableData[0]?.length || 2
    const newData = [...tableData, Array(colCount).fill('')]
    setTableData(newData)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  const addTableColumn = () => {
    if (!item || !onUpdateItem) return
    const newData = tableData.map(row => [...row, ''])
    const newHeaders = [...tableHeaders, '']
    setTableData(newData)
    setTableHeaders(newHeaders)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  const removeTableRow = (index: number) => {
    if (!item || !onUpdateItem) return
    if (tableData.length <= 1) return
    const newData = tableData.filter((_, i) => i !== index)
    
    // 削除された行のセルタイプとフォーマットも削除
    const newCellTypes: Record<string, CellDataType> = {}
    const newCellFormats: Record<string, CellFormat> = {}
    Object.keys(cellTypes).forEach(key => {
      const parsed = key.split('-')
      const row = parseInt(parsed[0], 10)
      if (row !== index && row < index) {
        newCellTypes[key] = cellTypes[key]
      } else if (row > index) {
        // 行番号を1つ減らす
        const col = parseInt(parsed[1], 10)
        newCellTypes[getCellKey(row - 1, col)] = cellTypes[key]
      }
    })
    Object.keys(cellFormats).forEach(key => {
      const parsed = key.split('-')
      const row = parseInt(parsed[0], 10)
      if (row !== index && row < index) {
        newCellFormats[key] = cellFormats[key]
      } else if (row > index) {
        const col = parseInt(parsed[1], 10)
        newCellFormats[getCellKey(row - 1, col)] = cellFormats[key]
      }
    })
    
    setTableData(newData)
    setCellTypes(newCellTypes)
    setCellFormats(newCellFormats)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes: newCellTypes,
        cellFormats: newCellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  const removeTableColumn = (index: number) => {
    if (!item || !onUpdateItem) return
    if (tableData[0]?.length <= 1) return
    const newData = tableData.map(row => row.filter((_, i) => i !== index))
    const newHeaders = tableHeaders.filter((_, i) => i !== index)
    
    // 削除された列のセルタイプとフォーマットも削除
    const newCellTypes: Record<string, CellDataType> = {}
    const newCellFormats: Record<string, CellFormat> = {}
    Object.keys(cellTypes).forEach(key => {
      const parsed = key.split('-')
      const col = parseInt(parsed[1], 10)
      if (col !== index && col < index) {
        newCellTypes[key] = cellTypes[key]
      } else if (col > index) {
        // 列番号を1つ減らす
        const row = parseInt(parsed[0], 10)
        newCellTypes[getCellKey(row, col - 1)] = cellTypes[key]
      }
    })
    Object.keys(cellFormats).forEach(key => {
      const parsed = key.split('-')
      const col = parseInt(parsed[1], 10)
      if (col !== index && col < index) {
        newCellFormats[key] = cellFormats[key]
      } else if (col > index) {
        const row = parseInt(parsed[0], 10)
        newCellFormats[getCellKey(row, col - 1)] = cellFormats[key]
      }
    })
    
    setTableData(newData)
    setTableHeaders(newHeaders)
    setCellTypes(newCellTypes)
    setCellFormats(newCellFormats)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined,
        cellTypes: newCellTypes,
        cellFormats: newCellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // 行を上に挿入
  const insertRowAbove = (index: number) => {
    if (!item || !onUpdateItem) return
    const colCount = tableData[0]?.length || 2
    const newRow = Array(colCount).fill('')
    const newData = [...tableData.slice(0, index), newRow, ...tableData.slice(index)]
    setTableData(newData)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // 行を下に挿入
  const insertRowBelow = (index: number) => {
    if (!item || !onUpdateItem) return
    const colCount = tableData[0]?.length || 2
    const newRow = Array(colCount).fill('')
    const newData = [...tableData.slice(0, index + 1), newRow, ...tableData.slice(index + 1)]
    setTableData(newData)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // 行を複製
  const duplicateRow = (index: number) => {
    if (!item || !onUpdateItem) return
    const duplicatedRow = [...tableData[index]]
    const newData = [...tableData.slice(0, index + 1), duplicatedRow, ...tableData.slice(index + 1)]
    
    // 複製された行のセルタイプとフォーマットも複製
    const newCellTypes = { ...cellTypes }
    const newCellFormats = { ...cellFormats }
    const colCount = tableData[0]?.length || 0
    for (let col = 0; col < colCount; col++) {
      const sourceKey = getCellKey(index, col)
      const targetKey = getCellKey(index + 1, col)
      if (cellTypes[sourceKey]) {
        newCellTypes[targetKey] = cellTypes[sourceKey]
      }
      if (cellFormats[sourceKey]) {
        newCellFormats[targetKey] = cellFormats[sourceKey]
      }
    }
    
    setTableData(newData)
    setCellTypes(newCellTypes)
    setCellFormats(newCellFormats)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes: newCellTypes,
        cellFormats: newCellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // 行のコンテンツをクリア
  const clearRowContents = (index: number) => {
    if (!item || !onUpdateItem) return
    const newData = [...tableData]
    newData[index] = newData[index].map(() => '')
    setTableData(newData)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // 列を左に挿入
  const insertColumnLeft = (index: number) => {
    if (!item || !onUpdateItem) return
    const newData = tableData.map(row => [...row.slice(0, index), '', ...row.slice(index)])
    const newHeaders = [...tableHeaders.slice(0, index), '', ...tableHeaders.slice(index)]
    
    // 列の挿入に伴い、セルタイプとフォーマットのキーを更新
    const newCellTypes: Record<string, CellDataType> = {}
    const newCellFormats: Record<string, CellFormat> = {}
    Object.keys(cellTypes).forEach(key => {
      const parsed = key.split('-')
      const col = parseInt(parsed[1], 10)
      if (col < index) {
        newCellTypes[key] = cellTypes[key]
      } else {
        const row = parseInt(parsed[0], 10)
        newCellTypes[getCellKey(row, col + 1)] = cellTypes[key]
      }
    })
    Object.keys(cellFormats).forEach(key => {
      const parsed = key.split('-')
      const col = parseInt(parsed[1], 10)
      if (col < index) {
        newCellFormats[key] = cellFormats[key]
      } else {
        const row = parseInt(parsed[0], 10)
        newCellFormats[getCellKey(row, col + 1)] = cellFormats[key]
      }
    })
    
    setTableData(newData)
    setTableHeaders(newHeaders)
    setCellTypes(newCellTypes)
    setCellFormats(newCellFormats)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined,
        cellTypes: newCellTypes,
        cellFormats: newCellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // 列を右に挿入
  const insertColumnRight = (index: number) => {
    if (!item || !onUpdateItem) return
    const newData = tableData.map(row => [...row.slice(0, index + 1), '', ...row.slice(index + 1)])
    const newHeaders = [...tableHeaders.slice(0, index + 1), '', ...tableHeaders.slice(index + 1)]
    
    // 列の挿入に伴い、セルタイプとフォーマットのキーを更新
    const newCellTypes: Record<string, CellDataType> = {}
    const newCellFormats: Record<string, CellFormat> = {}
    Object.keys(cellTypes).forEach(key => {
      const parsed = key.split('-')
      const col = parseInt(parsed[1], 10)
      if (col <= index) {
        newCellTypes[key] = cellTypes[key]
      } else {
        const row = parseInt(parsed[0], 10)
        newCellTypes[getCellKey(row, col + 1)] = cellTypes[key]
      }
    })
    Object.keys(cellFormats).forEach(key => {
      const parsed = key.split('-')
      const col = parseInt(parsed[1], 10)
      if (col <= index) {
        newCellFormats[key] = cellFormats[key]
      } else {
        const row = parseInt(parsed[0], 10)
        newCellFormats[getCellKey(row, col + 1)] = cellFormats[key]
      }
    })
    
    setTableData(newData)
    setTableHeaders(newHeaders)
    setCellTypes(newCellTypes)
    setCellFormats(newCellFormats)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined,
        cellTypes: newCellTypes,
        cellFormats: newCellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // 列を複製
  const duplicateColumn = (index: number) => {
    if (!item || !onUpdateItem) return
    const newData = tableData.map(row => [...row.slice(0, index + 1), row[index], ...row.slice(index + 1)])
    const newHeaders = [...tableHeaders.slice(0, index + 1), tableHeaders[index], ...tableHeaders.slice(index + 1)]
    
    // 複製された列のセルタイプとフォーマットも複製
    const newCellTypes: Record<string, CellDataType> = {}
    const newCellFormats: Record<string, CellFormat> = {}
    Object.keys(cellTypes).forEach(key => {
      const parsed = key.split('-')
      const col = parseInt(parsed[1], 10)
      if (col <= index) {
        newCellTypes[key] = cellTypes[key]
      } else {
        const row = parseInt(parsed[0], 10)
        newCellTypes[getCellKey(row, col + 1)] = cellTypes[key]
      }
      // 複製元の列のセルタイプを複製先にも設定
      if (col === index) {
        const row = parseInt(parsed[0], 10)
        newCellTypes[getCellKey(row, index + 1)] = cellTypes[key]
      }
    })
    Object.keys(cellFormats).forEach(key => {
      const parsed = key.split('-')
      const col = parseInt(parsed[1], 10)
      if (col <= index) {
        newCellFormats[key] = cellFormats[key]
      } else {
        const row = parseInt(parsed[0], 10)
        newCellFormats[getCellKey(row, col + 1)] = cellFormats[key]
      }
      // 複製元の列のフォーマットを複製先にも設定
      if (col === index) {
        const row = parseInt(parsed[0], 10)
        newCellFormats[getCellKey(row, index + 1)] = cellFormats[key]
      }
    })
    
    setTableData(newData)
    setTableHeaders(newHeaders)
    setCellTypes(newCellTypes)
    setCellFormats(newCellFormats)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined,
        cellTypes: newCellTypes,
        cellFormats: newCellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // 列のコンテンツをクリア
  const clearColumnContents = (index: number) => {
    if (!item || !onUpdateItem) return
    const newData = tableData.map(row => {
      const newRow = [...row]
      newRow[index] = ''
      return newRow
    })
    const newHeaders = [...tableHeaders]
    if (useHeaders) {
      newHeaders[index] = ''
    }
    setTableData(newData)
    setTableHeaders(newHeaders)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // 行の非表示/表示を切り替え
  const toggleRowVisibility = (index: number) => {
    if (!item || !onUpdateItem) return
    const newHiddenRows = hiddenRows.includes(index)
      ? hiddenRows.filter(i => i !== index)
      : [...hiddenRows, index]
    setHiddenRows(newHiddenRows)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, { hiddenRows: newHiddenRows } as Partial<TableItem>)
    }
  }

  // 列の非表示/表示を切り替え
  const toggleColumnVisibility = (index: number) => {
    if (!item || !onUpdateItem) return
    const newHiddenColumns = hiddenColumns.includes(index)
      ? hiddenColumns.filter(i => i !== index)
      : [...hiddenColumns, index]
    setHiddenColumns(newHiddenColumns)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, { hiddenColumns: newHiddenColumns } as Partial<TableItem>)
    }
  }

  // すべての非表示行を表示
  const showAllRows = () => {
    if (!item || !onUpdateItem) return
    setHiddenRows([])
    if (item.type === 'table') {
      onUpdateItem(item.id, { hiddenRows: [] } as Partial<TableItem>)
    }
  }

  // すべての非表示列を表示
  const showAllColumns = () => {
    if (!item || !onUpdateItem) return
    setHiddenColumns([])
    if (item.type === 'table') {
      onUpdateItem(item.id, { hiddenColumns: [] } as Partial<TableItem>)
    }
  }

  // グリップアイコンのクリックハンドラ
  const handleGripClick = (e: React.MouseEvent, type: 'row' | 'column', index: number) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({
      type,
      index,
      x: rect.left,
      y: rect.bottom + 4
    })
  }

  // 行削除（メニューから）
  const handleDeleteRow = (index: number) => {
    removeTableRow(index)
    setContextMenu(null)
  }

  // 列削除（メニューから）
  const handleDeleteColumn = (index: number) => {
    removeTableColumn(index)
    setContextMenu(null)
  }

  // セル選択ハンドラ
  const handleCellSelect = (row: number, col: number, isHeader: boolean = false) => {
    setSelectedCell({ row, col, isHeader })
  }

  // 数式バーからの値変更ハンドラ
  const handleFormulaBarChange = (value: string) => {
    if (!selectedCell || !item || !onUpdateItem) return
    
    if (selectedCell.isHeader) {
      // ヘッダーセルの場合
      const newHeaders = [...tableHeaders]
      newHeaders[selectedCell.col] = value
      setTableHeaders(newHeaders)
      
      if (item.type === 'table') {
        onUpdateItem(item.id, {
          data: tableData,
          headers: useHeaders ? newHeaders : undefined,
          cellTypes,
          cellFormats,
          mergedCells
        } as Partial<TableItem>)
      }
    } else {
      // データセルの場合
      handleTableCellChange(selectedCell.row, selectedCell.col, value)
    }
  }

  // データ型のアイコンとラベルを取得
  const getDataTypeInfo = (type: CellDataType): { icon: string; label: string } => {
    switch (type) {
      case 'text': return { icon: 'notes', label: 'テキスト' }
      case 'number': return { icon: 'tag', label: '数値' }
      case 'date': return { icon: 'calendar_today', label: '日付' }
      case 'percentage': return { icon: 'percent', label: 'パーセント' }
      case 'currency': return { icon: 'currency_yen', label: '通貨' }
      default: return { icon: 'notes', label: 'テキスト' }
    }
  }

  // 選択中のセルの値を取得（生の値、数式バー用）
  const getSelectedCellValue = (): string => {
    if (!selectedCell) return ''
    
    if (selectedCell.isHeader) {
      return tableHeaders[selectedCell.col] || ''
    } else {
      // 数式の場合は生の値を返す（数式バーで編集可能にするため）
      const rawValue = tableData[selectedCell.row]?.[selectedCell.col] || ''
      return rawValue
    }
  }
  
  // セルのデータ型を設定
  const handleSetCellType = (rowIndex: number, colIndex: number, type: CellDataType) => {
    if (!item || !onUpdateItem) return
    const cellKey = getCellKey(rowIndex, colIndex)
    const newCellTypes = { ...cellTypes, [cellKey]: type }
    setCellTypes(newCellTypes)
    
    // デフォルトフォーマットを設定
    if (type !== 'text') {
      const newCellFormats = { ...cellFormats, [cellKey]: getDefaultCellFormat(type) }
      setCellFormats(newCellFormats)
      
      if (item.type === 'table') {
        onUpdateItem(item.id, {
          cellTypes: newCellTypes,
          cellFormats: newCellFormats
        } as Partial<TableItem>)
      }
    } else {
      if (item.type === 'table') {
        onUpdateItem(item.id, {
          cellTypes: newCellTypes
        } as Partial<TableItem>)
      }
    }
  }
  
  // セルのフォーマットを設定
  const handleSetCellFormat = (rowIndex: number, colIndex: number, format: CellFormat) => {
    if (!item || !onUpdateItem) return
    const cellKey = getCellKey(rowIndex, colIndex)
    const newCellFormats = { ...cellFormats, [cellKey]: format }
    setCellFormats(newCellFormats)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        cellFormats: newCellFormats
      } as Partial<TableItem>)
    }
  }
  
  // 列全体のフォーマットを設定
  const handleSetColumnFormat = (colIndex: number, format: CellFormat) => {
    if (!item || !onUpdateItem) return
    const newCellFormats = { ...cellFormats }
    
    // 列全体のすべてのセルにフォーマットを適用
    for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
      const cellKey = getCellKey(rowIndex, colIndex)
      newCellFormats[cellKey] = format
    }
    
    setCellFormats(newCellFormats)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        cellFormats: newCellFormats
      } as Partial<TableItem>)
    }
  }
  
  // 列全体のデータ型を設定
  const handleSetColumnType = (colIndex: number, newType: CellDataType) => {
    if (!item || !onUpdateItem) return
    const newCellTypes = { ...cellTypes }
    const newCellFormats = { ...cellFormats }
    
    // 列全体のすべてのセルにデータ型とデフォルトフォーマットを適用
    for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
      const cellKey = getCellKey(rowIndex, colIndex)
      newCellTypes[cellKey] = newType
      if (newType !== 'text') {
        newCellFormats[cellKey] = getDefaultCellFormat(newType)
      }
    }
    
    setCellTypes(newCellTypes)
    setCellFormats(newCellFormats)
    setFormatDialogDataType(newType)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        cellTypes: newCellTypes,
        cellFormats: newCellFormats
      } as Partial<TableItem>)
    }
  }
  
  // 列全体のデータ型を自動推測
  const handleInferColumnType = (colIndex: number) => {
    if (!item || !onUpdateItem) return
    const newCellTypes = { ...cellTypes }
    const newCellFormats = { ...cellFormats }
    
    // 列全体のセルのデータ型を自動推測
    for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
      const cellKey = getCellKey(rowIndex, colIndex)
      const value = tableData[rowIndex]?.[colIndex] || ''
      if (value) {
        newCellTypes[cellKey] = inferCellDataType(value)
        // デフォルトフォーマットも設定
        const inferredType = newCellTypes[cellKey]
        if (inferredType !== 'text') {
          newCellFormats[cellKey] = getDefaultCellFormat(inferredType)
        }
      }
    }
    
    setCellTypes(newCellTypes)
    setCellFormats(newCellFormats)
    
    // 列の最初のセルの型をダイアログの選択状態に反映
    const firstCellKey = getCellKey(0, colIndex)
    const firstCellType = newCellTypes[firstCellKey] || 'text'
    setFormatDialogDataType(firstCellType)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, { 
        cellTypes: newCellTypes,
        cellFormats: newCellFormats
      } as Partial<TableItem>)
    }
  }
  
  // セル結合
  const handleMergeCells = (startRow: number, startCol: number, endRow: number, endCol: number) => {
    if (!item || !onUpdateItem) return
    
    const rowSpan = endRow - startRow + 1
    const colSpan = endCol - startCol + 1
    
    if (rowSpan === 1 && colSpan === 1) return
    
    const newMergedCells = [...mergedCells, {
      row: startRow,
      col: startCol,
      rowSpan,
      colSpan
    }]
    
    setMergedCells(newMergedCells)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        mergedCells: newMergedCells
      } as Partial<TableItem>)
    }
  }
  
  // セル結合解除
  const handleUnmergeCell = (row: number, col: number) => {
    if (!item || !onUpdateItem) return
    
    const newMergedCells = mergedCells.filter(merged => 
      !(merged.row === row && merged.col === col)
    )
    
    setMergedCells(newMergedCells)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        mergedCells: newMergedCells
      } as Partial<TableItem>)
    }
  }
  
  // セルが結合されているかチェック
  const isCellMerged = (row: number, col: number): { row: number; col: number; rowSpan: number; colSpan: number } | null => {
    return mergedCells.find(merged => {
      return row >= merged.row && row < merged.row + merged.rowSpan &&
             col >= merged.col && col < merged.col + merged.colSpan
    }) || null
  }
  
  // セルが結合の開始セルかチェック
  const isMergeStartCell = (row: number, col: number): boolean => {
    return mergedCells.some(merged => merged.row === row && merged.col === col)
  }

  const handleUseHeadersChange = (checked: boolean) => {
    if (!item || !onUpdateItem) return
    setUseHeaders(checked)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: tableData,
        headers: checked ? tableHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  const handleTextContentChange = (value: string) => {
    setTextContent(value)
  }

  const handleTextContentBlur = () => {
    if (!item || !onUpdateItem) return
    if (item.type === 'text' && textContent.trim() !== (item as TextItem).content) {
      onUpdateItem(item.id, { content: textContent } as Partial<TextItem>)
    }
  }

  const handleImageAltChange = (value: string) => {
    setImageAlt(value)
  }

  const handleImageAltBlur = () => {
    if (!item || !onUpdateItem) return
    if (item.type === 'image') {
      const imageItem = item as ImageItem
      if (imageAlt !== (imageItem.alt || '')) {
        onUpdateItem(item.id, { alt: imageAlt } as Partial<ImageItem>)
      }
    }
  }

  const handleImageDisplayModeChange = (mode: ImageDisplayMode) => {
    if (!item || !onUpdateItem) return
    setImageDisplayMode(mode)
    
    // 即座に保存
    if (item.type === 'image') {
      setDisplayMode(mode)
      onUpdateItem(item.id, { displayMode: mode } as Partial<ImageItem>)
    }
  }

  if (!item) {
    return (
      <div className="item-detail-panel empty">
        <div className="item-detail-empty">
          <span className="material-icons">inventory_2</span>
          <p>Select an item to view details</p>
        </div>
      </div>
    )
  }

  // メインスライドの場合はエディタにフォーカス
  if (item.id === MAIN_SLIDE_ITEM_ID) {
    return (
      <div className="item-detail-panel">
        <div className="item-detail-content">
          <div className="item-detail-preview">
            <p>This is the main slide content. Edit it in the editor.</p>
            <button
              className="item-detail-action-button edit"
              onClick={() => onEdit(item)}
              style={{ marginTop: '1rem' }}
            >
              <span className="material-icons">edit</span>
              Focus Editor
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getEditUI = () => {
    switch (item.type) {
      case 'table':
        const tableEditorContent = (
          <div className="table-editor-modern">
            {/* ヘッダー切り替えトグル */}
            <div className="table-editor-toolbar">
              <label className="table-header-toggle">
                <input
                  type="checkbox"
                  checked={useHeaders}
                  onChange={(e) => handleUseHeadersChange(e.target.checked)}
                />
                <span className="toggle-switch"></span>
                <span className="toggle-label">ヘッダー行を使用</span>
              </label>
            </div>

            {/* 数式バーとデータ型選択 */}
            <div className="table-formula-bar">
              <div className="table-formula-fx-label">fx</div>
              <input
                type="text"
                className="table-formula-input"
                value={getSelectedCellValue()}
                onChange={(e) => handleFormulaBarChange(e.target.value)}
                onFocus={() => {
                  // 数式バーにフォーカスがあるときも選択中のセルを維持
                  // selectedCellが既に設定されている場合はそのまま維持
                }}
                placeholder={selectedCell ? "セルの内容を入力（例: =SUM(A1:A5)）..." : "セルを選択してください"}
                disabled={!selectedCell}
              />
              {selectedCell && !selectedCell.isHeader && (
                <div className="table-cell-type-selector">
                  <div className="table-type-dropdown">
                    <button 
                      className="table-type-dropdown-trigger"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowTypeDropdown(!showTypeDropdown)
                      }}
                    >
                      <span className="material-icons">{getDataTypeInfo(cellTypes[getCellKey(selectedCell.row, selectedCell.col)] || 'text').icon}</span>
                      <span className="material-icons table-type-dropdown-arrow">expand_more</span>
                    </button>
                    {showTypeDropdown && (
                      <div className="table-type-dropdown-menu">
                        {(['text', 'number', 'date', 'percentage', 'currency'] as CellDataType[]).map((type) => {
                          const typeInfo = getDataTypeInfo(type)
                          const isSelected = (cellTypes[getCellKey(selectedCell.row, selectedCell.col)] || 'text') === type
                          return (
                            <button
                              key={type}
                              className={`table-type-dropdown-item ${isSelected ? 'selected' : ''}`}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleSetCellType(selectedCell.row, selectedCell.col, type)
                                setShowTypeDropdown(false)
                              }}
                            >
                              <span className="material-icons">{typeInfo.icon}</span>
                              <span>{typeInfo.label}</span>
                              {isSelected && <span className="material-icons table-type-check">check</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {(cellTypes[getCellKey(selectedCell.row, selectedCell.col)] || 'text') !== 'text' && (
                    <button
                      className="table-format-button"
                      onClick={() => {
                        setFormatDialogCell({ row: selectedCell.row, col: selectedCell.col })
                        setShowFormatDialog(true)
                      }}
                      title="フォーマット設定"
                    >
                      <span className="material-icons">format_color_text</span>
                    </button>
                  )}
                </div>
              )}
              
              {/* セル範囲が選択されている場合、結合/結合解除ボタンを表示 */}
              {cellRangeSelection.start && cellRangeSelection.end && (
                <div className="table-merge-controls">
                  {(() => {
                    const minRow = Math.min(cellRangeSelection.start.row, cellRangeSelection.end.row)
                    const maxRow = Math.max(cellRangeSelection.start.row, cellRangeSelection.end.row)
                    const minCol = Math.min(cellRangeSelection.start.col, cellRangeSelection.end.col)
                    const maxCol = Math.max(cellRangeSelection.start.col, cellRangeSelection.end.col)
                    const isMultipleCells = (maxRow - minRow + 1) * (maxCol - minCol + 1) > 1
                    const isMerged = isMergeStartCell(minRow, minCol)
                    
                    if (isMerged) {
                      // 結合セルを選択している場合、結合解除ボタン
                      return (
                        <button
                          className="table-merge-action-button unmerge"
                          onClick={() => {
                            handleUnmergeCell(minRow, minCol)
                            setCellRangeSelection({ start: null, end: null })
                          }}
                          title="セル結合を解除"
                        >
                          <span className="material-icons">call_split</span>
                          <span>結合解除</span>
                        </button>
                      )
                    } else if (isMultipleCells) {
                      // 複数セルを選択している場合、結合ボタン
                      return (
                        <button
                          className="table-merge-action-button merge"
                          onClick={() => {
                            handleMergeCells(minRow, minCol, maxRow, maxCol)
                            setCellRangeSelection({ start: null, end: null })
                          }}
                          title="選択範囲を結合"
                        >
                          <span className="material-icons">merge_type</span>
                          <span>セル結合</span>
                        </button>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
            </div>
            
            {/* スプレッドシート風テーブル */}
            <div className="table-scroll-container">
              <div className="table-scroll-viewport" ref={tableScrollViewportRef}>
            <div className="table-spreadsheet-grid">
              {/* テーブル本体 */}
              <div className="table-spreadsheet-container">
                <table className="table-spreadsheet" style={{ width: tableWidthPx, minWidth: tableWidthPx }}>
                  <thead>
                    {/* 列ヘッダー（A, B, C...） */}
                    <tr className="table-col-headers">
                      <th className="table-corner"></th>
                      {(tableData[0] || []).map((_, colIndex) => {
                        // 列のデータ型を取得（最初のセルのデータ型）
                        const firstCellKey = getCellKey(0, colIndex)
                        const colType = cellTypes[firstCellKey] || 'text'
                        const isColumnHidden = hiddenColumns.includes(colIndex)
                        return (
                        <th key={colIndex} className={`table-col-header ${isColumnHidden ? 'hidden-column' : ''}`}>
                          <button
                            className="table-grip-icon column-grip"
                            onClick={(e) => handleGripClick(e, 'column', colIndex)}
                            title="列オプション"
                          >
                            <span className="material-icons">drag_indicator</span>
                          </button>
                          <span className="table-col-label">{String.fromCharCode(65 + colIndex)}</span>
                            {colType !== 'text' && (
                              <span className="table-col-type-badge" title={`列のデータ型: ${colType}`}>
                                {colType === 'number' ? '#' : colType === 'date' ? '📅' : colType === 'percentage' ? '%' : '¥'}
                              </span>
                            )}
                        </th>
                        )
                      })}
                    </tr>

                    {/* ヘッダー行（オプション） */}
                    {useHeaders && (
                      <tr className="table-header-row">
                        <th className="table-row-number">
                          <span>H</span>
                        </th>
                        {tableHeaders.map((header, colIndex) => {
                          const isColumnHidden = hiddenColumns.includes(colIndex)
                          return (
                          <th 
                            key={colIndex} 
                            className={`table-header-cell ${selectedCell?.isHeader && selectedCell?.col === colIndex ? 'table-cell-selected' : ''} ${isColumnHidden ? 'hidden-column' : ''}`}
                          >
                            <input
                              type="text"
                              value={header}
                              onChange={(e) => handleTableHeaderChange(colIndex, e.target.value)}
                              onFocus={() => handleCellSelect(-1, colIndex, true)}
                              placeholder={`ヘッダー ${colIndex + 1}`}
                              className="table-input table-header-input"
                            />
                          </th>
                          )
                        })}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {/* データ行 */}
                    {tableData.map((row, rowIndex) => {
                      const isRowHidden = hiddenRows.includes(rowIndex)
                      return (
                      <tr key={rowIndex} className={`table-data-row ${isRowHidden ? 'hidden-row' : ''}`}>
                        <td className={`table-row-number ${isRowHidden ? 'hidden-row' : ''}`}>
                          <button
                            className="table-grip-icon row-grip"
                            onClick={(e) => handleGripClick(e, 'row', rowIndex)}
                            title="行オプション"
                          >
                            <span className="material-icons">drag_indicator</span>
                          </button>
                          <span className="table-row-label">{rowIndex + 1}</span>
                        </td>
                        {row.map((cell, colIndex) => {
                          const merged = isCellMerged(rowIndex, colIndex)
                          const isStartCell = isMergeStartCell(rowIndex, colIndex)
                          const cellKey = getCellKey(rowIndex, colIndex)
                          const cellType = cellTypes[cellKey] || 'text'
                          const hasError = validationErrors[cellKey]
                          const displayValue = getCellDisplayValue(rowIndex, colIndex)
                          const isColumnHidden = hiddenColumns.includes(colIndex)
                          
                          // 結合セルの場合、開始セル以外は非表示
                          if (merged && !isStartCell) {
                            return null
                          }
                          
                          return (
                          <td 
                            key={colIndex} 
                              className={`table-data-cell ${selectedCell && !selectedCell.isHeader && selectedCell.row === rowIndex && selectedCell.col === colIndex ? 'table-cell-selected' : ''} ${hasError ? 'table-cell-error' : ''} ${isRowHidden ? 'hidden-row' : ''} ${isColumnHidden ? 'hidden-column' : ''} ${cellRangeSelection.start && cellRangeSelection.end && (
                                (rowIndex >= Math.min(cellRangeSelection.start.row, cellRangeSelection.end.row) && 
                                 rowIndex <= Math.max(cellRangeSelection.start.row, cellRangeSelection.end.row) &&
                                 colIndex >= Math.min(cellRangeSelection.start.col, cellRangeSelection.end.col) &&
                                 colIndex <= Math.max(cellRangeSelection.start.col, cellRangeSelection.end.col))
                              ) ? 'table-cell-range-selected' : ''}`}
                              rowSpan={merged ? merged.rowSpan : undefined}
                              colSpan={merged ? merged.colSpan : undefined}
                              onMouseDown={(e) => {
                                // セル入力フィールドのクリックは無視
                                if ((e.target as HTMLElement).tagName === 'INPUT') return
                                
                                // Shiftキーが押されている場合、範囲選択のみ（ドラッグ開始なし）
                                if (e.shiftKey && cellRangeSelection.start) {
                                  e.preventDefault()
                                  setCellRangeSelection({
                                    start: cellRangeSelection.start,
                                    end: { row: rowIndex, col: colIndex }
                                  })
                                  return
                                }
                                
                                // 通常のマウスダウン：ドラッグ選択を開始
                                e.preventDefault()
                                setIsDragging(true)
                                setCellRangeSelection({ 
                                  start: { row: rowIndex, col: colIndex }, 
                                  end: { row: rowIndex, col: colIndex } 
                                })
                              }}
                              onMouseEnter={() => {
                                if (isDragging && cellRangeSelection.start) {
                                  setCellRangeSelection({ ...cellRangeSelection, end: { row: rowIndex, col: colIndex } })
                                }
                              }}
                              onMouseUp={() => {
                                if (isDragging) {
                                  setIsDragging(false)
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                const rect = e.currentTarget.getBoundingClientRect()
                                setContextMenu({
                                  type: 'cell',
                                  index: 0,
                                  cellRow: rowIndex,
                                  cellCol: colIndex,
                                  x: rect.right,
                                  y: rect.top
                                })
                              }}
                            >
                              <div 
                                className="table-cell-wrapper"
                                onMouseDown={(e) => {
                                  // input要素のクリックは無視
                                  if ((e.target as HTMLElement).tagName === 'INPUT') return
                                  
                                  // Shiftキーが押されている場合、範囲選択のみ（ドラッグ開始なし）
                                  if (e.shiftKey && cellRangeSelection.start) {
                                    e.preventDefault()
                                    setCellRangeSelection({
                                      start: cellRangeSelection.start,
                                      end: { row: rowIndex, col: colIndex }
                                    })
                                    return
                                  }
                                  
                                  // 通常のマウスダウン：ドラッグ選択を開始
                                  e.preventDefault()
                                  setIsDragging(true)
                                  setCellRangeSelection({ 
                                    start: { row: rowIndex, col: colIndex }, 
                                    end: { row: rowIndex, col: colIndex } 
                                  })
                                }}
                                onMouseEnter={() => {
                                  if (isDragging && cellRangeSelection.start) {
                                    setCellRangeSelection({ ...cellRangeSelection, end: { row: rowIndex, col: colIndex } })
                                  }
                                }}
                                onMouseUp={() => {
                                  if (isDragging) {
                                    setIsDragging(false)
                                  }
                                }}
                          >
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleTableCellChange(rowIndex, colIndex, e.target.value)}
                              onFocus={() => handleCellSelect(rowIndex, colIndex, false)}
                              placeholder=""
                                  className={`table-input ${cellType !== 'text' ? `table-input-${cellType}` : ''} ${cell && cell.trim().startsWith('=') ? 'table-input-formula' : ''}`}
                                />
                                {cell && cellType !== 'text' && !cell.trim().startsWith('=') && (
                                  <span className="table-cell-formatted-value" title={displayValue}>
                                    {displayValue}
                                  </span>
                                )}
                                {cell && cell.trim().startsWith('=') && (
                                  <span className="table-cell-formula-result" title={displayValue}>
                                    {displayValue}
                                  </span>
                                )}
                                {hasError && (
                                  <span className="table-cell-error-icon" title={hasError}>
                                    <span className="material-icons">error</span>
                                  </span>
                                )}
                                {cellType && cellType !== 'text' && (
                                  <div className="table-cell-type-badge" title={`データ型: ${cellType === 'number' ? '数値' : cellType === 'date' ? '日付' : cellType === 'percentage' ? 'パーセント' : '通貨'}`}>
                                    {cellType === 'number' ? '#' : cellType === 'date' ? '📅' : cellType === 'percentage' ? '%' : cellType === 'currency' ? '¥' : ''}
                                  </div>
                                )}
                              </div>
                          </td>
                          )
                        })}
                      </tr>
                    )})}
                  
                  </tbody>
                </table>
              </div>
              {/* 列追加ボタン */}
              <div className="table-add-col-container">
                <button onClick={addTableColumn} className="table-add-col-btn">
                  <span className="material-icons">add</span>
                  <span>列を追加</span>
                </button>
              </div>
              {/* 行追加ボタン */}
              <div className="table-add-row-container">
                <button onClick={addTableRow} className="table-add-row-btn">
                  <span className="material-icons">add</span>
                  <span>行を追加</span>
                </button>
              </div>
                </div>
              </div>
            </div>

            {/* フォーマット設定ダイアログ */}
            {showFormatDialog && (formatDialogCell || formatDialogColumn !== null) && (
              <div className="table-format-dialog-overlay" onClick={() => {
                setShowFormatDialog(false)
                setFormatDialogCell(null)
                setFormatDialogColumn(null)
              }}>
                <div className="table-format-dialog" onClick={(e) => e.stopPropagation()}>
                  <div className="table-format-dialog-header">
                    <h3>{formatDialogColumn !== null ? '列の設定' : 'セルのフォーマット設定'}</h3>
                    <button className="table-format-dialog-close" onClick={() => {
                      setShowFormatDialog(false)
                      setFormatDialogCell(null)
                      setFormatDialogColumn(null)
                    }}>
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                  <div className="table-format-dialog-content">
                    {(() => {
                      // 列全体の設定の場合
                      if (formatDialogColumn !== null) {
                        const currentFormat = cellFormats[getCellKey(0, formatDialogColumn)] || getDefaultCellFormat(formatDialogDataType)
                        
                        return (
                          <>
                            {/* データ型選択セクション */}
                            <div className="table-format-section">
                              <label className="table-format-section-label">データ型</label>
                              
                              {/* データ型自動推測ボタン */}
                              <button
                                className="table-auto-infer-button"
                                onClick={() => handleInferColumnType(formatDialogColumn)}
                              >
                                <span className="material-icons">auto_awesome</span>
                                <span>データ型を自動推測</span>
                              </button>
                              
                              <div className="table-datatype-selector">
                                {(['text', 'number', 'date', 'percentage', 'currency'] as CellDataType[]).map((type) => (
                                  <button
                                    key={type}
                                    className={`table-datatype-button ${formatDialogDataType === type ? 'active' : ''}`}
                                    onClick={() => handleSetColumnType(formatDialogColumn, type)}
                                  >
                                    <span className="table-datatype-icon material-icons">
                                      {type === 'text' ? 'notes' : type === 'number' ? 'tag' : type === 'date' ? 'calendar_today' : type === 'percentage' ? 'percent' : 'currency_yen'}
                                    </span>
                                    <span className="table-datatype-label">
                                      {type === 'text' ? 'テキスト' : type === 'number' ? '数値' : type === 'date' ? '日付' : type === 'percentage' ? 'パーセント' : '通貨'}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* フォーマット詳細セクション */}
                            {formatDialogDataType !== 'text' && (
                              <>
                                <div className="table-format-divider"></div>
                                <div className="table-format-section">
                                  <label className="table-format-section-label">フォーマット詳細</label>
                                  {formatDialogDataType === 'number' ? (
                                    <>
                                      <label>小数点桁数</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={currentFormat.decimalPlaces ?? 2}
                                        onChange={(e) => handleSetColumnFormat(formatDialogColumn, {
                                          ...currentFormat,
                                          decimalPlaces: parseInt(e.target.value) || 0
                                        })}
                                      />
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={currentFormat.useThousandsSeparator ?? true}
                                          onChange={(e) => handleSetColumnFormat(formatDialogColumn, {
                                            ...currentFormat,
                                            useThousandsSeparator: e.target.checked
                                          })}
                                        />
                                        千の位区切りを使用
                                      </label>
                                    </>
                                  ) : formatDialogDataType === 'date' ? (
                                    <>
                                      <label>日付フォーマット</label>
                                      <select
                                        value={currentFormat.dateFormat || 'YYYY-MM-DD'}
                                        onChange={(e) => handleSetColumnFormat(formatDialogColumn, {
                                          ...currentFormat,
                                          dateFormat: e.target.value
                                        })}
                                      >
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                      </select>
                                    </>
                                  ) : formatDialogDataType === 'currency' ? (
                                    <>
                                      <label>通貨記号</label>
                                      <select
                                        value={currentFormat.currencySymbol || '¥'}
                                        onChange={(e) => handleSetColumnFormat(formatDialogColumn, {
                                          ...currentFormat,
                                          currencySymbol: e.target.value
                                        })}
                                      >
                                        <option value="¥">¥ (円)</option>
                                        <option value="$">$ (ドル)</option>
                                        <option value="€">€ (ユーロ)</option>
                                        <option value="£">£ (ポンド)</option>
                                      </select>
                                      <label>表示単位</label>
                                      <select
                                        value={currentFormat.currencyScale || 'none'}
                                        onChange={(e) => handleSetColumnFormat(formatDialogColumn, {
                                          ...currentFormat,
                                          currencyScale: e.target.value as 'none' | 'thousand' | 'million' | 'billion'
                                        })}
                                      >
                                        <option value="none">なし</option>
                                        <option value="thousand">千</option>
                                        <option value="million">百万</option>
                                        <option value="billion">十億</option>
                                      </select>
                                      <label>小数点桁数</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={currentFormat.decimalPlaces ?? 2}
                                        onChange={(e) => handleSetColumnFormat(formatDialogColumn, {
                                          ...currentFormat,
                                          decimalPlaces: parseInt(e.target.value) || 0
                                        })}
                                      />
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={currentFormat.useThousandsSeparator ?? true}
                                          onChange={(e) => handleSetColumnFormat(formatDialogColumn, {
                                            ...currentFormat,
                                            useThousandsSeparator: e.target.checked
                                          })}
                                        />
                                        千の位区切りを使用
                                      </label>
                                    </>
                                  ) : formatDialogDataType === 'percentage' ? (
                                    <>
                                      <label>小数点桁数</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={currentFormat.percentageDecimalPlaces ?? 2}
                                        onChange={(e) => handleSetColumnFormat(formatDialogColumn, {
                                          ...currentFormat,
                                          percentageDecimalPlaces: parseInt(e.target.value) || 0
                                        })}
                                      />
                                    </>
                                  ) : null}
                                </div>
                              </>
                            )}
                          </>
                        )
                      }
                      
                      // 単一セルのフォーマット設定の場合
                      if (!formatDialogCell) return null
                      const cellKey = getCellKey(formatDialogCell.row, formatDialogCell.col)
                      const cellType = cellTypes[cellKey] || 'text'
                      const currentFormat = cellFormats[cellKey] || getDefaultCellFormat(cellType)
                      
                      if (cellType === 'number') {
                        return (
                          <>
                            <label>小数点桁数</label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={currentFormat.decimalPlaces ?? 2}
                              onChange={(e) => handleSetCellFormat(formatDialogCell.row, formatDialogCell.col, {
                                ...currentFormat,
                                decimalPlaces: parseInt(e.target.value) || 0
                              })}
                            />
                            <label>
                              <input
                                type="checkbox"
                                checked={currentFormat.useThousandsSeparator ?? true}
                                onChange={(e) => handleSetCellFormat(formatDialogCell.row, formatDialogCell.col, {
                                  ...currentFormat,
                                  useThousandsSeparator: e.target.checked
                                })}
                              />
                              千の位区切りを使用
                            </label>
                          </>
                        )
                      } else if (cellType === 'date') {
                        return (
                          <>
                            <label>日付フォーマット</label>
                            <select
                              value={currentFormat.dateFormat || 'YYYY-MM-DD'}
                              onChange={(e) => handleSetCellFormat(formatDialogCell.row, formatDialogCell.col, {
                                ...currentFormat,
                                dateFormat: e.target.value
                              })}
                            >
                              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                              <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            </select>
                          </>
                        )
                      } else if (cellType === 'currency') {
                        return (
                          <>
                            <label>通貨記号</label>
                            <select
                              value={currentFormat.currencySymbol || '¥'}
                              onChange={(e) => handleSetCellFormat(formatDialogCell.row, formatDialogCell.col, {
                                ...currentFormat,
                                currencySymbol: e.target.value
                              })}
                            >
                              <option value="¥">¥ (円)</option>
                              <option value="$">$ (ドル)</option>
                              <option value="€">€ (ユーロ)</option>
                              <option value="£">£ (ポンド)</option>
                            </select>
                            <label>表示単位</label>
                            <select
                              value={currentFormat.currencyScale || 'none'}
                              onChange={(e) => handleSetCellFormat(formatDialogCell.row, formatDialogCell.col, {
                                ...currentFormat,
                                currencyScale: e.target.value as 'none' | 'thousand' | 'million' | 'billion'
                              })}
                            >
                              <option value="none">なし</option>
                              <option value="thousand">千</option>
                              <option value="million">百万</option>
                              <option value="billion">十億</option>
                            </select>
                            <label>小数点桁数</label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={currentFormat.decimalPlaces ?? 2}
                              onChange={(e) => handleSetCellFormat(formatDialogCell.row, formatDialogCell.col, {
                                ...currentFormat,
                                decimalPlaces: parseInt(e.target.value) || 0
                              })}
                            />
                            <label>
                              <input
                                type="checkbox"
                                checked={currentFormat.useThousandsSeparator ?? true}
                                onChange={(e) => handleSetCellFormat(formatDialogCell.row, formatDialogCell.col, {
                                  ...currentFormat,
                                  useThousandsSeparator: e.target.checked
                                })}
                              />
                              千の位区切りを使用
                            </label>
                          </>
                        )
                      } else if (cellType === 'percentage') {
                        return (
                          <>
                            <label>小数点桁数</label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={currentFormat.percentageDecimalPlaces ?? 2}
                              onChange={(e) => handleSetCellFormat(formatDialogCell.row, formatDialogCell.col, {
                                ...currentFormat,
                                percentageDecimalPlaces: parseInt(e.target.value) || 0
                              })}
                            />
                          </>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* コンテキストメニュー */}
            {contextMenu && (
              <div 
                className="table-context-menu"
                style={{ 
                  position: 'fixed',
                  left: contextMenu.x,
                  top: contextMenu.y,
                  zIndex: 1000
                }}
              >
                {contextMenu.type === 'cell' && contextMenu.cellRow !== undefined && contextMenu.cellCol !== undefined ? (
                  <>
                    {isMergeStartCell(contextMenu.cellRow, contextMenu.cellCol) ? (
                      <button 
                        className="table-context-menu-item" 
                        onClick={() => {
                          handleUnmergeCell(contextMenu.cellRow!, contextMenu.cellCol!)
                          setContextMenu(null)
                        }}
                      >
                        <span className="material-icons">call_split</span>
                        セル結合を解除
                      </button>
                    ) : (
                      <button 
                        className="table-context-menu-item" 
                        onClick={() => {
                          // 選択範囲を結合（簡易版：単一セルから開始）
                          const merged = isCellMerged(contextMenu.cellRow!, contextMenu.cellCol!)
                          if (merged) {
                            handleMergeCells(merged.row, merged.col, merged.row + merged.rowSpan - 1, merged.col + merged.colSpan - 1)
                          } else {
                            handleMergeCells(contextMenu.cellRow!, contextMenu.cellCol!, contextMenu.cellRow!, contextMenu.cellCol!)
                          }
                          setContextMenu(null)
                        }}
                      >
                        <span className="material-icons">merge_type</span>
                        セルを結合
                      </button>
                    )}
                    <div className="table-context-menu-divider" />
                    <div className="table-context-menu-submenu">
                      <span className="table-context-menu-label">データ型を設定:</span>
                      {(['text', 'number', 'date', 'percentage', 'currency'] as CellDataType[]).map((type) => (
                        <button
                          key={type}
                          className={`table-context-menu-item ${cellTypes[getCellKey(contextMenu.cellRow!, contextMenu.cellCol!)] === type ? 'active' : ''}`}
                          onClick={() => {
                            handleSetCellType(contextMenu.cellRow!, contextMenu.cellCol!, type)
                            setContextMenu(null)
                          }}
                        >
                          {type === 'text' ? 'テキスト' : type === 'number' ? '数値' : type === 'date' ? '日付' : type === 'percentage' ? 'パーセント' : '通貨'}
                        </button>
                      ))}
                    </div>
                    <div className="table-context-menu-divider" />
                    <button 
                      className="table-context-menu-item" 
                      onClick={() => {
                        setFormatDialogCell({ row: contextMenu.cellRow!, col: contextMenu.cellCol! })
                        setFormatDialogColumn(null)
                        setShowFormatDialog(true)
                        setContextMenu(null)
                      }}
                    >
                      <span className="material-icons">settings</span>
                      セルのフォーマット設定
                    </button>
                  </>
                ) : contextMenu.type === 'row' ? (
                  <>
                    <button className="table-context-menu-item" onClick={() => insertRowAbove(contextMenu.index)}>
                      <span className="material-icons">arrow_upward</span>
                      上に行を挿入
                    </button>
                    <button className="table-context-menu-item" onClick={() => insertRowBelow(contextMenu.index)}>
                      <span className="material-icons">arrow_downward</span>
                      下に行を挿入
                    </button>
                    <div className="table-context-menu-divider" />
                    <button className="table-context-menu-item" onClick={() => duplicateRow(contextMenu.index)}>
                      <span className="material-icons">content_copy</span>
                      複製
                    </button>
                    <button className="table-context-menu-item" onClick={() => clearRowContents(contextMenu.index)}>
                      <span className="material-icons">backspace</span>
                      コンテンツをクリア
                    </button>
                    <div className="table-context-menu-divider" />
                    <button className="table-context-menu-item" onClick={() => toggleRowVisibility(contextMenu.index)}>
                      <span className="material-icons">{hiddenRows.includes(contextMenu.index) ? 'visibility' : 'visibility_off'}</span>
                      {hiddenRows.includes(contextMenu.index) ? '行を表示' : '行を非表示'}
                    </button>
                    {hiddenRows.length > 0 && (
                      <button className="table-context-menu-item" onClick={showAllRows}>
                        <span className="material-icons">visibility</span>
                        すべての行を表示
                      </button>
                    )}
                    {tableData.length > 1 && (
                      <>
                        <div className="table-context-menu-divider" />
                        <button className="table-context-menu-item danger" onClick={() => handleDeleteRow(contextMenu.index)}>
                          <span className="material-icons">delete</span>
                          削除
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <button className="table-context-menu-item" onClick={() => insertColumnLeft(contextMenu.index)}>
                      <span className="material-icons">arrow_back</span>
                      左に列を挿入
                    </button>
                    <button className="table-context-menu-item" onClick={() => insertColumnRight(contextMenu.index)}>
                      <span className="material-icons">arrow_forward</span>
                      右に列を挿入
                    </button>
                    <div className="table-context-menu-divider" />
                    <button className="table-context-menu-item" onClick={() => duplicateColumn(contextMenu.index)}>
                      <span className="material-icons">content_copy</span>
                      複製
                    </button>
                    <button className="table-context-menu-item" onClick={() => clearColumnContents(contextMenu.index)}>
                      <span className="material-icons">backspace</span>
                      コンテンツをクリア
                    </button>
                    <div className="table-context-menu-divider" />
                    <button className="table-context-menu-item" onClick={() => toggleColumnVisibility(contextMenu.index)}>
                      <span className="material-icons">{hiddenColumns.includes(contextMenu.index) ? 'visibility' : 'visibility_off'}</span>
                      {hiddenColumns.includes(contextMenu.index) ? '列を表示' : '列を非表示'}
                    </button>
                    {hiddenColumns.length > 0 && (
                      <button className="table-context-menu-item" onClick={showAllColumns}>
                        <span className="material-icons">visibility</span>
                        すべての列を表示
                      </button>
                    )}
                    {tableData[0]?.length > 1 && (
                      <>
                        <div className="table-context-menu-divider" />
                        <button className="table-context-menu-item danger" onClick={() => handleDeleteColumn(contextMenu.index)}>
                          <span className="material-icons">delete</span>
                          削除
                        </button>
                      </>
                    )}
                    <div className="table-context-menu-divider" />
                    <button 
                      className="table-context-menu-item" 
                      onClick={() => {
                        setFormatDialogCell(null)
                        setFormatDialogColumn(contextMenu.index)
                        // 列の最初のセルのデータ型を初期値として設定
                        const firstCellKey = getCellKey(0, contextMenu.index)
                        const currentType = cellTypes[firstCellKey] || 'text'
                        setFormatDialogDataType(currentType)
                        setShowFormatDialog(true)
                        setContextMenu(null)
                      }}
                    >
                      <span className="material-icons">settings</span>
                      列の設定
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )
        
        // 拡大表示の場合、モーダルで表示
        if (isTableExpanded) {
          return (
            <div className="table-expand-overlay" onClick={() => setIsTableExpanded(false)}>
              <div className="table-expand-content" onClick={(e) => e.stopPropagation()}>
                <div className="table-expand-header">
                  <h3>{item.name}</h3>
                  <button
                    className="table-expand-close"
                    onClick={() => setIsTableExpanded(false)}
                    title="閉じる"
                  >
                    <span className="material-icons">close</span>
                  </button>
                </div>
                {tableEditorContent}
              </div>
            </div>
          )
        }
        
        return tableEditorContent

      case 'image':
        return (
          <div className="item-detail-edit-content">
            <div className="item-detail-edit-field">
              <label>Image *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`item-image-upload-button ${imageDataUrl ? 'item-image-change-button' : ''}`}
              >
                <span className="material-icons">upload</span>
                {imageDataUrl ? 'Change Image' : 'Upload Image'}
              </button>
              
              {imageDataUrl && !showCropTool && (
                  <div className="item-image-preview">
                    <img src={imageDataUrl} alt="Preview" />
                  </div>
              )}

              {imageDataUrl && showCropTool && (
                <div className="item-image-crop-container">
                  <ReactCrop
                    crop={crop}
                    onChange={c => setCrop(c)}
                    onComplete={c => setCompletedCrop(c)}
                  >
                    <img
                      ref={imageRef}
                      src={imageDataUrl}
                      alt="Crop preview"
                      style={{ maxWidth: '100%' }}
                    />
                  </ReactCrop>
                  <div className="item-image-crop-actions">
                    <button onClick={handleCancelCrop} className="item-detail-action-button secondary">
                      Cancel
                    </button>
                    <button onClick={handleApplyCrop} className="item-detail-action-button primary">
                      Apply Crop
                    </button>
                  </div>
                </div>
              )}

              <label htmlFor="image-alt-edit">Alt Text</label>
              <input
                id="image-alt-edit"
                type="text"
                value={imageAlt}
                onChange={(e) => handleImageAltChange(e.target.value)}
                onBlur={handleImageAltBlur}
                placeholder="Enter alt text (optional)"
              />
            </div>
          </div>
        )
      
      case 'text':
        return (
          <div className="item-detail-edit-content">
            <div className="item-detail-edit-field">
              <label htmlFor="text-content-edit">Content *</label>
              <textarea
                id="text-content-edit"
                value={textContent}
                onChange={(e) => handleTextContentChange(e.target.value)}
                onBlur={handleTextContentBlur}
                placeholder="Enter text content..."
                rows={10}
              />
          </div>
          </div>
        )
      
      default:
        return null
    }
  }

  // Table用の操作ハンドラ
  const handleTableOperation = (operation: string, ...args: unknown[]) => {
    switch (operation) {
      case 'addRow':
        addTableRow()
        break
      case 'deleteRow':
        if (selectedCell && !selectedCell.isHeader) {
          removeTableRow(selectedCell.row)
        }
        break
      case 'addColumn':
        addTableColumn()
        break
      case 'deleteColumn':
        if (selectedCell) {
          removeTableColumn(selectedCell.col)
        }
        break
      case 'mergeCells':
        if (cellRangeSelection.start && cellRangeSelection.end) {
          const minRow = Math.min(cellRangeSelection.start.row, cellRangeSelection.end.row)
          const maxRow = Math.max(cellRangeSelection.start.row, cellRangeSelection.end.row)
          const minCol = Math.min(cellRangeSelection.start.col, cellRangeSelection.end.col)
          const maxCol = Math.max(cellRangeSelection.start.col, cellRangeSelection.end.col)
          handleMergeCells(minRow, minCol, maxRow, maxCol)
          setCellRangeSelection({ start: null, end: null })
        }
        break
      case 'unmergeCells':
        if (selectedCell && !selectedCell.isHeader) {
          handleUnmergeCell(selectedCell.row, selectedCell.col)
        }
        break
      case 'formatCells':
        if (selectedCell && !selectedCell.isHeader) {
          setFormatDialogCell({ row: selectedCell.row, col: selectedCell.col })
          setShowFormatDialog(true)
        }
        break
      case 'toggleExpand':
        setIsTableExpanded(!isTableExpanded)
        break
      case 'setDisplayFormat':
        const format = args[0] as TableDisplayFormat
        if (format && item && item.type === 'table' && onUpdateItem) {
          setTableDisplayFormat(format)
          onUpdateItem(item.id, { displayFormat: format } as Partial<TableItem>)
        }
        break
      case 'showAllRows':
        showAllRows()
        break
      case 'showAllColumns':
        showAllColumns()
        break
    }
  }

  // Image用の操作ハンドラ
  const handleImageOperation = (operation: string, ...args: unknown[]) => {
    switch (operation) {
      case 'toggleCrop':
        setShowCropTool(!showCropTool)
        break
      case 'setDisplayMode':
        if (args[0] === 'contain' || args[0] === 'cover') {
          handleImageDisplayModeChange(args[0])
        }
        break
    }
  }

  // セル選択状態からFloatingNavBar用の情報を取得
  const getTableState = () => {
    const hasSelection = !!selectedCell
    const canMerge = cellRangeSelection.start && cellRangeSelection.end && 
      (cellRangeSelection.start.row !== cellRangeSelection.end.row || 
       cellRangeSelection.start.col !== cellRangeSelection.end.col)
    const canUnmerge = selectedCell && !selectedCell.isHeader && 
      isMergeStartCell(selectedCell.row, selectedCell.col)
    return { 
      hasSelection, 
      canMerge: !!canMerge, 
      canUnmerge: !!canUnmerge, 
      isExpanded: isTableExpanded,
      displayFormat: tableDisplayFormat,
      hiddenRowsCount: hiddenRows.length,
      hiddenColumnsCount: hiddenColumns.length
    }
  }

  // Image状態を取得
  const getImageState = () => {
    return {
      displayMode: imageDisplayMode,
      isCropping: showCropTool
    }
  }

  return (
    <div className="item-detail-panel" style={{ position: 'relative' }}>
      {/* Content */}
      <div className="item-detail-content">
        <div className="item-detail-edit">
          {getEditUI()}
        </div>
      </div>


      {/* Floating Bottom Navigation Bar */}
      {item.type === 'table' && (
        <div
          className="pointer-events-none"
          style={{ 
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40
          }}
        >
          <div className="pointer-events-auto">
            <FloatingNavBar
              itemType="table"
              onTableOperation={handleTableOperation}
              tableState={getTableState()}
            />
          </div>
        </div>
      )}
      {item.type === 'image' && (
        <div
          className="pointer-events-none"
          style={{ 
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40
          }}
        >
          <div className="pointer-events-auto">
            <FloatingNavBar
              itemType="image"
              onImageOperation={handleImageOperation}
              imageState={getImageState()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
