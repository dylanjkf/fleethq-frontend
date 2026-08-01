import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { findNavItemByPath } from '@/app/navigation';

const STORAGE_KEY = 'fleethq.recentPages';
const MAX = 5;

export interface RecentPage {
  path: string;
  label: string;
}

function read(): RecentPage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentPage[]) : [];
  } catch {
    return [];
  }
}

/**
 * Tracks the top-level pages a user has recently visited (power-user "recently
 * viewed" affordance surfaced in the command palette). Records only known nav
 * destinations, most-recent-first, deduplicated, capped at MAX. The current
 * page is excluded from the returned list so it never suggests where you are.
 */
export function useRecentPages(): RecentPage[] {
  const location = useLocation();
  const [recent, setRecent] = useState<RecentPage[]>(read);

  useEffect(() => {
    const item = findNavItemByPath(location.pathname);
    if (!item) return;
    setRecent((prev) => {
      const next = [
        { path: item.path, label: item.label },
        ...prev.filter((p) => p.path !== item.path),
      ].slice(0, MAX);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [location.pathname]);

  return recent.filter((p) => p.path !== location.pathname);
}

/** Read recent pages without subscribing to route changes (for the palette). */
export function useReadRecentPages(): [RecentPage[], () => void] {
  const [recent, setRecent] = useState<RecentPage[]>(read);
  const refresh = useCallback(() => setRecent(read()), []);
  return [recent, refresh];
}
