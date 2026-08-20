import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import {
  ArrowLeft, Save, Plus, Trash2, Download, Check, X, Type, Palette,
  Eye, Layers, SlidersHorizontal, Loader2, ImagePlus,
  Wand2, AlignLeft, AlignCenter, AlignRight, Grid3x3, ChevronDown, ChevronRight,
} from 'lucide-react'
import PosterStage from '../../components/PosterStage'
import { useToast } from '../../components/Toast'
import {
  TEMPLATE_TYPES, FIELD_GROUPS, BG_PRESETS, FONT_FAMILIES, canvasFor,
  createId, loadTemplates, persistTemplates,
  buildPosterSource, makeSampleSource, isRepeatableField,
  compressImageSrc,
} from '../../utils/posterTemplates'
import {
  getProgrammes, getStudents, getTeams, getResultsForFinishedProgrammes, uploadTemplateBackground,
} from '../../supabase/queries'

const inputCls = 'w-full rounded-xl bg-black/10 dark:bg-black/20 border border-secondary/40 text-mainText px-3 py-2 text-sm outline-none focus:border-primary transition'
const selectCls = inputCls + ' appearance-none cursor-pointer'
const successRing = ' ring-2 ring-success border-success'

// field.key → human label (e.g. "placement.{i}.name" → "Placement # · Name")
const FIELD_LABEL_MAP = {}
Object.values(FIELD_GROUPS).forEach(groups =>
  groups.forEach(g => g.fields.forEach(f => { FIELD_LABEL_MAP[f.key] = f.label })),
)

const layerLabel = (el) => {
  if (el.field) return FIELD_LABEL_MAP[el.field] || el.field.replace(/\{i\}\.?/g, '').replace(/\./g, ' ')
  return el.text || 'Custom text'
}

const Field = ({ label, children }) => (
  <label className="block mb-3">
    <span className="text-mutedText text-xs font-semibold block mb-1.5">{label}</span>
    {children}
  </label>
)

const Panel = ({ title, children, className = '' }) => (
  <div className={`rounded-2xl border border-secondary/30 bg-card p-4 ${className}`}>
    {title && <h4 className="text-mainText font-semibold text-sm mb-3 flex items-center gap-2">{title}</h4>}
    {children}
  </div>
)

// Build editable sample data for the "Example Poster Data for Preview" panel.
const initSampleState = (type) => {
  const base = makeSampleSource(type)
  if (type === 'standings') {
    return {
      title: base.standings?.title || '',
      teams: (base.teams || []).map(t => ({ name: t.name || '', points: t.points ?? '' })),
    }
  }
  return {
    programmeName: base.programme?.name || '',
    category: base.programme?.category || '',
    resultNo: base.result?.resultNo || '',
    placements: (base.placements || []).map(p => ({ name: p.name || '', team: p.team || '' })),
  }
}

