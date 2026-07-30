import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Standard clsx+tailwind-merge combiner so conflicting Tailwind classes resolve predictably. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
