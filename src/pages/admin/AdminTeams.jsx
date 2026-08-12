import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'
import { getTeamCategoryPoints } from '../../supabase/queries'
import { Trophy, Medal, Star, Pencil, X, Check } from 'lucide-react'
import TeamBreakdown from '../../components/TeamBreakdown'
import { useToast } from '../../components/Toast'

const TEAM_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#FFFF00', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#E8845C', '#B91C1C',
]

export default function AdminTeams() {
  const [teamData, setTeamData] = useState([])
  const [expandedTeam, setExpandedTeam] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = () => {
    getTeamCategoryPoints().then(({ teamData: data }) => {
      const sorted = [...data].sort((a, b) => b.totalPoints - a.totalPoints)
      setTeamData(sorted)
    })
  }

  useEffect(() => { load() }, [])

  const startEdit = (team) => {
    setEditing(team)
    setEditName(team.name || '')
    setEditColor(team.color || TEAM_COLORS[0])
  }

  const saveEdit = async () => {
    if (!editing) return
    if (!editName.trim()) return toast('Team name cannot be empty', 'error')
    setSaving(true)
    const { error } = await supabase
      .from('teams')
      .update({ name: editName.trim(), color: editColor })
      .eq('id', editing.id)
    setSaving(false)
    if (error) return toast('Failed to update team: ' + error.message, 'error')
    toast('Team updated!')
    setEditing(null)
    load()
  }

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
                  <button
                    onClick={e => { e.stopPropagation(); startEdit(team) }}
                    className="text-mutedText hover:text-mainText transition p-1"
                    title="Edit team"
                  >
                    <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
            </TeamBreakdown>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-mainText font-bold text-lg">Edit Team</h3>
              <button onClick={() => setEditing(null)} className="text-mutedText hover:text-mainText transition">
                <X size={20} />
              </button>
            </div>

            <label className="text-mutedText text-sm block mb-1.5 font-semibold">Team Name</label>
            <input
              className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-4 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Team name"
            />

            <label className="text-mutedText text-sm block mb-1.5 font-semibold">Color</label>
            <div className="grid grid-cols-8 gap-2 mb-4">
              {TEAM_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all ${
                    editColor === color ? 'ring-2 ring-mainText ring-offset-2 ring-offset-card scale-110' : 'hover:scale-105'
                  }`}
                  style={{ background: color }}
                  aria-label={`Select color ${color}`}
                >
                  {editColor === color && <Check size={16} color="#0F2A3D" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="flex-1 bg-primary text-white rounded-xl p-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(null)} className="bg-white/15 text-mainText rounded-xl p-3 font-semibold transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}