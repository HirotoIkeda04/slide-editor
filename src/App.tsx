import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Slide, SlideFormat, Tone, ConsoleMessage, Item, EditorLine, EditorSelection, ImpressionCode, ImpressionStyleVars, StylePins } from './types'
import { generateConsoleMessages } from './utils/validation'
import { loadPresentation } from './utils/slides'
import { extractSlideLayout, splitSlidesByHeading } from './utils/markdown'
import { formatConfigs } from './constants/formatConfigs'
import { createItem, updateItem } from './utils/items'
import { saveItemsToLocalStorage, loadItemsFromLocalStorage } from './utils/fileSystem'
import { contentToLines, linesToContent, linesToAttributeMap } from './utils/attributes'
import { DEFAULT_IMPRESSION_CODE, findMatchingPreset } from './constants/impressionConfigs'
import type { SlideItem } from './types'

const MAIN_SLIDE_ITEM_ID = 'main-slide'
import { Toolbar } from './components/toolbar/Toolbar'
import { ExportModal } from './components/modal/ExportModal'
import { HelpModal } from './components/modal/HelpModal'
import { ToneDisplay } from './components/preview/ToneDisplay'
import { FormatTabs } from './components/preview/FormatTabs'
import { Preview } from './components/preview/Preview'
import { SlideCarousel } from './components/slideCarousel/SlideCarousel'
import { Editor } from './components/editor/Editor'
import { Toast } from './components/toast/Toast'
import { ChatPanel } from './components/chat/ChatPanel'
import { ItemTabBar } from './components/items/ItemTabBar'
import { ItemDetailPanel } from './components/items/ItemDetailPanel'
import { ItemModal } from './components/items/ItemModal'
import { SlideShowView } from './components/slideshow/SlideShowView'
import { FloatingNavBar } from './components/floatingNavBar/FloatingNavBar'
import { ImpressionPanel } from './components/impression/ImpressionPanel'
import './App.css'

// Default content
const DEFAULT_CONTENT = `# [表紙] プレゼンテーションタイトル

あなたのプレゼンテーションをここに作成

# [目次] 目次

# セクション1

## セクション1-a

- ポイント1
- ポイント2
- ポイント3

## セクション1-b

- ポイント1
- ポイント2
- ポイント3

# セクション2

! 重要な内容をここに記述

1. 最初のステップ
2. 次のステップ
3. 最後のステップ

# [まとめ] まとめ

- 結論1
- 結論2
- 結論3

ご清聴ありがとうございました`

