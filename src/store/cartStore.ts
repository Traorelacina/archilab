import { create } from 'zustand';
import type { Variante, Produit } from '../types';

export interface CartItem {
  variante: Variante & { produit?: Pick<Produit, 'nom' | 'slug' | 'medias'> };
  quantite: number;
}

function stockDisponible(variante: CartItem['variante']): number | undefined {
  if (typeof variante.stock_disponible === 'number') return variante.stock_disponible;
  if (!variante.stocks) return undefined;
  return variante.stocks.reduce(
    (total, stock) => total + Math.max(0, stock.quantite - (stock.quantite_reservee ?? 0)),
    0,
  );
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (variante: CartItem['variante'], quantite?: number) => boolean;
  removeItem: (varianteId: number) => void;
  updateQuantite: (varianteId: number, quantite: number) => boolean;
  refreshVariante: (variante: CartItem['variante']) => void;
  clear: () => void;
  toggleCart: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,

  addItem: (variante, quantite = 1) => {
    const currentQuantity = get().items.find((item) => item.variante.id === variante.id)?.quantite ?? 0;
    const newQuantity = currentQuantity + quantite;
    const available = stockDisponible(variante);
    if (
      variante.mode_stock !== 'fabrication' &&
      (variante.mode_stock !== 'stock' ||
        available === undefined ||
        newQuantity > available)
    ) {
      return false;
    }
    set((s) => {
      const existing = s.items.find((i) => i.variante.id === variante.id);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.variante.id === variante.id
              ? { ...i, quantite: i.quantite + quantite }
              : i
          ),
        };
      }
      return { items: [...s.items, { variante, quantite }] };
    });
    return true;
  },

  removeItem: (varianteId) =>
    set((s) => ({ items: s.items.filter((i) => i.variante.id !== varianteId) })),

  updateQuantite: (varianteId, quantite) => {
    const item = get().items.find((current) => current.variante.id === varianteId);
    if (!item) return false;
    const available = stockDisponible(item.variante);
    if (
      quantite > 0 &&
      item.variante.mode_stock !== 'fabrication' &&
      (item.variante.mode_stock !== 'stock' ||
        available === undefined ||
        quantite > available)
    ) {
      return false;
    }
    set((s) => ({
      items:
        quantite <= 0
          ? s.items.filter((i) => i.variante.id !== varianteId)
          : s.items.map((i) =>
              i.variante.id === varianteId ? { ...i, quantite } : i
            ),
    }));
    return true;
  },

  refreshVariante: (variante) =>
    set((s) => ({
      items: s.items.map((item) =>
        item.variante.id === variante.id
          ? { ...item, variante: { ...item.variante, ...variante, produit: item.variante.produit } }
          : item,
      ),
    })),

  clear: () => set({ items: [] }),
  toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

  total: () =>
    get().items.reduce(
      (sum, i) => sum + (i.variante.prix_promo ?? i.variante.prix_vente) * i.quantite,
      0
    ),

  count: () => get().items.reduce((sum, i) => sum + i.quantite, 0),
}));
