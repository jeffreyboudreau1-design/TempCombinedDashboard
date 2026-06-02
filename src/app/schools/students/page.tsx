'use client';

import React, { useState } from 'react';
import StudentProfileForm from '@/components/StudentProfileForm';
import { useStudents } from '@/hooks/useStudents';

export default function StudentsPage() {
  const { students, createStudent } = useStudents();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (data: any) => {
    const success = await createStudent(data);
    if (success) {
      setIsCreating(false);
    }
    return success;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Student Roster</h2>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {isCreating ? 'Cancel' : '+ New Student'}
        </button>
      </div>

      {isCreating && (
        <div style={{ marginBottom: '3rem' }}>
          <StudentProfileForm onSubmit={handleCreate} />
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {students.map(student => (
          <div key={student.id} className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>
              {student.StudentFirstName} {student.StudentLastName}
            </h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              <p style={{ margin: '0.2rem 0' }}><strong>Grade:</strong> {student.GradeLevel}</p>
              <p style={{ margin: '0.2rem 0' }}><strong>Sex:</strong> {student.StudentSex}</p>
              <p style={{ margin: '0.2rem 0' }}><strong>Status:</strong> {student.Status}</p>
            </div>
          </div>
        ))}
        {students.length === 0 && !isCreating && (
          <div style={{ color: 'var(--color-text-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            No students found. Click "+ New Student" to enroll someone.
          </div>
        )}
      </div>
    </div>
  );
}
