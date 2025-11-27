import { useState, useEffect, useRef } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import type { Item, TableItem, ImageItem, TextItem, SlideItem, ImageDisplayMode } from '../../types'
import { cropImage } from '../../utils/imageProcessing'

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

  const initializeEditState = (currentItem: Item) => {
    switch (currentItem.type) {
      case 'table':
        const tableItem = currentItem as TableItem
        setTableData(tableItem.data || [['', ''], ['', '']])
        setTableHeaders(tableItem.headers || [])
        setUseHeaders(!!tableItem.headers)
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
    const newData = [...tableData]
    newData[rowIndex][colIndex] = value
    setTableData(newData)
    
    // 即座に保存
    if (item.type === 'table') {
      onUpdateItem(item.id, {
        data: newData,
        headers: useHeaders ? tableHeaders : undefined
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
        headers: useHeaders ? newHeaders : undefined
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
          headers: useHeaders ? newHeaders : undefined
        } as Partial<TableItem>)
      }
    } else {
      // データセルの場合
      const newData = [...tableData]
      newData[selectedCell.row][selectedCell.col] = value
      setTableData(newData)
      
      if (item.type === 'table') {
        onUpdateItem(item.id, {
          data: newData,
          headers: useHeaders ? tableHeaders : undefined
        } as Partial<TableItem>)
      }
    }
  }

  // 選択中のセルの値を取得
  const getSelectedCellValue = (): string => {
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
        headers: checked ? tableHeaders : undefined
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
              <input
                type="text"
                className="table-formula-input"
                value={getSelectedCellValue()}
                onChange={(e) => handleFormulaBarChange(e.target.value)}
                placeholder={selectedCell ? "セルの内容を入力..." : "セルを選択してください"}
                disabled={!selectedCell}
              />
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
                          <th key={colIndex} className="table-header-cell">
                            <input
                              type="text"
                              value={header}
                              onChange={(e) => handleTableHeaderChange(colIndex, e.target.value)}
                              onFocus={() => handleCellSelect(-1, colIndex, true)}
                              placeholder={`ヘッダー ${colIndex + 1}`}
                              className="table-input table-header-input"
                            />
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {/* データ行 */}
                    {tableData.map((row, rowIndex) => (
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
                        {row.map((cell, colIndex) => (
                          <td key={colIndex} className="table-data-cell">
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleTableCellChange(rowIndex, colIndex, e.target.value)}
                              onFocus={() => handleCellSelect(rowIndex, colIndex, false)}
                              placeholder=""
                              className="table-input"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
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
