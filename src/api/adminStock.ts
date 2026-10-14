import api from './client';
import type { AdminDepot } from './adminDepots';

export interface StockVarianteOption {
  id: number;
  sku: string;
  nom?: string | null;
  produit?: {
    nom: string;
  } | null;
}

export interface StockDepotOption {
  id: number;
  nom: string;
  type: 'plateforme' | 'partenaire';
}

export interface StockEntryVariante {
  id: number;
  stocks: Array<{
    id: number;
    quantite: number;
    quantite_reservee: number;
    depot?: { id: number; nom?: string } | null;
  }>;
}

export interface MouvementStockRow {
  id: number;
  type: string;
  quantite: number;
  motif?: string | null;
  reference?: string | null;
  created_at: string;
  variante?: StockVarianteOption | null;
  depot?: Pick<AdminDepot, 'id' | 'nom'> | null;
  depot_destination?: Pick<AdminDepot, 'id' | 'nom'> | null;
  user?: { id: number; name: string } | null;
}

export interface LaravelPaginator<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface StockMouvementFilters {
  page?: number;
  per_page?: number;
  variante_id?: number;
  depot_id?: number;
  type?: string;
}

export interface StockMouvementPayload {
  variante_id: number;
  depot_id: number;
  type: 'entree' | 'sortie' | 'ajustement';
  quantite: number;
  motif: string;
  reference?: string;
}

export interface StockTransfertPayload {
  variante_id: number;
  depot_source_id: number;
  depot_destination_id: number;
  quantite: number;
  motif?: string;
}

export interface StockInventairePayload {
  depot_id: number;
  lignes: Array<{ variante_id: number; quantite_constatee: number }>;
}

export const adminStockApi = {
  depotsPourCatalogue: () =>
    api.get<StockDepotOption[]>('/admin/catalogue/depots-stock'),
  ajouterStockVariante: (varianteId: number, data: { depot_id: number; quantite: number }) =>
    api.post<{ message: string; variante: StockEntryVariante }>(
      `/admin/variantes/${varianteId}/stock`,
      data,
    ),
  mouvements: (params?: StockMouvementFilters) =>
    api.get<LaravelPaginator<MouvementStockRow>>('/admin/stocks/mouvements', { params }),
  variantes: () =>
    api.get<LaravelPaginator<StockVarianteOption>>('/admin/stocks/variantes', {
      params: { per_page: 300 },
    }),
  mouvement: (data: StockMouvementPayload) =>
    api.post<{ message: string; mouvement: MouvementStockRow }>('/admin/stocks/mouvement', data),
  transfert: (data: StockTransfertPayload) =>
    api.post<{ message: string }>('/admin/stocks/transfert', data),
  inventaire: (data: StockInventairePayload) =>
    api.post<{ message: string; ecarts: Array<{ variante_id: number; ecart: number }> }>('/admin/stocks/inventaire', data),
};
