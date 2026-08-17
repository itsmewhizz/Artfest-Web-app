import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { judgeClient, verifyJudgeClient } from '../../supabase/client'
import { getProgrammes, getStudents, getAllResults, getCategories, PROGRAMME_CATEGORIES } from '../../supabase/queries'
import { ArrowLeft, LogOut, Lock, ChevronDown, ChevronUp, Pencil, Eye, EyeOff } from 'lucide-react'
import { useToast } from '../../components/Toast'
import FilterDropdown from '../../components/FilterDropdown'
import ThemeToggle from '../../components/ThemeToggle'
import { CATEGORY_COLORS } from '../../components/TeamBreakdown'

function calcGrade(points) {
  const p = Number(points)
  if (p === 10) return 'A+'
  if (p >= 8 && p <= 9) return 'A'
  if (p >= 6 && p <= 7) return 'B'
  if (p >= 4 && p <= 5) return 'C'
  return '-'
}

export default function JudgesResults() {
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [savedResults, setSavedResults] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState(PROGRAMME_CATEGORIES)
  const [expandedId, setExpandedId] = useState(null)

  // Edit flow state
  const [editProg, setEditProg] = useState(null)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [vName, setVName] = useState('')
  const [vPassword, setVPassword] = useState('')
  const [vShowPassword, setVShowPassword] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaExpiresAt, setCaptchaExpiresAt] = useState('')
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [vLoading, setVLoading] = useState(false)
  const [vCaptcha, setVCaptcha] = useState('')
  const [vError, setVError] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit form placements
  const [first, setFirst] = useState('')
  const [firstPoints, setFirstPoints] = useState('')
  const [second, setSecond] = useState('')
  const [secondPoints, setSecondPoints] = useState('')
  const [third, setThird] = useState('')
  const [thirdPoints, setThirdPoints] = useState('')

  const navigate = useNavigate()
  const toast = useToast()

  const loadResults = () => {
    getAllResults().then(data => {
      setSavedResults(data || [])
    }).catch(err => {
      console.error('Failed to load results:', err)
      toast('Failed to load results: ' + err.message, 'error')
    })
  }

  useEffect(() => {
    getProgrammes().then(setProgrammes).catch(err => console.error('Failed to load programmes:', err))
    getStudents().then(setStudents).catch(err => console.error('Failed to load students:', err))
    getCategories().then(({ programme }) => setCategories(programme)).catch(err => console.error('Failed to load categories:', err))
    loadResults()
  }, [])

  const getStudentObj = (id) => {
    const s = students.find(s => s.id === id)
    return s ? { studentId: s.id, name: s.name, photoURL: s.photoURL } : null
  }

  const placement = (studentId, points) => {
    const s = getStudentObj(studentId)
    return s ? { ...s, points: Number(points) || 0, grade: calcGrade(points) } : null
  }

  const getProgrammeType = (prog) => prog?.programmeType || prog?.type || prog?.programme_type || ''

  const handleLogout = async () => {
    await judgeClient.auth.signOut()
    navigate('/judges/login')
  }

  const getResultNoMap = () => {
    const map = {}
    savedResults.forEach(r => {
      if (r.programmeId) map[r.programmeId] = r.resultNo
    })
    return map
  }

  const resultNoMap = getResultNoMap()

  const catOptions = [
    { value: '', label: 'All Categories', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...categories.map(c => ({
      value: c,
      label: c,
      icon: <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c]?.light || '#9CA3AF' }} />,
    })),
  ]
  const filteredProgrammes = categoryFilter
    ? programmes.filter(p => categoryFilter === 'General' ? p.category === 'General' : p.category === categoryFilter)
    : programmes

  // A programme counts as "submitted" only once its result row is locked
  // (i.e. carries placements). Placeholder rows that just hold a result
  // number are NOT submitted — they still go in the "Not Submitted" list.
  const lockedProgrammeIds = new Set(savedResults.filter(r => r.locked).map(r => r.programmeId))

  const notSubmitted = filteredProgrammes
    .filter(p => !lockedProgrammeIds.has(p.id))
    .sort((a, b) => (resultNoMap[a.id] || 999) - (resultNoMap[b.id] || 999) || a.name.localeCompare(b.name))

  const lockedResults = savedResults.filter(r => r.locked)
  const filteredLockedResults = categoryFilter
    ? lockedResults.filter(r => {
        const prog = programmes.find(p => p.id === r.programmeId)
        return categoryFilter === 'General' ? prog?.category === 'General' : prog?.category === categoryFilter
      })
    : lockedResults

  const resetPlacements = () => {
    setFirst(''); setFirstPoints('')
    setSecond(''); setSecondPoints('')
    setThird(''); setThirdPoints('')
  }

  const openEditFlow = (prog) => {
    setIsFirstTime(false)
    setEditProg(prog)
    setPromptOpen(true)
  }

  const openNewEntry = (prog) => {
    setIsFirstTime(true)
    setEditProg(prog)
    setEditError('')
    setEditOpen(true)
    setFirst('')
    setFirstPoints('')
    setSecond('')
    setSecondPoints('')
    setThird('')
    setThirdPoints('')
  }

  const closePrompt = () => {
    setPromptOpen(false)
    setEditProg(null)
  }

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const clearCaptchaState = () => {
    setCaptcha('')
    setCaptchaId('')
    setCaptchaExpiresAt('')
    setVCaptcha('')
  }

  const loadCaptcha = async ({ retries = 2, delayMs = 450 } = {}) => {
    setVError('')
    setCaptchaLoading(true)

    const sessionResp = await judgeClient.auth.getSession()
    if (!sessionResp?.data?.session?.user) {
      const missingSessionError = new Error('No authenticated judge session available')
      console.error('judge_create_captcha prevented by missing session:', missingSessionError)
      setVError('Your judge session is not available. Please refresh or log in again.')
      setCaptchaLoading(false)
      clearCaptchaState()
      return false
    }

    let lastError = null

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const { data, error } = await judgeClient.rpc('judge_create_captcha')
        if (error) {
          lastError = error
          console.error('judge_create_captcha RPC failed:', error)
          if (error.message?.includes('404') || error.details?.includes('rpc') || error.code === 'PGRST100') {
            setVError('Security code service unavailable. Run judge_reverify_flow.sql in Supabase to install judge_create_captcha().')
            setCaptchaLoading(false)
            clearCaptchaState()
            return false
          }
        } else if (data?.error) {
          lastError = new Error(data.error)
          console.error('judge_create_captcha returned error payload:', data)
          if (data.error === 'not_authorized') {
            setVError('Judge session is invalid. Please refresh or log in again.')
            setCaptchaLoading(false)
            clearCaptchaState()
            return false
          }
        } else if (data?.challenge_id && data?.captcha) {
          setCaptcha(data.captcha)
          setCaptchaId(data.challenge_id)
          setCaptchaExpiresAt(data.expires_at || '')
          setVError('')
          setCaptchaLoading(false)
          return true
        } else {
          lastError = new Error('Unexpected captcha response')
          console.error('Unexpected judge_create_captcha response:', data)
        }
      } catch (err) {
        lastError = err
        console.error('Failed to load captcha attempt', attempt, err)
      }

      if (attempt < retries) {
        await sleep(delayMs)
      }
    }

    setCaptcha('')
    setCaptchaId('')
    setCaptchaExpiresAt('')
    setVError('Could not load the security code. Please try again.')
    if (lastError) {
      console.error('Captcha load failed after retries:', lastError)
    }
    setCaptchaLoading(false)
    return false
  }

  const proceedToVerify = async () => {
    setVName('')
    setVPassword('')
    setVCaptcha('')
    setVError('')
    setVShowPassword(false)
    clearCaptchaState()
    setPromptOpen(false)
    setVerifyOpen(true)
    await loadCaptcha()
  }

  useEffect(() => {
    if (!verifyOpen || !captchaExpiresAt) return

    const expiresAt = new Date(captchaExpiresAt)
    if (Number.isNaN(expiresAt.getTime())) return

    const now = new Date()
    const msUntilExpiry = expiresAt.getTime() - now.getTime()
    if (msUntilExpiry <= 0) {
      setVError('Security code expired. Generating a new one.')
      loadCaptcha().catch(err => console.error('Failed to refresh expired captcha:', err))
      return
    }

    const timer = setTimeout(() => {
      setVError('Security code expired. Generating a new one.')
      loadCaptcha().catch(err => console.error('Failed to refresh expired captcha:', err))
    }, msUntilExpiry + 100)

    return () => clearTimeout(timer)
  }, [verifyOpen, captchaExpiresAt])

  const closeVerify = () => {
    setVerifyOpen(false)
    setEditProg(null)
    clearCaptchaState()
  }

  const handleVerify = async () => {
    setVError('')

    if (!captchaId) {
      setVError('Security code session expired. Generating a new code now.')
      await loadCaptcha()
      return
    }

    if (vCaptcha.trim().toUpperCase() !== captcha) {
      setVError('Incorrect CAPTCHA. Please try again.')
      setVCaptcha('')
      await loadCaptcha()
      return
    }

    if (!vName.trim() || !vPassword) {
      setVError('Please enter both judge email and password.')
      return
    }

    setVLoading(true)
    const { data, error } = await verifyJudgeClient.auth.signInWithPassword({ email: vName.trim(), password: vPassword })
    setVLoading(false)
    const role = data?.user?.app_metadata?.role
    if (error || !data?.user || role !== 'judge') {
      console.error('Judge reverify sign-in failed:', error || data)
      setVError(error?.message || 'Invalid judge name or password.')
      setVCaptcha('')
      await loadCaptcha()
      return
    }

    setVerifyOpen(false)
    openEdit(editProg)
  }

  const openEdit = (prog, preserveFields = false) => {
    const latest = savedResults.find(r => r.programmeId === prog.id)
    if (!preserveFields) {
      setFirst(latest?.first?.studentId || '')
      setFirstPoints(latest?.first?.points != null ? String(latest.first.points) : '')
      setSecond(latest?.second?.studentId || '')
      setSecondPoints(latest?.second?.points != null ? String(latest.second.points) : '')
      setThird(latest?.third?.studentId || '')
      setThirdPoints(latest?.third?.points != null ? String(latest.third.points) : '')
    }
    setEditError('')
    setEditOpen(true)
  }

  const closeEdit = () => {
    setEditOpen(false)
    setEditProg(null)
    clearCaptchaState()
    resetPlacements()
  }

  const handleSaveEdit = async () => {
    if (!editProg) return
    if (!first) {
      setEditError('Select the 1st place participant')
      return
    }

    const payload = {
      programmeId: editProg.id,
      name: editProg.name,
      first: placement(first, firstPoints),
      second: placement(second, secondPoints),
      third: placement(third, thirdPoints),
      updatedAt: new Date().toISOString(),
      locked: true,
    }

    // First-time submission — the judge's normal session is enough, no
    // re-verification / captcha step. Insert a new locked result row.
    if (isFirstTime) {
      setSaving(true)
      setEditError('')

      const { error } = await judgeClient.from('results').insert({
        ...payload,
        ...(resultNoMap[editProg.id] ? { resultNo: resultNoMap[editProg.id] } : {}),
      })

      if (error) {
        console.error('Result submit failed:', error)
        setEditError(error?.message || 'Failed to submit the result. Please try again.')
        setSaving(false)
        return
      }

      setSaving(false)
      closeEdit()
      toast('Result saved and locked!')
      loadResults()
      return
    }

    if (!captchaId || !vName || !vPassword) {
      setEditError('Re-verification is required before editing. Please go back and verify again.')
      return
    }
    setSaving(true)
    setEditError('')

    const { data: rpcData, error: rpcError } = await judgeClient.rpc('judge_reverify_edit', {
      p_challenge_id: captchaId,
      p_captcha: vCaptcha.trim().toUpperCase(),
      p_judge_email: vName.trim(),
      p_judge_password: vPassword,
      p_programme_id: editProg.id,
      p_programme_name: editProg.name,
      p_first: payload.first,
      p_second: payload.second,
      p_third: payload.third,
    })

    if (rpcError || rpcData?.error) {
      console.error('Edit failed:', rpcError || rpcData)
      const rpcMessage = rpcError?.message || ''
      const is404 = rpcError?.status === 404 || rpcMessage.includes('404') || rpcMessage.includes('Not Found')
      const isCrypt = rpcMessage.includes('crypt(') || rpcMessage.includes('42883') || rpcMessage.includes('does not exist')
      const msg =
        is404 ? 'Judge reverify service unavailable. Run judge_reverify_flow.sql in Supabase to create judge_reverify_edit().' :
        isCrypt ? 'Server password verification failed. Ensure pgcrypto is enabled and judge_reverify_flow.sql has been applied.' :
        rpcData?.error === 'not_authorized' ? 'You are not authorized to edit this result.' :
        rpcData?.error === 'invalid_judge' ? 'Judge re-verification failed. Please verify again.' :
        rpcData?.error === 'captcha_invalid' ? 'Security code was invalid or expired. Please verify again.' :
        (rpcError?.message || 'Edit failed. Please try again.')
      setEditError(msg)
      setSaving(false)
      return
    }

    setSaving(false)
    closeEdit()
    toast('Result saved and locked!')
    loadResults()
  }

  const placementLabels = ['1st Place', '2nd Place', '3rd Place']
  const placementVals = [
    { student: first, setStudent: setFirst, points: firstPoints, setPoints: setFirstPoints },
    { student: second, setStudent: setSecond, points: secondPoints, setPoints: setSecondPoints },
    { student: third, setStudent: setThird, points: thirdPoints, setPoints: setThirdPoints },
  ]

  const editStudentOptions = editProg
    ? students.filter(s => (s.programmeIds || []).includes(editProg.id))
    : []

  return (
    <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-mainText hover:opacity-80 transition">
          <ArrowLeft size={18} /> Home
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-mainText px-3 py-1.5 rounded-xl font-semibold transition text-xs sm:text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 mb-6 shadow-sm border border-secondary/30">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText mb-2">Judges Panel</h2>
        <p className="text-mutedText text-xs sm:text-sm">Submit results per programme. Locked results require judge authentication and captcha verification to edit.</p>
      </div>

      <div className="max-w-xs mx-auto mb-5">
        <FilterDropdown
          dark
          label="All Categories"
          options={catOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
      </div>

      {/* ── Not Submitted / Pending Programmes ── */}
      <h3 className="text-base sm:text-lg font-poppins font-bold text-mainText mb-3">Not Submitted</h3>
      <div className="flex flex-col gap-3 mb-8">
        {notSubmitted.length === 0 && <p className="text-mutedText text-center py-4">No pending programmes in this category.</p>}
        {notSubmitted.map(prog => (
          <div key={prog.id} className="bg-card rounded-xl p-4 flex items-center justify-between shadow-sm border border-secondary/30 gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-mainText font-semibold text-sm sm:text-base truncate">
                {resultNoMap[prog.id] ? <span className="text-accent font-bold text-base sm:text-lg mr-2">#{resultNoMap[prog.id]}</span> : null}
                {prog.name}
              </p>
              <p className="text-mutedText text-xs sm:text-sm">{prog.category}{getProgrammeType(prog) ? ` · ${getProgrammeType(prog)}` : ''}</p>
            </div >
            <button
              onClick={() => openNewEntry(prog)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0"
            >
              <Pencil size={14} /> Enter Result
            </button>
          </div >
        ))}
      </div>

      {/* ── Submitted / Locked Results ── */}
      <h3 className="text-base sm:text-lg font-poppins font-bold text-mainText mb-3">Submitted Results ({filteredLockedResults.length})</h3>
      <div className="flex flex-col gap-3 mb-8">
        {filteredLockedResults.length === 0 && <p className="text-mutedText text-center py-4">No results submitted yet.</p>}
        {filteredLockedResults.map(result => {
          const prog = programmes.find(p => p.id === result.programmeId)
          const isExpanded = expandedId === result.id
          const placementData = [
            { rank: '1st', data: result.first },
            { rank: '2nd', data: result.second },
            { rank: '3rd', data: result.third },
          ]
          return (
            <div key={result.id} className="bg-card rounded-xl p-4 shadow-sm border border-secondary/30">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : result.id)}>
                <div className="min-w-0 flex-1">
                  <p className="text-mainText font-semibold text-sm sm:text-base truncate">
                    {result.resultNo ? <span className="text-accent font-bold text-base sm:text-lg mr-2">#{result.resultNo}</span> : null}
                    {result.name || prog?.name}
                  </p>
                  <p className="text-mutedText text-xs">{prog?.category || ''}</p>
                </div >
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-success/15 text-success border border-success/40 shrink-0">
                  <Lock size={11} /> LOCKED
                </span >
                <button className="text-mutedText shrink-0 ml-2">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div >
              {isExpanded && (
                <div className="mt-4 pt-3 border-t border-secondary/30 space-y-3">
                  {placementData.map(({ rank, data }) => {
                    if (!data) return (
                      <div key={rank} className="text-mutedText text-sm flex items-center gap-2">
                        <span className="font-semibold w-8">{rank}</span>
                        <span className="italic">No entry</span>
                      </div >
                    )
                    return (
                      <div key={rank} className="bg-secondary/15 rounded-xl p-3 border border-secondary/30">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className={`text-xs sm:text-sm font-bold min-w-[1.5rem] sm:min-w-[2rem] ${
                            rank === '1st' ? 'text-accent' : rank === '2nd' ? 'text-secondary' : 'text-mutedText'
                          }`}>
                            {rank}
                          </span >
                          <span className="text-mainText font-medium text-sm sm:text-base">{data.name}</span>
                          <span className="text-accent font-bold text-sm sm:text-base ml-auto">{data.points || 0} pts</span>
                          {data.grade && data.grade !== '-' && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              data.grade === 'A+' ? 'bg-success/15 text-success' :
                              data.grade === 'A' ? 'bg-blue-500/15 text-blue-400' :
                              data.grade === 'B' ? 'bg-yellow-500/15 text-yellow-400' :
                              'bg-orange-500/15 text-orange-400'
                            }`}>
                              {data.grade}
                            </span >
                          )}
                        </div >
                      </div >
                    )
                  })}
                  <button
                    onClick={() => openEditFlow(prog || { id: result.programmeId, name: result.name })}
                    className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl py-2 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 border border-amber-500/30 mt-2"
                  >
                    <Pencil size={14} /> Re-verify & Edit
                  </button>
                </div >
              )}
            </div >
          )
        })}
      </div >

      {/* ── Prompt modal ── */}
      {promptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={closePrompt}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-poppins font-bold text-mainText mb-2">Are you really a Judge?</h3>
            <p className="text-mutedText text-sm mb-6">Editing locked festival results requires judge credentials and single-use security code verification.</p>
            <div className="flex gap-3">
              <button onClick={closePrompt} className="flex-1 bg-white/10 text-mainText rounded-xl p-3 font-semibold text-sm hover:bg-white/15 transition">
                Cancel
              </button>
              <button onClick={proceedToVerify} className="flex-1 bg-primary text-white rounded-xl p-3 font-semibold text-sm hover:bg-primary/90 transition">
                Yes, Continue
              </button>
            </div >
          </div >
        </div >
      )}

      {/* ── Re-verify modal ── */}
      {verifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !vLoading && closeVerify()}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-poppins font-bold text-mainText mb-1">Judge Verification</h3>
            <p className="text-mutedText text-xs mb-4">Re-enter your credentials to access result editor for <span className="text-mainText font-semibold">{editProg?.name}</span>.</p>

            {vError && <div className="bg-red-500/15 border border-red-500/40 text-red-300 text-xs p-3 rounded-xl mb-4">{vError}</div >}

            <label className="text-mutedText text-xs mb-1 block">Judge Email / Username</label>
            <input
              type="text"
              className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/30 focus:border-mainText text-sm"
              value={vName}
              onChange={e => setVName(e.target.value)}
              placeholder="e.g. judge1@fest.com"
            />

            <label className="text-mutedText text-xs mb-1 block">Password</label>
            <div className="relative mb-3">
              <input
                type={vShowPassword ? 'text' : 'password'}
                className="w-full bg-black/20 text-mainText rounded-xl p-3 pr-10 outline-none border border-secondary/30 focus:border-mainText text-sm"
                value={vPassword}
                onChange={e => setVPassword(e.target.value)}
              />
              <button type="button" onClick={() => setVShowPassword(!vShowPassword)} className="absolute right-3 top-3 text-mutedText hover:text-mainText">
                {vShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div >

            <label className="text-mutedText text-xs mb-1 block">Security Code</label>
            <div className="flex gap-2 mb-4">
              <div className="bg-black/40 text-accent font-bold tracking-widest text-lg px-4 py-2 rounded-xl flex items-center justify-center select-none border border-secondary/40">
                {captcha || '------'}
              </div >
              <input
                type="text"
                className="flex-1 bg-black/20 text-mainText uppercase font-bold tracking-wider rounded-xl p-3 outline-none border border-secondary/30 focus:border-mainText text-center text-sm"
                maxLength={6}
                value={vCaptcha}
                onChange={e => setVCaptcha(e.target.value.toUpperCase())}
                placeholder="TYPE CODE"
              />
            </div >

            <div className="flex gap-2 mb-3">
              <button onClick={closeVerify} disabled={vLoading} className="bg-white/10 text-mainText rounded-xl p-3 font-semibold text-sm flex-1 hover:bg-white/15 transition">
                Cancel
              </button>
              <button onClick={handleVerify} disabled={vLoading} className="bg-primary text-white rounded-xl p-3 font-semibold text-sm flex-1 hover:bg-primary/90 transition">
                {vLoading ? 'Verifying...' : 'Verify & Edit'}
              </button>
            </div >
            <div className="flex gap-2">
              <button
                onClick={() => loadCaptcha({ retries: 2, delayMs: 450 })}
                disabled={captchaLoading}
                className="flex-1 bg-secondary/15 text-mainText rounded-xl p-3 font-semibold text-sm hover:bg-secondary/20 transition"
              >
                {captchaLoading ? 'Refreshing...' : 'Reload security code'}
              </button>
            </div >
          </div >
        </div >
      )}

      {/* ── Edit result ── */}
      {editOpen && editProg && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/70 overflow-y-auto" onClick={() => !saving && closeEdit()}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg my-8 shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-poppins font-bold text-mainText mb-1">Edit Result</h3>
            <p className="text-mutedText text-sm mb-4 truncate">{editProg.name} · {editProg.category}{getProgrammeType(editProg) ? ` · ${getProgrammeType(editProg)}` : ''}</p>

            {placementLabels.map((label, i) => {
              const v = placementVals[i]
              const grade = calcGrade(v.points)
              return (
                <div key={label} className="mb-4">
                  <label className="text-mutedText text-xs sm:text-sm mb-1 block">{label}</label>
                  <div className="flex gap-2">
                    <select className="flex-1 bg-black/20 text-mainText rounded-xl p-3 outline-none border border-secondary/30 focus:border-mainText text-sm sm:text-base" value={v.student} onChange={e => v.setStudent(e.target.value)}>
                      <option value="">Select Participant</option>
                      {editStudentOptions.map(s => (
                        <option key={s.id} value={s.id} label={s.name}>
                          {s.name}{s.chestNo ? ` (#${s.chestNo})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Pts"
                      className="w-16 sm:w-20 bg-black/20 text-mainText rounded-xl p-3 outline-none border border-secondary/30 focus:border-mainText text-center text-sm sm:text-base"
                      value={v.points}
                      onChange={e => v.setPoints(e.target.value)}
                    />
                    <div className={`flex items-center justify-center w-12 sm:w-14 rounded-xl text-xs sm:text-sm font-bold ${
                      grade === '-' ? 'bg-secondary/15 border border-secondary/30 text-mutedText' :
                      grade === 'A+' ? 'bg-success/15 text-success border border-success/40' :
                      grade === 'A' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/40' :
                      grade === 'B' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/40' :
                      'bg-orange-500/15 text-orange-400 border border-orange-500/40'
                    }`}>
                      {grade}
                    </div >
                  </div >
                </div >
              )
            })}

            {editError && <p className="text-red-400 text-sm mt-2">{editError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-primary text-white rounded-xl p-3 font-semibold hover:bg-primary/90 transition">
                {saving ? 'Saving...' : 'Save & Lock Result'}
              </button>
              <button onClick={() => !saving && closeEdit()} className="bg-secondary/15 text-mainText rounded-xl p-3 font-semibold transition">
                Cancel
              </button>
            </div >
          </div >
        </div >
      )}
    </div >
  )
}
