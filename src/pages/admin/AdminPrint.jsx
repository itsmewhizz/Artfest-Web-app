import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { getProgrammes, getStudents, getTeams } from '../../supabase/queries'
import { ArrowLeft, Printer, CheckSquare, Square, AlertCircle } from 'lucide-react'

function calcGrade(points) {
  const p = Number(points)
  if (p === 10) return 'A+'
  if (p >= 8 && p <= 9) return 'A'
  if (p >= 6 && p <= 7) return 'B'
  if (p >= 4 && p <= 5) return 'C'
  return '-'
}

export default function AdminPrint() {
  const navigate = useNavigate()
  const [programmes, setProgrammes] = useState([])
  const [allResults, setAllResults] = useState([])
  const [students, setStudents] = useState([])
  const [teams, setTeams] = useState([])
  const [activeTab, setActiveTab] = useState('programmes')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedSet, setSelectedSet] = useState(new Set())
  const [screenMode, setScreenMode] = useState('list') // 'list' | 'preview'
  const [catFilter, setCatFilter] = useState('')
  const [previewItems, setPreviewItems] = useState([])
  const [toastMsg, setToastMsg] = useState(null)
  const [stampImage, setStampImage] = useState(() => localStorage.getItem('printStampImage') || null)
  const stampInputRef = useRef(null)

  useEffect(() => {
    if (stampImage) localStorage.setItem('printStampImage', stampImage)
    else localStorage.removeItem('printStampImage')
  }, [stampImage])

  const handleStampUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setStampImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  const clearStamp = () => {
    setStampImage(null)
    if (stampInputRef.current) stampInputRef.current.value = ''
  }

  const loadData = useCallback(() => {
    getProgrammes().then(setProgrammes)
    getStudents().then(setStudents)
    getTeams().then(setTeams)
    supabase.from('results').select('*').then(({ data }) => {
      const latest = {}
      ;(data || []).forEach(r => {
        if (!latest[r.programmeId] || r.updatedAt > latest[r.programmeId].updatedAt) {
          latest[r.programmeId] = r
        }
      })
      setAllResults(Object.values(latest))
    })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const CATEGORIES = ['Minor', 'HS', 'Premier', 'Sub Junior', 'Junior', 'General Cat-A', 'General Cat-B']
  const CATEGORY_COLORS = {
    Minor:          { light: '#55EFC4', dark: '#00B894' },
    HS:             { light: '#FF7675', dark: '#D63031' },
    Premier:        { light: '#74B9FF', dark: '#0984E3' },
    'Sub Junior':   { light: '#A29BFE', dark: '#6C5CE7' },
    Junior:         { light: '#FDCB6E', dark: '#D68910' },
    'General Cat-A': { light: '#D1D5DB', dark: '#9CA3AF' },
    'General Cat-B': { light: '#FFFFFF', dark: '#F5F5F5' },
  }

  const teamMap = {}
  teams.forEach(t => { teamMap[t.id] = t.name })

  const resultNoMap = {}
  allResults.forEach(r => { resultNoMap[r.programmeId] = r })

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  // ---- Multi-select ----

  const toggleSelectionMode = () => {
    setSelectionMode(s => !s)
    setSelectedSet(new Set())
  }

  const toggleItem = (id) => {
    if (selectedSet.has(id)) {
      setSelectedSet(prev => { const next = new Set(prev); next.delete(id); return next })
    } else if (selectedSet.size >= 4) {
      showToast("You can't select more than 4 at a time.")
    } else {
      setSelectedSet(prev => { const next = new Set(prev); next.add(id); return next })
    }
  }

  // ---- Build preview data ----

  const buildPreviewItems = (ids, type) => {
    const items = []
    ids.forEach(id => {
      if (type === 'programme') {
        const prog = programmes.find(p => p.id === id)
        if (!prog) return
        const resultRec = resultNoMap[prog.id]
        const participants = students.filter(s => (s.programmeIds || []).includes(prog.id))
        items.push({
          type: 'programme',
          id: prog.id,
          category: prog.category,
          eventName: prog.name,
          number: resultRec?.resultNo || '',
          rows: participants.map((s, i) => ({
            key: `prog-${prog.id}-${s.id}`,
            si: i + 1,
            studentId: s.id,
            name: s.chestNo ? `${s.name} (#${s.chestNo})` : s.name,
            teamId: s.team,
            team: teamMap[s.team] || s.team || ''
          }))
        })
      } else {
        const res = allResults.find(r => r.id === id)
        if (!res) return
        const prog = programmes.find(p => p.id === res.programmeId)
        const rows = []
        const addRow = (placementKey, placement) => {
          if (!placement) return
          const student = students.find(s => s.id === placement.studentId)
          rows.push({
            key: `res-${res.id}-${placementKey}`,
            si: rows.length + 1,
            placementKey,
            studentId: placement.studentId,
            name: placement.name,
            teamId: student?.team || '',
            team: teamMap[student?.team] || student?.team || '',
            point: placement.points || 0,
            grade: placement.grade || calcGrade(placement.points)
          })
        }
        addRow('first', res.first)
        addRow('second', res.second)
        addRow('third', res.third)
        items.push({
          type: 'result',
          id: res.id,
          category: prog?.category || '',
          eventName: res.name || prog?.name || '',
          number: res.resultNo || '',
          rows
        })
      }
    })
    return items
  }

  // ---- Navigation ----

  const openDetail = (item, type) => {
    const items = buildPreviewItems([item.id], type)
    setPreviewItems(items)
    setScreenMode('preview')
  }

  const goToPreview = () => {
    const ids = [...selectedSet]
    if (ids.length === 0) return
    const items = buildPreviewItems(ids, activeTab === 'programmes' ? 'programme' : 'result')
    setPreviewItems(items)
    setScreenMode('preview')
    setSelectionMode(false)
    setSelectedSet(new Set())
  }

  const backToList = () => {
    setScreenMode('list')
    setPreviewItems([])
  }

  // ---- Print ----

  const handlePrint = () => {
    window.print()
  }

  const selectedCount = selectedSet.size

  return (
    <div>
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg no-print">
          <AlertCircle size={18} />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* ====== LIST VIEW ====== */}
      {screenMode === 'list' && (
        <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-mainText mb-4 hover:opacity-80 transition">
            <ArrowLeft size={18} /> Back
          </button>
          <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText mb-6">Print</h2>

          {/* Committee Stamp Upload */}
          <div className="bg-card rounded-2xl p-4 mb-6 shadow-lg border border-secondary/30">
            <label className="text-mutedText text-sm font-semibold block mb-3">Committee Stamp</label>
            <div className="flex items-center gap-4">
              <input ref={stampInputRef} type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
              <button onClick={() => stampInputRef.current?.click()} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {stampImage ? 'Change' : 'Browse'}
              </button>
              {stampImage && (
                <>
                  <div className="w-14 h-14 rounded-lg border-2 border-secondary/30 overflow-hidden shrink-0 bg-secondary/15 flex items-center justify-center">
                    <img src={stampImage} alt="Stamp preview" className="w-full h-full object-cover" />
                  </div>
                  <button onClick={clearStamp} className="text-red-400 hover:text-red-300 text-sm font-semibold underline">&times; Remove</button>
                </>
              )}
              {!stampImage && <span className="text-mutedText text-xs">Upload a committee stamp image to appear on the printed sheet</span>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-4 sm:gap-6 mb-6">
            <button
              onClick={() => { setActiveTab('programmes'); setSelectionMode(false); setSelectedSet(new Set()) }}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold transition text-sm sm:text-base ${
                activeTab === 'programmes'
                  ? 'bg-primary text-white'
                  : 'bg-secondary/15 text-mutedText'
              }`}
            >
              Programmes
            </button>
            <button
              onClick={() => { setActiveTab('results'); setSelectionMode(false); setSelectedSet(new Set()) }}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold transition text-sm sm:text-base ${
                activeTab === 'results'
                  ? 'bg-primary text-white'
                  : 'bg-secondary/15 text-mutedText'
              }`}
            >
              Results
            </button>
          </div>

          {/* Select / Cancel bar */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
                selectionMode
                  ? 'bg-primary text-white'
                  : 'bg-card text-mutedText border border-secondary/30 hover:bg-secondary/10 shadow-lg'
              }`}
            >
              {selectionMode ? <Square size={16} /> : <CheckSquare size={16} />}
              {selectionMode ? 'Cancel' : 'Select'}
            </button>
            {selectionMode && selectedCount > 0 && (
              <button
                onClick={goToPreview}
                className="flex items-center gap-2 bg-success hover:bg-success/90 text-white px-5 py-2 rounded-xl font-bold transition shadow-lg"
              >
                <Printer size={18} /> Print Selected ({selectedCount})
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex justify-center gap-1.5 flex-wrap mb-4">
            <button
              onClick={() => setCatFilter('')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${!catFilter ? 'bg-primary text-white shadow' : 'bg-secondary/15 text-mutedText'}`}
            >
              All
            </button>
            {CATEGORIES.map(cat => {
              const colors = CATEGORY_COLORS[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition ${catFilter === cat ? 'text-white shadow' : 'bg-secondary/15 text-mutedText'}`}
                  style={catFilter === cat ? { background: `linear-gradient(135deg, ${colors.light}, ${colors.dark})` } : {}}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Programme List */}
          {activeTab === 'programmes' && (
            <div className="space-y-3">
              {programmes.length === 0 && <p className="text-mutedText text-center">No programmes found.</p>}
              {programmes.filter(prog => !catFilter || prog.category === catFilter).map(prog => {
                const resultRec = resultNoMap[prog.id]
                const isSelected = selectedSet.has(prog.id)
                return (
                  <div
                    key={prog.id}
                    onClick={() => {
                      if (selectionMode) { toggleItem(prog.id); return }
                      openDetail(prog, 'programme')
                    }}
                    className={`bg-card rounded-xl p-4 cursor-pointer hover:bg-secondary/10 transition shadow-lg border border-secondary/30 flex items-center gap-3 ${
                      selectionMode && isSelected ? 'ring-2 ring-mainText' : ''
                    }`}
                  >
                    {selectionMode && (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary border-primary' : 'border-secondary'
                      }`}>
                        {isSelected && <span className="text-white text-xs font-bold">&#10003;</span>}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-mainText font-medium truncate">
                        {resultRec?.resultNo ? <span className="text-accent font-bold text-lg mr-2">#{resultRec.resultNo}</span> : null}
                        {prog.name}
                      </p>
                      <p className="text-mutedText text-sm">{prog.category}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Result List */}
          {activeTab === 'results' && (
            <div className="space-y-3">
              {allResults.length === 0 && <p className="text-mutedText text-center">No results found.</p>}
              {allResults.filter(res => {
                if (!catFilter) return true
                const prog = programmes.find(p => p.id === res.programmeId)
                return prog?.category === catFilter
              }).map(res => {
                const prog = programmes.find(p => p.id === res.programmeId)
                const isSelected = selectedSet.has(res.id)
                return (
                  <div
                    key={res.id}
                    onClick={() => {
                      if (selectionMode) { toggleItem(res.id); return }
                      openDetail(res, 'result')
                    }}
                    className={`bg-card rounded-xl p-4 cursor-pointer hover:bg-secondary/10 transition shadow-lg border border-secondary/30 flex items-center gap-3 ${
                      selectionMode && isSelected ? 'ring-2 ring-mainText' : ''
                    }`}
                  >
                    {selectionMode && (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary border-primary' : 'border-secondary'
                      }`}>
                        {isSelected && <span className="text-white text-xs font-bold">&#10003;</span>}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-mainText font-medium truncate">
                        {res.resultNo ? <span className="text-accent font-bold text-lg mr-2">#{res.resultNo}</span> : null}
                        {res.name || prog?.name || ''}
                      </p>
                      <p className="text-mutedText text-sm">{prog?.category || ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ====== PREVIEW VIEW ====== */}
      {screenMode === 'preview' && (
        <div>
          {/* Admin chrome - hidden on print */}
          <div className="min-h-screen bg-mainBackground p-4 md:p-6 lg:p-8 max-w-4xl mx-auto no-print">
            <button onClick={backToList} className="flex items-center gap-2 text-mainText mb-4 hover:opacity-80 transition">
              <ArrowLeft size={18} /> Back to list
            </button>
            <div className="flex items-center justify-between mb-4 gap-4">
              <h2 className="text-lg sm:text-2xl font-poppins font-bold text-mainText">
                {previewItems.length > 1 ? `Print Preview (${previewItems.length} sheets)` : 'Print Preview'}
              </h2>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-success hover:bg-success/90 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-base sm:text-lg transition shadow-lg shrink-0"
              >
                <Printer size={18} className="sm:w-[22px] sm:h-[22px]" /> Print
              </button>
            </div>
            <p className="text-mutedText text-xs sm:text-sm mb-6">Print sheets are read-only.</p>
          </div>

          {/* Preview sheets — each block has its own stamp, stacked vertically */}
          <div className="print-page-container">
            {previewItems.map((item, idx) => (
              <div key={idx} className="preview-sheet">
                <table className="print-table">
                  <thead>
                    <tr>
                      <th className="print-category-cell">{item.category}</th>
                      <th className="print-event-cell">{item.eventName}</th>
                      <th className="print-number-cell">
                        {item.type === 'result' ? 'RESULT NO:' : 'PROGRAMME NO:'}
                        {' '}{item.number}
                      </th>
                      <th className="print-stamp-cell" colSpan={item.type === 'result' ? 2 : 1}>
                        <div className="print-stamp-box">
                          {stampImage ? (
                            <img src={stampImage} alt="Committee Stamp" className="stamp-image" />
                          ) : (
                            'COMMITTEE STAMP'
                          )}
                        </div>
                      </th>
                    </tr>
                    <tr>
                      <th>SI.NO</th>
                      <th>NAME</th>
                      <th>TEAM</th>
                      {item.type === 'result' && <th>POINT</th>}
                      {item.type === 'result' && <th>GRADE</th>}
                      {item.type !== 'result' && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {item.rows.map(row => (
                      <tr key={row.key}>
                        <td className="text-center">{row.si}</td>
                        <td>{row.name ?? ''}</td>
                        <td>{row.team ?? ''}</td>
                        {item.type === 'result' && <td className="text-center">{row.point ?? 0}</td>}
                        {item.type === 'result' && <td className="text-center">{row.grade || '-'}</td>}
                        {item.type !== 'result' && <td></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast styles */}
      <style>{`
        .no-print { display: block; }
        .preview-sheet {
          font-family: 'Times New Roman', Times, serif;
          color: black;
          padding: 10mm;
          max-width: 210mm;
          margin: 16px auto;
          background: white;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          border-radius: 4px;
        }
        .print-page-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: stretch;
          justify-content: flex-start;
        }
        .preview-sheet {
          position: relative;
          max-width: none;
          width: 100%;
          margin: 0;
          padding: 8mm;
          flex-shrink: 0;
          box-sizing: border-box;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .preview-sheet .print-stamp-box {
          border: 2px solid black;
          padding: 8px 16px;
          font-size: 10px;
          font-weight: bold;
          text-align: center;
          min-width: 100px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .preview-sheet .stamp-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .preview-sheet .print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          min-width: 500px;
        }
        .preview-sheet .print-table th,
        .preview-sheet .print-table td {
          border: 1px solid black;
          padding: 6px 10px;
          text-align: left;
        }
        .preview-sheet .print-table th {
          background: white !important;
          font-weight: bold;
        }
        .preview-sheet .print-table td.text-center {
          text-align: center;
        }
        .preview-sheet .print-category-cell {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          width: 0;
          min-width: 44px;
          white-space: nowrap;
        }
        .preview-sheet .print-event-cell {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
        }
        .preview-sheet .print-number-cell {
          font-size: 13px;
          font-weight: bold;
          text-align: center;
          white-space: nowrap;
          width: 0;
        }
        .preview-sheet .print-stamp-cell {
          text-align: center;
          vertical-align: middle;
          width: 0;
        }
        .print-input {
          width: 100%;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: inherit;
          color: inherit;
          padding: 2px;
          outline: none;
          border-bottom: 1px dashed #999;
          box-sizing: border-box;
        }
        .print-input:focus {
          border-bottom-color: #2563eb;
          background: #f0f7ff;
        }
        .print-input.text-center {
          text-align: center;
        }
        .print-editable {
          padding: 2px 6px !important;
        }
        @media (max-width: 767px) {
          .print-page-container {
            gap: 4px;
          }
          .preview-sheet {
            padding: 4mm;
          }
          .preview-sheet .print-table {
            font-size: 10px;
            min-width: 460px;
          }
          .preview-sheet .print-table th,
          .preview-sheet .print-table td {
            padding: 4px 6px;
          }
          .preview-sheet .print-category-cell {
            font-size: 11px;
            min-width: 36px;
          }
          .preview-sheet .print-event-cell {
            font-size: 14px;
          }
          .preview-sheet .print-number-cell {
            font-size: 10px;
          }
          .preview-sheet .print-stamp-box {
            min-width: 72px;
            min-height: 34px;
            padding: 4px 8px;
            font-size: 8px;
          }
          .print-input {
            font-size: 10px;
          }
        }
        @media print {
          @page {
            margin: 8mm;
            size: A4 portrait;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          .print-page-container,
          .print-page-container * {
            visibility: visible;
          }
          .print-page-container {
            position: absolute;
            top: 0;
            left: 0;
            display: flex !important;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
            gap: 3mm;
            width: 100%;
          }
          .preview-sheet {
            display: block !important;
            visibility: visible;
            width: 100%;
            height: 67mm;
            margin: 0;
            padding: 0;
            background: white;
            box-shadow: none;
            border-radius: 0;
            border: 1px solid #ccc;
            font-size: 9px;
            page-break-inside: avoid;
            overflow: hidden;
            flex-shrink: 0;
            box-sizing: border-box;
          }
          .preview-sheet .print-category-cell {
            font-size: 10px;
          }
          .preview-sheet .print-event-cell {
            font-size: 13px;
          }
          .preview-sheet .print-number-cell {
            font-size: 9px;
          }
          .preview-sheet .print-stamp-box {
            border: 2px solid black;
            min-width: 60px;
            min-height: 36px;
            font-size: 6px;
            font-weight: bold;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
          }
          .preview-sheet .print-table {
            font-size: 9px;
            min-width: 0;
          }
          .preview-sheet .print-table th,
          .preview-sheet .print-table td {
            padding: 3px 5px;
          }
          .no-print {
            display: none !important;
          }
          .preview-sheet .stamp-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          .print-input {
            border: none;
            background: transparent;
            border-bottom: 1px dashed #999;
          }
          .print-input:focus {
            background: transparent;
          }
        }
      `}</style>
    </div>
  )
}
