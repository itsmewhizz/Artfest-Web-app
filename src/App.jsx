import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { supabase } from './supabase/client'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Results from './pages/Results'
import ResultDetail from './pages/ResultDetail'
import StudentLogin from './pages/StudentLogin'
import StudentDashboard from './pages/StudentDashboard'
import Gallery from './pages/Gallery'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProgrammes from './pages/admin/AdminProgrammes'
import AdminTeams from './pages/admin/AdminTeams'
import AdminSpotlight from './pages/admin/AdminSpotlight'
import AdminStudents from './pages/admin/AdminStudents'
import AdminPrint from './pages/admin/AdminPrint'
import AdminResults from './pages/admin/AdminResults'
import AdminResultPoster from './pages/admin/AdminResultPoster'
import LotsAccess from './pages/LotsAccess'
import LotsDraw from './pages/LotsDraw'
import AdminCategories from './pages/admin/AdminCategories'
import JudgesLogin from './pages/judges/JudgesLogin'
import JudgesResults from './pages/judges/JudgesResults'
import ProtectedRoute from './components/ProtectedRoute'
import JudgesRoute from './components/JudgesRoute'
import Starfield from './components/Starfield'
import CursorGlow from './components/CursorGlow'

// Guarantees the admin login page is unreachable while a session is active —
// no matter how the browser history got there (back/back-back, stale entries,
// the hamburger "Admin" link). The login page only stays when the admin is
// signed out after clicking Logout.
function AdminSessionRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname !== '/admin/login') return
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) navigate('/admin', { replace: true })
    })
    return () => { cancelled = true }
  }, [location.pathname, navigate])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <AdminSessionRedirect />
      <div className="min-h-screen bg-mainBackground pb-20 text-mainText">
        <Starfield />
        <CursorGlow />
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/results" element={<Results />} />
            <Route path="/results/:id" element={<ResultDetail />} />
            <Route path="/programmes" element={<Navigate to="/results" replace />} />
            <Route path="/programmes/:id" element={<Navigate to="/results/:id" replace />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="programmes" element={<AdminProgrammes />} />
              <Route path="teams" element={<AdminTeams />} />
              <Route path="spotlight" element={<AdminSpotlight />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="print" element={<AdminPrint />} />
              <Route path="results" element={<AdminResults />} />
              <Route path="result-poster" element={<AdminResultPoster />} />
              <Route path="categories" element={<AdminCategories />} />
            </Route>
            <Route path="/lots" element={<LotsAccess />} />
            <Route path="/lots/draw" element={<LotsDraw />} />
            <Route path="/judges/login" element={<JudgesLogin />} />
            <Route path="/judges/results" element={<JudgesRoute><JudgesResults /></JudgesRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default App