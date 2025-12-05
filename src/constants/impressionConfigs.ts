import type { ImpressionCode, ImpressionPreset, ImpressionRange } from '../types'

// ============================================
// 軸の定義
// ============================================

export interface AxisDefinition {
  key: keyof ImpressionCode
  code: 'E' | 'F' | 'C' | 'D'  // コード表記用の文字
  name: string
  nameJa: string
  leftLabel: string
  leftLabelJa: string
  rightLabel: string
  rightLabelJa: string
  description: string
}

export const axisDefinitions: AxisDefinition[] = [
  {
    key: 'energy',
    code: 'E',
    name: 'Energy',
    nameJa: 'エネルギー',
    leftLabel: 'Calm',
    leftLabelJa: '落ち着いた',
    rightLabel: 'Energetic',
    rightLabelJa: 'エネルギッシュ',
    description: 'エネルギーレベルと活発さ',
  },
  {
    key: 'formality',
    code: 'F',
    name: 'Formality',
    nameJa: '格式',
    leftLabel: 'Friendly',
    leftLabelJa: '親しみやすい',
    rightLabel: 'Formal',
    rightLabelJa: '格式高い',
    description: '格式と親しみやすさのバランス',
  },
  {
    key: 'classicModern',
    code: 'C',
    name: 'Classic-Modern',
    nameJa: '時代感',
    leftLabel: 'Classic',
    leftLabelJa: '伝統的',
    rightLabel: 'Modern',
    rightLabelJa: '現代的',
    description: '伝統的か先進的か',
  },
  {
    key: 'decoration',
    code: 'D',
    name: 'Decoration',
    nameJa: '装飾性',
    leftLabel: 'Simple',
    leftLabelJa: 'シンプル',
    rightLabel: 'Decorative',
    rightLabelJa: '装飾的',
    description: 'シンプルさと装飾性のバランス',
  },
]

// ============================================
// プリセット定義
// ============================================

export const impressionPresets: ImpressionPreset[] = [
  // 主要プリセット（仕様書に記載のもの）
  {
    id: 'plain',
    name: 'plain',
    nameJa: 'プレーン',
    code: { energy: 3, formality: 3, classicModern: 3, decoration: 3 },
    description: 'デフォルト（すべて中央）',
  },
  {
    id: 'kawaii',
    name: 'kawaii',
    nameJa: 'かわいい',
    code: { energy: 5, formality: 1, classicModern: 5, decoration: 5 },
    description: 'エネルギッシュ、親しみやすい、現代的、装飾的',
  },
  {
    id: 'business',
    name: 'business',
    nameJa: 'ビジネス',
    code: { energy: 3, formality: 5, classicModern: 3, decoration: 1 },
    description: '中間、格式高い、中間、シンプル',
  },
  {
    id: 'tech',
    name: 'tech',
    nameJa: 'テック',
    code: { energy: 4, formality: 2, classicModern: 5, decoration: 1 },
    description: 'エネルギッシュ、親しみやすい、現代的、シンプル',
  },
  {
    id: 'elegant',
    name: 'elegant',
    nameJa: 'エレガント',
    code: { energy: 5, formality: 5, classicModern: 3, decoration: 1 },
    description: 'エネルギッシュ、格式高い、中間、シンプル',
  },
  {
    id: 'classic',
    name: 'classic',
    nameJa: 'クラシック',
    code: { energy: 3, formality: 3, classicModern: 1, decoration: 3 },
    description: '中間、中間、伝統的、中間',
  },
  // 追加のプリセット（81基本名から選出）
  {
    id: 'minimal',
    name: 'minimal',
    nameJa: 'ミニマル',
    code: { energy: 3, formality: 3, classicModern: 3, decoration: 1 },
    description: '中間、中間、中間、シンプル',
  },
  {
    id: 'modern',
    name: 'modern',
    nameJa: 'モダン',
    code: { energy: 3, formality: 3, classicModern: 5, decoration: 3 },
    description: '中間、中間、現代的、中間',
  },
  {
    id: 'luxury',
    name: 'luxury',
    nameJa: 'ラグジュアリー',
    code: { energy: 3, formality: 5, classicModern: 5, decoration: 3 },
    description: '中間、格式高い、現代的、中間',
  },
  {
    id: 'friendly',
    name: 'friendly',
    nameJa: 'フレンドリー',
    code: { energy: 5, formality: 1, classicModern: 3, decoration: 3 },
    description: 'エネルギッシュ、親しみやすい、中間、中間',
  },
]

