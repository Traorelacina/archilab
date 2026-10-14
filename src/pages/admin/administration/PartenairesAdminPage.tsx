import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminApi,
  type AdminPartenaire,
  type AdminPartenairePayload,
} from '../../../api/admin';
import { IconEdit, IconPlus, IconSearch } from '../../../components/ui/Icons';

type PartenaireForm = AdminPartenairePayload & {
  id?: number;
  statut: AdminPartenaire['statut'];
  image_url?: string | null;
};

const INITIAL_FORM: PartenaireForm = {
  raison_sociale: '',
  contact_nom: '',
  telephone: '',
  email: '',
  taux_commission: 15,
  mode_reversement: 'bimensuel',
  mode_versement: 'mobile_money',
  ncc: '',
  rccm: '',
  adresse: '',
  rib: '',
  numero_mobile_money: '',
  notes: '',
  statut: 'actif',
};

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

function formFromPartenaire(partenaire: AdminPartenaire): PartenaireForm {
  return {
    id: partenaire.id,
    raison_sociale: partenaire.raison_sociale,
    contact_nom: partenaire.contact_nom ?? '',
    telephone: partenaire.telephone,
    email: partenaire.email ?? '',
    taux_commission: partenaire.taux_commission,
    mode_reversement: partenaire.mode_reversement,
    mode_versement: partenaire.mode_versement,
    ncc: partenaire.ncc ?? '',
    rccm: partenaire.rccm ?? '',
    adresse: partenaire.adresse ?? '',
    rib: partenaire.rib ?? '',
    numero_mobile_money: partenaire.numero_mobile_money ?? '',
    notes: partenaire.notes ?? '',
    statut: partenaire.statut,
    image_url: partenaire.image_url,
  };
}

function payloadFromForm(form: PartenaireForm): AdminPartenairePayload {
  return {
    raison_sociale: form.raison_sociale.trim(),
    contact_nom: form.contact_nom?.trim() || null,
    telephone: form.telephone.trim(),
    email: form.email.trim(),
    taux_commission: Number(form.taux_commission),
    mode_reversement: form.mode_reversement,
    mode_versement: form.mode_versement,
    ncc: form.ncc?.trim() || null,
    rccm: form.rccm?.trim() || null,
    adresse: form.adresse?.trim() || null,
    rib: form.rib?.trim() || null,
    numero_mobile_money: form.numero_mobile_money?.trim() || null,
    notes: form.notes?.trim() || null,
  };
}

