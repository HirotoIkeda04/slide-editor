import { useState, useMemo, useCallback } from 'react'
import type { ImpressionCode, ImpressionStyleVars, StylePins, ColorPalette, GradientConfig } from '../../types'
import { generatePaletteCandidates } from '../../utils/colorPalette'
import { suggestGradient } from '../../utils/impressionStyle'

// グラデーションプリセット
const GRADIENT_PRESETS = {
  background: [
    { name: 'サンセット', colors: ['#ff7e5f', '#feb47b'], angle: 135 },
    { name: 'オーシャン', colors: ['#2193b0', '#6dd5ed'], angle: 135 },
    { name: 'フォレスト', colors: ['#134e5e', '#71b280'], angle: 135 },
    { name: 'ラベンダー', colors: ['#834d9b', '#d04ed6'], angle: 135 },
    { name: 'ミッドナイト', colors: ['#232526', '#414345'], angle: 135 },
    { name: 'ピーチ', colors: ['#ffecd2', '#fcb69f'], angle: 135 },
    { name: 'ミント', colors: ['#84fab0', '#8fd3f4'], angle: 135 },
    { name: 'コーラル', colors: ['#ff9a9e', '#fecfef'], angle: 135 },
  ],
  text: [
    { name: 'ゴールド', colors: ['#f7971e', '#ffd200'], angle: 90 },
    { name: 'ローズ', colors: ['#ee0979', '#ff6a00'], angle: 90 },
    { name: 'オーロラ', colors: ['#00c6ff', '#0072ff'], angle: 90 },
    { name: 'ネオン', colors: ['#f857a6', '#ff5858'], angle: 90 },
    { name: 'エメラルド', colors: ['#11998e', '#38ef7d'], angle: 90 },
    { name: 'サンバースト', colors: ['#f12711', '#f5af19'], angle: 90 },
  ],
}

// グラデーションをCSS文字列に変換
const gradientToCSS = (config: GradientConfig): string => {
  if (!config.enabled || config.colors.length < 2) return ''
  
  const colorStops = config.colors.map((color, i) => {
    const position = config.positions?.[i] ?? (i / (config.colors.length - 1)) * 100
    return `${color} ${position}%`
  }).join(', ')
  
  if (config.type === 'radial') {
    return `radial-gradient(circle, ${colorStops})`
  }
  return `linear-gradient(${config.angle ?? 135}deg, ${colorStops})`
}

interface ImpressionDetailProps {
  code: ImpressionCode
  styleVars: ImpressionStyleVars
  onStyleOverride?: (overrides: Partial<ImpressionStyleVars>) => void
  stylePins?: StylePins
  onStylePinChange?: (pins: Partial<StylePins>) => void
}

