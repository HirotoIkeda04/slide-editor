// 見出しの文字数を計算（半角は0.5文字としてカウント）
export const calculateHeadingLength = (text: string): number => {
  let length = 0
  for (const char of text) {
    length += /[ -~]/.test(char) ? 0.5 : 1
  }
  return length
}

// Blob URLのキャッシュ（data URL → Blob URLのマッピング）
const blobUrlCache = new Map<string, string>()

// Convert base64 data URL to Blob URL (with caching)
export const dataUrlToBlobUrl = (dataUrl: string): string => {
  // キャッシュに存在する場合は再利用
  if (blobUrlCache.has(dataUrl)) {
    const cachedBlobUrl = blobUrlCache.get(dataUrl)!
    console.log('[dataUrlToBlobUrl] Using cached Blob URL:', cachedBlobUrl.substring(0, 50) + '...')
    return cachedBlobUrl
  }
  
  try {
    const [header, base64Data] = dataUrl.split(',')
    const mimeMatch = header.match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/png'
    
    const byteString = atob(base64Data)
    const arrayBuffer = new ArrayBuffer(byteString.length)
    const uint8Array = new Uint8Array(arrayBuffer)
    
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i)
    }
    
    const blob = new Blob([arrayBuffer], { type: mime })
    const blobUrl = URL.createObjectURL(blob)
    
    // キャッシュに保存
    blobUrlCache.set(dataUrl, blobUrl)
    console.log('[dataUrlToBlobUrl] Created new Blob URL and cached:', blobUrl.substring(0, 50) + '...')
    
    return blobUrl
  } catch (error) {
    console.error('[dataUrlToBlobUrl] Failed to convert data URL to Blob URL:', error)
    return dataUrl // Fallback to original data URL
  }
}

// キーメッセージ記法をHTMLタグに変換する関数
// 画像のMarkdown記法をHTMLに変換し、画像情報を抽出する関数
// base64 data URLをBlob URLに変換して、ReactMarkdownのパーサーの負荷を軽減
export const extractImagesFromContent = (content: string): { html: string, images: Array<{ alt: string, src: string, placeholder: string, blobUrl: string }> } => {
  const images: Array<{ alt: string, src: string, placeholder: string, blobUrl: string }> = []
  let imageIndex = 0

  // 画像のMarkdown記法（![alt](url)）を抽出し、プレースホルダーに置き換え
  const imageMarkdownPattern = /!\[([^\]]*)\]\(([^)]+)\)/g
  const html = content.replace(imageMarkdownPattern, (match, alt, url) => {
    // base64のdataUrlのみを許可（セキュリティ対策）
    if (!url.startsWith('data:image/')) {
      console.warn('[extractImagesFromContent] Invalid image URL (not a data URL):', url.substring(0, 50))
      return match // 無効なURLの場合はそのまま返す
    }

    // base64 data URLをBlob URLに変換
    const blobUrl = dataUrlToBlobUrl(url)
    console.log('[extractImagesFromContent] Converted data URL to Blob URL:', { dataUrlLength: url.length, blobUrl })

    const placeholder = `__IMAGE_PLACEHOLDER_${imageIndex}__`
    images.push({ alt: alt || '', src: url, placeholder, blobUrl })
    imageIndex++
    return placeholder
  })

  return { html, images }
}

export const convertKeyMessageToHTML = (content: string): string => {
  console.log('[convertKeyMessageToHTML] Input length:', content.length)
  console.log('[convertKeyMessageToHTML] Contains image markdown:', /!\[.*?\]\(/.test(content))
  console.log('[convertKeyMessageToHTML] Contains img tag:', /<img\s+src=/.test(content))
  
  const lines = content.split('\n')
  let foundKeyMessage = false
  const convertedLines = lines.map((line, index) => {
    // HTMLのimgタグを含む行は保護する（そのまま返す）
    if (/<img\s+src=/.test(line)) {
      console.log('[convertKeyMessageToHTML] Found img tag at line', index, 'length:', line.length)
      return line // HTMLのimgタグはそのまま返す
    }
    
    // 画像のMarkdown記法（![alt](url)）を含む行は保護する
    // react-markdownに処理させるため、そのまま返す
    if (/!\[.*?\]\(/.test(line)) {
      console.log('[convertKeyMessageToHTML] Found image markdown at line', index, 'length:', line.length)
      return line // 画像のMarkdown記法はそのまま返す
    }
    
    // レイアウトタイプ記法を除去し、構造を表現するためh1に統一
    const layoutRemoved = line.replace(/^(#+\s+)\[([^\]]+)\]\s*(.*)$/, (_match, _heading, _layoutType, title) => {
      // レイアウトタイプが指定されている場合は、見出しレベルに関係なくh1として扱う
      return `# ${title}`
    })
    
    // 画像のMarkdown記法（![alt](url)）を除外してキーメッセージをチェック
    const trimmed = layoutRemoved.trim()
    if (!foundKeyMessage && trimmed.startsWith('! ') && !trimmed.startsWith('![')) {
      foundKeyMessage = true
      const keyMessageText = trimmed.substring(2) // '! 'を除去
      // HTMLタグに変換し、その後に空行を追加（Markdownパーサーがリストを正しく認識するため）
      return `<div class="key-message">${keyMessageText}</div>\n\n`
    }
    return layoutRemoved
  })
  const result = convertedLines.join('\n')
  console.log('[convertKeyMessageToHTML] Output length:', result.length)
  return result
}

// スライドのタイトルを抽出する関数
export const extractSlideTitle = (content: string): string => {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    // h1を優先
    if (trimmed.startsWith('# ')) {
      const title = trimmed.substring(2).trim()
      // [レイアウトタイプ] を除去してタイトルを取得
      return title.replace(/^\[[^\]]+\]\s*/, '')
    }
    // h2を次に優先
    if (trimmed.startsWith('## ')) {
      const title = trimmed.substring(3).trim()
      return title.replace(/^\[[^\]]+\]\s*/, '')
    }
    // h3も考慮
    if (trimmed.startsWith('### ')) {
      const title = trimmed.substring(4).trim()
      return title.replace(/^\[[^\]]+\]\s*/, '')
    }
  }
  // タイトルが見つからない場合は「新しいスライド」
  return '新しいスライド'
}

