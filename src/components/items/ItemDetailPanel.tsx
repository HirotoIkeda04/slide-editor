import { useState, useEffect, useRef } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import type { Item, TableItem, ImageItem, TextItem, SlideItem, ImageDisplayMode, CellDataType, CellFormat, MergedCell } from '../../types'
import { cropImage } from '../../utils/imageProcessing'
import { 
  getCellKey, 
  parseCellValue, 
  formatCellValue, 
  validateCellValue, 
  getDefaultCellFormat,
  inferCellDataType
} from '../../utils/tableUtils'
import { FormulaEvaluator } from '../../utils/formulaEvaluator'
import { indexToColumnName } from '../../utils/formulaParser'

const MAIN_SLIDE_ITEM_ID = 'main-slide'

interface ItemDetailPanelProps {
  item: Item | null
  onEdit: (item: Item) => void
  onDelete: (itemId: string) => void
  onInsert: (item: Item) => void
  onClose: () => void
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void
  existingNames?: string[] // 名前の重複チェック用
}

export const ItemDetailPanel = ({ 
  item, 
  onEdit, 
  onDelete, 
  onInsert, 
  onClose, 
  onUpdateItem,
  existingNames = []
}: ItemDetailPanelProps) => {
  const [displayMode, setDisplayMode] = useState<ImageDisplayMode>('contain')

  // Table specific state
  const [tableData, setTableData] = useState<string[][]>([['', ''], ['', '']])
  const [tableHeaders, setTableHeaders] = useState<string[]>(['', ''])
  const [useHeaders, setUseHeaders] = useState(false)
  
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
    type: 'row' | 'column'
    index: number
    x: number
    y: number
  } | null>(null)

  // Selected cell state for formula bar
  const [selectedCell, setSelectedCell] = useState<{
    row: number
    col: number
    isHeader: boolean
  } | null>(null)

  // Selected range state for multiple cell selection
  const [selectedRange, setSelectedRange] = useState<{
    startRow: number
    startCol: number
    endRow: number
    endCol: number
    isHeader: boolean
  } | null>(null)

  // Selection mode: 'single' | 'range'
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single')

  // Sort and filter state
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterColumn, setFilterColumn] = useState<number | null>(null)
  const [filterValue, setFilterValue] = useState<string>('')

  // Cell types and formats state
  const [cellTypes, setCellTypes] = useState<Record<string, CellDataType>>({})
  const [cellFormats, setCellFormats] = useState<Record<string, CellFormat>>({})
  const [mergedCells, setMergedCells] = useState<MergedCell[]>([])

  // アイテムが変更されたら編集状態を初期化
  useEffect(() => {
    if (item) {
      initializeEditState(item)
      if (item.type === 'image') {
        const imageItem = item as ImageItem
        setDisplayMode(imageItem.displayMode || 'contain')
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

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // テーブルが表示されていない場合は無視
      if (!item || item.type !== 'table') return
      
      // 入力フィールドにフォーカスがある場合は、特定のキーのみ処理
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      
      // セルが選択されていない場合は無視
      if (!selectedCell) return
      
      // Escape: セル選択解除
      if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedCell(null)
        return
      }
      
      // 入力フィールドにフォーカスがある場合、EnterとTabのみ処理
      if (isInputFocused) {
        // Enter: 下のセルへ（Shift+Enter: 上のセルへ）
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          moveToCell(selectedCell.row + 1, selectedCell.col, selectedCell.isHeader)
          return
        }
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault()
          moveToCell(selectedCell.row - 1, selectedCell.col, selectedCell.isHeader)
          return
        }
        
        // Tab: 次のセルへ（Shift+Tab: 前のセルへ）
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault()
          const nextCol = selectedCell.col + 1
          if (nextCol < tableData[0]?.length) {
            moveToCell(selectedCell.row, nextCol, selectedCell.isHeader)
          } else {
            // 次の行の最初のセルへ
            moveToCell(selectedCell.row + 1, 0, selectedCell.isHeader)
          }
          return
        }
        if (e.key === 'Tab' && e.shiftKey) {
          e.preventDefault()
          const prevCol = selectedCell.col - 1
          if (prevCol >= 0) {
            moveToCell(selectedCell.row, prevCol, selectedCell.isHeader)
          } else {
            // 前の行の最後のセルへ
            const prevRow = selectedCell.row - 1
            if (prevRow >= 0) {
              moveToCell(prevRow, tableData[prevRow]?.length - 1 || 0, selectedCell.isHeader)
            }
          }
          return
        }
        
        // その他のキーは入力フィールドのデフォルト動作を許可
        return
      }
      
      // 入力フィールドにフォーカスがない場合、キーボードナビゲーションを処理
      // 矢印キー: セル間移動
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveToCell(selectedCell.row - 1, selectedCell.col, selectedCell.isHeader)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveToCell(selectedCell.row + 1, selectedCell.col, selectedCell.isHeader)
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        moveToCell(selectedCell.row, selectedCell.col - 1, selectedCell.isHeader)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        moveToCell(selectedCell.row, selectedCell.col + 1, selectedCell.isHeader)
        return
      }
      
      // Enter: 下のセルへ（編集モードに入る）
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        moveToCell(selectedCell.row + 1, selectedCell.col, selectedCell.isHeader)
        // セルの入力フィールドにフォーカス
        setTimeout(() => {
          const cellInput = document.querySelector(
            `.table-data-cell input[data-row="${selectedCell.row + 1}"][data-col="${selectedCell.col}"]`
          ) as HTMLInputElement
          cellInput?.focus()
        }, 0)
        return
      }
      
      // F2: 編集モードに入る
      if (e.key === 'F2') {
        e.preventDefault()
        if (selectedCell && !selectedCell.isHeader) {
          const cellInput = document.querySelector(
            `.table-data-cell input[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`
          ) as HTMLInputElement
          cellInput?.focus()
          cellInput?.select()
        }
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, tableData, item])

  // セルに移動する関数
  const moveToCell = (row: number, col: number, isHeader: boolean) => {
    if (!tableData.length || !tableData[0]?.length) return
    
    // 範囲チェック
    if (isHeader) {
      if (col < 0 || col >= tableHeaders.length) return
      setSelectedCell({ row: -1, col, isHeader: true })
    } else {
      if (row < 0 || row >= tableData.length) return
      if (col < 0 || col >= tableData[0].length) return
      setSelectedCell({ row, col, isHeader: false })
    }
  }

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

  const handleTableCellChange = (rowIndex: number, colIndex: number, value: string) => {
    if (!item || !onUpdateItem) return
    
    // データ型が未設定の場合、値を推測して設定
    const cellKey = getCellKey(rowIndex, colIndex)
    if (!cellTypes[cellKey] && value.trim() !== '') {
      const inferredType = inferCellDataType(value)
      if (inferredType !== 'text') {
        const newCellTypes = { ...cellTypes, [cellKey]: inferredType }
        setCellTypes(newCellTypes)
        const defaultFormat = getDefaultCellFormat(inferredType)
        const newCellFormats = { ...cellFormats, [cellKey]: defaultFormat }
        setCellFormats(newCellFormats)
        
        // 推測された型でフォーマット
        const parsedValue = parseCellValue(value, inferredType)
        const formattedValue = formatCellValue(parsedValue, inferredType, defaultFormat)
        const newData = [...tableData]
        newData[rowIndex][colIndex] = formattedValue
        setTableData(newData)
        
        if (item.type === 'table') {
          onUpdateItem(item.id, {
            data: newData,
            headers: useHeaders ? tableHeaders : undefined,
            cellTypes: newCellTypes,
            cellFormats: newCellFormats
          } as Partial<TableItem>)
        }
        return
      }
    }
    
    // データ型が設定されている場合、フォーマットを適用
    const dataType = cellTypes[cellKey] || 'text'
    const format = cellFormats[cellKey]
    const parsedValue = parseCellValue(value, dataType)
    const formattedValue = formatCellValue(parsedValue, dataType, format)
    
    const newData = [...tableData]
    newData[rowIndex][colIndex] = formattedValue
    setTableData(newData)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes,
        cellFormats
      } as Partial<TableItem>)
    }
  }

  const handleTableHeaderChange = (colIndex: number, value: string) => {
    if (!item || !onUpdateItem) return
    const newHeaders = [...tableHeaders]
    newHeaders[colIndex] = value
    setTableHeaders(newHeaders)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: tableData,
        headers: useHeaders ? newHeaders : undefined,
        cellTypes,
        cellFormats
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
        headers: useHeaders ? tableHeaders : undefined
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
        headers: useHeaders ? newHeaders : undefined
      } as Partial<TableItem>)
    }
  }

  const removeTableRow = (index: number) => {
    if (!item || !onUpdateItem) return
    if (tableData.length <= 1) return
    const newData = tableData.filter((_, i) => i !== index)
    setTableData(newData)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined
      } as Partial<TableItem>)
    }
  }

  const removeTableColumn = (index: number) => {
    if (!item || !onUpdateItem) return
    if (tableData[0]?.length <= 1) return
    const newData = tableData.map(row => row.filter((_, i) => i !== index))
    const newHeaders = tableHeaders.filter((_, i) => i !== index)
    setTableData(newData)
    setTableHeaders(newHeaders)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined
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
        headers: useHeaders ? tableHeaders : undefined
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
        headers: useHeaders ? tableHeaders : undefined
      } as Partial<TableItem>)
    }
  }

  // 行を複製
  const duplicateRow = (index: number) => {
    if (!item || !onUpdateItem) return
    const duplicatedRow = [...tableData[index]]
    const newData = [...tableData.slice(0, index + 1), duplicatedRow, ...tableData.slice(index + 1)]
    setTableData(newData)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined
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
        headers: useHeaders ? tableHeaders : undefined
      } as Partial<TableItem>)
    }
  }

  // 列を左に挿入
  const insertColumnLeft = (index: number) => {
    if (!item || !onUpdateItem) return
    const newData = tableData.map(row => [...row.slice(0, index), '', ...row.slice(index)])
    const newHeaders = [...tableHeaders.slice(0, index), '', ...tableHeaders.slice(index)]
    setTableData(newData)
    setTableHeaders(newHeaders)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined
      } as Partial<TableItem>)
    }
  }

  // 列を右に挿入
  const insertColumnRight = (index: number) => {
    if (!item || !onUpdateItem) return
    const newData = tableData.map(row => [...row.slice(0, index + 1), '', ...row.slice(index + 1)])
    const newHeaders = [...tableHeaders.slice(0, index + 1), '', ...tableHeaders.slice(index + 1)]
    setTableData(newData)
    setTableHeaders(newHeaders)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined
      } as Partial<TableItem>)
    }
  }

  // 列を複製
  const duplicateColumn = (index: number) => {
    if (!item || !onUpdateItem) return
    const newData = tableData.map(row => [...row.slice(0, index + 1), row[index], ...row.slice(index + 1)])
    const newHeaders = [...tableHeaders.slice(0, index + 1), tableHeaders[index], ...tableHeaders.slice(index + 1)]
    setTableData(newData)
    setTableHeaders(newHeaders)
    setContextMenu(null)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? newHeaders : undefined
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
        headers: useHeaders ? newHeaders : undefined
      } as Partial<TableItem>)
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

  // コンテキストメニューを閉じる
  const closeContextMenu = () => {
    setContextMenu(null)
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
    setSelectedRange(null)
    setSelectionMode('single')
  }

  // 範囲選択の開始
  const handleCellMouseDown = (row: number, col: number, isHeader: boolean, e: React.MouseEvent) => {
    if (e.shiftKey && selectedCell) {
      // Shift+クリック: 範囲選択を拡張
      setSelectedRange({
        startRow: selectedCell.row,
        startCol: selectedCell.col,
        endRow: row,
        endCol: col,
        isHeader: isHeader || selectedCell.isHeader
      })
      setSelectionMode('range')
    } else {
      // 通常のクリック: 単一セル選択
      setSelectedCell({ row, col, isHeader })
      setSelectedRange(null)
      setSelectionMode('single')
    }
  }

  // 範囲選択のドラッグ処理
  const handleCellMouseEnter = (row: number, col: number, isHeader: boolean, e: React.MouseEvent) => {
    if (e.buttons === 1 && selectedCell) {
      // マウスドラッグ中: 範囲選択を拡張
      setSelectedRange({
        startRow: selectedCell.row,
        startCol: selectedCell.col,
        endRow: row,
        endCol: col,
        isHeader: isHeader || selectedCell.isHeader
      })
      setSelectionMode('range')
    }
  }

  // 範囲内のセルかどうかを判定
  const isCellInRange = (row: number, col: number): boolean => {
    if (!selectedRange) return false
    
    const minRow = Math.min(selectedRange.startRow, selectedRange.endRow)
    const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow)
    const minCol = Math.min(selectedRange.startCol, selectedRange.endCol)
    const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol)
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
  }

  // セルが結合されているかどうかを判定
  const isCellMerged = (row: number, col: number): MergedCell | null => {
    return mergedCells.find(m => 
      row >= m.row && row < m.row + m.rowSpan &&
      col >= m.col && col < m.col + m.colSpan
    ) || null
  }

  // セルが結合セルの開始位置かどうかを判定
  const isMergedCellStart = (row: number, col: number): boolean => {
    return mergedCells.some(m => m.row === row && m.col === col)
  }

  // セルを結合
  const mergeCells = () => {
    if (!item || !onUpdateItem) return
    
    if (selectedRange) {
      const minRow = Math.min(selectedRange.startRow, selectedRange.endRow)
      const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow)
      const minCol = Math.min(selectedRange.startCol, selectedRange.endCol)
      const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol)
      
      const rowSpan = maxRow - minRow + 1
      const colSpan = maxCol - minCol + 1
      
      // 既存の結合セルと重複していないかチェック
      const overlaps = mergedCells.some(m => {
        return !(maxRow < m.row || minRow >= m.row + m.rowSpan ||
                 maxCol < m.col || minCol >= m.col + m.colSpan)
      })
      
      if (overlaps) {
        alert('既に結合されているセルと重複しています')
        return
      }
      
      // 結合セルを追加
      const newMergedCells = [...mergedCells, {
        row: minRow,
        col: minCol,
        rowSpan,
        colSpan
      }]
      
      setMergedCells(newMergedCells)
      
      // 結合されたセルの値を最初のセルの値に統一
      const firstCellValue = tableData[minRow]?.[minCol] || ''
      const newData = tableData.map((row, rIdx) => 
        row.map((cell, cIdx) => {
          if (rIdx >= minRow && rIdx <= maxRow && cIdx >= minCol && cIdx <= maxCol) {
            return rIdx === minRow && cIdx === minCol ? firstCellValue : ''
          }
          return cell
        })
      )
      setTableData(newData)
      
      if (item.type === 'table') {
        onUpdateItem(item.id, {
          data: newData,
          headers: useHeaders ? tableHeaders : undefined,
          cellTypes,
          cellFormats,
          mergedCells: newMergedCells
        } as Partial<TableItem>)
      }
    } else if (selectedCell && !selectedCell.isHeader) {
      // 単一セル選択の場合は結合解除
      unmergeCell(selectedCell.row, selectedCell.col)
    }
  }

  // セルの結合を解除
  const unmergeCell = (row: number, col: number) => {
    if (!item || !onUpdateItem) return
    
    const mergedCell = isCellMerged(row, col)
    if (!mergedCell) return
    
    // 結合セルを削除
    const newMergedCells = mergedCells.filter(m => 
      !(m.row === mergedCell.row && m.col === mergedCell.col)
    )
    
    setMergedCells(newMergedCells)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: tableData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells: newMergedCells
      } as Partial<TableItem>)
    }
  }

  // 列でソート
  const handleSortColumn = (colIndex: number) => {
    if (!item || !onUpdateItem) return
    
    const newDirection = sortColumn === colIndex && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortColumn(colIndex)
    setSortDirection(newDirection)
    
    const sortedData = [...tableData].sort((a, b) => {
      const aVal = a[colIndex] || ''
      const bVal = b[colIndex] || ''
      
      // 数値として比較を試みる
      const aNum = parseFloat(aVal)
      const bNum = parseFloat(bVal)
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return newDirection === 'asc' ? aNum - bNum : bNum - aNum
      }
      
      // 文字列として比較
      return newDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
    
    setTableData(sortedData)
    
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: sortedData,
        headers: useHeaders ? tableHeaders : undefined,
        cellTypes,
        cellFormats,
        mergedCells
      } as Partial<TableItem>)
    }
  }

  // フィルタリングされた行のインデックスを取得
  const getFilteredRowIndices = (): number[] => {
    if (filterColumn === null || !filterValue.trim()) {
      return tableData.map((_, idx) => idx)
    }
    
    return tableData
      .map((row, idx) => {
        const cellValue = row[filterColumn] || ''
        return cellValue.toLowerCase().includes(filterValue.toLowerCase()) ? idx : -1
      })
      .filter(idx => idx >= 0)
  }

  // 表示用の行インデックス
  const filteredRowIndices = getFilteredRowIndices()

  // セルのデータ型を取得
  const getCellDataType = (row: number, col: number, isHeader: boolean): CellDataType => {
    if (isHeader) return 'text' // ヘッダーは常にテキスト
    const cellKey = getCellKey(row, col)
    return cellTypes[cellKey] || 'text'
  }

  // セルのフォーマットを取得
  const getCellFormat = (row: number, col: number, isHeader: boolean): CellFormat | undefined => {
    if (isHeader) return undefined
    const cellKey = getCellKey(row, col)
    return cellFormats[cellKey]
  }

  // セルの値をフォーマットして取得
  const getFormattedCellValue = (row: number, col: number, isHeader: boolean): string => {
    if (isHeader) {
      return tableHeaders[col] || ''
    }
    const rawValue = tableData[row]?.[col] || ''
    if (!rawValue) return ''
    
    // 数式の場合は評価
    if (rawValue.trim().startsWith('=')) {
      const evaluator = new FormulaEvaluator(
        tableData,
        cellTypes,
        (r, c) => {
          const cellKey = getCellKey(r, c)
          return {
            value: tableData[r]?.[c] || '',
            type: cellTypes[cellKey] || 'text'
          }
        }
      )
      const result = evaluator.evaluate(rawValue)
      if (typeof result === 'number') {
        const dataType = getCellDataType(row, col, false)
        const format = getCellFormat(row, col, false)
        return formatCellValue(result, dataType, format)
      }
      return String(result)
    }
    
    const dataType = getCellDataType(row, col, false)
    const format = getCellFormat(row, col, false)
    
    // パースしてフォーマット
    const parsedValue = parseCellValue(rawValue, dataType)
    return formatCellValue(parsedValue, dataType, format)
  }

  // セルのデータ型を設定
  const setCellDataType = (row: number, col: number, type: CellDataType) => {
    if (!item || !onUpdateItem) return
    
    const cellKey = getCellKey(row, col)
    const newCellTypes = { ...cellTypes, [cellKey]: type }
    setCellTypes(newCellTypes)
    
    // デフォルトフォーマットを設定
    const defaultFormat = getDefaultCellFormat(type)
    const newCellFormats = { ...cellFormats, [cellKey]: defaultFormat }
    setCellFormats(newCellFormats)
    
    // 既存の値を新しいデータ型に変換
    const rawValue = tableData[row]?.[col] || ''
    if (rawValue) {
      const parsedValue = parseCellValue(rawValue, type)
      const formattedValue = formatCellValue(parsedValue, type, defaultFormat)
      const newData = [...tableData]
      newData[row][col] = formattedValue
      setTableData(newData)
      
      if (item.type === 'table') {
        onUpdateItem(item.id, {
          data: newData,
          headers: useHeaders ? tableHeaders : undefined,
          cellTypes: newCellTypes,
          cellFormats: newCellFormats
        } as Partial<TableItem>)
      }
    } else {
      if (item.type === 'table') {
        onUpdateItem(item.id, {
          data: tableData,
          headers: useHeaders ? tableHeaders : undefined,
          cellTypes: newCellTypes,
          cellFormats: newCellFormats
        } as Partial<TableItem>)
      }
    }
  }

  // 数式バーからの値変更ハンドラ
  const handleFormulaBarChange = (value: string) => {
    if (!selectedCell || !item || !onUpdateItem) return
    
    // データ型に応じたバリデーション
    const dataType = getCellDataType(selectedCell.row, selectedCell.col, selectedCell.isHeader)
    if (!validateCellValue(value, dataType) && value !== '') {
      // バリデーションエラーは警告のみ（入力は許可）
      console.warn(`Invalid value for ${dataType} type: ${value}`)
    }
    
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
          cellFormats
        } as Partial<TableItem>)
      }
    } else {
      // データセルの場合
      const newData = [...tableData]
      // データ型に応じてパースしてから保存
      const parsedValue = parseCellValue(value, dataType)
      const format = getCellFormat(selectedCell.row, selectedCell.col, false)
      const formattedValue = formatCellValue(parsedValue, dataType, format)
      newData[selectedCell.row][selectedCell.col] = formattedValue
      setTableData(newData)
      
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
  }

  // 選択中のセルの値を取得（表示用）
  const getSelectedCellValue = (): string => {
    if (!selectedCell) return ''
    
    // フォーマット済みの値を返す
    return getFormattedCellValue(selectedCell.row, selectedCell.col, selectedCell.isHeader)
  }

  // 選択中のセルの生の値を取得（編集用）
  const getSelectedCellRawValue = (): string => {
    if (!selectedCell) return ''
    
    if (selectedCell.isHeader) {
      return tableHeaders[selectedCell.col] || ''
    } else {
      return tableData[selectedCell.row]?.[selectedCell.col] || ''
    }
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
        cellFormats
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
        const colCount = tableData[0]?.length || 2
        return (
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

            {/* 数式バー */}
            <div className="table-formula-bar">
              <div className="table-formula-bar-content">
                {/* データ型選択 */}
                {selectedCell && !selectedCell.isHeader && (
                  <select
                    className="table-data-type-select"
                    value={getCellDataType(selectedCell.row, selectedCell.col, false)}
                    onChange={(e) => setCellDataType(selectedCell.row, selectedCell.col, e.target.value as CellDataType)}
                    title="データ型を選択"
                  >
                    <option value="text">テキスト</option>
                    <option value="number">数値</option>
                    <option value="date">日付</option>
                    <option value="percentage">パーセント</option>
                    <option value="currency">通貨</option>
                  </select>
                )}
                {/* 結合・分割ボタン */}
                {selectedCell && !selectedCell.isHeader && (
                  <>
                    {isCellMerged(selectedCell.row, selectedCell.col) ? (
                      <button
                        className="table-merge-button"
                        onClick={() => unmergeCell(selectedCell.row, selectedCell.col)}
                        title="セルの結合を解除"
                      >
                        <span className="material-icons">call_split</span>
                      </button>
                    ) : (
                      <button
                        className="table-merge-button"
                        onClick={mergeCells}
                        disabled={!selectedRange && !selectedCell}
                        title="セルを結合"
                      >
                        <span className="material-icons">merge_type</span>
                      </button>
                    )}
                  </>
                )}
                <input
                  type="text"
                  className="table-formula-input"
                  value={getSelectedCellValue()}
                  onChange={(e) => handleFormulaBarChange(e.target.value)}
                  onFocus={() => {
                    // 数式バーにフォーカスがあるときも選択中のセルを維持
                    // selectedCellが既に設定されている場合はそのまま維持
                  }}
                  placeholder={selectedCell ? "セルの内容を入力..." : "セルを選択してください"}
                  disabled={!selectedCell}
                />
              </div>
            </div>
            
            {/* スプレッドシート風テーブル */}
            <div className="table-spreadsheet-grid">
              {/* テーブル本体 */}
              <div className="table-spreadsheet-container">
                <table className="table-spreadsheet">
                  <thead>
                    {/* 列ヘッダー（A, B, C...） */}
                    <tr className="table-col-headers">
                      <th className="table-corner"></th>
                      {(tableData[0] || []).map((_, colIndex) => (
                        <th key={colIndex} className="table-col-header">
                          <button
                            className="table-grip-icon column-grip"
                            onClick={(e) => handleGripClick(e, 'column', colIndex)}
                            title="列オプション"
                          >
                            <span className="material-icons">drag_indicator</span>
                          </button>
                          <span className="table-col-label">{String.fromCharCode(65 + colIndex)}</span>
                          <div className="table-col-actions">
                            <button
                              className={`table-sort-button ${sortColumn === colIndex ? 'active' : ''}`}
                              onClick={() => handleSortColumn(colIndex)}
                              title="ソート"
                            >
                              <span className="material-icons">
                                {sortColumn === colIndex 
                                  ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward')
                                  : 'unfold_more'}
                              </span>
                            </button>
                            <button
                              className={`table-filter-button ${filterColumn === colIndex ? 'active' : ''}`}
                              onClick={() => {
                                if (filterColumn === colIndex) {
                                  setFilterColumn(null)
                                  setFilterValue('')
                                } else {
                                  setFilterColumn(colIndex)
                                  setFilterValue('')
                                }
                              }}
                              title="フィルタ"
                            >
                              <span className="material-icons">filter_list</span>
                            </button>
                          </div>
                          {filterColumn === colIndex && (
                            <div className="table-filter-popup">
                              <input
                                type="text"
                                className="table-filter-input"
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                placeholder="フィルタ条件を入力..."
                                autoFocus
                              />
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>

                    {/* ヘッダー行（オプション） */}
                    {useHeaders && (
                      <tr className="table-header-row">
                        <th className="table-row-number">
                          <span>H</span>
                        </th>
                        {tableHeaders.map((header, colIndex) => (
                          <th 
                            key={colIndex} 
                            className={`table-header-cell ${selectedCell?.isHeader && selectedCell?.col === colIndex ? 'table-cell-selected' : ''}`}
                          >
                            <input
                              type="text"
                              value={header}
                              onChange={(e) => handleTableHeaderChange(colIndex, e.target.value)}
                              onFocus={() => handleCellSelect(-1, colIndex, true)}
                              placeholder={`ヘッダー ${colIndex + 1}`}
                              className="table-input table-header-input"
                              data-row="-1"
                              data-col={colIndex}
                            />
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {/* データ行 */}
                    {filteredRowIndices.map((rowIndex) => {
                      const row = tableData[rowIndex]
                      if (!row) return null
                      
                      return (
                        <tr key={rowIndex} className="table-data-row">
                          <td className="table-row-number">
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
                            const mergedCell = isCellMerged(rowIndex, colIndex)
                            const isMergedStart = isMergedCellStart(rowIndex, colIndex)
                            
                            // 結合セルの一部で、開始位置でない場合は表示しない
                            if (mergedCell && !isMergedStart) {
                              return null
                            }
                            
                            const dataType = getCellDataType(rowIndex, colIndex, false)
                            const formattedValue = getFormattedCellValue(rowIndex, colIndex, false)
                            const isSelected = selectedCell && !selectedCell.isHeader && selectedCell.row === rowIndex && selectedCell.col === colIndex
                            const isInRange = isCellInRange(rowIndex, colIndex)
                            
                            return (
                              <td 
                                key={colIndex} 
                                className={`table-data-cell ${isSelected ? 'table-cell-selected' : ''} ${isInRange ? 'table-cell-in-range' : ''} table-cell-type-${dataType} ${mergedCell ? 'table-cell-merged' : ''}`}
                                rowSpan={mergedCell ? mergedCell.rowSpan : undefined}
                                colSpan={mergedCell ? mergedCell.colSpan : undefined}
                                onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, false, e)}
                                onMouseEnter={(e) => handleCellMouseEnter(rowIndex, colIndex, false, e)}
                              >
                                <input
                                  type="text"
                                  value={formattedValue}
                                  onChange={(e) => handleTableCellChange(rowIndex, colIndex, e.target.value)}
                                  onFocus={() => handleCellSelect(rowIndex, colIndex, false)}
                                  placeholder=""
                                  className={`table-input table-input-type-${dataType}`}
                                  data-row={rowIndex}
                                  data-col={colIndex}
                                  style={{
                                    textAlign: dataType === 'number' || dataType === 'currency' || dataType === 'percentage' ? 'right' : 'left'
                                  }}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
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
                {contextMenu.type === 'row' ? (
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
                    {tableData[0]?.length > 1 && (
                      <>
                        <div className="table-context-menu-divider" />
                        <button className="table-context-menu-item danger" onClick={() => handleDeleteColumn(contextMenu.index)}>
                          <span className="material-icons">delete</span>
                          削除
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )

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
                <>
                  <div className="item-image-preview">
                    <img src={imageDataUrl} alt="Preview" />
                  </div>
                  <button
                    onClick={() => setShowCropTool(true)}
                    className="item-image-crop-button"
                  >
                    <span className="material-icons">crop</span>
                    Crop Image
                  </button>
                </>
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

              <label>Display Mode</label>
              <div className="item-image-display-mode">
                <button
                  className={`item-display-mode-button ${imageDisplayMode === 'contain' ? 'active' : ''}`}
                  onClick={() => handleImageDisplayModeChange('contain')}
                >
                  <span className="material-icons">fit_screen</span>
                  Fit (Contain)
                </button>
                <button
                  className={`item-display-mode-button ${imageDisplayMode === 'cover' ? 'active' : ''}`}
                  onClick={() => handleImageDisplayModeChange('cover')}
                >
                  <span className="material-icons">crop_free</span>
                  Fill (Cover)
                </button>
              </div>
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

  return (
    <div className="item-detail-panel">
      {/* Content */}
      <div className="item-detail-content">
        <div className="item-detail-edit">
          {getEditUI()}
        </div>
      </div>

      {/* Actions */}
      <div className="item-detail-actions">
          <button
            className="item-detail-action-button insert"
            onClick={() => onInsert(item)}
            title="Insert into editor"
          >
            <span className="material-icons">add_circle</span>
            Insert
          </button>
          <button
            className="item-detail-action-button delete"
            onClick={() => {
              if (confirm('Are you sure you want to delete this item?')) {
                onDelete(item.id)
                onClose()
              }
            }}
            title="Delete item"
          >
            <span className="material-icons">delete</span>
            Delete
          </button>
      </div>
    </div>
  )
}
