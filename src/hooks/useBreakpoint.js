import { useState, useEffect } from 'react';

export function useBreakpoint() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    function handle() { setWidth(window.innerWidth); }
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width,
    // Chart helper: returns smaller height on mobile
    chartH: (desktop = 220, mobile = 160) => width < 640 ? mobile : desktop,
  };
}
