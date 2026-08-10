import { useState, useEffect } from 'react'
import { getTeamPlacements } from '../supabase/queries'

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

export default function TeamBreakdown({ team, isExpanded, onToggle, children, onViewDetails }) {
  const [placements, setPlacements] = useState(null)
  const [loading, setLoading] = useState(false)
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => {
    if (!isExpanded) setCatFilter('')
  }, [isExpanded])

  useEffect(() => {
    if (isExpanded && !placements && !loading) {
      setLoading(true)
      getTeamPlacements(team.id).then(data => {
        setPlacements(data)
        setLoading(false)
      })
    }
  }, [isExpanded, team.id, placements, loading])

  const counts = placements ? {
    first: placements.first?.length || 0,
    second: placements.second?.length || 0,
    third: placements.third?.length || 0,
  } : { first: 0, second: 0, third: 0 }

  const pointsFromRank = placements ? {
    first: (placements.first || []).reduce((s, r) => s + (r.first?.points || 0), 0),
    second: (placements.second || []).reduce((s, r) => s + (r.second?.points || 0), 0),
    third: (placements.third || []).reduce((s, r) => s + (r.third?.points || 0), 0),
  } : { first: 0, second: 0, third: 0 }

  const totalComputed = pointsFromRank.first + pointsFromRank.second + pointsFromRank.third
  const displayPoints = catFilter ? (team.catPoints?.[catFilter] || 0) : (team.totalPoints ?? totalComputed)

  return (
    <div>
      <div onClick={onToggle} className="cursor-pointer">
        {children}
      </div>
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onToggle}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            {loading ? (
              <p className="text-mutedText text-sm text-center">Loading...</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setCatFilter('')}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition ${!catFilter ? 'bg-primary text-white shadow' : 'bg-white/10 text-mutedText'}`}
                  >
                    All
                  </button>
                  {CATEGORIES.map(cat => {
                    const colors = CATEGORY_COLORS[cat]
                    return (
                      <button
                        key={cat}
                        onClick={() => setCatFilter(cat)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${catFilter === cat ? (cat === 'General Cat-B' ? 'text-gray-900 font-bold shadow' : 'text-white shadow') : 'bg-white/10 text-mutedText'}`}
                        style={catFilter === cat ? { background: `linear-gradient(135deg, ${colors.light}, ${colors.dark})` } : {}}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mainText font-semibold">Total points</span>
                  <span className="text-mainText font-bold text-xl">{displayPoints} pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-accent">
                    <span className="font-bold">{counts.first}</span>x 1st place
                  </span>
                  <span className="text-accent font-bold">{pointsFromRank.first} pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mutedText">
                    <span className="font-bold">{counts.second}</span>x 2nd place
                  </span>
                  <span className="text-mutedText font-bold">{pointsFromRank.second} pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mutedText">
                    <span className="font-bold">{counts.third}</span>x 3rd place
                  </span>
                  <span className="text-mutedText font-bold">{pointsFromRank.third} pts</span>
                </div>
                {onViewDetails && (
                  <button
                    onClick={onViewDetails}
                    className="w-full bg-primary hover:opacity-90 text-white rounded-xl py-3 font-semibold transition"
                  >
                    View Full Details
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
