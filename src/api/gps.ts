import { apiClient } from './client';

export interface GpsDevice {
  id: string;
  name: string;
  provider: string | null;
  asset: { id: string; name: string } | null;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationAt: string | null;
}

export interface GpsAssetPosition {
  deviceId: string;
  deviceName: string;
  asset: { id: string; name: string } | null;
  lat: number;
  lng: number;
  lastLocationAt: string;
}

export async function listGpsDevices(): Promise<{ items: GpsDevice[] }> {
  const { data } = await apiClient.get('/v1/gps/devices');
  return data;
}
export async function registerGpsDevice(input: { name: string; provider?: string; assetId?: string }): Promise<{ id: string; name: string; deviceKey: string }> {
  const { data } = await apiClient.post('/v1/gps/devices', input);
  return data;
}
export async function updateGpsDevice(id: string, input: { name?: string; provider?: string; assetId?: string | null }): Promise<GpsDevice> {
  const { data } = await apiClient.patch(`/v1/gps/devices/${id}`, input);
  return data;
}
export async function rotateGpsDeviceKey(id: string): Promise<{ id: string; deviceKey: string }> {
  const { data } = await apiClient.post(`/v1/gps/devices/${id}/rotate-key`);
  return data;
}
export async function archiveGpsDevice(id: string): Promise<{ id: string }> {
  const { data } = await apiClient.post(`/v1/gps/devices/${id}/archive`);
  return data;
}
export async function getGpsPositions(): Promise<{ items: GpsAssetPosition[] }> {
  const { data } = await apiClient.get('/v1/gps/positions');
  return data;
}
