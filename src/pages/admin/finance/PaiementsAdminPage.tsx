import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../../api/admin';
import type { Paiement } from '../../../types';
import { formatPrix, formatDate } from '../../../utils/format';
import { IconSearch, IconCheck, IconX } from '../../../components/ui/Icons';
import toast from 'react-hot-toast';

export default function PaiementsAdminPage() {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState('');

  const doFetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.paiements({ page: p, per_page: 15, statut: statut || undefined });
      setPaiements(res.data.data);
      setTotal(res.data.meta.total);
      setLastPage(res.data.meta.last_page);
      setPage(p);
    } finally { setLoading(false); }
  }, [statut]);

  useEffect(() => { doFetch(1); }, [doFetch]);

  const handleValider = async (id: number) => {
    try { await adminApi.validerPaiement(id); setPaiements(pp => pp.map(p => p.id === id ? { ...p, statut: 'valide' as const } : p)); toast.success('Paiement validé'); }
    catch { toast.error('Erreur'); }
  };
  const handleRejeter = async (id: number) => {
    try { await adminApi.rejeterPaiement(id); setPaiements(pp => pp.map(p => p.id === id ? { ...p, statut: 'rejete' as const } : p)); toast.error('Paiement rejeté'); }
    catch { toast.error('Erreur'); }
  };

  const statutCls: Record<string, string> = { en_attente: 'badge-warning', valide: 'badge-success', rejete: 'badge-error' };
  const statutLbl: Record<string, string> = { en_attente: 'En attente', valide: 'Validé', rejete: 'Rejeté' };
  const modeLbl: Record<string, string> = { mobile_money: 'Mobile Money', virement: 'Virement', especes: 'Espèces', tpe: 'TPE' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Paiements</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>{total} paiement{total !== 1 ? 's' : ''}</p>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
        <select className="form-input" style={{ width: 180 }} value={statut} onChange={e => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="valide">Validé</option>
          <option value="rejete">Rejeté</option>
        </select>
      </div>

      <div className="table-wrapper card">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Mode</th><th>Opérateur</th><th>Référence</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {paiements.map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--color-gris-moyen)' }}>{formatDate(p.created_at)}</td>
                  <td style={{ fontWeight: 500 }}>{modeLbl[p.mode] ?? p.mode}</td>
                  <td style={{ color: 'var(--color-gris-moyen)' }}>{p.operateur ?? '—'}</td>
                  <td><code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-gris-moyen)' }}>{p.reference ?? '—'}</code></td>
                  <td style={{ fontWeight: 700, color: 'var(--color-terra)' }}>{formatPrix(p.montant)}</td>
                  <td><span className={`badge ${statutCls[p.statut]}`}>{statutLbl[p.statut]}</span></td>
                  <td>
                    {p.statut === 'en_attente' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleValider(p.id)} className="btn btn-primary btn-sm" style={{ gap: 4 }}><IconCheck size={12} /> Valider</button>
                        <button onClick={() => handleRejeter(p.id)} className="btn btn-secondary btn-sm" style={{ gap: 4 }}><IconX size={12} /> Rejeter</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          <button onClick={() => doFetch(page - 1)} disabled={page <= 1} className="btn btn-secondary btn-sm">← Précédent</button>
          <span style={{ padding: '6px 14px', fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>Page {page} / {lastPage}</span>
          <button onClick={() => doFetch(page + 1)} disabled={page >= lastPage} className="btn btn-secondary btn-sm">Suivant →</button>
        </div>
      )}
    </div>
  );
}
