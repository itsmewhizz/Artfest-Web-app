import { useEffect, useState, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getFeaturedSpotlight, getSpotlight, getTeamCategoryPoints } from '../supabase/queries'
import { ChevronDown, Download, ArrowRight } from 'lucide-react'
import { useToast } from '../components/Toast'
import TeamBar from '../components/TeamBar'
import HeroAnimation from '../components/HeroAnimation'

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [allImages, setAllImages] = useState([])
  const [teamData, setTeamData] = useState([])
  const [categories, setCategories] = useState([])
  const [current, setCurrent] = useState(0)
  const [expandedTeamId, setExpandedTeamId] = useState(null)
  const [posters, setPosters] = useState({})
  const [expandedPoster, setExpandedPoster] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const intervalRef = useRef(null)
  const toast = useToast()
  const teamsRef = useRef(null)
  const aboutRef = useRef(null)

  const sparkles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 10 + 8,
        delay: Math.random() * 12,
      })),
    []
  )

  const embers = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1.5,
        duration: Math.random() * 7 + 7,
        delay: Math.random() * 10,
      })),
    []
  )

  useEffect(() => {
    getFeaturedSpotlight().then(setFeatured)
    getSpotlight().then(setAllImages)
    getTeamCategoryPoints().then(({ teamData: data, categories: cats }) => {
      const sorted = [...data].sort((a, b) => b.totalPoints - a.totalPoints)
      setTeamData(sorted)
      setCategories(cats)
    })

  }, [])

  useEffect(() => {
    const loadPosters = () => {
      try {
        const raw = localStorage.getItem('result_posters')
        setPosters(raw ? JSON.parse(raw) : {})
      } catch {
        setPosters({})
      }
    }
    loadPosters()
    window.addEventListener('storage', loadPosters)
    return () => window.removeEventListener('storage', loadPosters)
  }, [])

  useEffect(() => {
    if (location.state?.scrollTo === 'about') {
      setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [location.state])

  useEffect(() => {
    if (featured.length === 0) return
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % featured.length)
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [featured])

  const maxPoints = Math.max(...teamData.map(t => t.totalPoints || 0), 1)
  const maxBarHeight = 300

  const handleDownloadImage = async (url, name) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name || 'spotlight.jpg'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      toast('Download failed, try again', 'error')
    }
  }

  const handleDownloadPoster = (count) => {
    const poster = posters[count]
    if (!poster?.imageUrl) {
      toast('No poster is available for this total yet.', 'error')
      return
    }

    const a = document.createElement('a')
    a.href = poster.imageUrl
    a.download = `total_result_${count}.png`
    a.click()
  }

  const publishedCounts = Object.entries(posters)
    .filter(([, poster]) => poster?.published && poster?.imageUrl)
    .map(([count]) => count)
    .sort((a, b) => Number(a) - Number(b))

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen">

      {/* ── Transparent Top Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 lg:px-16 py-4 lg:py-5">
        <button
          type="button"
          aria-label="Go to the festival home"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group flex flex-col items-start leading-none select-none text-mainText focus:outline-none"
        >
          <span className="font-display font-black text-[1.05rem] sm:text-[1.25rem] md:text-[1.45rem] lg:text-[1.55rem] tracking-[0.16em] text-mainText/95 uppercase">
            ISRA
          </span>
          <span className="font-display text-[0.48rem] sm:text-[0.56rem] md:text-[0.62rem] lg:text-[0.68rem] tracking-[0.34em] text-mainText/85 uppercase">
            Festival
          </span>
        </button>
      </nav>

      {/* ── Full-Viewport Hero ── */}
      <section className="relative h-screen w-full overflow-hidden">
        <HeroAnimation spotlightImages={featured.length > 0 ? featured : allImages} />

        <div className="aurora-layer">
          <div className="aurora-blob aurora-a" />
          <div className="aurora-blob aurora-b" />
          <div className="aurora-blob aurora-c" />
        </div>

        <div className="sparkle-field">
          {sparkles.map(s => (
            <span
              key={s.id}
              className="sparkle"
              style={{
                left: `${s.left}%`,
                width: s.size,
                height: s.size,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-mainText mb-4 leading-tight">
            Rendezvous
          </h1>
          <p className="text-lg md:text-xl text-mainText/70 font-display italic mb-10 max-w-xl">
            ISRA life Festival 2026 — Tracked, Celebrated, Remembered
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="rounded-full bg-white/10 backdrop-blur-xl border border-white/20 p-1.5 shadow-lg">
              <button
                onClick={() => scrollTo(teamsRef)}
                className="px-7 py-2.5 bg-[#CBDDE9] text-[#0F2A3D] rounded-full font-semibold font-inter hover:opacity-90 transition"
              >
                View Results
              </button>
            </div>
            <button
              onClick={() => scrollTo(aboutRef)}
              className="px-8 py-3 border border-white/70 text-white rounded-full font-semibold font-inter hover:bg-white/10 transition"
            >
              About the Fest
            </button>
          </div>
        </div>

      </section>

      {/* ── Content Below Hero ── */}
      <div className="bg-mainBackground p-4 md:p-8 lg:p-12 max-w-7xl mx-auto relative z-20">

        {/* Team Standings */}
        <div ref={teamsRef} className="hp-wrapper-gloss p-4 md:p-6 w-full mb-8 scroll-mt-24">
          <div className="ember-field">
            {embers.map(e => (
              <span
                key={e.id}
                className="ember"
                style={{
                  left: `${e.left}%`,
                  width: e.size,
                  height: e.size,
                  animationDuration: `${e.duration}s`,
                  animationDelay: `${e.delay}s`,
                }}
              />
            ))}
          </div>
          <h2 className="relative z-10 text-2xl md:text-3xl font-display font-bold text-mainText mb-6 text-center">
            Team <span className="text-mainText">Standings</span>
          </h2>
          <div className="relative z-10 flex flex-wrap justify-center items-end gap-4 sm:gap-6">
          {teamData.map((team, i) => {
            const barHeight = Math.max(70, (team.totalPoints / maxPoints) * maxBarHeight)
            const isExpanded = expandedTeamId === team.id

            return (
              <TeamBar
                key={team.id}
                team={team}
                categories={categories}
                displayPoints={team.totalPoints}
                barHeight={barHeight}
                isExpanded={isExpanded}
                index={i}
                onToggle={() => setExpandedTeamId(isExpanded ? null : team.id)}
              />
            )
          })}
        </div>
        </div>

        {/* Download Total result */}
        <div className="mb-8">
          <h3 className="text-xl md:text-2xl font-display text-black mb-4">Download Total result</h3>
          {publishedCounts.length === 0 ? (
            <p className="text-black text-sm">No result posters have been published yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-w-md">
              {publishedCounts.map(count => (
                <div key={count} className="bg-card rounded-xl p-3 border border-secondary/30">
                  <button
                    onClick={() => setExpandedPoster(expandedPoster === count ? null : count)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="text-black font-semibold">Through programme {count}</span>
                    <ChevronDown size={16} className={`text-black transition-transform ${expandedPoster === count ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedPoster === count && (
                    <div className="mt-3 pt-3 border-t border-secondary/30">
                      <button
                        onClick={() => handleDownloadPoster(count)}
                        className="flex items-center gap-2 bg-success hover:bg-success/90 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gallery */}
        {allImages.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-display text-mainText">Gallery</h3>
              <button
                onClick={() => navigate('/gallery')}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition"
              >
                View Gallery <ArrowRight size={15} />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {allImages.slice(0, 6).map(img => (
                <div key={img.id} className="relative group">
                  <img src={img.imageURL} alt={img.caption || ''} className="w-full h-24 sm:h-32 md:h-36 rounded-xl object-cover" />
                  <button
                    onClick={() => handleDownloadImage(img.imageURL, `spotlight_${img.id}.jpg`)}
                    className="absolute bottom-1.5 right-1.5 bg-black/60 hover:bg-black/80 p-1 rounded-lg transition"
                  >
                    <Download size={12} color="white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About the Fest */}
        <div ref={aboutRef} id="about" className="mb-10 text-center scroll-mt-24">
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-display text-black mb-6">About the Fest</h3>
          <div className="max-w-2xl mx-auto space-y-5 px-2 sm:px-0">
            <p className="text-black text-sm sm:text-base italic leading-loose">
              Campus Art Fest is an annual celebration of creativity and talent, bringing together participants from all departments to showcase their skills in dance, music, art, literary arts, and stage performances. Our mission is to Track, Celebrate, and Remember every moment of this vibrant festival.
            </p>
            <p className="text-black text-sm sm:text-base italic leading-loose">
              With real-time score tracking, downloadable result posters, and a spotlight gallery, the Art Fest platform keeps everyone connected — from competitors checking their results to audiences cheering for their favorite teams.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 mb-6 text-center text-black text-xs sm:text-sm font-inter">
          © 2026 Campus Art Fest
          <br />
          <i>-Farhan Musthafa-</i>
        </div>
      </div>
    </div>
  )
}
