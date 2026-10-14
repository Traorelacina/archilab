import api from './client';

export type FactureType =
  | 'proforma'
  | 'acompte'
  | 'definitive'
  | 'avoir'
  | string;

export interface FactureClient {
  id: number;
  nom?: string | null;
  prenoms?: string | null;
  raison_sociale?: string | null;
  type?: string | null;
}

export interface FactureCommande {
  id: number;
  numero: string;
  statut?: string | null;
  montant_ttc?: number | null;
  client_id?: number | null;

  lignes?: Array<{
    id: number;
    designation?: string | null;
    quantite?: number | null;
    prix_unitaire?: number | null;
    montant?: number | null;
  }>;
}

export interface FacturePaiement {
  id: number;
  montant?: number | null;
  mode?: string | null;
  moyen?: string | null;
  statut?: string | null;
  reference?: string | null;
  reference_externe?: string | null;
  date_paiement?: string | null;
  created_at?: string | null;
}

export interface FactureOrigine {
  id: number;
  numero: string;
}

export interface AdminFacture {
  id: number;
  numero: string;
  type: FactureType;
  statut?: string | null;

  client_id?: number | null;
  commande_id?: number | null;
  origine_id?: number | null;

  date_emission?: string | null;
  date_echeance?: string | null;

  montant_ht?: number | null;
  tva?: number | null;
  montant_ttc?: number | null;
  montant_paye?: number | null;
  montant_regle?: number | null;
  solde?: number | null;

  motif?: string | null;
  notes?: string | null;
  chemin_pdf?: string | null;

  client?: FactureClient | null;
  commande?: FactureCommande | null;
  paiements?: FacturePaiement[];
  origine?: FactureOrigine | null;

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

export interface FactureFilters {
  page?: number;
  per_page?: number;
  statut?: string;
  type?: string;
  recherche?: string;
}

export interface GenererFacturePayload {
  type:
    | 'proforma'
    | 'acompte'
    | 'definitive';
  montant?: number | null;
}

export interface GenererAvoirPayload {
  montant?: number | null;
  motif: string;
}

export interface CommandeLookup {
  id: number;
  numero: string;
  statut?: string | null;
  montant_ttc?: number | null;
  client?: FactureClient | null;
}

export const adminFacturesApi = {
  factures: (
    params?: FactureFilters,
  ) =>
    api.get<
      LaravelPaginator<AdminFacture>
    >(
      '/admin/factures',
      { params },
    ),

  facture: (
    id: number,
  ) =>
    api.get<AdminFacture>(
      `/admin/factures/${id}`,
    ),

  genererFacture: (
    commandeId: number,
    data: GenererFacturePayload,
  ) =>
    api.post<{
      message: string;
      facture: AdminFacture;
    }>(
      `/admin/commandes/${commandeId}/factures`,
      data,
    ),

  genererAvoir: (
    factureId: number,
    data: GenererAvoirPayload,
  ) =>
    api.post<{
      message: string;
      facture: AdminFacture;
    }>(
      `/admin/factures/${factureId}/avoir`,
      data,
    ),

  /**
   * GET /admin/factures/{facture}/pdf
   */
  pdf: (
    id: number,
  ) =>
    api.get<Blob>(
      `/admin/factures/${id}/pdf`,
      {
        responseType: 'blob',
      },
    ),

  commandes: (
    params?: {
      page?: number;
      per_page?: number;
      recherche?: string;
      statut?: string;
    },
  ) =>
    api.get<
      LaravelPaginator<CommandeLookup>
    >(
      '/admin/factures/commandes-disponibles',
      { params },
    ),
};
