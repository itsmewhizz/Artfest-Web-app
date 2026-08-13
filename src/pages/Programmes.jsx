import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProgrammes, getAllResults, getCategories, PROGRAMME_CATEGORIES, PROGRAMME_TYPES, PARTICIPATION_TYPES } from '../supabase/queries'
import { Search, CheckCircle, XCircle, MicVocal, Brush } from 'lucide-react'
import FilterDropdown from '../components/FilterDropdown'
import { CATEGORY_COLORS } from '../components/TeamBar'

export default function Programmes() {
  const [programmes, setProgrammes] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [programmeType, setProgrammeType] = useState('')
  const [participation, setParticipation] = useState('')
  const [orderedCategories, setOrderedCategories] = useState(PROGRAMME_CATEGORIES)
  const navigate = useNavigate()

  const [resultNoMap, setResultNoMap] = useState({})

  useEffect(() => {
    getProgrammes().then(setProgrammes)
    getCategories().then(({ programme }) => setOrderedCategories(programme))
    getAllResults().then(results => {
      const map = {}
      results.forEach(r => { if (r.programmeId) map[r.programmeId] = r.resultNo })
      setResultNoMap(map)
    })
  }, [])

  const getProgrammeType = (prog) => prog?.programmeType || prog?.type || prog?.programme_type || ''
  const getParticipationType = (prog) => prog?.participationType || prog?.participation_type || ''

  const categoryOptions = [
    { value: '', label: 'All Categories', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...orderedCategories.map(c => ({
      value: c,
      label: c,
      icon: <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c]?.light || '#9CA3AF' }} />,
    })),
  ]

  const typeOptions = [
    { value: '', label: 'All', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...PROGRAMME_TYPES.map(t => ({
      value: t,
      label: t,
      icon: t === 'On-stage' ? <MicVocal size={16} color="#7FC3EA" /> : <Brush size={16} color="#9CCBE0" />,
    })),
  ]

  const participationOptions = [
    { value: '', label: 'All', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...PARTICIPATION_TYPES.map(t => ({ value: t, label: t, icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> })),
  ]

  const filtered = programmes.filter(p => {
    const matchName = p.name?.toLowerCase().includes(search.toLowerCase())
    const matchCat = category ? p.category === category : true
    const matchType = programmeType ? getProgrammeType(p) === programmeType : true
    const matchPart = participation ? getParticipationType(p) === participation : true
    return matchName && matchCat && matchType && matchPart
  })

  return (
    <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-poppins font-bold text-black mb-4">Programmes</h2>

      <div className="flex items-center bg-oceanTint border border-white/40 rounded-xl px-3 mb-3 shadow-md shadow-black/25">
        <Search size={18} color="#0F2A3D" />
        <input
          className="bg-transparent text-[#0F2A3D] placeholder-[#1A4562]/50 p-3 flex-1 outline-none text-sm sm:text-base"
          placeholder="Search programmes..."
          value={search}
          onChange={e => setSearch(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
        />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <FilterDropdown
          label="All Categories"
          options={categoryOptions}
          value={category}
          onChange={setCategory}
          className="flex-1"
        />
        <FilterDropdown
          label="All"
          options={typeOptions}
          value={programmeType}
          onChange={setProgrammeType}
          className="flex-1"
        />
        <FilterDropdown
          label="All"
          options={participationOptions}
          value={participation}
          onChange={setParticipation}
          className="flex-1"
        />
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && <p className="text-black text-center mt-8">No programmes found.</p>}
        {filtered.map(prog => (
          <div
            key={prog.id}
            onClick={() => navigate(`/programmes/${prog.id}`)}
            className="bg-oceanTint rounded-xl p-4 flex justify-between items-center cursor-pointer border border-white/40 shadow-md shadow-black/25 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.99] transition-all duration-200"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[#0F2A3D] font-medium text-sm sm:text-base truncate">{resultNoMap[prog.id] ? <span className="text-[#0F2A3D] font-bold text-base sm:text-lg mr-2">#{resultNoMap[prog.id]}</span> : null}{prog.name}</p>
              <p className="text-[#1A4562] text-xs sm:text-sm">{prog.category} · {getProgrammeType(prog) || 'Unspecified'}{getParticipationType(prog) ? ` · ${getParticipationType(prog)}` : ''}</p>
            </div>
            {prog.isFinished
              ? <span className="flex items-center gap-1 text-[#0B6E3B] font-semibold text-xs shrink-0 ml-2"><CheckCircle size={14} /> Finished</span>
              : <span className="flex items-center gap-1 text-[#A61E18] font-semibold text-xs shrink-0 ml-2"><XCircle size={14} /> Unfinished</span>}
          </div>
        ))}
      </div>
    </div>
  )
}