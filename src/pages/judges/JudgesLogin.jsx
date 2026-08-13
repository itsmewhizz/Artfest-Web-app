import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { judgeClient } from '../../supabase/client'
import { Eye, EyeOff, Scale } from 'lucide-react'

export default function JudgesLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter your judge email and password')
      return
    }
    setLoading(true)
    setError('')

    try {
      await judgeClient.auth.signOut().catch(() => {})

      const { data, error } = await judgeClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setError(error.message || 'Invalid credentials. Try again.')
        return
      }

      const role = data?.user?.app_metadata?.role
      if (!data?.user || role !== 'judge') {
        await judgeClient.auth.signOut().catch(() => {})
        setError(role ? 'This account is not registered as a judge.' : 'Invalid credentials. Try again.')
        return
      }

      navigate('/judges/results', { replace: true })
    } catch (err) {
      console.error('Judge login failed:', err)
      setError('Login failed. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-mainBackground flex items-center justify-center p-4 sm:p-6">
      <div className="bg-card rounded-2xl p-6 sm:p-8 w-full max-w-sm mx-4 sm:mx-0 shadow-xl border border-secondary/30">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Scale size={22} className="text-mainText" />
          <h2 className="text-2xl font-poppins font-bold text-mainText text-center">Judges Login</h2>
        </div>
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        <input
          className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-4 outline-none border border-secondary/30 focus:border-mainText"
          placeholder="Judge username"
          value={email}
          onChange={e => setEmail(e.target.value)}
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
