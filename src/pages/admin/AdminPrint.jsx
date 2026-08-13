import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { getProgrammes, getStudents, getTeams } from '../../supabase/queries'
import { ArrowLeft, Printer, CheckSquare, Square, AlertCircle } from 'lucide-react'
import FilterDropdown from '../../components/FilterDropdown'

function calcGrade(points) {
  const p = Number(points)
  if (p === 10) return 'A+'
  if (p >= 8 && p <= 9) return 'A'
  if (p >= 6 && p <= 7) return 'B'
  if (p >= 4 && p <= 5) return 'C'
  return '-'
}

const SHEETS_PER_PROGRAMME = 2
const MAX_SHEETS = 8

// Info-header cell (label + value), used on every sheet.
const InfoCell = ({ label, value = '' }) => (
  <th className="print-info-cell">
    <span className="print-info-label">{label}</span>
    <span className="print-info-value">{value}</span>
  </th>
)

// Blank committee-stamp box cell for an info header row.
const InfoStampCell = ({ stampImage }) => (
  <th className="print-stamp-cell">
    <div className="print-stamp-box">
      {stampImage ? (
        <img src={stampImage} alt="Committee Stamp" className="stamp-image" />
      ) : (
        'COMMITTEE STAMP'
      )}
    </div>
  </th>
)

// Stamp box cell used as the last column of the Valuation sheet's sub-header.
const SubStampCell = ({ stampImage }) => (
  <th className="print-sub-stamp-cell">
    <div className="print-stamp-box">
      {stampImage ? (
        <img src={stampImage} alt="Committee Stamp" className="stamp-image" />
      ) : (
        'COMMITTEE STAMP'
      )}
    </div>
  </th>
)

