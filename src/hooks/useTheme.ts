import { useContext } from 'react';
import { ThemeContext, type Theme } from '@/app/providers/ThemeProvider';

export type { Theme };

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
