import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, LogOut, Trophy, Pencil, X, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../supabase/client'
import { getStudentById, getProgrammes, getCategories, getStudentSessionState, clearStudentSession, getTeams, getResultsForFinishedProgrammes, STUDENT_CATEGORIES } from '../supabase/queries'
import StudentAvatar from '../components/StudentAvatar'
import ResultPoster from '../components/ResultPoster'
import ThemeToggle from '../components/ThemeToggle'

const ringRadius = 52
const ringCircumference = 2 * Math.PI * ringRadius

export default function StudentDashboard() {
  const [student, setStudent] = useState(null)
  const [teams, setTeams] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [allResults, setAllResults] = useState([])
  const [studentPhotos, setStudentPhotos] = useState({})
  const [chestNos, setChestNos] = useState({})
  const [selectedPoster, setSelectedPoster] = useState(null)
  const [showPosterPicker, setShowPosterPicker] = useState(false)
  const [categories, setCategories] = useState(STUDENT_CATEGORIES)
  const [showEdit, setShowEdit] = useState(false)
  const [authGranted, setAuthGranted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [credError, setCredError] = useState('')
  const [credLoading, setCredLoading] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editTeam, setEditTeam] = useState('')
  const [editPhoto, setEditPhoto] = useState(null)
  const [editProgs, setEditProgs] = useState([])
  const [savingDetails, setSavingDetails] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const navigate = useNavigate()

  const studentId = localStorage.getItem('student_id')

  useEffect(() => {
    if (!studentId) {
      navigate('/student/login')
      return
    }

    const loadDashboard = async () => {
      const sessionState = await getStudentSessionState(studentId)
      if (!sessionState.active) {
        localStorage.removeItem('student_id')
        navigate('/student/login')
        return
      }

      const [studentData, programmeData, resultData, categoriesData, teamsData] = await Promise.all([
        getStudentById(studentId),
        getProgrammes(),
        getResultsForFinishedProgrammes(),
        getCategories().then(({ student }) => student),
        getTeams(),
      ])

      if (!studentData) {
        navigate('/student/login')
        return
      }

      setStudent(studentData)
      setTeams(teamsData)
      setProgrammes(programmeData)
      setAllResults(resultData)

      const resultStudentIds = [...new Set((resultData || []).flatMap(r => [r.first?.studentId, r.second?.studentId, r.third?.studentId]).filter(Boolean))]
      if (resultStudentIds.length > 0) {
        const { data } = await supabase.from('students').select('id, photoURL, chestNo').in('id', resultStudentIds)
        const photoMap = {}
        const chestMap = {}
        ;(data || []).forEach(item => {
          photoMap[item.id] = item.photoURL
          chestMap[item.id] = item.chestNo || ''
        })
        setStudentPhotos(photoMap)
        setChestNos(chestMap)
      }

      if (studentData.photoURL) {
        setStudentPhotos(prev => ({ ...prev, [studentData.id]: studentData.photoURL }))
      }
      if (categoriesData?.length) {
        setCategories(categoriesData)
      }
    }

    loadDashboard()
  }, [navigate, studentId])

  const programmeIds = useMemo(() => student?.programmeIds || [], [student])

  // Resolve the participant's actual team name from their team field —
  // handles both a stored team id and a stored team name (legacy data).
  const teamName = useMemo(() => {
    const raw = student?.team
    if (!raw) return ''
    const byId = teams.find(t => t.id === raw)
    if (byId) return byId.name
    const byName = teams.find(t => t.name === raw)
    return byName ? byName.name : raw
  }, [student, teams])

  const completedProgrammes = useMemo(() => {
    const resultMap = new Map()
    for (const result of allResults) {
      if (!result?.programmeId) continue
      const hasStudentPlacement = [result.first, result.second, result.third].some(place => place?.studentId === studentId)
      if (hasStudentPlacement) resultMap.set(result.programmeId, result)
    }

    return programmes
      .filter(prog => programmeIds.includes(prog.id) && resultMap.has(prog.id))
      .map(prog => ({ programme: prog, result: resultMap.get(prog.id) }))
  }, [allResults, programmeIds, programmes, studentId])

  const pendingProgrammes = useMemo(() => {
    const completedIds = new Set(completedProgrammes.map(item => item.programme.id))
    return programmes.filter(prog => programmeIds.includes(prog.id) && !completedIds.has(prog.id))
  }, [completedProgrammes, programmeIds, programmes])

  const completedCount = completedProgrammes.length
  const totalCount = programmeIds.length || 0
  const progress = totalCount ? completedCount / totalCount : 0
  const progressText = `${completedCount}/${totalCount}`
  const strokeOffset = ringCircumference * (1 - progress)

  const handleLogout = async () => {
    await clearStudentSession(studentId)
    localStorage.removeItem('student_id')
    navigate('/student/login')
  }

  // ---- Edit Details (admin-gated self-edit) ----

  const filteredEditProgs = editCategory
    ? programmes.filter(p => p.category === editCategory)
    : programmes.filter(p => !p.category?.startsWith('General'))
  const generalEditProgs = programmes.filter(p => p.category?.startsWith('General'))

  const openEditModal = () => {
    setAuthGranted(false)
    setEmail(''); setPassword(''); setCredError(''); setShowPassword(false)
    setEditName(student.name)
    setEditCategory(student.class || '')
    setEditTeam(student.team || '')
    setEditPhoto(null)
    setEditProgs(student.programmeIds || [])
    setSaveMsg('')
    setShowEdit(true)
  }

  const closeEditModal = () => {
    setShowEdit(false)
    setAuthGranted(false)
    setEmail(''); setPassword(''); setCredError(''); setShowPassword(false)
    setEditPhoto(null)
    setSaveMsg('')
    // Drop any admin session granted for the edit so admin routes stay closed.
    supabase.auth.signOut().catch(() => {})
  }

  const handleCredentialSubmit = async () => {
    if (!email || !password) {
      setCredError('Enter admin username and password to continue.')
      return
    }
    setCredLoading(true)
    setCredError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setCredLoading(false)
    if (error) {
      setCredError('Invalid credentials. Try again.')
      return
    }
    setAuthGranted(true)
  }

  const toggleEditProg = (progId) => {
    setEditProgs(prev =>
      prev.includes(progId) ? prev.filter(id => id !== progId) : [...prev, progId]
    )
  }

  const handleSaveDetails = async () => {
    if (!editName || !editCategory || !editTeam) {
      setSaveMsg('Please fill name, category and team.')
      return
    }
    setSavingDetails(true)
    setSaveMsg('')
    let photoURL = ''
    if (editPhoto) {
      const { data } = await supabase.storage.from('photos').upload(`students/${Date.now()}_${editPhoto.name}`, editPhoto)
      if (data?.path) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(data.path)
        photoURL = urlData?.publicUrl || ''
      }
    }
    const updates = { name: editName, class: editCategory, team: editTeam, programmeIds: editProgs }
    if (photoURL) updates.photoURL = photoURL
    const { data: updated, error } = await supabase.from('students').update(updates).eq('id', studentId).select()
    setSavingDetails(false)
    if (error || !updated || updated.length === 0) {
      setSaveMsg('Failed to save changes. Please try again.')
      return
    }
    setStudent(prev => ({ ...prev, ...updated[0] }))
    if (updated[0].photoURL) {
      setStudentPhotos(prev => ({ ...prev, [studentId]: updated[0].photoURL }))
    }
    setSaveMsg('Details updated!')
    setTimeout(() => closeEditModal(), 1200)
  }

  if (!student) return <div className="text-mainText text-center mt-20">Loading...</div>

  return (
    <div className="min-h-screen bg-mainBackground p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h2 className="text-2xl font-display font-bold text-mainText">Participant Profile</h2>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={openEditModal} className="flex items-center gap-2 rounded-full border border-subtle bg-card px-3 py-2 text-sm font-semibold text-mainText shadow-sm hover:bg-lavender transition">
              <Pencil size={16} /> Edit Details
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-full border border-subtle bg-card px-3 py-2 text-sm font-semibold text-mainText shadow-sm hover:bg-lavender transition">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        <div className="bg-card rounded-[28px] p-5 sm:p-7 border border-subtle shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <StudentAvatar src={student.photoURL} name={student.name} className="h-20 w-20 text-2xl sm:h-24 sm:w-24" />
              <div className="min-w-0">
                <p className="text-lg font-display font-bold text-mainText sm:text-xl">{student.name}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-mutedText">
                  <span className="rounded-full bg-secondary/20 px-2.5 py-1">Chest No: {student.chestNo || '—'}</span>
                  <span className="rounded-full bg-secondary/20 px-2.5 py-1">{student.class || 'Unassigned Category'}</span>
                  <span className="rounded-full bg-secondary/20 px-2.5 py-1">{teamName || 'No Team'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative h-28 w-28">
                <svg viewBox="0 0 140 140" className="h-28 w-28 -rotate-90">
                  <circle cx="70" cy="70" r={ringRadius} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="12" />
                  <circle
                    cx="70"
                    cy="70"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#ring-gradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={strokeOffset}
                  />
                  <defs>
                    <linearGradient id="ring-gradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#7C4DFF" />
                      <stop offset="100%" stopColor="#22C55E" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-display font-black text-mainText">{progressText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="bg-card rounded-[24px] border border-subtle p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-mainText">
              <Trophy size={18} className="text-accent" />
              <h3 className="text-lg font-display font-bold">Completed</h3>
            </div>

            {completedProgrammes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-secondary/50 bg-black/5 p-4 text-sm text-mutedText">
                No completed programmes yet.
              </p>
            ) : (
              <div className="space-y-3">
                {completedProgrammes.map(({ programme, result }) => (
                  <div key={programme.id} className="rounded-2xl border border-secondary/30 bg-secondary/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-mainText">{programme.name}</p>
                        <p className="text-xs text-mutedText">{programme.category || 'Programme'} · #{result?.resultNo || '—'}</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">
                        Done
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-[24px] border border-subtle p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-mainText">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              <h3 className="text-lg font-display font-bold">Pending</h3>
            </div>

            {pendingProgrammes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-secondary/50 bg-black/5 p-4 text-sm text-mutedText">
                No pending programmes.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingProgrammes.map(prog => (
                  <div key={prog.id} className="rounded-2xl border border-secondary/30 bg-black/5 p-3">
                    <p className="font-semibold text-mainText">{prog.name}</p>
                    <p className="text-xs text-mutedText">{prog.category || 'Programme'} · Pending</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowPosterPicker(true)}
            disabled={completedProgrammes.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={18} /> Download Poster
          </button>
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-card p-5 sm:p-6 shadow-2xl border border-subtle max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-display font-bold text-mainText">
                {authGranted ? 'Edit My Details' : 'Admin Verification Required'}
              </h3>
              <button onClick={closeEditModal} className="rounded-full border border-subtle px-3 py-1.5 text-sm font-medium text-mainText hover:bg-lavender transition">
                <X size={16} />
              </button>
            </div>

            {!authGranted ? (
              <>
                <p className="text-sm text-mutedText mb-4">
                  Editing your details requires admin authorization. Enter admin credentials to continue.
                </p>
                {credError && <p className="text-red-400 text-sm mb-3">{credError}</p>}
                <input
                  type="text"
                  className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/30 focus:border-mainText"
                  placeholder="Admin username / email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="username"
                />
                <div className="relative mb-4">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full bg-black/20 text-mainText rounded-xl p-3 pr-12 outline-none border border-secondary/30 focus:border-mainText"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCredentialSubmit()}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedText hover:text-mainText transition"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <button
                  onClick={handleCredentialSubmit}
                  disabled={credLoading}
                  className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                >
                  {credLoading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </>
            ) : (
              <>
                {saveMsg && (
                  <p className={`text-sm mb-3 ${saveMsg === 'Details updated!' ? 'text-emerald-500' : 'text-red-400'}`}>
                    {saveMsg}
                  </p>
                )}

                <label className="block text-sm text-mutedText mb-1 font-medium">Photo</label>
                <input type="file" accept="image/*" onChange={e => setEditPhoto(e.target.files[0])} className="w-full text-mutedText mb-3 text-sm" />

                <label className="block text-sm text-mutedText mb-1 font-medium">Name</label>
                <input
                  className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/30 focus:border-mainText"
                  value={editName}
                  onChange={e => setEditName(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
                />

                <label className="block text-sm text-mutedText mb-1 font-medium">Category</label>
                <select
                  className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/30 focus:border-mainText"
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <label className="block text-sm text-mutedText mb-1 font-medium">Team</label>
                <select
                  className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/30 focus:border-mainText"
                  value={editTeam}
                  onChange={e => setEditTeam(e.target.value)}
                >
                  <option value="">Select Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>

                <label className="block text-sm text-mutedText mb-2 font-medium">Programmes</label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-black/20 rounded-xl p-2 mb-3">
                  {filteredEditProgs.length === 0 && <p className="text-mutedText text-sm p-2">No programmes in this category.</p>}
                  {filteredEditProgs.map(prog => (
                    <label
                      key={prog.id}
                      className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${
                        editProgs.includes(prog.id) ? 'bg-secondary/25 border border-secondary' : 'hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={editProgs.includes(prog.id)}
                        onChange={() => toggleEditProg(prog.id)}
                        className="accent-secondary w-4 h-4"
                      />
                      <span className="text-mainText text-sm">{prog.name}</span>
                      <span className="text-mutedText text-xs ml-auto">{prog.category}</span>
                    </label>
                  ))}
                </div>

                {generalEditProgs.length > 0 && (
                  <div className="mb-3">
                    <label className="block text-sm text-mutedText mb-2 font-medium">General Programmes</label>
                    <div className="max-h-40 overflow-y-auto space-y-1 bg-black/20 rounded-xl p-2">
                      {generalEditProgs.map(prog => (
                        <label
                          key={prog.id}
                          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${
                            editProgs.includes(prog.id) ? 'bg-secondary/25 border border-secondary' : 'hover:bg-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={editProgs.includes(prog.id)}
                            onChange={() => toggleEditProg(prog.id)}
                            className="accent-secondary w-4 h-4"
                          />
                          <span className="text-mainText text-sm">{prog.name}</span>
                          <span className="text-mutedText text-xs ml-auto">{prog.category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="w-full rounded-xl bg-success px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                >
                  {savingDetails ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showPosterPicker && completedProgrammes.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-card p-5 shadow-2xl border border-subtle">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-display font-bold text-mainText">My Results</h3>
              <button onClick={() => setShowPosterPicker(false)} className="rounded-full border border-subtle px-3 py-1.5 text-sm font-medium text-mainText hover:bg-lavender transition">
                Close
              </button>
            </div>

            <div className="space-y-3">
              {completedProgrammes.map(({ programme, result }) => (
                <div key={programme.id} className="flex items-center justify-between gap-3 rounded-2xl border border-subtle bg-black/5 p-3">
                  <div>
                    <p className="font-semibold text-mainText">{programme.name}</p>
                    <p className="text-xs text-mutedText">#{result?.resultNo || '—'} · {programme.category || 'Programme'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPoster({ programme, result })
                      setShowPosterPicker(false)
                    }}
                    className="rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    Download Poster
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedPoster && (
        <ResultPoster
          programme={selectedPoster.programme}
          result={selectedPoster.result}
          studentPhotos={studentPhotos}
          chestNos={chestNos}
          onClose={() => setSelectedPoster(null)}
        />
      )}
    </div>
  )
}
