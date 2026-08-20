// ─────────────────────────────────────────────────────────────
// Poster template model + helpers for the Program Posters →
// Templates system (visual drag-and-drop template editor →
// data mapping → generate → 1:1 export).
//
// Templates are pure design/layout definitions (background + positioned
// text layers). They never hold real result data — real data is injected
// only at render time when the Results page auto-generates a poster per
// template (buildPosterSource + resolveFieldValue).
//
// Storage is Supabase-backed (shared with every user) with a localStorage
// fallback so the editor still works before the poster_templates migration
// SQL has been run once.
// ─────────────────────────────────────────────────────────────

import {
  getPosterTemplates, upsertPosterTemplates, deletePosterTemplates, fetchPosterTemplateIds,
} from '../supabase/queries'

// New templates are 1:1 square (event-poster standard). Templates saved by
// earlier versions don't carry a `canvas` — they keep their legacy layout.
export const POSTER_CANVAS = { width: 1080, height: 1080 }
export const LEGACY_CANVAS = { width: 720, height: 960 }
export const canvasFor = (template) => template?.canvas || LEGACY_CANVAS

export const POSTER_STORAGE_KEY = 'poster_templates_v1'

export const TEMPLATE_TYPES = {
  result: {
    key: 'result',
    label: 'Program Result Poster',
    short: 'Program Result',
    description: 'A single programme’s winners — result no, programme, category & 1st/2nd/3rd.',
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

// Display number for a template inside a list (1-based, zero-padded).
export const templateIndexLabel = (list, id) => {
  const idx = (list || []).findIndex(t => t && t.id === id)
  return `#${String(idx + 1).padStart(2, '0')}`
}

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

// ── Colour themes for the event-poster design ──
// Light: off-white + soft blurred pastels (pale yellow, green, cyan).
// Dark: deep black/blue + luminous glows (blue, cyan, purple).
const PALETTES = {
  light: {
    bg: 'radial-gradient(circle at 14% 16%, #FFF3C4 0%, transparent 42%), radial-gradient(circle at 86% 14%, #D9F4E8 0%, transparent 42%), radial-gradient(circle at 82% 84%, #D8F0FA 0%, transparent 46%), #FBF7EE',
    header: '#1D192B',
    muted: 'rgba(29, 25, 43, 0.62)',
    label: '#676375',
    accent: '#E57F17',
    body: '#1D192B',
  },
  dark: {
    bg: 'radial-gradient(circle at 14% 16%, rgba(61,120,255,0.30) 0%, transparent 42%), radial-gradient(circle at 86% 14%, rgba(45,212,255,0.22) 0%, transparent 42%), radial-gradient(circle at 80% 84%, rgba(179,110,255,0.30) 0%, transparent 46%), #0B0F19',
    header: '#FFFFFF',
    muted: 'rgba(255,255,255,0.62)',
    label: '#C9D6FF',
    accent: '#FFC94D',
    body: '#FFFFFF',
  },
}

export const PALETTE_KEYS = Object.keys(PALETTES)
export const paletteFor = (theme) => PALETTES[theme] || PALETTES.light

export const BG_PRESETS = {
  solid: ['#5E35B1', '#7C4DFF', '#0B0F19', '#112E81', '#0F766E', '#B91C1C', '#FFFFFF'],
  gradient: [
    { label: 'Pastel Frame', css: PALETTES.light.bg },
    { label: 'Luminous Glow', css: PALETTES.dark.bg },
    { label: 'Purple Night', css: 'linear-gradient(160deg, #5E35B1 0%, #3E1F8E 55%, #1D192B 100%)' },
    { label: 'Ocean', css: 'linear-gradient(160deg, #0F2A3D 0%, #2872A1 60%, #5C93AA 100%)' },
    { label: 'Sunset', css: 'linear-gradient(160deg, #B91C1C 0%, #E8845C 55%, #FFD54F 120%)' },
    { label: 'Emerald', css: 'linear-gradient(160deg, #064E3B 0%, #0F766E 55%, #34D399 120%)' },
    { label: 'Midnight', css: 'linear-gradient(160deg, #0B0F19 0%, #1B1927 55%, #334155 120%)' },
  ],
}

// ── Image helpers (background / logo / frame uploads) ──
export const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('The image could not be loaded'))
  img.src = src
})

// Downscales/compresses an image source into a storage-safe data URL. Large
// data URLs blow past localStorage quotas, which is what made background
// images appear to "not persist" after save/reopen.
export const compressImageSrc = async (src, maxDim = 1600, mime = 'image/jpeg', quality = 0.85) => {
  const img = await loadImage(src)
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL(mime, quality)
}

