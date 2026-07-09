import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home, ShoppingCart, Stethoscope, FileText, Shield, Milk,
  Activity, MessageSquare, BarChart3, MapPin, ArrowRight,
  Star, CheckCircle, Menu, X, ChevronRight, QrCode
} from 'lucide-react';
import api from '../lib/api';

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [howTab, setHowTab] = useState('farmer');
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.title = 'AgriPulse — Smart Livestock Management & Marketplace';
    observerRef.current = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('ap-vis'); }),
      { threshold: 0.08 }
    );
    setTimeout(() => {
      document.querySelectorAll('.ap-fade').forEach(el => observerRef.current?.observe(el));
    }, 100);
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    api.get('/marketplace/listings?limit=6').then(r => setListings(r.data.listings || [])).catch(() => {});
  }, []);

  const howSteps: Record<string, any[]> = {
    farmer: [
      { n: '01', t: 'Register Your Farm', d: 'Create your account and register animals with unique QR-coded digital passports in minutes.' },
      { n: '02', t: 'Track Everything', d: 'Log milk production, health records, vaccinations, breeding cycles and weight measurements.' },
      { n: '03', t: 'Sell on Marketplace', d: 'List verified animals, receive offers, and complete secure digital ownership transfers.' },
    ],
    buyer: [
      { n: '01', t: 'Create Buyer Account', d: 'Sign up and browse thousands of verified livestock listings across all 47 counties.' },
      { n: '02', t: 'Verify & Inspect', d: 'View full animal passports, health history, and vaccination records before any offer.' },
      { n: '03', t: 'Buy Securely', d: 'Make offers, negotiate, and complete ownership transfer with digital e-signatures.' },
    ],
    vet: [
      { n: '01', t: 'Register & Get Verified', d: 'Submit your KVB license. Admin verification ensures only licensed vets join.' },
      { n: '02', t: 'Manage Your Practice', d: 'Set availability, accept farm requests and manage appointments from your dashboard.' },
      { n: '03', t: 'Issue Certificates', d: 'Record treatments, issue health certificates, and verify animals for marketplace listings.' },
    ],
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background: #060e09; color: #fff; overflow-x: hidden; }

        .ap-fade { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
        .ap-vis { opacity: 1 !important; transform: none !important; }
        .ap-fade:nth-child(2) { transition-delay: .1s; }
        .ap-fade:nth-child(3) { transition-delay: .2s; }
        .ap-fade:nth-child(4) { transition-delay: .3s; }
        .ap-fade:nth-child(5) { transition-delay: .4s; }
        .ap-fade:nth-child(6) { transition-delay: .5s; }

        /* NAV */
        .ap-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between;
          transition: all .3s;
        }
        .ap-nav.scrolled {
          background: rgba(6,14,9,.92); backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,.06); padding: .75rem 2rem;
        }
        .ap-nav-logo { display: flex; align-items: center; gap: .6rem; text-decoration: none; }
        .ap-nav-logo img { height: 36px; border-radius: 9px; }
        .ap-nav-logo-text { display: flex; flex-direction: column; }
        .ap-nav-logo-name { font-weight: 800; font-size: 1.1rem; color: #fff; letter-spacing: -.3px; line-height: 1.1; }
        .ap-nav-logo-sub { font-size: .62rem; color: rgba(255,255,255,.35); letter-spacing: .4px; }
        .ap-nav-links { display: flex; align-items: center; gap: 1.8rem; list-style: none; }
        .ap-nav-links a { text-decoration: none; color: rgba(255,255,255,.65); font-size: .88rem; font-weight: 500; transition: color .2s; }
        .ap-nav-links a:hover { color: #fff; }
        .ap-nav-right { display: flex; align-items: center; gap: .6rem; }
        .ap-btn-ghost { padding: .5rem 1.1rem; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; color: rgba(255,255,255,.8); background: rgba(255,255,255,.04); font-size: .82rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: all .2s; }
        .ap-btn-ghost:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.3); }
        .ap-btn-cta { padding: .5rem 1.3rem; border: none; border-radius: 8px; background: #16a34a; color: #fff; font-size: .82rem; font-weight: 700; cursor: pointer; text-decoration: none; transition: background .2s; }
        .ap-btn-cta:hover { background: #15803d; }
        .ap-hamburger { display: none; background: none; border: none; cursor: pointer; color: #fff; }
        @media(max-width:900px) { .ap-nav-links,.ap-nav-right { display: none; } .ap-hamburger { display: flex; } }

        /* MOBILE MENU */
        .ap-mob { position: fixed; inset: 0; background: rgba(6,14,9,.97); z-index: 199; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem; }
        .ap-mob a { font-size: 1.3rem; font-weight: 700; color: #fff; text-decoration: none; }
        .ap-mob-close { position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; cursor: pointer; color: #fff; }

        /* HERO */
        .ap-hero { position: relative; min-height: 100vh; overflow: hidden; }
        .ap-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
        .ap-hero-grad { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(6,14,9,.55) 0%, rgba(6,14,9,.4) 30%, rgba(6,14,9,.85) 70%, rgba(6,14,9,1) 100%); }
        .ap-hero-grad2 { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(6,14,9,.7) 0%, transparent 60%); }
        .ap-hero-inner { position: relative; z-index: 2; max-width: 1280px; margin: 0 auto; padding: 0 2rem; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding-top: 80px; }
        .ap-hero-badge { display: inline-flex; align-items: center; gap: .5rem; padding: .35rem 1rem; background: rgba(22,163,74,.15); border: 1px solid rgba(22,163,74,.35); border-radius: 20px; font-size: .72rem; font-weight: 700; color: #4ade80; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 1.5rem; width: fit-content; }
        .ap-hero-h1 { font-size: clamp(2.8rem, 6vw, 5.5rem); font-weight: 900; line-height: 1.05; letter-spacing: -1.5px; color: #fff; margin-bottom: 1.4rem; max-width: 700px; }
        .ap-hero-h1 .green { color: #4ade80; }
        .ap-hero-p { font-size: clamp(.9rem, 1.5vw, 1.05rem); color: rgba(255,255,255,.6); max-width: 480px; line-height: 1.75; margin-bottom: 2.2rem; }
        .ap-hero-btns { display: flex; gap: .8rem; flex-wrap: wrap; margin-bottom: 3.5rem; }
        .ap-hero-btn-primary { display: inline-flex; align-items: center; gap: .5rem; padding: .85rem 1.8rem; border-radius: 10px; background: #16a34a; color: #fff; font-weight: 700; font-size: .95rem; text-decoration: none; border: none; cursor: pointer; transition: all .2s; box-shadow: 0 4px 20px rgba(22,163,74,.35); }
        .ap-hero-btn-primary:hover { background: #15803d; transform: translateY(-1px); }
        .ap-hero-btn-secondary { display: inline-flex; align-items: center; gap: .5rem; padding: .85rem 1.8rem; border-radius: 10px; background: rgba(255,255,255,.08); color: #fff; font-weight: 600; font-size: .95rem; text-decoration: none; border: 1px solid rgba(255,255,255,.18); cursor: pointer; transition: all .2s; backdrop-filter: blur(8px); }
        .ap-hero-btn-secondary:hover { background: rgba(255,255,255,.12); }

        /* PASSPORT CARD */
        .ap-passport { position: absolute; right: 2rem; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,.07); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,.15); border-radius: 20px; padding: 1.4rem; width: 260px; z-index: 3; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
        @media(max-width:900px) { .ap-passport { display: none; } }
        .ap-passport-header { display: flex; align-items: center; gap: .6rem; margin-bottom: 1rem; }
        .ap-passport-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(22,163,74,.2); display: flex; align-items: center; justify-content: center; }
        .ap-passport-title { font-weight: 700; font-size: .9rem; color: #fff; }
        .ap-passport-sub { font-size: .72rem; color: rgba(255,255,255,.45); }
        .ap-passport-img-row { display: flex; gap: .8rem; align-items: center; margin-bottom: .8rem; }
        .ap-passport-cow { width: 90px; height: 70px; border-radius: 12px; object-fit: cover; border: 2px solid rgba(255,255,255,.1); }
        .ap-passport-qr { width: 60px; height: 60px; border-radius: 10px; background: #fff; display: flex; align-items: center; justify-content: center; }
        .ap-passport-verified { display: flex; align-items: center; gap: .5rem; padding: .4rem .8rem; background: rgba(22,163,74,.15); border: 1px solid rgba(22,163,74,.3); border-radius: 8px; }
        .ap-passport-verified span { font-size: .75rem; font-weight: 700; color: #4ade80; }

        /* STATS BAR */
        .ap-stats { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 1.5rem 2rem; display: flex; gap: 0; max-width: 900px; margin: 0 auto; position: relative; z-index: 2; }
        .ap-stat { flex: 1; text-align: center; padding: 0 1rem; border-right: 1px solid rgba(255,255,255,.08); }
        .ap-stat:last-child { border-right: none; }
        .ap-stat-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(22,163,74,.15); display: flex; align-items: center; justify-content: center; margin: 0 auto .6rem; }
        .ap-stat strong { display: block; font-size: 1.6rem; font-weight: 900; color: #fff; letter-spacing: -1px; }
        .ap-stat span { font-size: .75rem; color: rgba(255,255,255,.4); }
        @media(max-width:640px) { .ap-stats { flex-direction: column; gap: 1rem; } .ap-stat { border-right: none; border-bottom: 1px solid rgba(255,255,255,.08); padding-bottom: 1rem; } .ap-stat:last-child { border-bottom: none; } }

        /* SOLUTIONS */
        .ap-solutions { padding: 5rem 2rem; max-width: 1280px; margin: 0 auto; }
        .ap-solutions-title { text-align: center; margin-bottom: 3rem; }
        .ap-solutions-title h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 800; color: #fff; margin-bottom: .5rem; }
        .ap-solutions-title h2 span { color: #4ade80; }
        .ap-solutions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
        .ap-sol-card { padding: 1.6rem; border-radius: 18px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); transition: all .2s; position: relative; overflow: hidden; }
        .ap-sol-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, var(--card-color,rgba(22,163,74,.05)) 0%, transparent 60%); transition: opacity .2s; opacity: 0; }
        .ap-sol-card:hover { border-color: rgba(255,255,255,.15); transform: translateY(-3px); }
        .ap-sol-card:hover::before { opacity: 1; }
        .ap-sol-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
        .ap-sol-card h3 { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: .4rem; }
        .ap-sol-card p { font-size: .83rem; color: rgba(255,255,255,.45); line-height: 1.65; margin-bottom: 1rem; }
        .ap-sol-arrow { display: flex; align-items: center; justify-content: flex-end; }
        .ap-sol-arrow-btn { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; transition: all .2s; }

        /* TRUSTED */
        .ap-trusted { text-align: center; padding: 1.5rem 2rem 5rem; color: rgba(255,255,255,.4); font-size: .85rem; display: flex; align-items: center; justify-content: center; gap: .8rem; flex-wrap: wrap; }
        .ap-trusted-avatars { display: flex; }
        .ap-trusted-avatar { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #060e09; margin-left: -8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .7rem; }
        .ap-trusted-avatars .ap-trusted-avatar:first-child { margin-left: 0; }
        .ap-trusted-count { color: #4ade80; font-weight: 700; }

        /* SPLIT JOURNEY */
        .ap-journey { display: grid; grid-template-columns: repeat(3,1fr); }
        @media(max-width:768px) { .ap-journey { grid-template-columns: 1fr; } }
        .ap-journey-panel { position: relative; overflow: hidden; min-height: 520px; cursor: pointer; }
        .ap-journey-panel img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease; }
        .ap-journey-panel:hover img { transform: scale(1.06); }
        .ap-journey-panel-overlay { position: absolute; inset: 0; transition: opacity .3s; }
        .ap-journey-content { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; padding: 2rem; }
        .ap-journey-tag { font-size: .68rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: .5rem; }
        .ap-journey-content h3 { font-size: 1.6rem; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: .6rem; }
        .ap-journey-content p { font-size: .83rem; color: rgba(255,255,255,.65); line-height: 1.6; margin-bottom: 1rem; }
        .ap-journey-list { display: flex; flex-direction: column; gap: .3rem; margin-bottom: 1.2rem; }
        .ap-journey-list span { font-size: .78rem; color: rgba(255,255,255,.7); display: flex; align-items: center; gap: .4rem; }
        .ap-journey-btn { display: inline-flex; align-items: center; gap: .5rem; padding: .65rem 1.2rem; border-radius: 9px; font-weight: 700; font-size: .85rem; text-decoration: none; border: none; cursor: pointer; transition: opacity .2s; }
        .ap-journey-btn:hover { opacity: .85; }

        /* FEATURES */
        .ap-features { padding: 5rem 2rem; max-width: 1280px; margin: 0 auto; }
        .ap-features-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; flex-wrap: wrap; gap: 1rem; }
        .ap-features-header h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 800; color: #fff; }
        .ap-features-header h2 span { color: #4ade80; }
        .ap-features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1px; background: rgba(255,255,255,.06); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,.06); }
        .ap-feat { padding: 1.8rem; background: #060e09; transition: background .2s; }
        .ap-feat:hover { background: rgba(255,255,255,.03); }
        .ap-feat-icon { width: 46px; height: 46px; border-radius: 13px; display: flex; align-items: center; justify-content: center; margin-bottom: .9rem; }
        .ap-feat h3 { font-size: .95rem; font-weight: 700; color: #fff; margin-bottom: .4rem; }
        .ap-feat p { font-size: .82rem; color: rgba(255,255,255,.4); line-height: 1.65; }
        .ap-feat-badge { display: inline-block; margin-top: .6rem; font-size: .62rem; font-weight: 700; padding: .2rem .6rem; border-radius: 20px; letter-spacing: .5px; text-transform: uppercase; }

        /* HOW IT WORKS */
        .ap-how { background: rgba(255,255,255,.02); padding: 5rem 2rem; }
        .ap-how-inner { max-width: 1280px; margin: 0 auto; }
        .ap-how-header { margin-bottom: 2.5rem; }
        .ap-how-label { font-size: .7rem; font-weight: 700; letter-spacing: 2px; color: #4ade80; text-transform: uppercase; margin-bottom: .5rem; }
        .ap-how-header h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 800; color: #fff; }
        .ap-how-tabs { display: flex; gap: .5rem; margin-bottom: 2.5rem; flex-wrap: wrap; }
        .ap-how-tab { padding: .55rem 1.3rem; border-radius: 20px; border: 1px solid rgba(255,255,255,.1); background: transparent; color: rgba(255,255,255,.45); font-size: .83rem; font-weight: 600; cursor: pointer; transition: all .2s; font-family: 'Inter', sans-serif; }
        .ap-how-tab.active-farm { background: rgba(22,163,74,.15); border-color: rgba(22,163,74,.4); color: #4ade80; }
        .ap-how-tab.active-buyer { background: rgba(14,165,233,.15); border-color: rgba(14,165,233,.4); color: #38bdf8; }
        .ap-how-tab.active-vet { background: rgba(13,148,136,.15); border-color: rgba(13,148,136,.4); color: #2dd4bf; }
        .ap-how-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 1.5rem; }
        @media(max-width:640px) { .ap-how-steps { grid-template-columns: 1fr; } }
        .ap-how-step { padding: 1.8rem; border-radius: 16px; background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.06); position: relative; }
        .ap-how-num { font-size: 3.5rem; font-weight: 900; line-height: 1; margin-bottom: .6rem; opacity: .12; font-variant-numeric: tabular-nums; }
        .ap-how-step h4 { font-size: .95rem; font-weight: 700; color: #fff; margin-bottom: .4rem; }
        .ap-how-step p { font-size: .82rem; color: rgba(255,255,255,.4); line-height: 1.7; }
        .ap-how-connector { position: absolute; top: 2rem; right: -1.5rem; width: 1.5rem; display: flex; align-items: center; z-index: 1; }

        /* MARKETPLACE */
        .ap-market { padding: 5rem 2rem; max-width: 1280px; margin: 0 auto; }
        .ap-market-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .ap-market-header h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 800; color: #fff; }
        .ap-market-header h2 span { color: #38bdf8; }
        .ap-listings { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px,1fr)); gap: 1rem; }
        .ap-listing { border-radius: 16px; overflow: hidden; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); cursor: pointer; transition: all .2s; }
        .ap-listing:hover { border-color: rgba(14,165,233,.3); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,.3); }
        .ap-listing-img { width: 100%; height: 190px; object-fit: cover; }
        .ap-listing-placeholder { width: 100%; height: 190px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.03); }
        .ap-listing-body { padding: 1rem; }
        .ap-listing-price { font-size: 1.3rem; font-weight: 800; color: #38bdf8; letter-spacing: -.5px; }
        .ap-listing-name { font-size: .9rem; font-weight: 700; color: #fff; margin: .3rem 0 .2rem; }
        .ap-listing-meta { font-size: .75rem; color: rgba(255,255,255,.35); }
        .ap-market-empty { text-align: center; padding: 4rem; opacity: .35; }

        /* TESTIMONIALS */
        .ap-testi { background: rgba(255,255,255,.02); padding: 5rem 2rem; }
        .ap-testi-inner { max-width: 1280px; margin: 0 auto; }
        .ap-testi-header { margin-bottom: 2.5rem; }
        .ap-testi-header h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 800; color: #fff; }
        .ap-testi-header h2 span { color: #4ade80; }
        .ap-testi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 1rem; }
        .ap-testi-card { padding: 1.6rem; border-radius: 18px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); transition: border-color .2s; }
        .ap-testi-card:hover { border-color: rgba(255,255,255,.14); }
        .ap-testi-stars { color: #f59e0b; font-size: .85rem; margin-bottom: .7rem; }
        .ap-testi-q { font-size: .87rem; color: rgba(255,255,255,.55); line-height: 1.8; margin-bottom: 1.2rem; font-style: italic; }
        .ap-testi-author { display: flex; align-items: center; gap: .7rem; }
        .ap-testi-av { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .8rem; color: #fff; flex-shrink: 0; }
        .ap-testi-name { font-weight: 700; font-size: .85rem; color: #fff; }
        .ap-testi-role { font-size: .72rem; color: rgba(255,255,255,.3); }

        /* CTA */
        .ap-cta { position: relative; padding: 6rem 2rem; overflow: hidden; }
        .ap-cta-bg { position: absolute; inset: 0; }
        .ap-cta-bg img { width: 100%; height: 100%; object-fit: cover; opacity: .15; }
        .ap-cta-grad { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(6,14,9,.97) 0%, rgba(21,128,61,.15) 100%); }
        .ap-cta-inner { position: relative; z-index: 2; max-width: 700px; margin: 0 auto; text-align: center; }
        .ap-cta-label { font-size: .7rem; font-weight: 700; letter-spacing: 2px; color: #4ade80; text-transform: uppercase; margin-bottom: .6rem; }
        .ap-cta-inner h2 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; color: #fff; letter-spacing: -1px; margin-bottom: .8rem; }
        .ap-cta-inner p { color: rgba(255,255,255,.5); font-size: .95rem; margin-bottom: 2.5rem; line-height: 1.7; }
        .ap-cta-btns { display: flex; gap: .8rem; justify-content: center; flex-wrap: wrap; }
        .ap-cta-btn { display: inline-flex; align-items: center; gap: .5rem; padding: .85rem 1.8rem; border-radius: 10px; font-weight: 700; font-size: .9rem; text-decoration: none; border: none; cursor: pointer; transition: all .2s; }
        .ap-cta-btn:hover { transform: translateY(-2px); }

        /* FOOTER */
        .ap-footer { background: #040a06; border-top: 1px solid rgba(255,255,255,.05); padding: 4rem 2rem 2rem; }
        .ap-footer-inner { max-width: 1280px; margin: 0 auto; }
        .ap-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 2.5rem; margin-bottom: 3rem; }
        @media(max-width:768px) { .ap-footer-grid { grid-template-columns: 1fr 1fr; } }
        @media(max-width:480px) { .ap-footer-grid { grid-template-columns: 1fr; } }
        .ap-footer-brand { display: flex; align-items: center; gap: .6rem; margin-bottom: .8rem; }
        .ap-footer-brand img { height: 28px; border-radius: 7px; }
        .ap-footer-brand-name { font-weight: 800; color: #fff; font-size: .95rem; }
        .ap-footer-brand-sub { font-size: .62rem; color: rgba(255,255,255,.3); }
        .ap-footer-desc { font-size: .82rem; color: rgba(255,255,255,.3); line-height: 1.7; max-width: 220px; }
        .ap-footer h4 { font-size: .7rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,.35); margin-bottom: .9rem; }
        .ap-footer ul { list-style: none; display: flex; flex-direction: column; gap: .45rem; }
        .ap-footer ul a { color: rgba(255,255,255,.45); text-decoration: none; font-size: .83rem; transition: color .2s; }
        .ap-footer ul a:hover { color: #4ade80; }
        .ap-footer-bottom { border-top: 1px solid rgba(255,255,255,.05); padding-top: 1.5rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: .5rem; font-size: .75rem; color: rgba(255,255,255,.2); }
      `}</style>

      {/* NAV */}
      <nav className={`ap-nav${scrolled ? ' scrolled' : ''}`}>
        <a href="#home" className="ap-nav-logo">
          <img src="/agripulse-logo.png" alt="AgriPulse" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="ap-nav-logo-text">
            <span className="ap-nav-logo-name">AgriPulse</span>
            <span className="ap-nav-logo-sub">Smart Farming. Stronger Future.</span>
          </div>
        </a>
        <ul className="ap-nav-links">
          <li><a href="#solutions">Solutions</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#marketplace">Marketplace</a></li>
          <li><a href="#how">How it Works</a></li>
          <li><a href="#about">About</a></li>
        </ul>
        <div className="ap-nav-right">
          <Link to="/login" className="ap-btn-ghost">Login</Link>
          <Link to="/journey" className="ap-btn-cta">Get Started</Link>
        </div>
        <button className="ap-hamburger" onClick={() => setMobileOpen(p => !p)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="ap-mob">
          <button className="ap-mob-close" onClick={() => setMobileOpen(false)}><X size={28} /></button>
          {[['/#solutions', 'Solutions'], ['/#features', 'Features'], ['/#marketplace', 'Marketplace'], ['/#how', 'How it Works']].map(([h, l]) => (
            <a key={l} href={h} onClick={() => setMobileOpen(false)}>{l}</a>
          ))}
          <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
          <Link to="/marketplace/login" onClick={() => setMobileOpen(false)}>Marketplace</Link>
          <Link to="/vet/login" onClick={() => setMobileOpen(false)}>Vet Portal</Link>
          <Link to="/journey" onClick={() => setMobileOpen(false)} style={{ background: '#16a34a', padding: '.7rem 2rem', borderRadius: 10 }}>Get Started →</Link>
        </div>
      )}

      {/* HERO */}
      <section id="home" className="ap-hero">
        <img src="/farm-hero.jpg" alt="Farm" className="ap-hero-img" />
        <div className="ap-hero-grad" />
        <div className="ap-hero-grad2" />

        {/* Floating Passport Card */}
        <div className="ap-passport">
          <div className="ap-passport-header">
            <div className="ap-passport-icon"><QrCode size={18} color="#4ade80" /></div>
            <div>
              <div className="ap-passport-title">Digital Animal Passport</div>
              <div className="ap-passport-sub">Secure. Verifiable. Trusted.</div>
            </div>
          </div>
          <div className="ap-passport-img-row">
            <img src="/cow1.jpg" alt="Cow" className="ap-passport-cow" />
            <div className="ap-passport-qr">
              <QrCode size={42} color="#060e09" />
            </div>
          </div>
          <div className="ap-passport-verified">
            <CheckCircle size={14} color="#4ade80" />
            <span>Verified ✓</span>
          </div>
        </div>

        <div className="ap-hero-inner">
          <div className="ap-hero-badge"> All-in-One Livestock Platform</div>
          <h1 className="ap-hero-h1">
            Manage. Trade.<br />Care. <span className="green">Grow.</span>
          </h1>
          <p className="ap-hero-p">
            AgriPulse connects farmers, buyers and veterinarians on one secure platform for smarter livestock management across Kenya.
          </p>
          <div className="ap-hero-btns">
            <Link to="/journey" className="ap-hero-btn-primary">
              Start Farming <ArrowRight size={16} />
            </Link>
            <Link to="/marketplace" className="ap-hero-btn-secondary">
              Explore Marketplace <ArrowRight size={16} />
            </Link>
          </div>

          {/* Stats */}
          <div className="ap-stats">
            {[
              { icon: <Activity size={18} color="#4ade80" />, val: '15K+', label: 'Animals Registered' },
              { icon: <Home size={18} color="#4ade80" />, val: '500+', label: 'Active Farmers' },
              { icon: <Stethoscope size={18} color="#4ade80" />, val: '200+', label: 'Verified Vets' },
              { icon: <Shield size={18} color="#4ade80" />, val: '99.9%', label: 'Uptime & Security' },
            ].map(({ icon, val, label }) => (
              <div className="ap-stat" key={label}>
                <div className="ap-stat-icon">{icon}</div>
                <strong>{val}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTIONS */}
      <section id="solutions" className="ap-solutions">
        <div className="ap-solutions-title ap-fade">
          <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '2px', color: '#4ade80', textTransform: 'uppercase', marginBottom: '.5rem' }}>What We Offer</p>
          <h2>One Platform. <span>Four</span> Powerful Solutions.</h2>
        </div>
        <div className="ap-solutions-grid">
          {[
            { icon: <Home size={22} color="#4ade80" />, bg: 'rgba(22,163,74,.15)', color: '#4ade80', accentColor: 'rgba(22,163,74,.05)', title: 'Farm Management', desc: 'Track animals, production, health, breeding and more from one dashboard.', link: '/journey', linkColor: '#16a34a' },
            { icon: <ShoppingCart size={22} color="#38bdf8" />, bg: 'rgba(14,165,233,.15)', color: '#38bdf8', accentColor: 'rgba(14,165,233,.05)', title: 'Livestock Marketplace', desc: 'Buy and sell livestock securely and effortlessly with verified passports.', link: '/marketplace', linkColor: '#0ea5e9' },
            { icon: <Stethoscope size={22} color="#a78bfa" />, bg: 'rgba(139,92,246,.15)', color: '#a78bfa', accentColor: 'rgba(139,92,246,.05)', title: 'Veterinary Services', desc: 'Book appointments and access trusted care from licensed vets.', link: '/find-vet', linkColor: '#8b5cf6' },
            { icon: <QrCode size={22} color="#34d399" />, bg: 'rgba(52,211,153,.15)', color: '#34d399', accentColor: 'rgba(52,211,153,.05)', title: 'Digital Passport', desc: 'QR verified identity and complete animal records accessible anywhere.', link: '/journey', linkColor: '#0d9488' },
          ].map(({ icon, bg, color, accentColor, title, desc, link, linkColor }) => (
            <div className="ap-sol-card ap-fade" key={title} style={{ '--card-color': accentColor } as any}>
              <div className="ap-sol-icon" style={{ background: bg }}>{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <div className="ap-sol-arrow">
                <Link to={link}>
                  <div className="ap-sol-arrow-btn" style={{ background: bg, color }}>
                    <ArrowRight size={16} />
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
        {/* Trusted by */}
        <div className="ap-trusted ap-fade">
          <div className="ap-trusted-avatars">
            {[['#15803d','JM'],['#0284c7','SK'],['#0d9488','PO'],['#7c3aed','GW'],['#b45309','DM']].map(([bg, init]) => (
              <div className="ap-trusted-avatar" key={init} style={{ background: bg }}>{init}</div>
            ))}
          </div>
          <span>Trusted by farmers across the country</span>
          <span className="ap-trusted-count">500+</span>
          <span>and growing</span>
        </div>
      </section>

      {/* JOURNEY — SPLIT */}
      <section id="journey" style={{ background: '#040a06' }}>
        <div style={{ textAlign: 'center', padding: '3rem 2rem 2rem' }}>
          <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '2px', color: '#4ade80', textTransform: 'uppercase', marginBottom: '.5rem' }}>Choose Your Path</p>
          <h2 className="ap-fade" style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 800, color: '#fff' }}>Start Your Journey Today</h2>
        </div>
        <div className="ap-journey">
          {[
            { img: '/journey1.jpg', tag: 'Farm Owner', tagColor: '#4ade80', overlay: 'linear-gradient(to top, rgba(6,14,9,.92) 0%, rgba(21,128,61,.2) 100%)', title: 'Grow & Manage', desc: 'Your farm, fully digital. Register animals, track health and sell directly.', items: ['Digital Animal Passports', 'Milk & Health Tracking', 'Sell on Marketplace'], btnBg: 'linear-gradient(135deg,#15803d,#16a34a)', btn: 'Start as Farm Owner', link: '/journey' },
            { img: '/cow3.jpg', tag: 'Buyer', tagColor: '#38bdf8', overlay: 'linear-gradient(to top, rgba(6,14,9,.92) 0%, rgba(14,165,233,.2) 100%)', title: 'Browse & Purchase', desc: 'Find verified livestock with full passport history and buy securely.', items: ['Browse Live Listings', 'View Animal Passports', 'Secure Ownership Transfer'], btnBg: 'linear-gradient(135deg,#0ea5e9,#0284c7)', btn: 'Start as Buyer', link: '/marketplace/signup' },
            { img: '/vet1.jpg', tag: 'Veterinarian', tagColor: '#2dd4bf', overlay: 'linear-gradient(to top, rgba(6,14,9,.92) 0%, rgba(13,148,136,.2) 100%)', title: 'Treat & Verify', desc: 'Manage client farms, record treatments and issue health certificates.', items: ['Health Records', 'Vaccination Certificates', 'Appointment Management'], btnBg: 'linear-gradient(135deg,#0d9488,#0f766e)', btn: 'Join as Vet', link: '/vet/register' },
          ].map(({ img, tag, tagColor, overlay, title, desc, items, btnBg, btn, link }) => (
            <div className="ap-journey-panel" key={tag} onClick={() => navigate(link)}>
              <img src={img} alt={tag} />
              <div className="ap-journey-panel-overlay" style={{ background: overlay }} />
              <div className="ap-journey-content">
                <span className="ap-journey-tag" style={{ color: tagColor }}>● {tag}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
                <div className="ap-journey-list">
                  {items.map(i => <span key={i}><CheckCircle size={12} color={tagColor} /> {i}</span>)}
                </div>
                <Link to={link} className="ap-journey-btn" style={{ background: btnBg, color: '#fff' }} onClick={e => e.stopPropagation()}>{btn} →</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="ap-features">
        <div className="ap-features-header ap-fade">
          <div>
            <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '2px', color: '#4ade80', textTransform: 'uppercase', marginBottom: '.4rem' }}>Platform Features</p>
            <h2>Everything You Need<br /><span>In One Place</span></h2>
          </div>
          <Link to="/journey" className="ap-hero-btn-primary" style={{ textDecoration: 'none' }}>Start Free <ArrowRight size={16} /></Link>
        </div>
        <div className="ap-features-grid">
          {[
            { icon: <FileText size={20} color="#4ade80" />, bg: 'rgba(22,163,74,.15)', title: 'Digital Animal Passport', desc: 'QR-coded passports with full health, vaccination and ownership history.', badge: null },
            { icon: <ShoppingCart size={20} color="#38bdf8" />, bg: 'rgba(14,165,233,.15)', title: 'Live Marketplace', desc: 'List animals, receive offers, negotiate prices and transfer ownership securely.', badge: { label: 'New', bg: 'rgba(14,165,233,.1)', color: '#38bdf8' } },
            { icon: <Stethoscope size={20} color="#a78bfa" />, bg: 'rgba(139,92,246,.15)', title: 'Vet Network', desc: 'Connect with licensed vets across Kenya. Book appointments and get certificates.', badge: { label: 'New', bg: 'rgba(139,92,246,.1)', color: '#a78bfa' } },
            { icon: <Milk size={20} color="#fbbf24" />, bg: 'rgba(251,191,36,.15)', title: 'Milk Production Tracking', desc: 'Log daily production per animal and optimize your dairy herd performance.', badge: null },
            { icon: <Activity size={20} color="#f87171" />, bg: 'rgba(248,113,113,.15)', title: 'Health Records', desc: 'Detailed treatment logs, vaccination schedules and health certificates anywhere.', badge: null },
            { icon: <MessageSquare size={20} color="#34d399" />, bg: 'rgba(52,211,153,.15)', title: 'Direct Messaging', desc: 'Buyers message sellers. Farmers communicate with vets. All verified.', badge: null },
            { icon: <Shield size={20} color="#4ade80" />, bg: 'rgba(22,163,74,.15)', title: 'Secure Transfers', desc: 'Digital e-signatures and transfer codes make buying & selling safe.', badge: null },
          ].map(({ icon, bg, title, desc, badge }) => (
            <div className="ap-feat ap-fade" key={title}>
              <div className="ap-feat-icon" style={{ background: bg }}>{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
              {badge && <span className="ap-feat-badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>}
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="ap-how" id="how">
        <div className="ap-how-inner">
          <div className="ap-how-header ap-fade">
            <p className="ap-how-label">Simple Process</p>
            <h2>How AgriPulse Works</h2>
          </div>
          <div className="ap-how-tabs">
            {[['farmer', ' Farm Owner'], ['buyer', 'Buyer'], ['vet', ' Veterinarian']].map(([id, label]) => (
              <button key={id} className={`ap-how-tab${howTab === id ? ` active-${id === 'farmer' ? 'farm' : id}` : ''}`}
                onClick={() => setHowTab(id)}>{label}</button>
            ))}
          </div>
          <div className="ap-how-steps">
            {howSteps[howTab].map(({ n, t, d }) => (
              <div className="ap-how-step ap-fade" key={n}>
                <div className="ap-how-num" style={{ color: howTab === 'buyer' ? '#0ea5e9' : howTab === 'vet' ? '#0d9488' : '#16a34a' }}>{n}</div>
                <h4>{t}</h4>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MARKETPLACE PREVIEW */}
      <section id="marketplace" className="ap-market">
        <div className="ap-market-header ap-fade">
          <div>
            <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '2px', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '.4rem' }}>Live Marketplace</p>
            <h2>Browse Verified <span>Livestock For Sale</span></h2>
          </div>
          <Link to="/marketplace" className="ap-hero-btn-secondary" style={{ textDecoration: 'none' }}>View All <ArrowRight size={15} /></Link>
        </div>
        {listings.length > 0 ? (
          <div className="ap-listings">
            {listings.map((l: any) => {
              const photo = l.photos?.[0]?.url || l.animal?.photos?.[0]?.url;
              return (
                <div className="ap-listing ap-fade" key={l.id} onClick={() => navigate(`/marketplace/listing/${l.id}`)}>
                  {photo
                    ? <img src={photo} alt={l.animal?.name} className="ap-listing-img" />
                    : <div className="ap-listing-placeholder"><Activity size={32} color="rgba(255,255,255,.15)" /></div>
                  }
                  <div className="ap-listing-body">
                    <div className="ap-listing-price">KSh {Number(l.askingPrice).toLocaleString()}</div>
                    <div className="ap-listing-name">{l.title || l.animal?.name}</div>
                    <div className="ap-listing-meta">{l.animal?.breed} · {l.animal?.category} · {l.county}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ap-market-empty ap-fade">
            <Activity size={48} color="rgba(255,255,255,.2)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '.9rem' }}>Be the first to list an animal on the marketplace!</p>
            <Link to="/marketplace/create" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700, fontSize: '.88rem', marginTop: '.8rem', display: 'inline-block' }}>Create a listing →</Link>
          </div>
        )}
      </section>

      {/* TESTIMONIALS */}
      <div className="ap-testi" id="about">
        <div className="ap-testi-inner">
          <div className="ap-testi-header ap-fade">
            <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '2px', color: '#4ade80', textTransform: 'uppercase', marginBottom: '.4rem' }}>Farmer Stories</p>
            <h2>Trusted by Farmers <span>Across Kenya</span></h2>
          </div>
          <div className="ap-testi-grid">
            {[
              { q: 'AgriPulse transformed how I manage my 40-cow dairy farm. The digital passport means every buyer can verify my animals instantly.', name: 'James Mwangi', role: 'Dairy Farmer, Nakuru', init: 'JM', color: '#15803d' },
              { q: 'I bought 3 heifers through the marketplace. Full health history, direct chat with the farmer, and secure transfer — couldn\'t be easier.', name: 'Sarah Kamau', role: 'Livestock Buyer, Nairobi', init: 'SK', color: '#0284c7' },
              { q: 'As a vet, having all client farm records in one place has improved my service dramatically.', name: 'Dr. Peter Odhiambo', role: 'Veterinarian, Kisumu', init: 'PO', color: '#0d9488' },
              { q: 'Milk tracking helped me identify 5 underperforming cows. Fixed their feed — production up 30% in 2 months!', name: 'Grace Wanjiku', role: 'Dairy Farmer, Kiambu', init: 'GW', color: '#15803d' },
              { q: 'Sold 2 bulls through AgriPulse last month. The e-signature transfer process was smooth and professional.', name: 'David Mutua', role: 'Livestock Farmer, Machakos', init: 'DM', color: '#92400e' },
              { q: 'Booking vet appointments and sharing animal records directly saved me hours every week.', name: 'Agnes Chebet', role: 'Dairy Farmer, Uasin Gishu', init: 'AC', color: '#0d9488' },
            ].map(({ q, name, role, init, color }) => (
              <div className="ap-testi-card ap-fade" key={name}>
                <div className="ap-testi-stars">★★★★★</div>
                <p className="ap-testi-q">"{q}"</p>
                <div className="ap-testi-author">
                  <div className="ap-testi-av" style={{ background: `${color}30`, color }}>{init}</div>
                  <div>
                    <div className="ap-testi-name">{name}</div>
                    <div className="ap-testi-role">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="ap-cta">
        <div className="ap-cta-bg"><img src="/farm-field.jpg" alt="" /></div>
        <div className="ap-cta-grad" />
        <div className="ap-cta-inner">
          <p className="ap-cta-label ap-fade">Join AgriPulse Today</p>
          <h2 className="ap-fade">Ready to Transform<br />Your Farm?</h2>
          <p className="ap-fade">Join thousands of farmers, buyers, and vets already using AgriPulse across all 47 counties of Kenya.</p>
          <div className="ap-cta-btns">
            <Link to="/journey" className="ap-cta-btn" style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', color: '#fff', boxShadow: '0 4px 20px rgba(21,128,61,.4)' }}> Start as Farm Owner</Link>
            <Link to="/marketplace/signup" className="ap-cta-btn" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', boxShadow: '0 4px 20px rgba(14,165,233,.4)' }}> Browse Marketplace</Link>
            <Link to="/vet/register" className="ap-cta-btn" style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)', color: '#fff', boxShadow: '0 4px 20px rgba(13,148,136,.4)' }}>🩺 Join as Vet</Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="ap-footer">
        <div className="ap-footer-inner">
          <div className="ap-footer-grid">
            <div>
              <div className="ap-footer-brand">
                <img src="/agripulse-logo.png" alt="AgriPulse" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div>
                  <div className="ap-footer-brand-name">AgriPulse</div>
                  <div className="ap-footer-brand-sub">SMART FARMING. STRONGER FUTURE.</div>
                </div>
              </div>
              <p className="ap-footer-desc">Kenya's most complete livestock management and marketplace platform. Built for farmers, by people who care.</p>
            </div>
            <div>
              <h4>Platform</h4>
              <ul>
                <li><Link to="/journey">Farm Management</Link></li>
                <li><Link to="/marketplace">Marketplace</Link></li>
                <li><Link to="/find-vet">Veterinary Services</Link></li>
                <li><Link to="/journey">Animal Passport</Link></li>
              </ul>
            </div>
            <div>
              <h4>Resources</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how">How it Works</a></li>
                <li><a href="#about">About Us</a></li>
                <li><a href="#about">Farmer Stories</a></li>
              </ul>
            </div>
            <div>
              <h4>Contact Us</h4>
              <ul>
                <li><a href="tel:+254700123456">+254 700 123 456</a></li>
                <li><a href="mailto:support@agripulse.me">support@agripulse.me</a></li>
                <li><a href="#contact">Nairobi, Kenya</a></li>
              </ul>
            </div>
          </div>
          <div className="ap-footer-bottom">
            <span>© {new Date().getFullYear()} AgriPulse. All rights reserved.</span>
            <span>Built for farmers, by people who care about agriculture.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
