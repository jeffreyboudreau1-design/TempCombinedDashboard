'use client';

import React from 'react';
import SchoolYearForm from '@/components/SchoolYearForm';
import { useSchoolYears } from '@/hooks/useSchoolYears';
import { AccessToggle } from '@/types/schema';
import { useAuth } from '@/contexts/AuthContext';

export default function SchoolYearDashboard() {
  const { currentUser } = useAuth();
  
  // Safe fallback if not logged in yet
  const orgId = currentUser?.OrgID || '';

  const { schoolYears, isLoading, error, addSchoolYear } = useSchoolYears(orgId);

  if (!currentUser) {
    return <div style={{ padding: '2rem' }}>Please log in via the header to view this page.</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ color: 'var(--color-primary)', fontSize: '2rem', marginBottom: '0.5rem' }}>School Year Administration</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Manage academic timelines and set the active operational scope.</p>
      </header>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
          Error: {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'flex-start' }}>
        {/* Left Column: Form */}
        <section>
          <SchoolYearForm orgId={orgId} onSubmit={addSchoolYear} />
        </section>

        {/* Right Column: Ledger */}
        <section className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Configured Timelines</h3>
          
          {isLoading ? (
            <p>Loading school years...</p>
          ) : schoolYears.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No school years configured.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {schoolYears.map((sy) => (
                <div 
                  key={sy.id} 
                  style={{ 
                    padding: '1rem', 
                    borderRadius: '8px',
                    border: sy.IsActiveYear === AccessToggle.YES ? '2px solid var(--color-success)' : '1px solid var(--border-color)',
                    backgroundColor: sy.IsActiveYear === AccessToggle.YES ? '#f0fdf4' : 'var(--color-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{sy.YearLabel}</h4>
                    {sy.IsActiveYear === AccessToggle.YES && (
                      <span style={{ backgroundColor: 'var(--color-success)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    <p>Start Date: {sy.SchStartDate}</p>
                    <p>End Date: {sy.SchEndDate}</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>ID: {sy.id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
