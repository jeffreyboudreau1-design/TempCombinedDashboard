import React from 'react';
import TruancySidebar from '@/components/TruancySidebar';

export default function TruancyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <TruancySidebar />
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