function App() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentFormat, setCurrentFormat] = useState<SlideFormat>('webinar')
  
  // 印象コードシステム
  const [impressionCode, setImpressionCode] = useState<ImpressionCode>(DEFAULT_IMPRESSION_CODE)
  const [styleOverrides, setStyleOverrides] = useState<Partial<ImpressionStyleVars>>({})
  const [stylePins, setStylePins] = useState<StylePins>({})
  const [isTonmanaSelected, setIsTonmanaSelected] = useState(false)
  
  // スタイルオーバーライドを更新するハンドラー
  const handleStyleOverride = useCallback((overrides: Partial<ImpressionStyleVars>) => {
    setStyleOverrides(prev => ({ ...prev, ...overrides }))
  }, [])
  
  // ピン留め状態を更新するハンドラー
  const handleStylePinChange = useCallback((pins: Partial<StylePins>) => {
    setStylePins(prev => ({ ...prev, ...pins }))
  }, [])
  
  // 印象コード変更時のハンドラー（ピン留めされていない項目をクリア）
  const handleImpressionCodeChange = useCallback((newCode: ImpressionCode) => {
    setImpressionCode(newCode)
    // ピン留めされていない項目をstyleOverridesからクリア
    setStyleOverrides(prev => {
      const filtered: Partial<ImpressionStyleVars> = {}
      if (stylePins.primary && prev.primary !== undefined) {
        filtered.primary = prev.primary
      }
      if (stylePins.background && prev.background !== undefined) {
        filtered.background = prev.background
      }
      if (stylePins.accent && prev.accent !== undefined) {
        filtered.accent = prev.accent
      }
      if (stylePins.fontFamily && prev.fontFamily !== undefined) {
        filtered.fontFamily = prev.fontFamily
      }
      if (stylePins.borderRadius && prev.borderRadius !== undefined) {
        filtered.borderRadius = prev.borderRadius
      }
      return filtered
    })
  }, [stylePins])
  
  // Legacy: 印象コードからToneを導出（後方互換性のため）
  const currentTone = useMemo((): Tone => {
    const preset = findMatchingPreset(impressionCode)
    if (preset) {
      // プリセットIDが旧Tone型と一致する場合はそれを使用
      if (['simple', 'casual', 'luxury', 'warm'].includes(preset.id)) {
        return preset.id as Tone
      }
    }
    // デフォルトは'simple'
    return 'simple'
  }, [impressionCode])
  
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(MAIN_SLIDE_ITEM_ID)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  
  // Line-based editor state
  const [lines, setLines] = useState<EditorLine[]>(() => contentToLines(DEFAULT_CONTENT))
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentAttribute, setCurrentAttribute] = useState<string | null>(null)
  const [selection, setSelection] = useState<EditorSelection | null>(null)
  
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const isSyncingRef = useRef(false)
  const lastSyncedContentRef = useRef<string | null>(null)
  const isInitializedRef = useRef(false)
  const [isBulkExporting, setIsBulkExporting] = useState(false)
  const [isPptExporting, setIsPptExporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showSlideShow, setShowSlideShow] = useState(false)
  const [editingHeaderItemId, setEditingHeaderItemId] = useState<string | null>(null)
  const [editingHeaderName, setEditingHeaderName] = useState('')
  const [headerNameError, setHeaderNameError] = useState('')
  const headerNameInputRef = useRef<HTMLInputElement>(null)
  
  // Undo/Redo用の履歴管理
  const historyRef = useRef<EditorLine[][]>([])
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Derived editorContent from lines (for compatibility) - memoized for performance
  const editorContent = useMemo(() => linesToContent(lines), [lines])
  
  // Derived attributeMap from lines (for compatibility) - memoized for performance
  const attributeMap = useMemo(() => linesToAttributeMap(lines), [lines])

  // アイテムの初期化
  useEffect(() => {
    const loadedItems = loadItemsFromLocalStorage()
    
    // メインスライドアイテムが存在しない場合は作成
    const mainSlideItem = loadedItems.find(item => item.id === MAIN_SLIDE_ITEM_ID)
    if (!mainSlideItem) {
      const newMainSlideItem = createItem('Main Slides', 'slide', {
        content: editorContent
      } as Partial<SlideItem>)
      newMainSlideItem.id = MAIN_SLIDE_ITEM_ID
      setItems([newMainSlideItem, ...loadedItems])
      setSelectedItemId(MAIN_SLIDE_ITEM_ID)
      lastSyncedContentRef.current = editorContent
    } else {
      // メインスライドアイテムが存在する場合、エディタの内容を同期
      if (mainSlideItem.type === 'slide') {
        setLines(contentToLines(mainSlideItem.content))
        lastSyncedContentRef.current = mainSlideItem.content
      }
      setItems(loadedItems)
      setSelectedItemId(MAIN_SLIDE_ITEM_ID)
    }
    
    isInitializedRef.current = true
  }, [])

  // 履歴にエディタ内容を追加する関数
  const addToHistory = useCallback((newLines: EditorLine[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(newLines.map(l => ({ ...l })))
    if (historyRef.current.length > 100) {
      historyRef.current = historyRef.current.slice(-100)
    }
    historyIndexRef.current = historyRef.current.length - 1
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(false)
  }, [])

  // Undo処理
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }
      isUndoRedoRef.current = true
      historyIndexRef.current--
      const previousLines = historyRef.current[historyIndexRef.current]
      setLines(previousLines.map(l => ({ ...l })))
      setCanUndo(historyIndexRef.current > 0)
      setCanRedo(true)
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 0)
    }
  }, [])

  // Redo処理
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true
      historyIndexRef.current++
      const nextLines = historyRef.current[historyIndexRef.current]
      setLines(nextLines.map(l => ({ ...l })))
      setCanUndo(true)
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 0)
    }
  }, [])

  // エディタ内容の変更を履歴に記録（デバウンス付き）
  useEffect(() => {
    if (!isInitializedRef.current) return
    if (isUndoRedoRef.current) return
    
    if (historyRef.current.length === 0) {
      addToHistory(lines)
      return
    }
    
    // Compare with current history entry
    const currentHistory = historyRef.current[historyIndexRef.current]
    const isSame = currentHistory && 
      currentHistory.length === lines.length &&
      currentHistory.every((l, i) => 
        l.id === lines[i].id && 
        l.attribute === lines[i].attribute && 
        l.text === lines[i].text
      )
    
    if (isSame) return
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      addToHistory(lines)
    }, 200)
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [lines, addToHistory])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // エディタの内容とメインスライドアイテムを同期（エディタ→アイテム）
  useEffect(() => {
    if (!isInitializedRef.current) return
    if (isSyncingRef.current) return
    
    const mainSlideItem = items.find(item => item.id === MAIN_SLIDE_ITEM_ID)
    if (mainSlideItem && mainSlideItem.type === 'slide') {
      if (mainSlideItem.content !== editorContent) {
        isSyncingRef.current = true
        setItems(prevItems => updateItem(prevItems, MAIN_SLIDE_ITEM_ID, {
          content: editorContent
        } as Partial<SlideItem>))
        lastSyncedContentRef.current = editorContent
        setTimeout(() => {
          isSyncingRef.current = false
        }, 0)
      }
    }
  }, [editorContent, items])

  // メインスライドアイテムとエディタの内容を同期（アイテム→エディタ）
  // 注意: この同期は外部からの変更（AI編集など）のみを対象とする
  useEffect(() => {
    if (!isInitializedRef.current) return
    if (isSyncingRef.current) return
    
    const mainSlideItem = items.find(item => item.id === MAIN_SLIDE_ITEM_ID)
    if (mainSlideItem && mainSlideItem.type === 'slide') {
      if (lastSyncedContentRef.current !== mainSlideItem.content) {
        isSyncingRef.current = true
        setLines(contentToLines(mainSlideItem.content))
        lastSyncedContentRef.current = mainSlideItem.content
        setTimeout(() => {
          isSyncingRef.current = false
        }, 0)
      }
    }
  }, [items])

  // 選択されているアイテムが存在するかチェック
  useEffect(() => {
    if (items.length === 0) return
    
    if (selectedItemId) {
      const selectedItem = items.find(item => item.id === selectedItemId)
      if (!selectedItem && selectedItemId !== MAIN_SLIDE_ITEM_ID) {
        setSelectedItemId(MAIN_SLIDE_ITEM_ID)
      }
    } else if (selectedItemId === null) {
      const mainSlideItem = items.find(item => item.id === MAIN_SLIDE_ITEM_ID)
      if (mainSlideItem) {
        setSelectedItemId(MAIN_SLIDE_ITEM_ID)
      }
    }
  }, [items, selectedItemId])

  // ヘッダー編集: アイテムが変更されたら編集状態をリセット
  useEffect(() => {
    setEditingHeaderItemId(null)
    setHeaderNameError('')
  }, [selectedItemId])

  // ヘッダー編集: 編集モードに入ったときにフォーカスを設定
  useEffect(() => {
    if (editingHeaderItemId && headerNameInputRef.current) {
      headerNameInputRef.current.focus()
      headerNameInputRef.current.select()
    }
  }, [editingHeaderItemId])

  // アイテムをlocalStorageに保存
  useEffect(() => {
    if (!isInitializedRef.current) return
    const hasMainSlide = items.some(item => item.id === MAIN_SLIDE_ITEM_ID)
    if (!hasMainSlide) return
    saveItemsToLocalStorage(items)
  }, [items])

  // スライドのパース
  useEffect(() => {
    const slideSplitLevel = formatConfigs[currentFormat].slideSplitLevel
    const slideTexts = splitSlidesByHeading(editorContent, slideSplitLevel, attributeMap)
    const parsedSlides = slideTexts
      .map((text) => {
        const trimmedContent = text.trim()
        return {
          content: trimmedContent,
          layout: extractSlideLayout(trimmedContent)
        }
      })
    
    setSlides(parsedSlides)
    if (currentIndex >= parsedSlides.length) {
      setCurrentIndex(Math.max(0, parsedSlides.length - 1))
    }
  }, [editorContent, currentIndex, currentFormat, attributeMap])

  // コンソールメッセージの生成
  useEffect(() => {
    const messages = generateConsoleMessages(editorContent)
    setConsoleMessages(messages)
  }, [editorContent])

  // Handle current line change from editor
  const handleCurrentLineChange = useCallback((lineIndex: number, attribute: string | null) => {
    setCurrentLineIndex(lineIndex)
    setCurrentAttribute(attribute)
  }, [])

  // Handle selection change from editor
  const handleSelectionChange = useCallback((newSelection: EditorSelection | null) => {
    setSelection(newSelection)
  }, [])

  // Set attribute for current line (from FloatingNavBar)
  const handleSetAttribute = useCallback((lineNumber: number, attribute: string | null) => {
    const lineIndex = lineNumber - 1
    if (lineIndex < 0 || lineIndex >= lines.length) return
    
    const newLines = [...lines]
    newLines[lineIndex] = { ...newLines[lineIndex], attribute }
    setLines(newLines)
  }, [lines])

  // Set attributes for range (from FloatingNavBar)
  const handleSetAttributesForRange = useCallback((startLine: number, endLine: number, attribute: string | null) => {
    const startIndex = startLine - 1
    const endIndex = endLine - 1
    
    const newLines = [...lines]
    for (let i = startIndex; i <= endIndex && i < lines.length; i++) {
      if (i >= 0) {
        newLines[i] = { ...newLines[i], attribute }
      }
    }
    setLines(newLines)
  }, [lines])

  // アイテム管理のハンドラー
  const handleAddItem = () => {
    setEditingItem(null)
    setShowItemModal(true)
  }

  const handleEditItem = (item: Item) => {
    if (item.id === MAIN_SLIDE_ITEM_ID) {
      return
    }
    setEditingItem(item)
    setShowItemModal(true)
  }

  const handleUpdateItem = (itemId: string, updates: Partial<Item>) => {
    setItems(prev => updateItem(prev, itemId, updates))
  }

  const handleSaveItem = (itemData: Partial<Item>) => {
    if (editingItem) {
      setItems(prev => updateItem(prev, editingItem.id, itemData))
    } else {
      const newItem = createItem(
        itemData.name!,
        itemData.type!,
        itemData
      )
      setItems(prev => [...prev, newItem])
    }
    setShowItemModal(false)
    setEditingItem(null)
  }

  const handleNavigate = (direction: 'prev' | 'next') => {
    setCurrentIndex(prevIndex => {
      if (direction === 'prev' && prevIndex > 0) {
        return prevIndex - 1
      } else if (direction === 'next' && prevIndex < slides.length - 1) {
        return prevIndex + 1
      }
      return prevIndex
    })
  }

  const handleCreateTable = (name: string, headers: string[] | undefined, data: string[][]) => {
    const newTableItem = createItem(name, 'table', {
      headers,
      data
    })
    
    setItems(prevItems => {
      const updatedItems = [...prevItems, newTableItem]
      saveItemsToLocalStorage(updatedItems)
      return updatedItems
    })
    
    setSelectedItemId(newTableItem.id)
  }

  // Handle content update from external sources (e.g., AI chat)
  const handleSetEditorContent = useCallback((content: string) => {
    setLines(contentToLines(content))
  }, [])

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden">
      <Toolbar
        onLoad={() => loadPresentation(handleSetEditorContent, setCurrentIndex)}
        onShowHelp={() => setShowHelpModal(true)}
        onShowExport={() => setShowExportModal(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        slides={slides}
        currentIndex={currentIndex}
        currentFormat={currentFormat}
        previewRef={previewRef}
        isBulkExporting={isBulkExporting}
        isPptExporting={isPptExporting}
        editorContent={editorContent}
        setCurrentIndex={setCurrentIndex}
        setIsBulkExporting={setIsBulkExporting}
        setIsPptExporting={setIsPptExporting}
      />

      <HelpModal
        show={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* スライドショー表示 */}
      {showSlideShow && (
        <SlideShowView
          slides={slides}
          currentIndex={currentIndex}
          currentFormat={currentFormat}
          currentTone={currentTone}
          impressionCode={impressionCode}
          styleOverrides={styleOverrides}
          items={items}
          onClose={() => setShowSlideShow(false)}
          onNavigate={setCurrentIndex}
        />
      )}

      {/* メインエリア */}
      {!showSlideShow && (
      <div className="flex-1 flex overflow-hidden">
        {/* プレビュー */}
        <div className="flex flex-col p-4" style={{ width: '40%' }}>
          <ToneDisplay
            code={impressionCode}
            onClick={() => {
              setIsTonmanaSelected(true)
              setSelectedItemId(null)
            }}
          />

          <FormatTabs
            currentFormat={currentFormat}
            onFormatChange={setCurrentFormat}
          />

          {/* プレビューエリア */}
          <div
            className="flex-1 rounded-b-lg p-4 flex items-center justify-center relative overflow-hidden"
            style={{ 
              paddingTop: 0, 
              marginTop: '-1px', 
              borderTop: '1.5px solid #e5e7eb', 
              backgroundColor: '#1e1e1e',
              minWidth: 0,
              minHeight: 0
            }}
          >
            <Preview
              slides={slides}
              currentIndex={currentIndex}
              currentFormat={currentFormat}
              currentTone={currentTone}
              impressionCode={impressionCode}
              styleOverrides={styleOverrides}
              previewRef={previewRef}
              items={items}
              onNavigate={handleNavigate}
              onStartSlideShow={() => {
                if (slides.length > 0) {
                  setShowSlideShow(true)
                } else {
                  alert('スライドがありません')
                }
              }}
            />
          </div>

          <SlideCarousel
            slides={slides}
            currentIndex={currentIndex}
            currentFormat={currentFormat}
            currentTone={currentTone}
            impressionCode={impressionCode}
            styleOverrides={styleOverrides}
            items={items}
            setCurrentIndex={setCurrentIndex}
          />
        </div>

        {/* エディター + アイテムタブバー */}
        <div className="flex flex-col" style={{ minHeight: 0, width: '35%', overflow: 'hidden' }}>
          {/* アイテム名表示 */}
          {(selectedItemId || isTonmanaSelected) && (() => {
            // トンマナ選択時
            if (isTonmanaSelected) {
              const preset = findMatchingPreset(impressionCode)
              return (
                <div className="editor-file-header" style={{ borderBottom: '1px solid #3a3a3a', backgroundColor: '#1e1e1e' }}>
                  <div className="flex items-center gap-2">
                    <span className="material-icons" style={{ fontSize: '1rem', color: '#FFCB6B' }}>palette</span>
                    <span style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500 }}>
                      トンマナ{preset ? ` - ${preset.nameJa}` : ''}
                    </span>
                  </div>
                </div>
              )
            }
            
            const selectedItem = items.find(item => item.id === selectedItemId)
            if (!selectedItem) return null
            
            const getItemIcon = (type: Item['type']): string => {
              switch (type) {
                case 'slide':
                  return 'slideshow'
                case 'table':
                  return 'table_chart'
                case 'image':
                  return 'image'
                case 'text':
                  return 'notes'
                default:
                  return 'inventory_2'
              }
            }
            
            const handleHeaderNameDoubleClick = (item: Item, e: React.MouseEvent) => {
              e.stopPropagation()
              e.preventDefault()
              if (item.id === MAIN_SLIDE_ITEM_ID) return
              setEditingHeaderItemId(item.id)
              setEditingHeaderName(item.name)
              setHeaderNameError('')
              setTimeout(() => {
                headerNameInputRef.current?.focus()
                headerNameInputRef.current?.select()
              }, 0)
            }

            const validateHeaderName = (value: string, currentItem: Item): boolean => {
              if (!value.trim()) {
                setHeaderNameError('Name is required')
                return false
              }
              const isDuplicate = items.some(
                i => i.name === value && currentItem.name !== value
              )
              if (isDuplicate) {
                setHeaderNameError('Name already exists')
                return false
              }
              setHeaderNameError('')
              return true
            }

            const handleHeaderNameChange = (value: string, item: Item) => {
              setEditingHeaderName(value)
              validateHeaderName(value, item)
            }

            const handleHeaderNameSave = (item: Item) => {
              if (validateHeaderName(editingHeaderName, item) && editingHeaderName.trim() !== item.name) {
                handleUpdateItem(item.id, { name: editingHeaderName.trim() })
              }
              setEditingHeaderItemId(null)
              setHeaderNameError('')
            }

            const handleHeaderNameCancel = (item: Item) => {
              setEditingHeaderName(item.name)
              setHeaderNameError('')
              setEditingHeaderItemId(null)
            }

            const handleHeaderNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, item: Item) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleHeaderNameSave(item)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                handleHeaderNameCancel(item)
              }
            }

            return (
              <div className="editor-file-header" style={{ borderBottom: '1px solid #3a3a3a', backgroundColor: '#1e1e1e' }}>
                <div className="flex items-center gap-2">
                  <span className="material-icons" style={{ fontSize: '1rem', color: '#FFCB6B' }}>{getItemIcon(selectedItem.type)}</span>
                  {editingHeaderItemId === selectedItem.id ? (
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        ref={headerNameInputRef}
                        type="text"
                        value={editingHeaderName}
                        onChange={(e) => handleHeaderNameChange(e.target.value, selectedItem)}
                        onKeyDown={(e) => handleHeaderNameKeyDown(e, selectedItem)}
                        style={{
                          fontSize: '0.875rem',
                          color: '#e5e7eb',
                          fontWeight: 500,
                          background: 'transparent',
                          border: headerNameError ? '1px solid #FF5370' : '1px solid transparent',
                          borderRadius: '0.25rem',
                          padding: 0,
                          margin: 0,
                          width: '100%',
                          boxSizing: 'border-box',
                          outline: 'none',
                          lineHeight: '1.5',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.target.style.border = headerNameError ? '1px solid #FF5370' : '1px solid #FFCB6B'
                          e.target.style.background = '#252525'
                          e.target.style.padding = '0.125rem 0.25rem'
                        }}
                        onBlur={(e) => {
                          e.target.style.border = '1px solid transparent'
                          e.target.style.background = 'transparent'
                          e.target.style.padding = '0'
                          handleHeaderNameSave(selectedItem)
                        }}
                      />
                      {headerNameError && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '0.25rem',
                          fontSize: '0.625rem',
                          color: '#FF5370',
                          whiteSpace: 'nowrap'
                        }}>
                          {headerNameError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span 
                      style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500, cursor: selectedItem.id === MAIN_SLIDE_ITEM_ID ? 'default' : 'text' }}
                      onDoubleClick={(e) => handleHeaderNameDoubleClick(selectedItem, e)}
                      title={selectedItem.id === MAIN_SLIDE_ITEM_ID ? '' : 'Double-click to edit name'}
                    >
                      {selectedItem.name}
                    </span>
                  )}
                </div>
          </div>
            )
          })()}
          
          <div className="flex" style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
            {/* エディター部分（条件付き表示） */}
            <div className="flex flex-col" style={{ minHeight: 0, minWidth: 0, flex: '1 1 0', position: 'relative', overflow: 'hidden' }}>
            {/* トンマナ選択時：ImpressionPanelを表示 */}
            {isTonmanaSelected ? (
              <ImpressionPanel
                code={impressionCode}
                onCodeChange={handleImpressionCodeChange}
                styleOverrides={styleOverrides}
                onStyleOverride={handleStyleOverride}
                stylePins={stylePins}
                onStylePinChange={handleStylePinChange}
              />
            ) : selectedItemId && selectedItemId !== MAIN_SLIDE_ITEM_ID ? (
              /* その他のアイテム選択時：ItemDetailPanelを表示 */
              <ItemDetailPanel
                item={items.find(item => item.id === selectedItemId) || null}
                onEdit={handleEditItem}
                onUpdateItem={handleUpdateItem}
              />
            ) : (
              /* デフォルト（メインスライドアイテム選択時 or 未選択時）：エディタを表示 */
              <Editor
                lines={lines}
                setLines={setLines}
                isComposing={isComposing}
                setIsComposing={setIsComposing}
                errorMessages={consoleMessages}
                onCurrentLineChange={handleCurrentLineChange}
                onSelectionChange={handleSelectionChange}
              />
            )}
      </div>

            {/* アイテムタブバー（常時表示） */}
            <div className="flex flex-col" style={{ width: '36px', minHeight: 0, borderLeft: '1px solid #3a3a3a' }}>
              <ItemTabBar
                items={items}
                selectedItemId={selectedItemId}
                onSelectItem={(itemId) => {
                  setSelectedItemId(itemId)
                  setIsTonmanaSelected(false)
                }}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                existingNames={items.map(item => item.name)}
                isTonmanaSelected={isTonmanaSelected}
                onSelectTonmana={() => {
                  setIsTonmanaSelected(true)
                  setSelectedItemId(null)
                }}
              />
            </div>
          </div>
          {/* Toast - FloatingNavBarの上に表示（エディタ選択時のみ） */}
          {/* 行番号カラム(60px)を除いたテキスト部分の中央に配置 */}
          {!isTonmanaSelected && (!selectedItemId || selectedItemId === MAIN_SLIDE_ITEM_ID) && (
            <div
              className="pointer-events-none fixed z-40"
              style={{ 
                bottom: '64px',
                left: 'calc(40% + 60px + (35% - 36px - 60px) / 2)', 
                transform: 'translateX(-50%)',
                maxWidth: '420px',
                width: 'calc(35% - 150px)'
              }}
            >
              <div className="pointer-events-auto w-full">
                <Toast messages={consoleMessages} />
              </div>
            </div>
          )}
          {/* FloatingNavBar - エディタ領域の最下部（エディタ選択時のみ） */}
          {/* 行番号カラム(60px)を除いたテキスト部分の中央に配置 */}
          {!isTonmanaSelected && (!selectedItemId || selectedItemId === MAIN_SLIDE_ITEM_ID) && (
            <div
              className="pointer-events-none fixed z-40"
              style={{ 
                bottom: '12px',
                left: 'calc(40% + 60px + (35% - 36px - 60px) / 2)', 
                transform: 'translateX(-50%)',
                maxWidth: '420px',
                width: 'calc(35% - 150px)'
              }}
            >
              <div className="pointer-events-auto w-full">
                <FloatingNavBar
                  itemType="slide"
                  currentLine={currentLineIndex + 1}
                  currentAttribute={currentAttribute}
                  selection={selection ? {
                    startLine: selection.startLine + 1,
                    endLine: selection.endLine + 1
                  } : null}
                  onSetAttribute={handleSetAttribute}
                  onSetAttributesForRange={handleSetAttributesForRange}
                />
              </div>
            </div>
          )}
        </div>

        {/* AIチャットパネル */}
        <div className="flex flex-col" style={{ width: '25%', minHeight: 0 }}>
          <ChatPanel
            editorContent={editorContent}
            onApplyEdit={(content) => handleSetEditorContent(content)}
            onCreateTable={handleCreateTable}
            existingItemNames={items.map(item => item.name)}
          />
          </div>
        </div>
      )}

      {/* アイテムモーダル */}
      <ItemModal
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false)
          setEditingItem(null)
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
        existingNames={items.map(item => item.name)}
      />
    </div>
  )
}

export default App
