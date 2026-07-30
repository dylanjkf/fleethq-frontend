import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Sparkles } from 'lucide-react';
import { getEntitlements } from '@/api/billing';

/**
 * A slim, always-visible nudge while a company is inside its free-trial window —
 * the conversion moment. Silent (renders nothing) once the trial ends or a
 * subscription is active. Reads the un-gated entitlements endpoint.
 */
export function TrialBanner() {
  const { data } = useQuery({ queryKey: ['billing-entitlements'], queryFn: getEntitlements, staleTime: 5 * 60_000 });
  if (!data?.trialActive) return null;

  const days = data.trialDaysLeft ?? 0;
  return (
    <Link
      to="/billing"
      className="flex items-center justify-center gap-2 border-b border-accent-500/30 bg-accent-500/10 px-4 py-1.5 text-center text-xs text-(--text-secondary) transition-colors hover:bg-accent-500/15"
    >
      <Sparkles className="h-3.5 w-3.5 text-accent-500" />
      <span>
        <span className="font-medium text-(--text-primary)">{days} day{days === 1 ? '' : 's'} left</span> in your free
        trial — choose a plan to keep every feature.
      </span>
      <span className="font-medium text-accent-600 underline">View plans</span>
    </Link>
  );
}
