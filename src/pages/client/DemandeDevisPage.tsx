import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { publicApi } from '../../api/public';
import { clientApi } from '../../api/client-api';
import type { Produit, Variante } from '../../types';

function errorMessage(error: unknown, fallback: string): string {
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

export default function DemandeDevisPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSlug = searchParams.get('produit') ?? '';
  const initialVarianteId = searchParams.get('variante') ?? '';
  const [description, setDescription] = useState('');
  const [produits, setProduits] = useState<Produit[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [selectedVarianteId, setSelectedVarianteId] = useState(initialVarianteId);
  const [quantite, setQuantite] = useState('1');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    publicApi.produits({ per_page: 100 })
      .then((response) => setProduits(response.data.data ?? []))
      .catch((error: unknown) => toast.error(errorMessage(error, 'Impossible de charger les produits.')))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    if (!selectedSlug) {
      setVariantes([]);
      setSelectedVarianteId('');
      return;
    }
    let active = true;
    publicApi.produit(selectedSlug)
      .then((response) => {
        if (!active) return;
        const activeVariants = (response.data.variantes ?? []).filter(
          (variant) => (variant as Variante & { active?: boolean }).active !== false,
        );
        setVariantes(activeVariants);
        const initial = initialVarianteId && activeVariants.some((variant) => String(variant.id) === initialVarianteId)
          ? initialVarianteId
          : '';
        setSelectedVarianteId(initial || (activeVariants.length === 1 ? String(activeVariants[0].id) : ''));
      })
      .catch((error: unknown) => {
        if (active) toast.error(errorMessage(error, 'Impossible de charger les variantes du produit.'));
      });
    return () => {
      active = false;
    };
  }, [selectedSlug, initialVarianteId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (description.trim().length < 10) {
      toast.error('Décrivez votre besoin en au moins 10 caractères.');
      return;
    }
    const lines = selectedVarianteId
      ? [{ variante_id: Number(selectedVarianteId), quantite: Number(quantite) }]
      : [];
    if (lines.some((line) => !Number.isInteger(line.quantite) || line.quantite < 1)) {
      toast.error('La quantité doit être un entier supérieur à zéro.');
      return;
    }
    setSaving(true);
    try {
      const response = await clientApi.demanderDevis({
        demande_client: description.trim(),
        lignes: lines,
      });
      toast.success(response.data.message || 'Votre demande de devis a été envoyée.');
      navigate('/espace-client/devis');
    } catch (error) {
      toast.error(errorMessage(error, 'Impossible d’envoyer la demande de devis.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-6)' }}>
      <Link to="/espace-client/devis" style={{ color: 'var(--color-terra)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← Mes devis</Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '16px 0 8px' }}>Demander un devis</h1>
      <p style={{ color: 'var(--color-gris-moyen)', marginBottom: 20 }}>Décrivez votre projet ou votre besoin sur mesure. Notre équipe commerciale vous répondra.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <label className="form-group">
          <span className="form-label">Description de votre demande</span>
          <textarea className="form-input" required minLength={10} maxLength={5000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Dimensions, matières, style souhaité, quantité, budget indicatif…" />
        </label>
        <label className="form-group">
          <span className="form-label">Produit concerné (facultatif)</span>
          <select className="form-input" disabled={loadingProducts} value={selectedSlug} onChange={(event) => setSelectedSlug(event.target.value)}>
            <option value="">{loadingProducts ? 'Chargement…' : 'Projet sans produit précis'}</option>
            {produits.map((produit) => <option key={produit.id} value={produit.slug}>{produit.nom}</option>)}
          </select>
        </label>
        {selectedSlug && variantes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
            <label className="form-group">
              <span className="form-label">Variante (facultatif)</span>
              <select className="form-input" value={selectedVarianteId} onChange={(event) => setSelectedVarianteId(event.target.value)}>
                <option value="">Ne pas préciser</option>
                {variantes.map((variante) => <option key={variante.id} value={variante.id}>{variante.nom ?? variante.libelle ?? variante.sku}</option>)}
              </select>
            </label>
            {selectedVarianteId && (
              <label className="form-group">
                <span className="form-label">Quantité</span>
                <input className="form-input" type="number" min="1" step="1" value={quantite} onChange={(event) => setQuantite(event.target.value)} />
              </label>
            )}
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving || loadingProducts}>{saving ? 'Envoi…' : 'Envoyer ma demande'}</button>
      </form>
    </section>
  );
}
