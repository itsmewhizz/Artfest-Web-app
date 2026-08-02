import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { BookOpen, Trophy, Users, Image, LogOut, Printer, Shuffle, FileText } from 'lucide-react'

export default function AdminDashboard() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const sections = [
    { label: 'Programmes', icon: BookOpen, path: '/admin/programmes' },
    { label: 'Lots', icon: Shuffle, path: '/admin/lots' },
    { label: 'Teams', icon: Trophy, path: '/admin/teams' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Spotlight', icon: Image, path: '/admin/spotlight' },
    { label: 'Results', icon: FileText, path: '/admin/results' },
    { label: 'Result Poster', icon: Printer, path: '/admin/result-poster' },
    { label: 'Print', icon: Printer, path: '/admin/print' },
  ]

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Admin Panel</h2>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 text-sm sm:text-base hover:underline transition">
          <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" /> Logout
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {sections.map(({ label, icon: Icon, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="bg-card rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 hover:bg-white/10 transition shadow-sm border border-secondary/30"
          >
            <Icon size={22} className="sm:w-7 sm:h-7" color="#7FC3EA" />
            <span className="text-mainText font-medium text-sm sm:text-base">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
