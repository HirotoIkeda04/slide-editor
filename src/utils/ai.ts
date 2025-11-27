import type { ChatMessage, ChatMode, ClaudeModel } from '../types'

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

if (!apiKey) {
  console.warn('VITE_ANTHROPIC_API_KEY is not set. AI features will not work.')
}

const getSystemPrompt = (mode: ChatMode, editorContent: string): string => {
  const baseContext = `This editor uses special Markdown syntax that you MUST understand and preserve:

1. LAYOUT TYPE SYNTAX:
   - Use \`# [表紙] Title\` for cover slides (centered, large text)
   - Use \`# [目次] Title\` for table of contents slides
   - Use \`# [中扉] Title\` for section break slides (centered)
   - Use \`# [まとめ] Title\` for summary slides
   - The layout type in brackets [レイアウトタイプ] must come immediately after the # and before the title
   - Heading level (#, ##, ###) doesn't matter for layout detection, but layout headings are always rendered as h1
   - When counting heading length, exclude the [レイアウトタイプ] part

2. KEY MESSAGE SYNTAX:
   - Lines starting with \`! \` (exclamation mark + space) are key messages
   - Only the first key message per slide is used
   - Key messages are displayed prominently at the top of the slide

3. SLIDE SPLITTING RULES:
   - Slides are split by heading levels, NOT by \`---\` delimiters
   - For Webinar/TeamMtg/RoomSemi/A4 formats: split by \`#\` (h1) headings
   - For InstaPost/InstaStory formats: split by \`##\` (h2) headings
   - Layout-type headings (with [レイアウトタイプ]) also act as slide delimiters
   - Content before the first heading becomes the first slide
   - Consecutive headings of the same level create separate slides

4. HEADING LENGTH LIMIT:
   - Headings must be 13 characters or less (excluding [レイアウトタイプ])
   - Half-width characters count as 0.5 characters
   - Full-width characters count as 1 character

5. H2 HORIZONTAL LAYOUT:
   - For formats that split by h1 (Webinar/TeamMtg/RoomSemi/A4):
   - If a single slide contains multiple h2 headings, they are displayed side-by-side in a grid layout
   - Keep this in mind when structuring content

6. GENERAL MARKDOWN:
   - Standard Markdown syntax applies: # for headings, - or * for lists, 1. for numbered lists
   - Code blocks with syntax highlighting are supported
   - The \`#\` symbol represents structure, not size - all structural elements should use h1

7. TABLE CREATION:
   - When creating tables, use Markdown table format: \`| Column1 | Column2 |\`
   - Include headers in the first row
   - Use separator row: \`| --- | --- |\`
   - Each data row should start and end with \`|\`
   - Tables will be automatically converted to table items

Current editor content:
\`\`\`
${editorContent}
\`\`\``

  switch (mode) {
    case 'agent':
      return `You are an AI assistant helping to edit slide content written in Markdown for a slide editor application.

${baseContext}

When editing:
- Preserve all special syntax (layout types, key messages)
- Maintain proper slide splitting based on heading levels
- Ensure headings comply with the 13-character limit
- Do not add \`---\` delimiters (slides split by headings automatically)
- Make direct edits to improve the content based on user requests

IMPORTANT: Return changes in diff format, NOT the full content. Only specify lines that need to be changed:
- Use \`-行番号: 削除する行の内容\` to indicate lines to delete
- Use \`+行番号: 追加する行の内容\` to indicate lines to add after the specified line number
- Use \`~行番号: 変更前の内容 → 変更後の内容\` to indicate lines to modify
- Line numbers are 1-based (first line is line 1)
- Only include lines that actually need to change
- If no changes are needed, return "変更なし" or "No changes needed"
- Preserve all unchanged lines exactly as they are

EXCEPTION for table creation:
- When the user requests to create a table, return ONLY the Markdown table format directly (not in diff format)
- Use the format: \`| Column1 | Column2 |\` with headers and data rows
- Include separator row: \`| --- | --- |\`
- Do NOT use diff format for table creation requests`

    case 'plan':
      return `You are an AI assistant creating editing plans for slide content written in Markdown.

${baseContext}

When creating a plan:
- Analyze the user's request and current content
- Create a step-by-step plan for editing
- Explain what changes will be made and why
- Do NOT make the actual edits yet
- Format your response as a numbered list of steps
- After listing the plan, provide the full edited Markdown content that implements the plan
- Preserve all special syntax (layout types, key messages)
- Ensure headings comply with the 13-character limit`

    case 'ask':
      return `You are an AI assistant answering questions about slide content written in Markdown.

${baseContext}

When answering questions:
- Provide clear, helpful answers about the content
- Explain the current structure and content
- Suggest improvements if asked
- Do NOT provide edited Markdown content
- Do NOT make any changes to the content
- Focus on explanation and guidance only`

    default:
      return `You are an AI assistant helping to edit slide content written in Markdown for a slide editor application.

${baseContext}`
  }
}

