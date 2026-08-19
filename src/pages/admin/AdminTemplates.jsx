import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import {
  ArrowLeft, ChevronLeft, Save, Plus, Trash2, Copy, Wand2, Download, X,
  Type, Palette, Eye, SlidersHorizontal, Layers, Pencil, Layers2,
} from 'lucide-react'
import PosterStage from '../../components/PosterStage'
import { useToast } from '../../components/Toast'
import {
  TEMPLATE_TYPES, FIELD_GROUPS, BG_PRESETS,
  FONT_FAMILIES, createDefaultTemplate, createId,
  persistTemplates, seedTemplatesIfEmpty,
  buildPosterSource, makeSampleSource, isRepeatableField,
} from '../../utils/posterTemplates'
import { getProgrammes, getStudents, getTeams, getResultsForFinishedProgrammes } from '../../supabase/queries'

// Small form-field helpers styled with the site's theme tokens.
const Section = ({ title, children, className = '' }) => (
  <div className={`bg-card rounded-2xl border border-secondary/30 p-4 ${className}`}>
    {title && <h4 className="text-mainText font-semibold text-sm mb-3 flex items-center gap-2">{title}</h4>}
    {children}
  </div>
)

const Field = ({ label, children }) => (
  <label className="block mb-3">
    <span className="text-mutedText text-xs font-semibold block mb-1.5">{label}</span>
    {children}
  </label>
)

const inputCls = 'w-full rounded-xl bg-black/10 dark:bg-black/20 border border-secondary/40 text-mainText px-3 py-2 text-sm outline-none focus:border-primary transition'
const selectCls = inputCls + ' appearance-none cursor-pointer'

const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-6 rounded-full transition-colors duration-300 shrink-0 ${checked ? 'bg-primary' : 'bg-white/20 border border-secondary/40'}`}
    aria-pressed={checked}
    title={label}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${checked ? 'translate-x-4' : ''}`} />
  </button>
)

