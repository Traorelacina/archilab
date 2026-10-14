import api from './client';
import type {
  DashboardStats, Categorie, Collection, Produit, Variante, Partenaire,
  Media, Stock, MouvementStock, Commande, Devis, Facture, Paiement,
  Reversement, User, Avis, PaginatedResponse
} from '../types';

export type AdminProduitRow = Omit<
  Produit,
  'prix_min' | 'stock_total' | 'partenaire' | 'medias' | 'variantes'
> & {
  sku: string;
  variantes_count: number;
  prix_min: number | null;
  stock_total: number;
  partenaire?: { id: number; raison_sociale: string } | null;
  medias?: Array<Pick<Media, 'id' | 'url' | 'ordre'> & { principale: boolean }>;
};

export type LaravelPaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AdminPartenaire = {
  id: number;
  user_id: number | null;
  raison_sociale: string;
  ncc: string | null;
  rccm: string | null;
  contact_nom: string | null;
  telephone: string;
  email: string | null;
  image: string | null;
  image_url: string | null;
  adresse: string | null;
  taux_commission: number;
  mode_reversement: 'hebdomadaire' | 'bimensuel' | 'mensuel';
  mode_versement: 'virement' | 'mobile_money' | 'especes';
  rib: string | null;
  numero_mobile_money: string | null;
  statut: 'actif' | 'suspendu' | 'archive';
  notes: string | null;
  produits_count?: number;
  user?: Pick<User, 'id' | 'name' | 'email' | 'telephone'> | null;
};

export type AdminPartenairePayload = {
  raison_sociale: string;
  telephone: string;
  email: string;
  taux_commission: number;
  mode_reversement: AdminPartenaire['mode_reversement'];
  mode_versement: AdminPartenaire['mode_versement'];
  contact_nom?: string | null;
  ncc?: string | null;
  rccm?: string | null;
  adresse?: string | null;
  rib?: string | null;
  numero_mobile_money?: string | null;
  notes?: string | null;
};

function partenaireFormData(
  data: Partial<AdminPartenairePayload> & {
    statut?: AdminPartenaire['statut'];
    supprimer_image?: boolean;
  },
  image?: File,
): FormData {
  const body = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) body.append(key, value === null ? '' : String(value));
  });
  if (image) body.append('image', image);
  body.append('_method', 'PUT');
  return body;
}

export type ProduitPayload = {
  partenaire_id: number;
  categorie_id: number;
  collection_id?: number | null;
  sku?: string | null;
  nom: string;
  description?: string | null;
  points_forts?: string[];
  style?: string | null;
  usage_recommande?: string | null;
  fiche_technique?: Record<string, string>;
  garantie_mois?: number | null;
  delai_fabrication_jours?: number | null;
  mis_en_avant: boolean;
};

export type ProduitFilters = {
  page?: number;
  per_page?: number;
  recherche?: string;
  statut?: string;
  partenaire_id?: number;
  categorie_id?: number;
};

