import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { StudentRecord, StudentSchoolYear, StudentCourses, CourseStatus, AccessToggle, EmployeeRole } from '@/types/schema';

export function useCreditAudit(studentId: string) {
  const { currentUser } = useAuth();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [schoolYearData, setSchoolYearData] = useState<StudentSchoolYear | null>(null);
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [courses, setCourses] = useState<StudentCourses[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      // 1. Get the student
      const studentRes = (await api.get(`/STUDENTS/${studentId}`)) as any;
      if (!studentRes) throw new Error("Student not found");
      setStudent(studentRes as any);

      // 1.5 Get Active School Year
      const yearRes = await api.get('/SchoolYear');
      const active = (yearRes as any[]).find((y: any) => y.IsActiveYear === 'Yes');
      if (active) setActiveYearId(active.id);

      // 2. Get or Create the StudentSchoolYear Context
      let ssy = (await api.get(`/StudentSchoolYear?StudentRecordID=${studentId}`)) as any[];
      let currentSsy = ssy && ssy.length > 0 ? ssy[0] : null;

      if (!currentSsy) {
        // Auto-initialize the context for testing
        const newSsy: Partial<StudentSchoolYear> = {
          id: `SSY-${studentId}`,
          OrgID: studentRes.OrgID,
          StudentRecordID: studentId,
          SchoolYearID: 'SY-CURRENT',
          CaseNo: Math.floor(Math.random() * 10000),
          SchoolID: studentRes.HomeSchool,
          GradeLevel: studentRes.GradeLevel,
          SchoolEntryDate: new Date().toISOString().split('T')[0],
          CreditsEarned: 0
        };
        currentSsy = await api.post('/StudentSchoolYear', newSsy);
      }
      setSchoolYearData(currentSsy);

      // 3. Get Student Courses
      if (currentSsy) {
        const cRes = await api.get(`/StudentCourses?StuSchYrID=${currentSsy.id}`);
        setCourses((cRes as any[]) || []);
      }
    } catch (err) {
      console.error("Error loading audit data", err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Save/Toggle Checkbox action
  const toggleCourseStatus = async (
    courseId: string, 
    field: 'Status' | 'Enrolled' | 'RecommendNext' | 'Grade',
    value: CourseStatus | AccessToggle | string | null
  ) => {
    if (!schoolYearData) return;

    // Build the payload
    let updatedPayload: any = { [field]: value };

    // Auto-clear logic: If marking as COMPLETED/TAKEN, clear Enrolled and Next
    if (field === 'Status' && (value === CourseStatus.COMPLETED || value === CourseStatus.TAKEN)) {
      updatedPayload.Enrolled = AccessToggle.NO;
      updatedPayload.RecommendNext = AccessToggle.NO;
      
      // If Advisor is marking it complete, force Grade to 'T'
      if (currentUser?.Role === EmployeeRole.ADVISOR) {
        updatedPayload.Grade = 'T';
      }
    }

    // Find if the course already has a record
    const existing = courses.find(c => c.CourseID === courseId);
    
    if (existing) {
      // Update existing
      const updated = { ...existing, ...updatedPayload };
      const res = await api.put(`/StudentCourses/${existing.id}`, updated);
      setCourses(courses.map(c => c.id === (res as any).id ? (res as any) : c));
    } else {
      // Create new link
      const isCurrentYear = schoolYearData.SchoolYearID === activeYearId;
      const newCourse: Partial<StudentCourses> = {
        id: `SC-${Math.random().toString(36).substring(2, 9)}`,
        StuSchYrID: schoolYearData.id,
        OrgID: schoolYearData.OrgID,
        CourseID: courseId,
        Year: isCurrentYear ? 'Current' : 'Previous',
        ...updatedPayload,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };
      const res = await api.post('/StudentCourses', newCourse);
      setCourses([...courses, res as any]);
    }
  };

  const addTransferCourse = async (categoryName: string, courseName: string, notes?: string) => {
    if (!schoolYearData) return;

    // Use passed category Name directly
    let dbCat = categoryName;

    // 1. Create the Transfer Course Catalog Entry
    const newXferId = `XFER-${Math.random().toString(36).substring(2, 9)}`;
    const xferCourse = {
      id: newXferId,
      OrgID: schoolYearData.OrgID,
      CourseName: courseName,
      CourseCredits: 0.5,
      CourseCategory: dbCat,
      CourseLevel: 'High School',
      CourseRequired: 'No',
      XferNotes: notes || '',
      IsActive: 'Yes'
    };
    const xferRes = (await api.post('/XferCourseCatalog', xferCourse)) as any;
    const actualXferId = xferRes.id || newXferId;

    // 2. Link to Student as Completed with Grade 'T'
    const newCourseLink: Partial<StudentCourses> = {
      id: `SC-${Math.random().toString(36).substring(2, 9)}`,
      StuSchYrID: schoolYearData.id,
      OrgID: schoolYearData.OrgID,
      CourseID: actualXferId,
      Year: 'Transfer',
      Status: CourseStatus.COMPLETED,
      Grade: 'T',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
    const res = await api.post('/StudentCourses', newCourseLink);
    
    // We update local courses array. The UI will re-calculate math instantly.
    setCourses([...courses, res as any]);

    // Note: We don't have to push to xferCourseCatalog state in Lookups manually because 
    // it will be fetched on next page load, but we should return the xferCourse so the UI can append it locally!
    return xferRes;
  };

  return { student, schoolYearData, courses, loading, toggleCourseStatus, addTransferCourse, setCourses };
}
