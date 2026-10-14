import api from './client';

export interface CoutVariante {
  id: number;
  sku: string;
  nom?: string | null;
  prix_vente: number;
  prix_promo?: number | null;
  produit?: { id: number; nom: string; sku?: string } | null;
}

export interface CoutProduit {
  id: number;
  variante_id: number;
  composante: 'matieres_premieres' | 'main_oeuvre' | 'numerisation' | 'logistique' | 'autre';
  libelle: string;
  montant: number;
  date_validite?: string | null;
  created_at: string;
}

export interface CoutResume {
  couts: CoutProduit[];
  cout_revient_total: number;
  prix_vente: number;
  prix_effectif: number;
  commission_plateforme: number;
  marge: number;
  taux_marge: number;
}

export interface SimulationPrix {
  cout_revient: number;
  marge_cible: number;
  prix_conseille: number | null;
  prix_actuel: number;
}

interface LaravelPaginator<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const adminCoutsApi = {
  variantes: (recherche?: string) =>
    api.get<LaravelPaginator<CoutVariante>>('/admin/couts/variantes', {
      params: { recherche: recherche || undefined, per_page: 500 },
    }),
  resume: (varianteId: number) =>
    api.get<CoutResume>(`/admin/variantes/${varianteId}/couts`),
  ajouter: (varianteId: number, data: {
    composante: CoutProduit['composante'];
    libelle: string;
    montant: number;
    date_validite?: string;
  }) => api.post<CoutProduit>(`/admin/variantes/${varianteId}/couts`, data),
  supprimer: (coutId: number) =>
    api.delete<{ message: string }>(`/admin/couts/${coutId}`),
  simuler: (varianteId: number, margeCible: number) =>
    api.get<SimulationPrix>(`/admin/variantes/${varianteId}/simulation-prix`, {
      params: { marge_cible: margeCible },
    }),
};
