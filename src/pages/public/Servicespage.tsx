import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconCube } from '../../components/ui/Icons';

/* Placez vos visuels dans /public/images/ (ou changez les chemins ici) */
const HERO_IMAGE = '/images/services-hero.jpg';
const SCAN_IMAGE = '/images/visualisation-3d.jpg';

const PATHS: Record<string, string[]> = {
  stock: ['M21 8l-9-5-9 5v8l9 5 9-5z', 'M3 8l9 5 9-5', 'M12 13v8'],
  doc: ['M6 2h9l5 5v15H6z', 'M14 2v6h6', 'M9 13h8M9 17h8'],
  users: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8z', 'M23 21v-2a4 4 0 00-3-3.9', 'M16 3.1a4 4 0 010 7.8'],
  phone: ['M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1z', 'M11 18h2'],
  shield: ['M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', 'M9 12l2 2 4-4'],
  pen: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z'],
  store: ['M3 9l2-5h14l2 5', 'M3 9v11h18V9', 'M9 20v-6h6v6'],
  check: ['M20 6L9 17l-5-5'],
};

function Ico({ name, size = 26 }: { name: string; size?: number }) {
  if (name === 'cube') return <IconCube size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(PATHS[name] ?? []).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const SERVICES = [
  {
    id: 'numerisation',
    icon: 'cube',
    title: 'Numérisation 2D/3D',
    text: 'Nous transformons vos créations en fiches produits complètes, avec des visuels exploitables par vos clients.',
    points: ['Photos et modèles 3D interactifs', 'Plans 2D téléchargeables', 'Fiches techniques : dimensions, matériaux, finitions'],
  },
  {
    id: 'stock',
    icon: 'stock',
    title: 'Gestion de stock',
    text: 'Chaque variante a son stock suivi en temps réel, pour que vos clients voient exactement ce qui est disponible.',
    points: ['Stock par variante et par entrepôt', 'Mode « fabriqué à la commande » avec délais', 'Alertes de stock limité'],
  },
  {
    id: 'devis',
    icon: 'doc',
    title: 'Devis & facturation',
    text: 'Émettez des devis et des factures clairs, directement depuis votre espace partenaire.',
    points: ['Devis pour projets et commandes sur mesure', 'Factures générées automatiquement', 'Suivi des paiements : Mobile Money, virement, espèces'],
  },
  {
    id: 'accompagnement',
    icon: 'users',
    title: 'Accompagnement partenaires',
    text: 'Une équipe vous guide pour référencer votre catalogue et développer votre visibilité.',
    points: ['Aide à la mise en ligne de votre catalogue', 'Conseils sur les photos et les fiches', 'Support dédié aux partenaires'],
  },
];

const CLIENT_SERVICES = [
  { icon: 'phone', title: 'Visualisation avant achat', text: 'Modèles 3D et plans 2D pour vérifier qu’un meuble convient à votre espace. La réalité augmentée arrive en phase 2.' },
  { icon: 'shield', title: 'Paiement sécurisé', text: 'Mobile Money, virement ou espèces, et bientôt la carte internationale.' },
  { icon: 'store', title: 'Disponibilité en temps réel', text: 'Vous voyez si un meuble est en stock, en stock limité ou fabriqué à la commande.' },
];

const STEPS = [
  { title: 'Contactez-nous', text: 'Présentez votre activité et vos créations via le formulaire partenaire.' },
  { title: 'Nous numérisons', text: 'Photos, fiches techniques, variantes, plans et modèles 3D.' },
  { title: 'Vous vendez', text: 'Votre catalogue est en ligne et vos commandes arrivent dans votre espace.' },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

  .sv-page {
    --sv-ink: #1d2a22;
    --sv-forest: #22332a;
    --sv-forest-2: #2e4236;
    --sv-accent: #5f7a65;
    --sv-accent-hover: #4a6350;
    --sv-text: #3b4a40;
    --sv-muted: #66736a;
    --sv-light: #f4f6f2;
    --sv-mist: #e9eee7;
    --sv-line: #dde3da;
    --sv-brass: #c0975a;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
    --ease: cubic-bezier(.22,.8,.24,1);
    background: #fff; color: var(--sv-text); overflow: hidden;
    font-family: var(--font-body); font-size: 15px; -webkit-font-smoothing: antialiased;
  }
  .sv-page *, .sv-page *::before, .sv-page *::after { box-sizing: border-box; }
  .sv-page :focus-visible { outline: 2px solid var(--sv-brass); outline-offset: 3px; }
  .sv-wrap { width: min(1380px, calc(100% - 80px)); margin: 0 auto; }

  .sv-page .rv {
    opacity: 0; transform: translateY(34px);
    transition: opacity .9s var(--ease), transform .9s var(--ease);
    transition-delay: var(--d, 0ms);
  }
  .sv-page .rv.in { opacity: 1; transform: none; }

  .sv-eyebrow { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 16px; color: var(--sv-accent); font-size: 13px; font-weight: 700; letter-spacing: .02em; }
  .sv-eyebrow::before { content: ''; width: 34px; height: 2px; background: var(--sv-brass); }
  .sv-title { margin: 0; color: var(--sv-ink); font-family: var(--font-display); font-size: clamp(2rem, 3.6vw, 3.3rem); font-weight: 600; letter-spacing: -.025em; line-height: 1.1; }
  .sv-sub { max-width: 520px; margin: 16px 0 0; color: var(--sv-muted); font-size: 16.5px; line-height: 1.7; }

  .sv-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 14px; min-height: 56px; padding: 0 32px;
    border-radius: 999px; background: var(--sv-forest); border: 1px solid var(--sv-forest); color: #fff;
    font-size: 15px; font-weight: 700; text-decoration: none;
    transition: background .3s, transform .35s var(--ease), box-shadow .35s;
  }
  .sv-btn:hover { background: var(--sv-accent); border-color: var(--sv-accent); transform: translateY(-3px); box-shadow: 0 16px 32px rgba(34,51,42,.25); }
  .sv-btn svg { transition: transform .35s var(--ease); }
  .sv-btn:hover svg { transform: translateX(5px); }
  .sv-btn.is-brass { background: var(--sv-brass); border-color: var(--sv-brass); color: #1d2a22; }
  .sv-btn.is-brass:hover { background: #d3aa6c; border-color: #d3aa6c; box-shadow: 0 16px 32px rgba(0,0,0,.28); }

  /* HERO */
  .sv-hero { position: relative; min-height: 620px; display: flex; align-items: flex-end; background: var(--sv-forest); color: #fff; overflow: hidden; isolation: isolate; }
  .sv-hero-bg { position: absolute; inset: 0; z-index: -1; }
  .sv-hero-bg img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.15); animation: sv-zoom 16s ease-out forwards; }
  @keyframes sv-zoom { to { transform: scale(1); } }
  .sv-hero-bg::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(20,32,25,.93) 0%, rgba(20,32,25,.7) 52%, rgba(20,32,25,.28) 100%), linear-gradient(0deg, rgba(20,32,25,.7), transparent 45%);
  }
  .sv-hero-fallback { position: absolute; inset: 0; background: radial-gradient(circle at 78% 35%, rgba(192,151,90,.3), transparent 42%), linear-gradient(135deg, #1a271f, #2e4236 65%, #3b5444); }
  .sv-hero-inner { position: relative; padding: 150px 0 90px; }
  .sv-crumb { display: flex; gap: 10px; margin-bottom: 26px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,.72); opacity: 0; animation: sv-up .8s var(--ease) .05s forwards; }
  .sv-crumb a { color: inherit; text-decoration: none; transition: color .25s; }
  .sv-crumb a:hover { color: var(--sv-brass); }
  .sv-hero h1 { max-width: 920px; margin: 0; font-family: var(--font-display); font-size: clamp(2.8rem, 6vw, 5.4rem); line-height: 1.02; letter-spacing: -.04em; font-weight: 700; }
  .sv-line { display: block; overflow: hidden; padding-bottom: .12em; margin-bottom: -.12em; }
  .sv-line > span { display: block; transform: translateY(112%); animation: sv-rise 1.1s var(--ease) forwards; animation-delay: calc(.15s + var(--i, 0) * .14s); }
  .sv-hero h1 .sv-line:last-child { color: var(--sv-brass); font-style: italic; font-weight: 600; }
  @keyframes sv-rise { to { transform: none; } }
  @keyframes sv-up { from { transform: translateY(20px); } to { opacity: 1; transform: none; } }
  .sv-hero p { max-width: 560px; margin: 30px 0 32px; color: rgba(255,255,255,.88); font-size: 18px; line-height: 1.7; opacity: 0; animation: sv-up .9s var(--ease) .75s forwards; }
  .sv-anchors { display: flex; flex-wrap: wrap; gap: 10px; opacity: 0; animation: sv-up .9s var(--ease) .95s forwards; }
  .sv-anchors a {
    padding: 12px 22px; border: 1px solid rgba(255,255,255,.35); border-radius: 999px; color: #fff;
    font-size: 14px; font-weight: 600; text-decoration: none; backdrop-filter: blur(6px);
    transition: background .3s, border-color .3s, color .3s, transform .35s var(--ease);
  }
  .sv-anchors a:hover { background: var(--sv-brass); border-color: var(--sv-brass); color: #1d2a22; transform: translateY(-3px); }

  /* SERVICES PARTENAIRES */
  .sv-main { padding: 130px 0 120px; }
  .sv-main-grid { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: 80px; align-items: start; }
  .sv-aside { position: sticky; top: 120px; }
  .sv-toc { list-style: none; margin: 40px 0 0; padding: 0; display: flex; flex-direction: column; border-top: 1px solid var(--sv-line); }
  .sv-toc a {
    display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 4px;
    border-bottom: 1px solid var(--sv-line); color: var(--sv-muted); font-size: 16px; font-weight: 600; text-decoration: none;
    transition: color .3s, padding-left .45s var(--ease);
  }
  .sv-toc a::after { content: ''; width: 0; height: 2px; background: var(--sv-brass); transition: width .5s var(--ease); }
  .sv-toc a:hover { color: var(--sv-ink); }
  .sv-toc a.is-on { color: var(--sv-ink); padding-left: 14px; }
  .sv-toc a.is-on::after { width: 46px; }

  .sv-list { display: flex; flex-direction: column; gap: 24px; }
  .sv-item {
    display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 30px; padding: 40px; scroll-margin-top: 110px;
    border-radius: 26px; background: var(--sv-light); border: 1px solid transparent;
    transition: transform .5s var(--ease), background .4s, box-shadow .5s, border-color .4s;
  }
  .sv-item:hover { transform: translateY(-8px); background: #fff; border-color: var(--sv-line); box-shadow: 0 30px 60px rgba(34,51,42,.12); }
  .sv-item-ico {
    width: 76px; height: 76px; display: grid; place-items: center; border-radius: 22px;
    background: var(--sv-forest); color: var(--sv-brass); transition: transform .6s var(--ease);
  }
  .sv-item:hover .sv-item-ico { transform: rotate(-8deg) scale(1.08); }
  .sv-item h3 { margin: 4px 0 12px; color: var(--sv-ink); font-family: var(--font-display); font-size: 1.8rem; font-weight: 600; letter-spacing: -.02em; line-height: 1.2; }
  .sv-item p { margin: 0; color: var(--sv-text); font-size: 16.5px; line-height: 1.75; }
  .sv-points { list-style: none; margin: 26px 0 0; padding: 22px 0 0; border-top: 1px solid var(--sv-line); display: flex; flex-direction: column; gap: 14px; }
  .sv-points li { display: flex; align-items: flex-start; gap: 14px; color: var(--sv-ink); font-size: 15.5px; font-weight: 500; line-height: 1.5; }
  .sv-points i { flex: 0 0 auto; width: 26px; height: 26px; margin-top: -1px; display: grid; place-items: center; border-radius: 50%; background: var(--sv-brass); color: #1d2a22; }

  /* 3D */
  .sv-3d { position: relative; background: var(--sv-forest); color: #fff; overflow: hidden; }
  .sv-3d::before {
    content: ''; position: absolute; inset: 0; opacity: .5;
    background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at 70% 50%, #000, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at 70% 50%, #000, transparent 70%);
  }
  .sv-3d-grid { position: relative; display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 70px; align-items: center; padding: 120px 0; }
  .sv-3d .sv-eyebrow { color: var(--sv-brass); }
  .sv-3d h2 { margin: 0; font-family: var(--font-display); font-size: clamp(2.2rem, 3.8vw, 3.6rem); font-weight: 600; letter-spacing: -.025em; line-height: 1.1; }
  .sv-3d-copy p { max-width: 440px; margin: 24px 0 36px; color: #bccbc0; font-size: 17px; line-height: 1.75; }
  .sv-3d-visual {
    position: relative; min-height: 440px; border-radius: 28px; overflow: hidden; display: grid; place-items: center;
    background: var(--sv-forest-2); box-shadow: 0 40px 90px rgba(0,0,0,.35);
  }
  .sv-3d-visual > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .75; }
  .sv-3d-visual::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle, rgba(34,51,42,0) 30%, rgba(34,51,42,.55) 100%); }
  .sv-cube-scene { position: relative; z-index: 2; width: 150px; height: 150px; perspective: 700px; }
  .sv-cube { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; animation: sv-cube 16s linear infinite; }
  .sv-cube span { position: absolute; inset: 0; border: 1.5px solid rgba(255,255,255,.85); background: rgba(192,151,90,.12); }
  .sv-cube span:nth-child(1) { transform: translateZ(75px); }
  .sv-cube span:nth-child(2) { transform: rotateY(180deg) translateZ(75px); }
  .sv-cube span:nth-child(3) { transform: rotateY(90deg) translateZ(75px); }
  .sv-cube span:nth-child(4) { transform: rotateY(-90deg) translateZ(75px); }
  .sv-cube span:nth-child(5) { transform: rotateX(90deg) translateZ(75px); }
  .sv-cube span:nth-child(6) { transform: rotateX(-90deg) translateZ(75px); }
  @keyframes sv-cube { from { transform: rotateX(-24deg) rotateY(0); } to { transform: rotateX(-24deg) rotateY(360deg); } }

  /* CLIENTS */
  .sv-clients { padding: 130px 0 110px; }
  .sv-clients-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-top: 56px; }
  .sv-client {
    position: relative; padding: 38px 32px 36px; border-radius: 22px; overflow: hidden;
    background: var(--sv-light); border: 1px solid transparent;
    transition: transform .5s var(--ease), background .4s, box-shadow .5s, border-color .4s;
  }
  .sv-client::before { content: ''; position: absolute; left: 0; top: 0; height: 4px; width: 100%; background: var(--sv-brass); transform: scaleX(0); transform-origin: left; transition: transform .6s var(--ease); }
  .sv-client:hover { transform: translateY(-10px); background: #fff; border-color: var(--sv-line); box-shadow: 0 30px 60px rgba(34,51,42,.12); }
  .sv-client:hover::before { transform: scaleX(1); }
  .sv-client-ico { width: 72px; height: 72px; margin-bottom: 28px; display: grid; place-items: center; border-radius: 20px; background: var(--sv-forest); color: var(--sv-brass); transition: transform .6s var(--ease); }
  .sv-client:hover .sv-client-ico { transform: rotate(-8deg) scale(1.08); }
  .sv-client strong { display: block; color: var(--sv-ink); font-family: var(--font-display); font-size: 22px; font-weight: 600; line-height: 1.3; }
  .sv-client p { margin: 12px 0 0; color: var(--sv-muted); font-size: 15.5px; line-height: 1.7; }

  /* ÉTAPES */
  .sv-steps { padding: 0 0 130px; }
  .sv-steps-list { position: relative; list-style: none; margin: 64px 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; counter-reset: step; }
  .sv-steps-list::before {
    content: ''; position: absolute; top: 28px; left: 28px; right: 28px; height: 2px;
    background: linear-gradient(90deg, var(--sv-brass), rgba(192,151,90,.15));
    transform: scaleX(0); transform-origin: left; transition: transform 1.8s var(--ease) .2s;
  }
  .sv-steps-list.in::before { transform: scaleX(1); }
  .sv-steps-list li { position: relative; counter-increment: step; padding-right: 10px; }
  .sv-steps-list li::before {
    content: counter(step); position: relative; z-index: 1; display: grid; place-items: center;
    width: 58px; height: 58px; margin-bottom: 28px; border-radius: 50%;
    background: var(--sv-forest); color: var(--sv-brass); font-family: var(--font-display); font-weight: 700; font-size: 22px;
    box-shadow: 0 0 0 8px #fff; transition: transform .5s var(--ease);
  }
  .sv-steps-list li:hover::before { transform: scale(1.12) rotate(-6deg); }
  .sv-steps-list strong { display: block; color: var(--sv-ink); font-family: var(--font-display); font-size: 24px; font-weight: 600; line-height: 1.3; }
  .sv-steps-list p { max-width: 320px; margin: 12px 0 0; color: var(--sv-muted); font-size: 16px; line-height: 1.7; }

  /* CTA */
  .sv-cta { position: relative; background: var(--sv-forest); color: #fff; overflow: hidden; }
  .sv-cta::after {
    content: ''; position: absolute; right: -140px; top: -140px; width: 480px; height: 480px; border-radius: 50%;
    border: 2px solid var(--sv-brass); opacity: .3; animation: sv-pulse 6s ease-in-out infinite;
  }
  @keyframes sv-pulse { 50% { transform: scale(1.18); opacity: .12; } }
  .sv-cta-inner { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 40px; align-items: center; padding: 100px 0; }
  .sv-cta h2 { margin: 0; max-width: 680px; font-family: var(--font-display); font-size: clamp(2rem, 3.8vw, 3.5rem); font-weight: 600; letter-spacing: -.025em; line-height: 1.1; }
  .sv-cta p { max-width: 480px; margin: 20px 0 0; color: #c4d2c8; font-size: 17px; line-height: 1.7; }

  @media (max-width: 1100px) {
    .sv-wrap { width: calc(100% - 56px); }
    .sv-main-grid { grid-template-columns: 1fr; gap: 50px; }
    .sv-aside { position: static; }
    .sv-3d-grid { grid-template-columns: 1fr; gap: 50px; padding: 90px 0; }
    .sv-clients-grid { grid-template-columns: 1fr; }
    .sv-steps-list { grid-template-columns: 1fr; gap: 44px; }
    .sv-steps-list::before { display: none; }
    .sv-cta-inner { grid-template-columns: 1fr; padding: 80px 0; }
  }
  @media (max-width: 760px) {
    .sv-wrap { width: calc(100% - 36px); }
    .sv-hero { min-height: 520px; }
    .sv-hero-inner { padding: 110px 0 60px; }
    .sv-main { padding: 80px 0; }
    .sv-item { grid-template-columns: 1fr; padding: 30px 24px; gap: 22px; }
    .sv-3d-visual { min-height: 320px; }
    .sv-clients { padding: 80px 0; }
    .sv-steps { padding-bottom: 80px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sv-page *, .sv-page *::before, .sv-page *::after { animation: none !important; transition: none !important; }
    .sv-page .rv { opacity: 1; transform: none; }
    .sv-line > span, .sv-crumb, .sv-hero p, .sv-anchors { transform: none; opacity: 1; }
    .sv-hero-bg img { transform: none; }
    .sv-steps-list::before { transform: scaleX(1); }
  }
`;

export default function ServicesPage() {
  const [heroOk, setHeroOk] = useState(true);
  const [scanOk, setScanOk] = useState(true);
  const [activeId, setActiveId] = useState(SERVICES[0].id);
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

  // Met en évidence le service visible dans le sommaire
  useEffect(() => {
    const root = pageRef.current;
    if (!root || !('IntersectionObserver' in window)) return;

    const targets = SERVICES
      .map((s) => root.querySelector<HTMLElement>(`#${s.id}`))
      .filter(Boolean) as HTMLElement[];

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  return (
    <>
      <style>{styles}</style>

      <div className="sv-page" ref={pageRef}>
        {/* HERO */}
        <section className="sv-hero">
          <div className="sv-hero-bg">
            {heroOk ? (
              <img src={HERO_IMAGE} alt="" onError={() => setHeroOk(false)} />
            ) : (
              <div className="sv-hero-fallback" />
            )}
          </div>

          <div className="sv-wrap sv-hero-inner">
            <nav className="sv-crumb" aria-label="Fil d’Ariane">
              <Link to="/">Accueil</Link><span>/</span><span>Services</span>
            </nav>

            <h1>
              <span className="sv-line" style={{ ['--i' as any]: 0 }}>
                <span>Tout pour présenter et vendre</span>
              </span>
              <span className="sv-line" style={{ ['--i' as any]: 1 }}>
                <span>vos créations en ligne</span>
              </span>
            </h1>

            <p>
              ARCHILAB accompagne les concepteurs et fabricants, et simplifie le choix
              pour les clients : numérisation, stock, devis et accompagnement.
            </p>

            <div className="sv-anchors">
              {SERVICES.map((s) => (
                <a key={s.id} href={`#${s.id}`} onClick={(e) => scrollTo(e, s.id)}>
                  {s.title}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICES PARTENAIRES */}
        <section className="sv-main">
          <div className="sv-wrap sv-main-grid">
            <div className="sv-aside rv">
              <span className="sv-eyebrow">Pour les partenaires</span>
              <h2 className="sv-title">Nos services pour les partenaires</h2>
              <p className="sv-sub">
                Quatre services pour structurer votre catalogue et développer vos ventes.
              </p>

              <ul className="sv-toc">
                {SERVICES.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={activeId === s.id ? 'is-on' : ''}
                      onClick={(e) => scrollTo(e, s.id)}
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sv-list">
              {SERVICES.map((s, i) => (
                <article
                  className="sv-item rv"
                  id={s.id}
                  key={s.id}
                  style={{ ['--d' as any]: `${(i % 2) * 90}ms` }}
                >
                  <div className="sv-item-ico"><Ico name={s.icon} size={32} /></div>

                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>

                    <ul className="sv-points">
                      {s.points.map((pt) => (
                        <li key={pt}>
                          <i><Ico name="check" size={14} /></i>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* BANDEAU 3D */}
        <section className="sv-3d">
          <div className="sv-wrap sv-3d-grid">
            <div className="sv-3d-copy rv">
              <span className="sv-eyebrow">Numérisation</span>
              <h2>Vos meubles, sous tous les angles</h2>
              <p>
                Un modèle 3D et des plans 2D rassurent vos clients et réduisent les
                hésitations avant l’achat. Nous nous occupons de la numérisation.
              </p>
              <Link to="/catalogue" className="sv-btn is-brass">
                Voir des exemples <IconArrowRight size={16} />
              </Link>
            </div>

            <div className="sv-3d-visual rv" style={{ ['--d' as any]: '150ms' }}>
              {scanOk && (
                <img
                  src={SCAN_IMAGE}
                  alt="Meuble en modélisation 3D"
                  loading="lazy"
                  onError={() => setScanOk(false)}
                />
              )}

              <div className="sv-cube-scene" aria-hidden="true">
                <div className="sv-cube">
                  <span /><span /><span /><span /><span /><span />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES CLIENTS */}
        <section className="sv-clients">
          <div className="sv-wrap">
            <div className="rv">
              <span className="sv-eyebrow">Pour les clients</span>
              <h2 className="sv-title">Et pour les clients</h2>
              <p className="sv-sub">Choisir un meuble en toute confiance, de chez vous.</p>
            </div>

            <div className="sv-clients-grid">
              {CLIENT_SERVICES.map((c, i) => (
                <div
                  className="sv-client rv"
                  key={c.title}
                  style={{ ['--d' as any]: `${i * 100}ms` }}
                >
                  <div className="sv-client-ico"><Ico name={c.icon} size={30} /></div>
                  <strong>{c.title}</strong>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ÉTAPES */}
        <section className="sv-steps">
          <div className="sv-wrap">
            <div className="rv">
              <span className="sv-eyebrow">Rejoindre ARCHILAB</span>
              <h2 className="sv-title">Démarrer en trois étapes</h2>
              <p className="sv-sub">Rejoindre ARCHILAB en tant que partenaire.</p>
            </div>

            <ol className="sv-steps-list rv">
              {STEPS.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="sv-cta">
          <div className="sv-wrap sv-cta-inner">
            <div className="rv">
              <h2>Vous êtes concepteur ou fabricant ?</h2>
              <p>Rejoignez notre réseau de partenaires et donnez une nouvelle visibilité à vos créations.</p>
            </div>

            <Link to="/partenaires" className="sv-btn is-brass">
              Devenir partenaire <IconArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
