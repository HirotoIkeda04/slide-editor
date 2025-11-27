import type { Slide } from '../types'

export const addSlide = (setEditorContent: (updater: (prev: string) => string) => void) => {
  setEditorContent(prev => prev + '\n\n---\n\n# 新しいスライド\n\n内容を入力')
}

export const deleteSlide = (
  slides: Slide[],
  currentIndex: number,
  setEditorContent: (content: string) => void,
  setCurrentIndex: (index: number) => void
) => {
  if (slides.length <= 1) {
    alert('最後のスライドは削除できません')
    return
  }

  if (!confirm('現在のスライドを削除しますか？')) {
    return
  }

  const newSlides = slides.filter((_, index) => index !== currentIndex)
  setEditorContent(newSlides.map(slide => slide.content).join('\n\n---\n\n'))
  if (currentIndex >= newSlides.length) {
    setCurrentIndex(newSlides.length - 1)
  }
}

export const savePresentation = (editorContent: string) => {
  const blob = new Blob([editorContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'presentation.txt'
  a.click()
  URL.revokeObjectURL(url)
}

export const loadPresentation = (
  setEditorContent: (content: string) => void,
  setCurrentIndex: (index: number) => void
) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.txt'
  input.onchange = (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event: any) => {
      setEditorContent(event.target.result)
      setCurrentIndex(0)
    }
    reader.readAsText(file)
  }
  input.click()
}

