import { describe, it, expect } from 'vitest';
import { passwordMeetsPolicy, passwordErrorMessage } from './password-policy';
import { ApiClientError } from '@/api/client';

describe('passwordMeetsPolicy (shared admin password policy — A6.6)', () => {
  it('requires 8+ chars AND all four character classes', () => {
    expect(passwordMeetsPolicy('Str0ngPass!')).toBe(true); // all four, ≥8
    expect(passwordMeetsPolicy('Short1!')).toBe(false); // <8
    expect(passwordMeetsPolicy('str0ngpass!')).toBe(false); // no uppercase
    expect(passwordMeetsPolicy('STR0NGPASS!')).toBe(false); // no lowercase
    expect(passwordMeetsPolicy('StrongPass!')).toBe(false); // no digit
    expect(passwordMeetsPolicy('Str0ngPass')).toBe(false); // no symbol (three classes)
  });
});

describe('passwordErrorMessage (shared, code-driven — A6.6)', () => {
  const err = (code: string) => new ApiClientError(400, code, 'raw');

  it('maps the known password failure codes to friendly copy', () => {
    expect(passwordErrorMessage(err('WEAK_PASSWORD'))).toMatch(/too weak/i);
    expect(passwordErrorMessage(err('PASSWORD_REUSED'))).toMatch(/reuse/i);
    expect(passwordErrorMessage(err('INVALID_TOKEN'))).toMatch(/invalid or has expired/i);
    // The change-password context surfaces the wrong-current-password code.
    expect(passwordErrorMessage(err('INVALID_CREDENTIALS'), 'change')).toMatch(/current password is incorrect/i);
  });

  it('falls back with context-appropriate wording for an unknown/non-API error', () => {
    expect(passwordErrorMessage(new Error('boom'), 'change')).toMatch(/could not change your password/i);
    expect(passwordErrorMessage(new Error('boom'), 'reset')).toMatch(/could not reset your password/i);
  });
});
