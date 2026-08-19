import { supabase } from './client'

export const DEFAULT_STUDENT_CATEGORIES = ['Minor', 'HS', 'Premier', 'Sub Junior', 'Junior']
export const DEFAULT_PROGRAMME_CATEGORIES = [...DEFAULT_STUDENT_CATEGORIES, 'General Cat-A', 'General Cat-B']
export const STUDENT_CATEGORIES = DEFAULT_STUDENT_CATEGORIES
export const PROGRAMME_CATEGORIES = DEFAULT_PROGRAMME_CATEGORIES
export const PROGRAMME_TYPES = ['On-stage', 'Off-stage']
export const PARTICIPATION_TYPES = ['Individual', 'Group']
export const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000

export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('name')
    .order('sortOrder', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
  if (error || !data || data.length === 0) {
    return { student: DEFAULT_STUDENT_CATEGORIES, programme: DEFAULT_PROGRAMME_CATEGORIES }
  }
  const names = data.map(c => c.name).filter(Boolean)
  return {
    student: names.filter(n => !n.startsWith('General')),
    programme: names,
  }
}

// result number per programme built from the SAME latest-per-programme
// source used by the Admin Result List, so both views always agree.
export const getResultNoMap = async () => {
  const results = await getAllResults()
  const map = {}
  ;(results || []).forEach(r => { if (r.programmeId) map[r.programmeId] = r.resultNo })
  return map
}

const getLocalSessionState = (studentId) => {
  const token = localStorage.getItem(`student_session_${studentId}`)
  const expiresAt = Number(localStorage.getItem(`student_session_expires_${studentId}`) || 0)
  if (!token || !expiresAt) return { active: false }
  if (Date.now() >= expiresAt) {
    localStorage.removeItem(`student_session_${studentId}`)
    localStorage.removeItem(`student_session_expires_${studentId}`)
    return { active: false, expired: true }
  }
  return { active: true, token }
}

const setLocalSessionState = (studentId, token) => {
  const expiresAt = Date.now() + SESSION_EXPIRY_MS
  localStorage.setItem(`student_session_${studentId}`, token)
  localStorage.setItem(`student_session_expires_${studentId}`, String(expiresAt))
  return { active: true, token, expiresAt }
}

const clearLocalSessionState = (studentId) => {
  localStorage.removeItem(`student_session_${studentId}`)
  localStorage.removeItem(`student_session_expires_${studentId}`)
}

export const getStudents = async () => {
  const { data, error } = await supabase.from('students').select('*').order('createdAt', { ascending: false })
  if (error) console.error(error)
  return data || []
}

export const getStudentById = async (id) => {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single()
  if (error) console.error(error)
  return data
}

export const getProgrammes = async () => {
  const { data, error } = await supabase.from('programmes').select('*').order('name', { ascending: true })
  if (error) console.error(error)
  return data || []
}

export const getFinishedProgrammeIds = async () => {
  const { data, error } = await supabase.from('programmes').select('id, isFinished')
  if (error) {
    console.error('getFinishedProgrammeIds error:', error)
    return new Set()
  }
  return new Set((data || []).filter(p => p.isFinished).map(p => p.id))
}

// Latest result row per programme, restricted to programmes that are
// marked as finished. Unfinished programmes are excluded so stale or
// incomplete result data never surfaces in result-reading views.
export const getResultsForFinishedProgrammes = async () => {
  const finishedIds = await getFinishedProgrammeIds()
  const { data, error } = await supabase.from('results').select('*')
  if (error) {
    console.error('getResultsForFinishedProgrammes error:', error)
    return []
  }
  const filtered = (data || []).filter(r => r.programmeId && finishedIds.has(r.programmeId))
  return latestPerProgramme(filtered).sort((a, b) => (b.resultNo || 0) - (a.resultNo || 0))
}

export const getProgrammeById = async (id) => {
  const { data, error } = await supabase.from('programmes').select('*').eq('id', id).single()
  if (error) console.error(error)
  return data
}

function latestPerProgramme(results) {
  const map = {}
  for (const r of results) {
    if (!r.updatedAt) continue
    if (!map[r.programmeId] || r.updatedAt > map[r.programmeId].updatedAt) {
      map[r.programmeId] = r
    }
  }
  return Object.values(map)
}

export const getResultByProgrammeId = async (programmeId) => {
  const { data, error } = await supabase.from('results').select('*').eq('programmeId', programmeId).order('updatedAt', { ascending: false, nullsFirst: false }).limit(1)
  if (error) { console.error('getResultByProgrammeId error:', error); return null }
  return data?.[0] || null
}

export const getAllResults = async () => {
  const { data, error } = await supabase.from('results').select('*')
  if (error) { console.error(error); return [] }
  const latest = latestPerProgramme(data || [])
  return latest.sort((a, b) => (b.resultNo || 0) - (a.resultNo || 0))
}

