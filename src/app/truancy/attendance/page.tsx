'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export default function EnterMonthlyAttendanceBulkPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Lookups
  const [months, setMonths] = useState<any[]>([]);
  const [schoolYears, setSchoolYears] = useState<any[]>([]);
  const [assignedCases, setAssignedCases] = useState<any[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([]);

  const [selectedMonthID, setSelectedMonthID] = useState('');
  const [selectedYearID, setSelectedYearID] = useState('');
  
  // Grid state
  const [gridState, setGridState] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    Promise.all([
      api.get('/Months').catch(() => []), 
      api.get('/STUDENTS'),
      api.get('/StudentSchoolYear'),
      api.get('/MonthlyAttendance').catch(() => []),
      api.get('/SchoolYear').catch(() => [])
    ]).then(([monthsRes, studentsRes, ssyRes, attRes, syRes]) => {
      // Sort months by SequenceOrder
      const sortedMonths = [...(monthsRes as any[])].sort((a, b) => a.SequenceOrder - b.SequenceOrder);
      setMonths(sortedMonths);
      setSchoolYears(syRes as any[]);
      setMonthlyAttendance(attRes as any[]);

      const activeYear = (syRes as any[]).find((y: any) => y.IsActiveYear === 'Yes');
      if (activeYear) {
        setSelectedYearID(activeYear.id);
      }

      // Filter truancy cases
      let cases = (studentsRes as any[]).filter((s: any) => s.Dashboard === 'Truancy');

      // Attach caseworker
      cases = cases.map((c: any) => {
        const ssy = (ssyRes as any[]).find((y: any) => y.StudentRecordID === c.id);
        return { ...c, CaseWorker: ssy?.CaseWorker, SchoolYearID: ssy?.SchoolYearID };
      });

      // Filter to assigned if Caseworker
      const isAdmin = currentUser.Role === 'SuperAdmin' || currentUser.Role === 'School Admin. Assist.' || currentUser.Role === 'DeptAdmin';
      const isCaseworker = currentUser.Role === 'Caseworker';

      if (isCaseworker && !isAdmin) {
        cases = cases.filter((c: any) => c.CaseWorker === (currentUser as any).id);
      }

      setAssignedCases(cases.map(c => ({
        id: c.id,
        FullName: `${c.StudentLastName}, ${c.StudentFirstName}`,
        ...c
      })));

      setLoading(false);
    }).catch(console.error);
  }, [currentUser]);

  // When selectedMonth or selectedYear changes, initialize gridState
  useEffect(() => {
    if (!selectedMonthID || !selectedYearID) {
      setGridState({});
      setErrors({});
      return;
    }

    const newState: Record<string, any> = {};
    
    assignedCases.forEach(student => {
      const existingRecord = monthlyAttendance.find(
        a => a.StudentRecordID === student.id && String(a.MonthID) === String(selectedMonthID) && String(a.SchoolYearID) === String(selectedYearID)
      );
      
      if (existingRecord) {
        newState[student.id] = { ...existingRecord, _isExisting: true };
      } else {
        newState[student.id] = {
          AttTotalDays: '',
          AttPresent: '',
          AttAbsent: '',
          AttExcused: '',
          AttUnexcused: '',
          AttSuspended: '',
          AttTardy: '',
          AttDiscipline: '',
          _isExisting: false
        };
      }
    });

    setGridState(newState);
  }, [selectedMonthID, selectedYearID, assignedCases, monthlyAttendance]);

  // Group and sort students for the grid
  const sortedStudents = useMemo(() => {
    if (!selectedMonthID) return [];
    
    const withData: any[] = [];
    const withoutData: any[] = [];

    assignedCases.forEach(s => {
      if (gridState[s.id]?._isExisting) {
        withData.push(s);
      } else {
        withoutData.push(s);
      }
    });

    const sortAlpha = (a: any, b: any) => a.FullName.localeCompare(b.FullName);
    
    return [...withoutData.sort(sortAlpha), ...withData.sort(sortAlpha)];
  }, [assignedCases, gridState, selectedMonthID]);

  const handleInputChange = (studentId: string, field: string, value: string) => {
    setGridState(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
    // Clear error for this row when they type
    if (errors[studentId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
  };

  const validateRow = (row: any): string | null => {
    const p = parseInt(row.AttPresent) || 0;
    const a = parseInt(row.AttAbsent) || 0;
    const t = parseInt(row.AttTotalDays) || 0;
    const ex = parseInt(row.AttExcused) || 0;
    const un = parseInt(row.AttUnexcused) || 0;
    const sus = parseInt(row.AttSuspended) || 0;

    if (t !== p + a) {
      return `Total Days (${t}) must equal Present (${p}) + Absent (${a})`;
    }
    if (a !== ex + un + sus) {
      return `Absent (${a}) must equal Excused (${ex}) + Unexcused (${un}) + Suspended (${sus})`;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!selectedMonthID) return;

    // Filter rows that actually have data inputted (at least one field has a value)
    const rowsToSave = Object.keys(gridState).filter(studentId => {
      const row = gridState[studentId];
      // Check if any metric has a value
      const hasValue = ['AttTotalDays', 'AttPresent', 'AttAbsent', 'AttExcused', 'AttUnexcused', 'AttSuspended', 'AttTardy', 'AttDiscipline']
        .some(k => row[k] !== '' && row[k] !== undefined && row[k] !== null);
      
      return hasValue || row._isExisting; // Always save existing rows if they click save, in case they modified
    });

    if (rowsToSave.length === 0) {
      alert("No data to save.");
      return;
    }

    // Validate
    const newErrors: Record<string, string> = {};
    let hasError = false;

    rowsToSave.forEach(studentId => {
      const row = gridState[studentId];
      const errorMsg = validateRow(row);
      if (errorMsg) {
        newErrors[studentId] = errorMsg;
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      alert("There are validation errors. Please fix the highlighted rows before saving.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const promises = rowsToSave.map(studentId => {
        const row = gridState[studentId];
        
        const payload = {
          StudentRecordID: studentId,
          MonthID: selectedMonthID,
          AttTotalDays: parseInt(row.AttTotalDays) || 0,
          AttPresent: parseInt(row.AttPresent) || 0,
          AttAbsent: parseInt(row.AttAbsent) || 0,
          AttExcused: parseInt(row.AttExcused) || 0,
          AttUnexcused: parseInt(row.AttUnexcused) || 0,
          AttSuspended: parseInt(row.AttSuspended) || 0,
          AttTardy: parseInt(row.AttTardy) || 0,
          AttDiscipline: parseInt(row.AttDiscipline) || 0,
          UpdatedAt: new Date().toISOString(),
          SchoolYearID: selectedYearID,
          OrgID: "ORG-IKAN-01"
        };

        if (row._isExisting) {
          return api.put(`/MonthlyAttendance/${row.id}`, { ...row, ...payload });
        } else {
          return api.post('/MonthlyAttendance', { ...payload, id: generateId(), CreatedAt: new Date().toISOString() });
        }
      });

      await Promise.all(promises);
      
      alert('Bulk attendance saved successfully!');
      
      // Refresh Monthly Attendance
      const attRes = await api.get('/MonthlyAttendance').catch(() => []);
      setMonthlyAttendance(attRes as any[]);
      
    } catch (err) {
      console.error(err);
      alert('Failed to save attendance data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Loading Bulk Attendance...</div>;

  const fields = [
    { name: 'AttTotalDays', label: 'Total' },
    { name: 'AttPresent', label: 'Present' },
    { name: 'AttAbsent', label: 'Absent' },
    { name: 'AttExcused', label: 'Excused' },
    { name: 'AttUnexcused', label: 'Unexcused' },
    { name: 'AttSuspended', label: 'Suspended' },
    { name: 'AttTardy', label: 'Tardy' },
    { name: 'AttDiscipline', label: 'Discipline' }
  ];

  return (
    <div style={{ padding: '0 2rem 4rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#fff', margin: 0 }}>Bulk Monthly Attendance</h2>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        
        {/* Filters */}
        <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '800px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fcd34d', fontWeight: 'bold' }}>Select School Year</label>
            <select
              value={selectedYearID}
              onChange={(e) => setSelectedYearID(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Choose a Year --</option>
              {schoolYears.map(y => (
                <option key={y.id} value={y.id}>{y.YearLabel}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fcd34d', fontWeight: 'bold' }}>Select Month</label>
            <select
              value={selectedMonthID}
              onChange={(e) => setSelectedMonthID(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Choose a Month --</option>
              {months.map(m => (
                <option key={m.id} value={m.MonthID}>{m.MonthName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid Area */}
        {(selectedMonthID && selectedYearID) && (
          <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', color: '#fff' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}>Student</th>
                  {fields.map(f => (
                    <th key={f.name} style={{ padding: '1rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', textAlign: 'center', fontSize: '0.9rem' }}>
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map(student => {
                  const row = gridState[student.id];
                  if (!row) return null;
                  const hasError = !!errors[student.id];

                  return (
                    <React.Fragment key={student.id}>
                      <tr style={{ background: row._isExisting ? 'rgba(52, 211, 153, 0.05)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                          {student.FullName}
                          {row._isExisting && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>Logged</span>}
                        </td>
                        {fields.map(field => (
                          <td key={field.name} style={{ padding: '0.5rem' }}>
                            <input
                              type="number"
                              value={row[field.name] ?? ''}
                              onChange={(e) => handleInputChange(student.id, field.name, e.target.value)}
                              min="0"
                              placeholder="-"
                              style={{
                                width: '100%',
                                maxWidth: '75px',
                                margin: '0 auto',
                                display: 'block',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: hasError ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                      {hasError && (
                        <tr>
                          <td colSpan={9} style={{ padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            ⚠️ <strong>Validation Error:</strong> {errors[student.id]}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {sortedStudents.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                      No students found for your caseload.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Bar */}
        {selectedMonthID && sortedStudents.length > 0 && (
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '1rem 3rem',
                background: '#fcd34d',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                transition: 'opacity 0.2s',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Saving All...' : 'Save All Students'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
