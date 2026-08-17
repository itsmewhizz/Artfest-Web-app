import { useLayoutEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import { Download } from 'lucide-react'
import StudentAvatar from './StudentAvatar'

const themes = {
  classic: {
    container: 'bg-white p-8 rounded-2xl text-center',
    border: 'border-4 border-[#E8845C] rounded-2xl p-6',
    title: 'text-2xl font-bold text-[#0F2A3D] mb-1',
    subtitle: 'text-sm text-[#6E8A99] mb-6',
    rank: (i) => ['text-[#E8845C] font-bold', 'text-slate-400 font-bold', 'text-amber-700 font-bold'][i],
    name: 'text-[#0F2A3D] font-semibold text-sm',
    points: 'text-[#6E8A99] text-xs',
    bg: 'bg-yellow-50',
    dotBg: 'bg-slate-200',
  },
  vibrant: {
    container: 'bg-gradient-to-br from-[#2872A1] via-[#5C93AA] to-[#0F2A3D] p-8 rounded-2xl text-center',
    border: 'border-2 border-white/30 rounded-2xl p-6',
    title: 'text-2xl font-bold text-white mb-1 drop-shadow-lg',
    subtitle: 'text-sm text-emerald-100 mb-6',
    rank: () => 'text-white font-bold drop-shadow',
    name: 'text-white font-semibold text-sm drop-shadow',
    points: 'text-emerald-100 text-xs',
    bg: 'bg-white/10',
    dotBg: 'bg-white/20',
  },
  minimal: {
    container: 'bg-slate-900 p-8 rounded-2xl text-center',
    border: 'border border-slate-700 rounded-2xl p-6',
    title: 'text-2xl font-bold text-white mb-1',
    subtitle: 'text-sm text-slate-400 mb-6',
    rank: () => 'text-slate-300 font-bold',
    name: 'text-white font-semibold text-sm',
    points: 'text-slate-400 text-xs',
    bg: 'bg-slate-800',
    dotBg: 'bg-slate-700',
  },
}

const ranks = ['1st', '2nd', '3rd']

function calcGrade(points) {
  const p = Number(points)
  if (p === 10) return 'A+'
  if (p >= 8 && p <= 9) return 'A'
  if (p >= 6 && p <= 7) return 'B'
  if (p >= 4 && p <= 5) return 'C'
  return '-'
}

const themeNames = ['classic', 'vibrant', 'minimal']
const themeLabels = ['Classic', 'Vibrant', 'Minimal']

// Previews render the poster at this natural width, then scale it down by
// PREVIEW_SCALE. The preview box is sized to the scaled dimensions so the
// whole poster is always visible (no fixed height / overflow clipping).
const PREVIEW_WIDTH = 340
const PREVIEW_SCALE = 0.5

export default function ResultPoster({ programme, result, studentPhotos = {}, onClose }) {
  const captureRefs = useRef({})
  const sizeRefs = useRef({})
  const [downloading, setDownloading] = useState('')
  const [originalSizes, setOriginalSizes] = useState({})

  // Measure each poster's natural size (at PREVIEW_WIDTH) so the preview box
  // can be sized to the exact scaled dimensions — the full poster is shown.
  useLayoutEffect(() => {
    const next = {}
    themeNames.forEach(tName => {
      const el = sizeRefs.current[tName]
      if (el) next[tName] = { w: el.offsetWidth, h: el.offsetHeight }
    })
    setOriginalSizes(next)
  }, [programme, result])

  const getPhoto = (data) => studentPhotos[data?.studentId] || data?.photoURL

  const placements = [
    { label: '1st Place', data: result?.first },
    { label: '2nd Place', data: result?.second },
    { label: '3rd Place', data: result?.third },
  ]

  const handleDownload = async (tName) => {
    if (downloading) return
    setDownloading(tName)
    try {
      const el = captureRefs.current[tName]
      if (!el) return
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      canvas.toBlob((blob) => {
        if (blob) saveAs(blob, `${programme.name.replace(/\s+/g, '_')}_${tName}_poster.png`)
        setDownloading('')
      })
    } catch {
      setDownloading('')
    }
  }

  const renderPoster = (tName) => {
    const t = themes[tName]
    return (
      <div className={t.container}>
        <div className={t.border}>
          <div className={t.title}>{programme.name}</div>
          <div className={t.subtitle}>{result?.resultNo ? <span className="font-bold mr-1">#{result.resultNo}</span> : null}{programme.category}</div>

          <div className="space-y-3">
            {placements.map((p, i) => p.data ? (
              <div key={i} className={`flex items-center gap-3 ${t.bg} rounded-xl p-3`}>
                <StudentAvatar src={getPhoto(p.data)} name={p.data.name} className="w-12 h-12 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className={t.rank(i)}>{ranks[i]}</div>
                  <div className={t.name}>{p.data.name}</div>
                  <div className={t.points}>{p.data.points || 0} points • Grade: {p.data.grade || calcGrade(p.data.points)}</div>
                </div>
              </div>
            ) : null)}
          </div>

          <div className="mt-6 text-xs opacity-50">Campus Art Fest</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      {/* Offscreen full-size copies used only for html2canvas capture */}
      <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }} aria-hidden="true">
        {themeNames.map(tName => (
          <div key={tName} ref={el => { captureRefs.current[tName] = el }} style={{ width: 460, marginBottom: 12 }}>
            {renderPoster(tName)}
          </div>
        ))}
      </div>

      {/* Hidden measurer used to size the previews to the full scaled poster */}
      <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none', visibility: 'hidden' }} aria-hidden="true">
        {themeNames.map(tName => (
          <div key={`size-${tName}`} ref={el => { sizeRefs.current[tName] = el }} style={{ width: PREVIEW_WIDTH }}>
            {renderPoster(tName)}
          </div>
        ))}
      </div>

      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-white font-display font-bold text-xl">Download Poster</h3>
            <p className="text-white/60 text-sm mt-0.5">
              Pick a style — each card downloads its own design.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-2 bg-white/10 text-mainText text-sm font-semibold rounded-full hover:bg-white/20 transition shrink-0"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeNames.map((tName, i) => (
            <div key={tName} className="postergen-card p-3 flex flex-col">
              <div className="flex items-center gap-2 px-1 mb-2.5">
                <span className="w-6 h-6 rounded-full bg-card-dark text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="font-display font-bold text-sm text-mainText">{themeLabels[i]}</span>
              </div>

              <div
                className="preview-box rounded-xl overflow-hidden mb-3 mx-auto"
                style={{
                  width: Math.ceil(PREVIEW_WIDTH * PREVIEW_SCALE),
                  height: Math.ceil((originalSizes[tName]?.h || 340) * PREVIEW_SCALE),
                }}
              >
                <div
                  style={{
                    width: PREVIEW_WIDTH,
                    height: originalSizes[tName]?.h || 340,
                    transform: `scale(${PREVIEW_SCALE})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {renderPoster(tName)}
                </div>
              </div>

              <button
                onClick={() => handleDownload(tName)}
                disabled={Boolean(downloading)}
                className="btn-result w-full mt-auto"
              >
                <Download size={15} />
                {downloading === tName ? 'Downloading…' : 'Download Poster'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}