'use client';

import dynamic from 'next/dynamic';

// Dynamically import ThemeToggle with no SSR to prevent hydration issues
const ThemeToggle = dynamic(() => import('./ThemeToggle').then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => (
    <div style={{ 
      width: '120px', 
      height: '40px', 
      background: 'transparent',
      border: '1px solid transparent',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        width: '16px', 
        height: '16px', 
        background: '#e5e7eb',
        borderRadius: '50%'
      }} />
    </div>
  )
});

export default ThemeToggle;
