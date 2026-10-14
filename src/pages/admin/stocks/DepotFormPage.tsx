import React, {
  FormEvent,
  useEffect,
  useMemo,
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
  adminDepotsApi,
  type AdminDepot,
  type CreateDepotPayload,
  type DepotStock,
  type DepotType,
  type UpdateDepotPayload,
} from '../../../api/adminDepots';

import {
  publicApi,
} from '../../../api/public';

import type {
  Partenaire,
} from '../../../types';

type FormState = {
  nom: string;
  type: DepotType;
  partenaire_id: string;
  adresse: string;
  actif: boolean;
};

type ValidationErrors =
  Record<
    string,
    string[]
  >;

const INITIAL_FORM: FormState = {
  nom: '',
  type: 'plateforme',
  partenaire_id: '',
  adresse: '',
  actif: true,
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

    if (
      typeof first ===
      'string'
    ) {
      return first;
    }
  }

  return fallback;
}

function getValidationErrors(
  error: unknown,
): ValidationErrors {
  if (!axios.isAxiosError(error)) {
    return {};
  }

  const errors =
    error.response?.data
      ?.errors;

  if (
    !errors ||
    typeof errors !==
      'object'
  ) {
    return {};
  }

  return errors as ValidationErrors;
}

function getItems<T>(
  payload: any,
): T[] {
  if (
    Array.isArray(payload)
  ) {
    return payload;
  }

  if (
    Array.isArray(
      payload?.data,
    )
  ) {
    return payload.data;
  }

  return [];
}

function FieldError({
  errors,
}: {
  errors?: string[];
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <div className="df-field-error">
      {errors[0]}
    </div>
  );
}

function availableStock(
  stock: DepotStock,
): number {
  return Math.max(
    0,
    Number(
      stock.quantite ?? 0,
    ) -
      Number(
        stock.quantite_reservee ??
          0,
      ),
  );
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    'fr-FR',
  ).format(value);
}

