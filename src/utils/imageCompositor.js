// Canvas-based image compositor: bakes the gallery footer strip directly
// into the downloaded photo so it appears in the actual file (not just a
// CSS overlay). Results are cached per unique (base, footer) pair.

const FOOTER_BOTTOM_OFFSET_PCT = 0.035

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })

// Simple cache keyed by base URL + footer URL
const cache = new Map()
const cacheKey = (base, footer) => `${base}|||${footer}`

export async function getCompositedGalleryImage(baseImageUrl, footerImageUrl) {
  if (!footerImageUrl) return baseImageUrl

  const key = cacheKey(baseImageUrl, footerImageUrl)
  if (cache.has(key)) return cache.get(key)

  const [photo, footer] = await Promise.all([loadImage(baseImageUrl), loadImage(footerImageUrl)])

  const w = photo.naturalWidth
  const h = photo.naturalHeight

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  ctx.drawImage(photo, 0, 0, w, h)

  // Footer: scaled proportionally to canvas width, positioned as a horizontal
  // strip sitting slightly above the bottom edge (matching the old CSS offset).
  const footerH = Math.round(h * 0.25)
  const footerW = w
  const footerX = 0
  const footerY = Math.round(h - footerH - h * FOOTER_BOTTOM_OFFSET_PCT)

  ctx.drawImage(footer, footerX, footerY, footerW, footerH)

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  cache.set(key, dataUrl)
  return dataUrl
}

export async function downloadCompositedImage(baseImageUrl, footerImageUrl, filename) {
  if (!footerImageUrl) {
    // No footer — download original directly
    try {
      const res = await fetch(baseImageUrl)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename || 'photo.jpg'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { /* silent */ }
    return
  }

  const key = cacheKey(baseImageUrl, footerImageUrl)
  if (cache.has(key)) {
    const dataUrl = cache.get(key)
    triggerDownload(dataUrl, filename)
    return
  }

  const [photo, footer] = await Promise.all([loadImage(baseImageUrl), loadImage(footerImageUrl)])

  const w = photo.naturalWidth
  const h = photo.naturalHeight

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  ctx.drawImage(photo, 0, 0, w, h)

  const footerH = Math.round(h * 0.25)
  const footerW = w
  const footerX = 0
  const footerY = Math.round(h - footerH - h * FOOTER_BOTTOM_OFFSET_PCT)

  ctx.drawImage(footer, footerX, footerY, footerW, footerH)

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  cache.set(key, dataUrl)
  triggerDownload(dataUrl, filename)
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename || 'photo.jpg'
  a.click()
}
