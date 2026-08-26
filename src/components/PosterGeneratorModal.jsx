import { useEffect, useState, useRef } from 'react'
import { getPosterTemplates } from '../supabase/queries'
import { X, Download, LayoutTemplate, Sparkles } from 'lucide-react'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import { useToast } from './Toast'

export default function PosterGeneratorModal({ result, onClose }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  const posterRefs = useRef({})
  const toast = useToast()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getPosterTemplates()
      setTemplates(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const extractResultData = () => {
    let first = { name: '', team: '' }
    let second = { name: '', team: '' }
    let third = { name: '', team: '' }

    if (Array.isArray(result?.entries) && result.entries.length > 0) {
      if (result.entries[0]) first = { name: result.entries[0].name || '', team: result.entries[0].teamName || result.entries[0].team || '' }
      if (result.entries[1]) second = { name: result.entries[1].name || '', team: result.entries[1].teamName || result.entries[1].team || '' }
      if (result.entries[2]) third = { name: result.entries[2].name || '', team: result.entries[2].teamName || result.entries[2].team || '' }
    } else {
      if (result?.first) first = { name: result.first.name || '', team: result.first.teamName || result.first.team || '' }
      if (result?.second) second = { name: result.second.name || '', team: result.second.teamName || result.second.team || '' }
      if (result?.third) third = { name: result.third.name || '', team: result.third.teamName || result.third.team || '' }
    }

    return {
      category: result?.category || 'General',
      programme_name: result?.name || result?.programmeName || 'Programme Result',
      result_no: result?.resultNo ? String(result.resultNo) : '001',
      first_place_label: '1ST',
      first_name: first.name,
      first_team: first.team,
      second_place_label: '2ND',
      second_name: second.name,
      second_team: second.team,
      third_place_label: '3RD',
      third_name: third.name,
      third_team: third.team,
      festival_footer: "RENDEZVOUS '26 ART FESTIVAL",
      custom_text: 'Official Result Announcement',
    }
  }

  const resultData = extractResultData()

  const handleDownload = async (tmpl) => {
    const el = posterRefs.current[tmpl.id]
    if (!el) return
    setDownloadingId(tmpl.id)
    toast('Generating high-resolution poster image...')

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const cleanName = (resultData.programme_name || 'poster').replace(/[^a-z0-9]/gi, '_').toLowerCase()
          saveAs(blob, `${cleanName}_${tmpl.name.replace(/[^a-z0-9]/gi, '_')}.png`)
          toast('Poster downloaded successfully!')
        } else {
          toast('Failed to generate image blob', 'error')
        }
        setDownloadingId(null)
      }, 'image/png')
    } catch (err) {
      console.error('Poster generation error:', err)
      toast('Failed to render poster', 'error')
      setDownloadingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card w-full max-w-4xl rounded-2xl border border-secondary/30 shadow-2xl p-6 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary/20 pb-4">
          <div>
            <h3 className="text-xl font-bold text-mainText flex items-center gap-2">
              <LayoutTemplate className="text-accent" size={22} /> Result Posters: {resultData.programme_name}
            </h3>
            <p className="text-xs text-mutedText mt-0.5">
              Generated automatically using saved poster templates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-mainText transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="py-12 text-center text-mutedText">Loading poster templates...</div>
        ) : templates.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Sparkles className="mx-auto text-accent" size={32} />
            <p className="text-mainText font-semibold">No saved templates found.</p>
            <p className="text-xs text-mutedText">Create a template in Admin → Frames → Templates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-2">
            {templates.map(tmpl => {
              const canvasW = tmpl.width || 1080
              const canvasH = tmpl.height || 1350
              const previewScale = 0.34

              const bgStyle =
                tmpl.background_type === 'image'
                  ? { backgroundImage: `url(${tmpl.background_value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : tmpl.background_type === 'solid'
                  ? { backgroundColor: tmpl.background_value }
                  : { background: tmpl.background_value }

              return (
                <div
                  key={tmpl.id}
                  className="bg-mainBackground rounded-2xl border border-secondary/30 p-4 space-y-4 flex flex-col items-center shadow-sm"
                >
                  <div className="w-full flex items-center justify-between text-xs font-semibold text-mainText">
                    <span>{tmpl.name}</span>
                    <span className="text-[10px] text-mutedText font-mono">{canvasW}×{canvasH}px</span>
                  </div>

                  {/* Rendered Canvas Preview */}
                  <div className="w-full flex items-center justify-center py-2 overflow-hidden">
                    <div
                      ref={el => (posterRefs.current[tmpl.id] = el)}
                      className="relative shadow-2xl rounded-lg overflow-hidden shrink-0 select-none border border-white/10"
                      style={{
                        width: `${canvasW * previewScale}px`,
                        height: `${canvasH * previewScale}px`,
                        ...bgStyle,
                      }}
                    >
                      {tmpl.layers?.map(layer => {
                        const scaledX = (layer.x || 0) * previewScale
                        const scaledY = (layer.y || 0) * previewScale
                        const scaledW = (layer.width || 300) * previewScale
                        const scaledFontSize = (layer.font_size || 24) * previewScale

                        const val = resultData[layer.key] || (layer.key === 'custom_text' ? resultData.custom_text : '')
                        const text = `${layer.prefix || ''}${val}`

                        return (
                          <div
                            key={layer.id}
                            className="absolute"
                            style={{
                              left: `${scaledX}px`,
                              top: `${scaledY}px`,
                              width: `${scaledW}px`,
                              textAlign: layer.text_align || 'center',
                            }}
                          >
                            {layer.type === 'image' ? (
                              <img
                                src={layer.image_url || 'https://placehold.co/200x200/115F32/FFFFFF/png?text=Logo'}
                                alt="Layer"
                                className="object-contain"
                                style={{
                                  width: `${(layer.width || 200) * previewScale}px`,
                                  height: `${(layer.height || 200) * previewScale}px`,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  fontFamily: layer.font_family || 'Sora',
                                  fontSize: `${scaledFontSize}px`,
                                  fontWeight: layer.font_weight || '700',
                                  color: layer.color || '#FFFFFF',
                                  lineHeight: layer.line_height || 1.2,
                                  textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                                }}
                              >
                                {text}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDownload(tmpl)}
                    disabled={downloadingId === tmpl.id}
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold text-xs py-2.5 px-4 rounded-xl hover:opacity-90 transition shadow-sm disabled:opacity-50"
                  >
                    <Download size={15} /> {downloadingId === tmpl.id ? 'Generating PNG...' : 'Download Poster'}
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
