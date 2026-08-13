import { useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getFeaturedSpotlight, getSpotlight, getTeamCategoryPoints } from '../supabase/queries'
import { ArrowRight, ExternalLink, Users, CalendarDays, UserCheck, Layers } from 'lucide-react'
import HeroAnimation from '../components/HeroAnimation'
import TeamBar from '../components/TeamBar'
import useScrollReveal from '../hooks/useScrollReveal'

const stats = [
  { value: '3', label: 'Teams', icon: Users },
  { value: '3', label: 'Days', icon: CalendarDays },
  { value: '120+', label: 'Participants', icon: UserCheck },
  { value: '150+', label: 'Programmes', icon: Layers },
]

const teamMembers = [
  { name: 'Anwar Ahmed', role: 'Festival Chairman', initials: 'AA', tint: 'from-[#6366F1] to-[#7BEAFE]', photo: '/team/Anwar.jpg' },
  { name: 'Muhammed AbdulQadar', role: 'Festival Convenor', initials: 'MA', tint: 'from-[#7BEAFE] to-[#FFDA63]', photo: '/team/Mohammed.jpeg' },
  { name: 'Sayyid Mueen Hussain', role: 'Finance Convenor', initials: 'SM', tint: 'from-[#FFDA63] to-[#6366F1]', photo: '/team/Moinu.jpeg' },
  { name: 'Shammas Mujeeb', role: 'Vice Chairman', initials: 'SM', tint: 'from-[#6366F1] to-[#A78BFA]', photo: '/team/Shammas.jpeg' },
  { name: 'Midlaj Moideen', role: 'Vice Chairman', initials: 'MM', tint: 'from-[#A78BFA] to-[#7BEAFE]', photo: '/team/moidu.jpg' },
  { name: 'Afsal Sharafudheen', role: 'Joint Convenor', initials: 'AS', tint: 'from-[#7BEAFE] to-[#94A3B8]', photo: '/team/Afsal.jpg' },
  { name: 'Vahid', role: 'Joint Convenor', initials: 'v', tint: 'from-[#FFDA63] to-[#A78BFA]', photo: '/team/vahid.jpg' },
]

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [allImages, setAllImages] = useState([])
  const [teamData, setTeamData] = useState([])
  const [categories, setCategories] = useState([])
  const location = useLocation()
  const navigate = useNavigate()
  const teamsRef = useRef(null)
  const aboutRef = useRef(null)
  const teamsReveal = useScrollReveal()
  const statsReveal = useScrollReveal()
  const galleryReveal = useScrollReveal()
  const aboutReveal = useScrollReveal()
  const teamReveal = useScrollReveal()

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
    if (location.state?.scrollTo === 'about') {
      setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [location.state])

  const [expandedTeamId, setExpandedTeamId] = useState(null)
  const maxPoints = Math.max(...teamData.map(t => t.totalPoints || 0), 1)
  const maxBarHeight = 300

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
                onClick={() => navigate('/programmes')}
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
        <div
          ref={(el) => {
            teamsRef.current = el
            teamsReveal.ref(el)
          }}
          className={`hp-wrapper-gloss p-4 md:p-8 w-full mb-12 scroll-mt-24 reveal ${
            teamsReveal.visible ? 'reveal-visible' : ''
          }`}
        >
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
          <h2 className="relative z-10 text-2xl md:text-3xl font-playfair font-bold text-mainText mb-8 text-center">
            Team <span className="text-mainText">Standings</span>
          </h2>

          <div className="relative z-10 grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            {/* Left — team point stats bars */}
            <div className="flex flex-wrap justify-center items-end gap-4 sm:gap-6">
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

            {/* Right — Leading Teams ranked card */}
            <aside className="bg-card rounded-2xl border border-secondary/40 shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-secondary/30">
                <h3 className="font-playfair text-xl font-bold text-mainText">Leading Teams</h3>
              </div>
              <div className="px-5 py-2">
                {teamData.slice(0, 5).map((team, i) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-4 py-3 border-b border-secondary/20 last:border-0"
                  >
                    <span className={`font-playfair text-lg font-bold w-6 ${i === 0 ? 'text-accent' : 'text-mutedText'}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-mainText truncate">{team.name}</span>
                    <span className="ml-auto font-playfair font-bold text-accent">{team.totalPoints} pts</span>
                  </div>
                ))}
                {teamData.length === 0 && (
                  <p className="py-6 text-center text-mutedText text-sm">Loading standings…</p>
                )}
              </div>
            </aside>
          </div>
        </div>

        {/* Stats Blocks */}
        <div
          ref={statsReveal.ref}
          className={`mb-12 reveal ${statsReveal.visible ? 'reveal-visible' : ''}`}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map(stat => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="bg-card rounded-2xl border border-secondary/40 p-6 text-center cursor-pointer hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/40 transition-all duration-300"
                >
                  <Icon size={22} className="mx-auto mb-3 text-accent" />
                  <div className="font-playfair font-bold text-4xl md:text-5xl text-accent leading-none">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-xs md:text-sm uppercase tracking-[0.18em] text-mutedText font-semibold">
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gallery */}
        {allImages.length > 0 && (
          <div
            ref={galleryReveal.ref}
            className={`mb-12 reveal ${galleryReveal.visible ? 'reveal-visible' : ''}`}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-accent text-xs md:text-sm font-semibold uppercase tracking-[0.28em] mb-2">
                  From the Fest
                </p>
                <h3 className="text-4xl md:text-5xl font-playfair font-bold text-mainText leading-tight">
                  Gallery
                </h3>
                <p className="mt-2 text-sm md:text-base text-mutedText font-display italic max-w-md">
                  Scenes from ISRA life Festival 2026 as it unfolds.
                </p>
              </div>
              <button
                onClick={() => navigate('/gallery')}
                className="group flex items-center gap-2 text-accent text-xs md:text-sm font-semibold uppercase tracking-[0.22em] whitespace-nowrap mt-1 hover:opacity-80 transition"
              >
                View All
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {allImages.slice(0, 8).map(img => (
                <div key={img.id} className="relative overflow-hidden rounded-xl aspect-[4/3]">
                  <img
                    src={img.imageURL}
                    alt={img.caption || ''}
                    className="w-full h-full object-cover transition-transform duration-300 ease-out hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About the Fest */}
        <div
          ref={(el) => {
            aboutRef.current = el
            aboutReveal.ref(el)
          }}
          id="about"
          className={`mb-12 text-center scroll-mt-24 reveal ${aboutReveal.visible ? 'reveal-visible' : ''}`}
        >
          <span className="inline-block text-accent text-xs md:text-sm font-semibold uppercase tracking-[0.28em] border border-accent/50 rounded-full px-4 py-1.5 mb-5">
            About Fest
          </span>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-playfair font-bold text-mainText mb-6">
            26 Years of Legacy &amp; Vibe
          </h3>
          <div className="max-w-2xl mx-auto space-y-5 px-2 sm:px-0">
            <p className="text-mutedText text-sm sm:text-base italic leading-loose">
              Campus Art Fest is an annual celebration of creativity and talent, bringing together
              participants from all departments to showcase their skills in dance, music, art,
              literary arts, and stage performances. Our mission is to Track, Celebrate, and
              Remember every moment of this vibrant festival.
            </p>
            <p className="text-mutedText text-sm sm:text-base italic leading-loose">
              With real-time score tracking, downloadable result posters, and a spotlight gallery,
              the Art Fest platform keeps everyone connected — from competitors checking their
              results to audiences cheering for their favorite teams.
            </p>
          </div>
          <a
            href="https://www.youtube.com/@isra_media"
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 bg-primary hover:opacity-90 text-white px-8 py-3 rounded-full font-semibold font-inter transition"
          >
            Explore <ExternalLink size={16} />
          </a>
        </div>

        {/* Our Team */}
        <div
          ref={teamReveal.ref}
          className={`mb-12 text-center reveal ${teamReveal.visible ? 'reveal-visible' : ''}`}
        >
          <span className="inline-block text-accent text-xs md:text-sm font-semibold uppercase tracking-[0.28em] border border-accent/50 rounded-full px-4 py-1.5 mb-5">
            Our Team
          </span>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-playfair font-bold text-mainText mb-4">
            The Team Behind the Fest
          </h3>
          <p className="max-w-2xl mx-auto text-mutedText text-sm sm:text-base italic leading-loose mb-12 px-2">
            A passionate crew of organizers, coordinators, and volunteers who bring the festival
            to life — from stage lights to score sheets.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-10 place-items-center max-w-6xl mx-auto px-4">
            {teamMembers.map(member => (
              <div key={member.name} className="w-[150px] text-center">
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="mx-auto mb-3 h-20 w-20 rounded-full object-cover shadow-lg"
                  />
                ) : (
                  <div
                    className={`mx-auto mb-3 h-20 w-20 rounded-full bg-gradient-to-br ${member.tint} flex items-center justify-center font-playfair text-2xl font-bold text-white shadow-lg`}
                  >
                    {member.initials}
                  </div>
                )}
                <p className="font-semibold text-sm text-mainText">{member.name}</p>
                <p className="text-xs text-accent mt-1">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 mb-6 text-center text-mutedText text-xs sm:text-sm font-inter">
          © 2026 Campus Art Fest
          <br />
          <i>-Farhan Musthafa-</i>
        </div>
      </div>
    </div>
  )
}