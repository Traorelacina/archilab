import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconCube } from '../../components/ui/Icons';

/* Placez vos visuels dans /public/images/ (ou changez les chemins ici) */
const HERO_IMAGE = '/images/a-propos-hero.jpg';
const STORY_IMAGE = '/images/a-propos-atelier.jpg';

const PATHS: Record<string, string[]> = {
  diamond: ['M6 3h12l4 6-10 13L2 9z', 'M2 9h20'],
  doc: ['M6 2h9l5 5v15H6z', 'M14 2v6h6', 'M9 13h8M9 17h8'],
  shield: ['M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', 'M9 12l2 2 4-4'],
  users: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8z', 'M23 21v-2a4 4 0 00-3-3.9', 'M16 3.1a4 4 0 010 7.8'],
  sofa: ['M4 11V8a3 3 0 013-3h10a3 3 0 013 3v3', 'M2 13a2 2 0 014 0v2h12v-2a2 2 0 014 0v5H2z', 'M5 18v2M19 18v2'],
  chart: ['M3 3v18h18', 'M7 15v3M12 10v8M17 6v12'],
  trophy: ['M8 21h8M12 17v4', 'M7 4h10v5a5 5 0 01-10 0z', 'M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3'],
  pen: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z'],
  store: ['M3 9l2-5h14l2 5', 'M3 9v11h18V9', 'M9 20v-6h6v6'],
  pin: ['M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z', 'M12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'],
};

