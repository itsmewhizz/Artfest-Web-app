import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { getStudentById, getProgrammes, updateStudentProfile, STUDENT_CATEGORIES, getStudentSessionState, clearStudentSession } from '../supabase/queries'
import { useToast } from '../components/Toast'
import StudentAvatar from '../components/StudentAvatar'

export default function StudentDashboard() {
  const [student, setStudent] = useState(null)
  const [programmes, setProgrammes] = useState([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [photo, setPhoto] = useState(null)
  const [selectedProgs, setSelectedProgs] = useState([])
  const [saving, setSaving] = useState(false)
  const [loggedOut, setLoggedOut] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const studentId = localStorage.getItem('student_id')

  useEffect(() => {
    if (!studentId) {
      navigate('/student/login')
      return
    }

    const loadStudent = async () => {
      const sessionState = await getStudentSessionState(studentId)
      if (!sessionState.active) {
        localStorage.removeItem('student_id')
        navigate('/student/login')
        return
      }

      const s = await getStudentById(studentId)
      if (!s) {
        navigate('/student/login')
        return
      }
      setStudent(s)
      setName(s.name)
      setCategory(s.class || '')
      setSelectedProgs(s.programmeIds || [])
    }

    loadStudent()
    getProgrammes().then(setProgrammes)
  }, [navigate, studentId])

  const toggleProg = (progId) => {
    setSelectedProgs(prev =>
      prev.includes(progId)
        ? prev.filter(id => id !== progId)
        : [...prev, progId]
    )
  }

  const handleSave = async () => {
    if (!name.trim()) return toast('Name cannot be empty', 'error')
    setSaving(true)

    let photoURL = student.photoURL || ''
    if (photo) {
      const ext = photo.name.split('.').pop()
      const path = `students/${studentId}_${Date.now()}.${ext}`
      const { data } = await supabase.storage.from('photos').upload(path, photo)
      if (data) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(data.path)
        photoURL = urlData.publicUrl
      }
    }

    const ok = await updateStudentProfile(studentId, {
      name: name.trim(),
      photoURL,
      class: category,
      programmeIds: selectedProgs,
      createdAt: new Date().toISOString(),
    })

    if (ok) {
      toast('Profile updated!')
      setStudent(prev => ({ ...prev, name: name.trim(), photoURL, programmeIds: selectedProgs }))
      setPhoto(null)
    } else {
      toast('Failed to save', 'error')
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await clearStudentSession(studentId)
    localStorage.removeItem('student_id')
    setLoggedOut(true)
    navigate('/student/login')
  }

  if (!student) return <div className="text-mainText text-center mt-20">Loading...</div>

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold text-mainText">My Profile</h2>
          <button onClick={handleLogout} className="text-mainText text-sm hover:text-secondary transition">
            Logout
          </button>
        </div>

        {/* Student info card */}
        <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm border border-secondary/30">
          <div className="flex items-center gap-4 mb-6">
            <StudentAvatar src={student.photoURL} name={student.name} className="w-16 h-16 text-xl" />
            <div>
              <p className="text-mainText font-semibold text-lg">{student.name}</p>
              <p className="text-mutedText text-sm">{student.class} · {student.team}</p>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm border border-secondary/30">
          <h3 className="text-mainText font-semibold mb-4">Edit Details</h3>

          <label className="text-mutedText text-sm block mb-1">Full Name</label>
          <input
            className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-4 outline-none border border-secondary/40 focus:border-mainText"
            value={name}
            onChange={e => setName(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
          />

          <label className="text-mutedText text-sm block mb-1">Category</label>
          <select
            className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-4 outline-none border border-secondary/40 focus:border-mainText"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            {STUDENT_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="text-mutedText text-sm block mb-1">Profile Photo</label>
          <input
            type="file"
            accept="image/*"
            className="w-full text-mutedText mb-4"
            onChange={e => setPhoto(e.target.files[0])}
          />
        </div>

        {/* Programme selection */}
        <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm border border-secondary/30">
          <h3 className="text-mainText font-semibold mb-4">My Programmes</h3>
          <p className="text-mutedText text-xs mb-3">Select the programmes you are participating in</p>

          {programmes.length === 0 ? (
            <p className="text-mainText text-sm">No programmes available yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {programmes.map(prog => (
                <label
                  key={prog.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                    selectedProgs.includes(prog.id) ? 'bg-secondary/25 border border-secondary' : 'bg-black/10 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProgs.includes(prog.id)}
                    onChange={() => toggleProg(prog.id)}
                    className="accent-secondary w-4 h-4"
                  />
                  <div>
                    <span className="text-mainText text-sm font-medium">{prog.name}</span>
                    <span className="text-mutedText text-xs ml-2">({prog.category})</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-white rounded-xl p-3 font-semibold hover:opacity-90 transition mb-4"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full text-mainText text-sm hover:opacity-80 transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
