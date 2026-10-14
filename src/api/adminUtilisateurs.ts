import api from './client';

export type RoleBackoffice =
  | 'super_admin'
  | 'gestionnaire_catalogue'
  | 'gestionnaire_stock'
  | 'comptable'
  | 'commercial';

export interface UtilisateurRole {
  id: number;
  name: RoleBackoffice | string;
}

export interface AdminUtilisateur {
  id: number;
  name: string;
  email: string;
  telephone?: string | null;
  actif?: boolean;
  roles?: UtilisateurRole[];
  created_at?: string;
  updated_at?: string;
}

export interface LaravelPaginator<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface UtilisateurFilters {
  page?: number;
  per_page?: number;
  recherche?: string;
}

export interface CreateUtilisateurPayload {
  name: string;
  email: string;
  telephone?: string | null;
  password: string;
  role: RoleBackoffice;
}

export interface UpdateUtilisateurPayload {
  name?: string;
  telephone?: string | null;
  password?: string | null;
  role?: RoleBackoffice;
  actif?: boolean;
}

export const adminUtilisateursApi = {
  utilisateurs: (params?: UtilisateurFilters) =>
    api.get<LaravelPaginator<AdminUtilisateur>>('/admin/utilisateurs', { params }),

  utilisateur: (id: number) =>
    api.get<AdminUtilisateur>(`/admin/utilisateurs/${id}`),

  createUtilisateur: (data: CreateUtilisateurPayload) =>
    api.post<AdminUtilisateur>('/admin/utilisateurs', data),

  updateUtilisateur: (id: number, data: UpdateUtilisateurPayload) =>
    api.put<AdminUtilisateur>(`/admin/utilisateurs/${id}`, data),

  desactiverUtilisateur: (id: number) =>
    api.delete<{ message: string }>(`/admin/utilisateurs/${id}`),
};
