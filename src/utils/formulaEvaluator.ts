import type { FormulaToken, CellReference, RangeReference } from './formulaParser'
import { parseFormula, columnNameToIndex, parseCellReference, parseRangeReference } from './formulaParser'
import { parseCellValue } from './tableUtils'
import type { CellDataType } from '../types'

/**
 * セル値の取得関数の型
 */
export type CellValueGetter = (row: number, col: number) => { value: string; type: CellDataType } | null

/**
 * 数式エバリュエーター
 */
export class FormulaEvaluator {
  private cellValueGetter: CellValueGetter
  private tableData: string[][]
  private cellTypes: Record<string, CellDataType>

  constructor(
    tableData: string[][],
    cellTypes: Record<string, CellDataType>,
    cellValueGetter: CellValueGetter
  ) {
    this.tableData = tableData
    this.cellTypes = cellTypes
    this.cellValueGetter = cellValueGetter
  }

  /**
   * 数式を評価
   */
  evaluate(formula: string): number | string | null {
    if (!formula || !formula.trim()) {
      return null
    }

    // 数式でない場合はそのまま返す
    if (!formula.trim().startsWith('=')) {
      return formula
    }

    try {
      const tokens = parseFormula(formula)
      if (tokens.length === 0) {
        return null
      }

      return this.evaluateTokens(tokens)
    } catch (error) {
      console.error('Formula evaluation error:', error)
      return '#ERROR!'
    }
  }

  /**
   * トークン配列を評価
   */
  private evaluateTokens(tokens: FormulaToken[]): number | string | null {
    if (tokens.length === 0) {
      return null
    }

    // 関数の評価
    if (tokens[0].type === 'function') {
      return this.evaluateFunction(tokens[0])
    }

    // 単一の値の評価
    if (tokens.length === 1) {
      return this.evaluateToken(tokens[0])
    }

    // 複数のトークンがある場合は式として評価（簡易版）
    let result: number | null = null
    let operator: string | null = null

    for (const token of tokens) {
      if (token.type === 'operator') {
        operator = token.value
      } else {
        const value = this.evaluateToken(token)
        const numValue = typeof value === 'number' ? value : parseFloat(String(value))

        if (isNaN(numValue)) {
          return '#VALUE!'
        }

        if (result === null) {
          result = numValue
        } else if (operator === '+') {
          result += numValue
        } else if (operator === '-') {
          result -= numValue
        } else if (operator === '*') {
          result *= numValue
        } else if (operator === '/') {
          if (numValue === 0) {
            return '#DIV/0!'
          }
          result /= numValue
        }
      }
    }

    return result
  }

  /**
   * 単一トークンを評価
   */
  private evaluateToken(token: FormulaToken): number | string | null {
    switch (token.type) {
      case 'cell':
        return this.getCellValue(token.value)
      case 'range':
        return '#VALUE!' // 範囲は関数の引数としてのみ使用可能
      case 'number':
        return token.value
      case 'text':
        return token.value
      case 'function':
        return this.evaluateFunction(token)
      default:
        return null
    }
  }

  /**
   * 関数を評価
   */
  private evaluateFunction(token: FormulaToken): number | string | null {
    if (token.type !== 'function') {
      return null
    }

    const functionName = token.name
    const args = token.args

    switch (functionName) {
      case 'SUM':
        return this.sum(args)
      case 'AVERAGE':
        return this.average(args)
      case 'COUNT':
        return this.count(args)
      case 'MIN':
        return this.min(args)
      case 'MAX':
        return this.max(args)
      default:
        return `#NAME?` // 未知の関数
    }
  }

