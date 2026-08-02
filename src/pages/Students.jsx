import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudents, getTeams } from '../supabase/queries'
import { Search } from 'lucide-react'
import StudentAvatar from '../components/StudentAvatar'
import FilterDropdown from '../components/FilterDropdown'

const CATEGORY_COLORS = {
  HS: '#FF7675',
  Minor: '#55EFC4',
  Premier: '#74B9FF',
  'Sub Junior': '#A29BFE',
  Junior: '#FDCB6E',
}

export default function Students() {
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getStudents().then(setStudents)
    getTeams().then(setTeams)
  }, [])

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]))

  const teamOptions = [
    { value: '', label: 'All Teams', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...teams.map(t => ({
      value: t.id,
      label: t.name,
      icon: <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />,
    })),
  ]

  const categoryOptions = [
    { value: '', label: 'All Categories', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...['Minor', 'HS', 'Premier', 'Sub Junior', 'Junior'].map(c => ({
      value: c,
      label: c,
      icon: <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c] }} />,
    })),
  ]

  const filtered = students.filter(s => {
    const matchName = s.name?.toLowerCase().includes(search.toLowerCase())
    const matchTeam = teamFilter ? s.team === teamFilter : true
    const matchClass = classFilter ? s.class === classFilter : true
    return matchName && matchTeam && matchClass
  })

  return (
    <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-poppins font-bold text-black mb-4">Students</h2>

      <div className="flex items-center bg-oceanTint border border-white/40 rounded-xl px-3 mb-3 shadow-md shadow-black/25">
        <Search size={18} color="#0F2A3D" />
        <input
          className="bg-transparent text-[#0F2A3D] placeholder-[#1A4562]/50 p-3 flex-1 outline-none"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
        />
      </div>

      <div className="flex gap-3 mb-4">
        <FilterDropdown
          label="All Teams"
          options={teamOptions}
          value={teamFilter}
          onChange={setTeamFilter}
          className="flex-1"
        />
        <FilterDropdown
          label="All Categories"
          options={categoryOptions}
          value={classFilter}
          onChange={setClassFilter}
          className="flex-1"
        />
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && <p className="text-black text-center mt-8">No students found.</p>}
        {filtered.map(student => (
          <div
            key={student.id}
            onClick={() => navigate(`/students/${student.id}`)}
            className="bg-oceanTint rounded-xl p-4 flex items-center gap-4 cursor-pointer border border-white/40 shadow-md shadow-black/25 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.99] transition-all duration-200"
          >
            <StudentAvatar src={student.photoURL} name={student.name} className="w-10 h-10 sm:w-12 sm:h-12" />
            <div className="min-w-0">
              <p className="text-[#0F2A3D] font-medium text-sm sm:text-base truncate">{student.name}</p>
              <p className="text-[#1A4562] text-xs sm:text-sm truncate">{teamMap[student.team] || student.team} · {student.class}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}