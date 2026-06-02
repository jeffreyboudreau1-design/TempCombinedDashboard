'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { ActivitiesAndServices } from '@/types/schema';

export default function TruancyTablesPage() {
  const [items, setItems] = useState<ActivitiesAndServices[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ServiceCode: '',
    ServiceLabel: '',
    ParentID: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.get('/ActivitiesAndServices') as ActivitiesAndServices[];
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (item: ActivitiesAndServices) => {
    setEditingId(item.id);
    setFormData({
      ServiceCode: item.ServiceCode || '',
      ServiceLabel: item.ServiceLabel || '',
      ParentID: item.ParentID || ''
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ ServiceCode: '', ServiceLabel: '', ParentID: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<ActivitiesAndServices> = {
        OrgID: 'ORG-IKAN-01',
        ServiceCode: formData.ServiceCode,
        ServiceLabel: formData.ServiceLabel,
        ParentID: formData.ParentID || undefined
      };

      if (editingId) {
        await api.put(`/ActivitiesAndServices/${editingId}`, payload);
      } else {
        await api.post('/ActivitiesAndServices', payload);
      }
      handleCancel();
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/ActivitiesAndServices/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete item');
    }
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading...</div>;

  const parents = items.filter(i => !i.ParentID);
  
  const inputStyle = {
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(0,0,0,0.5)',
    color: '#fff',
    width: '100%',
    marginBottom: '1rem'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ margin: 0, color: '#fff' }}>Truancy Table Maintenance: Activities & Services</h2>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        {/* Form Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', width: '350px', flexShrink: 0 }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fcd34d' }}>{editingId ? 'Edit Item' : 'Add New Item'}</h3>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Code (Optional for children)</label>
            <input 
              type="text" 
              style={inputStyle}
              value={formData.ServiceCode} 
              onChange={e => setFormData({ ...formData, ServiceCode: e.target.value })} 
              placeholder="e.g. A, B, X1"
            />

            <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Label / Description</label>
            <input 
              type="text" 
              required
              style={inputStyle}
              value={formData.ServiceLabel} 
              onChange={e => setFormData({ ...formData, ServiceLabel: e.target.value })} 
              placeholder="e.g. Academic Instruction"
            />

            <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Parent Category (Optional)</label>
            <select 
              style={inputStyle}
              value={formData.ParentID}
              onChange={e => setFormData({ ...formData, ParentID: e.target.value })}
            >
              <option value="">-- None (Top Level Parent) --</option>
              {parents.filter(p => p.id !== editingId).map(p => (
                <option key={p.id} value={p.id}>[{p.ServiceCode}] {p.ServiceLabel}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#fcd34d', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                Save
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Panel */}
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Hierarchy Preview</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {parents.map(parent => (
              <div key={parent.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}>
                  <div>
                     <strong style={{ color: '#fcd34d', marginRight: '0.5rem' }}>{parent.ServiceCode}</strong>
                     <span style={{ color: '#fff', fontSize: '1.1rem' }}>{parent.ServiceLabel}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <button onClick={() => handleEdit(parent)} style={{ padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                     <button onClick={() => handleDelete(parent.id)} style={{ padding: '0.25rem 0.75rem', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
                
                {/* Children */}
                <div style={{ padding: '0.5rem 1rem 1rem 3rem' }}>
                  {items.filter(i => i.ParentID === parent.id).map(child => (
                    <div key={child.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        {child.ServiceCode && <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>{child.ServiceCode}</span>}
                        <span style={{ color: '#fff' }}>{child.ServiceLabel}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEdit(child)} style={{ padding: '0.15rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleDelete(child.id)} style={{ padding: '0.15rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }}>Del</button>
                      </div>
                    </div>
                  ))}
                  {items.filter(i => i.ParentID === parent.id).length === 0 && (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.9rem', paddingTop: '0.5rem' }}>No child items.</div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
