import type { ImpressionCode } from '../../types'
import { getDisplayName, impressionCodeToString } from '../../constants/impressionConfigs'

interface ToneDisplayProps {
  code: ImpressionCode
  onClick?: () => void
}

export const ToneDisplay = ({ code, onClick }: ToneDisplayProps) => {
  const { nameJa } = getDisplayName(code)
  const codeString = impressionCodeToString(code)
  
  return (
    <button
      className="tone-display"
      onClick={onClick}
      type="button"
      title="トンマナ設定を開く"
    >
      <span className="material-icons tone-display-icon">palette</span>
      <span className="tone-display-name">{nameJa}</span>
      <span className="tone-display-code">({codeString})</span>
    </button>
  )
}

