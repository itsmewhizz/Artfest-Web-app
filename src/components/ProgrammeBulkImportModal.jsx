import { useState, useEffect, useRef } from 'react'
import { X, Upload, CheckCircle2, AlertCircle, Save } from 'lucide-react'
import { supabase } from '../supabase/client'
import { createPlaceholderResultForProgramme } from '../supabase/queries'
import { useToast } from './Toast'

export default function ProgrammeBulkImportModal({
  open,
  onClose,
  existingCategories = []
}) {
  const [step, setStep] = useState('select_file')
  const [file, setFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [tab, setTab] = useState('All')
  const [importStats, setImportStats] = useState({ imported: 0, skipped: 0, errors: 0 })
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setStep('select_file')
      setFile(null)
      setParsedRows([])
      setImportStats({ imported: 0, skipped: 0, errors: 0 })
    }
  }, [open])

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    setFile(selectedFile)

    try {
      const { parseProgrammeFile } = await import('../utils/programmeBulkParser')
      const results = await parseProgrammeFile(selectedFile, { existingCategories })
      setParsedRows(results)
      setStep('preview')
    } catch (err) {
      toast(err.message, 'error')
      setStep('select_file')
    }
  }

  const updateRow = async (index, field, value) => {
    const newRows = [...parsedRows]
    newRows[index].data[field] = value
    const { validateProgrammes } = await import('../utils/programmeBulkParser')
    const rawRows = parsedRows.map(r => r.data)
    const validated = validateProgrammes(rawRows, existingCategories)
    setParsedRows(validated)
  }

  const toggleRow = (index) => {
    const newRows = [...parsedRows]
    newRows[index].isValid = !newRows[index].isValid
    setParsedRows(newRows)
  }

  const handleImport = async () => {
    setLoading(true)
    let imported = 0
    let skipped = 0
    let errorsCount = 0

    try {
      for (const row of parsedRows) {
        if (!row.isValid) {
          skipped++
          continue
        }
        const { data, error } = await supabase.from('programmes').insert(row.data).select()
        if (error) {
          console.error('Insert error:', error)
          errorsCount++
        } else {
          if (data && data[0]) {
            await createPlaceholderResultForProgramme(data[0].id, data[0].name)
          }
          imported++
        }
      }
      setImportStats({ imported, skipped, errors: errorsCount })
      setStep('summary')
    } catch (err) {
      toast('Import failed: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl bg-card rounded-[28px] border border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-subtle flex items-center justify-between bg-black/5">
          <div>
            <h3 className="text-xl font-display font-bold text-mainText">Bulk Import Programmes</h3>
            <p className="text-sm text-mutedText">Import programme data from CSV, XLSX, or PDF</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition text-mutedText">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 'select_file' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-accent-purple-soft flex items-center justify-center mb-4 text-accent-purple">
                <Upload size={32} />
              </div>
              <h4 className="text-lg font-semibold text-mainText mb-2">Select Import File</h4>
              <p className="text-mutedText text-sm mb-6 max-w-xs">
                Upload a .csv, .xlsx, or .pdf file containing programme details.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-result px-8 py-3"
              >
                Choose File
              </button>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-black/5 p-1 rounded-xl">
                  {['All', 'Valid', 'Errors'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${tab === t ? 'bg-card shadow-sm text-mainText' : 'text-mutedText hover:text-mainText'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-mutedText">
                  Showing {parsedRows.filter(r => tab === 'All' || (tab === 'Valid' && r.isValid) || (tab === 'Errors' && !r.isValid)).length} of {parsedRows.length} rows
                </span>
              </div>

              <div className="overflow-x-auto border border-subtle rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/5 text-mutedText text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Participation</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {parsedRows
                      .filter(r => tab === 'All' || (tab === 'Valid' && r.isValid) || (tab === 'Errors' && !r.isValid))
                      .map((row, i) => (
                        <tr key={i} className={`hover:bg-black/5 transition ${!row.isValid ? 'bg-red-500/5' : ''}`}>
                          <td className="px-4 py-3">
                            {row.isValid ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className="bg-transparent border-b border-transparent focus:border-accent-purple outline-none w-full"
                              value={row.data.name}
                              onChange={(e) => updateRow(row.index, 'name', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className="bg-transparent border-b border-transparent focus:border-accent-purple outline-none w-full"
                              value={row.data.category}
                              onChange={(e) => updateRow(row.index, 'category', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className="bg-transparent border-b border-transparent focus:border-accent-purple outline-none w-full"
                              value={row.data.programmeType}
                              onChange={(e) => updateRow(row.index, 'programmeType', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className="bg-transparent border-b border-transparent focus:border-accent-purple outline-none w-full"
                              value={row.data.participationType}
                              onChange={(e) => updateRow(row.index, 'participationType', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => toggleRow(row.index)} className="p-1 hover:bg-black/10 rounded text-mutedText" title="Toggle valid/invalid">
                              <Save size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {parsedRows.some(r => !r.isValid) && (
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <p className="text-xs text-red-600 font-medium mb-2">Some rows have errors. Fix them above or exclude them by toggling the status icon.</p>
                  <div className="flex flex-wrap gap-2">
                    {parsedRows.filter(r => !r.isValid).map((r, i) => (
                      <span key={i} className="text-[10px] bg-red-500/20 text-red-700 px-2 py-0.5 rounded-md border border-red-500/30">
                        Row {r.index + 1}: {r.errors.join(', ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setStep('select_file')} className="px-6 py-2 text-sm font-semibold text-mutedText hover:text-mainText transition">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="btn-result px-8 py-2"
                >
                  {loading ? 'Importing...' : 'Import Valid Rows'}
                </button>
              </div>
            </div>
          )}

          {step === 'summary' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
                <CheckCircle2 size={40} />
              </div>
              <h4 className="text-2xl font-bold text-mainText mb-2">Import Complete</h4>
              <div className="grid grid-cols-3 gap-8 my-8">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{importStats.imported}</div>
                  <div className="text-xs text-mutedText uppercase tracking-wider">Imported</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{importStats.skipped}</div>
                  <div className="text-xs text-mutedText uppercase tracking-wider">Skipped</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{importStats.errors}</div>
                  <div className="text-xs text-mutedText uppercase tracking-wider">Errors</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn-result px-8 py-3"
              >
                Close Modal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
