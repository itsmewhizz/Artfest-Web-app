// ─────────────────────────────────────────────────────────────
// Poster template model + helpers for the admin Templates feature
// (visual drag-and-drop template editor → data mapping → export).
// ─────────────────────────────────────────────────────────────

export const POSTER_CANVAS = { width: 720, height: 960 }
export const POSTER_STORAGE_KEY = 'poster_templates_v1'

export const TEMPLATE_TYPES = {
  result: {
    key: 'result',
    label: 'Program Result Poster',
    short: 'Program Result',
    description: 'Show a single programme’s 1st / 2nd / 3rd place winners.',
  },
  standings: {
    key: 'standings',
    label: 'Team Standings Poster',
    short: 'Team Standings',
    description: 'Scoreboard-style overall team rankings & points.',
  },
}

// Data fields each template type can map text elements to. Field keys may
// contain "{i}" — those repeat down the element box, one row per data row.
export const FIELD_GROUPS = {
  result: [
    {
      label: 'Programme',
      fields: [
        { key: 'programme.name', label: 'Programme Name' },
        { key: 'programme.category', label: 'Category' },
        { key: 'result.resultNo', label: 'Result No' },
        { key: 'date', label: 'Date' },
      ],
    },
    {
      label: 'Placements',
      fields: [
        { key: 'placement.{i}.rank', label: 'Placement # · Rank' },
        { key: 'placement.{i}.name', label: 'Placement # · Name' },
        { key: 'placement.{i}.points', label: 'Placement # · Points' },
        { key: 'placement.{i}.grade', label: 'Placement # · Grade' },
        { key: 'placement.{i}.team', label: 'Placement # · Team' },
        { key: 'placement.{i}.chestNo', label: 'Placement # · Chest No' },
      ],
    },
  ],
  standings: [
    {
      label: 'General',
      fields: [
        { key: 'standings.title', label: 'Title' },
        { key: 'date', label: 'Date' },
      ],
    },
    {
      label: 'Teams',
      fields: [
        { key: 'team.{i}.rank', label: 'Team # · Rank' },
        { key: 'team.{i}.name', label: 'Team # · Name' },
        { key: 'team.{i}.points', label: 'Team # · Points' },
      ],
    },
  ],
}

export const ALL_FIELDS = (type) => FIELD_GROUPS[type]?.flatMap(g => g.fields) || []

export const isRepeatableField = (field) => /(\.\{i\}\.)|\.\{i\}\b/.test(field || '')

export const ordinal = (n) => {
  if (n === 1) return '1st Place'
  if (n === 2) return '2nd Place'
  return '3rd Place'
}

