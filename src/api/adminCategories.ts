import api from './client';

export interface CategorieParent {
  id: number;
  nom: string;
}

export interface AdminCategorie {
  id: number;
  parent_id: number | null;
  nom: string;
  slug: string;
  description: string | null;
  image: string | null;
  image_url: string | null;
  ordre: number | null;
  active: boolean;
  produits_count?: number;
  parent?: CategorieParent | null;
  enfants?: AdminCategorie[];
  created_at?: string;
  updated_at?: string;
}

export interface CategoriePayload {
  parent_id: number | null;
  nom: string;
  description: string | null;
  ordre: number | null;
  active: boolean;
}

export type UpdateCategoriePayload = Partial<CategoriePayload> & {
  supprimer_image?: boolean;
};

export const adminCategoriesApi = {
  categories: () => api.get<AdminCategorie[]>('/admin/categories'),
  categorie: (id: number) => api.get<AdminCategorie>(`/admin/categories/${id}`),
  createCategorie: (data: CategoriePayload, image?: File) => {
    if (!image) return api.post<AdminCategorie>('/admin/categories', data);
    const body = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      body.append(key, value === null ? '' : typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    });
    body.append('image', image);
    return api.post<AdminCategorie>('/admin/categories', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateCategorie: (id: number, data: UpdateCategoriePayload) =>
    api.put<AdminCategorie>(`/admin/categories/${id}`, data),
  updateCategorieImage: (id: number, data: UpdateCategoriePayload, image: File) => {
    const body = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      body.append(key, value === null ? '' : typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    });
    body.append('image', image);
    body.append('_method', 'PUT');
    return api.post<AdminCategorie>(`/admin/categories/${id}`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteCategorie: (id: number) =>
    api.delete<{ message: string }>(`/admin/categories/${id}`),
};
