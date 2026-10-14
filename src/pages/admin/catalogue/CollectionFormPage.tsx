import React, {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminCollectionsApi,
  type AdminCollection,
  type CollectionPayload,
} from '../../../api/adminCollections';

import { adminApi } from '../../../api/admin';
type FormState = {
  partenaire_id: string;
  nom: string;
  description: string;
  active: boolean;
};

const INITIAL_FORM: FormState = {
  partenaire_id: '',
  nom: '',
  description: '',
  active: true,
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

  if (
    data?.errors &&
    typeof data.errors === 'object'
  ) {
    const first = Object.values(
      data.errors,
    )
      .flat()
      .find(Boolean);

    if (typeof first === 'string') {
      return first;
    }
  }

  return fallback;
}

type PartenaireOption = {
  id: number;
  raison_sociale: string;
};

export default function CollectionFormPage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate =
    useNavigate();

  const collectionId =
    id ? Number(id) : null;

  const isEditing = id !== undefined;

  const [form, setForm] =
    useState<FormState>(
      INITIAL_FORM,
    );

  const [
    collection,
    setCollection,
  ] =
    useState<AdminCollection | null>(
      null,
    );

  const [
    partenaires,
    setPartenaires,
  ] = useState<PartenaireOption[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [loadAttempt, setLoadAttempt] =
    useState(0);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [
          partenairesResponse,
          collectionResponse,
        ] = await Promise.all([
          adminApi.partenairesCatalogue(),

          isEditing &&
          collectionId !== null
            ? adminCollectionsApi.collection(
                collectionId,
              )
            : Promise.resolve(null),
        ]);

        if (!mounted) {
          return;
        }

        setPartenaires(partenairesResponse.data);

        if (
          collectionResponse
        ) {
          const item =
            collectionResponse.data;

          setCollection(item);

          setForm({
            partenaire_id:
              item.partenaire_id
                ? String(
                    item.partenaire_id,
                  )
                : item.partenaire
                    ?.id
                  ? String(
                      item.partenaire.id,
                    )
                  : '',

            nom: item.nom ?? '',

            description:
              item.description ??
              '',

            active: Boolean(
              item.active,
            ),
          });
        }
      } catch (error) {
        if (mounted) {
          const message = getApiErrorMessage(
            error,
            isEditing
              ? 'Impossible de charger la collection.'
              : 'Impossible de charger le formulaire.',
          );
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [
    isEditing,
    collectionId,
    navigate,
    loadAttempt,
  ]);

  function updateField<
    K extends keyof FormState,
  >(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildPayload():
    | CollectionPayload
    | null {
    const nom = form.nom.trim();

    if (!nom) {
      toast.error(
        'Le nom de la collection est obligatoire.',
      );

      return null;
    }

    return {
      partenaire_id:
        form.partenaire_id
          ? Number(
              form.partenaire_id,
            )
          : null,

      nom,

      description:
        form.description.trim() ||
        null,

      active: form.active,
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const payload =
      buildPayload();

    if (!payload) {
      return;
    }

    setSaving(true);

    try {
      if (
        isEditing &&
        collectionId !== null
      ) {
        const response =
          await adminCollectionsApi.updateCollection(
            collectionId,
            payload,
          );

        setCollection(
          response.data,
        );

        toast.success(
          'Collection mise à jour.',
        );
      } else {
        const response =
          await adminCollectionsApi.createCollection(
            payload,
          );

        toast.success(
          'Collection créée avec succès.',
        );

        navigate(
          `/admin/catalogue/collections/${response.data.id}/modifier`,
          {
            replace: true,
          },
        );
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          isEditing
            ? 'Impossible de modifier la collection.'
            : 'Impossible de créer la collection.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !isEditing ||
      collectionId === null
    ) {
      return;
    }

    const productCount =
      collection?.produits_count ??
      0;

    const message =
      productCount > 0
        ? `Cette collection contient ${productCount} produit(s).\n\nLaravel refusera la suppression tant que ces produits sont rattachés à la collection.\n\nEssayer quand même ?`
        : `Supprimer définitivement la collection "${collection?.nom ?? form.nom}" ?`;

    if (
      !window.confirm(message)
    ) {
      return;
    }

    setSaving(true);

    try {
      const response =
        await adminCollectionsApi.deleteCollection(
          collectionId,
        );

      toast.success(
        response.data?.message ??
          'Collection supprimée.',
      );

      navigate(
        '/admin/catalogue/collections',
        {
          replace: true,
        },
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de supprimer la collection.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'center',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card empty-state" style={{ padding: 40, textAlign: 'center' }}>
        <h2>Chargement impossible</h2>
        <p style={{ color: 'var(--color-gris-moyen)' }}>{loadError}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            Réessayer
          </button>
          <Link to="/admin/catalogue/collections" className="btn btn-ghost">
            Retour aux collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
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
          <Link
            to="/admin/catalogue/collections"
            style={{
              display:
                'inline-block',
              marginBottom: 7,
              color:
                'var(--color-gris-moyen)',
              fontSize:
                'var(--text-sm)',
            }}
          >
            ← Retour aux
            collections
          </Link>

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
            {isEditing
              ? 'Modifier la collection'
              : 'Nouvelle collection'}
          </h1>

          {isEditing &&
            collection && (
              <p
                style={{
                  margin:
                    '5px 0 0',
                  color:
                    'var(--color-gris-moyen)',
                  fontSize:
                    'var(--text-sm)',
                }}
              >
                Slug :{' '}
                {collection.slug}
              </p>
            )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/admin/catalogue/collections"
            className="btn btn-secondary"
          >
            Annuler
          </Link>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving
              ? 'Enregistrement...'
              : isEditing
                ? 'Enregistrer'
                : 'Créer la collection'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 2fr) minmax(280px, 1fr)',
          gap: 'var(--space-5)',
          alignItems: 'start',
        }}
      >
        {/* MAIN */}

        <section
          className="card"
          style={{
            padding:
              'var(--space-5)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 18,
              fontSize:
                'var(--text-lg)',
            }}
          >
            Informations
          </h2>

          <div
            style={{
              display: 'grid',
              gap: 16,
            }}
          >
            <div>
              <label
                className="form-label"
                htmlFor="collection-nom"
              >
                Nom *
              </label>

              <input
                id="collection-nom"
                className="form-input"
                required
                maxLength={255}
                value={form.nom}
                onChange={(e) =>
                  updateField(
                    'nom',
                    e.target.value,
                  )
                }
                placeholder="Ex. Collection Élégance"
              />
            </div>

            <div>
              <label
                className="form-label"
                htmlFor="collection-description"
              >
                Description
              </label>

              <textarea
                id="collection-description"
                className="form-input"
                rows={9}
                value={
                  form.description
                }
                onChange={(e) =>
                  updateField(
                    'description',
                    e.target.value,
                  )
                }
                placeholder="Description de la collection..."
                style={{
                  resize:
                    'vertical',
                }}
              />
            </div>
          </div>
        </section>

        {/* SIDEBAR */}

        <aside
          style={{
            display: 'flex',
            flexDirection:
              'column',
            gap: 'var(--space-5)',
          }}
        >
          <section
            className="card"
            style={{
              padding:
                'var(--space-5)',
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: 18,
                fontSize:
                  'var(--text-lg)',
              }}
            >
              Paramètres
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: 16,
              }}
            >
              <div>
                <label
                  className="form-label"
                  htmlFor="collection-partenaire"
                >
                  Partenaire
                </label>

                <select
                  id="collection-partenaire"
                  className="form-input"
                  value={
                    form.partenaire_id
                  }
                  onChange={(e) =>
                    updateField(
                      'partenaire_id',
                      e.target.value,
                    )
                  }
                >
                  <option value="">
                    Aucun partenaire
                  </option>

                  {partenaires.map(
                    (partenaire) => (
                      <option
                        key={
                          partenaire.id
                        }
                        value={
                          partenaire.id
                        }
                      >
                        {partenaire.raison_sociale}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: 9,
                  cursor:
                    'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    form.active
                  }
                  onChange={(e) =>
                    updateField(
                      'active',
                      e.target
                        .checked,
                    )
                  }
                />

                <span>
                  Collection active
                </span>
              </label>
            </div>
          </section>

          {isEditing && (
            <section
              className="card"
              style={{
                padding:
                  'var(--space-5)',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom:
                    10,
                  fontSize:
                    'var(--text-lg)',
                }}
              >
                Informations
              </h2>

              <dl
                style={{
                  margin: 0,
                  display:
                    'grid',
                  gap: 10,
                }}
              >
                <div>
                  <dt
                    style={{
                      color:
                        'var(--color-gris-moyen)',
                      fontSize:
                        11,
                    }}
                  >
                    Identifiant
                  </dt>

                  <dd
                    style={{
                      margin: 0,
                      fontWeight:
                        650,
                    }}
                  >
                    #
                    {
                      collectionId
                    }
                  </dd>
                </div>

                <div>
                  <dt
                    style={{
                      color:
                        'var(--color-gris-moyen)',
                      fontSize:
                        11,
                    }}
                  >
                    Slug
                  </dt>

                  <dd
                    style={{
                      margin: 0,
                    }}
                  >
                    <code
                      style={{
                        fontFamily:
                          'var(--font-mono)',
                        fontSize:
                          11,
                      }}
                    >
                      {collection?.slug ??
                        '—'}
                    </code>
                  </dd>
                </div>

                <div>
                  <dt
                    style={{
                      color:
                        'var(--color-gris-moyen)',
                      fontSize:
                        11,
                    }}
                  >
                    Produits
                  </dt>

                  <dd
                    style={{
                      margin: 0,
                      fontWeight:
                        650,
                    }}
                  >
                    {collection
                      ?.produits_count ??
                      '—'}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {isEditing && (
            <section
              className="card"
              style={{
                padding:
                  'var(--space-5)',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize:
                    'var(--text-lg)',
                }}
              >
                Zone sensible
              </h2>

              <p
                style={{
                  color:
                    'var(--color-gris-moyen)',
                  fontSize:
                    'var(--text-sm)',
                  lineHeight: 1.5,
                }}
              >
                Une collection
                contenant des produits
                ne peut pas être
                supprimée. Laravel
                retournera une erreur
                422 dans ce cas.
              </p>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={handleDelete}
                style={{
                  width: '100%',
                  color:
                    'var(--color-error)',
                }}
              >
                Supprimer la
                collection
              </button>
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}
