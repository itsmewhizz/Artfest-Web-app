import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // If a session already exists while arriving at /admin/login (e.g. via the phone
  // back button or a stale history entry), drop straight through to the dashboard.
  // The login page should only stick around when no session is active.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate('/admin', { replace: true })
    })
  }, [navigate])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid credentials. Try again.')
      setLoading(false)
    } else {
      // Replace the history entry so /admin/login is NOT kept in the back stack —
      // pressing back from inside the panel lands on the dashboard, never on Login.
      navigate('/admin', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="bg-card rounded-2xl p-6 sm:p-8 w-full max-w-sm mx-4 sm:mx-0 shadow-xl border border-secondary/30">
        <h2 className="text-2xl font-poppins font-bold text-mainText mb-6 text-center">Admin Login</h2>
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        <input
          className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-4 outline-none border border-secondary/30 focus:border-mainText"
          placeholder="Email"
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
          className="w-full bg-primary text-white rounded-xl p-3 font-semibold hover:opacity-90 transition"
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
