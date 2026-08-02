import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import { Download } from 'lucide-react'
import StudentAvatar from './StudentAvatar'

const themes = {
  classic: {
    container: 'bg-white p-8 rounded-2xl text-center',
    border: 'border-4 border-[#E8845C] rounded-2xl p-6',
    title: 'text-2xl font-bold text-[#0F2A3D] font-serif mb-1',
    subtitle: 'text-sm text-[#6E8A99] mb-6',
    rank: (i) => ['text-[#E8845C] font-bold', 'text-slate-400 font-bold', 'text-amber-700 font-bold'][i],
    name: 'text-[#0F2A3D] font-semibold text-sm',
    points: 'text-[#6E8A99] text-xs',
    bg: 'bg-yellow-50',
    dotBg: 'bg-slate-200',
  },
  vibrant: {
    container: 'bg-gradient-to-br from-[#2872A1] via-[#5C93AA] to-[#0F2A3D] p-8 rounded-2xl text-center',
    border: 'border-2 border-white/30 rounded-2xl p-6',
    title: 'text-2xl font-bold text-white mb-1 drop-shadow-lg',
    subtitle: 'text-sm text-emerald-100 mb-6',
    rank: () => 'text-white font-bold drop-shadow',
    name: 'text-white font-semibold text-sm drop-shadow',
    points: 'text-emerald-100 text-xs',
    bg: 'bg-white/10',
    dotBg: 'bg-white/20',
  },
  minimal: {
    container: 'bg-slate-900 p-8 rounded-2xl text-center',
    border: 'border border-slate-700 rounded-2xl p-6',
    title: 'text-2xl font-bold text-white mb-1',
    subtitle: 'text-sm text-slate-400 mb-6',
    rank: () => 'text-slate-300 font-bold',
    name: 'text-white font-semibold text-sm',
    points: 'text-slate-400 text-xs',
    bg: 'bg-slate-800',
    dotBg: 'bg-slate-700',
  },
}

const ranks = ['1st', '2nd', '3rd']

function calcGrade(points) {
  const p = Number(points)
  if (p === 10) return 'A+'
  if (p >= 8 && p <= 9) return 'A'
  if (p >= 6 && p <= 7) return 'B'
  if (p >= 4 && p <= 5) return 'C'
  return '-'
}

export default function ResultPoster({ programme, result, studentPhotos = {}, onClose }) {
  const [theme, setTheme] = useState('classic')
  const posterRef = useRef(null)
  const t = themes[theme]

  const getPhoto = (data) => studentPhotos[data?.studentId] || data?.photoURL

  const placements = [
    { label: '1st Place', data: result?.first },
    { label: '2nd Place', data: result?.second },
    { label: '3rd Place', data: result?.third },
  ]

  const handleDownload = async () => {
    const canvas = await html2canvas(posterRef.current, { scale: 2, useCORS: true })
    canvas.toBlob((blob) => {
      saveAs(blob, `${programme.name.replace(/\s+/g, '_')}_poster.png`)
    })
  }

  const themeNames = ['classic', 'vibrant', 'minimal']
  const themeLabels = ['Classic', 'Vibrant', 'Minimal']

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div ref={posterRef} className={t.container}>
          <div className={t.border}>
            <div className={t.title}>{programme.name}</div>
            <div className={t.subtitle}>{result?.resultNo ? <span className="font-bold mr-1">#{result.resultNo}</span> : null}{programme.category}</div>

            <div className="space-y-3">
              {placements.map((p, i) => p.data ? (
                <div key={i} className={`flex items-center gap-3 ${t.bg} rounded-xl p-3`}>
                  <StudentAvatar src={getPhoto(p.data)} name={p.data.name} className="w-12 h-12 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className={t.rank(i)}>{ranks[i]}</div>
                    <div className={t.name}>{p.data.name}</div>
                    <div className={t.points}>{p.data.points || 0} points • Grade: {p.data.grade || calcGrade(p.data.points)}</div>
                  </div>
                </div>
              ) : null)}
            </div>

            <div className="mt-6 text-xs opacity-50">Campus Art Fest</div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 justify-center">
          {themeNames.map((tName, i) => (
            <button
              key={tName}
              onClick={() => setTheme(tName)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${theme === tName ? 'bg-primary text-white' : 'bg-white/15 text-mutedText'}`}
            >
              {themeLabels[i]}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-3">
          <button onClick={handleDownload} className="flex-1 bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2">
            <Download size={18} /> Download Poster
          </button>
          <button onClick={onClose} className="px-4 bg-white/15 text-mainText rounded-xl p-3">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
