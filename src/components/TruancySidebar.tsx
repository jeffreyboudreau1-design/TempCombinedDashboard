'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeRole } from '@/types/schema';

export default function TruancySidebar() {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  const isActive = (path: string) => pathname === path || (path !== '/truancy' && pathname.startsWith(path));

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: 'block',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    textDecoration: 'none',
    marginBottom: '0.5rem',
    transition: 'all 0.2s',
    fontWeight: active ? 'bold' : 'normal',
    borderLeft: active ? '4px solid #fcd34d' : '4px solid transparent' // Distinctive color for Truancy
  });

  if (!currentUser) return null;

  return (
    <aside style={{ width: '250px', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 style={{ margin: 0, color: '#fcd34d' }}>Truancy Module</h3>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Case Management</p>
      </div>

      <nav style={{ flex: 1, padding: '1.5rem 1rem' }}>
        <Link href="/truancy" style={linkStyle(pathname === '/truancy')}>
          Case List
        </Link>
        <Link href="/truancy/attendance" style={linkStyle(pathname === '/truancy/attendance')}>
          Enter Monthly Attendance
        </Link>
        <Link href="/truancy/report" style={linkStyle(pathname === '/truancy/report')}>
          Monthly Attendance Report
        </Link>
        {/* Only certain roles might be able to add new cases, typically Super Admin or specific Truancy staff */}
        {(currentUser.Role === EmployeeRole.SUPER_ADMIN || currentUser.Role === EmployeeRole.SCHOOL_ADMIN_ASST) && (
          <Link href="/truancy/new" style={{ ...linkStyle(pathname === '/truancy/new'), marginTop: '2rem', background: '#fcd34d', color: '#000', textAlign: 'center', fontWeight: 'bold' }}>
            + New Case
          </Link>
        )}
      </nav>
    </aside>
  );
}
