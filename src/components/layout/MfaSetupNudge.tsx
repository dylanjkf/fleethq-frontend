import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/hooks/useAuth';

/**
 * Part 10: a LIGHT, DISMISSIBLE nudge to set up an authenticator app AFTER the
 * account exists. Authenticator setup is optional at signup — it never blocks or
 * gates anything. This just encourages it once, and only when the user hasn't
 * already enabled MFA. Dismissal is remembered per-user in localStorage so it
 * doesn't nag. It renders nothing (no nudge) when MFA is already on, when the
 * company mandates MFA (the login flow handles that case), or once dismissed.
 */
function dismissKey(userId: string): string {
  return `fleethq.mfaNudgeDismissed.${userId}`;
}

export function MfaSetupNudge() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    if (!user) return true;
    try {
      return localStorage.getItem(dismissKey(user.userId)) === '1';
    } catch {
      return false;
    }
  });

  if (!user || user.mfaEnabled || user.mfaRequiredByCompany || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(user.userId), '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-accent-200 bg-accent-50 px-4 py-2.5 text-sm text-accent-900 sm:px-6"
    >
      <span>
        <strong className="font-semibold">Add an extra layer of security.</strong> Set up an authenticator app so a leaked
        password alone can’t get into your account. It only takes a minute — and it’s optional.
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Link
          to="/profile"
          onClick={dismiss}
          className="rounded-md bg-accent-600 px-3 py-1.5 font-medium text-white transition-colors hover:bg-accent-700"
        >
          Set up
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md px-2 py-1.5 font-medium text-accent-800 transition-colors hover:bg-accent-100"
        >
          Not now
        </button>
      </span>
    </div>
  );
}
