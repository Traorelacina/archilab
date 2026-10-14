import api from './client';
import type { Categorie, Collection, Produit, Avis, PaginatedResponse } from '../types';

export type PublicPartenaire = {
  id: number;
  raison_sociale: string;
  image_url: string | null;
  produits_count: number;
};

export const publicApi = {
  categories: () => api.get<Categorie[]>('/public/categories'),
  collections: () => api.get<Collection[]>('/public/collections'),
  partenaires: () => api.get<PublicPartenaire[]>('/public/partenaires'),

  produits: (params?: {
    page?: number; per_page?: number; categorie?: string; collection?: string;
    partenaire?: string; q?: string; recherche?: string; prix_min?: number; prix_max?: number;
    disponible?: boolean; en_stock?: boolean; style?: string;
  }) => api.get<PaginatedResponse<Produit> & {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  }>('/public/produits', { params }),

  produitsMisEnAvant: () => api.get<Produit[]>('/public/produits/mis-en-avant'),
  produit: (slug: string) => api.get<Produit>(`/public/produits/${slug}`),
  avis: (slug: string) => api.get<PaginatedResponse<Avis> & { data: Avis[] }>(`/public/produits/${slug}/avis`),

  comparer: (slugs: string[]) => api.post<Produit[]>('/public/comparateur', { slugs }),
};
