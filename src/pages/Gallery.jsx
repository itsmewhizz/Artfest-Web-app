import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSpotlight, getActiveGalleryFooter } from '../supabase/queries'
import { Download, Images, ChevronLeft, X } from 'lucide-react'
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

function GalleryCardItem({ img, activeFooterUrl, onClick, onDownload }) {
  const [displayUrl, setDisplayUrl] = useState(img.imageURL)

  useEffect(() => {
    let isMounted = true
    if (activeFooterUrl) {
      getCompositedGalleryImage(img.imageURL, activeFooterUrl).then(url => {
        if (isMounted) setDisplayUrl(url)
      })
    } else {
      setDisplayUrl(img.imageURL)
    }
    return () => { isMounted = false }
  }, [img.imageURL, activeFooterUrl])

  return (
    <div className="group relative cursor-pointer" onClick={onClick}>
      <div className="relative overflow-hidden rounded-xl border border-secondary/30">
        <img
          src={displayUrl}
          alt={img.caption || ''}
          className="w-full h-36 sm:h-48 md:h-56 object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDownload(img.imageURL, `spotlight_${img.id}.jpg`)
          }}
          aria-label={`Download ${img.caption || 'image'}`}
          className="absolute bottom-2 right-2 z-20 bg-black/60 hover:bg-black/80 p-1.5 sm:p-2 rounded-lg transition shadow-md"
        >
          <Download size={14} className="md:w-[18px] md:h-[18px]" color="white" />
        </button>
      </div>
      {img.caption && (
        <p className="text-mutedText text-xs sm:text-sm mt-1.5 truncate">{img.caption}</p>
      )}
    </div>
  )
}

function LightboxImage({ photo, activeFooterUrl }) {
  const [displayUrl, setDisplayUrl] = useState(photo.imageURL)

  useEffect(() => {
    let isMounted = true
    if (activeFooterUrl) {
      getCompositedGalleryImage(photo.imageURL, activeFooterUrl).then(url => {
        if (isMounted) setDisplayUrl(url)
      })
    } else {
      setDisplayUrl(photo.imageURL)
    }
    return () => { isMounted = false }
  }, [photo.imageURL, activeFooterUrl])

  return (
    <img
      src={displayUrl}
      alt={photo.caption || 'Gallery Photo'}
      className="max-h-[80vh] max-w-full object-contain rounded-2xl"
    />
  )
}
export default function Gallery() {
  const [images, setImages] = useState([])
  const [activeFooter, setActiveFooter] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const toast = useToast()

  useEffect(() => {
    getSpotlight().then(setImages)
    getActiveGalleryFooter().then(setActiveFooter)
  }, [])

  const albums = useMemo(() => groupByAlbum(images), [images])

  const handleDownloadImage = async (url, name) => {
    try {
      await downloadCompositedImage(url, activeFooter?.image_url, name || 'spotlight.jpg')
    } catch {
      toast('Download failed, try again', 'error')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Transparent Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 sm:px-8 lg:px-16 py-4 lg:py-5 pointer-events-none">
        <div className="flex items-center gap-2 tracking-tight select-none focus:outline-none" />
        <Link
          to="/"
          className="flex items-center gap-1 px-4 py-2 rounded-full bg-card border border-subtle text-mainText text-xs sm:text-sm font-semibold hover:bg-lavender transition pointer-events-auto shadow-md"
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 stagger-grid">
                  {album.imgs.map(img => (
                    <GalleryCardItem
                      key={img.id}
                      img={img}
                      activeFooterUrl={activeFooter?.image_url}
                      onClick={() => setSelectedPhoto(img)}
                      onDownload={handleDownloadImage}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-accent transition"
            >
              <X size={26} />
            </button>

            {/* Photo Container */}
            <div className="relative overflow-hidden rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center bg-black max-h-[80vh]">
              <LightboxImage photo={selectedPhoto} activeFooterUrl={activeFooter?.image_url} />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownloadImage(selectedPhoto.imageURL, `spotlight_${selectedPhoto.id}.jpg`)
                }}
                className="absolute bottom-3 right-3 z-30 bg-black/70 hover:bg-black/90 p-2 rounded-xl text-white transition flex items-center gap-2 text-xs sm:text-sm font-semibold border border-white/20"
              >
                <Download size={16} /> Download Photo
              </button>
            </div>

            {selectedPhoto.caption && (
              <p className="text-white text-sm sm:text-base font-semibold mt-3 text-center">
                {selectedPhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
