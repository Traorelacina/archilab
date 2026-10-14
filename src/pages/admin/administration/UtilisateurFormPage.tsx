import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminUtilisateursApi,
  type AdminUtilisateur,
  type CreateUtilisateurPayload,
  type RoleBackoffice,
  type UpdateUtilisateurPayload,
} from '../../../api/adminUtilisateurs';

type FormState = {
  name: string;
  email: string;
  telephone: string;
  password: string;
  password_confirmation: string;
  role: RoleBackoffice | '';
  actif: boolean;
};

type ValidationErrors = Record<string, string[]>;

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  telephone: '',
  password: '',
  password_confirmation: '',
  role: '',
  actif: true,
};

const ROLE_OPTIONS: Array<{
  value: RoleBackoffice;
  label: string;
  description: string;
}> = [
  {
    value: 'super_admin',
    label: 'Super administrateur',
    description:
      'Accès complet au back-office et aux fonctions d’administration.',
  },
  {
    value: 'gestionnaire_catalogue',
    label: 'Gestionnaire catalogue',
    description:
      'Gestion des produits, catégories, collections et contenus catalogue.',
  },
  {
    value: 'gestionnaire_stock',
    label: 'Gestionnaire stock',
    description:
      'Gestion des stocks, dépôts et mouvements.',
  },
  {
    value: 'comptable',
    label: 'Comptable',
    description:
      'Accès aux factures, paiements et opérations financières.',
  },
  {
    value: 'commercial',
    label: 'Commercial',
    description:
      'Suivi commercial, clients, commandes et devis.',
  },
];

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

