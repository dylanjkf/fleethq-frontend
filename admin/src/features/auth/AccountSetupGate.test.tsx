import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AccountSetupGate } from '@/features/auth/AccountSetupGate';
import { AuthWrapper, makeAuth, makeAdmin } from '@/test/auth';

/**
 * C1 — forced-setup security gate. The server 403s every permissioned request
 * (ADMIN_SETUP_REQUIRED) until the admin clears their obligations, so if this
 * gate silently fell through it would drop an under-provisioned admin straight
 * into the console. These prove the console content is *not* rendered while an
 * obligation is outstanding.
 */
describe('AccountSetupGate (forced account-setup gate)', () => {
  it('blocks the console while a password reset is owed', () => {
    const value = makeAuth({ admin: makeAdmin({ obligations: { passwordReset: true, mfaEnrollment: false } }) });
    render(
      <AuthWrapper value={value}>
        <AccountSetupGate><div>CONSOLE CONTENT</div></AccountSetupGate>
      </AuthWrapper>,
    );

    expect(screen.queryByText('CONSOLE CONTENT')).not.toBeInTheDocument();
    expect(screen.getByText(/Finish setting up your account/i)).toBeInTheDocument();
    expect(screen.getByText(/Change your temporary password/i)).toBeInTheDocument();
  });

  it('blocks the console while MFA enrolment is owed', () => {
    const value = makeAuth({ admin: makeAdmin({ obligations: { passwordReset: false, mfaEnrollment: true } }) });
    render(
      <AuthWrapper value={value}>
        <AccountSetupGate><div>CONSOLE CONTENT</div></AccountSetupGate>
      </AuthWrapper>,
    );

    expect(screen.queryByText('CONSOLE CONTENT')).not.toBeInTheDocument();
    expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
  });

  it('renders the console once both obligations are clear', () => {
    const value = makeAuth({ admin: makeAdmin({ obligations: { passwordReset: false, mfaEnrollment: false } }) });
    render(
      <AuthWrapper value={value}>
        <AccountSetupGate><div>CONSOLE CONTENT</div></AccountSetupGate>
      </AuthWrapper>,
    );
    expect(screen.getByText('CONSOLE CONTENT')).toBeInTheDocument();
  });
});
