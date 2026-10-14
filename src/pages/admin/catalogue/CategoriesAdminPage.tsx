import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminCategoriesApi,
  type AdminCategorie,
} from '../../../api/adminCategories';
import { IconPlus, IconEdit, IconSearch } from '../../../components/ui/Icons';

function apiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (typeof first === 'string') return first;
  }
  return fallback;
}

type TreeRow = { categorie: AdminCategorie; depth: number };

function sortCats(items: AdminCategorie[]) {
  return [...items].sort((a, b) => {
    const oa = a.ordre ?? 0;
    const ob = b.ordre ?? 0;
    return oa !== ob ? oa - ob : a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
  });
}

function buildTree(categories: AdminCategorie[]): TreeRow[] {
  const children = new Map<number | null, AdminCategorie[]>();
  for (const c of categories) {
    const parentId = c.parent_id ?? c.parent?.id ?? null;
    children.set(parentId, [...(children.get(parentId) ?? []), c]);
  }

  const rows: TreeRow[] = [];
  const visited = new Set<number>();

  const visit = (c: AdminCategorie, depth: number) => {
    if (visited.has(c.id)) return;
    visited.add(c.id);
    rows.push({ categorie: c, depth });
    sortCats(children.get(c.id) ?? []).forEach(child => visit(child, depth + 1));
  };

  sortCats(children.get(null) ?? []).forEach(c => visit(c, 0));
  sortCats(categories).filter(c => !visited.has(c.id)).forEach(c => visit(c, 0));
  return rows;
}

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<AdminCategorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminCategoriesApi.categories();
      setCategories(res.data);
    } catch (e) {
      const message = apiError(e, 'Impossible de charger les catégories.');
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => buildTree(categories), [categories]);
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('fr');
    return rows.filter(({ categorie: c }) => {
      const byText = !q || c.nom.toLocaleLowerCase('fr').includes(q) ||
        c.slug?.toLocaleLowerCase('fr').includes(q) ||
        c.description?.toLocaleLowerCase('fr').includes(q);
      const byStatus = status === 'all' || (status === 'active' ? c.active : !c.active);
      return byText && byStatus;
    });
  }, [rows, search, status]);

  const activeCount = categories.filter(c => c.active).length;

  const toggleActive = async (c: AdminCategorie) => {
    setBusyId(c.id);
    try {
      const res = await adminCategoriesApi.updateCategorie(c.id, { active: !c.active });
      setCategories(list => list.map(item => item.id === c.id ? {
        ...item,
        ...res.data,
        parent: res.data.parent ?? item.parent,
        produits_count: res.data.produits_count ?? item.produits_count,
      } : item));
      toast.success(c.active ? 'Catégorie désactivée.' : 'Catégorie activée.');
    } catch (e) {
      toast.error(apiError(e, 'Impossible de modifier le statut.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: AdminCategorie) => {
    const count = c.produits_count ?? 0;
    const msg = count > 0
      ? `"${c.nom}" contient ${count} produit(s).\n\nLe backend refusera la suppression tant que des produits lui sont rattachés.\n\nContinuer ?`
      : `Supprimer définitivement la catégorie "${c.nom}" ?`;
    if (!window.confirm(msg)) return;

    setBusyId(c.id);
    try {
      const res = await adminCategoriesApi.deleteCategorie(c.id);
      setCategories(list => list.filter(item => item.id !== c.id));
      toast.success(res.data?.message ?? 'Catégorie supprimée.');
    } catch (e) {
      toast.error(apiError(e, 'Impossible de supprimer la catégorie.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Catégories</h1>
          <p style={{ margin: '5px 0 0', color: 'var(--color-gris-moyen)', fontSize: 'var(--text-sm)' }}>
            {categories.length} catégorie{categories.length !== 1 ? 's' : ''} · {activeCount} active{activeCount !== 1 ? 's' : ''} · {categories.length - activeCount} inactive{categories.length - activeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/admin/catalogue/categories/nouvelle" className="btn btn-primary" style={{ gap: 6 }}>
          <IconPlus size={15} /> Nouvelle catégorie
        </Link>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gris-clair)' }} />
          <input className="form-input" type="search" style={{ paddingLeft: 35 }} placeholder="Rechercher une catégorie..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 180 }} value={status} onChange={e => setStatus(e.target.value as typeof status)}>
          <option value="all">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="inactive">Inactives</option>
        </select>
        {(search || status !== 'all') && (
          <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setStatus('all'); }}>Réinitialiser</button>
        )}
      </div>

      <div className="table-wrapper card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : loadError ? (
          <div className="empty-state" style={{ padding: '55px 20px', textAlign: 'center' }}>
            <h3>Chargement impossible</h3>
            <p style={{ color: 'var(--color-gris-moyen)' }}>{loadError}</p>
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Réessayer
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '55px 20px', textAlign: 'center' }}>
            <h3>Aucune catégorie</h3>
            <p style={{ color: 'var(--color-gris-moyen)' }}>
              {categories.length === 0 ? 'Commencez par créer votre première catégorie.' : 'Aucune catégorie ne correspond aux filtres.'}
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Catégorie</th><th>Parent</th><th>Slug</th><th>Ordre</th><th>Produits</th><th>Statut</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(({ categorie: c, depth }) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', gap: 8, paddingLeft: depth * 22, minWidth: 220 }}>
                      {depth > 0 && <span style={{ color: 'var(--color-gris-clair)' }}>↳</span>}
                      <div style={{ width: 44, height: 44, flexShrink: 0, overflow: 'hidden', borderRadius: 7, background: 'var(--color-ivoire-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.image_url ? (
                          <img src={c.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span aria-label="Aucune image" style={{ color: 'var(--color-gris-moyen)', fontSize: 10 }}>—</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 650 }}>{c.nom}</div>
                        {c.description && (
                          <div style={{ marginTop: 3, maxWidth: 370, color: 'var(--color-gris-moyen)', fontSize: 11, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-gris-moyen)' }}>{c.parent?.nom ?? '—'}</td>
                  <td><code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-gris-moyen)' }}>{c.slug}</code></td>
                  <td>{c.ordre ?? '—'}</td>
                  <td><span style={{ display: 'inline-flex', minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 999, padding: '0 8px', background: 'var(--color-ivoire-dark)', fontWeight: 700, fontSize: 12 }}>{c.produits_count ?? 0}</span></td>
                  <td><span className={`badge ${c.active ? 'badge-success' : 'badge-neutral'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === c.id} onClick={() => toggleActive(c)} style={{ fontSize: 11 }}>{c.active ? 'Désactiver' : 'Activer'}</button>
                      <Link to={`/admin/catalogue/categories/${c.id}/modifier`} className="btn btn-ghost btn-sm" title="Modifier"><IconEdit size={13} /></Link>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === c.id} onClick={() => remove(c)} style={{ color: 'var(--color-error)', fontSize: 11 }}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
