import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shuffle, Eye, EyeOff } from 'lucide-react'

const LOTS_ACCESS_CODE = '201219'

export default function LotsAccess() {
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (sessionStorage.getItem('lots_granted') === '1') {
      navigate('/lots/draw', { replace: true })
    }
  }, [navigate])

  const handleUnlock = () => {
    if (!code.trim()) {
      setError('Enter the 6-digit access code')
      return
    }
    setLoading(true)
    setError('')

    if (code.trim() === LOTS_ACCESS_CODE) {
      sessionStorage.setItem('lots_granted', '1')
      navigate('/lots/draw', { replace: true })
      return
    }

    setError('Incorrect access code. Try again.')
    setCode('')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-mainBackground flex items-center justify-center p-4 sm:p-6">
      <div className="bg-card rounded-2xl p-6 sm:p-8 w-full max-w-sm mx-4 sm:mx-0 shadow-xl border border-secondary/30">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shuffle size={22} className="text-mainText" />
          <h2 className="text-2xl font-poppins font-bold text-mainText text-center">Lots Access</h2>
        </div>
        <p className="text-mutedText text-sm text-center mb-6">Enter the 6-digit code to open the lotting section.</p>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <div className="relative mb-6">
          <input
            type={showCode ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={6}
            className="w-full bg-black/20 text-mainText rounded-xl p-3 pr-12 outline-none border border-secondary/30 focus:border-mainText text-center font-bold tracking-[0.35em]"
            placeholder="••••••"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          />
          <button
            type="button"
            onClick={() => setShowCode(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedText hover:text-mainText transition"
          >
            {showCode ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button
          onClick={handleUnlock}
          disabled={loading}
          className="w-full bg-primary text-white rounded-xl p-3 font-semibold hover:bg-primary/90 transition"
        >
          {loading ? 'Checking...' : 'Unlock Lots'}
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full text-mainText text-sm mt-4 hover:opacity-80 transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}