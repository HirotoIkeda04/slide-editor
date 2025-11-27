import type { Tone } from '../../types'
import { toneConfigs } from '../../constants/toneConfigs'

interface ToneSelectorProps {
  currentTone: Tone
  onToneChange: (tone: Tone) => void
}

export const ToneSelector = ({ currentTone, onToneChange }: ToneSelectorProps) => {
  return (
    <div className="mb-3 flex gap-2 flex-wrap">
      {(Object.keys(toneConfigs) as Tone[]).map(tone => (
        <button
          key={tone}
          onClick={() => onToneChange(tone)}
          className={`tone-chip ${currentTone === tone ? 'active' : ''}`}
          type="button"
        >
          {toneConfigs[tone].name}
        </button>
      ))}
    </div>
  )
}

