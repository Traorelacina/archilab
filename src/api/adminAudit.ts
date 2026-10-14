import api from './client';

export interface AuditUser {
  id: number;
  name: string;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;

  action: string;
  entite: string;
  entite_id?: number | string | null;

  avant?: unknown;
  apres?: unknown;

  ip_address?: string | null;
  user_agent?: string | null;

  user?: AuditUser | null;

  created_at: string;
  updated_at?: string;
}

export interface LaravelPaginator<T> {
  current_page: number;
  data: T[];
  from?: number | null;
  last_page: number;
  per_page: number;
  to?: number | null;
  total: number;
  next_page_url?: string | null;
  prev_page_url?: string | null;
}

export interface AuditFilters {
  page?: number;
  per_page?: number;
  entite?: string;
  action?: string;
  user_id?: number;
  du?: string;
  au?: string;
}

export const adminAuditApi = {
  /**
   * GET /admin/audit
   */
  logs: (params?: AuditFilters) =>
    api.get<LaravelPaginator<AuditLog>>(
      '/admin/audit',
      { params },
    ),
};
