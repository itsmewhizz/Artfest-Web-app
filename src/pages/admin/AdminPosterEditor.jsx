import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import {
  ArrowLeft, Save, Plus, Trash2, Download, Check, X, Type, Palette,
  Eye, Layers, SlidersHorizontal, Loader2, ImagePlus,
  Wand2, AlignLeft, AlignCenter, AlignRight, Grid3x3, ChevronDown, ChevronRight,
  RotateCw, MoreVertical, Copy, RotateCcw,
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

// Layer categories for grouping in the Layers panel
const LAYER_CATEGORIES = [
  { id: 'programme', label: 'Programme Info', keys: ['programme.name', 'programme.category', 'result.resultNo', 'date'] },
  { id: 'winner1', label: 'Winner Container & 1st Place', keys: ['placement.1.rank', 'placement.1.name', 'placement.1.points', 'placement.1.grade', 'placement.1.team', 'placement.1.chestNo'] },
  { id: 'winner2', label: '2nd Place', keys: ['placement.2.rank', 'placement.2.name', 'placement.2.points', 'placement.2.grade', 'placement.2.team', 'placement.2.chestNo'] },
  { id: 'winner3', label: '3rd Place', keys: ['placement.3.rank', 'placement.3.name', 'placement.3.points', 'placement.3.grade', 'placement.3.chestNo'] },
  { id: 'custom', label: 'Other / Custom', keys: [] },
]

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

const initSampleState = (type) => {
  const base = makeSampleSource(type)
  if (type === 'standings') {
    return {
      title: base.standings?.title || 'TEAM STANDINGS',
      teams: (base.teams || []).map(t => ({ name: t.name || '', points: t.points ?? '' })),
      footerText: "RENDEZVOUS '26 ART FESTIVAL",
    }
  }
  return {
    programmeName: 'Group Song (Malayalam)',
    category: 'General Cat-A',
    resultNo: '042',
    footerText: "RENDEZVOUS '26 ART FESTIVAL",
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
  const [zoom, setZoom] = useState(0.6)
  const [grid, setGrid] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(true)
  const [sampleState, setSampleState] = useState(null)
  const [bgStatus, setBgStatus] = useState('idle')
  const [bgUrlDirty, setBgUrlDirty] = useState(false)
  const [pendingBg, setPendingBg] = useState(null)
  const [canvasHint, setCanvasHint] = useState('')
  const [saved, setSaved] = useState(false)
  const [openLayerMenu, setOpenLayerMenu] = useState(null)

  // Collapsible sections state for layers panel
  const [openCategories, setOpenCategories] = useState({
    programme: true,
    winner1: true,
    winner2: true,
    winner3: true,
    custom: true,
  })

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

  useEffect(() => {
    ;(async () => {
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
  }, [id])

  useEffect(() => {
    Promise.all([getProgrammes(), getStudents(), getTeams(), getResultsForFinishedProgrammes()]).then(
      ([p, s, t, r]) => { setProgrammes(p); setStudents(s); setTeams(t); setResults(r) },
    )
  }, [])

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

  const addElement = (customType = 'text') => {
    const defaultText = customType === 'footer' ? "RENDEZVOUS '26 ART FESTIVAL" : 'Your text'
    const el = {
      id: createId(),
      field: null,
      text: defaultText,
      prefix: '', suffix: '',
      repeat: false,
      x: 60, y: 60, width: 600, height: 50,
      fontSize: 24, fontColor: '#FFFFFF', fontWeight: 600,
      fontFamily: 'Sora', textAlign: 'center', textTransform: 'none',
      lineHeight: 1.15, rotation: 0,
    }
    setTemplate(prev => prev && ({ ...prev, elements: [...prev.elements, el] }))
    setSelectedId(el.id)
  }

  const duplicateElement = (elId) => {
    const target = template.elements.find(e => e.id === elId)
    if (!target) return
    const newEl = {
      ...JSON.parse(JSON.stringify(target)),
      id: createId(),
      x: target.x + 20,
      y: target.y + 20,
    }
    setTemplate(prev => prev && ({ ...prev, elements: [...prev.elements, newEl] }))
    setSelectedId(newEl.id)
    setOpenLayerMenu(null)
    toast('Layer duplicated')
  }

  const resetElement = (elId) => {
    patchElement(elId, {
      x: 60,
      y: 60,
      width: 600,
      height: 50,
      fontSize: 24,
      fontColor: '#FFFFFF',
      fontWeight: 600,
      fontFamily: 'Sora',
      textAlign: 'center',
      rotation: 0,
    })
    setOpenLayerMenu(null)
    toast('Layer style reset')
  }

  const removeElement = (elId) => {
    setTemplate(prev => prev && ({ ...prev, elements: prev.elements.filter(e => e.id !== elId) }))
    if (selectedId === elId) setSelectedId(null)
    setOpenLayerMenu(null)
  }

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
  }, [selected])

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
  }, [template?.type, genProgrammeId, genTeamCount, programmes, results, teams, studentMap, teamNameToId, stableProgrammes])

  useEffect(() => {
    if (!template || !exportOpen) return
    if (template.type === 'standings') setGenTeamCount(template.teamsToShow || 8)
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

  // Categorize elements into collapsible layer sections
  const getCategorizedElements = () => {
    const groups = {
      programme: [],
      winner1: [],
      winner2: [],
      winner3: [],
      custom: [],
    }

    template.elements.forEach(el => {
      if (el.field && el.field.startsWith('placement.1')) {
        groups.winner1.push(el)
      } else if (el.field && el.field.startsWith('placement.2')) {
        groups.winner2.push(el)
      } else if (el.field && el.field.startsWith('placement.3')) {
        groups.winner3.push(el)
      } else if (el.field && (el.field.startsWith('programme') || el.field.startsWith('result') || el.field === 'date')) {
        groups.programme.push(el)
      } else {
        groups.custom.push(el)
      }
    })

    return groups
  }

  const categorizedElements = getCategorizedElements()

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Sticky top bar */}
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
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-4 items-start">
        {/* LEFT: Categorized Layer Library */}
        <div className="space-y-4 lg:sticky lg:top-20 order-1">
          <Panel title={<span className="flex items-center gap-2"><Layers size={14} className="text-accent" /> Layer Library</span>}>
            <div className="space-y-3 mb-3">
              {LAYER_CATEGORIES.map(cat => {
                const els = categorizedElements[cat.id] || []
                const isOpen = openCategories[cat.id]
                return (
                  <div key={cat.id} className="rounded-xl border border-secondary/30 bg-black/10 dark:bg-black/20 overflow-hidden">
                    <button
                      onClick={() => setOpenCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-mainText hover:bg-white/5 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        {isOpen ? <ChevronDown size={13} className="text-accent" /> : <ChevronRight size={13} className="text-accent" />}
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-mutedText bg-card px-1.5 py-0.5 rounded">{els.length}</span>
                    </button>

                    {isOpen && (
                      <div className="p-1.5 space-y-1 divide-y divide-secondary/20">
                        {els.length === 0 && (
                          <p className="text-mutedText text-[11px] px-2 py-1.5 italic">No layers in section</p>
                        )}
                        {els.map(el => (
                          <div key={el.id} className="relative flex items-center gap-1 pt-1 first:pt-0">
                            <button
                              onClick={() => setSelectedId(el.id)}
                              className={`flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition border ${selectedId === el.id ? 'border-success bg-success/15 text-mainText font-semibold' : 'border-transparent text-mutedText hover:text-mainText hover:bg-white/5'}`}
                            >
                              <Type size={12} className={`shrink-0 ${selectedId === el.id ? 'text-success' : ''}`} />
                              <span className="truncate flex-1">{layerLabel(el)}</span>
                            </button>
                            {/* Layer Context Options Menu (⋮) */}
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenLayerMenu(openLayerMenu === el.id ? null : el.id) }}
                                className="p-1 text-mutedText hover:text-mainText rounded-md hover:bg-white/10 transition"
                                title="Layer options"
                              >
                                <MoreVertical size={13} />
                              </button>
                              {openLayerMenu === el.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-secondary/40 rounded-xl shadow-2xl p-1 w-40 text-xs">
                                  <button
                                    onClick={() => duplicateElement(el.id)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-mainText hover:bg-white/10 transition text-left"
                                  >
                                    <Copy size={12} /> Duplicate
                                  </button>
                                  <button
                                    onClick={() => resetElement(el.id)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-mainText hover:bg-white/10 transition text-left"
                                  >
                                    <RotateCcw size={12} /> Reset Style
                                  </button>
                                  <button
                                    onClick={() => removeElement(el.id)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition text-left"
                                  >
                                    <Trash2 size={12} /> Delete Layer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="space-y-1.5">
              <button onClick={() => addElement('text')} className="flex items-center gap-2 w-full justify-center rounded-xl border border-dashed border-secondary/50 text-mutedText hover:text-mainText hover:border-primary py-2 text-xs font-semibold transition">
                <Plus size={14} /> Add custom text field
              </button>
              <button onClick={() => addElement('footer')} className="flex items-center gap-2 w-full justify-center rounded-xl border border-dashed border-secondary/50 text-mutedText hover:text-mainText hover:border-primary py-2 text-xs font-semibold transition">
                <Plus size={14} /> Add Festival Footer Text
              </button>
            </div>
          </Panel>
        </div>

        {/* CENTER: Live preview */}
        <div className="lg:sticky lg:top-20 order-2">
          <Panel title={<span className="flex items-center gap-2"><Eye size={14} className="text-accent" /> Live Preview</span>} className="flex flex-col items-center">
            {/* Zoom Presets Bar */}
            <div className="flex items-center gap-1.5 mb-3 self-end flex-wrap justify-end">
              <span className="text-mutedText text-xs font-semibold mr-1">Zoom</span>
              {[0.25, 0.45, 0.60, 0.75, 1.0].map(z => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${zoom === z ? 'bg-primary text-white font-bold' : 'bg-black/10 dark:bg-black/20 text-mutedText border border-secondary/40 hover:text-mainText'}`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
              <span className="w-px h-5 bg-secondary/40 mx-1" />
              <button
                onClick={() => setGrid(g => !g)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${grid ? 'bg-primary text-white border-primary' : 'bg-black/10 dark:bg-black/20 text-mutedText border-secondary/40'}`}
              >
                <Grid3x3 size={13} /> Grid
              </button>
            </div>

            {previewShell(editorSource, zoom, true)}

            <p className="text-mutedText text-[11px] mt-3 text-center">
              Drag layers on canvas to position · snap guides align automatically · corner handle resizes.
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

            {/* Background Presets: Solid | Gradient | Image */}
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
                      className={`rounded-lg h-10 border border-white/40 transition flex items-end p-1 text-[10px] text-white font-bold drop-shadow ${bg.gradient === g.css ? successRing : ''}`}
                      style={{ background: g.css }}
                      title={g.label}
                    >
                      {g.label}
                    </button>
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
              <SlidersHorizontal size={16} /> Select a layer to edit its content, formatting (Font, Rotation, Color, Alignment…) and position (X, Y, Width).
            </div>
          ) : (
            <>
              {/* Content Row */}
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
                    style={{ color: 'var(--text-main)' }}
                  >
                    <option value="" style={{ color: 'var(--text-main)', backgroundColor: 'var(--card-white)' }}>Custom text</option>
                    {elGroups.map(g => (
                      <optgroup key={g.label} label={g.label}>
                        {g.fields.map(f => (
                          <option key={f.key} value={f.key} style={{ color: 'var(--text-main)', backgroundColor: 'var(--card-white)' }}>{f.label}{isRepeatableField(f.key) ? ' (per winner)' : ''}</option>
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
                <Field label="Prefix"><input className={inputCls + ' w-20'} value={selected.prefix || ''} onChange={e => patchElement(selected.id, { prefix: e.target.value })} placeholder="e.g. #" /></Field>
                <Field label="Suffix"><input className={inputCls + ' w-20'} value={selected.suffix || ''} onChange={e => patchElement(selected.id, { suffix: e.target.value })} placeholder="e.g. pts" /></Field>
                {!selected.field && (
                  <Field label="Text"><input className={inputCls + ' min-w-[180px]'} value={selected.text || ''} onChange={e => patchElement(selected.id, { text: e.target.value })} /></Field>
                )}
              </div>

              {/* Formatting Row: Font Family, Size, Weight, Alignment, Rotation, Color */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-mutedText text-[11px] font-semibold uppercase tracking-wide">Format</span>
                <Field label="Font Family">
                  <select value={selected.fontFamily || 'Sora'} onChange={e => patchElement(selected.id, { fontFamily: e.target.value })} className={selectCls + ' w-auto min-w-[130px]'}>
                    {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </Field>
                <Field label="Font Size">
                  <input type="number" min="8" max="200" value={selected.fontSize || 24} onChange={e => patchElement(selected.id, { fontSize: Number(e.target.value) || 12 })} className={inputCls + ' w-20'} />
                </Field>
                <Field label="Font Weight">
                  <select value={selected.fontWeight || 600} onChange={e => patchElement(selected.id, { fontWeight: Number(e.target.value) })} className={selectCls + ' w-auto min-w-[70px]'}>
                    {[400, 500, 600, 700, 800].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </Field>

                {/* Alignment Icon Buttons */}
                <Field label="Alignment">
                  <div className="flex gap-1">
                    {[{ v: 'left', I: AlignLeft }, { v: 'center', I: AlignCenter }, { v: 'right', I: AlignRight }].map(a => (
                      <button key={a.v} onClick={() => patchElement(selected.id, { textAlign: a.v })} className={`w-9 h-9 rounded-xl flex items-center justify-center transition border ${selected.textAlign === a.v ? 'bg-primary text-white border-primary' : 'bg-black/10 dark:bg-black/20 text-mutedText border-secondary/40'}`} title={a.v}>
                        <a.I size={14} />
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Rotate Control */}
                <Field label="Rotate (deg)">
                  <div className="flex items-center gap-1.5">
                    <RotateCw size={14} className="text-mutedText shrink-0" />
                    <input
                      type="number"
                      min="-180"
                      max="180"
                      value={selected.rotation || 0}
                      onChange={e => patchElement(selected.id, { rotation: Number(e.target.value) || 0 })}
                      className={inputCls + ' w-20'}
                    />
                  </div>
                </Field>

                <Field label="Color">
                  <input type="color" value={selected.fontColor || '#FFFFFF'} onChange={e => patchElement(selected.id, { fontColor: e.target.value })} className="w-9 h-9 rounded-lg bg-transparent border border-secondary/40 cursor-pointer" />
                </Field>
                <Field label="Line Height">
                  <input type="number" min="0.6" max="3" step="0.05" value={selected.lineHeight ?? 1.15} onChange={e => patchElement(selected.id, { lineHeight: Number(e.target.value) || 1.15 })} className={inputCls + ' w-20'} />
                </Field>
              </div>

              {/* Position / Size Row */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-mutedText text-[11px] font-semibold uppercase tracking-wide">Position</span>
                {['width', 'height', 'x', 'y'].map(k => (
                  <Field key={k} label={k === 'x' ? 'X Position' : k === 'y' ? 'Y Position' : k}>
                    <input type="number" value={Math.round(selected[k] || 0)} onChange={e => patchElement(selected.id, { [k]: Number(e.target.value) || 0 })} className={inputCls + ' w-20'} />
                  </Field>
                ))}
                <button
                  onClick={() => duplicateElement(selected.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-secondary/40 bg-black/10 dark:bg-black/20 text-mainText hover:bg-white/10 px-3 py-2 text-xs font-semibold transition"
                >
                  <Copy size={13} /> Duplicate
                </button>
                <button
                  onClick={() => removeElement(selected.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 px-3 py-2 text-xs font-semibold transition"
                >
                  <Trash2 size={13} /> Delete layer
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