export const compressImageFile = async (file, maxDim = 1600, mime = 'image/jpeg', quality = 0.85) => {
  const url = URL.createObjectURL(file)
  try {
    return await compressImageSrc(url, maxDim, mime, quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ── Template factory ──
const textElement = (id, props) => ({
  id,
  field: null,
  text: '',
  prefix: '',
  suffix: '',
  repeat: false,
  x: 60,
  y: 60,
  width: 960,
  height: 50,
  fontSize: 24,
  fontColor: '#FFFFFF',
  fontWeight: 600,
  fontFamily: 'Sora',
  textAlign: 'center',
  textTransform: 'none',
  lineHeight: 1.15,
  ...props,
})

// Shared compact header: event logo (ISRA / LIFE FESTIVAL) + metadata.
const buildHeaderElements = (palette) => [
  textElement(createId(), { text: 'ISRA', x: 90, y: 52, width: 180, height: 62, fontSize: 46, fontWeight: 800, textAlign: 'left', fontColor: palette.header }),
  textElement(createId(), { text: 'LIFE · FESTIVAL', x: 90, y: 120, width: 220, height: 26, fontSize: 18, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontColor: palette.muted }),
  textElement(createId(), { text: "RENDEZVOUS'26", x: 700, y: 52, width: 290, height: 30, fontSize: 20, fontWeight: 800, textAlign: 'right', textTransform: 'uppercase', fontColor: palette.header }),
  textElement(createId(), { text: 'ISRA VATANAPPALLY', x: 700, y: 86, width: 290, height: 24, fontSize: 14, fontWeight: 600, textAlign: 'right', textTransform: 'uppercase', fontColor: palette.muted }),
  textElement(createId(), { field: 'date', x: 700, y: 118, width: 290, height: 24, fontSize: 14, fontWeight: 500, textAlign: 'right', fontColor: palette.muted }),
]

export const createDefaultTemplate = (type, theme = 'light') => {
  const now = new Date().toISOString()
  const id = createId()
  const palette = paletteFor(theme)
  const header = buildHeaderElements(palette)

  if (type === 'standings') {
    const elements = [
      ...header,
      textElement(createId(), { text: 'TEAM STANDINGS', x: 60, y: 168, width: 960, height: 76, fontSize: 60, fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', fontColor: palette.body }),
      textElement(createId(), { text: 'OVERALL LEADERBOARD', x: 60, y: 250, width: 960, height: 30, fontSize: 20, fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontColor: palette.label }),
      textElement(createId(), { field: 'team.{i}.rank', repeat: true, x: 90, y: 320, width: 110, height: 670, fontSize: 30, fontWeight: 800, textAlign: 'left', fontColor: palette.accent }),
      textElement(createId(), { field: 'team.{i}.name', repeat: true, x: 210, y: 320, width: 620, height: 670, fontSize: 34, fontWeight: 700, textAlign: 'left', fontColor: palette.body }),
      textElement(createId(), { field: 'team.{i}.points', repeat: true, x: 850, y: 320, width: 140, height: 670, fontSize: 32, fontWeight: 800, textAlign: 'right', fontColor: palette.accent }),
      textElement(createId(), { text: "Rendezvous'26 · ISRA Vatanappally · Festival Collective", x: 90, y: 1020, width: 900, height: 30, fontSize: 16, fontWeight: 500, textAlign: 'center', fontColor: palette.muted }),
    ]
    return {
      id,
      name: theme === 'dark' ? 'Standings Scoreboard — Dark' : 'Standings Scoreboard — Light',
      type: 'standings',
      canvas: { width: 1080, height: 1080 },
      teamsToShow: 8,
      createdAt: now,
      updatedAt: now,
      background: { kind: 'gradient', gradient: palette.bg, color: palette.bg, imageUrl: '' },
      elements,
    }
  }

  // Default Program Result poster — 1:1 event-poster layout:
  // left = programme info (result no / programme / category), right = winners.
  const elements = [
    ...header,
    textElement(createId(), { text: 'RESULT', x: 90, y: 244, width: 200, height: 28, fontSize: 20, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', fontColor: palette.label }),
    textElement(createId(), { field: 'result.resultNo', x: 90, y: 282, width: 420, height: 118, fontSize: 96, fontWeight: 800, textAlign: 'left', fontColor: palette.accent }),
    textElement(createId(), { field: 'programme.name', x: 90, y: 430, width: 420, height: 300, fontSize: 50, fontWeight: 800, textAlign: 'left', fontColor: palette.body }),
    textElement(createId(), { field: 'programme.category', x: 90, y: 742, width: 420, height: 38, fontSize: 26, fontWeight: 600, textAlign: 'left', fontColor: palette.label }),
    textElement(createId(), { text: 'WINNERS', x: 570, y: 244, width: 420, height: 28, fontSize: 20, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', fontColor: palette.label }),
    textElement(createId(), { field: 'placement.{i}.rank', repeat: true, x: 570, y: 300, width: 80, height: 520, fontSize: 42, fontWeight: 800, textAlign: 'left', fontColor: palette.accent }),
    textElement(createId(), { field: 'placement.{i}.name', repeat: true, x: 655, y: 300, width: 250, height: 520, fontSize: 30, fontWeight: 800, textAlign: 'left', fontColor: palette.body }),
    textElement(createId(), { field: 'placement.{i}.team', repeat: true, x: 915, y: 300, width: 100, height: 520, fontSize: 19, fontWeight: 500, textAlign: 'left', fontColor: palette.muted }),
    textElement(createId(), { text: "Rendezvous'26 · ISRA Vatanappally · Festival Collective", x: 90, y: 980, width: 900, height: 30, fontSize: 16, fontWeight: 500, textAlign: 'center', fontColor: palette.muted }),
  ]
  return {
    id,
    name: theme === 'dark' ? 'Result Poster — Dark' : 'Result Poster — Light',
    type: 'result',
    canvas: { width: 1080, height: 1080 },
    createdAt: now,
    updatedAt: now,
    background: { kind: 'gradient', gradient: palette.bg, color: palette.bg, imageUrl: '' },
    elements,
  }
}

// Curated built-in designs for "Explore Public Templates" — the admin picks
// one and it is duplicated into their own template library.
export const PUBLIC_TEMPLATES = [
  { type: 'result', theme: 'light', label: 'Result Poster — Light' },
  { type: 'result', theme: 'dark', label: 'Result Poster — Dark' },
  { type: 'standings', theme: 'light', label: 'Standings Scoreboard — Light' },
  { type: 'standings', theme: 'dark', label: 'Standings Scoreboard — Dark' },
]

export const explorePublicTemplates = () => PUBLIC_TEMPLATES.map(p => createDefaultTemplate(p.type, p.theme))

// ── Storage (Supabase-backed with localStorage fallback) ──
const DB_SEED_KEY = 'poster_templates_db_seeded_v1'

const isUuid = (id) => (
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
)

// Normalize a raw row/template into the app model (legacy templates lack
// `canvas` / `elements` guards).
const cast = (t) => ensureCanvas({
  ...t,
  id: t.id || createId(),
  elements: Array.isArray(t?.elements) ? t.elements : [],
  background: t?.background || { kind: 'solid', color: '#5E35B1', gradient: '', imageUrl: '' },
})

const ensureCanvas = (t) => (t && t.canvas ? t : { ...t, canvas: LEGACY_CANVAS })

const toRow = (t) => ({
  id: t.id,
  name: t.name ?? 'Untitled Template',
  type: t.type ?? 'result',
  canvas: t.canvas || null,
  background: t.background && (t.background.imageUrl || t.background.gradient || t.background.kind) ? t.background : null,
  elements: Array.isArray(t.elements) ? t.elements : [],
  teamsToShow: Number(t.teamsToShow ?? 8) || 8,
})

const readLocal = () => {
  try {
    const raw = localStorage.getItem(POSTER_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    return list.filter(t => t && t.id && t.elements).map(cast)
  } catch {
    localStorage.removeItem(POSTER_STORAGE_KEY)
    return []
  }
}

const writeLocal = (list) => {
  try {
    localStorage.setItem(POSTER_STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.warn('Could not cache templates locally:', e)
  }
}

const loadFromDb = async () => {
  const data = await getPosterTemplates()
  return (data || []).map(cast)
}

export const loadTemplates = async () => {
  try {
    const db = await loadFromDb()
    if (db.length > 0) return db

    // DB is healthy but empty — import any templates cached locally once,
    // so pre-migration work is not lost. Normalize legacy non-uuid ids.
    if (localStorage.getItem(DB_SEED_KEY) !== '1') {
      const local = readLocal().map(t => (isUuid(t.id) ? t : { ...t, id: createId() }))
      if (local.length > 0) {
        writeLocal(local)
        await persistTemplates(local)
        localStorage.setItem(DB_SEED_KEY, '1')
        return local
      }
    }
    return []
  } catch (e) {
    // DB missing / offline — fall back to the local cache.
    console.warn('Poster templates DB unavailable, using local cache:', e)
    return readLocal()
  }
}

export const persistTemplates = async (list) => {
  const normalized = list.map(cast)
  writeLocal(normalized)
  try {
    const keepIds = normalized.map(t => t.id).filter(Boolean)
    const existingIds = await fetchPosterTemplateIds()
    const stale = existingIds.filter(id => !keepIds.includes(id))
    if (stale.length > 0) await deletePosterTemplates(stale)
    if (normalized.length > 0) {
      const { error } = await upsertPosterTemplates(normalized.map(toRow))
      if (error) throw error
    }
    return { backend: 'supabase' }
  } catch (e) {
    // Table may not exist yet (migration SQL not run) — keep everything in
    // the local cache so no work is lost.
    console.warn('Supabase save failed; kept local cache:', e)
    return { backend: 'local' }
  }
}

export const seedTemplatesIfEmpty = async () => {
  const list = await loadTemplates()
  if (list.length > 0) return list
  const seeded = [createDefaultTemplate('result', 'light'), createDefaultTemplate('standings', 'light')]
  await persistTemplates(seeded)
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