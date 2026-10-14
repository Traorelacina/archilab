import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  adminReversementsApi,
  type ReversementPartenaire,
  type ReversementRow,
} from '../../../api/adminReversements';

type ModalMode = 'generer' | 'verser' | null;

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as {
    message?: unknown;
    errors?: Record<string, unknown>;
  } | undefined;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  for (const value of Object.values(data?.errors ?? {})) {
    if (Array.isArray(value)) {
      const message = value.find((item): item is string => typeof item === 'string');
      if (message) return message;
    }
  }
  return fallback;
}

function dateInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}

function formatMoney(value?: number | null): string {
  return `${new Intl.NumberFormat('fr-FR').format(Number(value ?? 0))} FCFA`;
}

export default function ReversementsAdminPage() {
  const [rows, setRows] = useState<ReversementRow[]>([]);
  const [partenaires, setPartenaires] = useState<ReversementPartenaire[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statut, setStatut] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<ReversementRow | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [versement, setVersement] = useState<ReversementRow | null>(null);
  const [partenaireId, setPartenaireId] = useState('');
  const [periodeDebut, setPeriodeDebut] = useState(() => {
    const now = new Date();
    return dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [periodeFin, setPeriodeFin] = useState(() => dateInputValue(new Date()));
  const [modeVersement, setModeVersement] = useState('virement');
  const [referenceVersement, setReferenceVersement] = useState('');
  const [dateVersement, setDateVersement] = useState(() => dateInputValue(new Date()));

  const loadRows = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const response = await adminReversementsApi.list({
        page: targetPage,
        per_page: 15,
        statut: statut || undefined,
      });
      setRows(response.data.data);
      setPage(response.data.current_page);
      setLastPage(response.data.last_page);
      setTotal(response.data.total);
    } catch {
      toast.error('Impossible de charger les reversements.');
    } finally {
      setLoading(false);
    }
  }, [statut]);

  useEffect(() => {
    loadRows(1);
  }, [loadRows]);

  useEffect(() => {
    adminReversementsApi.partenaires()
      .then((response) => setPartenaires(response.data))
      .catch(() => toast.error('Impossible de charger la liste des partenaires.'));
  }, []);

  async function showDetail(id: number) {
    setLoadingDetail(true);
    try {
      const response = await adminReversementsApi.detail(id);
      setDetail(response.data);
    } catch {
      toast.error('Impossible de charger le détail du reversement.');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (modal === 'generer') {
        const response = await adminReversementsApi.generer({
          partenaire_id: Number(partenaireId),
          periode_debut: periodeDebut,
          periode_fin: periodeFin,
        });
        toast.success(response.data.message || 'Reversement généré.');
      } else if (modal === 'verser' && versement) {
        const response = await adminReversementsApi.verser(versement.id, {
          mode_versement: modeVersement,
          reference_versement: referenceVersement.trim() || undefined,
          date_versement: dateVersement,
        });
        toast.success(response.data.message || 'Reversement marqué comme versé.');
      }
      setModal(null);
      setVersement(null);
      await loadRows(1);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Impossible d’enregistrer cette opération.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Reversements partenaires</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>{total} reversement{total === 1 ? '' : 's'}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal('generer')}>Générer un reversement</button>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <label className="form-group" style={{ maxWidth: 240 }}>
          <span className="form-label">Statut</span>
          <select className="form-input" value={statut} onChange={(event) => setStatut(event.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="verse">Versé</option>
          </select>
        </label>
      </div>

      <div className="table-wrapper card">
        {loading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : (
          <table className="table">
            <thead><tr><th>Numéro</th><th>Partenaire</th><th>Période</th><th>Montant brut</th><th>Commission</th><th>Net à verser</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600 }}>{row.numero}</td>
                  <td>{row.partenaire?.raison_sociale ?? '—'}</td>
                  <td>{formatDate(row.periode_debut)} – {formatDate(row.periode_fin)}</td>
                  <td>{formatMoney(row.montant_brut)}</td>
                  <td>{formatMoney(row.commission)}</td>
                  <td style={{ fontWeight: 700 }}>{formatMoney(row.montant_net)}</td>
                  <td><span className={`badge ${row.statut === 'verse' ? 'badge-success' : 'badge-warning'}`}>{row.statut === 'verse' ? 'Versé' : 'En attente'}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => showDetail(row.id)}>Détail</button>
                    {row.statut === 'en_attente' && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => { setVersement(row); setModal('verser'); }}>Marquer versé</button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--color-gris-moyen)' }}>Aucun reversement à afficher.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => loadRows(page - 1)}>Précédent</button>
          <span>Page {page} sur {lastPage}</span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page >= lastPage} onClick={() => loadRows(page + 1)}>Suivant</button>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => !saving && setModal(null)}>
          <form className="modal-box" onSubmit={submit} onClick={(event) => event.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{modal === 'generer' ? 'Générer un reversement' : 'Confirmer le versement'}</h2>
              <button type="button" disabled={saving} onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 14 }}>
              {modal === 'generer' ? (
                <>
                  <label className="form-group">
                    <span className="form-label">Partenaire</span>
                    <select className="form-input" required value={partenaireId} onChange={(event) => setPartenaireId(event.target.value)}>
                      <option value="">Sélectionner un partenaire</option>
                      {partenaires.map((partenaire) => <option key={partenaire.id} value={partenaire.id}>{partenaire.raison_sociale}</option>)}
                    </select>
                  </label>
                  <label className="form-group">
                    <span className="form-label">Début de période</span>
                    <input className="form-input" type="date" required value={periodeDebut} onChange={(event) => setPeriodeDebut(event.target.value)} />
                  </label>
                  <label className="form-group">
                    <span className="form-label">Fin de période</span>
                    <input className="form-input" type="date" min={periodeDebut} required value={periodeFin} onChange={(event) => setPeriodeFin(event.target.value)} />
                  </label>
                  <p style={{ color: 'var(--color-gris-moyen)', fontSize: 'var(--text-xs)' }}>Le relevé inclut les ventes livrées non encore reversées durant cette période.</p>
                </>
              ) : (
                <>
                  <p>Le reversement <strong>{versement?.numero}</strong> sera enregistré comme versé.</p>
                  <label className="form-group">
                    <span className="form-label">Mode de versement</span>
                    <select className="form-input" required value={modeVersement} onChange={(event) => setModeVersement(event.target.value)}>
                      <option value="virement">Virement</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="especes">Espèces</option>
                    </select>
                  </label>
                  <label className="form-group">
                    <span className="form-label">Date de versement</span>
                    <input className="form-input" type="date" required value={dateVersement} onChange={(event) => setDateVersement(event.target.value)} />
                  </label>
                  <label className="form-group">
                    <span className="form-label">Référence (facultatif)</span>
                    <input className="form-input" maxLength={100} value={referenceVersement} onChange={(event) => setReferenceVersement(event.target.value)} />
                  </label>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : modal === 'generer' ? 'Générer' : 'Confirmer le versement'}</button>
            </div>
          </form>
        </div>
      )}

      {(detail || loadingDetail) && (
        <div className="modal-overlay" onClick={() => !loadingDetail && setDetail(null)}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{detail ? `Détail — ${detail.numero}` : 'Chargement…'}</h2>
              <button type="button" disabled={loadingDetail} onClick={() => setDetail(null)}>✕</button>
            </div>
            {loadingDetail ? <div className="page-loader"><div className="spinner" /></div> : detail && (
              <div className="modal-body">
                <p><strong>{detail.partenaire?.raison_sociale ?? 'Partenaire'}</strong> · {formatDate(detail.periode_debut)} – {formatDate(detail.periode_fin)}</p>
                <p style={{ margin: '10px 0 18px' }}>Brut {formatMoney(detail.montant_brut)} · Commission {formatMoney(detail.commission)} · Net {formatMoney(detail.montant_net)}</p>
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Commande</th><th>Article</th><th>Qté</th><th>Vente</th><th>Commission</th><th>Net</th></tr></thead>
                    <tbody>
                      {(detail.lignes ?? []).map((line) => (
                        <tr key={line.id}>
                          <td>{line.commande_ligne?.commande?.numero ?? '—'}</td>
                          <td>{line.commande_ligne?.designation ?? '—'}</td>
                          <td>{line.commande_ligne?.quantite ?? '—'}</td>
                          <td>{formatMoney(line.montant_vente)}</td>
                          <td>{formatMoney(line.commission)}</td>
                          <td>{formatMoney(line.montant_net)}</td>
                        </tr>
                      ))}
                      {(detail.lignes ?? []).length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center' }}>Aucune ligne de reversement.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" disabled={loadingDetail} onClick={() => setDetail(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
