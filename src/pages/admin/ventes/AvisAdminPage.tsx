import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../../api/admin';
import type { Avis } from '../../../types';
import { formatDate } from '../../../utils/format';
import { IconCheck, IconX } from '../../../components/ui/Icons';
import toast from 'react-hot-toast';

export default function AvisAdminPage() {
  const [avis, setAvis] = useState<Avis[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState('en_attente');

  const doFetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.avis({ page: p, per_page: 15, statut: statut || undefined });
      setAvis(res.data.data);
      setTotal(res.data.meta.total);
      setLastPage(res.data.meta.last_page);
      setPage(p);
    } finally { setLoading(false); }
  }, [statut]);

  useEffect(() => { doFetch(1); }, [doFetch]);

  const handleModerer = async (id: number, s: 'approuve' | 'rejete') => {
    try {
      await adminApi.modererAvis(id, s);
      setAvis(aa => aa.filter(a => a.id !== id));
      toast.success(s === 'approuve' ? 'Avis approuvé' : 'Avis rejeté');
    } catch { toast.error('Erreur'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Avis clients</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>{total} avis</p>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
        <select className="form-input" style={{ width: 180 }} value={statut} onChange={e => setStatut(e.target.value)}>
          <option value="">Tous</option>
          <option value="en_attente">En attente</option>
          <option value="approuve">Approuvés</option>
          <option value="rejete">Rejetés</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {loading ? <div className="page-loader"><div className="spinner" /></div> :
          avis.length === 0 ? <div className="empty-state"><h3>Aucun avis</h3></div> :
          avis.map(a => (
            <div key={a.id} className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= a.note ? 'var(--color-warning)' : 'none'} stroke="var(--color-warning)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      ))}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{a.user?.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)' }}>{formatDate(a.created_at)}</span>
                    <span className={`badge ${a.statut === 'approuve' ? 'badge-success' : a.statut === 'rejete' ? 'badge-error' : 'badge-warning'}`}>{a.statut}</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-terra)', fontWeight: 600, marginBottom: 4 }}>Produit : {a.produit?.nom}</p>
                  {a.commentaire && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-fonce)', lineHeight: 1.6 }}>{a.commentaire}</p>}
                </div>
                {a.statut === 'en_attente' && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleModerer(a.id, 'approuve')} className="btn btn-primary btn-sm" style={{ gap: 4 }}><IconCheck size={12} /> Approuver</button>
                    <button onClick={() => handleModerer(a.id, 'rejete')} className="btn btn-secondary btn-sm" style={{ gap: 4 }}><IconX size={12} /> Rejeter</button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
