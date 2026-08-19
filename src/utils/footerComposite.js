// Composites a transparent "footer frame" overlay onto a photo using the
// native canvas API. The output canvas matches the photo's natural aspect
// ratio (photo drawn 1:1 underneath, frame scaled over it), so neither the
// photo nor the frame is distorted.
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })

// Draws `img` to fill the canvas at its center, cover-style (crops the
// overhang). Used when either side needs to fill within a shaped opening.
const drawCover = (ctx, img, w, h) => {
  const ratio = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * ratio
  const dh = img.naturalHeight * ratio
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

// Composites `frameSrc` over `photoSrc`, preserving the photo's aspect ratio.
// Resolves with the composite as a JPEG blob (mime + quality configurable via
// opts). Throws if either image cannot be decoded.
export async function compositeWithFooter(photoSrc, frameSrc, opts = {}) {
  const { mime = 'image/jpeg', quality = 0.92, maxDim = 2400 } = opts
  const [photo, frame] = await Promise.all([loadImage(photoSrc), loadImage(frameSrc)])

  let { naturalWidth: w, naturalHeight: h } = photo
  if (Math.max(w, h) > maxDim) {
    const s = maxDim / Math.max(w, h)
    w = Math.round(w * s)
    h = Math.round(h * s)
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  ctx.drawImage(photo, 0, 0, w, h)
  drawCover(ctx, frame, w, h)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Composite export failed'))
    }, mime, quality)
  })
}