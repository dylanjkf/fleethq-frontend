import { AlertTriangle } from 'lucide-react';

interface PickerErrorProps {
  /** Any react-query result — only its `isError` flag is read. */
  query: { isError: boolean };
  /** Plural noun for what failed to load, e.g. "assets", "operators". */
  noun: string;
}

/**
 * The small inline "couldn't load X" affordance shown under a dialog picker
 * (a `<Select>`/combobox) whose options come from a query. Mirrors the pattern
 * first written inline in AssignJobDialog, so a failed fetch reads as an error
 * rather than a silently-empty picker. Renders nothing while the query is fine.
 */
export function PickerError({ query, noun }: PickerErrorProps) {
  if (!query.isError) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-danger-500">
      <AlertTriangle className="h-3.5 w-3.5" /> Couldn't load {noun} — try again.
    </p>
  );
}
