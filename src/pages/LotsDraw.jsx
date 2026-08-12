import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import AdminLots from './admin/AdminLots'

export default function LotsDraw() {
  const [granted, setGranted] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (sessionStorage.getItem('lots_granted') === '1') {
      setGranted(true)
    } else {
      navigate('/lots', { replace: true })
    }
  }, [navigate])

  if (granted !== true) return null

  return (
    <div className="min-h-screen bg-mainBackground text-mainText">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-mainText hover:opacity-80 transition">
            <ArrowLeft size={18} /> Home
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('lots_granted')
              navigate('/lots', { replace: true })
            }}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-mainText px-3 py-1.5 rounded-xl font-semibold transition text-xs sm:text-sm"
          >
            <Lock size={16} /> Lock
          </button>
        </div>
        <AdminLots />
      </div>
    </div>
  )
}