export default function AdminPosterEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [templates, setTemplates] = useState([])
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [zoom, setZoom] = useState(0.5)
  const [grid, setGrid] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(true)
  const [sampleState, setSampleState] = useState(null)
  const [bgStatus, setBgStatus] = useState('idle') // idle | loading | ok | error
  const [bgUrlDirty, setBgUrlDirty] = useState(false)
  const [pendingBg, setPendingBg] = useState(null)
  const [canvasHint, setCanvasHint] = useState('')
  const [saved, setSaved] = useState(false)

  // Export state
  const [exportOpen, setExportOpen] = useState(false)
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [results, setResults] = useState([])
  const [genProgrammeId, setGenProgrammeId] = useState('')
  const [genTeamCount, setGenTeamCount] = useState(8)
  const [downloading, setDownloading] = useState(false)
  const captureRef = useRef(null)

  // Load the template being edited (matches route /admin/frames/templates/:id/edit)
  useEffect(() => {
    (async () => {
      const list = await loadTemplates()
      const found = list.find(t => t?.id === id)
      if (found) {
        setTemplates(list)
        setTemplate(JSON.parse(JSON.stringify(found)))
        setSelectedId(null)
      } else {
        toast('Template not found', 'error')
        navigate('/admin/frames/templates', { replace: true })
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    Promise.all([getProgrammes(), getStudents(), getTeams(), getResultsForFinishedProgrammes()]).then(
      ([p, s, t, r]) => { setProgrammes(p); setStudents(s); setTeams(t); setResults(r) },
    )
  }, [])

  // (Re)build the editable sample source used by the preview.
  useEffect(() => {
    if (template?.id) setSampleState(initSampleState(template.type))
  }, [template?.id, template?.type])

  const bg = template?.background || { kind: 'solid', color: '#5E35B1', gradient: '', imageUrl: '' }
  const selected = template ? template.elements.find(e => e.id === selectedId) || null : null
  const elGroups = FIELD_GROUPS[template?.type] || []
  const canvasCfg = canvasFor(template || {})

  const patchTemplate = (patch) => setTemplate(prev => prev && { ...prev, ...patch })

  const patchElement = (elId, patch) => {
    setTemplate(prev => prev && ({
      ...prev,
      elements: prev.elements.map(e => (e.id === elId ? { ...e, ...patch } : e)),
    }))
  }

  const saveTemplate = async () => {
    if (!template.name?.trim()) { toast('Give the template a name first', 'error'); return }
    setSaving(true)
    let final = template
    try {
      // Upload a freshly-picked background to Supabase Storage now so the
      // template record persists the public URL (not a huge data URL).
      if (pendingBg && final.background.kind === 'image') {
        const publicUrl = await uploadTemplateBackground(pendingBg, final.id)
        final = { ...final, background: { ...final.background, imageUrl: publicUrl, kind: 'image' } }
        setTemplate(final)
        setPendingBg(null)
      }
      final = { ...final, updatedAt: new Date().toISOString() }
      const next = templates.map(t => (t.id === final.id ? final : t))
      setTemplates(next)
      const res = await persistTemplates(next)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
      toast(res.backend === 'supabase' ? 'Template saved' : 'Saved locally — run poster_templates.sql for cloud storage')
    } catch (err) {
      console.error('Save failed:', err)
      toast('Save failed. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addElement = () => {
    const el = {
      id: createId(),
      field: null,
      text: 'Your text',
      prefix: '', suffix: '',
      repeat: false,
      x: 60, y: 60, width: 600, height: 50,
      fontSize: 24, fontColor: '#1D192B', fontWeight: 600,
      fontFamily: 'Sora', textAlign: 'center', textTransform: 'none',
      lineHeight: 1.15,
    }
    setTemplate(prev => prev && ({ ...prev, elements: [...prev.elements, el] }))
    setSelectedId(el.id)
  }

  const removeElement = (elId) => {
    setTemplate(prev => prev && ({ ...prev, elements: prev.elements.filter(e => e.id !== elId) }))
    setSelectedId(null)
  }

  // Sample-data driven preview source.
  const editorSource = useMemo(() => {
    if (!template) return null
    const base = makeSampleSource(template.type)
    if (template.type === 'standings') {
      const teams = (base.teams || []).map((t, i) => ({
        ...t,
        name: sampleState?.teams?.[i]?.name || t.name,
        points: sampleState?.teams?.[i]?.points !== '' && sampleState?.teams?.[i]?.points != null
          ? Number(sampleState.teams[i].points)
          : t.points,
      }))
      return { ...base, standings: { title: sampleState?.title || base.standings?.title }, teams }
    }
    const placements = (base.placements || []).map((p, i) => ({
      ...p,
      name: sampleState?.placements?.[i]?.name || p.name,
      team: sampleState?.placements?.[i]?.team || p.team,
    }))
    return {
      ...base,
      programme: {
        name: sampleState?.programmeName || base.programme?.name,
        category: sampleState?.category || base.programme?.category,
      },
      result: { resultNo: sampleState?.resultNo || base.result?.resultNo },
      placements,
    }
  }, [template, sampleState])

  const patchSample = (patch) => setSampleState(prev => (prev ? { ...prev, ...patch } : patch))

  // ── Background image (instant preview + Supabase storage on save) ──
  const applyBackgroundImage = async (src) => {
    setBgStatus('loading')
    try {
      const compressed = await compressImageSrc(src, 1600, 'image/jpeg', 0.88)
      patchTemplate({ background: { ...bg, imageUrl: compressed, kind: 'image' } })
      setBgStatus('ok')
    } catch {
      setBgStatus('error')
    }
  }

  const handleBgFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !template) return
    setPendingBg(f)
    setBgStatus('loading')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      patchTemplate({ background: { ...template.background, imageUrl: dataUrl, kind: 'image' } })
      setBgStatus('ok')
      // Auto-fit the canvas to the picked image's natural size (clamped).
      const probe = new Image()
      probe.onload = () => {
        const w = Math.round(Math.max(512, Math.min(2160, probe.naturalWidth || 1080)))
        const h = Math.round(Math.max(512, Math.min(2160, probe.naturalHeight || 1080)))
        patchTemplate({ canvas: { width: w, height: h } })
        setCanvasHint(`Canvas dimensions set to image size (${w} × ${h}px)`)
      }
      probe.onerror = () => {}
      probe.src = dataUrl
    }
    reader.onerror = () => setBgStatus('error')
    reader.readAsDataURL(f)
  }

  const clearBackgroundImage = () => {
    setPendingBg(null)
    setBgUrlDirty(false)
    patchTemplate({ background: { ...bg, imageUrl: '' } })
    setBgStatus('idle')
    setCanvasHint('')
  }

  const showBgCheck = bgStatus === 'ok' && bg.kind === 'image' && bg.imageUrl

  // ── Arrow-key nudging for the selected element (Shift = 10px steps) ──
  useEffect(() => {
    const onKey = (e) => {
      if (!selected) return
      const node = e.target
      if (node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || node.isContentEditable)) return
      const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
      const d = dirs[e.key]
      if (!d) return
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      patchElement(selected.id, { x: selected.x + d[0] * step, y: selected.y + d[1] * step })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  // ── Export / download helpers ──
  const studentMap = useMemo(() => { const m = {}; students.forEach(s => { m[s.id] = s }); return m }, [students])
  const teamNameToId = useMemo(() => { const m = {}; teams.forEach(t => { m[t.name] = t.id }); return m }, [teams])
  const resultByProgramme = useMemo(() => { const m = {}; results.forEach(r => { if (r.programmeId) m[r.programmeId] = r }); return m }, [results])
  const stableProgrammes = useMemo(() => (
    programmes.filter(p => resultByProgramme[p.id])
      .sort((a, b) => (resultByProgramme[b.id]?.resultNo || 0) - (resultByProgramme[a.id]?.resultNo || 0))
  ), [programmes, resultByProgramme])

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

  const exportSource = useMemo(() => {
    if (!template) return null
    if (template.type === 'standings') {
      const totals = computeStandings()
      const count = Math.max(1, Math.min(genTeamCount, totals.length))
      return buildPosterSource({ type: 'standings', teams: totals.slice(0, count).map(t => ({ name: t.name, totalPoints: t.totalPoints })) })
    }
    const prog = genProgrammeId ? programmes.find(p => p.id === genProgrammeId) : null
    if (!prog && stableProgrammes[0]) return buildPosterSource({ type: 'result', programme: stableProgrammes[0], result: resultByProgramme[stableProgrammes[0].id], studentMap, teamNameToId })
    if (!prog) return makeSampleSource('result')
    return buildPosterSource({ type: 'result', programme: prog, result: resultByProgramme[prog.id], studentMap, teamNameToId })
  }, [template?.type, genProgrammeId, genTeamCount, programmes, results, teams, studentMap, teamNameToId, stableProgrammes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!template || !exportOpen) return
    if (template.type === 'standings') setGenTeamCount(template.teamsToShow || 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportOpen, template?.id, template?.type])

  const downloadPoster = async () => {
    const node = captureRef.current
    if (!node || downloading) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: null })
      canvas.toBlob((blob) => {
        if (blob) {
          const base = (template.name || 'poster').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'poster'
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

  if (loading || !template) {
    return <div className="text-mainText text-center mt-20">Loading template…</div>
  }

  const previewShell = (source, scale, editable) => (
    <div className="rounded-2xl p-3 bg-card border border-secondary/30 inline-block">
      <div className="rounded-lg overflow-auto">
        <PosterStage
          template={template}
          source={source}
          scale={scale}
          editable={editable}
          showGrid={editable && grid}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChangeElement={patchElement}
          captureRef={captureRef}
        />
      </div>
    </div>
  )

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Sticky top bar: back arrow + duplicate Save */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-card/90 backdrop-blur border-b border-secondary/30 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/admin/frames/templates')} className="flex items-center gap-1.5 text-mainText hover:opacity-80 transition shrink-0">
            <ArrowLeft size={18} /> Templates
          </button>
          <span className="text-mutedText font-light leading-none hidden md:block">/</span>
          <h2 className="text-mainText font-semibold text-sm md:text-base truncate hidden md:block">{template.name || 'Untitled Template'}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExportOpen(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition"
          >
            <Wand2 size={15} /> Export Poster
          </button>
          <button
            onClick={saveTemplate}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm text-white transition ${saved ? 'bg-success/80' : 'bg-success hover:bg-success/90'} disabled:opacity-60`}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 items-start">
        {/* LEFT: Layers */}
        <div className="space-y-4 lg:sticky lg:top-20 order-1">
          <Panel title={<span className="flex items-center gap-2"><Layers size={14} className="text-accent" /> Layers</span>}>
            <div className="space-y-1.5 mb-3">
              {template.elements.length === 0 && <p className="text-mutedText text-xs">No layers yet. Add a custom text field below.</p>}
              {template.elements.map((el, i) => (
                <button
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition border ${selectedId === el.id ? 'border-success bg-success/10 text-mainText ring-1 ring-success/40' : 'border-secondary/30 bg-black/5 dark:bg-black/20 text-mutedText hover:text-mainText'}`}
                >
                  <Type size={13} className={`shrink-0 ${selectedId === el.id ? 'text-success' : ''}`} />
                  <span className="truncate flex-1">{layerLabel(el)}</span>
                  <span className="text-[10px] uppercase tracking-wide text-mutedText shrink-0">L{i + 1}</span>
                </button>
              ))}
            </div>
            <button onClick={addElement} className="flex items-center gap-2 w-full justify-center rounded-xl border border-dashed border-secondary/50 text-mutedText hover:text-mainText hover:border-primary py-2.5 text-sm transition">
              <Plus size={15} /> Add custom text field
            </button>
            {selected && (
              <button onClick={() => removeElement(selected.id)} className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 py-2 text-sm font-semibold transition">
                <Trash2 size={14} /> Delete layer
              </button>
            )}
          </Panel>
        </div>

        {/* CENTER: Live preview */}
        <div className="lg:sticky lg:top-20 order-2">
          <Panel title={<span className="flex items-center gap-2"><Eye size={14} className="text-accent" /> Live Preview</span>} className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3 self-end">
              <span className="text-mutedText text-xs font-semibold">Zoom</span>
              <button onClick={() => setZoom(z => Math.max(0.2, +(z - 0.05).toFixed(2)))} className="p-1.5 rounded-lg border border-secondary/40 text-mutedText hover:text-mainText transition">−</button>
              <span className="text-mainText text-xs font-semibold w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.05).toFixed(2)))} className="p-1.5 rounded-lg border border-secondary/40 text-mutedText hover:text-mainText transition">+</button>
              <span className="w-px h-5 bg-secondary/40 mx-1" />
              <button
                onClick={() => setGrid(g => !g)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${grid ? 'bg-primary text-white border-primary' : 'bg-black/10 dark:bg-black/20 text-mutedText border-secondary/40'}`}
              >
                <Grid3x3 size={13} /> Grid
              </button>
            </div>
            {previewShell(editorSource, zoom, true)}
            <p className="text-mutedText text-[11px] mt-3 text-center">
              Drag layers to move · drag the corner handle to resize · arrow keys nudge (Shift = 10px).
            </p>

            {/* Example Poster Data for Preview */}
            <div className="w-full mt-3 rounded-xl border border-secondary/30 bg-black/5 dark:bg-black/20">
              <button onClick={() => setSampleOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-mainText text-left">
                {sampleOpen ? <ChevronDown size={15} className="text-accent shrink-0" /> : <ChevronRight size={15} className="text-accent shrink-0" />}
                Example Poster Data for Preview
              </button>
              {sampleOpen && (
                <div className="px-3 pb-3">
                  {template.type === 'standings' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Title">
                          <input className={inputCls} value={sampleState?.title || ''} onChange={e => patchSample({ title: e.target.value })} />
                        </Field>
                      </div>
                      {(sampleState?.teams || []).map((t, i) => (
                        <div key={i} className="grid grid-cols-2 gap-3">
                          <Field label={`Team #${i + 1} name`}>
                            <input className={inputCls} value={t.name} onChange={e => {
                              const teams = (sampleState?.teams || []).map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                              patchSample({ teams })
                            }} />
                          </Field>
                          <Field label="Points">
                            <input className={inputCls} value={t.points} onChange={e => {
                              const teams = (sampleState?.teams || []).map((x, j) => (j === i ? { ...x, points: e.target.value } : x))
                              patchSample({ teams })
                            }} />
                          </Field>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Programme name">
                          <input className={inputCls} value={sampleState?.programmeName || ''} onChange={e => patchSample({ programmeName: e.target.value })} />
                        </Field>
                        <Field label="Category">
                          <input className={inputCls} value={sampleState?.category || ''} onChange={e => patchSample({ category: e.target.value })} />
                        </Field>
                        <Field label="Result no">
                          <input className={inputCls} value={sampleState?.resultNo || ''} onChange={e => patchSample({ resultNo: e.target.value })} />
                        </Field>
                      </div>
                      {(sampleState?.placements || []).map((p, i) => (
                        <div key={i} className="grid grid-cols-2 gap-3">
                          <Field label={`${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'} name`}>
                            <input className={inputCls} value={p.name} onChange={e => {
                              const placements = (sampleState?.placements || []).map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                              patchSample({ placements })
                            }} />
                          </Field>
                          <Field label="Team">
                            <input className={inputCls} value={p.team} onChange={e => {
                              const placements = (sampleState?.placements || []).map((x, j) => (j === i ? { ...x, team: e.target.value } : x))
                              patchSample({ placements })
                            }} />
                          </Field>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* RIGHT: Template Configuration */}
        <div className="space-y-4 lg:sticky lg:top-20 order-3 max-h-[calc(100vh-14rem)] overflow-y-auto pb-4">
          <Panel title={<span className="flex items-center gap-2"><Palette size={14} className="text-accent" /> Template Configuration</span>}>
            <Field label="Template Name">
              <input value={template.name} onChange={e => patchTemplate({ name: e.target.value })} placeholder="e.g. Result Poster — Light" className={inputCls} />
            </Field>
            <Field label="Type">
              <div className="rounded-xl bg-black/10 dark:bg-black/20 border border-secondary/40 px-3 py-2 text-sm text-mutedText font-medium">
                {TEMPLATE_TYPES[template.type]?.label}
              </div>
            </Field>
            <Field label="Canvas Dimensions">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Width (px)">
                  <input type="number" min="512" max="2160" value={canvasCfg.width} onChange={e => { patchTemplate({ canvas: { width: Math.max(512, Number(e.target.value) || 1080), height: canvasCfg.height } }); setCanvasHint('') }} className={inputCls} />
                </Field>
                <Field label="Height (px)">
                  <input type="number" min="512" max="2160" value={canvasCfg.height} onChange={e => { patchTemplate({ canvas: { height: Math.max(512, Number(e.target.value) || 1080), width: canvasCfg.width } }); setCanvasHint('') }} className={inputCls} />
                </Field>
              </div>
              {canvasHint && <p className="text-success text-[11px] font-semibold">✓ {canvasHint}</p>}
            </Field>
            <Field label="Background">
              <div className="flex gap-1.5 mb-2">
                {['solid', 'gradient', 'image'].map(k => (
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
                      <button
                        key={c}
                        onClick={() => patchTemplate({ background: { ...bg, color: c } })}
                        className={`w-6 h-6 rounded-full border border-white/40 transition ${bg.color === c ? successRing : ''}`}
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}

              {bg.kind === 'gradient' && (
                <div className="grid grid-cols-2 gap-2">
                  {BG_PRESETS.gradient.map(g => (
                    <button
                      key={g.label}
                      onClick={() => patchTemplate({ background: { ...bg, gradient: g.css } })}
                      className={`rounded-lg h-10 border border-white/40 transition ${bg.gradient === g.css ? successRing : ''}`}
                      style={{ background: g.css }}
                      title={g.label}
                    />
                  ))}
                </div>
              )}

              {bg.kind === 'image' && (
                <div>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={bg.imageUrl}
                      onChange={e => {
                        patchTemplate({ background: { ...bg, imageUrl: e.target.value } })
                        setBgUrlDirty(true)
                      }}
                      onBlur={() => {
                        if (bgUrlDirty && bg.imageUrl && bgStatus !== 'loading') {
                          applyBackgroundImage(bg.imageUrl)
                          setBgUrlDirty(false)
                        }
                      }}
                      placeholder="Paste image URL"
                      className={`${inputCls} pr-9`}
                    />
                    {showBgCheck && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-success pointer-events-none" />}
                    {bgStatus === 'loading' && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedText animate-spin pointer-events-none" />}
                    {bgStatus === 'error' && <X size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-secondary/40 bg-black/5 dark:bg-black/20 text-mutedText hover:text-mainText py-2 text-xs font-semibold cursor-pointer transition">
                      <ImagePlus size={14} /> {pendingBg ? 'Uploading…' : 'Upload image'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleBgFile} />
                    </label>
                    {bg.imageUrl && (
                      <button onClick={clearBackgroundImage} className="px-2.5 py-2 rounded-xl text-xs font-semibold border border-red-500/40 text-red-500 hover:bg-red-500/10 transition">
                        Clear
                      </button>
                    )}
                  </div>
                  {showBgCheck && (
                    <p className="text-success text-[11px] mt-2 flex items-center gap-1">
                      <Check size={12} strokeWidth={3} /> Background image loaded — preview updates live. Saved to storage on save.
                    </p>
                  )}
                  {!showBgCheck && bg.kind === 'image' && !bg.imageUrl && !pendingBg && (
                    <p className="text-mutedText text-[11px] mt-2">Pick a file or paste a URL. Picked files upload to Supabase Storage when you save.</p>
                  )}
                </div>
              )}
            </Field>

            <button
              onClick={saveTemplate}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-success hover:bg-success/90 text-white font-bold text-sm py-3 transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save Template Changes'}
            </button>
          </Panel>
        </div>
      </div>

      {/* BOTTOM: layer content + formatting toolbar */}
      <div className="lg:sticky lg:bottom-3 mt-4 z-20">
        <div className="rounded-2xl bg-card border border-secondary/40 backdrop-blur px-4 py-3 shadow-xl space-y-3">
          {!selected ? (
            <div className="flex items-center gap-2 text-mutedText text-xs py-1">
              <SlidersHorizontal size={16} /> Select a layer to edit its content, formatting (Prefix, Font, Color, Line Height…) and position (Width, X, Y).
            </div>
          ) : (
            <>
              {/* Content */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-mutedText text-[11px] font-semibold uppercase tracking-wide">Content</span>
                <Field label="Data field">
                  <select
                    value={selected.field || ''}
                    onChange={e => {
                      const field = e.target.value
                      patchElement(selected.id, { field, repeat: isRepeatableField(field) })
                    }}
                    className={selectCls + ' w-auto min-w-[170px]'}
                  >
                    <option value="">Custom text</option>
                    {elGroups.map(g => (
                      <optgroup key={g.label} label={g.label}>
                        {g.fields.map(f => (
                          <option key={f.key} value={f.key}>{f.label}{isRepeatableField(f.key) ? ' (per winner)' : ''}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                {selected.field && isRepeatableField(selected.field) && (
                  <Field label="Repeat rows">
                    <button
                      type="button"
                      onClick={() => patchElement(selected.id, { repeat: !selected.repeat })}
                      className={`relative w-10 h-6 rounded-full transition-colors duration-300 shrink-0 ${selected.repeat ? 'bg-primary' : 'bg-white/20 border border-secondary/40'}`}
                      aria-pressed={selected.repeat}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${selected.repeat ? 'translate-x-4' : ''}`} />
                    </button>
                  </Field>
                )}
                <Field label="Prefix"><input className={inputCls + ' w-20'} value={selected.prefix} onChange={e => patchElement(selected.id, { prefix: e.target.value })} placeholder="e.g. #" /></Field>
                <Field label="Suffix"><input className={inputCls + ' w-20'} value={selected.suffix} onChange={e => patchElement(selected.id, { suffix: e.target.value })} placeholder="e.g. pts" /></Field>
                {!selected.field && (
                  <Field label="Text"><input className={inputCls + ' min-w-[160px]'} value={selected.text} onChange={e => patchElement(selected.id, { text: e.target.value })} /></Field>
                )}
              </div>

              {/* Format */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-mutedText text-[11px] font-semibold uppercase tracking-wide">Format</span>
                <Field label="Font Family">
                  <select value={selected.fontFamily} onChange={e => patchElement(selected.id, { fontFamily: e.target.value })} className={selectCls + ' w-auto min-w-[130px]'}>
                    {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </Field>
                <Field label="Font Size">
                  <input type="number" min="8" max="200" value={selected.fontSize} onChange={e => patchElement(selected.id, { fontSize: Number(e.target.value) || 12 })} className={inputCls + ' w-20'} />
                </Field>
                <Field label="Font Weight">
                  <select value={selected.fontWeight} onChange={e => patchElement(selected.id, { fontWeight: Number(e.target.value) })} className={selectCls + ' w-auto min-w-[70px]'}>
                    {[400, 500, 600, 700, 800].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </Field>
                <Field label="Alignment">
                  <div className="flex gap-1">
                    {[{ v: 'left', I: AlignLeft }, { v: 'center', I: AlignCenter }, { v: 'right', I: AlignRight }].map(a => (
                      <button key={a.v} onClick={() => patchElement(selected.id, { textAlign: a.v })} className={`w-9 h-9 rounded-xl flex items-center justify-center transition border ${selected.textAlign === a.v ? 'bg-primary text-white border-primary' : 'bg-black/10 dark:bg-black/20 text-mutedText border-secondary/40'}`} title={a.v}>
                        <a.I size={14} />
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Color">
                  <input type="color" value={selected.fontColor} onChange={e => patchElement(selected.id, { fontColor: e.target.value })} className="w-9 h-9 rounded-lg bg-transparent border border-secondary/40 cursor-pointer" />
                </Field>
                <Field label="Line Height">
                  <input type="number" min="0.6" max="3" step="0.05" value={selected.lineHeight ?? 1.15} onChange={e => patchElement(selected.id, { lineHeight: Number(e.target.value) || 1.15 })} className={inputCls + ' w-20'} />
                </Field>
              </div>

              {/* Position / size */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-mutedText text-[11px] font-semibold uppercase tracking-wide">Position</span>
                {['width', 'height', 'x', 'y'].map(k => (
                  <Field key={k} label={k === 'x' ? 'X Position' : k === 'y' ? 'Y Position' : k}>
                    <input type="number" value={Math.round(selected[k] || 0)} onChange={e => patchElement(selected.id, { [k]: Number(e.target.value) || 0 })} className={inputCls + ' w-20'} />
                  </Field>
                ))}
                <button
                  onClick={() => removeElement(selected.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 px-3 py-2 text-xs font-semibold transition"
                >
                  <Trash2 size={14} /> Delete layer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Export overlay */}
      {exportOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setExportOpen(false)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-3xl my-6 shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-mainText font-bold text-lg flex items-center gap-2">
                  <Wand2 size={17} className="text-accent" /> Export Poster
                </h3>
                <p className="text-mutedText text-sm">{template.type === 'standings' ? 'Fill with live team standings' : 'Fill with a finished programme’s result'}</p>
              </div>
              <button onClick={() => setExportOpen(false)} className="text-mutedText hover:text-mainText transition"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5 items-start">
              <div className="space-y-3">
                {template.type === 'standings' ? (
                  <Field label="Teams to show">
                    <div className="flex items-center gap-3">
                      <input type="range" min="1" max={Math.max(teams.length, 1)} value={genTeamCount} onChange={e => setGenTeamCount(Number(e.target.value))} className="flex-1 accent-[#7C4DFF]" />
                      <span className="text-mainText font-bold text-sm w-8 text-center">{genTeamCount}</span>
                    </div>
                  </Field>
                ) : (
                  <Field label="Programme">
                    <select value={genProgrammeId} onChange={e => setGenProgrammeId(e.target.value)} className={selectCls}>
                      {stableProgrammes.length === 0 && <option value="">No finished results yet</option>}
                      {stableProgrammes.map(p => (
                        <option key={p.id} value={p.id}>#{resultByProgramme[p.id]?.resultNo} · {p.name}</option>
                      ))}
                    </select>
                    <p className="text-mutedText text-[11px] mt-2">Only programmes with a finished result are listed.</p>
                  </Field>
                )}
                <button
                  onClick={downloadPoster}
                  disabled={downloading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-success hover:bg-success/90 text-white font-bold text-sm py-3 transition disabled:opacity-60"
                >
                  {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {downloading ? 'Exporting…' : 'Download PNG'}
                </button>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-mutedText text-xs font-semibold mb-2">Live preview</span>
                {previewShell(exportSource, 0.5, false)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}