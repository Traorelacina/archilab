import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminNumerisationApi,
  type DemandeNumerisation,
  type NumerisationCreatePayload,
  type NumerisationUpdatePayload,
  type StatutNumerisation,
} from '../../../api/adminNumerisation';

import { adminApi } from '../../../api/admin';
import type {
  Partenaire,
  Produit,
  User,
} from '../../../types';

import {
  IconPlus,
  IconEdit,
  IconSearch,
} from '../../../components/ui/Icons';

type CreateFormState = {
  partenaire_id: string;
  nom_produit: string;
  description: string;
  responsable_id: string;
  echeance: string;
};

type EditFormState = {
  statut: StatutNumerisation;
  produit_id: string;
  responsable_id: string;
  echeance: string;
  commentaires_validation: string;
};

const CREATE_INITIAL: CreateFormState = {
  partenaire_id: '',
  nom_produit: '',
  description: '',
  responsable_id: '',
  echeance: '',
};

const STATUS_LABELS: Record<
  StatutNumerisation,
  string
> = {
  a_numeriser: 'À numériser',
  en_cours: 'En cours',
  en_validation: 'En validation',
  publie: 'Publié',
};

const STATUS_BADGES: Record<
  StatutNumerisation,
  string
> = {
  a_numeriser: 'badge-neutral',
  en_cours: 'badge-warning',
  en_validation: 'badge-info',
  publie: 'badge-success',
};

const STATUS_OPTIONS: StatutNumerisation[] = [
  'a_numeriser',
  'en_cours',
  'en_validation',
  'publie',
];

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

  if (
    data?.errors &&
    typeof data.errors === 'object'
  ) {
    const first = Object.values(data.errors)
      .flat()
      .find(Boolean);

    if (typeof first === 'string') {
      return first;
    }
  }

  return fallback;
}

