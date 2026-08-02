import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { AlertCircle, ArrowLeft, Download, Image } from 'lucide-react'
import { getAllResults, getProgrammes, getStudents, getTeams } from '../../supabase/queries'

const STORAGE_KEY = 'result_posters'

const posterStyle = {
  container: 'bg-gradient-to-br from-fuchsia-700 via-violet-700 to-amber-500 rounded-3xl p-6 text-white',
  title: 'text-3xl font-extrabold text-white',
  subtitle: 'text-sm text-amber-100 mt-2',
  row: 'bg-white/15 rounded-2xl border border-white/30 p-3 mb-3 backdrop-blur',
  team: 'text-white font-semibold',
  points: 'text-amber-100 text-sm',
  badge: 'text-white font-bold drop-shadow',
}

export default function AdminResultPoster() {
  const navigate = useNavigate()
  const previewRef = useRef(null)
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [results, setResults] = useState([])
  const [programmeCount, setProgrammeCount] = useState(5)
  const [validationMessage, setValidationMessage] = useState('')
  const [previewTeams, setPreviewTeams] = useState([])
  const [posters, setPosters] = useState({})
  const [message, setMessage] = useState('')

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

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setPosters(JSON.parse(raw))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const orderedPrograms = useMemo(() => {
    return [...programmes].sort((a, b) => Number(a.id) - Number(b.id))
  }, [programmes])

  const resultByProgramme = useMemo(() => {
    const map = {}
    results.forEach(result => {
      map[result.programmeId] = result
    })
    return map
  }, [results])

  const studentMap = useMemo(() => {
    const map = {}
    students.forEach(student => { map[student.id] = student })
    return map
  }, [students])

  const teamNameToId = useMemo(() => {
    const map = {}
    teams.forEach(team => { map[team.name] = team.id })
    return map
  }, [teams])

  const counts = useMemo(() => {
    return Object.keys(posters).sort((a, b) => Number(a) - Number(b))
  }, [posters])

  const handleProceed = async (e) => {
    e.preventDefault()
    const count = Number(programmeCount)

    if (!Number.isFinite(count) || count <= 0 || count % 5 !== 0) {
      setValidationMessage('Programme count must be a positive multiple of 5.')
      return
    }

    if (count > orderedPrograms.length) {
      setValidationMessage(`You only have ${orderedPrograms.length} programmes in the current dataset.`)
      return
    }

    setValidationMessage('')

    const selectedPrograms = orderedPrograms.slice(0, count)
    const teamTotals = teams.map(team => {
      let total = 0
      selectedPrograms.forEach(prog => {
        const result = resultByProgramme[prog.id]
        if (!result) return
        const placements = [result.first, result.second, result.third]
        placements.forEach(placement => {
          if (!placement?.studentId) return
          const student = studentMap[placement.studentId]
          const resolvedTeamId = teamNameToId[student?.team] || student?.team
          if (resolvedTeamId === team.id) {
            total += Number(placement.points) || 0
          }
        })
      })
      return { teamName: team.name, totalPoints: total }
    }).sort((a, b) => b.totalPoints - a.totalPoints)

    setPreviewTeams(teamTotals)

    await new Promise(resolve => setTimeout(resolve, 30))
    const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true })
    const imageUrl = canvas.toDataURL('image/png')

    const next = {
      ...posters,
      [count]: {
        programmeCount: count,
        generatedAt: new Date().toISOString(),
        imageUrl,
        entries: teamTotals,
        published: false,
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setPosters(next)
    setMessage(`Generated cumulative poster through programme ${count}. Toggle it on to publish it for users.`)
  }

  const togglePublished = (count) => {
    const poster = posters[count]
    if (!poster) return
    const next = { ...posters, [count]: { ...poster, published: !poster.published } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setPosters(next)
  }

  return (
    <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-mainText mb-4 hover:opacity-80 transition">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="bg-white/10 rounded-xl p-3">
          <Image size={22} className="text-mainText" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Result Poster</h2>
          <p className="text-mutedText text-sm">Generate a cumulative team poster and publish it to the user's downloads area.</p>
        </div>
      </div>

      <form onSubmit={handleProceed} className="bg-card rounded-2xl p-4 sm:p-5 mb-6 shadow-lg border border-secondary/30">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-mutedText text-sm font-semibold block mb-2">Programme count</label>
            <input
              type="number"
              min="5"
              step="5"
              value={programmeCount}
              onChange={(e) => setProgrammeCount(e.target.value)}
              className="w-full rounded-xl bg-black/20 text-mainText px-4 py-3 outline-none border border-secondary/30 focus:border-mainText"
              placeholder="5, 10, 15, ..."
            />
            <p className="text-xs text-mutedText mt-2">Only multiples of 5 are accepted.</p>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-success hover:bg-success/90 text-white font-bold rounded-xl px-5 py-3 transition"
            >
              Proceed
            </button>
          </div>
        </div>

        {validationMessage && (
          <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} /> {validationMessage}
          </div>
        )}

        {message && (
          <div className="mt-4 flex items-center gap-2 text-success text-sm">
            <Download size={16} /> {message}
          </div>
        )}
      </form>

      <div className="bg-card rounded-2xl p-4 sm:p-5 mb-6 shadow-lg border border-secondary/30">
        <h3 className="text-mainText font-bold mb-4">Preview</h3>
        <div ref={previewRef} className={`${posterStyle.container} w-full max-w-md mx-auto`}>
          <div className={posterStyle.title}>Cumulative Team Results</div>
          <div className={posterStyle.subtitle}>First {programmeCount} Programmes · {new Date().toLocaleDateString()}</div>
          <div className="mt-5">
            {previewTeams.length === 0 ? (
              <p className="text-sm opacity-60">Enter a count and press Proceed to preview the cumulative poster.</p>
            ) : (
              previewTeams.map((team, idx) => (
                <div key={`${team.teamName}-${idx}`} className={posterStyle.row}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={posterStyle.badge}>#{idx + 1}</span>
                      <span className={posterStyle.team}>{team.teamName}</span>
                    </div>
                    <span className={posterStyle.points}>{team.totalPoints} pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-lg border border-secondary/30">
        <h3 className="text-mainText font-bold mb-4">Generated Posters</h3>
        {counts.length === 0 ? (
          <p className="text-mutedText text-sm">No posters generated yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {counts.map(count => {
              const poster = posters[count]
              return (
                <div key={count} className="flex items-center justify-between rounded-xl p-3 border border-secondary/30 bg-black/10">
                  <span className="text-mainText font-semibold">{count}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold ${poster.published ? 'text-success' : 'text-mutedText'}`}>
                      {poster.published ? 'Published' : 'Unpublished'}
                    </span>
                    <button
                      onClick={() => togglePublished(count)}
                      aria-label={poster.published ? 'Unpublish' : 'Publish'}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${poster.published ? 'bg-green-500' : 'bg-white/20'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${poster.published ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
