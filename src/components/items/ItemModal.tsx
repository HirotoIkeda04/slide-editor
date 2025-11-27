import { useState, useEffect, useRef } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import type { Item, ItemType, TableItem, ImageItem, TextItem, ImageDisplayMode } from '../../types'
import { cropImage, percentCropToPixelCrop } from '../../utils/imageProcessing'

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: Partial<Item>) => void
  editingItem?: Item | null
  existingNames: string[]
}

export const ItemModal = ({ isOpen, onClose, onSave, editingItem, existingNames }: ItemModalProps) => {
  const [name, setName] = useState('')
  const [type, setType] = useState<ItemType>('text')
  const [nameError, setNameError] = useState('')
  
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

  // Initialize form when editing
  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name)
      setType(editingItem.type)
      
      switch (editingItem.type) {
        case 'table':
          setTableData(editingItem.data)
          setTableHeaders(editingItem.headers || [])
          setUseHeaders(!!editingItem.headers)
          break
        case 'image':
          setImageDataUrl(editingItem.dataUrl)
          setImageAlt(editingItem.alt || '')
          setImageDisplayMode(editingItem.displayMode || 'contain')
          break
        case 'text':
          setTextContent(editingItem.content)
          break
      }
    } else {
      resetForm()
    }
  }, [editingItem, isOpen])

  const resetForm = () => {
    setName('')
    setType('text')
    setNameError('')
    setTableData([['', ''], ['', '']])
    setTableHeaders(['', ''])
    setUseHeaders(false)
    setImageDataUrl('')
    setImageAlt('')
    setImageDisplayMode('contain')
    setShowCropTool(false)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setTextContent('')
  }

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError('Name is required')
      return false
    }
    const isDuplicate = existingNames.some(
      n => n === value && (!editingItem || editingItem.name !== value)
    )
    if (isDuplicate) {
      setNameError('Name already exists')
      return false
    }
    setNameError('')
    return true
  }

  const handleNameChange = (value: string) => {
    setName(value)
    validateName(value)
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
      setImageDataUrl(reader.result as string)
      setShowCropTool(false)
      setCrop(undefined)
      setCompletedCrop(undefined)
    }
    reader.readAsDataURL(file)
  }

  const handleApplyCrop = async () => {
    if (!completedCrop || !imageRef.current || !imageDataUrl) return

    try {
      const croppedDataUrl = await cropImage(imageDataUrl, completedCrop)
      setImageDataUrl(croppedDataUrl)
      setShowCropTool(false)
      setCrop(undefined)
      setCompletedCrop(undefined)
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
    const newData = [...tableData]
    newData[rowIndex][colIndex] = value
    setTableData(newData)
  }

  const handleTableHeaderChange = (colIndex: number, value: string) => {
    const newHeaders = [...tableHeaders]
    newHeaders[colIndex] = value
    setTableHeaders(newHeaders)
  }

  const addTableRow = () => {
    const colCount = tableData[0]?.length || 2
    setTableData([...tableData, Array(colCount).fill('')])
  }

  const addTableColumn = () => {
    setTableData(tableData.map(row => [...row, '']))
    setTableHeaders([...tableHeaders, ''])
  }

  const removeTableRow = (index: number) => {
    if (tableData.length <= 1) return
    setTableData(tableData.filter((_, i) => i !== index))
  }

  const removeTableColumn = (index: number) => {
    if (tableData[0]?.length <= 1) return
    setTableData(tableData.map(row => row.filter((_, i) => i !== index)))
    setTableHeaders(tableHeaders.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!validateName(name)) return

    const baseItem: Partial<Item> = {
      id: editingItem?.id,
      name: name.trim(),
      type
    }

    let itemData: Partial<Item>
    switch (type) {
      case 'table':
        itemData = {
          ...baseItem,
          data: tableData,
          headers: useHeaders ? tableHeaders : undefined
        } as Partial<TableItem>
        break
      case 'image':
        if (!imageDataUrl) {
          alert('Please upload an image')
          return
        }
        itemData = {
          ...baseItem,
          dataUrl: imageDataUrl,
          alt: imageAlt,
          displayMode: imageDisplayMode
        } as Partial<ImageItem>
        break
      case 'text':
        if (!textContent.trim()) {
          alert('Please enter some text content')
          return
        }
        itemData = {
          ...baseItem,
          content: textContent
        } as Partial<TextItem>
        break
      default:
        return
    }

    onSave(itemData)
    onClose()
    resetForm()
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingItem ? 'Edit Item' : 'Create New Item'}</h2>
          <button className="modal-close-button" onClick={handleClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="modal-body">
          {/* Name Input */}
          <div className="item-modal-field">
            <label htmlFor="item-name">Name *</label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter item name"
              className={nameError ? 'error' : ''}
            />
            {nameError && <div className="item-modal-error">{nameError}</div>}
          </div>

          {/* Type Selection (only when creating) */}
          {!editingItem && (
            <div className="item-modal-field">
              <label>Type *</label>
              <div className="item-type-selector">
                <button
                  className={`item-type-button ${type === 'text' ? 'active' : ''}`}
                  onClick={() => setType('text')}
                >
                  <span className="material-icons">notes</span>
                  Text
                </button>
                <button
                  className={`item-type-button ${type === 'table' ? 'active' : ''}`}
                  onClick={() => setType('table')}
                >
                  <span className="material-icons">table_chart</span>
                  Table
                </button>
                <button
                  className={`item-type-button ${type === 'image' ? 'active' : ''}`}
                  onClick={() => setType('image')}
                >
                  <span className="material-icons">image</span>
                  Image
                </button>
              </div>
            </div>
          )}

          {/* Type-specific content */}
          {type === 'text' && (
            <div className="item-modal-field">
              <label htmlFor="text-content">Content *</label>
              <textarea
                id="text-content"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter text content..."
                rows={10}
              />
            </div>
          )}

          {type === 'table' && (
            <div className="item-modal-field">
              <label>Table Data *</label>
              <div className="item-table-controls">
                <label>
                  <input
                    type="checkbox"
                    checked={useHeaders}
                    onChange={(e) => setUseHeaders(e.target.checked)}
                  />
                  Use headers
                </label>
                <button onClick={addTableRow} className="item-table-add-button">
                  <span className="material-icons">add</span>
                  Add Row
                </button>
                <button onClick={addTableColumn} className="item-table-add-button">
                  <span className="material-icons">add</span>
                  Add Column
                </button>
              </div>
              
              <div className="item-table-editor">
                <table>
                  {useHeaders && (
                    <thead>
                      <tr>
                        {tableHeaders.map((header, colIndex) => (
                          <th key={colIndex}>
                            <input
                              type="text"
                              value={header}
                              onChange={(e) => handleTableHeaderChange(colIndex, e.target.value)}
                              placeholder={`Header ${colIndex + 1}`}
                            />
                            <button
                              onClick={() => removeTableColumn(colIndex)}
                              className="item-table-remove-button"
                              title="Remove column"
                            >
                              <span className="material-icons">close</span>
                            </button>
                          </th>
                        ))}
                        <th></th>
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {tableData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, colIndex) => (
                          <td key={colIndex}>
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleTableCellChange(rowIndex, colIndex, e.target.value)}
                              placeholder={`Cell ${rowIndex + 1},${colIndex + 1}`}
                            />
                          </td>
                        ))}
                        <td>
                          <button
                            onClick={() => removeTableRow(rowIndex)}
                            className="item-table-remove-button"
                            title="Remove row"
                          >
                            <span className="material-icons">close</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {type === 'image' && (
            <div className="item-modal-field">
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
                    <button onClick={handleCancelCrop} className="modal-button secondary">
                      Cancel
                    </button>
                    <button onClick={handleApplyCrop} className="modal-button primary">
                      Apply Crop
                    </button>
                  </div>
                </div>
              )}

              <label htmlFor="image-alt">Alt Text</label>
              <input
                id="image-alt"
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Enter alt text (optional)"
              />

              <label>Display Mode</label>
              <div className="item-image-display-mode">
                <button
                  className={`item-display-mode-button ${imageDisplayMode === 'contain' ? 'active' : ''}`}
                  onClick={() => setImageDisplayMode('contain')}
                >
                  <span className="material-icons">fit_screen</span>
                  Fit (Contain)
                </button>
                <button
                  className={`item-display-mode-button ${imageDisplayMode === 'cover' ? 'active' : ''}`}
                  onClick={() => setImageDisplayMode('cover')}
                >
                  <span className="material-icons">crop_free</span>
                  Fill (Cover)
                </button>
              </div>
              <div className="item-display-mode-hint">
                <span className="material-icons">info</span>
                <span>Fit: Entire image visible. Fill: Image fills frame (may crop edges).</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={handleClose} className="modal-button secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="modal-button primary">
            {editingItem ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

