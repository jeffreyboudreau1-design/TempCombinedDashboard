'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import StudentProfileForm from '@/components/StudentProfileForm';

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const resolvedParams = React.use(params);
  
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/STUDENTS/${resolvedParams.id}`) as Promise<any>,
      api.get(`/StudentSchoolYear?StudentRecordID=${resolvedParams.id}`) as Promise<any[]>
    ])
    .then(([studentRes, ssyRes]) => {
      // Find the most recent or relevant SchoolYear (we'll just take the first one or active one)
      const ssy = ssyRes.length > 0 ? ssyRes[0] : null;
      setStudent({
        ...studentRes,
        SchoolYearID: ssy?.SchoolYearID,
        _ssyId: ssy?.id,
        _ssyRecord: ssy // Store full record for patching later
      });
    })
    .catch(err => {
      console.error("Failed to load student", err);
      alert("Could not load student profile.");
      router.push('/schools');
    })
    .finally(() => setLoading(false));
  }, [resolvedParams.id, router]);

  if (!currentUser) return null;

  const handleSubmit = async (data: any) => {
    try {
      const schoolYearId = data.SchoolYearID;
      
      // Clean up temp mapping data before saving StudentRecord
      delete data.SchoolYearID;
      
      const updatedStudent = {
        ...student,
        ...data,
        UpdatedAt: new Date().toISOString(),
      };
      
      // Strip internal tracking flags so they don't pollute the DB
      delete updatedStudent._ssyId;
      delete updatedStudent._ssyRecord;

      await api.put(`/STUDENTS/${resolvedParams.id}`, updatedStudent);

      // If there is an associated StudentSchoolYear record and they changed the year, update it
      if (student._ssyId && student._ssyRecord && schoolYearId) {
        if (student._ssyRecord.SchoolYearID !== schoolYearId) {
          const updatedSsy = {
            ...student._ssyRecord,
            SchoolYearID: schoolYearId,
            UpdatedAt: new Date().toISOString()
          };
          await api.put(`/StudentSchoolYear/${student._ssyId}`, updatedSsy);
        }
      }

      router.push('/schools');
      return true;
    } catch (err) {
      console.error(err);
      alert("Failed to update student");
      return false;
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: '#fff' }}>Loading Profile...</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#fff', margin: 0 }}>
          Edit Demographics: {student?.StudentFirstName} {student?.StudentLastName}
        </h2>
        <button 
          onClick={() => router.back()}
          style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', cursor: 'pointer' }}
        >
          Back
        </button>
      </div>
      
      <StudentProfileForm initialData={student} onSubmit={handleSubmit} />
    </div>
  );
}
