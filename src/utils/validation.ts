import type { ConsoleMessage } from '../types'
import { calculateHeadingLength, parseColumnRatio } from './markdown'
import { parseAttributeFromLine } from './attributes'

export const generateConsoleMessages = (
  editorContent: string,
  attributeMap?: Map<number, string | null>
): ConsoleMessage[] => {
  const lines = editorContent.split('\n')
  const messages: ConsoleMessage[] = []

  lines.forEach((line, idx) => {
    // 空行はスキップ
    if (line.trim().length === 0) return
    
    // 属性値を取得（attributeMapが提供されている場合はそれを使用、なければテキストから解析）
    let attribute: string | null = null
    let textWithoutAttribute = line.trim()
    
    if (attributeMap) {
      // attributeMapから実際の属性値を取得
      attribute = attributeMap.get(idx) ?? null
      // テキストから属性記号を除去（表示用のオーバーレイで表示されるため、テキストには含まれていない可能性がある）
      const { textWithoutAttribute: parsedText } = parseAttributeFromLine(line)
      textWithoutAttribute = parsedText.trim()
    } else {
      // フォールバック: テキストから属性値を解析（後方互換性のため）
      const parsed = parseAttributeFromLine(line)
      attribute = parsed.attribute
      textWithoutAttribute = parsed.textWithoutAttribute.trim()
    }
    
    // 見出し（#、##、###）の場合のみ長さをチェック
    if (attribute === '#' || attribute === '##' || attribute === '###') {
      // [レイアウトタイプ] を除去してから文字数をカウント
      let headingText = textWithoutAttribute.replace(/^\[[^\]]+\]\s*/, '')
      
      // H2/H3の比率指定をチェック
      if (attribute === '##' || attribute === '###') {
        const ratioResult = parseColumnRatio(line)
        
        // 比率構文があるが無効な値の場合はエラー
        if (ratioResult.hasRatioSyntax && ratioResult.ratio === null && ratioResult.rawValue !== null) {
          messages.push({
            type: 'error',
            message: `無効な比率指定 {${ratioResult.rawValue}}（正の実数を指定してください）`,
            line: idx + 1
          })
        }
        
        // 比率指定を除去してから文字数カウント
        headingText = ratioResult.title.replace(/^\[[^\]]+\]\s*/, '')
      }
      
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

