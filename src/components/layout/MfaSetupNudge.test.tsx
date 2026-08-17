import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthProvider';
import { MfaSetupNudge } from './MfaSetupNudge';
import type { CurrentUser } from '@/api/types';

/**
 * Part 9 coverage for the post-signup MFA nudge: it reflects the real
 * mfaEnabled / mfaRequiredByCompany fields, is dismissible and non-blocking, and
 * remembers its dismissal PER USER (a regression guard — the dismissal key was
 * briefly built from a non-existent `user.id`, so it wasn't per-user at all).
 */
function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    userId: 'u1',
    username: 'test',
    fullName: 'Test User',
    company: { id: 'c1', name: 'Test Co', jurisdiction: 'AU' },
    membershipId: 'm1',
    role: { id: 'r1', name: 'Role' },
    permissions: [],
    mfaEnabled: false,
    mfaRequiredByCompany: false,
    operator: null,
    ...overrides,
  };
}

function renderNudge(user: CurrentUser | null) {
  const value = { status: user ? 'authenticated' : 'unauthenticated', user } as unknown as AuthContextValue;
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <MfaSetupNudge />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const NUDGE = /Add an extra layer of security/;

describe('MfaSetupNudge (Part 9)', () => {
  beforeEach(() => localStorage.clear());

  it('nudges a user who has neither enabled nor company-mandated MFA', () => {
    renderNudge(makeUser());
    expect(screen.getByText(NUDGE)).toBeInTheDocument();
    // Non-blocking: it is a status banner, not a modal/gate.
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up' })).toHaveAttribute('href', '/profile');
  });

  it('renders nothing when MFA is already enabled', () => {
    const { container } = renderNudge(makeUser({ mfaEnabled: true }));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the company mandates MFA (the login flow handles that case)', () => {
    const { container } = renderNudge(makeUser({ mfaRequiredByCompany: true }));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is no signed-in user', () => {
    const { container } = renderNudge(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('is dismissible and stays dismissed on the next mount — per user', async () => {
    const user = userEvent.setup();
    const r1 = renderNudge(makeUser());
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByText(NUDGE)).not.toBeInTheDocument();
    r1.unmount();

    // Same user, fresh mount → still dismissed (persisted).
    const r2 = renderNudge(makeUser());
    expect(screen.queryByText(NUDGE)).not.toBeInTheDocument();
    r2.unmount();

    // A DIFFERENT user is still nudged — dismissal is keyed per user, not global.
    renderNudge(makeUser({ userId: 'u2' }));
    expect(screen.getByText(NUDGE)).toBeInTheDocument();
  });

  it('"Set up" also dismisses so it does not nag after the user has acted', async () => {
    const user = userEvent.setup();
    renderNudge(makeUser());
    await user.click(screen.getByRole('link', { name: 'Set up' }));
    expect(localStorage.getItem('fleethq.mfaNudgeDismissed.u1')).toBe('1');
  });
});
