import { useState, useEffect, useRef, useCallback } from 'react'
import type { Slide, SlideFormat, Tone, ConsoleMessage, Item } from './types'
import { generateConsoleMessages } from './utils/validation'
import { loadPresentation } from './utils/slides'
import { extractSlideLayout, splitSlidesByHeading } from './utils/markdown'
import { formatConfigs } from './constants/formatConfigs'
import { createItem, updateItem, deleteItem } from './utils/items'
import { saveItemsToLocalStorage, loadItemsFromLocalStorage } from './utils/fileSystem'
import type { SlideItem } from './types'

const MAIN_SLIDE_ITEM_ID = 'main-slide'
import { Toolbar } from './components/toolbar/Toolbar'
import { ExportModal } from './components/modal/ExportModal'
import { HelpModal } from './components/modal/HelpModal'
import { ToneSelector } from './components/preview/ToneSelector'
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
import './App.css'

function App() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentFormat, setCurrentFormat] = useState<SlideFormat>('webinar')
  const [currentTone, setCurrentTone] = useState<Tone>('simple')
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(MAIN_SLIDE_ITEM_ID)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editorContent, setEditorContent] = useState(`# [表紙] プレゼンテーションタイトル

あなたのプレゼンテーションをここに作成

# [目次] 目次

- セクション1
- セクション2
- まとめ

# [中扉] セクション1

# セクション1

## セクション1-a

- ポイント1
- ポイント2
- ポイント3

## セクション1-b

- ポイント1
- ポイント2
- ポイント3

# [中扉] セクション2

# セクション2

! 重要な内容をここに記述

1. 最初のステップ
2. 次のステップ
3. 最後のステップ

# [まとめ] まとめ

- 結論1
- 結論2
- 結論3

ご清聴ありがとうございました`)
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const isSyncingRef = useRef(false)
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
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

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
      // メインスライドアイテムを選択状態にする
      setSelectedItemId(MAIN_SLIDE_ITEM_ID)
    } else {
      // メインスライドアイテムが存在する場合、エディタの内容を同期
      if (mainSlideItem.type === 'slide') {
        setEditorContent(mainSlideItem.content)
      }
      setItems(loadedItems)
      // メインスライドアイテムを選択状態にする
      setSelectedItemId(MAIN_SLIDE_ITEM_ID)
    }
    
    // 初期化完了フラグを設定（これ以降のitems変更はlocalStorageに保存される）
    isInitializedRef.current = true
  }, [])

  // 履歴にエディタ内容を追加する関数
  const addToHistory = useCallback((content: string) => {
    // 現在位置より後の履歴を削除
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    // 新しい内容を追加
    historyRef.current.push(content)
    // 履歴サイズの制限（最大100件）
    if (historyRef.current.length > 100) {
      historyRef.current = historyRef.current.slice(-100)
    }
    historyIndexRef.current = historyRef.current.length - 1
    // undo/redo可能状態を更新
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(false)
  }, [])

  // Undo処理
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      // デバウンス中のタイマーをクリア
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }
      isUndoRedoRef.current = true
      historyIndexRef.current--
      const previousContent = historyRef.current[historyIndexRef.current]
      setEditorContent(previousContent)
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
      const nextContent = historyRef.current[historyIndexRef.current]
      setEditorContent(nextContent)
      setCanUndo(true)
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 0)
    }
  }, [])

  // エディタ内容の変更を履歴に記録（デバウンス付き）
  useEffect(() => {
    // 初期化前はスキップ
    if (!isInitializedRef.current) return
    // Undo/Redo中はスキップ
    if (isUndoRedoRef.current) return
    
    // 初回の履歴追加
    if (historyRef.current.length === 0) {
      addToHistory(editorContent)
      return
    }
    
    // 同じ内容の場合はスキップ
    if (editorContent === historyRef.current[historyIndexRef.current]) return
    
    // デバウンス: 連続入力時は200ms後に履歴に追加
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      addToHistory(editorContent)
    }, 200)
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [editorContent, addToHistory])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z または Cmd+Z でUndo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl+Y または Cmd+Shift+Z でRedo
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
    // 初期化完了前は同期しない
    if (!isInitializedRef.current) return
    if (isSyncingRef.current) return
    
    const mainSlideItem = items.find(item => item.id === MAIN_SLIDE_ITEM_ID)
    if (mainSlideItem && mainSlideItem.type === 'slide') {
      // エディタの内容が変更されたら、メインスライドアイテムを更新
      if (mainSlideItem.content !== editorContent) {
        isSyncingRef.current = true
        setItems(prevItems => updateItem(prevItems, MAIN_SLIDE_ITEM_ID, {
          content: editorContent
        } as Partial<SlideItem>))
        setTimeout(() => {
          isSyncingRef.current = false
        }, 0)
      }
    }
  }, [editorContent])

  // メインスライドアイテムとエディタの内容を同期（アイテム→エディタ）
  useEffect(() => {
    // 初期化完了前は同期しない
    if (!isInitializedRef.current) return
    if (isSyncingRef.current) return
    
    const mainSlideItem = items.find(item => item.id === MAIN_SLIDE_ITEM_ID)
    if (mainSlideItem && mainSlideItem.type === 'slide') {
      // メインスライドアイテムが変更されたら、エディタの内容を更新
      if (mainSlideItem.content !== editorContent) {
        isSyncingRef.current = true
        setEditorContent(mainSlideItem.content)
        setTimeout(() => {
          isSyncingRef.current = false
        }, 0)
      }
    }
  }, [items])

  // 選択されているアイテムが存在するかチェック
  useEffect(() => {
    if (items.length === 0) return // アイテムがまだ初期化されていない場合はスキップ
    
    if (selectedItemId) {
      const selectedItem = items.find(item => item.id === selectedItemId)
      if (!selectedItem && selectedItemId !== MAIN_SLIDE_ITEM_ID) {
        // 選択されているアイテムが存在しない場合、メインスライドアイテムを選択
        setSelectedItemId(MAIN_SLIDE_ITEM_ID)
      }
    } else if (selectedItemId === null) {
      // 何も選択されていない場合、メインスライドアイテムを選択
      const mainSlideItem = items.find(item => item.id === MAIN_SLIDE_ITEM_ID)
      if (mainSlideItem) {
        setSelectedItemId(MAIN_SLIDE_ITEM_ID)
      }
    }
  }, [items])

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
    // 初期化完了前は保存しない（既存データの上書きを防止）
    if (!isInitializedRef.current) return
    // メインスライドアイテムが存在しない場合は保存しない（初期化途中の空配列を保存しない）
    const hasMainSlide = items.some(item => item.id === MAIN_SLIDE_ITEM_ID)
    if (!hasMainSlide) return
    saveItemsToLocalStorage(items)
  }, [items])

  // スライドのパース
  useEffect(() => {
    const slideSplitLevel = formatConfigs[currentFormat].slideSplitLevel
    const slideTexts = splitSlidesByHeading(editorContent, slideSplitLevel)
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
  }, [editorContent, currentIndex, currentFormat])

  // コンソールメッセージの生成
  useEffect(() => {
    const messages = generateConsoleMessages(editorContent)
    setConsoleMessages(messages)
  }, [editorContent])

  // アイテム管理のハンドラー
  const handleAddItem = () => {
    setEditingItem(null)
    setShowItemModal(true)
  }

  const handleEditItem = (item: Item) => {
    // メインスライドアイテムの場合は編集モーダルを開かない（エディタで直接編集）
    if (item.id === MAIN_SLIDE_ITEM_ID) {
      // メインスライドアイテムを選択状態のままにする
      return
    }
    setEditingItem(item)
    setShowItemModal(true)
    }

  const handleUpdateItem = (itemId: string, updates: Partial<Item>) => {
    setItems(prev => updateItem(prev, itemId, updates))
  }

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setItems(prev => {
        const newItems = deleteItem(prev, itemId)
        // 削除されたアイテムが選択されていた場合、メインスライドアイテムを選択
        if (selectedItemId === itemId) {
          setSelectedItemId(MAIN_SLIDE_ITEM_ID)
        }
        return newItems
      })
    }
  }

  const handleSaveItem = (itemData: Partial<Item>) => {
    if (editingItem) {
      // Update existing item
      setItems(prev => updateItem(prev, editingItem.id, itemData))
    } else {
      // Create new item
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

  const handleInsertItem = (item: Item) => {
    // Insert item reference at the cursor position
    const insertText = `@${item.name}`
    setEditorContent(prev => prev + '\n\n' + insertText)
  }

  const handleNavigate = (direction: 'prev' | 'next') => {
    console.log('[App] handleNavigate called:', {
      direction,
      currentIndex,
      slidesLength: slides.length
    })
    setCurrentIndex(prevIndex => {
      console.log('[App] setCurrentIndex callback:', {
        prevIndex,
        direction,
        slidesLength: slides.length
      })
      if (direction === 'prev' && prevIndex > 0) {
        const newIndex = prevIndex - 1
        console.log('[App] Navigating to prev, newIndex:', newIndex)
        return newIndex
      } else if (direction === 'next' && prevIndex < slides.length - 1) {
        const newIndex = prevIndex + 1
        console.log('[App] Navigating to next, newIndex:', newIndex)
        return newIndex
      }
      console.log('[App] Cannot navigate, staying at:', prevIndex)
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
    
    // 作成したアイテムを選択状態にする
    setSelectedItemId(newTableItem.id)
  }

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden">
      <Toolbar
        onLoad={() => loadPresentation(setEditorContent, setCurrentIndex)}
        onShowHelp={() => setShowHelpModal(true)}
        onShowExport={() => setShowExportModal(true)}
        onStartSlideShow={() => {
          if (slides.length > 0) {
            setShowSlideShow(true)
          } else {
            alert('スライドがありません')
          }
        }}
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
          <ToneSelector
            currentTone={currentTone}
            onToneChange={setCurrentTone}
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
              previewRef={previewRef}
              items={items}
              onNavigate={handleNavigate}
            />
          </div>

          <SlideCarousel
            slides={slides}
            currentIndex={currentIndex}
            currentFormat={currentFormat}
            currentTone={currentTone}
            items={items}
            setCurrentIndex={setCurrentIndex}
          />
        </div>

        {/* エディター + アイテムタブバー */}
        <div className="flex flex-col" style={{ minHeight: 0, width: '35%' }}>
          {/* アイテム名表示 */}
          {selectedItemId && (() => {
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
                      style={{ fontSize: '0.875rem', color: '#e5e7eb', fontWeight: 500, cursor: selectedItem.id === MAIN_SLIDE_ITEM_ID ? 'default' : 'text' }}
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
          
          <div className="flex" style={{ flex: 1, minHeight: 0 }}>
            {/* エディター部分（条件付き表示） */}
            <div className="flex flex-col relative" style={{ minHeight: 0, flex: '1 1 auto' }}>
            {/* その他のアイテム選択時：ItemDetailPanelを表示 */}
            {selectedItemId && selectedItemId !== MAIN_SLIDE_ITEM_ID ? (
              <ItemDetailPanel
                item={items.find(item => item.id === selectedItemId) || null}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onUpdateItem={handleUpdateItem}
                onInsert={handleInsertItem}
                onClose={() => setSelectedItemId(null)}
                existingNames={items.map(item => item.name)}
              />
            ) : (
              /* デフォルト（メインスライドアイテム選択時 or 未選択時）：エディタを表示 */
              <>
                <Editor
                  editorContent={editorContent}
                  setEditorContent={setEditorContent}
                  isComposing={isComposing}
                  setIsComposing={setIsComposing}
                  errorMessages={consoleMessages}
                />
                <div
                  className="pointer-events-none absolute bottom-6 z-40"
                  style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(420px, calc(100% - 120px))' }}
                >
                  <div className="pointer-events-auto w-full">
                    <Toast messages={consoleMessages} />
                  </div>
                </div>
              </>
            )}
      </div>

            {/* アイテムタブバー（常時表示） */}
            <div className="flex flex-col" style={{ width: '48px', minHeight: 0, borderLeft: '1px solid #3a3a3a' }}>
              <ItemTabBar
                items={items}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                existingNames={items.map(item => item.name)}
              />
            </div>
          </div>
        </div>

        {/* AIチャットパネル */}
        <div className="flex flex-col" style={{ width: '25%', minHeight: 0 }}>
          <ChatPanel
            editorContent={editorContent}
            onApplyEdit={(content) => setEditorContent(content)}
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
