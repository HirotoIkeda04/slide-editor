import { useState, useRef, useEffect } from 'react'
import type { ReactElement } from 'react'
import type { ChatMessage, ChatMode, ClaudeModel } from '../../types'
import { sendChatMessage, applyDiffToContent, extractTableFromResponse, generateTableNameWithAI } from '../../utils/ai'
import './ChatPanel.css'

/**
 * テーブルデータから適切な名前を生成する
 * - 空白を含まない名前を生成
 * - ヘッダーや最初の列の値から名前を推測
 * - 既存の名前と重複しないようにする
 */
const generateTableName = (headers?: string[], data?: string[][], existingNames?: string[]): string => {
  let baseName = ''
  
  // ヘッダーから名前を推測
  if (headers && headers.length > 0) {
    // ヘッダーの最初の要素を名前のベースにする
    const firstHeader = headers[0].trim()
    if (firstHeader && !firstHeader.match(/^(id|no|番号|#)$/i)) {
      // 意味のあるヘッダーならそれを使う
      baseName = firstHeader.replace(/\s+/g, '_').substring(0, 20)
    } else if (headers.length > 1) {
      // 2番目のヘッダーを試す
      const secondHeader = headers[1].trim()
      if (secondHeader) {
        baseName = secondHeader.replace(/\s+/g, '_').substring(0, 20)
      }
    }
  }
  
  // データの最初の行から名前を推測
  if (!baseName && data && data.length > 0 && data[0].length > 0) {
    const firstCell = data[0][0].trim()
    if (firstCell && firstCell.length <= 20) {
      baseName = firstCell.replace(/\s+/g, '_')
    }
  }
  
  // フォールバック: 日時ベースの名前（スペースなし）
  if (!baseName) {
    const now = new Date()
    const timestamp = `${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`
    baseName = `表_${timestamp}`
  } else {
    baseName = `${baseName}_表`
  }
  
  // 既存の名前と重複しないようにする
  if (existingNames && existingNames.length > 0) {
    let finalName = baseName
    let counter = 1
    while (existingNames.includes(finalName)) {
      finalName = `${baseName}_${counter}`
      counter++
    }
    return finalName
  }
  
  return baseName
}

interface ChatPanelProps {
  editorContent: string
  onApplyEdit: (content: string) => void
  onCreateTable?: (name: string, headers: string[] | undefined, data: string[][]) => void
  existingItemNames?: string[]
}

const MODE_CONFIG = {
  agent: { 
    label: 'Agent', 
    icon: '∞', 
    implemented: true,
    description: 'AIが自動的にスライドを編集します'
  },
  plan: { 
    label: 'Plan', 
    icon: '☰', 
    implemented: true,
    description: '編集計画を提示してから実行します'
  },
  ask: { 
    label: 'Ask', 
    icon: '?', 
    implemented: true,
    description: '質問に答えるのみ、編集はしません'
  },
  edit: { 
    label: 'Edit', 
    icon: '✎', 
    implemented: false,
    description: '部分的な編集に特化（開発中）'
  },
  generate: { 
    label: 'Generate', 
    icon: '+', 
    implemented: false,
    description: '新しいコンテンツを生成（開発中）'
  },
  review: { 
    label: 'Review', 
    icon: '◉', 
    implemented: false,
    description: 'レビューと改善提案を提示（開発中）'
  }
}

const MODEL_CONFIG: Record<ClaudeModel, { label: string; description: string }> = {
  'claude-3-haiku-20240307': {
    label: 'Haiku',
    description: '高速'
  },
  'claude-sonnet-4-20250514': {
    label: 'Sonnet 4',
    description: '推奨'
  },
  'claude-opus-4-5-20251101': {
    label: 'Opus 4.5',
    description: '高性能'
  }
}

// デフォルトモデルをlocalStorageから読み込む
const getDefaultModel = (): ClaudeModel => {
  const saved = localStorage.getItem('claude-model')
  // 保存されたモデルが有効なモデルリストに含まれているか確認
  if (saved && saved in MODEL_CONFIG) {
    return saved as ClaudeModel
  }
  // 無効なモデル（削除されたモデルなど）が保存されている場合は削除
  // 特に、廃止されたSonnetモデルをHaikuに移行
  if (saved === 'claude-3-5-sonnet-20241022' || saved === 'claude-3-5-sonnet-20240620') {
    localStorage.setItem('claude-model', 'claude-3-haiku-20240307')
    return 'claude-3-haiku-20240307'
  }
  // 廃止されたOpusモデルを最新のOpus 4.5に移行
  if (saved === 'claude-3-opus-20240229' || saved === 'claude-opus-4-20250514') {
    localStorage.setItem('claude-model', 'claude-opus-4-5-20251101')
    return 'claude-opus-4-5-20251101'
  }
  if (saved) {
    localStorage.removeItem('claude-model')
  }
  return 'claude-3-haiku-20240307'
}

// diff形式かどうかを判定
const isDiffFormat = (content: string): boolean => {
  // 変更なしの場合はfalse
  if (content.includes('変更なし') || content.includes('No changes needed')) {
    return false
  }
  // diff形式のパターンをチェック
  const diffPatterns = [
    /^-\d+:/m,  // -行番号:
    /^\+\d+:/m, // +行番号:
    /^~\d+:/m    // ~行番号:
  ]
  return diffPatterns.some(pattern => pattern.test(content))
}

// diff形式の内容をレンダリング
const renderDiffContent = (content: string): ReactElement => {
  const lines = content.split('\n')
  const elements: ReactElement[] = []

  lines.forEach((line, index) => {
    // 削除: -行番号: 内容
    const deleteMatch = line.match(/^-(\d+):\s*(.+)$/)
    if (deleteMatch) {
      elements.push(
        <div key={index} className="diff-line diff-delete">
          <span className="diff-prefix">-{deleteMatch[1]}:</span>
          <span className="diff-content">{deleteMatch[2]}</span>
        </div>
      )
      return
    }

    // 追加: +行番号: 内容
    const addMatch = line.match(/^\+(\d+):\s*(.+)$/)
    if (addMatch) {
      elements.push(
        <div key={index} className="diff-line diff-add">
          <span className="diff-prefix">+{addMatch[1]}:</span>
          <span className="diff-content">{addMatch[2]}</span>
        </div>
      )
      return
    }

    // 変更: ~行番号: 変更前 → 変更後
    // Cursorのように削除行と追加行に分けて表示
    const modifyMatch = line.match(/^~(\d+):\s*(.+?)\s*→\s*(.+)$/)
    if (modifyMatch) {
      const lineNumber = modifyMatch[1]
      const oldContent = modifyMatch[2]
      const newContent = modifyMatch[3]
      // 削除行
      elements.push(
        <div key={`${index}-delete`} className="diff-line diff-delete">
          <span className="diff-prefix">-{lineNumber}:</span>
          <span className="diff-content">{oldContent}</span>
        </div>
      )
      // 追加行
      elements.push(
        <div key={`${index}-add`} className="diff-line diff-add">
          <span className="diff-prefix">+{lineNumber}:</span>
          <span className="diff-content">{newContent}</span>
        </div>
      )
      return
    }

    // 通常の行
    if (line.trim()) {
      elements.push(
        <div key={index} className="diff-line diff-normal">
          {line}
        </div>
      )
    } else {
      // 空行
      elements.push(<div key={index} className="diff-line diff-empty"><br /></div>)
    }
  })

  return <div className="diff-content-wrapper">{elements}</div>
}

export const ChatPanel = ({ editorContent, onApplyEdit, onCreateTable, existingItemNames }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [mode, setMode] = useState<ChatMode>('agent')
  const [model, setModel] = useState<ClaudeModel>(getDefaultModel())
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([]) // base64 Data URLの配列
  const [appliedMessageIndices, setAppliedMessageIndices] = useState<Set<number>>(new Set()) // 適用済みメッセージのインデックス
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // テキストエリアの高さを自動調整
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // 高さをリセットしてからスクロール高さを取得
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      // min-heightとmax-heightを考慮
      const minHeight = 24 // min-height: 24px
      const maxHeight = 160 // max-height: 160px
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
    }
  }, [input])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false)
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleModeSelect = (newMode: ChatMode) => {
    setMode(newMode)
    setShowModeDropdown(false)
    
    // Show message for unimplemented modes
    if (!MODE_CONFIG[newMode].implemented) {
      const systemMessage: ChatMessage = {
        role: 'assistant',
        content: `${MODE_CONFIG[newMode].label}モードは現在開発中です。近日中に利用可能になります。`
      }
      setMessages(prev => [...prev, systemMessage])
    }
  }

  const handleModelSelect = (newModel: ClaudeModel) => {
    setModel(newModel)
    setShowModelDropdown(false)
    localStorage.setItem('claude-model', newModel)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const imagePromises = Array.from(files).map(file => {
      return new Promise<string>((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
          reject(new Error(`${file.name}は画像ファイルではありません`))
          return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string
          resolve(dataUrl)
        }
        reader.onerror = () => reject(new Error(`${file.name}の読み込みに失敗しました`))
        reader.readAsDataURL(file)
      })
    })

    Promise.all(imagePromises)
      .then(dataUrls => {
        setSelectedImages(prev => [...prev, ...dataUrls])
      })
      .catch(error => {
        console.error('画像の読み込みエラー:', error)
        alert(error instanceof Error ? error.message : '画像の読み込みに失敗しました')
      })

    // ファイル入力をリセット（同じファイルを再度選択できるように）
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return
    
    // Check if mode is implemented
    if (!MODE_CONFIG[mode].implemented) {
      const systemMessage: ChatMessage = {
        role: 'assistant',
        content: `${MODE_CONFIG[mode].label}モードは現在開発中です。別のモードを選択してください。`
      }
      setMessages(prev => [...prev, systemMessage])
      return
    }

    // 画像がある場合はcontentを配列形式に、ない場合は文字列形式に
    const content: ChatMessage['content'] = selectedImages.length > 0
      ? [
          ...(input.trim() ? [{ type: 'text' as const, text: input.trim() }] : []),
          ...selectedImages.map(dataUrl => {
            // data:image/png;base64,... の形式から media_type と data を抽出
            const match = dataUrl.match(/^data:image\/([^;]+);base64,(.+)$/)
            if (!match) {
              throw new Error('無効な画像形式です')
            }
            const [, mediaType, base64Data] = match
            return {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: `image/${mediaType}`,
                data: base64Data
              }
            }
          })
        ]
      : input.trim()

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      images: selectedImages.length > 0 ? selectedImages : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSelectedImages([])
    setIsLoading(true)

    try {
      const allMessages: ChatMessage[] = [...messages, userMessage]
      const response = await sendChatMessage(allMessages, editorContent, mode, model)
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      }

      // 表データを抽出（応答メッセージを追加した後）
      if (onCreateTable && typeof response === 'string') {
        console.log('[ChatPanel] Checking for table in response, response length:', response.length)
        const tableData = extractTableFromResponse(response)
        console.log('[ChatPanel] Table data extracted:', tableData ? 'yes' : 'no', tableData)
        if (tableData) {
          // 表が抽出できた場合、表アイテムを作成
          // AIを使用してテーブルの内容から適切な名前を生成
          let tableName: string
          try {
            console.log('[ChatPanel] Generating table name with AI...')
            tableName = await generateTableNameWithAI(tableData.headers, tableData.data)
            console.log('[ChatPanel] AI generated name:', tableName)
          } catch (error) {
            // AIでの名前生成に失敗した場合はフォールバック
            console.log('[ChatPanel] AI name generation failed, using fallback:', error)
            tableName = generateTableName(tableData.headers, tableData.data)
          }
          
          // 既存の名前と重複しないようにする
          if (existingItemNames && existingItemNames.length > 0) {
            let finalName = tableName
            let counter = 1
            while (existingItemNames.includes(finalName)) {
              finalName = `${tableName}_${counter}`
              counter++
            }
            tableName = finalName
          }
          
          console.log('[ChatPanel] Creating table:', tableName, 'headers:', tableData.headers?.length, 'data rows:', tableData.data.length)
          onCreateTable(tableName, tableData.headers, tableData.data)
          
          // 表が作成されたことをユーザーに通知
          const notificationMessage: ChatMessage = {
            role: 'assistant',
            content: `表「${tableName}」を作成しました。`
          }
          // 元の応答メッセージと通知メッセージの両方を追加
          setMessages(prev => [...prev, assistantMessage, notificationMessage])
          return
        }
      }
      
      // 表が抽出されなかった場合は通常の応答メッセージのみ追加
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME入力中（日本語変換中）はEnterキーで送信しない
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = () => {
    setIsComposing(false)
  }

  const handleApplyEdit = (content: string) => {
    console.log('[ChatPanel] ===== APPLY EDIT START =====')
    console.log('[ChatPanel] Editor content length:', editorContent.length)
    console.log('[ChatPanel] AI response length:', content.length)
    console.log('[ChatPanel] AI response (full):', content)
    console.log('[ChatPanel] AI response (first 500 chars):', content.substring(0, 500))
    // 差分形式の応答を適用
    const editedContent = applyDiffToContent(editorContent, content)
    console.log('[ChatPanel] Edited content length:', editedContent.length)
    console.log('[ChatPanel] Edited content preview:', editedContent.substring(0, 500))
    console.log('[ChatPanel] ===== APPLY EDIT END =====')
    onApplyEdit(editedContent)
  }

  return (
    <div className="flex flex-col h-full chat-panel">
      {/* チャットヘッダー */}
      <div className="chat-header">
        <div className="flex items-center gap-1.5">
          <div className="chat-ai-icon">✨</div>
          <h3 className="text-sm chat-header-title">AI Assistant</h3>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <p className="chat-empty-text">AIアシスタントに編集を依頼</p>
            <p className="chat-empty-subtext">スライドの内容を編集・改善します</p>
          </div>
        )}
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} chat-message-wrapper`}
          >
            <div className={`chat-message ${message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
              {message.role === 'assistant' && typeof message.content === 'string' && isDiffFormat(message.content) ? (
                renderDiffContent(message.content)
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {typeof message.content === 'string' ? (
                    message.content
                  ) : (
                    <>
                      {message.content.map((item, idx) => {
                        if (item.type === 'text' && item.text) {
                          return <div key={idx}>{item.text}</div>
                        } else if (item.type === 'image' && item.source) {
                          const dataUrl = `data:${item.source.media_type};base64,${item.source.data}`
                          return (
                            <img
                              key={idx}
                              src={dataUrl}
                              alt="Uploaded image"
                              style={{ maxWidth: '100%', borderRadius: '0.5rem', marginTop: '0.5rem' }}
                            />
                          )
                        }
                        return null
                      })}
                    </>
                  )}
                </div>
              )}
              {message.role === 'assistant' && 
               mode !== 'ask' && 
               typeof message.content === 'string' &&
               !message.content.includes('開発中です') && 
               !message.content.includes('現在開発中') && (
                <button
                  onClick={() => {
                    handleApplyEdit(message.content)
                    setAppliedMessageIndices(prev => new Set(prev).add(idx))
                  }}
                  className={`chat-apply-button ${appliedMessageIndices.has(idx) ? 'chat-apply-button-applied' : ''}`}
                >
                  <span className="chat-apply-icon">✓</span>
                  {appliedMessageIndices.has(idx) ? '適用済み' : '適用する'}
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="chat-loading">
              <div className="chat-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              思考中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="chat-input-area">
        {/* 選択された画像のプレビュー */}
        {selectedImages.length > 0 && (
          <div className="chat-image-preview-container">
            {selectedImages.map((dataUrl, index) => (
              <div key={index} className="chat-image-preview">
                <img src={dataUrl} alt={`Preview ${index + 1}`} />
                <button
                  type="button"
                  className="chat-image-remove"
                  onClick={() => handleRemoveImage(index)}
                  aria-label="画像を削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="chat-input-container">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder="例: 見出しを短くして / 箇条書きを追加..."
            className="chat-textarea"
            rows={1}
          />
          <div className="chat-input-buttons">
            {/* 画像アップロードボタン */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <div className="chat-selectors-group">
              {/* モードセレクター */}
              <div className="chat-mode-selector" ref={modeDropdownRef}>
                <button
                  className="chat-mode-button"
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                >
                  <span className="chat-mode-icon">{MODE_CONFIG[mode].icon}</span>
                  <span className="chat-mode-label">{MODE_CONFIG[mode].label}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {showModeDropdown && (
                  <div className="chat-mode-dropdown">
                    {(Object.entries(MODE_CONFIG) as [ChatMode, typeof MODE_CONFIG[ChatMode]][]).map(([key, config]) => (
                      <button
                        key={key}
                        className={`chat-mode-option ${mode === key ? 'active' : ''} ${!config.implemented ? 'unimplemented' : ''}`}
                        onClick={() => handleModeSelect(key)}
                        data-tooltip={config.description}
                      >
                        <span className="chat-mode-option-icon">{config.icon}</span>
                        <span className="chat-mode-option-label">{config.label}</span>
                        {!config.implemented && <span className="chat-mode-option-badge">開発中</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* モデルセレクター */}
              <div className="chat-model-selector" ref={modelDropdownRef}>
                <button
                  className="chat-model-button"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                >
                  <span className="chat-model-label">{MODEL_CONFIG[model].label}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {showModelDropdown && (
                  <div className="chat-model-dropdown">
                    {(Object.entries(MODEL_CONFIG) as [ClaudeModel, typeof MODEL_CONFIG[ClaudeModel]][]).map(([key, config]) => (
                      <button
                        key={key}
                        className={`chat-model-option ${model === key ? 'active' : ''}`}
                        onClick={() => handleModelSelect(key)}
                        title={config.description}
                      >
                        <span className="chat-model-option-check">
                          {model === key && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          )}
                        </span>
                        <span className="chat-model-option-label">{config.label}</span>
                        <span className="chat-model-option-desc">{config.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="chat-image-button"
              title="画像を追加"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <button
              onClick={handleSend}
              disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
              className="chat-send-button"
            >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

