import type { ConsoleMessage } from '../types'
import { calculateHeadingLength } from './markdown'

export const generateConsoleMessages = (editorContent: string): ConsoleMessage[] => {
  const lines = editorContent.split('\n')
  const messages: ConsoleMessage[] = []

  lines.forEach((line, idx) => {
    const match = line.match(/^(#+)\s+(.*)$/)
    if (match) {
      let headingText = match[2].trim()
      // [レイアウトタイプ] を除去してから文字数をカウント
      headingText = headingText.replace(/^\[[^\]]+\]\s*/, '')
      const length = calculateHeadingLength(headingText)
      if (length > 13) {
        messages.push({
          type: 'error',
          message: `見出しが長すぎます（${length}文字）。13文字以下にしてください。`,
          line: idx + 1
        })
      }
    }
  })

  return messages
}

