import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { adminApi } from '../../../api/admin';
import type { Stock } from '../../../types';
import { adminDepotsApi, type AdminDepot } from '../../../api/adminDepots';
import { adminStockApi, type StockVarianteOption } from '../../../api/adminStock';
import { IconSearch, IconAlertTriangle, IconRefreshCw } from '../../../components/ui/Icons';
import toast from 'react-hot-toast';

export default function StocksAdminPage() {
  const location = useLocation();
  const alertesPage = location.pathname.endsWith('/alertes');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [alerteOnly, setAlerteOnly] = useState(alertesPage);
  const [modalStock, setModalStock] = useState<Stock | null>(null);
  const [newSeuil, setNewSeuil] = useState('');
  const [showInventaire, setShowInventaire] = useState(false);
  const [inventoryDepots, setInventoryDepots] = useState<AdminDepot[]>([]);
  const [inventoryVariants, setInventoryVariants] = useState<StockVarianteOption[]>([]);
  const [inventoryDepotId, setInventoryDepotId] = useState('');
  const [inventoryQuantities, setInventoryQuantities] = useState<Record<number, string>>({});
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySaving, setInventorySaving] = useState(false);

  const doFetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      if (alerteOnly) {
        const response = await adminApi.alertesStock();
        setStocks(response.data);
        setTotal(response.data.length);
        setLastPage(1);
      } else {
        const response = await adminApi.stocks({
          page: p,
          per_page: 15,
          recherche: q || undefined,
        });
        setStocks(response.data.data);
        setTotal(response.data.total);
        setLastPage(response.data.last_page);
      }
      setPage(p);
    } catch {
      toast.error('Impossible de charger les stocks.');
    } finally { setLoading(false); }
  }, [q, alerteOnly]);

  useEffect(() => { doFetch(1); }, [doFetch]);

  const handleMajSeuil = async () => {
    if (!modalStock) return;
    try {
      await adminApi.majSeuil(modalStock.id, Number(newSeuil));
      setStocks(ss => ss.map(s => s.id === modalStock.id ? { ...s, seuil_alerte: Number(newSeuil) } : s));
      toast.success('Seuil mis à jour');
      setModalStock(null);
    } catch { toast.error('Erreur'); }
  };

  const openInventory = async () => {
    setShowInventaire(true);
    setInventoryLoading(true);
    try {
      const [depotsResponse, variantsResponse] = await Promise.all([
        adminDepotsApi.depots(),
        adminStockApi.variantes(),
      ]);
      const actifs = depotsResponse.data.filter((depot) => depot.actif !== false);
      setInventoryDepots(actifs);
      setInventoryVariants(variantsResponse.data.data);
      if (actifs[0]) {
        await loadInventoryForDepot(actifs[0].id, variantsResponse.data.data);
      }
    } catch {
      toast.error('Impossible de préparer l’inventaire.');
      setShowInventaire(false);
    } finally {
      setInventoryLoading(false);
    }
  };

  const loadInventoryForDepot = async (depotId: number, variants = inventoryVariants) => {
    setInventoryLoading(true);
    setInventoryDepotId(String(depotId));
    try {
      const response = await adminApi.stocks({
        depot_id: depotId,
        page: 1,
        per_page: 1000,
      });
      const current = new Map(response.data.data.map((stock) => [stock.variante?.id, stock.quantite]));
      setInventoryQuantities(Object.fromEntries(
        variants.map((variant) => [variant.id, String(current.get(variant.id) ?? 0)]),
      ));
    } catch {
      toast.error('Impossible de charger les quantités de ce dépôt.');
    } finally {
      setInventoryLoading(false);
    }
  };

  const submitInventory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inventoryDepotId || inventoryVariants.length === 0) {
      toast.error('Sélectionnez un dépôt contenant des variantes actives.');
      return;
    }
    const lignes = inventoryVariants.map((variant) => ({
      variante_id: variant.id,
      quantite_constatee: Number(inventoryQuantities[variant.id] ?? 0),
    }));
    if (lignes.some((line) => !Number.isInteger(line.quantite_constatee) || line.quantite_constatee < 0)) {
      toast.error('Les quantités constatées doivent être des entiers positifs ou nuls.');
      return;
    }

    setInventorySaving(true);
    try {
      const response = await adminStockApi.inventaire({
        depot_id: Number(inventoryDepotId),
        lignes,
      });
      toast.success(`${response.data.message} Écarts corrigés : ${response.data.ecarts.length}.`);
      setShowInventaire(false);
      await doFetch(1);
    } catch {
      toast.error('Impossible de valider cet inventaire.');
    } finally {
      setInventorySaving(false);
    }
  };

  const isAlerte = (s: Stock) => s.quantite - (s.quantite_reservee ?? 0) <= s.seuil_alerte;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{alerteOnly ? 'Alertes de stock' : 'Inventaire'}</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>{total} référence{total !== 1 ? 's' : ''}</p>
        </div>
        {!alerteOnly && <button type="button" className="btn btn-primary" onClick={openInventory}>Faire un inventaire</button>}
      </div>

      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gris-clair)' }} />
          <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Produit, SKU..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500, color: alerteOnly ? 'var(--color-error)' : 'var(--color-gris-fonce)' }}>
          <input type="checkbox" checked={alerteOnly} onChange={e => setAlerteOnly(e.target.checked)} style={{ accentColor: 'var(--color-error)' }} />
          <IconAlertTriangle size={14} /> Alertes uniquement
        </label>
      </div>

      <div className="table-wrapper card">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : (
          <table className="table">
            <thead><tr><th>Produit</th><th>Variante (SKU)</th><th>Dépôt</th><th>Quantité</th><th>Seuil alerte</th><th>Actions</th></tr></thead>
            <tbody>
              {stocks.map(s => (
                <tr key={s.id} style={{ background: isAlerte(s) ? 'rgba(184,50,50,.03)' : undefined }}>
                  <td style={{ fontWeight: 600 }}>{s.variante?.produit?.nom ?? '—'}</td>
                  <td>
                    <div>
                      <span style={{ color: 'var(--color-gris-fonce)' }}>{s.variante?.nom ?? s.variante?.libelle ?? s.variante?.sku}</span>
                      <code style={{ display: 'block', fontSize: 10, color: 'var(--color-gris-moyen)', fontFamily: 'var(--font-mono)' }}>{s.variante?.sku}</code>
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-gris-moyen)' }}>{s.depot?.nom ?? 'Principal'}</td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: isAlerte(s) ? 'var(--color-error)' : s.quantite <= s.seuil_alerte * 2 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {s.quantite}
                    </span>
                    {isAlerte(s) && <span className="badge badge-error" style={{ marginLeft: 6, fontSize: 9 }}><IconAlertTriangle size={10} /> Alerte</span>}
                  </td>
                  <td style={{ color: 'var(--color-gris-moyen)' }}>{s.seuil_alerte}</td>
                  <td>
                    <button onClick={() => { setModalStock(s); setNewSeuil(String(s.seuil_alerte)); }} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                      <IconRefreshCw size={12} /> Seuil
                    </button>
                  </td>
                </tr>
              ))}
              {stocks.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--color-gris-moyen)' }}>Aucun stock ne correspond à cette recherche.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {lastPage > 1 && !alerteOnly && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          <button onClick={() => doFetch(page - 1)} disabled={page <= 1} className="btn btn-secondary btn-sm">← Précédent</button>
          <span style={{ padding: '6px 14px', fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>Page {page} / {lastPage}</span>
          <button onClick={() => doFetch(page + 1)} disabled={page >= lastPage} className="btn btn-secondary btn-sm">Suivant →</button>
        </div>
      )}

      {modalStock && (
        <div className="modal-overlay" onClick={() => setModalStock(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Modifier le seuil d'alerte</h3>
              <button onClick={() => setModalStock(null)} style={{ cursor: 'pointer', color: 'var(--color-gris-moyen)' }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)', marginBottom: 'var(--space-4)' }}>
                {modalStock.variante?.produit?.nom} · {modalStock.variante?.libelle}
              </p>
              <div className="form-group">
                <label className="form-label">Seuil d'alerte (quantité)</label>
                <input className="form-input" type="number" min="0" value={newSeuil} onChange={e => setNewSeuil(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModalStock(null)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleMajSeuil} className="btn btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {showInventaire && (
        <div className="modal-overlay" onClick={() => !inventorySaving && setShowInventaire(false)}>
          <form className="modal-box" onSubmit={submitInventory} onClick={(event) => event.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Inventaire physique</h2>
              <button type="button" disabled={inventorySaving} onClick={() => setShowInventaire(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="form-group" style={{ maxWidth: 420 }}>
                <span className="form-label">Dépôt à inventorier</span>
                <select
                  className="form-input"
                  required
                  value={inventoryDepotId}
                  onChange={(event) => {
                    const selected = Number(event.target.value);
                    if (selected) loadInventoryForDepot(selected);
                  }}
                >
                  <option value="">Choisir un dépôt</option>
                  {inventoryDepots.map((depot) => <option key={depot.id} value={depot.id}>{depot.nom}</option>)}
                </select>
              </label>
              {inventoryLoading ? (
                <div className="page-loader"><div className="spinner" /></div>
              ) : (
                <div className="table-wrapper" style={{ maxHeight: 380, overflowY: 'auto', marginTop: 16 }}>
                  <table className="table">
                    <thead><tr><th>Produit / variante</th><th>SKU</th><th>Quantité constatée</th></tr></thead>
                    <tbody>
                      {inventoryVariants.map((variant) => (
                        <tr key={variant.id}>
                          <td>{variant.produit?.nom ?? 'Produit'} · {variant.nom ?? variant.sku}</td>
                          <td>{variant.sku}</td>
                          <td>
                            <input
                              className="form-input"
                              aria-label={`Quantité constatée ${variant.sku}`}
                              type="number"
                              min="0"
                              step="1"
                              required
                              value={inventoryQuantities[variant.id] ?? '0'}
                              onChange={(event) => setInventoryQuantities((values) => ({
                                ...values,
                                [variant.id]: event.target.value,
                              }))}
                            />
                          </td>
                        </tr>
                      ))}
                      {inventoryVariants.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>Aucune variante active à inventorier.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              <p style={{ marginTop: 12, fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)' }}>
                La validation ajuste chaque variante sélectionnée à la quantité réellement constatée.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" disabled={inventorySaving} onClick={() => setShowInventaire(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={inventorySaving || inventoryLoading}>
                {inventorySaving ? 'Validation…' : 'Valider l’inventaire'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
