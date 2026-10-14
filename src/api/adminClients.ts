import api from './client';

export type ClientType =
  | 'particulier'
  | 'professionnel';

export interface AdminClient {
  id: number;
  type: ClientType;

  nom: string;
  prenoms?: string | null;
  raison_sociale?: string | null;
  ncc?: string | null;

  telephone: string;
  email?: string | null;
  ville?: string | null;

  adresse_livraison?: string | null;
  adresse_facturation?: string | null;

  commandes_count?: number;

  commandes?: Array<{
    id: number;
    numero?: string | null;
    statut?: string | null;
    montant_ttc?: number | null;
    created_at?: string | null;
  }>;

  devis?: Array<{
    id: number;
    numero?: string | null;
    statut?: string | null;
    montant_ttc?: number | null;
    created_at?: string | null;
  }>;

  created_at?: string | null;
  updated_at?: string | null;
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

export interface ClientFilters {
  page?: number;
  per_page?: number;
  recherche?: string;
  type?: ClientType;
}

export interface ClientPayload {
  type: ClientType;
  nom: string;
  prenoms?: string | null;
  raison_sociale?: string | null;
  ncc?: string | null;
  telephone: string;
  email?: string | null;
  ville?: string | null;
  adresse_livraison?: string | null;
  adresse_facturation?: string | null;
}

export type UpdateClientPayload =
  Partial<ClientPayload>;

export const adminClientsApi = {
  clients: (
    params?: ClientFilters,
  ) =>
    api.get<
      LaravelPaginator<AdminClient>
    >(
      '/admin/clients',
      { params },
    ),

  client: (id: number) =>
    api.get<AdminClient>(
      `/admin/clients/${id}`,
    ),

  createClient: (
    data: ClientPayload,
  ) =>
    api.post<AdminClient>(
      '/admin/clients',
      data,
    ),

  updateClient: (
    id: number,
    data: UpdateClientPayload,
  ) =>
    api.put<AdminClient>(
      `/admin/clients/${id}`,
      data,
    ),

  deleteClient: (
    id: number,
  ) =>
    api.delete<{
      message: string;
    }>(
      `/admin/clients/${id}`,
    ),
};
