export type SlideFormat = 'webinar' | 'meeting' | 'seminar' | 'conference' | 'instapost' | 'instastory' | 'a4'
export type Tone = 'simple' | 'casual' | 'luxury' | 'warm'
export type ConsoleMessageType = 'error' | 'warning' | 'info'

export interface ConsoleMessage {
  type: ConsoleMessageType
  message: string
  line: number
}

export type SlideLayout = 'cover' | 'toc' | 'section' | 'summary' | 'normal'

export interface Slide {
  content: string
  layout?: SlideLayout
}

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string | Array<{ type: 'text' | 'image'; text?: string; source?: { type: 'base64'; media_type: string; data: string } }>
  images?: string[] // 後方互換性のため（base64 Data URLの配列）
}

export type ChatMode = 'agent' | 'plan' | 'ask' | 'edit' | 'generate' | 'review'

export type ClaudeModel = 'claude-3-haiku-20240307' | 'claude-sonnet-4-20250514' | 'claude-opus-4-5-20251101'

// Item types
export type ItemType = 'table' | 'image' | 'text' | 'slide'

export interface BaseItem {
  id: string
  name: string
  type: ItemType
  createdAt: string
  updatedAt: string
}

// Table cell data types
export type CellDataType = 'text' | 'number' | 'date' | 'percentage' | 'currency'

// Cell format options
export interface CellFormat {
  type: CellDataType
  // Number format options
  decimalPlaces?: number
  useThousandsSeparator?: boolean
  // Date format options
  dateFormat?: string // e.g., 'YYYY-MM-DD', 'MM/DD/YYYY'
  // Currency format options
  currencySymbol?: string // e.g., '$', '¥', '€'
  // Percentage format options
  percentageDecimalPlaces?: number
}

// Merged cell information
export interface MergedCell {
  row: number
  col: number
  rowSpan: number
  colSpan: number
}

export interface TableItem extends BaseItem {
  type: 'table'
  data: string[][] // CSV形式
  headers?: string[]
  // Cell metadata: key format is "row-col" (e.g., "0-0", "1-2")
  cellTypes?: Record<string, CellDataType> // セルごとのデータ型
  cellFormats?: Record<string, CellFormat> // セルごとの表示フォーマット
  mergedCells?: MergedCell[] // 結合されたセルの情報
}

export type ImageDisplayMode = 'contain' | 'cover'

export interface ImageItem extends BaseItem {
  type: 'image'
  dataUrl: string // base64 Data URL
  alt?: string
  displayMode?: ImageDisplayMode // デフォルト: 'contain'
}

export interface TextItem extends BaseItem {
  type: 'text'
  content: string
}

export interface SlideItem extends BaseItem {
  type: 'slide'
  content: string
}

export type Item = TableItem | ImageItem | TextItem | SlideItem

