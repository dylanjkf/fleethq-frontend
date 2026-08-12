import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FormBuilderDialog } from './FormBuilderDialog';

// The builder embeds a DocumentPicker that fetches; a stubbed client keeps it
// idle (this test doesn't touch the reference-document field).
vi.mock('@/api/documents', () => ({ listDocuments: vi.fn().mockResolvedValue({ items: [] }) }));

/**
 * Configurable POD (item 3, office half): the form builder must offer the new
 * `photo`/`signature` field types and let an admin designate a template as the
 * delivery-confirmation (DELIVERY / POD) evidence set. This proves the builder
 * surfaces those choices and hands the API a template carrying them.
 */

// Radix Select relies on Pointer Capture, scrollIntoView and ResizeObserver,
// none of which jsdom provides.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

function renderBuilder(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <FormBuilderDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} isSubmitting={false} />
    </QueryClientProvider>,
  );
  return onSubmit;
}

// Radix Select triggers expose no accessible name, and a native <select> in the
// embedded DocumentPicker is also a combobox — so locate each Select by the
// value it currently displays rather than by list position.
function comboboxShowing(text: string): HTMLElement {
  const match = screen.getAllByRole('combobox').find((c) => c.textContent === text);
  if (!match) throw new Error(`No combobox currently showing "${text}"`);
  return match;
}

describe('FormBuilderDialog — POD field types and delivery target', () => {
  it('offers the DELIVERY target context', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(comboboxShowing('DriverOS and FleetHQ')); // "Assigned to", default BOTH
    expect(await screen.findByRole('option', { name: 'Delivery confirmation (POD)' })).toBeInTheDocument();
  });

  it('offers photo and signature field types', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(comboboxShowing('Text')); // the first field's type picker, default Text
    expect(await screen.findByRole('option', { name: 'Photo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Signature' })).toBeInTheDocument();
  });

  it('builds a DELIVERY template with a required photo field and submits it to the API', async () => {
    const user = userEvent.setup();
    const onSubmit = renderBuilder();

    await user.type(screen.getByPlaceholderText('e.g. Incident Report'), 'Proof of delivery');

    // Designate it as the delivery-confirmation (POD) template.
    await user.click(comboboxShowing('DriverOS and FleetHQ'));
    await user.click(await screen.findByRole('option', { name: 'Delivery confirmation (POD)' }));

    // Give the single field a label and make it a photo.
    await user.type(screen.getByPlaceholderText('Field label'), 'Delivery photo');
    await user.click(comboboxShowing('Text'));
    await user.click(await screen.findByRole('option', { name: 'Photo' }));

    // Mark it required.
    await user.click(within(screen.getByText('Required').closest('label')!).getByRole('checkbox'));

    await user.click(screen.getByRole('button', { name: 'Create template' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.targetContext).toBe('DELIVERY');
    expect(payload.fields).toHaveLength(1);
    expect(payload.fields[0]).toMatchObject({ label: 'Delivery photo', type: 'photo', required: true, options: null });
  });
});
