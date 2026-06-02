'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useLookups } from '@/hooks/useLookups';

interface DynamicTableManagerProps {
  tableName: string;
}

export default function DynamicTableManager({ tableName }: DynamicTableManagerProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<string[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  
  const [isAdding, setIsAdding] = useState(false);
  const [addFormData, setAddFormData] = useState<any>({});

  const { schools } = useLookups();

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, [tableName]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = (await api.get(`/${tableName}`)) as any[];
      setData(res || []);
      
      // Derive columns from first record
      if (res && res.length > 0) {
        let cols = Object.keys(res[0]).filter(k => k !== 'id' && k !== 'OrgID' && k !== 'CreatedAt' && k !== 'UpdatedAt');
        if (tableName === 'CourseCategories' && !cols.includes('StateCreditsRequired')) {
          cols.push('StateCreditsRequired');
        }
        setColumns(cols);
      } else {
        // Fallbacks if empty
        if (tableName === 'LetterGrades') setColumns(['GradeValue', 'GradeOrder']);
        if (tableName === 'CourseCategories') setColumns(['CategoryName', 'CategoryOrder', 'StateCreditsRequired']);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (row: any) => {
    setEditingId(row.id);
    setEditFormData({ ...row });
  };

  const handleEditChange = (col: string, val: string) => {
    setEditFormData({ ...editFormData, [col]: val });
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/${tableName}/${editingId}`, editFormData);
      setData(data.map(d => d.id === editingId ? editFormData : d));
      setEditingId(null);
    } catch (err) {
      alert("Failed to save.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/${tableName}/${id}`);
      setData(data.filter(d => d.id !== id));
    } catch (err) {
      alert("Failed to delete.");
    }
  };

  const handleAddChange = (col: string, val: string) => {
    setAddFormData({ ...addFormData, [col]: val });
  };

  const handleSaveAdd = async () => {
    try {
      const payload = {
        id: `${tableName.substring(0,3).toUpperCase()}-${Math.random().toString(36).substring(2,8)}`,
        ...addFormData
      };
      const res = await api.post(`/${tableName}`, payload);
      setData([...data, res]);
      setIsAdding(false);
      setAddFormData({});
      
      if (columns.length === 0) {
        setColumns(Object.keys(addFormData));
      }
    } catch (err) {
      alert("Failed to add.");
    }
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const getSortedData = () => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      let valA = a[sortCol] || '';
      let valB = b[sortCol] || '';

      if (tableName === 'SchoolGrades' && sortCol === 'SchoolID') {
        const sA = schools.find(sch => sch.id === valA);
        const sB = schools.find(sch => sch.id === valB);
        valA = sA ? sA.SchoolName : valA;
        valB = sB ? sB.SchoolName : valB;
      }
      
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  };

  const renderCellContent = (row: any, col: string) => {
    if (tableName === 'SchoolGrades' && col === 'SchoolID') {
      const s = schools.find(sch => sch.id === row[col]);
      return s ? s.SchoolName : row[col];
    }
    return String(row[col] || '');
  };

  const renderInput = (col: string, val: string, onChange: (v: string) => void) => {
    if (tableName === 'SchoolGrades' && col === 'SchoolID') {
      return (
        <select value={val || ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
          <option value="">Select School</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.SchoolName}</option>)}
        </select>
      );
    }
    return <input type="text" value={val || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />;
  };

  if (loading) return <div>Loading {tableName}...</div>;

  const inputStyle = {
    padding: '0.4rem',
    borderRadius: '4px',
    border: '1px solid rgba(0,0,0,0.2)',
    width: '100%',
    color: '#000'
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#fcd34d' }}>{tableName} Management</h3>
        <button 
          onClick={() => { setIsAdding(true); setAddFormData({}); }}
          style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Add New Record
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#fff' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.3)' }}>
            {columns.map(col => (
              <th key={col} style={{ padding: '0.75rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(col)}>
                {col} {sortCol === col ? (sortAsc ? '▲' : '▼') : ''}
              </th>
            ))}
            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isAdding && (
            <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
              {columns.map(col => (
                <td key={col} style={{ padding: '0.5rem' }}>
                  {renderInput(col, addFormData[col], v => handleAddChange(col, v))}
                </td>
              ))}
              <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                <button onClick={handleSaveAdd} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>Save</button>
                <button onClick={() => setIsAdding(false)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              </td>
            </tr>
          )}

          {getSortedData().map(row => {
            const isEditing = editingId === row.id;
            return (
              <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {columns.map(col => (
                  <td key={col} style={{ padding: '0.75rem' }}>
                    {isEditing ? (
                      renderInput(col, editFormData[col], v => handleEditChange(col, v))
                    ) : (
                      renderCellContent(row, col)
                    )}
                  </td>
                ))}
                <td style={{ padding: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {isEditing ? (
                    <>
                      <button onClick={handleSaveEdit} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ background: '#6b7280', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(row)} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem', fontWeight: 'bold' }}>Edit</button>
                      <button onClick={() => handleDelete(row.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          
          {data.length === 0 && !isAdding && (
            <tr><td colSpan={columns.length + 1} style={{ padding: '1rem', textAlign: 'center' }}>No records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
