import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../supabase/client'
import { Layers, Plus, X, Save, Pencil, Trash2 } from 'lucide-react'
import KebabMenu from '../../components/KebabMenu'
import { useToast } from '../../components/Toast'

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [students, setStudents] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editSortOrder, setEditSortOrder] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sortOrder', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
    if (error) {
      console.error('Failed to load categories:', error)
      toast('Failed to load categories: ' + error.message, 'error')
      return
    }
    setCategories(data || [])
    supabase.from('programmes').select('id, category').then(({ data: pData }) => setProgrammes(pData || []))
    supabase.from('students').select('id, class').then(({ data: sData }) => setStudents(sData || []))
  }, [toast])

  useEffect(() => { load() }, [load])

  const nextSortOrder = () => {
    const max = categories.reduce((m, c) => Math.max(m, Number(c.sortOrder) || 0), 0)
    return max + 1
  }

  const programmeCount = (cat) => (programmes || []).filter(p => p.category === cat.name).length

  const memberCount = (cat) => (students || []).filter(s => s.class === cat.name).length

  const handleAdd = async () => {
    if (!name.trim()) return toast('Enter a category name', 'error')
    setSaving(true)
    const { error } = await supabase.from('categories').insert({
      name: name.trim(),
      sortOrder: sortOrder !== '' ? Number(sortOrder) : nextSortOrder(),
    })
    setSaving(false)
    if (error) return toast('Failed to add category: ' + error.message, 'error')
    setName(''); setSortOrder(''); setShowAdd(false)
    toast('Category added!')
    load()
  }

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditSortOrder(cat.sortOrder != null ? String(cat.sortOrder) : '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName(''); setEditSortOrder('')
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) return toast('Enter a category name', 'error')
    setSaving(true)
    const { error } = await supabase.from('categories').update({
      name: editName.trim(),
      sortOrder: editSortOrder !== '' ? Number(editSortOrder) : 0,
    }).eq('id', editingId)
    setSaving(false)
    if (error) return toast('Failed to update category: ' + error.message, 'error')
    toast('Category updated!')
    cancelEdit()
    load()
  }

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? Programmes and students using it keep the name but it will no longer appear in dropdowns.`)) {
      return
    }
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) return toast('Failed to delete category: ' + error.message, 'error')
    toast('Category deleted!')
    load()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-card rounded-xl p-3 shadow-sm border border-secondary/30">
            <Layers size={22} className="text-accent" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Categories</h2>
            <p className="text-mutedText text-sm">Manage the categories shown in programme, student and judge filters.</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base">
          <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> Add Category
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {categories.length === 0 && <p className="text-mutedText text-center py-6">No categories yet.</p>}
        {categories.map(cat => {
          const isEditing = editingId === cat.id
          return (
            <div key={cat.id} className="bg-card rounded-xl p-4 flex items-center gap-3 shadow-sm border border-secondary/30">
              {isEditing ? (
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                      className="flex-1 bg-black/20 text-mainText rounded-xl p-2.5 outline-none border border-secondary/40 focus:border-mainText text-sm"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-full sm:w-28 bg-black/20 text-mainText rounded-xl p-2.5 outline-none border border-secondary/40 focus:border-mainText text-sm"
                      value={editSortOrder}
                      onChange={e => setEditSortOrder(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                    >
                      <Save size={14} /> Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 bg-white/10 text-mainText px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-white/15 transition"
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-mutedText text-xs font-bold w-10 shrink-0">#{Number(cat.sortOrder) || 0}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-mainText font-medium text-sm sm:text-base truncate">{cat.name}</p>
                    <p className="text-mutedText text-xs sm:text-sm">
                      {programmeCount(cat)} programme{programmeCount(cat) === 1 ? '' : 's'} · {memberCount(cat)} member{memberCount(cat) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <KebabMenu
                    items={[
                      { label: 'Edit', icon: <Pencil size={15} />, onClick: () => startEdit(cat) },
                      { label: 'Delete', icon: <Trash2 size={15} />, danger: true, onClick: () => handleDelete(cat) },
                    ]}
                  />
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-secondary/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-mainText font-bold text-lg">Add New Category</h3>
              <button onClick={() => setShowAdd(false)} className="text-mutedText hover:text-mainText transition">
                <X size={20} />
              </button>
            </div>

            <label className="text-mutedText text-sm block mb-1.5 font-semibold">Category Name</label>
            <input
              className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-4 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
              placeholder="Category name (e.g. Neon)"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            />

            <label className="text-mutedText text-sm block mb-1.5 font-semibold">Sort Order</label>
            <input
              type="number"
              className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-4 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
              placeholder="Sort order"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            />

            <button
              onClick={handleAdd}
              disabled={saving}
              className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-primary/90 transition disabled:opacity-60"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> Add Category
            </button>
          </div>
        </div>
      )}
    </div>
  )
}