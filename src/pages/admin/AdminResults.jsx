import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search, Trophy, Layers2 } from 'lucide-react'
import { getProgrammes, getStudents, getTeams, getAllResults } from '../../supabase/queries'

export default function AdminResults() {
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [results, setResults] = useState([])
  const [expandedResultId, setExpandedResultId] = useState(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState('100')

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

  const resultMap = useMemo(() => {
    const map = {}
    results.forEach(r => { if (r.programmeId) map[r.programmeId] = r })
    return map
  }, [results])

  // Build a programme-centric list: every programme gets a row, with result data or dashes
  const programmeRows = useMemo(() => {
    return programmes.map(prog => ({
      programme: prog,
      result: resultMap[prog.id] || null,
    }))
  }, [programmes, resultMap])

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return programmeRows

    return programmeRows.filter(({ programme, result }) => {
      const name = (result?.name || programme.name || '').toLowerCase()
      const number = String(result?.resultNo || '').toLowerCase()
      return name.includes(q) || number.includes(q)
    })
  }, [programmeRows, search])

  const totalResults = filteredResults.length
  const isAll = pageSize === 'all'
  const numericSize = isAll ? totalResults : Number(pageSize) || 100
  const totalPages = isAll ? 1 : Math.ceil(totalResults / numericSize) || 1
  const activePage = Math.min(currentPage, totalPages)
  const startRow = totalResults === 0 ? 0 : isAll ? 1 : (activePage - 1) * numericSize + 1
  const endRow = isAll ? totalResults : Math.min(activePage * numericSize, totalResults)
  const displayedResults = isAll ? filteredResults : filteredResults.slice(startRow - 1, endRow)

  const buildPlacementRows = (result) => {
    if (!result) return []
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
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Results (Read Only)</h2>
              <span className="bg-secondary/30 text-mainText text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {search.trim() ? `${filteredResults.length} of ${programmeRows.length} programmes` : `${programmeRows.length} programmes`}
              </span>
            </div>
            <p className="text-mutedText text-sm">Admin preview only. Judges remain the only write path for results.</p>
          </div>
        </div>
        <Link
          to="/admin/frames/templates"
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base shrink-0 bg-primary text-white hover:bg-primary/90"
        >
          <Layers2 size={16} className="sm:w-[18px] sm:h-[18px]" /> Templates
        </Link>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-sm border border-secondary/30">
          <label className="flex items-center gap-3 rounded-xl bg-black/20 border border-secondary/40 px-3 py-3">
            <Search size={16} className="text-mutedText" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              placeholder="Search by programme name or result no"
              className="w-full bg-transparent text-mainText placeholder:text-mutedText outline-none"
            />
          </label>
        </div>

        <div className="space-y-3">
          {displayedResults.length === 0 && <p className="text-mutedText text-center py-6">No matching results found.</p>}
          {displayedResults.map(({ programme: prog, result }) => {
            const isExpanded = expandedResultId === (result?.id || prog.id)
            const placementRows = buildPlacementRows(result)
            return (
              <div
                key={prog.id}
                onClick={() => setExpandedResultId(isExpanded ? null : (result?.id || prog.id))}
                className={`bg-card rounded-xl p-4 cursor-pointer transition-all duration-300 ease-in-out hover:bg-white/10 shadow-sm border border-secondary/30 ${isExpanded ? 'ring-2 ring-mainText' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-mainText font-semibold">
                      {result?.resultNo ? <span className="text-accent font-bold text-lg mr-2">#{result.resultNo}</span> : null}
                      {result?.name || prog.name || ''}
                    </p>
                    <p className="text-mutedText text-sm">{prog.category || ''}</p>
                  </div>
                  <div className="flex items-center gap-2 text-mutedText text-xs font-semibold">
                    {prog.isPublished ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/40">
                        <Eye size={13} /> Published
                      </span>
                    ) : result?.locked ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/40">
                        Awaiting Publish
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-mutedText border border-secondary/40">
                        No result
                      </span>
                    )}
                  </div>
                </div>

                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="bg-black/20 rounded-xl p-3 border border-secondary/40">
                      {placementRows.length === 0 ? (
                        <p className="text-mutedText text-sm text-center py-2 italic">No placement data yet — awaiting judge submission.</p>
                      ) : (
                        <div className="space-y-3">
                          {placementRows.map(row => (
                            <div key={row.key} className="rounded-lg border border-secondary/40 bg-card p-3 shadow-sm">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-accent font-bold">{row.label}</span>
                                <span className="text-mutedText">{row.points} pts · Grade {row.grade}</span>
                              </div>
                              <p className="text-mainText font-semibold mt-1">{row.chestNo ? <span className="text-accent font-bold mr-1.5">#{row.chestNo}</span> : null}{row.name}</p>
                              <p className="text-mutedText text-xs">{row.team}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-mutedText text-xs mt-4">This screen is preview-only. Any result submission or editing remains judge-controlled.</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-card rounded-xl p-4 border border-secondary/30 text-sm">
          <div className="text-mutedText">
            Showing <span className="font-semibold text-mainText">{startRow}–{endRow}</span> of <span className="font-semibold text-mainText">{totalResults}</span> programmes
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
      </div>
    </div>
  )
}
