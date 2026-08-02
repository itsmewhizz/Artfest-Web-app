import { Link, useLocation } from 'react-router-dom'
import { Home, Trophy, Users, BookOpen } from 'lucide-react'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/teams', icon: Trophy, label: 'Teams' },
  { path: '/students', icon: Users, label: 'Students' },
  { path: '/programmes', icon: BookOpen, label: 'Programmes' },
]

export default function BottomNav() {
  const location = useLocation()
  // Hide the shared bottom nav inside the Student, Judge and Admin panels.
  // ('/students' and other public pages are unaffected — only the panel
  //  prefixes '/admin', '/student' and '/judges' are excluded.)
  const isPanel = ['/admin', '/student', '/judges'].some(p => location.pathname.startsWith(p))
  if (isPanel) return null

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-[28rem] -translate-x-1/2">
      <div className="flex items-center justify-between rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-2 py-2 shadow-lg">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-center transition-all duration-200 sm:min-w-[72px] sm:px-3 ${
                active ? 'bg-white/20 backdrop-blur-md shadow-sm' : 'bg-transparent hover:bg-white/10'
              }`}
            >
              <Icon size={20} className="text-black" />
              <span className={`text-[10px] font-medium sm:text-xs text-black`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
