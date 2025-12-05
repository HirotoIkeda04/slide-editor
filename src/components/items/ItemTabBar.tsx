import { useState, useRef, useEffect } from 'react'
import type { Item } from '../../types'
import './Items.css'

const MAIN_SLIDE_ITEM_ID = 'main-slide'
const TONMANA_TAB_ID = 'tonmana'

interface ItemTabBarProps {
  items: Item[]
  selectedItemId: string | null
  onSelectItem: (itemId: string | null) => void
  onAddItem: () => void
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void
  onInsert?: (item: Item) => void
  onDelete?: (itemId: string) => void
  existingNames?: string[]
  // トンマナタブ用
  isTonmanaSelected?: boolean
  onSelectTonmana?: () => void
}

export const ItemTabBar = ({ 
  items, 
  selectedItemId, 
  onSelectItem, 
  onAddItem,
  onUpdateItem,
  onInsert,
  onDelete,
  existingNames = [],
  isTonmanaSelected = false,
  onSelectTonmana,
}: ItemTabBarProps) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [nameError, setNameError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [actionPopupItemId, setActionPopupItemId] = useState<string | null>(null)
  const [isEditingNameInPopup, setIsEditingNameInPopup] = useState(false)
  const popupNameInputRef = useRef<HTMLInputElement>(null)
  
  // Arc風 垂直アイテム名バーの状態
  const [showNameBar, setShowNameBar] = useState(false)
  const nameBarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const validateName = (value: string, currentItem: Item): boolean => {
    if (!value.trim()) {
      setNameError('Name is required')
      return false
    }
    const isDuplicate = existingNames.some(
      n => n === value && currentItem.name !== value
    )
    if (isDuplicate) {
      setNameError('Name already exists')
      return false
    }
    setNameError('')
    return true
  }

  const handleIconDoubleClick = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (item.id === MAIN_SLIDE_ITEM_ID) {
      return
    }
    // アクションポップアップを表示
    setActionPopupItemId(item.id)
    setIsEditingNameInPopup(false)
    setEditingName(item.name)
    setNameError('')
  }

  const handleNameChange = (value: string, currentItem: Item) => {
    setEditingName(value)
    validateName(value, currentItem)
  }

  const handleNameSave = (item: Item) => {
    if (!onUpdateItem) return
    if (validateName(editingName, item) && editingName.trim() !== item.name) {
      onUpdateItem(item.id, { name: editingName.trim() })
    }
    setEditingItemId(null)
    setNameError('')
  }

  const handleNameCancel = (item: Item) => {
    setEditingName(item.name)
    setNameError('')
    setEditingItemId(null)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, item: Item) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNameSave(item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleNameCancel(item)
    }
  }

  // アイテムが変更されたら編集状態をリセット
  useEffect(() => {
    setEditingItemId(null)
    setNameError('')
  }, [items.map(i => i.id).join(',')])

  // アクションポップアップを外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionPopupItemId) {
        const target = e.target as HTMLElement
        if (!target.closest('.item-tab-action-popup')) {
          // 名前編集モードの場合は、変更を保存してから閉じる
          if (isEditingNameInPopup) {
            const actionItem = items.find(item => item.id === actionPopupItemId)
            if (actionItem && validateName(editingName, actionItem) && editingName.trim() !== actionItem.name && onUpdateItem) {
              onUpdateItem(actionItem.id, { name: editingName.trim() })
            }
          }
          setActionPopupItemId(null)
          setIsEditingNameInPopup(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [actionPopupItemId, isEditingNameInPopup, editingName, items, onUpdateItem])

  // ポップアップ内の名前編集モードに入ったときにフォーカスを設定
  useEffect(() => {
    if (isEditingNameInPopup && popupNameInputRef.current) {
      popupNameInputRef.current.focus()
      popupNameInputRef.current.select()
    }
  }, [isEditingNameInPopup])

  // ESCキーでアクションポップアップを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && actionPopupItemId) {
        if (isEditingNameInPopup) {
          // 名前編集モードの場合は編集をキャンセル
          setIsEditingNameInPopup(false)
          const actionItem = items.find(item => item.id === actionPopupItemId)
          if (actionItem) {
            setEditingName(actionItem.name)
            setNameError('')
          }
        } else {
          // 通常モードの場合はポップアップを閉じる
          setActionPopupItemId(null)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [actionPopupItemId, isEditingNameInPopup, items])

  // 編集モードに入ったときにフォーカスを設定
  useEffect(() => {
    if (editingItemId && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingItemId])

  // 矢印キーでアイテムを切り替える
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 編集モード中は無視
      if (editingItemId) return
      
      // 入力フィールドにフォーカスがある場合は無視
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // 上矢印キーまたは下矢印キーが押された場合
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        
        // すべてのアイテムを順序付きで取得（メインスライドアイテムが最初）
        const mainSlide = items.find(item => item.id === MAIN_SLIDE_ITEM_ID)
        const others = items.filter(item => item.id !== MAIN_SLIDE_ITEM_ID)
        const allItems = mainSlide ? [mainSlide, ...others] : others
        
        if (allItems.length === 0) return
        
        // 現在選択されているアイテムのインデックスを取得
        const currentIndex = selectedItemId 
          ? allItems.findIndex(item => item.id === selectedItemId)
          : -1
        
        let newIndex: number | null = null
        if (e.key === 'ArrowUp') {
          // 上矢印: 前のアイテムに移動（最初の場合は移動しない）
          if (currentIndex > 0) {
            newIndex = currentIndex - 1
          }
        } else {
          // 下矢印: 次のアイテムに移動（最後の場合は移動しない）
          if (currentIndex < allItems.length - 1) {
            newIndex = currentIndex + 1
          }
        }
        
        // 新しいアイテムを選択
        if (newIndex !== null && allItems[newIndex]) {
          onSelectItem(allItems[newIndex].id)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItemId, items, editingItemId, onSelectItem])

  // サイドバー全体のホバーハンドラー（Arc風垂直バー用）
  const handleSidebarMouseEnter = () => {
    // 既存のタイマーをクリア
    if (nameBarTimeoutRef.current) {
      clearTimeout(nameBarTimeoutRef.current)
      nameBarTimeoutRef.current = null
    }
    // 一定時間後に垂直バーを表示
    nameBarTimeoutRef.current = setTimeout(() => {
      setShowNameBar(true)
    }, 400) // 400msの遅延
  }

  const handleSidebarMouseLeave = () => {
    // 表示待ちのタイマーをクリア
    if (nameBarTimeoutRef.current) {
      clearTimeout(nameBarTimeoutRef.current)
      nameBarTimeoutRef.current = null
    }
    // バーを非表示にする
    setShowNameBar(false)
  }

  // メインスライドアイテムとその他のアイテムを分離
  const mainSlideItem = items.find(item => item.id === MAIN_SLIDE_ITEM_ID)
  const otherItems = items.filter(item => item.id !== MAIN_SLIDE_ITEM_ID)

  console.log('[ItemTabBar] Render', { 
    itemsCount: items.length, 
    otherItemsCount: otherItems.length,
    onUpdateItem: !!onUpdateItem,
    editingItemId 
  })

  return (
    <div 
      className="item-tab-bar"
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
    >
      {/* Arc風 垂直アイテム名バー */}
      <div className={`item-name-bar ${showNameBar ? 'visible' : ''}`}>
        {/* メインスライドアイテム */}
        {mainSlideItem && (
          <div 
            className={`item-name-bar-item ${selectedItemId === mainSlideItem.id && !isTonmanaSelected ? 'active' : ''}`}
            onClick={() => onSelectItem(mainSlideItem.id)}
          >
            <span className="item-name-bar-text">{mainSlideItem.name}</span>
          </div>
        )}
        
        {/* トンマナ */}
        {onSelectTonmana && (
          <div 
            className={`item-name-bar-item ${isTonmanaSelected ? 'active' : ''}`}
            onClick={onSelectTonmana}
          >
            <span className="item-name-bar-text">トンマナ</span>
          </div>
        )}
        
        {/* セパレーター */}
        {mainSlideItem && otherItems.length > 0 && (
          <div className="item-name-bar-separator" />
        )}
        
        {/* その他のアイテム */}
        {otherItems.map(item => (
          <div 
            key={item.id}
            className={`item-name-bar-item ${selectedItemId === item.id ? 'active' : ''}`}
            onClick={() => onSelectItem(item.id)}
          >
            <span className="item-name-bar-text">{item.name}</span>
          </div>
        ))}
        
        {/* 追加ボタンのスペーサー */}
        <div className="item-name-bar-add-spacer" />
      </div>

      {/* アイテムリスト（縦一列） */}
      <div className="item-tab-items">
        {/* メインスライドアイテムを最初に表示 */}
        {mainSlideItem && (
          <button
            key={mainSlideItem.id}
            className={`item-tab-icon-button ${selectedItemId === mainSlideItem.id && !isTonmanaSelected ? 'active' : ''}`}
            onClick={(e) => {
              onSelectItem(mainSlideItem.id)
              // マウスクリック後はフォーカスを削除して、ブラウザのデフォルトフォーカススタイルを防ぐ
              e.currentTarget.blur()
            }}
          >
            <span className="material-icons">{getItemIcon(mainSlideItem.type)}</span>
          </button>
        )}

        {/* トンマナタブ（Main Slideの直下） */}
        {onSelectTonmana && (
          <button
            key={TONMANA_TAB_ID}
            className={`item-tab-icon-button tonmana-tab ${isTonmanaSelected ? 'active' : ''}`}
            onClick={(e) => {
              onSelectTonmana()
              e.currentTarget.blur()
            }}
            title="トンマナ設定"
          >
            <span className="material-icons">palette</span>
          </button>
        )}

        {/* Main Slide/トンマナとその他のアイテムの区切り線 */}
        {mainSlideItem && otherItems.length > 0 && (
          <div className="item-tab-separator" />
        )}
        
        {/* その他のアイテム */}
        {otherItems.map(item => (
          <button
            key={item.id}
            data-item-id={item.id}
            className={`item-tab-icon-button ${selectedItemId === item.id ? 'active' : ''}`}
            onClick={(e) => {
              // 編集モード中はクリックで選択しない
              if (editingItemId !== item.id) {
                onSelectItem(item.id)
                // マウスクリック後はフォーカスを削除して、ブラウザのデフォルトフォーカススタイルを防ぐ
                e.currentTarget.blur()
              }
            }}
            onDoubleClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleIconDoubleClick(item, e)
            }}
          >
            <span className="material-icons">{getItemIcon(item.type)}</span>
          </button>
        ))}

        {/* 追加ボタン（常に一番下） */}
        <button
          className="item-tab-add-button"
          onClick={onAddItem}
          title="Add new item"
        >
          <span className="material-icons">add</span>
        </button>
      </div>

      {/* アクションポップアップ（Insert/Delete） */}
      {actionPopupItemId && (() => {
        const actionItem = items.find(item => item.id === actionPopupItemId)
        if (!actionItem) return null
        
        // ポップアップの位置を計算
        const allItems = mainSlideItem ? [mainSlideItem, ...otherItems] : otherItems
        const itemIndex = allItems.findIndex(item => item.id === actionPopupItemId)
        const topPosition = itemIndex * 48 // アイテムの高さ * インデックス
        
        return (
          <div 
            className="item-tab-action-popup"
            style={{ top: `${topPosition}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="item-tab-action-popup-content">
              <div className="item-tab-action-popup-header">
                <span className="item-tab-action-popup-title">{actionItem.name}</span>
                <button
                  className="item-tab-action-popup-close"
                  onClick={() => {
                    setActionPopupItemId(null)
                    setIsEditingNameInPopup(false)
                  }}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="item-tab-action-popup-actions">
                {/* アイテム名編集 */}
                {isEditingNameInPopup ? (
                  <div className="item-tab-action-popup-name-edit">
                    <input
                      ref={popupNameInputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => handleNameChange(e.target.value, actionItem)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (validateName(editingName, actionItem) && editingName.trim() !== actionItem.name && onUpdateItem) {
                            onUpdateItem(actionItem.id, { name: editingName.trim() })
                            setIsEditingNameInPopup(false)
                            setNameError('')
                          }
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          setIsEditingNameInPopup(false)
                          setEditingName(actionItem.name)
                          setNameError('')
                        }
                      }}
                      onBlur={() => {
                        if (validateName(editingName, actionItem) && editingName.trim() !== actionItem.name && onUpdateItem) {
                          onUpdateItem(actionItem.id, { name: editingName.trim() })
                        }
                        setIsEditingNameInPopup(false)
                        setNameError('')
                      }}
                      className={`item-tab-action-popup-name-input ${nameError ? 'error' : ''}`}
                    />
                    {nameError && <div className="item-tab-action-popup-name-error">{nameError}</div>}
                  </div>
                ) : (
                  <button
                    className="item-tab-action-button edit-name"
                    onClick={() => {
                      setIsEditingNameInPopup(true)
                      setEditingName(actionItem.name)
                      setNameError('')
                    }}
                  >
                    <span className="material-icons">edit</span>
                    <span>名前を変更</span>
                  </button>
                )}
                {onInsert && (
                  <button
                    className="item-tab-action-button insert"
                    onClick={() => {
                      onInsert(actionItem)
                      setActionPopupItemId(null)
                      setIsEditingNameInPopup(false)
                    }}
                  >
                    <span className="material-icons">add_circle</span>
                    <span>Insert</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    className="item-tab-action-button delete"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this item?')) {
                        onDelete(actionItem.id)
                        setActionPopupItemId(null)
                        setIsEditingNameInPopup(false)
                      }
                    }}
                  >
                    <span className="material-icons">delete</span>
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* 編集モード時の名前入力（ポップアップ形式） */}
      {editingItemId && (() => {
        const editingItem = items.find(item => item.id === editingItemId)
        if (!editingItem) return null
        
        // 編集対象のアイテムのインデックスを取得
        const allItems = mainSlideItem ? [mainSlideItem, ...otherItems] : otherItems
        const itemIndex = allItems.findIndex(item => item.id === editingItemId)
        const topPosition = itemIndex * 48 // アイテムの高さ * インデックス
        
        return (
          <div 
            className="item-tab-name-edit-popup"
            style={{ top: `${topPosition}px` }}
          >
            <div className="item-tab-name-edit-popup-content">
              <label>Item Name</label>
              <input
                ref={nameInputRef}
                type="text"
                value={editingName}
                onChange={(e) => handleNameChange(e.target.value, editingItem)}
                onKeyDown={(e) => handleNameKeyDown(e, editingItem)}
                className={`item-tab-name-input ${nameError ? 'error' : ''}`}
                onFocus={(e) => {
                  e.target.style.borderColor = nameError ? '#FF5370' : '#F5E6D3'
                  e.target.style.background = '#252525'
                  e.target.style.padding = '0.125rem 0.25rem'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'transparent'
                  e.target.style.background = 'transparent'
                  e.target.style.padding = '0'
                  handleNameSave(editingItem)
                }}
              />
              {nameError && <div className="item-tab-name-error">{nameError}</div>}
            </div>
          </div>
        )
      })()}
      
    </div>
  )
}

