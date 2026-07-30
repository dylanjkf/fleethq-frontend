import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { CommandPaletteProvider } from '@/app/providers/CommandPaletteProvider';
import { router } from '@/app/router';
import { Toaster } from '@/components/layout/Toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Serve cached data instantly on navigation and treat it as fresh for 30s;
      // the live views that need to be up-to-the-second set their own
      // refetchInterval (dispatch board, live map).
      staleTime: 30_000,
      // Keep unused data 5 min so returning to a screen paints from cache, not a
      // spinner. (Library default, made explicit alongside the tuning below.)
      gcTime: 5 * 60_000,
      // The office app polls the views that must stay live; a blanket refetch on
      // every window-focus just adds redundant load and UI flicker. Opt back in
      // per-query where it matters (DispatchPage does).
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <CommandPaletteProvider>
            <RouterProvider router={router} />
            <Toaster />
          </CommandPaletteProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
