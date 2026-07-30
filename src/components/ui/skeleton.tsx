import { cn } from '@/lib/cn';

/**
 * Loading state primitive — every list/detail view should show this, never a
 * blank screen. A directional shimmer (not a plain pulse) so loading reads as
 * motion toward content; falls back to pulse when reduced motion is preferred.
 * The keyframes live in index.css (`skeleton-shimmer`).
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-(--surface-2)',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[skeleton-shimmer_1.6s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-(--text-tertiary)/10 after:to-transparent',
        'motion-reduce:animate-pulse motion-reduce:after:hidden',
        className,
      )}
      {...props}
    />
  );
}
