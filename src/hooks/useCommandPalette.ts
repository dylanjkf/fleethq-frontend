import { useContext } from 'react';
import { CommandPaletteContext } from '@/app/providers/CommandPaletteProvider';

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  return ctx;
}