export default function AdminPrint() {
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

  const catOptions = [
    { value: '', label: 'All Categories', icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
    ...CATEGORIES.map(cat => ({
      value: cat,
      label: cat,
      icon: <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat]?.light || '#9CA3AF' }} />,
    })),
  ]

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

  // Programmes consume 2 sheets (Sign + Valuation), results consume 1.
  const sheetsPerItem = () => (activeTab === 'programmes' ? SHEETS_PER_PROGRAMME : 1)

  const sheetsUsed = () => selectedSet.size * sheetsPerItem()

  const toggleItem = (id) => {
    if (selectedSet.has(id)) {
      setSelectedSet(prev => { const next = new Set(prev); next.delete(id); return next })
    } else if (sheetsUsed() + sheetsPerItem() > MAX_SHEETS) {
      showToast(`You can't select more than ${MAX_SHEETS} sheets at a time.`)
    } else {
      setSelectedSet(prev => { const next = new Set(prev); next.add(id); return next })
    }
  }

  // ---- Build preview data ----
  // Each programme expands into TWO sheet items (Sign + Valuation);
  // each result is a single sheet item.

  const buildPreviewItems = (ids, type) => {
    const items = []
    if (type === 'programme') {
      // Group ALL Sign sheets first, then ALL Valuation sheets. Sign sheets
      // flow onto the first page(s); the Valuation group starts fresh on the
      // following page via the `breakBefore` marker on its first sheet.
      const signItems = []
      const valuationItems = []
      ids.forEach(id => {
        const prog = programmes.find(p => p.id === id)
        if (!prog) return
        const resultRec = resultNoMap[prog.id]
        const number = resultRec?.resultNo || ''
        const info = {
          id: prog.id,
          category: prog.category || '',
          eventName: prog.name,
          programmeType: prog.programmeType || prog.type || '',
          participationType: prog.participationType || prog.participation_type || '',
          number,
        }
        const participants = students.filter(s => (s.programmeIds || []).includes(prog.id))

        // Sign Sheet
        signItems.push({
          ...info,
          sheet: 'sign',
          type: 'programme',
          rows: participants.map(s => ({
            key: `sign-${prog.id}-${s.id}`,
            chestNo: s.chestNo || '',
            name: s.name,
            team: teamMap[s.team] || s.team || '',
          }))
        })

        // Valuation Sheet
        valuationItems.push({
          ...info,
          sheet: 'valuation',
          type: 'programme',
          rows: participants.map(s => ({
            key: `val-${prog.id}-${s.id}`,
          }))
        })
      })
      if (valuationItems.length > 0) valuationItems[0].breakBefore = true
      items.push(...signItems, ...valuationItems)
      return items
    }

    ids.forEach(id => {
      const res = allResults.find(r => r.id === id)
      if (!res) return
      const prog = programmes.find(p => p.id === res.programmeId)
      const rows = []
      const addRow = (placementKey, placement) => {
        if (!placement) return
        const student = students.find(s => s.id === placement.studentId)
        rows.push({
          key: `res-${res.id}-${placementKey}`,
          chestNo: student?.chestNo || '',
          name: placement.name || student?.name || '',
          team: teamMap[student?.team] || student?.team || '',
          codeLetter: placement.codeLetter || '',
          grade: placement.grade || calcGrade(placement.points),
          prize: placement.prize || '',
          point: placement.points || 0,
        })
      }
      addRow('first', res.first)
      addRow('second', res.second)
      addRow('third', res.third)
      items.push({
        type: 'result',
        sheet: 'result',
        id: res.id,
        category: prog?.category || '',
        eventName: res.name || prog?.name || '',
        programmeType: prog?.programmeType || prog?.type || '',
        participationType: prog?.participationType || prog?.participation_type || '',
        number: res.resultNo || '',
        rows
      })
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
  const selectedSheets = sheetsUsed()

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
        <div className="max-w-4xl mx-auto">
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
                <Printer size={18} /> Print Selected ({selectedSheets} sheet{selectedSheets === 1 ? '' : 's'})
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="mb-4 max-w-xs mx-auto">
            <FilterDropdown
              dark
              label="All Categories"
              options={catOptions}
              value={catFilter}
              onChange={setCatFilter}
            />
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
          <div className="max-w-4xl mx-auto no-print">
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

          {/* Preview sheets — each block is one self-contained sheet */}
          <div className="print-page-container">
            {previewItems.map((item, idx) => {
              // For Valuation sheets, size each blank writable row to fill the
              // fixed 67mm print slot without overflowing it, so the judge has
              // comfortable handwriting room for Point / Grade / Prize etc.
              const valuationRowH = item.sheet === 'valuation' && item.rows.length > 0
                ? Math.max(8, Math.min(30, Math.floor(180 / item.rows.length)))
                : null
              return (
              <div key={idx} className={`preview-sheet${item.breakBefore ? ' page-break-before' : ''}`}>
                {/* Info header table */}
                <table className="print-table print-info-table">
                  <thead>
                    <tr>
                      {item.sheet === 'valuation' ? (
                        <>
                          <InfoCell label="RESULT NO" value={item.number} />
                          <InfoCell label="CATEGORY" value={item.category} />
                          <InfoCell label="PROGRAMME NAME" value={item.eventName} />
                          <InfoCell label="INDIVIDUAL/GROUP" value={item.participationType} />
                          <InfoCell label="ON/OFF-STAGE" value={item.programmeType} />
                        </>
                      ) : (
                        <>
                          <InfoCell label="RESULT NO" value={item.number} />
                          <InfoCell label="CATEGORY" value={item.category} />
                          <InfoCell label="PROGRAMME NAME" value={item.eventName} />
                          <InfoCell label="INDIVIDUAL/GROUP" value={item.participationType} />
                          <InfoCell label="ON/OFF-STAGE" value={item.programmeType} />
                          <InfoStampCell stampImage={stampImage} />
                        </>
                      )}
                    </tr>
                  </thead>
                </table>

                {/* Data table */}
                <table className="print-table">
                  {item.sheet === 'sign' && (
                    <>
                      <thead>
                        <tr>
                          <th>CHEST NO</th>
                          <th>NAME</th>
                          <th>TEAM</th>
                          <th>SIGN</th>
                          <th>CODE LETTER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.rows.map(row => (
                          <tr key={row.key}>
                            <td className="text-center">{row.chestNo}</td>
                            <td>{row.name}</td>
                            <td>{row.team}</td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {item.sheet === 'valuation' && (
                    <>
                      <thead>
                        <tr>
                          <th>CODE LETTER</th>
                          <th>POINT</th>
                          <th>GRADE</th>
                          <th>PRIZE</th>
                          <SubStampCell stampImage={stampImage} />
                        </tr>
                      </thead>
                      <tbody>
                        {item.rows.map(row => (
                          <tr key={row.key}>
                            <td style={{ height: `${valuationRowH}px`, boxSizing: 'border-box' }}></td>
                            <td style={{ height: `${valuationRowH}px`, boxSizing: 'border-box' }}></td>
                            <td style={{ height: `${valuationRowH}px`, boxSizing: 'border-box' }}></td>
                            <td style={{ height: `${valuationRowH}px`, boxSizing: 'border-box' }}></td>
                            <td style={{ height: `${valuationRowH}px`, boxSizing: 'border-box' }}></td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {item.sheet === 'result' && (
                    <>
                      <thead>
                        <tr>
                          <th>CHEST NO</th>
                          <th>NAME</th>
                          <th>TEAM</th>
                          <th>CODE LETTER</th>
                          <th>GRADE</th>
                          <th>PRIZE</th>
                          <th>POINT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.rows.map(row => (
                          <tr key={row.key}>
                            <td className="text-center">{row.chestNo}</td>
                            <td>{row.name}</td>
                            <td>{row.team}</td>
                            <td className="text-center">{row.codeLetter}</td>
                            <td className="text-center">{row.grade || '-'}</td>
                            <td className="text-center">{row.prize}</td>
                            <td className="text-center">{row.point}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
              )
            })}
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
        .preview-sheet.page-break-before {
          break-before: page;
          page-break-before: always;
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
        .preview-sheet .print-info-table {
          margin-bottom: 0;
        }
        .preview-sheet .print-info-cell {
          text-align: center;
          vertical-align: middle;
          padding: 5px 8px;
        }
        .preview-sheet .print-info-label {
          display: block;
          font-size: 8px;
          font-weight: normal;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .preview-sheet .print-info-value {
          display: block;
          font-size: 13px;
          font-weight: bold;
          margin-top: 2px;
        }
        .preview-sheet .print-stamp-cell {
          text-align: center;
          vertical-align: middle;
          width: 0;
        }
        .preview-sheet .print-sub-stamp-cell {
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
          .preview-sheet .print-info-cell {
            padding: 3px 5px;
          }
          .preview-sheet .print-info-label {
            font-size: 7px;
          }
          .preview-sheet .print-info-value {
            font-size: 11px;
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
          .preview-sheet .print-info-label {
            font-size: 7px;
          }
          .preview-sheet .print-info-value {
            font-size: 12px;
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