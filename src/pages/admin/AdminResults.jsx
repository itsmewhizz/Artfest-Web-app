import { useEffect, useMemo, useState } from 'react'
import { Eye, Search, Trophy, Image } from 'lucide-react'
import { getAllResults, getProgrammes, getStudents, getTeams } from '../../supabase/queries'
import AdminResultPoster from './AdminResultPoster'

export default function AdminResults() {
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [results, setResults] = useState([])
  const [expandedResultId, setExpandedResultId] = useState(null)
  const [search, setSearch] = useState('')
  const [showPoster, setShowPoster] = useState(false)

  useEffect(() => {
    Promise.all([
      getProgrammes(),
      getStudents(),
      getTeams(),
      getAllResults(),
    ]).then(([progData, studentData, teamData, resultData]) => {
      setProgrammes(progData)
      setStudents(studentData)
      setTeams(teamData)
      setResults(resultData)
    })
  }, [])

  const teamMap = useMemo(() => {
    const map = {}
    teams.forEach(team => { map[team.id] = team.name })
    return map
  }, [teams])

  const programmeMap = useMemo(() => {
    const map = {}
    programmes.forEach(prog => { map[prog.id] = prog })
    return map
  }, [programmes])

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return results

    return results.filter(result => {
      const prog = programmeMap[result.programmeId]
      const name = (result.name || prog?.name || '').toLowerCase()
      const number = String(result.resultNo || '').toLowerCase()
      return name.includes(q) || number.includes(q)
    })
  }, [results, programmeMap, search])

  const buildPlacementRows = (result) => {
    const rows = []
    const addPlacement = (key, placement) => {
      if (!placement) return
      const student = students.find(s => s.id === placement.studentId)
      rows.push({
        key: `${result.id}-${key}`,
        label: key === 'first' ? '1st' : key === 'second' ? '2nd' : '3rd',
        name: placement.name,
        chestNo: student?.chestNo || '',
        team: teamMap[student?.team] || student?.team || '',
        points: placement.points || 0,
        grade: placement.grade || '-',
      })
    }
    addPlacement('first', result.first)
    addPlacement('second', result.second)
    addPlacement('third', result.third)
    return rows
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-card rounded-xl p-3 shadow-sm border border-secondary/30">
            <Trophy size={22} className="text-accent" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Results (Read Only)</h2>
            <p className="text-mutedText text-sm">Admin preview only. Judges remain the only write path for results.</p>
          </div>
        </div>
        <button
          onClick={() => setShowPoster(s => !s)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base shrink-0 ${
            showPoster
              ? 'bg-card border border-secondary/40 text-mainText hover:bg-white/10'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          <Image size={16} className="sm:w-[18px] sm:h-[18px]" /> {showPoster ? 'Hide Poster' : 'Generate Poster'}
        </button>
      </div>

      {showPoster && (
        <div className="mb-6">
          <AdminResultPoster />
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-sm border border-secondary/30">
          <label className="flex items-center gap-3 rounded-xl bg-black/20 border border-secondary/40 px-3 py-3">
            <Search size={16} className="text-mutedText" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by programme name or result no"
              className="w-full bg-transparent text-mainText placeholder:text-mutedText outline-none"
            />
          </label>
        </div>

        <div className="space-y-3">
          {filteredResults.length === 0 && <p className="text-mutedText text-center">No matching results found.</p>}
          {filteredResults.map(result => {
            const prog = programmeMap[result.programmeId]
            const isExpanded = expandedResultId === result.id
            return (
              <div
                key={result.id}
                onClick={() => setExpandedResultId(isExpanded ? null : result.id)}
                className={`bg-card rounded-xl p-4 cursor-pointer transition-all duration-300 ease-in-out hover:bg-white/10 shadow-sm border border-secondary/30 ${isExpanded ? 'ring-2 ring-mainText' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-mainText font-semibold">
                      {result.resultNo ? <span className="text-accent font-bold text-lg mr-2">#{result.resultNo}</span> : null}
                      {result.name || prog?.name || ''}
                    </p>
                    <p className="text-mutedText text-sm">{prog?.category || ''}</p>
                  </div>
                  <div className="flex items-center gap-2 text-mutedText text-xs font-semibold">
                    <Eye size={15} /> {isExpanded ? 'Collapse' : 'Preview'}
                  </div>
                </div>

                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="bg-black/20 rounded-xl p-3 border border-secondary/40">
                      <div className="space-y-3">
                        {buildPlacementRows(result).map(row => (
                          <div key={row.key} className="rounded-lg border border-secondary/40 bg-card p-3 shadow-sm">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-accent font-bold">{row.label}</span>
                              <span className="text-mutedText">{row.points} pts • Grade {row.grade}</span>
                            </div>
                            <p className="text-mainText font-semibold mt-1">{row.chestNo ? <span className="text-accent font-bold mr-1.5">#{row.chestNo}</span> : null}{row.name}</p>
                            <p className="text-mutedText text-xs">{row.team}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-mutedText text-xs mt-4">This screen is preview-only. Any result submission or editing remains judge-controlled.</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
