import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SidebarNav } from './SidebarNav';

/**
 * The Warehouse module ships hidden behind the admin-managed `warehouse` feature
 * flag. These pin the nav's behaviour: Warehouse is absent while the flag is off
 * (or still loading — a hidden-by-default module must not flash), and appears the
 * moment the flag is on. A permission-only module (Fleet) is unaffected, proving
 * the flag gate is additive to the existing permission gate.
 */
const { canAnyMock, isEnabledMock } = vi.hoisted(() => ({
  canAnyMock: vi.fn(() => true),
  isEnabledMock: vi.fn((_key: string) => false),
}));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ canAny: canAnyMock, can: () => true, canAll: () => true, role: null }) }));
vi.mock('@/hooks/useFeatureFlags', () => ({ useFeatureFlags: () => ({ isLoading: false, flags: {}, isEnabled: isEnabledMock }) }));

function renderNav() {
  return render(
    <MemoryRouter>
      <SidebarNav />
    </MemoryRouter>,
  );
}

describe('SidebarNav warehouse feature flag', () => {
  beforeEach(() => {
    canAnyMock.mockReturnValue(true);
    isEnabledMock.mockReset();
  });

  it('hides Warehouse when the warehouse flag is off', () => {
    isEnabledMock.mockReturnValue(false);
    renderNav();
    expect(screen.queryByText('Warehouse')).not.toBeInTheDocument();
    // A permission-only module is still shown — the flag gate is additive.
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
  });

  it('shows Warehouse when the warehouse flag is on', () => {
    isEnabledMock.mockImplementation((key: string) => key === 'warehouse');
    renderNav();
    expect(screen.getByText('Warehouse')).toBeInTheDocument();
  });

  it('hides Warehouse even when the user holds the warehouse permission but the flag is off', () => {
    // canAny true for everything (user has warehouse:view) — the flag alone hides it.
    canAnyMock.mockReturnValue(true);
    isEnabledMock.mockReturnValue(false);
    renderNav();
    expect(screen.queryByText('Warehouse')).not.toBeInTheDocument();
  });
});
