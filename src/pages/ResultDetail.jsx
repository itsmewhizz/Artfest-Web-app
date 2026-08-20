import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { getProgrammeById, getResultByProgrammeId, getStudents, getTeams } from '../supabase/queries'
import { ArrowLeft, Trophy, Layers } from 'lucide-react'
import ResultPoster from '../components/ResultPoster'
import TemplatePosterModal from '../components/TemplatePosterModal'
import StudentAvatar from '../components/StudentAvatar'
import { loadTemplates } from '../utils/posterTemplates'

const MEDALS = [
  { label: '1st Place', color: '#E57F17', medal: '🥇' },
  { label: '2nd Place', color: '#9E9E9E', medal: '🥈' },
  { label: '3rd Place', color: '#8D6E63', medal: '🥉' },
]

export default function ResultDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [programme, setProgramme] = useState(null)
  const [result, setResult] = useState(null)
  const [studentPhotos, setStudentPhotos] = useState({})
  const [chestNos, setChestNos] = useState({})
  const [templates, setTemplates] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [showPoster, setShowPoster] = useState(false)

  // Shared template designs — used to auto-generate one poster per template.
  useEffect(() => {
    Promise.all([getStudents(), getTeams(), loadTemplates()]).then(([s, t, tpl]) => {
      setStudents(s || [])
      setTeams(t || [])
      setTemplates((tpl || []).filter(x => x?.type === 'result'))
    })
  }, [])

  useEffect(() => {
    getProgrammeById(id).then(async (p) => {
      setProgramme(p)
      if (p?.isFinished) {
        const r = await getResultByProgrammeId(id)
        if (r) {
          const ids = [r.first?.studentId, r.second?.studentId, r.third?.studentId].filter(Boolean)
          if (ids.length > 0) {
            const { data: students } = await supabase.from('students').select('id, photoURL, chestNo').in('id', ids)
            const photoMap = {}
            const chestMap = {}
            students?.forEach(s => {
              photoMap[s.id] = s.photoURL
              chestMap[s.id] = s.chestNo || ''
            })
            setStudentPhotos(photoMap)
            setChestNos(chestMap)
          }
        }
        setResult(r)
      }
    })
  }, [id])

  const studentMap = useMemo(() => { const m = {}; students.forEach(s => { m[s.id] = s }); return m }, [students])
  const teamNameToId = useMemo(() => { const m = {}; teams.forEach(t => { m[t.name] = t.id }); return m }, [teams])

  if (!programme) return <div className="text-mainText text-center mt-20">Loading...</div>

  const getPhoto = (data) => studentPhotos[data?.studentId] || data?.photoURL
  const getChest = (data) => chestNos[data?.studentId] || data?.chestNo || ''

  const placements = [
    { ...MEDALS[0], data: result?.first },
    { ...MEDALS[1], data: result?.second },
    { ...MEDALS[2], data: result?.third },
  ]

  return (
    <div className="min-h-screen bg-page p-4 md:p-6 lg:p-8 max-w-3xl mx-auto pt-24 sm:pt-28">
      <button onClick={() => navigate('/results')} className="flex items-center gap-2 text-mainText mb-4 hover:opacity-80 transition">
        <ArrowLeft size={18} /> Back to Results
      </button>

      <div className="postergen-card p-5 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-display font-bold text-mainText">
              {result?.resultNo ? <span className="text-accent font-bold text-base sm:text-lg mr-2">#{result.resultNo}</span> : null}
              {programme.name}
            </h2>
            <p className="text-textMute text-sm sm:text-base mt-1">
              {programme.category} · {(programme.programmeType || programme.type || 'Unspecified')}
              {(programme.participationType || programme.participation_type) ? ` · ${programme.participationType || programme.participation_type}` : ''}
            </p>
          </div>
          <span className={`mt-1 inline-block text-xs px-3 py-1 rounded-full ${programme.isFinished ? 'bg-[#EDE7F6] text-[#5E35B1]' : 'bg-[#E8DCF4] text-[#676375]'}`}>
            {programme.isFinished ? 'Finished' : 'Pending'}
          </span>
        </div>
      </div>

      {!programme.isFinished && (
        <p className="text-textMute text-center">Results will be available after the programme is conducted.</p>
      )}

      {programme.isFinished && result && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base sm:text-lg font-display font-bold text-mainText flex items-center gap-2">
            <Trophy size={18} color="#7C4DFF" /> Results
          </h3>
          {placements.filter(p => p.data).map(({ label, data, color, medal }) => (
            <div key={label} className="postergen-card p-4 flex items-center gap-3 sm:gap-4">
              <span className="text-xl sm:text-2xl">{medal}</span>
              <StudentAvatar src={getPhoto(data)} name={data.name} className="w-10 h-10 sm:w-12 sm:h-12" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-bold" style={{ color }}>{label}</p>
                <p className="text-mainText font-medium text-sm sm:text-base truncate">
                  {getChest(data) ? <span className="text-accent font-bold mr-1.5">#{getChest(data)}</span> : null}
                  {data.name}
                </p>
              </div>
              <span className="text-accent font-bold text-sm sm:text-base shrink-0 ml-1">{data.points || 0} points</span>
            </div>
          ))}

          <button
            onClick={() => setShowPoster(true)}
            className="btn-result w-full mt-2 p-3.5 text-base"
          >
            <Layers size={18} /> View Posters
          </button>
        </div>
      )}

      {showPoster && (
        templates.length > 0 ? (
          <TemplatePosterModal
            programme={programme}
            result={result}
            templates={templates}
            studentMap={studentMap}
            teamNameToId={teamNameToId}
            onClose={() => setShowPoster(false)}
          />
        ) : (
          <ResultPoster
            programme={programme}
            result={result}
            studentPhotos={studentPhotos}
            chestNos={chestNos}
            onClose={() => setShowPoster(false)}
          />
        )
      )}
    </div>
  )
}