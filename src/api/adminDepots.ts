import api from './client';

export type DepotType =
  | 'plateforme'
  | 'partenaire';

export interface DepotPartenaire {
  id: number;
  raison_sociale: string;
}

export interface DepotStockProduit {
  id: number;
  nom: string;
  sku?: string | null;
}

export interface DepotStockVariante {
  id: number;
  produit?: DepotStockProduit | null;
}

export interface DepotStock {
  id: number;
  depot_id?: number;
  variante_id?: number;
  quantite: number;
  quantite_reservee?: number;
  variante?: DepotStockVariante | null;
}

export interface AdminDepot {
  id: number;
  nom: string;
  type: DepotType;
  partenaire_id?: number | null;
  adresse?: string | null;
  actif?: boolean;

  partenaire?: DepotPartenaire | null;
  stocks?: DepotStock[];

  created_at?: string;
  updated_at?: string;
}

export interface CreateDepotPayload {
  nom: string;
  type: DepotType;
  partenaire_id?: number | null;
  adresse?: string | null;
  actif: boolean;
}

export interface UpdateDepotPayload {
  nom?: string;
  adresse?: string | null;
  actif?: boolean;
}

export const adminDepotsApi = {
  /**
   * GET /admin/depots
   */
  depots: () =>
    api.get<AdminDepot[]>(
      '/admin/depots',
    ),

  /**
   * GET /admin/depots/{depot}
   */
  depot: (id: number) =>
    api.get<AdminDepot>(
      `/admin/depots/${id}`,
    ),

  /**
   * POST /admin/depots
   */
  createDepot: (
    data: CreateDepotPayload,
  ) =>
    api.post<AdminDepot>(
      '/admin/depots',
      data,
    ),

  /**
   * PUT /admin/depots/{depot}
   */
  updateDepot: (
    id: number,
    data: UpdateDepotPayload,
  ) =>
    api.put<AdminDepot>(
      `/admin/depots/${id}`,
      data,
    ),

  /**
   * DELETE /admin/depots/{depot}
   */
  deleteDepot: (id: number) =>
    api.delete<{
      message: string;
    }>(
      `/admin/depots/${id}`,
    ),
};
