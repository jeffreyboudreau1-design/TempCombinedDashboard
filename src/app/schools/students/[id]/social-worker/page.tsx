'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import StudentProfileForm from '@/components/StudentProfileForm';
import { MentalHealthTier } from '@/types/schema';
import { useLookups } from '@/hooks/useLookups';

export default function SocialWorkerStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { employees } = useLookups();
  const resolvedParams = React.use(params);
  
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Social Worker Tracking Fields
  const [currentGoals, setCurrentGoals] = useState('');
  const [levelOfService, setLevelOfService] = useState('');
  const [assignedSocialWorker, setAssignedSocialWorker] = useState('');

  // Notes
  const [caseworkerNotes, setCaseworkerNotes] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [activeSSY, setActiveSSY] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/STUDENTS/${resolvedParams.id}`) as Promise<any>,
      api.get(`/StudentSchoolYear?StudentRecordID=${resolvedParams.id}`) as Promise<any[]>,
      api.get(`/StudentCaseworkerNotes`) as Promise<any[]>
    ])
    .then(([studentRes, ssyRes, allNotesRes]) => {
      // Find active SSY
      const ssy = ssyRes.length > 0 ? ssyRes[ssyRes.length - 1] : null; // simplified logic
      setActiveSSY(ssy);

      setStudent({
        ...studentRes,
        SchoolYearID: ssy?.SchoolYearID,
        _ssyId: ssy?.id,
        _ssyRecord: ssy
      });

      setCurrentGoals(studentRes.CurrentGoals || '');
      setLevelOfService(studentRes.LevelOfService || '');
      setAssignedSocialWorker(studentRes.StudentSocialWorker || '');

      // Filter notes for this student (via SSY)
      const studentSsyIds = ssyRes.map(s => s.id);
      const studentNotes = allNotesRes
        .filter(n => studentSsyIds.includes(n.StuSchYrID))
        .sort((a, b) => new Date(b.CWDate).getTime() - new Date(a.CWDate).getTime());
      
      setCaseworkerNotes(studentNotes);
    })
    .catch(err => {
      console.error("Failed to load student", err);
      router.push('/schools');
    })
    .finally(() => setLoading(false));
  }, [resolvedParams.id, router]);

  if (!currentUser) return null;

  const handleDemographicsSubmit = async (data: any) => {
    try {
      const schoolYearId = data.SchoolYearID;
      delete data.SchoolYearID;
      
      const updatedStudent = {
        ...student,
        ...data,
        UpdatedAt: new Date().toISOString(),
      };
      
      delete updatedStudent._ssyId;
      delete updatedStudent._ssyRecord;

      await api.put(`/STUDENTS/${resolvedParams.id}`, updatedStudent);

      if (student._ssyId && student._ssyRecord && schoolYearId) {
        if (student._ssyRecord.SchoolYearID !== schoolYearId) {
          const updatedSsy = { ...student._ssyRecord, SchoolYearID: schoolYearId, UpdatedAt: new Date().toISOString() };
          await api.put(`/StudentSchoolYear/${student._ssyId}`, updatedSsy);
        }
      }
      return true;
    } catch (err) {
      console.error(err);
      alert("Failed to update student demographics");
      return false;
    }
  };

  const createSystemNote = async (message: string) => {
    if (!activeSSY) return;
    try {
      const payload = {
        OrgID: student?.OrgID || 'ORG-IKAN-01',
        StuSchYrID: activeSSY.id,
        CWDate: new Date().toISOString(),
        Interaction: 'System Update',
        CWNotes: message,
        CWAuthor: currentUser?.EmployeeName || currentUser?.id || 'Unknown',
        CreatedAt: new Date().toISOString()
      };
      const savedNote = await api.post('/StudentCaseworkerNotes', payload) as any;
      setCaseworkerNotes(prev => [savedNote, ...prev].sort((a, b) => new Date(b.CWDate).getTime() - new Date(a.CWDate).getTime()));
    } catch (err) {
      console.error("Failed to auto-log system note", err);
    }
  };

  const saveSocialWorkerFields = async () => {
    setIsSubmitting(true);
    try {
      const changes = [];
      if (student.CurrentGoals !== currentGoals) {
        changes.push(`Goals updated from "${student.CurrentGoals || 'None'}" to "${currentGoals || 'None'}"`);
      }
      if (student.LevelOfService !== levelOfService) {
        changes.push(`Level of Service updated from "${student.LevelOfService || 'None'}" to "${levelOfService || 'None'}"`);
      }
      if (student.StudentSocialWorker !== assignedSocialWorker) {
        const oldWorker = employees.find(e => e.id === student.StudentSocialWorker)?.EmployeeName || 'Unassigned';
        const newWorker = employees.find(e => e.id === assignedSocialWorker)?.EmployeeName || 'Unassigned';
        changes.push(`Assigned Social Worker updated from "${oldWorker}" to "${newWorker}"`);
      }

      if (changes.length > 0) {
        const updatedStudent = {
          ...student,
          CurrentGoals: currentGoals,
          LevelOfService: levelOfService,
          StudentSocialWorker: assignedSocialWorker,
          UpdatedAt: new Date().toISOString()
        };
        delete updatedStudent._ssyId;
        delete updatedStudent._ssyRecord;

        await api.put(`/STUDENTS/${resolvedParams.id}`, updatedStudent);
        setStudent({ ...student, CurrentGoals: currentGoals, LevelOfService: levelOfService, StudentSocialWorker: assignedSocialWorker });
        
        // Log changes
        for (const change of changes) {
          await createSystemNote(change);
        }
        alert("Social worker tracking fields updated successfully!");
      } else {
        alert("No changes detected.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save fields");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!activeSSY) return alert('No active school year found for this student to attach the note to.');
    if (!newNoteText) return alert('Please enter note text.');
    try {
      const payload = {
        OrgID: student?.OrgID || 'ORG-IKAN-01',
        StuSchYrID: activeSSY.id,
        CWDate: new Date().toISOString(),
        Interaction: 'Social Worker Note',
        CWNotes: newNoteText,
        CWAuthor: currentUser?.EmployeeName || currentUser?.id || 'Unknown',
        CreatedAt: new Date().toISOString()
      };
      const savedNote = await api.post('/StudentCaseworkerNotes', payload) as any;
      setCaseworkerNotes(prev => [savedNote, ...prev].sort((a, b) => new Date(b.CWDate).getTime() - new Date(a.CWDate).getTime()));
      setNewNoteText('');
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#fff' }}>Loading Profile...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#fff', margin: 0 }}>
          Social Worker Dashboard: {student?.StudentFirstName} {student?.StudentLastName}
        </h2>
        <button 
          onClick={() => router.push('/schools')}
          style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', cursor: 'pointer' }}
        >
          Back to List
        </button>
      </div>
      
      {/* Demographics Section */}
      <div style={{ marginBottom: '2rem' }}>
        <StudentProfileForm initialData={student} onSubmit={async () => true} readOnly={true} />
        
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button 
            onClick={() => router.push(`/schools/students/${resolvedParams.id}`)}
            style={{ padding: '0.5rem 1.5rem', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            View Credit Audit (Read-Only)
          </button>
        </div>
      </div>

      <hr style={{ borderColor: 'rgba(255,255,255,0.2)', marginBottom: '2rem' }} />

      {/* Social Worker Tracking Block */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff' }}>Social Worker Tracking</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Level of Service</label>
              <select
                value={levelOfService}
                onChange={e => setLevelOfService(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              >
                <option value="">-- Select Level --</option>
                <option value={MentalHealthTier.TIER_1}>Tier 1</option>
                <option value={MentalHealthTier.TIER_2}>Tier 2</option>
                <option value={MentalHealthTier.TIER_3}>Tier 3</option>
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Assigned Social Worker</label>
              <select
                value={assignedSocialWorker}
                onChange={e => setAssignedSocialWorker(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              >
                <option value="">-- Unassigned --</option>
                {employees.filter(e => e.Role === 'SocialWorker' || e.Role === 'SuperAdmin').map(e => (
                  <option key={e.id} value={e.id}>{e.EmployeeName}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Current Goals</label>
            <textarea 
              value={currentGoals}
              onChange={e => setCurrentGoals(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              placeholder="List goals here..."
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <button 
              onClick={saveSocialWorkerFields}
              disabled={isSubmitting}
              style={{ padding: '0.5rem 1.5rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Save Tracking Info
            </button>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff' }}>Historical Notes</h3>
        
        {/* Add Note */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
            <textarea
              value={newNoteText}
              onChange={e => setNewNoteText(e.target.value)}
              placeholder="Type new note..."
              rows={2}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
            />
            <button 
              onClick={handleAddNote}
              style={{ padding: '0 1rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Add Note
            </button>
          </div>
        </div>

        {/* Note List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {caseworkerNotes.map(note => {
            const isSystem = note.Interaction === 'System Update';
            return (
              <div key={note.id} style={{ 
                padding: '1rem', 
                borderRadius: '8px', 
                background: isSystem ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.3)', 
                borderLeft: isSystem ? '4px solid #3b82f6' : '4px solid rgba(255,255,255,0.3)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ color: isSystem ? '#93c5fd' : 'rgba(255,255,255,0.6)' }}>
                    <strong>{new Date(note.CWDate).toLocaleDateString()} {new Date(note.CWDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong> 
                    &nbsp;&bull;&nbsp; {note.Interaction}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.8)' }}>By: {note.CWAuthor}</div>
                </div>
                <div style={{ color: isSystem ? '#bfdbfe' : '#fff', whiteSpace: 'pre-wrap' }}>
                  {note.CWNotes}
                </div>
              </div>
            );
          })}
          {caseworkerNotes.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '1rem' }}>No notes found.</div>
          )}
        </div>
      </div>

    </div>
  );
}
