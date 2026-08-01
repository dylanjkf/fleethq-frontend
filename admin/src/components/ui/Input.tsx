import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-lg border border-(--border-subtle) bg-(--surface-1) px-3 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus-visible:border-accent-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-(--border-subtle) bg-(--surface-1) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus-visible:border-accent-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', ...props }: import('react').SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-10 w-full rounded-lg border border-(--border-subtle) bg-(--surface-1) px-3 text-sm text-(--text-primary) focus-visible:border-accent-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 ${className}`}
      {...props}
    />
  );
}
