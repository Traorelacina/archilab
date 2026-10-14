import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { clientApi, type ClientProfile } from '../../api/client-api';
import toast from 'react-hot-toast';

export default function ProfilPage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState<Partial<ClientProfile>>({
    nom: user?.name ?? '',
    prenoms: '',
    type: 'particulier',
    telephone: user?.telephone ?? '',
    email: user?.email ?? '',
    raison_sociale: '',
    ncc: '',
    ville: '',
    adresse_livraison: '',
    adresse_facturation: '',
  });
  const [loading, setLoading] = useState(true);
  const [pwForm, setPwForm] = useState({
    mot_de_passe_actuel: '',
    password: '',
    password_confirmation: '',
  });
  const [loadingProfil, setLoadingProfil] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);

  useEffect(() => {
    let mounted = true;
    clientApi.profil()
      .then(({ data }) => {
        if (mounted) setForm(data);
      })
      .catch(() => toast.error('Impossible de charger vos informations client.'))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfil(true);
    try {
      const response = await clientApi.updateProfil(form);
      const client = response.data.client;
      updateUser({
        name: [client.prenoms, client.nom].filter(Boolean).join(' '),
        telephone: client.telephone,
      });
      setForm(client);
      toast.success(response.data.message || 'Profil mis à jour.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de mettre à jour le profil.'));
    } finally {
      setLoadingProfil(false);
    }
  };

  const handlePw = async (e: React.FormEvent) => {
    e.preventDefault(); setLoadingPw(true);
    try {
      if (pwForm.password !== pwForm.password_confirmation) {
        toast.error('La confirmation du nouveau mot de passe est différente.');
        return;
      }
      await authApi.changerMotDePasse(pwForm);
      setPwForm({ mot_de_passe_actuel: '', password: '', password_confirmation: '' });
      toast.success('Mot de passe modifié');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de modifier le mot de passe.'));
    } finally {
      setLoadingPw(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Mon profil</h1>

      {/* Infos personnelles */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-5)', color: 'var(--color-charbon)' }}>Informations personnelles</h2>
        <form onSubmit={handleProfil} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 440 }}>
          <div className="form-group">
            <label className="form-label">Type de compte</label>
            <select className="form-input" value={form.type ?? 'particulier'} onChange={e => setForm(f => ({ ...f, type: e.target.value as ClientProfile['type'] }))}>
              <option value="particulier">Particulier</option>
              <option value="professionnel">Professionnel</option>
            </select>
          </div>
          {form.type === 'professionnel' && <>
            <div className="form-group">
              <label className="form-label">Raison sociale</label>
              <input className="form-input" value={form.raison_sociale ?? ''} onChange={e => setForm(f => ({ ...f, raison_sociale: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">NCC</label>
              <input className="form-input" value={form.ncc ?? ''} onChange={e => setForm(f => ({ ...f, ncc: e.target.value }))} />
            </div>
          </>}
          <div className="form-group">
            <label className="form-label">Nom</label>
            <input className="form-input" value={form.nom ?? ''} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Prénoms</label>
            <input className="form-input" value={form.prenoms ?? ''} onChange={e => setForm(f => ({ ...f, prenoms: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={form.email ?? user?.email ?? ''} disabled style={{ background: 'var(--color-ivoire-dark)', color: 'var(--color-gris-moyen)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <input className="form-input" value={form.telephone ?? ''} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+225 07 00 00 00 00" required />
          </div>
          <div className="form-group">
            <label className="form-label">Ville</label>
            <input className="form-input" value={form.ville ?? ''} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Adresse de livraison</label>
            <textarea className="form-input" value={form.adresse_livraison ?? ''} onChange={e => setForm(f => ({ ...f, adresse_livraison: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Adresse de facturation</label>
            <textarea className="form-input" value={form.adresse_facturation ?? ''} onChange={e => setForm(f => ({ ...f, adresse_facturation: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={loadingProfil}>
            {loadingProfil ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Mot de passe */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-5)', color: 'var(--color-charbon)' }}>Changer le mot de passe</h2>
        <form onSubmit={handlePw} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 440 }}>
          {[['mot_de_passe_actuel','Mot de passe actuel'],['password','Nouveau mot de passe'],['password_confirmation','Confirmer le nouveau']].map(([k, label]) => (
            <div className="form-group" key={k}>
              <label className="form-label">{label}</label>
              <input className="form-input" type="password" minLength={k === 'mot_de_passe_actuel' ? undefined : 8} value={pwForm[k as keyof typeof pwForm]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))} required placeholder="••••••••" />
            </div>
          ))}
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={loadingPw}>
            {loadingPw ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
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
