import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../../api/admin';
import type { Commande } from '../../../types';
import { formatPrix, formatDate, statutCommande } from '../../../utils/format';
import { IconSearch, IconEye } from '../../../components/ui/Icons';
import toast from 'react-hot-toast';

const STATUTS = ['en_attente_paiement','confirmee','en_preparation','en_fabrication','prete','en_livraison','livree','cloturee','annulee'];

export default function CommandesAdminPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statut, setStatut] = useState('');
  const [modal, setModal] = useState<{ commande: Commande; newStatut: string } | null>(null);

  const doFetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.commandes({ page: p, per_page: 15, q: q || undefined, statut: statut || undefined });
      setCommandes(res.data.data);
      setTotal(res.data.meta.total);
      setLastPage(res.data.meta.last_page);
      setPage(p);
    } finally { setLoading(false); }
  }, [q, statut]);

  useEffect(() => { doFetch(1); }, [doFetch]);

  const handleChangerStatut = async () => {
    if (!modal) return;
    try {
      await adminApi.changerStatutCommande(modal.commande.id, modal.newStatut);
      setCommandes(cc => cc.map(c => c.id === modal.commande.id ? { ...c, statut: modal.newStatut as any } : c));
      toast.success('Statut mis à jour');
      setModal(null);
    } catch { toast.error('Erreur'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Commandes</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>{total} commande{total !== 1 ? 's' : ''}</p>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gris-clair)' }} />
          <input className="form-input" style={{ paddingLeft: 34 }} placeholder="N° commande, client..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 200 }} value={statut} onChange={e => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{statutCommande[s]?.label ?? s}</option>)}
        </select>
      </div>

      <div className="table-wrapper card">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : (
          <table className="table">
            <thead><tr><th>N° Commande</th><th>Client</th><th>Date</th><th>Livraison</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {commandes.map(c => {
                const st = statutCommande[c.statut] ?? { label: c.statut, cls: 'badge-neutral' };
                const livraisonLbl: Record<string, string> = { retrait: 'Retrait', livraison_abidjan: 'Abidjan', livraison_interieur: 'Intérieur' };
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>#{c.numero}</td>
                    <td style={{ color: 'var(--color-gris-fonce)' }}>{c.client?.name ?? '—'}</td>
                    <td style={{ color: 'var(--color-gris-moyen)' }}>{formatDate(c.created_at)}</td>
                    <td style={{ color: 'var(--color-gris-moyen)' }}>{livraisonLbl[c.mode_livraison] ?? c.mode_livraison}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-terra)' }}>{formatPrix(c.montant_ttc)}</td>
                    <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link to={`/admin/ventes/commandes/${c.id}`} className="btn btn-ghost btn-sm"><IconEye size={13} /></Link>
                        <button onClick={() => setModal({ commande: c, newStatut: c.statut })} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>Statut</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* Modal changement statut */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Changer le statut</h3>
              <button onClick={() => setModal(null)} style={{ cursor: 'pointer', color: 'var(--color-gris-moyen)' }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)', marginBottom: 'var(--space-4)' }}>Commande #{modal.commande.numero}</p>
              <select className="form-input" value={modal.newStatut} onChange={e => setModal(m => m ? { ...m, newStatut: e.target.value } : null)}>
                {STATUTS.map(s => <option key={s} value={s}>{statutCommande[s]?.label ?? s}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleChangerStatut} className="btn btn-primary">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
