import { apiClient } from './client';
import type { TimelineEntityType } from './timeline';

export interface RelationshipItem {
  id: string;
  relationshipType: string;
  direction: 'outgoing' | 'incoming';
  otherType: TimelineEntityType;
  otherId: string;
  otherName: string;
  validFrom: string;
  validTo: string | null;
  isCurrent: boolean;
}

/** 01-Product/Fleet_Graph.md's read side. */
export async function listRelationships(entityType: TimelineEntityType, entityId: string): Promise<{ items: RelationshipItem[] }> {
  const { data } = await apiClient.get<{ items: RelationshipItem[] }>('/v1/graph/relationships', {
    params: { entityType, entityId },
  });
  return data;
}

export interface GraphSummary {
  currentCount: number;
  totalCount: number;
  linkedAssets: number;
  linkedOperators: number;
  byType: { relationshipType: string; current: number; total: number }[];
  topAssets: { assetId: string; assetName: string; connections: number }[];
}

/** Company-wide Fleet Graph roll-up for the dashboard widget. */
export async function getGraphSummary(): Promise<GraphSummary> {
  const { data } = await apiClient.get<GraphSummary>('/v1/graph/summary');
  return data;
}