export default function DepotFormPage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate =
    useNavigate();

  const depotId =
    id ? Number(id) : null;

  const isEditing =
    depotId !== null &&
    Number.isFinite(
      depotId,
    );

  const [form, setForm] =
    useState<FormState>(
      INITIAL_FORM,
    );

  const [
    depot,
    setDepot,
  ] =
    useState<AdminDepot | null>(
      null,
    );

  const [
    partenaires,
    setPartenaires,
  ] =
    useState<Partenaire[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    validationErrors,
    setValidationErrors,
  ] =
    useState<ValidationErrors>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const requests:
          Promise<any>[] = [
          publicApi.partenaires(),
        ];

        if (
          isEditing &&
          depotId !== null
        ) {
          requests.push(
            adminDepotsApi.depot(
              depotId,
            ),
          );
        }

        const results =
          await Promise.all(
            requests,
          );

        if (!mounted) {
          return;
        }

        setPartenaires(
          getItems<Partenaire>(
            results[0].data,
          ),
        );

        if (isEditing) {
          const loaded =
            results[1]
              .data as AdminDepot;

          setDepot(
            loaded,
          );

          setForm({
            nom:
              loaded.nom ??
              '',
            type:
              loaded.type ??
              'plateforme',
            partenaire_id:
              loaded.partenaire_id
                ? String(
                    loaded.partenaire_id,
                  )
                : loaded
                      .partenaire
                      ?.id
                  ? String(
                      loaded
                        .partenaire
                        .id,
                    )
                  : '',
            adresse:
              loaded.adresse ??
              '',
            actif:
              loaded.actif !==
              false,
          });
        }
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            isEditing
              ? 'Impossible de charger le dépôt.'
              : 'Impossible de charger le formulaire.',
          ),
        );

        if (isEditing) {
          navigate(
            '/admin/stocks/depots',
            {
              replace: true,
            },
          );
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
    depotId,
    navigate,
  ]);

  const stocks =
    useMemo(
      () =>
        Array.isArray(
          depot?.stocks,
        )
          ? depot!.stocks!
          : [],
      [depot],
    );

  const totalPhysical =
    useMemo(
      () =>
        stocks.reduce(
          (
            total,
            stock,
          ) =>
            total +
            Number(
              stock.quantite ??
                0,
            ),
          0,
        ),
      [stocks],
    );

  const totalReserved =
    useMemo(
      () =>
        stocks.reduce(
          (
            total,
            stock,
          ) =>
            total +
            Number(
              stock.quantite_reservee ??
                0,
            ),
          0,
        ),
      [stocks],
    );

  const totalAvailable =
    useMemo(
      () =>
        stocks.reduce(
          (
            total,
            stock,
          ) =>
            total +
            availableStock(
              stock,
            ),
          0,
        ),
      [stocks],
    );

  const positiveStockCount =
    useMemo(
      () =>
        stocks.filter(
          (stock) =>
            Number(
              stock.quantite ??
                0,
            ) > 0,
        ).length,
      [stocks],
    );

  function updateField<
    K extends keyof FormState,
  >(
    field: K,
    value: FormState[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setValidationErrors(
      (current) => {
        if (
          !current[field]
        ) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[field];

        return next;
      },
    );
  }

  function handleTypeChange(
    value: DepotType,
  ) {
    setForm(
      (current) => ({
        ...current,
        type: value,
        partenaire_id:
          value ===
          'plateforme'
            ? ''
            : current
                .partenaire_id,
      }),
    );

    setValidationErrors(
      (current) => {
        const next = {
          ...current,
        };

        delete next.type;

        if (
          value ===
          'plateforme'
        ) {
          delete next.partenaire_id;
        }

        return next;
      },
    );
  }

  function validateForm():
    | CreateDepotPayload
    | UpdateDepotPayload
    | null {
    const errors:
      ValidationErrors = {};

    if (!form.nom.trim()) {
      errors.nom = [
        'Le nom du dépôt est obligatoire.',
      ];
    }

    if (
      !isEditing &&
      form.type ===
        'partenaire' &&
      !form.partenaire_id
    ) {
      errors.partenaire_id =
        [
          'Sélectionnez le partenaire propriétaire du dépôt.',
        ];
    }

    setValidationErrors(
      errors,
    );

    if (
      Object.keys(errors)
        .length > 0
    ) {
      return null;
    }

    if (isEditing) {
      return {
        nom:
          form.nom.trim(),
        adresse:
          form.adresse.trim() ||
          null,
        actif:
          form.actif,
      };
    }

    return {
      nom:
        form.nom.trim(),
      type:
        form.type,
      partenaire_id:
        form.type ===
          'partenaire'
          ? Number(
              form.partenaire_id,
            )
          : null,
      adresse:
        form.adresse.trim() ||
        null,
      actif:
        form.actif,
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const payload =
      validateForm();

    if (!payload) {
      toast.error(
        'Vérifiez les champs du formulaire.',
      );

      return;
    }

    setSaving(true);

    try {
      if (
        isEditing &&
        depotId !== null
      ) {
        const response =
          await adminDepotsApi.updateDepot(
            depotId,
            payload as UpdateDepotPayload,
          );

        setDepot(
          (current) => ({
            ...(current ??
              ({} as AdminDepot)),
            ...response.data,
            stocks:
              current?.stocks ??
              [],
          }),
        );

        toast.success(
          'Dépôt mis à jour.',
        );
      } else {
        const response =
          await adminDepotsApi.createDepot(
            payload as CreateDepotPayload,
          );

        toast.success(
          'Dépôt créé avec succès.',
        );

        navigate(
          `/admin/stocks/depots/${response.data.id}/modifier`,
          {
            replace: true,
          },
        );
      }
    } catch (error) {
      setValidationErrors(
        getValidationErrors(
          error,
        ),
      );

      toast.error(
        getApiErrorMessage(
          error,
          isEditing
            ? 'Impossible de modifier le dépôt.'
            : 'Impossible de créer le dépôt.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !isEditing ||
      depotId === null
    ) {
      return;
    }

    if (
      !window.confirm(
        `Supprimer le dépôt "${form.nom}" ?`,
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const response =
        await adminDepotsApi.deleteDepot(
          depotId,
        );

      toast.success(
        response.data
          ?.message ??
          'Dépôt supprimé.',
      );

      navigate(
        '/admin/stocks/depots',
        {
          replace: true,
        },
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de supprimer le dépôt.',
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
          minHeight: 340,
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .df-page {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .df-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .df-back {
          display: inline-block;
          margin-bottom: 7px;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          text-decoration: none;
        }

        .df-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .df-subtitle {
          max-width: 700px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .df-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .df-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            320px;
          gap: 20px;
          align-items: start;
        }

        .df-main,
        .df-sidebar {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .df-sidebar {
          position: sticky;
          top: 18px;
        }

        .df-card {
          padding: 22px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 14px;
          background: var(--color-blanc);
        }

        .df-card-head {
          margin-bottom: 19px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.08));
        }

        .df-card-head small {
          display: block;
          margin-bottom: 5px;
          color: var(--color-terra);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .10em;
          text-transform: uppercase;
        }

        .df-card-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 760;
        }

        .df-card-head p {
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        .df-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px 18px;
        }

        .df-field {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .df-field--full {
          grid-column: 1 / -1;
        }

        .df-field .form-label {
          margin-bottom: 6px;
          font-size: 11.5px;
          font-weight: 720;
        }

        .df-required {
          margin-left: 2px;
          color: var(--color-error);
        }

        .df-help {
          margin-top: 6px;
          color: var(--color-gris-moyen);
          font-size: 10px;
          line-height: 1.45;
        }

        .df-field-error {
          margin-top: 6px;
          color: var(--color-error);
          font-size: 10.5px;
          font-weight: 650;
        }

        .df-readonly {
          min-height: 42px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 9px;
          background: var(--color-ivoire);
          color: var(--color-gris-fonce);
          font-size: 11px;
          font-weight: 650;
        }

        .df-type-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .df-type-option {
          position: relative;
          padding: 14px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 11px;
          background: var(--color-blanc);
          cursor: pointer;
          transition:
            border-color .16s ease,
            background .16s ease;
        }

        .df-type-option.is-active {
          border-color: var(--color-terra);
          background: rgba(196,98,58,.045);
        }

        .df-type-option input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .df-type-option strong {
          display: block;
          font-size: 11.5px;
          font-weight: 760;
        }

        .df-type-option span {
          display: block;
          margin-top: 4px;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          line-height: 1.45;
        }

        .df-textarea {
          min-height: 110px;
          resize: vertical;
          line-height: 1.55;
        }

        .df-switch {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
          cursor: pointer;
        }

        .df-switch input {
          margin-top: 2px;
          accent-color: var(--color-terra);
        }

        .df-switch strong {
          display: block;
          font-size: 11.5px;
        }

        .df-switch small {
          display: block;
          margin-top: 2px;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          line-height: 1.45;
        }

        .df-status-card {
          text-align: center;
        }

        .df-depot-icon {
          width: 70px;
          height: 70px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 18px;
          background:
            linear-gradient(
              145deg,
              var(--color-ivoire-dark),
              var(--color-ivoire)
            );
          color: var(--color-terra);
          font-size: 25px;
          font-weight: 850;
        }

        .df-status-name {
          font-size: 13px;
          font-weight: 760;
        }

        .df-status-type {
          margin-top: 4px;
          color: var(--color-gris-moyen);
          font-size: 10px;
        }

        .df-summary {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 15px;
        }

        .df-summary-card {
          padding: 11px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
        }

        .df-summary-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .df-summary-card strong {
          display: block;
          margin-top: 4px;
          font-size: 15px;
          font-weight: 780;
        }

        .df-stock-table {
          overflow-x: auto;
        }

        .df-stock-product {
          min-width: 220px;
        }

        .df-stock-product strong {
          display: block;
          font-size: 11.5px;
        }

        .df-stock-product span {
          display: block;
          margin-top: 3px;
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .df-danger {
          border-color: rgba(190,40,40,.16);
        }

        .df-danger p {
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        @media (max-width: 900px) {
          .df-layout {
            grid-template-columns: 1fr;
          }

          .df-sidebar {
            position: static;
          }
        }

        @media (max-width: 620px) {
          .df-grid,
          .df-type-grid {
            grid-template-columns: 1fr;
          }

          .df-field--full {
            grid-column: 1;
          }

          .df-actions {
            width: 100%;
          }

          .df-actions .btn {
            flex: 1;
          }
        }
      `}</style>

      <form
        onSubmit={handleSubmit}
        className="df-page"
      >
        <header className="df-header">
          <div>
            <Link
              to="/admin/stocks/depots"
              className="df-back"
            >
              ← Retour aux dépôts
            </Link>

            <h1 className="df-title">
              {isEditing
                ? 'Modifier le dépôt'
                : 'Nouveau dépôt'}
            </h1>

            <p className="df-subtitle">
              {isEditing
                ? 'Mettez à jour le nom, l’adresse et le statut du dépôt. Le type et le partenaire sont fixés à la création par le backend actuel.'
                : 'Créez un lieu de stockage pour la plateforme ou rattachez un dépôt à un partenaire.'}
            </p>
          </div>

          <div className="df-actions">
            <Link
              to="/admin/stocks/depots"
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
                  : 'Créer le dépôt'}
            </button>
          </div>
        </header>

        <div className="df-layout">
          <main className="df-main">
            <section className="df-card">
              <div className="df-card-head">
                <small>
                  Identification
                </small>

                <h2>
                  Informations du dépôt
                </h2>

                <p>
                  Définissez le nom et la nature du lieu de stockage.
                </p>
              </div>

              <div className="df-grid">
                <div className="df-field df-field--full">
                  <label
                    className="form-label"
                    htmlFor="depot-nom"
                  >
                    Nom du dépôt
                    <span className="df-required">
                      *
                    </span>
                  </label>

                  <input
                    id="depot-nom"
                    className="form-input"
                    maxLength={255}
                    required
                    value={form.nom}
                    onChange={(event) =>
                      updateField(
                        'nom',
                        event.target.value,
                      )
                    }
                    placeholder="Ex. Dépôt central Abidjan"
                  />

                  <FieldError
                    errors={
                      validationErrors.nom
                    }
                  />
                </div>

                <div className="df-field df-field--full">
                  <label className="form-label">
                    Type de dépôt
                    {!isEditing && (
                      <span className="df-required">
                        *
                      </span>
                    )}
                  </label>

                  {isEditing ? (
                    <div className="df-readonly">
                      {form.type ===
                      'partenaire'
                        ? 'Dépôt partenaire'
                        : 'Dépôt plateforme'}
                    </div>
                  ) : (
                    <div className="df-type-grid">
                      <label
                        className={`df-type-option ${
                          form.type ===
                          'plateforme'
                            ? 'is-active'
                            : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value="plateforme"
                          checked={
                            form.type ===
                            'plateforme'
                          }
                          onChange={() =>
                            handleTypeChange(
                              'plateforme',
                            )
                          }
                        />

                        <strong>
                          Plateforme
                        </strong>

                        <span>
                          Dépôt géré directement par la plateforme.
                        </span>
                      </label>

                      <label
                        className={`df-type-option ${
                          form.type ===
                          'partenaire'
                            ? 'is-active'
                            : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value="partenaire"
                          checked={
                            form.type ===
                            'partenaire'
                          }
                          onChange={() =>
                            handleTypeChange(
                              'partenaire',
                            )
                          }
                        />

                        <strong>
                          Partenaire
                        </strong>

                        <span>
                          Dépôt rattaché à un partenaire spécifique.
                        </span>
                      </label>
                    </div>
                  )}

                  <FieldError
                    errors={
                      validationErrors.type
                    }
                  />
                </div>

                {form.type ===
                  'partenaire' && (
                  <div className="df-field df-field--full">
                    <label
                      className="form-label"
                      htmlFor="depot-partenaire"
                    >
                      Partenaire
                      {!isEditing && (
                        <span className="df-required">
                          *
                        </span>
                      )}
                    </label>

                    {isEditing ? (
                      <div className="df-readonly">
                        {depot
                          ?.partenaire
                          ?.raison_sociale ??
                          partenaires.find(
                            (
                              partenaire: any,
                            ) =>
                              String(
                                partenaire.id,
                              ) ===
                              form.partenaire_id,
                          )
                            ?.raison_sociale ??
                          'Partenaire non chargé'}
                      </div>
                    ) : (
                      <select
                        id="depot-partenaire"
                        className="form-input"
                        required={
                          form.type ===
                          'partenaire'
                        }
                        value={
                          form.partenaire_id
                        }
                        onChange={(event) =>
                          updateField(
                            'partenaire_id',
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Sélectionner un partenaire
                        </option>

                        {partenaires.map(
                          (
                            partenaire: any,
                          ) => (
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
                    )}

                    <FieldError
                      errors={
                        validationErrors.partenaire_id
                      }
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="df-card">
              <div className="df-card-head">
                <small>
                  Localisation
                </small>

                <h2>
                  Adresse
                </h2>

                <p>
                  Indiquez l’adresse ou les informations permettant d’identifier l’emplacement physique du dépôt.
                </p>
              </div>

              <div className="df-field">
                <label
                  className="form-label"
                  htmlFor="depot-adresse"
                >
                  Adresse du dépôt
                </label>

                <textarea
                  id="depot-adresse"
                  className="form-input df-textarea"
                  value={
                    form.adresse
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      'adresse',
                      event.target
                        .value,
                    )
                  }
                  placeholder="Quartier, rue, repère, ville..."
                />

                <FieldError
                  errors={
                    validationErrors.adresse
                  }
                />
              </div>
            </section>

            {isEditing && (
              <section className="df-card">
                <div className="df-card-head">
                  <small>
                    Inventaire
                  </small>

                  <h2>
                    Stock présent dans le dépôt
                  </h2>

                  <p>
                    Données retournées par `show()` via la relation `stocks.variante.produit`.
                  </p>
                </div>

                {stocks.length ===
                0 ? (
                  <div
                    className="empty-state"
                    style={{
                      padding:
                        '40px 15px',
                    }}
                  >
                    <h3>
                      Aucun stock
                    </h3>

                    <p>
                      Aucun stock n’est actuellement enregistré dans ce dépôt.
                    </p>
                  </div>
                ) : (
                  <div className="df-stock-table">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>
                            Produit
                          </th>
                          <th>
                            Variante
                          </th>
                          <th>
                            Quantité
                          </th>
                          <th>
                            Réservé
                          </th>
                          <th>
                            Disponible
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {stocks.map(
                          (stock) => (
                            <tr
                              key={
                                stock.id
                              }
                            >
                              <td>
                                <div className="df-stock-product">
                                  <strong>
                                    {stock
                                      .variante
                                      ?.produit
                                      ?.nom ??
                                      'Produit non chargé'}
                                  </strong>

                                  <span>
                                    {stock
                                      .variante
                                      ?.produit
                                      ?.sku ??
                                      'Sans SKU'}
                                  </span>
                                </div>
                              </td>

                              <td>
                                #
                                {stock
                                  .variante
                                  ?.id ??
                                  stock.variante_id ??
                                  '—'}
                              </td>

                              <td>
                                {formatNumber(
                                  Number(
                                    stock.quantite ??
                                      0,
                                  ),
                                )}
                              </td>

                              <td>
                                {formatNumber(
                                  Number(
                                    stock.quantite_reservee ??
                                      0,
                                  ),
                                )}
                              </td>

                              <td>
                                <strong>
                                  {formatNumber(
                                    availableStock(
                                      stock,
                                    ),
                                  )}
                                </strong>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </main>

          <aside className="df-sidebar">
            <section className="df-card df-status-card">
              <div className="df-depot-icon">
                D
              </div>

              <div className="df-status-name">
                {form.nom ||
                  'Nouveau dépôt'}
              </div>

              <div className="df-status-type">
                {form.type ===
                'partenaire'
                  ? 'Dépôt partenaire'
                  : 'Dépôt plateforme'}
              </div>

              <div
                style={{
                  marginTop: 12,
                }}
              >
                <span
                  className={`badge ${
                    form.actif
                      ? 'badge-success'
                      : 'badge-error'
                  }`}
                >
                  {form.actif
                    ? 'Actif'
                    : 'Inactif'}
                </span>
              </div>

              <div
                style={{
                  marginTop: 15,
                  textAlign:
                    'left',
                }}
              >
                <label className="df-switch">
                  <input
                    type="checkbox"
                    checked={
                      form.actif
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        'actif',
                        event.target
                          .checked,
                      )
                    }
                  />

                  <span>
                    <strong>
                      Dépôt actif
                    </strong>

                    <small>
                      Désactivez ce dépôt s’il ne doit plus être utilisé opérationnellement.
                    </small>
                  </span>
                </label>
              </div>
            </section>

            {isEditing && (
              <section className="df-card">
                <div className="df-card-head">
                  <small>
                    Stock
                  </small>

                  <h2>
                    Résumé
                  </h2>
                </div>

                <div className="df-summary">
                  <div className="df-summary-card">
                    <span>
                      Lignes
                    </span>

                    <strong>
                      {stocks.length}
                    </strong>
                  </div>

                  <div className="df-summary-card">
                    <span>
                      Stock positif
                    </span>

                    <strong>
                      {
                        positiveStockCount
                      }
                    </strong>
                  </div>

                  <div className="df-summary-card">
                    <span>
                      Physique
                    </span>

                    <strong>
                      {formatNumber(
                        totalPhysical,
                      )}
                    </strong>
                  </div>

                  <div className="df-summary-card">
                    <span>
                      Disponible
                    </span>

                    <strong>
                      {formatNumber(
                        totalAvailable,
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  className="df-help"
                  style={{
                    marginTop: 12,
                  }}
                >
                  Quantité réservée totale :{' '}
                  {formatNumber(
                    totalReserved,
                  )}
                </div>
              </section>
            )}

            {isEditing && (
              <section className="df-card df-danger">
                <div className="df-card-head">
                  <small>
                    Attention
                  </small>

                  <h2>
                    Suppression
                  </h2>
                </div>

                <p>
                  Le backend refuse la suppression si au moins une ligne de stock contient une quantité supérieure à zéro.
                </p>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={
                    handleDelete
                  }
                  style={{
                    width: '100%',
                    color:
                      'var(--color-error)',
                  }}
                >
                  Supprimer le dépôt
                </button>
              </section>
            )}
          </aside>
        </div>
      </form>
    </>
  );
}