export const sendChatMessage = async (
  messages: ChatMessage[],
  editorContent: string,
  mode: ChatMode = 'agent',
  model: ClaudeModel = 'claude-3-haiku-20240307'
): Promise<string> => {
  if (!apiKey) {
    throw new Error('Anthropic API key is not configured')
  }

  // モードに応じたシステムプロンプトを生成
  const systemPrompt = getSystemPrompt(mode, editorContent)

  try {
    const apiUrl = 'https://api.anthropic.com/v1/messages'
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    }
    
    console.log('[AI] Using model:', model)
    console.log('[AI] Request body:', JSON.stringify({
      model: model,
      max_tokens: 4096,
      system: systemPrompt.substring(0, 100) + '...',
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' 
          ? m.content.substring(0, 50) + '...' 
          : `[${m.content.length} items: ${m.content.map(item => item.type).join(', ')}]`
      }))
    }, null, 2))
    
    // メッセージをAnthropic API形式に変換
    const apiMessages = messages.map(msg => {
      if (typeof msg.content === 'string') {
        // 文字列形式の場合はそのまま
        return {
          role: msg.role,
          content: msg.content
        }
      } else {
        // 配列形式（画像を含む）の場合
        return {
          role: msg.role,
          content: msg.content
        }
      }
    })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: apiMessages
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('API Error Response:', errorData)
      const errorMessage = errorData.error?.message || errorData.message || response.statusText
      const errorType = errorData.error?.type || errorData.type || 'unknown'
      throw new Error(`Anthropic API error (${response.status}, type: ${errorType}): ${errorMessage}`)
    }

    const data = await response.json()
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text.trim()
    }
    throw new Error('Unexpected response type from Anthropic API')
  } catch (error) {
    console.error('Error calling Anthropic API:', error)
    // CORSエラーの場合、より分かりやすいメッセージを返す
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('ネットワークエラーが発生しました。CORS設定を確認してください。詳細: ' + error.message)
    }
    throw error
  }
}

export const editWithAI = async (
  editorContent: string,
  userInstruction: string,
  mode: ChatMode = 'agent',
  model: ClaudeModel = 'claude-3-haiku-20240307'
): Promise<string> => {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: userInstruction
    }
  ]

  return await sendChatMessage(messages, editorContent, mode, model)
}

/**
 * AIの応答をdiff形式として解析し、元のコンテンツに適用する
 * @param originalContent 元のコンテンツ
 * @param aiResponse AIの応答（diff形式）
 * @returns 適用後のコンテンツ
 */
/**
 * AIの応答から表データを抽出する
 * @param response AIの応答テキスト
 * @returns 抽出された表データ、またはnull
 */