// スライドのレイアウトタイプを抽出する関数
export const extractSlideLayout = (content: string): 'cover' | 'toc' | 'section' | 'summary' | 'normal' => {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    // 見出し行をチェック
    const headingMatch = trimmed.match(/^#+\s+\[([^\]]+)\]/)
    if (headingMatch) {
      const layoutType = headingMatch[1]
      switch (layoutType) {
        case '表紙':
          return 'cover'
        case '目次':
          return 'toc'
        case '中扉':
          return 'section'
        case 'まとめ':
          return 'summary'
        default:
          return 'normal'
      }
    }
  }
  return 'normal'
}

// 見出しレベルに基づいてスライドを分割する関数
export const splitSlidesByHeading = (content: string, headingLevel: number): string[] => {
  const lines = content.split('\n')
  const slides: string[] = []
  let currentSlide: string[] = []
  let firstHeadingFound = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // 見出し行をチェック
    const headingMatch = trimmed.match(/^(#+)\s+/)
    if (headingMatch) {
      const headingLevelInLine = headingMatch[1].length
      
      // 指定レベル以上の見出しで区切る（例：レベル1を指定した場合、#のみで区切る）
      if (headingLevelInLine <= headingLevel) {
        // 最初の見出しが見つかった場合、それまでのコンテンツを最初のスライドとして追加
        if (!firstHeadingFound) {
          if (currentSlide.length > 0) {
            slides.push(currentSlide.join('\n'))
            currentSlide = []
          }
          firstHeadingFound = true
        } else {
          // 現在のスライドを保存して新しいスライドを開始
          if (currentSlide.length > 0) {
            slides.push(currentSlide.join('\n'))
          }
          currentSlide = []
        }
      }
    }
    
    // 現在の行をスライドに追加
    currentSlide.push(line)
  }
  
  // 最後のスライドを追加
  if (currentSlide.length > 0) {
    slides.push(currentSlide.join('\n'))
  }
  
  // 空のスライドを除外（ただし、最初の見出しまでのコンテンツが空の場合は含める）
  return slides.filter(slide => slide.trim().length > 0 || !firstHeadingFound)
}

// スライドコンテンツをh2で分割する関数（横並び表示用）
// h1とその後のコンテンツは最初のセクションとして返し、h2セクションのみを横並びにする
export const splitContentByH2 = (content: string): { h1Section: string; h2Sections: string[] } => {
  const lines = content.split('\n')
  const h2Sections: string[] = []
  let h1Section: string[] = []
  let currentH2Section: string[] = []
  let h2Count = 0
  let h1Found = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // h1を見つけたら、h1セクションに追加
    if (trimmed.match(/^#\s+/)) {
      if (!h1Found) {
        h1Found = true
        h1Section.push(line)
      } else {
        // 2つ目のh1が見つかった場合は、現在のh2セクションを保存して終了
        if (currentH2Section.length > 0) {
          h2Sections.push(currentH2Section.join('\n'))
        }
        break
      }
    } else if (trimmed.match(/^##\s+/)) {
      // h2を見つけたら、現在のh2セクションを保存して新しいh2セクションを開始
      h2Count++
      if (currentH2Section.length > 0) {
        h2Sections.push(currentH2Section.join('\n'))
      }
      currentH2Section = [line]
    } else {
      // h1が見つかる前のコンテンツはh1セクションに、h2が見つかった後はh2セクションに追加
      if (!h1Found) {
        h1Section.push(line)
      } else if (h2Count > 0) {
        currentH2Section.push(line)
      } else {
        h1Section.push(line)
      }
    }
  }
  
  // 最後のh2セクションを追加
  if (currentH2Section.length > 0) {
    h2Sections.push(currentH2Section.join('\n'))
  }
  
  return {
    h1Section: h1Section.join('\n'),
    h2Sections: h2Count >= 2 ? h2Sections : []
  }
}

// スライド内に複数のh2があるかチェックする関数
export const hasMultipleH2 = (content: string): boolean => {
  const lines = content.split('\n')
  let h2Count = 0
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.match(/^##\s+/)) {
      h2Count++
      if (h2Count >= 2) {
        return true
      }
    }
  }
  
  return false
}

// アイテム挿入記法を展開する関数
// @アイテム名 形式でアイテムを参照
export const expandItemReferences = (
  content: string,
  itemResolverFn: (name: string) => string | null
): string => {
  // @アイテム名 パターンをマッチ
  const itemReferencePattern = /@([^\s@]+)/g
  
  const result = content.replace(itemReferencePattern, (match, itemName) => {
    const itemMarkdown = itemResolverFn(itemName)
    if (itemMarkdown === null) {
      // アイテムが見つからない場合はエラーメッセージを表示
      return `<span class="item-not-found">⚠️ Item not found: ${itemName}</span>`
    }
    console.log('[expandItemReferences] Expanded item:', itemName, 'markdown length:', itemMarkdown.length)
    return itemMarkdown
  })
  
  console.log('[expandItemReferences] Result length:', result.length)
  return result
}

// アイテム参照があるかチェックする関数
export const hasItemReferences = (content: string): boolean => {
  return /@([^\s@]+)/.test(content)
}

