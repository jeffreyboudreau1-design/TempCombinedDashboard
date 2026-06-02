import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { StudentRecord } from '@/types/schema';

export function useStudents() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);

  const fetchStudents = async () => {
    if (!currentUser?.OrgID) return;
    try {
      const res = await api.get('/STUDENTS');
      setStudents(res);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [currentUser?.OrgID]);

  const generateNotification = async (targetUserId: string, message: string) => {
    if (!currentUser?.OrgID) return;
    try {
      await api.post('/Notifications', {
        id: crypto.randomUUID(),
        OrgID: currentUser.OrgID,
        TargetEmployeeID: targetUserId,
        Message: message,
        Read: false,
        CreatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to post notification:", error);
    }
  };

  const createStudent = async (data: Omit<StudentRecord, 'id' | 'CreatedAt' | 'UpdatedAt'>) => {
    if (!currentUser?.OrgID) return false;
    try {
      const newStudent: StudentRecord = {
        ...data,
        id: crypto.randomUUID(),
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };
      
      await api.post('/STUDENTS', newStudent);
      
      // Auto-notification triggers
      if (newStudent.StudentTeacher) {
        await generateNotification(newStudent.StudentTeacher, `New student assigned: ${newStudent.StudentFirstName} ${newStudent.StudentLastName}`);
      }
      if (newStudent.StudentSocialWorker) {
        await generateNotification(newStudent.StudentSocialWorker, `New student assigned: ${newStudent.StudentFirstName} ${newStudent.StudentLastName}`);
      }

      await fetchStudents();
      return true;
    } catch (error) {
      console.error("Failed to create student:", error);
      return false;
    }
  };

  return { students, createStudent, fetchStudents };
}
