'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeRole } from '@/types/schema';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuth();

  // Route guarding
  if (!currentUser) return null;
  
  if (currentUser.Role !== EmployeeRole.SUPER_ADMIN) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#fff' }}>
        <h2>Access Denied</h2>
        <p>You must be a Super Admin to view this area.</p>
        <button onClick={() => router.push('/')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Return Home
        </button>
      </div>
    );
  }

  const linkStyle = (path: string) => ({
    display: 'block',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: '#fff',
    textDecoration: 'none',
    marginBottom: '0.5rem',
    background: pathname === path ? 'rgba(255,255,255,0.2)' : 'transparent',
    fontWeight: pathname === path ? 'bold' : 'normal',
    transition: 'background 0.2s'
  });

  return (
    <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
      
      {/* Sidebar Navigation */}
      <div className="glass-panel" style={{ width: '250px', padding: '1.5rem', alignSelf: 'flex-start', flexShrink: 0 }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: '#fcd34d', fontSize: '1.1rem' }}>Admin Tools</h3>
        
        <nav>
          <Link href="/admin/school-year" style={linkStyle('/admin/school-year')}>
            School Year Admin
          </Link>
          <Link href="/admin/tables" style={linkStyle('/admin/tables')}>
            Table Maintenance
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
      
    </div>
  );
}
