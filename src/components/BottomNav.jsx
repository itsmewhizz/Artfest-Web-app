import { Link, useLocation } from 'react-router-dom'
import { Home, BookOpen } from 'lucide-react'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/results', icon: BookOpen, label: 'Results' },
]

export default function BottomNav() {
  const location = useLocation()
  // Hide the shared bottom nav inside the Student, Judge and Admin panels.
  // Match on the first path segment so public pages keep the navbar — only
  // panel routes ('/student/...', '/judges/...', '/admin/...') hide it.
  const first = location.pathname.split('/')[1]
  const isPanel = first === 'admin' || first === 'student' || first === 'judges'
  if (isPanel) return null

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-[20rem] -translate-x-1/2">
      <div className="floating-nav flex items-center justify-between px-2 py-2 shadow-lg">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex min-w-[80px] flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-center transition-all duration-200 ${
                active
                  ? 'bg-[#1D192B] text-white shadow-sm'
                  : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--accent-purple-soft)]'
              }`}
            >
              <Icon size={20} className={active ? 'text-white' : 'text-[inherit]'} />
              <span className="text-[10px] font-medium sm:text-xs">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}