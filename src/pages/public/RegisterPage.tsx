import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const SIDE_IMAGE = '/images/a-propos-hero.jpg';

const PERKS = [
  'Créez votre compte gratuitement',
  'Commandez et suivez vos achats en ligne',
  'Compte professionnel pour vos projets d’aménagement',
];

type FormState = {
  name: string;
  email: string;
  telephone: string;
  password: string;
  password_confirmation: string;
  type: 'particulier' | 'professionnel';
  raison_sociale: string;
  ncc: string;
  ville: string;
};

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    telephone: '',
    password: '',
    password_confirmation: '',
    type: 'particulier',
    raison_sociale: '',
    ncc: '',
    ville: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const mismatch = form.password_confirmation.length > 0 && form.password !== form.password_confirmation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      setAuth(res.data.user, res.data.token);
      toast.success('Compte créé avec succès !');
      navigate('/espace-client');
    } catch (err: any) {
      const errs = err.response?.data?.errors;
      if (errs) Object.values(errs).flat().forEach((e: any) => toast.error(e));
      else toast.error('Erreur lors de la création du compte');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

        .au-page {
          --au-ink: #1d2a22; --au-forest: #22332a; --au-forest-2: #2e4236;
          --au-accent: #5f7a65; --au-accent-hover: #4a6350;
          --au-text: #3b4a40; --au-muted: #66736a;
          --au-light: #f4f6f2; --au-mist: #e9eee7; --au-line: #dde3da;
          --au-brass: #c0975a; --au-danger: #a34545;
          --font-display: 'Fraunces', Georgia, serif;
          --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
          --ease: cubic-bezier(.22,.8,.24,1);
          min-height: calc(100vh - 76px); display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
          background: var(--au-light); color: var(--au-text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
        .au-page *, .au-page *::before, .au-page *::after { box-sizing: border-box; }
        .au-page :focus-visible { outline: 2px solid var(--au-brass); outline-offset: 3px; }

        .au-side { position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 56px; color: #fff; background: var(--au-forest); overflow: hidden; isolation: isolate; }
        .au-side-bg { position: absolute; inset: 0; z-index: -1; }
        .au-side-bg img { width: 100%; height: 100%; object-fit: cover; object-position: 70% center; display: block; }
        .au-side-bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(34,51,42,.5) 0%, rgba(34,51,42,.35) 35%, rgba(29,42,34,.94) 100%); }
        .au-side-fallback { position: absolute; inset: 0; background: radial-gradient(circle at 70% 30%, rgba(192,151,90,.25), transparent 42%), linear-gradient(135deg, #1d2a22, #2e4236 60%, #3b5444); }
        .au-side-inner { position: relative; z-index: 2; max-width: 420px; }
        .au-side h2 { margin: 0; font-family: var(--font-display); font-size: clamp(1.8rem, 2.8vw, 2.5rem); line-height: 1.08; letter-spacing: -.03em; font-weight: 700; }
        .au-side h2 span { color: var(--au-brass); display: block; font-style: italic; font-weight: 600; }
        .au-side p { margin: 16px 0 0; color: #d3dfd6; font-size: 15px; line-height: 1.7; }
        .au-perks { list-style: none; margin: 26px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .au-perks li { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 500; color: #eaf1ec; }
        .au-perks svg { flex: 0 0 auto; color: var(--au-brass); }

        .au-main { display: flex; align-items: flex-start; justify-content: center; padding: 48px 24px 64px; background: var(--au-light); }
        .au-box { width: 100%; max-width: 520px; }
        .au-logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 26px; text-decoration: none; }
        .au-logo strong { font-family: var(--font-display); font-size: 20px; font-weight: 700; letter-spacing: .14em; color: var(--au-ink); }
        .au-eyebrow { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 12px; color: var(--au-accent); font-size: 13px; font-weight: 700; letter-spacing: .02em; }
        .au-eyebrow::before { content: ''; width: 34px; height: 2px; background: var(--au-brass); }
        .au-box h1 { margin: 0; color: var(--au-ink); font-family: var(--font-display); font-size: 2.3rem; font-weight: 600; letter-spacing: -.025em; line-height: 1.1; }
        .au-lead { margin: 10px 0 26px; color: var(--au-muted); font-size: 15px; line-height: 1.65; }

        .au-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 5px; margin-bottom: 22px; border: 1px solid var(--au-line); border-radius: 999px; background: #fff; }
        .au-seg button { padding: 11px 12px; border: 0; border-radius: 999px; background: transparent; color: var(--au-muted); font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: background .3s, color .3s; }
        .au-seg button:hover:not(.is-on) { color: var(--au-ink); }
        .au-seg button.is-on { background: var(--au-forest); color: #fff; }

        .au-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .au-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 18px; }
        .au-field label { color: var(--au-ink); font-size: 13px; font-weight: 700; }
        .au-field label small { color: var(--au-muted); font-weight: 500; font-size: 12px; }
        .au-input-wrap { position: relative; }
        .au-field input { width: 100%; padding: 14px 16px; border: 1px solid var(--au-line); border-radius: 12px; background: #fff; font: inherit; font-size: 14.5px; color: var(--au-ink); transition: border-color .25s, box-shadow .25s; }
        .au-field input::placeholder { color: #8b978e; }
        .au-field input:focus { outline: 0; border-color: var(--au-brass); box-shadow: 0 0 0 4px rgba(192,151,90,.2); }
        .au-field input.is-bad { border-color: var(--au-danger); }
        .au-field input.is-bad:focus { box-shadow: 0 0 0 4px rgba(163,69,69,.15); }
        .au-err { color: var(--au-danger); font-size: 12px; font-weight: 600; }
        .au-toggle { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); padding: 6px 8px; border: 0; background: none; color: var(--au-accent); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: color .2s; }
        .au-toggle:hover { color: var(--au-forest); }
        .au-input-wrap input { padding-right: 84px; }

        .au-pro { padding: 18px 18px 0; margin-bottom: 18px; border: 1px dashed var(--au-accent); border-radius: 16px; background: var(--au-mist); }
        .au-pro .au-row { gap: 14px; }

        .au-submit { width: 100%; min-height: 54px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; border: 1px solid var(--au-forest); border-radius: 999px; background: var(--au-forest); color: #fff; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: background .3s, border-color .3s, transform .35s var(--ease), box-shadow .35s; }
        .au-submit:hover:not(:disabled) { background: var(--au-accent); border-color: var(--au-accent); transform: translateY(-2px); box-shadow: 0 14px 28px rgba(34,51,42,.22); }
        .au-submit:disabled { opacity: .65; cursor: not-allowed; }
        .au-spin { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: au-spin .7s linear infinite; }
        @keyframes au-spin { to { transform: rotate(360deg); } }

        .au-alt { margin: 24px 0 0; text-align: center; color: var(--au-muted); font-size: 14px; }
        .au-alt a { color: var(--au-forest); font-weight: 700; text-decoration: none; border-bottom: 2px solid var(--au-brass); padding-bottom: 1px; }
        .au-alt a:hover { color: var(--au-accent); }
        .au-back { display: block; margin-top: 16px; text-align: center; color: var(--au-muted); font-size: 13px; text-decoration: none; transition: color .2s; }
        .au-back:hover { color: var(--au-ink); }

        @media (max-width: 960px) {
          .au-page { grid-template-columns: 1fr; }
          .au-side { display: none; }
          .au-main { padding: 36px 20px 56px; }
        }
        @media (max-width: 520px) { .au-row { grid-template-columns: 1fr; } }
        @media (prefers-reduced-motion: reduce) { .au-page * { transition: none !important; animation: none !important; } }
      `}</style>

      <div className="au-page">
        <aside className="au-side">
          <div className="au-side-bg">
            {imgOk ? <img src={SIDE_IMAGE} alt="" onError={() => setImgOk(false)} /> : <div className="au-side-fallback" />}
          </div>
          <div className="au-side-inner">
            <h2>Le mobilier africain<span>à portée de clic</span></h2>
            <p>Créez votre compte pour commander des meubles conçus par des talents locaux.</p>
            <ul className="au-perks">
              {PERKS.map((p) => (
                <li key={p}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="au-main">
          <div className="au-box">
            <Link to="/" className="au-logo" aria-label="ARCHILAB — accueil">
              <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true"><path d="M3 37V4h6.5L20 21 30.5 4H37v33h-6.5V16L20 33 9.5 16v21z" fill="#22332a" /></svg>
              <strong>ARCHILAB</strong>
            </Link>

            <span className="au-eyebrow">Nouveau compte</span>
            <h1>Créer un compte</h1>
            <p className="au-lead">Rejoignez ARCHILAB gratuitement.</p>

            <form onSubmit={handleSubmit}>
              <div className="au-seg" role="group" aria-label="Type de compte">
                {(['particulier', 'professionnel'] as const).map((t) => (
                  <button key={t} type="button" className={form.type === t ? 'is-on' : ''} aria-pressed={form.type === t} onClick={() => setForm(f => ({ ...f, type: t }))}>
                    {t === 'particulier' ? 'Particulier' : 'Professionnel'}
                  </button>
                ))}
              </div>

              <div className="au-row">
                <div className="au-field">
                  <label htmlFor="r-name">Nom complet</label>
                  <input id="r-name" type="text" placeholder="Jean Koné" value={form.name} onChange={set('name')} autoComplete="name" required />
                </div>
                <div className="au-field">
                  <label htmlFor="r-tel">Téléphone</label>
                  <input id="r-tel" type="tel" placeholder="+225 07 00 00 00 00" value={form.telephone} onChange={set('telephone')} autoComplete="tel" required />
                </div>
              </div>

              <div className="au-field">
                <label htmlFor="r-email">Adresse e-mail</label>
                <input id="r-email" type="email" placeholder="votre@email.com" value={form.email} onChange={set('email')} autoComplete="email" required />
              </div>

              {form.type === 'professionnel' && (
                <div className="au-pro">
                  <div className="au-row">
                    <div className="au-field">
                      <label htmlFor="r-rs">Raison sociale</label>
                      <input id="r-rs" value={form.raison_sociale} onChange={set('raison_sociale')} required />
                    </div>
                    <div className="au-field">
                      <label htmlFor="r-ncc">NCC <small>(facultatif)</small></label>
                      <input id="r-ncc" value={form.ncc} onChange={set('ncc')} />
                    </div>
                  </div>
                </div>
              )}

              <div className="au-field">
                <label htmlFor="r-ville">Ville <small>(facultatif)</small></label>
                <input id="r-ville" value={form.ville} onChange={set('ville')} autoComplete="address-level2" />
              </div>

              <div className="au-row">
                <div className="au-field">
                  <label htmlFor="r-pwd">Mot de passe</label>
                  <div className="au-input-wrap">
                    <input id="r-pwd" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={set('password')} autoComplete="new-password" required />
                  </div>
                </div>
                <div className="au-field">
                  <label htmlFor="r-pwd2">Confirmer le mot de passe</label>
                  <div className="au-input-wrap">
                    <input id="r-pwd2" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password_confirmation} onChange={set('password_confirmation')} className={mismatch ? 'is-bad' : ''} autoComplete="new-password" aria-invalid={mismatch} required />
                    <button type="button" className="au-toggle" onClick={() => setShowPwd(v => !v)} aria-pressed={showPwd}>
                      {showPwd ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                  {mismatch && <span className="au-err" role="alert">Les mots de passe ne correspondent pas.</span>}
                </div>
              </div>

              <button type="submit" className="au-submit" disabled={loading}>
                {loading ? <><span className="au-spin" /> Création...</> : 'Créer mon compte'}
              </button>
            </form>

            <p className="au-alt">Déjà un compte ? <Link to="/connexion">Se connecter</Link></p>
            <Link to="/" className="au-back">← Retour à l'accueil</Link>
          </div>
        </main>
      </div>
    </>
  );
}