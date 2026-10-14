import api from './client';

export interface ReversementPartenaire {
  id: number;
  raison_sociale: string;
}

export interface ReversementRow {
  id: number;
  numero: string;
  partenaire_id: number;
  periode_debut: string;
  periode_fin: string;
  montant_brut: number;
  commission: number;
  montant_net: number;
  statut: 'en_attente' | 'verse';
  date_versement?: string | null;
  mode_versement?: string | null;
  reference_versement?: string | null;
  created_at: string;
  partenaire?: ReversementPartenaire | null;
  lignes?: Array<{
    id: number;
    montant_vente: number;
    commission: number;
    montant_net: number;
    commande_ligne?: {
      designation?: string | null;
      quantite?: number;
      commande?: { numero: string };
    } | null;
  }>;
}

export interface ReversementPaginator {
  data: ReversementRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const adminReversementsApi = {
  list: (params?: { page?: number; per_page?: number; statut?: string }) =>
    api.get<ReversementPaginator>('/admin/reversements', { params }),
  partenaires: () =>
    api.get<ReversementPartenaire[]>('/admin/reversements/partenaires'),
  detail: (id: number) =>
    api.get<ReversementRow>(`/admin/reversements/${id}`),
  generer: (data: { partenaire_id: number; periode_debut: string; periode_fin: string }) =>
    api.post<{ message: string; reversement: ReversementRow }>('/admin/reversements/generer', data),
  verser: (id: number, data: { mode_versement: string; reference_versement?: string; date_versement: string }) =>
    api.post<{ message: string; reversement: ReversementRow }>(`/admin/reversements/${id}/verser`, data),
};
