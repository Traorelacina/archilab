import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { clientApi } from '../../api/client-api';
import type { Devis } from '../../types';
import { formatPrix, formatDate, statutDevis } from '../../utils/format';
import { IconFileText } from '../../components/ui/Icons';

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

export default function DevisPage() {
  const navigate = useNavigate();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [detail, setDetail] = useState<Devis | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    clientApi.devis({ page })
      .then((response) => {
        if (!active) return;
        setDevis(response.data.data);
        setLastPage(response.data.last_page);
        setLoadError(false);
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
          toast.error('Impossible de charger vos devis.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page]);

  async function showDetail(id: number) {
    try {
      const response = await clientApi.devisDetail(id);
      setDetail(response.data);
    } catch (error) {
      toast.error(errorMessage(error, 'Impossible de charger le détail de ce devis.'));
    }
  }

  async function decide(id: number, accepted: boolean) {
    const action = accepted ? 'accepter' : 'refuser';
    if (!window.confirm(`Confirmez-vous vouloir ${action} ce devis ?`)) return;
    setBusyId(id);
    try {
      if (accepted) {
        const response = await clientApi.accepterDevis(id);
        toast.success(response.data.message || 'Devis accepté, votre commande est créée.');
        navigate(`/espace-client/commandes/${response.data.commande.id}`);
      } else {
        const response = await clientApi.refuserDevis(id);
        toast.success(response.data.message || 'Devis refusé.');
        setDevis((current) => current.map((quote) => quote.id === id ? { ...quote, statut: 'refuse' } : quote));
        setDetail((current) => current?.id === id ? { ...current, statut: 'refuse' } : current);
      }
    } catch (error) {
      toast.error(errorMessage(error, `Impossible de ${action} ce devis.`));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Mes devis</h1>
        <Link to="/espace-client/devis/nouveau" className="btn btn-primary">Demander un devis</Link>
      </div>
      {loading ? <div className="page-loader"><div className="spinner" /></div> :
        loadError ? <div className="empty-state"><h3>Devis indisponibles</h3><p>Une erreur est survenue pendant le chargement de vos devis.</p></div> :
        devis.length === 0 ? (
          <div className="empty-state">
            <IconFileText size={48} style={{ margin: '0 auto 12px', opacity: .3 }} />
            <h3>Aucun devis</h3>
            <p>Vous n'avez pas encore de devis en cours.</p>
            <Link to="/espace-client/devis/nouveau" className="btn btn-primary" style={{ marginTop: 16 }}>Demander un devis</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {devis.map((quote) => {
              const status = statutDevis[quote.statut] ?? { label: quote.statut, cls: 'badge-neutral' };
              const expiration = quote.date_validite ?? quote.date_expiration;
              return (
                <div key={quote.id} className="card" style={{ padding: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-charbon)' }}>#{quote.numero}</span>
                        <span className={`badge ${status.cls}`}>{status.label}</span>
                      </div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>Émis le {formatDate(quote.created_at)}</p>
                      {expiration && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>Valide jusqu’au {formatDate(expiration)}</p>}
                      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => showDetail(quote.id)}>Voir le détail</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-terra)' }}>{formatPrix(quote.montant_ttc)}</span>
                      {quote.statut === 'envoye' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button disabled={busyId === quote.id} onClick={() => decide(quote.id, true)} className="btn btn-primary btn-sm">Accepter</button>
                          <button disabled={busyId === quote.id} onClick={() => decide(quote.id, false)} className="btn btn-secondary btn-sm">Refuser</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      {!loading && !loadError && lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 'var(--space-5)' }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Précédent</button>
          <span>Page {page} sur {lastPage}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= lastPage} onClick={() => setPage((current) => Math.min(lastPage, current + 1))}>Suivant</button>
        </div>
      )}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Devis #{detail.numero}</h2>
              <button type="button" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Demande :</strong> {detail.demande_client || '—'}</p>
              {detail.lignes?.length ? (
                <div className="table-wrapper" style={{ marginTop: 16 }}>
                  <table className="table">
                    <thead><tr><th>Désignation</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th></tr></thead>
                    <tbody>{detail.lignes.map((line) => (
                      <tr key={line.id}>
                        <td>{line.designation ?? line.variante?.nom ?? 'Article'}</td>
                        <td>{line.quantite}</td>
                        <td>{formatPrix(line.prix_unitaire)}</td>
                        <td>{formatPrix(line.montant ?? line.sous_total ?? line.prix_unitaire * line.quantite)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p style={{ marginTop: 12 }}>Aucune ligne produit n’est rattachée à ce devis.</p>}
              <p style={{ fontWeight: 700, marginTop: 16 }}>Total TTC : {formatPrix(detail.montant_ttc)}</p>
            </div>
            <div className="modal-footer">
              {detail.statut === 'envoye' && <>
                <button type="button" className="btn btn-secondary" disabled={busyId === detail.id} onClick={() => decide(detail.id, false)}>Refuser</button>
                <button type="button" className="btn btn-primary" disabled={busyId === detail.id} onClick={() => decide(detail.id, true)}>Accepter</button>
              </>}
              <button type="button" className="btn btn-secondary" onClick={() => setDetail(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