function getValidationErrors(error: unknown): ValidationErrors {
  if (!axios.isAxiosError(error)) return {};

  const errors = error.response?.data?.errors;

  if (!errors || typeof errors !== 'object') return {};

  return errors as ValidationErrors;
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <div className="uf-field-error">{errors[0]}</div>;
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

export default function UtilisateurFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const utilisateurId = id ? Number(id) : null;
  const isEditing =
    utilisateurId !== null && Number.isFinite(utilisateurId);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [utilisateur, setUtilisateur] =
    useState<AdminUtilisateur | null>(null);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] =
    useState<ValidationErrors>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!isEditing || utilisateurId === null) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response =
          await adminUtilisateursApi.utilisateur(utilisateurId);

        if (!mounted) return;

        const user = response.data;
        setUtilisateur(user);

        setForm({
          name: user.name ?? '',
          email: user.email ?? '',
          telephone: user.telephone ?? '',
          password: '',
          password_confirmation: '',
          role:
            (user.roles?.[0]?.name as RoleBackoffice) ?? '',
          actif: user.actif !== false,
        });
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            'Impossible de charger cet utilisateur.',
          ),
        );

        navigate('/admin/administration/utilisateurs', {
          replace: true,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [isEditing, utilisateurId, navigate]);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setValidationErrors((current) => {
      if (!current[field]) return current;

      const next = { ...current };
      delete next[field];

      return next;
    });
  }

  function validateForm(): boolean {
    const errors: ValidationErrors = {};

    if (!form.name.trim()) {
      errors.name = ['Le nom est obligatoire.'];
    }

    if (!isEditing && !form.email.trim()) {
      errors.email = ["L'adresse e-mail est obligatoire."];
    }

    if (!isEditing && !form.password) {
      errors.password = ['Le mot de passe est obligatoire.'];
    }

    if (form.password && form.password.length < 8) {
      errors.password = [
        'Le mot de passe doit contenir au moins 8 caractères.',
      ];
    }

    if (
      form.password &&
      form.password !== form.password_confirmation
    ) {
      errors.password_confirmation = [
        'Les mots de passe ne correspondent pas.',
      ];
    }

    if (!form.role) {
      errors.role = ['Sélectionnez un rôle.'];
    }

    setValidationErrors(errors);

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Vérifiez les champs du formulaire.');
      return;
    }

    setSaving(true);

    try {
      if (isEditing && utilisateurId !== null) {
        const payload: UpdateUtilisateurPayload = {
          name: form.name.trim(),
          telephone: form.telephone.trim() || null,
          role: form.role as RoleBackoffice,
          actif: form.actif,
        };

        if (form.password) {
          payload.password = form.password;
        }

        const response =
          await adminUtilisateursApi.updateUtilisateur(
            utilisateurId,
            payload,
          );

        setUtilisateur(response.data);

        setForm((current) => ({
          ...current,
          password: '',
          password_confirmation: '',
        }));

        toast.success('Utilisateur mis à jour.');
      } else {
        const payload: CreateUtilisateurPayload = {
          name: form.name.trim(),
          email: form.email.trim(),
          telephone: form.telephone.trim() || null,
          password: form.password,
          role: form.role as RoleBackoffice,
        };

        const response =
          await adminUtilisateursApi.createUtilisateur(payload);

        toast.success('Utilisateur créé avec succès.');

        navigate(
          `/admin/administration/utilisateurs/${response.data.id}/modifier`,
          { replace: true },
        );
      }
    } catch (error) {
      setValidationErrors(getValidationErrors(error));

      toast.error(
        getApiErrorMessage(
          error,
          isEditing
            ? 'Impossible de modifier l’utilisateur.'
            : 'Impossible de créer l’utilisateur.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!isEditing || utilisateurId === null) return;

    if (
      !window.confirm(
        `Désactiver le compte de "${form.name}" ?`,
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const response =
        await adminUtilisateursApi.desactiverUtilisateur(
          utilisateurId,
        );

      setForm((current) => ({
        ...current,
        actif: false,
      }));

      setUtilisateur((current) =>
        current
          ? {
              ...current,
              actif: false,
            }
          : current,
      );

      toast.success(
        response.data?.message ?? 'Compte désactivé.',
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de désactiver le compte.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate() {
    if (!isEditing || utilisateurId === null) return;

    setSaving(true);

    try {
      const response =
        await adminUtilisateursApi.updateUtilisateur(
          utilisateurId,
          { actif: true },
        );

      setUtilisateur(response.data);

      setForm((current) => ({
        ...current,
        actif: true,
      }));

      toast.success('Compte réactivé.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de réactiver le compte.',
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
          justifyContent: 'center',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  const selectedRole = ROLE_OPTIONS.find(
    (role) => role.value === form.role,
  );

  return (
    <>
      <style>{`
        .uf-page {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .uf-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }

        .uf-back {
          display: inline-block;
          margin-bottom: 7px;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          text-decoration: none;
        }

        .uf-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .uf-subtitle {
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .uf-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .uf-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 20px;
          align-items: start;
        }

        .uf-main,
        .uf-sidebar {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .uf-sidebar {
          position: sticky;
          top: 18px;
        }

        .uf-card {
          padding: 22px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 14px;
          background: var(--color-blanc);
        }

        .uf-card-head {
          margin-bottom: 19px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.08));
        }

        .uf-card-head small {
          display: block;
          margin-bottom: 5px;
          color: var(--color-terra);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .10em;
          text-transform: uppercase;
        }

        .uf-card-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 760;
        }

        .uf-card-head p {
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        .uf-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px 18px;
        }

        .uf-field {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .uf-field--full {
          grid-column: 1 / -1;
        }

        .uf-field .form-label {
          margin-bottom: 6px;
          font-size: 11.5px;
          font-weight: 720;
        }

        .uf-required {
          margin-left: 2px;
          color: var(--color-error);
        }

        .uf-help {
          margin-top: 6px;
          color: var(--color-gris-moyen);
          font-size: 10px;
          line-height: 1.45;
        }

        .uf-field-error {
          margin-top: 6px;
          color: var(--color-error);
          font-size: 10.5px;
          font-weight: 650;
        }

        .uf-role-box {
          margin-top: 11px;
          padding: 12px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
        }

        .uf-role-box strong {
          display: block;
          font-size: 11px;
        }

        .uf-role-box p {
          margin: 4px 0 0;
          color: var(--color-gris-moyen);
          font-size: 10px;
          line-height: 1.5;
        }

        .uf-password-wrap {
          position: relative;
        }

        .uf-password-wrap .form-input {
          padding-right: 62px;
        }

        .uf-password-toggle {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          color: var(--color-gris-moyen);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .uf-profile {
          text-align: center;
        }

        .uf-avatar {
          width: 68px;
          height: 68px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 18px;
          background: linear-gradient(145deg, var(--color-ivoire-dark), var(--color-ivoire));
          color: var(--color-terra);
          font-size: 18px;
          font-weight: 850;
        }

        .uf-profile-name {
          font-size: 13px;
          font-weight: 760;
        }

        .uf-profile-email {
          margin-top: 3px;
          color: var(--color-gris-moyen);
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        .uf-status-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 17px;
          padding-top: 14px;
          border-top: 1px solid var(--color-border, rgba(0,0,0,.08));
        }

        .uf-status-line > span:first-child {
          color: var(--color-gris-moyen);
          font-size: 10.5px;
        }

        .uf-switch {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
          cursor: pointer;
        }

        .uf-switch input {
          margin-top: 2px;
          accent-color: var(--color-terra);
        }

        .uf-switch strong {
          display: block;
          font-size: 11.5px;
        }

        .uf-switch small {
          display: block;
          margin-top: 2px;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          line-height: 1.45;
        }

        .uf-danger {
          border-color: rgba(190,40,40,.16);
        }

        .uf-danger p {
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        @media (max-width: 900px) {
          .uf-layout {
            grid-template-columns: 1fr;
          }

          .uf-sidebar {
            position: static;
          }
        }

        @media (max-width: 620px) {
          .uf-grid {
            grid-template-columns: 1fr;
          }

          .uf-field--full {
            grid-column: 1;
          }

          .uf-actions {
            width: 100%;
          }

          .uf-actions .btn {
            flex: 1;
          }
        }
      `}</style>

      <form onSubmit={handleSubmit} className="uf-page">
        <header className="uf-header">
          <div>
            <Link to="/admin/administration/utilisateurs" className="uf-back">
              ← Retour aux utilisateurs
            </Link>

            <h1 className="uf-title">
              {isEditing ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}
            </h1>

            <p className="uf-subtitle">
              {isEditing
                ? 'Mettez à jour les informations, le rôle ou les accès de ce compte.'
                : 'Créez un compte sécurisé et attribuez-lui le rôle adapté à ses responsabilités.'}
            </p>
          </div>

          <div className="uf-actions">
            <Link to="/admin/administration/utilisateurs" className="btn btn-secondary">
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
                  : 'Créer l’utilisateur'}
            </button>
          </div>
        </header>

        <div className="uf-layout">
          <main className="uf-main">
            <section className="uf-card">
              <div className="uf-card-head">
                <small>Identité</small>
                <h2>Informations du compte</h2>
                <p>
                  Renseignez les coordonnées utilisées pour identifier
                  l’utilisateur dans le back-office.
                </p>
              </div>

              <div className="uf-grid">
                <div className="uf-field uf-field--full">
                  <label className="form-label" htmlFor="user-name">
                    Nom complet
                    <span className="uf-required">*</span>
                  </label>

                  <input
                    id="user-name"
                    className="form-input"
                    maxLength={255}
                    required
                    value={form.name}
                    onChange={(event) =>
                      updateField('name', event.target.value)
                    }
                    placeholder="Ex. Awa Kouassi"
                  />

                  <FieldError errors={validationErrors.name} />
                </div>

                <div className="uf-field">
                  <label className="form-label" htmlFor="user-email">
                    Adresse e-mail
                    {!isEditing && (
                      <span className="uf-required">*</span>
                    )}
                  </label>

                  <input
                    id="user-email"
                    type="email"
                    className="form-input"
                    required={!isEditing}
                    disabled={isEditing}
                    value={form.email}
                    onChange={(event) =>
                      updateField('email', event.target.value)
                    }
                    placeholder="nom@entreprise.com"
                  />

                  <div className="uf-help">
                    {isEditing
                      ? "L'e-mail n'est pas modifiable par le contrôleur actuel."
                      : 'Cette adresse servira à identifier le compte.'}
                  </div>

                  <FieldError errors={validationErrors.email} />
                </div>

                <div className="uf-field">
                  <label className="form-label" htmlFor="user-phone">
                    Téléphone
                  </label>

                  <input
                    id="user-phone"
                    className="form-input"
                    maxLength={30}
                    value={form.telephone}
                    onChange={(event) =>
                      updateField('telephone', event.target.value)
                    }
                    placeholder="+225 07 00 00 00 00"
                  />

                  <FieldError errors={validationErrors.telephone} />
                </div>
              </div>
            </section>

            <section className="uf-card">
              <div className="uf-card-head">
                <small>Sécurité</small>
                <h2>Mot de passe</h2>
                <p>
                  {isEditing
                    ? 'Laissez les champs vides pour conserver le mot de passe actuel.'
                    : 'Définissez un mot de passe contenant au moins 8 caractères.'}
                </p>
              </div>

              <div className="uf-grid">
                <div className="uf-field">
                  <label className="form-label" htmlFor="user-password">
                    Mot de passe
                    {!isEditing && (
                      <span className="uf-required">*</span>
                    )}
                  </label>

                  <div className="uf-password-wrap">
                    <input
                      id="user-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      minLength={8}
                      required={!isEditing}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) =>
                        updateField('password', event.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="uf-password-toggle"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                    >
                      {showPassword ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>

                  <FieldError errors={validationErrors.password} />
                </div>

                <div className="uf-field">
                  <label
                    className="form-label"
                    htmlFor="user-password-confirm"
                  >
                    Confirmer le mot de passe
                  </label>

                  <input
                    id="user-password-confirm"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={(event) =>
                      updateField(
                        'password_confirmation',
                        event.target.value,
                      )
                    }
                  />

                  <FieldError
                    errors={validationErrors.password_confirmation}
                  />
                </div>
              </div>
            </section>

            <section className="uf-card">
              <div className="uf-card-head">
                <small>Permissions</small>
                <h2>Rôle back-office</h2>
                <p>
                  Le rôle détermine le niveau d’accès et les responsabilités
                  attribuées au compte.
                </p>
              </div>

              <div className="uf-field">
                <label className="form-label" htmlFor="user-role">
                  Rôle
                  <span className="uf-required">*</span>
                </label>

                <select
                  id="user-role"
                  className="form-input"
                  required
                  value={form.role}
                  onChange={(event) =>
                    updateField(
                      'role',
                      event.target.value as RoleBackoffice | '',
                    )
                  }
                >
                  <option value="">Sélectionner un rôle</option>

                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>

                <FieldError errors={validationErrors.role} />

                {selectedRole && (
                  <div className="uf-role-box">
                    <strong>{selectedRole.label}</strong>
                    <p>{selectedRole.description}</p>
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="uf-sidebar">
            <section className="uf-card uf-profile">
              <div className="uf-avatar">{initials(form.name)}</div>

              <div className="uf-profile-name">
                {form.name || 'Nouvel utilisateur'}
              </div>

              <div className="uf-profile-email">
                {form.email || 'Adresse e-mail non renseignée'}
              </div>

              <div className="uf-status-line">
                <span>Statut du compte</span>

                <span
                  className={`badge ${
                    form.actif ? 'badge-success' : 'badge-error'
                  }`}
                >
                  {form.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </section>

            {isEditing && (
              <section className="uf-card">
                <div className="uf-card-head">
                  <small>Accès</small>
                  <h2>État du compte</h2>
                </div>

                <label className="uf-switch">
                  <input
                    type="checkbox"
                    checked={form.actif}
                    onChange={(event) =>
                      updateField('actif', event.target.checked)
                    }
                  />

                  <span>
                    <strong>Compte actif</strong>
                    <small>
                      Un compte inactif ne doit plus être utilisé pour
                      accéder au back-office.
                    </small>
                  </span>
                </label>
              </section>
            )}

            {isEditing && (
              <section className="uf-card uf-danger">
                <div className="uf-card-head">
                  <small>Attention</small>
                  <h2>Désactivation</h2>
                </div>

                <p>
                  La désactivation met le compte à l’état inactif et
                  supprime ses tokens d’accès. Le backend interdit de
                  désactiver votre propre compte.
                </p>

                {form.actif ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={saving}
                    onClick={handleDeactivate}
                    style={{
                      width: '100%',
                      color: 'var(--color-error)',
                    }}
                  >
                    Désactiver le compte
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={handleReactivate}
                    style={{ width: '100%' }}
                  >
                    Réactiver le compte
                  </button>
                )}
              </section>
            )}
          </aside>
        </div>
      </form>
    </>
  );
}
