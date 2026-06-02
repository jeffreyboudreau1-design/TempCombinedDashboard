'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLookups } from '@/hooks/useLookups';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditAudit } from '@/hooks/useCreditAudit';
import { CourseStatus, AccessToggle, EmployeeRole } from '@/types/schema';



export default function CreditAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isProgressMode = searchParams.get('view') === 'progress';
  const resolvedParams = React.use(params);
  const { student, loading, courses: studentCourses, toggleCourseStatus, addTransferCourse } = useCreditAudit(resolvedParams.id);
  const { schools, courseCatalog, xferCourseCatalog, letterGrades, courseCategories } = useLookups();
  const { currentUser } = useAuth();

  // RBAC Evaluators
  const isAdvisor = currentUser?.Role === EmployeeRole.ADVISOR;
  const isSuperAdmin = currentUser?.Role === EmployeeRole.SUPER_ADMIN;
  const isAdminAssistant = currentUser?.Role === EmployeeRole.SCHOOL_ADMIN_ASST;
  const isReadOnly = currentUser?.Role === EmployeeRole.TEACHER || currentUser?.Role === EmployeeRole.SOCIAL_WORKER;
  
  const disableNeedNext = isProgressMode || isAdminAssistant || isReadOnly;
  const disableCompEnrl = isProgressMode || isReadOnly;
  const showGradeColumn = isProgressMode || !isAdvisor; // Super Admin sees it, Advisor does not (unless progress mode)
  const canAddTransfer = !isProgressMode && (isAdvisor || isSuperAdmin);

  const [localXferCourses, setLocalXferCourses] = useState<any[]>([]);
  
  const unifiedCatalog = useMemo(() => {
    const xfers = (xferCourseCatalog || []).map((x: any) => ({ ...x, IsTransfer: true }));
    const locals = localXferCourses.map(x => ({ ...x, IsTransfer: true }));
    return [...courseCatalog, ...xfers, ...locals];
  }, [courseCatalog, xferCourseCatalog, localXferCourses]);

  const homeSchool = useMemo(() => {
    if (!student) return null;
    return schools.find(s => s.id === student.HomeSchool);
  }, [student, schools]);

  // Calculations
  const creditsToGraduate = homeSchool?.CreditsToGraduate || 24; // Default fallback
  const electivesTarget = creditsToGraduate - 16;

  const totalCreditsPrevious = useMemo(() => {
    let passedCount = 0;
    let neededCount = 0;
    
    // Check unified catalog for auto-needed logic + explicit states
    unifiedCatalog.forEach(c => {
      const link = studentCourses.find(sc => sc.CourseID === c.id);
      const isTaken = link?.Status === CourseStatus.TAKEN || link?.Status === CourseStatus.COMPLETED;
      const dbNeeded = link?.Status === CourseStatus.NEEDED;
      const isNeeded = dbNeeded;

      if (isTaken) passedCount += (c.CourseCredits / 0.5); // Count chunks of 0.5
      else if (isNeeded) neededCount += (c.CourseCredits / 0.5);
    });

    return 0.5 * (passedCount + neededCount);
  }, [studentCourses, unifiedCatalog]);

  const creditsRemaining = creditsToGraduate - totalCreditsPrevious;

  if (loading || !student) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#fff' }}>Loading Audit Workspace...</div>;
  }

  const CategoryBox = ({ category, index, isMagazine = false }: { category: any, index: number, isMagazine?: boolean }) => {
    const [xferInput, setXferInput] = useState('');
    const [xferNotes, setXferNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const colorPalette = [
      { bg: "#fef3c7", header: "#fde68a" },
      { bg: "#e0f2fe", header: "#bae6fd" },
      { bg: "#ffe4e6", header: "#fecdd3" },
      { bg: "#f3e8ff", header: "#e9d5ff" },
      { bg: "#dcfce7", header: "#bbf7d0" },
      { bg: "#ffedd5", header: "#fed7aa" },
      { bg: "#e0e7ff", header: "#c7d2fe" }
    ];
    const colorMap = colorPalette[index % colorPalette.length];
    
    // Filter catalog for this category
    const catCourses = unifiedCatalog.filter(c => {
      if (c.CourseLevel !== 'High School') return false; // Enforce High School Only

      if (c.IsTransfer) {
        const hasLink = studentCourses.some(sc => sc.CourseID === c.id);
        if (!hasLink) return false;
      }
      
      return c.CourseCategory === category.CategoryName;
    }).sort((a, b) => (a.CourseName || '').localeCompare(b.CourseName || ''));
    
    let requiredCredits = category.StateCreditsRequired || 0;

    // How many credits passed in this category?
    let earnedInCat = 0;
    catCourses.forEach(cc => {
      const link = studentCourses.find(sc => sc.CourseID === cc.id);
      if (link && (link.Status === CourseStatus.COMPLETED || link.Status === CourseStatus.TAKEN)) {
        earnedInCat += cc.CourseCredits;
      }
    });
    const remaining = requiredCredits - earnedInCat;

    const renderCourseRow = (c: any) => {
      const link = studentCourses.find(sc => sc.CourseID === c.id);
      
      const isTaken = link?.Status === CourseStatus.TAKEN || link?.Status === CourseStatus.COMPLETED;
      
      const dbNeeded = link?.Status === CourseStatus.NEEDED;
      const isNeeded = dbNeeded;
      
      const isEnrolled = link?.Enrolled === AccessToggle.YES;
      const isRecommend = link?.RecommendNext === AccessToggle.YES;

      return (
        <div key={c.id} className="course-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: !showGradeColumn ? '1fr 50px 50px 50px 50px' : '1fr 40px 50px 50px 50px 50px', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          padding: '0.2rem 0',
          fontSize: '0.85rem',
          color: '#333'
        }}>
          <div style={{ 
            paddingRight: '0.5rem', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            fontStyle: c.id.startsWith('XFER-') ? 'italic' : 'normal', 
            fontWeight: (isProgressMode && link?.Year === 'Current') ? 'bold' : (c.id.startsWith('XFER-') ? '600' : 'normal'), 
            color: c.id.startsWith('XFER-') ? '#f59e0b' : 'inherit' 
          }} title={c.id.startsWith('XFER-') ? `Transfer Course: ${c.XferNotes || ''}` : ''}>
            {c.CourseName}{c.id.startsWith('XFER-') ? ' (XFER)' : ''}
          </div>
          
          {showGradeColumn && (
            <div>
              {isTaken ? (
                <select 
                  value={link?.Grade || 'P'} 
                  disabled={isProgressMode || isReadOnly}
                  onChange={(e) => toggleCourseStatus(c.id, 'Grade' as any, e.target.value as any)}
                  style={{ width: '35px', padding: 0, fontSize: '0.7rem' }}
                >
                  {letterGrades.sort((a,b) => a.GradeOrder - b.GradeOrder).map(lg => (
                     <option key={lg.id} value={lg.GradeValue}>{lg.GradeValue}</option>
                  ))}
                </select>
              ) : null}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <input type="checkbox" disabled={disableCompEnrl} checked={isTaken} onChange={() => toggleCourseStatus(c.id, 'Status', isTaken ? null : CourseStatus.COMPLETED)} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <input type="checkbox" disabled={disableCompEnrl} checked={isEnrolled} onChange={() => toggleCourseStatus(c.id, 'Enrolled', isEnrolled ? AccessToggle.NO : AccessToggle.YES)} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <input type="checkbox" disabled={disableNeedNext} checked={isNeeded} onChange={() => toggleCourseStatus(c.id, 'Status', isNeeded ? null : CourseStatus.NEEDED)} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <input type="checkbox" disabled={disableNeedNext} checked={isRecommend} onChange={() => toggleCourseStatus(c.id, 'RecommendNext', isRecommend ? AccessToggle.NO : AccessToggle.YES)} />
          </div>
        </div>
      );
    };

    return (
      <div className="card" style={{ 
        backgroundColor: colorMap.bg, 
        borderRadius: '8px', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        pageBreakInside: 'avoid'
      }}>
        {/* Category Header */}
        <div style={{ padding: '0.75rem 1rem', background: colorMap.header, borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>{category.CategoryName}</h3>
          <div style={{ fontSize: '0.8rem', color: '#555' }}>
            <div>Req: {requiredCredits}</div>
            <div style={{ color: remaining <= 0 ? 'var(--color-success)' : 'inherit' }}>
              Rem: {remaining}
            </div>
          </div>
        </div>

        {/* Column Headers */}
        <div className="course-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: !showGradeColumn ? '1fr 50px 50px 50px 50px' : '1fr 40px 50px 50px 50px 50px', 
          alignItems: 'center',
          padding: '0.5rem 1rem',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          color: '#555',
          borderBottom: '2px solid rgba(0,0,0,0.1)'
        }}>
          <div></div>
          {showGradeColumn && <div>Grd</div>}
          <div style={{ textAlign: 'center' }}>Comp</div>
          <div style={{ textAlign: 'center' }}>Enrl</div>
          <div style={{ textAlign: 'center' }}>Need</div>
          <div style={{ textAlign: 'center' }}>Next</div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '0.5rem 1rem' }}>
          {isMagazine ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>{catCourses.slice(0, Math.ceil(catCourses.length/2)).map(renderCourseRow)}</div>
              <div>{catCourses.slice(Math.ceil(catCourses.length/2)).map(renderCourseRow)}</div>
            </div>
          ) : (
            <div>{catCourses.map(renderCourseRow)}</div>
          )}
          
          {/* Xfer/Alternative Add Component - Advisors & Super Admins */}
          {canAddTransfer && (
            <div className="print-hide" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={xferInput}
                  onChange={(e) => setXferInput(e.target.value)}
                  placeholder="Add Transfer/Alt Course..."
                  style={{ flex: 1, padding: '0.25rem', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && xferInput.trim() && !isSubmitting) {
                      const handleAdd = async () => {
                        setIsSubmitting(true);
                        const added = await addTransferCourse(category.CategoryName, xferInput.trim(), xferNotes.trim());
                        setLocalXferCourses(prev => [...prev, added]);
                        setXferInput('');
                        setXferNotes('');
                        setIsSubmitting(false);
                      };
                      handleAdd();
                    }
                  }}
                />
                <button 
                  disabled={isSubmitting || !xferInput.trim()}
                  onClick={async () => {
                    setIsSubmitting(true);
                    const added = await addTransferCourse(category.CategoryName, xferInput.trim(), xferNotes.trim());
                    setLocalXferCourses(prev => [...prev, added]);
                    setXferInput('');
                    setXferNotes('');
                    setIsSubmitting(false);
                  }}
                  style={{ 
                    padding: '0.25rem 0.75rem', fontSize: '0.8rem', 
                    background: xferInput.trim() ? '#4f46e5' : '#ccc', 
                    color: '#fff', border: 'none', borderRadius: '4px', cursor: xferInput.trim() ? 'pointer' : 'not-allowed' 
                  }}
                >
                  Add
                </button>
              </div>
              <input 
                type="text" 
                value={xferNotes}
                onChange={(e) => setXferNotes(e.target.value)}
                placeholder="Optional notes about this transfer..."
                style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #eee', borderRadius: '4px', background: '#f9f9f9' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && xferInput.trim() && !isSubmitting) {
                    const handleAdd = async () => {
                      setIsSubmitting(true);
                      const added = await addTransferCourse(category.CategoryName, xferInput.trim(), xferNotes.trim());
                      setLocalXferCourses(prev => [...prev, added]);
                      setXferInput('');
                      setXferNotes('');
                      setIsSubmitting(false);
                    };
                    handleAdd();
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Global CSS Overrides for Print Mode */}
      <style>{`
        @media print {
          @page { margin: 0.2in; size: portrait; }
          body { 
            font-size: 8px !important; 
            background: white !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .print-hide, header { display: none !important; }
          .glass-panel { 
            box-shadow: none !important; 
            backdrop-filter: none !important; 
            background: white !important;
            padding: 0.15rem !important; 
            color: black !important;
          }
          .glass-panel * { color: black !important; }
          .course-grid { 
            grid-template-columns: 1fr 20px 20px 20px 20px !important; 
            padding: 0.1rem 0.2rem !important;
          }
          .course-grid > div:nth-child(2) { display: none !important; } /* Hide Grd column on print to save space */
          .card { margin-bottom: 0 !important; }
          /* Reduce gaps between flex columns on print */
          div[style*="gap: 1rem"] { gap: 0.5rem !important; }
        }
      `}</style>

      {/* Top Banner (Glass) */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
            {student.StudentFirstName} {student.StudentLastName}
            {isProgressMode && <span style={{ fontSize: '1rem', marginLeft: '1rem', color: '#4ade80', fontWeight: 'normal', textTransform: 'uppercase' }}>Progress Report</span>}
          </h1>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
            <span><strong>Grade:</strong> {student.GradeLevel}</span>
            <span><strong>Home School:</strong> {homeSchool?.SchoolName}</span>
            <span><strong>Program:</strong> {student.SchoolsProgram || 'Standard'}</span>
          </div>
        </div>
        
        {/* Calculations Block */}
        <div style={{ display: 'flex', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Credits To Graduate</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{creditsToGraduate}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Credits Previous</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalCreditsPrevious.toFixed(1)}</div>
          </div>
          <div style={{ color: creditsRemaining <= 0 ? '#4ade80' : 'inherit' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Credits Remaining</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{creditsRemaining.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {(() => {
        const sortedCats = [...courseCategories].sort((a,b) => a.CategoryOrder - b.CategoryOrder);
        const electiveCat = sortedCats.find(c => c.CategoryName === 'Elective');
        const otherCats = sortedCats.filter(c => c.CategoryName !== 'Elective');
        
        const colA: any[] = [];
        const colB: any[] = [];
        const colC: any[] = [];
        
        otherCats.forEach((cat, i) => {
          if (i % 3 === 0) colA.push(cat);
          else if (i % 3 === 1) colB.push(cat);
          else colC.push(cat);
        });

        return (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Left Column (1/3 width) */}
            <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {colA.map((cat, i) => <CategoryBox key={cat.id} category={cat} index={i*3} />)}
            </div>
            
            {/* Right Column (2/3 width) */}
            <div style={{ flex: '2 1 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Nested Top Split for other categories */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {colB.map((cat, i) => <CategoryBox key={cat.id} category={cat} index={i*3+1} />)}
                </div>
                <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {colC.map((cat, i) => <CategoryBox key={cat.id} category={cat} index={i*3+2} />)}
                </div>
              </div>
              
              {/* Full width bottom span for Elective list */}
              {electiveCat && (
                <div>
                  <CategoryBox category={electiveCat} index={99} isMagazine={true} />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Bottom Action Bar */}
      <div className="glass-panel print-hide" style={{ marginTop: '1.5rem', padding: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button 
          onClick={() => window.print()}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
        >
          Print Audit
        </button>
        {(!isProgressMode && (isAdvisor || isSuperAdmin)) && (
          <button 
            onClick={async () => {
              try {
                const { api } = await import('@/services/api');
                await api.put(`/STUDENTS/${student.id}`, { ...student, AuditComplete: 'Yes' });
                router.push('/schools');
              } catch (e) {
                console.error("Failed to complete audit", e);
              }
            }}
            style={{ 
              background: 'var(--color-success)',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Audit Completed
          </button>
        )}
      </div>
    </div>
  );
}
