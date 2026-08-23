import { useEffect, useState } from 'react'
import { Shuffle, RefreshCw, Hash, Type, Dice5, UserCheck, ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useToast } from '../../components/Toast'
import ThemeToggle from '../../components/ThemeToggle'
import {
  getCategories,
  getProgrammes,
  getStudents,
  getTeams,
  getCodeAssignmentsForProgramme,
  upsertCodeAssignments,
  deleteCodeAssignmentsForProgramme,
  PROGRAMME_CATEGORIES,
} from '../../supabase/queries'

const MAX_CARDS = 60
const MAX_CODE_LETTERS = 26

const MODES = [
  {
    id: 'topic',
    label: 'Topic',
    icon: Hash,
    desc: 'Reveal entry-order numbers 1 to N',
  },
  {
    id: 'code',
    label: 'Code Letter',
    icon: Type,
    desc: 'Reveal entry-order letters A to Nth',
  },
  {
    id: 'assign',
    label: 'Assign',
    icon: UserCheck,
    desc: 'Code letter to participant',
  },
]

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildPool(mode, n) {
  return mode === 'code'
    ? Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))
    : Array.from({ length: n }, (_, i) => i + 1)
}

export default function AdminLots() {
  const [step, setStep] = useState('mode') // mode | setup | draw | assign_cat | assign_prog | assign_list
  const [mode, setMode] = useState('')
  const [count, setCount] = useState('')
  const [cards, setCards] = useState([])
  const [drawId, setDrawId] = useState(0)

  // Assign mode states
  const [categories, setCategories] = useState(PROGRAMME_CATEGORIES)
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedProg, setSelectedProg] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [assignments, setAssignments] = useState({}) // { studentId: letter }
  const [loadingAssign, setLoadingAssign] = useState(false)
  const [savingAssign, setSavingAssign] = useState(false)

  const toast = useToast()

  const flippedCount = cards.filter(c => c.flipped).length
  const maxForMode = mode === 'code' ? MAX_CODE_LETTERS : MAX_CARDS

  useEffect(() => {
    getCategories().then(({ programme }) => setCategories(programme))
    getProgrammes().then(setProgrammes)
    getStudents().then(setStudents)
    getTeams().then(setTeams)
  }, [])

  const teamMap = {}
  teams.forEach(t => { teamMap[t.id] = t.name })

  const pickMode = (id) => {
    setMode(id)
    setCount('')
    setCards([])
    if (id === 'assign') {
      setStep('assign_cat')
    } else {
      setStep('setup')
    }
  }

  const goToModes = () => {
    setStep('mode')
    setCount('')
    setCards([])
    setSelectedCat('')
    setSelectedProg(null)
    setCandidates([])
    setAssignments({})
  }

  const startDraw = () => {
    const n = parseInt(count, 10)
    if (!n || n < 1) return toast('Enter the number of candidates', 'error')
    if (n > maxForMode) {
      return toast(mode === 'code' ? 'Maximum 26 letters (A to Z)' : `Maximum ${MAX_CARDS} cards`, 'error')
    }
    const shuffled = shuffleArray(buildPool(mode, n))
    setCards(shuffled.map(value => ({ value, flipped: false })))
    setDrawId(id => id + 1)
    setStep('draw')
  }

  const flipCard = (index) => {
    setCards(prev => prev.map((c, i) => (i === index && !c.flipped ? { ...c, flipped: true } : c)))
  }

  const newDraw = () => {
    setCards([])
    setCount('')
    setDrawId(id => id + 1)
    setStep('setup')
  }

  // Assign mode navigation
  const selectCategory = (cat) => {
    setSelectedCat(cat)
    setStep('assign_prog')
  }

  const selectProgramme = async (prog) => {
    setSelectedProg(prog)
    setLoadingAssign(true)
    setStep('assign_list')

    // Find all enrolled candidates for this programme
    const enrolled = students
      .filter(s => Array.isArray(s.programmeIds) && s.programmeIds.includes(prog.id))
      .sort((a, b) => (Number(a.chestNo) || 0) - (Number(b.chestNo) || 0) || (a.name || '').localeCompare(b.name || ''))

    setCandidates(enrolled)

    // Load existing code assignments from database
    const existing = await getCodeAssignmentsForProgramme(prog.id)
    const map = {}
    existing.forEach(a => {
      if (a.participant_id && a.code_letter) {
        map[a.participant_id] = a.code_letter
      }
    })
    setAssignments(map)
    setLoadingAssign(false)
  }

  const handleAssignmentChange = (studentId, letter) => {
    setAssignments(prev => ({ ...prev, [studentId]: letter }))
  }

  const handleSaveAssignments = async () => {
    if (!selectedProg || candidates.length === 0) return

    // 1. Validate all candidates assigned
    const unassigned = candidates.filter(c => !assignments[c.id])
    if (unassigned.length > 0) {
      return toast(`Please assign a code letter for all candidates (${unassigned.length} missing)`, 'error')
    }

    // 2. Validate uniqueness of code letters
    const letterCounts = {}
    for (const c of candidates) {
      const l = assignments[c.id]
      if (l) {
        letterCounts[l] = (letterCounts[l] || 0) + 1
        if (letterCounts[l] > 1) {
          return toast(`Code Letter ${l} is already assigned to another participant.`, 'error')
        }
      }
    }

    setSavingAssign(true)
    try {
      // Clear previous and insert new
      await deleteCodeAssignmentsForProgramme(selectedProg.id)

      const payload = candidates.map(c => ({
        programme_id: selectedProg.id,
        participant_id: c.id,
        code_letter: assignments[c.id],
      }))

      const { error } = await upsertCodeAssignments(payload)
      if (error) throw error

      toast('Code letters assigned successfully!')
    } catch (err) {
      console.error('Save code assignments error:', err)
      toast('Failed to save code assignments: ' + (err.message || 'Server error'), 'error')
    } finally {
      setSavingAssign(false)
    }
  }

  const activeMode = MODES.find(m => m.id === mode)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Lot Draw &amp; Green Room</h2>
        <ThemeToggle />
      </div>
      <p className="text-mutedText text-sm mb-6">
        Draw entry order or assign stage performance code letters to candidates per programme.
      </p>

      {/* Mode selection screen */}
      {step === 'mode' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl">
          {MODES.map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => pickMode(id)}
              className="bg-card rounded-2xl p-5 flex flex-col items-center gap-2 sm:gap-3 hover:bg-secondary/10 transition text-center shadow-lg border border-secondary/30"
            >
              <Icon size={28} className="sm:w-8 sm:h-8" color="#7FC3EA" />
              <span className="text-mainText font-semibold text-sm sm:text-base">{label}</span>
              <span className="text-mutedText text-xs sm:text-sm">{desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Setup screen for Topic & Code modes */}
      {step === 'setup' && activeMode && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-2 bg-white/10 text-mainText px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold">
              <activeMode.icon size={14} className="sm:w-4 sm:h-4" /> {activeMode.label} mode
            </span>
            <button onClick={goToModes} className="text-mainText text-xs sm:text-sm underline hover:opacity-80 transition">
              Change Mode
            </button>
          </div>

          <div className="bg-card rounded-2xl p-4 max-w-md shadow-lg border border-secondary/30">
            <label className="text-mutedText text-sm block mb-2">Number of candidates</label>
            <input
              type="number"
              min="1"
              max={maxForMode}
              className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/30 focus:border-mainText text-sm sm:text-base"
              placeholder="e.g. 5"
              value={count}
              onChange={e => setCount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') startDraw() }}
            />
            <button
              onClick={startDraw}
              className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-primary/90 transition"
            >
              <Shuffle size={16} className="sm:w-[18px] sm:h-[18px]" /> Shuffle Cards
            </button>
          </div>
        </>
      )}

      {/* Draw screen for Topic & Code modes */}
      {step === 'draw' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-mutedText text-sm">
              {flippedCount} of {cards.length} revealed
            </p>
            <button
              onClick={newDraw}
              className="flex items-center gap-2 bg-card text-mutedText px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-secondary/30 hover:bg-secondary/10 transition shadow-lg"
            >
              <RefreshCw size={14} className="sm:w-4 sm:h-4" /> New Lot
            </button>
          </div>

          <div key={drawId} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {cards.map((card, i) => (
              <div
                key={i}
                role="button"
                aria-label={card.flipped ? `Revealed value ${card.value}` : 'Face-down lot card'}
                className={`lot-card aspect-square ${card.flipped ? '' : 'lot-card-active'}`}
                onClick={() => flipCard(i)}
              >
                <div className={`lot-card-inner ${card.flipped ? 'is-flipped' : ''}`}>
                  <div className="lot-card-face lot-card-front">
                    <span className="lot-card-number">{card.value}</span>
                  </div>
                  <div className="lot-card-face lot-card-back">
                    <Dice5 size={26} className="lot-card-icon" />
                    <span className="lot-card-label">LOT</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ASSIGN MODE STEP 1: Select Category */}
      {step === 'assign_cat' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={goToModes} className="flex items-center gap-1.5 text-mainText hover:opacity-80 transition text-sm font-medium">
              <ArrowLeft size={16} /> Back to Modes
            </button>
            <span className="text-mutedText text-xs font-semibold">Step 1 of 3: Select Category</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => selectCategory(cat)}
                className="bg-card rounded-2xl p-5 flex flex-col items-start gap-1 hover:bg-secondary/10 transition shadow-sm border border-secondary/30 text-left"
              >
                <span className="text-mainText font-bold text-base">{cat}</span>
                <span className="text-mutedText text-xs">
                  {programmes.filter(p => p.category === cat).length} programmes
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ASSIGN MODE STEP 2: Select Programme */}
      {step === 'assign_prog' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setStep('assign_cat')} className="flex items-center gap-1.5 text-mainText hover:opacity-80 transition text-sm font-medium">
              <ArrowLeft size={16} /> Back to Categories
            </button>
            <span className="text-mutedText text-xs font-semibold">Step 2 of 3: Select Programme ({selectedCat})</span>
          </div>

          <div className="space-y-2">
            {programmes.filter(p => p.category === selectedCat).length === 0 && (
              <p className="text-mutedText text-center py-8">No programmes found in this category.</p>
            )}
            {programmes
              .filter(p => p.category === selectedCat)
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map(prog => {
                const enrolledCount = students.filter(s => Array.isArray(s.programmeIds) && s.programmeIds.includes(prog.id)).length
                return (
                  <button
                    key={prog.id}
                    onClick={() => selectProgramme(prog)}
                    className="w-full bg-card rounded-xl p-4 flex justify-between items-center shadow-sm border border-secondary/30 hover:bg-white/10 transition text-left"
                  >
                    <div>
                      <p className="text-mainText font-semibold text-sm sm:text-base">{prog.name}</p>
                      <p className="text-mutedText text-xs">{prog.programmeType || 'Stage'} · {prog.participationType || 'Individual'}</p>
                    </div>
                    <span className="text-accent font-bold text-xs bg-accent/10 px-3 py-1 rounded-full">
                      {enrolledCount} candidates
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* ASSIGN MODE STEP 3: Assign Code Letters to Candidates */}
      {step === 'assign_list' && selectedProg && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <button onClick={() => setStep('assign_prog')} className="flex items-center gap-1.5 text-mainText hover:opacity-80 transition text-sm font-medium mb-1">
                <ArrowLeft size={16} /> Back to Programmes
              </button>
              <h3 className="text-lg sm:text-xl font-poppins font-bold text-mainText">{selectedProg.name}</h3>
              <p className="text-mutedText text-xs">{selectedCat} · {candidates.length} candidates</p>
            </div>
            <button
              onClick={handleSaveAssignments}
              disabled={savingAssign || candidates.length === 0}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold transition text-sm disabled:opacity-50 shrink-0"
            >
              {savingAssign ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {savingAssign ? 'Saving...' : 'Save Code Letters'}
            </button>
          </div>

          {loadingAssign ? (
            <p className="text-mutedText text-center py-12">Loading registered candidates...</p>
          ) : candidates.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center text-mutedText border border-secondary/30">
              No candidates enrolled in this programme yet.
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map(candidate => {
                const availableLetters = Array.from({ length: candidates.length }, (_, i) => String.fromCharCode(65 + i))
                return (
                  <div
                    key={candidate.id}
                    className="bg-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent font-bold text-sm flex items-center justify-center shrink-0">
                        #{candidate.chestNo || '?'}
                      </div>
                      <div>
                        <p className="text-mainText font-semibold text-sm sm:text-base">{candidate.name}</p>
                        <p className="text-mutedText text-xs">{teamMap[candidate.team] || candidate.team || 'No team'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-mutedText text-xs font-semibold">Code Letter:</span>
                      <select
                        value={assignments[candidate.id] || ''}
                        onChange={e => handleAssignmentChange(candidate.id, e.target.value)}
                        className="bg-black/20 text-mainText rounded-xl px-3 py-2 border border-secondary/40 outline-none text-sm font-bold min-w-[90px]"
                      >
                        <option value="">Select</option>
                        {availableLetters.map(letter => (
                          <option key={letter} value={letter}>
                            {letter}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
