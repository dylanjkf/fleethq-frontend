import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { getSignupStatus } from '@/api/signup';

const POLL_INTERVAL_MS = 2_000;
const MAX_ATTEMPTS = 12; // ~24s before we fall back to "we'll email you"

type Phase = 'provisioning' | 'timeout' | 'error';

/**
 * Post-payment success page. Stripe redirects here with ?session_id=...; we poll
 * the server until the payment webhook has provisioned the account, then log the
 * new admin straight in (single-use token) and drop them into the dashboard.
 * Provisioning is only ever triggered by the verified webhook — this page only
 * observes and waits, never creates anything.
 */
export function SignupCompletePage() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('provisioning');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // StrictMode double-invokes effects in dev; guard so we poll once.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!sessionId) {
      setPhase('error');
      setErrorMsg('This link is missing its checkout reference.');
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      try {
        const result = await getSignupStatus(sessionId as string);
        if (cancelled) return;

        if (result.status === 'completed' && 'accessToken' in result) {
          await loginWithToken(result.accessToken);
          if (!cancelled) navigate('/', { replace: true });
          return;
        }
        if (result.status === 'completed') {
          // Already claimed elsewhere — the account exists; just sign in.
          navigate('/login', { replace: true });
          return;
        }
        if (result.status === 'expired' || result.status === 'not_found') {
          setPhase('error');
          setErrorMsg(result.status === 'expired' ? 'This signup link has expired.' : 'We couldn’t find this signup.');
          return;
        }
        // pending → keep waiting, or give up gracefully after the cap.
        if (attempts >= MAX_ATTEMPTS) {
          setPhase('timeout');
          return;
        }
        window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        // Transient error — retry within the attempt budget rather than failing hard.
        if (attempts >= MAX_ATTEMPTS) {
          setPhase('timeout');
          return;
        }
        window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, loginWithToken, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--surface-1) p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent-400 to-accent2-500 text-sm font-bold text-white shadow-sm">F</span>
          <span className="text-base font-semibold tracking-tight text-(--text-primary)">FleetHQ</span>
        </div>
        <Card className="w-full">
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle className="text-lg">
              {phase === 'provisioning' ? 'Setting up your account…' : phase === 'timeout' ? 'Almost there' : 'Something went wrong'}
            </CardTitle>
            <CardDescription>
              {phase === 'provisioning'
                ? 'Payment received. We’re creating your fleet — this only takes a moment.'
                : phase === 'timeout'
                  ? 'This is taking longer than usual.'
                  : (errorMsg ?? 'We couldn’t complete your signup.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {phase === 'provisioning' ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              </div>
            ) : phase === 'timeout' ? (
              <div className="space-y-4">
                <p className="text-sm text-(--text-secondary)">
                  Your payment succeeded and your account is being finalised. We’ll email you the moment it’s ready — you can
                  close this tab, or try signing in shortly.
                </p>
                <Link to="/login"><Button className="w-full">Go to sign in</Button></Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-(--text-secondary)">
                  If you were charged, your account will still be created and we’ll email you. Otherwise, you can start again.
                </p>
                <Link to="/signup"><Button className="w-full">Back to signup</Button></Link>
                <p className="text-center text-sm text-(--text-tertiary)">
                  Need a hand? <Link to="/contact" className="text-accent-600 hover:underline">Contact us</Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
