import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { getStudents, getTeams, getProgrammes, STUDENT_CATEGORIES } from '../../supabase/queries'
import { ArrowLeft, Plus, Pencil } from 'lucide-react'
import StudentAvatar from '../../components/StudentAvatar'
import { useToast } from '../../components/Toast'

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [team, setTeam] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const categories = STUDENT_CATEGORIES
  const [photo, setPhoto] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [selectedProgs, setSelectedProgs] = useState([])
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    getStudents().then(setStudents)
    getTeams().then(setTeams)
    getProgrammes().then(setProgrammes)
  }, [])

  const handleAdd = async () => {
    if (!name || !category || !team) return toast('Fill all fields', 'error')
    let photoURL = ''
    if (photo) {
      const { data } = await supabase.storage.from('photos').upload(`students/${Date.now()}_${photo.name}`, photo)
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(data.path)
      photoURL = urlData.publicUrl
    }
    if (editingId) {
      await supabase.from('students').update({
        name, class: category, team, photoURL: photoURL || undefined,
        programmeIds: selectedProgs, createdAt: new Date().toISOString(),
      }).eq('id', editingId)
    } else {
      await supabase.from('students').insert({
        name, class: category, team, photoURL, programmeIds: selectedProgs,
      })
    }
    setName(''); setCategory(''); setTeam(''); setPhoto(null); setEditingId(null); setSelectedProgs([])
    toast(editingId ? 'Student updated!' : 'Student added!')
    getStudents().then(setStudents)
  }

  const handleEdit = (student) => {
    setEditingId(student.id)
    setName(student.name)
    setCategory(student.class || '')
    setTeam(student.team)
    setSelectedProgs(student.programmeIds || [])
    setPhoto(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setName(''); setCategory(''); setTeam(''); setPhoto(null); setSelectedProgs([])
  }

  const toggleProg = (progId) => {
    setSelectedProgs(prev =>
      prev.includes(progId) ? prev.filter(id => id !== progId) : [...prev, progId]
    )
  }

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]))
  const filteredProgrammes = category
    ? programmes.filter(p => p.category === category)
    : programmes.filter(p => p.category !== 'General')
  const generalProgrammes = programmes.filter(p => p.category === 'General')

  let progList
  if (programmes.length === 0) {
    progList = <p className="text-mutedText text-sm p-2">No programmes yet.</p>
  } else if (filteredProgrammes.length === 0) {
    progList = <p className="text-mutedText text-sm p-2">No programmes in this category.</p>
  } else {
    progList = filteredProgrammes.map(prog => (
      <label
        key={prog.id}
        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${
          selectedProgs.includes(prog.id) ? 'bg-secondary/25 border border-secondary' : 'hover:bg-white/10'
        }`}
      >
        <input
          type="checkbox"
          checked={selectedProgs.includes(prog.id)}
          onChange={() => toggleProg(prog.id)}
          className="accent-secondary w-4 h-4"
        />
        <span className="text-mainText text-sm">{prog.name}</span>
        <span className="text-mutedText text-xs ml-auto">{prog.category}</span>
      </label>
    ))
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-mutedText mb-4 hover:text-mainText transition">
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText mb-6">Students</h2>

      <div className="bg-card rounded-2xl p-4 mb-6 shadow-sm border border-secondary/30">
        <h3 className="text-mainText font-bold mb-3 text-sm sm:text-base">{editingId ? 'Edit Student' : 'Add New Student'}</h3>

        <input className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" placeholder="Full name" value={name} onChange={e => setName(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))} />

        <select className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Select Category</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" value={team} onChange={e => setTeam(e.target.value)}>
          <option value="">Select Team</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <input type="file" accept="image/*" className="w-full text-mutedText mb-3 text-sm" onChange={e => setPhoto(e.target.files[0])} />

        <label className="text-mutedText text-sm block mb-2 font-semibold">Programmes</label>
        <div className="max-h-40 overflow-y-auto space-y-1 mb-3 bg-black/20 rounded-xl p-2">
          {progList}
        </div>

        {generalProgrammes.length > 0 && (
          <div className="mb-3">
            <label className="text-mutedText text-sm block mb-2 font-semibold">General Programmes</label>
            <div className="max-h-40 overflow-y-auto space-y-1 bg-black/20 rounded-xl p-2">
              {generalProgrammes.map(prog => (
                <label
                  key={prog.id}
                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${
                    selectedProgs.includes(prog.id) ? 'bg-secondary/25 border border-secondary' : 'hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProgs.includes(prog.id)}
                    onChange={() => toggleProg(prog.id)}
                    className="accent-secondary w-4 h-4"
                  />
                  <span className="text-mainText text-sm">{prog.name}</span>
                  <span className="text-mutedText text-xs ml-auto">{prog.category}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={handleAdd} className="flex-1 bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base">
            <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> {editingId ? 'Update Student' : 'Add Student'}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="bg-white/15 text-mainText rounded-xl p-3 font-semibold text-sm sm:text-base">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 sm:gap-2 mb-5 flex-wrap">
        {['', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setStudentFilter(cat)}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 ${
              studentFilter === cat
                ? 'bg-primary text-white shadow-lg shadow-black/40'
                : 'bg-white/10 text-mutedText hover:bg-white/15 hover:text-mainText'
            }`}
          >
            {cat || 'All'}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {students.filter(s => !studentFilter || s.class === studentFilter).map(s => (
          <div key={s.id} className="bg-card rounded-xl p-4 flex items-center gap-3 shadow-sm border border-secondary/30">
            <StudentAvatar src={s.photoURL} name={s.name} className="w-10 h-10" />
            <div className="flex-1 min-w-0">
              <p className="text-mainText font-medium text-sm sm:text-base truncate">{s.name}</p>
              <p className="text-mutedText text-xs sm:text-sm">{teamMap[s.team] || s.team} · {s.class}</p>
            </div>
            <button onClick={() => handleEdit(s)} className="text-mutedText hover:text-mainText shrink-0">
              <Pencil size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
