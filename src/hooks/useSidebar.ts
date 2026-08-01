import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'fleethq.sidebar.collapsed';

/**
 * Desktop sidebar collapse state, persisted so a power user's preference for
 * the icon rail survives reloads. Mobile navigation uses a separate drawer and
 * ignores this entirely.
 */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  return [collapsed, toggle];
}
