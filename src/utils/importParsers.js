import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import * as pdfjs from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { createWorker } from 'tesseract.js'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

const HEADER_KEYWORDS = [
  'name', 'chest', 'category', 'class', 'team', 'programme', 'program',
  'type', 'participation', 'result', 'grade', 'points',
]

const normCell = (v) => String(v == null ? '' : v).trim()

const looksLikeHeader = (cells) => {
  const joined = cells.map(c => normCell(c).toLowerCase()).join(' ')
  return HEADER_KEYWORDS.some(k => joined.includes(k))
}

const normalizeHeader = (h) => normCell(h).toLowerCase().replace(/[^a-z0-9]+/g, '')

const normalizeTable = (matrix) => {
  const rows = (matrix || [])
    .map(row => Array.isArray(row) ? row.filter((_, i) => i < 40) : [])
    .filter(row => row.some(c => normCell(c) !== ''))
  if (rows.length === 0) return { headers: null, rows: [] }

  if (looksLikeHeader(rows[0])) {
    const headers = rows[0].map(normalizeHeader)
    const data = rows.slice(1).map(row => {
      const obj = {}
      headers.forEach((h, i) => { if (h) obj[h] = normCell(row[i]) })
      return obj
    })
    return { headers, rows: data.filter(o => o.name || o.names || o.studentname || o.participantname) }
  }

  return { headers: null, rows }
}

const parseTabularText = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  const matrix = lines.map(line => line.split(/\t|,\s*|\s{2,}/).map(normCell))
  return normalizeTable(matrix)
}

const parseCsv = (text) => {
  const result = Papa.parse(String(text || '').trim(), { skipEmptyLines: true })
  return normalizeTable(result.data)
}

const parseExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' })
  return normalizeTable(matrix)
}

const pdfToText = async (buffer, onProgress) => {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const lines = {}
    for (const item of content.items) {
      const y = Math.round(item.transform[5])
      const x = item.transform[4]
      if (!lines[y]) lines[y] = []
      lines[y].push({ x, str: item.str || '' })
    }
    const pageText = Object.keys(lines)
      .sort((a, b) => Number(a) - Number(b))
      .map(y => lines[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' '))
      .join('\n')
    text += `${pageText}\n`
    if (onProgress) onProgress(Math.round((i / doc.numPages) * 100))
  }
  return text
}

const ocrImage = async (file, onProgress) => {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round((m.progress || 0) * 100))
    },
  })
  try {
    const { data } = await worker.recognize(file)
    return data.text
  } finally {
    await worker.terminate()
  }
}

export const parseFileToRows = async (file, onProgress) => {
  const lower = (file.name || '').toLowerCase()
  if (/\.(xlsx|xls)$/i.test(lower)) {
    const buffer = await file.arrayBuffer()
    return parseExcel(buffer)
  }
  if (/\.csv$/i.test(lower) || file.type === 'text/csv') {
    return parseCsv(await file.text())
  }
  if (file.type === 'application/pdf' || /\.pdf$/i.test(lower)) {
    const text = await pdfToText(await file.arrayBuffer(), onProgress)
    return parseTabularText(text)
  }
  if ((file.type || '').startsWith('image/')) {
    const text = await ocrImage(file, onProgress)
    return parseTabularText(text)
  }
  throw new Error('Unsupported file type. Please use CSV, Excel, PDF or an image file.')
}

export const rowField = (row, ...keys) => {
  if (!row) return ''
  if (!Array.isArray(row)) {
    for (const k of keys) {
      const v = row[normalizeHeader(k)]
      if (v !== undefined && v !== '') return v
    }
    return ''
  }
  return String(row[0] == null ? '' : row[0]).trim()
}