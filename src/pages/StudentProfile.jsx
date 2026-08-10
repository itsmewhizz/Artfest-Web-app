import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { getStudentById, getProgrammeById, getResultByProgrammeId, getStudentPoints, getTeams } from '../supabase/queries'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import { ArrowLeft, Download } from 'lucide-react'
import useCountUp from '../hooks/useCountUp'
import ResultPoster from '../components/ResultPoster'
import StudentAvatar from '../components/StudentAvatar'

function PointsDisplay({ total }) {
  const count = useCountUp(total, 1.5)
  return <span>{count}</span>
}

export default function StudentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [teams, setTeams] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [results, setResults] = useState({})
  const [totalPoints, setTotalPoints] = useState(0)
  const [activeTab, setActiveTab] = useState('completed')
  const [posterData, setPosterData] = useState(null)
  const [studentPhotos, setStudentPhotos] = useState({})
  const [catFilter, setCatFilter] = useState('')
  const [showCatFilter, setShowCatFilter] = useState(false)

  useEffect(() => {
    getTeams().then(setTeams)
  }, [])

  useEffect(() => {
    getStudentById(id).then(async (s) => {
      setStudent(s)

      let progIds = []
      if (s?.programmeIds != null) {
        const raw = s.programmeIds
        progIds = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : [])
      }

      if (progIds.length > 0) {
        const progs = await Promise.all(progIds.map(pid => getProgrammeById(pid)))
        setProgrammes(progs.filter(Boolean))
        const resMap = {}
        for (const pid of progIds) {
          const r = await getResultByProgrammeId(pid)
          if (r) resMap[pid] = r
        }
        setResults(resMap)
      } else {
        const { data: allResults } = await supabase.from('results').select('*')
        if (allResults) {
          const seen = new Set()
          const resMap = {}
          for (const r of allResults) {
            const match = [r.first, r.second, r.third].find(p => p?.studentId === id)
            if (match && !seen.has(r.programmeId)) {
              seen.add(r.programmeId)
              resMap[r.programmeId] = r
            }
          }
          const found = [...seen]
          if (found.length > 0) {
            const progs = await Promise.all(found.map(pid => getProgrammeById(pid)))
            setProgrammes(progs.filter(Boolean))
            setResults(resMap)
          }
        }
      }
      const pts = await getStudentPoints(id)
      setTotalPoints(pts)
    })
  }, [id])

  useEffect(() => {
    if (!posterData?.result) return
    const r = posterData.result
    const ids = [r.first?.studentId, r.second?.studentId, r.third?.studentId].filter(Boolean)
    if (ids.length === 0) return
    supabase.from('students').select('id, photoURL').in('id', ids).then(({ data }) => {
      const map = {}
      data?.forEach(s => { map[s.id] = s.photoURL })
      setStudentPhotos(map)
    })
  }, [posterData])

  if (!student) return <div className="text-mainText text-center mt-20">Loading...</div>

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]))
  const finished = programmes.filter(p => p.isFinished)
  const pending = programmes.filter(p => !p.isFinished)
  const total = programmes.length
  const percent = total > 0 ? Math.round((finished.length / total) * 100) : 0

  return (
    <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-mainText mb-4 hover:opacity-80 transition">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="bg-card rounded-2xl p-5 sm:p-6 flex flex-col items-center mb-6 shadow-lg border border-secondary/30">
        <StudentAvatar src={student.photoURL} name={student.name} className="w-20 h-20 sm:w-24 sm:h-24 mb-3" />
        <h2 className="text-mainText font-poppins font-bold text-lg sm:text-xl">{student.name}</h2>
        <p className="text-mutedText text-sm sm:text-base">{student.chestNo ? `Chest No: ${student.chestNo} · ` : ''}{teamMap[student.team] || student.team} · {student.class}</p>

        <div className="w-24 h-24 sm:w-28 sm:h-28 mt-4">
          <CircularProgressbar
            value={percent}
            text={`${finished.length}/${total}`}
            styles={buildStyles({
              textColor: '#EAF4FA',
              pathColor: '#7FC3EA',
              trailColor: 'rgba(234,244,250,0.15)',
              pathTransitionDuration: 1,
            })}
          />
        </div>
        <p className="text-mutedText text-xs sm:text-sm mt-2">Programmes participated</p>
        <div
          className="text-mainText font-bold text-base sm:text-lg mt-1 cursor-pointer select-none hover:opacity-80 transition"
          onClick={() => setShowCatFilter(prev => !prev)}
        >
          <PointsDisplay total={totalPoints} /> points earned
        </div>
        {showCatFilter && (
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mt-3">
            <button
              onClick={() => setCatFilter('')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                !catFilter ? 'bg-primary text-white' : 'bg-secondary/15 text-mutedText hover:bg-secondary/25'
              }`}
            >
              All
            </button>
            {['Minor', 'HS', 'Premier', 'Sub Junior', 'Junior', 'General Cat-A', 'General Cat-B'].map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                  catFilter === cat ? 'bg-primary text-white' : 'bg-secondary/15 text-mutedText hover:bg-secondary/25'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex border-b border-secondary/30 mb-4">
        {['completed', 'pending'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 pb-3 text-sm font-semibold transition capitalize ${activeTab === tab ? 'border-b-2 border-mainText text-mainText' : 'text-mutedText'}`}
          >
            {tab} ({tab === 'completed' ? finished.length : pending.length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(activeTab === 'completed' ? finished : pending).filter(p => !catFilter || p.category === catFilter).length === 0 && (
          <p className="text-mutedText text-center mt-8">
            {activeTab === 'completed' ? 'No completed programmes yet.' : 'All caught up!'}
          </p>
        )}
        {(activeTab === 'completed' ? finished : pending).filter(p => !catFilter || p.category === catFilter).map(prog => {
          const result = results[prog.id]
          const placement = result
            ? [result.first, result.second, result.third].find(p => p?.studentId === student.id)
            : null

          return (
            <div
              key={prog.id}
              className="bg-card rounded-xl p-4 cursor-pointer hover:bg-secondary/10 transition shadow-lg border border-secondary/30"
              onClick={() => {
                if (result) {
                  setPosterData({ programme: prog, result })
                } else {
                  navigate(`/programmes/${prog.id}`)
                }
              }}
            >
              <div className="flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-mainText font-medium text-sm sm:text-base truncate">{result?.resultNo ? <span className="text-accent font-bold text-base sm:text-lg mr-2">#{result.resultNo}</span> : null}{prog.name}</p>
                  <p className="text-mutedText text-xs sm:text-sm">{prog.category}</p>
                </div>
                {placement && (
                  <span className="text-accent text-sm font-semibold shrink-0 ml-2">
                    {placement.points || 0} points
                  </span>
                )}
                {!placement && result && (
                  <span className="text-mutedText text-xs italic shrink-0 ml-2">Participated</span>
                )}
                {!placement && !result && (
                  <span className="text-mutedText text-xs italic shrink-0 ml-2">Registered</span>
                )}
              </div>
              {result && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPosterData({ programme: prog, result }) }}
                  className="mt-2 flex items-center gap-1 text-mainText text-xs"
                >
                  <Download size={14} /> Download Poster
                </button>
              )}
            </div>
          )
        })}
      </div>

      {posterData && (
        <ResultPoster
          programme={posterData.programme}
          result={posterData.result}
          studentPhotos={studentPhotos}
          onClose={() => setPosterData(null)}
        />
      )}
    </div>
  )
}
