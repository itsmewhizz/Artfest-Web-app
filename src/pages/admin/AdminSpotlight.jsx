import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { getSpotlight } from '../../supabase/queries'
import { ArrowLeft, Upload, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useToast } from '../../components/Toast'

export default function AdminSpotlight() {
  const [images, setImages] = useState([])
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => { getSpotlight().then(setImages) }, [])

  const handleUpload = async () => {
    if (!file) return toast('Select an image', 'error')
    const { data } = await supabase.storage.from('photos').upload(`spotlight/${Date.now()}_${file.name}`, file)
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(data.path)
    await supabase.from('spotlight').insert({ imageURL: urlData.publicUrl, caption, isFeatured: false })
    setFile(null); setCaption('')
    toast('Image uploaded!')
    getSpotlight().then(setImages)
  }

  const handleDelete = async (id) => {
    await supabase.from('spotlight').delete().eq('id', id)
    getSpotlight().then(setImages)
  }

  const toggleFeatured = async (img) => {
    const { error } = await supabase.from('spotlight').update({ isFeatured: !img.isFeatured }).eq('id', img.id)
    if (!error) getSpotlight().then(setImages)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-mutedText mb-4 hover:text-mainText transition">
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText mb-6">Spotlight Manager</h2>

      <div className="bg-card rounded-2xl p-4 mb-6 shadow-sm border border-secondary/30">
        <input type="file" accept="image/*" className="w-full text-mutedText mb-3 text-sm" onChange={e => setFile(e.target.files[0])} />
        <input className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" placeholder="Caption (optional)" value={caption} onChange={e => setCaption(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))} />
        <button onClick={handleUpload} className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base">
          <Upload size={16} className="sm:w-[18px] sm:h-[18px]" /> Upload Image
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {images.map(img => (
          <div key={img.id} className="bg-card rounded-xl p-3 flex items-center gap-3 shadow-sm border border-secondary/30">
            <img src={img.imageURL} className="w-14 h-10 sm:w-16 sm:h-12 rounded-lg object-cover shrink-0" alt="" />
            <div className="flex-1 min-w-0">
              <p className="text-mainText text-xs sm:text-sm truncate">{img.caption || 'No caption'}</p>
              <p className="text-mutedText text-[10px] sm:text-xs">{img.isFeatured ? 'Hero banner' : 'Gallery only'}</p>
            </div>
            <button
              onClick={() => toggleFeatured(img)}
              className={img.isFeatured ? 'text-mainText shrink-0' : 'text-mutedText shrink-0'}
              title={img.isFeatured ? 'Remove from hero' : 'Show in hero banner'}
            >
              {img.isFeatured ? <ToggleRight size={18} className="sm:w-5 sm:h-5" /> : <ToggleLeft size={18} className="sm:w-5 sm:h-5" />}
            </button>
            <button onClick={() => handleDelete(img.id)} className="text-red-500 shrink-0">
              <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
