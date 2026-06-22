import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.title = 'AgriPulse — Smart Dairy Farm Management';
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.fade-up').forEach(el => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  function handleContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const success = form.querySelector('#contact-success') as HTMLElement;
    const btn     = form.querySelector('.btn-submit') as HTMLButtonElement;
    if (success) success.style.display = 'block';
    if (btn)     btn.textContent = '✓ Sent!';
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-root {
          --green-deep:   #0f3d20;
          --green-mid:    #1a6b38;
          --green-bright: #2da653;
          --green-light:  #e8f5ed;
          --cream:        #faf8f3;
          --amber:        #d4860b;
          --text-dark:    #111a14;
          --text-mid:     #3b4f42;
          --text-muted:   #7a9082;
          --white:        #ffffff;
          --border:       rgba(15,61,32,0.12);
          --radius:       16px;
          --radius-sm:    8px;

          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--text-dark);
          overflow-x: hidden;
        }

        /* ── NAV ── */
        .lp-nav {
          position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
          z-index: 100; width: calc(100% - 3rem); max-width: 1100px;
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: .5rem .6rem .5rem 1.2rem;
          background: rgba(255,255,255,.12);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 99px;
          box-shadow: 0 4px 32px rgba(0,0,0,.15);
          transition: background .3s, border-color .3s, box-shadow .3s;
        }
        .lp-nav.scrolled {
          background: rgba(250,248,243,.97);
          border-color: rgba(15,61,32,.12);
          box-shadow: 0 4px 24px rgba(0,0,0,.1);
        }
        .lp-nav.scrolled .lp-nav-links a { color: var(--text-mid); }
        .lp-nav.scrolled .lp-nav-links a:hover { color: var(--green-mid); }
        .lp-nav.scrolled .lp-nav-logo { color: var(--green-deep); }
        .lp-nav.scrolled .lp-btn-login { background: var(--green-deep) !important; color: #fff !important; border-color: var(--green-deep) !important; }
        .lp-nav.scrolled .lp-btn-register { background: #fff !important; color: var(--green-deep) !important; box-shadow: 0 2px 8px rgba(15,61,32,.2) !important; }
        .lp-nav.scrolled .lp-hamburger span { background: var(--green-deep); }
        .lp-nav-center { display: flex; align-items: center; justify-content: center; gap: 1.8rem; }
        .lp-nav-right { display: flex; align-items: center; justify-content: flex-end; gap: .6rem; }
        .lp-nav-logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.45rem; font-weight: 700;
          color: #fff; text-decoration: none;
          display: flex; align-items: center; gap: 8px;
        }

        .lp-nav-links { display: flex; align-items: center; gap: 2rem; }
        .lp-nav-links a {
          font-size: .9rem; color: rgba(255,255,255,.9); text-decoration: none;
          font-weight: 500; transition: color .2s;
        }
        .lp-nav-links a:hover { color: #6ee7b7; }
        .lp-btn-login {
          background: rgba(255,255,255,.2); color: #fff;
          padding: .5rem 1.3rem; border-radius: 50px;
          font-size: .88rem; font-weight: 600; text-decoration: none;
          border: 1px solid rgba(255,255,255,.4);
          transition: background .2s, transform .15s; display: inline-block;
        }
        .lp-btn-login:hover { background: rgba(255,255,255,.3); transform: translateY(-1px); }
        .lp-btn-register {
          background: #fff; color: #0f3d20 !important;
          padding: .5rem 1.4rem; border-radius: 50px;
          font-size: .88rem; font-weight: 700; text-decoration: none;
          box-shadow: 0 2px 12px rgba(0,0,0,.15);
          transition: background .2s, transform .15s, box-shadow .2s; display: inline-block;
        }
        .lp-btn-register:hover { background: #e8f5ed; color: #0f3d20 !important; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,.2); }

        /* ── HERO ── */
        .lp-hero {
          min-height: 100vh; display: flex; align-items: center;
          padding: 7rem 2rem 4rem; position: relative; overflow: hidden;
        }
        .lp-hero-bg {
          position: absolute; inset: 0; pointer-events: none;
          background-image: url('/farm-hero.jpg');
          background-size: cover; background-position: center 45%;
        }
        .lp-hero-overlay {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(
            135deg,
            rgba(5,20,10,.82) 0%,
            rgba(10,35,15,.75) 40%,
            rgba(5,20,10,.55) 70%,
            rgba(0,0,0,.35) 100%
          );
        }
        .lp-hero-grid { display: none; }
        .lp-hero-inner {
          max-width: 1100px; margin: 0 auto;
          display: flex; flex-direction: column; justify-content: flex-end;
          min-height: calc(100vh - 8rem);
          position: relative; z-index: 1; width: 100%;
          padding-bottom: 3rem;
        }
        .lp-hero-glass {
          max-width: 680px;
        }
        .lp-hero-stats-bar {
          display: flex; gap: 0; margin-top: 2.5rem;
          background: rgba(255,255,255,.1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 16px; overflow: hidden;
        }
        .lp-stat-item {
          flex: 1; padding: 1.2rem 1.5rem;
          border-right: 1px solid rgba(255,255,255,.15);
        }
        .lp-stat-item:last-child { border-right: none; }
        .lp-hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--green-light); color: var(--green-mid);
          font-size: .78rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
          padding: .4rem 1rem; border-radius: 50px; border: 1px solid rgba(45,166,83,.25);
          margin-bottom: 1.5rem;
        }
        .lp-tag-dot {
          width: 6px; height: 6px; background: var(--green-bright); border-radius: 50%;
          animation: lpPulse 2s infinite;
        }
        @keyframes lpPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }

        .lp-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.4rem, 5vw, 3.8rem);
          line-height: 1.1; font-weight: 700; color: #fff; margin-bottom: 1.5rem;
          text-shadow: 0 2px 20px rgba(0,0,0,.4);
        }
        .lp-h1 em { font-style: normal; color: #6ee7b7; }
        .lp-hero-sub { font-size: 1.05rem; line-height: 1.7; color: rgba(255,255,255,.8); margin-bottom: 2.5rem; max-width: 480px; }
        .lp-hero-cta { display: flex; gap: 1rem; flex-wrap: wrap; }
        .lp-btn-primary {
          background: var(--green-deep); color: white; padding: .85rem 2rem; border-radius: 50px;
          font-size: .95rem; font-weight: 600; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
          transition: background .2s, transform .15s, box-shadow .2s;
          box-shadow: 0 4px 20px rgba(15,61,32,.25);
        }
        .lp-btn-primary:hover { background: var(--green-mid); }
        .lp-btn-secondary {
          background: white; color: var(--green-deep); padding: .85rem 2rem; border-radius: 50px;
          font-size: .95rem; font-weight: 600; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
          border: 1.5px solid var(--border); transition: border-color .2s, transform .15s, color .2s;
        }
        .lp-btn-secondary:hover { border-color: var(--green-mid); color: var(--green-mid); }

        .lp-hero-stats { display: none; }
        .lp-stat-num { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 700; color: #6ee7b7; }
        .lp-stat-lbl { font-size: .82rem; color: rgba(255,255,255,.6); margin-top: 2px; }

        /* Hero card */
        .lp-hero-visual { position: relative; }
        .lp-card-main {
          background: white; border-radius: var(--radius); border: 1px solid var(--border);
          padding: 1.5rem; box-shadow: 0 20px 60px rgba(15,61,32,.12);
          animation: lpFloat 4s ease-in-out infinite;
        }
        @keyframes lpFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .lp-card-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.2rem; }
        .lp-card-title { font-size: .85rem; font-weight: 600; color: var(--text-mid); }
        .lp-card-badge { background: var(--green-light); color: var(--green-mid); font-size: .7rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .lp-mini-chart { display: flex; align-items: flex-end; gap: 6px; height: 70px; margin-bottom: 1rem; }
        .lp-bar { flex: 1; border-radius: 4px 4px 0 0; background: var(--green-light); }
        .lp-bar.on { background: var(--green-mid); }
        .lp-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .lp-metric { background: var(--cream); border-radius: var(--radius-sm); padding: .8rem; }
        .lp-metric-val { font-size: 1.3rem; font-weight: 700; color: var(--green-deep); }
        .lp-metric-lbl { font-size: .7rem; color: var(--text-muted); margin-top: 2px; }
        .lp-float {
          position: absolute; background: white; border-radius: var(--radius-sm);
          border: 1px solid var(--border); padding: .75rem 1rem;
          box-shadow: 0 8px 30px rgba(15,61,32,.1); font-size: .82rem; white-space: nowrap;
        }
        .lp-float-1 { top: -1.5rem; right: -1rem; animation: lpFloat2 3.5s .5s ease-in-out infinite; }
        .lp-float-2 { bottom: -1.5rem; left: -1rem; animation: lpFloat2 3.5s 1.2s ease-in-out infinite; }
        @keyframes lpFloat2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .lp-float-icon { font-size: 1.1rem; margin-bottom: 2px; }
        .lp-float-lbl { font-size: .7rem; color: var(--text-muted); }
        .lp-float-val { font-weight: 700; color: var(--green-deep); }
        .lp-green { color: var(--green-bright); font-weight: 700; }

        /* ── SECTIONS ── */
        .lp-section { padding: 6rem 2rem; }
        .lp-section-inner { max-width: 1200px; margin: 0 auto; }
        .lp-section-tag { font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--green-mid); margin-bottom: 1rem; }
        .lp-h2 { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 3.5vw, 2.6rem); line-height: 1.2; color: var(--green-deep); margin-bottom: 1rem; }
        .lp-section-sub { font-size: 1.05rem; color: var(--text-mid); line-height: 1.7; max-width: 560px; }

        /* ── FEATURES ── */
        .lp-features { background: white; padding: 6rem 2rem; }
        .lp-features-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; margin-bottom: 4rem; flex-wrap: wrap; }
        .lp-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .lp-feat-card {
          background: var(--cream); border-radius: var(--radius); padding: 2rem;
          border: 1px solid var(--border); transition: transform .2s, box-shadow .2s, border-color .2s;
          position: relative; overflow: hidden;
        }
        .lp-feat-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: var(--green-bright); transform: scaleX(0); transform-origin: left; transition: transform .3s;
        }
        .lp-feat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(15,61,32,.1); border-color: rgba(45,166,83,.3); }
        .lp-feat-card:hover::before { transform: scaleX(1); }
        .lp-feat-icon {
          width: 48px; height: 48px; border-radius: var(--radius-sm);
          background: var(--green-light); display: flex; align-items: center;
          justify-content: center; margin-bottom: 1.2rem;
        }
        .lp-feat-icon svg { width: 24px; height: 24px; stroke: var(--green-mid); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .lp-feat-card h3 { font-size: 1rem; font-weight: 600; color: var(--green-deep); margin-bottom: .6rem; }
        .lp-feat-card p { font-size: .88rem; color: var(--text-mid); line-height: 1.65; }

        /* ── HOW IT WORKS ── */
        .lp-how-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; }
        .lp-steps { display: flex; flex-direction: column; gap: 1.5rem; }
        .lp-step { display: flex; gap: 1.2rem; }
        .lp-step-num {
          width: 36px; height: 36px; flex-shrink: 0;
          background: var(--green-deep); color: white; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .8rem; font-weight: 700;
        }
        .lp-step-body h4 { font-size: .95rem; font-weight: 600; color: var(--green-deep); margin-bottom: .3rem; }
        .lp-step-body p { font-size: .85rem; color: var(--text-mid); line-height: 1.6; }
        .lp-step-line { width: 1px; height: 20px; background: var(--border); margin: 0 18px; }
        .lp-how-visual {
          background: var(--green-deep); border-radius: var(--radius);
          padding: 2rem; color: white; position: relative; overflow: hidden;
        }
        .lp-how-pattern {
          position: absolute; inset: 0; opacity: .05;
          background-image: repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%);
          background-size: 20px 20px;
        }
        .lp-dash { position: relative; z-index: 1; }
        .lp-dash-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .lp-bar-wrap { margin-bottom: .8rem; }
        .lp-bar-label { display: flex; justify-content: space-between; font-size: .7rem; opacity: .7; margin-bottom: 4px; }
        .lp-bar-track { height: 8px; background: rgba(255,255,255,.15); border-radius: 4px; overflow: hidden; }
        .lp-bar-fill { height: 100%; background: var(--green-bright); border-radius: 4px; }
        .lp-dash-animals { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 1.2rem; }
        .lp-dash-animal { background: rgba(255,255,255,.1); border-radius: 8px; padding: .7rem; }
        .lp-dash-animal-name { font-size: .75rem; opacity: .8; }
        .lp-dash-animal-stat { font-size: 1rem; font-weight: 700; margin-top: 4px; }

        /* ── TESTIMONIALS ── */
        .lp-testi { background: var(--green-deep); padding: 6rem 2rem; }
        .lp-testi .lp-h2 { color: white; }
        .lp-testi .lp-section-tag { color: var(--green-bright); }
        .lp-testi-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3rem; flex-wrap: wrap; gap: 1rem; }
        .lp-testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .lp-testi-card {
          background: rgba(255,255,255,.07); border-radius: var(--radius);
          border: 1px solid rgba(255,255,255,.12); padding: 1.8rem; transition: background .2s;
        }
        .lp-testi-card:hover { background: rgba(255,255,255,.12); }
        .lp-testi-stars { color: #fbbf24; font-size: .85rem; letter-spacing: 2px; margin-bottom: 1rem; }
        .lp-testi-text { font-size: .9rem; line-height: 1.7; color: rgba(255,255,255,.85); margin-bottom: 1.5rem; font-style: italic; }
        .lp-testi-author { display: flex; align-items: center; gap: 10px; }
        .lp-testi-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--green-mid); display: flex; align-items: center;
          justify-content: center; font-size: .8rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .lp-testi-name { font-size: .88rem; font-weight: 600; color: white; }
        .lp-testi-role { font-size: .75rem; color: rgba(255,255,255,.6); margin-top: 1px; }

        /* ── CONTACT ── */
        .lp-contact-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: start; }
        .lp-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 1rem; }
        .lp-form-group label { font-size: .82rem; font-weight: 600; color: var(--text-mid); }
        .lp-form-group input, .lp-form-group textarea, .lp-form-group select {
          padding: .75rem 1rem; border-radius: var(--radius-sm);
          border: 1.5px solid var(--border); background: white;
          font-family: 'DM Sans', sans-serif; font-size: .9rem; color: var(--text-dark);
          transition: border-color .2s; width: 100%; outline: none;
        }
        .lp-form-group input:focus, .lp-form-group textarea:focus, .lp-form-group select:focus {
          border-color: var(--green-mid);
        }
        .lp-form-group textarea { resize: vertical; min-height: 110px; }
        .btn-submit {
          background: var(--green-deep); color: white; padding: .85rem 2rem; border-radius: 50px;
          font-size: .95rem; font-weight: 600; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: background .2s, transform .15s; width: 100%;
        }
        .btn-submit:hover { background: var(--green-mid); }
        .lp-contact-info h3 {
          font-family: 'Playfair Display', serif; font-size: 1.6rem;
          color: var(--green-deep); margin-bottom: 1rem;
        }
        .lp-contact-info p { color: var(--text-mid); line-height: 1.7; margin-bottom: 2rem; }
        .lp-contact-detail { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 1.2rem; }
        .lp-contact-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          background: var(--green-light); border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
        }
        .lp-contact-icon svg { width: 18px; height: 18px; stroke: var(--green-mid); fill: none; stroke-width: 2; }
        .lp-contact-detail-text { font-size: .88rem; color: var(--text-mid); }
        .lp-contact-detail-text strong { display: block; font-size: .82rem; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: .05em; }

        /* ── CTA STRIP ── */
        .lp-cta { background: var(--green-bright); padding: 4rem 2rem; text-align: center; }
        .lp-cta .lp-h2 { color: white; margin-bottom: .8rem; }
        .lp-cta p { color: rgba(255,255,255,.85); margin-bottom: 2rem; font-size: 1rem; }
        .lp-cta .lp-btn-primary { background: white; color: var(--green-deep); box-shadow: 0 4px 20px rgba(0,0,0,.15); }
        .lp-cta .lp-btn-primary:hover { background: var(--cream); }
        .lp-cta .lp-btn-secondary { background: transparent; color: white; border-color: rgba(255,255,255,.5); }
        .lp-cta .lp-btn-secondary:hover { border-color: white; color: white; }
        .lp-cta-btns { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }

        /* ── FOOTER ── */
        .lp-footer { background: var(--green-deep); color: white; padding: 3rem 2rem 2rem; }
        .lp-footer-inner { max-width: 1200px; margin: 0 auto; }
        .lp-footer-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 3rem; flex-wrap: wrap; margin-bottom: 2.5rem; }
        .lp-footer-brand p { font-size: .85rem; opacity: .6; margin-top: .8rem; max-width: 260px; line-height: 1.6; }
        .lp-footer-links h5 { font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; opacity: .5; margin-bottom: 1rem; }
        .lp-footer-links ul { list-style: none; display: flex; flex-direction: column; gap: .6rem; }
        .lp-footer-links ul li a { font-size: .88rem; opacity: .75; text-decoration: none; color: white; transition: opacity .2s; }
        .lp-footer-links ul li a:hover { opacity: 1; }
        .lp-footer-bottom {
          border-top: 1px solid rgba(255,255,255,.1); padding-top: 1.5rem;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
        }
        .lp-footer-bottom p { font-size: .8rem; opacity: .5; }
        .lp-footer-logo {
          display: flex; align-items: center; gap: 8px; text-decoration: none;
          color: white; font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700;
        }


        /* ── FADE UP ── */
        .fade-up { opacity: 0; transform: translateY(30px); transition: opacity .6s ease, transform .6s ease; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }

        /* ── RESPONSIVE ── */
        /* ── MOBILE MENU ── */
        .lp-hamburger {
          display: none; flex-direction: column; justify-content: center; gap: 5px;
          width: 36px; height: 36px; background: none; border: none; cursor: pointer; padding: 0;
        }
        .lp-hamburger span { display: block; width: 100%; height: 2px; background: #fff; border-radius: 2px; transition: transform .25s, opacity .25s; }
        .lp-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .lp-hamburger.open span:nth-child(2) { opacity: 0; }
        .lp-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .lp-mobile-panel {
          position: fixed; top: 0; left: 0; right: 0; z-index: 99;
          background: rgba(10,30,15,.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,.15);
          box-shadow: 0 12px 30px rgba(0,0,0,.3);
          display: flex; flex-direction: column; gap: 0;
          padding: 4.2rem 1.5rem 1.5rem;
          transform: translateY(-100%); opacity: 0; pointer-events: none;
          transition: transform .25s ease, opacity .25s ease;
        }
        .lp-mobile-panel.open { transform: translateY(0); opacity: 1; pointer-events: auto; }
        .lp-mobile-panel a {
          font-size: 1rem; color: rgba(255,255,255,.85); text-decoration: none; font-weight: 500;
          padding: .9rem 0; border-bottom: 1px solid rgba(255,255,255,.1);
        }
        .lp-mobile-panel .lp-btn-login {
          text-align: center; margin-top: .8rem;
          background: rgba(255,255,255,.15) !important; color: #fff !important;
          border: 1px solid rgba(255,255,255,.3) !important;
        }
        .lp-mobile-panel .lp-btn-register {
          text-align: center; margin-top: .5rem;
          background: #fff !important; color: var(--green-deep) !important;
        }
        @media (max-width: 900px) {
          .lp-hamburger { display: flex; }
          .lp-hero-inner { text-align: center; }
          .lp-hero-glass { max-width: 100%; }
          .lp-hero-cta { justify-content: center; }
          .lp-hero-stats-bar { flex-wrap: wrap; }
          .lp-stat-item { min-width: 45%; border-right: none; border-bottom: 1px solid rgba(255,255,255,.15); }
          .lp-features-grid { grid-template-columns: 1fr 1fr; }
          .lp-testi-grid { grid-template-columns: 1fr 1fr; }
          .lp-how-inner { grid-template-columns: 1fr; }
          .lp-contact-inner { grid-template-columns: 1fr; }
          .lp-nav-links { display: none; }
        }
        @media (max-width: 600px) {
          .lp-features-grid { grid-template-columns: 1fr; }
          .lp-testi-grid { grid-template-columns: 1fr; }
          .lp-section, .lp-features, .lp-testi { padding: 4rem 1.25rem; }
          .lp-nav { top: 10px; width: calc(100% - 1.5rem); padding: .5rem .5rem .5rem 1rem; }
        }
      `}</style>

      <div className="lp-root">

        {/* ── NAV ── */}
        <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
          <a href="#home" className="lp-nav-logo">
            <img src="/agripulse-logo.png" alt="AgriPulse" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '6px', background: 'white', padding: '4px' }} />
            AgriPulse
          </a>
          <div className="lp-nav-center lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#testimonials">Stories</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="lp-nav-right">
            <Link to="/login" className="lp-btn-login">Sign In</Link>
            <Link to="/register" className="lp-btn-register">Get Started →</Link>
            <button
              className={`lp-hamburger ${mobileOpen ? 'open' : ''}`}
              onClick={() => setMobileOpen(p => !p)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </nav>
        <div className={`lp-mobile-panel ${mobileOpen ? 'open' : ''}`}>
          <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#how" onClick={() => setMobileOpen(false)}>How it works</a>
          <a href="#testimonials" onClick={() => setMobileOpen(false)}>Stories</a>
          <a href="#contact" onClick={() => setMobileOpen(false)}>Contact</a>
          <Link to="/login" className="lp-btn-login" onClick={() => setMobileOpen(false)}>Sign In</Link>
          <Link to="/register" className="lp-btn-register" onClick={() => setMobileOpen(false)}>Get Started →</Link>
        </div>

        {/* ── HERO ── */}
        <section className="lp-hero" id="home">
          <div className="lp-hero-bg" />
          <div className="lp-hero-overlay" />
          <div className="lp-hero-grid" />
          <div className="lp-hero-inner">
            <div className="lp-hero-glass">
              <div className="lp-hero-tag" style={{ background: 'rgba(45,166,83,.25)', borderColor: 'rgba(45,166,83,.5)', color: '#6ee7b7', display: 'inline-flex', marginBottom: '1.5rem' }}>
                <span className="lp-tag-dot" />
                Smart Livestock Management
              </div>
              <h1 className="lp-h1" style={{ fontSize: 'clamp(2.8rem,6vw,5rem)', lineHeight: 1.0, marginBottom: '1.2rem' }}>
                Run your farm<br />with <em>precision</em><br />and confidence
              </h1>
              <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,.75)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 520 }}>
                AgriPulse gives farm owners a complete platform to track animals, milk production, health records, finances, and workers — all in one place.
              </p>
              <div className="lp-hero-cta">
                <Link to="/register" className="lp-btn-primary">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Start Free Today
                </Link>
                <Link to="/login" className="lp-btn-secondary" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)', background: 'rgba(255,255,255,.1)' }}>Sign In →</Link>
              </div>
            </div>
            <div className="lp-hero-stats-bar">
              {[
                { num: '500+', lbl: 'Active Farms' },
                { num: '98%',  lbl: 'Uptime' },
                { num: '24/7', lbl: 'Farm Access' },
                { num: 'AI',   lbl: 'Powered Advisor' },
              ].map(({ num, lbl }) => (
                <div key={lbl} className="lp-stat-item">
                  <div className="lp-stat-num">{num}</div>
                  <div className="lp-stat-lbl">{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="lp-features" id="features">
          <div className="lp-section-inner">
            <div className="lp-features-top fade-up">
              <div>
                <div className="lp-section-tag">Features</div>
                <h2 className="lp-h2">Everything your farm needs,<br />in one place</h2>
              </div>
              <p className="lp-section-sub">From tracking a single cow's health to managing your entire operation's finances — AgriPulse covers it all.</p>
            </div>
            <div className="lp-features-grid">
              {[
                { delay: 0,   title: 'Animal Registry',       desc: 'Complete records for every animal — breed, age, status, and full history. Filter by type or status instantly.', icon: <><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></> },
                { delay: .08, title: 'Milk Production Logs',  desc: 'Record daily yields per animal, track trends over time, and see your herd\'s performance at a glance.', icon: <><path d="M8 2h8l1 4H7z"/><path d="M7 6v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6"/></> },
                { delay: .16, title: 'Health Records',        desc: 'Log vaccinations, vet visits, and treatments. Get reminders for upcoming health checks automatically.', icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/> },
                { delay: .24, title: 'Breeding Management',   desc: 'Track insemination, pregnancy status, and expected calving dates. Never miss a breeding event again.', icon: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/> },
                { delay: .32, title: 'Financial Tracking',    desc: 'Record income and expenses, see profit and loss at a glance, and export reports without an accountant.', icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></> },
                { delay: .4,  title: 'Worker Management',     desc: 'Add farm workers with roles, manage their access, and keep your whole team organised securely.', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></> },
              ].map(({ delay, title, desc, icon }) => (
                <div key={title} className="lp-feat-card fade-up" style={{ transitionDelay: `${delay}s` }}>
                  <div className="lp-feat-icon">
                    <svg viewBox="0 0 24 24">{icon}</svg>
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="lp-section" id="how">
          <div className="lp-section-inner">
            <div className="lp-how-inner">
              <div className="fade-up">
                <div className="lp-section-tag">How it works</div>
                <h2 className="lp-h2">Up and running in minutes</h2>
                <p className="lp-section-sub" style={{ marginBottom: '2.5rem' }}>No technical knowledge needed. AgriPulse is built for farmers, not software engineers.</p>
                <div className="lp-steps">
                  {[
                    { n: 1, title: 'Create your farm account',    desc: 'Register in under a minute. Your farm gets its own private, secure workspace.' },
                    { n: 2, title: 'Add your animals',            desc: 'Enter each animal once — breed, gender, status. That\'s your starting point.' },
                    { n: 3, title: 'Record daily activities',     desc: 'Milk yields, health checks, breeding events — log them as they happen from any device.' },
                    { n: 4, title: 'See your farm\'s full picture', desc: 'Your dashboard updates in real time. Make decisions based on data, not guesswork.' },
                  ].map(({ n, title, desc }, i, arr) => (
                    <div key={n}>
                      <div className="lp-step">
                        <div className="lp-step-num">{n}</div>
                        <div className="lp-step-body"><h4>{title}</h4><p>{desc}</p></div>
                      </div>
                      {i < arr.length - 1 && <div className="lp-step-line" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-how-visual fade-up" style={{ transitionDelay: '.2s' }}>
                <div className="lp-how-pattern" />
                <div className="lp-dash">
                  <div className="lp-dash-row">
                    <span style={{ color: 'rgba(255,255,255,.6)', fontSize: '.75rem' }}>Farm Dashboard</span>
                    <span style={{ color: '#2da653', fontSize: '.75rem', fontWeight: 700 }}>● Live</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,.1)', margin: '.8rem 0 1rem' }} />
                  {[
                    { label: 'Milk yield this week', val: '347 L', pct: '78%', color: '#2da653' },
                    { label: 'Herd health score',   val: '96%',   pct: '96%', color: '#fac75e' },
                    { label: 'Financial P&L (month)', val: '+42%', pct: '42%', color: '#a0d96b' },
                  ].map(({ label, val, pct, color }) => (
                    <div key={label} className="lp-bar-wrap">
                      <div className="lp-bar-label"><span>{label}</span><span>{val}</span></div>
                      <div className="lp-bar-track"><div className="lp-bar-fill" style={{ width: pct, background: color }} /></div>
                    </div>
                  ))}
                  <div className="lp-dash-animals">
                    {[
                      { name: 'Cattle',  val: '28' },
                      { name: 'Goats',   val: '14' },
                      { name: 'Workers', val: '6' },
                      { name: 'Alerts',  val: '2', color: '#fac75e' },
                    ].map(({ name, val, color }) => (
                      <div key={name} className="lp-dash-animal">
                        <div className="lp-dash-animal-name">{name}</div>
                        <div className="lp-dash-animal-stat" style={color ? { color } : {}}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="lp-testi" id="testimonials">
          <div className="lp-section-inner">
            <div className="lp-testi-top fade-up">
              <div>
                <div className="lp-section-tag">Farmer Stories</div>
                <h2 className="lp-h2">Trusted by farmers across the region</h2>
              </div>
            </div>
            <div className="lp-testi-grid">
              {[
                { initials: 'JM', name: 'James Mwangi',  role: 'Dairy Farmer · Nakuru',       delay: 0,   text: 'Before AgriPulse I was writing everything in notebooks and losing them. Now I open the app and my whole farm is right there. Every cow, every day.' },
                { initials: 'AW', name: 'Amina Wanjiku', role: 'Mixed Farm Owner · Eldoret',   delay: .1,  text: 'The financial tracking alone saved me hours every month. My P&L is just there on the dashboard — no more weekend spreadsheets. No more guessing.' },
                { initials: 'PK', name: 'Peter Kamau',   role: 'Livestock Farmer · Kisumu',    delay: .2,  text: 'The vaccination reminders are a game changer. I lost animals last year because I missed treatments. This year, zero losses. AgriPulse keeps me on track.' },
              ].map(({ initials, name, role, delay, text }) => (
                <div key={name} className="lp-testi-card fade-up" style={{ transitionDelay: `${delay}s` }}>
                  <div className="lp-testi-stars">★★★★★</div>
                  <p className="lp-testi-text">"{text}"</p>
                  <div className="lp-testi-author">
                    <div className="lp-testi-avatar">{initials}</div>
                    <div>
                      <div className="lp-testi-name">{name}</div>
                      <div className="lp-testi-role">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section className="lp-section" id="contact">
          <div className="lp-section-inner">
            <div className="lp-contact-inner">
              <div className="fade-up">
                <div className="lp-section-tag">Contact</div>
                <div className="lp-contact-info">
                  <h3>We're here to help your farm grow</h3>
                  <p>Have a question about AgriPulse? Want a demo or need support? Reach out — we reply within 24 hours.</p>
                  <div className="lp-contact-detail">
                    <div className="lp-contact-icon"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
                    <div className="lp-contact-detail-text"><strong>Email</strong>agripulse254@gmail.com</div>
                  </div>
                  <div className="lp-contact-detail">
                    <div className="lp-contact-icon"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                    <div className="lp-contact-detail-text"><strong>Based in</strong>Kenya · Serving farms across East Africa</div>
                  </div>
                </div>
              </div>
              <div className="fade-up" style={{ transitionDelay: '.15s' }}>
                <form onSubmit={handleContact}>
                  <div className="lp-form-group">
                    <label>Your Name</label>
                    <input type="text" placeholder="e.g. James Mwangi" required />
                  </div>
                  <div className="lp-form-group">
                    <label>Email Address</label>
                    <input type="email" placeholder="you@example.com" required />
                  </div>
                  <div className="lp-form-group">
                    <label>Topic</label>
                    <select>
                      <option>General Question</option>
                      <option>Request a Demo</option>
                      <option>Technical Support</option>
                      <option>Feedback</option>
                    </select>
                  </div>
                  <div className="lp-form-group">
                    <label>Message</label>
                    <textarea placeholder="Tell us how we can help..." required />
                  </div>
                  <button type="submit" className="btn-submit">Send Message →</button>
                  <div id="contact-success" style={{ display: 'none', color: 'var(--green-mid)', fontSize: '.88rem', textAlign: 'center', padding: '.75rem', marginTop: '.5rem', background: 'var(--green-light)', borderRadius: 8 }}>
                    ✓ Message sent! We'll be in touch soon.
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA STRIP ── */}
        <div className="lp-cta">
          <h2 className="lp-h2">Ready to transform your farm?</h2>
          <p>Join hundreds of farmers already using AgriPulse to run smarter operations.</p>
          <div className="lp-cta-btns">
            <Link to="/register" className="lp-btn-primary">Create Free Account →</Link>
            <Link to="/login"    className="lp-btn-secondary">Sign In</Link>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <div className="lp-footer-inner">
            <div className="lp-footer-top">
              <div className="lp-footer-brand">
                <a href="#home" className="lp-footer-logo">
                  <img src="/agripulse-logo.png" alt="AgriPulse" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '6px', background: 'white', padding: '2px' }} />
                  AgriPulse
                </a>
                <p>Smart farm management for modern livestock farmers. Track, manage, and grow your farm with confidence.</p>
              </div>
              <div className="lp-footer-links">
                <h5>Platform</h5>
                <ul>
                  <li><a href="#features">Features</a></li>
                  <li><a href="#how">How it works</a></li>
                  <li><Link to="/register" style={{ color: 'white' }}>Get Started</Link></li>
                  <li><Link to="/login"    style={{ color: 'white' }}>Sign In</Link></li>
                </ul>
              </div>
              <div className="lp-footer-links">
                <h5>Support</h5>
                <ul>
                  <li><a href="#contact">Contact Us</a></li>
                  <li><a href="#testimonials">Farmer Stories</a></li>
                </ul>
              </div>
            </div>
            <div className="lp-footer-bottom">
              <p>© {new Date().getFullYear()} AgriPulse. All rights reserved.</p>
              <p>Built for farmers, by people who care about agriculture.</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
