import api from './client';

export interface CollectionPartenaire {
  id: number;
  raison_sociale: string;
}

export interface AdminCollection {
  id: number;
  partenaire_id: number | null;
  nom: string;
  slug: string;
  description: string | null;
  active: boolean;
  produits_count?: number;
  partenaire?: CollectionPartenaire | null;
  created_at?: string;
  updated_at?: string;
}

export interface CollectionPayload {
  partenaire_id: number | null;
  nom: string;
  description: string | null;
  active: boolean;
}

export type CollectionUpdatePayload = Partial<CollectionPayload>;

export const adminCollectionsApi = {
  /**
   * GET /admin/collections
   *
   * CollectionController::index() renvoie directement un tableau.
   */
  collections: () =>
    api.get<AdminCollection[]>('/admin/collections'),

  /**
   * GET /admin/collections/{collection}
   */
  collection: (id: number) =>
    api.get<AdminCollection>(`/admin/collections/${id}`),

  /**
   * POST /admin/collections
   */
  createCollection: (data: CollectionPayload) =>
    api.post<AdminCollection>('/admin/collections', data),

  /**
   * PUT /admin/collections/{collection}
   */
  updateCollection: (
    id: number,
    data: CollectionUpdatePayload,
  ) =>
    api.put<AdminCollection>(`/admin/collections/${id}`, data),

  /**
   * DELETE /admin/collections/{collection}
   */
  deleteCollection: (id: number) =>
    api.delete<{ message: string }>(`/admin/collections/${id}`),
};
