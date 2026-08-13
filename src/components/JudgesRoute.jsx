import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { judgeClient } from '../supabase/client'

export default function JudgesRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const { data: { session } } = await judgeClient.auth.getSession()
        const role = session?.user?.app_metadata?.role
        if (cancelled) return
        if (!session || role !== 'judge') {
          navigate('/judges/login', { replace: true })
        } else {
          setAuthorized(true)
        }
      } catch (err) {
        console.error('Judge session check failed:', err)
        if (!cancelled) navigate('/judges/login', { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [navigate])

  if (loading) return <div className="text-mainText text-center mt-20">Loading...</div>
  return authorized ? children : null
}
