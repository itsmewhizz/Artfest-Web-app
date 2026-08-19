import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import {
  ArrowLeft, Save, Plus, Trash2, Download, Check, X, Type, Palette,
  Eye, Layers, SlidersHorizontal, Loader2, ImagePlus,
  Wand2, AlignLeft, AlignCenter, AlignRight, Bold,
} from 'lucide-react'
import PosterStage from '../../components/PosterStage'
import { useToast } from '../../components/Toast'
import {
  TEMPLATE_TYPES, FIELD_GROUPS, BG_PRESETS, FONT_FAMILIES, canvasFor,
  createId, loadTemplates, persistTemplates,
  buildPosterSource, makeSampleSource, isRepeatableField,
  compressImageSrc, compressImageFile,
} from '../../utils/posterTemplates'
import { getProgrammes, getStudents, getTeams, getResultsForFinishedProgrammes } from '../../supabase/queries'

const inputCls = 'w-full rounded-xl bg-black/10 dark:bg-black/20 border border-secondary/40 text-mainText px-3 py-2 text-sm outline-none focus:border-primary transition'
const selectCls = inputCls + ' appearance-none cursor-pointer'
const successRing = ' ring-2 ring-success border-success'

const Field = ({ label, children }) => (
  <label className="block mb-3">
    <span className="text-mutedText text-xs font-semibold block mb-1.5">{label}</span>
    {children}
  </label>
)

const Panel = ({ title, children }) => (
  <div className="rounded-2xl border border-secondary/30 bg-card p-4">
    {title && <h4 className="text-mainText font-semibold text-sm mb-3 flex items-center gap-2">{title}</h4>}
    {children}
  </div>
)

