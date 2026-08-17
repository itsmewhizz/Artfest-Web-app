import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../supabase/client'
import { getProgrammes, getStudents, getTeams } from '../../supabase/queries'
import { ArrowLeft, Printer, CheckSquare, Square, AlertCircle } from 'lucide-react'
import FilterDropdown from '../../components/FilterDropdown'

// Copies of each sheet type that fit on a single printed A4 page (reference layout).
const PER_PAGE = { valuation: 2, sign: 2, result: 4 }
// Sheet-specific subheader, shown directly under the title on every block.
const SHEET_SUBTITLES = { valuation: 'Valuation sheet', sign: 'Sign Sheet', result: 'Result' }
// Exact column layout from the reference document.
const COL_HEADERS = {
  valuation: ['Code letter', 'Grade', 'Price'],
  sign: ['Chest No', 'Name', 'Code Letter', 'Signature'],
  result: ['Chest No', 'Name', 'Team', 'code', 'Grade', 'Price', 'Point'],
}

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
  // Each programme expands into TWO base sheet items (Sign then Valuation);
  // each result is a single base sheet item.

  const buildPreviewItems = (ids, type) => {
    const items = []
    if (type === 'programme') {
      ids.forEach(id => {
        const prog = programmes.find(p => p.id === id)
        if (!prog) return
        const info = {
          id: prog.id,
          category: prog.category || '',
          eventName: prog.name,
          participationType: prog.participationType || prog.participation_type || '',
        }
        const participants = students
          .filter(s => (s.programmeIds || []).includes(prog.id))
          .map(s => ({
            key: `p-${prog.id}-${s.id}`,
            chestNo: s.chestNo || '',
            name: s.name,
            team: teamMap[s.team] || s.team || '',
          }))

        // Page 1: Sign Sheet, Page 2: Valuation Sheet (order matters for pagination).
        items.push({ ...info, sheet: 'sign', participants })
        items.push({ ...info, sheet: 'valuation', participants })
      })
      return items
    }

    ids.forEach(id => {
      const res = allResults.find(r => r.id === id)
      if (!res) return
      const prog = programmes.find(p => p.id === res.programmeId)
      const rows = []
      const addRow = (placement) => {
        if (!placement) return
        const student = students.find(s => s.id === placement.studentId)
        rows.push({
          key: `res-${res.id}-${placement.studentId || rows.length}`,
          chestNo: student?.chestNo || '',
          name: placement.name || student?.name || '',
          team: teamMap[student?.team] || student?.team || '',
          grade: placement.grade || calcGrade(placement.points),
          price: placement.prize || '',
          point: placement.points ?? '',
        })
      }
      addRow(res.first)
      addRow(res.second)
      addRow(res.third)
      items.push({
        sheet: 'result',
        id: res.id,
        category: prog?.category || '',
        eventName: res.name || prog?.name || '',
        participationType: prog?.participationType || prog?.participation_type || '',
        rows,
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

  // ---- Pagination ----
  // Programmes: each selected programme = 2 A4 pages (Sign, then Valuation).
  // Every page holds 2 blocks (the programme's sheet + a blank spare template),
  // except when the whole job is exactly 1 programme, in which case the spare is dropped.
  // Results: blocks fill sequentially at 4 per A4 page; the last page keeps only
  // the filled blocks and never renders empty template slots.

  const makeSpareBlock = (item) => ({
    sheet: item.sheet,
    eventName: '',
    category: '',
    participationType: '',
    participants: item.participants
      ? item.participants.map(p => ({ ...p, chestNo: '', name: '', team: '' }))
      : [],
    rows: [],
  })

  const pages = []
  if (previewItems.length && previewItems[0].sheet !== 'result') {
    const totalProgrammes = previewItems.length / 2
    for (let i = 0; i < previewItems.length; i += 2) {
      const signItem = previewItems[i]
      const valItem = previewItems[i + 1]
      const signPage = [signItem]
      const valPage = [valItem]
      if (totalProgrammes > 1) {
        signPage.push(makeSpareBlock(signItem))
        valPage.push(makeSpareBlock(valItem))
      }
      pages.push(signPage, valPage)
    }
  } else {
    for (let i = 0; i < previewItems.length; i += PER_PAGE.result) {
      pages.push(previewItems.slice(i, i + PER_PAGE.result))
    }
  }

  const totalPages = pages.length

  // ---- Render helpers ----

  const renderSheetBlock = (item, blockKey) => (
    <div className="print-sheet-block" key={blockKey}>
      <div className="print-header">
        <div className="print-title">Rendezvous'26 - ISRA Vatanappally</div>
        <div className="print-subtitle">{SHEET_SUBTITLES[item.sheet]}</div>
      </div>
      <table className="print-table">
        <tbody>
          <tr className="print-meta-row">
            <td><span className="print-meta-label">Programme</span><span className="print-meta-value">{item.eventName}</span></td>
            <td><span className="print-meta-label">Category</span><span className="print-meta-value">{item.category}</span></td>
            <td><span className="print-meta-label">Type</span><span className="print-meta-value">{item.participationType}</span></td>
          </tr>
          <tr className="print-col-head">
            {COL_HEADERS[item.sheet].map((label, i) => <th key={i}>{label}</th>)}
          </tr>
          {item.sheet === 'valuation' && item.participants.map(p => (
            <tr key={p.key}><td></td><td></td><td></td></tr>
          ))}
          {item.sheet === 'sign' && item.participants.map(p => (
            <tr key={p.key}><td className="text-center">{p.chestNo}</td><td>{p.name}</td><td></td><td></td></tr>
          ))}
          {item.sheet === 'result' && item.rows.map(row => (
            <tr key={row.key}><td className="text-center">{row.chestNo}</td><td>{row.name}</td><td>{row.team}</td><td></td><td className="text-center">{row.grade}</td><td className="text-center">{row.price}</td><td className="text-center">{row.point}</td></tr>
          ))}
        </tbody>
      </table>
      {item.sheet === 'valuation' && (
        <div className="print-sign">
          <span className="print-sign-label">Signature of Judge</span>
          <span className="print-sign-line" />
        </div>
      )}
    </div>
  )

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
                {totalPages > 1 ? `Print Preview (${totalPages} pages)` : 'Print Preview'}
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

          {/* Preview pages — each physical A4 page holds 2 valuation/sign or 4 result blocks */}
          <div className="print-page-container">
            {pages.map((page, pi) => (
              <div
                className={`print-sheet-page ${page.length < PER_PAGE[page[0].sheet] ? 'print-sheet-page--partial' : ''}`}
                key={pi}
              >
                {page.map((item, bi) => renderSheetBlock(item, `${pi}-${bi}`))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sheet & print styles */}
      <style>{`
        .print-page-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
          overflow-x: auto;
        }

        .print-sheet-page {
          width: 210mm;
          min-height: 248mm;
          background: #fff;
          padding: 6mm;
          box-sizing: border-box;
          box-shadow: 0 2px 16px rgba(0,0,0,0.18);
        }

        /* Pages holding fewer blocks than their template capacity drop the
           leftover A4 space entirely — no empty template slots are shown. */
        .print-sheet-page--partial {
          min-height: 0;
        }

        .print-sheet-block {
          font-family: 'Sora', 'Segoe UI', system-ui, sans-serif;
          color: #000;
          background: #fff;
          box-sizing: border-box;
        }
        .print-sheet-block + .print-sheet-block {
          margin-top: 5mm;
        }

        .print-header {
          text-align: center;
          margin-bottom: 2mm;
        }
        .print-title {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #000;
        }
        .print-subtitle {
          font-size: 13px;
          font-weight: 700;
          margin-top: 1px;
          color: #000;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Sora', 'Segoe UI', system-ui, sans-serif;
          font-size: 12px;
          color: #000;
        }
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 6px 8px;
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

        .print-meta-row td {
          text-align: center;
        }
        .print-meta-label {
          display: block;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .print-meta-value {
          display: block;
          font-size: 12px;
          font-weight: 700;
          margin-top: 1px;
        }

        .print-sign {
          margin-top: 4mm;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5mm;
        }
        .print-sign-label {
          font-size: 12px;
          font-weight: 600;
          color: #000;
        }
        .print-sign-line {
          width: 38mm;
          height: 7mm;
          border-bottom: 1px solid #000;
        }

        @media screen and (max-width: 767px) {
          .print-page-container {
            align-items: stretch;
          }
          .print-sheet-page {
            width: 100%;
            min-height: 0;
            padding: 4mm;
          }
          .print-table {
            font-size: 11px;
            min-width: 460px;
          }
          .print-title {
            font-size: 13px;
          }
          .print-subtitle {
            font-size: 12px;
          }
          .print-table th,
          .print-table td {
            padding: 4px 6px;
          }
        }

        @media print {
          @page {
            margin: 6mm;
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
            align-items: stretch;
            gap: 0;
          }
          .print-sheet-page {
            width: auto;
            max-width: none;
            min-height: 0;
            padding: 0;
            margin: 0;
            box-shadow: none;
            display: flex;
            flex-direction: column;
            gap: 4mm;
            page-break-after: always;
            break-after: page;
          }
          .print-sheet-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-sheet-block + .print-sheet-block {
            margin-top: 0;
          }
        }
      `}</style>
    </div>
  )
}