function extractItems<T>(payload: any): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function dateToInputValue(
  value: string | null | undefined,
): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function isLate(
  value: string | null | undefined,
  statut: StatutNumerisation,
): boolean {
  if (!value || statut === 'publie') {
    return false;
  }

  const deadline = new Date(value);

  if (Number.isNaN(deadline.getTime())) {
    return false;
  }

  deadline.setHours(23, 59, 59, 999);

  return deadline.getTime() < Date.now();
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

export default function NumerisationAdminPage() {
  const [demandes, setDemandes] =
    useState<DemandeNumerisation[]>([]);

  const [stats, setStats] = useState<
    Partial<
      Record<
        StatutNumerisation,
        number | string
      >
    >
  >({});

  const [partenaires, setPartenaires] =
    useState<Partenaire[]>([]);

  const [responsables, setResponsables] =
    useState<User[]>([]);

  const [produits, setProduits] =
    useState<Produit[]>([]);

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] =
    useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] =
    useState(true);
  const [loadingRefs, setLoadingRefs] =
    useState(true);
  const [saving, setSaving] =
    useState(false);

  const [statutFilter, setStatutFilter] =
    useState<'' | StatutNumerisation>('');

  const [
    partenaireFilter,
    setPartenaireFilter,
  ] = useState('');

  const [search, setSearch] =
    useState('');

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);

  const [
    editingDemande,
    setEditingDemande,
  ] =
    useState<DemandeNumerisation | null>(
      null,
    );

  const [createForm, setCreateForm] =
    useState<CreateFormState>(
      CREATE_INITIAL,
    );

  const [editForm, setEditForm] =
    useState<EditFormState | null>(
      null,
    );

  const fetchDemandes =
    useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await adminNumerisationApi.index({
            page,
            per_page: 20,
            statut:
              statutFilter ||
              undefined,
            partenaire_id:
              partenaireFilter
                ? Number(
                    partenaireFilter,
                  )
                : undefined,
          });

        const paginator =
          response.data.demandes;

        setDemandes(
          paginator.data ?? [],
        );

        setPage(
          Number(
            paginator.current_page ??
              page,
          ),
        );

        setLastPage(
          Number(
            paginator.last_page ??
              1,
          ),
        );

        setTotal(
          Number(
            paginator.total ?? 0,
          ),
        );

        setStats(
          response.data
            .statistiques ?? {},
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            'Impossible de charger le tableau de numérisation.',
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [
      page,
      statutFilter,
      partenaireFilter,
    ]);

  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  useEffect(() => {
    let mounted = true;

    async function loadReferences() {
      setLoadingRefs(true);

      try {
        const results =
          await Promise.allSettled([
            adminApi.partenaires({
              per_page: 200,
            }),
            adminApi.utilisateurs({
              per_page: 200,
            }),
            adminApi.produits({
              per_page: 100,
            }),
          ]);

        if (!mounted) {
          return;
        }

        const [
          partnersResult,
          usersResult,
          productsResult,
        ] = results;

        if (
          partnersResult.status ===
          'fulfilled'
        ) {
          setPartenaires(
            extractItems<Partenaire>(
              partnersResult.value
                .data,
            ),
          );
        }

        if (
          usersResult.status ===
          'fulfilled'
        ) {
          setResponsables(
            extractItems<User>(
              usersResult.value.data,
            ),
          );
        }

        if (
          productsResult.status ===
          'fulfilled'
        ) {
          setProduits(
            extractItems<Produit>(
              productsResult.value
                .data,
            ),
          );
        }
      } finally {
        if (mounted) {
          setLoadingRefs(false);
        }
      }
    }

    loadReferences();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleDemandes =
    useMemo(() => {
      const q = search
        .trim()
        .toLocaleLowerCase('fr');

      if (!q) {
        return demandes;
      }

      return demandes.filter(
        (demande) => {
          return [
            demande.nom_produit,
            demande.description,
            demande.partenaire
              ?.raison_sociale,
            demande.responsable
              ?.name,
            demande.produit?.nom,
            demande
              .commentaires_validation,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  'fr',
                )
                .includes(q),
            );
        },
      );
    }, [demandes, search]);

  const numericStats =
    useMemo(
      () => ({
        a_numeriser: Number(
          stats.a_numeriser ?? 0,
        ),
        en_cours: Number(
          stats.en_cours ?? 0,
        ),
        en_validation: Number(
          stats.en_validation ?? 0,
        ),
        publie: Number(
          stats.publie ?? 0,
        ),
      }),
      [stats],
    );

  const totalStats =
    numericStats.a_numeriser +
    numericStats.en_cours +
    numericStats.en_validation +
    numericStats.publie;

  function updateCreateField<
    K extends keyof CreateFormState,
  >(
    key: K,
    value: CreateFormState[K],
  ) {
    setCreateForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateEditField<
    K extends keyof EditFormState,
  >(
    key: K,
    value: EditFormState[K],
  ) {
    setEditForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  function openCreateModal() {
    setCreateForm(
      CREATE_INITIAL,
    );
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (saving) return;

    setCreateModalOpen(false);
  }

  function openEditModal(
    demande: DemandeNumerisation,
  ) {
    setEditingDemande(demande);

    setEditForm({
      statut: demande.statut,
      produit_id:
        demande.produit_id
          ? String(
              demande.produit_id,
            )
          : demande.produit?.id
            ? String(
                demande.produit.id,
              )
            : '',
      responsable_id:
        demande.responsable_id
          ? String(
              demande.responsable_id,
            )
          : demande.responsable?.id
            ? String(
                demande.responsable.id,
              )
            : '',
      echeance: dateToInputValue(
        demande.echeance,
      ),
      commentaires_validation:
        demande.commentaires_validation ??
        '',
    });
  }

  function closeEditModal() {
    if (saving) return;

    setEditingDemande(null);
    setEditForm(null);
  }

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !createForm.partenaire_id
    ) {
      toast.error(
        'Sélectionnez un partenaire.',
      );
      return;
    }

    if (
      !createForm.nom_produit.trim()
    ) {
      toast.error(
        'Le nom du produit est obligatoire.',
      );
      return;
    }

    const payload: NumerisationCreatePayload =
      {
        partenaire_id: Number(
          createForm.partenaire_id,
        ),
        nom_produit:
          createForm.nom_produit.trim(),
        description:
          createForm.description.trim() ||
          null,
        responsable_id:
          createForm.responsable_id
            ? Number(
                createForm.responsable_id,
              )
            : null,
        echeance:
          createForm.echeance ||
          null,
      };

    setSaving(true);

    try {
      await adminNumerisationApi.create(
        payload,
      );

      toast.success(
        'Demande de numérisation créée.',
      );

      setCreateModalOpen(false);
      setCreateForm(
        CREATE_INITIAL,
      );

      if (page !== 1) {
        setPage(1);
      } else {
        await fetchDemandes();
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de créer la demande.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !editingDemande ||
      !editForm
    ) {
      return;
    }

    const payload: NumerisationUpdatePayload =
      {
        statut:
          editForm.statut,
        produit_id:
          editForm.produit_id
            ? Number(
                editForm.produit_id,
              )
            : null,
        responsable_id:
          editForm.responsable_id
            ? Number(
                editForm.responsable_id,
              )
            : null,
        echeance:
          editForm.echeance ||
          null,
        commentaires_validation:
          editForm.commentaires_validation.trim() ||
          null,
      };

    setSaving(true);

    try {
      await adminNumerisationApi.update(
        editingDemande.id,
        payload,
      );

      toast.success(
        'Demande mise à jour.',
      );

      closeEditModal();
      await fetchDemandes();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de mettre à jour la demande.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function quickStatusUpdate(
    demande: DemandeNumerisation,
    statut: StatutNumerisation,
  ) {
    if (
      statut === demande.statut
    ) {
      return;
    }

    setSaving(true);

    try {
      await adminNumerisationApi.update(
        demande.id,
        {
          statut,
        },
      );

      toast.success(
        `Statut : ${STATUS_LABELS[statut]}.`,
      );

      await fetchDemandes();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de modifier le statut.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const hasServerFilters =
    Boolean(statutFilter) ||
    Boolean(partenaireFilter);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection:
          'column',
        gap: 'var(--space-5)',
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily:
                'var(--font-display)',
              fontSize:
                'var(--text-2xl)',
              fontWeight: 700,
            }}
          >
            Numérisation
          </h1>

          <p
            style={{
              margin: '5px 0 0',
              color:
                'var(--color-gris-moyen)',
              fontSize:
                'var(--text-sm)',
            }}
          >
            Suivi des produits à
            numériser, valider et
            publier.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
          style={{ gap: 6 }}
        >
          <IconPlus size={15} />
          Nouvelle demande
        </button>
      </div>

      {/* STATS */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(5, minmax(150px, 1fr))',
          gap: 12,
          overflowX: 'auto',
        }}
      >
        <div
          className="card"
          style={{
            padding:
              'var(--space-4)',
            minWidth: 150,
          }}
        >
          <div
            style={{
              color:
                'var(--color-gris-moyen)',
              fontSize: 12,
            }}
          >
            Total
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 26,
              fontWeight: 750,
            }}
          >
            {totalStats || total}
          </div>
        </div>

        {STATUS_OPTIONS.map(
          (status) => (
            <button
              key={status}
              type="button"
              className="card"
              onClick={() => {
                setStatutFilter(
                  statutFilter ===
                    status
                    ? ''
                    : status,
                );
                setPage(1);
              }}
              style={{
                textAlign: 'left',
                padding:
                  'var(--space-4)',
                minWidth: 150,
                border:
                  statutFilter ===
                  status
                    ? '2px solid var(--color-terra)'
                    : undefined,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  color:
                    'var(--color-gris-moyen)',
                  fontSize: 12,
                }}
              >
                {
                  STATUS_LABELS[
                    status
                  ]
                }
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 26,
                  fontWeight: 750,
                }}
              >
                {
                  numericStats[
                    status
                  ]
                }
              </div>
            </button>
          ),
        )}
      </div>

      {/* FILTERS */}

      <div
        className="card"
        style={{
          padding:
            'var(--space-4)',
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
            minWidth: 240,
          }}
        >
          <IconSearch
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform:
                'translateY(-50%)',
              color:
                'var(--color-gris-clair)',
              pointerEvents: 'none',
            }}
          />

          <input
            type="search"
            className="form-input"
            style={{
              paddingLeft: 35,
            }}
            placeholder="Rechercher dans la page..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />
        </div>

        <select
          className="form-input"
          style={{
            width: 190,
          }}
          value={statutFilter}
          onChange={(event) => {
            setStatutFilter(
              event.target
                .value as
                | ''
                | StatutNumerisation,
            );
            setPage(1);
          }}
        >
          <option value="">
            Tous les statuts
          </option>

          {STATUS_OPTIONS.map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {
                  STATUS_LABELS[
                    status
                  ]
                }
              </option>
            ),
          )}
        </select>

        <select
          className="form-input"
          style={{
            width: 230,
          }}
          value={partenaireFilter}
          disabled={loadingRefs}
          onChange={(event) => {
            setPartenaireFilter(
              event.target.value,
            );
            setPage(1);
          }}
        >
          <option value="">
            Tous les partenaires
          </option>

          {partenaires.map(
            (partenaire: any) => (
              <option
                key={
                  partenaire.id
                }
                value={
                  partenaire.id
                }
              >
                {partenaire.raison_sociale ??
                  partenaire.nom ??
                  `Partenaire #${partenaire.id}`}
              </option>
            ),
          )}
        </select>

        {(hasServerFilters ||
          search) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearch('');
              setStatutFilter('');
              setPartenaireFilter('');
              setPage(1);
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* TABLE */}

      <div
        className="table-wrapper card"
        style={{
          overflowX: 'auto',
        }}
      >
        {loading ? (
          <div
            style={{
              minHeight: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'center',
            }}
          >
            <div className="spinner" />
          </div>
        ) : visibleDemandes.length ===
          0 ? (
          <div
            className="empty-state"
            style={{
              padding:
                '55px 20px',
              textAlign: 'center',
            }}
          >
            <h3>
              Aucune demande
            </h3>

            <p
              style={{
                color:
                  'var(--color-gris-moyen)',
              }}
            >
              {total === 0
                ? 'Commencez par créer une demande de numérisation.'
                : 'Aucune demande ne correspond à la recherche actuelle.'}
            </p>

            {total === 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  openCreateModal
                }
              >
                <IconPlus
                  size={14}
                />
                Nouvelle demande
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>
                  Partenaire
                </th>
                <th>
                  Responsable
                </th>
                <th>Échéance</th>
                <th>
                  Produit lié
                </th>
                <th>Statut</th>
                <th
                  style={{
                    textAlign:
                      'right',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleDemandes.map(
                (demande) => {
                  const late = isLate(
                    demande.echeance,
                    demande.statut,
                  );

                  return (
                    <tr
                      key={
                        demande.id
                      }
                    >
                      <td>
                        <div
                          style={{
                            minWidth:
                              220,
                          }}
                        >
                          <div
                            style={{
                              fontWeight:
                                650,
                            }}
                          >
                            {
                              demande.nom_produit
                            }
                          </div>

                          {demande.description && (
                            <div
                              style={{
                                marginTop:
                                  3,
                                maxWidth:
                                  340,
                                color:
                                  'var(--color-gris-moyen)',
                                fontSize:
                                  11,
                                lineHeight:
                                  1.45,
                                overflow:
                                  'hidden',
                                display:
                                  '-webkit-box',
                                WebkitLineClamp:
                                  2,
                                WebkitBoxOrient:
                                  'vertical',
                              }}
                            >
                              {
                                demande.description
                              }
                            </div>
                          )}
                        </div>
                      </td>

                      <td
                        style={{
                          color:
                            'var(--color-gris-moyen)',
                        }}
                      >
                        {demande
                          .partenaire
                          ?.raison_sociale ??
                          `#${demande.partenaire_id}`}
                      </td>

                      <td>
                        {demande
                          .responsable
                          ?.name ?? (
                          <span
                            style={{
                              color:
                                'var(--color-gris-clair)',
                            }}
                          >
                            Non affecté
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          style={{
                            fontWeight:
                              late
                                ? 700
                                : 500,
                            color: late
                              ? 'var(--color-error)'
                              : undefined,
                          }}
                        >
                          {formatDate(
                            demande.echeance,
                          )}
                        </span>

                        {late && (
                          <div
                            style={{
                              marginTop:
                                3,
                              fontSize:
                                10,
                              color:
                                'var(--color-error)',
                              fontWeight:
                                700,
                            }}
                          >
                            En retard
                          </div>
                        )}
                      </td>

                      <td>
                        {demande.produit ? (
                          <div>
                            <div
                              style={{
                                fontWeight:
                                  600,
                              }}
                            >
                              {
                                demande
                                  .produit
                                  .nom
                              }
                            </div>

                            <div
                              style={{
                                marginTop:
                                  2,
                                fontSize:
                                  10,
                                color:
                                  'var(--color-gris-moyen)',
                              }}
                            >
                              Statut :{' '}
                              {
                                demande
                                  .produit
                                  .statut
                              }
                            </div>
                          </div>
                        ) : (
                          <span
                            style={{
                              color:
                                'var(--color-gris-clair)',
                            }}
                          >
                            Non lié
                          </span>
                        )}
                      </td>

                      <td>
                        <select
                          className="form-input"
                          value={
                            demande.statut
                          }
                          disabled={
                            saving
                          }
                          onChange={(
                            event,
                          ) =>
                            quickStatusUpdate(
                              demande,
                              event
                                .target
                                .value as StatutNumerisation,
                            )
                          }
                          style={{
                            width: 150,
                            height: 34,
                            padding:
                              '4px 8px',
                            fontSize:
                              11,
                          }}
                        >
                          {STATUS_OPTIONS.map(
                            (
                              status,
                            ) => (
                              <option
                                key={
                                  status
                                }
                                value={
                                  status
                                }
                              >
                                {
                                  STATUS_LABELS[
                                    status
                                  ]
                                }
                              </option>
                            ),
                          )}
                        </select>

                        <div
                          style={{
                            marginTop:
                              5,
                          }}
                        >
                          <span
                            className={`badge ${
                              STATUS_BADGES[
                                demande
                                  .statut
                              ]
                            }`}
                          >
                            {
                              STATUS_LABELS[
                                demande
                                  .statut
                              ]
                            }
                          </span>
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
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                              openEditModal(
                                demande,
                              )
                            }
                            title="Modifier"
                          >
                            <IconEdit
                              size={
                                13
                              }
                            />
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

      {/* PAGINATION */}

      {!loading &&
        lastPage > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent:
                'center',
              alignItems:
                'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
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

            <span
              style={{
                padding:
                  '6px 14px',
                color:
                  'var(--color-gris-moyen)',
                fontSize:
                  'var(--text-sm)',
              }}
            >
              Page {page} /{' '}
              {lastPage} · {total}{' '}
              demande
              {total !== 1
                ? 's'
                : ''}
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={
                page >= lastPage
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

      {/* CREATE MODAL */}

      {createModalOpen && (
        <Overlay
          onClose={
            closeCreateModal
          }
        >
          <form
            onSubmit={handleCreate}
            className="card"
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight:
                'calc(100vh - 40px)',
              overflowY: 'auto',
              padding:
                'var(--space-5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'flex-start',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize:
                      'var(--text-xl)',
                  }}
                >
                  Nouvelle demande
                </h2>

                <p
                  style={{
                    margin:
                      '5px 0 0',
                    color:
                      'var(--color-gris-moyen)',
                    fontSize:
                      12,
                  }}
                >
                  Ajouter un produit
                  au workflow de
                  numérisation.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={
                  closeCreateModal
                }
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: 16,
              }}
            >
              <div
                style={{
                  gridColumn:
                    '1 / -1',
                }}
              >
                <label
                  className="form-label"
                  htmlFor="num-partenaire"
                >
                  Partenaire *
                </label>

                <select
                  id="num-partenaire"
                  className="form-input"
                  required
                  value={
                    createForm.partenaire_id
                  }
                  onChange={(e) =>
                    updateCreateField(
                      'partenaire_id',
                      e.target.value,
                    )
                  }
                >
                  <option value="">
                    Sélectionner...
                  </option>

                  {partenaires.map(
                    (
                      item: any,
                    ) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {item.raison_sociale ??
                          item.nom ??
                          `#${item.id}`}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div
                style={{
                  gridColumn:
                    '1 / -1',
                }}
              >
                <label
                  className="form-label"
                  htmlFor="num-nom"
                >
                  Nom du produit *
                </label>

                <input
                  id="num-nom"
                  className="form-input"
                  required
                  maxLength={255}
                  value={
                    createForm.nom_produit
                  }
                  onChange={(e) =>
                    updateCreateField(
                      'nom_produit',
                      e.target.value,
                    )
                  }
                  placeholder="Nom du produit à numériser"
                />
              </div>

              <div>
                <label
                  className="form-label"
                  htmlFor="num-responsable"
                >
                  Responsable
                </label>

                <select
                  id="num-responsable"
                  className="form-input"
                  value={
                    createForm.responsable_id
                  }
                  onChange={(e) =>
                    updateCreateField(
                      'responsable_id',
                      e.target.value,
                    )
                  }
                >
                  <option value="">
                    Non affecté
                  </option>

                  {responsables.map(
                    (
                      item: any,
                    ) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {item.name ??
                          item.nom ??
                          item.email ??
                          `Utilisateur #${item.id}`}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  className="form-label"
                  htmlFor="num-echeance"
                >
                  Échéance
                </label>

                <input
                  id="num-echeance"
                  type="date"
                  className="form-input"
                  value={
                    createForm.echeance
                  }
                  onChange={(e) =>
                    updateCreateField(
                      'echeance',
                      e.target.value,
                    )
                  }
                />
              </div>

              <div
                style={{
                  gridColumn:
                    '1 / -1',
                }}
              >
                <label
                  className="form-label"
                  htmlFor="num-description"
                >
                  Description
                </label>

                <textarea
                  id="num-description"
                  className="form-input"
                  rows={5}
                  value={
                    createForm.description
                  }
                  onChange={(e) =>
                    updateCreateField(
                      'description',
                      e.target.value,
                    )
                  }
                  placeholder="Informations utiles pour la numérisation..."
                  style={{
                    resize:
                      'vertical',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
                gap: 8,
                marginTop: 22,
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={
                  closeCreateModal
                }
              >
                Annuler
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? 'Création...'
                  : 'Créer la demande'}
              </button>
            </div>
          </form>
        </Overlay>
      )}

      {/* EDIT MODAL */}

      {editingDemande &&
        editForm && (
          <Overlay
            onClose={
              closeEditModal
            }
          >
            <form
              onSubmit={handleUpdate}
              className="card"
              style={{
                width: '100%',
                maxWidth: 760,
                maxHeight:
                  'calc(100vh - 40px)',
                overflowY: 'auto',
                padding:
                  'var(--space-5)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'flex-start',
                  gap: 12,
                  marginBottom:
                    20,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize:
                        'var(--text-xl)',
                    }}
                  >
                    Modifier la
                    demande
                  </h2>

                  <p
                    style={{
                      margin:
                        '5px 0 0',
                      color:
                        'var(--color-gris-moyen)',
                      fontSize:
                        12,
                    }}
                  >
                    {
                      editingDemande.nom_produit
                    }{' '}
                    · #
                    {
                      editingDemande.id
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={
                    closeEditModal
                  }
                >
                  ×
                </button>
              </div>

              <div
                className="card"
                style={{
                  marginBottom:
                    18,
                  padding: 14,
                  background:
                    'var(--color-ivoire-dark)',
                }}
              >
                <div
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong>
                      Partenaire
                    </strong>
                    <div
                      style={{
                        marginTop:
                          3,
                        color:
                          'var(--color-gris-moyen)',
                      }}
                    >
                      {editingDemande
                        .partenaire
                        ?.raison_sociale ??
                        `#${editingDemande.partenaire_id}`}
                    </div>
                  </div>

                  <div>
                    <strong>
                      Créée le
                    </strong>
                    <div
                      style={{
                        marginTop:
                          3,
                        color:
                          'var(--color-gris-moyen)',
                      }}
                    >
                      {formatDate(
                        editingDemande.created_at,
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap: 16,
                }}
              >
                <div>
                  <label
                    className="form-label"
                    htmlFor="edit-statut"
                  >
                    Statut
                  </label>

                  <select
                    id="edit-statut"
                    className="form-input"
                    value={
                      editForm.statut
                    }
                    onChange={(e) =>
                      updateEditField(
                        'statut',
                        e.target
                          .value as StatutNumerisation,
                      )
                    }
                  >
                    {STATUS_OPTIONS.map(
                      (
                        status,
                      ) => (
                        <option
                          key={
                            status
                          }
                          value={
                            status
                          }
                        >
                          {
                            STATUS_LABELS[
                              status
                            ]
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label
                    className="form-label"
                    htmlFor="edit-echeance"
                  >
                    Échéance
                  </label>

                  <input
                    id="edit-echeance"
                    type="date"
                    className="form-input"
                    value={
                      editForm.echeance
                    }
                    onChange={(e) =>
                      updateEditField(
                        'echeance',
                        e.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <label
                    className="form-label"
                    htmlFor="edit-responsable"
                  >
                    Responsable
                  </label>

                  <select
                    id="edit-responsable"
                    className="form-input"
                    value={
                      editForm.responsable_id
                    }
                    onChange={(e) =>
                      updateEditField(
                        'responsable_id',
                        e.target.value,
                      )
                    }
                  >
                    <option value="">
                      Non affecté
                    </option>

                    {responsables.map(
                      (
                        item: any,
                      ) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {item.name ??
                            item.nom ??
                            item.email ??
                            `Utilisateur #${item.id}`}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label
                    className="form-label"
                    htmlFor="edit-produit"
                  >
                    Produit lié
                  </label>

                  <select
                    id="edit-produit"
                    className="form-input"
                    value={
                      editForm.produit_id
                    }
                    onChange={(e) =>
                      updateEditField(
                        'produit_id',
                        e.target.value,
                      )
                    }
                  >
                    <option value="">
                      Aucun produit
                      lié
                    </option>

                    {produits.map(
                      (
                        item: any,
                      ) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {item.nom}
                          {item.sku
                            ? ` — ${item.sku}`
                            : ''}
                        </option>
                      ),
                    )}
                  </select>

                  <p
                    style={{
                      margin:
                        '6px 0 0',
                      color:
                        'var(--color-gris-moyen)',
                      fontSize:
                        10,
                      lineHeight:
                        1.45,
                    }}
                  >
                    Le contrôleur
                    permet de lier la
                    demande à un
                    produit existant
                    grâce à
                    `produit_id`.
                  </p>
                </div>

                <div
                  style={{
                    gridColumn:
                      '1 / -1',
                  }}
                >
                  <label
                    className="form-label"
                    htmlFor="edit-commentaires"
                  >
                    Commentaires de
                    validation
                  </label>

                  <textarea
                    id="edit-commentaires"
                    className="form-input"
                    rows={6}
                    value={
                      editForm.commentaires_validation
                    }
                    onChange={(e) =>
                      updateEditField(
                        'commentaires_validation',
                        e.target.value,
                      )
                    }
                    placeholder="Corrections à effectuer, validation, remarques..."
                    style={{
                      resize:
                        'vertical',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'flex-end',
                  gap: 8,
                  marginTop: 22,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={
                    closeEditModal
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Enregistrement...'
                    : 'Enregistrer'}
                </button>
              </div>
            </form>
          </Overlay>
        )}
    </div>
  );
}
