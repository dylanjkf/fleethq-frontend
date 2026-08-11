import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as billingApi from '@/api/billing';
import { BillingTab } from './BillingTab';

/**
 * C1 follow-up — the billing tab holds the highest-consequence, irreversible
 * actions in the admin console (they move real money in Stripe). These prove
 * the confirmation step actually gates each action: the API is NOT called when
 * the button is clicked, only after the ConfirmDialog is confirmed. A regression
 * that fired the mutation on the first click — or dropped the dialog — would
 * silently issue refunds/credit notes/cancellations.
 */
vi.mock('@/api/billing');
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BillingTab companyId="co-1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(billingApi.getBillingStatus).mockResolvedValue({
    billingConfigured: true,
    subscriptionStatus: 'active',
    hasStripeCustomer: true,
    hasStripeSubscription: true,
    stripe: { status: 'active', currentPeriodEnd: new Date('2030-01-01').toISOString(), cancelAtPeriodEnd: false },
  } as never);
  vi.mocked(billingApi.listInvoices).mockResolvedValue({ hasMore: false, items: [] } as never);
  vi.mocked(billingApi.refundInvoice).mockResolvedValue(undefined);
  vi.mocked(billingApi.issueCreditNote).mockResolvedValue(undefined);
  vi.mocked(billingApi.cancelSubscription).mockResolvedValue(undefined);
});

describe('BillingTab — irreversible actions require confirmation', () => {
  it('does not issue a refund until the confirmation dialog is confirmed', async () => {
    const user = userEvent.setup();
    renderTab();

    // Refund card is the first "Invoice ID" field once billing status loads.
    const invoiceInputs = await screen.findAllByPlaceholderText('Invoice ID');
    await user.type(invoiceInputs[0], 'inv_123');
    await user.click(screen.getByRole('button', { name: 'Issue refund' }));

    // Dialog open, nothing sent yet — a click alone must not move money.
    expect(billingApi.refundInvoice).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/moves real money and cannot be undone/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Issue refund' }));
    await waitFor(() => expect(billingApi.refundInvoice).toHaveBeenCalledWith('co-1', 'inv_123', undefined));
  });

  it('cancelling from the refund dialog sends nothing', async () => {
    const user = userEvent.setup();
    renderTab();
    const invoiceInputs = await screen.findAllByPlaceholderText('Invoice ID');
    await user.type(invoiceInputs[0], 'inv_123');
    await user.click(screen.getByRole('button', { name: 'Issue refund' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(billingApi.refundInvoice).not.toHaveBeenCalled();
  });

  it('does not issue a credit note until confirmed', async () => {
    const user = userEvent.setup();
    renderTab();
    const invoiceInputs = await screen.findAllByPlaceholderText('Invoice ID');
    // Order in the DOM: [0] refund, [1] credit note, [2] retry.
    await user.type(invoiceInputs[1], 'inv_777');
    // "Amount in cents" (exact) belongs to the manual-invoice and credit cards, in that order.
    const amountInputs = screen.getAllByPlaceholderText('Amount in cents');
    await user.type(amountInputs[1], '500');
    await user.click(screen.getByRole('button', { name: 'Issue credit note' }));

    expect(billingApi.issueCreditNote).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Issue credit note' }));
    await waitFor(() => expect(billingApi.issueCreditNote).toHaveBeenCalledWith('co-1', 'inv_777', 500));
  });

  it('does not cancel the subscription immediately until confirmed', async () => {
    const user = userEvent.setup();
    renderTab();
    await user.click(await screen.findByRole('button', { name: 'Cancel immediately' }));

    expect(billingApi.cancelSubscription).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel now' }));
    // atPeriodEnd === false — a hard, immediate cancellation.
    await waitFor(() => expect(billingApi.cancelSubscription).toHaveBeenCalledWith('co-1', false));
  });
});
