import type { Item, ItemType, TableItem, ImageItem, TextItem, SlideItem } from '../types'

// Generate unique ID
const generateId = (): string => {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Create new item
export const createItem = (
  name: string,
  type: ItemType,
  data: Partial<Omit<Item, 'id' | 'name' | 'type' | 'createdAt' | 'updatedAt'>>
): Item => {
  const now = new Date().toISOString()
  const baseItem = {
    id: generateId(),
    name,
    type,
    createdAt: now,
    updatedAt: now
  }

  switch (type) {
    case 'table':
      return {
        ...baseItem,
        type: 'table',
        data: (data as Partial<TableItem>).data || [['']],
        headers: (data as Partial<TableItem>).headers
      } as TableItem

    case 'image':
      return {
        ...baseItem,
        type: 'image',
        dataUrl: (data as Partial<ImageItem>).dataUrl || '',
        alt: (data as Partial<ImageItem>).alt
      } as ImageItem

    case 'text':
      return {
        ...baseItem,
        type: 'text',
        content: (data as Partial<TextItem>).content || ''
      } as TextItem

    case 'slide':
      return {
        ...baseItem,
        type: 'slide',
        content: (data as Partial<SlideItem>).content || ''
      } as SlideItem

    default:
      throw new Error(`Unknown item type: ${type}`)
  }
}

// Update existing item
export const updateItem = (
  items: Item[],
  itemId: string,
  updates: Partial<Omit<Item, 'id' | 'createdAt'>>
): Item[] => {
  return items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        ...updates,
        updatedAt: new Date().toISOString()
      }
    }
    return item
  })
}

// Delete item
export const deleteItem = (items: Item[], itemId: string): Item[] => {
  return items.filter(item => item.id !== itemId)
}

// Get item by ID
export const getItemById = (items: Item[], itemId: string): Item | undefined => {
  return items.find(item => item.id === itemId)
}

// Get item by name
export const getItemByName = (items: Item[], name: string): Item | undefined => {
  return items.find(item => item.name === name)
}

// Search items by name
export const searchItems = (items: Item[], query: string): Item[] => {
  const lowerQuery = query.toLowerCase()
  return items.filter(item => item.name.toLowerCase().includes(lowerQuery))
}

// Filter items by type
export const filterItemsByType = (items: Item[], type: ItemType): Item[] => {
  return items.filter(item => item.type === type)
}

// Check if item name is unique
export const isNameUnique = (items: Item[], name: string, excludeId?: string): boolean => {
  return !items.some(item => item.name === name && item.id !== excludeId)
}

// Convert table to Markdown
export const tableToMarkdown = (table: TableItem): string => {
  const { data, headers } = table
  if (!data || data.length === 0) return ''

  let markdown = ''
  
  // 列数を決定（最初の行またはヘッダーから）
  const colCount = headers && headers.length > 0 ? headers.length : (data[0]?.length || 0)
  if (colCount === 0) return ''

  // Add headers if exists
  if (headers && headers.length > 0) {
    const headerRow = headers.map(h => h || '').slice(0, colCount)
    // 列数に合わせて調整
    while (headerRow.length < colCount) {
      headerRow.push('')
    }
    markdown += '| ' + headerRow.join(' | ') + ' |\n'
    markdown += '| ' + headerRow.map(() => '---').join(' | ') + ' |\n'
  } else {
    // ヘッダーがない場合、最初の行をヘッダーとして扱う
    if (data.length > 0) {
      const firstRow = data[0].map(cell => cell || '').slice(0, colCount)
      while (firstRow.length < colCount) {
        firstRow.push('')
      }
      markdown += '| ' + firstRow.join(' | ') + ' |\n'
      markdown += '| ' + firstRow.map(() => '---').join(' | ') + ' |\n'
    }
  }

  // Add data rows
  const startRow = headers && headers.length > 0 ? 0 : 1 // ヘッダーがない場合は最初の行をスキップ
  for (let i = startRow; i < data.length; i++) {
    const row = data[i] || []
    const rowCells = row.map(cell => cell || '').slice(0, colCount)
    // 列数に合わせて調整
    while (rowCells.length < colCount) {
      rowCells.push('')
    }
    markdown += '| ' + rowCells.join(' | ') + ' |\n'
  }

  return markdown.trim()
}

// Convert image to Markdown
export const imageToMarkdown = (image: ImageItem): string => {
  console.log('[imageToMarkdown] Image item:', { name: image.name, hasDataUrl: !!image.dataUrl, dataUrlLength: image.dataUrl?.length })
  if (!image.dataUrl || image.dataUrl.trim() === '') {
    const alt = image.alt || image.name
    console.warn('[imageToMarkdown] No dataUrl for image:', alt)
    return `⚠️ Image "${alt}" has no data URL`
  }
  const alt = image.alt || image.name
  const markdown = `![${alt}](${image.dataUrl})`
  console.log('[imageToMarkdown] Generated markdown length:', markdown.length)
  return markdown
}

// Convert text to Markdown (as-is)
export const textToMarkdown = (text: TextItem): string => {
  return text.content
}

// Convert slide to Markdown (as-is)
export const slideToMarkdown = (slide: SlideItem): string => {
  return slide.content
}

// Convert item to Markdown
export const itemToMarkdown = (item: Item): string => {
  switch (item.type) {
    case 'table':
      return tableToMarkdown(item)
    case 'image':
      return imageToMarkdown(item)
    case 'text':
      return textToMarkdown(item)
    case 'slide':
      return slideToMarkdown(item)
    default:
      return ''
  }
}

