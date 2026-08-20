import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'
import { getSpotlight, getActiveGalleryFooter } from '../../supabase/queries'
import { Upload, ToggleLeft, ToggleRight, X, Pencil, Trash2, Loader2, ImagePlus, Frame } from 'lucide-react'
import KebabMenu from '../../components/KebabMenu'
import { useToast } from '../../components/Toast'

const NEW_ALBUM = '__new__'
const MAX_BATCH = 10

const resolveAlbum = (value, newValue) => (value === NEW_ALBUM ? newValue.trim() : (value || '').trim())

function AlbumPicker({ albums, value, newValue, onValue, onNewValue, label }) {
  const isNew = value === NEW_ALBUM
  return (
    <>
      {label && <label className="text-mutedText text-sm block mb-1.5 font-semibold">{label}</label>}
      <select
        className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
        value={isNew ? NEW_ALBUM : value || ''}
        onChange={e => onValue(e.target.value)}
      >
        <option value="">No album</option>
        {albums.map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
        <option value={NEW_ALBUM}>+ Create new album...</option>
      </select>
      {isNew && (
        <input
          className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
          placeholder="New album name (e.g. Day 1)"
          value={newValue}
          onChange={e => onNewValue(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
        />
      )}
    </>
  )
}

export default function AdminSpotlight() {
  const [images, setImages] = useState([])
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [caption, setCaption] = useState('')
  const [album, setAlbum] = useState('')
  const [newAlbum, setNewAlbum] = useState('')
  const [editing, setEditing] = useState(null)
  const [editCaption, setEditCaption] = useState('')
  const [editAlbum, setEditAlbum] = useState('')
  const [editNewAlbum, setEditNewAlbum] = useState('')
  const [activeFooter, setActiveFooter] = useState(null)
  const toast = useToast()

  const load = () => Promise.all([getSpotlight(), getActiveGalleryFooter()]).then(([imgs, footer]) => {
    setImages(imgs)
    setActiveFooter(footer)
  })
  useEffect(() => { load() }, [])

  const albums = [...new Set(images.map(i => (i.album || '').trim()).filter(Boolean))]

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...picked].slice(0, MAX_BATCH))
    e.target.value = ''
  }

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (files.length === 0) return toast('Select at least one image', 'error')
    setUploading(true)
    setProgress(0)
    let uploaded = 0
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      try {
        const { data } = await supabase.storage.from('photos').upload(`spotlight/${Date.now()}_${i}_${file.name}`, file)
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(data.path)
        await supabase.from('spotlight').insert({
          imageURL: urlData.publicUrl,
          caption,
          isFeatured: false,
          album: resolveAlbum(album, newAlbum) || null,
        })
        uploaded += 1
      } catch (err) {
        console.error('Image upload failed:', err)
      }
      setProgress(Math.round(((i + 1) / files.length) * 100))
    }
    setUploading(false)
    setFiles([]); setCaption(''); setAlbum(''); setNewAlbum('')
    if (uploaded > 0) toast(`Uploaded ${uploaded} image${uploaded === 1 ? '' : 's'}!`)
    if (uploaded < files.length) toast(`${files.length - uploaded} image${files.length - uploaded === 1 ? '' : 's'} failed to upload`, 'error')
    load()
  }

  const handleDelete = async (id) => {
    await supabase.from('spotlight').delete().eq('id', id)
    load()
  }

  const toggleFeatured = async (img) => {
    const originalStatus = img.isFeatured
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, isFeatured: !originalStatus } : i))

    try {
      const { data: updated, error } = await supabase.from('spotlight').update({ isFeatured: !originalStatus }).eq('id', img.id).select('id')
      if (error) throw error
      if (!updated || updated.length === 0) throw new Error('the database rejected the update (permission denied)')
    } catch (err) {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, isFeatured: originalStatus } : i))
      toast('Failed to update featured status: ' + err.message, 'error')
    }
  }

  const startEdit = (img) => {
    setEditing(img)
    setEditCaption(img.caption || '')
    setEditAlbum(img.album || '')
    setEditNewAlbum('')
  }

  const saveEdit = async () => {
    if (!editing) return
    const { error } = await supabase
      .from('spotlight')
      .update({
        caption: editCaption.replace(/\b\w/g, c => c.toUpperCase()),
        album: resolveAlbum(editAlbum, editNewAlbum) || null,
      })
      .eq('id', editing.id)
    if (error) return toast('Failed to update: ' + error.message, 'error')
    toast('Image updated!')
    setEditing(null)
    load()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText mb-2">Spotlight Manager</h2>
      <p className="text-mutedText text-sm mb-6">
        Upload photos and group them into albums. Photos marked <span className="text-accent font-semibold">Hero banner</span> appear in the home hero carousel.
      </p>

      <div className="bg-card rounded-2xl p-4 mb-6 shadow-sm border border-secondary/30">
        {activeFooter && (
          <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/30 px-3 py-2 mb-3 text-xs sm:text-sm">
            <Frame size={14} className="text-success shrink-0" />
            <span className="text-mainText font-semibold truncate">
              Footer overlay “{activeFooter.name}” is shown on gallery photos at render time — files stay untouched
            </span>
          </div>
        )}
        <h3 className="text-mainText font-bold mb-3 text-sm sm:text-base">Upload New Image</h3>
        <label className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-secondary/40 bg-black/10 hover:bg-black/15 transition cursor-pointer p-6 mb-3 text-center">
          <ImagePlus size={22} className="text-accent" />
          <span className="text-mainText text-sm font-semibold">Choose images</span>
          <span className="text-mutedText text-xs">Up to {MAX_BATCH} images per batch</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={addFiles} />
        </label>

        {files.length > 0 && (
          <div className="mb-3 space-y-2">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-black/10 border border-secondary/30 px-3 py-2">
                <img src={URL.createObjectURL(f)} alt="" className="w-10 h-8 rounded-md object-cover shrink-0" />
                <span className="flex-1 min-w-0 text-mainText text-xs sm:text-sm truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={uploading}
                  className="text-mutedText hover:text-red-400 transition shrink-0 disabled:opacity-50"
                  aria-label={`Remove ${f.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="mb-3">
            <div className="flex items-center gap-2 text-mutedText text-sm mb-2">
              <Loader2 size={16} className="animate-spin" /> Uploading... {progress}%
            </div>
            <div className="h-2 rounded-full bg-black/20 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress || 4}%` }} />
            </div>
          </div>
        )}

        <input className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" placeholder="Caption (optional)" value={caption} onChange={e => setCaption(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))} />
        <AlbumPicker
          albums={albums}
          value={album}
          newValue={newAlbum}
          onValue={setAlbum}
          onNewValue={setNewAlbum}
          label="Album"
        />
        <button onClick={handleUpload} disabled={uploading || files.length === 0} className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-primary/90 transition disabled:opacity-60">
          <Upload size={16} className="sm:w-[18px] sm:h-[18px]" /> {uploading ? 'Uploading...' : `Upload ${files.length || ''} Image${files.length === 1 ? '' : 's'}`}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {images.length === 0 && <p className="text-mutedText text-center text-sm py-6">No images uploaded yet.</p>}
        {images.map(img => (
          <div key={img.id} className="bg-card rounded-xl p-3 flex items-center gap-3 shadow-sm border border-secondary/30">
            <img src={img.imageURL} className="w-14 h-10 sm:w-16 sm:h-12 rounded-lg object-cover shrink-0" alt="" />
            <div className="flex-1 min-w-0">
              <p className="text-mainText text-xs sm:text-sm truncate">{img.caption || 'No caption'}</p>
              <p className="text-mutedText text-[10px] sm:text-xs truncate">
                {img.album ? <span className="text-oceanTint font-semibold">{img.album}</span> : 'No album'}
                {' · '}
                {img.isFeatured ? 'Hero banner' : 'Gallery only'}
              </p>
            </div>
            <button
              onClick={() => toggleFeatured(img)}
              className={img.isFeatured ? 'text-mainText shrink-0' : 'text-mutedText shrink-0'}
              title={img.isFeatured ? 'Remove from hero' : 'Show in hero banner'}
            >
              {img.isFeatured ? <ToggleRight size={18} className="sm:w-5 sm:h-5" /> : <ToggleLeft size={18} className="sm:w-5 sm:h-5" />}
            </button>
            <KebabMenu
              items={[
                { label: 'Edit', icon: <Pencil size={15} />, onClick: () => startEdit(img) },
                { label: 'Delete', icon: <Trash2 size={15} />, danger: true, onClick: () => handleDelete(img.id) },
              ]}
            />
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-mainText font-bold text-lg">Edit Image</h3>
              <button onClick={() => setEditing(null)} className="text-mutedText hover:text-mainText transition">
                <X size={20} />
              </button>
            </div>
            <img src={editing.imageURL} alt="" className="w-full h-40 object-cover rounded-xl mb-4 border border-secondary/30" />
            <label className="text-mutedText text-sm block mb-1.5 font-semibold">Caption</label>
            <input
              className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
              placeholder="Caption (optional)"
              value={editCaption}
              onChange={e => setEditCaption(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
            />
            <AlbumPicker
              albums={albums}
              value={editAlbum}
              newValue={editNewAlbum}
              onValue={setEditAlbum}
              onNewValue={setEditNewAlbum}
              label="Album"
            />
            <button onClick={saveEdit} className="w-full bg-primary text-white rounded-xl p-3 font-semibold hover:bg-primary/90 transition">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
