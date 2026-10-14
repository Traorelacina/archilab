import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { adminDepotsApi, type AdminDepot } from '../../../api/adminDepots';
import {
  adminStockApi,
  type MouvementStockRow,
  type StockVarianteOption,
} from '../../../api/adminStock';

type MouvementType = 'entree' | 'sortie' | 'ajustement' | 'transfert';

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

const typeLabels: Record<string, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  ajustement: 'Ajustement',
  transfert: 'Transfert',
  reservation: 'Réservation',
  liberation: 'Libération',
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
}

export default function MouvementsAdminPage() {
  const [rows, setRows] = useState<MouvementStockRow[]>([]);
  const [variantes, setVariantes] = useState<StockVarianteOption[]>([]);
  const [depots, setDepots] = useState<AdminDepot[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterDepot, setFilterDepot] = useState('');
  const [formType, setFormType] = useState<MouvementType>('entree');
  const [varianteId, setVarianteId] = useState('');
  const [depotId, setDepotId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [quantite, setQuantite] = useState('');
  const [motif, setMotif] = useState('');
  const [reference, setReference] = useState('');

  const loadMovements = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const response = await adminStockApi.mouvements({
        page: targetPage,
        per_page: 20,
        type: filterType || undefined,
        depot_id: filterDepot ? Number(filterDepot) : undefined,
      });
      setRows(response.data.data);
      setPage(response.data.current_page);
      setLastPage(response.data.last_page);
      setTotal(response.data.total);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Impossible de charger les mouvements de stock.'));
    } finally {
      setLoading(false);
    }
  }, [filterDepot, filterType]);

  useEffect(() => {
    Promise.all([adminStockApi.variantes(), adminDepotsApi.depots()])
      .then(([variantsResponse, depotsResponse]) => {
        setVariantes(variantsResponse.data.data);
        setDepots(depotsResponse.data.filter((depot) => depot.actif !== false));
      })
      .catch((error: unknown) => toast.error(apiErrorMessage(error, 'Impossible de charger les options de stock.')));
  }, []);

  useEffect(() => {
    loadMovements(1);
  }, [filterDepot, filterType, loadMovements]);

  function resetForm() {
    setFormType('entree');
    setVarianteId('');
    setDepotId('');
    setDestinationId('');
    setQuantite('');
    setMotif('');
    setReference('');
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const qty = Number(quantite);
    if (!Number.isInteger(qty) || qty < (formType === 'transfert' ? 1 : 0)) {
      toast.error(formType === 'transfert'
        ? 'La quantité du transfert doit être supérieure à zéro.'
        : 'Saisissez une quantité entière valide.');
      return;
    }
    if (!varianteId) {
      toast.error('Sélectionnez une variante.');
      return;
    }
    if (formType === 'transfert' && depotId === destinationId) {
      toast.error('Le dépôt source et le dépôt destinataire doivent être différents.');
      return;
    }

    setSaving(true);
    try {
      if (formType === 'transfert') {
        await adminStockApi.transfert({
          variante_id: Number(varianteId),
          depot_source_id: Number(depotId),
          depot_destination_id: Number(destinationId),
          quantite: qty,
          motif: motif.trim() || undefined,
        });
      } else {
        await adminStockApi.mouvement({
          variante_id: Number(varianteId),
          depot_id: Number(depotId),
          type: formType,
          quantite: qty,
          motif: motif.trim(),
          reference: reference.trim() || undefined,
        });
      }
      toast.success(formType === 'transfert' ? 'Transfert effectué.' : 'Mouvement enregistré.');
      setShowForm(false);
      resetForm();
      await loadMovements(1);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Impossible d’enregistrer le mouvement. Vérifiez le stock et les champs saisis.'));
    } finally {
      setSaving(false);
    }
  }

  const variantLabel = (variant: StockVarianteOption) =>
    `${variant.produit?.nom ?? 'Produit'} · ${variant.nom || variant.sku} (${variant.sku})`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Mouvements de stock</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>{total} mouvement{total === 1 ? '' : 's'}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>Nouveau mouvement</button>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <select className="form-input" aria-label="Filtrer par type" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="form-input" aria-label="Filtrer par dépôt" value={filterDepot} onChange={(event) => setFilterDepot(event.target.value)}>
          <option value="">Tous les dépôts</option>
          {depots.map((depot) => <option key={depot.id} value={depot.id}>{depot.nom}</option>)}
        </select>
      </div>

      <div className="table-wrapper card">
        {loading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Produit / variante</th><th>Type</th><th>Quantité</th><th>Dépôt</th><th>Motif / référence</th><th>Utilisateur</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.created_at)}</td>
                  <td>
                    <strong>{row.variante?.produit?.nom ?? '—'}</strong>
                    <small style={{ display: 'block', color: 'var(--color-gris-moyen)' }}>{row.variante?.nom || row.variante?.sku || ''} {row.variante?.nom && row.variante.sku ? `(${row.variante.sku})` : ''}</small>
                  </td>
                  <td><span className="badge badge-neutral">{typeLabels[row.type] ?? row.type}</span></td>
                  <td>{row.quantite}</td>
                  <td>{row.depot?.nom ?? '—'}{row.depot_destination ? ` → ${row.depot_destination.nom}` : ''}</td>
                  <td>{row.motif || '—'}{row.reference ? <small style={{ display: 'block', color: 'var(--color-gris-moyen)' }}>{row.reference}</small> : null}</td>
                  <td>{row.user?.name ?? 'Système'}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--color-gris-moyen)' }}>Aucun mouvement pour ces filtres.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => loadMovements(page - 1)}>Précédent</button>
          <span>Page {page} sur {lastPage}</span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page >= lastPage} onClick={() => loadMovements(page + 1)}>Suivant</button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => !saving && setShowForm(false)}>
          <form className="modal-box" onSubmit={submitMovement} onClick={(event) => event.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Nouveau mouvement</h2>
              <button type="button" disabled={saving} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 14 }}>
              <label className="form-group">
                <span className="form-label">Opération</span>
                <select className="form-input" value={formType} onChange={(event) => setFormType(event.target.value as MouvementType)}>
                  <option value="entree">Entrée de stock</option>
                  <option value="sortie">Sortie de stock</option>
                  <option value="ajustement">Ajuster la quantité</option>
                  <option value="transfert">Transfert entre dépôts</option>
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Variante</span>
                <select className="form-input" required value={varianteId} onChange={(event) => setVarianteId(event.target.value)}>
                  <option value="">Choisir une variante</option>
                  {variantes.map((variant) => <option key={variant.id} value={variant.id}>{variantLabel(variant)}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">{formType === 'transfert' ? 'Dépôt source' : 'Dépôt'}</span>
                <select className="form-input" required value={depotId} onChange={(event) => setDepotId(event.target.value)}>
                  <option value="">Choisir un dépôt</option>
                  {depots.map((depot) => <option key={depot.id} value={depot.id}>{depot.nom}</option>)}
                </select>
              </label>
              {formType === 'transfert' && (
                <label className="form-group">
                  <span className="form-label">Dépôt destinataire</span>
                  <select className="form-input" required value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
                    <option value="">Choisir le dépôt destinataire</option>
                    {depots.filter((depot) => String(depot.id) !== depotId).map((depot) => <option key={depot.id} value={depot.id}>{depot.nom}</option>)}
                  </select>
                </label>
              )}
              <label className="form-group">
                <span className="form-label">{formType === 'ajustement' ? 'Nouvelle quantité constatée' : 'Quantité'}</span>
                <input className="form-input" type="number" min={formType === 'transfert' ? 1 : 0} step="1" required value={quantite} onChange={(event) => setQuantite(event.target.value)} />
              </label>
              <label className="form-group">
                <span className="form-label">Motif{formType !== 'transfert' ? '' : ' (facultatif)'}</span>
                <input className="form-input" maxLength={255} required={formType !== 'transfert'} value={motif} onChange={(event) => setMotif(event.target.value)} />
              </label>
              {formType !== 'transfert' && (
                <label className="form-group">
                  <span className="form-label">Référence (facultatif)</span>
                  <input className="form-input" maxLength={100} value={reference} onChange={(event) => setReference(event.target.value)} />
                </label>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
