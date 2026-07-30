import { apiClient } from './client';

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

/** FleetHQ has no self-service signup/free trial — this is the public "get in touch" form. */
export async function submitContact(input: ContactInput): Promise<void> {
  await apiClient.post('/v1/contact', input);
}
