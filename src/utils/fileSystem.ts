import type { Item } from '../types'

interface ItemsData {
  version: string
  items: Item[]
}

// Save items to JSON file
export const saveItemsToFile = (items: Item[]): void => {
  const itemsData: ItemsData = {
    version: '1.0',
    items
  }
  
  const dataStr = JSON.stringify(itemsData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = 'items.json'
  link.click()
  
  URL.revokeObjectURL(url)
}

// Load items from JSON file
export const loadItemsFromFile = (): Promise<Item[]> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as ItemsData
          
          // Validate data structure
          if (!data.version || !Array.isArray(data.items)) {
            reject(new Error('Invalid items file format'))
            return
          }
          
          resolve(data.items)
        } catch (error) {
          reject(new Error('Failed to parse items file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    }
    
    input.click()
  })
}

// Save items to localStorage
export const saveItemsToLocalStorage = (items: Item[]): void => {
  const itemsData: ItemsData = {
    version: '1.0',
    items
  }
  localStorage.setItem('slide-editor-items', JSON.stringify(itemsData))
}

// Load items from localStorage
export const loadItemsFromLocalStorage = (): Item[] => {
  try {
    const data = localStorage.getItem('slide-editor-items')
    if (!data) return []
    
    const itemsData = JSON.parse(data) as ItemsData
    if (!itemsData.version || !Array.isArray(itemsData.items)) return []
    
    return itemsData.items
  } catch {
    return []
  }
}

// Clear items from localStorage
export const clearItemsFromLocalStorage = (): void => {
  localStorage.removeItem('slide-editor-items')
}