export default function AdminPosterEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [templates, setTemplates] = useState(() => loadTemplates())
  const [template, setTemplate] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [zoom, setZoom] = useState(0.5)
  const [bgStatus, setBgStatus] = useState('idle') // idle | loading | ok | error
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

  // Load the template being edited (matches route /admin/posters/templates/:id/edit)
  useEffect(() => {
    const found = templates.find(t => t?.id === id)
    if (found) {
      setTemplate(JSON.parse(JSON.stringify(found)))
      setSelectedId(null)
    } else {
      toast('Template not found', 'error')
      navigate('/admin/posters/templates', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    Promise.all([getProgrammes(), getStudents(), getTeams(), getResultsForFinishedProgrammes()]).then(
      ([p, s, t, r]) => { setProgrammes(p); setStudents(s); setTeams(t); setResults(r) },
    )
  }, [])

  const bg = template?.background || { kind: 'solid', color: '#5E35B1', gradient: '', imageUrl: '' }
  const selected = template ? template.elements.find(e => e.id === selectedId) || null : null
  const elGroups = FIELD_GROUPS[template?.type] || []

  const persist = () => {
    const next = templates.map(t => (t.id === template.id ? template : t))
    setTemplates(next)
    persistTemplates(next)
  }

  const patchTemplate = (patch) => setTemplate(prev => prev && { ...prev, ...patch })

  const saveTemplate = () => {
    if (!template.name?.trim()) { toast('Give the template a name first', 'error'); return }
    patchTemplate({ updatedAt: new Date().toISOString() })
    persist()
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
    toast('Template saved')
  }

  const patchElement = (elId, patch) => {
    setTemplate(prev => prev && ({
      ...prev,
      elements: prev.elements.map(e => (e.id === elId ? { ...e, ...patch } : e)),
    }))
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
    }
    setTemplate(prev => prev && ({ ...prev, elements: [...prev.elements, el] }))
    setSelectedId(el.id)
  }

  const removeElement = (elId) => {
    setTemplate(prev => prev && ({ ...prev, elements: prev.elements.filter(e => e.id !== elId) }))
    setSelectedId(null)
  }

  const editorSource = useMemo(() => template ? makeSampleSource(template.type) : null, [template?.type]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background image handling (async preview + persistence-safe) ──
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

  const handleBgFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBgStatus('loading')
    try {
      const data = await compressImageFile(f, 1600, 'image/jpeg', 0.88)
      patchTemplate({ background: { ...bg, imageUrl: data, kind: 'image' } })
      setBgStatus('ok')
    } catch {
      setBgStatus('error')
    }
    e.target.value = ''
  }

  const clearBackgroundImage = () => {
    patchTemplate({ background: { ...bg, imageUrl: '' } })
    setBgStatus('idle')
  }

  const showBgCheck = bgStatus === 'ok' && bg.kind === 'image' && bg.imageUrl

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

  if (!template) return <div className="text-mainText text-center mt-20">Loading template...</div>

  const canvasCfg = canvasFor(template)
  const previewShell = (source, scale, editable) => (
    <div className="rounded-2xl p-3 bg-card border border-secondary/30 inline-block">
      <div className="rounded-lg overflow-auto">
        <PosterStage
          template={template}
          source={source}
          scale={scale}
          editable={editable}
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
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin/posters/templates')} className="flex items-center gap-1.5 text-mainText hover:opacity-80 transition">
            <ArrowLeft size={17} /> Templates
          </button>
          <span className="text-mutedText text-2xl font-light leading-none pb-0.5">/</span>
          <input
            value={template.name}
            onChange={e => patchTemplate({ name: e.target.value })}
            placeholder="Template name"
            className="min-w-[180px] rounded-xl bg-black/10 dark:bg-black/20 border border-secondary/40 text-mainText px-4 py-2 text-sm font-semibold outline-none focus:border-primary transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition"
          >
            <Wand2 size={15} /> Export Poster
          </button>
          <button
            onClick={saveTemplate}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm bg-success text-white hover:bg-success/90 transition ${saved ? 'opacity-80' : ''}`}
          >
            {saved ? <Check size={15} /> : <Save size={15} />} {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* 3-panel + bottom toolbar */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4 items-start">
        {/* LEFT: Layers / elements */}
        <div className="space-y-4 lg:sticky lg:top-4 order-1">
          <Panel title={<span className="flex items-center gap-2"><Layers size={14} className="text-accent" /> Layers</span>}>
            <div className="space-y-1.5 mb-3">
              {template.elements.length === 0 && <p className="text-mutedText text-xs">No text layers yet.</p>}
              {template.elements.map((el, i) => (
                <button
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition border ${selectedId === el.id ? 'border-primary bg-purpleSoft text-mainText' : 'border-secondary/30 bg-black/5 dark:bg-black/20 text-mutedText hover:text-mainText'}`}
                >
                  <Type size={13} className="shrink-0" />
                  <span className="truncate flex-1">{el.field ? el.field : (el.text || 'Text')}</span>
                  <span className="text-[10px] uppercase tracking-wide text-mutedText shrink-0">L{i + 1}</span>
                </button>
              ))}
            </div>
            <button onClick={addElement} className="flex items-center gap-2 w-full justify-center rounded-xl border border-dashed border-secondary/50 text-mutedText hover:text-mainText hover:border-primary py-2.5 text-sm transition">
              <Plus size={15} /> Add text layer
            </button>
            {selected && (
              <button onClick={() => removeElement(selected.id)} className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 py-2 text-sm font-semibold transition">
                <Trash2 size={14} /> Delete layer
              </button>
            )}
          </Panel>
        </div>

        {/* CENTER: Live preview canvas */}
        <div className="lg:sticky lg:top-4 order-2">
          <Panel title={<span className="flex items-center gap-2"><Eye size={14} className="text-accent" /> Live Preview</span>} className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3 self-end">
              <span className="text-mutedText text-xs font-semibold">Zoom</span>
              <button onClick={() => setZoom(z => Math.max(0.2, +(z - 0.05).toFixed(2)))} className="p-1.5 rounded-lg border border-secondary/40 text-mutedText hover:text-mainText transition">−</button>
              <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.05).toFixed(2)))} className="p-1.5 rounded-lg border border-secondary/40 text-mutedText hover:text-mainText transition">+</button>
            </div>
            {previewShell(editorSource, zoom, true)}
            <p className="text-mutedText text-[11px] mt-3 text-center">Drag layers on the canvas to move them · drag the corner handle to resize. Sample text is shown while editing.</p>
          </Panel>
        </div>

        {/* RIGHT: Configuration */}
        <div className="space-y-4 lg:sticky lg:top-4 order-3 max-h-[calc(100vh-13rem)] overflow-y-auto pb-4">
          <Panel title={<span className="flex items-center gap-2"><Palette size={14} className="text-accent" /> Template</span>}>
            <Field label="Type">
              <div className="rounded-xl bg-black/10 dark:bg-black/20 border border-secondary/40 px-3 py-2 text-sm text-mutedText font-medium">
                {TEMPLATE_TYPES[template.type]?.label}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Width (px)">
                <input type="number" min="512" max="2160" value={canvasCfg.width} onChange={e => patchTemplate({ canvas: { width: Math.max(512, Number(e.target.value) || 1080), height: canvasCfg.height } })} className={inputCls} />
              </Field>
              <Field label="Height (px)">
                <input type="number" min="512" max="2160" value={canvasCfg.height} onChange={e => patchTemplate({ canvas: { height: Math.max(512, Number(e.target.value) || 1080), width: canvasCfg.width } })} className={inputCls} />
              </Field>
            </div>
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
                        if (!e.target.value) setBgStatus('idle')
                        else setBgStatus('idle')
                      }}
                      onBlur={() => { if (bg.imageUrl && bgStatus === 'idle') applyBackgroundImage(bg.imageUrl) }}
                      placeholder="Paste image URL"
                      className={`${inputCls} pr-9`}
                    />
                    {showBgCheck && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-success pointer-events-none" />}
                    {bgStatus === 'loading' && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedText animate-spin pointer-events-none" />}
                    {bgStatus === 'error' && <X size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-secondary/40 bg-black/5 dark:bg-black/20 text-mutedText hover:text-mainText py-2 text-xs font-semibold cursor-pointer transition">
                      <ImagePlus size={14} /> Upload image
                      <input type="file" accept="image/*" className="hidden" onChange={handleBgFile} />
                    </label>
                    {bg.imageUrl && (
                      <button onClick={clearBackgroundImage} className="px-2.5 py-2 rounded-xl text-xs font-semibold border border-red-500/40 text-red-500 hover:bg-red-500/10 transition">
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-mutedText text-[11px] mt-2">Images are auto-compressed so they persist reliably after saving.</p>
                </div>
              )}
            </Field>
          </Panel>

          {selected ? (
            <Panel title={<span className="flex items-center gap-2"><Type size={14} className="text-accent" /> Element</span>}>
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
                      <button
                        type="button"
                        onClick={() => patchElement(selected.id, { repeat: !selected.repeat })}
                        className={`relative w-10 h-6 rounded-full transition-colors duration-300 shrink-0 ${selected.repeat ? 'bg-primary' : 'bg-white/20 border border-secondary/40'}`}
                        aria-pressed={selected.repeat}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${selected.repeat ? 'translate-x-4' : ''}`} />
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prefix"><input value={selected.prefix} onChange={e => patchElement(selected.id, { prefix: e.target.value })} className={inputCls} placeholder="e.g. #" /></Field>
                    <Field label="Suffix"><input value={selected.suffix} onChange={e => patchElement(selected.id, { suffix: e.target.value })} className={inputCls} placeholder="e.g. pts" /></Field>
                  </div>
                </>
              ) : (
                <Field label="Text">
                  <textarea value={selected.text} onChange={e => patchElement(selected.id, { text: e.target.value })} rows={2} className={inputCls + ' resize-y'} />
                </Field>
              )}

              <div className="grid grid-cols-4 gap-2 pb-1">
                {['x', 'y', 'width', 'height'].map(k => (
                  <Field key={k} label={k}>
                    <input type="number" min="0" value={Math.round(selected[k])} onChange={e => patchElement(selected.id, { [k]: Number(e.target.value) || 0 })} className={inputCls} />
                  </Field>
                ))}
              </div>
            </Panel>
          ) : (
            <div className="rounded-2xl border border-secondary/30 bg-card p-4 text-center">
              <SlidersHorizontal size={18} className="text-mutedText mx-auto mb-2" />
              <p className="text-mutedText text-xs">Select a layer to configure its content and position.</p>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM: Formatting toolbar */}
      <div className="lg:sticky lg:bottom-3 mt-4 z-20">
        <div className="rounded-2xl bg-card border border-secondary/40 backdrop-blur px-4 py-3 flex items-center gap-3 flex-wrap shadow-xl">
          <div className="flex items-center gap-1.5 pr-2 border-r border-secondary/40">
            <span className="text-mutedText text-[11px] font-semibold uppercase tracking-wide">Format</span>
          </div>
          {!selected ? (
            <span className="text-mutedText text-xs">Select a layer to edit its formatting.</span>
          ) : (
            <>
              <Field label="Font"><select value={selected.fontFamily} onChange={e => patchElement(selected.id, { fontFamily: e.target.value })} className={selectCls + ' w-auto min-w-[130px]'}>{FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></Field>
              <Field label="Size"><input type="number" min="8" max="200" value={selected.fontSize} onChange={e => patchElement(selected.id, { fontSize: Number(e.target.value) || 12 })} className={inputCls + ' w-20'} /></Field>
              <Field label="Weight">
                <select value={selected.fontWeight} onChange={e => patchElement(selected.id, { fontWeight: Number(e.target.value) })} className={selectCls + ' w-auto min-w-[70px]'}>
                  {[400, 500, 600, 700, 800].map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
              <Field label="Bold">
                <button
                  onClick={() => patchElement(selected.id, { fontWeight: Math.abs(selected.fontWeight - 800) > 100 ? 800 : 500 })}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition border ${selected.fontWeight >= 700 ? 'bg-primary text-white border-primary' : 'bg-black/10 dark:bg-black/20 text-mutedText border-secondary/40'}`}
                  title="Toggle bold"
                >
                  <Bold size={15} />
                </button>
              </Field>
              <Field label="Align">
                <div className="flex gap-1">
                  {[{ v: 'left', I: AlignLeft }, { v: 'center', I: AlignCenter }, { v: 'right', I: AlignRight }].map(a => (
                    <button key={a.v} onClick={() => patchElement(selected.id, { textAlign: a.v })} className={`w-9 h-9 rounded-xl flex items-center justify-center transition border ${selected.textAlign === a.v ? 'bg-primary text-white border-primary' : 'bg-black/10 dark:bg-black/20 text-mutedText border-secondary/40'}`} title={a.v}>
                      <a.I size={14} />
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Color"><input type="color" value={selected.fontColor} onChange={e => patchElement(selected.id, { fontColor: e.target.value })} className="w-9 h-9 rounded-lg bg-transparent border border-secondary/40 cursor-pointer" /></Field>
              <Field label="Uppercase">
                <button
                  onClick={() => patchElement(selected.id, { textTransform: selected.textTransform === 'uppercase' ? 'none' : 'uppercase' })}
                  className={`px-3 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition border ${selected.textTransform === 'uppercase' ? 'bg-primary text-white border-primary' : 'bg-black/10 dark:bg-black/20 text-mutedText border-secondary/40'}`}
                >
                  ABC
                </button>
              </Field>
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