import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { judgeClient } from '../supabase/client'

export default function JudgesRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    judgeClient.auth.getSession().then(({ data: { session } }) => {
      const role = session?.user?.app_metadata?.role
      if (!session || role !== 'judge') {
        navigate('/judges/login')
      } else {
        setAuthorized(true)
      }
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-mainText text-center mt-20">Loading...</div>
  return authorized ? children : null
}