  /**
   * 範囲内のセル値を取得
   */
  private getRangeValues(range: RangeReference): number[] {
    const values: number[] = []
    const startCol = columnNameToIndex(range.start.col)
    const endCol = columnNameToIndex(range.end.col)
    const startRow = range.start.row
    const endRow = range.end.row

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const colName = this.indexToColumnName(col)
        const cellValue = this.getCellValue({ col: colName, row })
        if (typeof cellValue === 'number') {
          values.push(cellValue)
        }
      }
    }

    return values
  }

  /**
   * インデックスを列名に変換
   */
  private indexToColumnName(index: number): string {
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
   * セルの値を取得
   */
  private getCellValue(ref: CellReference): number | string | null {
    const colIndex = columnNameToIndex(ref.col)
    const rowIndex = ref.row

    if (rowIndex < 0 || rowIndex >= this.tableData.length) {
      return '#REF!'
    }
    if (colIndex < 0 || colIndex >= this.tableData[rowIndex].length) {
      return '#REF!'
    }

    const cellData = this.cellValueGetter(rowIndex, colIndex)
    if (!cellData) {
      return null
    }

    const cellKey = `${rowIndex}-${colIndex}`
    const cellType = this.cellTypes[cellKey] || 'text'
    const parsedValue = parseCellValue(cellData.value, cellType)

    if (typeof parsedValue === 'number') {
      return parsedValue
    }

    // 数値として解析を試みる
    const numValue = parseFloat(String(parsedValue))
    return isNaN(numValue) ? cellData.value : numValue
  }

  /**
   * SUM関数: 範囲の合計
   */
  private sum(args: FormulaToken[][]): number | string {
    let total = 0

    for (const argTokens of args) {
      for (const token of argTokens) {
        if (token.type === 'range') {
          const values = this.getRangeValues(token.value)
          total += values.reduce((sum, val) => sum + val, 0)
        } else if (token.type === 'cell') {
          const value = this.getCellValue(token.value)
          if (typeof value === 'number') {
            total += value
          }
        } else if (token.type === 'number') {
          total += token.value
        }
      }
    }

    return total
  }

  /**
   * AVERAGE関数: 範囲の平均
   */
  private average(args: FormulaToken[][]): number | string {
    const values: number[] = []

    for (const argTokens of args) {
      for (const token of argTokens) {
        if (token.type === 'range') {
          values.push(...this.getRangeValues(token.value))
        } else if (token.type === 'cell') {
          const value = this.getCellValue(token.value)
          if (typeof value === 'number') {
            values.push(value)
          }
        } else if (token.type === 'number') {
          values.push(token.value)
        }
      }
    }

    if (values.length === 0) {
      return '#DIV/0!'
    }

    const sum = values.reduce((s, v) => s + v, 0)
    return sum / values.length
  }

  /**
   * COUNT関数: 範囲内の数値の個数
   */
  private count(args: FormulaToken[][]): number {
    let count = 0

    for (const argTokens of args) {
      for (const token of argTokens) {
        if (token.type === 'range') {
          count += this.getRangeValues(token.value).length
        } else if (token.type === 'cell') {
          const value = this.getCellValue(token.value)
          if (typeof value === 'number') {
            count++
          }
        } else if (token.type === 'number') {
          count++
        }
      }
    }

    return count
  }

  /**
   * MIN関数: 範囲の最小値
   */
  private min(args: FormulaToken[][]): number | string {
    const values: number[] = []

    for (const argTokens of args) {
      for (const token of argTokens) {
        if (token.type === 'range') {
          values.push(...this.getRangeValues(token.value))
        } else if (token.type === 'cell') {
          const value = this.getCellValue(token.value)
          if (typeof value === 'number') {
            values.push(value)
          }
        } else if (token.type === 'number') {
          values.push(token.value)
        }
      }
    }

    if (values.length === 0) {
      return '#VALUE!'
    }

    return Math.min(...values)
  }

  /**
   * MAX関数: 範囲の最大値
   */
  private max(args: FormulaToken[][]): number | string {
    const values: number[] = []

    for (const argTokens of args) {
      for (const token of argTokens) {
        if (token.type === 'range') {
          values.push(...this.getRangeValues(token.value))
        } else if (token.type === 'cell') {
          const value = this.getCellValue(token.value)
          if (typeof value === 'number') {
            values.push(value)
          }
        } else if (token.type === 'number') {
          values.push(token.value)
        }
      }
    }

    if (values.length === 0) {
      return '#VALUE!'
    }

    return Math.max(...values)
  }
}