export const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tpl-${Date.now()}-${Math.floor(Math.random() * 1e6)}`

// ── Fonts available to poster text elements ──
export const FONT_FAMILIES = [
  { value: 'Sora', label: 'Sora (Brand)' },
  { value: 'CSGENERAL', label: 'CSGeneral (Corvion)' },
  { value: 'Georgia', label: 'Georgia (Serif)' },
  { value: 'Arial', label: 'Arial' },
  { value: 'monospace', label: 'Monospace' },
]

export const FONT_FAMILY_CSS = {
  Sora: 'Sora, "Segoe UI", sans-serif',
  CSGENERAL: 'CSGENERAL-REGULAR_DEMO, sans-serif',
  Georgia: 'Georgia, "Times New Roman", serif',
  Arial: 'Arial, Helvetica, sans-serif',
  monospace: '"Courier New", monospace',
}

export const BG_PRESETS = {
  solid: ['#5E35B1', '#7C4DFF', '#0B0F19', '#112E81', '#0F766E', '#B91C1C', '#FFFFFF'],
  gradient: [
    { label: 'Purple Night', css: 'linear-gradient(160deg, #5E35B1 0%, #3E1F8E 55%, #1D192B 100%)' },
    { label: 'Ocean', css: 'linear-gradient(160deg, #0F2A3D 0%, #2872A1 60%, #5C93AA 100%)' },
    { label: 'Sunset', css: 'linear-gradient(160deg, #B91C1C 0%, #E8845C 55%, #FFD54F 120%)' },
    { label: 'Emerald', css: 'linear-gradient(160deg, #064E3B 0%, #0F766E 55%, #34D399 120%)' },
    { label: 'Midnight', css: 'linear-gradient(160deg, #0B0F19 0%, #1B1927 55%, #334155 120%)' },
  ],
}

// ── Template factory ──

const textElement = (id, props) => ({
  id,
  field: null,
  text: '',
  prefix: '',
  suffix: '',
  repeat: false,
  x: 40,
  y: 40,
  width: 640,
  height: 48,
  fontSize: 24,
  fontColor: '#FFFFFF',
  fontWeight: 600,
  fontFamily: 'Sora',
  textAlign: 'center',
  textTransform: 'none',
  ...props,
})

export const createDefaultTemplate = (type) => {
  const now = new Date().toISOString()
  const id = createId()

  if (type === 'standings') {
    const elements = []
    const rows = 8
    const top = 250
    const rowH = 640
    elements.push(textElement(createId(), { text: 'TEAM STANDINGS', x: 40, y: 56, width: 640, height: 92, fontSize: 46, fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', fontColor: '#FFD54F' }))
    elements.push(textElement(createId(), { field: 'date', x: 40, y: 160, width: 640, height: 44, fontSize: 24, fontWeight: 500, textAlign: 'center', fontColor: 'rgba(255,255,255,0.85)' }))
    elements.push(textElement(createId(), { field: 'team.{i}.rank', repeat: true, x: 40, y: top, width: 84, height: rowH, fontSize: 22, fontWeight: 800, textAlign: 'center', fontColor: '#FFD54F' }))
    elements.push(textElement(createId(), { field: 'team.{i}.name', repeat: true, x: 128, y: top, width: 432, height: rowH, fontSize: 24, fontWeight: 700, textAlign: 'left', fontColor: '#FFFFFF' }))
    elements.push(textElement(createId(), { field: 'team.{i}.points', repeat: true, x: 560, y: top, width: 120, height: rowH, fontSize: 24, fontWeight: 800, textAlign: 'right', fontColor: '#EDE7F6' }))
    elements.push(textElement(createId(), { text: "Rendezvous'26 · ISRA Vatanappally", x: 40, y: 908, width: 640, height: 32, fontSize: 16, fontWeight: 500, textAlign: 'center', fontColor: 'rgba(255,255,255,0.7)' }))

    return {
      id,
      name: 'Team Standings',
      type: 'standings',
      createdAt: now,
      updatedAt: now,
      teamsToShow: rows,
      background: { kind: 'gradient', gradient: BG_PRESETS.gradient[0].css, color: '#5E35B1', imageUrl: '' },
      elements,
    }
  }

  // Default Program Result template
  const top = 330
  const rowH = 300
  const elements = []
  elements.push(textElement(createId(), { field: 'programme.name', x: 40, y: 60, width: 640, height: 96, fontSize: 48, fontWeight: 800, textTransform: 'uppercase', fontColor: '#FFFFFF' }))
  elements.push(textElement(createId(), { field: 'result.resultNo', prefix: '#', x: 150, y: 168, width: 420, height: 56, fontSize: 32, fontWeight: 800, fontColor: '#FFD54F' }))
  elements.push(textElement(createId(), { field: 'programme.category', x: 40, y: 236, width: 640, height: 44, fontSize: 24, fontWeight: 600, textTransform: 'uppercase', fontColor: 'rgba(255,255,255,0.85)' }))
  elements.push(textElement(createId(), { field: 'placement.{i}.rank', repeat: true, x: 40, y: top, width: 150, height: rowH, fontSize: 24, fontWeight: 800, textAlign: 'left', fontColor: '#FFD54F' }))
  elements.push(textElement(createId(), { field: 'placement.{i}.name', repeat: true, x: 200, y: top, width: 340, height: rowH, fontSize: 28, fontWeight: 700, textAlign: 'left', fontColor: '#FFFFFF' }))
  elements.push(textElement(createId(), { field: 'placement.{i}.points', repeat: true, x: 560, y: top, width: 120, height: rowH, fontSize: 28, fontWeight: 800, textAlign: 'right', fontColor: '#EDE7F6' }))
  elements.push(textElement(createId(), { text: "Rendezvous'26 · ISRA Vatanappally", x: 40, y: 908, width: 640, height: 32, fontSize: 16, fontWeight: 500, textAlign: 'center', fontColor: 'rgba(255,255,255,0.7)' }))

  return {
    id,
    name: 'Program Result',
    type: 'result',
    createdAt: now,
    updatedAt: now,
    background: { kind: 'gradient', gradient: BG_PRESETS.gradient[0].css, color: '#5E35B1', imageUrl: '' },
    elements,
  }
}

// ── Storage ──

export const loadTemplates = () => {
  try {
    const raw = localStorage.getItem(POSTER_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    return list.filter(t => t && t.id && t.elements)
  } catch {
    localStorage.removeItem(POSTER_STORAGE_KEY)
    return []
  }
}

export const persistTemplates = (list) => {
  localStorage.setItem(POSTER_STORAGE_KEY, JSON.stringify(list))
}

export const seedTemplatesIfEmpty = () => {
  const list = loadTemplates()
  if (list.length > 0) return list
  const seeded = [createDefaultTemplate('result'), createDefaultTemplate('standings')]
  persistTemplates(seeded)
  return seeded
}

// ── Data resolution ──

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const resolveStudent = (studentId, studentMap, teamNameToId) => {
  const s = studentMap[studentId]
  if (!s) return { team: '', chestNo: '' }
  const teamName = Object.keys(teamNameToId).find(n => teamNameToId[n] === s.team) || s.team || ''
  return { team: teamName, chestNo: s.chestNo || '' }
}

// Build the value map for a single generated poster.
export const buildPosterSource = ({ type, programme, result, studentMap = {}, teamNameToId = {}, teams = [] }) => {
  if (type === 'standings') {
    return {
      type: 'standings',
      standings: { title: 'TEAM STANDINGS' },
      date: fmtDate(new Date().toISOString()),
      teams: teams.map((t, i) => ({ rank: i + 1, name: t.name, points: Number(t.totalPoints || 0) })),
    }
  }

  const placements = []
  const rows = ['first', 'second', 'third']
  rows.forEach((key, i) => {
    const p = result?.[key]
    const meta = p?.studentId ? resolveStudent(p.studentId, studentMap, teamNameToId) : { team: '', chestNo: '' }
    placements.push({
      rank: ordinal(i + 1),
      name: p?.name || '',
      points: p?.points ?? '',
      grade: p?.grade || '',
      team: meta.team,
      chestNo: meta.chestNo ? `#${meta.chestNo}` : '',
    })
  })

  return {
    type: 'result',
    programme: { name: programme?.name || '', category: programme?.category || '' },
    result: { resultNo: result?.resultNo ? `#${result.resultNo}` : '' },
    date: fmtDate(result?.updatedAt || new Date().toISOString()),
    placements,
  }
}

