'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import StudentProfileForm from '@/components/StudentProfileForm';

export default function AddStudentPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);

  if (!currentUser) return null;

  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleSubmit = async (data: any) => {
    try {
      const studentId = generateId();
      const schoolYearId = data.SchoolYearID;
      delete data.SchoolYearID; // don't write this to the student record directly

      const newStudent = {
        ...data,
        id: studentId,
        AuditComplete: 'No',
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };

      const created = await api.post('/STUDENTS', newStudent) as any;

      const newStudentSchoolYear = {
        id: generateId(),
        OrgID: "ORG-IKAN-01", 
        StudentRecordID: created.id,
        SchoolYearID: schoolYearId,
        CaseNo: Math.floor(Math.random() * 10000),
        SchoolID: data.HomeSchool,
        GradeLevel: data.GradeLevel,
        SchoolEntryDate: new Date().toISOString().split('T')[0],
        CreditsEarned: 0,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };

      await api.post('/StudentSchoolYear', newStudentSchoolYear);
      
      setCreatedStudentId(created.id);
      return true;
    } catch (err) {
      console.error(err);
      alert("Failed to create student");
      return false;
    }
  };

  if (createdStudentId) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ color: '#4ade80' }}>Student Created Successfully!</h2>
        <p style={{ marginBottom: '2rem' }}>What would you like to do next?</p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => router.push(`/schools/students/${createdStudentId}`)}
            style={{ padding: '0.75rem 1.5rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Proceed to Student Audit
          </button>
          <button 
            onClick={() => setCreatedStudentId(null)}
            style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add Another Student
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <StudentProfileForm onSubmit={handleSubmit} />
    </div>
  );
}
