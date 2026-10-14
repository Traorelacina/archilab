import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminAuditApi,
  type AuditLog,
} from '../../../api/adminAudit';

import {
  adminUtilisateursApi,
  type AdminUtilisateur,
} from '../../../api/adminUtilisateurs';

import {
  IconSearch,
} from '../../../components/ui/Icons';

type DetailMode =
  | 'avant'
  | 'apres'
  | 'comparaison';

type FilterState = {
  entite: string;
  action: string;
  user_id: string;
  du: string;
  au: string;
};

const INITIAL_FILTERS: FilterState = {
  entite: '',
  action: '',
  user_id: '',
  du: '',
  au: '',
};

function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data;

  if (
    typeof data?.message === 'string' &&
    data.message.trim()
  ) {
    return data.message;
  }

  return fallback;
}

function formatDateTime(
  value?: string | null,
): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'fr-FR',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
}

function formatEntity(
  value?: string | null,
): string {
  if (!value) return '—';

  return value
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatAction(
  value?: string | null,
): string {
  if (!value) return '—';

  const labels:
    Record<string, string> = {
    creation: 'Création',
    modification: 'Modification',
    suppression: 'Suppression',
    publication: 'Publication',
    archivage: 'Archivage',
    desactivation: 'Désactivation',
    activation: 'Activation',
    connexion: 'Connexion',
    deconnexion: 'Déconnexion',
  };

  return (
    labels[value] ??
    value
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase(),
      )
  );
}

function actionBadgeClass(
  action?: string | null,
): string {
  switch (action) {
    case 'creation':
    case 'activation':
    case 'publication':
      return 'badge-success';

    case 'suppression':
    case 'desactivation':
      return 'badge-error';

    case 'modification':
    case 'archivage':
      return 'badge-warning';

    default:
      return 'badge-neutral';
  }
}

function initials(
  name?: string | null,
): string {
  if (!name) return '?';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase(),
    )
    .join('');
}

function hasValue(
  value: unknown,
): boolean {
  if (
    value === null ||
    value === undefined
  ) {
    return false;
  }

  if (
    typeof value === 'object'
  ) {
    return (
      Object.keys(
        value as Record<
          string,
          unknown
        >,
      ).length > 0
    );
  }

  return true;
}

function prettyJson(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return 'Aucune donnée';
  }

  if (typeof value === 'string') {
    try {
      return JSON.stringify(
        JSON.parse(value),
        null,
        2,
      );
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(
      value,
      null,
      2,
    );
  } catch {
    return String(value);
  }
}

function diffKeys(
  before: unknown,
  after: unknown,
): string[] {
  if (
    !before ||
    !after ||
    typeof before !== 'object' ||
    typeof after !== 'object'
  ) {
    return [];
  }

  const a =
    before as Record<
      string,
      unknown
    >;

  const b =
    after as Record<
      string,
      unknown
    >;

  const keys = new Set([
    ...Object.keys(a),
    ...Object.keys(b),
  ]);

  return Array.from(keys).filter(
    (key) =>
      JSON.stringify(a[key]) !==
      JSON.stringify(b[key]),
  );
}

