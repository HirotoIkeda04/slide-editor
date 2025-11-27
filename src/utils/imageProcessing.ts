// 画像処理ユーティリティ

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 画像をトリミングして新しいdata URLを生成
 * @param dataUrl 元の画像のdata URL
 * @param crop トリミング領域（ピクセル単位）
 * @returns トリミング後の画像のdata URL
 */
export const cropImage = async (dataUrl: string, crop: CropArea): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }
      
      // キャンバスのサイズをトリミング領域に設定
      canvas.width = crop.width
      canvas.height = crop.height
      
      // 画像をトリミング領域分だけキャンバスに描画
      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      )
      
      // キャンバスをdata URLに変換
      const croppedDataUrl = canvas.toDataURL('image/png')
      resolve(croppedDataUrl)
    }
    
    image.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    
    image.src = dataUrl
  })
}

/**
 * パーセント単位のトリミング領域をピクセル単位に変換
 * @param percentCrop パーセント単位のトリミング領域
 * @param imageWidth 画像の幅（ピクセル）
 * @param imageHeight 画像の高さ（ピクセル）
 * @returns ピクセル単位のトリミング領域
 */
export const percentCropToPixelCrop = (
  percentCrop: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
): CropArea => {
  return {
    x: (percentCrop.x / 100) * imageWidth,
    y: (percentCrop.y / 100) * imageHeight,
    width: (percentCrop.width / 100) * imageWidth,
    height: (percentCrop.height / 100) * imageHeight,
  }
}

