import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Teams from './pages/Teams'
import TeamDetail from './pages/TeamDetail'
import Students from './pages/Students'
import StudentProfile from './pages/StudentProfile'
import Programmes from './pages/Programmes'
import ProgrammeResult from './pages/ProgrammeResult'
import StudentLogin from './pages/StudentLogin'
import StudentDashboard from './pages/StudentDashboard'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProgrammes from './pages/admin/AdminProgrammes'
import AdminTeams from './pages/admin/AdminTeams'
import AdminSpotlight from './pages/admin/AdminSpotlight'
import AdminStudents from './pages/admin/AdminStudents'
import AdminPrint from './pages/admin/AdminPrint'
import AdminResults from './pages/admin/AdminResults'
import AdminResultPoster from './pages/admin/AdminResultPoster'
import AdminLots from './pages/admin/AdminLots'
import JudgesLogin from './pages/judges/JudgesLogin'
import JudgesResults from './pages/judges/JudgesResults'
import ProtectedRoute from './components/ProtectedRoute'
import JudgesRoute from './components/JudgesRoute'
import Starfield from './components/Starfield'
import HamburgerMenu from './components/HamburgerMenu'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-mainBackground pb-20 text-mainText">
        <Starfield />
        <div className="relative z-10">
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentProfile />} />
          <Route path="/programmes" element={<Programmes />} />
          <Route path="/programmes/:id" element={<ProgrammeResult />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/programmes" element={<ProtectedRoute><AdminProgrammes /></ProtectedRoute>} />
          <Route path="/admin/teams" element={<ProtectedRoute><AdminTeams /></ProtectedRoute>} />
          <Route path="/admin/spotlight" element={<ProtectedRoute><AdminSpotlight /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute><AdminStudents /></ProtectedRoute>} />
          <Route path="/admin/print" element={<ProtectedRoute><AdminPrint /></ProtectedRoute>} />
          <Route path="/admin/results" element={<ProtectedRoute><AdminResults /></ProtectedRoute>} />
          <Route path="/admin/result-poster" element={<ProtectedRoute><AdminResultPoster /></ProtectedRoute>} />
          <Route path="/admin/lots" element={<ProtectedRoute><AdminLots /></ProtectedRoute>} />
          <Route path="/judges/login" element={<JudgesLogin />} />
          <Route path="/judges/results" element={<JudgesRoute><JudgesResults /></JudgesRoute>} />
          </Routes>
        </div>
        <BottomNav />
        <HamburgerMenu />
      </div>
    </BrowserRouter>
  )
}

export default App