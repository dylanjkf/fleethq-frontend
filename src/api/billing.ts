import { apiClient } from './client';
import type { BillingStatus } from './types';

export async function getBillingStatus(): Promise<BillingStatus> {
  const { data } = await apiClient.get<BillingStatus>('/v1/billing/status');
  return data;
}

export interface Entitlements {
  planKey: string;
  planName: string;
  enforced: boolean;
  features: string[];
  limits: { maxOperators: number | null; maxAssets: number | null };
  trialEndsAt: string | null;
  trialActive: boolean;
  trialDaysLeft: number | null;
}

export async function getEntitlements(): Promise<Entitlements> {
  const { data } = await apiClient.get<Entitlements>('/v1/billing/entitlements');
  return data;
}

export interface PlanOption {
  key: string;
  name: string;
  features: string[];
  limits: { maxOperators: number | null; maxAssets: number | null };
  priceId: string | null;
  purchasable: boolean;
}

export async function getPlans(): Promise<{ billingConfigured: boolean; plans: PlanOption[] }> {
  const { data } = await apiClient.get<{ billingConfigured: boolean; plans: PlanOption[] }>('/v1/billing/plans');
  return data;
}

export async function createCheckoutSession(priceId: string): Promise<{ url: string }> {
  const { data } = await apiClient.post<{ url: string }>('/v1/billing/checkout-session', {
    priceId,
    successUrl: `${window.location.origin}/billing?checkout=success`,
    cancelUrl: `${window.location.origin}/billing?checkout=cancelled`,
  });
  return data;
}

export async function createPortalSession(): Promise<{ url: string }> {
  const { data } = await apiClient.post<{ url: string }>('/v1/billing/portal-session', {
    returnUrl: `${window.location.origin}/billing`,
  });
  return data;
}
