import { useState } from 'react'
import { X, FileUp, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { parseFileToRows } from '../utils/importParsers'

export default function FileImportModal({ open, title, description, accept, hint, onClose, onImport }) {
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  if (!open) return null

  const reset = () => {
    setFile(null)
    setParsing(false)
    setProgress(0)
    setParsed(null)
    setError('')
    setImporting(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setParsed(null)
    setError('')
    setProgress(0)
  }

  const handleParse = async () => {
    if (!file) {
      setError('Choose a file first.')
      return
    }
    setParsing(true)
    setError('')
    setProgress(0)
    try {
      const result = await parseFileToRows(file, setProgress)
      setParsed(result)
      if (result.rows.length === 0) {
        setError('No rows found in this file. Make sure it contains a header row (Name, Category, Team ...) or tabular data.')
      }
    } catch (err) {
      console.error('Import parse failed:', err)
      setError(err.message || 'Failed to parse the file. Try a different format.')
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    if (!parsed || !file) return
    setImporting(true)
    setError('')
    try {
      await onImport(parsed, file.name)
      close()
    } catch (err) {
      console.error('Import failed:', err)
      setError(err.message || 'Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const previewRows = parsed?.rows?.slice(0, 5) || []

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={close}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-mainText font-bold text-lg">{title}</h3>
          <button onClick={close} className="text-mutedText hover:text-mainText transition">
            <X size={20} />
          </button>
        </div>
        {description && <p className="text-mutedText text-sm mb-4">{description}</p>}

        <label className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-secondary/40 bg-black/10 hover:bg-black/15 transition cursor-pointer p-6 mb-3 text-center">
          <FileUp size={24} className="text-accent" />
          <span className="text-mainText text-sm font-semibold">{file ? file.name : 'Choose a file'}</span>
          <span className="text-mutedText text-xs">{accept ? `Supports: ${accept.replace(/,/g, ', ')}` : 'CSV, Excel, PDF or an image (OCR)'}</span>
          <input type="file" accept={accept} className="hidden" onChange={handleFile} />
        </label>

        {hint && <p className="text-mutedText text-[11px] leading-relaxed mb-3">{hint}</p>}

        {file && !parsed && !parsing && (
          <button
            onClick={handleParse}
            className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition mb-4"
          >
            <FileUp size={16} /> Parse File
          </button>
        )}

        {parsing && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-mutedText text-sm mb-2">
              <Loader2 size={16} className="animate-spin" /> Parsing file... {progress > 0 ? `${progress}%` : ''}
            </div>
            <div className="h-2 rounded-full bg-black/20 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress || 4}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-500/15 border border-red-500/40 text-red-300 text-xs rounded-xl p-3 mb-4">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {parsed && parsed.rows.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-success text-sm font-semibold mb-2">
              <CheckCircle2 size={16} /> {parsed.rows.length} rows ready to import
            </div>
            <div className="bg-black/10 rounded-xl overflow-hidden border border-secondary/30">
              <table className="w-full text-xs">
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-secondary/20 last:border-0">
                      <td className="px-3 py-2 text-mutedText w-8">{i + 1}</td>
                      <td className="px-3 py-2 text-mainText truncate max-w-[12rem]">
                        {Array.isArray(row)
                          ? row.slice(0, 3).filter(Boolean).join(' · ')
                          : Object.values(row).slice(0, 3).filter(Boolean).join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 5 && (
                <p className="px-3 py-2 text-mutedText text-[11px] border-t border-secondary/20">… and {parsed.rows.length - 5} more</p>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-success hover:bg-success/90 text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 transition mt-3 disabled:opacity-60"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {importing ? 'Importing...' : `Import ${parsed.rows.length} row${parsed.rows.length === 1 ? '' : 's'}`}
            </button>
            <button
              onClick={reset}
              className="w-full text-mutedText text-sm py-2 mt-1 flex items-center justify-center gap-2 hover:text-mainText transition"
            >
              <Trash2 size={14} /> Choose a different file
            </button>
          </div>
        )}
      </div>
    </div>
  )
}