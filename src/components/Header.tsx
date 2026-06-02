'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AccessToggle } from '@/types/schema';
import { api } from '@/services/api';

export default function Header() {
  const { currentUser, employees, login, logout, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    
    // Simple polling for notifications
    const fetchNotifications = async () => {
      try {
        const res = await api.get(`/Notifications?TargetEmployeeID=${currentUser.id}&Read=false`);
        setNotifications((res as any[]) || []);
      } catch (e) {
        console.error("Failed fetching notifications");
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [currentUser]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/Notifications/${id}`, { Read: true });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error("Failed to update notification");
    }
  };

  return (
    <header className="glass-panel" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1rem 2rem', 
      marginBottom: '2rem',
      borderRadius: '0' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
          IKAN DASHBOARDS
        </div>
        
        {/* Navigation Tabs based on Role Access */}
        {currentUser && (
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/admin/school-year" style={{ textDecoration: 'none', color: 'var(--color-text-main)', fontWeight: 'bold' }}>
              Admin
            </Link>
            
            {currentUser.DeptTruancyAccess === AccessToggle.YES && (
              <Link href="/truancy" style={{ textDecoration: 'none', color: 'var(--color-text-main)', fontWeight: 'bold' }}>
                Truancy Dashboard
              </Link>
            )}
            
            {currentUser.DeptSchoolsAccess === AccessToggle.YES && (
              <Link href="/schools" style={{ textDecoration: 'none', color: 'var(--color-text-main)', fontWeight: 'bold' }}>
                Schools Dashboard
              </Link>
            )}
          </nav>
        )}
      </div>

      <div>
        {isLoading ? (
          <div>Loading mock auth...</div>
        ) : currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <div style={{ 
                cursor: 'pointer', 
                fontSize: '1.5rem',
                color: notifications.length > 0 ? '#fbbf24' : 'var(--color-text-muted)' 
              }}>
                🔔
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: '-5px', right: '-10px',
                    background: '#ef4444', color: 'white', fontSize: '0.7rem',
                    padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold'
                  }}>
                    {notifications.length}
                  </span>
                )}
              </div>
              
              {/* Notification Dropdown (simple hover/click display for prototyping) */}
              {notifications.length > 0 && (
                <div style={{
                  position: 'absolute', top: '30px', right: '0', width: '250px',
                  background: 'var(--glass-bg)', backdropFilter: 'blur(10px)',
                  border: '1px solid var(--glass-border)', padding: '1rem',
                  borderRadius: '8px', zIndex: 100, color: 'white',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Recent Alerts</h4>
                  {notifications.map(n => (
                    <div key={n.id} style={{ 
                      fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', 
                      padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span>{n.Message}</span>
                      <button onClick={() => markAsRead(n.id)} style={{
                        background: 'transparent', border: '1px solid white', 
                        color: 'white', padding: '2px 5px', fontSize: '0.7rem',
                        cursor: 'pointer', marginLeft: '5px'
                      }}>X</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
              <div style={{ fontWeight: 'bold' }}>{currentUser.EmployeeName}</div>
              <div style={{ color: 'var(--color-text-muted)' }}>{currentUser.Role} | {currentUser.OrgID}</div>
            </div>
            <button onClick={logout} style={{ backgroundColor: '#ef4444', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="mock-login" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Mock Login:</label>
            <select 
              id="mock-login"
              onChange={(e) => login(e.target.value)} 
              defaultValue=""
            >
              <option value="" disabled>Select an employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.EmployeeName} ({emp.Role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </header>
  );
}
