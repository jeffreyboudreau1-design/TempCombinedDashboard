'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AccessToggle } from '@/types/schema';
import StudentListTable from '@/components/StudentListTable';

export default function SchoolsDashboard() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading context...</div>;

  if (!currentUser || currentUser.DeptSchoolsAccess !== AccessToggle.YES) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', marginTop: '2rem' }}>
        <h2 style={{ color: '#ef4444' }}>Access Denied</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>You do not have permission to view the Schools Dashboard.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ minHeight: '400px' }}>
        <StudentListTable />
      </div>
    </div>
  );
}
