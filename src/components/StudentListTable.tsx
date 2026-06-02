'use client';

import React, { useState, useMemo } from 'react';
import { useStudents } from '@/hooks/useStudents';
import { useLookups } from '@/hooks/useLookups';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeRole, StudentStatus, StudentRecord } from '@/types/schema';
import { useRouter, useSearchParams } from 'next/navigation';

type SortKey = 'StudentLastName' | 'StudentFirstName' | 'HomeSchool' | 'Employed' | 'GradeLevel' | 'StudentTeacher';

export default function StudentListTable() {
  const { students } = useStudents();
  const { schools, employees } = useLookups();
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentFilter = searchParams.get('filter');

  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  // For the 'grades' filter, we need to know which students have Enrolled/Needed courses
  const [studentCourses, setStudentCourses] = useState<any[]>([]);
  const [schoolYears, setSchoolYears] = useState<any[]>([]); // StudentSchoolYear
  const [yearDefinitions, setYearDefinitions] = useState<any[]>([]); // SchoolYear metadata
  const [selectedYearId, setSelectedYearId] = useState<string>('ALL');

  React.useEffect(() => {
    import('@/services/api').then(({ api }) => {
      Promise.all([
        api.get('/StudentCourses'),
        api.get('/StudentSchoolYear'),
        api.get('/SchoolYear')
      ]).then(([coursesRes, yearsRes, yearDefsRes]) => {
        setStudentCourses((coursesRes as any[]) || []);
        setSchoolYears((yearsRes as any[]) || []);
        setYearDefinitions((yearDefsRes as any[]) || []);
        
        // Auto-select the active year if available
        const active = (yearDefsRes as any[])?.find((y: any) => y.IsActiveYear === 'Yes');
        if (active) setSelectedYearId(active.id);
      }).catch(console.error);
    });
  }, []);

  // 1. Role-Based & URL Filtering
  const roleFilteredStudents = useMemo(() => {
    if (!currentUser) return [];

    let base = students;
    switch (currentUser.Role) {
      case EmployeeRole.TEACHER:
        base = students.filter(s => s.StudentTeacher === currentUser.id && s.Status === StudentStatus.ENROLLED);
        break;
      case EmployeeRole.SOCIAL_WORKER:
        base = students.filter(s => s.StudentSocialWorker === currentUser.id && s.Status === StudentStatus.ENROLLED);
        break;
      default:
        base = students;
        break;
    }

    // URL Filtering
    if (currentFilter === 'audits') {
      base = base.filter(s => s.AuditComplete !== 'Yes');
    } else if (currentFilter === 'grades' && studentCourses.length > 0 && schoolYears.length > 0) {
      // Find all StuSchYrIDs that have at least one course actively enrolled or needed
      const activeYearIds = new Set(
        studentCourses
          .filter(sc => sc.Enrolled === 'Yes' || sc.Status === 'Needed')
          .map(sc => sc.StuSchYrID)
      );

      // Map those back to StudentRecordIDs (filtered by selectedYearId)
      const studentIdsNeedingGrades = new Set(
        schoolYears
          .filter(sy => activeYearIds.has(sy.id) && (selectedYearId === 'ALL' || sy.SchoolYearID === selectedYearId))
          .map(sy => sy.StudentRecordID)
      );

      base = base.filter(s => studentIdsNeedingGrades.has(s.id));
    } else if (selectedYearId !== 'ALL' && schoolYears.length > 0) {
      // General Year Filtering for the normal list or Progress Reports
      const studentIdsInYear = new Set(
        schoolYears
          .filter(sy => sy.SchoolYearID === selectedYearId)
          .map(sy => sy.StudentRecordID)
      );
      base = base.filter(s => studentIdsInYear.has(s.id));
    }

    return base;
  }, [students, currentUser, currentFilter, studentCourses, schoolYears, selectedYearId]);

  // 2. Data Mapping (Foreign Keys to Names)
  const mappedStudents = useMemo(() => {
    return roleFilteredStudents.map(student => {
      const school = schools.find(s => s.id === student.HomeSchool);
      const teacher = employees.find(e => e.id === student.StudentTeacher);
      
      return {
        ...student,
        HomeSchoolName: school ? school.SchoolName : 'Unknown School',
        TeacherName: teacher ? teacher.EmployeeName : 'Unassigned'
      };
    });
  }, [roleFilteredStudents, schools, employees]);

  // 3. Search Filtering
  const searchedStudents = useMemo(() => {
    if (!searchQuery.trim()) return mappedStudents;
    const query = searchQuery.toLowerCase();
    return mappedStudents.filter(s => 
      s.StudentFirstName.toLowerCase().includes(query) || 
      s.StudentLastName.toLowerCase().includes(query)
    );
  }, [mappedStudents, searchQuery]);

  // 4. Sorting
  const sortedStudents = useMemo(() => {
    if (!sortConfig) {
      // Default Sort: Enrolled on top, then alphabetical by last name
      return [...searchedStudents].sort((a, b) => {
        if (a.Status === StudentStatus.ENROLLED && b.Status !== StudentStatus.ENROLLED) return -1;
        if (a.Status !== StudentStatus.ENROLLED && b.Status === StudentStatus.ENROLLED) return 1;
        
        const nameA = a.StudentLastName || '';
        const nameB = b.StudentLastName || '';
        return nameA.localeCompare(nameB);
      });
    }

    return [...searchedStudents].sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof StudentRecord];
      let valB: any = b[sortConfig.key as keyof StudentRecord];

      // Handle mapped fields for sorting
      if (sortConfig.key === 'HomeSchool') {
        valA = a.HomeSchoolName;
        valB = b.HomeSchoolName;
      }
      if (sortConfig.key === 'StudentTeacher') {
        valA = a.TeacherName;
        valB = b.TeacherName;
      }

      // Handle undefined/null
      if (!valA) valA = '';
      if (!valB) valB = '';

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchedStudents, sortConfig]);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const thStyle: React.CSSProperties = {
    padding: '1rem',
    textAlign: 'left',
    cursor: 'pointer',
    borderBottom: '2px solid rgba(255,255,255,0.2)',
    fontWeight: 'bold',
    color: '#fff',
    userSelect: 'none'
  };

  const tdStyle: React.CSSProperties = {
    padding: '1rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: '#f8fafc'
  };

  if (!currentUser) return null;

  const isAuditFilter = currentFilter === 'audits';
  const isProgressFilter = currentFilter === 'progress';
  const hideColumns = isAuditFilter || isProgressFilter;

  const handleRowClick = (id: string) => {
    if (isProgressFilter) {
      router.push(`/schools/students/${id}?view=progress`);
    } else if (isAuditFilter) {
      router.push(`/schools/students/${id}`);
    } else if (currentUser.Role === EmployeeRole.SOCIAL_WORKER) {
      router.push(`/schools/students/${id}/social-worker`);
    } else if (currentUser.Role === EmployeeRole.SUPER_ADMIN || currentUser.Role === EmployeeRole.SCHOOL_ADMIN_ASST) {
      router.push(`/schools/students/${id}/edit`);
    } else {
      router.push(`/schools/students/${id}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#fff' }}>Enrolled Students</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {(currentUser.Role === EmployeeRole.SUPER_ADMIN || currentUser.Role === EmployeeRole.SCHOOL_ADMIN_ASST) && (
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer'
              }}
            >
              <option value="ALL" style={{ color: '#000' }}>All Years</option>
              {yearDefinitions.map((yd) => (
                <option key={yd.id} value={yd.id} style={{ color: '#000' }}>{yd.YearLabel}</option>
              ))}
            </select>
          )}
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              width: '300px',
              backdropFilter: 'blur(10px)'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => handleSort('StudentLastName')}>Last Name{getSortIcon('StudentLastName')}</th>
              <th style={thStyle} onClick={() => handleSort('StudentFirstName')}>First Name{getSortIcon('StudentFirstName')}</th>
              <th style={thStyle} onClick={() => handleSort('HomeSchool')}>Home School{getSortIcon('HomeSchool')}</th>
              <th style={thStyle} onClick={() => handleSort('GradeLevel')}>Grade{getSortIcon('GradeLevel')}</th>
              <th style={thStyle} onClick={() => handleSort('Employed')}>Employed{getSortIcon('Employed')}</th>
              <th style={thStyle} onClick={() => handleSort('StudentTeacher')}>Teacher's Name{getSortIcon('StudentTeacher')}</th>
              {!hideColumns && <th style={thStyle}>Status</th>}
              {!hideColumns && <th style={thStyle}>Audit</th>}
            </tr>
          </thead>
          <tbody>
            {sortedStudents.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
                  No students found.
                </td>
              </tr>
            ) : (
              sortedStudents.map(s => (
                <tr key={s.id} style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                  <td style={tdStyle}>
                    <span 
                      onClick={() => handleRowClick(s.id)}
                      style={{ cursor: 'pointer', color: '#1d4ed8', textDecoration: 'underline', fontWeight: 'bold' }}
                    >
                      {s.StudentLastName}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span 
                      onClick={() => handleRowClick(s.id)}
                      style={{ cursor: 'pointer', color: '#1d4ed8', textDecoration: 'underline', fontWeight: 'bold' }}
                    >
                      {s.StudentFirstName}
                    </span>
                  </td>
                  <td style={tdStyle}>{s.HomeSchoolName}</td>
                  <td style={tdStyle}>{s.GradeLevel}</td>
                  <td style={tdStyle}>{s.Employed || 'No'}</td>
                  <td style={tdStyle}>{s.TeacherName}</td>
                  {!hideColumns && (
                    <td style={{ ...tdStyle, color: s.Status === StudentStatus.ENROLLED ? '#15803d' : 'rgba(255,255,255,0.7)', fontWeight: s.Status === StudentStatus.ENROLLED ? 'bold' : 'normal' }}>{s.Status}</td>
                  )}
                  {!hideColumns && (
                    <td style={tdStyle}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/schools/students/${s.id}`);
                        }}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Audit
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
