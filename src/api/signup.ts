import { apiClient } from './client';

/** Pricing/config for the signup page's live preview (authoritative price lives server-side). */
export interface SignupConfig {
  enabled: boolean;
  pricePerAssetCents: number;
  currency: string;
  billingInterval: string;
  gstRate: number;
}

export interface SignupPayload {
  companyName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  quantity: number;
  acceptedTerms: boolean;
  /** Honeypot — always empty for real users; a filled value is rejected server-side. */
  website?: string;
}

/** Result of polling GET /v1/signup/status while the payment webhook provisions the account. */
export type SignupStatusResult =
  | { status: 'not_found' }
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'completed'; alreadyClaimed: true }
  | { status: 'completed'; accessToken: string; company: { id: string; name: string } };

export async function getSignupConfig(): Promise<SignupConfig> {
  const { data } = await apiClient.get<SignupConfig>('/v1/signup/config');
  return data;
}

/** Starts a signup: returns the Stripe Checkout URL to redirect the browser to. No account exists until payment succeeds. */
export async function createSignup(payload: SignupPayload): Promise<{ url: string }> {
  const { data } = await apiClient.post<{ url: string }>('/v1/signup', payload);
  return data;
}

export async function getSignupStatus(sessionId: string): Promise<SignupStatusResult> {
  const { data } = await apiClient.get<SignupStatusResult>('/v1/signup/status', { params: { sessionId } });
  return data;
}
