import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSpotlight, getActiveGalleryFooter } from '../supabase/queries'
import { Download, Images, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useToast } from '../components/Toast'
import { getCompositedGalleryImage, downloadCompositedImage } from '../utils/imageCompositor'

const FALLBACK_ALBUM = 'Spotlight'

const groupByAlbum = (images) => {
  const groups = {}
  for (const img of images) {
    const album = (img.album || '').trim() || FALLBACK_ALBUM
    if (!groups[album]) groups[album] = []
    groups[album].push(img)
  }
  return Object.entries(groups)
    .map(([name, imgs]) => ({
      name,
      imgs: imgs.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)),
      newest: Math.max(...imgs.map(i => new Date(i.uploadedAt || 0).getTime())),
    }))
    .sort((a, b) => b.newest - a.newest)
}

export default function Gallery() {
  const [images, setImages] = useState([])
  const [activeFooter, setActiveFooter] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [compositeSrcs, setCompositeSrcs] = useState({})
  const toast = useToast()

  useEffect(() => {
    getSpotlight().then(setImages)
    getActiveGalleryFooter().then(setActiveFooter)
  }, [])

  // Compositing is async — resolve each image's display src when the footer is ready
  useEffect(() => {
    if (!activeFooter?.image_url) return
    let cancelled = false
    const run = async () => {
      for (const img of images) {
        const key = img.id
        if (compositeSrcs[key]) continue
        try {
          const src = await getCompositedGalleryImage(img.imageURL, activeFooter.image_url)
          if (!cancelled) setCompositeSrcs(prev => ({ ...prev, [key]: src }))
        } catch { /* keep original imageURL on failure */ }
      }
    }
    run()
    return () => { cancelled = true }
  }, [images, activeFooter])

  const albums = useMemo(() => groupByAlbum(images), [images])
  const flatImages = useMemo(() => albums.flatMap(a => a.imgs), [albums])
  const footerSrc = activeFooter?.image_url || ''

  const displaySrc = (img) => {
    if (!footerSrc) return img.imageURL
    return compositeSrcs[img.id] || img.imageURL
  }

  const handleDownloadImage = async (img) => {
    try {
      await downloadCompositedImage(img.imageURL, footerSrc, `spotlight_${img.id}.jpg`)
    } catch {
      toast('Download failed, try again', 'error')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Transparent Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 lg:px-16 py-4 lg:py-5">
        <div className="flex items-center gap-2 tracking-tight select-none focus:outline-none" />
        <Link
          to="/"
          className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-mainText text-xs sm:text-sm font-semibold hover:bg-white/20 transition"
        >
          <ChevronLeft size={16} /> Home
        </Link>
      </nav>

      <div className="bg-mainBackground p-4 md:p-8 lg:p-12 max-w-7xl mx-auto relative z-20 pt-24 sm:pt-28">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
            <Images size={22} className="text-accent" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-mainText">Gallery</h1>
        </div>
        <p className="text-mutedText text-sm sm:text-base mb-10">
          A look back at every moment — grouped by the day and event.
        </p>

        {images.length === 0 ? (
          <p className="text-mutedText text-center py-16">No photos have been added yet. Check back soon.</p>
        ) : (
          <div className="space-y-12">
            {albums.map(album => (
              <section key={album.name}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-6 w-1.5 rounded-full bg-accent" />
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-mainText">{album.name}</h2>
                  <span className="text-mutedText text-xs font-semibold">({album.imgs.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                  {album.imgs.map(img => {
                    const idx = flatImages.indexOf(img)
                    return (
                      <div key={img.id} className="group relative">
                        <div
                          onClick={() => idx >= 0 && setLightbox(idx)}
                          className="relative overflow-hidden rounded-xl border border-secondary/30 cursor-pointer"
                        >
                          <img
                            src={displaySrc(img)}
                            alt={img.caption || ''}
                            className="w-full h-36 sm:h-48 md:h-56 object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadImage(img) }}
                            aria-label={`Download ${img.caption || 'image'}`}
                            className="absolute right-2 bottom-2 bg-black/60 hover:bg-black/80 p-1.5 sm:p-2 rounded-lg transition"
                          >
                            <Download size={14} className="md:w-[18px] md:h-[18px]" color="white" />
                          </button>
                        </div>
                        {img.caption && (
                          <p className="text-mutedText text-xs sm:text-sm mt-1.5 truncate">{img.caption}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / fullscreen view */}
      {lightbox != null && flatImages[lightbox] && (() => {
        const img = flatImages[lightbox]
        return (
          <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="text-white/60 text-xs font-semibold">{lightbox + 1} / {flatImages.length}</span>
              <button onClick={() => setLightbox(null)} aria-label="Close" className="text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
                <X size={20} />
              </button>
            </div>
            <button
              aria-label="Previous image"
              onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + flatImages.length) % flatImages.length) }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              aria-label="Next image"
              onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % flatImages.length) }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            >
              <ChevronRight size={24} />
            </button>
            <div className="relative inline-block max-w-[86vw]" onClick={e => e.stopPropagation()}>
              <img
                src={displaySrc(img)}
                alt={img.caption || ''}
                className="max-w-[86vw] max-h-[78vh] object-contain rounded-lg"
              />
            </div>
            {img.caption && (
              <p className="text-white/80 text-sm mt-3 max-w-[86vw] text-center">{img.caption}</p>
            )}
          </div>
        )
      })()}
    </div>
  )
}
