import type { ImpressionCode, ImpressionStyleVars, ImpressionSubAttributes, GradientConfig } from '../types'

// ============================================
// 拡張色パレット定義（10種類以上のファミリー）
// ============================================

interface ColorPaletteFamily {
  primary: string[]
  background: string[]
  accent: string[]
  darkBackground?: string[]  // ダークテーマ用
  darkPrimary?: string[]     // ダークテーマ用
}

// 1. エネルギッシュ系（暖色・高エネルギー）
const energeticColors: ColorPaletteFamily = {
  primary: ['#E07A5F', '#D4886C', '#C89678', '#BCA485', '#B0B291'],
  background: ['#FAF9F5', '#FBF8F3', '#FCF7F1', '#FDF6EF', '#FEF5ED'],
  accent: ['#FFB38A', '#F5A67D', '#EB9970', '#E18C63', '#D77F56'],
  darkBackground: ['#1a0f0a', '#1f120d', '#241510', '#291813', '#2e1b16'],
  darkPrimary: ['#FF8C69', '#FF9D7A', '#FFAE8B', '#FFBF9C', '#FFD0AD'],
}

// 2. 落ち着いた系（寒色・低エネルギー）
const calmColors: ColorPaletteFamily = {
  primary: ['#3B82F6', '#5B8DEF', '#7B98E8', '#9BA3E1', '#BBAEDA'],
  background: ['#F0F4F8', '#F2F5F9', '#F4F6FA', '#F6F7FB', '#F8F8FC'],
  accent: ['#60A5FA', '#70AEFC', '#80B7FD', '#90C0FE', '#A0C9FF'],
  darkBackground: ['#0a1520', '#0f1a28', '#141f30', '#192438', '#1e2940'],
  darkPrimary: ['#4A9EFF', '#5AA8FF', '#6AB2FF', '#7ABCFF', '#8AC6FF'],
}

// 3. テック/モダン系（Google Cloud風）
const techColors: ColorPaletteFamily = {
  primary: ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
  background: ['#FFFFFF', '#F8F9FA', '#F1F3F4', '#E8EAED'],
  accent: ['#1A73E8', '#137333', '#F9AB00', '#D33B01'],
  darkBackground: ['#1a1a1a', '#1f1f1f', '#242424', '#292929'],
  darkPrimary: ['#5B9DFF', '#4DDD7A', '#FFD54F', '#FF6B6B'],
}

// 4. コーポレート/金融系（信頼感・安定感）
const corporateColors: ColorPaletteFamily = {
  primary: ['#1E3A8A', '#1E40AF', '#2563EB', '#3B82F6', '#60A5FA'],
  background: ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1'],
  accent: ['#0F172A', '#1E293B', '#334155', '#475569'],
  darkBackground: ['#0f1419', '#141920', '#191e27', '#1e232e'],
  darkPrimary: ['#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'],
}

// 5. クリエイティブ/デザイン系（鮮やか・表現力）
const creativeColors: ColorPaletteFamily = {
  primary: ['#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8'],
  background: ['#FDF2F8', '#FCE7F3', '#FBCFE8', '#F9A8D4'],
  accent: ['#BE185D', '#DB2777', '#EC4899', '#F472B6'],
  darkBackground: ['#1a0f14', '#1f1419', '#24191e', '#291e23'],
  darkPrimary: ['#FF6BB5', '#FF8CC8', '#FFADDB', '#FFCEEE'],
}

// 6. ヘルスケア/医療系（清潔感・安心感）
const healthcareColors: ColorPaletteFamily = {
  primary: ['#059669', '#10B981', '#34D399', '#6EE7B7'],
  background: ['#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7'],
  accent: ['#047857', '#059669', '#10B981', '#34D399'],
  darkBackground: ['#0a1a14', '#0f1f19', '#14241e', '#192923'],
  darkPrimary: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
}

// 7. 教育/アカデミック系（知性・落ち着き）
const academicColors: ColorPaletteFamily = {
  primary: ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD'],
  background: ['#F5F3FF', '#EDE9FE', '#DDD6FE', '#C4B5FD'],
  accent: ['#5B21B6', '#6D28D9', '#7C3AED', '#8B5CF6'],
  darkBackground: ['#140a1a', '#190f1f', '#1e1424', '#231929'],
  darkPrimary: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'],
}

