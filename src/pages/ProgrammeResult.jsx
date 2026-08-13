import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { getProgrammeById, getResultByProgrammeId } from '../supabase/queries'
import { ArrowLeft, Trophy, Download } from 'lucide-react'
import ResultPoster from '../components/ResultPoster'
import StudentAvatar from '../components/StudentAvatar'

export default function ProgrammeResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [programme, setProgramme] = useState(null)
  const [result, setResult] = useState(null)
  const [studentPhotos, setStudentPhotos] = useState({})
  const [showPoster, setShowPoster] = useState(false)

  useEffect(() => {
    getProgrammeById(id).then(async (p) => {
      setProgramme(p)
      if (p?.isFinished) {
        const r = await getResultByProgrammeId(id)
        if (r) {
          const ids = [r.first?.studentId, r.second?.studentId, r.third?.studentId].filter(Boolean)
          if (ids.length > 0) {
            const { data: students } = await supabase.from('students').select('id, photoURL').in('id', ids)
            const map = {}
            students?.forEach(s => { map[s.id] = s.photoURL })
            setStudentPhotos(map)
          }
        }
        setResult(r)
      }
    })
  }, [id])

  if (!programme) return <div className="text-mainText text-center mt-20">Loading...</div>

  const getPhoto = (data) => studentPhotos[data?.studentId] || data?.photoURL

  const placements = [
    { label: '1st Place', data: result?.first, color: '#E8845C', medal: '🥇' },
    { label: '2nd Place', data: result?.second, color: '#A9C7D6', medal: '🥈' },
    { label: '3rd Place', data: result?.third, color: '#D97706', medal: '🥉' },
  ]

  return (
    <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-mainText mb-4 hover:opacity-80 transition">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="bg-card rounded-2xl p-5 mb-6 shadow-lg border border-secondary/30">
        <h2 className="text-lg sm:text-xl font-poppins font-bold text-mainText">{programme.name}</h2>
        <p className="text-mutedText text-sm sm:text-base">{result?.resultNo ? <span className="text-accent font-bold">#{result.resultNo}</span> : null} {programme.category} · {(programme.programmeType || programme.type || '')}{(programme.participationType || programme.participation_type) ? ` · ${programme.participationType || programme.participation_type}` : ''}</p>
        <span className={`mt-2 inline-block text-xs px-3 py-1 rounded-full ${programme.isFinished ? 'bg-success/20 text-success' : 'bg-red-500/15 text-red-400'}`}>
          {programme.isFinished ? 'Finished' : 'Pending'}
        </span>
      </div>

      {!programme.isFinished && (
        <p className="text-mutedText text-center">Results will be available after the programme is conducted.</p>
      )}

      {programme.isFinished && result && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base sm:text-lg font-poppins font-bold text-mainText flex items-center gap-2">
            <Trophy size={18} className="sm:w-5 sm:h-5" color="#E8845C" /> Results
          </h3>
          {placements.filter(p => p.data).map(({ label, data, color, medal }) => (
            <div key={label} className="bg-card rounded-xl p-4 flex items-center gap-3 sm:gap-4 shadow-lg border border-secondary/30">
              <span className="text-xl sm:text-2xl">{medal}</span>
              <StudentAvatar src={getPhoto(data)} name={data.name} className="w-10 h-10 sm:w-12 sm:h-12" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-bold" style={{ color }}>{label}</p>
                <p className="text-mainText font-medium text-sm sm:text-base truncate">{data.name}</p>
              </div>
              <span className="text-accent font-bold text-sm sm:text-base shrink-0 ml-1">{data.points || 0} points</span>
            </div>
          ))}

          <button
            onClick={() => setShowPoster(true)}
            className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 mt-2 hover:bg-primary/90 transition"
          >
            <Download size={18} /> Download Poster
          </button>
        </div>
      )}

      {showPoster && (
        <ResultPoster
          programme={programme}
          result={result}
          studentPhotos={studentPhotos}
          onClose={() => setShowPoster(false)}
        />
      )}
    </div>
  )
}
