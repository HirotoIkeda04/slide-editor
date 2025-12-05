import { useCallback, useRef, useState, useEffect } from 'react'
import type { ImpressionCode, ImpressionRange } from '../../types'
import { axisDefinitions } from '../../constants/impressionConfigs'

interface ImpressionSlidersProps {
  code: ImpressionCode
  range: ImpressionRange
  onCodeChange: (code: ImpressionCode) => void
  onRangeChange: (range: ImpressionRange) => void
}

interface RangeSliderProps {
  axis: keyof ImpressionCode
  rangeMin: number
  rangeMax: number
  currentValue: number
  onRangeChange: (min: number, max: number) => void
  minLabel: string
  maxLabel: string
}

const RangeSlider = ({
  axis: _axis,
  rangeMin,
  rangeMax,
  currentValue,
  onRangeChange,
  minLabel,
  maxLabel,
}: RangeSliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)
  
  const getPositionFromValue = (val: number): number => {
    return ((val - 1) / 4) * 100  // 5段階（1-5）
  }
  
  const getValueFromPosition = (clientX: number): number => {
    if (!trackRef.current) return 3  // 中央値は3
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * 4) + 1  // 5段階（1-5）
  }
  
  const handleMouseDown = useCallback((type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(type)
  }, [])
  
  useEffect(() => {
    if (!dragging) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const newValue = getValueFromPosition(e.clientX)
      
      if (dragging === 'min') {
        if (newValue <= rangeMax) {
          onRangeChange(newValue, rangeMax)
        }
      } else if (dragging === 'max') {
        if (newValue >= rangeMin) {
          onRangeChange(rangeMin, newValue)
        }
      }
    }
    
    const handleMouseUp = () => {
      setDragging(null)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, rangeMin, rangeMax, onRangeChange])
  
  // トラッククリックで近い方のハンドルを移動
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return
    const newValue = getValueFromPosition(e.clientX)
    const distToMin = Math.abs(newValue - rangeMin)
    const distToMax = Math.abs(newValue - rangeMax)
    
    if (distToMin <= distToMax) {
      if (newValue <= rangeMax) {
        onRangeChange(newValue, rangeMax)
      }
    } else {
      if (newValue >= rangeMin) {
        onRangeChange(rangeMin, newValue)
      }
    }
  }, [dragging, rangeMin, rangeMax, onRangeChange])
  
  return (
    <div className="impression-slider-track">
      {/* 左端ラベル */}
      <span className="impression-slider-axis-label left">{minLabel}</span>
      
      <div 
        ref={trackRef}
        className="impression-range-slider"
        onClick={handleTrackClick}
      >
        {/* 区間マーク（目盛り線）と数字 */}
        <div className="impression-range-marks">
          {[1, 2, 3, 4, 5].map(n => (
            <div 
              key={n} 
              className={`impression-range-mark-container`}
            >
              <div 
                className={`impression-range-mark ${n >= rangeMin && n <= rangeMax ? 'in-range' : ''} ${n === 3 ? 'center' : ''}`}
              />
              {/* キー数字（1, 3, 5）を表示 */}
              {(n === 1 || n === 3 || n === 5) && (
                <span className={`impression-range-mark-label ${n >= rangeMin && n <= rangeMax ? 'in-range' : ''}`}>
                  {n}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* ベースライン */}
        <div className="impression-range-track" />
        
        {/* 選択区間のハイライト */}
        <div 
          className="impression-range-fill"
          style={{
            left: `${getPositionFromValue(rangeMin)}%`,
            width: `${getPositionFromValue(rangeMax) - getPositionFromValue(rangeMin)}%`,
          }}
        />
        
        {/* 現在値マーカー */}
        <div
          className="impression-range-current-marker"
          style={{ left: `${getPositionFromValue(currentValue)}%` }}
          title={`現在値: ${currentValue}`}
        />
        
        {/* 最小値ハンドル */}
        <div
          className={`impression-range-handle impression-range-handle-min ${dragging === 'min' ? 'dragging' : ''}`}
          style={{ left: `${getPositionFromValue(rangeMin)}%` }}
          onMouseDown={handleMouseDown('min')}
        >
          {/* ハンドル上の値表示 */}
          <span className="impression-range-handle-value">{rangeMin}</span>
        </div>
        
        {/* 最大値ハンドル */}
        <div
          className={`impression-range-handle impression-range-handle-max ${dragging === 'max' ? 'dragging' : ''}`}
          style={{ left: `${getPositionFromValue(rangeMax)}%` }}
          onMouseDown={handleMouseDown('max')}
        >
          {/* ハンドル上の値表示 */}
          <span className="impression-range-handle-value">{rangeMax}</span>
        </div>
      </div>
      
      {/* 右端ラベル */}
      <span className="impression-slider-axis-label right">{maxLabel}</span>
    </div>
  )
}

export const ImpressionSliders = ({
  code,
  range,
  onCodeChange,
  onRangeChange,
}: ImpressionSlidersProps) => {
  const handleRangeChangeForAxis = useCallback((axis: keyof ImpressionRange) => (min: number, max: number) => {
    onRangeChange({ ...range, [axis]: [min, max] as [number, number] })
    
    // 区間の中央値をコードに反映
    const midValue = Math.round((min + max) / 2)
    if (code[axis] !== midValue) {
      onCodeChange({ ...code, [axis]: midValue })
    }
  }, [range, code, onRangeChange, onCodeChange])
  
  return (
    <div className="impression-sliders">
      {axisDefinitions.map(axis => (
        <div key={axis.key} className="impression-slider-row">
          <div className="impression-slider-header">
            <span className="impression-slider-label">{axis.nameJa}</span>
            <span className="impression-slider-value">
              {range[axis.key][0]} 〜 {range[axis.key][1]}
            </span>
          </div>
          
          <RangeSlider
            axis={axis.key}
            rangeMin={range[axis.key][0]}
            rangeMax={range[axis.key][1]}
            currentValue={code[axis.key]}
            onRangeChange={handleRangeChangeForAxis(axis.key)}
            minLabel={axis.leftLabelJa}
            maxLabel={axis.rightLabelJa}
          />
        </div>
      ))}
    </div>
  )
}

