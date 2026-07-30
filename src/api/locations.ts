import { apiClient } from './client';

export interface FleetLocation {
  operatorId: string;
  fullName: string;
  lat: number;
  lng: number;
  lastLocationAt: string;
  /** Whether the operator currently has an ACTIVE shift. */
  onShift?: boolean;
  /** The operator's soonest-scheduled ASSIGNED job, if any. */
  activeJob?: { id: string; title: string } | null;
  /** The road unit (asset) on that job — how the live map labels the marker. */
  unit?: { id: string; name: string } | null;
}

/**
 * The fleet's last-known live positions — used by the dispatch board's
 * "where is my driver now" panel and the dedicated Live Map page. Positions
 * older than the server's live window are already excluded server-side.
 */
export async function getFleetLocations(): Promise<{ items: FleetLocation[] }> {
  const { data } = await apiClient.get<{ items: FleetLocation[] }>('/v1/locations');
  return data;
}
