/**
 * 数式パーサー
 * セル参照（A1, B2など）と関数（SUM, AVERAGEなど）を解析
 */

export type CellReference = {
  col: string // 'A', 'B', 'C', etc.
  row: number // 1, 2, 3, etc.
}

export type RangeReference = {
  start: CellReference
  end: CellReference
}

export type FormulaToken =
  | { type: 'cell'; value: CellReference }
  | { type: 'range'; value: RangeReference }
  | { type: 'function'; name: string; args: FormulaToken[][] }
  | { type: 'number'; value: number }
  | { type: 'operator'; value: string }
  | { type: 'text'; value: string }

/**
 * 列名を数値に変換（A=0, B=1, ...）
 */
export function columnNameToIndex(colName: string): number {
  let index = 0
  for (let i = 0; i < colName.length; i++) {
    index = index * 26 + (colName.charCodeAt(i) - 64)
  }
  return index - 1
}

/**
 * 数値を列名に変換（0=A, 1=B, ...）
 */
export function indexToColumnName(index: number): string {
  let colName = ''
  index++
  while (index > 0) {
    const remainder = (index - 1) % 26
    colName = String.fromCharCode(65 + remainder) + colName
    index = Math.floor((index - 1) / 26)
  }
  return colName
}

/**
 * セル参照を解析（例: "A1" -> {col: "A", row: 1}）
 */
export function parseCellReference(ref: string): CellReference | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null
  
  return {
    col: match[1].toUpperCase(),
    row: parseInt(match[2], 10) - 1 // 0-indexed
  }
}

/**
 * 範囲参照を解析（例: "A1:B2" -> {start: {col: "A", row: 1}, end: {col: "B", row: 2}}）
 */
export function parseRangeReference(ref: string): RangeReference | null {
  const parts = ref.split(':')
  if (parts.length !== 2) return null
  
  const start = parseCellReference(parts[0])
  const end = parseCellReference(parts[1])
  
  if (!start || !end) return null
  
  return { start, end }
}

/**
 * 数式をトークンに分割
 */
export function tokenizeFormula(formula: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < formula.length; i++) {
    const char = formula[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
      current += char
    } else if (inQuotes) {
      current += char
    } else if (/[\s(),]/.test(char)) {
      if (current.trim()) {
        tokens.push(current.trim())
        current = ''
      }
      if (char !== ' ') {
        tokens.push(char)
      }
    } else {
      current += char
    }
  }
  
  if (current.trim()) {
    tokens.push(current.trim())
  }
  
  return tokens
}

/**
 * 数式を解析してトークン配列を生成
 */
export function parseFormula(formula: string): FormulaToken[] {
  if (!formula || !formula.trim()) {
    return []
  }
  
  // 先頭の=を除去
  const cleanFormula = formula.trim().startsWith('=') 
    ? formula.trim().substring(1) 
    : formula.trim()
  
  const tokens = tokenizeFormula(cleanFormula)
  const result: FormulaToken[] = []
  
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    
    // 関数名のチェック
    if (/^[A-Z_][A-Z0-9_]*$/i.test(token) && i + 1 < tokens.length && tokens[i + 1] === '(') {
      // 関数の解析
      const functionName = token.toUpperCase()
      const args: FormulaToken[][] = []
      let argTokens: FormulaToken[] = []
      let parenCount = 0
      i += 2 // 関数名と'('をスキップ
      
      while (i < tokens.length) {
        if (tokens[i] === '(') {
          parenCount++
          argTokens.push({ type: 'operator', value: '(' })
        } else if (tokens[i] === ')') {
          if (parenCount === 0) {
            if (argTokens.length > 0) {
              args.push(argTokens)
            }
            break
          }
          parenCount--
          argTokens.push({ type: 'operator', value: ')' })
        } else if (tokens[i] === ',' && parenCount === 0) {
          if (argTokens.length > 0) {
            args.push(argTokens)
            argTokens = []
          }
        } else {
          // 引数内のトークンを解析
          const parsed = parseToken(tokens[i])
          if (parsed) {
            argTokens.push(parsed)
          }
        }
        i++
      }
      
      if (argTokens.length > 0) {
        args.push(argTokens)
      }
      
      result.push({ type: 'function', name: functionName, args })
    } else {
      // 通常のトークンを解析
      const parsed = parseToken(token)
      if (parsed) {
        result.push(parsed)
      }
    }
    
    i++
  }
  
  return result
}

/**
 * 単一トークンを解析
 */
function parseToken(token: string): FormulaToken | null {
  // セル参照（A1形式）
  const cellRef = parseCellReference(token)
  if (cellRef) {
    return { type: 'cell', value: cellRef }
  }
  
  // 範囲参照（A1:B2形式）
  const rangeRef = parseRangeReference(token)
  if (rangeRef) {
    return { type: 'range', value: rangeRef }
  }
  
  // 数値
  if (/^-?\d+\.?\d*$/.test(token)) {
    return { type: 'number', value: parseFloat(token) }
  }
  
  // 演算子
  if (/^[+\-*/=<>]+$/.test(token)) {
    return { type: 'operator', value: token }
  }
  
  // テキスト（引用符で囲まれている）
  if (token.startsWith('"') && token.endsWith('"')) {
    return { type: 'text', value: token.slice(1, -1) }
  }
  
  return null
}

/**
 * セル参照を文字列に変換
 */
export function cellReferenceToString(ref: CellReference): string {
  return `${ref.col}${ref.row + 1}`
}

/**
 * 範囲参照を文字列に変換
 */
export function rangeReferenceToString(ref: RangeReference): string {
  return `${cellReferenceToString(ref.start)}:${cellReferenceToString(ref.end)}`
}

