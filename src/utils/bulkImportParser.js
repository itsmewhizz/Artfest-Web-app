import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import * as pdfjs from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export async function parseParticipantFile(file, { existingStudents = [], existingTeams = [], existingCategories = [] }) {
  let rows = []
  const extension = file.name.split('.').pop().toLowerCase()

  try {
    if (extension === 'csv') {
      const text = await file.text()
      const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
      rows = data
    } else if (['xlsx', 'xls'].includes(extension)) {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      rows = XLSX.utils.sheet_to_json(worksheet)
    } else if (extension === 'pdf') {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        fullText += content.items.map(item => item.str).join(' ') + '\n'
      }

      if (fullText.trim().length > 0) {
        // Basic attempt to parse PDF text if it looks like a table (tab/space separated)
        // PDF parsing is notoriously fragile; this is a fallback.
        const lines = fullText.split('\n').filter(l => l.trim())
        rows = lines.map(line => {
          const parts = line.split(/\s{2,}/)
          return {
            name: parts[0] || '',
            chestNo: parts[1] || '',
            category: parts[2] || '',
            team: parts[3] || '',
          }
        })
      } else {
        // Fallback to OCR
        const worker = await createWorker('eng')
        const arrayBuffer = await file.arrayBuffer()
        const { data: { text } } = await worker.recognize(arrayBuffer)
        await worker.terminate()

        const lines = text.split('\n').filter(l => l.trim())
        rows = lines.map(line => {
          const parts = line.split(/\s{2,}/)
          return {
            name: parts[0] || '',
            chestNo: parts[1] || '',
            category: parts[2] || '',
            team: parts[3] || '',
          }
        })
      }
    }
  } catch (err) {
    console.error('Parse error:', err)
    throw new Error('Failed to parse file: ' + err.message)
  }

  return validateParticipants(rows, existingStudents, existingTeams, existingCategories)
}

export function validateParticipants(rows, existingStudents, existingTeams, existingCategories) {
  return rows.map((row, index) => {
    const normalized = {
      name: (row.name || row.Name || row.STUDENT_NAME || '').trim(),
      chestNo: (row.chestNo || row.ChestNo || row.CHEST_NO || '').trim(),
      category: (row.category || row.Category || row.CATEGORY || '').trim(),
      team: (row.team || row.Team || row.TEAM || '').trim(),
    }

    const errors = []
    if (!normalized.name) errors.push('Name is required')
    if (!normalized.chestNo) errors.push('Chest No is required')
    if (!normalized.category) errors.push('Category is required')
    if (!normalized.team) errors.push('Team is required')

    if (normalized.chestNo && existingStudents.some(s => s.chestNo === normalized.chestNo)) {
      errors.push(`Duplicate Chest No: ${normalized.chestNo}`)
    }
    if (normalized.category && !existingCategories.includes(normalized.category)) {
      errors.push(`Unknown Category: ${normalized.category}`)
    }
    if (normalized.team && !existingTeams.some(t => t.name === normalized.team)) {
      errors.push(`Unknown Team: ${normalized.team}`)
    }

    return {
      index,
      data: normalized,
      isValid: errors.length === 0,
      errors,
    }
  })
}