export const getTeams = async () => {
  const { data, error } = await supabase.from('teams').select('*')
  if (error) console.error(error)
  return data || []
}

export const getSpotlight = async () => {
  const { data, error } = await supabase.from('spotlight').select('*').order('uploadedAt', { ascending: false })
  if (error) console.error(error)
  return data || []
}

export const getGalleryFooters = async () => {
  const { data, error } = await supabase.from('gallery_footers').select('*').order('createdAt', { ascending: false })
  if (error) console.error(error)
  return data || []
}

export const getActiveGalleryFooter = async () => {
  const { data, error } = await supabase.from('gallery_footers').select('*').eq('is_active', true).limit(1).maybeSingle()
  if (error) console.error(error)
  return data || null
}

export const upsertGalleryFooter = async (footer) => {
  const { data, error } = await supabase
    .from('gallery_footers')
    .upsert({ ...footer, updated_at: new Date().toISOString() })
    .select('*')
    .single()
  return { data, error }
}

export const deleteGalleryFooter = async (id) => {
  const { error } = await supabase.from('gallery_footers').delete().eq('id', id)
  return { error }
}

export const setActiveGalleryFooter = async (id) => {
  const { error } = await supabase
    .from('gallery_footers')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  return { error }
}

export const getFeaturedSpotlight = async () => {
  const { data, error } = await supabase.from('spotlight').select('*').eq('isFeatured', true).order('uploadedAt', { ascending: false })
  if (error) {
    const all = await getSpotlight()
    return all
  }
  return data || []
}

export async function getTeamPlacements(teamId) {
  const { data: allStudents } = await supabase.from('students').select('id, team')
  const teams = await supabase.from('teams').select('id, name').then(r => r.data || [])
  const teamNameToId = {}
  teams.forEach(t => { teamNameToId[t.name] = t.id })
  const studentIds = (allStudents || [])
    .filter(s => (teamNameToId[s.team] || s.team) === teamId)
    .map(s => s.id)
  if (studentIds.length === 0) return { first: [], second: [], third: [] }

  const results = await getResultsForFinishedProgrammes()

  const placements = { first: [], second: [], third: [] }
  for (const result of results) {
    if (result.first?.studentId && studentIds.includes(result.first.studentId)) {
      placements.first.push(result)
    }
    if (result.second?.studentId && studentIds.includes(result.second.studentId)) {
      placements.second.push(result)
    }
    if (result.third?.studentId && studentIds.includes(result.third.studentId)) {
      placements.third.push(result)
    }
  }
  return placements
}

export const getStudentsByTeamId = async (teamId) => {
  const { data: allData } = await supabase.from('students').select('*')
  const teams = await supabase.from('teams').select('id, name').then(r => r.data || [])
  const teamNameToId = {}
  teams.forEach(t => { teamNameToId[t.name] = t.id })
  return (allData || []).filter(s => (teamNameToId[s.team] || s.team) === teamId)
}

export async function getStudentResults(studentId) {
  const unique = await getResultsForFinishedProgrammes()
  const studentResults = []
  for (const result of unique) {
    const placement = [result.first, result.second, result.third].find(p => p?.studentId === studentId)
    if (placement) {
      studentResults.push({ ...result, placement: { ...placement, rank: result.first?.studentId === studentId ? 'first' : result.second?.studentId === studentId ? 'second' : 'third' } })
    }
  }
  return studentResults
}

export async function getStudentPoints(studentId) {
  const unique = await getResultsForFinishedProgrammes()
  let total = 0
  for (const r of unique) {
    if (r.first?.studentId === studentId) total += (r.first.points || 0)
    if (r.second?.studentId === studentId) total += (r.second.points || 0)
    if (r.third?.studentId === studentId) total += (r.third.points || 0)
  }
  return total
}

export const getNextResultNo = async () => {
  const { data, error } = await supabase.from('results').select('resultNo').order('resultNo', { ascending: false }).limit(1)
  if (error) { console.error('getNextResultNo error:', error); return 1 }
  return (data?.[0]?.resultNo || 0) + 1
}

export const getStudentSessionState = async (studentId) => {
  const localState = getLocalSessionState(studentId)
  if (localState.active) return localState

  const { data, error } = await supabase
    .from('students')
    .select('id, sessionActive, sessionExpiresAt, sessionToken')
    .eq('id', studentId)
    .maybeSingle()

  if (error) {
    console.warn('Session state lookup skipped:', error.message)
    return { active: false }
  }

  if (!data) return { active: false }

  const expiresAt = data.sessionExpiresAt ? new Date(data.sessionExpiresAt).getTime() : 0
  if (data.sessionActive && expiresAt && Date.now() < expiresAt) {
    return { active: true, token: data.sessionToken }
  }

  if (data.sessionActive && expiresAt && Date.now() >= expiresAt) {
    await clearStudentSession(studentId, data.sessionToken)
    return { active: false, expired: true }
  }

  return { active: false }
}

