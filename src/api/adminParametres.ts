import api from './client';

export type ParametresMap = Record<
  string,
  string | number | boolean | null
>;

export interface UpdateParametresPayload {
  parametres: ParametresMap;
}

export interface UpdateParametresResponse {
  message: string;
}

export const adminParametresApi = {
  /**
   * GET /admin/parametres
   *
   * Réponse Laravel :
   * {
   *   "cle_1": "valeur",
   *   "cle_2": "valeur"
   * }
   */
  parametres: () =>
    api.get<ParametresMap>(
      '/admin/parametres',
    ),

  /**
   * PUT /admin/parametres
   *
   * Payload :
   * {
   *   parametres: {
   *     "cle_1": "nouvelle valeur"
   *   }
   * }
   */
  updateParametres: (
    data: UpdateParametresPayload,
  ) =>
    api.put<UpdateParametresResponse>(
      '/admin/parametres',
      data,
    ),
};
