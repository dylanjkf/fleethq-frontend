import { ApiClientError } from '@/api/client';

/**
 * The message to show a user for a failed request.
 *
 * This existed as a byte-identical private helper in 32 separate page
 * components. One copy means the fallback wording is consistent everywhere, and
 * improving it (say, special-casing offline or a 402) is one edit rather than
 * thirty-two.
 *
 * `ApiClientError.message` is the API's own `error.message`, which is written
 * for the person reading it. Anything else — a network failure, a bug in our own
 * code — has no message worth showing, so it gets the generic line rather than a
 * stack trace or "undefined".
 */
export function describeApiError(error: unknown): string {
  return error instanceof ApiClientError ? error.message : 'An unexpected error occurred.';
}
