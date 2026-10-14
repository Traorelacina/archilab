import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminCategoriesApi,
  type AdminCategorie,
  type CategoriePayload,
} from '../../../api/adminCategories';

type FormState = {
  parent_id: string;
  nom: string;
  description: string;
  ordre: string;
  active: boolean;
};

const INITIAL: FormState = {
  parent_id: '',
  nom: '',
  description: '',
  ordre: '',
  active: true,
};

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

function descendantIds(id: number, categories: AdminCategorie[]): Set<number> {
  const map = new Map<number, number[]>();
  categories.forEach(c => {
    if (c.parent_id == null) return;
    map.set(c.parent_id, [...(map.get(c.parent_id) ?? []), c.id]);
  });

  const result = new Set<number>();
  const visit = (parentId: number) => {
    (map.get(parentId) ?? []).forEach(childId => {
      if (result.has(childId)) return;
      result.add(childId);
      visit(childId);
    });
  };
  visit(id);
  return result;
}

export default function CategorieFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const categorieId = id ? Number(id) : null;
  const editing = categorieId !== null && Number.isFinite(categorieId);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [categorie, setCategorie] = useState<AdminCategorie | null>(null);
  const [categories, setCategories] = useState<AdminCategorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imagePreviewObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewObjectUrl.current) {
        URL.revokeObjectURL(imagePreviewObjectUrl.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [allRes, oneRes] = await Promise.all([
          adminCategoriesApi.categories(),
          editing && categorieId ? adminCategoriesApi.categorie(categorieId) : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setCategories(allRes.data);

        if (oneRes) {
          const c = oneRes.data;
          setCategorie(c);
          setForm({
            parent_id: c.parent_id ? String(c.parent_id) : '',
            nom: c.nom ?? '',
            description: c.description ?? '',
            ordre: c.ordre != null ? String(c.ordre) : '',
            active: Boolean(c.active),
          });
        }
      } catch (e) {
        if (mounted) {
          const message = apiError(
            e,
            editing ? 'Impossible de charger la catégorie.' : 'Impossible de charger le formulaire.',
          );
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [editing, categorieId, navigate, loadAttempt]);

  const invalidParents = useMemo(() => {
    const ids = new Set<number>();
    if (editing && categorieId) {
      ids.add(categorieId);
      descendantIds(categorieId, categories).forEach(x => ids.add(x));
    }
    return ids;
  }, [editing, categorieId, categories]);

  const parentOptions = useMemo(() => (
    [...categories]
      .filter(c => !invalidParents.has(c.id))
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || a.nom.localeCompare(b.nom, 'fr'))
  ), [categories, invalidParents]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const payload = (): CategoriePayload | null => {
    const nom = form.nom.trim();
    if (!nom) {
      toast.error('Le nom de la catégorie est obligatoire.');
      return null;
    }

    let ordre: number | null = null;
    if (form.ordre.trim() !== '') {
      ordre = Number(form.ordre);
      if (!Number.isInteger(ordre)) {
        toast.error("L'ordre doit être un nombre entier.");
        return null;
      }
    }

    return {
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      nom,
      description: form.description.trim() || null,
      ordre: ordre ?? 0,
      active: form.active,
    };
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const data = payload();
    if (!data) return;

    setSaving(true);
    try {
      if (editing && categorieId) {
        const res = imageFile
          ? await adminCategoriesApi.updateCategorieImage(categorieId, data, imageFile)
          : await adminCategoriesApi.updateCategorie(categorieId, {
              ...data,
              ...(removeImage ? { supprimer_image: true } : {}),
            });
        setCategorie(prev => prev ? { ...prev, ...res.data } : res.data);
        setImageFile(null);
        setRemoveImage(false);
        if (imagePreviewObjectUrl.current) {
          URL.revokeObjectURL(imagePreviewObjectUrl.current);
          imagePreviewObjectUrl.current = null;
        }
        setImagePreview(null);
        toast.success('Catégorie mise à jour.');
      } else {
        const res = await adminCategoriesApi.createCategorie(data, imageFile ?? undefined);
        toast.success('Catégorie créée avec succès.');
        navigate(`/admin/catalogue/categories/${res.data.id}/modifier`, { replace: true });
      }
    } catch (e) {
      toast.error(apiError(e, editing ? 'Impossible de modifier la catégorie.' : 'Impossible de créer la catégorie.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || !categorieId) return;
    const count = categorie?.produits_count ?? 0;
    const msg = count > 0
      ? `Cette catégorie contient ${count} produit(s).\n\nLaravel refusera la suppression tant que des produits lui sont rattachés.\n\nContinuer ?`
      : `Supprimer définitivement la catégorie "${categorie?.nom ?? form.nom}" ?`;
    if (!window.confirm(msg)) return;

    setSaving(true);
    try {
      const res = await adminCategoriesApi.deleteCategorie(categorieId);
      toast.success(res.data?.message ?? 'Catégorie supprimée.');
      navigate('/admin/catalogue/categories', { replace: true });
    } catch (e) {
      toast.error(apiError(e, 'Impossible de supprimer la catégorie.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
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
            onClick={() => setLoadAttempt(attempt => attempt + 1)}
          >
            Réessayer
          </button>
          <Link to="/admin/catalogue/categories" className="btn btn-ghost">
            Retour aux catégories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link to="/admin/catalogue/categories" style={{ display: 'inline-block', marginBottom: 7, color: 'var(--color-gris-moyen)', fontSize: 'var(--text-sm)' }}>← Retour aux catégories</Link>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h1>
          {editing && categorie && <p style={{ margin: '5px 0 0', color: 'var(--color-gris-moyen)', fontSize: 'var(--text-sm)' }}>Slug : {categorie.slug}</p>}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/admin/catalogue/categories" className="btn btn-secondary">Annuler</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer la catégorie'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <section className="card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 14, fontSize: 'var(--text-lg)' }}>Image de la catégorie</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 260px)', gap: 18, alignItems: 'start' }}>
              <div>
                <label className="form-label" htmlFor="categorie-image">Choisir une image</label>
                <input
                  id="categorie-image"
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
                    if (file) {
                      const preview = URL.createObjectURL(file);
                      imagePreviewObjectUrl.current = preview;
                      setImagePreview(preview);
                      setRemoveImage(false);
                    } else {
                      setImagePreview(null);
                    }
                  }}
                />
                <p style={{ margin: '7px 0 0', color: 'var(--color-gris-moyen)', fontSize: 12 }}>
                  Formats acceptés : JPG, PNG ou WebP. Taille maximale : 5 Mo.
                </p>
                {editing && categorie?.image_url && !removeImage && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (imagePreviewObjectUrl.current) {
                        URL.revokeObjectURL(imagePreviewObjectUrl.current);
                        imagePreviewObjectUrl.current = null;
                      }
                      setImageFile(null);
                      setImagePreview(null);
                      setRemoveImage(true);
                    }}
                    style={{ marginTop: 10, color: 'var(--color-error)' }}
                  >
                    Supprimer l’image actuelle
                  </button>
                )}
              </div>
              <div style={{ minHeight: 140, borderRadius: 10, border: '1px solid var(--color-ivoire-dark)', background: 'var(--color-ivoire)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(imageFile ? imagePreview : removeImage ? null : categorie?.image_url) ? (
                  <img src={(imageFile ? imagePreview : categorie?.image_url) ?? ''} alt={`Aperçu de la catégorie ${form.nom}`} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--color-gris-moyen)', fontSize: 13 }}>Aucune image sélectionnée</span>
                )}
              </div>
            </div>
          </section>

          <section className="card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 'var(--text-lg)' }}>Informations</h2>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="form-label" htmlFor="categorie-nom">Nom *</label>
                <input id="categorie-nom" className="form-input" required maxLength={255} value={form.nom} onChange={e => update('nom', e.target.value)} placeholder="Ex. Salon" />
              </div>
              <div>
                <label className="form-label" htmlFor="categorie-description">Description</label>
                <textarea id="categorie-description" className="form-input" rows={8} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Description marketing ou informative de la catégorie..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          </section>

          {editing && categorie?.enfants && categorie.enfants.length > 0 && (
            <section className="card" style={{ padding: 'var(--space-5)' }}>
              <h2 style={{ marginTop: 0, marginBottom: 14, fontSize: 'var(--text-lg)' }}>Sous-catégories</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categorie.enfants.map(child => (
                  <Link key={child.id} to={`/admin/catalogue/categories/${child.id}/modifier`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 12px', border: '1px solid var(--color-border, #e8e8e8)', borderRadius: 8 }}>
                    <span style={{ fontWeight: 600 }}>{child.nom}</span>
                    <span style={{ color: 'var(--color-gris-moyen)', fontSize: 12 }}>Modifier →</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <section className="card" style={{ padding: 'var(--space-5)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 'var(--text-lg)' }}>Organisation</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label" htmlFor="categorie-parent">Catégorie parente</label>
                <select id="categorie-parent" className="form-input" value={form.parent_id} onChange={e => update('parent_id', e.target.value)}>
                  <option value="">Aucune — catégorie racine</option>
                  {parentOptions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                {editing && <p style={{ margin: '6px 0 0', color: 'var(--color-gris-moyen)', fontSize: 11, lineHeight: 1.45 }}>La catégorie courante et ses descendants sont retirés de la liste afin d'éviter une hiérarchie circulaire.</p>}
              </div>

              <div>
                <label className="form-label" htmlFor="categorie-ordre">Ordre d'affichage</label>
                <input id="categorie-ordre" type="number" step={1} className="form-input" value={form.ordre} onChange={e => update('ordre', e.target.value)} placeholder="Ex. 10" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={e => update('active', e.target.checked)} />
                <span>Catégorie active</span>
              </label>
            </div>
          </section>

          {editing && (
            <section className="card" style={{ padding: 'var(--space-5)' }}>
              <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 'var(--text-lg)' }}>Informations</h2>
              <div style={{ display: 'grid', gap: 10, fontSize: 'var(--text-sm)' }}>
                <div><span style={{ color: 'var(--color-gris-moyen)' }}>ID :</span> <strong>#{categorieId}</strong></div>
                <div><span style={{ color: 'var(--color-gris-moyen)' }}>Slug :</span> <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{categorie?.slug ?? '—'}</code></div>
                <div><span style={{ color: 'var(--color-gris-moyen)' }}>Produits :</span> <strong>{categorie?.produits_count ?? '—'}</strong></div>
              </div>
            </section>
          )}

          {editing && (
            <section className="card" style={{ padding: 'var(--space-5)' }}>
              <h2 style={{ marginTop: 0, fontSize: 'var(--text-lg)' }}>Zone sensible</h2>
              <p style={{ color: 'var(--color-gris-moyen)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>Une catégorie contenant des produits ne peut pas être supprimée. L'erreur 422 renvoyée par Laravel sera affichée directement.</p>
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={remove} style={{ width: '100%', color: 'var(--color-error)' }}>Supprimer la catégorie</button>
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}
