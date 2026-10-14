import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  adminCoutsApi,
  type CoutProduit,
  type CoutResume,
  type CoutVariante,
  type SimulationPrix,
} from '../../../api/adminCouts';

const components: Array<{ value: CoutProduit['composante']; label: string }> = [
  { value: 'matieres_premieres', label: 'Matières premières' },
  { value: 'main_oeuvre', label: 'Main-d’œuvre' },
  { value: 'numerisation', label: 'Numérisation' },
  { value: 'logistique', label: 'Logistique' },
  { value: 'autre', label: 'Autre' },
];

function errorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: unknown; errors?: Record<string, unknown> } | undefined;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  for (const value of Object.values(data?.errors ?? {})) {
    if (Array.isArray(value)) {
      const message = value.find((item): item is string => typeof item === 'string');
      if (message) return message;
    }
  }
  return fallback;
}

function money(value?: number | null): string {
  return `${new Intl.NumberFormat('fr-FR').format(Number(value ?? 0))} FCFA`;
}

export default function CoutsAdminPage() {
  const [variantes, setVariantes] = useState<CoutVariante[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [resume, setResume] = useState<CoutResume | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [component, setComponent] = useState<CoutProduit['composante']>('matieres_premieres');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [targetMargin, setTargetMargin] = useState('30');
  const [simulation, setSimulation] = useState<SimulationPrix | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    adminCoutsApi.variantes()
      .then((response) => {
        setVariantes(response.data.data);
        if (response.data.data[0]) setSelectedId(String(response.data.data[0].id));
      })
      .catch((error: unknown) => toast.error(errorMessage(error, 'Impossible de charger les variantes.')))
      .finally(() => setLoadingVariants(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setResume(null);
      setSimulation(null);
      return;
    }
    let active = true;
    setLoadingCosts(true);
    setSimulation(null);
    adminCoutsApi.resume(Number(selectedId))
      .then((response) => {
        if (active) setResume(response.data);
      })
      .catch((error: unknown) => {
        if (active) toast.error(errorMessage(error, 'Impossible de charger les coûts de cette variante.'));
      })
      .finally(() => {
        if (active) setLoadingCosts(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  const filteredVariants = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term) return variantes;
    return variantes.filter((variant) =>
      [variant.sku, variant.nom, variant.produit?.nom, variant.produit?.sku]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('fr').includes(term)),
    );
  }, [search, variantes]);

  const selectedVariant = variantes.find((variant) => String(variant.id) === selectedId);

  async function refreshResume() {
    if (!selectedId) return;
    const response = await adminCoutsApi.resume(Number(selectedId));
    setResume(response.data);
  }

  async function submitCost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !label.trim() || !Number.isInteger(Number(amount)) || Number(amount) < 0) {
      toast.error('Vérifiez la variante, le libellé et le montant.');
      return;
    }
    setSaving(true);
    try {
      await adminCoutsApi.ajouter(Number(selectedId), {
        composante: component,
        libelle: label.trim(),
        montant: Number(amount),
        date_validite: validFrom || undefined,
      });
      toast.success('Composante de coût ajoutée.');
      setShowForm(false);
      setLabel('');
      setAmount('');
      setValidFrom('');
      await refreshResume();
    } catch (error) {
      toast.error(errorMessage(error, 'Impossible d’ajouter cette composante.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeCost(costId: number) {
    if (!window.confirm('Supprimer cette composante de coût ?')) return;
    try {
      const response = await adminCoutsApi.supprimer(costId);
      toast.success(response.data.message || 'Composante supprimée.');
      await refreshResume();
    } catch (error) {
      toast.error(errorMessage(error, 'Impossible de supprimer cette composante.'));
    }
  }

  async function runSimulation() {
    const margin = Number(targetMargin);
    if (!Number.isFinite(margin) || margin < 0 || margin >= 100) {
      toast.error('La marge cible doit être comprise entre 0 et 99,99 %.');
      return;
    }
    if (!selectedId) return;
    setSimulating(true);
    try {
      const response = await adminCoutsApi.simuler(Number(selectedId), margin);
      setSimulation(response.data);
    } catch (error) {
      toast.error(errorMessage(error, 'Impossible de calculer le prix conseillé.'));
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Coûts et marges</h1>
        <p style={{ color: 'var(--color-gris-moyen)', fontSize: 'var(--text-sm)' }}>Suivez les coûts de revient et simulez un prix de vente conseillé.</p>
      </div>

      <section className="card" style={{ display: 'grid', gap: 14, padding: 'var(--space-5)' }}>
        <label className="form-group" style={{ maxWidth: 620 }}>
          <span className="form-label">Rechercher une variante</span>
          <input className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom du produit, nom de variante ou SKU" />
        </label>
        <label className="form-group" style={{ maxWidth: 620 }}>
          <span className="form-label">Variante</span>
          <select className="form-input" disabled={loadingVariants} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            <option value="">{loadingVariants ? 'Chargement…' : 'Sélectionner une variante'}</option>
            {filteredVariants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.produit?.nom ?? 'Produit'} · {variant.nom || variant.sku} ({variant.sku})
              </option>
            ))}
          </select>
        </label>
        {selectedVariant && (
          <p style={{ color: 'var(--color-gris-moyen)', fontSize: 'var(--text-sm)' }}>
            Prix actuel : <strong>{money(selectedVariant.prix_vente)}</strong>
          </p>
        )}
      </section>

      {selectedId && (
        <>
          {loadingCosts ? <div className="page-loader"><div className="spinner" /></div> : resume && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
                <div className="card" style={{ padding: 'var(--space-4)' }}><small>Coût de revient</small><h2>{money(resume.cout_revient_total)}</h2></div>
                <div className="card" style={{ padding: 'var(--space-4)' }}><small>Prix de vente effectif</small><h2>{money(resume.prix_effectif)}</h2></div>
                <div className="card" style={{ padding: 'var(--space-4)' }}><small>Commission plateforme</small><h2>{money(resume.commission_plateforme)}</h2></div>
                <div className="card" style={{ padding: 'var(--space-4)' }}><small>Marge</small><h2>{money(resume.marge)} ({resume.taux_marge} %)</h2></div>
              </div>

              <section className="card" style={{ padding: 'var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>Composantes du coût</h2>
                  <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>Ajouter un coût</button>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Composante</th><th>Libellé</th><th>Montant</th><th>Date de validité</th><th>Action</th></tr></thead>
                    <tbody>
                      {resume.couts.map((cost) => (
                        <tr key={cost.id}>
                          <td>{components.find((item) => item.value === cost.composante)?.label ?? cost.composante}</td>
                          <td>{cost.libelle}</td>
                          <td>{money(cost.montant)}</td>
                          <td>{cost.date_validite || '—'}</td>
                          <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => removeCost(cost.id)}>Supprimer</button></td>
                        </tr>
                      ))}
                      {resume.couts.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24 }}>Aucun coût enregistré pour cette variante.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card" style={{ padding: 'var(--space-5)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 14 }}>Simulation de prix</h2>
                <div style={{ display: 'flex', alignItems: 'end', flexWrap: 'wrap', gap: 12 }}>
                  <label className="form-group">
                    <span className="form-label">Marge cible (%)</span>
                    <input className="form-input" type="number" min="0" max="99.99" step="0.1" value={targetMargin} onChange={(event) => setTargetMargin(event.target.value)} />
                  </label>
                  <button type="button" className="btn btn-secondary" disabled={simulating} onClick={runSimulation}>{simulating ? 'Calcul…' : 'Calculer le prix conseillé'}</button>
                </div>
                {simulation && (
                  <p style={{ marginTop: 16 }}>
                    Pour une marge cible de <strong>{simulation.marge_cible} %</strong>, prix conseillé :{' '}
                    <strong>{simulation.prix_conseille === null ? 'Non calculable' : money(simulation.prix_conseille)}</strong>
                    {' '}· Prix actuel : {money(simulation.prix_actuel)}
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => !saving && setShowForm(false)}>
          <form className="modal-box" onSubmit={submitCost} onClick={(event) => event.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Ajouter un coût</h2>
              <button type="button" disabled={saving} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
              <label className="form-group">
                <span className="form-label">Composante</span>
                <select className="form-input" value={component} onChange={(event) => setComponent(event.target.value as CoutProduit['composante'])}>
                  {components.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Libellé</span>
                <input className="form-input" required maxLength={255} value={label} onChange={(event) => setLabel(event.target.value)} />
              </label>
              <label className="form-group">
                <span className="form-label">Montant (FCFA)</span>
                <input className="form-input" type="number" min="0" step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label className="form-group">
                <span className="form-label">Date de validité (facultatif)</span>
                <input className="form-input" type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} />
              </label>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
