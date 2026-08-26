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

// Helper to fetch all rows across PostgREST 1000-row pagination boundaries
export const fetchAllRows = async (tableName, selectStr = '*', orderCol = null, ascending = true) => {
  let allRows = []
  let from = 0
  const pageSize = 1000
  while (true) {
    let query = supabase.from(tableName).select(selectStr)
    if (orderCol) {
      query = query.order(orderCol, { ascending, nullsFirst: false })
    }
    query = query.range(from, from + pageSize - 1)
    const { data, error } = await query
    if (error) {
      console.error(`fetchAllRows(${tableName}) error:`, error)
      break
    }
    if (!data || data.length === 0) break
    allRows = allRows.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return allRows
}

export const getStudents = async () => {
  return fetchAllRows('students', '*', 'createdAt', false)
}

export const getStudentById = async (id) => {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single()
  if (error) console.error(error)
  return data
}

export const getProgrammes = async () => {
  return fetchAllRows('programmes', '*', 'name', true)
}

export const getFinishedProgrammeIds = async () => {
  const data = await fetchAllRows('programmes', 'id, isFinished')
  return new Set((data || []).filter(p => p.isFinished).map(p => p.id))
}

export const createPlaceholderResultForProgramme = async (programmeId, programmeName) => {
  if (!programmeId) return null
  const { data: existing } = await supabase
    .from('results')
    .select('id')
    .eq('programmeId', String(programmeId))
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase.from('results').insert({
    programmeId: String(programmeId),
    name: programmeName || '',
    first: null,
    second: null,
    third: null,
    entries: null,
    isFinished: false,
    locked: false,
    updatedAt: new Date().toISOString(),
  }).select('*').maybeSingle()

  if (error) {
    console.error('Error creating placeholder result:', error)
    return null
  }
  return data
}

// Latest result row per programme, restricted to programmes that are
// marked as finished. Unfinished programmes are excluded so stale or
// incomplete result data never surfaces in result-reading views.
export const getResultsForFinishedProgrammes = async () => {
  const finishedIds = await getFinishedProgrammeIds()
  const data = await fetchAllRows('results', '*')
  const filtered = (data || []).filter(r => r.programmeId && finishedIds.has(r.programmeId) && (r.isFinished === true || r.first || r.second || r.third || (r.entries && r.entries.length > 0)))
  return latestPerProgramme(filtered).sort((a, b) => (b.resultNo || 0) - (a.resultNo || 0))
}

export const getProgrammeById = async (id) => {
  const { data, error } = await supabase.from('programmes').select('*').eq('id', id).single()
  if (error) console.error(error)
  return data
}

export const ensureResultMasterRow = async (programmeId, programmeName) => {
  if (!programmeId) return null
  const { data: existing } = await supabase.from('results').select('*').eq('programmeId', programmeId).maybeSingle()
  if (existing) return existing

  const now = new Date().toISOString()
  const payload = {
    programmeId,
    name: programmeName || '',
    entries: [],
    first: null,
    second: null,
    third: null,
    locked: false,
    updatedAt: now,
  }
  const { data: inserted, error } = await supabase.from('results').insert(payload).select().maybeSingle()
  if (error) console.error('ensureResultMasterRow error:', error)
  return inserted
}

export const attachTeamNamesToResults = async (resultsList) => {
  if (!resultsList) return resultsList
  const isSingle = !Array.isArray(resultsList)
  const list = isSingle ? [resultsList] : resultsList
  if (list.length === 0) return resultsList

  try {
    const [students, teams] = await Promise.all([
      fetchAllRows('students', 'id, team, chestNo, name'),
      getTeams(),
    ])

    const studentMap = {}
    students.forEach(s => { studentMap[s.id] = s })

    const teamMap = {}
    teams.forEach(t => { teamMap[t.id] = t.name; teamMap[t.name] = t.name })

    const formatEntry = (e) => {
      if (!e) return e
      const s = studentMap[e.studentId || e.candidateId]
      const teamId = s?.team || e.teamId || e.team
      const teamName = teamMap[teamId] || teamId || e.teamName || e.team || ''
      const chestNo = s?.chestNo || e.chestNo || ''
      return {
        ...e,
        team: teamName,
        teamName: teamName,
        teamId: teamId,
        chestNo: chestNo,
      }
    }

    const processed = list.map(r => {
      if (!r) return r
      const entries = Array.isArray(r.entries) ? r.entries.map(formatEntry) : []
      const first = formatEntry(r.first || entries[0] || null)
      const second = formatEntry(r.second || entries[1] || null)
      const third = formatEntry(r.third || entries[2] || null)

      return {
        ...r,
        entries,
        first,
        second,
        third,
      }
    })

    return isSingle ? processed[0] : processed
  } catch (err) {
    console.warn('attachTeamNamesToResults error:', err)
    return resultsList
  }
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
  return await attachTeamNamesToResults(data?.[0] || null)
}

export const getAllResults = async () => {
  const data = await fetchAllRows('results', '*')
  const latest = latestPerProgramme(data || [])
  const sorted = latest.sort((a, b) => (b.resultNo || 0) - (a.resultNo || 0))
  return await attachTeamNamesToResults(sorted)
}

export const getAllMasterResultsForAdmin = async () => {
  const [results, progs] = await Promise.all([
    fetchAllRows('results', '*'),
    fetchAllRows('programmes', '*', 'name'),
  ])

  const resultMap = {}
  results.forEach(r => {
    if (r.programmeId) resultMap[r.programmeId] = r
  })

  const masterResults = progs.map(prog => {
    const res = resultMap[prog.id]
    if (res) return res
    return {
      id: `temp-${prog.id}`,
      programmeId: prog.id,
      name: prog.name,
      entries: [],
      first: null,
      second: null,
      third: null,
      locked: false,
      updatedAt: new Date().toISOString(),
    }
  })

  return await attachTeamNamesToResults(masterResults)
}

export const getTeams = async () => {
  return fetchAllRows('teams', '*')
}

export const getSpotlight = async () => {
  const { data, error } = await supabase.from('spotlight').select('*').order('uploadedAt', { ascending: false })
  if (error) console.error(error)
  return data || []
}

export const getGalleryFooters = async () => {
  const { data, error } = await supabase.from('gallery_footers').select('*').order('created_at', { ascending: false })
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

// ── Poster templates (Supabase‑backed, shared with every user) ──
export const getPosterTemplates = async () => {
  const { data, error } = await supabase
    .from('poster_templates')
    .select('*')
    .order('createdAt', { ascending: false })
  if (error) console.error(error)
  return data || []
}

// Rows carry the app template model: id, name, type, canvas, background,
// elements, teamsToShow (camelCase columns in the DB).
export const upsertPosterTemplates = async (rows) => {
  return supabase.from('poster_templates').upsert(rows)
}

export const deletePosterTemplates = async (ids) => {
  return supabase.from('poster_templates').delete().in('id', ids)
}

export const fetchPosterTemplateIds = async () => {
  const { data, error } = await supabase.from('poster_templates').select('id')
  if (error) console.error(error)
  return (data || []).map(r => r.id)
}

// Upload a template background image into the `photos` storage bucket and
// return its public URL (so the template record can persist the URL).
export const uploadTemplateBackground = async (file, templateId) => {
  const rawExt = (file?.name?.split('.').pop() || 'jpg').toLowerCase()
  const ext = rawExt.replace(/[^a-z0-9]+/g, '').slice(0, 5) || 'jpg'
  const path = `templates/${templateId}/bg-${Date.now()}.${ext}`
  const { data, error } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from('photos').getPublicUrl(data.path).data.publicUrl
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
    if (Array.isArray(result.entries) && result.entries.length > 0) {
      const entry = result.entries.find(e => e?.studentId === studentId)
      if (entry) {
        studentResults.push({
          ...result,
          placement: {
            ...entry,
            rank: entry.place || entry.label || 'Participant',
          },
        })
      }
    } else {
      const placement = [result.first, result.second, result.third].find(p => p?.studentId === studentId)
      if (placement) {
        studentResults.push({
          ...result,
          placement: {
            ...placement,
            rank: result.first?.studentId === studentId ? '1st Place' : result.second?.studentId === studentId ? '2nd Place' : '3rd Place',
          },
        })
      }
    }
  }
  return studentResults
}

export async function getStudentPoints(studentId) {
  const studentResults = await getStudentResults(studentId)
  let total = 0
  for (const r of studentResults) {
    if (r.placement?.points != null) {
      total += (Number(r.placement.points) || 0)
    }
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

export const getStudentByCredentials = async (chestNo, password) => {
  const trimmed = String(chestNo).trim()
  let { data: students } = await supabase
    .from('students')
    .select('id, name, chestNo')
    .ilike('chestNo', trimmed)
    .limit(1)
  if (!students || students.length === 0) {
    const { data: exact } = await supabase
      .from('students')
      .select('id, name, chestNo')
      .eq('chestNo', trimmed)
      .limit(1)
    students = exact
  }
  if (!students || students.length === 0) {
    console.warn('No student found with chest number:', trimmed)
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

export const getCodeAssignmentsForProgramme = async (programmeId) => {
  const { data, error } = await supabase
    .from('performance_code_assignments')
    .select('*')
    .eq('programme_id', programmeId)
    .order('code_letter', { ascending: true })
  if (error) console.error('getCodeAssignmentsForProgramme error:', error)
  return data || []
}

export const upsertCodeAssignments = async (assignments) => {
  const { data, error } = await supabase
    .from('performance_code_assignments')
    .upsert(assignments, { onConflict: 'programme_id,code_letter' })
    .select('*')
  return { data, error }
}

export const deleteCodeAssignmentsForProgramme = async (programmeId) => {
  const { error } = await supabase
    .from('performance_code_assignments')
    .delete()
    .eq('programme_id', programmeId)
  return { error }
}

export const getAllCodeAssignments = async () => {
  const { data, error } = await supabase
    .from('performance_code_assignments')
    .select('*')
  if (error) console.error('getAllCodeAssignments error:', error)
  return data || []
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

  let totalPublishedResults = 0
  let afterPublishedResults = 0

  for (const result of Object.values(latestPerProg)) {
    const prog = progMap[result.programmeId]
    if (prog && prog.isFinished) {
      totalPublishedResults += 1
      afterPublishedResults += 1
    }
  }

  const teamData = teams.map(team => {
    const catPoints = {}
    categories.forEach(c => { catPoints[c] = 0 })

    for (const result of Object.values(latestPerProg)) {
      const prog = progMap[result.programmeId]
      if (!prog || !prog.isFinished) continue

      const catName = prog.category === 'General' ? 'General Cat-A' : prog.category

      const placements = Array.isArray(result.entries) && result.entries.length > 0
        ? result.entries.map(e => ({ studentId: e.studentId, points: Number(e.points) || 0 }))
        : [
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

  return { teamData, categories, totalPublishedResults, afterPublishedResults }
}

export const getIndividualCategoryPoints = async () => {
  const [students, programmes, allResults, teams] = await Promise.all([
    supabase.from('students').select('*').then(r => r.data || []),
    supabase.from('programmes').select('*').then(r => r.data || []),
    supabase.from('results').select('*').then(r => r.data || []),
    supabase.from('teams').select('*').then(r => r.data || []),
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

  const teamMap = {}
  teams.forEach(t => { teamMap[t.id] = t })

  const eligibleCategories = DEFAULT_STUDENT_CATEGORIES
  const studentPointsMap = {}
  let totalPublishedResults = 0
  let afterPublishedResults = 0

  for (const result of Object.values(latestPerProg)) {
    const prog = progMap[result.programmeId]
    if (!prog || !prog.isFinished) continue

    totalPublishedResults += 1

    const partType = (prog.participationType || prog.participation_type || '').toLowerCase()
    if (partType !== 'individual') continue

    const cat = prog.category
    if (!cat || !eligibleCategories.includes(cat)) continue

    afterPublishedResults += 1

    const placements = Array.isArray(result.entries) && result.entries.length > 0
      ? result.entries.map(e => ({ studentId: e.studentId, points: Number(e.points) || 0 }))
      : [
        result.first && { studentId: result.first.studentId, points: Number(result.first.points) || 0 },
        result.second && { studentId: result.second.studentId, points: Number(result.second.points) || 0 },
        result.third && { studentId: result.third.studentId, points: Number(result.third.points) || 0 },
      ]

    for (const p of placements) {
      if (!p?.studentId) continue
      const student = studentMap[p.studentId]
      if (student) {
        studentPointsMap[student.id] = (studentPointsMap[student.id] || 0) + p.points
      }
    }
  }

  const leaderboardByCategory = {}
  eligibleCategories.forEach(cat => {
    const catStudents = students
      .filter(s => s.class === cat)
      .map(s => {
        const teamObj = teamMap[s.team] || teams.find(t => t.name === s.team)
        return {
          id: s.id,
          name: s.name,
          chestNo: s.chestNo,
          category: s.class,
          team: teamObj ? teamObj.name : (s.team || 'Unassigned'),
          teamColor: teamObj ? teamObj.color : '#2872A1',
          totalPoints: studentPointsMap[s.id] || 0,
        }
      })
      .filter(s => s.totalPoints > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10)
      .map((s, idx) => ({ ...s, rank: idx + 1 }))

    leaderboardByCategory[cat] = catStudents
  })

  return {
    leaderboardByCategory,
    eligibleCategories,
    totalPublishedResults,
    afterPublishedResults
  }
}

export const uploadFrameImage = async (file, folder = 'frames') => {
  const ext = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  try {
    const { error } = await supabase.storage
      .from('photos')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })

    if (error) throw error

    const { data: pubUrlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    return pubUrlData?.publicUrl || null
  } catch (e) {
    console.warn('uploadFrameImage Supabase storage upload error:', e)
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(file)
    })
  }
}
