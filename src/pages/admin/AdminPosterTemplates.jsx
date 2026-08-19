import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers2, Plus, Globe, Pencil, Copy, Trash2, X, FileText, ListOrdered, Wand2,
} from 'lucide-react'
import PosterStage from '../../components/PosterStage'
import { useToast } from '../../components/Toast'
import {
  TEMPLATE_TYPES, createDefaultTemplate, createId,
  persistTemplates, seedTemplatesIfEmpty,
  makeSampleSource, templateIndexLabel, explorePublicTemplates,
} from '../../utils/posterTemplates'

const cardCls = 'bg-card rounded-2xl border border-secondary/30 p-3 flex flex-col gap-3 hover:shadow-lg transition'

export default function AdminPosterTemplates() {
  const navigate = useNavigate()
  const toast = useToast()
  const [templates, setTemplates] = useState(() => seedTemplatesIfEmpty())
  const [typeModal, setTypeModal] = useState(false)
  const [publicModal, setPublicModal] = useState(false)

  const persist = (next) => {
    setTemplates(next)
    persistTemplates(next)
  }

  const createFromType = (type, theme = 'light', openEditor = true) => {
    const t = { ...createDefaultTemplate(type, theme), name: `${TEMPLATE_TYPES[type].short} — Light` }
    persist([...templates, t])
    if (openEditor) navigate(`/admin/posters/templates/${t.id}/edit`)
    return t
  }

  const duplicateTemplate = (t) => {
    const copy = JSON.parse(JSON.stringify(t))
    copy.id = createId()
    copy.name = `${t.name} (Copy)`
    const now = new Date().toISOString()
    copy.createdAt = now
    copy.updatedAt = now
    persist([...templates, copy])
    toast('Template duplicated')
  }

  const deleteTemplate = (t) => {
    if (!window.confirm(`Delete template "${t.name}"? This cannot be undone.`)) return
    persist(templates.filter(x => x.id !== t.id))
    toast('Template deleted')
  }

  const applyPublicTemplate = (tpl) => {
    const copy = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: createId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const next = [...templates, copy]
    persist(next)
    setPublicModal(false)
    toast('Public template added to your library')
    navigate(`/admin/posters/templates/${copy.id}/edit`)
  }

  const gridScale = useMemo(() => {
    // Cards are ~260px wide in the grid; a 1080 canvas thumb ≈ 0.22 scale.
    return 0.22
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-card rounded-xl p-3 shadow-sm border border-secondary/30">
            <Layers2 size={22} className="text-accent" />
          </div>
          <div>
            <p className="text-mutedText text-[11px] font-semibold uppercase tracking-wider">Program Posters</p>
            <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Poster Templates</h2>
            <p className="text-mutedText text-sm">Design reusable 1:1 event posters once, then fill them with results or standings.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setPublicModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-card border border-secondary/40 text-mainText hover:bg-white/10 transition">
            <Globe size={16} /> Explore Public Templates
          </button>
          <button onClick={() => setTypeModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary/90 transition">
            <Plus size={16} /> Create New Template
          </button>
        </div>
      </div>

      {/* Grid */}
      {templates.length === 0 ? (
        <div className="bg-card rounded-2xl border border-secondary/30 p-12 text-center">
          <p className="text-mutedText">No templates yet — create one to get started.</p>
          <button onClick={() => setTypeModal(true)} className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition">
            <Plus size={16} /> Create New Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map(t => (
            <div key={t.id} className={cardCls}>
              <div className="relative mx-auto w-full">
                <PosterStage template={t} source={makeSampleSource(t.type)} scale={gridScale} />
                <span className="absolute -top-0 -left-0 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                  {templateIndexLabel(templates, t.id)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-mainText font-semibold text-sm truncate">{t.name}</p>
                <span className="text-mutedText text-[10px] uppercase tracking-wider shrink-0">
                  {TEMPLATE_TYPES[t.type]?.short}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/admin/posters/templates/${t.id}/edit`)}
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

      <div className="bg-card rounded-2xl border border-secondary/30 p-4 text-xs text-mutedText leading-relaxed mt-8">
        <p className="font-semibold text-mainText mb-1 flex items-center gap-1.5">
          <Wand2 size={14} /> How it works
        </p>
        <p>1. Create or duplicate a template and arrange text elements on the square canvas — each element maps to live data (Result no, Programme, Category, Winner names, Teams).</p>
        <p>2. Click <span className="text-accent font-semibold">Edit</span> and use the Export step to pick a finished programme's result, live-preview, and download a high-resolution PNG.</p>
      </div>

      {/* Create-new type chooser */}
      {typeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setTypeModal(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-mainText font-bold text-lg">Create New Template</h3>
              <button onClick={() => setTypeModal(false)} className="text-mutedText hover:text-mainText transition"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {Object.values(TEMPLATE_TYPES).map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTypeModal(false); createFromType(t.key) }}
                  className="w-full flex items-center gap-3 rounded-2xl border border-secondary/40 bg-black/5 dark:bg-black/20 p-4 text-left hover:border-primary hover:bg-purpleSoft transition"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                    {t.key === 'result' ? <FileText size={20} className="text-accent" /> : <ListOrdered size={20} className="text-accent" />}
                  </div>
                  <div>
                    <p className="text-mainText font-semibold text-sm">{t.label}</p>
                    <p className="text-mutedText text-xs mt-0.5">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Explore public templates */}
      {publicModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={() => setPublicModal(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-3xl shadow-2xl border border-secondary/30 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-mainText font-bold text-lg">Explore Public Templates</h3>
              <button onClick={() => setPublicModal(false)} className="text-mutedText hover:text-mainText transition"><X size={20} /></button>
            </div>
            <p className="text-mutedText text-sm mb-5">Curated designs from the festival template library. Pick one to add it to your own templates and start editing.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {explorePublicTemplates().map(tpl => (
                <div key={tpl.id} className={cardCls}>
                  <div className="mx-auto w-full">
                    <PosterStage template={tpl} source={makeSampleSource(tpl.type)} scale={0.2} />
                  </div>
                  <p className="text-mainText font-semibold text-sm truncate">{tpl.name}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => applyPublicTemplate(tpl)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-success hover:bg-success/90 text-white text-xs font-bold rounded-xl py-2 transition"
                    >
                      <Plus size={14} /> Use this template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}