export const extractTableFromResponse = (response: string): { headers?: string[], data: string[][] } | null => {
  console.log('[extractTableFromResponse] Starting extraction, response length:', response.length)
  const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  console.log('[extractTableFromResponse] Total lines:', lines.length)
  
  // Markdown形式の表を検出（| で始まる行）
  const markdownTableLines: string[] = []
  let inTable = false
  
  for (const line of lines) {
    if (line.startsWith('|') && line.endsWith('|')) {
      markdownTableLines.push(line)
      inTable = true
    } else if (inTable && !line.startsWith('|')) {
      // 表の終了
      break
    }
  }
  
  console.log('[extractTableFromResponse] Markdown table lines found:', markdownTableLines.length)
  
  if (markdownTableLines.length >= 2) {
    // 最初の行がヘッダー、2行目が区切り線、3行目以降がデータ
    const headerLine = markdownTableLines[0]
    
    // 区切り線をスキップしてデータ行を取得
    const dataLines = markdownTableLines.slice(2)
    
    console.log('[extractTableFromResponse] Header line:', headerLine)
    console.log('[extractTableFromResponse] Data lines count:', dataLines.length)
    
    // ヘッダーを解析
    const headers = headerLine
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0)
    
    console.log('[extractTableFromResponse] Headers:', headers)
    
    // データ行を解析
    const data: string[][] = dataLines.map(line => {
      const cells = line.split('|').map(cell => cell.trim())
      // 最初と最後の空要素を除外（Markdown形式では行の最初と最後に|があるため）
      return cells.slice(1, -1)
    })
    
    console.log('[extractTableFromResponse] Data rows:', data.length, 'Data:', data)
    
    // ヘッダーがあれば、データ行が0でも表として作成可能にする
    if (headers.length > 0) {
      console.log('[extractTableFromResponse] Table extracted successfully, headers:', headers.length, 'data rows:', data.length)
      return { headers, data }
    }
  }
  
  // CSV形式の表を検出（カンマ区切り）
  const csvLines: string[] = []
  for (const line of lines) {
    if (line.includes(',') && line.split(',').length >= 2) {
      csvLines.push(line)
    } else if (csvLines.length > 0) {
      break
    }
  }
  
  if (csvLines.length >= 1) {
    // 最初の行をヘッダーとして扱う
    const headers = csvLines[0].split(',').map(cell => cell.trim())
    const data = csvLines.slice(1).map(line => {
      return line.split(',').map(cell => cell.trim())
    })
    
    if (headers.length > 0 && (data.length > 0 || csvLines.length === 1)) {
      // データがない場合はヘッダーのみ
      return { headers, data: data.length > 0 ? data : [] }
    }
  }
  
  return null
}

/**
 * AIを使用してテーブルに適切な名前を生成する
 * @param headers テーブルのヘッダー
 * @param data テーブルのデータ
 * @returns 生成された名前
 */
export const generateTableNameWithAI = async (
  headers: string[] | undefined,
  data: string[][]
): Promise<string> => {
  if (!apiKey) {
    throw new Error('API key is not set')
  }

  // テーブルの内容を文字列化
  let tableContent = ''
  if (headers && headers.length > 0) {
    tableContent += `ヘッダー: ${headers.join(', ')}\n`
  }
  if (data && data.length > 0) {
    tableContent += `データ（最初の5行）:\n`
    const sampleData = data.slice(0, 5)
    sampleData.forEach((row, idx) => {
      tableContent += `${idx + 1}. ${row.join(', ')}\n`
    })
    if (data.length > 5) {
      tableContent += `... 他${data.length - 5}行\n`
    }
  }

  const prompt = `以下のテーブルデータに対して、適切な日本語の名前を1つだけ生成してください。

${tableContent}

条件:
- 20文字以内
- スペースを含まない（アンダースコア「_」は使用可）
- テーブルの内容・目的を端的に表す名前
- 名前のみを返答してください（説明や装飾は不要）

名前:`

  // 名前生成には高速・低コストのHaikuモデルを使用
  const modelId = 'claude-3-5-haiku-20241022'

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 100,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generateTableNameWithAI] API error:', errorText)
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    let generatedName = result.content?.[0]?.text?.trim() || ''
    
    // 名前のクリーンアップ
    // スペースをアンダースコアに変換
    generatedName = generatedName.replace(/\s+/g, '_')
    // 20文字以内に切り詰め
    generatedName = generatedName.substring(0, 20)
    // 不要な記号を削除
    generatedName = generatedName.replace(/[「」『』【】\[\]()（）:：.。、,]/g, '')
    
    console.log('[generateTableNameWithAI] Generated name:', generatedName)
    
    if (!generatedName) {
      throw new Error('Empty name generated')
    }
    
    return generatedName
  } catch (error) {
    console.error('[generateTableNameWithAI] Error:', error)
    throw error
  }
}

