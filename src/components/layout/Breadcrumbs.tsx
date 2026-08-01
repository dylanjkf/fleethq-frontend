import { Link, useLocation } from 'react-router';
import { ChevronRight, Home } from 'lucide-react';
import { findNavItemByPath } from '@/app/navigation';

interface Crumb {
  label: string;
  to?: string;
}

function titleCase(segment: string): string {
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Contextual breadcrumb trail derived from the route. Known top-level pages
 * show their nav group + page name; deeper/detail routes fall back to
 * title-cased path segments so a user is never without an anchor. The trail is
 * an ARIA breadcrumb landmark for assistive tech.
 */
export function Breadcrumbs() {
  const { pathname } = useLocation();

  if (pathname === '/') {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Home className="h-3.5 w-3.5 text-(--text-tertiary)" aria-hidden />
        <span className="font-medium text-(--text-primary)">Dashboard</span>
      </nav>
    );
  }

  const navItem = findNavItemByPath(pathname);
  const segments = pathname.split('/').filter(Boolean);

  let crumbs: Crumb[];
  if (navItem && segments.length === 1) {
    crumbs = [{ label: navItem.group }, { label: navItem.label }];
  } else {
    crumbs = segments.map((seg, i) => {
      const to = '/' + segments.slice(0, i + 1).join('/');
      const known = findNavItemByPath(to);
      return {
        label: known?.label ?? titleCase(seg),
        to: i < segments.length - 1 ? to : undefined,
      };
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link
        to="/"
        className="flex items-center text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
        aria-label="Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-(--text-tertiary)" aria-hidden />
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                className="truncate text-(--text-secondary) transition-colors hover:text-(--text-primary)"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className="truncate font-medium text-(--text-primary)"
                aria-current={isLast ? 'page' : undefined}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
