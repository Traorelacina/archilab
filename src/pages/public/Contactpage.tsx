import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { publicApi } from '../../api/public';
import { IconArrowRight } from '../../components/ui/Icons';

/* ⚠️ À REMPLACER par les vraies coordonnées de ARCHILAB */
const CONTACT = {
  email: 'contact@mobilia.ci',
  phone: '+225 00 00 00 00 00',
  whatsapp: '2250000000000', // format international, sans + ni espaces
  address: 'Abidjan, Côte d’Ivoire',
  hours: 'Lundi – Vendredi : 8h – 18h',
};

const HERO_IMAGE = '/images/contact-hero.jpg';

const PATHS: Record<string, string[]> = {
  mail: ['M3 5h18v14H3z', 'M3 6l9 7 9-7'],
  phone: ['M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z'],
  pin: ['M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z', 'M12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'],
  clock: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 6v6l4 2'],
  chat: ['M21 12a8 8 0 01-11.5 7.2L3 21l1.8-5.5A8 8 0 1121 12z'],
  check: ['M20 6L9 17l-5-5'],
};

function Ico({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(PATHS[name] ?? []).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const SUBJECTS = [
  'Question sur un produit',
  'Suivi de commande',
  'Devenir partenaire',
  'Devis / projet sur mesure',
  'Autre demande',
];

const FAQ = [
  { q: 'Comment suivre ma commande ?', a: 'Connectez-vous à votre espace client, rubrique « Mes commandes », pour voir l’état de chaque commande.' },
  { q: 'Quels moyens de paiement acceptez-vous ?', a: 'Mobile Money (Orange Money, MTN MoMo, Wave), virement et espèces. La carte internationale arrive bientôt.' },
  { q: 'Un meuble est « sur commande », que signifie-t-il ?', a: 'Il est fabriqué après votre commande par le partenaire. Le délai de fabrication est indiqué sur la fiche produit.' },
  { q: 'Comment devenir partenaire ?', a: 'Choisissez « Devenir partenaire » dans le formulaire ou rendez-vous sur la page Partenaires. Nous vous recontactons rapidement.' },
];

type Form = { nom: string; email: string; telephone: string; sujet: string; message: string };
const EMPTY: Form = { nom: '', email: '', telephone: '', sujet: SUBJECTS[0], message: '' };

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

  .cn-page {
    --cn-ink: #1d2a22;
    --cn-forest: #22332a;
    --cn-forest-2: #2e4236;
    --cn-accent: #5f7a65;
    --cn-accent-hover: #4a6350;
    --cn-text: #3b4a40;
    --cn-muted: #66736a;
    --cn-light: #f4f6f2;
    --cn-mist: #e9eee7;
    --cn-line: #dde3da;
    --cn-brass: #c0975a;
    --cn-error: #b05a5a;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
    --ease: cubic-bezier(.22,.8,.24,1);
    background: #fff; color: var(--cn-text); overflow: hidden;
    font-family: var(--font-body); font-size: 15px; -webkit-font-smoothing: antialiased;
  }
  .cn-page *, .cn-page *::before, .cn-page *::after { box-sizing: border-box; }
  .cn-page :focus-visible { outline: 2px solid var(--cn-brass); outline-offset: 3px; }
  .cn-wrap { width: min(1380px, calc(100% - 80px)); margin: 0 auto; }

  .cn-page .rv {
    opacity: 0; transform: translateY(34px);
    transition: opacity .9s var(--ease), transform .9s var(--ease);
    transition-delay: var(--d, 0ms);
  }
  .cn-page .rv.in { opacity: 1; transform: none; }

  .cn-eyebrow { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 16px; color: var(--cn-accent); font-size: 13px; font-weight: 700; letter-spacing: .02em; }
  .cn-eyebrow::before { content: ''; width: 34px; height: 2px; background: var(--cn-brass); }
  .cn-title { margin: 0; color: var(--cn-ink); font-family: var(--font-display); font-size: clamp(2rem, 3.6vw, 3.3rem); font-weight: 600; letter-spacing: -.025em; line-height: 1.1; }
  .cn-sub { max-width: 520px; margin: 16px 0 0; color: var(--cn-muted); font-size: 16.5px; line-height: 1.7; }

  .cn-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 14px; min-height: 58px; padding: 0 34px;
    border: 1px solid var(--cn-forest); border-radius: 999px; background: var(--cn-forest); color: #fff;
    font: inherit; font-size: 15px; font-weight: 700; text-decoration: none; cursor: pointer;
    transition: background .3s, transform .35s var(--ease), box-shadow .35s;
  }
  .cn-btn:hover:not(:disabled) { background: var(--cn-accent); border-color: var(--cn-accent); transform: translateY(-3px); box-shadow: 0 16px 32px rgba(34,51,42,.25); }
  .cn-btn:disabled { opacity: .65; cursor: wait; }
  .cn-btn svg { transition: transform .35s var(--ease); }
  .cn-btn:hover:not(:disabled) svg { transform: translateX(5px); }
  .cn-btn.is-brass { background: var(--cn-brass); border-color: var(--cn-brass); color: #1d2a22; }
  .cn-btn.is-brass:hover:not(:disabled) { background: #d3aa6c; border-color: #d3aa6c; box-shadow: 0 16px 32px rgba(0,0,0,.28); }

  /* HERO */
  .cn-hero { position: relative; min-height: 540px; display: flex; align-items: flex-end; background: var(--cn-forest); color: #fff; overflow: hidden; isolation: isolate; }
  .cn-hero-bg { position: absolute; inset: 0; z-index: -1; }
  .cn-hero-bg img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.15); animation: cn-zoom 16s ease-out forwards; }
  @keyframes cn-zoom { to { transform: scale(1); } }
  .cn-hero-bg::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(20,32,25,.93) 0%, rgba(20,32,25,.7) 52%, rgba(20,32,25,.28) 100%), linear-gradient(0deg, rgba(20,32,25,.7), transparent 45%);
  }
  .cn-hero-fallback { position: absolute; inset: 0; background: radial-gradient(circle at 78% 35%, rgba(192,151,90,.3), transparent 42%), linear-gradient(135deg, #1a271f, #2e4236 65%, #3b5444); }
  .cn-hero-inner { position: relative; padding: 140px 0 120px; }
  .cn-crumb { display: flex; gap: 10px; margin-bottom: 26px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,.72); opacity: 0; animation: cn-up .8s var(--ease) .05s forwards; }
  .cn-crumb a { color: inherit; text-decoration: none; transition: color .25s; }
  .cn-crumb a:hover { color: var(--cn-brass); }
  .cn-hero h1 { max-width: 880px; margin: 0; font-family: var(--font-display); font-size: clamp(2.8rem, 6vw, 5.4rem); line-height: 1.02; letter-spacing: -.04em; font-weight: 700; }
  .cn-line { display: block; overflow: hidden; padding-bottom: .12em; margin-bottom: -.12em; }
  .cn-line > span { display: block; transform: translateY(112%); animation: cn-rise 1.1s var(--ease) forwards; animation-delay: calc(.15s + var(--i, 0) * .14s); }
  .cn-hero h1 .cn-line:last-child { color: var(--cn-brass); font-style: italic; font-weight: 600; }
  @keyframes cn-rise { to { transform: none; } }
  @keyframes cn-up { from { transform: translateY(20px); } to { opacity: 1; transform: none; } }
  .cn-hero p { max-width: 540px; margin: 28px 0 0; color: rgba(255,255,255,.88); font-size: 18px; line-height: 1.7; opacity: 0; animation: cn-up .9s var(--ease) .75s forwards; }

  /* COORDONNÉES */
  .cn-cards { position: relative; z-index: 3; margin-top: -64px; }
  .cn-cards-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
  .cn-card {
    display: flex; flex-direction: column; gap: 22px; padding: 28px; min-width: 0;
    border: 1px solid var(--cn-line); border-radius: 22px; background: #fff; color: inherit; text-decoration: none;
    box-shadow: 0 24px 50px rgba(34,51,42,.12);
    transition: transform .5s var(--ease), box-shadow .5s, border-color .4s, background .4s;
  }
  a.cn-card:hover { transform: translateY(-10px); border-color: var(--cn-brass); box-shadow: 0 34px 64px rgba(34,51,42,.2); }
  .cn-card-ico {
    width: 58px; height: 58px; display: grid; place-items: center; border-radius: 18px;
    background: var(--cn-forest); color: var(--cn-brass); transition: transform .6s var(--ease), background .3s;
  }
  a.cn-card:hover .cn-card-ico { transform: rotate(-8deg) scale(1.08); background: var(--cn-brass); color: #1d2a22; }
  .cn-card small { display: block; color: var(--cn-muted); font-size: 13.5px; font-weight: 600; }
  .cn-card strong { display: block; margin-top: 6px; color: var(--cn-ink); font-family: var(--font-display); font-size: 19px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }

  /* FORMULAIRE */
  .cn-main { padding: 130px 0 90px; }
  .cn-main-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 70px; align-items: start; }
  .cn-form { margin-top: 44px; padding: 44px; border-radius: 28px; background: var(--cn-light); }
  .cn-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .cn-field { display: flex; flex-direction: column; gap: 9px; margin-bottom: 20px; }
  .cn-field label { color: var(--cn-ink); font-size: 14px; font-weight: 700; }
  .cn-field input, .cn-field select, .cn-field textarea {
    width: 100%; min-height: 56px; padding: 0 20px; border: 1.5px solid transparent; border-radius: 16px; background: #fff; color: var(--cn-ink);
    font: inherit; font-size: 15.5px; transition: border-color .25s, box-shadow .25s;
  }
  .cn-field select { appearance: none; cursor: pointer; padding-right: 48px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9' fill='none' stroke='%2322332a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 20px center;
  }
  .cn-field textarea { min-height: 170px; padding: 18px 20px; resize: vertical; line-height: 1.6; }
  .cn-field input:focus, .cn-field select:focus, .cn-field textarea:focus { outline: 0; border-color: var(--cn-brass); box-shadow: 0 0 0 5px rgba(192,151,90,.2); }
  .cn-field.has-error input, .cn-field.has-error textarea { border-color: var(--cn-error); }
  .cn-err { color: var(--cn-error); font-size: 13px; font-weight: 600; animation: cn-pop .4s var(--ease); }
  @keyframes cn-pop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .cn-note { margin: 18px 0 0; color: var(--cn-muted); font-size: 13.5px; }
  .cn-success {
    display: flex; gap: 14px; align-items: center; margin-bottom: 26px; padding: 16px 20px; border-radius: 16px;
    background: var(--cn-forest); color: #fff; font-size: 15px; font-weight: 600; animation: cn-pop .6s var(--ease);
  }
  .cn-success i { flex: 0 0 auto; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: var(--cn-brass); color: #1d2a22; }

  .cn-side { position: sticky; top: 120px; display: flex; flex-direction: column; gap: 20px; }
  .cn-hours { position: relative; padding: 40px; border-radius: 26px; background: var(--cn-forest); color: #fff; overflow: hidden; }
  .cn-hours::after { content: ''; position: absolute; right: -70px; bottom: -70px; width: 200px; height: 200px; border-radius: 50%; border: 2px solid var(--cn-brass); opacity: .3; animation: cn-pulse 6s ease-in-out infinite; }
  @keyframes cn-pulse { 50% { transform: scale(1.2); opacity: .12; } }
  .cn-hours h3 { margin: 0 0 16px; display: flex; align-items: center; gap: 14px; font-family: var(--font-display); font-size: 1.7rem; font-weight: 600; }
  .cn-hours h3 svg { color: var(--cn-brass); }
  .cn-hours p { margin: 0; color: #c4d2c8; font-size: 16px; line-height: 1.7; }
  .cn-hours p:first-of-type { color: #fff; font-size: 18px; font-weight: 600; }
  .cn-partner { padding: 40px; border-radius: 26px; background: var(--cn-mist); transition: transform .5s var(--ease), box-shadow .5s; }
  .cn-partner:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(34,51,42,.14); }
  .cn-partner h3 { margin: 0 0 12px; color: var(--cn-ink); font-family: var(--font-display); font-size: 1.7rem; font-weight: 600; line-height: 1.2; letter-spacing: -.02em; }
  .cn-partner p { margin: 0 0 26px; color: var(--cn-text); font-size: 16px; line-height: 1.7; }

  /* FAQ */
  .cn-faq { padding: 40px 0 130px; }
  .cn-faq-list { margin-top: 48px; max-width: 900px; border-top: 2px solid var(--cn-ink); }
  .cn-faq-item { border-bottom: 1px solid var(--cn-line); }
  .cn-faq-q {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 28px 4px;
    border: 0; background: none; color: var(--cn-ink); font-family: var(--font-display); font-size: clamp(1.2rem, 1.8vw, 1.5rem); font-weight: 600; text-align: left; cursor: pointer;
    transition: color .3s, padding-left .45s var(--ease);
  }
  .cn-faq-q:hover { color: var(--cn-accent); padding-left: 12px; }
  .cn-faq-q span {
    position: relative; flex: 0 0 auto; width: 44px; height: 44px; border-radius: 50%; background: var(--cn-light);
    transition: background .3s, transform .5s var(--ease);
  }
  .cn-faq-q span::before, .cn-faq-q span::after { content: ''; position: absolute; left: 50%; top: 50%; width: 16px; height: 2px; background: var(--cn-forest); transform: translate(-50%, -50%); transition: transform .5s var(--ease), background .3s; }
  .cn-faq-q span::after { transform: translate(-50%, -50%) rotate(90deg); }
  .cn-faq-item.is-open .cn-faq-q span { background: var(--cn-forest); transform: rotate(180deg); }
  .cn-faq-item.is-open .cn-faq-q span::before, .cn-faq-item.is-open .cn-faq-q span::after { background: #fff; }
  .cn-faq-item.is-open .cn-faq-q span::after { transform: translate(-50%, -50%) rotate(0deg); }
  .cn-faq-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .55s var(--ease); }
  .cn-faq-item.is-open .cn-faq-panel { grid-template-rows: 1fr; }
  .cn-faq-panel > div { overflow: hidden; }
  .cn-faq-a { margin: 0; padding: 0 4px 30px; max-width: 700px; color: var(--cn-text); font-size: 17px; line-height: 1.75; }

  @media (max-width: 1100px) {
    .cn-wrap { width: calc(100% - 56px); }
    .cn-cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cn-main-grid { grid-template-columns: 1fr; gap: 50px; }
    .cn-side { position: static; }
  }
  @media (max-width: 760px) {
    .cn-wrap { width: calc(100% - 36px); }
    .cn-hero { min-height: 460px; }
    .cn-hero-inner { padding: 110px 0 100px; }
    .cn-cards { margin-top: -50px; }
    .cn-cards-grid, .cn-row { grid-template-columns: 1fr; }
    .cn-card { flex-direction: row; align-items: center; padding: 22px; gap: 18px; }
    .cn-main { padding: 80px 0 60px; }
    .cn-form { padding: 26px 20px; }
    .cn-hours, .cn-partner { padding: 30px 26px; }
    .cn-faq { padding-bottom: 80px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cn-page *, .cn-page *::before, .cn-page *::after { animation: none !important; transition: none !important; }
    .cn-page .rv { opacity: 1; transform: none; }
    .cn-line > span, .cn-crumb, .cn-hero p { transform: none; opacity: 1; }
    .cn-hero-bg img { transform: none; }
  }
`;

export default function ContactPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [heroOk, setHeroOk] = useState(true);
  const [open, setOpen] = useState<number | null>(0);
  const [submitted, setSubmitted] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  // Révélation des sections au scroll
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>('.rv'));

    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (sent) setSent(false);
  };

  const errors = {
    nom: !form.nom.trim(),
    email: !form.email.trim(),
    message: form.message.trim().length < 10,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (errors.nom || errors.email || errors.message) {
      toast.error('Renseignez votre nom, votre email et un message d’au moins 10 caractères.');
      return;
    }
    setSending(true);
    try {
      /* Branchez ici votre endpoint Laravel, ex. publicApi.contact(form) */
      const api = publicApi as any;
      if (typeof api.contact === 'function') {
        await api.contact(form);
      } else {
        const body = `${form.message}\n\n— ${form.nom}${form.telephone ? ` (${form.telephone})` : ''}\n${form.email}`;
        window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`[${form.sujet}] Contact ARCHILAB`)}&body=${encodeURIComponent(body)}`;
      }
      setSent(true);
      setSubmitted(false);
      setForm(EMPTY);
      toast.success('Votre message a bien été préparé.');
    } catch {
      toast.error('Impossible d’envoyer le message. Réessayez ou écrivez-nous par email.');
    } finally {
      setSending(false);
    }
  };

  const cards = [
    { icon: 'phone', title: 'Téléphone', value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, '')}` },
    { icon: 'mail', title: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    { icon: 'chat', title: 'WhatsApp', value: 'Écrivez-nous', href: `https://wa.me/${CONTACT.whatsapp}` },
    { icon: 'pin', title: 'Adresse', value: CONTACT.address },
  ];

  return (
    <>
      <style>{styles}</style>

      <div className="cn-page" ref={pageRef}>
        {/* HERO */}
        <section className="cn-hero">
          <div className="cn-hero-bg">
            {heroOk ? (
              <img src={HERO_IMAGE} alt="" onError={() => setHeroOk(false)} />
            ) : (
              <div className="cn-hero-fallback" />
            )}
          </div>

          <div className="cn-wrap cn-hero-inner">
            <nav className="cn-crumb" aria-label="Fil d’Ariane">
              <Link to="/">Accueil</Link><span>/</span><span>Contact</span>
            </nav>

            <h1>
              <span className="cn-line" style={{ ['--i' as any]: 0 }}>
                <span>Une question ?</span>
              </span>
              <span className="cn-line" style={{ ['--i' as any]: 1 }}>
                <span>Parlons de votre projet</span>
              </span>
            </h1>

            <p>Notre équipe vous répond sur vos commandes, nos produits et le partenariat avec ARCHILAB.</p>
          </div>
        </section>

        {/* COORDONNÉES */}
        <section className="cn-cards">
          <div className="cn-wrap cn-cards-grid">
            {cards.map((c, i) => {
              const inner = (
                <>
                  <div className="cn-card-ico"><Ico name={c.icon} size={26} /></div>
                  <div style={{ minWidth: 0 }}>
                    <small>{c.title}</small>
                    <strong>{c.value}</strong>
                  </div>
                </>
              );
              const style = { ['--d' as any]: `${i * 90}ms` } as React.CSSProperties;

              return c.href ? (
                <a
                  key={c.title}
                  className="cn-card rv"
                  style={style}
                  href={c.href}
                  {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  {inner}
                </a>
              ) : (
                <div key={c.title} className="cn-card rv" style={style}>{inner}</div>
              );
            })}
          </div>
        </section>

        {/* FORMULAIRE */}
        <section className="cn-main">
          <div className="cn-wrap cn-main-grid">
            <div className="rv">
              <span className="cn-eyebrow">Écrivez-nous</span>
              <h2 className="cn-title">Envoyez-nous un message</h2>
              <p className="cn-sub">Nous répondons en général sous un à deux jours ouvrés.</p>

              <form className="cn-form" onSubmit={handleSubmit} noValidate>
                {sent && (
                  <div className="cn-success" role="status">
                    <i><Ico name="check" size={16} /></i>
                    Merci ! Votre message est prêt à partir.
                  </div>
                )}

                <div className="cn-row">
                  <div className={`cn-field ${submitted && errors.nom ? 'has-error' : ''}`}>
                    <label htmlFor="cn-nom">Nom complet *</label>
                    <input
                      id="cn-nom" value={form.nom} onChange={set('nom')}
                      autoComplete="name" required
                      aria-invalid={submitted && errors.nom}
                    />
                    {submitted && errors.nom && <span className="cn-err">Indiquez votre nom.</span>}
                  </div>

                  <div className={`cn-field ${submitted && errors.email ? 'has-error' : ''}`}>
                    <label htmlFor="cn-email">Email *</label>
                    <input
                      id="cn-email" type="email" value={form.email} onChange={set('email')}
                      autoComplete="email" required
                      aria-invalid={submitted && errors.email}
                    />
                    {submitted && errors.email && <span className="cn-err">Indiquez votre email.</span>}
                  </div>
                </div>

                <div className="cn-row">
                  <div className="cn-field">
                    <label htmlFor="cn-tel">Téléphone</label>
                    <input id="cn-tel" type="tel" value={form.telephone} onChange={set('telephone')} autoComplete="tel" />
                  </div>

                  <div className="cn-field">
                    <label htmlFor="cn-sujet">Sujet</label>
                    <select id="cn-sujet" value={form.sujet} onChange={set('sujet')}>
                      {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className={`cn-field ${submitted && errors.message ? 'has-error' : ''}`}>
                  <label htmlFor="cn-message">Message *</label>
                  <textarea
                    id="cn-message" value={form.message} onChange={set('message')}
                    required aria-invalid={submitted && errors.message}
                  />
                  {submitted && errors.message && (
                    <span className="cn-err">Votre message doit contenir au moins 10 caractères.</span>
                  )}
                </div>

                <button type="submit" className="cn-btn" disabled={sending}>
                  {sending ? 'Envoi…' : 'Envoyer le message'}
                  {!sending && <IconArrowRight size={16} />}
                </button>
                <p className="cn-note">* Champs obligatoires</p>
              </form>
            </div>

            <aside className="cn-side rv" style={{ ['--d' as any]: '150ms' }}>
              <div className="cn-hours">
                <h3><Ico name="clock" size={28} /> Horaires</h3>
                <p>{CONTACT.hours}</p>
                <p style={{ marginTop: 12 }}>
                  Hors horaires, laissez-nous un message : nous revenons vers vous dès l’ouverture.
                </p>
              </div>

              <div className="cn-partner">
                <h3>Vous êtes concepteur ou fabricant ?</h3>
                <p>Rejoignez notre réseau de partenaires et donnez une nouvelle visibilité à vos créations.</p>
                <Link to="/partenaires" className="cn-btn">
                  Devenir partenaire <IconArrowRight size={16} />
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {/* FAQ */}
        <section className="cn-faq">
          <div className="cn-wrap">
            <div className="rv">
              <span className="cn-eyebrow">FAQ</span>
              <h2 className="cn-title">Questions fréquentes</h2>
              <p className="cn-sub">La réponse à votre question s’y trouve peut-être déjà.</p>
            </div>

            <div className="cn-faq-list rv">
              {FAQ.map((item, i) => (
                <div className={`cn-faq-item ${open === i ? 'is-open' : ''}`} key={item.q}>
                  <button
                    type="button"
                    className="cn-faq-q"
                    onClick={() => setOpen(open === i ? null : i)}
                    aria-expanded={open === i}
                    aria-controls={`cn-faq-${i}`}
                  >
                    {item.q}
                    <span aria-hidden="true" />
                  </button>

                  <div className="cn-faq-panel" id={`cn-faq-${i}`} role="region">
                    <div>
                      <p className="cn-faq-a">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
