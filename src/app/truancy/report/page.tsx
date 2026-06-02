'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

export default function MonthlyAttendanceReportPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  const [months, setMonths] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [schoolYears, setSchoolYears] = useState<any[]>([]);

  // Filter State
  const [selectedYearID, setSelectedYearID] = useState('');
  const [selectedMonthID, setSelectedMonthID] = useState('');
  const [selectedSchoolID, setSelectedSchoolID] = useState('ALL');
  
  // Checkbox State: Map of student ID -> boolean
  const [selectedStudents, setSelectedStudents] = useState<Record<string, boolean>>({});

  // Generated Report State
  const [isGenerated, setIsGenerated] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    Promise.all([
      api.get('/Months').catch(() => []),
      api.get('/Schools').catch(() => []),
      api.get('/STUDENTS'),
      api.get('/StudentSchoolYear').catch(() => []),
      api.get('/MonthlyAttendance').catch(() => []),
      api.get('/SchoolYear').catch(() => [])
    ]).then(([monthsRes, schoolsRes, studentsRes, ssyRes, attRes, syRes]) => {
      
      const sortedMonths = [...(monthsRes as any[])].sort((a, b) => a.SequenceOrder - b.SequenceOrder);
      setMonths(sortedMonths);
      setSchools(schoolsRes as any[]);
      setAttendanceData(attRes as any[]);
      setSchoolYears(syRes as any[]);

      let cases = (studentsRes as any[]).filter((s: any) => s.Dashboard === 'Truancy');

      cases = cases.map((c: any) => {
        const ssy = (ssyRes as any[]).find((y: any) => y.StudentRecordID === c.id);
        return { 
          ...c, 
          CaseWorker: ssy?.CaseWorker,
          HomeSchoolName: (schoolsRes as any[]).find(s => s.id === (ssy?.SchoolID || c.HomeSchool))?.SchoolName || 'Unknown School'
        };
      });

      const isAdmin = currentUser.Role === 'SuperAdmin' || currentUser.Role === 'School Admin. Assist.' || currentUser.Role === 'DeptAdmin';
      const isCaseworker = currentUser.Role === 'Caseworker';

      if (isCaseworker && !isAdmin) {
        cases = cases.filter((c: any) => c.CaseWorker === (currentUser as any).id);
      }

      const sortedCases = cases.sort((a, b) => {
        const aName = `${a.StudentLastName}, ${a.StudentFirstName}`;
        const bName = `${b.StudentLastName}, ${b.StudentFirstName}`;
        return aName.localeCompare(bName);
      });

      setAllStudents(sortedCases);
      
      // Default all to selected
      const initialSelection: Record<string, boolean> = {};
      sortedCases.forEach(c => initialSelection[c.id] = true);
      setSelectedStudents(initialSelection);

      // Default the year to the active year if possible
      const activeYear = (syRes as any[]).find(y => y.IsActiveYear === 'Yes');
      if (activeYear) {
        setSelectedYearID(activeYear.id);
      }

      setLoading(false);
    }).catch(console.error);
  }, [currentUser]);

  const filteredStudents = useMemo(() => {
    if (selectedSchoolID === 'ALL') return allStudents;
    return allStudents.filter(s => s.HomeSchool === selectedSchoolID);
  }, [allStudents, selectedSchoolID]);

  // Ensure checkbox state stays clean if filters change (optional, but good UX to just show what is filtered)
  
  const handleToggleAll = (val: boolean) => {
    const next = { ...selectedStudents };
    filteredStudents.forEach(s => {
      next[s.id] = val;
    });
    setSelectedStudents(next);
  };

  const handleGenerate = () => {
    setIsGenerated(true);
  };

  const formatPercent = (val: number) => {
    if (isNaN(val) || !isFinite(val)) return '0.00%';
    return (val * 100).toFixed(2) + '%';
  };

  if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Loading Report Configuration...</div>;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
            color: #000 !important;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff !important;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: '#fff', margin: 0 }}>Monthly Attendance Report</h2>
          {isGenerated && (
            <button onClick={() => window.print()} style={{ padding: '0.75rem 2rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Print Report
            </button>
          )}
        </div>

        {/* FILTERS */}
        <div className="no-print glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fcd34d', fontWeight: 'bold' }}>School Year</label>
              <select
                value={selectedYearID}
                onChange={(e) => { setSelectedYearID(e.target.value); setIsGenerated(false); }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff' }}
              >
                <option value="">-- Select School Year --</option>
                {schoolYears.map(y => (
                  <option key={y.id} value={y.id}>{y.YearLabel}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fcd34d', fontWeight: 'bold' }}>Start Month</label>
              <select
                value={selectedMonthID}
                onChange={(e) => { setSelectedMonthID(e.target.value); setIsGenerated(false); }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff' }}
              >
                <option value="">-- Select Start Month --</option>
                {months.map(m => (
                  <option key={m.id} value={m.MonthID}>{m.MonthName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fcd34d', fontWeight: 'bold' }}>School</label>
              <select
                value={selectedSchoolID}
                onChange={(e) => { setSelectedSchoolID(e.target.value); setIsGenerated(false); }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff' }}
              >
                <option value="ALL">All Schools</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.SchoolName}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: '#fff' }}>Select Students ({filteredStudents.filter(s => selectedStudents[s.id]).length} selected)</h4>
              <div>
                <button onClick={() => handleToggleAll(true)} style={{ background: 'transparent', color: '#34d399', border: '1px solid #34d399', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>Select All</button>
                <button onClick={() => handleToggleAll(false)} style={{ background: 'transparent', color: '#fca5a5', border: '1px solid #fca5a5', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Unselect All</button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '1rem' }}>
              {filteredStudents.map(student => (
                <label key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', padding: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={!!selectedStudents[student.id]}
                    onChange={(e) => {
                      setSelectedStudents(prev => ({ ...prev, [student.id]: e.target.checked }));
                      setIsGenerated(false);
                    }}
                  />
                  {student.StudentLastName}, {student.StudentFirstName}
                </label>
              ))}
              {filteredStudents.length === 0 && <span style={{ color: 'rgba(255,255,255,0.5)' }}>No students found for this filter.</span>}
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleGenerate}
              disabled={!selectedMonthID || !selectedYearID || filteredStudents.filter(s => selectedStudents[s.id]).length === 0}
              style={{
                padding: '1rem 3rem',
                background: (!selectedMonthID || !selectedYearID || filteredStudents.filter(s => selectedStudents[s.id]).length === 0) ? 'rgba(255,255,255,0.2)' : '#fcd34d',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: (!selectedMonthID || !selectedYearID || filteredStudents.filter(s => selectedStudents[s.id]).length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              Generate Report
            </button>
          </div>
        </div>

        {/* REPORT VIEW */}
        {isGenerated && (
          <div id="printable-report" style={{ background: '#fff', color: '#000', padding: '2rem', borderRadius: '8px', minHeight: '800px', fontFamily: 'sans-serif' }}>
            
            {/* Report Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #000', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Attendance Assistance Program</h1>
                <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>MONTHLY ATTENDANCE REPORT - {new Date().getFullYear().toString().slice(2)}/{(new Date().getFullYear() + 1).toString().slice(2)}</h2>
              </div>
            </div>

            {/* Students Output */}
            {filteredStudents.filter(s => selectedStudents[s.id]).map(student => {
              
              // Filter attendance records to those after (or including) the start month
              // Assuming MonthID relates to sequence somehow. We'll use SequenceOrder.
              const startMonthSeq = months.find(m => String(m.MonthID) === String(selectedMonthID))?.SequenceOrder || 0;
              
              const allStudentAtt = attendanceData.filter(a => a.StudentRecordID === student.id).sort((a, b) => {
                 const m1 = months.find(m => String(m.MonthID) === String(a.MonthID))?.SequenceOrder || 0;
                 const y1 = schoolYears.find(y => y.id === a.SchoolYearID)?.YearLabel || '';
                 const m2 = months.find(m => String(m.MonthID) === String(b.MonthID))?.SequenceOrder || 0;
                 const y2 = schoolYears.find(y => y.id === b.SchoolYearID)?.YearLabel || '';
                 // Sort by year ascending, then sequence ascending
                 if (y1 !== y2) return y1.localeCompare(y2);
                 return m1 - m2;
              });

              const sortedAllYears = [...schoolYears].sort((a, b) => new Date(a.SchStartDate).getTime() - new Date(b.SchStartDate).getTime());
              const selectedYearIndex = sortedAllYears.findIndex(y => String(y.id) === String(selectedYearID));

              const studentAtt = allStudentAtt.filter(a => {
                 const aYearIndex = sortedAllYears.findIndex(y => String(y.id) === String(a.SchoolYearID));
                 if (aYearIndex < selectedYearIndex) return false;
                 
                 // If it's the selected year, filter by the start month sequence
                 if (aYearIndex === selectedYearIndex) {
                   const seq = months.find(m => String(m.MonthID) === String(a.MonthID))?.SequenceOrder || 0;
                   return seq >= startMonthSeq;
                 }
                 
                 // If it's a subsequent year, include all months
                 return true;
              });

              // Post-Attendance Calcs should ALWAYS be based on the LAST 9 MONTHS of data available
              const last9MonthsAtt = allStudentAtt.slice(-9);

              // Pre-Attendance Calcs
              const preTot = Number(student.PreAttendanceTotal) || 0;
              const prePres = Number(student.PreAttendancePresent) || 0;
              const preAbs = Number(student.PreAttendanceAbsent) || 0;
              const preExc = Number(student.PreAttendanceExcused) || 0;
              const preUnex = Number(student.PreAttendanceUnexcused) || 0;
              const preSus = Number(student.PreAttendanceSuspended) || 0;
              const preTardy = Number(student.PreAttendanceTardy) || 0;

              const prePercExc = preTot > 0 ? (preTot - preExc) / preTot : 1;
              const prePercUnex = preTot > 0 ? (preTot - preUnex) / preTot : 1;
              const prePercAtt = preTot > 0 ? prePres / preTot : 0;

              // Post-Attendance Calcs (Last 9 months)
              const postTot = last9MonthsAtt.reduce((sum, a) => sum + (Number(a.AttTotalDays) || 0), 0);
              const postPres = last9MonthsAtt.reduce((sum, a) => sum + (Number(a.AttPresent) || 0), 0);
              const postAbs = last9MonthsAtt.reduce((sum, a) => sum + (Number(a.AttAbsent) || 0), 0);
              const postExc = last9MonthsAtt.reduce((sum, a) => sum + (Number(a.AttExcused) || 0), 0);
              const postUnex = last9MonthsAtt.reduce((sum, a) => sum + (Number(a.AttUnexcused) || 0), 0);
              
              const postPercExc = postTot > 0 ? (postTot - postExc) / postTot : 1;
              const postPercUnex = postTot > 0 ? (postTot - postUnex) / postTot : 1;
              const postPercAtt = postTot > 0 ? postPres / postTot : 0;

              return (
                <div key={student.id} style={{ marginBottom: '4rem', pageBreakInside: 'avoid' }}>
                  
                  {/* Column Headers (Repeated per student for clarity, as in the PDF) */}
                  <div style={{ display: 'flex', paddingBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    <div style={{ width: '25%' }}>{student.CaseWorker ? 'Caseworker' : ''}</div>
                    <div style={{ width: '10%' }}>Case<br/>Number</div>
                    <div style={{ width: '25%', textAlign: 'right' }}>Total Possible<br/>Days</div>
                    <div style={{ width: '8%', textAlign: 'right' }}>Days<br/>Present</div>
                    <div style={{ width: '8%', textAlign: 'right' }}>Days<br/>Absent</div>
                    <div style={{ width: '8%', textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Excused</div>
                    <div style={{ width: '8%', textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Unexcused</div>
                    <div style={{ width: '8%', textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Suspended</div>
                    <div style={{ width: '10%', textAlign: 'right' }}>Tardy</div>
                  </div>

                  {/* Student Name Header Row */}
                  <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', display: 'flex', padding: '0.5rem 0', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <div style={{ width: '25%' }}>{student.StudentLastName}, {student.StudentFirstName}</div>
                    <div style={{ width: '10%' }}>{student.CaseNo || ''}</div>
                    <div style={{ width: '25%', textAlign: 'left', paddingLeft: '1rem' }}>Pre-Attendance</div>
                    <div style={{ width: '8%', textAlign: 'right' }}>{preTot}</div>
                    <div style={{ width: '8%', textAlign: 'right' }}>{prePres}</div>
                    <div style={{ width: '8%', textAlign: 'right' }}>{preAbs}</div>
                    <div style={{ width: '8%', textAlign: 'right' }}>{preExc}</div>
                    <div style={{ width: '8%', textAlign: 'right' }}>{preUnex}</div>
                    <div style={{ width: '8%', textAlign: 'right' }}>{preSus}</div>
                    <div style={{ width: '10%', textAlign: 'right' }}>{formatPercent(prePercAtt)}</div>
                  </div>

                  <div style={{ display: 'flex', marginTop: '0.5rem' }}>
                    
                    {/* Left Column (Dates, info) */}
                    <div style={{ width: '35%', fontSize: '0.85rem' }}>
                      <div style={{ paddingLeft: '1rem', marginBottom: '0.5rem' }}>
                        {student.SchoolEntryDate ? new Date(student.SchoolEntryDate).toLocaleDateString() : ''}
                      </div>
                      <div style={{ paddingLeft: '1rem' }}>TRB Contract: NO</div>
                    </div>

                    {/* Right Column (Monthly Data) */}
                    <div style={{ width: '65%' }}>
                      
                      {(() => {
                        const grouped = studentAtt.reduce((acc, att) => {
                          // Try to extract just the numbers from the year label if possible, or use the whole label
                          const syLabel = schoolYears.find(y => y.id === att.SchoolYearID)?.YearLabel || 'Unknown';
                          const yearName = syLabel.includes('24-25') ? '2025' : (syLabel.includes('25-26') ? '2026' : syLabel);
                          if (!acc[yearName]) acc[yearName] = [];
                          acc[yearName].push(att);
                          return acc;
                        }, {} as Record<string, any[]>);

                        const sortedYears = Object.keys(grouped).sort();

                        return sortedYears.map(year => {
                          const yearTot = grouped[year].reduce((sum: number, a: any) => sum + (Number(a.AttTotalDays) || 0), 0);
                          const yearPres = grouped[year].reduce((sum: number, a: any) => sum + (Number(a.AttPresent) || 0), 0);
                          const yearAbs = grouped[year].reduce((sum: number, a: any) => sum + (Number(a.AttAbsent) || 0), 0);
                          const yearExc = grouped[year].reduce((sum: number, a: any) => sum + (Number(a.AttExcused) || 0), 0);
                          const yearUnex = grouped[year].reduce((sum: number, a: any) => sum + (Number(a.AttUnexcused) || 0), 0);
                          const yearPercAtt = yearTot > 0 ? yearPres / yearTot : 0;

                          return (
                            <React.Fragment key={year}>
                              {grouped[year].map((att: any, idx: number) => {
                                const monthObj = months.find(m => String(m.MonthID) === String(att.MonthID));
                                const mName = monthObj ? monthObj.MonthName : 'Unknown';
                                return (
                                  <div key={att.id} style={{ display: 'flex', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                    <div style={{ width: '15%', textAlign: 'right', fontWeight: 'bold' }}>{idx === 0 ? year : ''}</div>
                                    <div style={{ width: '23.4%', textAlign: 'left', paddingLeft: '1rem' }}>{mName}</div>
                                    <div style={{ width: '12.3%', textAlign: 'right' }}>{att.AttTotalDays}</div>
                                    <div style={{ width: '12.3%', textAlign: 'right' }}>{att.AttPresent}</div>
                                    <div style={{ width: '12.3%', textAlign: 'right' }}>{att.AttAbsent}</div>
                                    <div style={{ width: '12.3%', textAlign: 'right' }}>{att.AttExcused}</div>
                                    <div style={{ width: '12.3%', textAlign: 'right' }}>{att.AttUnexcused}</div>
                                    <div style={{ width: '12.3%', textAlign: 'right' }}>{att.AttSuspended}</div>
                                    <div style={{ width: '15.3%', textAlign: 'right' }}>{formatPercent(Number(att.AttPresent) / Number(att.AttTotalDays))}</div>
                                  </div>
                                );
                              })}
                              {/* Total Attendance Row for this Year */}
                              <div style={{ display: 'flex', fontSize: '0.9rem', fontWeight: 'bold', borderTop: '1px solid #000', marginTop: '0.5rem', paddingTop: '0.5rem', marginBottom: '1rem' }}>
                                <div style={{ width: '38.4%', textAlign: 'left', paddingLeft: '1rem' }}>Total Attendance</div>
                                <div style={{ width: '12.3%', textAlign: 'right' }}>{yearTot}</div>
                                <div style={{ width: '12.3%', textAlign: 'right' }}>{yearPres}</div>
                                <div style={{ width: '12.3%', textAlign: 'right' }}>{yearAbs}</div>
                                <div style={{ width: '12.3%', textAlign: 'right' }}>{yearExc}</div>
                                <div style={{ width: '12.3%', textAlign: 'right' }}>{yearUnex}</div>
                                <div style={{ width: '12.3%', textAlign: 'right' }}>0</div>
                                <div style={{ width: '15.3%', textAlign: 'right' }}>{formatPercent(yearPercAtt)}</div>
                              </div>
                            </React.Fragment>
                          );
                        });
                      })()}

                      {/* Summary Percentages block */}
                      <div style={{ display: 'flex', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                        <div style={{ width: '38.4%', textAlign: 'right', paddingRight: '1rem' }}>
                          <div style={{ paddingBottom: '0.25rem', color: 'transparent' }}>Label</div>
                          <div style={{ paddingBottom: '0.25rem' }}>Excused</div>
                          <div style={{ paddingBottom: '0.25rem' }}>Unexcused</div>
                          <div style={{ paddingBottom: '0.25rem' }}>Total Attendance</div>
                        </div>
                        <div style={{ width: '30.8%', textAlign: 'right' }}>
                          <div style={{ paddingBottom: '0.25rem' }}>Pre-Attendance %</div>
                          <div style={{ paddingBottom: '0.25rem' }}>{formatPercent(prePercExc)}</div>
                          <div style={{ paddingBottom: '0.25rem' }}>{formatPercent(prePercUnex)}</div>
                          <div style={{ paddingBottom: '0.25rem' }}>{formatPercent(prePercAtt)}</div>
                        </div>
                        <div style={{ width: '30.8%', textAlign: 'right' }}>
                          <div style={{ paddingBottom: '0.25rem' }}>Post-Attendance %</div>
                          <div style={{ paddingBottom: '0.25rem' }}>{formatPercent(postPercExc)}</div>
                          <div style={{ paddingBottom: '0.25rem' }}>{formatPercent(postPercUnex)}</div>
                          <div style={{ paddingBottom: '0.25rem' }}>{formatPercent(postPercAtt)}</div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  );
}
