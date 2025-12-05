import type { ImpressionCode, ColorPalette } from '../types'

// ============================================
// 色相定義（Hue definitions）
// ============================================

interface HueDefinition {
  id: string
  name: string
  nameEn: string
  hue: number  // 0-360
}

const hueDefinitions: HueDefinition[] = [
  { id: 'blue', name: 'ブルー系', nameEn: 'Blue', hue: 220 },
  { id: 'teal', name: 'ティール系', nameEn: 'Teal', hue: 180 },
  { id: 'green', name: 'グリーン系', nameEn: 'Green', hue: 140 },
  { id: 'purple', name: 'パープル系', nameEn: 'Purple', hue: 270 },
  { id: 'pink', name: 'ピンク系', nameEn: 'Pink', hue: 340 },
  { id: 'orange', name: 'オレンジ系', nameEn: 'Orange', hue: 25 },
  { id: 'gold', name: 'ゴールド系', nameEn: 'Gold', hue: 45 },
  { id: 'red', name: 'レッド系', nameEn: 'Red', hue: 0 },
]

// ============================================
// HSL ↔ HEX 変換ユーティリティ
// ============================================

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// ============================================
// トンマナからトーン（明度・彩度）を決定
// ============================================

interface ToneParams {
  primarySaturation: number   // メインカラーの彩度 (0-100)
  primaryLightness: number    // メインカラーの明度 (0-100)
  backgroundLightness: number // 背景の明度 (0-100)
  accentSaturation: number    // アクセントの彩度 (0-100)
  accentLightness: number     // アクセントの明度 (0-100)
  isDark: boolean             // ダークモードか
}

function getToneParams(code: ImpressionCode): ToneParams {
  const { energy, formality, decoration } = code
  
  // 正規化 (1-5 → 0-1)
  const energyRatio = (energy - 1) / 4
  const formalityRatio = (formality - 1) / 4
  const decorationRatio = (decoration - 1) / 4
  
  // ダークモード判定: 格式が高く装飾性が低い場合
  const isDark = formalityRatio > 0.7 && decorationRatio < 0.3
  
  // 彩度: エネルギーと装飾性で決定
  // 高エネルギー・高装飾 → 高彩度
  const baseSaturation = 40 + (energyRatio * 25) + (decorationRatio * 20)
  const primarySaturation = Math.min(85, baseSaturation)
  const accentSaturation = Math.min(90, baseSaturation + 10)
  
  // 明度: 格式とエネルギーで決定
  let primaryLightness: number
  let backgroundLightness: number
  let accentLightness: number
  
  if (isDark) {
    // ダークモード
    primaryLightness = 55 + (energyRatio * 10)
    backgroundLightness = 10 + (energyRatio * 5)
    accentLightness = 50 + (energyRatio * 10)
  } else {
    // ライトモード
    // 高エネルギー → やや明るめ、低エネルギー → 落ち着いた明度
    primaryLightness = 35 + (energyRatio * 15) - (formalityRatio * 5)
    backgroundLightness = 96 - (formalityRatio * 3)
    accentLightness = 45 + (energyRatio * 10)
  }
  
  return {
    primarySaturation,
    primaryLightness,
    backgroundLightness,
    accentSaturation,
    accentLightness,
    isDark,
  }
}

// ============================================
// トンマナに適した色相を選択
// ============================================

function getRecommendedHues(code: ImpressionCode): HueDefinition[] {
  const { energy, formality, classicModern } = code
  
  // 正規化
  const energyRatio = (energy - 1) / 4
  const formalityRatio = (formality - 1) / 4
  const classicModernRatio = (classicModern - 1) / 4
  
  // スコアリングで色相を選択
  const scored = hueDefinitions.map(hue => {
    let score = 0
    
    // エネルギー軸との相性
    if (energyRatio > 0.6) {
      // 高エネルギー → 暖色系、ピンク、オレンジ
      if (['pink', 'orange', 'red', 'gold'].includes(hue.id)) score += 2
    } else if (energyRatio < 0.4) {
      // 低エネルギー → 寒色系、ブルー、ティール
      if (['blue', 'teal', 'purple'].includes(hue.id)) score += 2
    }
    
    // 格式軸との相性
    if (formalityRatio > 0.6) {
      // 格式高い → ブルー、パープル、ゴールド
      if (['blue', 'purple', 'gold'].includes(hue.id)) score += 2
    } else if (formalityRatio < 0.4) {
      // 親しみやすい → グリーン、ピンク、オレンジ
      if (['green', 'pink', 'orange', 'teal'].includes(hue.id)) score += 2
    }
    
    // 時代感軸との相性
    if (classicModernRatio > 0.6) {
      // 現代的 → ティール、ブルー、パープル
      if (['teal', 'blue', 'purple'].includes(hue.id)) score += 1
    } else if (classicModernRatio < 0.4) {
      // 伝統的 → ゴールド、レッド、グリーン
      if (['gold', 'red', 'green'].includes(hue.id)) score += 1
    }
    
    return { hue, score }
  })
  
  // スコア順でソートし、上位4つを返す
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 4).map(s => s.hue)
}

// ============================================
// パレット候補を生成
// ============================================

/**
 * トンマナからカラーパレット候補を生成
 * @param code 印象コード
 * @returns 4つのカラーパレット候補
 */
export function generatePaletteCandidates(code: ImpressionCode): ColorPalette[] {
  const toneParams = getToneParams(code)
  const recommendedHues = getRecommendedHues(code)
  
  return recommendedHues.map(hueDef => {
    const { hue } = hueDef
    
    // メインカラー
    const primary = hslToHex(
      hue,
      toneParams.primarySaturation,
      toneParams.primaryLightness
    )
    
    // 背景色（色相を少しずらして統一感を出す）
    const bgHue = toneParams.isDark ? hue : (hue + 30) % 360
    const background = hslToHex(
      bgHue,
      toneParams.isDark ? 15 : 5,
      toneParams.backgroundLightness
    )
    
    // アクセントカラー（補色方向に少しずらす）
    const accentHue = (hue + 30) % 360
    const accent = hslToHex(
      accentHue,
      toneParams.accentSaturation,
      toneParams.accentLightness
    )
    
    // テキスト色
    const text = toneParams.isDark ? '#f5f5f5' : '#1f2937'
    
    return {
      id: hueDef.id,
      name: hueDef.name,
      nameEn: hueDef.nameEn,
      primary,
      background,
      accent,
      text,
    }
  })
}

/**
 * 特定の色相でパレットを生成（カスタム用）
 */
export function generatePaletteForHue(
  code: ImpressionCode,
  hue: number
): Omit<ColorPalette, 'id' | 'name' | 'nameEn'> {
  const toneParams = getToneParams(code)
  
  const primary = hslToHex(hue, toneParams.primarySaturation, toneParams.primaryLightness)
  const bgHue = toneParams.isDark ? hue : (hue + 30) % 360
  const background = hslToHex(bgHue, toneParams.isDark ? 15 : 5, toneParams.backgroundLightness)
  const accentHue = (hue + 30) % 360
  const accent = hslToHex(accentHue, toneParams.accentSaturation, toneParams.accentLightness)
  const text = toneParams.isDark ? '#f5f5f5' : '#1f2937'
  
  return { primary, background, accent, text }
}
