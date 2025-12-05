import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { ImpressionCode, ImpressionRange, ImpressionStyleVars, StylePins, ImpressionSubAttributes } from '../../types'
import { 
  impressionPresets, 
  getDisplayName,
  impressionCodeToString,
  stringToImpressionCode,
  DEFAULT_IMPRESSION_RANGE,
  impressionCodesEqual,
} from '../../constants/impressionConfigs'
import { generateStyleVars } from '../../utils/impressionStyle'
import { ImpressionSamples } from './ImpressionSamples'
import { ImpressionSliders } from './ImpressionSliders'
import { ImpressionDetail } from './ImpressionDetail'
import './ImpressionPanel.css'

interface ImpressionPanelProps {
  code: ImpressionCode
  onCodeChange: (code: ImpressionCode) => void
  styleOverrides?: Partial<ImpressionStyleVars>
  onStyleOverride?: (overrides: Partial<ImpressionStyleVars>) => void
  stylePins?: StylePins
  onStylePinChange?: (pins: Partial<StylePins>) => void
}

export const ImpressionPanel = ({
  code,
  onCodeChange,
  styleOverrides,
  onStyleOverride,
  stylePins,
  onStylePinChange,
}: ImpressionPanelProps) => {
  // 前回のコード（履歴）
  const [previousCode, setPreviousCode] = useState<ImpressionCode | null>(null)
  
  // スライダーの区間
  const [range, setRange] = useState<ImpressionRange>(DEFAULT_IMPRESSION_RANGE)
  
  // サブ属性
  const [subAttributes, setSubAttributes] = useState<ImpressionSubAttributes>({})
  
  // 編集用state
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingCode, setIsEditingCode] = useState(false)
  const [customName, setCustomName] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [editCodeValue, setEditCodeValue] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  
  // 入力フィールドのref
  const nameInputRef = useRef<HTMLInputElement>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)
  
  // 現在のスタイル変数
  const styleVars = useMemo(() => {
    const base = generateStyleVars(code, subAttributes)
    if (styleOverrides) {
      return { ...base, ...styleOverrides }
    }
    return base
  }, [code, subAttributes, styleOverrides])
  
  // 現在の表示名を取得
  const currentDisplayName = useMemo(() => getDisplayName(code), [code])
  
  // 現在のプリセットを確認（プリセットチップのactive表示用）
  const currentPresetId = useMemo(() => {
    return impressionPresets.find(p => 
      p.code.energy === code.energy &&
      p.code.formality === code.formality &&
      p.code.classicModern === code.classicModern &&
      p.code.decoration === code.decoration
    )?.id
  }, [code])
  
  // 見本を選択
  const handleSelect = useCallback((newCode: ImpressionCode) => {
    if (!impressionCodesEqual(newCode, code)) {
      setPreviousCode(code)
      onCodeChange(newCode)
    }
  }, [code, onCodeChange])
  
  // ダブルクリックで絞り込み
  const handleDoubleClick = useCallback((baseCode: ImpressionCode) => {
    // 基準コードの周辺に区間を絞る
    const newRange: ImpressionRange = {
      energy: [
        Math.max(1, baseCode.energy - 1),
        Math.min(5, baseCode.energy + 1),
      ],
      formality: [
        Math.max(1, baseCode.formality - 1),
        Math.min(5, baseCode.formality + 1),
      ],
      classicModern: [
        Math.max(1, baseCode.classicModern - 1),
        Math.min(5, baseCode.classicModern + 1),
      ],
      decoration: [
        Math.max(1, baseCode.decoration - 1),
        Math.min(5, baseCode.decoration + 1),
      ],
    }
    setRange(newRange)
    
    if (!impressionCodesEqual(baseCode, code)) {
      setPreviousCode(code)
      onCodeChange(baseCode)
    }
  }, [code, onCodeChange])
  
  // 区間をリセット（広げる）
  const handleExpand = useCallback(() => {
    setRange(DEFAULT_IMPRESSION_RANGE)
  }, [])
  
  // プリセットを選択
  const handlePresetClick = useCallback((presetId: string) => {
    const preset = impressionPresets.find(p => p.id === presetId)
    if (preset) {
      handleSelect(preset.code)
      // テックプリセットの場合はデフォルトで「寒色」を設定
      if (presetId === 'tech') {
        setSubAttributes(prev => ({ ...prev, colorTemperature: 'cool' }))
      }
    }
  }, [handleSelect])
  
  // 名前編集開始
  const handleNameDoubleClick = useCallback(() => {
    const displayName = customName || currentDisplayName.nameJa
    setEditNameValue(displayName)
    setIsEditingName(true)
  }, [customName, currentDisplayName.nameJa])
  
  // 名前編集確定
  const handleNameEditConfirm = useCallback(() => {
    const trimmed = editNameValue.trim()
    if (trimmed && trimmed !== currentDisplayName.nameJa) {
      setCustomName(trimmed)
    } else if (trimmed === currentDisplayName.nameJa) {
      setCustomName(null)  // プリセット名と同じならカスタム名をクリア
    }
    setIsEditingName(false)
  }, [editNameValue, currentDisplayName.nameJa])
  
  // 名前編集キャンセル
  const handleNameEditCancel = useCallback(() => {
    setIsEditingName(false)
  }, [])
  
  // 名前編集キー操作
  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNameEditConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleNameEditCancel()
    }
  }, [handleNameEditConfirm, handleNameEditCancel])
  
  // コード編集開始
  const handleCodeDoubleClick = useCallback(() => {
    setEditCodeValue(impressionCodeToString(code))
    setIsEditingCode(true)
  }, [code])
  
  // コード編集確定
  const handleCodeEditConfirm = useCallback(() => {
    const parsed = stringToImpressionCode(editCodeValue.toUpperCase())
    if (parsed) {
      // 各軸が1-5の範囲かチェック
      const isValid = 
        parsed.energy >= 1 && parsed.energy <= 5 &&
        parsed.formality >= 1 && parsed.formality <= 5 &&
        parsed.classicModern >= 1 && parsed.classicModern <= 5 &&
        parsed.decoration >= 1 && parsed.decoration <= 5
      
      if (isValid && !impressionCodesEqual(parsed, code)) {
        setPreviousCode(code)
        onCodeChange(parsed)
      }
    }
    setIsEditingCode(false)
  }, [editCodeValue, code, onCodeChange])
  
  // コード編集キャンセル
  const handleCodeEditCancel = useCallback(() => {
    setIsEditingCode(false)
  }, [])
  
  // コード編集キー操作
  const handleCodeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCodeEditConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCodeEditCancel()
    }
  }, [handleCodeEditConfirm, handleCodeEditCancel])
  
  // クリップボードにコピー
  const handleCopyToClipboard = useCallback(async () => {
    const displayName = customName || currentDisplayName.nameJa
    const codeStr = impressionCodeToString(code)
    const text = `${displayName} (${codeStr})`
    
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 1500)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }, [customName, currentDisplayName.nameJa, code])
  
  // 編集開始時にフォーカス
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])
  
  useEffect(() => {
    if (isEditingCode && codeInputRef.current) {
      codeInputRef.current.focus()
      codeInputRef.current.select()
    }
  }, [isEditingCode])
  
  return (
    <div className="impression-panel">
      {/* 見本から選択 */}
      <div className="impression-section">
        <div className="impression-section-title">見本から選択</div>
        <ImpressionSamples
          currentCode={code}
          previousCode={previousCode}
          range={range}
          onSelect={handleSelect}
          onDoubleClick={handleDoubleClick}
        />
        <button className="impression-expand-btn" onClick={handleExpand}>
          <span className="material-icons" style={{ fontSize: '0.875rem' }}>unfold_more</span>
          広げる
        </button>
      </div>
      
      {/* 適用中のトンマナ */}
      <div className="impression-section">
        <div className="impression-section-title">適用中のトンマナ</div>
        <div className="impression-current">
          {/* トンマナ名（ダブルクリックで編集） */}
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              className="impression-current-name-input"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameEditConfirm}
            />
          ) : (
            <span 
              className="impression-current-name"
              onDoubleClick={handleNameDoubleClick}
              title="ダブルクリックで編集"
            >
              {customName || currentDisplayName.nameJa}
            </span>
          )}
          
          {/* コード（ダブルクリックで編集） */}
          {isEditingCode ? (
            <input
              ref={codeInputRef}
              type="text"
              className="impression-current-code-input"
              value={editCodeValue}
              onChange={(e) => setEditCodeValue(e.target.value.toUpperCase())}
              onKeyDown={handleCodeKeyDown}
              onBlur={handleCodeEditConfirm}
              placeholder="E3F3C3D3"
              maxLength={8}
            />
          ) : (
            <span 
              className="impression-current-code"
              onDoubleClick={handleCodeDoubleClick}
              title="ダブルクリックで編集"
            >
              {impressionCodeToString(code)}
            </span>
          )}
          
          {/* クリップボードにコピー */}
          <button
            className={`impression-copy-btn ${copyFeedback ? 'copied' : ''}`}
            onClick={handleCopyToClipboard}
            title="クリップボードにコピー"
          >
            <span className="material-icons">
              {copyFeedback ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>
        
        {/* プリセットチップ */}
        <div className="impression-presets" style={{ marginTop: '0.75rem' }}>
          {impressionPresets.map(preset => (
            <button
              key={preset.id}
              className={`impression-preset-chip ${currentPresetId === preset.id ? 'active' : ''}`}
              onClick={() => handlePresetClick(preset.id)}
              title={preset.description}
            >
              {preset.nameJa}
            </button>
          ))}
        </div>
      </div>
      
      {/* サブ属性 */}
      <div className="impression-section">
        <div className="impression-section-title">詳細設定</div>
        <div className="impression-sub-attributes">
          {/* テーマモード */}
          <div className="impression-sub-attr-row">
            <span className="impression-sub-attr-label">テーマ</span>
            <div className="impression-sub-attr-buttons">
              {(['light', 'auto', 'dark'] as const).map(mode => (
                <button
                  key={mode}
                  className={`impression-sub-attr-btn ${subAttributes.themeMode === mode || (!subAttributes.themeMode && mode === 'auto') ? 'active' : ''}`}
                  onClick={() => setSubAttributes(prev => ({ ...prev, themeMode: mode === 'auto' ? undefined : mode }))}
                >
                  {mode === 'light' ? 'ライト' : mode === 'dark' ? 'ダーク' : '自動'}
                </button>
              ))}
            </div>
          </div>
          
          {/* 色温度 */}
          <div className="impression-sub-attr-row">
            <span className="impression-sub-attr-label">色温度</span>
            <div className="impression-sub-attr-buttons">
              {(['cool', 'neutral', 'warm'] as const).map(temp => (
                <button
                  key={temp}
                  className={`impression-sub-attr-btn ${subAttributes.colorTemperature === temp || (!subAttributes.colorTemperature && temp === 'neutral') ? 'active' : ''}`}
                  onClick={() => setSubAttributes(prev => ({ ...prev, colorTemperature: temp === 'neutral' ? undefined : temp }))}
                >
                  {temp === 'cool' ? '寒色' : temp === 'warm' ? '暖色' : '中性'}
                </button>
              ))}
            </div>
          </div>
          
          {/* コントラスト */}
          <div className="impression-sub-attr-row">
            <span className="impression-sub-attr-label">コントラスト</span>
            <div className="impression-sub-attr-buttons">
              {(['low', 'medium', 'high'] as const).map(contrast => (
                <button
                  key={contrast}
                  className={`impression-sub-attr-btn ${subAttributes.contrast === contrast || (!subAttributes.contrast && contrast === 'medium') ? 'active' : ''}`}
                  onClick={() => setSubAttributes(prev => ({ ...prev, contrast: contrast === 'medium' ? undefined : contrast }))}
                >
                  {contrast === 'low' ? '低' : contrast === 'high' ? '高' : '中'}
                </button>
              ))}
            </div>
          </div>
          
          {/* 彩度 */}
          <div className="impression-sub-attr-row">
            <span className="impression-sub-attr-label">彩度</span>
            <div className="impression-sub-attr-buttons">
              {(['muted', 'normal', 'vivid'] as const).map(sat => (
                <button
                  key={sat}
                  className={`impression-sub-attr-btn ${subAttributes.saturation === sat || (!subAttributes.saturation && sat === 'normal') ? 'active' : ''}`}
                  onClick={() => setSubAttributes(prev => ({ ...prev, saturation: sat === 'normal' ? undefined : sat }))}
                >
                  {sat === 'muted' ? '控えめ' : sat === 'vivid' ? '鮮やか' : '標準'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* スライダー */}
      <div className="impression-section">
        <div className="impression-section-title">軸ごとに調整</div>
        <ImpressionSliders
          code={code}
          range={range}
          onCodeChange={(newCode) => {
            if (!impressionCodesEqual(newCode, code)) {
              setPreviousCode(code)
              onCodeChange(newCode)
            }
          }}
          onRangeChange={setRange}
        />
      </div>
      
      {/* 詳細設定 */}
      <div className="impression-section">
        <ImpressionDetail
          code={code}
          styleVars={styleVars}
          onStyleOverride={onStyleOverride}
          stylePins={stylePins}
          onStylePinChange={onStylePinChange}
        />
      </div>
    </div>
  )
}