export const applyDiffToContent = (originalContent: string, aiResponse: string): string => {
  // 変更なしの場合は元のコンテンツを返す
  if (aiResponse.includes('変更なし') || aiResponse.includes('No changes needed') || aiResponse.trim() === '') {
    return originalContent
  }

  console.log('[applyDiffToContent] ===== START =====')
  console.log('[applyDiffToContent] Original content lines:', originalContent.split('\n').length)
  console.log('[applyDiffToContent] AI response (full):', aiResponse)
  console.log('[applyDiffToContent] AI response (first 500 chars):', aiResponse.substring(0, 500))

  const lines = originalContent.split('\n')
  const changes: Array<{ type: 'delete' | 'add' | 'modify'; lineNumber: number; content?: string; newContent?: string }> = []

  // AIの応答を行ごとに処理し、diff形式の行のみを抽出
  const responseLines = aiResponse.split('\n')
  const diffLines: string[] = []
  
  for (const line of responseLines) {
    const trimmedLine = line.trim()
    // diff形式の行かどうかをチェック（-行番号:、+行番号:、~行番号:で始まる）
    // 行の先頭が-、+、~で始まり、その後に数字とコロンが続くパターン
    // コロンの後にスペースと内容が続く、または内容が直接続く
    // 例: +3: 内容 または +3:内容
    if (/^[-+~]\d+:\s*.+/.test(trimmedLine)) {
      diffLines.push(trimmedLine)
    }
  }

  console.log('[applyDiffToContent] Extracted diff lines:', diffLines.length, diffLines.slice(0, 5))

  // diff形式の行がない場合は元のコンテンツを返す
  if (diffLines.length === 0) {
    console.log('[applyDiffToContent] No diff format found, returning original content')
    // diff形式でない場合は、元のコンテンツを返す（行番号プレフィックスが含まれるのを防ぐ）
    return originalContent
  }

  const diffContent = diffLines.join('\n')
  console.log('[applyDiffToContent] Diff content preview:', diffContent.substring(0, 300))

  // diff形式を解析
  // 削除を解析
  let match
  const deleteRegex = /^-(\d+):\s*(.+)$/gm
  while ((match = deleteRegex.exec(diffContent)) !== null) {
    const lineNumber = parseInt(match[1], 10) - 1 // 0-based index
    changes.push({ type: 'delete', lineNumber })
  }

  // 追加を解析（複数行に対応）
  const addRegex = /^\+(\d+):\s*(.+)$/gm
  // 正規表現のlastIndexをリセット
  addRegex.lastIndex = 0
  while ((match = addRegex.exec(diffContent)) !== null) {
    const lineNumber = parseInt(match[1], 10) - 1 // 0-based index
    // 行番号プレフィックスを除いた内容のみを保存
    // match[2]が空でないことを確認
    const content = match[2] ? match[2].trim() : ''
    if (content) {
      console.log('[applyDiffToContent] Add change:', { lineNumber: lineNumber + 1, content: content.substring(0, 50) })
      changes.push({ type: 'add', lineNumber, content })
    } else {
      console.warn('[applyDiffToContent] Empty content for add at line:', lineNumber + 1)
    }
  }

  // 変更を解析
  const modifyRegex = /^~(\d+):\s*(.+?)\s*→\s*(.+)$/gm
  while ((match = modifyRegex.exec(diffContent)) !== null) {
    const lineNumber = parseInt(match[1], 10) - 1 // 0-based index
    changes.push({ type: 'modify', lineNumber, content: match[2], newContent: match[3] })
  }

  // 変更がない場合は元のコンテンツを返す
  if (changes.length === 0) {
    console.log('[applyDiffToContent] No changes found')
    return originalContent
  }

  console.log('[applyDiffToContent] Total changes:', changes.length)

  // 変更をタイプごとに分類
  const deletes = changes.filter(c => c.type === 'delete').sort((a, b) => b.lineNumber - a.lineNumber) // 降順
  const modifies = changes.filter(c => c.type === 'modify')
  const adds = changes.filter(c => c.type === 'add').sort((a, b) => a.lineNumber - b.lineNumber) // 昇順
  
  console.log('[applyDiffToContent] Changes breakdown:', { deletes: deletes.length, modifies: modifies.length, adds: adds.length })

  let result = [...lines]

  // 1. まず削除を処理（降順で後ろから削除することで行番号がずれない）
  for (const change of deletes) {
    if (change.lineNumber >= 0 && change.lineNumber < result.length) {
      console.log('[applyDiffToContent] Deleting line:', change.lineNumber + 1)
      result.splice(change.lineNumber, 1)
    }
  }

  // 2. 次に変更を処理（削除後の行番号で）
  for (const change of modifies) {
    if (change.lineNumber >= 0 && change.lineNumber < result.length) {
      // 変更前の内容が一致するか確認（オプション）
      if (!change.content || result[change.lineNumber].trim() === change.content.trim()) {
        console.log('[applyDiffToContent] Modifying line:', change.lineNumber + 1)
        result[change.lineNumber] = change.newContent || ''
      } else {
        // 一致しない場合は警告を出すが、変更を適用
        console.warn(`[applyDiffToContent] Line ${change.lineNumber + 1} content mismatch. Expected: "${change.content}", Got: "${result[change.lineNumber]}"`)
        result[change.lineNumber] = change.newContent || ''
      }
    }
  }

  // 3. 最後に追加を処理（昇順で前から追加することで行番号がずれない）
  // 同じ行番号に複数の追加がある場合は、連続して追加する
  console.log('[applyDiffToContent] Processing adds:', adds.length, adds.map(a => ({ line: a.lineNumber + 1, content: a.content?.substring(0, 30) })))
  console.log('[applyDiffToContent] Original lines length:', lines.length, 'Current result length:', result.length)
  
  // 削除された行のインデックスを記録（元のコンテンツ基準）
  const deletedLines = new Set(deletes.map(d => d.lineNumber))
  
  // 追加を処理（行番号順にソート済み）
  for (let i = 0; i < adds.length; i++) {
    const change = adds[i]
    
    // AIの行番号は元のコンテンツ（削除/変更前）を基準にしている
    // 行番号が-1以上で、元のコンテンツの長さを超えない範囲で許可
    // ただし、元のコンテンツの長さを超える場合も許可（末尾に追加）
    if (change.lineNumber >= -1) {
      // 元の行番号を基準に、削除された行を考慮して実際の挿入位置を計算
      let insertIndex = change.lineNumber + 1
      
      // この行番号より前（または同じ行番号）で削除された行の数をカウント
      let deletedBeforeCount = 0
      for (const deletedLineNum of deletedLines) {
        if (deletedLineNum <= change.lineNumber) {
          deletedBeforeCount++
        }
      }
      // 削除された行の数だけ、挿入位置を前にずらす
      insertIndex -= deletedBeforeCount
      
      // 同じ行番号に複数の追加がある場合、前の追加の後に続けて追加
      let sameLineAddCount = 0
      for (let j = 0; j < i; j++) {
        if (adds[j].lineNumber === change.lineNumber) {
          sameLineAddCount++
        }
      }
      insertIndex += sameLineAddCount
      
      // 挿入位置が範囲外の場合は調整
      if (insertIndex < 0) {
        insertIndex = 0
      }
      if (insertIndex > result.length) {
        insertIndex = result.length
      }
      
      // 行番号プレフィックスを除いた内容のみを追加
      if (change.content) {
        console.log('[applyDiffToContent] Adding at index:', insertIndex, 'original line:', change.lineNumber + 1, 'deleted before:', deletedBeforeCount, 'content:', change.content.substring(0, 50))
        result.splice(insertIndex, 0, change.content)
        console.log('[applyDiffToContent] Result length after add:', result.length)
      }
    } else {
      console.warn('[applyDiffToContent] Invalid line number for add:', change.lineNumber + 1)
    }
  }

  console.log('[applyDiffToContent] Result lines:', result.length)
  console.log('[applyDiffToContent] ===== END =====')
  return result.join('\n')
}
