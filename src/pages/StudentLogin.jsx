import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentByCredentials, setStudentSession } from '../supabase/queries'
import { Eye, EyeOff } from 'lucide-react'

export default function StudentLogin() {
  const [chestNo, setChestNo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!chestNo.trim() || !password) {
      setError('Enter your chest number and password')
      return
    }
    setLoading(true)
    setError('')
    const result = await getStudentByCredentials(chestNo, password)
    if (result?.error === 'not_found') {
      setError('No participant found with that chest number. Check or contact admin.')
      setLoading(false)
      return
    }
    if (result?.error === 'no_credentials') {
      setError('No password set for this account. Contact admin to set up your login.')
      setLoading(false)
      return
    }
    if (result?.error === 'already_logged_in_elsewhere') {
      setError('This account is already logged in elsewhere')
      setLoading(false)
      return
    }
    if (result?.error === 'wrong_password') {
      setError('Wrong password. Try again.')
      setLoading(false)
      return
    }
    if (!result?.student) {
      setError('Invalid chest number or password. Try again.')
      setLoading(false)
      return
    }

    const token = `${result.student.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await setStudentSession(result.student.id, token)
    localStorage.setItem('student_id', result.student.id)
    setLoading(false)
    navigate('/student/dashboard')
  }

  return (
    <div className="min-h-screen bg-mainBackground flex items-center justify-center p-4 sm:p-6">
      <div className="bg-card rounded-2xl p-6 sm:p-8 w-full max-w-sm mx-4 sm:mx-0 shadow-xl border border-secondary/30">
        <h2 className="text-2xl font-display font-bold text-mainText mb-2 text-center">Participant Login</h2>
        <p className="text-mutedText text-sm text-center mb-6">Edit your profile and programmes</p>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <label className="text-mutedText text-xs sm:text-sm mb-1 block">Chest Number</label>
        <input
          className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-4 outline-none border border-secondary/30 focus:border-mainText"
          placeholder="Enter your chest number"
          value={chestNo}
          onChange={e => setChestNo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <div className="relative mb-6">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full bg-black/20 text-mainText rounded-xl p-3 pr-12 outline-none border border-secondary/30 focus:border-mainText"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedText hover:text-mainText transition"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-primary text-white rounded-xl p-3 font-semibold hover:bg-primary/90 transition"
        >
          {loading ? 'Logging in...' : 'Login'}
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
