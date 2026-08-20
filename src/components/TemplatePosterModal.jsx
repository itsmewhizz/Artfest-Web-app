import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import { Download, Layers } from 'lucide-react'
import PosterStage from './PosterStage'
import { buildPosterSource, canvasFor } from '../utils/posterTemplates'
import { useToast } from './Toast'

// Renders one auto-generated poster per saved template for a finished result.
// Templates are pure design/layout definitions — the real result data is
// injected here (buildPosterSource) into the mapped layer positions.
export default function TemplatePosterModal({
  programme,
  result,
  templates = [],
  studentMap = {},
  teamNameToId = {},
  onClose,
}) {
  const captureRefs = useRef({})
  const [downloading, setDownloading] = useState('')
  const toast = useToast()

  const source = buildPosterSource({ type: 'result', programme, result, studentMap, teamNameToId })

  const handleDownload = async (t) => {
    const el = captureRefs.current[t.id]
    if (!el || downloading) return
    setDownloading(t.id)
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null })
      canvas.toBlob((blob) => {
        if (blob) {
          const base = (t.name || 'poster').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'poster'
          saveAs(blob, `${(programme.name || 'result').replace(/\s+/g, '_')}_${base}.png`)
          toast('Poster downloaded')
        }
        setDownloading('')
      })
    } catch {
      toast('Download failed. Please try again.', 'error')
      setDownloading('')
    }
  }

  const title = result?.resultNo ? `#${result.resultNo} · ${programme?.name}` : programme?.name

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-white font-display font-bold text-xl flex items-center gap-2">
              <Layers size={18} className="text-accent" /> Generated Posters
            </h3>
            <p className="text-white/60 text-sm mt-0.5">
              {title} — one poster per saved template, auto-filled with this programme's result.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-2 bg-white/10 text-mainText text-sm font-semibold rounded-full hover:bg-white/20 transition shrink-0"
          >
            Close
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="text-white/70 text-center py-10">No poster templates exist yet — an admin needs to design one first.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t, i) => {
              const { width: W, height: H } = canvasFor(t)
              const scale = Math.min(0.34, 300 / Math.max(W, H))
              return (
                <div key={t.id} className="postergen-card p-3 flex flex-col">
                  <div className="flex items-center gap-2 px-1 mb-2.5">
                    <span className="w-6 h-6 rounded-full bg-card-dark text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-display font-bold text-sm text-mainText truncate">{t.name}</span>
                  </div>
                  <div className="rounded-xl overflow-hidden mb-3 mx-auto flex justify-center bg-black/30">
                    <PosterStage
                      template={t}
                      source={source}
                      scale={scale}
                      captureRef={el => { captureRefs.current[t.id] = el }}
                    />
                  </div>
                  <button
                    onClick={() => handleDownload(t)}
                    disabled={Boolean(downloading)}
                    className="btn-result w-full mt-auto"
                  >
                    <Download size={15} />
                    {downloading === t.id ? 'Downloading…' : 'Download Poster'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}