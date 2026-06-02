'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/services/api';
import { UserSessionContext } from '@/types/schema';

// We extend the schema type slightly to include the raw id from the db if needed, but the prompt says 
// the session object contains Email, Role, and OrgID, EmployeeName etc.
export interface EmployeeRecord extends UserSessionContext {
  id: string;
}

interface AuthContextType {
  currentUser: EmployeeRecord | null;
  employees: EmployeeRecord[];
  isLoading: boolean;
  login: (employeeId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<EmployeeRecord | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch seed employees on mount
    const fetchEmployees = async () => {
      try {
        const data = await api.get<EmployeeRecord[]>('Employee');
        setEmployees(data);
        
        // Auto-login the first employee for convenience if none is set in session
        // Wait, for safety, let's keep it null until they select, or select EMP-02 (SuperAdmin)
        // Let's look for Jeff Super or the first employee
        const defaultUser = data.find(e => e.Role === 'SuperAdmin') || data[0];
        if (defaultUser && !currentUser) {
          setCurrentUser(defaultUser);
        }
      } catch (err) {
        console.error("Failed to load mock employees:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEmployees();
  }, []); // Empty dependency array ensures this runs once

  const login = (employeeId: string) => {
    const user = employees.find(e => e.id === employeeId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, employees, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