// ============================================
// デフォルト値
// ============================================

export const DEFAULT_IMPRESSION_CODE: ImpressionCode = {
  energy: 3,
  formality: 3,
  classicModern: 3,
  decoration: 3,
}

export const DEFAULT_IMPRESSION_RANGE: ImpressionRange = {
  energy: [1, 5],
  formality: [1, 5],
  classicModern: [1, 5],
  decoration: [1, 5],
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * 印象コードを文字列表記に変換（例: "E3F2C5D1"）
 */
export function impressionCodeToString(code: ImpressionCode): string {
  return `E${code.energy}F${code.formality}C${code.classicModern}D${code.decoration}`
}

/**
 * 文字列表記を印象コードに変換
 */
export function stringToImpressionCode(str: string): ImpressionCode | null {
  const match = str.match(/E(\d)F(\d)C(\d)D(\d)/)
  if (!match) return null
  
  const [, e, f, c, d] = match
  const code: ImpressionCode = {
    energy: parseInt(e, 10),
    formality: parseInt(f, 10),
    classicModern: parseInt(c, 10),
    decoration: parseInt(d, 10),
  }
  
  // 値の範囲チェック（5段階）
  if (
    code.energy < 1 || code.energy > 5 ||
    code.formality < 1 || code.formality > 5 ||
    code.classicModern < 1 || code.classicModern > 5 ||
    code.decoration < 1 || code.decoration > 5
  ) {
    return null
  }
  
  return code
}

/**
 * プリセットをIDで検索
 */
export function getPresetById(id: string): ImpressionPreset | undefined {
  return impressionPresets.find(p => p.id === id)
}

/**
 * 印象コードに最も近いプリセットを検索
 */
export function findClosestPreset(code: ImpressionCode): ImpressionPreset | undefined {
  let closest: ImpressionPreset | undefined
  let minDistance = Infinity
  
  for (const preset of impressionPresets) {
    const distance = Math.abs(code.energy - preset.code.energy) +
                     Math.abs(code.formality - preset.code.formality) +
                     Math.abs(code.classicModern - preset.code.classicModern) +
                     Math.abs(code.decoration - preset.code.decoration)
    
    if (distance < minDistance) {
      minDistance = distance
      closest = preset
    }
  }
  
  return closest
}

/**
 * 印象コードがプリセットと完全一致するかチェック
 */
export function findMatchingPreset(code: ImpressionCode): ImpressionPreset | undefined {
  return impressionPresets.find(p => 
    p.code.energy === code.energy &&
    p.code.formality === code.formality &&
    p.code.classicModern === code.classicModern &&
    p.code.decoration === code.decoration
  )
}

/**
 * 2つの印象コードが等しいかチェック
 */
export function impressionCodesEqual(a: ImpressionCode, b: ImpressionCode): boolean {
  return a.energy === b.energy &&
         a.formality === b.formality &&
         a.classicModern === b.classicModern &&
         a.decoration === b.decoration
}

/**
 * 印象コードが区間内に収まるかチェック
 */
export function isCodeInRange(code: ImpressionCode, range: ImpressionRange): boolean {
  return code.energy >= range.energy[0] && code.energy <= range.energy[1] &&
         code.formality >= range.formality[0] && code.formality <= range.formality[1] &&
         code.classicModern >= range.classicModern[0] && code.classicModern <= range.classicModern[1] &&
         code.decoration >= range.decoration[0] && code.decoration <= range.decoration[1]
}

/**
 * 近傍の印象コード候補を生成（基準から各軸±1の範囲）
 */
export function generateNeighborCodes(
  base: ImpressionCode,
  range: ImpressionRange,
  count: number = 4
): ImpressionCode[] {
  const candidates: ImpressionCode[] = []
  
  // 各軸の±1のバリエーションを生成
  const axes: (keyof ImpressionCode)[] = ['energy', 'formality', 'classicModern', 'decoration']
  
  for (const axis of axes) {
    for (const delta of [-1, 1]) {
      const newValue = base[axis] + delta
      if (newValue >= 1 && newValue <= 5) {
        const newCode = { ...base, [axis]: newValue }
        if (isCodeInRange(newCode, range) && !impressionCodesEqual(newCode, base)) {
          candidates.push(newCode)
        }
      }
    }
  }
  
  // 重複を除去してシャッフル
  const unique = candidates.filter((c, i) => 
    candidates.findIndex(other => impressionCodesEqual(c, other)) === i
  )
  
  // ランダムにcount個選択
  const shuffled = unique.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * 外れた提案を生成（1-2軸だけ大きく異なる）
 */
export function generateOutlierCode(
  base: ImpressionCode,
  range: ImpressionRange
): ImpressionCode | null {
  const axes: (keyof ImpressionCode)[] = ['energy', 'formality', 'classicModern', 'decoration']
  
  // ランダムに1-2軸を選択
  const numAxesToChange = Math.random() > 0.5 ? 1 : 2
  const shuffledAxes = axes.sort(() => Math.random() - 0.5)
  const axesToChange = shuffledAxes.slice(0, numAxesToChange)
  
  const newCode = { ...base }
  
  for (const axis of axesToChange) {
    // 大きく異なる値を選択（±1-2）
    const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1)
    let newValue = base[axis] + delta
    newValue = Math.max(1, Math.min(5, newValue))
    newCode[axis] = newValue
  }
  
  if (isCodeInRange(newCode, range) && !impressionCodesEqual(newCode, base)) {
    return newCode
  }
  
  return null
}

/**
 * 区間内のプリセットをフィルタリング
 */
export function filterPresetsInRange(range: ImpressionRange): ImpressionPreset[] {
  return impressionPresets.filter(p => isCodeInRange(p.code, range))
}

// ============================================
// 625パターン命名システム
// ============================================

/**
 * 81個の基本名（E, F, C, D が 1, 3, 5 の組み合わせ）
 * キー形式: "E{e}F{f}C{c}D{d}" (例: "E1F1C1D1")
 */
const baseNames: Record<string, { name: string; nameJa: string }> = {
  // E=1 (落ち着いた)
  'E1F1C1D1': { name: 'understated', nameJa: 'アンダーステイテッド' },
  'E1F1C1D3': { name: 'vintage', nameJa: 'ヴィンテージ' },
  'E1F1C1D5': { name: 'antique', nameJa: 'アンティーク' },
  'E1F1C3D1': { name: 'serene', nameJa: 'セリーン' },
  'E1F1C3D3': { name: 'relaxed', nameJa: 'リラックス' },
  'E1F1C3D5': { name: 'cozy', nameJa: 'コージー' },
  'E1F1C5D1': { name: 'zen', nameJa: 'ゼン' },
  'E1F1C5D3': { name: 'effortless', nameJa: 'エフォートレス' },
  'E1F1C5D5': { name: 'electric', nameJa: 'エレクトリック' },
  'E1F3C1D1': { name: 'polished', nameJa: 'ポリッシュド' },
  'E1F3C1D3': { name: 'timeless', nameJa: 'タイムレス' },
  'E1F3C1D5': { name: 'heritage', nameJa: 'ヘリテージ' },
  'E1F3C3D1': { name: 'neutral', nameJa: 'ニュートラル' },
  'E1F3C3D3': { name: 'balanced', nameJa: 'バランス' },
  'E1F3C3D5': { name: 'curated', nameJa: 'キュレイテッド' },
  'E1F3C5D1': { name: 'sleek', nameJa: 'スリーク' },
  'E1F3C5D3': { name: 'slick', nameJa: 'スリック' },
  'E1F3C5D5': { name: 'futuristic', nameJa: 'フューチャリスティック' },
  'E1F5C1D1': { name: 'stately', nameJa: 'ステイトリー' },
  'E1F5C1D3': { name: 'dignified', nameJa: 'ディグニファイド' },
  'E1F5C1D5': { name: 'baroque', nameJa: 'バロック' },
  'E1F5C3D1': { name: 'corporate', nameJa: 'コーポレート' },
  'E1F5C3D3': { name: 'professional', nameJa: 'プロフェッショナル' },
  'E1F5C3D5': { name: 'formal', nameJa: 'フォーマル' },
  'E1F5C5D1': { name: 'executive', nameJa: 'エグゼクティブ' },
  'E1F5C5D3': { name: 'premium', nameJa: 'プレミアム' },
  'E1F5C5D5': { name: 'ceremonial', nameJa: 'セレモニアル' },
  // E=3 (中間)
  'E3F1C1D1': { name: 'quaint', nameJa: 'クエイント' },
  'E3F1C1D3': { name: 'nostalgic', nameJa: 'ノスタルジック' },
  'E3F1C1D5': { name: 'folk', nameJa: 'フォーク' },
  'E3F1C3D1': { name: 'plain', nameJa: 'プレーン' },
  'E3F1C3D3': { name: 'everyday', nameJa: 'エブリデイ' },
  'E3F1C3D5': { name: 'playful', nameJa: 'プレイフル' },
  'E3F1C5D1': { name: 'agile', nameJa: 'アジャイル' },
  'E3F1C5D3': { name: 'approachable', nameJa: 'アプローチャブル' },
  'E3F1C5D5': { name: 'trendy', nameJa: 'トレンディ' },
  'E3F3C1D1': { name: 'traditional', nameJa: 'トラディショナル' },
  'E3F3C1D3': { name: 'classic', nameJa: 'クラシック' },
  'E3F3C1D5': { name: 'ornate', nameJa: 'オーネイト' },
  'E3F3C3D1': { name: 'minimal', nameJa: 'ミニマル' },
  'E3F3C3D3': { name: 'standard', nameJa: 'スタンダード' },
  'E3F3C3D5': { name: 'decorative', nameJa: 'デコラティブ' },
  'E3F3C5D1': { name: 'contemporary', nameJa: 'コンテンポラリー' },
  'E3F3C5D3': { name: 'modern', nameJa: 'モダン' },
  'E3F3C5D5': { name: 'expressive', nameJa: 'エクスプレッシブ' },
  'E3F5C1D1': { name: 'noble', nameJa: 'ノーブル' },
  'E3F5C1D3': { name: 'regal', nameJa: 'リーガル' },
  'E3F5C1D5': { name: 'grand', nameJa: 'グランド' },
  'E3F5C3D1': { name: 'business', nameJa: 'ビジネス' },
  'E3F5C3D3': { name: 'enterprise', nameJa: 'エンタープライズ' },
  'E3F5C3D5': { name: 'prestige', nameJa: 'プレステージ' },
  'E3F5C5D1': { name: 'refined', nameJa: 'リファインド' },
  'E3F5C5D3': { name: 'luxury', nameJa: 'ラグジュアリー' },
  'E3F5C5D5': { name: 'opulent', nameJa: 'オピュレント' },
  // E=5 (エネルギッシュ)
  'E5F1C1D1': { name: 'rustic', nameJa: 'ラスティック' },
  'E5F1C1D3': { name: 'cottage', nameJa: 'コテージ' },
  'E5F1C1D5': { name: 'bohemian', nameJa: 'ボヘミアン' },
  'E5F1C3D1': { name: 'natural', nameJa: 'ナチュラル' },
  'E5F1C3D3': { name: 'friendly', nameJa: 'フレンドリー' },
  'E5F1C3D5': { name: 'whimsical', nameJa: 'ウィムジカル' },
  'E5F1C5D1': { name: 'fresh', nameJa: 'フレッシュ' },
  'E5F1C5D3': { name: 'cheerful', nameJa: 'チアフル' },
  'E5F1C5D5': { name: 'kawaii', nameJa: 'かわいい' },
  'E5F3C1D1': { name: 'earthy', nameJa: 'アーシー' },
  'E5F3C1D3': { name: 'artisan', nameJa: 'アルチザン' },
  'E5F3C1D5': { name: 'festive', nameJa: 'フェスティブ' },
  'E5F3C3D1': { name: 'grounded', nameJa: 'グラウンデッド' },
  'E5F3C3D3': { name: 'inviting', nameJa: 'インバイティング' },
  'E5F3C3D5': { name: 'lively', nameJa: 'ライブリー' },
  'E5F3C5D1': { name: 'organic', nameJa: 'オーガニック' },
  'E5F3C5D3': { name: 'dynamic', nameJa: 'ダイナミック' },
  'E5F3C5D5': { name: 'vibrant', nameJa: 'ヴィブラント' },
  'E5F5C1D1': { name: 'royal', nameJa: 'ロイヤル' },
  'E5F5C1D3': { name: 'majestic', nameJa: 'マジェスティック' },
  'E5F5C1D5': { name: 'imperial', nameJa: 'インペリアル' },
  'E5F5C3D1': { name: 'elegant', nameJa: 'エレガント' },
  'E5F5C3D3': { name: 'sophisticated', nameJa: 'ソフィスティケイテッド' },
  'E5F5C3D5': { name: 'glamorous', nameJa: 'グラマラス' },
  'E5F5C5D1': { name: 'bold', nameJa: 'ボールド' },
  'E5F5C5D3': { name: 'striking', nameJa: 'ストライキング' },
  'E5F5C5D5': { name: 'extravagant', nameJa: 'エクストラバガント' },
}

/**
 * 修飾語定義
 * 値=2または4の場合に付加する修飾語
 * 優先順位: E > F > C > D
 */
const modifiers: Record<string, { value2: string; value4: string }> = {
  energy: { value2: 'calm-', value4: 'warm-' },
  formality: { value2: 'open-', value4: 'elevated-' },
  classicModern: { value2: 'retro-', value4: 'neo-' },
  decoration: { value2: 'clean-', value4: 'rich-' },
}

/**
 * 値を最も近い基準値(1, 3, 5)に丸める
 */
function roundToBaseValue(value: number): 1 | 3 | 5 {
  if (value <= 1) return 1
  if (value <= 2) return 1
  if (value <= 3) return 3
  if (value <= 4) return 5
  return 5
}

/**
 * 印象コードから625パターンの名称を生成
 */
export function getImpressionName(code: ImpressionCode): { name: string; nameJa: string } {
  const { energy, formality, classicModern, decoration } = code
  
  // 基本名を決定するために各値を1, 3, 5のいずれかに丸める
  const baseE = roundToBaseValue(energy)
  const baseF = roundToBaseValue(formality)
  const baseC = roundToBaseValue(classicModern)
  const baseD = roundToBaseValue(decoration)
  
  const baseKey = `E${baseE}F${baseF}C${baseC}D${baseD}`
  const baseName = baseNames[baseKey] || { name: 'standard', nameJa: 'スタンダード' }
  
  // 修飾語を決定（優先順位: E > F > C > D、最初に見つかった中間値のみ）
  let modifier = ''
  
  if (energy === 2) {
    modifier = modifiers.energy.value2
  } else if (energy === 4) {
    modifier = modifiers.energy.value4
  } else if (formality === 2) {
    modifier = modifiers.formality.value2
  } else if (formality === 4) {
    modifier = modifiers.formality.value4
  } else if (classicModern === 2) {
    modifier = modifiers.classicModern.value2
  } else if (classicModern === 4) {
    modifier = modifiers.classicModern.value4
  } else if (decoration === 2) {
    modifier = modifiers.decoration.value2
  } else if (decoration === 4) {
    modifier = modifiers.decoration.value4
  }
  
  return {
    name: modifier + baseName.name,
    nameJa: modifier ? `${modifier}${baseName.nameJa}` : baseName.nameJa,
  }
}

/**
 * 印象コードから表示用の名称を取得
 * プリセットに一致すれば日本語名を、そうでなければ625パターン名を返す
 */
export function getDisplayName(code: ImpressionCode): { name: string; nameJa: string } {
  // まずプリセットを確認
  const preset = findMatchingPreset(code)
  if (preset) {
    return { name: preset.name, nameJa: preset.nameJa }
  }
  
  // プリセットになければ625パターン名を生成
  return getImpressionName(code)
}

// ============================================
// データ移行（旧形式 → 新形式）
// ============================================

/**
 * 旧形式の印象コード文字列を検出
 * 旧形式: "W3S2C4M1" (Warm-Cool, Soft-Hard, Casual-Formal, Classic-Modern)
 */
export function isLegacyCodeString(str: string): boolean {
  return /^W\d+S\d+C-?\d+M\d+$/i.test(str)
}

/**
 * 旧形式の印象コードを新形式に変換
 * 
 * 変換マッピング:
 * - warmCool → energy（おおよそ対応）
 * - softHard → decoration（一部代替）
 * - casualFormal → formality（値を反転: 旧1→新5、旧5→新1）
 * - classicModern → classicModern（そのまま）
 * 
 * @param legacyStr 旧形式のコード文字列 (例: "W3S2C4M1")
 * @returns 新形式の印象コード、または変換失敗時はnull
 */
export function migrateLegacyCode(legacyStr: string): ImpressionCode | null {
  // 旧形式のパース（負の値も許容: C-1 など）
  const match = legacyStr.match(/W(-?\d+)S(-?\d+)C(-?\d+)M(-?\d+)/i)
  if (!match) return null
  
  const [, w, s, c, m] = match
  const warmCool = parseInt(w, 10)
  const softHard = parseInt(s, 10)
  const casualFormal = parseInt(c, 10)
  const classicModern = parseInt(m, 10)
  
  // 新形式への変換（すべて1-5の範囲にクランプ）
  const clamp = (value: number): number => Math.max(1, Math.min(5, value))
  
  // 変換ロジック:
  // - energy: warmCool をそのまま使用（温かさ≒エネルギー感）
  // - formality: casualFormal を反転（旧: Casual=1, Formal=5 → 新: Friendly=1, Formal=5）
  //   ただし旧形式では Casual が左(1)だったので、実際は反転不要
  // - classicModern: そのまま
  // - decoration: softHard を使用（柔らかさ≒装飾性）
  
  const code: ImpressionCode = {
    energy: clamp(warmCool),
    formality: clamp(casualFormal),  // 旧形式も Casual=1, Formal=5 だったのでそのまま
    classicModern: clamp(classicModern),
    decoration: clamp(softHard),
  }
  
  return code
}

/**
 * コード文字列を自動検出して適切な形式で解析
 * 旧形式なら変換し、新形式ならそのまま解析
 */
export function parseImpressionCodeString(str: string): ImpressionCode | null {
  // 新形式を試す
  const newCode = stringToImpressionCode(str)
  if (newCode) return newCode
  
  // 旧形式を試す
  if (isLegacyCodeString(str)) {
    return migrateLegacyCode(str)
  }
  
  return null
}