export const adminApi = {
  dashboard: () => api.get<DashboardStats>('/admin/dashboard'),

  // Catalogue
  categories: () => api.get<Categorie[]>('/admin/categories'),
  createCategorie: (d: Partial<Categorie>) => api.post<Categorie>('/admin/categories', d),
  updateCategorie: (id: number, d: Partial<Categorie>) => api.put<Categorie>(`/admin/categories/${id}`, d),
  deleteCategorie: (id: number) => api.delete(`/admin/categories/${id}`),

  collections: () => api.get<Collection[]>('/admin/collections'),
  createCollection: (d: Partial<Collection>) => api.post<Collection>('/admin/collections', d),
  updateCollection: (id: number, d: Partial<Collection>) => api.put<Collection>(`/admin/collections/${id}`, d),
  deleteCollection: (id: number) => api.delete(`/admin/collections/${id}`),

  produits: (p?: ProduitFilters) =>
    api.get<LaravelPaginatedResponse<AdminProduitRow>>('/admin/produits', { params: p }),

  partenairesCatalogue: () =>
    api.get<Array<Pick<Partenaire, 'id'> & { raison_sociale: string }>>(
      '/admin/catalogue/partenaires',
    ),

  partenaireProduits: () =>
    api.get<PaginatedResponse<Produit>>('/partenaire/produits'),

  produit: (id: number) =>
    api.get<Produit>(`/admin/produits/${id}`),

  // IMPORTANT :
  // ProduitController::store/update ne gère pas de fichiers.
  // On envoie donc du JSON normal et pas FormData.
  createProduit: (d: ProduitPayload) =>
    api.post<Produit>('/admin/produits', d),

  updateProduit: (id: number, d: ProduitPayload) =>
    api.put<Produit>(`/admin/produits/${id}`, d),

  deleteProduit: (id: number) =>
    api.delete(`/admin/produits/${id}`),

  publierProduit: (id: number) =>
    api.post(`/admin/produits/${id}/publier`),

  archiverProduit: (id: number) =>
    api.post(`/admin/produits/${id}/archiver`),

  // PHOTOS / MEDIAS
createProduitMedia: (produitId: number, data: FormData) =>
  api.post(
    `/admin/produits/${produitId}/medias`,
    data,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  ),

setProduitMediaPrincipale: (mediaId: number) =>
  api.put(`/admin/medias/${mediaId}`, { principale: true }),

deleteProduitMedia: (mediaId: number) =>
  api.delete(`/admin/medias/${mediaId}`),

// VARIANTES
createProduitVariante: (
  produitId: number,
  data: {
    prix_vente: number;
    prix_promo: number | null;
    mode_stock: 'stock' | 'fabrication';
    active: boolean;
  },
) =>
  api.post(
    `/admin/produits/${produitId}/variantes`,
    data,
  ),

updateProduitVariante: (
  varianteId: number,
  data: {
    prix_vente: number;
    prix_promo: number | null;
    mode_stock: 'stock' | 'fabrication';
    active: boolean;
  },
) =>
  api.put(`/admin/variantes/${varianteId}`, data),

deleteProduitVariante: (
  varianteId: number,
) =>
  api.delete(`/admin/variantes/${varianteId}`),

  // Stocks
  stocks: (p?: object) => api.get<LaravelPaginatedResponse<Stock>>('/admin/stocks', { params: p }),
  alertesStock: () => api.get<Stock[]>('/admin/stocks/alertes'),
  mouvements: (p?: object) => api.get<LaravelPaginatedResponse<MouvementStock>>('/admin/stocks/mouvements', { params: p }),
  transfertStock: (d: { variante_id: number; depot_source_id: number; depot_destination_id: number; quantite: number; motif?: string }) =>
    api.post('/admin/stocks/transfert', d),
  mouvementStock: (d: { variante_id: number; depot_id: number; type: string; quantite: number; motif?: string }) =>
    api.post('/admin/stocks/mouvement', d),
  majSeuil: (stockId: number, seuil: number) =>
    api.put(`/admin/stocks/${stockId}/seuil`, { seuil_alerte: seuil }),

  // Ventes
  clients: (p?: object) => api.get<PaginatedResponse<User>>('/admin/clients', { params: p }),
  commandes: (p?: object) => api.get<PaginatedResponse<Commande>>('/admin/commandes', { params: p }),
  commande: (id: number) => api.get<Commande>(`/admin/commandes/${id}`),
  changerStatutCommande: (id: number, statut: string) =>
    api.put(`/admin/commandes/${id}/statut`, { statut }),
  devis: (p?: object) => api.get<PaginatedResponse<Devis>>('/admin/devis', { params: p }),
  envoyerDevis: (id: number) => api.post(`/admin/devis/${id}/envoyer`),
  avis: (p?: object) => api.get<PaginatedResponse<Avis>>('/admin/avis', { params: p }),
  modererAvis: (id: number, statut: 'approuve' | 'rejete') =>
    api.put(`/admin/avis/${id}/moderer`, { statut }),

  // Finance
  factures: (p?: object) => api.get<PaginatedResponse<Facture>>('/admin/factures', { params: p }),
  genererFacture: (commandeId: number) =>
    api.post<Facture>(`/admin/commandes/${commandeId}/factures`),
  facturePdf: (id: number) =>
    api.get(`/admin/factures/${id}/pdf`, { responseType: 'blob' }),
  paiements: (p?: object) => api.get<PaginatedResponse<Paiement>>('/admin/paiements', { params: p }),
  enregistrerPaiement: (d: object) => api.post<Paiement>('/admin/paiements', d),
  validerPaiement: (id: number) => api.post(`/admin/paiements/${id}/valider`),
  rejeterPaiement: (id: number) => api.post(`/admin/paiements/${id}/rejeter`),
  reversements: (p?: object) => api.get<PaginatedResponse<Reversement>>('/admin/reversements', { params: p }),
  genererReversement: (d: object) => api.post('/admin/reversements/generer', d),
  verserReversement: (id: number) => api.post(`/admin/reversements/${id}/verser`),

  // Admin pur
  partenaires: (p?: { page?: number; per_page?: number; recherche?: string; statut?: string }) =>
    api.get<LaravelPaginatedResponse<AdminPartenaire>>('/admin/partenaires', { params: p }),
  createPartenaire: (d: AdminPartenairePayload, image?: File) => {
    if (!image) {
      return api.post<{ partenaire: AdminPartenaire; message: string; mot_de_passe_provisoire: string }>('/admin/partenaires', d);
    }
    const body = new FormData();
    Object.entries(d).forEach(([key, value]) => {
      body.append(key, value === null ? '' : String(value));
    });
    body.append('image', image);
    return api.post<{ partenaire: AdminPartenaire; message: string; mot_de_passe_provisoire: string }>('/admin/partenaires', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updatePartenaire: (
    id: number,
    d: Partial<AdminPartenairePayload> & {
      statut?: AdminPartenaire['statut'];
      supprimer_image?: boolean;
    },
    image?: File,
  ) => {
    if (!image && !d.supprimer_image) {
      return api.put<AdminPartenaire>(`/admin/partenaires/${id}`, d);
    }
    return api.post<AdminPartenaire>(`/admin/partenaires/${id}`, partenaireFormData(d, image), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  utilisateurs: (p?: object) =>
    api.get<PaginatedResponse<User>>('/admin/utilisateurs', { params: p }),
  createUtilisateur: (d: Partial<User> & { password: string; role: string }) =>
    api.post<User>('/admin/utilisateurs', d),
};
