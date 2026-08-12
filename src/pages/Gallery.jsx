import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSpotlight } from '../supabase/queries'
import { Download, Images, ChevronLeft } from 'lucide-react'
import { useToast } from '../components/Toast'

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
  const toast = useToast()

  useEffect(() => {
    getSpotlight().then(setImages)
  }, [])

  const albums = useMemo(() => groupByAlbum(images), [images])

  const handleDownloadImage = async (url, name) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name || 'spotlight.jpg'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      toast('Download failed, try again', 'error')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Transparent Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 lg:px-16 py-4 lg:py-5">
        <Link
          to="/"
          className="group flex flex-col items-start leading-none select-none text-mainText focus:outline-none"
        >
          <span className="font-display font-black text-[1.05rem] sm:text-[1.25rem] md:text-[1.45rem] tracking-[0.16em] text-mainText/95 uppercase">
            ISRA
          </span>
          <span className="font-display text-[0.48rem] sm:text-[0.56rem] md:text-[0.62rem] tracking-[0.34em] text-mainText/85 uppercase">
            Festival
          </span>
        </Link>
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
                  {album.imgs.map(img => (
                    <div key={img.id} className="group relative">
                      <div className="relative overflow-hidden rounded-xl border border-secondary/30">
                        <img
                          src={img.imageURL}
                          alt={img.caption || ''}
                          className="w-full h-36 sm:h-48 md:h-56 object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <button
                          onClick={() => handleDownloadImage(img.imageURL, `spotlight_${img.id}.jpg`)}
                          aria-label={`Download ${img.caption || 'image'}`}
                          className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 p-1.5 sm:p-2 rounded-lg transition"
                        >
                          <Download size={14} className="md:w-[18px] md:h-[18px]" color="white" />
                        </button>
                      </div>
                      {img.caption && (
                        <p className="text-mutedText text-xs sm:text-sm mt-1.5 truncate">{img.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
