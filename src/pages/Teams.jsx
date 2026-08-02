import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTeamCategoryPoints } from '../supabase/queries'
import TeamBar from '../components/TeamBar'

export default function Teams() {
  const [teamData, setTeamData] = useState([])
  const [categories, setCategories] = useState([])
  const [expandedTeamId, setExpandedTeamId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getTeamCategoryPoints().then(({ teamData: data, categories: cats }) => {
      const sorted = [...data].sort((a, b) => b.totalPoints - a.totalPoints)
      setTeamData(sorted)
      setCategories(cats)
    })
  }, [])

  const maxPoints = Math.max(...teamData.map(t => (t.totalPoints || 0)), 1)
  const maxBarHeight = 420

  return (
      <div className="min-h-screen bg-mainBackground p-4 md:p-8 max-w-7xl mx-auto">

      <h2 className="text-2xl sm:text-3xl font-bold text-mainText mb-6 text-center sm:text-left font-poppins">
        Team Points
      </h2>

      <div className="hp-wrapper-gloss p-4 md:p-6 w-full">
        <div className="flex flex-wrap justify-center items-end gap-3 sm:gap-6 md:gap-10">
        {teamData.map((team, i) => {
          const barHeight = Math.max(80, (team.totalPoints / maxPoints) * maxBarHeight)
          const isExpanded = expandedTeamId === team.id

          return (
            <TeamBar
              key={team.id}
              team={team}
              categories={categories}
              displayPoints={team.totalPoints}
              barHeight={barHeight}
              isExpanded={isExpanded}
              index={i}
              onToggle={() => setExpandedTeamId(isExpanded ? null : team.id)}
              onViewDetails={() => navigate('/teams/' + team.id)}
            />
          )
        })}
      </div>
      </div>

    </div>
  )
}
