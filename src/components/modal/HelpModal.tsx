interface HelpModalProps {
  show: boolean
  onClose: () => void
}

export const HelpModal = ({ show, onClose }: HelpModalProps) => {
  if (!show) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="rounded-lg shadow-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: '#2b2b2b', border: '1px solid #3a3a3a' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold" style={{ color: '#e5e7eb' }}>使い方</h2>
          <button
            onClick={onClose}
            className="rounded-lg transition-colors flex items-center justify-center"
            style={{ 
              width: '32px', 
              height: '32px', 
              backgroundColor: '#3a3a3a', 
              color: '#e5e7eb',
              border: '1px solid #4a4a4a'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4a4a4a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3a3a3a'
            }}
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>
        <div className="space-y-4" style={{ color: '#e5e7eb' }}>
          <section>
            <h3 className="text-lg font-semibold mb-2">基本的なマークダウン記法</h3>
            <ul className="list-disc list-inside space-y-1 text-sm opacity-90">
              <li><code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#3a3a3a' }}>#</code> 見出し1</li>
              <li><code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#3a3a3a' }}>##</code> 見出し2</li>
              <li><code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#3a3a3a' }}>###</code> 見出し3</li>
              <li><code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#3a3a3a' }}>-</code> または <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#3a3a3a' }}>*</code> 箇条書き</li>
              <li><code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#3a3a3a' }}>1.</code> 番号付きリスト</li>
              <li><code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#3a3a3a' }}>---</code> スライド区切り</li>
            </ul>
          </section>
          <section>
            <h3 className="text-lg font-semibold mb-2">スライドエディタ特有の記法</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium mb-1">キーメッセージ記法</div>
                <div className="opacity-90 mb-2">
                  行頭に <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#3a3a3a' }}>! </code>（感嘆符+半角スペース）で始まる行をキーメッセージとして認識します。
                </div>
                <div className="opacity-70 text-xs mb-2">例：</div>
                <pre className="p-2 rounded text-xs" style={{ backgroundColor: '#1e1e1e', color: '#c9a961' }}>
{`! これはキーメッセージです

## 見出し
通常のコンテンツ`}
                </pre>
                <div className="opacity-70 text-xs mt-2">
                  ※ 1スライドに1つのキーメッセージのみ（最初のものを採用）
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">スライド区切り</div>
                <div className="opacity-90 mb-2">
                  <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#3a3a3a' }}>---</code> でスライドを区切ります。
                </div>
                <pre className="p-2 rounded text-xs" style={{ backgroundColor: '#1e1e1e', color: '#c9a961' }}>
{`# スライド1のタイトル
コンテンツ

---

# スライド2のタイトル
コンテンツ`}
                </pre>
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-lg font-semibold mb-2">コードブロック</h3>
            <div className="opacity-90 text-sm mb-2">
              コードブロックは自動的にフォントサイズが調整され、スクロールなしで全体が表示されます。
            </div>
            <pre className="p-2 rounded text-xs" style={{ backgroundColor: '#1e1e1e', color: '#c9a961' }}>
{`\`\`\`python
def hello():
    print("Hello, World!")
\`\`\``}
            </pre>
          </section>
          <section>
            <h3 className="text-lg font-semibold mb-2">フォーマットとトンマナ</h3>
            <div className="opacity-90 text-sm space-y-2">
              <div>
                <div className="font-medium">フォーマット</div>
                <div className="opacity-80">Webinar、TeamMtg、RoomSemi、HallConf、InstaPost、InstaStory、A4から選択できます。</div>
              </div>
              <div>
                <div className="font-medium">トンマナ</div>
                <div className="opacity-80">シンプル、カジュアル、ラグジュアリー、暖かいから選択できます。各トンマナで背景色やフォントが変わります。</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

