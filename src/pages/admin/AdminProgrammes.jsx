import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { getProgrammes, PROGRAMME_CATEGORIES, PROGRAMME_TYPES } from '../../supabase/queries'
import { ArrowLeft, Plus, Pencil, X, Printer } from 'lucide-react'
import { useToast } from '../../components/Toast'

export default function AdminProgrammes() {
  const addNameRef = useRef(null)
  const addCatRef = useRef(null)
  const addNoRef = useRef(null)
  const editNameRef = useRef(null)
  const editCatRef = useRef(null)
  const editNoRef = useRef(null)

  const [programmes, setProgrammes] = useState([])
  const [resultNoMap, setResultNoMap] = useState({})
  const [students, setStudents] = useState([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [programmeType, setProgrammeType] = useState('')
  const [addResultNo, setAddResultNo] = useState('')
  const [progFilter, setProgFilter] = useState('')
  const [progTypeFilter, setProgTypeFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editProgrammeType, setEditProgrammeType] = useState('')
  const [editResultNo, setEditResultNo] = useState('')
  const [editFinished, setEditFinished] = useState(false)
  const [viewProg, setViewProg] = useState(null)
  const navigate = useNavigate()
  const toast = useToast()

  const loadData = () => {
    getProgrammes().then(setProgrammes)
    supabase.from('students').select('id, name, programmeIds').then(({ data }) => setStudents(data || []))
    supabase.from('results').select('*').then(({ data }) => {
      const latestUnlocked = {}
      ;(data || []).forEach(r => {
        if (r.locked) return
        if (!latestUnlocked[r.programmeId] || r.updatedAt > latestUnlocked[r.programmeId].updatedAt) {
          latestUnlocked[r.programmeId] = r
        }
      })
      const map = {}
      Object.values(latestUnlocked).forEach(r => { if (r.programmeId) map[r.programmeId] = r.resultNo })
      setResultNoMap(map)
    })
  }

  useEffect(() => { loadData() }, [])

  const handleAdd = async () => {
    if (!name || !category || !programmeType) return toast('Fill all fields', 'error')
    const { data: newProg, error: progErr } = await supabase.from('programmes').insert({ name, category, programmeType, isFinished: false }).select('id').single()
    if (progErr) return toast('Failed: ' + progErr.message, 'error')
    if (addResultNo) {
      await supabase.from('results').insert({ programmeId: newProg.id, name, resultNo: Number(addResultNo) })
    }
    setName(''); setCategory(''); setProgrammeType(''); setAddResultNo('')
    toast('Programme added!')
    loadData()
  }

  const toggleFinished = async (prog) => {
    await supabase.from('programmes').update({ isFinished: !prog.isFinished }).eq('id', prog.id)
    loadData()
  }

  const startEdit = (prog) => {
    setEditingId(prog.id)
    setEditName(prog.name)
    setEditCategory(prog.category)
    setEditProgrammeType(prog.programmeType || prog.type || '')
    setEditFinished(prog.isFinished)
    setEditResultNo(resultNoMap[prog.id] || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName(''); setEditCategory(''); setEditProgrammeType(''); setEditResultNo(''); setEditFinished(false)
  }

  const handleEditSave = async () => {
    if (!editName || !editCategory || !editProgrammeType) return toast('Fill all fields', 'error')
    const { error: progErr } = await supabase.from('programmes').update({
      name: editName, category: editCategory, programmeType: editProgrammeType, isFinished: editFinished,
    }).eq('id', editingId)
    if (progErr) return toast('Failed to update programme: ' + progErr.message, 'error')

    const progResults = await supabase.from('results').select('*').eq('programmeId', editingId).order('updatedAt', { ascending: false }).then(({ data }) => data || [])
    const existingUnlocked = progResults.find(r => !r.locked)
    if (editResultNo) {
      if (existingUnlocked) {
        const { error } = await supabase.from('results').update({ resultNo: Number(editResultNo) }).eq('id', existingUnlocked.id)
        if (error) return toast('Failed to save result number: ' + error.message, 'error')
      } else if (progResults.length === 0) {
        const { error } = await supabase.from('results').insert({ programmeId: editingId, name: editName, resultNo: Number(editResultNo) })
        if (error) return toast('Failed to save result number: ' + error.message, 'error')
      }
    }

    toast('Programme updated!')
    cancelEdit()
    loadData()
  }

  const participantsModal = (prog) => {
    const enrolledIds = new Set(
      (students || []).filter(s => (s.programmeIds || []).includes(prog.id)).map(s => s.id)
    )
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setViewProg(null)}>
        <div className="bg-card rounded-2xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-mainText font-bold text-lg">{prog.name}</h3>
            <button onClick={() => setViewProg(null)} className="text-mutedText hover:text-mainText transition">
              <X size={20} />
            </button>
          </div>
          <p className="text-mutedText text-sm mb-3">{prog.category} · {prog.programmeType || prog.type || 'Unspecified'} · {students.length} students</p>
          <div className="space-y-1">
            {(students || []).map(s => {
              const enrolled = enrolledIds.has(s.id)
              return (
                <div key={s.id} className={`rounded-xl p-3 flex items-center gap-2 ${enrolled ? 'bg-secondary/25 border border-secondary' : 'bg-black/10'}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${enrolled ? 'bg-secondary' : 'bg-white/20'}`} />
                  <span className="text-mainText text-sm flex-1">{s.name}</span>
                  {enrolled && <span className="text-mainText text-xs font-semibold">Participating</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-mutedText mb-4 hover:text-mainText transition">
        <ArrowLeft size={18} /> Back
      </button>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Programmes</h2>
        <button onClick={() => navigate('/admin/print')} className="flex items-center gap-2 bg-success hover:bg-success/90 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base">
          <Printer size={16} className="sm:w-[18px] sm:h-[18px]" /> Print
        </button>
      </div>

      <div className="bg-card rounded-2xl p-4 mb-6 shadow-sm border border-secondary/30">
        <h3 className="text-mainText font-bold mb-3 text-sm sm:text-base">Add New Programme</h3>
        <input ref={addNameRef} className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" placeholder="Programme name" value={name} onChange={e => setName(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCatRef.current?.focus() } }} />
        <select ref={addCatRef} className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" value={category} onChange={e => setCategory(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNoRef.current?.focus() } }}>
          <option value="">Select Category</option>
          {PROGRAMME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base" value={programmeType} onChange={e => setProgrammeType(e.target.value)}>
          <option value="">Select Type</option>
          {PROGRAMME_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <input
          ref={addNoRef}
          type="number"
          className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
          placeholder="Result number"
          value={addResultNo}
          onChange={e => setAddResultNo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
        />
        <button onClick={handleAdd} className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base">
          <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> Add Programme
        </button>
      </div>

      <div className="flex justify-center gap-1.5 sm:gap-2 mb-3 flex-wrap">
        {['', ...PROGRAMME_CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setProgFilter(cat)}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 ${
              progFilter === cat
                ? 'bg-primary text-white shadow-lg shadow-black/40'
                : 'bg-white/10 text-mutedText hover:bg-white/15 hover:text-mainText'
            }`}
          >
            {cat || 'All'}
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 sm:gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setProgTypeFilter('')}
          className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 ${
            !progTypeFilter ? 'bg-primary text-white shadow-lg shadow-black/40' : 'bg-white/10 text-mutedText hover:bg-white/15 hover:text-mainText'
          }`}
        >
          All Types
        </button>
        {PROGRAMME_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setProgTypeFilter(type)}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 ${
              progTypeFilter === type ? 'bg-primary text-white shadow-lg shadow-black/40' : 'bg-white/10 text-mutedText hover:bg-white/15 hover:text-mainText'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {programmes.filter(p => (!progFilter || p.category === progFilter) && (!progTypeFilter || (p.programmeType || p.type || '') === progTypeFilter)).map(prog => (
          <div key={prog.id} className="bg-card rounded-xl p-4 flex justify-between items-center shadow-sm border border-secondary/30">
            <div className="cursor-pointer flex-1 min-w-0" onClick={() => setViewProg(prog)}>
              <p className="text-mainText font-medium text-sm sm:text-base truncate">
                {resultNoMap[prog.id] ? <span className="text-accent font-bold text-base sm:text-lg mr-2">#{resultNoMap[prog.id]}</span> : null}
                {prog.name}
              </p>
              <p className="text-mutedText text-xs sm:text-sm">{prog.category} · {(prog.programmeType || prog.type || 'Unspecified')}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
              <button onClick={() => startEdit(prog)} className="text-mutedText hover:text-mainText transition">
                <Pencil size={14} className="sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => toggleFinished(prog)}
                className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-colors duration-300 ${prog.isFinished ? 'bg-green-500' : 'bg-white/20'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow transition-transform duration-300 ${prog.isFinished ? 'translate-x-5 sm:translate-x-7' : ''}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#CBDDE9] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-black font-bold text-lg">Edit Programme</h3>
              <button onClick={cancelEdit} className="text-black/60 hover:text-black transition">
                <X size={20} />
              </button>
            </div>

            <label className="text-black text-sm block mb-1">Programme Name</label>
            <input
              ref={editNameRef}
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              value={editName}
              onChange={e => setEditName(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); editCatRef.current?.focus() } }}
            />

            <label className="text-black text-sm block mb-1">Category</label>
            <select
              ref={editCatRef}
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              value={editCategory}
              onChange={e => setEditCategory(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); editNoRef.current?.focus() } }}
            >
              {PROGRAMME_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label className="text-black text-sm block mb-1">Type</label>
            <select
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              value={editProgrammeType}
              onChange={e => setEditProgrammeType(e.target.value)}
            >
              <option value="">Select Type</option>
              {PROGRAMME_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>

            <label className="text-black text-sm block mb-1">Result Number</label>
            <input
              ref={editNoRef}
              type="number"
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              value={editResultNo}
              onChange={e => setEditResultNo(e.target.value)}
              placeholder="e.g. 1"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEditSave() } }}
            />

            <label className="flex items-center gap-3 text-black mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={editFinished}
                onChange={e => setEditFinished(e.target.checked)}
                className="accent-secondary w-4 h-4"
              />
              Finished
            </label>

            <button
              onClick={handleEditSave}
              className="w-full bg-primary text-white rounded-xl p-3 font-semibold hover:opacity-90 transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* View Participants Modal */}
      {viewProg && participantsModal(viewProg)}
    </div>
  )
}
