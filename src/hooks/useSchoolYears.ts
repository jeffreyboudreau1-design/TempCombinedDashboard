import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { AccessToggle } from '@/types/schema';

export interface SchoolYear {
  id: string;
  OrgID: string;
  YearLabel: string;
  SchStartDate: string;
  SchEndDate: string;
  IsActiveYear: AccessToggle;
}

export function useSchoolYears(orgId: string) {
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchoolYears = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In production, this would be a Firestore query: where('OrgID', '==', orgId)
      // json-server supports filtering via query params
      const data = await api.get<SchoolYear[]>(`SchoolYear?OrgID=${orgId}`);
      setSchoolYears(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch school years');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      fetchSchoolYears();
    }
  }, [orgId, fetchSchoolYears]);

  const addSchoolYear = async (newYear: Omit<SchoolYear, 'id'>) => {
    try {
      // Handle the "Only one active year" constraint
      if (newYear.IsActiveYear === AccessToggle.YES) {
        const activeYears = schoolYears.filter(sy => sy.IsActiveYear === AccessToggle.YES);
        for (const active of activeYears) {
          await api.patch(`SchoolYear/${active.id}`, { IsActiveYear: AccessToggle.NO });
        }
      }

      // We use a generated ID (like SCH-YR-XXX) per rules, json-server auto-generates string IDs if we pass a string 'id',
      // but to be sure we can generate one.
      const id = `SY-${Date.now()}`;
      await api.post('SchoolYear', { ...newYear, id });
      
      await fetchSchoolYears();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to add school year');
      return false;
    }
  };

  return { schoolYears, isLoading, error, addSchoolYear, refresh: fetchSchoolYears };
}
