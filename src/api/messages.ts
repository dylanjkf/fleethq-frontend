import { apiClient } from './client';
import type { Message, MessageThread } from './types';

export async function getMessageThread(operatorId: string): Promise<MessageThread> {
  const { data } = await apiClient.get<MessageThread>('/v1/messages', { params: { operatorId } });
  return data;
}

export async function sendMessage(operatorId: string, body: string): Promise<Message> {
  const { data } = await apiClient.post<Message>('/v1/messages', { operatorId, body });
  return data;
}

/** Send one message into every active operator's thread at once. Returns how many were sent. */
export async function broadcastMessage(body: string): Promise<{ sent: number }> {
  const { data } = await apiClient.post<{ sent: number }>('/v1/messages/broadcast', { body });
  return data;
}