export default function PartenairesAdminPage() {
  const [partenaires, setPartenaires] = useState<AdminPartenaire[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<PartenaireForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const imagePreviewObjectUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (imagePreviewObjectUrl.current) URL.revokeObjectURL(imagePreviewObjectUrl.current);
  }, []);

  const clearImageSelection = () => {
    if (imagePreviewObjectUrl.current) {
      URL.revokeObjectURL(imagePreviewObjectUrl.current);
      imagePreviewObjectUrl.current = null;
    }
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  };

  const closeModal = () => {
    if (saving) return;
    clearImageSelection();
    setModal(null);
  };

  const doFetch = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await adminApi.partenaires({
        per_page: 100,
        recherche: q.trim() || undefined,
      });
      setPartenaires(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      const message = apiErrorMessage(error, 'Impossible de charger les partenaires.');
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void doFetch();
  }, [doFetch]);

  const updateForm = <K extends keyof PartenaireForm>(
    key: K,
    value: PartenaireForm[K],
  ) => {
    setModal((current) => current ? { ...current, [key]: value } : current);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;

    const payload = payloadFromForm(modal);
    setSaving(true);
    try {
      if (modal.id) {
        const response = await adminApi.updatePartenaire(
          modal.id,
          {
            ...payload,
            statut: modal.statut,
            ...(removeImage && !imageFile ? { supprimer_image: true } : {}),
          },
          imageFile ?? undefined,
        );
        setPartenaires((current) =>
          current.map((partenaire) =>
            partenaire.id === response.data.id ? response.data : partenaire,
          ),
        );
        toast.success('Partenaire mis à jour.');
      } else {
        const response = await adminApi.createPartenaire(payload, imageFile ?? undefined);
        toast.success(
          `${response.data.message} Mot de passe provisoire : ${response.data.mot_de_passe_provisoire}`,
        );
        await doFetch();
      }
      clearImageSelection();
      setModal(null);
    } catch (error) {
      toast.error(
        apiErrorMessage(
          error,
          modal.id
            ? 'Impossible de modifier le partenaire.'
            : 'Impossible de créer le partenaire.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const statutCls: Record<AdminPartenaire['statut'], string> = {
    actif: 'badge-success',
    suspendu: 'badge-warning',
    archive: 'badge-neutral',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
            Partenaires
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>
            {total} partenaire{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearImageSelection();
            setModal({ ...INITIAL_FORM });
          }}
          className="btn btn-primary"
          style={{ gap: 6 }}
        >
          <IconPlus size={15} /> Nouveau partenaire
        </button>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div style={{ position: 'relative' }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gris-clair)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Rechercher par société, contact, téléphone ou email..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper card">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : loadError ? (
          <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
            <h3>Chargement impossible</h3>
            <p style={{ color: 'var(--color-gris-moyen)' }}>{loadError}</p>
            <button type="button" className="btn btn-secondary" onClick={() => void doFetch()}>
              Réessayer
            </button>
          </div>
        ) : partenaires.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <h3>Aucun partenaire</h3>
            <p style={{ color: 'var(--color-gris-moyen)' }}>Créez un partenaire ou modifiez la recherche.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Société</th><th>Contact</th><th>Téléphone</th><th>Email</th><th>Commission</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {partenaires.map((partenaire) => (
                <tr key={partenaire.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                      {partenaire.image_url ? (
                        <img
                          src={partenaire.image_url}
                          alt=""
                          style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--color-ivoire-dark)' }}
                        />
                      ) : (
                        <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--color-ivoire)', border: '1px solid var(--color-ivoire-dark)' }} />
                      )}
                      {partenaire.raison_sociale}
                    </div>
                  </td>
                  <td>{partenaire.contact_nom ?? partenaire.user?.name ?? '—'}</td>
                  <td>{partenaire.telephone}</td>
                  <td>{partenaire.email ?? partenaire.user?.email ?? '—'}</td>
                  <td style={{ fontWeight: 600 }}>{partenaire.taux_commission}%</td>
                  <td>
                    <span className={`badge ${statutCls[partenaire.statut]}`}>
                      {partenaire.statut}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setModal(formFromPartenaire(partenaire))}
                      className="btn btn-ghost btn-sm"
                      aria-label={`Modifier ${partenaire.raison_sociale}`}
                    >
                      <IconEdit size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <form
            className="modal-box"
            onSubmit={handleSave}
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {modal.id ? 'Modifier le partenaire' : 'Nouveau partenaire'}
              </h3>
              <button type="button" onClick={closeModal} disabled={saving} aria-label="Fermer">
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
              <label className="form-group">
                <span className="form-label">Raison sociale *</span>
                <input className="form-input" required maxLength={255} value={modal.raison_sociale} onChange={(event) => updateForm('raison_sociale', event.target.value)} />
              </label>
              <label className="form-group">
                <span className="form-label">Nom du contact</span>
                <input className="form-input" value={modal.contact_nom ?? ''} onChange={(event) => updateForm('contact_nom', event.target.value)} />
              </label>
              <label className="form-group">
                <span className="form-label">Téléphone *</span>
                <input className="form-input" required value={modal.telephone} onChange={(event) => updateForm('telephone', event.target.value)} />
              </label>
              <label className="form-group">
                <span className="form-label">Email *</span>
                <input className="form-input" type="email" required disabled={Boolean(modal.id)} value={modal.email} onChange={(event) => updateForm('email', event.target.value)} />
              </label>
              {!modal.id && (
                <>
                  <label className="form-group">
                    <span className="form-label">Commission (%) *</span>
                    <input className="form-input" type="number" min="0" max="100" step="0.01" required value={modal.taux_commission} onChange={(event) => updateForm('taux_commission', Number(event.target.value))} />
                  </label>
                  <label className="form-group">
                    <span className="form-label">Fréquence de reversement *</span>
                    <select className="form-input" value={modal.mode_reversement} onChange={(event) => updateForm('mode_reversement', event.target.value as AdminPartenaire['mode_reversement'])}>
                      <option value="hebdomadaire">Hebdomadaire</option>
                      <option value="bimensuel">Bimensuel</option>
                      <option value="mensuel">Mensuel</option>
                    </select>
                  </label>
                  <label className="form-group">
                    <span className="form-label">Mode de versement *</span>
                    <select className="form-input" value={modal.mode_versement} onChange={(event) => updateForm('mode_versement', event.target.value as AdminPartenaire['mode_versement'])}>
                      <option value="virement">Virement</option>
                      <option value="mobile_money">Mobile money</option>
                      <option value="especes">Espèces</option>
                    </select>
                  </label>
                </>
              )}
              <label className="form-group">
                <span className="form-label">NCC</span>
                <input className="form-input" value={modal.ncc ?? ''} onChange={(event) => updateForm('ncc', event.target.value)} />
              </label>
              <label className="form-group">
                <span className="form-label">RCCM</span>
                <input className="form-input" value={modal.rccm ?? ''} onChange={(event) => updateForm('rccm', event.target.value)} />
              </label>
              <label className="form-group" style={{ gridColumn: '1 / -1' }}>
                <span className="form-label">Adresse</span>
                <textarea className="form-input" rows={2} value={modal.adresse ?? ''} onChange={(event) => updateForm('adresse', event.target.value)} />
              </label>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="partenaire-image">Image du partenaire</label>
                <input
                  id="partenaire-image"
                  className="form-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast.error('L’image ne doit pas dépasser 5 Mo.');
                      event.target.value = '';
                      return;
                    }
                    if (imagePreviewObjectUrl.current) {
                      URL.revokeObjectURL(imagePreviewObjectUrl.current);
                      imagePreviewObjectUrl.current = null;
                    }
                    setImageFile(file);
                    const preview = file ? URL.createObjectURL(file) : null;
                    setImagePreview(preview);
                    imagePreviewObjectUrl.current = preview;
                    setRemoveImage(false);
                  }}
                />
                <p style={{ margin: '7px 0 0', color: 'var(--color-gris-moyen)', fontSize: 12 }}>
                  Formats acceptés : JPG, PNG ou WebP. Taille maximale : 5 Mo.
                </p>
                {modal.id && modal.image_url && !removeImage && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      clearImageSelection();
                      setRemoveImage(true);
                    }}
                    style={{ marginTop: 10, color: 'var(--color-error)' }}
                  >
                    Supprimer l’image actuelle
                  </button>
                )}
                <div style={{ marginTop: 12, minHeight: 110, borderRadius: 10, border: '1px solid var(--color-ivoire-dark)', background: 'var(--color-ivoire)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(imageFile ? imagePreview : removeImage ? null : modal.image_url) ? (
                    <img
                      src={(imageFile ? imagePreview : modal.image_url) ?? ''}
                      alt={`Aperçu de ${modal.raison_sociale || 'du partenaire'}`}
                      style={{ width: '100%', height: 140, objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ color: 'var(--color-gris-moyen)', fontSize: 13 }}>Aucune image sélectionnée</span>
                  )}
                </div>
              </div>
              {modal.mode_versement === 'virement' && (
                <label className="form-group">
                  <span className="form-label">RIB</span>
                  <input className="form-input" value={modal.rib ?? ''} onChange={(event) => updateForm('rib', event.target.value)} />
                </label>
              )}
              {modal.mode_versement === 'mobile_money' && (
                <label className="form-group">
                  <span className="form-label">Numéro Mobile Money</span>
                  <input className="form-input" value={modal.numero_mobile_money ?? ''} onChange={(event) => updateForm('numero_mobile_money', event.target.value)} />
                </label>
              )}
              {modal.id && (
                <label className="form-group">
                  <span className="form-label">Statut</span>
                  <select className="form-input" value={modal.statut} onChange={(event) => updateForm('statut', event.target.value as AdminPartenaire['statut'])}>
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="archive">Archivé</option>
                  </select>
                </label>
              )}
              <label className="form-group" style={{ gridColumn: '1 / -1' }}>
                <span className="form-label">Notes</span>
                <textarea className="form-input" rows={3} value={modal.notes ?? ''} onChange={(event) => updateForm('notes', event.target.value)} />
              </label>
              {!modal.id && (
                <p style={{ gridColumn: '1 / -1', margin: 0, color: 'var(--color-gris-moyen)', fontSize: 'var(--text-xs)' }}>
                  Un compte d’accès et un mot de passe provisoire seront créés.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={closeModal} className="btn btn-secondary" disabled={saving}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
