import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Catch-all for unknown URLs (stale bookmarks, mistyped paths, old deep
 * links) — a branded, calm dead-end instead of React Router's raw error page.
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-500/10">
        <Compass className="h-7 w-7 text-accent-500" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-(--text-primary)">Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-(--text-tertiary)">
          The page you're after doesn't exist or may have moved. Let's get you back to your dashboard.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
