import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import * as pdfjs from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export async function parseProgrammeFile(file, { existingCategories = [] }) {
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
        const lines = fullText.split('\n').filter(l => l.trim())
        rows = lines.map(line => {
          const parts = line.split(/\s{2,}/)
          return {
            name: parts[0] || '',
            category: parts[1] || '',
            type: parts[2] || '',
            participation: parts[3] || '',
            resultNo: parts[4] || '',
          }
        })
      } else {
        const worker = await createWorker('eng')
        const arrayBuffer = await file.arrayBuffer()
        const { data: { text } } = await worker.recognize(arrayBuffer)
        await worker.terminate()

        const lines = text.split('\n').filter(l => l.trim())
        rows = lines.map(line => {
          const parts = line.split(/\s{2,}/)
          return {
            name: parts[0] || '',
            category: parts[1] || '',
            type: parts[2] || '',
            participation: parts[3] || '',
            resultNo: parts[4] || '',
          }
        })
      }
    }
  } catch (err) {
    console.error('Parse error:', err)
    throw new Error('Failed to parse file: ' + err.message)
  }

  return validateProgrammes(rows, existingCategories)
}

export function validateProgrammes(rows, existingCategories) {
  return rows.map((row, index) => {
    const normalized = {
      name: (row.name || row.Name || row.PROGRAMME_NAME || '').trim(),
      category: (row.category || row.Category || row.CATEGORY || '').trim(),
      programmeType: (row.type || row.Type || row.PROGRAMME_TYPE || '').trim(),
      participationType: (row.participation || row.Participation || row.PARTICIPATION_TYPE || '').trim(),
      resultNo: (row.resultNo || row.ResultNo || row.RESULT_NO || row.no || '').trim(),
    }

    const errors = []
    if (!normalized.name) errors.push('Name is required')
    if (!normalized.category) errors.push('Category is required')

    if (normalized.category) {
      const formattedCat = normalized.category.replace(/\b\w/g, c => c.toUpperCase())
      if (!existingCategories.includes(formattedCat)) {
        errors.push(`Unknown Category: ${normalized.category}`)
      }
    }

    return {
      index,
      data: normalized,
      isValid: errors.length === 0,
      errors,
    }
  })
}
