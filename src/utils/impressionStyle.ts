import type { ImpressionCode, ImpressionStyleVars, ImpressionSubAttributes, GradientConfig } from '../types'
import { tonmanaStyles, type TonmanaStyleEntry } from '../constants/tonmanaStyles'

// ============================================
// グラデーションパーサー
// ============================================

/**
 * グラデーション文字列をGradientConfig型にパース
 * 例: "linear-gradient(135deg, oklch(0.97 0.03 85), oklch(0.96 0.04 50))"
 */
export function parseGradientString(gradientStr: string): GradientConfig | null {
  if (!gradientStr.startsWith('linear-gradient(')) {
    return null
  }
  
  // linear-gradient(angle, color1, color2, ...) をパース
  const match = gradientStr.match(/linear-gradient\((\d+)deg,\s*(.+)\)$/)
  if (!match) {
    return null
  }
  
  const angle = parseInt(match[1], 10)
  const colorsStr = match[2]
  
  // oklch()やその他の色をパース（カンマで分割するが、括弧内のカンマは無視）
  const colors: string[] = []
  let current = ''
  let parenDepth = 0
  
  for (let i = 0; i < colorsStr.length; i++) {
    const char = colorsStr[i]
    if (char === '(') {
      parenDepth++
      current += char
    } else if (char === ')') {
      parenDepth--
      current += char
    } else if (char === ',' && parenDepth === 0) {
      colors.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) {
    colors.push(current.trim())
  }
  
  if (colors.length < 2) {
    return null
  }
  
  return {
    enabled: true,
    type: 'linear',
    angle,
    colors,
  }
}

/**
 * oklch文字列からRGB hex値に変換
 * 例: "oklch(0.65 0.00 250)" → "#888888"
 */
export function oklchToHex(oklchStr: string): string {
  const match = oklchStr.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/)
  if (!match) {
    // グラデーションの場合は最初の色を抽出
    const gradientMatch = oklchStr.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/)
    if (!gradientMatch) {
      return '#888888' // フォールバック
    }
  }
  
  const l = parseFloat(match?.[1] ?? '0.5')
  const c = parseFloat(match?.[2] ?? '0')
  const h = parseFloat(match?.[3] ?? '0')
  
  // oklch → oklab
  const a = c * Math.cos(h * Math.PI / 180)
  const b = c * Math.sin(h * Math.PI / 180)
  
  // oklab → linear sRGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b
  
  const l3 = l_ * l_ * l_
  const m3 = m_ * m_ * m_
  const s3 = s_ * s_ * s_
  
  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3
  
  // linear sRGB → sRGB
  const toSRGB = (x: number) => {
    if (x <= 0.0031308) {
      return x * 12.92
    }
    return 1.055 * Math.pow(x, 1 / 2.4) - 0.055
  }
  
  r = Math.max(0, Math.min(1, toSRGB(r)))
  g = Math.max(0, Math.min(1, toSRGB(g)))
  bl = Math.max(0, Math.min(1, toSRGB(bl)))
  
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`
}

/**
 * 色文字列から最初の色を抽出（グラデーションの場合）
 */
export function extractFirstColor(colorStr: string): string {
  if (colorStr.startsWith('linear-gradient(')) {
    const gradient = parseGradientString(colorStr)
    if (gradient && gradient.colors.length > 0) {
      return gradient.colors[0]
    }
  }
  return colorStr
}

/**
 * oklch色を明るくする
 */
export function lightenOklch(oklchStr: string, amount: number): string {
  const match = oklchStr.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/)
  if (!match) {
    return oklchStr
  }
  
  const l = Math.min(1, parseFloat(match[1]) + amount)
  const c = parseFloat(match[2])
  const h = parseFloat(match[3])
  
  return `oklch(${l.toFixed(2)} ${c.toFixed(2)} ${h})`
}

/**
 * oklch色を暗くする
 */
export function darkenOklch(oklchStr: string, amount: number): string {
  const match = oklchStr.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/)
  if (!match) {
    return oklchStr
  }
  
  const l = Math.max(0, parseFloat(match[1]) - amount)
  const c = parseFloat(match[2])
  const h = parseFloat(match[3])
  
  return `oklch(${l.toFixed(2)} ${c.toFixed(2)} ${h})`
}

/**
 * oklch色の彩度を下げてミュート色を作成
 */
export function muteOklch(oklchStr: string): string {
  const match = oklchStr.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/)
  if (!match) {
    return oklchStr
  }
  
  const l = parseFloat(match[1])
  const c = Math.max(0, parseFloat(match[2]) * 0.5)
  const h = parseFloat(match[3])
  
  // 輝度も中間に寄せる
  const adjustedL = l < 0.5 ? l + 0.2 : l - 0.1
  
  return `oklch(${adjustedL.toFixed(2)} ${c.toFixed(2)} ${h})`
}

// ============================================
// スタイル生成ロジック
// ============================================

/**
 * 印象コードからCSSスタイル変数を生成（625パターンルックアップテーブル版）
 * 
 * 新しい4軸モデル:
 * - E (Energy): 落ち着いた(1) 〜 エネルギッシュ(5)
 * - F (Formality): 親しみやすい(1) 〜 格式高い(5)
 * - C (Classic-Modern): 伝統的(1) 〜 現代的(5)
 * - D (Decoration): シンプル(1) 〜 装飾的(5)
 */
export function generateStyleVars(
  code: ImpressionCode,
  _subAttributes?: ImpressionSubAttributes
): ImpressionStyleVars {
  // ルックアップキーを生成
  const key = `E${code.energy}F${code.formality}C${code.classicModern}D${code.decoration}`
  const entry = tonmanaStyles[key]
  
  if (!entry) {
    // フォールバック: デフォルトスタイル
    return getDefaultStyleVars()
  }
  
  // TonmanaStyleEntryからImpressionStyleVarsを構築
  return buildStyleVarsFromEntry(entry, code)
}

/**
 * デフォルトのスタイル変数を返す（フォールバック用）
 */
function getDefaultStyleVars(): ImpressionStyleVars {
  return {
    primary: '#888888',
    primaryLight: '#aaaaaa',
    primaryDark: '#666666',
    background: '#ffffff',
    backgroundAlt: '#f5f5f5',
    text: '#1f2937',
    textMuted: '#6b7280',
    accent: '#3b82f6',
    fontFamily: '"Noto Sans JP", sans-serif',
    fontFamilyHeading: '"Noto Sans JP", sans-serif',
    fontWeight: 400,
    fontWeightHeading: 600,
    letterSpacing: '0',
    borderRadius: '8px',
    spacing: '1rem',
  }
}

/**
 * TonmanaStyleEntryからImpressionStyleVarsを構築
 */
function buildStyleVarsFromEntry(entry: TonmanaStyleEntry, code: ImpressionCode): ImpressionStyleVars {
  const decorationRatio = (code.decoration - 1) / 4
  const formalityRatio = (code.formality - 1) / 4
  
  // 背景色の処理（グラデーションかソリッドか）
  const bgIsGradient = entry.bgNormal.startsWith('linear-gradient(')
  const backgroundGradient = bgIsGradient ? parseGradientString(entry.bgNormal) ?? undefined : undefined
  const background = bgIsGradient ? extractFirstColor(entry.bgNormal) : entry.bgNormal
  
  // 見出し色の処理（グラデーションかソリッドか）
  const headingIsGradient = entry.headingColor.startsWith('linear-gradient(')
  const textGradient = headingIsGradient ? parseGradientString(entry.headingColor) ?? undefined : undefined
  const primary = headingIsGradient ? extractFirstColor(entry.headingColor) : entry.headingColor
  
  // 色のバリエーションを生成
  const primaryLight = lightenOklch(primary, 0.15)
  const primaryDark = darkenOklch(primary, 0.1)
  const backgroundAlt = lightenOklch(background, 0.02)
  const textMuted = muteOklch(entry.textColor)
  
  // アクセントカラー（bgCoverを使用、グラデーションの場合は最初の色）
  const accent = entry.bgCover.startsWith('linear-gradient(')
    ? extractFirstColor(entry.bgCover)
    : entry.bgCover
  
  // 角丸（Decoration軸で決定 - シンプルは小さめ、装飾的は大きめ）
  const borderRadiusValue = Math.round(decorationRatio * 16)
  const borderRadius = `${borderRadiusValue}px`
  
  // 余白（Formality軸で決定）
  const spacingMultiplier = 0.8 + formalityRatio * 0.4
  const spacing = `${spacingMultiplier}rem`
  
  // フォントウェイト（Decoration軸で決定）
  const fontWeight = decorationRatio > 0.5 ? 400 : 500
  const fontWeightHeading = decorationRatio > 0.5 ? 600 : 700
  
  return {
    primary,
    primaryLight,
    primaryDark,
    background,
    backgroundAlt,
    text: entry.textColor,
    textMuted,
    accent,
    backgroundGradient,
    textGradient,
    fontFamily: entry.fontBody,
    fontFamilyHeading: entry.fontHeading,
    fontWeight,
    fontWeightHeading,
    letterSpacing: entry.letterSpacing || '0',
    borderRadius,
    spacing,
  }
}

/**
 * 印象コードからグラデーションを自動推奨
 */
export function suggestGradient(code: ImpressionCode, type: 'background' | 'text'): GradientConfig | null {
  const energyRatio = (code.energy - 1) / 4
  const formalityRatio = (code.formality - 1) / 4
  const classicModernRatio = (code.classicModern - 1) / 4
  const decorationRatio = (code.decoration - 1) / 4
  
  // 格式が高く、装飾が低い場合はグラデーションなし
  if (formalityRatio > 0.7 && decorationRatio < 0.3) {
    return null
  }
  
  if (type === 'background') {
    // テック系: Energy高 + Modern高 + Formality低 → グラデーションなし（背景色で対応）
    if (energyRatio > 0.6 && classicModernRatio > 0.7 && formalityRatio < 0.4) {
      return null
    }
    // Formality高 → 濃いダーク系（テキストは白）
    if (formalityRatio > 0.6) {
      return {
        enabled: true,
        type: 'linear',
        angle: 135,
        colors: ['#1a1a1a', '#2d2d2d'],
      }
    }
    // Energy高 + Modern高 → パステル系（明るい、テキストは黒）
    if (energyRatio > 0.6 && classicModernRatio > 0.6) {
      return {
        enabled: true,
        type: 'linear',
        angle: 135,
        colors: ['#fff5f0', '#ffe8e0'],
      }
    }
    // Energy高 → パステル暖色系（明るい、テキストは黒）
    if (energyRatio > 0.6) {
      return {
        enabled: true,
        type: 'linear',
        angle: 135,
        colors: ['#fff8f0', '#fff0e0'],
      }
    }
    // Modern高 → パステルクール系（明るい、テキストは黒）
    if (classicModernRatio > 0.6) {
      return {
        enabled: true,
        type: 'linear',
        angle: 135,
        colors: ['#f0f8ff', '#e0f0ff'],
      }
    }
  } else {
    // テック系: Energy高 + Modern高 + Formality低 → ネオンカラーグラデーション（青→紫→ピンク）
    if (energyRatio > 0.6 && classicModernRatio > 0.7 && formalityRatio < 0.4) {
      return {
        enabled: true,
        type: 'linear',
        angle: 90,
        colors: ['#00d4ff', '#7b2ff7', '#f06292'],
      }
    }
    // テキストグラデーション: Energy高 + Decoration高 → ビビッド
    if (energyRatio > 0.6 && decorationRatio > 0.6) {
      return {
        enabled: true,
        type: 'linear',
        angle: 90,
        colors: ['#f857a6', '#ff5858'],
      }
    }
    // Energy高 → 暖色系
    if (energyRatio > 0.6) {
      return {
        enabled: true,
        type: 'linear',
        angle: 90,
        colors: ['#f7971e', '#ffd200'],
      }
    }
    // Modern高 → クール系
    if (classicModernRatio > 0.6) {
      return {
        enabled: true,
        type: 'linear',
        angle: 90,
        colors: ['#00c6ff', '#0072ff'],
      }
    }
  }
  
  return null
}

/**
 * ImpressionStyleVarsをCSSカスタムプロパティのオブジェクトに変換
 */
export function styleVarsToCSSProperties(vars: ImpressionStyleVars): Record<string, string> {
  return {
    '--tone-primary': vars.primary,
    '--tone-primary-light': vars.primaryLight,
    '--tone-primary-dark': vars.primaryDark,
    '--tone-background': vars.background,
    '--tone-background-alt': vars.backgroundAlt,
    '--tone-text': vars.text,
    '--tone-text-muted': vars.textMuted,
    '--tone-accent': vars.accent,
    '--tone-font-family': vars.fontFamily,
    '--tone-font-family-heading': vars.fontFamilyHeading,
    '--tone-font-weight': vars.fontWeight.toString(),
    '--tone-font-weight-heading': vars.fontWeightHeading.toString(),
    '--tone-letter-spacing': vars.letterSpacing,
    '--tone-border-radius': vars.borderRadius,
    '--tone-spacing': vars.spacing,
  }
}

/**
 * 印象コードから直接CSSプロパティを生成
 */
export function impressionCodeToCSSProperties(code: ImpressionCode): Record<string, string> {
  const vars = generateStyleVars(code)
  return styleVarsToCSSProperties(vars)
}

/**
 * React用のインラインスタイルオブジェクトを生成
 */
export function impressionCodeToReactStyle(code: ImpressionCode): React.CSSProperties {
  const props = impressionCodeToCSSProperties(code)
  const style: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(props)) {
    style[key] = value
  }
  
  return style as React.CSSProperties
}

