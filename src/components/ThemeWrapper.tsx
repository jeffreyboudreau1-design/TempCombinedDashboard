'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ThemeWrapper() {
  const pathname = usePathname();
  
  useEffect(() => {
    // Remove all theme classes first
    document.body.classList.remove('theme-truancy', 'theme-schools', 'theme-default');
    
    // Apply the specific theme class based on route
    if (pathname.startsWith('/truancy')) {
      document.body.classList.add('theme-truancy');
    } else if (pathname.startsWith('/schools')) {
      document.body.classList.add('theme-schools');
    } else {
      document.body.classList.add('theme-default');
    }
  }, [pathname]);

  return null;
}
