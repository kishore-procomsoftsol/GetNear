'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  color: string | null
  is_active: boolean
  display_order: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '', icon: '', color: '' })

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      setLoading(true)
      const res = await api.get('/admin/categories')
      setCategories(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  function openCreateForm() {
    setFormData({ name: '', slug: '', icon: '', color: '' })
    setEditingId(null)
    setShowForm(true)
  }

  function openEditForm(cat: Category) {
    setFormData({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || '',
      color: cat.color || '',
    })
    setEditingId(cat.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/admin/categories/${editingId}`, formData)
      } else {
        await api.post('/admin/categories', formData)
      }
      setShowForm(false)
      setEditingId(null)
      fetchCategories()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save category')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this category?')) return
    try {
      await api.delete(`/admin/categories/${id}`)
      fetchCategories()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete category')
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories</h1>
        <div className="card p-6 animate-pulse">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories</h1>
        <div className="card p-6 text-danger">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button onClick={openCreateForm} className="btn-primary">
          + Add Category
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Category' : 'New Category'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#FF6B35"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          No categories yet. Create one to get started.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Icon</th>
                <th className="table-header">Name</th>
                <th className="table-header">Slug</th>
                <th className="table-header">Color</th>
                <th className="table-header">Active</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="table-cell text-xl">{cat.icon || '—'}</td>
                  <td className="table-cell font-medium text-gray-900">{cat.name}</td>
                  <td className="table-cell text-gray-500">{cat.slug}</td>
                  <td className="table-cell">
                    {cat.color ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs text-gray-500">{cat.color}</span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-cell">
                    {cat.is_active ? (
                      <span className="text-success">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditForm(cat)}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="btn-danger text-xs px-3 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
