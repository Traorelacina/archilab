import api from './client';

export type DevisStatut = string;

export interface DevisClient {
  id: number;
  nom?: string | null;
  prenoms?: string | null;
  raison_sociale?: string | null;
  type?: string | null;
}

export interface DevisUser {
  id: number;
  name: string;
}

export interface DevisProduit {
  id: number;
  nom: string;
}

export interface DevisVariante {
  id: number;
  produit_id?: number;
  prix_vente?: number | null;
  prix_promo?: number | null;
  active?: boolean;
  produit?: DevisProduit | null;
}

export interface DevisLigne {
  id?: number;
  devis_id?: number;
  variante_id?: number | null;
  designation: string;
  quantite: number;
  prix_unitaire: number;
  montant?: number;
  variante?: DevisVariante | null;
}

export interface DevisCommande {
  id: number;
  numero: string;
  statut: string;
}

export interface AdminDevis {
  id: number;
  numero: string;
  client_id: number;
  user_id?: number | null;
  statut: DevisStatut;
  date_validite?: string | null;
  remise?: number | null;
  notes?: string | null;
  montant_ht?: number | null;
  tva?: number | null;
  montant_ttc?: number | null;

  client?: DevisClient | null;
  user?: DevisUser | null;
  lignes?: DevisLigne[];
  commande?: DevisCommande | null;

  created_at?: string;
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

export interface DevisFilters {
  page?: number;
  per_page?: number;
  statut?: string;
  recherche?: string;
}

export interface SaveDevisPayload {
  client_id: number;
  date_validite?: string | null;
  remise?: number | null;
  notes?: string | null;
  lignes: Array<{
    variante_id?: number | null;
    designation: string;
    quantite: number;
    prix_unitaire: number;
  }>;
}

export interface ClientLookup {
  id: number;
  nom?: string | null;
  prenoms?: string | null;
  raison_sociale?: string | null;
  type?: string | null;
}

export interface VarianteLookup {
  id: number;
  prix_vente?: number | null;
  prix_promo?: number | null;
  active?: boolean;
  produit?: {
    id: number;
    nom: string;
  } | null;
}

export const adminDevisApi = {
  devis: (params?: DevisFilters) =>
    api.get<LaravelPaginator<AdminDevis>>(
      '/admin/devis',
      { params },
    ),

  devisDetail: (id: number) =>
    api.get<AdminDevis>(
      `/admin/devis/${id}`,
    ),

  createDevis: (
    data: SaveDevisPayload,
  ) =>
    api.post<AdminDevis>(
      '/admin/devis',
      data,
    ),

  updateDevis: (
    id: number,
    data: SaveDevisPayload,
  ) =>
    api.put<AdminDevis>(
      `/admin/devis/${id}`,
      data,
    ),

  envoyerDevis: (id: number) =>
    api.post<{
      message: string;
      devis: AdminDevis;
    }>(
      `/admin/devis/${id}/envoyer`,
    ),

  deleteDevis: (id: number) =>
    api.delete<{
      message: string;
    }>(
      `/admin/devis/${id}`,
    ),

  /*
   * Lookups utilisés par le formulaire.
   * Si ton projet expose d'autres URLs pour les clients/variantes,
   * modifie uniquement ces deux méthodes.
   */
  clients: (params?: {
    recherche?: string;
    per_page?: number;
  }) =>
    api.get<
      LaravelPaginator<ClientLookup> |
      ClientLookup[]
    >(
      '/admin/clients',
      { params },
    ),

  variantes: (params?: {
    recherche?: string;
    per_page?: number;
  }) =>
    api.get<
      LaravelPaginator<VarianteLookup> |
      VarianteLookup[]
    >(
      '/admin/variantes',
      { params },
    ),

  /**
   * Utilisé uniquement pour prévisualiser la TVA.
   * Le backend Devis reste la source de vérité pour les montants.
   */
  parametres: () =>
    api.get<
      Record<
        string,
        string | number | boolean | null
      >
    >('/admin/parametres'),
};
