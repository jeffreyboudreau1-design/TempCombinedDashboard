'use client';

import React, { useState } from 'react';
import DynamicTableManager from '@/components/DynamicTableManager';

const AVAILABLE_TABLES = [
  { id: 'CourseCatalog', name: 'Course Catalog' },
  { id: 'XferCourseCatalog', name: 'Transfer Course Catalog' },
  { id: 'LetterGrades', name: 'Letter Grades' },
  { id: 'Employee', name: 'Employees' },
  { id: 'SchoolNames', name: 'Schools' },
  { id: 'SchoolGrades', name: 'School Grades Map' },
  { id: 'CourseCategories', name: 'Course Categories' }
];

export default function TableMaintenancePage() {
  const [selectedTable, setSelectedTable] = useState<string>('CourseCatalog');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#fff' }}>Table Maintenance</h2>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff', fontWeight: 'bold' }}>
          Select Table to Manage:
        </label>
        <select 
          value={selectedTable} 
          onChange={e => setSelectedTable(e.target.value)}
          style={{
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: '1rem',
            width: '300px'
          }}
        >
          {AVAILABLE_TABLES.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <DynamicTableManager tableName={selectedTable} />
    </div>
  );
}
