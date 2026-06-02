'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeRole } from '@/types/schema';
import { usePathname, useSearchParams } from 'next/navigation';

function SchoolsSidebarInner() {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  if (!currentUser) return null;

  const currentFilter = searchParams.get('filter');

  const isAdvisor = currentUser.Role === EmployeeRole.ADVISOR || currentUser.Role === EmployeeRole.SUPER_ADMIN;
  const isAdminAssist = currentUser.Role === EmployeeRole.SCHOOL_ADMIN_ASST || currentUser.Role === EmployeeRole.SUPER_ADMIN;

  const linkStyle = (active: boolean) => ({
    display: 'block',
    padding: '0.75rem 1rem',
    borderRadius: '4px',
    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    textDecoration: 'none',
    marginBottom: '0.5rem',
    fontWeight: active ? 'bold' : 'normal',
    transition: 'background 0.2s, color 0.2s'
  });

  return (
    <aside style={{ width: '250px', flexShrink: 0, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
        <img src="/Eagles.png" alt="Schools Logo" style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '1rem' }} />
        <h3 style={{ margin: 0, color: '#fcd34d' }}>Schools Dashboard</h3>
      </div>
      <nav style={{ flex: 1, padding: '1.5rem 1rem' }}>
        {isAdvisor && (
          <>
            <Link href="/schools?filter=audits" style={linkStyle(pathname === '/schools' && currentFilter === 'audits')}>
              In Progress Audits
            </Link>
            <Link href="/schools?filter=progress" style={linkStyle(pathname === '/schools' && currentFilter === 'progress')}>
              Progress Reports
            </Link>
          </>
        )}
        
        {isAdminAssist && (
          <Link href="/schools?filter=grades" style={linkStyle(pathname === '/schools' && currentFilter === 'grades')}>
            Enter Grades
          </Link>
        )}

        <Link href="/schools" style={linkStyle(pathname === '/schools' && !currentFilter)}>
          Student Lists
        </Link>
        
        {(isAdvisor || isAdminAssist) && (
          <Link href="/schools/students/new" style={linkStyle(pathname === '/schools/students/new')}>
            Add new Student
          </Link>
        )}
      </nav>
    </aside>
  );
}

export default function SchoolsSidebar() {
  return (
    <React.Suspense fallback={<aside style={{ width: '250px', flexShrink: 0, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', borderRight: '1px solid var(--glass-border)' }} />}>
      <SchoolsSidebarInner />
    </React.Suspense>
  );
}
