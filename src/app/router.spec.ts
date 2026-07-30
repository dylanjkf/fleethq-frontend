import { describe, expect, it } from 'vitest';
import type { RouteObject } from 'react-router';
import { routes } from './router';
import { NAV_ITEMS } from './navigation';

/** Every concrete path in the tree, flattened. Wildcards are excluded. */
function collectPaths(tree: RouteObject[]): string[] {
  return tree.flatMap((route) => [
    ...(route.path && route.path !== '*' ? [route.path] : []),
    ...(route.children ? collectPaths(route.children) : []),
  ]);
}

const declaredPaths = collectPaths(routes);

describe('route table', () => {
  /**
   * The bug this exists to catch: a sidebar entry is added and the route isn't,
   * so the link 404s. Nothing in the type system connects the two lists, and
   * it's the customer who finds out. (It nearly happened adding /fuel.)
   */
  it('has a declared route for every sidebar entry', () => {
    const missing = NAV_ITEMS.filter((item) => item.status === 'active' && !declaredPaths.includes(item.path)).map(
      (item) => `${item.label} → ${item.path}`,
    );
    expect(missing).toEqual([]);
  });

  it('declares no duplicate paths', () => {
    const seen = new Set<string>();
    const duplicates = declaredPaths.filter((path) => (seen.has(path) ? true : (seen.add(path), false)));
    expect(duplicates).toEqual([]);
  });

  it('gives every route something to render', () => {
    // A layout route legitimately has no path, but a route with neither an
    // element nor children renders nothing and is always a mistake.
    const walk = (tree: RouteObject[]): string[] =>
      tree.flatMap((route) => [
        ...(route.element || route.children ? [] : [route.path ?? '(layout route)']),
        ...(route.children ? walk(route.children) : []),
      ]);
    expect(walk(routes)).toEqual([]);
  });

  it('keeps the authenticated shell behind the protected layout', () => {
    // A dashboard route sitting at the top level would be reachable without a
    // session. Every path except the auth pages must be nested inside a layout.
    const publicPaths = routes.filter((r) => r.path).map((r) => r.path);
    expect(publicPaths.sort()).toEqual(
      ['/forgot-password', '/login', '/reset-password', '/signup', '/verify-email'].sort(),
    );
  });
});
