export type AttributeValue = string | null

export const isNumberedAttribute = (attr: AttributeValue): boolean => {
  return attr !== null && /^#*\d+\.$/.test(attr)
}

export const isAlphabetAttribute = (attr: AttributeValue): boolean => {
  return attr !== null && /^[A-Z]\.$/.test(attr)
}

export const getDefaultAttributeByIndent = (_indentLevel: number): AttributeValue => {
  return null
}

export const parseAttributeFromLine = (line: string): {
  attribute: AttributeValue
  textWithoutAttribute: string
} => {
  // インデント（タブまたはスペース）を抽出
  const indentMatch = line.match(/^([\t ]*)(.*)$/)
  if (!indentMatch) return { attribute: null, textWithoutAttribute: line }

  const [, indent, rest] = indentMatch

  const alphabetMatch = rest.match(/^([a-z])\.\s+/i)
  if (alphabetMatch) {
    const letter = alphabetMatch[1].toUpperCase()
    const textWithoutAttribute = indent + rest.replace(/^[a-z]\.\s+/i, '')
    return { attribute: `${letter}.`, textWithoutAttribute }
  }

  const numberedPatterns = [
    /^(###(\d+)\.)\s+/,
    /^(##(\d+)\.)\s+/,
    /^(#(\d+)\.)\s+/,
    /^((\d+)\.)\s+/,
  ]

  for (const pattern of numberedPatterns) {
    const match = rest.match(pattern)
    if (match) {
      const fullMatch = match[1]
      const textWithoutAttribute = indent + rest.replace(pattern, '')
      return { attribute: fullMatch, textWithoutAttribute }
    }
  }

  const symbolPatterns: Array<{ pattern: RegExp; attribute: string }> = [
    { pattern: /^###\s+/, attribute: '###' },
    { pattern: /^##\s+/, attribute: '##' },
    { pattern: /^#\s+/, attribute: '#' },
    { pattern: /^-\s+/, attribute: '-' },
    { pattern: /^\*\s+/, attribute: '*' },
    { pattern: /^!\s+/, attribute: '!' },
  ]

  for (const { pattern, attribute } of symbolPatterns) {
    if (pattern.test(rest)) {
      const textWithoutAttribute = indent + rest.replace(pattern, '')
      return { attribute, textWithoutAttribute }
    }
  }

  const alphabetMatchWithoutSpace = rest.match(/^([a-z])\.(?=\S)/i)
  if (alphabetMatchWithoutSpace) {
    const letter = alphabetMatchWithoutSpace[1].toUpperCase()
    const textWithoutAttribute = indent + rest.replace(/^[a-z]\./i, '')
    return { attribute: `${letter}.`, textWithoutAttribute }
  }

  const numberedPatternsWithoutSpace = [
    /^(###(\d+)\.)(?=\S)/,
    /^(##(\d+)\.)(?=\S)/,
    /^(#(\d+)\.)(?=\S)/,
    /^((\d+)\.)(?=\S)/,
  ]

  for (const pattern of numberedPatternsWithoutSpace) {
    const match = rest.match(pattern)
    if (match) {
      const fullMatch = match[1]
      const textWithoutAttribute = indent + rest.replace(pattern, '')
      return { attribute: fullMatch, textWithoutAttribute }
    }
  }

  const symbolPatternsWithoutSpace: Array<{ pattern: RegExp; attribute: string }> = [
    { pattern: /^(###)(?=\S)/, attribute: '###' },
    { pattern: /^(##)(?=\S)/, attribute: '##' },
    { pattern: /^(#)(?=\S)/, attribute: '#' },
    { pattern: /^(-)(?=\S)/, attribute: '-' },
    { pattern: /^(\*)(?=\S)/, attribute: '*' },
    { pattern: /^(!)(?=\S)/, attribute: '!' },
  ]

  for (const { pattern, attribute } of symbolPatternsWithoutSpace) {
    const match = rest.match(pattern)
    if (match) {
      const textWithoutAttribute = indent + rest.replace(pattern, '')
      return { attribute, textWithoutAttribute }
    }
  }

  // 属性値がない場合は、インデントを含めた元の行を返す
  return { attribute: null, textWithoutAttribute: line }
}

export type LineMetadata = {
  removedChars: number
  tabsLength: number
}

export const processContentWithAttributes = (content: string): {
  processedContent: string
  attributeMap: Map<number, AttributeValue>
  lineMetadata: LineMetadata[]
} => {
  const lines = content.split('\n')
  const attributeMap = new Map<number, AttributeValue>()
  const processedLines: string[] = []
  const lineMetadata: LineMetadata[] = []

  lines.forEach((line, idx) => {
    const tabMatch = line.match(/^(\t*)/)
    const tabs = tabMatch ? tabMatch[1] : ''
    const rest = line.slice(tabs.length)

    const { attribute, textWithoutAttribute } = parseAttributeFromLine(line)

    if (attribute !== null) {
      attributeMap.set(idx, attribute)
    }

    processedLines.push(tabs + textWithoutAttribute)
    lineMetadata.push({
      removedChars: Math.max(0, rest.length - textWithoutAttribute.length),
      tabsLength: tabs.length,
    })
  })

  return {
    processedContent: processedLines.join('\n'),
    attributeMap,
    lineMetadata,
  }
}

export const normalizeContentWithAttributes = (
  content: string,
  savedMap?: Map<number, AttributeValue>
): { plainContent: string; attributeMap: Map<number, AttributeValue> } => {
  const { processedContent, attributeMap: derivedMap } = processContentWithAttributes(content)
  const attributeMap = new Map(savedMap ?? [])

  derivedMap.forEach((value, key) => {
    attributeMap.set(key, value)
  })

  const lineCount = processedContent.split('\n').length
  Array.from(attributeMap.keys()).forEach(key => {
    if (key >= lineCount) {
      attributeMap.delete(key)
    }
  })

  return {
    plainContent: processedContent,
    attributeMap,
  }
}

export const shouldRenumberAttribute = (attribute: AttributeValue): boolean => {
  return isNumberedAttribute(attribute) || isAlphabetAttribute(attribute)
}

// EditorLine type for line-based editing
import type { EditorLine } from '../types'

// UUID generator for line IDs
export const generateLineId = (): string => {
  return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Convert raw content string to EditorLine array
export const contentToLines = (content: string): EditorLine[] => {
  const rawLines = content.split('\n')
  return rawLines.map(line => {
    const { attribute, textWithoutAttribute } = parseAttributeFromLine(line)
    return {
      id: generateLineId(),
      attribute,
      text: textWithoutAttribute,
    }
  })
}

// Convert EditorLine array to content string (with attributes)
export const linesToContent = (lines: EditorLine[]): string => {
  return lines.map(line => {
    if (!line.attribute) return line.text
    // インデント（先頭の空白/タブ）を抽出
    const indentMatch = line.text.match(/^[\t ]*/)
    const indent = indentMatch ? indentMatch[0] : ''
    const textWithoutIndent = line.text.slice(indent.length)
    // インデント + 属性値 + 空白 + テキスト の形式で出力
    return `${indent}${line.attribute} ${textWithoutIndent}`
  }).join('\n')
}

// Convert EditorLine array to plain content string (without attributes)
export const linesToPlainContent = (lines: EditorLine[]): string => {
  return lines.map(line => line.text).join('\n')
}

// Convert EditorLine array to attributeMap (for compatibility)
export const linesToAttributeMap = (lines: EditorLine[]): Map<number, AttributeValue> => {
  const map = new Map<number, AttributeValue>()
  lines.forEach((line, idx) => {
    if (line.attribute) {
      map.set(idx, line.attribute)
    }
  })
  return map
}

