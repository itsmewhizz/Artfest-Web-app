import { useEffect, useState, useCallback } from 'react'
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
      // Group ALL Sign sheets first, then ALL Valuation sheets.
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

          {/* Preview sheets — each block is one self-contained A4 sheet */}
          <div className="print-page-container">
            {previewItems.map((item, idx) => (
              <div key={idx} className="preview-sheet">
                {/* Sheet header */}
                <div className="print-header">
                  <div className="print-title">Rendezvous'26 - ISRA Vatanappally</div>
                  <div className="print-subtitle">
                    {item.sheet === 'valuation' && 'Valuation sheet'}
                    {item.sheet === 'sign' && 'Sign Sheet'}
                    {item.sheet === 'result' && 'Result'}
                  </div>
                </div>

                {/* Metadata row: Program | Category | Type */}
                <table className="print-table print-meta-table">
                  <thead>
                    <tr>
                      <th>Program</th>
                      <th>Category</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{item.eventName}</td>
                      <td>{item.category}</td>
                      <td>{item.programmeType}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Data table */}
                <table className="print-table print-data-table">
                  {item.sheet === 'sign' && (
                    <>
                      <thead>
                        <tr>
                          <th>Chest No</th>
                          <th>Name</th>
                          <th>Code Letter</th>
                          <th>Signature</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.rows.map(row => (
                          <tr key={row.key}>
                            <td className="text-center">{row.chestNo}</td>
                            <td>{row.name}</td>
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
                          <th>Code Letter</th>
                          <th>Grade</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(item.rows.length > 0 ? item.rows : [{ key: 'val-blank' }]).map(row => (
                          <tr key={row.key} className="write-row">
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {item.sheet === 'result' && (
                    <>
                      <thead>
                        <tr>
                          <th>Chest No</th>
                          <th>Name</th>
                          <th>Team</th>
                          <th>Code</th>
                          <th>Grade</th>
                          <th>Price</th>
                          <th>Point</th>
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

                {/* Valuation signature footer */}
                {item.sheet === 'valuation' && (
                  <div className="print-sign">
                    <span className="print-sign-label">Signature of Judge</span>
                    <span className="print-sign-line" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sheet & print styles */}
      <style>{`
        .preview-sheet {
          font-family: 'Sora', 'Segoe UI', system-ui, sans-serif;
          color: #000;
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          padding: 14mm;
          box-sizing: border-box;
          box-shadow: 0 2px 16px rgba(0,0,0,0.18);
          display: flex;
          flex-direction: column;
        }

        .print-header {
          text-align: center;
          margin-bottom: 8mm;
        }
        .print-title {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #000;
        }
        .print-subtitle {
          font-size: 17px;
          font-weight: 700;
          margin-top: 3px;
          color: #000;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Sora', 'Segoe UI', system-ui, sans-serif;
          font-size: 13px;
          color: #000;
        }
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
          vertical-align: middle;
        }
        .print-table th {
          background: #fff;
          font-weight: 700;
          text-align: center;
        }
        .print-table td.text-center {
          text-align: center;
        }

        .print-meta-table {
          margin-bottom: 6mm;
        }
        .print-meta-table td {
          font-weight: 700;
          text-align: center;
        }

        .print-data-table tbody .write-row td {
          height: 14mm;
        }

        .print-sign {
          margin-top: 14mm;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8mm;
        }
        .print-sign-label {
          font-size: 13px;
          font-weight: 600;
          color: #000;
        }
        .print-sign-line {
          width: 48mm;
          height: 10mm;
          border-bottom: 1px solid #000;
        }

        @media screen and (max-width: 767px) {
          .preview-sheet {
            width: 100%;
            min-height: 0;
            margin: 12px 0;
            padding: 8mm;
            overflow-x: auto;
          }
          .print-table {
            font-size: 11px;
            min-width: 460px;
          }
          .print-title {
            font-size: 16px;
          }
          .print-subtitle {
            font-size: 14px;
          }
          .print-table th,
          .print-table td {
            padding: 6px;
          }
          .print-data-table tbody .write-row td {
            height: 10mm;
          }
        }

        @media print {
          @page {
            margin: 10mm;
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
          .no-print {
            display: none !important;
          }
          .print-page-container,
          .print-page-container * {
            visibility: visible;
          }
          .print-page-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            display: block;
          }
          .preview-sheet {
            width: 100%;
            min-height: 0;
            height: auto;
            margin: 0;
            padding: 0;
            box-shadow: none;
            display: block;
            page-break-after: always;
            break-after: page;
            visibility: visible;
          }
          .preview-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </div>
  )
}