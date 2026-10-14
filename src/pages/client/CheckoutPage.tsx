import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { clientApi } from '../../api/client-api';
import { publicApi } from '../../api/public';
import { useCartStore } from '../../store/cartStore';
import { formatPrix } from '../../utils/format';

type DeliveryMode = 'retrait_showroom' | 'livraison_abidjan' | 'livraison_interieur';

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: unknown; errors?: Record<string, unknown> } | undefined;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  for (const value of Object.values(data?.errors ?? {})) {
    if (Array.isArray(value)) {
      const message = value.find((item): item is string => typeof item === 'string');
      if (message) return message;
    }
  }
  return fallback;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const refreshVariante = useCartStore((state) => state.refreshVariante);
  const updateQuantite = useCartStore((state) => state.updateQuantite);
  const [mode, setMode] = useState<DeliveryMode>('retrait_showroom');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clientApi.profil()
      .then((response) => setAddress(response.data.adresse_livraison ?? ''))
      .catch((error: unknown) => toast.error(apiErrorMessage(error, 'Impossible de charger votre adresse client.')))
      .finally(() => setLoadingProfile(false));
  }, []);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) {
      toast.error('Votre panier est vide.');
      return;
    }
    if (mode !== 'retrait_showroom' && !address.trim()) {
      toast.error('Saisissez une adresse de livraison.');
      return;
    }
    setSaving(true);
    try {
      const productSlugs = [...new Set(items.map((item) => item.variante.produit?.slug).filter((slug): slug is string => Boolean(slug)))];
      if (productSlugs.length !== new Set(items.map((item) => item.variante.produit?.slug)).size) {
        toast.error('Un produit du panier ne peut pas être vérifié. Retirez-le puis ajoutez-le à nouveau.');
        return;
      }
      const freshProducts = await Promise.all(productSlugs.map((slug) => publicApi.produit(slug)));
      const freshVariants = new Map(
        freshProducts.flatMap(({ data }) => (data.variantes ?? []).map((variant) => [variant.id, variant] as const)),
      );

      let unavailableMessage: string | null = null;
      const orderLines = items.map((item) => {
        const freshVariant = freshVariants.get(item.variante.id);
        if (!freshVariant) {
          unavailableMessage = `${item.variante.produit?.nom ?? 'Un produit'} n'est plus disponible.`;
          return null;
        }

        const updatedVariant = {
          ...item.variante,
          ...freshVariant,
          produit: item.variante.produit,
        };
        refreshVariante(updatedVariant);

        if (updatedVariant.mode_stock === 'stock' && item.quantite > (updatedVariant.stock_disponible ?? 0)) {
          unavailableMessage = `Stock insuffisant pour ${updatedVariant.produit?.nom ?? updatedVariant.nom ?? updatedVariant.libelle}. Disponible : ${updatedVariant.stock_disponible ?? 0}.`;
          if ((updatedVariant.stock_disponible ?? 0) > 0) {
            updateQuantite(updatedVariant.id, updatedVariant.stock_disponible!);
          }
          return null;
        }
        return { variante_id: updatedVariant.id, quantite: item.quantite };
      });

      if (unavailableMessage || orderLines.some((line) => line === null)) {
        toast.error(unavailableMessage ?? 'Un article du panier n’est plus disponible.');
        return;
      }

      const validOrderLines = orderLines.filter(
        (line): line is { variante_id: number; quantite: number } => line !== null,
      );
      const response = await clientApi.passerCommande({
        lignes: validOrderLines,
        mode_livraison: mode,
        adresse_livraison: mode === 'retrait_showroom' ? undefined : address.trim(),
        notes: notes.trim() || undefined,
      });
      clearCart();
      toast.success(response.data.message || 'Votre commande a été enregistrée.');
      navigate(`/espace-client/commandes/${response.data.commande.id}`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Impossible de créer votre commande.'));
    } finally {
      setSaving(false);
    }
  }

  if (items.length === 0 && !saving) {
    return (
      <div className="empty-state">
        <h1>Votre panier est vide</h1>
        <p>Ajoutez des produits au panier avant de passer commande.</p>
        <Link className="btn btn-primary" to="/catalogue" style={{ marginTop: 16 }}>Explorer le catalogue</Link>
      </div>
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (item.variante.prix_promo ?? item.variante.prix_vente) * item.quantite,
    0,
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, .8fr)', gap: 'var(--space-5)' }}>
      <section className="card" style={{ padding: 'var(--space-6)' }}>
        <Link to="/catalogue" style={{ color: 'var(--color-terra)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← Continuer mes achats</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '16px 0 22px' }}>Finaliser la commande</h1>
        <form onSubmit={submitOrder} style={{ display: 'grid', gap: 16 }}>
          <label className="form-group">
            <span className="form-label">Mode de livraison</span>
            <select className="form-input" value={mode} onChange={(event) => setMode(event.target.value as DeliveryMode)}>
              <option value="retrait_showroom">Retrait au showroom</option>
              <option value="livraison_abidjan">Livraison à Abidjan</option>
              <option value="livraison_interieur">Livraison à l’intérieur du pays</option>
            </select>
          </label>
          {mode !== 'retrait_showroom' && (
            <label className="form-group">
              <span className="form-label">Adresse de livraison</span>
              <textarea className="form-input" required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Adresse complète, commune, repères…" />
              {!loadingProfile && !address && <small>Ajoutez l’adresse complète pour faciliter la livraison.</small>}
            </label>
          )}
          <label className="form-group">
            <span className="form-label">Instructions (facultatif)</span>
            <textarea className="form-input" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <p style={{ color: 'var(--color-gris-moyen)', fontSize: 'var(--text-sm)' }}>
            Après validation, la commande sera créée en attente de paiement. Le règlement se fait hors ligne et sera confirmé par notre équipe.
          </p>
          <button type="submit" className="btn btn-primary" disabled={saving || loadingProfile}>
            {saving ? 'Enregistrement…' : 'Confirmer ma commande'}
          </button>
        </form>
      </section>

      <aside className="card" style={{ padding: 'var(--space-5)', alignSelf: 'start' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Récapitulatif</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <div key={item.variante.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{item.variante.produit?.nom ?? item.variante.nom ?? item.variante.libelle} × {item.quantite}</span>
              <strong>{formatPrix((item.variante.prix_promo ?? item.variante.prix_vente) * item.quantite)}</strong>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--color-ivoire-dark)', marginTop: 16, paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-lg)' }}>
          <strong>Sous-total articles</strong>
          <strong style={{ color: 'var(--color-terra)' }}>{formatPrix(subtotal)}</strong>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)', marginTop: 10 }}>
          Les frais de livraison et le total définitif seront calculés à la confirmation selon le mode choisi.
        </p>
      </aside>
    </div>
  );
}
