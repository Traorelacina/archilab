import api from './client';
import type { User, Commande, Devis, Facture, Produit, Avis } from '../types';

export interface ClientProfile {
  id: number;
  user_id: number;
  nom: string;
  prenoms?: string | null;
  type: 'particulier' | 'professionnel';
  raison_sociale?: string | null;
  ncc?: string | null;
  telephone: string;
  email?: string | null;
  ville?: string | null;
  adresse_livraison?: string | null;
  adresse_facturation?: string | null;
}

export interface ClientPaginator<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const clientApi = {
  profil: () => api.get<ClientProfile>('/client/profil'),
  updateProfil: (data: Partial<ClientProfile>) =>
    api.put<{ message: string; client: ClientProfile }>('/client/profil', data),

  commandes: (params?: { page?: number }) =>
    api.get<ClientPaginator<Commande>>('/client/commandes', { params }),
  commande: (id: number) => api.get<Commande>(`/client/commandes/${id}`),
  passerCommande: (data: {
    lignes: Array<{ variante_id: number; quantite: number }>;
    mode_livraison: 'retrait_showroom' | 'livraison_abidjan' | 'livraison_interieur';
    adresse_livraison?: string;
    notes?: string;
  }) => api.post<{ message: string; commande: Commande }>('/client/commandes', data),
  annulerCommande: (id: number) =>
    api.post<{ message: string; commande: Commande }>(`/client/commandes/${id}/annuler`),

  devis: (params?: { page?: number }) =>
    api.get<ClientPaginator<Devis>>('/client/devis', { params }),
  devisDetail: (id: number) => api.get<Devis>(`/client/devis/${id}`),
  demanderDevis: (data: {
    demande_client: string;
    lignes: Array<{ variante_id?: number; description?: string; quantite: number }>;
  }) => api.post<{ message: string; devis: Devis }>('/client/devis', data),
  accepterDevis: (id: number) =>
    api.post<{ message: string; commande: Commande }>(`/client/devis/${id}/accepter`),
  refuserDevis: (id: number) =>
    api.post<{ message: string }>(`/client/devis/${id}/refuser`),

  factures: (params?: { page?: number }) =>
    api.get<ClientPaginator<Facture>>('/client/factures', { params }),
  facturePdf: (id: number) => api.get(`/client/factures/${id}/pdf`, { responseType: 'blob' }),

  favoris: () => api.get<Produit[]>('/client/favoris'),
  toggleFavori: (produitId: number) =>
    api.post<{ message: string; favori: boolean }>(`/client/favoris/${produitId}`),

  laisserAvis: (data: { produit_id: number; note: number; commentaire?: string }) =>
    api.post<{ message: string; avis: Avis }>('/client/avis', data),
};
