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
  adminClientsApi,
  type AdminClient,
  type ClientPayload,
  type ClientType,
  type UpdateClientPayload,
} from '../../../api/adminClients';

type FormState = {
  type: ClientType;
  nom: string;
  prenoms: string;
  raison_sociale: string;
  ncc: string;
  telephone: string;
  email: string;
  ville: string;
  adresse_livraison: string;
  adresse_facturation: string;
};

type ValidationErrors =
  Record<
    string,
    string[]
  >;

const INITIAL_FORM: FormState = {
  type: 'particulier',
  nom: '',
  prenoms: '',
  raison_sociale: '',
  ncc: '',
  telephone: '',
  email: '',
  ville: '',
  adresse_livraison: '',
  adresse_facturation: '',
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
    const first =
      Object.values(data.errors)
        .flat()
        .find(Boolean);

    if (
      typeof first === 'string'
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

function FieldError({
  errors,
}: {
  errors?: string[];
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <div className="cf-field-error">
      {errors[0]}
    </div>
  );
}

function formatMoney(
  value?: number | null,
): string {
  const amount =
    Number(value ?? 0);

  return `${new Intl.NumberFormat(
    'fr-FR',
  ).format(amount)} FCFA`;
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'fr-FR',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date);
}

function statusLabel(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const labels:
    Record<
      string,
      string
    > = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    refuse: 'Refusé',
    expire: 'Expiré',
    converti: 'Converti',
    en_attente: 'En attente',
    confirme: 'Confirmée',
    paye: 'Payée',
    annule: 'Annulée',
    livre: 'Livrée',
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

function statusClass(
  value?: string | null,
): string {
  switch (value) {
    case 'accepte':
    case 'converti':
    case 'confirme':
    case 'paye':
    case 'livre':
      return 'badge-success';

    case 'refuse':
    case 'expire':
    case 'annule':
      return 'badge-error';

    case 'envoye':
    case 'en_attente':
      return 'badge-info';

    default:
      return 'badge-neutral';
  }
}

function initials(
  form: FormState,
): string {
  const value =
    form.type ===
      'professionnel' &&
    form.raison_sociale.trim()
      ? form.raison_sociale
      : [
          form.prenoms,
          form.nom,
        ]
          .filter(Boolean)
          .join(' ');

  if (!value.trim()) {
    return '?';
  }

  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase(),
    )
    .join('');
}

export default function ClientFormPage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate =
    useNavigate();

  const clientId =
    id ? Number(id) : null;

  const isEditing =
    clientId !== null &&
    Number.isFinite(
      clientId,
    );

  const [form, setForm] =
    useState<FormState>(
      INITIAL_FORM,
    );

  const [client, setClient] =
    useState<AdminClient | null>(
      null,
    );

  const [loading, setLoading] =
    useState(isEditing);

  const [saving, setSaving] =
    useState(false);

  const [
    validationErrors,
    setValidationErrors,
  ] =
    useState<ValidationErrors>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (
        !isEditing ||
        clientId === null
      ) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response =
          await adminClientsApi.client(
            clientId,
          );

        if (!mounted) {
          return;
        }

        const loaded =
          response.data;

        setClient(loaded);

        setForm({
          type:
            loaded.type ??
            'particulier',
          nom:
            loaded.nom ?? '',
          prenoms:
            loaded.prenoms ??
            '',
          raison_sociale:
            loaded.raison_sociale ??
            '',
          ncc:
            loaded.ncc ?? '',
          telephone:
            loaded.telephone ??
            '',
          email:
            loaded.email ?? '',
          ville:
            loaded.ville ?? '',
          adresse_livraison:
            loaded.adresse_livraison ??
            '',
          adresse_facturation:
            loaded.adresse_facturation ??
            '',
        });
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            'Impossible de charger ce client.',
          ),
        );

        navigate(
          '/admin/ventes/clients',
          {
            replace: true,
          },
        );
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
    clientId,
    navigate,
  ]);

  const commandes =
    useMemo(
      () =>
        Array.isArray(
          client?.commandes,
        )
          ? client!.commandes!
          : [],
      [client],
    );

  const devis =
    useMemo(
      () =>
        Array.isArray(
          client?.devis,
        )
          ? client!.devis!
          : [],
      [client],
    );

  const deleteBlocked =
    commandes.length > 0;

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
    type: ClientType,
  ) {
    setForm(
      (current) => ({
        ...current,
        type,
      }),
    );

    setValidationErrors(
      (current) => {
        const next = {
          ...current,
        };

        delete next.type;

        return next;
      },
    );
  }

  function buildPayload():
    | ClientPayload
    | null {
    const errors:
      ValidationErrors = {};

    if (!form.nom.trim()) {
      errors.nom = [
        form.type ===
        'professionnel'
          ? 'Le nom du contact est obligatoire.'
          : 'Le nom est obligatoire.',
      ];
    }

    if (
      !form.telephone.trim()
    ) {
      errors.telephone = [
        'Le téléphone est obligatoire.',
      ];
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim(),
      )
    ) {
      errors.email = [
        'Saisissez une adresse e-mail valide.',
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

    return {
      type:
        form.type,
      nom:
        form.nom.trim(),
      prenoms:
        form.prenoms.trim() ||
        null,
      raison_sociale:
        form.type ===
        'professionnel'
          ? form.raison_sociale.trim() ||
            null
          : null,
      ncc:
        form.type ===
        'professionnel'
          ? form.ncc.trim() ||
            null
          : null,
      telephone:
        form.telephone.trim(),
      email:
        form.email.trim() ||
        null,
      ville:
        form.ville.trim() ||
        null,
      adresse_livraison:
        form.adresse_livraison.trim() ||
        null,
      adresse_facturation:
        form.adresse_facturation.trim() ||
        null,
    };
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const payload =
      buildPayload();

    if (!payload) {
      toast.error(
        'Vérifiez les informations du client.',
      );

      return;
    }

    setSaving(true);

    try {
      if (
        isEditing &&
        clientId !== null
      ) {
        const response =
          await adminClientsApi.updateClient(
            clientId,
            payload as UpdateClientPayload,
          );

        setClient(
          (current) => ({
            ...(current ??
              ({} as AdminClient)),
            ...response.data,
            commandes:
              current?.commandes ??
              [],
            devis:
              current?.devis ??
              [],
          }),
        );

        toast.success(
          'Client mis à jour.',
        );
      } else {
        const response =
          await adminClientsApi.createClient(
            payload,
          );

        toast.success(
          'Client créé avec succès.',
        );

        navigate(
          `/admin/ventes/clients/${response.data.id}/modifier`,
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
            ? 'Impossible de modifier le client.'
            : 'Impossible de créer le client.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !isEditing ||
      clientId === null
    ) {
      return;
    }

    if (
      !window.confirm(
        `Supprimer le client "${form.type === 'professionnel' && form.raison_sociale
          ? form.raison_sociale
          : [form.prenoms, form.nom].filter(Boolean).join(' ')}" ?`,
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const response =
        await adminClientsApi.deleteClient(
          clientId,
        );

      toast.success(
        response.data
          ?.message ??
          'Client supprimé.',
      );

      navigate(
        '/admin/ventes/clients',
        {
          replace: true,
        },
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de supprimer le client.',
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
          alignItems: 'center',
          justifyContent:
            'center',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  const displayTitle =
    form.type ===
      'professionnel' &&
    form.raison_sociale.trim()
      ? form.raison_sociale
      : [
          form.prenoms,
          form.nom,
        ]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        'Nouveau client';

  return (
    <>
      <style>{`
        .cf-page {
          max-width: 1320px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .cf-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }

        .cf-back {
          display: inline-block;
          margin-bottom: 7px;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          text-decoration: none;
        }

        .cf-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .cf-subtitle {
          max-width: 730px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .cf-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cf-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            320px;
          gap: 20px;
          align-items: start;
        }

        .cf-main,
        .cf-sidebar {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .cf-sidebar {
          position: sticky;
          top: 18px;
        }

        .cf-card {
          padding: 22px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 14px;
          background: var(--color-blanc);
        }

        .cf-card-head {
          margin-bottom: 19px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.08));
        }

        .cf-card-head small {
          display: block;
          margin-bottom: 5px;
          color: var(--color-terra);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .10em;
          text-transform: uppercase;
        }

        .cf-card-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 760;
        }

        .cf-card-head p {
          max-width: 700px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        .cf-type-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .cf-type-option {
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

        .cf-type-option.is-active {
          border-color: var(--color-terra);
          background: rgba(196,98,58,.045);
        }

        .cf-type-option input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .cf-type-option strong {
          display: block;
          font-size: 11.5px;
          font-weight: 760;
        }

        .cf-type-option span {
          display: block;
          margin-top: 4px;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          line-height: 1.45;
        }

        .cf-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px 18px;
        }

        .cf-field {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .cf-field--full {
          grid-column: 1 / -1;
        }

        .cf-field .form-label {
          margin-bottom: 6px;
          font-size: 11.5px;
          font-weight: 720;
        }

        .cf-required {
          margin-left: 2px;
          color: var(--color-error);
        }

        .cf-help {
          margin-top: 6px;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          line-height: 1.45;
        }

        .cf-field-error {
          margin-top: 6px;
          color: var(--color-error);
          font-size: 10.5px;
          font-weight: 650;
        }

        .cf-textarea {
          min-height: 108px;
          resize: vertical;
          line-height: 1.55;
        }

        .cf-profile {
          text-align: center;
        }

        .cf-avatar {
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
          font-size: 18px;
          font-weight: 850;
        }

        .cf-profile-name {
          font-size: 13px;
          font-weight: 760;
          overflow-wrap: anywhere;
        }

        .cf-profile-contact {
          margin-top: 4px;
          color: var(--color-gris-moyen);
          font-size: 10px;
        }

        .cf-profile-badge {
          margin-top: 12px;
        }

        .cf-summary {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .cf-summary-card {
          padding: 11px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
        }

        .cf-summary-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .cf-summary-card strong {
          display: block;
          margin-top: 4px;
          font-size: 15px;
          font-weight: 780;
        }

        .cf-history {
          overflow-x: auto;
        }

        .cf-history-title {
          min-width: 180px;
        }

        .cf-history-title strong {
          display: block;
          font-size: 11px;
          font-weight: 720;
        }

        .cf-history-title span {
          display: block;
          margin-top: 3px;
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .cf-money {
          white-space: nowrap;
          font-weight: 700;
          font-size: 10.5px;
        }

        .cf-danger {
          border-color: rgba(190,40,40,.16);
        }

        .cf-danger p {
          margin: 0 0 13px;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        @media (max-width: 900px) {
          .cf-layout {
            grid-template-columns: 1fr;
          }

          .cf-sidebar {
            position: static;
          }
        }

        @media (max-width: 620px) {
          .cf-grid,
          .cf-type-grid {
            grid-template-columns: 1fr;
          }

          .cf-field--full {
            grid-column: 1;
          }

          .cf-actions {
            width: 100%;
          }

          .cf-actions .btn {
            flex: 1;
          }
        }
      `}</style>

      <form
        className="cf-page"
        onSubmit={handleSubmit}
      >
        <header className="cf-header">
          <div>
            <Link
              to="/admin/ventes/clients"
              className="cf-back"
            >
              ← Retour aux clients
            </Link>

            <h1 className="cf-title">
              {isEditing
                ? 'Modifier le client'
                : 'Nouveau client'}
            </h1>

            <p className="cf-subtitle">
              {isEditing
                ? 'Mettez à jour les coordonnées et consultez les dernières commandes et devis associés à ce client.'
                : 'Créez un client comptoir particulier ou professionnel sans nécessiter de compte en ligne.'}
            </p>
          </div>

          <div className="cf-actions">
            <Link
              to="/admin/ventes/clients"
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
                  : 'Créer le client'}
            </button>
          </div>
        </header>

        <div className="cf-layout">
          <main className="cf-main">
            <section className="cf-card">
              <div className="cf-card-head">
                <small>
                  Profil client
                </small>

                <h2>
                  Type et identité
                </h2>

                <p>
                  Le type permet de distinguer les clients particuliers des entreprises et autres organisations.
                </p>
              </div>

              <div className="cf-field cf-field--full">
                <label className="form-label">
                  Type de client
                  <span className="cf-required">
                    *
                  </span>
                </label>

                <div className="cf-type-grid">
                  <label
                    className={`cf-type-option ${
                      form.type ===
                      'particulier'
                        ? 'is-active'
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="client-type"
                      value="particulier"
                      checked={
                        form.type ===
                        'particulier'
                      }
                      onChange={() =>
                        handleTypeChange(
                          'particulier',
                        )
                      }
                    />

                    <strong>
                      Particulier
                    </strong>

                    <span>
                      Client personne physique pour une vente directe ou une commande personnelle.
                    </span>
                  </label>

                  <label
                    className={`cf-type-option ${
                      form.type ===
                      'professionnel'
                        ? 'is-active'
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="client-type"
                      value="professionnel"
                      checked={
                        form.type ===
                        'professionnel'
                      }
                      onChange={() =>
                        handleTypeChange(
                          'professionnel',
                        )
                      }
                    />

                    <strong>
                      Professionnel
                    </strong>

                    <span>
                      Entreprise, institution ou organisation avec raison sociale et NCC éventuel.
                    </span>
                  </label>
                </div>

                <FieldError
                  errors={
                    validationErrors.type
                  }
                />
              </div>

              <div
                className="cf-grid"
                style={{
                  marginTop: 18,
                }}
              >
                <div className="cf-field">
                  <label
                    className="form-label"
                    htmlFor="client-nom"
                  >
                    {form.type ===
                    'professionnel'
                      ? 'Nom du contact'
                      : 'Nom'}
                    <span className="cf-required">
                      *
                    </span>
                  </label>

                  <input
                    id="client-nom"
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
                    placeholder={
                      form.type ===
                      'professionnel'
                        ? 'Ex. Kouassi'
                        : 'Ex. Kouassi'
                    }
                  />

                  <FieldError
                    errors={
                      validationErrors.nom
                    }
                  />
                </div>

                <div className="cf-field">
                  <label
                    className="form-label"
                    htmlFor="client-prenoms"
                  >
                    {form.type ===
                    'professionnel'
                      ? 'Prénoms du contact'
                      : 'Prénoms'}
                  </label>

                  <input
                    id="client-prenoms"
                    className="form-input"
                    maxLength={255}
                    value={
                      form.prenoms
                    }
                    onChange={(event) =>
                      updateField(
                        'prenoms',
                        event.target.value,
                      )
                    }
                    placeholder="Ex. Awa Marie"
                  />

                  <FieldError
                    errors={
                      validationErrors.prenoms
                    }
                  />
                </div>

                {form.type ===
                  'professionnel' && (
                  <>
                    <div className="cf-field">
                      <label
                        className="form-label"
                        htmlFor="client-raison"
                      >
                        Raison sociale
                      </label>

                      <input
                        id="client-raison"
                        className="form-input"
                        maxLength={255}
                        value={
                          form.raison_sociale
                        }
                        onChange={(event) =>
                          updateField(
                            'raison_sociale',
                            event.target.value,
                          )
                        }
                        placeholder="Ex. ABC Industries SARL"
                      />

                      <FieldError
                        errors={
                          validationErrors.raison_sociale
                        }
                      />
                    </div>

                    <div className="cf-field">
                      <label
                        className="form-label"
                        htmlFor="client-ncc"
                      >
                        NCC
                      </label>

                      <input
                        id="client-ncc"
                        className="form-input"
                        maxLength={50}
                        value={
                          form.ncc
                        }
                        onChange={(event) =>
                          updateField(
                            'ncc',
                            event.target.value,
                          )
                        }
                        placeholder="Numéro de compte contribuable"
                      />

                      <FieldError
                        errors={
                          validationErrors.ncc
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="cf-card">
              <div className="cf-card-head">
                <small>
                  Coordonnées
                </small>

                <h2>
                  Contact
                </h2>

                <p>
                  Le numéro de téléphone est obligatoire. L’e-mail et la ville restent facultatifs.
                </p>
              </div>

              <div className="cf-grid">
                <div className="cf-field">
                  <label
                    className="form-label"
                    htmlFor="client-phone"
                  >
                    Téléphone
                    <span className="cf-required">
                      *
                    </span>
                  </label>

                  <input
                    id="client-phone"
                    className="form-input"
                    maxLength={30}
                    required
                    value={
                      form.telephone
                    }
                    onChange={(event) =>
                      updateField(
                        'telephone',
                        event.target.value,
                      )
                    }
                    placeholder="+225 07 00 00 00 00"
                  />

                  <FieldError
                    errors={
                      validationErrors.telephone
                    }
                  />
                </div>

                <div className="cf-field">
                  <label
                    className="form-label"
                    htmlFor="client-email"
                  >
                    E-mail
                  </label>

                  <input
                    id="client-email"
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        'email',
                        event.target.value,
                      )
                    }
                    placeholder="client@exemple.com"
                  />

                  <FieldError
                    errors={
                      validationErrors.email
                    }
                  />
                </div>

                <div className="cf-field cf-field--full">
                  <label
                    className="form-label"
                    htmlFor="client-ville"
                  >
                    Ville
                  </label>

                  <input
                    id="client-ville"
                    className="form-input"
                    maxLength={100}
                    value={form.ville}
                    onChange={(event) =>
                      updateField(
                        'ville',
                        event.target.value,
                      )
                    }
                    placeholder="Ex. Abidjan"
                  />

                  <FieldError
                    errors={
                      validationErrors.ville
                    }
                  />
                </div>
              </div>
            </section>

            <section className="cf-card">
              <div className="cf-card-head">
                <small>
                  Adresses
                </small>

                <h2>
                  Livraison et facturation
                </h2>

                <p>
                  Vous pouvez utiliser des adresses différentes pour la livraison et la facturation.
                </p>
              </div>

              <div className="cf-grid">
                <div className="cf-field">
                  <label
                    className="form-label"
                    htmlFor="client-delivery"
                  >
                    Adresse de livraison
                  </label>

                  <textarea
                    id="client-delivery"
                    className="form-input cf-textarea"
                    value={
                      form.adresse_livraison
                    }
                    onChange={(event) =>
                      updateField(
                        'adresse_livraison',
                        event.target.value,
                      )
                    }
                    placeholder="Quartier, rue, repère, immeuble..."
                  />

                  <FieldError
                    errors={
                      validationErrors.adresse_livraison
                    }
                  />
                </div>

                <div className="cf-field">
                  <label
                    className="form-label"
                    htmlFor="client-billing"
                  >
                    Adresse de facturation
                  </label>

                  <textarea
                    id="client-billing"
                    className="form-input cf-textarea"
                    value={
                      form.adresse_facturation
                    }
                    onChange={(event) =>
                      updateField(
                        'adresse_facturation',
                        event.target.value,
                      )
                    }
                    placeholder="Adresse à faire apparaître sur les documents commerciaux..."
                  />

                  <FieldError
                    errors={
                      validationErrors.adresse_facturation
                    }
                  />
                </div>
              </div>
            </section>

            {isEditing && (
              <section className="cf-card">
                <div className="cf-card-head">
                  <small>
                    Historique
                  </small>

                  <h2>
                    Dernières commandes
                  </h2>

                  <p>
                    Le backend retourne les 10 commandes les plus récentes de ce client.
                  </p>
                </div>

                {commandes.length ===
                0 ? (
                  <div
                    className="empty-state"
                    style={{
                      padding:
                        '36px 15px',
                    }}
                  >
                    <h3>
                      Aucune commande
                    </h3>

                    <p>
                      Ce client ne possède aucune commande dans l’historique chargé.
                    </p>
                  </div>
                ) : (
                  <div className="cf-history">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>
                            Commande
                          </th>
                          <th>
                            Statut
                          </th>
                          <th>
                            Montant
                          </th>
                          <th>
                            Date
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {commandes.map(
                          (
                            commande,
                          ) => (
                            <tr
                              key={
                                commande.id
                              }
                            >
                              <td>
                                <div className="cf-history-title">
                                  <strong>
                                    {commande.numero ??
                                      `Commande #${commande.id}`}
                                  </strong>
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`badge ${statusClass(
                                    commande.statut,
                                  )}`}
                                >
                                  {statusLabel(
                                    commande.statut,
                                  )}
                                </span>
                              </td>

                              <td>
                                <span className="cf-money">
                                  {formatMoney(
                                    commande.montant_ttc,
                                  )}
                                </span>
                              </td>

                              <td>
                                {formatDate(
                                  commande.created_at,
                                )}
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

            {isEditing && (
              <section className="cf-card">
                <div className="cf-card-head">
                  <small>
                    Historique commercial
                  </small>

                  <h2>
                    Derniers devis
                  </h2>

                  <p>
                    Le backend retourne les 10 devis les plus récents du client.
                  </p>
                </div>

                {devis.length ===
                0 ? (
                  <div
                    className="empty-state"
                    style={{
                      padding:
                        '36px 15px',
                    }}
                  >
                    <h3>
                      Aucun devis
                    </h3>

                    <p>
                      Aucun devis n’est actuellement associé à ce client.
                    </p>
                  </div>
                ) : (
                  <div className="cf-history">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>
                            Devis
                          </th>
                          <th>
                            Statut
                          </th>
                          <th>
                            Montant
                          </th>
                          <th>
                            Date
                          </th>
                          <th
                            style={{
                              textAlign:
                                'right',
                            }}
                          >
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {devis.map(
                          (item) => (
                            <tr
                              key={
                                item.id
                              }
                            >
                              <td>
                                <div className="cf-history-title">
                                  <strong>
                                    {item.numero ??
                                      `Devis #${item.id}`}
                                  </strong>
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`badge ${statusClass(
                                    item.statut,
                                  )}`}
                                >
                                  {statusLabel(
                                    item.statut,
                                  )}
                                </span>
                              </td>

                              <td>
                                <span className="cf-money">
                                  {formatMoney(
                                    item.montant_ttc,
                                  )}
                                </span>
                              </td>

                              <td>
                                {formatDate(
                                  item.created_at,
                                )}
                              </td>

                              <td
                                style={{
                                  textAlign:
                                    'right',
                                }}
                              >
                                <Link
                                  to={`/admin/ventes/devis/${item.id}/modifier`}
                                  className="btn btn-ghost btn-sm"
                                >
                                  Voir
                                </Link>
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

          <aside className="cf-sidebar">
            <section className="cf-card cf-profile">
              <div className="cf-avatar">
                {initials(
                  form,
                )}
              </div>

              <div className="cf-profile-name">
                {displayTitle}
              </div>

              <div className="cf-profile-contact">
                {form.telephone ||
                  'Téléphone non renseigné'}
              </div>

              <div className="cf-profile-badge">
                <span
                  className={`badge ${
                    form.type ===
                    'professionnel'
                      ? 'badge-info'
                      : 'badge-neutral'
                  }`}
                >
                  {form.type ===
                  'professionnel'
                    ? 'Professionnel'
                    : 'Particulier'}
                </span>
              </div>
            </section>

            {isEditing && (
              <section className="cf-card">
                <div className="cf-card-head">
                  <small>
                    Activité
                  </small>

                  <h2>
                    Résumé
                  </h2>
                </div>

                <div className="cf-summary">
                  <div className="cf-summary-card">
                    <span>
                      Commandes
                    </span>

                    <strong>
                      {commandes.length}
                    </strong>
                  </div>

                  <div className="cf-summary-card">
                    <span>
                      Devis
                    </span>

                    <strong>
                      {devis.length}
                    </strong>
                  </div>
                </div>

                <div
                  className="cf-help"
                  style={{
                    marginTop: 11,
                  }}
                >
                  Le détail affiche au maximum les 10 dernières commandes et les 10 derniers devis.
                </div>
              </section>
            )}

            {isEditing && (
              <section className="cf-card cf-danger">
                <div className="cf-card-head">
                  <small>
                    Attention
                  </small>

                  <h2>
                    Suppression
                  </h2>
                </div>

                <p>
                  {deleteBlocked
                    ? 'Ce client possède au moins une commande et ne peut donc pas être supprimé par le backend.'
                    : 'La suppression sera refusée automatiquement par le backend si une commande existe pour ce client.'}
                </p>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={
                    saving ||
                    deleteBlocked
                  }
                  onClick={
                    handleDelete
                  }
                  style={{
                    width: '100%',
                    color:
                      'var(--color-error)',
                  }}
                >
                  Supprimer le client
                </button>
              </section>
            )}
          </aside>
        </div>
      </form>
    </>
  );
}
