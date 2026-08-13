import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'
import { getStudents, getTeams, getProgrammes, getCategories, STUDENT_CATEGORIES } from '../../supabase/queries'
import { Plus, X, Pencil } from 'lucide-react'
import StudentAvatar from '../../components/StudentAvatar'
import FilterDropdown from '../../components/FilterDropdown'
import KebabMenu from '../../components/KebabMenu'
import { useToast } from '../../components/Toast'

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [chestNo, setChestNo] = useState('')
  const [category, setCategory] = useState('')
  const [team, setTeam] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [categories, setCategories] = useState(STUDENT_CATEGORIES)
  const [photo, setPhoto] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [selectedProgs, setSelectedProgs] = useState([])
  const toast = useToast()

  useEffect(() => {
    getStudents().then(setStudents)
    getTeams().then(setTeams)
    getProgrammes().then(setProgrammes)
    getCategories().then(({ student }) => setCategories(student))
  }, [])

  const handleAdd = async () => {
    if (!name || !category || !team) return toast('Fill all fields', 'error')
    const wasEditing = Boolean(editingId)
    let photoURL = ''
    if (photo) {
      const { data } = await supabase.storage.from('photos').upload(`students/${Date.now()}_${photo.name}`, photo)
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(data.path)
      photoURL = urlData.publicUrl
    }
    if (editingId) {
      const updates = {
        name, chestNo, class: category, team,
        programmeIds: selectedProgs,
      }
      if (photoURL) updates.photoURL = photoURL
      const { data: updated, error } = await supabase.from('students').update(updates).eq('id', editingId).select()
      if (error) {
        console.error('Student update failed:', error)
        toast(`Participant update failed: ${error.message}`, 'error')
        return
      }
      if (!updated || updated.length === 0) {
        const { data: existing } = await supabase.from('students').select('id').eq('id', editingId).maybeSingle()
        if (existing) {
          console.error('Participant update failed:', { message: 'Row exists but the update was rejected by database permissions (RLS).' })
          toast('Participant update failed: the database rejected the update (permission denied). If the failure persists, log out of Admin and log back in.', 'error')
        } else {
          console.error('Participant update failed:', { message: 'No matching student row. The edited student may have been deleted.' })
          toast('Participant update failed: the participant no longer exists. Reload the panel and try again.', 'error')
        }
        return
      }
    } else {
      const { error } = await supabase.from('students').insert({
        name, chestNo, class: category, team, photoURL, programmeIds: selectedProgs,
      })
      if (error) {
        console.error('Participant add failed:', error)
        toast(`Participant add failed: ${error.message}`, 'error')
        return
      }
    }

    const refreshedStudents = await getStudents()
    setStudents(refreshedStudents)
    closeForm()
    toast(wasEditing ? 'Participant updated!' : 'Participant added!')
  }

  const openAdd = () => {
    setEditingId(null)
    setName(''); setChestNo(''); setCategory(''); setTeam(''); setPhoto(null); setSelectedProgs([])
    setFormOpen(true)
  }

  const handleEdit = (student) => {
    setEditingId(student.id)
    setName(student.name)
    setChestNo(student.chestNo || '')
    setCategory(student.class || '')
    setTeam(student.team)
    setSelectedProgs(student.programmeIds || [])
    setPhoto(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setName(''); setChestNo(''); setCategory(''); setTeam(''); setPhoto(null); setSelectedProgs([])
  }

  const toggleProg = (progId) => {
    setSelectedProgs(prev =>
      prev.includes(progId) ? prev.filter(id => id !== progId) : [...prev, progId]
    )
  }

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]))
  const memberCountByTeam = {}
  teams.forEach(t => { memberCountByTeam[t.id] = 0 })
  students.forEach(s => {
    const tid = teamMap[s.team] ? s.team : s.team
    if (memberCountByTeam[tid] !== undefined) memberCountByTeam[tid] += 1
  })

  const teamOptions = [
    { value: '', label: 'All Teams', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...teams.map(t => ({
      value: t.id,
      label: `${t.name} (${memberCountByTeam[t.id] || 0})`,
      icon: <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />,
    })),
  ]

  const filteredProgrammes = category
    ? programmes.filter(p => p.category === category)
    : programmes.filter(p => !p.category?.startsWith('General'))
  const generalProgrammes = programmes.filter(p => p.category?.startsWith('General'))

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

  const filteredStudents = students.filter(s =>
    (!studentFilter || s.class === studentFilter) &&
    (!teamFilter || s.team === teamFilter)
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Participants</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base">
          <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> Add Participant
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-secondary/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-mainText font-bold text-lg">{editingId ? 'Edit Participant' : 'Add New Participant'}</h3>
              <button onClick={closeForm} className="text-mutedText hover:text-mainText transition">
                <X size={20} />
              </button>
            </div>

            <input className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" placeholder="Full name" value={name} onChange={e => setName(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))} />

            <input className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" placeholder="Chest No (e.g. 101)" value={chestNo} onChange={e => setChestNo(e.target.value)} />

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

            <button onClick={handleAdd} className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-primary/90 transition">
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> {editingId ? 'Update Participant' : 'Add Participant'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <FilterDropdown
          label="All Teams"
          options={teamOptions}
          value={teamFilter}
          onChange={setTeamFilter}
          className="flex-1"
          dark
        />
        <FilterDropdown
          label="All Categories"
          options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]}
          value={studentFilter}
          onChange={setStudentFilter}
          className="flex-1"
          dark
        />
      </div>

      <div className="flex flex-col gap-3">
        {filteredStudents.map(s => (
          <div key={s.id} className="relative bg-card rounded-xl p-4 flex items-center gap-3 shadow-sm border border-secondary/30">
            <span
              className={`absolute -top-2 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-md ${
                s.chestNo ? 'bg-primary text-white' : 'bg-black/20 text-mutedText'
              }`}
              title="Chest No"
            >
              {s.chestNo ? `#${s.chestNo}` : '—'}
            </span>
            <StudentAvatar src={s.photoURL} name={s.name} className="w-10 h-10" />
            <div className="flex-1 min-w-0">
              <p className="text-mainText font-medium text-sm sm:text-base truncate">{s.name}</p>
              <p className="text-mutedText text-xs sm:text-sm">{s.chestNo ? `Chest No: ${s.chestNo} · ` : ''}{teamMap[s.team] || s.team} · {s.class}</p>
            </div>
            <KebabMenu
              items={[{ label: 'Edit', icon: <Pencil size={15} />, onClick: () => handleEdit(s) }]}
              className="mt-2"
            />
          </div>
        ))}
      </div>
    </div>
  )
}