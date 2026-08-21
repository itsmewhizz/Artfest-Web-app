import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase/client'
import {
  getGalleryFooters, upsertGalleryFooter, deleteGalleryFooter, setActiveGalleryFooter,
} from '../../supabase/queries'
import {
  Frame, Plus, Pencil, Trash2, X, Check, Loader2, Upload, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { useToast } from '../../components/Toast'

const inputCls = 'w-full bg-black/20 text-mainText rounded-xl p-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base'
const FALLBACK_THUMB = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="100%" height="100%" fill="#1e293b"/><rect x="16" y="16" width="288" height="208" rx="10" fill="none" stroke="#64748b" stroke-width="10" stroke-dasharray="12 10"/></svg>',
)

export default function AdminGalleryFooters() {
  const [footers, setFooters] = useState([])
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [frameFile, setFrameFile] = useState(null)
  const [frameUrl, setFrameUrl] = useState('')
  const [frameStatus, setFrameStatus] = useState('idle') // idle | ready | loading | ok | error
  const [frameError, setFrameError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const toast = useToast()

  const load = () => getGalleryFooters().then(setFooters)
  useEffect(() => { load() }, [])

  const openEditor = (footer = null) => {
    setEditing(footer || {})
    setName(footer?.name || '')
    setFrameFile(null)
    setFrameUrl(footer?.image_url || '')
    setFrameStatus(footer?.image_url ? 'ok' : 'idle')
    setFrameError('')
  }

  const pickFrame = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('Choose an image file', 'error')
    setFrameFile(file)
    setFrameStatus('ready')
    setFrameError('')
    setFrameUrl('')
  }

  const handleSave = async () => {
    const trimmed = (name || '').trim()
    if (!trimmed) return toast('Give the footer a name', 'error')
    if (!frameFile && !frameUrl) return toast('Upload a frame image', 'error')

    let imageUrl = frameUrl
    setSaving(true)
    setFrameError('')
    try {
      if (frameFile) {
        setFrameStatus('loading')
        const path = `footers/${Date.now()}_${frameFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { data, error } = await supabase.storage.from('photos').upload(path, frameFile, { upsert: true })
        if (error) throw error
        if (!data?.path) throw new Error('Storage upload returned no file path')
        imageUrl = supabase.storage.from('photos').getPublicUrl(data.path).data.publicUrl
        setFrameUrl(imageUrl)
        setFrameStatus('ok')
      }

      const footer = {
        ...(editing?.id ? { id: editing.id } : {}),
        name: trimmed,
        image_url: imageUrl,
      }
      setSaving(true)
      const { error } = await upsertGalleryFooter(footer)
      if (error) throw error
      toast(editing?.id ? 'Footer updated' : 'Footer created')
      setEditing(null)
      load()
    } catch (err) {
      console.error('Footer save failed:', err)
      const message = err?.message || 'Unknown upload error'
      setFrameStatus('error')
      setFrameError(`Upload failed: ${message}`)
      toast('Failed to save: ' + message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (footer) => {
    if (!window.confirm(`Delete footer "${footer.name}"?`)) return
    deleteGalleryFooter(footer.id).then(({ error }) => {
      if (error) return toast('Failed to delete: ' + error.message, 'error')
      toast('Footer deleted')
      load()
    })
  }

  const handleActivate = (footer) => {
    const nextActive = !footer.is_active
    setActiveGalleryFooter(footer.id).then(({ error }) => {
      if (error) return toast('Failed to update: ' + error.message, 'error')
      toast(nextActive ? `"${footer.name}" is now the active footer` : 'No active footer')
      load()
    })
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-card rounded-xl p-3 shadow-sm border border-secondary/30">
            <Frame size={22} className="text-accent" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Footer Overlays</h2>
            <p className="text-mutedText text-sm">
              Transparent frames applied to newly uploaded gallery photos. The active footer is used automatically.
            </p>
          </div>
        </div>
        <button
          onClick={() => openEditor()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base bg-primary text-white hover:bg-primary/90 shrink-0"
        >
          <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> New Footer
        </button>
      </div>

      {footers.length === 0 ? (
        <p className="text-mutedText text-center text-sm py-10">No footers yet. Create one to add a branded frame to gallery photos.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {footers.map(footer => (
            <div key={footer.id} className="bg-card rounded-2xl p-3 shadow-sm border border-secondary/30 flex flex-col gap-3">
              <div className="relative overflow-hidden rounded-xl border border-secondary/30 aspect-[4/3] bg-black/20">
                <img
                  src={footer.image_url}
                  alt={footer.name}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.src = FALLBACK_THUMB }}
                />
                {footer.is_active && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-success/90 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
                    <Check size={11} strokeWidth={3} /> Active
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-mainText font-semibold text-sm truncate">{footer.name}</span>
                <span className="text-mutedText text-[10px] shrink-0">Auto-applied on upload</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleActivate(footer)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    footer.is_active
                      ? 'bg-card border-secondary/40 text-mainText'
                      : 'bg-primary text-white hover:bg-primary/90 border-transparent'
                  }`}
                >
                  {footer.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {footer.is_active ? 'Active' : 'Set Active'}
                </button>
                <div className="flex-1" />
                <button onClick={() => openEditor(footer)} className="p-2 rounded-lg text-mutedText hover:text-mainText hover:bg-white/10 transition" aria-label={`Edit ${footer.name}`}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(footer)} className="p-2 rounded-lg text-mutedText hover:text-red-400 hover:bg-white/10 transition" aria-label={`Delete ${footer.name}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-mainText font-bold text-lg">{editing.id ? 'Edit Footer' : 'New Footer'}</h3>
              <button onClick={() => setEditing(null)} className="text-mutedText hover:text-mainText transition" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <label className="block mb-3">
              <span className="text-mutedText text-xs font-semibold block mb-1.5">Footer name</span>
              <input className={inputCls} placeholder="e.g. Festival Frame 2026" value={name} onChange={e => setName(e.target.value)} />
            </label>

            <label className="block mb-4">
              <span className="text-mutedText text-xs font-semibold block mb-1.5">Frame image (transparent PNG recommended)</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center gap-2 flex-1 rounded-2xl border-2 border-dashed border-secondary/40 bg-black/10 hover:bg-black/15 transition cursor-pointer py-5 text-mutedText text-sm"
                >
                  {frameStatus === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {frameStatus === 'loading' ? 'Loading...' : frameUrl || frameFile ? <span className="text-success flex items-center gap-1.5 font-semibold"><Check size={16} strokeWidth={3} /> {frameFile?.name || 'Frame ready'}</span> : 'Upload frame'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFrame} />
                {(frameUrl || frameFile) && (
                  <button
                    onClick={() => { setFrameFile(null); setFrameUrl(''); setFrameStatus('idle') }}
                    className="text-mutedText hover:text-red-400 transition shrink-0 p-1"
                    aria-label="Remove frame"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {frameError && <p className="mt-2 text-red-400 text-xs font-semibold">{frameError}</p>}
              {frameUrl && (
                <div className="mt-3 rounded-xl border border-success/40 bg-success/5 p-2">
                  <p className="flex items-center gap-1.5 text-success text-xs font-semibold">
                    <Check size={14} strokeWidth={3} /> Frame image loaded and valid
                  </p>
                  <div className="mt-2 grid place-items-center bg-black/20 rounded-lg overflow-hidden max-h-40">
                    <img src={frameUrl} alt="Frame preview" className="max-w-full max-h-40 object-contain" />
                  </div>
                </div>
              )}
            </label>

            <button
              onClick={handleSave}
              disabled={saving || frameStatus === 'loading'}
              className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
              {saving ? 'Saving...' : editing.id ? 'Save Changes' : 'Create Footer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}