// 8. 飲食/ホスピタリティ系（温かみ・親しみやすさ）
const hospitalityColors: ColorPaletteFamily = {
  primary: ['#DC2626', '#EF4444', '#F87171', '#FCA5A5'],
  background: ['#FEF2F2', '#FEE2E2', '#FECACA', '#FCA5A5'],
  accent: ['#991B1B', '#B91C1C', '#DC2626', '#EF4444'],
  darkBackground: ['#1a0a0a', '#1f0f0f', '#241414', '#291919'],
  darkPrimary: ['#FF5252', '#FF7979', '#FFA0A0', '#FFC7C7'],
}

// 9. ラグジュアリー/プレミアム系（高級感・洗練）
const luxuryColors: ColorPaletteFamily = {
  primary: ['#D4AF37', '#E5C158', '#F5D279', '#FFE19A'],
  background: ['#1a1a1a', '#242424', '#2e2e2e', '#383838'],
  accent: ['#B8860B', '#C9A037', '#D4AF37', '#E5C158'],
  darkBackground: ['#0a0a0a', '#0f0f0f', '#141414', '#191919'],
  darkPrimary: ['#FFD700', '#FFE44D', '#FFF19A', '#FFFEE7'],
}

// 10. ナチュラル/エコ系（自然・環境）
const naturalColors: ColorPaletteFamily = {
  primary: ['#16A34A', '#22C55E', '#4ADE80', '#86EFAC'],
  background: ['#F0FDF4', '#DCFCE7', '#BBF7D0', '#86EFAC'],
  accent: ['#15803D', '#16A34A', '#22C55E', '#4ADE80'],
  darkBackground: ['#0a1a0f', '#0f1f14', '#142419', '#19291e'],
  darkPrimary: ['#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0'],
}

// 11. ミニマル/モノクロ系（シンプル・クリーン）
const minimalColors: ColorPaletteFamily = {
  primary: ['#374151', '#4B5563', '#6B7280', '#9CA3AF'],
  background: ['#FFFFFF', '#F9FAFB', '#F3F4F6', '#E5E7EB'],
  accent: ['#111827', '#1F2937', '#374151', '#4B5563'],
  darkBackground: ['#111827', '#1F2937', '#374151', '#4B5563'],
  darkPrimary: ['#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'],
}

// パレットファミリーのマッピング（色温度とEnergy軸の組み合わせで選択）
const paletteFamilies: Record<string, ColorPaletteFamily> = {
  'energetic-warm': energeticColors,
  'calm-cool': calmColors,
  'tech-modern': techColors,
  'corporate-neutral': corporateColors,
  'creative-vivid': creativeColors,
  'healthcare-cool': healthcareColors,
  'academic-neutral': academicColors,
  'hospitality-warm': hospitalityColors,
  'luxury-neutral': luxuryColors,
  'natural-cool': naturalColors,
  'minimal-neutral': minimalColors,
}

// フォーマル系
const formalFonts = [
  '"Noto Serif JP", "游明朝", "Yu Mincho", serif',
  '"Noto Sans JP", "游ゴシック", "Yu Gothic", sans-serif',
  '"Hiragino Kaku Gothic ProN", "メイリオ", sans-serif',
]

// 親しみやすい系（カジュアル）
const friendlyFonts = [
  '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", sans-serif',
  '"Kosugi Maru", "Rounded Mplus 1c", sans-serif',
  '"BIZ UDPGothic", sans-serif',
]

// モダン系（日本語対応）
const modernFonts = [
  '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif',
  '"BIZ UDPGothic", "Hiragino Kaku Gothic ProN", sans-serif',
  '"Noto Sans JP", system-ui, sans-serif',
]

// クラシック系（日本語対応）
const classicFonts = [
  '"Shippori Mincho", "Noto Serif JP", serif',
  '"Noto Serif JP", "游明朝", serif',
  '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", serif',
]

