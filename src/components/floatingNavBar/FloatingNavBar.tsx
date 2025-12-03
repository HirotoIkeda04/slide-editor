import { useState, useRef, useEffect, useCallback } from 'react'
import './FloatingNavBar.css'
import type { TableDisplayFormat } from '../../types'

type ItemType = 'slide' | 'table' | 'image' | 'text' | null

interface FloatingNavBarProps {
  itemType: ItemType
  // Slide用 (new line-based format)
  currentLine?: number  // 1-based line number
  currentAttribute?: string | null
  selection?: { startLine: number; endLine: number } | null  // 1-based line numbers
  onSetAttribute?: (lineNumber: number, attribute: string | null) => void
  onSetAttributesForRange?: (startLine: number, endLine: number, attribute: string | null) => void
  // Table用
  onTableOperation?: (operation: string, ...args: unknown[]) => void
  tableState?: {
    hasSelection: boolean
    canMerge: boolean
    canUnmerge: boolean
    isExpanded?: boolean
    displayFormat?: TableDisplayFormat
    hiddenRowsCount?: number
    hiddenColumnsCount?: number
  }
  // Image用
  onImageOperation?: (operation: string, ...args: unknown[]) => void
  imageState?: {
    displayMode: 'contain' | 'cover'
    isCropping: boolean
  }
  // 位置調整用（行番号カラムを除いた中央配置）
  leftOffset?: string
}

// ボタンの定義（優先順位順）
interface ButtonConfig {
  id: string
  label: React.ReactNode
  title: string
  attribute?: string | null
  isActive?: (currentAttribute: string | null) => boolean
  icon?: string
  group: number // グループ番号（同じグループは一緒に表示/非表示）
}