// Sample sources render templates in the gallery/editor before any live data
// is chosen, so designs never look empty.
export const makeSampleSource = (type) => {
  if (type === 'standings') {
    const names = ['Crescent', 'Al Hilal', 'Ashraf', 'Uthman', 'Zainab', 'Farhan', 'Salim', 'Amina']
    return {
      type: 'standings',
      standings: { title: 'TEAM STANDINGS' },
      date: fmtDate(new Date().toISOString()),
      teams: names.map((n, i) => ({ rank: i + 1, name: n, points: 120 - i * 12 })),
    }
  }
  const samples = [
    { name: 'Aysha Fathima', points: 10, grade: 'A+', team: 'Crescent', chestNo: '#14' },
    { name: 'Muhammed Irfan', points: 9, grade: 'A', team: 'Al Hilal', chestNo: '#27' },
    { name: 'Hana Naseer', points: 8, grade: 'A', team: 'Ashraf', chestNo: '#8' },
  ]
  return {
    type: 'result',
    programme: { name: 'Group Song (Malayalam)', category: 'General Cat-A' },
    result: { resultNo: '#12' },
    date: fmtDate(new Date().toISOString()),
    placements: samples.map((s, i) => ({ rank: ordinal(i + 1), name: s.name, points: s.points, grade: s.grade, team: s.team, chestNo: s.chestNo })),
  }
}

// Number of rows a repeating element should render for a given field.
export const rowCountFor = (field, source) => {
  if (!isRepeatableField(field)) return 1
  return source?.type === 'standings' ? (source.teams?.length || 1) : (source?.placements?.length || 1)
}

// Resolve a (possibly repeating) field key to its text value at row i (1-based).
export const resolveFieldValue = (source, field, i = 1) => {
  if (!source) return ''
  const resolved = field.replace('{i}', String(i))

  if (resolved.startsWith('placement.')) {
    const p = source.placements?.[i - 1]
    if (!p) return ''
    const key = resolved.replace('placement.{i}.', '').replace(`placement.${i}.`, '')
    const val = p[key]
    return val == null ? '' : String(val)
  }

  if (resolved.startsWith('team.')) {
    const t = source.teams?.[i - 1]
    if (!t) return ''
    const key = resolved.replace('team.{i}.', '').replace(`team.${i}.`, '')
    const val = t[key]
    return val == null ? '' : String(val)
  }

  const direct = {
    'programme.name': source.programme?.name,
    'programme.category': source.programme?.category,
    'result.resultNo': source.result?.resultNo,
    'standings.title': source.standings?.title,
    'date': source.date,
  }
  const val = direct[resolved]
  return val == null ? '' : String(val)
}

// Full text for an element (mapped field with prefix/suffix, or static text).
export const elementText = (el, source, i) => {
  if (!el.field) return el.text || ''
  const raw = resolveFieldValue(source, el.field, i)
  if (!raw) return ''
  return `${el.prefix || ''}${raw}${el.suffix || ''}`
}

// Rows an element actually renders (repeated rows, or a single row).
export const elementRows = (el, source) => {
  if (el.repeat && isRepeatableField(el.field)) return rowCountFor(el.field, source)
  return 1
}
