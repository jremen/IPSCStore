export interface AuditEntry {
  id: string;
  actor_role: string;
  actor_token_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  ip: string | null;
  at: string;        // ISO timestamp
  meta: Record<string, any> | null;
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}
