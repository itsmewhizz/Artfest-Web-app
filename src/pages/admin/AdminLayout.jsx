import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Users,
  GalleryHorizontalEnd,
  FileText,
  Printer,
  Layers,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react'
import IsraLogo from '../../components/IsraLogo'

const navItems = [
  { label: 'Dashboard', path: '/admin', end: true, icon: LayoutDashboard },
  { label: 'Programmes', path: '/admin/programmes', icon: BookOpen },
  { label: 'Categories', path: '/admin/categories', icon: Layers },
  { label: 'Teams', path: '/admin/teams', icon: Trophy },
  { label: 'Participants', path: '/admin/students', icon: Users },
  { label: 'Spotlight / Gallery', path: '/admin/spotlight', icon: GalleryHorizontalEnd },
  { label: 'Results', path: '/admin/results', icon: FileText },
  { label: 'Print', path: '/admin/print', icon: Printer },
]

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const isDashboard = location.pathname === '/admin'

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email || ''))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const closeDrawer = () => setOpen(false)

  return (
    <div className="min-h-screen bg-mainBackground text-mainText">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-primary/95 backdrop-blur border-b border-white/10">
        <button onClick={() => setOpen(true)} aria-label="Open navigation" className="p-1.5 text-mainText">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 leading-none tracking-tight select-none">
            <span className="font-bold text-2xl uppercase">ISRA</span>
            <div className="flex flex-col text-[10px] font-semibold leading-tight uppercase tracking-wider border-l-0 pl-1">
              <span>LIFE</span>
              <span>FESTIVAL</span>
            </div>
          </div>
          <IsraLogo variant="mark" className="w-8 h-8" />
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={closeDrawer} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col admin-sidebar shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 dark:border-black/10">
          <IsraLogo variant="mark" className="w-10 h-10" />
          <div className="flex items-center gap-2 min-w-0 leading-none tracking-tight select-none">
            <span className="font-bold text-2xl uppercase text-inherit">ISRA</span>
            <div className="flex flex-col text-[10px] font-semibold leading-tight uppercase tracking-wider text-inherit border-l-0 pl-1">
              <span>LIFE</span>
              <span>FESTIVAL</span>
            </div>
          </div>
          <button onClick={closeDrawer} aria-label="Close navigation" className="lg:hidden ml-auto p-1 text-mutedText hover:text-mainText">
            <X size={22} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ label, path, end, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-mainText border border-white/15 shadow-inner'
                    : 'text-inherit opacity-70 hover:opacity-100 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-accent' : 'text-mutedText group-hover:text-mainText'} />
                  <span className="flex-1 truncate">{label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Admin user */}
        <div className="border-t border-white/10 dark:border-black/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/25 text-accent flex items-center justify-center font-bold text-sm shrink-0">
              {(adminEmail || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-inherit truncate">{adminEmail || 'Admin'}</p>
            </div>
            <button onClick={handleLogout} aria-label="Logout" title="Logout" className="p-2 rounded-lg text-mutedText hover:text-red-400 hover:bg-white/10 transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-72 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          {!isDashboard && (
            <div className="mb-4">
              <button
                onClick={() => navigate('/admin')}
                className="inline-flex items-center gap-2 bg-card border border-secondary/40 rounded-xl px-4 py-2 text-sm sm:text-base font-semibold text-mainText shadow-sm hover:bg-white/10 hover:border-mainText/40 transition"
              >
                <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" /> Back to Dashboard
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
