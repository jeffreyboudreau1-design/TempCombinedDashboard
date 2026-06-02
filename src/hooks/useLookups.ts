import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export interface SchoolNameRef {
  id: string;
  OrgID: string;
  SchoolName: string;
  CreditsToGraduate?: number;
}

export interface SchoolGradeRef {
  id: string;
  OrgID: string;
  SchoolID: string;
  GradeLevel: string;
}

export interface EmployeeRef {
  id: string;
  OrgID: string;
  EmployeeName: string;
  Role: string;
}

export interface CourseCatalogRef {
  id: string;
  OrgID: string;
  CourseName: string;
  CourseCredits: number;
  CourseCategory: string;
  CourseLevel: string;
  CourseRequired: string;
  IsActive: string;
}

export interface LetterGradeRef {
  id: string;
  GradeValue: string;
  GradeOrder: number;
}

export interface CourseCategoryRef {
  id: string;
  CategoryName: string;
  CategoryOrder: number;
}

export function useLookups() {
  const { currentUser } = useAuth();
  const [schools, setSchools] = useState<SchoolNameRef[]>([]);
  const [schoolGrades, setSchoolGrades] = useState<SchoolGradeRef[]>([]);
  const [employees, setEmployees] = useState<EmployeeRef[]>([]);
  const [courseCatalog, setCourseCatalog] = useState<CourseCatalogRef[]>([]);
  const [xferCourseCatalog, setXferCourseCatalog] = useState<CourseCatalogRef[]>([]);
  const [letterGrades, setLetterGrades] = useState<LetterGradeRef[]>([]);
  const [courseCategories, setCourseCategories] = useState<CourseCategoryRef[]>([]);

  useEffect(() => {
    if (!currentUser?.OrgID) return;

    const fetchLookups = async () => {
      try {
        const [schoolsRes, gradesRes, empRes, courseRes, xferRes, lgRes, ccRes] = await Promise.all([
          api.get('/SchoolNames'),
          api.get('/SchoolGrades'),
          api.get('/Employee'),
          api.get('/CourseCatalog'),
          api.get('/XferCourseCatalog'),
          api.get('/LetterGrades'),
          api.get('/CourseCategories')
        ]);
        
        setSchools(schoolsRes || []);
        setSchoolGrades(gradesRes || []);
        setEmployees(empRes || []);
        setCourseCatalog(courseRes || []);
        setXferCourseCatalog(xferRes || []);
        setLetterGrades(lgRes || []);
        setCourseCategories(ccRes || []);
      } catch (error) {
        console.error("Failed to fetch lookups:", error);
      }
    };

    fetchLookups();
  }, [currentUser?.OrgID]);

  return { schools, schoolGrades, employees, courseCatalog, xferCourseCatalog, letterGrades, courseCategories };
}
