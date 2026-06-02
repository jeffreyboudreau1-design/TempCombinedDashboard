'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLookups } from '@/hooks/useLookups';

export default function TruancyDashboardPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { schools } = useLookups();
  const [truancyCases, setTruancyCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting & Searching State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    Promise.all([
      api.get('/STUDENTS'),
      api.get('/StudentSchoolYear')
    ])
      .then(([studentsRes, ssyRes]: [any, any]) => {
        let cases = studentsRes.filter((s: any) => s.Dashboard === 'Truancy');

        cases = cases.map((c: any) => {
          const ssy = ssyRes.find((y: any) => y.StudentRecordID === c.id);
          return { ...c, CaseWorker: ssy?.CaseWorker, HomeSchool: c.HomeSchool };
        });

        // RBAC filtering
        const isAdmin = currentUser.Role === 'SuperAdmin' || currentUser.Role === 'School Admin. Assist.' || currentUser.Role === 'DeptAdmin';
        const isCaseworker = currentUser.Role === 'Caseworker';

        if (isCaseworker && !isAdmin) {
          cases = cases.filter((c: any) => c.CaseWorker === (currentUser as any).id);
        }

        setTruancyCases(cases);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  // Derived cases with mapping, searching, sorting
  const processedCases = useMemo(() => {
    // 1. Map lookups
    let mapped = truancyCases.map(c => {
      const school = schools.find(s => s.id === c.HomeSchool);
      return {
        ...c,
        HomeSchoolName: school ? school.SchoolName : 'Unknown',
        FullName: `${c.StudentLastName}, ${c.StudentFirstName}`
      };
    });

    // 2. Search filtering
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      mapped = mapped.filter(c => 
        c.StudentFirstName?.toLowerCase().includes(q) ||
        c.StudentLastName?.toLowerCase().includes(q) ||
        c.FullName.toLowerCase().includes(q)
      );
    }

    // 3. Sorting
    if (sortConfig) {
      mapped.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return mapped;
  }, [truancyCases, schools, searchQuery, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (!currentUser) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#fff' }}>Open Truancy Cases</h2>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.75rem',
              width: '300px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.2)',
              color: '#fff'
            }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th 
                  onClick={() => requestSort('StudentLastName')}
                  style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', userSelect: 'none' }}
                >
                  Student Name {sortConfig?.key === 'StudentLastName' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th 
                  onClick={() => requestSort('HomeSchoolName')}
                  style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', userSelect: 'none' }}
                >
                  Home School {sortConfig?.key === 'HomeSchoolName' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.2)', color: '#fff' }}>Grade</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.2)', color: '#fff' }}>City</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>Loading cases...</td></tr>
              ) : processedCases.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>No open truancy cases match your criteria.</td></tr>
              ) : (
                processedCases.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td 
                      onClick={() => router.push(`/truancy/cases/${c.id}`)}
                      style={{ padding: '1rem', color: '#fcd34d', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {c.FullName}
                    </td>
                    <td style={{ padding: '1rem', color: '#fff' }}>{c.HomeSchoolName}</td>
                    <td style={{ padding: '1rem', color: '#fff' }}>{c.GradeLevel}</td>
                    <td style={{ padding: '1rem', color: '#fff' }}>{c.StudentCity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