function Ico({ name, size = 26 }: { name: string; size?: number }) {
  if (name === 'cube') return <IconCube size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(PATHS[name] ?? []).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const VALUES = [
  { icon: 'diamond', title: 'Valoriser le savoir-faire local', text: 'Nous mettons en lumière les artisans, designers et fabricants ivoiriens et leur donnons les moyens de rayonner.' },
  { icon: 'doc', title: 'Transparence', text: 'Dimensions, matériaux, finitions, délais de fabrication : chaque fiche produit dit tout avant d’acheter.' },
  { icon: 'shield', title: 'Confiance', text: 'Stock en temps réel, paiement sécurisé par Mobile Money ou virement, et un suivi clair de chaque commande.' },
  { icon: 'cube', title: 'Innovation', text: 'Modèles 3D, plans 2D téléchargeables et bientôt la réalité augmentée pour se projeter chez soi.' },
];

const STEPS = [
  { title: 'Les partenaires numérisent', text: 'Concepteurs et fabricants présentent leurs créations : photos, fiches techniques, variantes, plans 2D/3D.' },
  { title: 'Vous explorez et comparez', text: 'Parcourez les catégories, comparez prix, matériaux et disponibilités, visualisez les meubles en 3D.' },
  { title: 'Vous commandez simplement', text: 'Ajoutez au panier et payez par Mobile Money, virement ou espèces. Le partenaire prépare ou fabrique.' },
  { title: 'Vous êtes livré', text: 'Suivez votre commande jusqu’à votre intérieur, à Abidjan et bientôt dans toute l’UEMOA.' },
];

const STATS: {
  icon: string; to?: number; prefix?: string; suffix?: string;
  decimals?: number; big?: string; text: string;
}[] = [
  { icon: 'sofa', prefix: '+ ', to: 200, text: 'références de mobilier la première année' },
  { icon: 'users', prefix: '+ ', to: 10, text: 'partenariats avec des concepteurs' },
  { icon: 'chart', to: 99.5, decimals: 1, suffix: ' %', text: 'de disponibilité de la plateforme' },
  { icon: 'trophy', big: 'Une ambition', text: 'Devenir la référence en Côte d’Ivoire et dans l’UEMOA' },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

  .ap-page {
    --ap-ink: #1d2a22;
    --ap-forest: #22332a;
    --ap-forest-2: #2e4236;
    --ap-accent: #5f7a65;
    --ap-accent-hover: #4a6350;
    --ap-text: #3b4a40;
    --ap-muted: #66736a;
    --ap-light: #f4f6f2;
    --ap-mist: #e9eee7;
    --ap-line: #dde3da;
    --ap-brass: #c0975a;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
    --ease: cubic-bezier(.22,.8,.24,1);
    background: #fff; color: var(--ap-text); overflow: hidden;
    font-family: var(--font-body); font-size: 15px; -webkit-font-smoothing: antialiased;
  }
  .ap-page *, .ap-page *::before, .ap-page *::after { box-sizing: border-box; }
  .ap-page :focus-visible { outline: 2px solid var(--ap-brass); outline-offset: 3px; }
  .ap-wrap { width: min(1380px, calc(100% - 80px)); margin: 0 auto; }

  .ap-page .rv {
    opacity: 0; transform: translateY(34px);
    transition: opacity .9s var(--ease), transform .9s var(--ease);
    transition-delay: var(--d, 0ms);
  }
  .ap-page .rv.in { opacity: 1; transform: none; }

  .ap-eyebrow {
    display: inline-flex; align-items: center; gap: 12px; margin-bottom: 16px;
    color: var(--ap-accent); font-size: 13px; font-weight: 700; letter-spacing: .02em;
  }
  .ap-eyebrow::before { content: ''; width: 34px; height: 2px; background: var(--ap-brass); }
  .ap-title {
    margin: 0; color: var(--ap-ink); font-family: var(--font-display);
    font-size: clamp(2rem, 3.6vw, 3.3rem); font-weight: 600; letter-spacing: -.025em; line-height: 1.1;
  }
  .ap-sub { max-width: 520px; margin: 16px 0 0; color: var(--ap-muted); font-size: 16.5px; line-height: 1.7; }

  .ap-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 14px;
    min-height: 56px; padding: 0 32px; border-radius: 999px;
    background: var(--ap-forest); border: 1px solid var(--ap-forest); color: #fff;
    font-size: 15px; font-weight: 700; text-decoration: none;
    transition: background .3s, transform .35s var(--ease), box-shadow .35s;
  }
  .ap-btn:hover { background: var(--ap-accent); border-color: var(--ap-accent); transform: translateY(-3px); box-shadow: 0 16px 32px rgba(34,51,42,.25); }
  .ap-btn svg { transition: transform .35s var(--ease); }
  .ap-btn:hover svg { transform: translateX(5px); }
  .ap-btn.is-brass { background: var(--ap-brass); border-color: var(--ap-brass); color: #1d2a22; }
  .ap-btn.is-brass:hover { background: #d3aa6c; border-color: #d3aa6c; box-shadow: 0 16px 32px rgba(0,0,0,.28); }

  /* HERO */
  .ap-hero {
    position: relative; min-height: 620px; display: flex; align-items: flex-end;
    background: var(--ap-forest); color: #fff; overflow: hidden; isolation: isolate;
  }
  .ap-hero-bg { position: absolute; inset: 0; z-index: -1; }
  .ap-hero-bg img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transform: scale(1.15); animation: ap-zoom 16s ease-out forwards;
  }
  @keyframes ap-zoom { to { transform: scale(1); } }
  .ap-hero-bg::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(20,32,25,.93) 0%, rgba(20,32,25,.7) 52%, rgba(20,32,25,.28) 100%),
                linear-gradient(0deg, rgba(20,32,25,.7), transparent 45%);
  }
  .ap-hero-fallback {
    position: absolute; inset: 0;
    background: radial-gradient(circle at 78% 35%, rgba(192,151,90,.3), transparent 42%), linear-gradient(135deg, #1a271f, #2e4236 65%, #3b5444);
  }
  .ap-hero-inner { position: relative; padding: 150px 0 90px; }
  .ap-crumb {
    display: flex; gap: 10px; margin-bottom: 26px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,.72);
    opacity: 0; animation: ap-up .8s var(--ease) .05s forwards;
  }
  .ap-crumb a { color: inherit; text-decoration: none; transition: color .25s; }
  .ap-crumb a:hover { color: var(--ap-brass); }
  .ap-hero h1 {
    max-width: 880px; margin: 0; font-family: var(--font-display);
    font-size: clamp(2.8rem, 6vw, 5.6rem); line-height: 1.02; letter-spacing: -.04em; font-weight: 700;
  }
  .ap-line { display: block; overflow: hidden; padding-bottom: .12em; margin-bottom: -.12em; }
  .ap-line > span {
    display: block; transform: translateY(112%);
    animation: ap-rise 1.1s var(--ease) forwards; animation-delay: calc(.15s + var(--i, 0) * .14s);
  }
  .ap-hero h1 .ap-line:last-child { color: var(--ap-brass); font-style: italic; font-weight: 600; }
  @keyframes ap-rise { to { transform: none; } }
  @keyframes ap-up { to { opacity: 1; transform: none; } }
  .ap-hero p {
    max-width: 560px; margin: 30px 0 0; color: rgba(255,255,255,.88); font-size: 18px; line-height: 1.7;
    opacity: 0; transform: translateY(22px); animation: ap-up .9s var(--ease) .75s forwards;
  }

  /* HISTOIRE */
  .ap-story { padding: 130px 0 70px; }
  .ap-story-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 90px; align-items: center; }
  .ap-story-copy p { margin: 22px 0 0; color: var(--ap-text); font-size: 17px; line-height: 1.8; max-width: 540px; }
  .ap-story-copy p:first-of-type { margin-top: 28px; }
  .ap-quote {
    margin: 36px 0 0; padding-left: 22px; border-left: 4px solid var(--ap-brass);
    color: var(--ap-ink); font-family: var(--font-display); font-size: clamp(1.4rem, 2vw, 1.9rem);
    line-height: 1.3; font-weight: 600; font-style: italic; max-width: 480px;
  }
  .ap-story-visual { position: relative; }
  .ap-story-visual::before {
    content: ''; position: absolute; inset: 28px -28px -28px 28px; z-index: 0;
    border: 2px solid var(--ap-brass); border-radius: 28px;
    transition: transform .8s var(--ease);
  }
  .ap-story-visual:hover::before { transform: translate(10px, 10px); }
  .ap-story-img {
    position: relative; z-index: 1; aspect-ratio: 4 / 4.6; border-radius: 28px; overflow: hidden;
    background: var(--ap-mist); display: grid; place-items: center; color: var(--ap-accent);
    box-shadow: 0 40px 80px rgba(34,51,42,.2);
  }
  .ap-story-img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 1.2s var(--ease); }
  .ap-story-visual:hover .ap-story-img img { transform: scale(1.05); }

  /* MISSION / VISION */
  .ap-mv { padding: 60px 0 120px; }
  .ap-mv-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
  .ap-mv-card {
    position: relative; padding: 54px 48px; border-radius: 26px; overflow: hidden;
    background: var(--ap-light); border: 1px solid var(--ap-line);
    transition: transform .5s var(--ease), box-shadow .5s;
  }
  .ap-mv-card:hover { transform: translateY(-8px); box-shadow: 0 30px 60px rgba(34,51,42,.14); }
  .ap-mv-card .ap-ico {
    width: 64px; height: 64px; margin-bottom: 28px; display: grid; place-items: center;
    border-radius: 18px; background: var(--ap-forest); color: var(--ap-brass);
  }
  .ap-mv-card h3 { margin: 0 0 14px; color: var(--ap-ink); font-family: var(--font-display); font-size: 1.9rem; font-weight: 600; letter-spacing: -.02em; }
  .ap-mv-card p { margin: 0; color: var(--ap-text); font-size: 16.5px; line-height: 1.8; }
  .ap-mv-card.is-dark { background: var(--ap-forest); border-color: var(--ap-forest); }
  .ap-mv-card.is-dark .ap-ico { background: var(--ap-brass); color: #1d2a22; }
  .ap-mv-card.is-dark h3 { color: #fff; }
  .ap-mv-card.is-dark p { color: #c4d2c8; }

  /* VALEURS */
  .ap-values { padding: 0 0 130px; }
  .ap-values-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin-top: 56px; }
  .ap-value {
    position: relative; padding: 38px 30px 34px; border-radius: 22px; overflow: hidden;
    background: var(--ap-light); border: 1px solid transparent;
    transition: transform .5s var(--ease), background .4s, box-shadow .5s, border-color .4s;
  }
  .ap-value::before {
    content: ''; position: absolute; left: 0; top: 0; height: 4px; width: 100%;
    background: var(--ap-brass); transform: scaleX(0); transform-origin: left; transition: transform .6s var(--ease);
  }
  .ap-value:hover { transform: translateY(-10px); background: #fff; border-color: var(--ap-line); box-shadow: 0 30px 60px rgba(34,51,42,.12); }
  .ap-value:hover::before { transform: scaleX(1); }
  .ap-value-ico {
    width: 72px; height: 72px; margin-bottom: 28px; display: grid; place-items: center;
    border-radius: 20px; background: var(--ap-forest); color: var(--ap-brass); transition: transform .6s var(--ease);
  }
  .ap-value:hover .ap-value-ico { transform: rotate(-8deg) scale(1.08); }
  .ap-value strong { display: block; color: var(--ap-ink); font-family: var(--font-display); font-size: 21px; font-weight: 600; line-height: 1.3; }
  .ap-value p { margin: 12px 0 0; color: var(--ap-muted); font-size: 15.5px; line-height: 1.7; }

  /* PROCESSUS */
  .ap-flow { position: relative; background: var(--ap-forest); color: #fff; padding: 130px 0; overflow: hidden; }
  .ap-flow::before {
    content: ''; position: absolute; inset: 0; opacity: .5;
    background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at 20% 0%, #000, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at 20% 0%, #000, transparent 70%);
  }
  .ap-flow .ap-wrap { position: relative; }
  .ap-flow .ap-eyebrow { color: var(--ap-brass); }
  .ap-flow .ap-title { color: #fff; }
  .ap-flow .ap-sub { color: #bccbc0; }
  .ap-flow-list {
    position: relative; list-style: none; margin: 70px 0 0; padding: 0;
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px; counter-reset: step;
  }
  .ap-flow-list::before {
    content: ''; position: absolute; top: 28px; left: 28px; right: 28px; height: 2px;
    background: linear-gradient(90deg, var(--ap-brass), rgba(192,151,90,.15));
    transform: scaleX(0); transform-origin: left; transition: transform 1.8s var(--ease) .2s;
  }
  .ap-flow-list.in::before { transform: scaleX(1); }
  .ap-flow-list li { position: relative; counter-increment: step; padding-right: 10px; }
  .ap-flow-list li::before {
    content: counter(step); position: relative; z-index: 1; display: grid; place-items: center;
    width: 58px; height: 58px; margin-bottom: 28px; border-radius: 50%;
    background: var(--ap-brass); color: #1d2a22; font-family: var(--font-display); font-weight: 700; font-size: 22px;
    box-shadow: 0 0 0 8px var(--ap-forest);
    transition: transform .5s var(--ease);
  }
  .ap-flow-list li:hover::before { transform: scale(1.12) rotate(-6deg); }
  .ap-flow-list strong { display: block; font-family: var(--font-display); font-size: 21px; font-weight: 600; line-height: 1.3; }
  .ap-flow-list p { margin: 12px 0 0; color: #bccbc0; font-size: 15.5px; line-height: 1.7; }

  /* CHIFFRES */
  .ap-stats { padding: 130px 0 90px; }
  .ap-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 60px; border-top: 2px solid var(--ap-ink); }
  .ap-stat { padding: 34px 28px 10px 28px; border-left: 1px solid var(--ap-line); }
  .ap-stat:first-child { border-left: 0; padding-left: 0; }
  .ap-stat > svg { color: var(--ap-brass); margin-bottom: 22px; }
  .ap-stat strong {
    display: block; color: var(--ap-ink); font-family: var(--font-display);
    font-size: clamp(2.3rem, 3.8vw, 3.8rem); font-weight: 700; letter-spacing: -.03em; line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .ap-stat span { display: block; margin-top: 14px; max-width: 230px; color: var(--ap-muted); font-size: 15px; line-height: 1.6; }

  /* CTA */
  .ap-cta { padding: 40px 0 130px; }
  .ap-cta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
  .ap-cta-card {
    position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
    padding: 60px 52px; border-radius: 28px; overflow: hidden; background: var(--ap-mist);
    transition: transform .5s var(--ease), box-shadow .5s;
  }
  .ap-cta-card:hover { transform: translateY(-8px); box-shadow: 0 34px 70px rgba(34,51,42,.18); }
  .ap-cta-card::after {
    content: ''; position: absolute; right: -90px; bottom: -90px; width: 260px; height: 260px; border-radius: 50%;
    border: 2px solid var(--ap-brass); opacity: .35; transition: transform .8s var(--ease);
  }
  .ap-cta-card:hover::after { transform: scale(1.3); }
  .ap-cta-card h3 { margin: 0; max-width: 420px; color: var(--ap-ink); font-family: var(--font-display); font-size: clamp(1.7rem, 2.5vw, 2.4rem); font-weight: 600; letter-spacing: -.02em; line-height: 1.15; }
  .ap-cta-card p { margin: 14px 0 28px; max-width: 420px; color: var(--ap-text); font-size: 16.5px; line-height: 1.7; }
  .ap-cta-card.is-dark { background: var(--ap-forest); }
  .ap-cta-card.is-dark h3 { color: #fff; }
  .ap-cta-card.is-dark p { color: #c4d2c8; }

  @media (max-width: 1100px) {
    .ap-wrap { width: calc(100% - 56px); }
    .ap-story-grid { grid-template-columns: 1fr; gap: 70px; }
    .ap-story-visual { max-width: 520px; margin-right: 28px; }
    .ap-values-grid, .ap-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ap-stat:nth-child(3) { border-left: 0; padding-left: 0; }
    .ap-flow-list { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 50px; }
    .ap-flow-list::before { display: none; }
  }
  @media (max-width: 760px) {
    .ap-wrap { width: calc(100% - 36px); }
    .ap-hero { min-height: 520px; }
    .ap-hero-inner { padding: 110px 0 60px; }
    .ap-story { padding: 80px 0 40px; }
    .ap-mv { padding: 30px 0 80px; }
    .ap-mv-grid, .ap-cta-grid, .ap-values-grid, .ap-stats-grid, .ap-flow-list { grid-template-columns: 1fr; }
    .ap-mv-card { padding: 38px 28px; }
    .ap-cta-card { padding: 44px 28px; }
    .ap-values { padding-bottom: 80px; }
    .ap-flow { padding: 80px 0; }
    .ap-stats { padding: 80px 0 50px; }
    .ap-cta { padding-bottom: 80px; }
    .ap-stat { border-left: 0; padding-left: 0; border-top: 1px solid var(--ap-line); }
    .ap-stat:first-child { border-top: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ap-page *, .ap-page *::before, .ap-page *::after {
      animation: none !important; transition: none !important;
    }
    .ap-page .rv { opacity: 1; transform: none; }
    .ap-line > span, .ap-crumb, .ap-hero p { transform: none; opacity: 1; }
    .ap-hero-bg img { transform: none; }
    .ap-flow-list::before { transform: scaleX(1); }
  }
`;

/** Compteur animé lancé à l'entrée dans le viewport */
function CountUp({
  to, prefix = '', suffix = '', decimals = 0,
}: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      setVal(to);
      return;
    }

    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();

      const start = performance.now();
      const duration = 1800;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setVal(to * (1 - Math.pow(1 - t, 4)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <strong ref={ref}>
      {prefix}
      {val.toLocaleString('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </strong>
  );
}

export default function AProposPage() {
  const [heroOk, setHeroOk] = useState(true);
  const [storyOk, setStoryOk] = useState(true);
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

  return (
    <>
      <style>{styles}</style>

      <div className="ap-page" ref={pageRef}>
        {/* HERO */}
        <section className="ap-hero">
          <div className="ap-hero-bg">
            {heroOk ? (
              <img src={HERO_IMAGE} alt="" onError={() => setHeroOk(false)} />
            ) : (
              <div className="ap-hero-fallback" />
            )}
          </div>

          <div className="ap-wrap ap-hero-inner">
            <nav className="ap-crumb" aria-label="Fil d’Ariane">
              <Link to="/">Accueil</Link><span>/</span><span>À propos</span>
            </nav>

            <h1>
              <span className="ap-line" style={{ ['--i' as any]: 0 }}>
                <span>Le mobilier africain mérite</span>
              </span>
              <span className="ap-line" style={{ ['--i' as any]: 1 }}>
                <span>une vitrine à sa hauteur</span>
              </span>
            </h1>

            <p>
              ARCHILAB est la plateforme qui réunit concepteurs, fabricants et clients
              autour du mobilier de décoration en Côte d’Ivoire.
            </p>
          </div>
        </section>

        {/* HISTOIRE */}
        <section className="ap-story">
          <div className="ap-wrap ap-story-grid">
            <div className="ap-story-copy rv">
              <span className="ap-eyebrow">Qui sommes-nous</span>
              <h2 className="ap-title">Notre histoire</h2>
              <p>
                En Côte d’Ivoire, de nombreux artisans et fabricants créent des meubles remarquables,
                mais ils restent difficiles à trouver, à comparer et à commander. Les clients, eux,
                manquent d’informations fiables : dimensions, matériaux, délais, disponibilité.
              </p>
              <p>
                ARCHILAB est née pour combler cet écart. Nous numérisons les créations locales, les
                présentons avec des fiches techniques complètes et des visuels 2D/3D, et simplifions
                la commande du choix jusqu’à la livraison.
              </p>
              <blockquote className="ap-quote">
                Design local, qualité internationale.
              </blockquote>
            </div>

            <div className="ap-story-visual rv" style={{ ['--d' as any]: '150ms' }}>
              <div className="ap-story-img">
                {storyOk ? (
                  <img
                    src={STORY_IMAGE}
                    alt="Atelier d’un artisan menuisier"
                    loading="lazy"
                    onError={() => setStoryOk(false)}
                  />
                ) : (
                  <Ico name="store" size={72} />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* MISSION / VISION */}
        <section className="ap-mv">
          <div className="ap-wrap ap-mv-grid">
            <div className="ap-mv-card rv">
              <div className="ap-ico"><Ico name="pen" size={30} /></div>
              <h3>Notre mission</h3>
              <p>
                Donner aux créateurs de mobilier une visibilité professionnelle et offrir aux particuliers
                comme aux professionnels un moyen simple, clair et sûr de choisir et commander des meubles
                conçus localement.
              </p>
            </div>

            <div className="ap-mv-card is-dark rv" style={{ ['--d' as any]: '130ms' }}>
              <div className="ap-ico"><Ico name="pin" size={30} /></div>
              <h3>Notre vision</h3>
              <p>
                Devenir la référence du mobilier de décoration en Côte d’Ivoire, puis dans toute la zone
                UEMOA, en faisant du mobilier africain un standard de qualité reconnu à l’international.
              </p>
            </div>
          </div>
        </section>

        {/* VALEURS */}
        <section className="ap-values">
          <div className="ap-wrap">
            <div className="rv">
              <span className="ap-eyebrow">Nos valeurs</span>
              <h2 className="ap-title">Ce qui nous guide</h2>
              <p className="ap-sub">Quatre engagements dans chacune de nos décisions.</p>
            </div>

            <div className="ap-values-grid">
              {VALUES.map((v, i) => (
                <div
                  className="ap-value rv"
                  key={v.title}
                  style={{ ['--d' as any]: `${i * 100}ms` }}
                >
                  <div className="ap-value-ico"><Ico name={v.icon} size={30} /></div>
                  <strong>{v.title}</strong>
                  <p>{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMMENT ÇA MARCHE */}
        <section className="ap-flow">
          <div className="ap-wrap">
            <div className="rv">
              <span className="ap-eyebrow">En 4 étapes</span>
              <h2 className="ap-title">Comment fonctionne ARCHILAB</h2>
              <p className="ap-sub">De l’atelier du créateur jusqu’à votre salon.</p>
            </div>

            <ol className="ap-flow-list rv">
              {STEPS.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CHIFFRES */}
        <section className="ap-stats">
          <div className="ap-wrap">
            <div className="rv">
              <span className="ap-eyebrow">Notre ambition</span>
              <h2 className="ap-title">ARCHILAB en chiffres</h2>
            </div>

            <div className="ap-stats-grid">
              {STATS.map((s, i) => (
                <div
                  className="ap-stat rv"
                  key={s.text}
                  style={{ ['--d' as any]: `${i * 110}ms` }}
                >
                  <Ico name={s.icon} size={34} />

                  {s.to !== undefined ? (
                    <CountUp
                      to={s.to}
                      prefix={s.prefix}
                      suffix={s.suffix}
                      decimals={s.decimals}
                    />
                  ) : (
                    <strong>{s.big}</strong>
                  )}

                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ap-cta">
          <div className="ap-wrap ap-cta-grid">
            <div className="ap-cta-card rv">
              <h3>Envie de meubler votre espace ?</h3>
              <p>Parcourez le catalogue, comparez les modèles et commandez en quelques clics.</p>
              <Link to="/catalogue" className="ap-btn">
                Explorer le catalogue <IconArrowRight size={16} />
              </Link>
            </div>

            <div className="ap-cta-card is-dark rv" style={{ ['--d' as any]: '130ms' }}>
              <h3>Vous êtes concepteur ou fabricant ?</h3>
              <p>Rejoignez notre réseau de partenaires et donnez une nouvelle visibilité à vos créations.</p>
              <Link to="/partenaires" className="ap-btn is-brass">
                Devenir partenaire <IconArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