export const ImpressionDetail = ({
  code,
  styleVars,
  onStyleOverride,
  stylePins = {},
  onStylePinChange,
}: ImpressionDetailProps) => {
  const [expanded, setExpanded] = useState(true)
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null)
  
  // パレット候補を生成
  const paletteCandidates = useMemo(() => {
    return generatePaletteCandidates(code)
  }, [code])
  
  // パレットを適用
  const handlePaletteSelect = useCallback((palette: ColorPalette) => {
    setSelectedPaletteId(palette.id)
    onStyleOverride?.({
      primary: palette.primary,
      background: palette.background,
      accent: palette.accent,
      text: palette.text,
    })
  }, [onStyleOverride])
  
  return (
    <div>
      <button
        className="impression-detail-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span>詳細設定</span>
        <span className={`impression-detail-toggle-icon material-icons ${expanded ? 'expanded' : ''}`}>
          expand_more
        </span>
      </button>
      
      <div className={`impression-detail-content ${expanded ? 'expanded' : ''}`}>
        {/* カラーパレット候補 */}
        <div className="impression-palette-section">
          <div className="impression-detail-label" style={{ marginBottom: '0.5rem' }}>
            カラーパレット候補
          </div>
          <div className="impression-palette-grid">
            {paletteCandidates.map((palette) => (
              <button
                key={palette.id}
                className={`impression-palette-item ${selectedPaletteId === palette.id ? 'selected' : ''}`}
                onClick={() => handlePaletteSelect(palette)}
                title={palette.name}
              >
                <div className="impression-palette-colors">
                  <div 
                    className="impression-palette-color primary"
                    style={{ backgroundColor: palette.primary }}
                  />
                  <div 
                    className="impression-palette-color background"
                    style={{ backgroundColor: palette.background }}
                  />
                  <div 
                    className="impression-palette-color accent"
                    style={{ backgroundColor: palette.accent }}
                  />
                </div>
                <span className="impression-palette-name">{palette.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* プライマリカラー */}
        <div className={`impression-detail-row ${stylePins.primary ? 'pinned' : ''}`}>
          <div className="impression-detail-row-header">
            <label className="impression-detail-pin">
              <input
                type="checkbox"
                checked={stylePins.primary || false}
                onChange={(e) => onStylePinChange?.({ primary: e.target.checked })}
              />
              <span className="impression-detail-pin-icon material-icons">
                {stylePins.primary ? 'push_pin' : 'push_pin'}
              </span>
            </label>
            <span className="impression-detail-label">メインカラー</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="color"
              value={styleVars.primary}
              onChange={(e) => onStyleOverride?.({ primary: e.target.value })}
              style={{ 
                width: '32px', 
                height: '24px', 
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            />
            <input
              type="text"
              className="impression-detail-input"
              value={styleVars.primary}
              onChange={(e) => onStyleOverride?.({ primary: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
        </div>
        
        {/* 背景色 */}
        <div className={`impression-detail-row ${stylePins.background ? 'pinned' : ''}`}>
          <div className="impression-detail-row-header">
            <label className="impression-detail-pin">
              <input
                type="checkbox"
                checked={stylePins.background || false}
                onChange={(e) => onStylePinChange?.({ background: e.target.checked })}
              />
              <span className="impression-detail-pin-icon material-icons">
                {stylePins.background ? 'push_pin' : 'push_pin'}
              </span>
            </label>
            <span className="impression-detail-label">背景色</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="color"
              value={styleVars.background}
              onChange={(e) => onStyleOverride?.({ background: e.target.value })}
              style={{ 
                width: '32px', 
                height: '24px', 
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            />
            <input
              type="text"
              className="impression-detail-input"
              value={styleVars.background}
              onChange={(e) => onStyleOverride?.({ background: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
        </div>
        
        {/* アクセントカラー */}
        <div className={`impression-detail-row ${stylePins.accent ? 'pinned' : ''}`}>
          <div className="impression-detail-row-header">
            <label className="impression-detail-pin">
              <input
                type="checkbox"
                checked={stylePins.accent || false}
                onChange={(e) => onStylePinChange?.({ accent: e.target.checked })}
              />
              <span className="impression-detail-pin-icon material-icons">
                {stylePins.accent ? 'push_pin' : 'push_pin'}
              </span>
            </label>
            <span className="impression-detail-label">アクセントカラー</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="color"
              value={styleVars.accent}
              onChange={(e) => onStyleOverride?.({ accent: e.target.value })}
              style={{ 
                width: '32px', 
                height: '24px', 
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            />
            <input
              type="text"
              className="impression-detail-input"
              value={styleVars.accent}
              onChange={(e) => onStyleOverride?.({ accent: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
        </div>
        
        {/* フォント */}
        <div className={`impression-detail-row ${stylePins.fontFamily ? 'pinned' : ''}`}>
          <div className="impression-detail-row-header">
            <label className="impression-detail-pin">
              <input
                type="checkbox"
                checked={stylePins.fontFamily || false}
                onChange={(e) => onStylePinChange?.({ fontFamily: e.target.checked })}
              />
              <span className="impression-detail-pin-icon material-icons">
                {stylePins.fontFamily ? 'push_pin' : 'push_pin'}
              </span>
            </label>
            <span className="impression-detail-label">フォント</span>
          </div>
          <select
            className="impression-detail-input"
            value={styleVars.fontFamily}
            onChange={(e) => onStyleOverride?.({ fontFamily: e.target.value })}
          >
            <optgroup label="── ゴシック系 ──">
              <option value='"Noto Sans JP", sans-serif'>Noto Sans JP</option>
              <option value='"BIZ UDPGothic", sans-serif'>BIZ UDPGothic</option>
            <option value='"Zen Kaku Gothic New", sans-serif'>Zen 角ゴシック New</option>
            </optgroup>
            <optgroup label="── 明朝系 ──">
              <option value='"Noto Serif JP", serif'>Noto Serif JP</option>
              <option value='"Shippori Mincho", serif'>しっぽり明朝</option>
              <option value='"Zen Old Mincho", serif'>Zen Old 明朝</option>
              <option value='"Kaisei Tokumin", serif'>解星デコール 特明</option>
              <option value='"Kaisei Opti", serif'>解星オプティ</option>
            </optgroup>
            <optgroup label="── 丸ゴシック系 ──">
              <option value='"M PLUS Rounded 1c", sans-serif'>M PLUS Rounded 1c</option>
              <option value='"Kosugi Maru", sans-serif'>Kosugi Maru</option>
            <option value='"Zen Maru Gothic", sans-serif'>Zen 丸ゴシック</option>
              <option value='"Kiwi Maru", serif'>Kiwi Maru</option>
            </optgroup>
            <optgroup label="── 手書き風 ──">
              <option value='"Yomogi", cursive'>よもぎ</option>
              <option value='"Hachi Maru Pop", cursive'>はちまるポップ</option>
              <option value='"Yuji Syuku", serif'>游字 祝</option>
              <option value='"Yuji Mai", serif'>游字 舞</option>
              <option value='"Yuji Boku", serif'>游字 墨</option>
              <option value='"New Tegomin", serif'>New テゴミン</option>
            </optgroup>
            <optgroup label="── ポップ・装飾系 ──">
              <option value='"Potta One", cursive'>Potta One（ポップ）</option>
              <option value='"Mochiy Pop One", sans-serif'>モチィポップ One</option>
              <option value='"Mochiy Pop P One", sans-serif'>モチィポップ P One</option>
              <option value='"Kaisei Decol", serif'>解星デコール</option>
              <option value='"Reggae One", cursive'>Reggae One</option>
              <option value='"RocknRoll One", sans-serif'>RocknRoll One</option>
              <option value='"Stick", sans-serif'>Stick（スティック）</option>
            </optgroup>
            <optgroup label="── レトロ・アンティーク系 ──">
              <option value='"Zen Antique", serif'>Zen Antique</option>
              <option value='"Zen Antique Soft", serif'>Zen Antique Soft</option>
              <option value='"Zen Kurenaido", serif'>Zen 紅藍道</option>
              <option value='"Shippori Antique", serif'>しっぽりアンティーク</option>
              <option value='"Shippori Antique B1", serif'>しっぽりアンティーク B1</option>
            </optgroup>
            <optgroup label="── インパクト系 ──">
              <option value='"Dela Gothic One", cursive'>Dela Gothic One</option>
              <option value='"Rampart One", cursive'>Rampart One</option>
            </optgroup>
            <optgroup label="── ドット・ピクセル系 ──">
              <option value='"DotGothic16", sans-serif'>DotGothic16（ドット）</option>
            </optgroup>
          </select>
        </div>
        
        {/* 角丸 */}
        <div className={`impression-detail-row ${stylePins.borderRadius ? 'pinned' : ''}`}>
          <div className="impression-detail-row-header">
            <label className="impression-detail-pin">
              <input
                type="checkbox"
                checked={stylePins.borderRadius || false}
                onChange={(e) => onStylePinChange?.({ borderRadius: e.target.checked })}
              />
              <span className="impression-detail-pin-icon material-icons">
                {stylePins.borderRadius ? 'push_pin' : 'push_pin'}
              </span>
            </label>
            <span className="impression-detail-label">角丸 ({styleVars.borderRadius})</span>
          </div>
          <input
            type="range"
            min="0"
            max="24"
            value={parseInt(styleVars.borderRadius)}
            onChange={(e) => onStyleOverride?.({ borderRadius: `${e.target.value}px` })}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* 背景グラデーション */}
        <div className={`impression-detail-row gradient-row ${stylePins.backgroundGradient ? 'pinned' : ''}`}>
          <div className="impression-detail-row-header">
            <label className="impression-detail-pin">
              <input
                type="checkbox"
                checked={stylePins.backgroundGradient || false}
                onChange={(e) => onStylePinChange?.({ backgroundGradient: e.target.checked })}
              />
              <span className="impression-detail-pin-icon material-icons">
                push_pin
              </span>
            </label>
            <span className="impression-detail-label">背景グラデーション</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {(() => {
                const suggested = suggestGradient(code, 'background')
                return suggested && (
                  <button
                    className="impression-suggest-btn"
                    onClick={() => onStyleOverride?.({ backgroundGradient: suggested })}
                    title="このトンマナに推奨されるグラデーションを適用"
                  >
                    <span className="material-icons" style={{ fontSize: '0.75rem' }}>auto_awesome</span>
                    推奨
                  </button>
                )
              })()}
              <label className="impression-gradient-toggle">
                <input
                  type="checkbox"
                  checked={styleVars.backgroundGradient?.enabled ?? false}
                  onChange={(e) => {
                    const current = styleVars.backgroundGradient || { type: 'linear' as const, angle: 135, colors: ['#ffffff', '#f0f0f0'] }
                    onStyleOverride?.({ 
                      backgroundGradient: { ...current, enabled: e.target.checked } 
                    })
                  }}
                />
                <span className="impression-gradient-toggle-slider" />
              </label>
            </div>
          </div>
          {styleVars.backgroundGradient?.enabled && (
            <div className="impression-gradient-controls">
              <div className="impression-gradient-presets">
                {GRADIENT_PRESETS.background.map((preset, i) => (
                  <button
                    key={i}
                    className="impression-gradient-preset"
                    style={{ background: `linear-gradient(135deg, ${preset.colors.join(', ')})` }}
                    title={preset.name}
                    onClick={() => onStyleOverride?.({
                      backgroundGradient: {
                        enabled: true,
                        type: 'linear',
                        angle: preset.angle,
                        colors: preset.colors,
                      }
                    })}
                  />
                ))}
              </div>
              <div className="impression-gradient-custom">
                <div className="impression-gradient-colors">
                  <input
                    type="color"
                    value={styleVars.backgroundGradient?.colors?.[0] ?? '#ffffff'}
                    onChange={(e) => {
                      const current = styleVars.backgroundGradient!
                      const newColors = [...current.colors]
                      newColors[0] = e.target.value
                      onStyleOverride?.({ backgroundGradient: { ...current, colors: newColors } })
                    }}
                    title="開始色"
                  />
                  <span className="material-icons" style={{ fontSize: '0.75rem', color: '#666' }}>arrow_forward</span>
                  <input
                    type="color"
                    value={styleVars.backgroundGradient?.colors?.[1] ?? '#f0f0f0'}
                    onChange={(e) => {
                      const current = styleVars.backgroundGradient!
                      const newColors = [...current.colors]
                      newColors[1] = e.target.value
                      onStyleOverride?.({ backgroundGradient: { ...current, colors: newColors } })
                    }}
                    title="終了色"
                  />
                </div>
                <div className="impression-gradient-angle">
                  <span style={{ fontSize: '0.625rem', color: '#888' }}>角度</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={styleVars.backgroundGradient?.angle ?? 135}
                    onChange={(e) => {
                      const current = styleVars.backgroundGradient!
                      onStyleOverride?.({ backgroundGradient: { ...current, angle: parseInt(e.target.value) } })
                    }}
                  />
                  <span style={{ fontSize: '0.625rem', color: '#888', minWidth: '2rem' }}>
                    {styleVars.backgroundGradient?.angle ?? 135}°
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* テキストグラデーション */}
        <div className={`impression-detail-row gradient-row ${stylePins.textGradient ? 'pinned' : ''}`}>
          <div className="impression-detail-row-header">
            <label className="impression-detail-pin">
              <input
                type="checkbox"
                checked={stylePins.textGradient || false}
                onChange={(e) => onStylePinChange?.({ textGradient: e.target.checked })}
              />
              <span className="impression-detail-pin-icon material-icons">
                push_pin
              </span>
            </label>
            <span className="impression-detail-label">見出しグラデーション</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {(() => {
                const suggested = suggestGradient(code, 'text')
                return suggested && (
                  <button
                    className="impression-suggest-btn"
                    onClick={() => onStyleOverride?.({ textGradient: suggested })}
                    title="このトンマナに推奨されるグラデーションを適用"
                  >
                    <span className="material-icons" style={{ fontSize: '0.75rem' }}>auto_awesome</span>
                    推奨
                  </button>
                )
              })()}
              <label className="impression-gradient-toggle">
                <input
                  type="checkbox"
                  checked={styleVars.textGradient?.enabled ?? false}
                  onChange={(e) => {
                    const current = styleVars.textGradient || { type: 'linear' as const, angle: 90, colors: ['#333333', '#666666'] }
                    onStyleOverride?.({ 
                      textGradient: { ...current, enabled: e.target.checked } 
                    })
                  }}
                />
                <span className="impression-gradient-toggle-slider" />
              </label>
            </div>
          </div>
          {styleVars.textGradient?.enabled && (
            <div className="impression-gradient-controls">
              <div className="impression-gradient-presets">
                {GRADIENT_PRESETS.text.map((preset, i) => (
                  <button
                    key={i}
                    className="impression-gradient-preset"
                    style={{ background: `linear-gradient(90deg, ${preset.colors.join(', ')})` }}
                    title={preset.name}
                    onClick={() => onStyleOverride?.({
                      textGradient: {
                        enabled: true,
                        type: 'linear',
                        angle: preset.angle,
                        colors: preset.colors,
                      }
                    })}
                  />
                ))}
              </div>
              <div className="impression-gradient-custom">
                <div className="impression-gradient-colors">
                  <input
                    type="color"
                    value={styleVars.textGradient?.colors?.[0] ?? '#333333'}
                    onChange={(e) => {
                      const current = styleVars.textGradient!
                      const newColors = [...current.colors]
                      newColors[0] = e.target.value
                      onStyleOverride?.({ textGradient: { ...current, colors: newColors } })
                    }}
                    title="開始色"
                  />
                  <span className="material-icons" style={{ fontSize: '0.75rem', color: '#666' }}>arrow_forward</span>
                  <input
                    type="color"
                    value={styleVars.textGradient?.colors?.[1] ?? '#666666'}
                    onChange={(e) => {
                      const current = styleVars.textGradient!
                      const newColors = [...current.colors]
                      newColors[1] = e.target.value
                      onStyleOverride?.({ textGradient: { ...current, colors: newColors } })
                    }}
                    title="終了色"
                  />
                </div>
                <div className="impression-gradient-angle">
                  <span style={{ fontSize: '0.625rem', color: '#888' }}>角度</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={styleVars.textGradient?.angle ?? 90}
                    onChange={(e) => {
                      const current = styleVars.textGradient!
                      onStyleOverride?.({ textGradient: { ...current, angle: parseInt(e.target.value) } })
                    }}
                  />
                  <span style={{ fontSize: '0.625rem', color: '#888', minWidth: '2rem' }}>
                    {styleVars.textGradient?.angle ?? 90}°
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { gradientToCSS }