export default function AuditAdminPage() {
  const [logs, setLogs] =
    useState<AuditLog[]>([]);

  const [users, setUsers] =
    useState<
      AdminUtilisateur[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(true);

  const [page, setPage] =
    useState(1);

  const [
    lastPage,
    setLastPage,
  ] = useState(1);

  const [total, setTotal] =
    useState(0);

  const [
    filters,
    setFilters,
  ] =
    useState<FilterState>(
      INITIAL_FILTERS,
    );

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<FilterState>(
      INITIAL_FILTERS,
    );

  const [
    selectedLog,
    setSelectedLog,
  ] =
    useState<AuditLog | null>(
      null,
    );

  const [
    detailMode,
    setDetailMode,
  ] =
    useState<DetailMode>(
      'comparaison',
    );

  const fetchLogs =
    useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await adminAuditApi.logs({
            page,
            per_page: 25,

            entite:
              appliedFilters.entite ||
              undefined,

            action:
              appliedFilters.action ||
              undefined,

            user_id:
              appliedFilters.user_id
                ? Number(
                    appliedFilters.user_id,
                  )
                : undefined,

            du:
              appliedFilters.du ||
              undefined,

            au:
              appliedFilters.au ||
              undefined,
          });

        const paginator =
          response.data;

        setLogs(
          paginator.data ?? [],
        );

        setTotal(
          Number(
            paginator.total ?? 0,
          ),
        );

        setLastPage(
          Number(
            paginator.last_page ??
              1,
          ),
        );

        setPage(
          Number(
            paginator.current_page ??
              page,
          ),
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            'Impossible de charger le journal d’audit.',
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [
      page,
      appliedFilters,
    ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      setLoadingUsers(true);

      try {
        const response =
          await adminUtilisateursApi.utilisateurs(
            {
              per_page: 200,
            },
          );

        if (!mounted) {
          return;
        }

        setUsers(
          response.data.data ??
            [],
        );
      } catch {
        // Le filtre utilisateur reste optionnel.
      } finally {
        if (mounted) {
          setLoadingUsers(
            false,
          );
        }
      }
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const entityOptions =
    useMemo(() => {
      return Array.from(
        new Set(
          logs
            .map(
              (log) =>
                log.entite,
            )
            .filter(Boolean),
        ),
      ).sort(
        (a, b) =>
          a.localeCompare(
            b,
            'fr',
          ),
      );
    }, [logs]);

  const actionOptions =
    useMemo(() => {
      return Array.from(
        new Set(
          logs
            .map(
              (log) =>
                log.action,
            )
            .filter(Boolean),
        ),
      ).sort(
        (a, b) =>
          a.localeCompare(
            b,
            'fr',
          ),
      );
    }, [logs]);

  const activeFilterCount =
    Object.values(
      appliedFilters,
    ).filter(Boolean).length;

  const todayCount =
    useMemo(() => {
      const today =
        new Date();

      return logs.filter(
        (log) => {
          const date =
            new Date(
              log.created_at,
            );

          return (
            date.getFullYear() ===
              today.getFullYear() &&
            date.getMonth() ===
              today.getMonth() &&
            date.getDate() ===
              today.getDate()
          );
        },
      ).length;
    }, [logs]);

  const modificationCount =
    useMemo(
      () =>
        logs.filter(
          (log) =>
            log.action ===
            'modification',
        ).length,
      [logs],
    );

  function updateFilter(
    field: keyof FilterState,
    value: string,
  ) {
    setFilters(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  }

  function applyFilters() {
    if (
      filters.du &&
      filters.au &&
      filters.du >
        filters.au
    ) {
      toast.error(
        'La date de début doit être antérieure ou égale à la date de fin.',
      );

      return;
    }

    setPage(1);
    setAppliedFilters(
      filters,
    );
  }

  function resetFilters() {
    setFilters(
      INITIAL_FILTERS,
    );

    setAppliedFilters(
      INITIAL_FILTERS,
    );

    setPage(1);
  }

  function openDetails(
    log: AuditLog,
  ) {
    setSelectedLog(log);
    setDetailMode(
      'comparaison',
    );
  }

  return (
    <>
      <style>{`
        .aa-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .aa-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
        }

        .aa-header h1 {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .aa-header p {
          max-width: 680px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .aa-readonly {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 11px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 999px;
          background: var(--color-ivoire);
          color: var(--color-gris-moyen);
          font-size: 10px;
          font-weight: 700;
        }

        .aa-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(140px, 1fr));
          gap: 12px;
        }

        .aa-summary-card {
          padding: 16px 18px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 13px;
          background: var(--color-blanc);
        }

        .aa-summary-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          font-weight: 720;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .aa-summary-card strong {
          display: block;
          margin-top: 5px;
          font-size: 23px;
          line-height: 1;
          font-weight: 790;
        }

        .aa-filter-card {
          padding: 17px;
        }

        .aa-filter-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .aa-filter-head strong {
          font-size: 12.5px;
          font-weight: 760;
        }

        .aa-filter-head span {
          color: var(--color-gris-moyen);
          font-size: 10px;
        }

        .aa-filter-grid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(140px, 1fr));
          gap: 12px;
          align-items: end;
        }

        .aa-field {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .aa-field label {
          margin-bottom: 6px;
          font-size: 10.5px;
          font-weight: 700;
        }

        .aa-filter-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .aa-user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 185px;
        }

        .aa-avatar {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background:
            linear-gradient(
              145deg,
              var(--color-ivoire-dark),
              var(--color-ivoire)
            );
          color: var(--color-terra);
          font-size: 10px;
          font-weight: 850;
        }

        .aa-user-name {
          font-size: 11.5px;
          font-weight: 720;
        }

        .aa-user-id {
          margin-top: 2px;
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .aa-entity {
          display: inline-flex;
          align-items: center;
          min-height: 27px;
          padding: 0 9px;
          border-radius: 999px;
          background: var(--color-ivoire);
          color: var(--color-gris-fonce);
          font-size: 9.5px;
          font-weight: 700;
          white-space: nowrap;
        }

        .aa-entity-id {
          margin-top: 4px;
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .aa-change-preview {
          max-width: 280px;
          overflow: hidden;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          line-height: 1.45;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .aa-table-loading {
          min-height: 285px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .aa-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .aa-pagination-info {
          padding: 6px 13px;
          color: var(--color-gris-moyen);
          font-size: 11px;
        }

        .aa-overlay {
          position: fixed;
          inset: 0;
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(20,16,13,.46);
          backdrop-filter: blur(2px);
        }

        .aa-modal {
          width: min(980px, 100%);
          max-height: calc(100vh - 40px);
          overflow: auto;
          padding: 0;
          border-radius: 16px;
        }

        .aa-modal-head {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.08));
          background: var(--color-blanc);
        }

        .aa-modal-head h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 760;
        }

        .aa-modal-head p {
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
        }

        .aa-modal-body {
          padding: 20px;
        }

        .aa-detail-meta {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .aa-detail-meta-item {
          padding: 11px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
        }

        .aa-detail-meta-item span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .aa-detail-meta-item strong {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .aa-tabs {
          display: flex;
          gap: 7px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .aa-tab {
          min-height: 33px;
          padding: 0 11px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 8px;
          background: var(--color-blanc);
          color: var(--color-gris-moyen);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .aa-tab.is-active {
          border-color: var(--color-terra);
          background: var(--color-terra);
          color: white;
        }

        .aa-diff-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .aa-json-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 11px;
        }

        .aa-json-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.08));
          background: var(--color-ivoire);
        }

        .aa-json-card-head strong {
          font-size: 10.5px;
        }

        .aa-json-card-head span {
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .aa-json {
          margin: 0;
          padding: 14px;
          overflow: auto;
          background: #171411;
          color: #f3eee8;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .aa-changed-fields {
          margin-bottom: 14px;
          padding: 12px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
        }

        .aa-changed-fields strong {
          display: block;
          margin-bottom: 7px;
          font-size: 10.5px;
        }

        .aa-changed-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .aa-changed-list span {
          display: inline-flex;
          min-height: 24px;
          align-items: center;
          padding: 0 8px;
          border-radius: 999px;
          background: var(--color-blanc);
          color: var(--color-gris-fonce);
          font-size: 9px;
          font-weight: 700;
        }

        @media (max-width: 1050px) {
          .aa-filter-grid {
            grid-template-columns:
              repeat(3, minmax(140px, 1fr));
          }

          .aa-summary {
            grid-template-columns:
              repeat(2, minmax(140px, 1fr));
          }
        }

        @media (max-width: 720px) {
          .aa-filter-grid,
          .aa-summary,
          .aa-detail-meta,
          .aa-diff-grid {
            grid-template-columns: 1fr;
          }

          .aa-filter-actions .btn {
            flex: 1;
          }
        }
      `}</style>

      <div className="aa-page">
        <div className="aa-header">
          <div>
            <h1>
              Journal d’audit
            </h1>

            <p>
              Consultez l’historique des actions réalisées dans le back-office et identifiez les modifications effectuées sur les différentes entités.
            </p>
          </div>

          <span className="aa-readonly">
            Consultation uniquement
          </span>
        </div>

        <div className="aa-summary">
          <div className="aa-summary-card">
            <span>
              Total des événements
            </span>

            <strong>
              {total}
            </strong>
          </div>

          <div className="aa-summary-card">
            <span>
              Événements sur cette page
            </span>

            <strong>
              {logs.length}
            </strong>
          </div>

          <div className="aa-summary-card">
            <span>
              Modifications sur cette page
            </span>

            <strong>
              {modificationCount}
            </strong>
          </div>

          <div className="aa-summary-card">
            <span>
              Aujourd’hui sur cette page
            </span>

            <strong>
              {todayCount}
            </strong>
          </div>
        </div>

        <section className="card aa-filter-card">
          <div className="aa-filter-head">
            <strong>
              Filtres du journal
            </strong>

            <span>
              {activeFilterCount > 0
                ? `${activeFilterCount} filtre${activeFilterCount > 1 ? 's' : ''} actif${activeFilterCount > 1 ? 's' : ''}`
                : 'Aucun filtre actif'}
            </span>
          </div>

          <div className="aa-filter-grid">
            <div className="aa-field">
              <label htmlFor="audit-entite">
                Entité
              </label>

              <input
                id="audit-entite"
                className="form-input"
                list="audit-entites"
                value={filters.entite}
                onChange={(event) =>
                  updateFilter(
                    'entite',
                    event.target.value,
                  )
                }
                placeholder="Ex. Produit"
              />

              <datalist id="audit-entites">
                {entityOptions.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    />
                  ),
                )}
              </datalist>
            </div>

            <div className="aa-field">
              <label htmlFor="audit-action">
                Action
              </label>

              <input
                id="audit-action"
                className="form-input"
                list="audit-actions"
                value={filters.action}
                onChange={(event) =>
                  updateFilter(
                    'action',
                    event.target.value,
                  )
                }
                placeholder="Ex. modification"
              />

              <datalist id="audit-actions">
                {actionOptions.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    />
                  ),
                )}
              </datalist>
            </div>

            <div className="aa-field">
              <label htmlFor="audit-user">
                Utilisateur
              </label>

              <select
                id="audit-user"
                className="form-input"
                disabled={loadingUsers}
                value={filters.user_id}
                onChange={(event) =>
                  updateFilter(
                    'user_id',
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Tous les utilisateurs
                </option>

                {users.map(
                  (user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="aa-field">
              <label htmlFor="audit-du">
                Du
              </label>

              <input
                id="audit-du"
                type="date"
                className="form-input"
                value={filters.du}
                onChange={(event) =>
                  updateFilter(
                    'du',
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="aa-field">
              <label htmlFor="audit-au">
                Au
              </label>

              <input
                id="audit-au"
                type="date"
                className="form-input"
                value={filters.au}
                onChange={(event) =>
                  updateFilter(
                    'au',
                    event.target.value,
                  )
                }
              />
            </div>
          </div>

          <div className="aa-filter-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetFilters}
            >
              Réinitialiser
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={applyFilters}
            >
              Appliquer les filtres
            </button>
          </div>
        </section>

        <div
          className="table-wrapper card"
          style={{
            overflowX: 'auto',
          }}
        >
          {loading ? (
            <div className="aa-table-loading">
              <div className="spinner" />
            </div>
          ) : logs.length === 0 ? (
            <div
              className="empty-state"
              style={{
                padding:
                  '52px 20px',
                textAlign:
                  'center',
              }}
            >
              <h3>
                Aucun événement
              </h3>

              <p>
                Aucun enregistrement d’audit ne correspond aux filtres sélectionnés.
              </p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>
                    Date / heure
                  </th>
                  <th>
                    Utilisateur
                  </th>
                  <th>
                    Action
                  </th>
                  <th>
                    Entité
                  </th>
                  <th>
                    Changement
                  </th>
                  <th
                    style={{
                      textAlign:
                        'right',
                    }}
                  >
                    Détail
                  </th>
                </tr>
              </thead>

              <tbody>
                {logs.map(
                  (log) => {
                    const changed =
                      diffKeys(
                        log.avant,
                        log.apres,
                      );

                    return (
                      <tr key={log.id}>
                        <td
                          style={{
                            whiteSpace:
                              'nowrap',
                            fontSize:
                              10.5,
                          }}
                        >
                          {formatDateTime(
                            log.created_at,
                          )}
                        </td>

                        <td>
                          <div className="aa-user-cell">
                            <div className="aa-avatar">
                              {initials(
                                log.user
                                  ?.name,
                              )}
                            </div>

                            <div>
                              <div className="aa-user-name">
                                {log.user
                                  ?.name ??
                                  'Système / inconnu'}
                              </div>

                              <div className="aa-user-id">
                                {log.user_id
                                  ? `Utilisateur #${log.user_id}`
                                  : 'Aucun utilisateur'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`badge ${actionBadgeClass(
                              log.action,
                            )}`}
                          >
                            {formatAction(
                              log.action,
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="aa-entity">
                            {formatEntity(
                              log.entite,
                            )}
                          </span>

                          {log.entite_id !==
                            null &&
                            log.entite_id !==
                              undefined && (
                              <div className="aa-entity-id">
                                ID #
                                {
                                  log.entite_id
                                }
                              </div>
                            )}
                        </td>

                        <td>
                          <div className="aa-change-preview">
                            {changed.length >
                            0
                              ? `${changed.length} champ${changed.length > 1 ? 's' : ''} modifié${changed.length > 1 ? 's' : ''} : ${changed.slice(0, 3).join(', ')}${changed.length > 3 ? '…' : ''}`
                              : hasValue(
                                    log.apres,
                                  )
                                ? 'Données après action disponibles'
                                : hasValue(
                                      log.avant,
                                    )
                                  ? 'Données avant action disponibles'
                                  : 'Aucun détail de changement'}
                          </div>
                        </td>

                        <td>
                          <div
                            style={{
                              display:
                                'flex',
                              justifyContent:
                                'flex-end',
                            }}
                          >
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                openDetails(
                                  log,
                                )
                              }
                            >
                              Voir le détail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading &&
          lastPage > 1 && (
            <div className="aa-pagination">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current - 1,
                      ),
                  )
                }
              >
                ← Précédent
              </button>

              <span className="aa-pagination-info">
                Page {page} /{' '}
                {lastPage} ·{' '}
                {total}{' '}
                événement
                {total !== 1
                  ? 's'
                  : ''}
              </span>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={
                  page >=
                  lastPage
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        lastPage,
                        current + 1,
                      ),
                  )
                }
              >
                Suivant →
              </button>
            </div>
          )}
      </div>

      {selectedLog && (
        <div
          className="aa-overlay"
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedLog(
                null,
              );
            }
          }}
        >
          <section className="card aa-modal">
            <div className="aa-modal-head">
              <div>
                <h2>
                  Détail de l’événement
                </h2>

                <p>
                  Audit #
                  {selectedLog.id} ·{' '}
                  {formatDateTime(
                    selectedLog.created_at,
                  )}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setSelectedLog(
                    null,
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="aa-modal-body">
              <div className="aa-detail-meta">
                <div className="aa-detail-meta-item">
                  <span>
                    Utilisateur
                  </span>

                  <strong>
                    {selectedLog.user
                      ?.name ??
                      'Système / inconnu'}
                  </strong>
                </div>

                <div className="aa-detail-meta-item">
                  <span>
                    Action
                  </span>

                  <strong>
                    {formatAction(
                      selectedLog.action,
                    )}
                  </strong>
                </div>

                <div className="aa-detail-meta-item">
                  <span>
                    Entité
                  </span>

                  <strong>
                    {formatEntity(
                      selectedLog.entite,
                    )}
                  </strong>
                </div>

                <div className="aa-detail-meta-item">
                  <span>
                    Identifiant
                  </span>

                  <strong>
                    {selectedLog.entite_id !==
                      null &&
                    selectedLog.entite_id !==
                      undefined
                      ? `#${selectedLog.entite_id}`
                      : '—'}
                  </strong>
                </div>
              </div>

              {diffKeys(
                selectedLog.avant,
                selectedLog.apres,
              ).length > 0 && (
                <div className="aa-changed-fields">
                  <strong>
                    Champs modifiés
                  </strong>

                  <div className="aa-changed-list">
                    {diffKeys(
                      selectedLog.avant,
                      selectedLog.apres,
                    ).map(
                      (field) => (
                        <span
                          key={
                            field
                          }
                        >
                          {field}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="aa-tabs">
                <button
                  type="button"
                  className={`aa-tab ${
                    detailMode ===
                    'comparaison'
                      ? 'is-active'
                      : ''
                  }`}
                  onClick={() =>
                    setDetailMode(
                      'comparaison',
                    )
                  }
                >
                  Comparaison
                </button>

                <button
                  type="button"
                  className={`aa-tab ${
                    detailMode ===
                    'avant'
                      ? 'is-active'
                      : ''
                  }`}
                  onClick={() =>
                    setDetailMode(
                      'avant',
                    )
                  }
                >
                  Avant
                </button>

                <button
                  type="button"
                  className={`aa-tab ${
                    detailMode ===
                    'apres'
                      ? 'is-active'
                      : ''
                  }`}
                  onClick={() =>
                    setDetailMode(
                      'apres',
                    )
                  }
                >
                  Après
                </button>
              </div>

              {detailMode ===
                'comparaison' && (
                <div className="aa-diff-grid">
                  <div className="aa-json-card">
                    <div className="aa-json-card-head">
                      <strong>
                        Avant
                      </strong>

                      <span>
                        État précédent
                      </span>
                    </div>

                    <pre className="aa-json">
                      {prettyJson(
                        selectedLog.avant,
                      )}
                    </pre>
                  </div>

                  <div className="aa-json-card">
                    <div className="aa-json-card-head">
                      <strong>
                        Après
                      </strong>

                      <span>
                        Nouvel état
                      </span>
                    </div>

                    <pre className="aa-json">
                      {prettyJson(
                        selectedLog.apres,
                      )}
                    </pre>
                  </div>
                </div>
              )}

              {detailMode ===
                'avant' && (
                <div className="aa-json-card">
                  <div className="aa-json-card-head">
                    <strong>
                      Données avant l’action
                    </strong>
                  </div>

                  <pre className="aa-json">
                    {prettyJson(
                      selectedLog.avant,
                    )}
                  </pre>
                </div>
              )}

              {detailMode ===
                'apres' && (
                <div className="aa-json-card">
                  <div className="aa-json-card-head">
                    <strong>
                      Données après l’action
                    </strong>
                  </div>

                  <pre className="aa-json">
                    {prettyJson(
                      selectedLog.apres,
                    )}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