export const setStudentSession = async (studentId, token) => {
  const localState = setLocalSessionState(studentId, token)
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString()
  const { error } = await supabase
    .from('students')
    .update({ sessionActive: true, sessionExpiresAt: expiresAt, sessionToken: token })
    .eq('id', studentId)

  if (error) {
    console.warn('DB session update skipped:', error.message)
    return localState
  }

  return { active: true, token, expiresAt }
}

export const clearStudentSession = async (studentId, token) => {
  clearLocalSessionState(studentId)
  const updates = { sessionActive: false, sessionExpiresAt: null, sessionToken: null }
  const query = supabase.from('students').update(updates).eq('id', studentId)

  if (token) {
    query.eq('sessionToken', token)
  }

  const { error } = await query
  if (error) {
    console.warn('DB session clear skipped:', error.message)
  }
}

const COMMON_STUDENT_PASSWORD = 'israfest2026'

export const getStudentByCredentials = async (name, password) => {
  const trimmed = name.trim()
  let { data: students } = await supabase
    .from('students')
    .select('id, name')
    .ilike('name', trimmed)
    .limit(1)
  if (!students || students.length === 0) {
    const { data: fuzzy } = await supabase
      .from('students')
      .select('id, name')
      .ilike('name', `%${trimmed}%`)
      .limit(1)
    students = fuzzy
  }
  if (!students || students.length === 0) {
    console.warn('No student found with name:', trimmed)
    return { error: 'not_found' }
  }

  const student = students[0]
  const { data: cred, error: credErr } = await supabase
    .from('student_credentials')
    .select('*')
    .eq('student_id', student.id)
    .maybeSingle()

  if (credErr) {
    console.warn('Credential lookup error for', student.name, credErr)
    return { error: 'server_error' }
  }

  const validPassword = cred ? cred.password === password || cred.password === COMMON_STUDENT_PASSWORD : password === COMMON_STUDENT_PASSWORD

  if (!validPassword) {
    if (!cred) {
      console.warn('No credentials record exists for', student.name)
      return { error: 'no_credentials', student }
    }
    console.warn('Wrong password for', student.name)
    return { error: 'wrong_password' }
  }

  if (!cred) {
    await supabase.from('student_credentials').insert({ student_id: student.id, password: COMMON_STUDENT_PASSWORD })
  }

  const sessionState = await getStudentSessionState(student.id)
  if (sessionState.active) {
    return { error: 'already_logged_in_elsewhere', student }
  }

  return { student }
}

export const updateStudentProfile = async (id, updates) => {
  const { error } = await supabase.from('students').update(updates).eq('id', id)
  return !error
}

export const getTeamCategoryPoints = async () => {
  const [teams, students, programmes, allResults] = await Promise.all([
    supabase.from('teams').select('*').then(r => r.data || []),
    supabase.from('students').select('*').then(r => r.data || []),
    supabase.from('programmes').select('*').then(r => r.data || []),
    getResultsForFinishedProgrammes(),
  ])

  const latestPerProg = {}
  for (const r of allResults) {
    if (!r.updatedAt) continue
    if (!latestPerProg[r.programmeId] || r.updatedAt > latestPerProg[r.programmeId].updatedAt) {
      latestPerProg[r.programmeId] = r
    }
  }

  const progMap = {}
  programmes.forEach(p => { progMap[p.id] = p })

  const studentMap = {}
  students.forEach(s => { studentMap[s.id] = s })

  const categories = (await getCategories()).programme

  const teamNameToId = {}
  teams.forEach(t => { teamNameToId[t.name] = t.id })

  const teamData = teams.map(team => {
    const catPoints = {}
    categories.forEach(c => { catPoints[c] = 0 })

    for (const result of Object.values(latestPerProg)) {
      const prog = progMap[result.programmeId]
      if (!prog) continue

      const catName = prog.category === 'General' ? 'General Cat-A' : prog.category

      const placements = [
        result.first && { studentId: result.first.studentId, points: Number(result.first.points) || 0 },
        result.second && { studentId: result.second.studentId, points: Number(result.second.points) || 0 },
        result.third && { studentId: result.third.studentId, points: Number(result.third.points) || 0 },
      ]

      for (const p of placements) {
        if (!p?.studentId) continue
        const student = studentMap[p.studentId]
        if (student) {
          const studentTeamId = teamNameToId[student.team] || student.team
          if (studentTeamId === team.id) {
            catPoints[catName] = (catPoints[catName] || 0) + p.points
          }
        }
      }
    }

    const total = Object.values(catPoints).reduce((a, b) => a + b, 0)
    return { ...team, catPoints, totalPoints: total }
  })

  return { teamData, categories }
}