export const FloatingNavBar = ({
  itemType,
  currentLine,
  currentAttribute,
  selection,
  onSetAttribute,
  onSetAttributesForRange,
  onTableOperation,
  tableState,
  onImageOperation,
  imageState,
  leftOffset: _leftOffset,
}: FloatingNavBarProps) => {
  const [visibleCount, setVisibleCount] = useState<number>(Infinity)
  const [showOverflow, setShowOverflow] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const overflowRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slide用ボタン定義（優先順位順）
  const slideButtons: ButtonConfig[] = [
    { id: 'h1', label: 'H1', title: '見出し1 (#)', attribute: '#', isActive: (a) => a === '#', group: 1 },
    { id: 'h2', label: 'H2', title: '見出し2 (##)', attribute: '##', isActive: (a) => a === '##', group: 1 },
    { id: 'h3', label: 'H3', title: '見出し3 (###)', attribute: '###', isActive: (a) => a === '###', group: 1 },
    { id: 'bullet', label: <span className="material-icons">format_list_bulleted</span>, title: '箇条書き (-)', attribute: '-', isActive: (a) => a === '-', group: 2 },
    { id: 'numbered', label: <span className="material-icons">format_list_numbered</span>, title: '番号付きリスト (1.)', attribute: '1.', isActive: (a) => /^\d+\.$/.test(a || ''), group: 3 },
    { id: 'asterisk', label: '*', title: 'アスタリスク (*)', attribute: '*', isActive: (a) => a === '*', group: 2 },
    { id: 'important', label: '!', title: 'キーメッセージ (!)', attribute: '!', isActive: (a) => a === '!', group: 2 },
    { id: 'alpha', label: 'A.', title: 'アルファベットリスト (A.)', attribute: 'A.', isActive: (a) => /^[A-Z]\.$/.test(a || ''), group: 3 },
    { id: 'clear', label: <span className="material-icons">format_clear</span>, title: '属性値を削除', attribute: null, isActive: (a) => a === null, group: 4 },
  ]

  // ボタンをグループごとにまとめる
  const getGroupedButtons = (buttons: ButtonConfig[], maxVisible: number) => {
    const visible: ButtonConfig[] = []
    const overflow: ButtonConfig[] = []
    let currentCount = 0
    let currentGroup = 0

    for (const btn of buttons) {
      if (btn.group !== currentGroup) {
        currentGroup = btn.group
        // 新しいグループを追加できるか確認
        const groupButtons = buttons.filter(b => b.group === btn.group)
        if (currentCount + groupButtons.length <= maxVisible) {
          // グループ全体を追加
          visible.push(...groupButtons)
          currentCount += groupButtons.length
        } else {
          // グループ全体をオーバーフローに
          overflow.push(...buttons.filter(b => b.group >= btn.group))
          break
        }
      }
    }

    return { visible, overflow }
  }

  // オーバーフローメニューを閉じる（外側クリック）
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false)
      }
    }
    if (showOverflow) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showOverflow])

  // ツールチップ表示ハンドラ
  const handleTooltipMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, text: string) => {
    // 既存のタイマーをクリア
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
      tooltipTimeoutRef.current = null
    }
    if (tooltipShowTimeoutRef.current) {
      clearTimeout(tooltipShowTimeoutRef.current)
      tooltipShowTimeoutRef.current = null
    }
    
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const gap = 8
    
    // ボタンの上に表示
    const x = rect.left + rect.width / 2
    const y = rect.top - gap
    
    // 少し遅延を設けてツールチップを表示
    tooltipShowTimeoutRef.current = setTimeout(() => {
      setTooltip({
        text,
        x,
        y
      })
    }, 300)
  }

  const handleTooltipMouseLeave = () => {
    // 表示待ちのタイマーをクリア
    if (tooltipShowTimeoutRef.current) {
      clearTimeout(tooltipShowTimeoutRef.current)
      tooltipShowTimeoutRef.current = null
    }
    // ツールチップを非表示にする
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip(null)
    }, 100)
  }

  // コンテナ幅を監視してvisibleCountを更新
  const updateVisibleCount = useCallback(() => {
    if (!barRef.current || !containerRef.current) return

    const containerWidth = containerRef.current.parentElement?.clientWidth || 0
    const buttonWidth = 32 // ボタン1つあたりの幅（padding込み）
    const dividerWidth = 12 // 区切り線の幅
    const overflowButtonWidth = 32 // ...ボタンの幅
    const padding = 24 // バーの左右パディング

    // 利用可能な幅を計算
    const availableWidth = containerWidth - padding - overflowButtonWidth

    // ボタン数を計算（グループごとの区切り線も考慮）
    // 簡易的に、1グループあたり平均3ボタン + 1区切り線として計算
    const buttonsPerGroup = 3
    const widthPerGroup = buttonsPerGroup * buttonWidth + dividerWidth
    const maxGroups = Math.floor(availableWidth / widthPerGroup)
    const maxButtons = maxGroups * buttonsPerGroup

    setVisibleCount(Math.max(3, maxButtons)) // 最低3ボタン（H1,H2,H3）は表示
  }, [])

  useEffect(() => {
    updateVisibleCount()

    const resizeObserver = new ResizeObserver(() => {
      updateVisibleCount()
    })

    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement)
    }

    return () => resizeObserver.disconnect()
  }, [updateVisibleCount])

  if (!itemType) return null

  const handleSetAttributeClick = (attribute: string | null) => {
    // 複数行選択されている場合
    if (selection && selection.startLine !== selection.endLine && onSetAttributesForRange) {
      const startLine = Math.min(selection.startLine, selection.endLine)
      const endLine = Math.max(selection.startLine, selection.endLine)
      
      // トグル判定: 現在の属性と同じかどうか
      let shouldToggle = false
      
      if (attribute === null) {
        shouldToggle = false
      } else if (attribute === '1.' || attribute === 'A.') {
        if (attribute === '1.') {
          shouldToggle = /^\d+\.$/.test(currentAttribute || '')
        } else if (attribute === 'A.') {
          shouldToggle = /^[A-Z]\.$/.test(currentAttribute || '')
        }
      } else {
        shouldToggle = currentAttribute === attribute
      }
      
      const newAttribute = shouldToggle ? null : attribute
      onSetAttributesForRange(startLine, endLine, newAttribute)
      setShowOverflow(false)
      return
    }
    
    // 単一行の場合
    if (currentLine && onSetAttribute) {
      let shouldToggle = false
      
      if (attribute === null) {
        shouldToggle = false
      } else if (attribute === '1.' || attribute === 'A.') {
        if (attribute === '1.') {
          shouldToggle = /^\d+\.$/.test(currentAttribute || '')
        } else if (attribute === 'A.') {
          shouldToggle = /^[A-Z]\.$/.test(currentAttribute || '')
        }
      } else {
        shouldToggle = currentAttribute === attribute
      }
      
      const newAttribute = shouldToggle ? null : attribute
      onSetAttribute(currentLine, newAttribute)
    }
    setShowOverflow(false)
  }

  // Slide用のナビゲーションバー
  if (itemType === 'slide') {
    const { visible, overflow } = getGroupedButtons(slideButtons, visibleCount)
    const hasOverflow = overflow.length > 0

    // グループIDごとにボタンをレンダリング
    const renderButtonGroups = (buttons: ButtonConfig[], inMenu = false) => {
      const groups: { [key: number]: ButtonConfig[] } = {}
      buttons.forEach(btn => {
        if (!groups[btn.group]) groups[btn.group] = []
        groups[btn.group].push(btn)
      })

      const groupKeys = Object.keys(groups).map(Number).sort((a, b) => a - b)

      return groupKeys.map((groupId, index) => (
        <div key={groupId} className={inMenu ? 'floating-nav-bar-menu-group' : 'floating-nav-bar-group'}>
          {groups[groupId].map(btn => (
            <button
              key={btn.id}
              className={`floating-nav-bar-btn ${btn.isActive?.(currentAttribute ?? null) ? 'active' : ''}`}
              onClick={() => handleSetAttributeClick(btn.attribute ?? null)}
              onMouseEnter={(e) => handleTooltipMouseEnter(e, btn.title)}
              onMouseLeave={handleTooltipMouseLeave}
            >
              {btn.label}
            </button>
          ))}
          {!inMenu && index < groupKeys.length - 1 && <div className="floating-nav-bar-divider" />}
        </div>
      ))
    }

    return (
      <>
      <div ref={containerRef} className="floating-nav-bar-container">
        <div ref={barRef} className="floating-nav-bar">
          {renderButtonGroups(visible)}

          {/* オーバーフローボタン */}
          {hasOverflow && (
            <>
              <div className="floating-nav-bar-divider" />
              <div className="floating-nav-bar-group" ref={overflowRef}>
                <button
                  className={`floating-nav-bar-btn floating-nav-bar-overflow-btn ${showOverflow ? 'active' : ''}`}
                  onClick={() => setShowOverflow(!showOverflow)}
                   onMouseEnter={(e) => handleTooltipMouseEnter(e, 'その他のオプション')}
                   onMouseLeave={handleTooltipMouseLeave}
                >
                   <span className="material-icons">more_vert</span>
                </button>

                {/* オーバーフローメニュー */}
                {showOverflow && (
                  <div className="floating-nav-bar-overflow-menu">
                    {renderButtonGroups(overflow, true)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
        
        {/* ツールチップ */}
        {tooltip && (
          <div
            className="floating-nav-bar-tooltip"
            style={{
              position: 'fixed',
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translateX(-50%) translateY(-100%)',
              pointerEvents: 'none',
              zIndex: 10000,
              marginTop: '-8px'
            }}
            onMouseEnter={() => {
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current)
                tooltipTimeoutRef.current = null
              }
            }}
            onMouseLeave={() => {
              setTooltip(null)
            }}
          >
            {tooltip.text}
          </div>
        )}
      </>
    )
  }

  // Table用ボタン定義（優先順位順・グループ分け）
  interface TableButtonConfig {
    id: string
    icon: string
    title: string
    operation: string
    operationArg?: string
    isActive?: () => boolean
    isDisabled?: () => boolean
    group: number
  }

  const tableButtons: TableButtonConfig[] = [
    // グループ1: 行操作
    { id: 'addRow', icon: 'table_rows', title: '行を追加', operation: 'addRow', group: 1 },
    { id: 'deleteRow', icon: 'delete_sweep', title: '行を削除', operation: 'deleteRow', isDisabled: () => !tableState?.hasSelection, group: 1 },
    // グループ2: 列操作
    { id: 'addColumn', icon: 'view_column', title: '列を追加', operation: 'addColumn', group: 2 },
    { id: 'deleteColumn', icon: 'delete', title: '列を削除', operation: 'deleteColumn', isDisabled: () => !tableState?.hasSelection, group: 2 },
    // グループ3: セル結合
    { id: 'mergeCells', icon: 'call_merge', title: 'セルを結合', operation: 'mergeCells', isDisabled: () => !tableState?.canMerge, group: 3 },
    { id: 'unmergeCells', icon: 'call_split', title: 'セルの結合を解除', operation: 'unmergeCells', isDisabled: () => !tableState?.canUnmerge, group: 3 },
    // グループ4: 非表示の行/列を表示
    { id: 'showAllRows', icon: 'visibility', title: `非表示の行を表示 (${tableState?.hiddenRowsCount || 0}件)`, operation: 'showAllRows', isDisabled: () => !tableState?.hiddenRowsCount, group: 4 },
    { id: 'showAllColumns', icon: 'visibility', title: `非表示の列を表示 (${tableState?.hiddenColumnsCount || 0}件)`, operation: 'showAllColumns', isDisabled: () => !tableState?.hiddenColumnsCount, group: 4 },
    // グループ5: フォーマット
    { id: 'formatCells', icon: 'text_format', title: 'フォーマット設定', operation: 'formatCells', group: 5 },
    // グループ6: 表示形式
    { id: 'formatTable', icon: 'table_chart', title: '表形式', operation: 'setDisplayFormat', operationArg: 'table', isActive: () => tableState?.displayFormat === 'table' || !tableState?.displayFormat, group: 6 },
    { id: 'formatLine', icon: 'show_chart', title: '折れ線グラフ', operation: 'setDisplayFormat', operationArg: 'line', isActive: () => tableState?.displayFormat === 'line', group: 6 },
    { id: 'formatArea', icon: 'area_chart', title: '面グラフ', operation: 'setDisplayFormat', operationArg: 'area', isActive: () => tableState?.displayFormat === 'area', group: 6 },
    { id: 'formatBar', icon: 'bar_chart', title: '棒グラフ', operation: 'setDisplayFormat', operationArg: 'bar', isActive: () => tableState?.displayFormat === 'bar', group: 6 },
    { id: 'formatScatter', icon: 'scatter_plot', title: '散布図', operation: 'setDisplayFormat', operationArg: 'scatter', isActive: () => tableState?.displayFormat === 'scatter', group: 6 },
    // グループ7: 拡大/縮小
    { id: 'toggleExpand', icon: tableState?.isExpanded ? 'fullscreen_exit' : 'fullscreen', title: tableState?.isExpanded ? '縮小' : '拡大', operation: 'toggleExpand', isActive: () => !!tableState?.isExpanded, group: 7 },
  ]

  // テーブルボタンをグループごとにまとめる
  const getGroupedTableButtons = (buttons: TableButtonConfig[], maxVisible: number) => {
    const visible: TableButtonConfig[] = []
    const overflow: TableButtonConfig[] = []
    let currentCount = 0
    const processedGroups = new Set<number>()

    for (const btn of buttons) {
      if (processedGroups.has(btn.group)) continue
      
      processedGroups.add(btn.group)
      const groupButtons = buttons.filter(b => b.group === btn.group)
      
      if (currentCount + groupButtons.length <= maxVisible) {
        visible.push(...groupButtons)
        currentCount += groupButtons.length
      } else {
        // このグループ以降をオーバーフローに
        const remainingButtons = buttons.filter(b => !visible.includes(b))
        overflow.push(...remainingButtons)
        break
      }
    }

    return { visible, overflow }
  }

  // Table用のナビゲーションバー
  if (itemType === 'table') {
    const { visible: visibleTableButtons, overflow: overflowTableButtons } = getGroupedTableButtons(tableButtons, visibleCount)
    const hasTableOverflow = overflowTableButtons.length > 0

    // テーブルボタンをグループごとにレンダリング
    const renderTableButtonGroups = (buttons: TableButtonConfig[], inMenu = false) => {
      const groups: { [key: number]: TableButtonConfig[] } = {}
      buttons.forEach(btn => {
        if (!groups[btn.group]) groups[btn.group] = []
        groups[btn.group].push(btn)
      })

      const groupKeys = Object.keys(groups).map(Number).sort((a, b) => a - b)

      return groupKeys.map((groupId, index) => (
        <div key={groupId} className={inMenu ? 'floating-nav-bar-menu-group' : 'floating-nav-bar-group'}>
          {groups[groupId].map(btn => (
            <button
              key={btn.id}
              className={`floating-nav-bar-btn ${btn.isActive?.() ? 'active' : ''}`}
              onClick={() => btn.operationArg ? onTableOperation?.(btn.operation, btn.operationArg) : onTableOperation?.(btn.operation)}
              onMouseEnter={(e) => handleTooltipMouseEnter(e, btn.title)}
              onMouseLeave={handleTooltipMouseLeave}
              disabled={btn.isDisabled?.()}
            >
              <span className="material-icons">{btn.icon}</span>
            </button>
          ))}
          {!inMenu && index < groupKeys.length - 1 && <div className="floating-nav-bar-divider" />}
          </div>
      ))
    }

    return (
      <>
      <div ref={containerRef} className="floating-nav-bar-container">
        <div ref={barRef} className="floating-nav-bar">
          {renderTableButtonGroups(visibleTableButtons)}

          {/* オーバーフローボタン */}
          {hasTableOverflow && (
            <>
          <div className="floating-nav-bar-divider" />
              <div className="floating-nav-bar-group" ref={overflowRef}>
            <button
                  className={`floating-nav-bar-btn floating-nav-bar-overflow-btn ${showOverflow ? 'active' : ''}`}
                  onClick={() => setShowOverflow(!showOverflow)}
                  onMouseEnter={(e) => handleTooltipMouseEnter(e, 'その他のオプション')}
              onMouseLeave={handleTooltipMouseLeave}
            >
                  <span className="material-icons">more_vert</span>
            </button>

                {/* オーバーフローメニュー */}
                {showOverflow && (
                  <div className="floating-nav-bar-overflow-menu">
                    {renderTableButtonGroups(overflowTableButtons, true)}
          </div>
                )}
              </div>
            </>
          )}
          </div>
        </div>
        
        {/* ツールチップ */}
        {tooltip && (
          <div
            className="floating-nav-bar-tooltip"
            style={{
              position: 'fixed',
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translateX(-50%) translateY(-100%)',
              pointerEvents: 'none',
              zIndex: 10000,
              marginTop: '-8px'
            }}
            onMouseEnter={() => {
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current)
                tooltipTimeoutRef.current = null
              }
            }}
            onMouseLeave={() => {
              setTooltip(null)
            }}
          >
            {tooltip.text}
      </div>
        )}
      </>
    )
  }

  // Image用のナビゲーションバー
  if (itemType === 'image') {
    return (
      <>
      <div className="floating-nav-bar-container">
        <div className="floating-nav-bar">
          {/* 切り抜き */}
          <div className="floating-nav-bar-group">
            <button
              className={`floating-nav-bar-btn ${imageState?.isCropping ? 'active' : ''}`}
              onClick={() => onImageOperation?.('toggleCrop')}
                onMouseEnter={(e) => handleTooltipMouseEnter(e, '画像を切り抜き')}
                onMouseLeave={handleTooltipMouseLeave}
            >
              <span className="material-icons">crop</span>
            </button>
          </div>

          <div className="floating-nav-bar-divider" />

          {/* 表示モード */}
          <div className="floating-nav-bar-group">
            <button
              className={`floating-nav-bar-btn ${imageState?.displayMode === 'contain' ? 'active' : ''}`}
              onClick={() => onImageOperation?.('setDisplayMode', 'contain')}
                onMouseEnter={(e) => handleTooltipMouseEnter(e, 'Contain（全体を表示）')}
                onMouseLeave={handleTooltipMouseLeave}
            >
              <span className="material-icons">fit_screen</span>
            </button>
            <button
              className={`floating-nav-bar-btn ${imageState?.displayMode === 'cover' ? 'active' : ''}`}
              onClick={() => onImageOperation?.('setDisplayMode', 'cover')}
                onMouseEnter={(e) => handleTooltipMouseEnter(e, 'Cover（領域を埋める）')}
                onMouseLeave={handleTooltipMouseLeave}
            >
              <span className="material-icons">aspect_ratio</span>
            </button>
          </div>

          </div>
        </div>
        
        {/* ツールチップ */}
        {tooltip && (
          <div
            className="floating-nav-bar-tooltip"
            style={{
              position: 'fixed',
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translateX(-50%) translateY(-100%)',
              pointerEvents: 'none',
              zIndex: 10000,
              marginTop: '-8px'
            }}
            onMouseEnter={() => {
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current)
                tooltipTimeoutRef.current = null
              }
            }}
            onMouseLeave={() => {
              setTooltip(null)
            }}
          >
            {tooltip.text}
      </div>
        )}
      </>
    )
  }

  // Text用は現在実装なし
  return null
}
