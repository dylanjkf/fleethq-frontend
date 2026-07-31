/**
 * A minimal, dependency-free OpenID Connect implicit-flow popup helper for
 * social login (Auth/Billing Platform Phase 2). Opens the provider's own
 * `/authorize` endpoint in a popup, requests only an `id_token` (this app
 * never needs an access token — the backend only verifies identity), and
 * resolves once the popup navigates back to our own origin.
 *
 * A `state` value is generated and checked to prevent a forged redirect from
 * being accepted (CSRF on the popup channel). This does not verify the
 * token's `nonce` claim client-side — the backend's own signature/issuer/
 * audience verification (OidcVerifierService) is what actually establishes
 * trust in the token; `state` here only protects the popup handoff itself.
 */
export interface OidcPopupOptions {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
}

export function signInWithOidcPopup({ authorizeUrl, clientId, redirectUri, scope = 'openid email profile' }: OidcPopupOptions): Promise<string> {
  const nonce = crypto.randomUUID();
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope,
    nonce,
    state,
    response_mode: 'fragment',
  });

  const popup = window.open(`${authorizeUrl}?${params.toString()}`, 'oidc-sign-in', 'width=480,height=640');
  if (!popup) {
    return Promise.reject(new Error('Could not open the sign-in window — check your browser’s popup blocker.'));
  }

  return new Promise<string>((resolve, reject) => {
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        reject(new Error('Sign-in was cancelled.'));
        return;
      }
      let href: string | null = null;
      try {
        // Throws while the popup is still on the provider's origin — expected, keep polling.
        href = popup.location.href;
      } catch {
        return;
      }
      if (!href || !href.startsWith(redirectUri)) return;

      clearInterval(interval);
      const fragment = new URLSearchParams(new URL(href).hash.slice(1));
      popup.close();
      if (fragment.get('state') !== state) {
        reject(new Error('Sign-in failed — the response did not match this request.'));
        return;
      }
      const idToken = fragment.get('id_token');
      const error = fragment.get('error_description') ?? fragment.get('error');
      if (!idToken) {
        reject(new Error(error ?? 'Sign-in did not return an identity token.'));
        return;
      }
      resolve(idToken);
    }, 300);
  });
}

export function googleAuthorizeUrl(): string {
  return 'https://accounts.google.com/o/oauth2/v2/auth';
}

export function microsoftAuthorizeUrl(tenant = 'common'): string {
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
}
