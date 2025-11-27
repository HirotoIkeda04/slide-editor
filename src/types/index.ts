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

export interface TableItem extends BaseItem {
  type: 'table'
  data: string[][] // CSV形式
  headers?: string[]
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

