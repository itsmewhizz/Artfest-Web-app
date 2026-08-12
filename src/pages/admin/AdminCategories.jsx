import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../supabase/client'
import { Layers, Plus, Pencil, X, Trash2, Save } from 'lucide-react'
import { useToast } from '../../components/Toast'

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
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
  }, [toast])

  useEffect(() => { load() }, [load])

  const nextSortOrder = () => {
    const max = categories.reduce((m, c) => Math.max(m, Number(c.sortOrder) || 0), 0)
    return max + 1
  }

  const handleAdd = async () => {
    if (!name.trim()) return toast('Enter a category name', 'error')
    setSaving(true)
    const { error } = await supabase.from('categories').insert({
      name: name.trim(),
      sortOrder: sortOrder !== '' ? Number(sortOrder) : nextSortOrder(),
    })
    setSaving(false)
    if (error) return toast('Failed to add category: ' + error.message, 'error')
    setName(''); setSortOrder('')
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
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-card rounded-xl p-3 shadow-sm border border-secondary/30">
          <Layers size={22} className="text-accent" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText">Categories</h2>
          <p className="text-mutedText text-sm">Manage the categories shown in programme, student and judge filters.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 mb-6 shadow-sm border border-secondary/30">
        <h3 className="text-mainText font-bold mb-3 text-sm sm:text-base">Add New Category</h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            className="flex-1 bg-black/20 text-mainText rounded-xl p-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
            placeholder="Category name (e.g. Neon)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
          <input
            type="number"
            className="w-full sm:w-32 bg-black/20 text-mainText rounded-xl p-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
            placeholder="Sort order"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="w-full sm:w-auto bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-primary/90 transition disabled:opacity-60"
        >
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
                  </div>
                  <button onClick={() => startEdit(cat)} className="text-mutedText hover:text-mainText shrink-0" title="Edit">
                    <Pencil size={14} className="sm:w-4 sm:h-4" />
                  </button>
                  <button onClick={() => handleDelete(cat)} className="text-red-500 shrink-0" title="Delete">
                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}