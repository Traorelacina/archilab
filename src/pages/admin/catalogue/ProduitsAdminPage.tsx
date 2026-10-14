import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

import { adminApi, type AdminProduitRow } from '../../../api/admin';
import { formatPrix } from '../../../utils/format';
import {
  IconPlus,
  IconEdit,
  IconEye,
  IconSearch,
} from '../../../components/ui/Icons';

type AdminProduit = AdminProduitRow;

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;

  const data = error.response?.data;

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (typeof first === 'string') return first;
  }

  return fallback;
}

function readPaginator(payload: unknown) {
  const result =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};
  const meta =
    result.meta && typeof result.meta === 'object'
      ? (result.meta as Record<string, unknown>)
      : result;

  return {
    items: Array.isArray(result.data)
      ? (result.data as AdminProduit[])
      : [],
    total: Number(meta.total ?? 0),
    lastPage: Math.max(1, Number(meta.last_page ?? 1) || 1),
  };
}

export default function ProduitsAdminPage() {
  const [produits, setProduits] = useState<AdminProduit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState('');

  const [busyId, setBusyId] = useState<number | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setRecherche(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const doFetch = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setLoadError(null);

    try {
      const response = await adminApi.produits({
        page,
        per_page: 15,
        recherche: recherche || undefined,
        statut: statut || undefined,
      });

      if (currentRequest !== requestId.current) return;

      const parsed = readPaginator(response.data);

      setProduits(parsed.items);
      setTotal(parsed.total);
      setLastPage(parsed.lastPage);
    } catch (error) {
      if (currentRequest !== requestId.current) return;

      const message = apiErrorMessage(error, 'Impossible de charger les produits.');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [page, recherche, statut]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  async function handlePublier(produit: AdminProduit) {
    setBusyId(produit.id);

    try {
      await adminApi.publierProduit(produit.id);
      toast.success('Produit publié.');
      await doFetch();
    } catch (error) {
      toast.error(
        apiErrorMessage(
          error,
          'Impossible de publier le produit.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchiver(produit: AdminProduit) {
    if (!window.confirm(`Archiver "${produit.nom}" ?`)) return;

    setBusyId(produit.id);

    try {
      await adminApi.archiverProduit(produit.id);
      toast.success('Produit archivé.');
      await doFetch();
    } catch (error) {
      toast.error(
        apiErrorMessage(
          error,
          'Impossible d’archiver le produit.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(produit: AdminProduit) {
    if (
      !window.confirm(
        `Supprimer "${produit.nom}" ?\n\nLa suppression est logique (Soft Delete).`,
      )
    ) {
      return;
    }

    setBusyId(produit.id);

    try {
      await adminApi.deleteProduit(produit.id);
      toast.success('Produit supprimé.');

      if (produits.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await doFetch();
      }
    } catch (error) {
      toast.error(
        apiErrorMessage(
          error,
          'Impossible de supprimer le produit.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  const statutCls: Record<string, string> = {
    publie: 'badge-success',
    brouillon: 'badge-neutral',
    archive: 'badge-error',
  };

  const statutLbl: Record<string, string> = {
    publie: 'Publié',
    brouillon: 'Brouillon',
    archive: 'Archivé',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
            }}
          >
            Produits
          </h1>

          <p
            style={{
              margin: '5px 0 0',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-gris-moyen)',
            }}
          >
            {total} produit{total !== 1 ? 's' : ''} au total
          </p>
        </div>

        <Link
          to="/admin/catalogue/produits/nouveau"
          className="btn btn-primary"
          style={{ gap: 6 }}
        >
          <IconPlus size={15} />
          Nouveau produit
        </Link>
      </div>

      <div
        className="card"
        style={{
          padding: 'var(--space-4)',
          display: 'flex',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            minWidth: 220,
          }}
        >
          <IconSearch
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-gris-clair)',
            }}
          />

          <input
            className="form-input"
            type="search"
            style={{ paddingLeft: 34 }}
            placeholder="Rechercher par nom ou SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select
          className="form-input"
          style={{ width: 170 }}
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="publie">Publié</option>
          <option value="brouillon">Brouillon</option>
          <option value="archive">Archivé</option>
        </select>
      </div>

      <div className="table-wrapper card">
        {loading ? (
          <div
            style={{
              minHeight: 240,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div className="spinner" />
          </div>
        ) : loadError ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <h3>Chargement impossible</h3>
            <p style={{ color: 'var(--color-gris-moyen)' }}>{loadError}</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void doFetch()}
            >
              Réessayer
            </button>
          </div>
        ) : produits.length === 0 ? (
          <div
            className="empty-state"
            style={{ padding: 40 }}
          >
            <h3>Aucun produit</h3>
            <p
              style={{
                color: 'var(--color-gris-moyen)',
              }}
            >
              Créez votre premier produit ou modifiez les filtres.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>SKU</th>
                <th>Catégorie</th>
                <th>Partenaire</th>
                <th>Variantes</th>
                <th>Prix min</th>
                <th>Stock</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {produits.map((p) => {
                const media =
                  p.medias?.find((m) => m.principale) ??
                  p.medias?.[0];

                const stock =
                  p.stock_total === null ||
                  p.stock_total === undefined
                    ? null
                    : Number(p.stock_total);

                const prix =
                  p.prix_min === null ||
                  p.prix_min === undefined
                    ? null
                    : Number(p.prix_min);
                const prixValide =
                  typeof prix === 'number' && Number.isFinite(prix)
                    ? prix
                    : null;

                return (
                  <tr key={p.id}>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          minWidth: 210,
                        }}
                      >
                        {media?.url ? (
                          <img
                            src={media.url}
                            alt={p.nom}
                            loading="lazy"
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: 'cover',
                              borderRadius: 8,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              minWidth: 40,
                              background:
                                'var(--color-ivoire-dark)',
                              borderRadius: 8,
                            }}
                          />
                        )}

                        <span style={{ fontWeight: 600 }}>
                          {p.nom}
                        </span>
                      </div>
                    </td>

                    <td>
                      <code
                        style={{
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-gris-moyen)',
                        }}
                      >
                        {p.sku ?? '—'}
                      </code>
                    </td>

                    <td>{p.categorie?.nom ?? '—'}</td>

                    <td
                      style={{
                        color: 'var(--color-gris-moyen)',
                      }}
                    >
                      {p.partenaire?.raison_sociale ?? '—'}
                    </td>

                    <td>{p.variantes_count ?? 0}</td>

                    <td
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-terra)',
                      }}
                    >
                      {prixValide !== null
                        ? formatPrix(prixValide)
                        : '—'}
                    </td>

                    <td
                      style={{
                        fontWeight: 600,
                        color:
                          stock === null
                            ? 'var(--color-gris-moyen)'
                            : stock <= 0
                              ? 'var(--color-error)'
                              : stock <= 5
                                ? 'var(--color-warning)'
                                : 'var(--color-success)',
                      }}
                    >
                      {stock ?? '—'}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          statutCls[p.statut] ??
                          'badge-neutral'
                        }`}
                      >
                        {statutLbl[p.statut] ?? p.statut}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                          flexWrap: 'wrap',
                        }}
                      >
                        {p.statut === 'publie' && (
                          <a
                            href={`/catalogue/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            title="Voir"
                          >
                            <IconEye size={13} />
                          </a>
                        )}

                        <Link
                          to={`/admin/catalogue/produits/${p.id}/modifier`}
                          className="btn btn-ghost btn-sm"
                          title="Modifier"
                        >
                          <IconEdit size={13} />
                        </Link>

                        {p.statut !== 'publie' && (
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => handlePublier(p)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 11 }}
                          >
                            Publier
                          </button>
                        )}

                        {p.statut === 'publie' && (
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => handleArchiver(p)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11 }}
                          >
                            Archiver
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => handleDelete(p)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            fontSize: 11,
                            color: 'var(--color-error)',
                          }}
                        >
                          Supprimer
                        </button>
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.max(1, current - 1))
            }
            disabled={page <= 1}
            className="btn btn-secondary btn-sm"
          >
            ← Précédent
          </button>

          <span
            style={{
              padding: '6px 14px',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-gris-moyen)',
            }}
          >
            Page {page} / {lastPage}
          </span>

          <button
            type="button"
            onClick={() =>
              setPage((current) =>
                Math.min(lastPage, current + 1),
              )
            }
            disabled={page >= lastPage}
            className="btn btn-secondary btn-sm"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
