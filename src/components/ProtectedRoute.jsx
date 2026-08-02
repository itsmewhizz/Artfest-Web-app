import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/admin/login')
      else setUser(session.user)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-mainText text-center mt-20">Loading...</div>
  return user ? children : null
}