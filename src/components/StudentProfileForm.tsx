'use client';

import React, { useState, useMemo } from 'react';
import { useLookups } from '@/hooks/useLookups';
import { GradeLevel, StudentSex, StudentStatus, AttendanceSession, AccessToggle, HybridDays, EmployeeRole, SchoolsProgram } from '@/types/schema';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface StudentProfileFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<boolean>;
}

export default function StudentProfileForm({ initialData, onSubmit }: StudentProfileFormProps) {
  const { schools, schoolGrades, employees } = useLookups();
  const { currentUser } = useAuth();

  const isAdvisor = currentUser?.Role === EmployeeRole.ADVISOR;

  const [firstName, setFirstName] = useState(initialData?.StudentFirstName || '');
  const [lastName, setLastName] = useState(initialData?.StudentLastName || '');
  const [gradeLevel, setGradeLevel] = useState<string>(initialData?.GradeLevel || '');
  const [homeSchool, setHomeSchool] = useState<string>(initialData?.HomeSchool || '');
  const [sex, setSex] = useState<string>(initialData?.StudentSex || '');
  
  const [hybrid, setHybrid] = useState<string>(initialData?.Hybrid || AccessToggle.NO);
  const [daysSchedule, setDaysSchedule] = useState<string[]>(initialData?.DaysSchedule || []);
  
  const [employed, setEmployed] = useState<string>(initialData?.Employed || AccessToggle.NO);
  const [status, setStatus] = useState<string>(initialData?.Status || StudentStatus.ENROLLED);
  
  const [teacher, setTeacher] = useState<string>(initialData?.StudentTeacher || '');
  const [socialWorker, setSocialWorker] = useState<string>(initialData?.StudentSocialWorker || '');
  const [schoolsProgram, setSchoolsProgram] = useState<string>(initialData?.SchoolsProgram || SchoolsProgram.SALT);
  const [schoolYearId, setSchoolYearId] = useState<string>('');
  const [yearDefinitions, setYearDefinitions] = useState<any[]>([]);

  React.useEffect(() => {
    if (!initialData) {
      api.get('/SchoolYear').then(res => {
        const resArray = (res as any[]) || [];
        setYearDefinitions(resArray);
        const active = resArray.find((y: any) => y.IsActiveYear === 'Yes');
        if (active) setSchoolYearId(active.id);
        else if (resArray.length > 0) setSchoolYearId(resArray[0].id);
      }).catch(console.error);
    } else {
      api.get('/SchoolYear').then(res => {
        setYearDefinitions((res as any[]) || []);
        if (initialData.SchoolYearID) {
          setSchoolYearId(initialData.SchoolYearID);
        }
      }).catch(console.error);
    }
  }, [initialData]);

  const teachers = useMemo(() => employees.filter(e => e.Role === EmployeeRole.TEACHER), [employees]);
  const socialWorkers = useMemo(() => employees.filter(e => e.Role === EmployeeRole.SOCIAL_WORKER), [employees]);

  // Dependent Dropdown Logic
  const availableSchools = useMemo(() => {
    if (!gradeLevel) return schools;
    const allowedSchoolIds = schoolGrades.filter(sg => sg.GradeLevel === gradeLevel).map(sg => sg.SchoolID);
    return schools.filter(s => allowedSchoolIds.includes(s.id));
  }, [gradeLevel, schools, schoolGrades]);

  const availableGrades = useMemo(() => {
    if (!homeSchool) return Object.values(GradeLevel);
    const allowedGrades = schoolGrades.filter(sg => sg.SchoolID === homeSchool).map(sg => sg.GradeLevel);
    return Object.values(GradeLevel).filter(g => allowedGrades.includes(g));
  }, [homeSchool, schoolGrades]);

  const handleDayToggle = (day: string) => {
    setDaysSchedule(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      StudentID: initialData?.StudentID || (Math.floor(Math.random() * 900000) + 100000), // mock ID
      StudentFirstName: firstName,
      StudentLastName: lastName,
      GradeLevel: gradeLevel as GradeLevel,
      HomeSchool: homeSchool,
      StudentSex: sex as StudentSex,
      Hybrid: hybrid as AccessToggle,
      DaysSchedule: hybrid === AccessToggle.YES ? daysSchedule : [],
      Employed: employed as AccessToggle,
      StudentTeacher: teacher,
      StudentSocialWorker: socialWorker,
      Status: isAdvisor ? StudentStatus.ENROLLED : (status as StudentStatus),
      Session: AttendanceSession.FULL_DAY,
      ConstitutionPass: initialData?.ConstitutionPass || AccessToggle.NO,
      SchoolsProgram: schoolsProgram as SchoolsProgram,
      SchoolYearID: schoolYearId // Ignored on edit since it's blanked out
    });
  };

  const inputStyle = {
    padding: '0.4rem 0.5rem',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.9)',
    color: '#000',
    fontSize: '0.85rem'
  };

  const labelStyle = {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    marginBottom: '0.2rem',
    color: '#ffffff'
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      color: '#ffffff'
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 600 }}>New Student Profile</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>First Name</label>
          <input required type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Last Name</label>
          <input required type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
        </div>

        {!isAdvisor && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Sex</label>
            <select required={!isAdvisor} value={sex} onChange={e => setSex(e.target.value)} style={inputStyle}>
              <option value="">Select Sex</option>
              {Object.values(StudentSex).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Grade Level</label>
          <select required value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={inputStyle}>
            <option value="">Select Grade</option>
            {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
          <label style={labelStyle}>Home School</label>
          <select required value={homeSchool} onChange={e => setHomeSchool(e.target.value)} style={inputStyle}>
            <option value="">Select School</option>
            {availableSchools.map(s => <option key={s.id} value={s.id}>{s.SchoolName}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Program</label>
          <select required value={schoolsProgram} onChange={e => setSchoolsProgram(e.target.value)} style={inputStyle}>
            <option value="SALT">SALT</option>
            <option value="ALOP">ALOP</option>
            <option value="RAAC">RAAC</option>
          </select>
        </div>

        {(!initialData || currentUser?.Role === EmployeeRole.SUPER_ADMIN) && !isAdvisor && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>School Year</label>
            <select required value={schoolYearId} onChange={e => setSchoolYearId(e.target.value)} style={inputStyle}>
              <option value="">Select Year</option>
              {yearDefinitions.map(yd => <option key={yd.id} value={yd.id}>{yd.YearLabel}</option>)}
            </select>
          </div>
        )}

        {!isAdvisor && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Hybrid Student?</label>
              <select value={hybrid} onChange={e => setHybrid(e.target.value)} style={inputStyle}>
                <option value={AccessToggle.YES}>Yes</option>
                <option value={AccessToggle.NO}>No</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Employed?</label>
              <select value={employed} onChange={e => setEmployed(e.target.value)} style={inputStyle}>
                <option value={AccessToggle.YES}>Yes</option>
                <option value={AccessToggle.NO}>No</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
              <label style={labelStyle}>Student Status</label>
              <select required={!isAdvisor} value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                {Object.values(StudentStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {hybrid === AccessToggle.YES && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', gridColumn: 'span 2', alignItems: 'center' }}>
                <label style={{...labelStyle, margin: 0, marginRight: '1rem'}}>Days Schedule:</label>
                {Object.values(HybridDays).map(day => (
                  <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                    <input type="checkbox" checked={daysSchedule.includes(day)} onChange={() => handleDayToggle(day)} />
                    {day.substring(0,3)}
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
              <label style={labelStyle}>Assign Teacher</label>
              <select value={teacher} onChange={e => setTeacher(e.target.value)} style={inputStyle}>
                <option value="">None</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.EmployeeName}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
              <label style={labelStyle}>Assign Social Worker</label>
              <select value={socialWorker} onChange={e => setSocialWorker(e.target.value)} style={inputStyle}>
                <option value="">None</option>
                {socialWorkers.map(sw => <option key={sw.id} value={sw.id}>{sw.EmployeeName}</option>)}
              </select>
            </div>
          </>
        )}

      </div>

      <button type="submit" style={{
        marginTop: '0.5rem',
        padding: '0.75rem',
        background: 'var(--color-primary)',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '0.9rem'
      }}>
        Save Student
      </button>
    </form>
  );
}