// ─────────────────────────────────────────────
// Main Templates feature
// ─────────────────────────────────────────────
export default function AdminTemplates({ onClose }) {
  const toast = useToast()
  const [templates, setTemplates] = useState(() => seedTemplatesIfEmpty())
  const [view, setView] = useState('list') // 'list' | 'editor' | 'generate'
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [zoom, setZoom] = useState(0.6)

  const persist = (next) => {
    setTemplates(next)
    persistTemplates(next)
  }

  // ---- Generation data ----
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [results, setResults] = useState([])
  useEffect(() => {
    Promise.all([getProgrammes(), getStudents(), getTeams(), getResultsForFinishedProgrammes()]).then(
      ([p, s, t, r]) => { setProgrammes(p); setStudents(s); setTeams(t); setResults(r) },
    )
  }, [])

  // ---- Gallery actions ----
  const createTemplate = (type) => {
    const t = createDefaultTemplate(type)
    persist([...templates, t])
    setActiveTemplate(t)
    setSelectedId(null)
    setView('editor')
  }

  const editTemplate = (t) => {
    setActiveTemplate(t)
    setSelectedId(null)
    setView('editor')
  }

  const startGenerate = (t) => {
    setActiveTemplate(t)
    setView('generate')
  }

  const duplicateTemplate = (t) => {
    const copy = JSON.parse(JSON.stringify(t))
    copy.id = createId()
    copy.name = `${t.name} (Copy)`
    copy.createdAt = new Date().toISOString()
    copy.updatedAt = copy.createdAt
    persist([...templates, copy])
    toast('Template duplicated')
  }

  const deleteTemplate = (t) => {
    if (!window.confirm(`Delete template "${t.name}"? This cannot be undone.`)) return
    persist(templates.filter(x => x.id !== t.id))
    toast('Template deleted')
  }

  // ---- Editor element ops ----
  const patchTemplate = (patch) => setActiveTemplate(prev => ({ ...prev, ...patch }))

  const patchElement = (id, patch) => {
    setActiveTemplate(prev => prev && {
      ...prev,
      elements: prev.elements.map(e => (e.id === id ? { ...e, ...patch } : e)),
    })
  }

  const addElement = () => {
    const el = {
      id: createId(),
      field: null,
      text: 'Your text',
      prefix: '', suffix: '',
      repeat: false,
      x: 60, y: 80, width: 600, height: 48,
      fontSize: 24, fontColor: '#FFFFFF', fontWeight: 600,
      fontFamily: 'Sora', textAlign: 'center', textTransform: 'none',
    }
    setActiveTemplate(prev => prev && ({ ...prev, elements: [...prev.elements, el] }))
    setSelectedId(el.id)
  }

  const removeElement = (id) => {
    setActiveTemplate(prev => prev && ({ ...prev, elements: prev.elements.filter(e => e.id !== id) }))
    setSelectedId(null)
  }

  const saveTemplate = () => {
    if (!activeTemplate?.name?.trim()) { toast('Give the template a name first', 'error'); return }
    const updated = { ...activeTemplate, updatedAt: new Date().toISOString() }
    const next = templates.some(t => t.id === updated.id)
      ? templates.map(t => (t.id === updated.id ? updated : t))
      : [...templates, updated]
    persist(next)
    setActiveTemplate(updated)
    toast('Template saved')
  }

  // Preview data shown while editing a layout.
  const editorSource = useMemo(
    () => (activeTemplate ? makeSampleSource(activeTemplate.type) : null),
    [activeTemplate?.type], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ── Generation helpers ──
  const studentMap = useMemo(() => {
    const m = {}
    students.forEach(s => { m[s.id] = s })
    return m
  }, [students])

  const teamNameToId = useMemo(() => {
    const m = {}
    teams.forEach(t => { m[t.name] = t.id })
    return m
  }, [teams])

  const resultByProgramme = useMemo(() => {
    const m = {}
    results.forEach(r => { if (r.programmeId) m[r.programmeId] = r })
    return m
  }, [results])

  const stableProgrammes = useMemo(() => {
    return programmes.filter(p => resultByProgramme[p.id])
      .sort((a, b) => (resultByProgramme[b.id]?.resultNo || 0) - (resultByProgramme[a.id]?.resultNo || 0))
  }, [programmes, resultByProgramme])

  const computeStandings = () => {
    const totals = teams.map(team => {
      let total = 0
      results.forEach(r => {
        ['first', 'second', 'third'].forEach(key => {
          const p = r[key]
          if (!p?.studentId) return
          const s = studentMap[p.studentId]
          if (!s) return
          const teamId = teamNameToId[s.team] || s.team
          if (teamId === team.id) total += Number(p.points) || 0
        })
      })
      return { id: team.id, name: team.name, totalPoints: total }
    })
    return totals.sort((a, b) => b.totalPoints - a.totalPoints)
  }

  // ── Generate view state ──
  const [genProgrammeId, setGenProgrammeId] = useState('')
  const [genTeamCount, setGenTeamCount] = useState(8)
  const [downloading, setDownloading] = useState(false)
  const captureRef = useRef(null)

  const generateSource = useMemo(() => {
    if (!activeTemplate) return null
    if (activeTemplate.type === 'standings') {
      const totals = computeStandings()
      const count = Math.max(1, Math.min(genTeamCount, totals.length))
      return buildPosterSource({
        type: 'standings',
        teams: totals.slice(0, count).map(t => ({ name: t.name, totalPoints: t.totalPoints })),
      })
    }
    const prog = genProgrammeId ? programmes.find(p => p.id === genProgrammeId) : null
    if (!prog) {
      const first = stableProgrammes[0]
      if (first) return buildPosterSource({ type: 'result', programme: first, result: resultByProgramme[first.id], studentMap, teamNameToId })
      return makeSampleSource('result')
    }
    return buildPosterSource({ type: 'result', programme: prog, result: resultByProgramme[prog.id], studentMap, teamNameToId })
  }, [activeTemplate, genProgrammeId, genTeamCount, programmes, results, teams, students, studentMap, teamNameToId]) // eslint-disable-line react-hooks/exhaustive-deps

  const standingsList = useMemo(() => (activeTemplate?.type === 'standings' ? computeStandings() : []), [activeTemplate?.type, results, teams, studentMap, teamNameToId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (view === 'generate' && activeTemplate?.type === 'standings') {
      setGenTeamCount(activeTemplate.teamsToShow || 8)
    }
    if (view === 'generate' && activeTemplate?.type === 'result') {
      setGenProgrammeId(stableProgrammes[0]?.id || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeTemplate?.id, activeTemplate?.type])

  const download = async () => {
    const node = captureRef.current
    if (!node || downloading) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: null })
      canvas.toBlob((blob) => {
        if (blob) {
          const base = (activeTemplate?.name || 'poster').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'poster'
          saveAs(blob, `${base}_${Date.now()}.png`)
          toast('Poster exported')
        }
        setDownloading(false)
      })
    } catch (err) {
      console.error('Poster export failed:', err)
      toast('Export failed. Please try again.', 'error')
      setDownloading(false)
    }
  }

  // Wrap the stage in a card with a light backdrop so the two themes both read.
  const stageShell = (source, scale, editable, extra) => (
    <div className="rounded-2xl p-3 sm:p-5 bg-card border border-secondary/30 inline-block">
      <div className="rounded-lg overflow-auto">
        <PosterStage
          template={activeTemplate}
          source={source}
          scale={scale}
          editable={editable}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChangeElement={patchElement}
          captureRef={captureRef}
        />
      </div>
      {extra}
    </div>
  )

  const grouped = useMemo(() => ({
    result: templates.filter(t => t.type === 'result'),
    standings: templates.filter(t => t.type === 'standings'),
  }), [templates])

  // ── Render: List ──
  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-card rounded-xl p-3 shadow-sm border border-secondary/30">
              <Layers2 size={22} className="text-accent" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Poster Templates</h2>
              <p className="text-mutedText text-sm">Design reusable posters once, then fill them with programme results or team standings.</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-mutedText hover:text-mainText border border-secondary/30 hover:bg-white/10 transition shrink-0">
              <X size={16} /> Close
            </button>
          )}
        </div>

        {['result', 'standings'].map(typeKey => (
          <div key={typeKey} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-mainText font-bold flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${typeKey === 'result' ? 'bg-accent' : 'bg-success'}`} />
                  {TEMPLATE_TYPES[typeKey].label}
                </h3>
                <p className="text-mutedText text-xs mt-0.5">{TEMPLATE_TYPES[typeKey].description}</p>
              </div>
              <button
                onClick={() => createTemplate(typeKey)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition"
              >
                <Plus size={15} /> New Template
              </button>
            </div>

            {grouped[typeKey].length === 0 ? (
              <div className="bg-card rounded-2xl border border-secondary/30 p-8 text-center text-mutedText text-sm">
                No {TEMPLATE_TYPES[typeKey].short.toLowerCase()} templates yet. Create one to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[typeKey].map(t => (
                  <div key={t.id} className="bg-card rounded-2xl border border-secondary/30 p-3 flex flex-col gap-3 hover:shadow-lg transition">
                    <div className="mx-auto">
                      <PosterStage template={t} source={makeSampleSource(t.type)} scale={0.3} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-mainText font-semibold text-sm truncate">{t.name}</p>
                      <span className="text-mutedText text-[10px] uppercase tracking-wider shrink-0">{TEMPLATE_TYPES[t.type].short}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startGenerate(t)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-success hover:bg-success/90 text-white text-xs font-bold rounded-xl py-2 transition"
                      >
                        <Wand2 size={14} /> Use
                      </button>
                      <button
                        onClick={() => editTemplate(t)}
                        title="Edit template"
                        className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl py-2 transition"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => duplicateTemplate(t)}
                        title="Duplicate template"
                        className="p-2 rounded-xl border border-secondary/40 text-mutedText hover:text-mainText hover:bg-white/10 transition"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => deleteTemplate(t)}
                        title="Delete template"
                        className="p-2 rounded-xl border border-secondary/40 text-red-500 hover:bg-red-500/10 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="bg-card rounded-2xl border border-secondary/30 p-4 text-xs text-mutedText leading-relaxed">
          <p className="font-semibold text-mainText mb-1 flex items-center gap-1.5">
            <Eye size={14} /> How it works
          </p>
          <p>1. Create a template and lay out text elements on the canvas — each element can be a typed label or mapped to a live data field.</p>
          <p>2. Hit <span className="text-accent font-semibold">Use</span> on a template to pick a programme result or team standings.</p>
          <p>3. Live-preview the filled poster, then export it as a high-resolution PNG.</p>
        </div>
      </div>
    )
  }

  // ── Render: Generate ──
  if (view === 'generate') {
    const isStandings = activeTemplate?.type === 'standings'
    return (
      <div className="max-w-5xl mx-auto">
        <button onClick={() => setView('list')} className="flex items-center gap-2 text-mainText mb-4 hover:opacity-80 transition">
          <ArrowLeft size={18} /> Back to templates
        </button>

        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">
              Generate · {activeTemplate?.name}
            </h2>
            <p className="text-mutedText text-sm">
              {isStandings
                ? 'Fill the template with live team standings from finished programme results.'
                : 'Fill the template with a programme’s result and its winners.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setView('editor')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary/90 transition"
            >
              <Pencil size={15} /> Edit Template
            </button>
            <button
              onClick={download}
              disabled={downloading || !generateSource}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-success text-white hover:bg-success/90 transition disabled:opacity-60"
            >
              <Download size={16} /> {downloading ? 'Exporting…' : 'Download PNG'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
          {/* Data selection */}
          <div className="space-y-4">
            <Section title={isStandings ? 'Standings data' : 'Programme result'}>
              {isStandings ? (
                <>
                  <Field label="Teams to show">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max={Math.max(teams.length, 1)}
                        value={genTeamCount}
                        onChange={e => setGenTeamCount(Number(e.target.value))}
                        className="flex-1 accent-[#7C4DFF]"
                      />
                      <span className="text-mainText font-bold text-sm w-10 text-center">{genTeamCount}</span>
                    </div>
                  </Field>
                  <div className="bg-black/10 dark:bg-black/20 rounded-xl p-3 border border-secondary/30 max-h-56 overflow-y-auto">
                    <p className="text-mutedText text-[11px] font-semibold uppercase tracking-wide mb-2">Current ranking</p>
                    {standingsList.slice(0, genTeamCount).map((t, i) => (
                      <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-secondary/20 last:border-0">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-black/20 text-mutedText'}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm text-mainText truncate flex-1">{t.name}</span>
                        <span className="text-sm font-bold text-accent">{t.totalPoints} pts</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Field label="Programme">
                  <select value={genProgrammeId} onChange={e => setGenProgrammeId(e.target.value)} className={selectCls}>
                    {stableProgrammes.length === 0 && <option value="">No finished results yet</option>}
                    {stableProgrammes.map(p => (
                      <option key={p.id} value={p.id}>
                        #{resultByProgramme[p.id]?.resultNo} · {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-mutedText text-[11px] mt-2">Only programmes with a finished result are listed.</p>
                </Field>
              )}
              <div className="flex items-start gap-2 bg-purpleSoft rounded-xl p-3 text-xs text-mutedText mt-2">
                <SlidersHorizontal size={14} className="shrink-0 mt-0.5 text-accent" />
                <p>The mapped text fields on this template are filled automatically from your data — no manual typing.</p>
              </div>
            </Section>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-4">
            <Section title="Live preview" className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3 self-end">
                <span className="text-mutedText text-xs font-semibold">Zoom</span>
                <button onClick={() => setZoom(z => Math.max(0.2, +(z - 0.05).toFixed(2)))} className="p-1.5 rounded-lg border border-secondary/40 text-mutedText hover:text-mainText transition">−</button>
                <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.05).toFixed(2)))} className="p-1.5 rounded-lg border border-secondary/40 text-mutedText hover:text-mainText transition">+</button>
              </div>
              {stageShell(generateSource, zoom, false)}
            </Section>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Editor ──
  const selected = activeTemplate?.elements?.find(e => e.id === selectedId)
  const elGroups = activeTemplate ? (FIELD_GROUPS[activeTemplate.type] || []) : []
  const bg = activeTemplate?.background || { kind: 'solid', color: '#5E35B1', gradient: '', imageUrl: '' }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Editor header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <button onClick={() => setView('list')} className="flex items-center gap-2 text-mainText hover:opacity-80 transition">
          <ChevronLeft size={18} /> Templates
        </button>
        <div className="flex items-center gap-3">
          <input
            value={activeTemplate?.name || ''}
            onChange={e => patchTemplate({ name: e.target.value })}
            placeholder="Template name"
            className="min-w-[180px] rounded-xl bg-black/10 dark:bg-black/20 border border-secondary/40 text-mainText px-4 py-2 text-sm font-semibold outline-none focus:border-primary transition"
          />
          <button onClick={saveTemplate} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-success text-white font-bold text-sm hover:bg-success/90 transition">
            <Save size={15} /> Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Controls */}
        <div className="space-y-4 lg:sticky lg:top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pb-4">
          <Section title={<span className="flex items-center gap-2"><Palette size={14} className="text-accent" /> Template</span>}>
            <Field label="Type">
              <div className="rounded-xl bg-black/10 dark:bg-black/20 border border-secondary/40 px-3 py-2 text-sm text-mutedText font-medium">
                {TEMPLATE_TYPES[activeTemplate?.type]?.label}
              </div>
            </Field>
            <Field label="Background">
              <div className="flex gap-1.5 mb-2">
                {(['solid', 'gradient', 'image']).map(k => (
                  <button
                    key={k}
                    onClick={() => patchTemplate({ background: { ...bg, kind: k } })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${bg.kind === k ? 'bg-primary text-white' : 'bg-black/10 dark:bg-black/20 text-mutedText border border-secondary/40'}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              {bg.kind === 'solid' && (
                <div className="flex gap-2 items-center">
                  <input type="color" value={bg.color} onChange={e => patchTemplate({ background: { ...bg, color: e.target.value } })} className="w-10 h-10 rounded-lg bg-transparent border border-secondary/40 cursor-pointer" />
                  <div className="flex flex-wrap gap-1.5">
                    {BG_PRESETS.solid.map(c => (
                      <button key={c} onClick={() => patchTemplate({ background: { ...bg, color: c } })} className="w-6 h-6 rounded-full border border-white/40" style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>
              )}
              {bg.kind === 'gradient' && (
                <div className="grid grid-cols-2 gap-2">
                  {BG_PRESETS.gradient.map(g => (
                    <button key={g.label} onClick={() => patchTemplate({ background: { ...bg, gradient: g.css } })} className="rounded-lg h-9 border border-white/40" style={{ background: g.css }} title={g.label} />
                  ))}
                </div>
              )}
              {bg.kind === 'image' && (
                <>
                  <input
                    type="text"
                    value={bg.imageUrl}
                    onChange={e => patchTemplate({ background: { ...bg, imageUrl: e.target.value } })}
                    placeholder="Paste image URL"
                    className={inputCls + ' mb-2'}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      const reader = new FileReader()
                      reader.onload = () => patchTemplate({ background: { ...bg, imageUrl: reader.result } })
                      reader.readAsDataURL(f)
                      e.target.value = ''
                    }}
                    className="block w-full text-xs text-mutedText file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:text-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:cursor-pointer cursor-pointer"
                  />
                </>
              )}
            </Field>
          </Section>

          <Section title={<span className="flex items-center gap-2"><Layers size={14} className="text-accent" /> Elements</span>}>
            <div className="space-y-1.5 mb-3">
              {activeTemplate?.elements.length === 0 && <p className="text-mutedText text-xs">No text elements yet.</p>}
              {activeTemplate?.elements.map((el, i) => (
                <button
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition border ${selectedId === el.id ? 'border-primary bg-purpleSoft text-mainText' : 'border-secondary/30 bg-black/5 dark:bg-black/20 text-mutedText hover:text-mainText'}`}
                >
                  <Type size={13} className="shrink-0" />
                  <span className="truncate flex-1">{el.field ? el.field : (el.text || 'Text')}</span>
                  <span className="text-[10px] uppercase tracking-wide text-mutedText shrink-0">#{i + 1}</span>
                </button>
              ))}
            </div>
            <button onClick={addElement} className="flex items-center gap-2 w-full justify-center rounded-xl border border-dashed border-secondary/50 text-mutedText hover:text-mainText hover:border-primary py-2.5 text-sm transition">
              <Plus size={15} /> Add text element
            </button>
          </Section>

          {selected && (
            <Section title={<span className="flex items-center gap-2"><Type size={14} className="text-accent" /> Element settings</span>}>
              <Field label="Content source">
                <select
                  value={selected.field || ''}
                  onChange={e => {
                    const field = e.target.value
                    patchElement(selected.id, { field, repeat: isRepeatableField(field) })
                  }}
                  className={selectCls}
                >
                  <option value="">Static text</option>
                  {elGroups.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.fields.map(f => (
                        <option key={f.key} value={f.key}>{f.label}{isRepeatableField(f.key) ? ' (repeats)' : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>

              {selected.field ? (
                <>
                  {isRepeatableField(selected.field) && (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-mutedText text-xs font-semibold">Repeat across rows</span>
                      <Toggle checked={selected.repeat} onChange={v => patchElement(selected.id, { repeat: v })} label="Repeat across rows" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prefix"><input value={selected.prefix} onChange={e => patchElement(selected.id, { prefix: e.target.value })} className={inputCls} placeholder="e.g. #" /></Field>
                    <Field label="Suffix"><input value={selected.suffix} onChange={e => patchElement(selected.id, { suffix: e.target.value })} className={inputCls} placeholder="e.g. pts" /></Field>
                  </div>
                </>
              ) : (
                <Field label="Text">
                  <textarea
                    value={selected.text}
                    onChange={e => patchElement(selected.id, { text: e.target.value })}
                    rows={2}
                    className={inputCls + ' resize-y'}
                  />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Font size">
                  <input type="number" min="8" max="120" value={selected.fontSize} onChange={e => patchElement(selected.id, { fontSize: Number(e.target.value) || 12 })} className={inputCls} />
                </Field>
                <Field label="Color">
                  <input type="color" value={selected.fontColor} onChange={e => patchElement(selected.id, { fontColor: e.target.value })} className="w-full h-10 rounded-lg bg-transparent border border-secondary/40 cursor-pointer" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Font family">
                  <select value={selected.fontFamily} onChange={e => patchElement(selected.id, { fontFamily: e.target.value })} className={selectCls}>
                    {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </Field>
                <Field label="Weight">
                  <select value={selected.fontWeight} onChange={e => patchElement(selected.id, { fontWeight: Number(e.target.value) })} className={selectCls}>
                    {[400, 500, 600, 700, 800].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Alignment">
                  <div className="flex gap-1">
                    {[
                      { v: 'left', label: 'L' },
                      { v: 'center', label: 'C' },
                      { v: 'right', label: 'R' },
                    ].map(a => (
                      <button
                        key={a.v}
                        onClick={() => patchElement(selected.id, { textAlign: a.v })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${selected.textAlign === a.v ? 'bg-primary text-white border-primary' : 'bg-black/10 dark:bg-black/20 text-mutedText border-secondary/40'}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Uppercase">
                  <button
                    onClick={() => patchElement(selected.id, { textTransform: selected.textTransform === 'uppercase' ? 'none' : 'uppercase' })}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition border ${selected.textTransform === 'uppercase' ? 'bg-primary text-white border-primary' : 'bg-black/10 dark:bg-black/20 text-mutedText border-secondary/40'}`}
                  >
                    ABC
                  </button>
                </Field>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {['x', 'y', 'width', 'height'].map(k => (
                  <Field key={k} label={k}>
                    <input type="number" min="0" value={Math.round(selected[k])} onChange={e => patchElement(selected.id, { [k]: Number(e.target.value) || 0 })} className={inputCls} />
                  </Field>
                ))}
              </div>

              <button
                onClick={() => removeElement(selected.id)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 py-2 text-sm font-semibold transition mt-1"
              >
                <Trash2 size={14} /> Delete element
              </button>
            </Section>
          )}
        </div>

        {/* Canvas */}
        <div className="lg:sticky lg:top-4">
          <Section title={<span className="flex items-center gap-2"><Eye size={14} className="text-accent" /> Canvas {selected && <span className="text-mutedText font-normal normal-case text-xs">· drag to move, corner handle to resize</span>}</span>} className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3 self-end">
              <span className="text-mutedText text-xs font-semibold">Zoom</span>
              <button onClick={() => setZoom(z => Math.max(0.2, +(z - 0.05).toFixed(2)))} className="p-1.5 rounded-lg border border-secondary/40 text-mutedText hover:text-mainText transition">−</button>
              <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.05).toFixed(2)))} className="p-1.5 rounded-lg border border-secondary/40 text-mutedText hover:text-mainText transition">+</button>
            </div>
            {stageShell(editorSource, zoom, true)}
          </Section>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={saveTemplate}
              className="flex items-center justify-center gap-2 rounded-xl bg-success hover:bg-success/90 text-white font-bold text-sm py-3 transition"
            >
              <Save size={16} /> Save template
            </button>
            <button
              onClick={() => setView('generate')}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm py-3 transition"
            >
              <Wand2 size={16} /> Use &amp; generate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}