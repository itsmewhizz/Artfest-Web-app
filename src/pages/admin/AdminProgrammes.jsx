import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { getProgrammes, getResultNoMap, getCategories, getTeams, PROGRAMME_CATEGORIES, PROGRAMME_TYPES, PARTICIPATION_TYPES, createPlaceholderResultForProgramme } from '../../supabase/queries'
import { Plus, X, Printer, Pencil, Trash2, Upload, Eraser } from 'lucide-react'
import KebabMenu from '../../components/KebabMenu'
import FilterDropdown from '../../components/FilterDropdown'
import ProgrammeBulkImportModal from '../../components/ProgrammeBulkImportModal'
import { rowField } from '../../utils/importParsers'
import { CATEGORY_COLORS } from '../../components/TeamBreakdown'
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
  const [categories, setCategories] = useState(PROGRAMME_CATEGORIES)
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [programmeType, setProgrammeType] = useState('')
  const [addParticipationType, setAddParticipationType] = useState('')
  const [addResultNo, setAddResultNo] = useState('')
  const [progFilter, setProgFilter] = useState('')
  const [progTypeFilter, setProgTypeFilter] = useState('')
  const [partFilter, setPartFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState('100')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editProgrammeType, setEditProgrammeType] = useState('')
  const [editParticipationType, setEditParticipationType] = useState('')
  const [editResultNo, setEditResultNo] = useState('')
  const [editFinished, setEditFinished] = useState(false)
  const [viewProg, setViewProg] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const hasProgFilter = Boolean(progFilter || progTypeFilter || partFilter)
  const filteredProgrammes = useMemo(() => {
    return programmes
      .filter(p => (!progFilter || p.category === progFilter)
        && (!progTypeFilter || (p.programmeType || p.type || '') === progTypeFilter)
        && (!partFilter || (p.participationType || p.participation_type || '') === partFilter))
      .sort((a, b) => (resultNoMap[a.id] || Number.MAX_SAFE_INTEGER) - (resultNoMap[b.id] || Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name))
  }, [programmes, progFilter, progTypeFilter, partFilter, resultNoMap])

  const deleteResultsForProgramme = async (progId) => {
    const { data, error } = await supabase.rpc('admin_delete_results_for_programme', { p_programme_id: progId })
    if (error) {
      console.warn('RPC admin_delete_results_for_programme failed, falling back to direct delete:', error)
      return supabase.from('results').delete().eq('programmeId', progId)
    }
    return { data, error }
  }

  const loadData = async () => {
    const [progs, rMap, catObj, teamData] = await Promise.all([
      getProgrammes(),
      getResultNoMap(),
      getCategories(),
      getTeams(),
    ])
    setProgrammes(progs)
    setResultNoMap(rMap)
    setCategories(catObj?.programme || PROGRAMME_CATEGORIES)
    setTeams(teamData)
    const { data } = await supabase.from('students').select('id, name, team, programmeIds')
    setStudents(data || [])
  }

  useEffect(() => { loadData() }, [])

  const handleAdd = async () => {
    if (!name || !category || !programmeType || !addParticipationType) return toast('Fill all fields', 'error')
    const { data: newProg, error: progErr } = await supabase.from('programmes').insert({ name, category, programmeType, participationType: addParticipationType, isFinished: false }).select('id')
    if (progErr || !newProg || newProg.length === 0) {
      console.error('Programme add failed:', progErr || { message: 'Insert returned no rows (RLS).' })
      return toast('Failed to add programme: ' + (progErr?.message || 'the database rejected the insert (permission denied).'), 'error')
    }
    const addedId = newProg[0].id
    await createPlaceholderResultForProgramme(addedId, name)
    if (addResultNo) {
      const { data: rpcData, error: noErr } = await supabase.rpc('admin_set_result_no', {
        p_programme_id: addedId,
        p_programme_name: name,
        p_result_no: Number(addResultNo),
      })
      const rpcMsg = noErr?.message || rpcData?.error
      if (rpcMsg) return toast('Programme added but result number not saved: ' + rpcMsg, 'error')
    }
    setName(''); setCategory(''); setProgrammeType(''); setAddParticipationType(''); setAddResultNo(''); setShowAdd(false)
    toast('Programme added!')
    loadData()
  }

  const toggleFinished = async (prog) => {
    const originalStatus = prog.isFinished
    const newStatus = !originalStatus
    setProgrammes(prev => prev.map(p => p.id === prog.id ? { ...p, isFinished: newStatus } : p))

    try {
      // Update programme isFinished — this ONLY affects the programme's
      // finished state, NOT the result. "Programme finished" and "result
      // assigned" are two independent states. The result.isFinished flag
      // is set exclusively by judge submission.
      const { data: updated, error } = await supabase.from('programmes').update({ isFinished: newStatus }).eq('id', prog.id).select('id')
      if (error) throw error
      if (!updated || updated.length === 0) throw new Error('the database rejected the update (permission denied)')
    } catch (err) {
      setProgrammes(prev => prev.map(p => p.id === prog.id ? { ...p, isFinished: originalStatus } : p))
      toast('Failed to update status: ' + err.message, 'error')
    }
  }

  const handleDelete = async (prog) => {
    if (!window.confirm(`Delete programme "${prog.name}"? All results for this programme will also be deleted. This cannot be undone.`)) return
    await deleteResultsForProgramme(prog.id)
    const { error } = await supabase.from('programmes').delete().eq('id', prog.id)
    if (error) {
      console.error('Programme delete failed:', error)
      return toast('Failed to delete programme: ' + error.message, 'error')
    }
    toast('Programme deleted!')
    loadData()
  }

  const handleClearResult = async (prog) => {
    if (!window.confirm(`Clear the result for "${prog.name}"? Placements will be removed and the programme will be marked as not finished.`)) return

    // Reset the result row instead of deleting it
    const { error: resErr } = await supabase.from('results').update({
      first: null,
      second: null,
      third: null,
      entries: null,
      isFinished: false,
      locked: false,
      updatedAt: new Date().toISOString(),
    }).eq('programmeId', prog.id)
    if (resErr) {
      console.error('Clear result failed:', resErr)
      return toast('Failed to clear result: ' + resErr.message, 'error')
    }

    await supabase.from('programmes').update({ isFinished: false }).eq('id', prog.id).select('id')
    toast('Result cleared!')
    loadData()
  }

  const handleImport = async (parsed) => {
    let inserted = 0
    const failed = []

    for (const raw of parsed.rows) {
      const name = rowField(raw, 'name', 'programme', 'programmename', 'event')
      const category = rowField(raw, 'category')
      const typeRaw = rowField(raw, 'type', 'programmetype')
      const participationRaw = rowField(raw, 'participation', 'participationtype', 'categorytype')
      const resultNo = rowField(raw, 'resultno', 'resultnumber', 'result', 'no')

      if (!name || !category) {
        failed.push(name || 'a row missing a name')
        continue
      }
      const normalizedCategory = category.replace(/\b\w/g, c => c.toUpperCase())
      if (!categories.includes(normalizedCategory)) {
        failed.push(name)
        continue
      }
      const typeCandidates = PROGRAMME_TYPES.filter(t => t.toLowerCase() === typeRaw.toLowerCase())
      const participationCandidates = PARTICIPATION_TYPES.filter(t => t.toLowerCase() === participationRaw.toLowerCase())

      const { data: newProg, error: progErr } = await supabase.from('programmes').insert({
        name,
        category: normalizedCategory,
        programmeType: typeCandidates[0] || '',
        participationType: participationCandidates[0] || '',
        isFinished: false,
      }).select('id')

      if (progErr || !newProg || newProg.length === 0) {
        console.error('Programme import row failed:', progErr)
        failed.push(name)
        continue
      }

      await createPlaceholderResultForProgramme(newProg[0].id, name)

      if (resultNo && Number(resultNo)) {
        const { data: rpcData, error: noErr } = await supabase.rpc('admin_set_result_no', {
          p_programme_id: newProg[0].id,
          p_programme_name: name,
          p_result_no: Number(resultNo),
        })
        const rpcMsg = noErr?.message || rpcData?.error
        if (rpcMsg) console.error('Result number not saved for', name, rpcMsg)
      }
      inserted += 1
    }

    loadData()

    if (inserted > 0) {
      toast(`Imported ${inserted} programme${inserted === 1 ? '' : 's'}!`)
    }
    if (failed.length > 0) {
      toast(`Skipped ${failed.length} row${failed.length === 1 ? '' : 's'} (missing or invalid data)`, 'error')
    }
    if (inserted === 0 && failed.length > 0) {
      throw new Error('No rows could be imported — check the name and category columns.')
    }
    setImportOpen(false)
  }

  const startEdit = (prog) => {
    setEditingId(prog.id)
    setEditName(prog.name)
    setEditCategory(prog.category)
    setEditProgrammeType(prog.programmeType || prog.type || '')
    setEditParticipationType(prog.participationType || prog.participation_type || '')
    setEditFinished(prog.isFinished)
    setEditResultNo(resultNoMap[prog.id] || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName(''); setEditCategory(''); setEditProgrammeType(''); setEditParticipationType(''); setEditResultNo(''); setEditFinished(false)
  }

  const handleEditSave = async () => {
    if (!editName || !editCategory || !editProgrammeType || !editParticipationType) return toast('Fill all fields', 'error')
    const originalProg = programmes.find(p => p.id === editingId)
    const turningOff = Boolean(originalProg?.isFinished) && !editFinished
    const { data: updated, error: progErr } = await supabase.from('programmes').update({
      name: editName, category: editCategory, programmeType: editProgrammeType, participationType: editParticipationType, isFinished: editFinished,
    }).eq('id', editingId).select('id')
    if (progErr || !updated || updated.length === 0) {
      console.error('Programme update failed:', progErr || { message: 'Update returned no rows (RLS).' })
      return toast('Failed to update programme: ' + (progErr?.message || 'the database rejected the update (permission denied).'), 'error')
    }

    if (turningOff) {
      // Reset the result row instead of deleting it
      const { error: resErr } = await supabase.from('results').update({
        first: null,
        second: null,
        third: null,
        entries: null,
        isFinished: false,
        locked: false,
        updatedAt: new Date().toISOString(),
      }).eq('programmeId', editingId)
      if (resErr) {
        console.error('Result cleanup on unfinish failed:', resErr)
        return toast('Programme updated but result cleanup failed: ' + resErr.message, 'error')
      }
    }

    if (editResultNo) {
      const { data: rpcData, error: noErr } = await supabase.rpc('admin_set_result_no', {
        p_programme_id: editingId,
        p_programme_name: editName,
        p_result_no: Number(editResultNo),
      })
      const rpcMsg = noErr?.message || rpcData?.error
      if (rpcMsg) return toast('Failed to save result number: ' + rpcMsg, 'error')
    }

    toast('Programme updated!')
    cancelEdit()
    loadData()
  }

  const participantsModal = (prog) => {
    const participantStudents = (students || []).filter(s => (s.programmeIds || []).includes(prog.id))
    const teamMap = {}
    teams.forEach(t => { teamMap[t.id] = t.name })
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setViewProg(null)}>
        <div className="bg-card rounded-2xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-mainText font-bold text-lg">{prog.name}</h3>
            <button onClick={() => setViewProg(null)} className="text-mutedText hover:text-mainText transition">
              <X size={20} />
            </button>
          </div>
          <p className="text-mutedText text-sm mb-3">{prog.category} · {prog.programmeType || prog.type || 'Unspecified'} · {prog.participationType || prog.participation_type || 'Unspecified'} · {participantStudents.length} participants</p>
          {participantStudents.length === 0 && (
            <p className="text-mutedText text-sm italic py-3">No participants enrolled in this programme yet.</p>
          )}
          <div className="space-y-1">
            {participantStudents.map(s => (
              <div key={s.id} className="rounded-xl p-3 flex items-center gap-2 bg-secondary/25 border border-secondary">
                <div className="w-2 h-2 rounded-full shrink-0 bg-secondary" />
                <div className="flex-1 min-w-0">
                  <p className="text-mainText text-sm truncate">{s.name}</p>
                  <p className="text-mutedText text-xs truncate">{teamMap[s.team] || s.team || ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const catOptions = [
    { value: '', label: 'All Categories', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...categories.map(c => ({
      value: c,
      label: c,
      icon: <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c]?.light || '#9CA3AF' }} />,
    })),
  ]

  const typeOptions = [
    { value: '', label: 'All Types', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...PROGRAMME_TYPES.map(t => ({ value: t, label: t, icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> })),
  ]

  const partOptions = [
    { value: '', label: 'All Participation', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...PARTICIPATION_TYPES.map(t => ({ value: t, label: t, icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> })),
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Programmes</h2>
          <span className="bg-secondary/30 text-mainText text-xs font-semibold px-2.5 py-1 rounded-full">
            {hasProgFilter
              ? `${filteredProgrammes.length} of ${programmes.length} programmes`
              : `${programmes.length} programmes`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 bg-card hover:bg-white/10 border border-secondary/40 text-mainText px-3 sm:px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base">
            <Upload size={16} className="sm:w-[18px] sm:h-[18px]" /> Import File
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base">
            <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> Add Programme
          </button>
          <button onClick={() => navigate('/admin/print')} className="flex items-center gap-2 bg-success hover:bg-success/90 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base">
            <Printer size={16} className="sm:w-[18px] sm:h-[18px]" /> Print
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <FilterDropdown
          dark
          label="All Categories"
          options={catOptions}
          value={progFilter}
          onChange={setProgFilter}
          className="flex-1"
        />
        <FilterDropdown
          dark
          label="All Types"
          options={typeOptions}
          value={progTypeFilter}
          onChange={setProgTypeFilter}
          className="flex-1"
        />
        <FilterDropdown
          dark
          label="All Participation"
          options={partOptions}
          value={partFilter}
          onChange={setPartFilter}
          className="flex-1"
        />
      </div>
      {(() => {
        const totalProgrammes = filteredProgrammes.length
        const isAll = pageSize === 'all'
        const numericSize = isAll ? totalProgrammes : Number(pageSize) || 100
        const totalPages = isAll ? 1 : Math.ceil(totalProgrammes / numericSize) || 1
        const activePage = Math.min(currentPage, totalPages)
        const startRow = totalProgrammes === 0 ? 0 : isAll ? 1 : (activePage - 1) * numericSize + 1
        const endRow = isAll ? totalProgrammes : Math.min(activePage * numericSize, totalProgrammes)
        const displayedProgrammes = isAll ? filteredProgrammes : filteredProgrammes.slice(startRow - 1, endRow)

        return (
          <>
            <div className="flex flex-col gap-3">
              {displayedProgrammes.length === 0 && (
                <div className="bg-card rounded-xl p-8 text-center text-mutedText border border-secondary/30">
                  No programmes found.
                </div>
              )}
              {displayedProgrammes.map(prog => (
                <div key={prog.id} className="bg-card rounded-xl p-4 flex justify-between items-center shadow-sm border border-secondary/30">
                  <div className="cursor-pointer flex-1 min-w-0" onClick={() => setViewProg(prog)}>
                    <p className="text-mainText font-medium text-sm sm:text-base truncate">
                      {resultNoMap[prog.id] ? <span className="text-accent font-bold text-base sm:text-lg mr-2">#{resultNoMap[prog.id]}</span> : null}
                      {prog.name}
                    </p>
                    <p className="text-mutedText text-xs sm:text-sm">{prog.category} · {(prog.programmeType || prog.type || 'Unspecified')} · {(prog.participationType || prog.participation_type || 'Unspecified')}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
                    <button
                      onClick={() => toggleFinished(prog)}
                      className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-colors duration-300 ${prog.isFinished ? 'bg-green-500' : 'bg-white/20'}`}
                      title={prog.isFinished ? 'Finished' : 'Not finished'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow transition-transform duration-300 ${prog.isFinished ? 'translate-x-5 sm:translate-x-7' : ''}`} />
                    </button>
                    <KebabMenu
                      items={[
                        { label: 'Edit', icon: <Pencil size={15} />, onClick: () => startEdit(prog) },
                        { label: 'Clear Result', icon: <Eraser size={15} />, danger: true, onClick: () => handleClearResult(prog) },
                        { label: 'Delete', icon: <Trash2 size={15} />, danger: true, onClick: () => handleDelete(prog) },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-card rounded-xl p-4 border border-secondary/30 text-sm">
              <div className="text-mutedText">
                Showing <span className="font-semibold text-mainText">{startRow}–{endRow}</span> of <span className="font-semibold text-mainText">{totalProgrammes}</span> programmes
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-mutedText text-xs">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(e.target.value); setCurrentPage(1) }}
                    className="bg-black/20 text-mainText rounded-lg px-2.5 py-1 border border-secondary/40 outline-none text-xs sm:text-sm"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="all">All</option>
                  </select>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      disabled={activePage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-lg border border-secondary/40 text-mainText text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1 rounded-lg text-xs sm:text-sm transition ${activePage === p ? 'bg-primary text-white font-bold' : 'text-mainText hover:bg-white/10'}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      disabled={activePage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 rounded-lg border border-secondary/40 text-mainText text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#CBDDE9] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-black font-bold text-lg">Add New Programme</h3>
              <button onClick={() => setShowAdd(false)} className="text-black/60 hover:text-black transition">
                <X size={20} />
              </button>
            </div>

            <label className="text-black text-sm block mb-1">Programme Name</label>
            <input
              ref={addNameRef}
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              placeholder="Programme name"
              value={name}
              onChange={e => setName(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCatRef.current?.focus() } }}
            />

            <label className="text-black text-sm block mb-1">Category</label>
            <select
              ref={addCatRef}
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              value={category}
              onChange={e => setCategory(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNoRef.current?.focus() } }}
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label className="text-black text-sm block mb-1">Type</label>
            <select
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              value={programmeType}
              onChange={e => setProgrammeType(e.target.value)}
            >
              <option value="">Select Type</option>
              {PROGRAMME_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>

            <label className="text-black text-sm block mb-1">Individual / Group</label>
            <select
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              value={addParticipationType}
              onChange={e => setAddParticipationType(e.target.value)}
            >
              <option value="">Select</option>
              {PARTICIPATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>

            <label className="text-black text-sm block mb-1">Result Number</label>
            <input
              ref={addNoRef}
              type="number"
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              placeholder="Result number"
              value={addResultNo}
              onChange={e => setAddResultNo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            />

            <button
              onClick={handleAdd}
              className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> Add Programme
            </button>
          </div>
        </div>
      )}

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
              {categories.map(c => (
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

            <label className="text-black text-sm block mb-1">Individual / Group</label>
            <select
              className="w-full bg-white text-black rounded-xl p-3 mb-3 outline-none border border-black/20 focus:border-black"
              value={editParticipationType}
              onChange={e => setEditParticipationType(e.target.value)}
            >
              <option value="">Select</option>
              {PARTICIPATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
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

      <ProgrammeBulkImportModal
        open={importOpen}
        title="Import Programmes"
        onClose={() => setImportOpen(false)}
        existingCategories={categories}
      />
    </div>
  )
}