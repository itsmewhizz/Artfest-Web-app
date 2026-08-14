import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProgrammes, getCategories, getAllResults, PROGRAMME_CATEGORIES } from '../supabase/queries'
import { CheckCircle2, Hourglass, Eye, ArrowLeft } from 'lucide-react'

function gradeFrom(points) {
  const p = Number(points)
  if (p === 10) return 'A+'
  if (p >= 8 && p <= 9) return 'A'
  if (p >= 6 && p <= 7) return 'B'
  if (p >= 4 && p <= 5) return 'C'
  return '-'
}

export default function Results() {
  const [programmes, setProgrammes] = useState([])
  const [resultNoMap, setResultNoMap] = useState({})
  const [gradeMap, setGradeMap] = useState({})
  const [orderedCategories, setOrderedCategories] = useState(PROGRAMME_CATEGORIES)
  const [category, setCategory] = useState('')
  const [unfinishedOnly, setUnfinishedOnly] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getProgrammes().then(setProgrammes)
    getCategories().then(({ programme }) => setOrderedCategories(programme))
    getAllResults().then(results => {
      const noMap = {}
      const gMap = {}
      results.forEach(r => {
        if (r.programmeId) noMap[r.programmeId] = r.resultNo
        const points = r.first?.points
        gMap[r.programmeId] = points != null ? gradeFrom(points) : '-'
      })
      setResultNoMap(noMap)
      setGradeMap(gMap)
    })
  }, [])

  const categories = [
    { value: '', label: 'All Categories' },
    ...orderedCategories.map(c => ({ value: c, label: c })),
  ]

  const filtered = programmes.filter(p => {
    const matchCat = category ? p.category === category : true
    const matchUnfinished = unfinishedOnly ? !p.isFinished : true
    return matchCat && matchUnfinished
  })

  // Finished (resulted) programmes sort by result number, then pending ones.
  const sorted = [...filtered].sort((a, b) => {
    const ra = resultNoMap[a.id] || 0
    const rb = resultNoMap[b.id] || 0
    if (ra && rb) return rb - ra
    if (ra) return -1
    if (rb) return 1
    return (a.name || '').localeCompare(b.name || '')
  })

  return (
    <div className="min-h-screen bg-page">
      {/* Transparent Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 lg:px-16 py-4 lg:py-5">
        <Link
          to="/"
          className="group flex flex-col items-start leading-none select-none text-mainText focus:outline-none"
        >
          <span className="font-brand font-black text-[1.05rem] sm:text-[1.2rem] tracking-[0.14em] text-purple uppercase">
            ISRA
          </span>
          <span className="font-brand text-[0.48rem] sm:text-[0.56rem] tracking-[0.3em] text-textMute uppercase">
            Festival
          </span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1 px-4 py-2 rounded-full bg-card border border-subtle text-mainText text-xs sm:text-sm font-semibold hover:bg-lavender transition"
        >
          <ArrowLeft size={16} /> Home
        </Link>
      </nav>

      <div className="bg-page p-4 md:p-8 lg:p-12 max-w-6xl mx-auto relative z-20 pt-24 sm:pt-28">
        {/* Hero glossy glass reflection layer */}
        <div className="hero-glass-reflection" />

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 bg-lavender text-textDark text-xs md:text-sm font-semibold uppercase tracking-[0.24em] rounded-full px-4 py-1.5 mb-4">
            Result &amp; Poster
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-mainText leading-tight mb-3">
            Results
          </h1>
          <p className="text-textMute text-sm sm:text-base font-display max-w-xl">
            Every result in one place — preview a programme and download its poster
            in Classic, Vibrant or Minimal style.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap mb-8">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`filter-btn ${category === cat.value ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
          <span className="w-px h-6 bg-subtle mx-1 hidden sm:block" />
          <button
            onClick={() => setUnfinishedOnly(u => !u)}
            className={`filter-btn ${unfinishedOnly ? 'active' : ''}`}
          >
            Unfinished
          </button>
        </div>

        {/* Result grid */}
        {sorted.length === 0 ? (
          <p className="text-textMute text-center mt-10">No results found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map(prog => {
              const no = resultNoMap[prog.id]
              return (
                <div key={prog.id} className="postergen-card flex flex-col">
                  <div className="preview-box px-5 py-4 flex items-center justify-between border-b border-subtle">
                    <span className="text-[10px] uppercase tracking-[0.24em] text-textMute">
                      {prog.isFinished ? 'Result' : 'Pending'}
                    </span>
                    <span className="font-display font-extrabold text-2xl text-resultNavy leading-none">
                      {no ? `#${no}` : '—'}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <h3 className="font-display font-bold text-lg text-mainText leading-snug line-clamp-2">
                      {prog.name}
                    </h3>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs sm:text-sm text-textMute font-medium">
                        {prog.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          prog.isFinished
                            ? 'bg-accent-purple-soft text-accent-purple-deep'
                            : 'bg-card-lavender text-text-muted'
                        }`}
                      >
                        {prog.isFinished ? (
                          <>
                            <CheckCircle2 size={12} /> Grade {gradeMap[prog.id] || '-'}
                          </>
                        ) : (
                          <>
                            <Hourglass size={12} /> Unfinished
                          </>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/results/${prog.id}`)}
                      className="btn-result w-full"
                    >
                      {prog.isFinished ? (
                        <>
                          <Eye size={16} /> Preview &amp; Download
                        </>
                      ) : (
                        <>
                          <Eye size={16} /> View Programme
                        </>
                      )}
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