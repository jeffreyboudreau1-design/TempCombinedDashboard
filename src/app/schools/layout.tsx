import React from 'react';
import SchoolsSidebar from '@/components/SchoolsSidebar';

export default function SchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 100px)', marginTop: '2rem' }}>
      <SchoolsSidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