// ============================================
// フォントペアリング定義
// ============================================

interface FontPairing {
  heading: string
  body: string
  description: string
}

// フォントペアリングの推奨組み合わせ
const fontPairings: FontPairing[] = [
  // モダン/テック系
  {
    heading: '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif',
    body: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif',
    description: 'モダン・テック',
  },
  {
    heading: '"BIZ UDPGothic", sans-serif',
    body: '"Noto Sans JP", sans-serif',
    description: 'ビジネス・プロフェッショナル',
  },
  // フォーマル/クラシック系
  {
    heading: '"Noto Serif JP", "游明朝", serif',
    body: '"Noto Sans JP", "游ゴシック", sans-serif',
    description: 'フォーマル・クラシック',
  },
  {
    heading: '"Shippori Mincho", "Noto Serif JP", serif',
    body: '"Noto Serif JP", serif',
    description: '伝統的・格式高い',
  },
  // 親しみやすい系
  {
    heading: '"M PLUS Rounded 1c", sans-serif',
    body: '"Kosugi Maru", sans-serif',
    description: '親しみやすい・カジュアル',
  },
  {
    heading: '"Yomogi", cursive',
    body: '"Noto Sans JP", sans-serif',
    description: '手書き風・温かみ',
  },
  // クリエイティブ系
  {
    heading: '"Dela Gothic One", cursive',
    body: '"Noto Sans JP", sans-serif',
    description: 'インパクト・クリエイティブ',
  },
  {
    heading: '"Potta One", cursive',
    body: '"M PLUS Rounded 1c", sans-serif',
    description: 'ポップ・エネルギッシュ',
  },
  // ミニマル系
  {
    heading: '"Noto Sans JP", sans-serif',
    body: '"Noto Sans JP", sans-serif',
    description: 'ミニマル・クリーン',
  },
]

// ============================================
// スタイル生成ロジック
// ============================================

/**
 * 値を0-1の範囲に正規化（1-5 → 0-1）
 */
function normalize(value: number): number {
  return (value - 1) / 4
}

/**
 * 2つの色を補間
 */
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex1 = color1.replace('#', '')
  const hex2 = color2.replace('#', '')
  
  const r1 = parseInt(hex1.substring(0, 2), 16)
  const g1 = parseInt(hex1.substring(2, 4), 16)
  const b1 = parseInt(hex1.substring(4, 6), 16)
  
  const r2 = parseInt(hex2.substring(0, 2), 16)
  const g2 = parseInt(hex2.substring(2, 4), 16)
  const b2 = parseInt(hex2.substring(4, 6), 16)
  
  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * 色を明るくする
 */
function lightenColor(color: string, amount: number): string {
  return interpolateColor(color, '#FFFFFF', amount)
}

/**
 * 色を暗くする
 */
function darkenColor(color: string, amount: number): string {
  return interpolateColor(color, '#000000', amount)
}

/**
 * 色の彩度を調整
 */
function adjustSaturation(color: string, saturation: 'muted' | 'normal' | 'vivid'): string {
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // HSLに変換
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  let h = 0, s = 0, l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    if (max === rNorm) h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6
    else if (max === gNorm) h = ((bNorm - rNorm) / d + 2) / 6
    else h = ((rNorm - gNorm) / d + 4) / 6
  }
  
  // 彩度を調整
  let newS = s
  if (saturation === 'muted') newS = s * 0.5
  else if (saturation === 'vivid') newS = Math.min(1, s * 1.3)
  
  // HSL→RGB変換
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  
  let newR, newG, newB
  if (s === 0) {
    newR = newG = newB = l
  } else {
    const q = l < 0.5 ? l * (1 + newS) : l + newS - l * newS
    const p = 2 * l - q
    newR = hue2rgb(p, q, h + 1/3)
    newG = hue2rgb(p, q, h)
    newB = hue2rgb(p, q, h - 1/3)
  }
  
  return `#${Math.round(newR * 255).toString(16).padStart(2, '0')}${Math.round(newG * 255).toString(16).padStart(2, '0')}${Math.round(newB * 255).toString(16).padStart(2, '0')}`
}

