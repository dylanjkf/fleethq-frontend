import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import { listOperators } from '@/api/operators';
import { broadcastMessage, getMessageThread, sendMessage } from '@/api/messages';
import { ApiClientError } from '@/api/client';
import type { Operator } from '@/api/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * DriverOS messaging v0 (04-DriverOS/DriverOS_Overview.md), office side: pick an
 * operator and read/answer their thread, or broadcast one message to every
 * operator at once. The operator's own DriverOS app is the other end of the
 * same thread. Scoped down alongside the DriverOS slice — no attachments or
 * read receipts.
 */
export function MessagesPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Operator | undefined>();
  const [draft, setDraft] = useState('');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const operatorsQuery = useQuery({
    queryKey: ['operators', 'list', 'for-messages'],
    queryFn: () => listOperators({ pageSize: 200 }),
  });
  const operators = (operatorsQuery.data?.items ?? []).filter((o) => !o.archivedAt);

  const threadQuery = useQuery({
    queryKey: ['messages-thread', selected?.id],
    queryFn: () => getMessageThread(selected!.id),
    enabled: !!selected,
    refetchInterval: 20_000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendMessage(selected!.id, body),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['messages-thread', selected?.id] });
    },
    onError: (err) =>
      toast({
        title: 'Could not send',
        description: err instanceof ApiClientError ? err.message : 'Try again.',
        variant: 'destructive',
      }),
  });

  const broadcastMutation = useMutation({
    mutationFn: (body: string) => broadcastMessage(body),
    onSuccess: (res) => {
      setBroadcastDraft('');
      setBroadcastOpen(false);
      queryClient.invalidateQueries({ queryKey: ['messages-thread'] });
      toast({ title: `Sent to ${res.sent} operator${res.sent === 1 ? '' : 's'}`, variant: 'success' });
    },
    onError: (err) =>
      toast({
        title: 'Could not send broadcast',
        description: err instanceof ApiClientError ? err.message : 'Try again.',
        variant: 'destructive',
      }),
  });

  const messages = threadQuery.data?.items ?? [];
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (body && selected) sendMutation.mutate(body);
  }

  function handleBroadcast(e: FormEvent) {
    e.preventDefault();
    const body = broadcastDraft.trim();
    if (body) broadcastMutation.mutate(body);
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Messages</PanelTitle>
          <PanelDescription>Message operators directly — the other end is their DriverOS app.</PanelDescription>
        </div>
        {can(PERMISSIONS.MESSAGES_BROADCAST) && (
          <Button variant="secondary" onClick={() => setBroadcastOpen((o) => !o)}>
            <Send className="h-4 w-4" /> Message all
          </Button>
        )}
      </PanelHeader>

      {can(PERMISSIONS.MESSAGES_BROADCAST) && broadcastOpen && (
        <form
          onSubmit={handleBroadcast}
          className="mb-4 space-y-2 rounded-lg border border-accent-500/40 bg-accent-500/5 p-3"
        >
          <p className="text-sm font-medium text-(--text-primary)">Message all operators</p>
          <p className="text-xs text-(--text-tertiary)">
            Goes into every operator's thread at once — each driver sees it as a normal message from the office.
          </p>
          <textarea
            className="max-h-40 min-h-16 w-full resize-none rounded-lg border border-(--border-subtle) bg-(--surface-1) px-3 py-2 text-sm"
            placeholder="Type a message for the whole team…"
            rows={2}
            value={broadcastDraft}
            onChange={(e) => setBroadcastDraft(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setBroadcastOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!broadcastDraft.trim() || broadcastMutation.isPending}>
              Send to all
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <div className="flex max-h-[560px] flex-col gap-1 overflow-y-auto rounded-lg border border-(--border-subtle) p-2">
          {operatorsQuery.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
          ) : operatorsQuery.isError ? (
            <ErrorState message={describeApiError(operatorsQuery.error)} onRetry={() => operatorsQuery.refetch()} />
          ) : operators.length === 0 ? (
            <p className="p-3 text-sm text-(--text-tertiary)">No operators yet.</p>
          ) : (
            operators.map((op) => (
              <button
                key={op.id}
                onClick={() => setSelected(op)}
                className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selected?.id === op.id
                    ? 'bg-accent-500/12 font-semibold text-(--text-primary)'
                    : 'text-(--text-secondary) hover:bg-(--surface-2)'
                }`}
              >
                {op.fullName}
                {!op.userId && <span className="ml-2 text-xs text-(--text-tertiary)">no login</span>}
              </button>
            ))
          )}
        </div>

        <div className="flex min-h-[420px] flex-col rounded-lg border border-(--border-subtle)">
          {!selected ? (
            <EmptyState
              icon={MessageSquare}
              title="Pick an operator"
              description="Choose an operator on the left to read and answer their thread."
            />
          ) : (
            <>
              <div className="border-b border-(--border-subtle) px-4 py-3">
                <p className="font-semibold">{selected.fullName}</p>
              </div>
              <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
                {threadQuery.isLoading ? (
                  <>
                    <div className="flex justify-start">
                      <Skeleton className="h-10 w-2/3 rounded-2xl" />
                    </div>
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-1/2 rounded-2xl" />
                    </div>
                    <div className="flex justify-start">
                      <Skeleton className="h-12 w-3/4 rounded-2xl" />
                    </div>
                  </>
                ) : threadQuery.isError ? (
                  <ErrorState message={describeApiError(threadQuery.error)} onRetry={() => threadQuery.refetch()} />
                ) : messages.length === 0 ? (
                  <p className="text-sm text-(--text-secondary)">No messages yet. Start the conversation below.</p>
                ) : (
                  messages.map((m) => {
                    const fromOffice = m.senderType === 'OFFICE';
                    return (
                      <div key={m.id} className={`flex ${fromOffice ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                            fromOffice
                              ? 'bg-accent-600 text-white'
                              : 'bg-(--surface-2) text-(--text-primary)'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-snug">{m.body}</p>
                          <p className={`mt-1 text-[11px] ${fromOffice ? 'text-white/70' : 'text-(--text-tertiary)'}`}>
                            {fromOffice ? m.senderUser?.fullName ?? 'Office' : selected.fullName} ·{' '}
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>
              {can(PERMISSIONS.MESSAGES_SEND) && (
                <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-(--border-subtle) p-3">
                  <textarea
                    className="max-h-28 min-h-11 flex-1 resize-none rounded-lg border border-(--border-subtle) bg-(--surface-1) px-3 py-2 text-sm"
                    placeholder={`Message ${selected.fullName.split(' ')[0]}…`}
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Button type="submit" disabled={!draft.trim() || sendMutation.isPending}>
                    Send
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
