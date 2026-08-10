import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTeams, getTeamPlacements, getProgrammeById, getStudentsByTeamId, getStudentResults } from '../supabase/queries'
import { ArrowLeft, Trophy } from 'lucide-react'

const CATEGORIES = ['Minor', 'HS', 'Premier', 'Sub Junior', 'Junior', 'General Cat-A', 'General Cat-B']
const CATEGORY_COLORS = {
  Minor:          { light: '#55EFC4', dark: '#00B894' },
  HS:             { light: '#FF7675', dark: '#D63031' },
  Premier:        { light: '#74B9FF', dark: '#0984E3' },
  'Sub Junior':   { light: '#A29BFE', dark: '#6C5CE7' },
  Junior:         { light: '#FDCB6E', dark: '#D68910' },
  'General Cat-A': { light: '#D1D5DB', dark: '#9CA3AF' },
  'General Cat-B': { light: '#FFFFFF', dark: '#F5F5F5' },
}

export default function TeamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [placements, setPlacements] = useState({ first: [], second: [], third: [] })
  const [programmeNames, setProgrammeNames] = useState({})
  const [programmeCategories, setProgrammeCategories] = useState({})
  const [students, setStudents] = useState([])
  const [studentResults, setStudentResults] = useState({})
  const [mainTab, setMainTab] = useState('students')
  const [placeTab, setPlaceTab] = useState('first')
  const [catFilter, setCatFilter] = useState('')

  const placeTabs = [
    { key: 'first', label: '1st Place', icon: '🥇', color: 'text-accent' },
    { key: 'second', label: '2nd Place', icon: '🥈', color: 'text-gray-300' },
    { key: 'third', label: '3rd Place', icon: '🥉', color: 'text-amber-700' },
  ]

  useEffect(() => {
    getTeams().then(teams => {
      const t = teams.find(t => t.id === id)
      setTeam(t)
    })
    getTeamPlacements(id).then(async (p) => {
      setPlacements(p)
      const names = {}
      const cats = {}
      const allResults = [...(p.first || []), ...(p.second || []), ...(p.third || [])]
      for (const r of allResults) {
        const prog = await getProgrammeById(r.programmeId)
        if (prog) {
          names[r.programmeId] = prog.name
          cats[r.programmeId] = prog.category
        }
      }
      setProgrammeNames(names)
      setProgrammeCategories(cats)
    })
    getStudentsByTeamId(id).then(async (stuList) => {
      setStudents(stuList)
      const resMap = {}
      const cats = { ...programmeCategories }
      for (const s of stuList) {
        const results = await getStudentResults(s.id)
        resMap[s.id] = results
        for (const r of results) {
          if (!cats[r.programmeId]) {
            const prog = await getProgrammeById(r.programmeId)
            if (prog) cats[r.programmeId] = prog.category
          }
        }
      }
      setStudentResults(resMap)
      setProgrammeCategories(cats)
    })
  }, [id])

  if (!team) return <div className="text-mainText text-center mt-20">Loading...</div>

  const currentList = placements[placeTab] || []

  return (
    <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate('/teams')} className="flex items-center gap-2 text-mainText mb-4 hover:opacity-80 transition">
        <ArrowLeft size={18} /> Back to Teams
      </button>

      <div className="bg-card rounded-2xl p-5 sm:p-6 mb-6 text-center shadow-lg border border-secondary/30">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText" style={{ color: team.color }}>{team.name}</h2>
        <p className="text-mutedText text-base sm:text-lg mt-1">{team.totalPoints || 0} points</p>
      </div>

      <div className="flex border-b border-secondary/30 mb-4">
        {['students', 'places'].map(key => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex-1 pb-3 text-sm font-semibold capitalize transition ${mainTab === key ? 'border-b-2 border-mainText text-mainText' : 'text-mutedText'}`}
          >
            {key}
          </button>
        ))}
      </div>

      {mainTab === 'students' ? (
        <div className="space-y-4">
          <div className="flex justify-center gap-1.5 flex-wrap">
            <button
              onClick={() => setCatFilter('')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${!catFilter ? 'bg-primary text-white shadow' : 'bg-secondary/15 text-mutedText'}`}
            >
              All
            </button>
            {CATEGORIES.map(cat => {
              const colors = CATEGORY_COLORS[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition ${catFilter === cat ? (cat === 'General Cat-B' ? 'text-gray-900 font-bold shadow' : 'text-white shadow') : 'bg-secondary/15 text-mutedText'}`}
                  style={catFilter === cat ? { background: `linear-gradient(135deg, ${colors.light}, ${colors.dark})` } : {}}
                >
                  {cat}
                </button>
              )
            })}
          </div>
          {(() => {
            const filteredStudents = students.filter(student => {
              if (!catFilter) return true
              const results = studentResults[student.id] || []
              return results.some(r => programmeCategories[r.programmeId] === catFilter)
            })
            if (filteredStudents.length === 0) {
              return <p className="text-mutedText text-center mt-8">No students in this team.</p>
            }
            return filteredStudents.map(student => {
              const results = studentResults[student.id] || []
              const filteredResults = catFilter ? results.filter(r => programmeCategories[r.programmeId] === catFilter) : results
              const totalPts = filteredResults.reduce((sum, r) => sum + (r.placement?.points || 0), 0)
              return (
                <div
                  key={student.id}
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="bg-card rounded-xl p-4 cursor-pointer hover:bg-secondary/10 transition shadow-lg border border-secondary/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                        {student.photoURL ? (
                          <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name?.charAt(0)?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-mainText font-semibold">{student.name}</p>
                        <p className="text-mutedText text-xs">{student.chestNo ? `Chest No: ${student.chestNo} · ` : ''}{student.class}</p>
                      </div>
                    </div>
                    <span className="text-accent font-bold">{totalPts} pts</span>
                  </div>
                  {filteredResults.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {filteredResults.map(r => (
                        <span key={r.id} className="text-xs bg-white/10 text-mainText px-2 py-1 rounded-full">
                          {programmeNames[r.programmeId] || 'Programme'} ({r.placement?.points || 0}pts)
                        </span>
                      ))}
                    </div>
                  )}
                  {filteredResults.length === 0 && (
                    <p className="text-mutedText text-xs mt-1">No results yet</p>
                  )}
                </div>
              )
            })
          })()}
        </div>
      ) : (
        <div>
          <div className="flex justify-center gap-3 mb-5">
            {placeTabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPlaceTab(key)}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
                  placeTab === key
                    ? 'bg-primary text-white shadow-lg shadow-black/40 scale-105'
                    : 'bg-secondary/15 text-mutedText hover:bg-secondary/25 hover:text-mainText'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {currentList.length === 0 && (
              <p className="text-mutedText text-center mt-8">No {placeTabs.find(t => t.key === placeTab)?.label.toLowerCase()} wins yet.</p>
            )}
            {currentList.map(result => (
              <div
                key={result.id}
                onClick={() => navigate(`/programmes/${result.programmeId}`)}
                className="bg-card rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/10 transition shadow-lg border border-secondary/30"
              >
                <div>
                  <p className="text-mainText font-medium">{result.resultNo ? <span className="text-accent font-bold text-base mr-1">#{result.resultNo}</span> : null}{programmeNames[result.programmeId] || 'Unknown Programme'}</p>
                  <p className="text-mutedText text-sm">
                    {result[placeTab]?.name} — {result[placeTab]?.points || 0} points
                  </p>
                </div>
                <Trophy size={20} color={placeTab === 'first' ? '#E8845C' : placeTab === 'second' ? '#A9C7D6' : '#D97706'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
