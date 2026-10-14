import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { clientApi } from '../../api/client-api';
import type { Commande } from '../../types';
import { formatDate, formatPrix, statutCommande } from '../../utils/format';

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

export default function CommandeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const commandeId = Number(id);
  const [commande, setCommande] = useState<Commande | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    let active = true;
    if (!Number.isInteger(commandeId) || commandeId <= 0) {
      navigate('/espace-client/commandes', { replace: true });
      return;
    }
    clientApi.commande(commandeId)
      .then((response) => {
        if (active) setCommande(response.data);
      })
      .catch((error: unknown) => {
        toast.error(apiErrorMessage(error, 'Impossible de charger cette commande.'));
        if (active) navigate('/espace-client/commandes', { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [commandeId, navigate]);

  async function cancelOrder() {
    if (!commande || !window.confirm('Voulez-vous annuler cette commande ?')) return;
    setBusy(true);
    try {
      const response = await clientApi.annulerCommande(commande.id);
      setCommande(response.data.commande);
      toast.success(response.data.message || 'Commande annulée.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Impossible d’annuler cette commande.'));
    } finally {
      setBusy(false);
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewProductId) return;
    setBusy(true);
    try {
      const response = await clientApi.laisserAvis({
        produit_id: reviewProductId,
        note: rating,
        commentaire: comment.trim() || undefined,
      });
      toast.success(response.data.message || 'Votre avis sera publié après modération.');
      setReviewProductId(null);
      setComment('');
      setRating(5);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Impossible d’envoyer votre avis.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!commande) return null;

  const status = statutCommande[commande.statut] ?? { label: commande.statut, cls: 'badge-neutral' };
  const canReview = ['livree', 'cloturee'].includes(commande.statut);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <Link to="/espace-client/commandes" style={{ color: 'var(--color-terra)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← Retour aux commandes</Link>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Commande #{commande.numero}</h1>
          <p style={{ color: 'var(--color-gris-moyen)' }}>Passée le {formatDate(commande.created_at)}</p>
        </div>
        <span className={`badge ${status.cls}`}>{status.label}</span>
      </header>

      <section className="card" style={{ padding: 'var(--space-5)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Articles commandés</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Produit</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th><th>Avis</th></tr></thead>
            <tbody>
              {(commande.lignes ?? []).map((line) => {
                const productId = line.variante?.produit_id;
                return (
                  <tr key={line.id}>
                    <td>{line.designation ?? line.variante?.produit?.nom ?? 'Article'}</td>
                    <td>{line.quantite}</td>
                    <td>{formatPrix(line.prix_unitaire)}</td>
                    <td>{formatPrix(line.montant ?? line.sous_total ?? line.prix_unitaire * line.quantite)}</td>
                    <td>{canReview && productId ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReviewProductId(productId)}>Laisser un avis</button> : '—'}</td>
                  </tr>
                );
              })}
              {(commande.lignes ?? []).length === 0 && <tr><td colSpan={5}>Aucun article dans cette commande.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ padding: 'var(--space-5)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>Récapitulatif</h2>
        <p>Mode de livraison : {commande.mode_livraison ?? '—'}</p>
        {commande.adresse_livraison && <p>Adresse : {commande.adresse_livraison}</p>}
        {commande.frais_livraison ? <p>Frais de livraison : {formatPrix(commande.frais_livraison)}</p> : null}
        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-terra)', marginTop: 12 }}>Total : {formatPrix(commande.montant_ttc)}</p>
        {commande.acompte_requis ? <p>Acompte requis : {formatPrix(commande.acompte_requis)}</p> : null}
        {commande.montant_paye ? <p>Montant réglé : {formatPrix(commande.montant_paye)}</p> : null}
        {commande.notes && <p style={{ marginTop: 10 }}>Note : {commande.notes}</p>}
        {commande.statut === 'en_attente_paiement' && (
          <button type="button" className="btn btn-secondary" disabled={busy} style={{ marginTop: 16 }} onClick={cancelOrder}>
            {busy ? 'Traitement…' : 'Annuler la commande'}
          </button>
        )}
      </section>

      {reviewProductId && (
        <div className="modal-overlay" onClick={() => !busy && setReviewProductId(null)}>
          <form className="modal-box" onSubmit={submitReview} onClick={(event) => event.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Votre avis</h2>
              <button type="button" disabled={busy} onClick={() => setReviewProductId(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 14 }}>
              <label className="form-group">
                <span className="form-label">Note</span>
                <select className="form-input" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Commentaire (facultatif)</span>
                <textarea className="form-input" maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setReviewProductId(null)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer mon avis'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