/**
 * コントラストを調整
 */
function adjustContrast(color: string, contrast: 'low' | 'medium' | 'high', isBackground: boolean): string {
  if (contrast === 'medium') return color  // デフォルトは変更なし
  
  const luminance = getLuminance(color)
  
  if (isBackground) {
    // 背景色: コントラスト高→暗く、コントラスト低→明るく
    if (contrast === 'high') {
      return darkenColor(color, 0.2)
    } else {
      return lightenColor(color, 0.1)
    }
  } else {
    // 前景色: コントラスト高→明るく/暗く、コントラスト低→中間に
    if (contrast === 'high') {
      return luminance > 0.5 ? lightenColor(color, 0.2) : darkenColor(color, 0.2)
    } else {
      return interpolateColor(color, '#808080', 0.2)
    }
  }
}

/**
 * 印象コードからCSSスタイル変数を生成（サブ属性対応）
 * 
 * 新しい4軸モデル:
 * - E (Energy): 落ち着いた(1) 〜 エネルギッシュ(5)
 * - F (Formality): 親しみやすい(1) 〜 格式高い(5)
 * - C (Classic-Modern): 伝統的(1) 〜 現代的(5)
 * - D (Decoration): シンプル(1) 〜 装飾的(5)
 */
export function generateStyleVars(
  code: ImpressionCode,
  subAttributes?: ImpressionSubAttributes
): ImpressionStyleVars {
  const energyRatio = normalize(code.energy)
  const formalityRatio = normalize(code.formality)
  const classicModernRatio = normalize(code.classicModern)
  const decorationRatio = normalize(code.decoration)
  
  // サブ属性のデフォルト値
  const themeMode = subAttributes?.themeMode ?? 'auto'
  const colorTemperature = subAttributes?.colorTemperature ?? 'neutral'
  const contrast = subAttributes?.contrast ?? 'medium'
  const saturation = subAttributes?.saturation ?? 'normal'
  
  // パレットファミリーの選択（色温度とEnergy軸から決定）
  let paletteKey = 'energetic-warm'
  if (colorTemperature === 'cool') {
    paletteKey = energyRatio > 0.5 ? 'tech-modern' : 'calm-cool'
  } else if (colorTemperature === 'warm') {
    paletteKey = energyRatio > 0.5 ? 'energetic-warm' : 'hospitality-warm'
  } else {
    // neutral: Energy軸とFormality軸から選択
    // テックらしさ: 現代的(ClassicModern高) + エネルギッシュ(Energy高) + 親しみやすい(Formality低) → tech-modern
    if (classicModernRatio > 0.7 && energyRatio > 0.6 && formalityRatio < 0.4) {
      paletteKey = 'tech-modern'
    } else if (formalityRatio > 0.7) {
      paletteKey = classicModernRatio > 0.5 ? 'luxury-neutral' : 'corporate-neutral'
    } else if (classicModernRatio > 0.7) {
      paletteKey = 'tech-modern'
    } else if (energyRatio > 0.6) {
      paletteKey = 'creative-vivid'
    } else {
      paletteKey = 'minimal-neutral'
    }
  }
  
  const palette = paletteFamilies[paletteKey] || energeticColors
  
  // テーマモードの決定
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && formalityRatio > 0.7 && decorationRatio < 0.4)
  
  // プライマリカラー
  const primaryArray = isDark && palette.darkPrimary ? palette.darkPrimary : palette.primary
  // テック系: Energy高 + Modern高 + Formality低 → ネオンカラー（青→紫）
  let primary: string
  if (energyRatio > 0.6 && classicModernRatio > 0.7 && formalityRatio < 0.4) {
    // テック系のネオンカラー（青→紫のグラデーションから選択）
    const techNeonColors = ['#00d4ff', '#5b8def', '#7b2ff7', '#a855f7']
    primary = techNeonColors[Math.min(Math.floor(energyRatio * (techNeonColors.length - 1)), techNeonColors.length - 1)]
  } else {
    // テック/モダン系の場合は、ブルー系を優先（Energyに関係なく最初の色を選ぶ）
    let primaryIndex = Math.min(Math.floor(energyRatio * (primaryArray.length - 1)), primaryArray.length - 1)
    if (paletteKey === 'tech-modern' && !isDark) {
      // テック系の場合は、Energyが高いほどブルー系（最初の色）を選ぶ
      primaryIndex = Math.max(0, Math.floor((1 - energyRatio) * (primaryArray.length - 1)))
    }
    primary = primaryArray[primaryIndex]
  }
  
  // 背景色
  // テック系: Energy高 + Modern高 + Formality低 → 純粋な黒背景
  const isTechStyle = energyRatio > 0.6 && classicModernRatio > 0.7 && formalityRatio < 0.4
  let background: string
  if (isTechStyle) {
    background = '#000000'
  } else {
    const bgArray = isDark && palette.darkBackground ? palette.darkBackground : palette.background
    const bgIndex = Math.min(Math.floor((1 - energyRatio) * (bgArray.length - 1)), bgArray.length - 1)
    background = bgArray[bgIndex]
    
    // フォーマル寄りなら背景を少し暗く（ライトテーマの場合）
    if (!isDark && formalityRatio > 0.6) {
      background = darkenColor(background, 0.05)
    }
    
    // コントラスト調整（テック系以外）
    background = adjustContrast(background, contrast, true)
  }
  
  // プライマリカラーのコントラスト調整
  primary = adjustContrast(primary, contrast, false)
  
  // 彩度調整
  primary = adjustSaturation(primary, saturation)
  
  // グラデーションの自動生成（テキスト色決定の前に実行）
  const backgroundGradient = suggestGradient(code, 'background') || undefined
  const textGradient = suggestGradient(code, 'text') || undefined
  
  // テキスト色（背景に応じて決定）
  // 背景グラデーションが有効な場合は、グラデーションの平均輝度を使用
  let bgLuminance: number
  if (backgroundGradient?.enabled && backgroundGradient.colors.length > 0) {
    // グラデーションの各色の輝度を計算して平均を取る
    const luminances = backgroundGradient.colors.map(color => getLuminance(color))
    bgLuminance = luminances.reduce((sum, lum) => sum + lum, 0) / luminances.length
  } else {
    bgLuminance = getLuminance(background)
  }
  
  // グラデーションが有効な場合は、明るい（パステル）か暗い（ダーク）かで明確に分ける
  let text: string
  let textMuted: string
  
  if (backgroundGradient?.enabled) {
    // パステル系（明るい）→ テキストは黒
    if (bgLuminance > 0.85) {
      text = '#000000'
      textMuted = '#4b5563'
    } else {
      // ダーク系（暗い）→ テキストは白
      text = '#ffffff'
      textMuted = '#d1d5db'
    }
  } else {
    // グラデーションなしの場合は従来のロジック
    text = bgLuminance > 0.5 ? '#1f2937' : '#f5f5f5'
    textMuted = bgLuminance > 0.5 ? '#6b7280' : '#9ca3af'
    
    // コントラストが高い場合はテキストも調整
    if (contrast === 'high') {
      text = bgLuminance > 0.5 ? '#000000' : '#ffffff'
      textMuted = bgLuminance > 0.5 ? '#4b5563' : '#d1d5db'
    } else if (contrast === 'low') {
      text = bgLuminance > 0.5 ? '#374151' : '#e5e7eb'
      textMuted = bgLuminance > 0.5 ? '#6b7280' : '#9ca3af'
    }
  }
  
  // アクセントカラー
  const accentArray = palette.accent
  const accentIndex = Math.min(Math.floor(energyRatio * (accentArray.length - 1)), accentArray.length - 1)
  let accent = accentArray[accentIndex]
  accent = adjustSaturation(accent, saturation)
  
  // フォントペアリングの選択（Formality × Classic-Modern × Decoration で決定）
  let fontFamily: string
  let fontFamilyHeading: string
  
  // フォントペアリングを選択
  let selectedPairing: FontPairing | null = null
  
  if (formalityRatio < 0.3 && classicModernRatio > 0.6 && decorationRatio > 0.6) {
    // 親しみやすく、現代的で装飾的 → ポップ
    selectedPairing = fontPairings.find(p => p.description.includes('ポップ')) || null
  } else if (formalityRatio < 0.4 && classicModernRatio > 0.5) {
    // 親しみやすく現代的 → 手書き風またはカジュアル
    selectedPairing = fontPairings.find(p => p.description.includes('手書き') || p.description.includes('カジュアル')) || null
  } else if (formalityRatio > 0.7 && classicModernRatio < 0.4) {
    // 格式高く伝統的 → クラシック
    selectedPairing = fontPairings.find(p => p.description.includes('伝統的') || p.description.includes('格式')) || null
  } else if (formalityRatio > 0.6 && classicModernRatio > 0.5) {
    // 格式高く現代的 → フォーマル
    selectedPairing = fontPairings.find(p => p.description.includes('フォーマル')) || null
  } else if (classicModernRatio > 0.7 && decorationRatio < 0.3) {
    // 現代的でシンプル → モダン/テック
    selectedPairing = fontPairings.find(p => p.description.includes('モダン') || p.description.includes('テック')) || null
  } else if (decorationRatio < 0.3) {
    // シンプル → ミニマル
    selectedPairing = fontPairings.find(p => p.description.includes('ミニマル')) || null
  } else if (decorationRatio > 0.7) {
    // 装飾的 → クリエイティブ
    selectedPairing = fontPairings.find(p => p.description.includes('クリエイティブ') || p.description.includes('インパクト')) || null
  }
  
  if (selectedPairing) {
    fontFamilyHeading = selectedPairing.heading
    fontFamily = selectedPairing.body
  } else {
    // フォールバック: 従来のロジック
    if (formalityRatio < 0.4) {
      fontFamily = friendlyFonts[Math.min(Math.floor(classicModernRatio * 3), 2)]
      fontFamilyHeading = fontFamily
    } else if (formalityRatio > 0.6) {
      if (classicModernRatio < 0.4) {
        fontFamily = classicFonts[Math.min(Math.floor(formalityRatio * 3), 2)]
        fontFamilyHeading = classicFonts[0]
      } else {
        fontFamily = formalFonts[Math.min(Math.floor(classicModernRatio * 3), 2)]
        fontFamilyHeading = formalFonts[0]
      }
    } else {
      if (classicModernRatio > 0.6) {
        fontFamily = modernFonts[Math.min(Math.floor(classicModernRatio * 3), 2)]
        fontFamilyHeading = modernFonts[0]
      } else {
        fontFamily = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif'
        fontFamilyHeading = fontFamily
      }
    }
  }
  
  // フォントウェイト（Decoration軸で決定 - シンプルは軽め、装飾的は重め）
  const fontWeight = decorationRatio > 0.5 ? 400 : 500
  const fontWeightHeading = decorationRatio > 0.5 ? 600 : 700
  
  // 字間（Classic-Modern軸で決定）
  const letterSpacing = classicModernRatio > 0.5 ? '0.02em' : '0'
  
  // 角丸（Decoration軸で決定 - シンプルは小さめ、装飾的は大きめ）
  const borderRadiusValue = Math.round(decorationRatio * 16)
  const borderRadius = `${borderRadiusValue}px`
  
  // 余白（Formality軸で決定）
  const spacingMultiplier = 0.8 + formalityRatio * 0.4
  const spacing = `${spacingMultiplier}rem`
  
  return {
    primary,
    primaryLight: lightenColor(primary, 0.3),
    primaryDark: darkenColor(primary, 0.2),
    background,
    backgroundAlt: bgLuminance > 0.5 ? darkenColor(background, 0.03) : lightenColor(background, 0.05),
    text,
    textMuted,
    accent,
    backgroundGradient,
    textGradient,
    fontFamily,
    fontFamilyHeading,
    fontWeight,
    fontWeightHeading,
    letterSpacing,
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
 * 色の輝度を計算（0-1）
 */
function getLuminance(color: string): number {
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  // sRGB to linear
  const rL = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gL = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bL = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)
  
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL
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

