import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminUtilisateursApi,
  type AdminUtilisateur,
  type RoleBackoffice,
} from '../../../api/adminUtilisateurs';

import {
  IconPlus,
  IconEdit,
  IconSearch,
} from '../../../components/ui/Icons';

const ROLE_LABELS: Record<RoleBackoffice, string> = {
  super_admin: 'Super administrateur',
  gestionnaire_catalogue: 'Gestionnaire catalogue',
  gestionnaire_stock: 'Gestionnaire stock',
  comptable: 'Comptable',
  commercial: 'Commercial',
};

function getApiErrorMessage(error: unknown, fallback: string): string {
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

function initials(name?: string | null): string {
  if (!name) return '?';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getRole(user: AdminUtilisateur): string {
  return user.roles?.[0]?.name ?? '—';
}

function roleLabel(role?: string | null): string {
  if (!role) return 'Aucun rôle';
  return ROLE_LABELS[role as RoleBackoffice] ?? role;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function UtilisateursAdminPage() {
  const [utilisateurs, setUtilisateurs] = useState<AdminUtilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [recherche, setRecherche] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setRecherche(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchUtilisateurs = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminUtilisateursApi.utilisateurs({
        page,
        per_page: 15,
        recherche: recherche || undefined,
      });

      const paginator = response.data;

      setUtilisateurs(paginator.data ?? []);
      setTotal(Number(paginator.total ?? 0));
      setLastPage(Number(paginator.last_page ?? 1));
      setPage(Number(paginator.current_page ?? page));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Impossible de charger les utilisateurs.'),
      );
    } finally {
      setLoading(false);
    }
  }, [page, recherche]);

  useEffect(() => {
    fetchUtilisateurs();
  }, [fetchUtilisateurs]);

  const activeOnPage = useMemo(
    () => utilisateurs.filter((user) => user.actif !== false).length,
    [utilisateurs],
  );

  const inactiveOnPage = utilisateurs.length - activeOnPage;

  async function handleActivate(user: AdminUtilisateur) {
    setBusyId(user.id);

    try {
      const response = await adminUtilisateursApi.updateUtilisateur(user.id, {
        actif: true,
      });

      setUtilisateurs((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, ...response.data } : item,
        ),
      );

      toast.success('Compte réactivé.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Impossible de réactiver le compte.'),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeactivate(user: AdminUtilisateur) {
    if (
      !window.confirm(
        `Désactiver le compte de "${user.name}" ?\n\nSes tokens d'accès seront supprimés.`,
      )
    ) {
      return;
    }

    setBusyId(user.id);

    try {
      const response = await adminUtilisateursApi.desactiverUtilisateur(
        user.id,
      );

      setUtilisateurs((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, actif: false } : item,
        ),
      );

      toast.success(response.data?.message ?? 'Compte désactivé.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Impossible de désactiver le compte.'),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <style>{`
        .ua-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ua-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
        }

        .ua-header h1 {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .ua-header p {
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
        }

        .ua-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(140px, 1fr));
          gap: 12px;
        }

        .ua-summary-card {
          padding: 16px 18px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 13px;
          background: var(--color-blanc);
        }

        .ua-summary-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .ua-summary-card strong {
          display: block;
          margin-top: 5px;
          font-size: 24px;
          line-height: 1;
          font-weight: 780;
        }

        .ua-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 14px;
        }

        .ua-search {
          position: relative;
          flex: 1;
          min-width: 260px;
        }

        .ua-search svg {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: var(--color-gris-clair);
          pointer-events: none;
        }

        .ua-search .form-input {
          padding-left: 36px;
        }

        .ua-user-cell {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 230px;
        }

        .ua-avatar {
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: linear-gradient(145deg, var(--color-ivoire-dark), var(--color-ivoire));
          color: var(--color-terra);
          font-size: 11px;
          font-weight: 850;
        }

        .ua-user-name {
          font-size: 12.5px;
          font-weight: 730;
        }

        .ua-user-email {
          margin-top: 2px;
          color: var(--color-gris-moyen);
          font-size: 10px;
        }

        .ua-role {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: var(--color-ivoire);
          color: var(--color-gris-fonce);
          font-size: 9.5px;
          font-weight: 720;
          white-space: nowrap;
        }

        .ua-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .ua-loading {
          min-height: 270px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ua-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .ua-pagination span {
          padding: 6px 13px;
          color: var(--color-gris-moyen);
          font-size: 11px;
        }

        @media (max-width: 760px) {
          .ua-summary {
            grid-template-columns: 1fr;
          }

          .ua-header .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="ua-page">
        <div className="ua-header">
          <div>
            <h1>Utilisateurs</h1>
            <p>
              Gérez les comptes du back-office, leurs rôles et leur accès.
            </p>
          </div>

          <Link
            to="/admin/administration/utilisateurs/nouveau"
            className="btn btn-primary"
            style={{ gap: 6 }}
          >
            <IconPlus size={15} />
            Nouvel utilisateur
          </Link>
        </div>

        <div className="ua-summary">
          <div className="ua-summary-card">
            <span>Total back-office</span>
            <strong>{total}</strong>
          </div>

          <div className="ua-summary-card">
            <span>Actifs sur cette page</span>
            <strong>{activeOnPage}</strong>
          </div>

          <div className="ua-summary-card">
            <span>Inactifs sur cette page</span>
            <strong>{inactiveOnPage}</strong>
          </div>
        </div>

        <div className="card ua-filters">
          <div className="ua-search">
            <IconSearch size={14} />

            <input
              type="search"
              className="form-input"
              placeholder="Rechercher par nom ou adresse e-mail..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          {searchInput && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSearchInput('')}
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div className="table-wrapper card" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div className="ua-loading">
              <div className="spinner" />
            </div>
          ) : utilisateurs.length === 0 ? (
            <div className="empty-state" style={{ padding: '50px 20px' }}>
              <h3>Aucun utilisateur</h3>
              <p>
                {recherche
                  ? 'Aucun utilisateur ne correspond à cette recherche.'
                  : 'Créez le premier compte back-office.'}
              </p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Téléphone</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {utilisateurs.map((user) => {
                  const role = getRole(user);
                  const active = user.actif !== false;

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="ua-user-cell">
                          <div className="ua-avatar">{initials(user.name)}</div>

                          <div>
                            <div className="ua-user-name">{user.name}</div>
                            <div className="ua-user-email">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ color: 'var(--color-gris-moyen)' }}>
                        {user.telephone ?? '—'}
                      </td>

                      <td>
                        <span className="ua-role">{roleLabel(role)}</span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            active ? 'badge-success' : 'badge-error'
                          }`}
                        >
                          {active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      <td
                        style={{
                          color: 'var(--color-gris-moyen)',
                          fontSize: 11,
                        }}
                      >
                        {formatDate(user.created_at)}
                      </td>

                      <td>
                        <div className="ua-actions">
                          <Link
                            to={`/admin/administration/utilisateurs/${user.id}/modifier`}
                            className="btn btn-ghost btn-sm"
                            title="Modifier"
                          >
                            <IconEdit size={13} />
                          </Link>

                          {active ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busyId === user.id}
                              onClick={() => handleDeactivate(user)}
                              style={{
                                fontSize: 10.5,
                                color: 'var(--color-error)',
                              }}
                            >
                              Désactiver
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busyId === user.id}
                              onClick={() => handleActivate(user)}
                              style={{ fontSize: 10.5 }}
                            >
                              Réactiver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && lastPage > 1 && (
          <div className="ua-pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ← Précédent
            </button>

            <span>
              Page {page} / {lastPage} · {total} utilisateur
              {total !== 1 ? 's' : ''}
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= lastPage}
              onClick={() =>
                setPage((current) => Math.min(lastPage, current + 1))
              }
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
