import type { ConsoleMessage } from '../../types'
import './Console.css'

interface ConsoleProps {
  messages: ConsoleMessage[]
}

export const Console = ({ messages }: ConsoleProps) => {
  return (
    <div className="console-panel mt-4">
      <div className="console-header">
        <span>コンソール</span>
        <span className="console-count">{messages.length}件</span>
      </div>
      <div className="console-body">
        {messages.length === 0 ? (
          <div className="console-empty">エラーはありません</div>
        ) : (
          messages.map((msg, index) => (
            <div key={`${msg.line}-${index}`} className={`console-entry ${msg.type}`}>
              <span className="console-line">L{msg.line}</span>
              <span>{msg.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

