import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-(--surface-1)">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
