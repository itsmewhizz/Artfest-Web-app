import { useEffect, useState } from 'react'
import { getTeamCategoryPoints } from '../../supabase/queries'
import { Trophy, Medal, Star } from 'lucide-react'
import TeamBreakdown from '../../components/TeamBreakdown'

export default function AdminTeams() {
  const [teamData, setTeamData] = useState([])
  const [expandedTeam, setExpandedTeam] = useState(null)

  useEffect(() => {
    getTeamCategoryPoints().then(({ teamData: data }) => {
      const sorted = [...data].sort((a, b) => b.totalPoints - a.totalPoints)
      setTeamData(sorted)
    })
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText mb-2">Team Scores</h2>
      <p className="text-mutedText text-xs sm:text-sm mb-6">Points are automatically calculated from programme results.</p>

      <div className="flex flex-col gap-4">
        {teamData.map(team => (
          <div key={team.id} className="bg-card rounded-2xl overflow-hidden shadow-sm border border-secondary/30">
            <TeamBreakdown
              team={team}
              isExpanded={expandedTeam === team.id}
              onToggle={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
            >
              <div className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-white/10 transition">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-base sm:text-xl font-bold shadow-lg shrink-0" style={{ background: team.color || '#2872A1', color: '#fff' }}>
                    {team.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-mainText font-poppins font-bold text-base sm:text-lg truncate" style={{ color: team.color }}>{team.name}</h3>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1">
                      <span className="text-mainText font-bold text-lg sm:text-xl">{team.totalPoints || 0}</span>
                      <span className="text-mutedText text-[10px] sm:text-xs">total points</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-2">
                  <div className="text-center">
                    <Trophy size={14} className="sm:w-[18px] sm:h-[18px] text-accent mx-auto" />
                    <span className="text-mainText font-bold text-[11px] sm:text-sm block">{team.firstPlaceCount || 0}</span>
                  </div>
                  <div className="text-center">
                    <Medal size={14} className="sm:w-[18px] sm:h-[18px] text-slate-400 mx-auto" />
                    <span className="text-mainText font-bold text-[11px] sm:text-sm block">{team.secondPlaceCount || 0}</span>
                  </div>
                  <div className="text-center">
                    <Star size={14} className="sm:w-[18px] sm:h-[18px] text-amber-600 mx-auto" />
                    <span className="text-mainText font-bold text-[11px] sm:text-sm block">{team.thirdPlaceCount || 0}</span>
                  </div>
                </div>
              </div>
            </TeamBreakdown>
          </div>
        ))}
      </div>
    </div>
  )
}
