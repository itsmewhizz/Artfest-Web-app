import { useState } from 'react'
import { Shuffle, RefreshCw, Hash, Type, Dice5 } from 'lucide-react'
import { useToast } from '../../components/Toast'
import ThemeToggle from '../../components/ThemeToggle'

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
  const [step, setStep] = useState('mode')
  const [mode, setMode] = useState('')
  const [count, setCount] = useState('')
  const [cards, setCards] = useState([])
  const [drawId, setDrawId] = useState(0)
  const toast = useToast()

  const flippedCount = cards.filter(c => c.flipped).length
  const maxForMode = mode === 'code' ? MAX_CODE_LETTERS : MAX_CARDS

  const pickMode = (id) => {
    setMode(id)
    setCount('')
    setCards([])
    setStep('setup')
  }

  const goToModes = () => {
    setStep('mode')
    setCount('')
    setCards([])
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

  const activeMode = MODES.find(m => m.id === mode)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Lot Draw</h2>
        <ThemeToggle />
      </div>
      <p className="text-mutedText text-sm mb-6">
        Draw the stage-entry order for a programme&apos;s candidates. Each card hides a unique value, randomly placed.
      </p>

      {step === 'mode' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl">
          {MODES.map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => pickMode(id)}
              className="bg-card rounded-2xl p-5 flex flex-col items-center gap-2 sm:gap-3 hover:bg-secondary/10 transition text-center shadow-lg border border-secondary/30"
            >
              <Icon size={28} className="sm:w-8 sm:h-8" color="#7FC3EA" />
              <span className="text-mainText font-medium text-sm sm:text-base">{label}</span>
              <span className="text-mutedText text-xs sm:text-sm">{desc}</span>
            </button>
          ))}
        </div>
      )}

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
    </div>
  )
}
