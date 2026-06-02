'use client';

import React, { useState } from 'react';
import { AccessToggle } from '@/types/schema';
import { SchoolYear } from '@/hooks/useSchoolYears';

interface SchoolYearFormProps {
  orgId: string;
  onSubmit: (data: Omit<SchoolYear, 'id'>) => Promise<boolean>;
}

export default function SchoolYearForm({ orgId, onSubmit }: SchoolYearFormProps) {
  const [yearName, setYearName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState<AccessToggle>(AccessToggle.NO);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const success = await onSubmit({
      OrgID: orgId,
      YearLabel: yearName,
      SchStartDate: startDate,
      SchEndDate: endDate,
      IsActiveYear: isActive
    });

    if (success) {
      setYearName('');
      setStartDate('');
      setEndDate('');
      setIsActive(AccessToggle.NO);
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ margin: 0, marginBottom: '1rem', color: 'var(--color-primary)' }}>Add New School Year</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="yearName">Year Name (e.g. Year 25-26)</label>
        <input 
          id="yearName"
          type="text" 
          value={yearName} 
          onChange={(e) => setYearName(e.target.value)} 
          required 
          placeholder="Year 25-26"
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="startDate">Start Date</label>
          <input 
            id="startDate"
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            required 
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="endDate">End Date</label>
          <input 
            id="endDate"
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            required 
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="isActive">Is Active Year?</label>
        <select 
          id="isActive"
          value={isActive} 
          onChange={(e) => setIsActive(e.target.value as AccessToggle)}
        >
          <option value={AccessToggle.YES}>Yes</option>
          <option value={AccessToggle.NO}>No</option>
        </select>
      </div>

      <button type="submit" disabled={isSubmitting} style={{ marginTop: '1rem' }}>
        {isSubmitting ? 'Saving...' : 'Save School Year'}
      </button>
    </form>
  );
}
