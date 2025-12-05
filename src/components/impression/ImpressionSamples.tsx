import { useMemo } from 'react'
import type { ImpressionCode, ImpressionRange } from '../../types'
import { 
  generateNeighborCodes, 
  generateOutlierCode,
  getDisplayName,
  impressionCodesEqual,
  filterPresetsInRange,
} from '../../constants/impressionConfigs'
import { generateStyleVars } from '../../utils/impressionStyle'

interface ImpressionSamplesProps {
  currentCode: ImpressionCode
  previousCode: ImpressionCode | null
  range: ImpressionRange
  onSelect: (code: ImpressionCode) => void
  onDoubleClick: (code: ImpressionCode) => void
}

// サンプルコンテンツ（固定）
const SAMPLE_CONTENT = {
  title: 'タイトル',
  body: '本文テキスト',
}

export const ImpressionSamples = ({
  currentCode,
  previousCode,
  range,
  onSelect,
  onDoubleClick,
}: ImpressionSamplesProps) => {
  // 候補を生成
  const samples = useMemo(() => {
    const result: Array<{
      code: ImpressionCode
      type: 'previous' | 'current' | 'neighbor' | 'preset' | 'outlier'
      label?: string
    }> = []
    
    // 1. 前回（あれば）
    if (previousCode && !impressionCodesEqual(previousCode, currentCode)) {
      const { name } = getDisplayName(previousCode)
      result.push({
        code: previousCode,
        type: 'previous',
        label: name || '前回',
      })
    }
    
    // 2. 現在
    const { name: currentName } = getDisplayName(currentCode)
    result.push({
      code: currentCode,
      type: 'current',
      label: currentName || 'カスタム',
    })
    
    // 3. 区間内のプリセット（現在と異なるもの）
    const presetsInRange = filterPresetsInRange(range)
      .filter(p => !impressionCodesEqual(p.code, currentCode))
      .slice(0, 3)
    
    for (const preset of presetsInRange) {
      result.push({
        code: preset.code,
        type: 'preset',
        label: preset.name,
      })
    }
    
    // 4. 近傍候補（プリセットで埋まらなかった場合）
    if (result.length < 5) {
      const neighbors = generateNeighborCodes(currentCode, range, 5 - result.length)
      for (const neighborCode of neighbors) {
        // 既に追加済みのコードは除外
        if (!result.some(r => impressionCodesEqual(r.code, neighborCode))) {
          const { name } = getDisplayName(neighborCode)
          result.push({
            code: neighborCode,
            type: 'neighbor',
            label: name,
          })
        }
      }
    }
    
    // 5. 外れた提案
    const outlier = generateOutlierCode(currentCode, range)
    if (outlier && !result.some(r => impressionCodesEqual(r.code, outlier))) {
      const { name: outlierName } = getDisplayName(outlier)
      result.push({
        code: outlier,
        type: 'outlier',
        label: outlierName || '?',
      })
    }
    
    return result
  }, [currentCode, previousCode, range])
  
  return (
    <div className="impression-samples">
      {samples.map((sample, index) => {
        const styleVars = generateStyleVars(sample.code)
        
        return (
          <div
            key={index}
            className={`impression-sample ${sample.type === 'current' ? 'active' : ''} ${sample.type === 'previous' ? 'previous' : ''} ${sample.type === 'outlier' ? 'outlier' : ''}`}
            style={{
              backgroundColor: styleVars.background,
              color: styleVars.text,
            }}
            onClick={() => onSelect(sample.code)}
            onDoubleClick={() => onDoubleClick(sample.code)}
            title={sample.type === 'outlier' ? 'こういう方向も？' : undefined}
          >
            <div 
              className="impression-sample-content"
              style={{
                fontFamily: styleVars.fontFamily,
              }}
            >
              <div style={{ 
                fontWeight: styleVars.fontWeightHeading,
                color: styleVars.primary,
                fontSize: '0.55rem',
                marginBottom: '2px',
              }}>
                {SAMPLE_CONTENT.title}
              </div>
              <div style={{ fontSize: '0.45rem' }}>
                {SAMPLE_CONTENT.body}
              </div>
            </div>
            
            {sample.type === 'current' && (
              <span className="impression-sample-badge">✓</span>
            )}
            
            {sample.label && (
              <span className="impression-sample-label">{sample.label}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

