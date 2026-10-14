import api from './client';

export type StatutNumerisation =
  | 'a_numeriser'
  | 'en_cours'
  | 'en_validation'
  | 'publie';

export interface NumerisationPartenaire {
  id: number;
  raison_sociale: string;
}

export interface NumerisationProduit {
  id: number;
  nom: string;
  statut: string;
}

export interface NumerisationResponsable {
  id: number;
  name: string;
}

export interface DemandeNumerisation {
  id: number;
  partenaire_id: number;
  produit_id: number | null;
  responsable_id: number | null;

  nom_produit: string;
  description: string | null;
  statut: StatutNumerisation;

  echeance: string | null;
  commentaires_validation: string | null;

  partenaire?: NumerisationPartenaire | null;
  produit?: NumerisationProduit | null;
  responsable?: NumerisationResponsable | null;

  created_at?: string;
  updated_at?: string;
}

export interface NumerisationCreatePayload {
  partenaire_id: number;
  nom_produit: string;
  description?: string | null;
  responsable_id?: number | null;
  echeance?: string | null;
}

export interface NumerisationUpdatePayload {
  statut?: StatutNumerisation;
  produit_id?: number | null;
  responsable_id?: number | null;
  echeance?: string | null;
  commentaires_validation?: string | null;
}

export interface LaravelPaginator<T> {
  current_page: number;
  data: T[];
  first_page_url?: string | null;
  from?: number | null;
  last_page: number;
  last_page_url?: string | null;
  links?: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url?: string | null;
  path?: string;
  per_page: number;
  prev_page_url?: string | null;
  to?: number | null;
  total: number;
}

export interface NumerisationIndexResponse {
  demandes: LaravelPaginator<DemandeNumerisation>;
  statistiques: Partial<Record<StatutNumerisation, number | string>>;
}

export interface NumerisationFilters {
  page?: number;
  per_page?: number;
  statut?: StatutNumerisation | '';
  partenaire_id?: number;
}

export const adminNumerisationApi = {
  /**
   * GET /admin/numerisations
   */
  index: (params?: NumerisationFilters) =>
    api.get<NumerisationIndexResponse>('/admin/numerisations', {
      params,
    }),

  /**
   * POST /admin/numerisations
   */
  create: (data: NumerisationCreatePayload) =>
    api.post<DemandeNumerisation>('/admin/numerisations', data),

  /**
   * PUT /admin/numerisations/{demande}
   */
  update: (
    id: number,
    data: NumerisationUpdatePayload,
  ) =>
    api.put<DemandeNumerisation>(
      `/admin/numerisations/${id}`,
      data,
    ),
};
