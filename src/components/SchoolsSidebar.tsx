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
    <aside style={{ width: '250px', flexShrink: 0, paddingRight: '2rem' }}>
      <h3 style={{ color: '#fff', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', opacity: 0.5 }}>
        Schools Navigation
      </h3>
      <nav>
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
    <React.Suspense fallback={<aside style={{ width: '250px', flexShrink: 0, paddingRight: '2rem' }} />}>
      <SchoolsSidebarInner />
    </React.Suspense>
  );
}
