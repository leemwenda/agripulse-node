import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface PlatformStats {
  totalFarms: number;
  totalUsers: number;
  totalAnimals: number;
  openIssues: number;
}
interface FarmUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  registrationStatus: string;
  lastLogin: string | null;
  createdAt: string;
  farmId: number | null;
  farmName?: string;
}
interface Farm {
  id: number;
  name: string;
  location?: string;
  adminName?: string;
  workerCount?: number;
  animalCount?: number;
  status?: string;
  createdAt: string;
}
interface FeatureFlag {
  id: number;
  flagKey: string;
  label: string;
  description: string;
  type: string;
  value: string;
  category: string;
}
interface SystemIssue {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reporter: { name: string; email: string };
}
interface Announcement {
  id: number;
  title: string;
  body: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  createdByUser: { name: string };
}
interface AuditEntry {
  id: number;
  action: string;
  actorName: string;
  target: string;
  ip?: string;
  createdAt: string;
}
interface Notification {
  id: number;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' });
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Design tokens ──────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

  .sp-root *, .sp-root *::before, .sp-root *::after { box-sizing: border-box; }

  .sp-root {
    --c-bg: #ffffff;
    --c-surface: #f8f8f7;
    --c-border: rgba(0,0,0,0.08);
    --c-border-med: rgba(0,0,0,0.12);
    --c-text: #111;
    --c-text-2: #555;
    --c-text-3: #999;
    --c-purple: #534AB7;
    --c-purple-bg: #EEEDFE;
    --c-purple-border: #CECBF6;
    --c-green: #1D9E75;
    --c-green-bg: #EAF3DE;
    --c-green-border: #C0DD97;
    --c-amber: #BA7517;
    --c-amber-bg: #FAEEDA;
    --c-amber-border: #FAC775;
    --c-red: #A32D2D;
    --c-red-bg: #FCEBEB;
    --c-red-border: #F7C1C1;
    --c-blue: #185FA5;
    --c-blue-bg: #E6F1FB;
    --c-blue-border: #B5D4F4;
    --radius-sm: 6px;
    --radius-md: 9px;
    --radius-lg: 12px;
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
    background: var(--c-surface);
    color: var(--c-text);
    display: flex;
  }

  @media (prefers-color-scheme: dark) {
    .sp-root {
      --c-bg: #141414;
      --c-surface: #0d0d0d;
      --c-border: rgba(255,255,255,0.07);
      --c-border-med: rgba(255,255,255,0.12);
      --c-text: #f0f0f0;
      --c-text-2: #aaa;
      --c-text-3: #666;
      --c-purple-bg: rgba(83,74,183,0.15);
      --c-purple-border: rgba(83,74,183,0.35);
      --c-green-bg: rgba(29,158,117,0.12);
      --c-green-border: rgba(29,158,117,0.3);
      --c-amber-bg: rgba(186,117,23,0.12);
      --c-amber-border: rgba(186,117,23,0.3);
      --c-red-bg: rgba(163,45,45,0.12);
      --c-red-border: rgba(163,45,45,0.3);
      --c-blue-bg: rgba(24,95,165,0.15);
      --c-blue-border: rgba(24,95,165,0.3);
    }
  }

  /* Sidebar */
  .sp-sidebar {
    width: 224px;
    flex-shrink: 0;
    background: var(--c-bg);
    border-right: 1px solid var(--c-border);
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: sticky;
    top: 0;
    overflow-y: auto;
  }

  .sp-logo {
    padding: 18px 16px 14px;
    border-bottom: 1px solid var(--c-border);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .sp-logo-mark {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--c-purple);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }
  .sp-logo-name { font-size: 14px; font-weight: 600; color: var(--c-text); }
  .sp-logo-tag {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: .07em;
    text-transform: uppercase;
    background: var(--c-purple-bg);
    color: var(--c-purple);
    border: 1px solid var(--c-purple-border);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .sp-nav-section {
    padding: 14px 12px 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--c-text-3);
  }

  .sp-nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 10px;
    margin: 1px 6px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 13px;
    font-weight: 400;
    color: var(--c-text-2);
    background: none;
    border: none;
    width: calc(100% - 12px);
    text-align: left;
    font-family: inherit;
    transition: background .15s ease, color .15s ease;
    position: relative;
  }
  .sp-nav-item:hover {
    background: rgba(83,74,183,0.08);
    color: var(--c-purple);
  }
  .sp-nav-item.active {
    background: rgba(83,74,183,0.12);
    color: var(--c-purple);
    font-weight: 500;
    box-shadow: inset 3px 0 0 var(--c-purple);
  }

  .sp-nav-badge {
    margin-left: auto;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
    background: var(--c-red-bg);
    color: var(--c-red);
    border: 1px solid var(--c-red-border);
  }
  .sp-nav-badge.amber {
    background: var(--c-amber-bg);
    color: var(--c-amber);
    border-color: var(--c-amber-border);
  }

  .sp-sidebar-footer {
    margin-top: auto;
    padding: 12px;
    border-top: 1px solid var(--c-border);
  }
  .sp-user-row { display: flex; align-items: center; gap: 9px; }
  .sp-user-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--c-purple);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .sp-user-name { font-size: 12px; font-weight: 500; color: var(--c-text); }
  .sp-user-role { font-size: 11px; color: var(--c-text-3); }
  .sp-logout-btn {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--c-text-3);
    padding: 4px;
    border-radius: 4px;
    font-size: 16px;
    line-height: 1;
    display: flex;
    align-items: center;
    transition: color .15s ease, background .15s ease;
  }
  .sp-logout-btn:hover { color: var(--c-red); background: var(--c-red-bg); }

  /* Main area */
  .sp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow-x: hidden; }

  .sp-topbar {
    height: 52px;
    border-bottom: 1px solid var(--c-border);
    background: var(--c-bg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
  }
  .sp-topbar-left { display: flex; flex-direction: column; gap: 1px; }
  .sp-topbar-title { font-size: 14px; font-weight: 600; color: var(--c-text); }
  .sp-topbar-sub { font-size: 12px; color: var(--c-text-3); }
  .sp-topbar-right { display: flex; align-items: center; gap: 10px; }
  .sp-top-btn {
    background: none;
    border: 1px solid var(--c-border);
    border-radius: var(--radius-sm);
    padding: 5px 10px;
    font-size: 12px;
    color: var(--c-text-2);
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: background .15s ease, border-color .15s ease, color .15s ease;
  }
  .sp-top-btn:hover {
    background: rgba(83,74,183,0.08);
    border-color: rgba(83,74,183,0.25);
    color: var(--c-purple);
  }
  .sp-live { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--c-text-3); }
  .sp-live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c-green); animation: sp-pulse 2s infinite; box-shadow: 0 0 0 0 var(--c-green); }
  @keyframes sp-pulse { 0%{opacity:1;box-shadow:0 0 0 0 rgba(29,158,117,.5)} 50%{opacity:.7;box-shadow:0 0 0 4px rgba(29,158,117,0)} 100%{opacity:1;box-shadow:0 0 0 0 rgba(29,158,117,0)} } 50%{opacity:.7;box-shadow:0 0 0 4px rgba(29,158,117,0)} 100%{opacity:1;box-shadow:0 0 0 0 rgba(29,158,117,0)} }

  .sp-content { padding: 24px; flex: 1; overflow-y: auto; }

  /* Cards */
  .sp-card {
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 16px;
    transition: border-color .15s ease;
  }
  .sp-card:hover {
    border-color: var(--c-purple-border);
  }
  .sp-card-head {
    padding: 14px 18px;
    border-bottom: 1px solid var(--c-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .sp-card-title { font-size: 13px; font-weight: 600; color: var(--c-text); }
  .sp-card-sub { font-size: 12px; color: var(--c-text-3); margin-top: 2px; }

  /* Metric cards */
  .sp-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
  .sp-metric {
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-md);
    padding: 16px 18px;
    position: relative;
    overflow: hidden;
    transition: border-color .15s ease;
    cursor: default;
  }
  .sp-metric:hover {
    border-color: var(--c-purple-border);
  }
  .sp-metric-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: var(--c-text-3);
    margin-bottom: 8px;
  }
  .sp-metric-val { font-size: 28px; font-weight: 600; color: var(--c-text); line-height: 1; letter-spacing: -0.02em; }
  .sp-metric-sub { font-size: 11px; color: var(--c-text-3); margin-top: 4px; }
  .sp-metric-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; }

  /* Grid helpers */
  .sp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .sp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }

  /* Table */
  .sp-table-wrap { overflow-x: auto; }
  .sp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .sp-table thead tr { border-bottom: 1px solid var(--c-border); }
  .sp-table th {
    padding: 9px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--c-text-3);
    white-space: nowrap;
  }
  .sp-table td { padding: 11px 16px; color: var(--c-text-2); border-bottom: 1px solid var(--c-border); transition: background .15s ease; }
  .sp-table tbody tr:last-child td { border-bottom: none; }
  .sp-table tbody tr:hover td { background: rgba(83,74,183,0.05); }
  .sp-table tbody tr:hover td:first-child { box-shadow: inset 2px 0 0 var(--c-purple); }
  .sp-table .td-bold { font-weight: 500; color: var(--c-text); }
  .sp-table .td-mono { font-family: ui-monospace, monospace; font-size: 11px; }
  .sp-table .td-muted { color: var(--c-text-3); font-size: 12px; }

  .sp-tfoot {
    padding: 9px 16px;
    font-size: 11px;
    color: var(--c-text-3);
    border-top: 1px solid var(--c-border);
  }

  /* Badges */
  .sp-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 500;
    border: 1px solid;
  }
  .sp-badge.green { background: var(--c-green-bg); color: var(--c-green); border-color: var(--c-green-border); }
  .sp-badge.red { background: var(--c-red-bg); color: var(--c-red); border-color: var(--c-red-border); }
  .sp-badge.amber { background: var(--c-amber-bg); color: var(--c-amber); border-color: var(--c-amber-border); }
  .sp-badge.blue { background: var(--c-blue-bg); color: var(--c-blue); border-color: var(--c-blue-border); }
  .sp-badge.purple { background: var(--c-purple-bg); color: var(--c-purple); border-color: var(--c-purple-border); }
  .sp-badge.gray { background: var(--c-surface); color: var(--c-text-3); border-color: var(--c-border); }

  /* Avatar */
  .sp-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .sp-avatar.purple { background: var(--c-purple-bg); color: var(--c-purple); }
  .sp-avatar.teal { background: var(--c-green-bg); color: var(--c-green); }
  .sp-avatar.gray { background: var(--c-surface); color: var(--c-text-3); border: 1px solid var(--c-border); }

  .sp-user-cell { display: flex; align-items: center; gap: 10px; }
  .sp-user-cell-info { display: flex; flex-direction: column; gap: 1px; }

  /* Search row */
  .sp-search-row {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--c-border);
    flex-wrap: wrap;
    background: var(--c-surface);
  }
  .sp-search-wrap { position: relative; display: flex; align-items: center; }
  .sp-search-icon {
    position: absolute;
    left: 9px;
    width: 14px;
    height: 14px;
    color: var(--c-text-3);
    pointer-events: none;
  }
  .sp-search { padding-left: 30px !important; width: 200px; }

  /* Inputs */
  .sp-input, .sp-select, .sp-textarea {
    height: 32px;
    padding: 0 10px;
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-sm);
    color: var(--c-text);
    font-size: 12px;
    font-family: inherit;
    outline: none;
    transition: border-color .18s ease, box-shadow .18s ease;
  }
  .sp-input:hover, .sp-select:hover { border-color: var(--c-purple-border); }
  .sp-input:focus, .sp-select:focus, .sp-textarea:focus {
    border-color: var(--c-purple);
    box-shadow: 0 0 0 3px rgba(83,74,183,.15);
  }
  .sp-textarea { height: auto; padding: 8px 10px; resize: vertical; width: 100%; }
  .sp-input-full { width: 100%; }
  .sp-label { display: block; font-size: 11px; font-weight: 500; color: var(--c-text-3); margin-bottom: 5px; letter-spacing: .04em; }

  /* Buttons */
  .sp-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid var(--c-border);
    background: var(--c-bg);
    color: var(--c-text-2);
    transition: background .15s ease, color .15s ease, border-color .15s ease;
  }
  .sp-btn:hover {
    background: rgba(83,74,183,0.08);
    border-color: rgba(83,74,183,0.3);
    color: var(--c-purple);
  }
  .sp-btn:active { opacity: .85; }
  .sp-btn:disabled { opacity: .4; cursor: not-allowed; }
  .sp-btn.sm { padding: 3px 9px; font-size: 11px; }
  .sp-btn.primary { background: var(--c-purple); color: #fff; border-color: var(--c-purple); }
  .sp-btn.primary:hover { opacity: .9; }
  .sp-btn.success { background: var(--c-green-bg); color: var(--c-green); border-color: var(--c-green-border); }
  .sp-btn.success:hover { background: var(--c-green-bg); color: var(--c-green); border-color: var(--c-green); }
  .sp-btn.danger { background: var(--c-red-bg); color: var(--c-red); border-color: var(--c-red-border); }
  .sp-btn.danger:hover { background: var(--c-red-bg); color: var(--c-red); border-color: var(--c-red); }
  .sp-btn.amber { background: var(--c-amber-bg); color: var(--c-amber); border-color: var(--c-amber-border); }
  .sp-btn.amber:hover { background: var(--c-amber-bg); color: var(--c-amber); border-color: var(--c-amber); }

  /* Toggle */
  .sp-toggle { position: relative; width: 38px; height: 22px; cursor: pointer; flex-shrink: 0; }
  .sp-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .sp-toggle-track {
    position: absolute;
    inset: 0;
    border-radius: 22px;
    background: var(--c-border-med);
    border: 1px solid var(--c-border);
    transition: .2s;
  }
  .sp-toggle input:checked ~ .sp-toggle-track { background: var(--c-purple); border-color: var(--c-purple); }
  .sp-toggle-thumb {
    position: absolute;
    width: 16px;
    height: 16px;
    top: 3px;
    left: 3px;
    background: #fff;
    border-radius: 50%;
    transition: .2s;
    box-shadow: 0 1px 3px rgba(0,0,0,.2);
  }
  .sp-toggle input:checked ~ .sp-toggle-thumb { left: 19px; }

  /* Feature flag row */
  .sp-flag-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--c-border);
    transition: background .18s ease;
  }
  .sp-flag-row:hover { background: rgba(83,74,183,0.05); }
  .sp-flag-row:last-child { border-bottom: none; }
  .sp-flag-name { font-size: 13px; font-weight: 500; color: var(--c-text); }
  .sp-flag-desc { font-size: 12px; color: var(--c-text-3); margin-top: 2px; }
  .sp-flag-key { font-size: 10px; font-family: ui-monospace, monospace; color: var(--c-text-3); margin-top: 3px; opacity: .6; }
  .sp-section-cat {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: var(--c-text-3);
    padding: 10px 18px 7px;
    border-bottom: 1px solid var(--c-border);
    background: var(--c-surface);
  }

  /* Activity */
  .sp-activity-item {
    display: flex;
    gap: 12px;
    padding: 13px 18px;
    border-bottom: 1px solid var(--c-border);
    align-items: flex-start;
    transition: background .18s ease;
  }
  .sp-activity-item:hover { background: var(--c-surface); }
  .sp-activity-item:last-child { border-bottom: none; }
  .sp-activity-icon {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sp-activity-text { font-size: 13px; color: var(--c-text); line-height: 1.45; }
  .sp-activity-time { font-size: 11px; color: var(--c-text-3); margin-top: 2px; }

  /* Notifications */
  .sp-notif-item {
    display: flex;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--c-border);
    cursor: pointer;
    transition: background .18s ease, box-shadow .18s ease;
  }
  .sp-notif-item:last-child { border-bottom: none; }
  .sp-notif-item:hover { background: rgba(83,74,183,0.06); box-shadow: inset 2px 0 0 var(--c-purple); }
  .sp-notif-item.unread { background: color-mix(in srgb, var(--c-purple-bg), transparent 40%); }
  .sp-notif-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--c-purple);
    flex-shrink: 0;
    margin-top: 5px;
  }
  .sp-notif-dot.read { background: transparent; border: 1px solid var(--c-border-med); }
  .sp-notif-title { font-size: 13px; font-weight: 500; color: var(--c-text); }
  .sp-notif-body { font-size: 12px; color: var(--c-text-2); margin-top: 2px; line-height: 1.45; }
  .sp-notif-time { font-size: 11px; color: var(--c-text-3); margin-top: 4px; }

  /* Farm cards */
  .sp-farm-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 14px; }
  .sp-farm-card {
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-md);
    padding: 16px 18px;
    cursor: pointer;
    transition: border-color .15s;
  }
  .sp-farm-card:hover { border-color: var(--c-purple); }
  .sp-farm-name { font-size: 14px; font-weight: 600; color: var(--c-text); margin-bottom: 8px; }
  .sp-farm-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  .sp-farm-stat { font-size: 12px; color: var(--c-text-3); display: flex; align-items: center; gap: 4px; }

  /* Review panel */
  .sp-review-panel {
    background: var(--c-bg);
    border: 1px solid var(--c-purple-border);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 16px;
  }

  /* Spinner */
  .sp-spinner {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 48px;
  }
  .sp-spinner-ring {
    width: 26px;
    height: 26px;
    border: 2px solid var(--c-border);
    border-top-color: var(--c-purple);
    border-radius: 50%;
    animation: sp-spin .65s linear infinite;
  }
  @keyframes sp-spin { to { transform: rotate(360deg); } }

  /* Toast */
  .sp-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 10px 18px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    z-index: 9999;
    animation: sp-fadein .2s ease;
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0,0,0,.12);
  }
  .sp-toast.success { background: #1D9E75; color: #fff; }
  .sp-toast.error { background: #A32D2D; color: #fff; }
  @keyframes sp-fadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

  /* Empty state */
  .sp-empty { text-align: center; padding: 48px 24px; color: var(--c-text-3); font-size: 13px; }
  .sp-empty svg { width: 32px; height: 32px; margin: 0 auto 10px; display: block; opacity: .35; }

  /* Responsive */
  @media (max-width: 900px) {
    .sp-sidebar { width: 192px; }
    .sp-metrics { grid-template-columns: 1fr 1fr; }
    .sp-grid-2 { grid-template-columns: 1fr; }
    .sp-farm-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 700px) {
    .sp-sidebar { display: none; }
    .sp-metrics { grid-template-columns: 1fr 1fr; }
    .sp-grid-3 { grid-template-columns: 1fr 1fr; }
    .sp-content { padding: 14px; }
  }
`;

// ─── Micro components ──────────────────────────────────────────────────────
function Spinner() {
  return <div className="sp-spinner"><div className="sp-spinner-ring" /></div>;
}

function Badge({ label, color = 'gray' }: { label: string; color?: string }) {
  return <span className={`sp-badge ${color}`}>{label}</span>;
}

function Avatar({ name, role }: { name: string; role: string }) {
  const c = role === 'superadmin' ? 'purple' : role === 'admin' ? 'teal' : 'gray';
  return <div className={`sp-avatar ${c}`}>{initials(name)}</div>;
}

function Btn({ children, onClick, variant = '', size = '', disabled = false, type = 'button' }:
  { children: React.ReactNode; onClick?: () => void; variant?: string; size?: string; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button type={type} className={`sp-btn ${variant} ${size}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Toast({ msg, type = 'success', onDone }: { msg: string; type?: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  return <div className={`sp-toast ${type}`}>{msg}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="sp-card">{children}</div>;
}

function CardHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="sp-card-head">
      <div>
        <div className="sp-card-title">{title}</div>
        {sub && <div className="sp-card-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function TableFoot({ count, label = 'items' }: { count: number; label?: string }) {
  return <div className="sp-tfoot">{count} {label}</div>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="sp-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" /><path d="M12 7v5l3 3" />
      </svg>
      {label}
    </div>
  );
}

// ─── Priority / status color maps ─────────────────────────────────────────
function priorityColor(p: string) {
  return p === 'critical' ? 'red' : p === 'high' ? 'red' : p === 'medium' ? 'amber' : 'gray';
}
function statusColor(s: string) {
  return s === 'open' ? 'red' : s === 'resolved' || s === 'closed' ? 'green' : s === 'in_review' ? 'amber' : 'gray';
}
function annTypeColor(t: string): string {
  const m: Record<string, string> = { info: 'blue', success: 'green', warning: 'amber', update: 'purple' };
  return m[t] || 'gray';
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [farms, setFarms] = useState<FarmUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => { setStats(data.stats); setFarms(data.recentFarms || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const kpis = [
    { label: 'Total farms', value: stats?.totalFarms ?? 0, sub: 'Registered', bar: 'var(--c-green)' },
    { label: 'Total users', value: stats?.totalUsers ?? 0, sub: 'Across all farms', bar: 'var(--c-purple)' },
    { label: 'Active animals', value: stats?.totalAnimals ?? 0, sub: 'Platform-wide', bar: '#BA7517' },
    { label: 'Open issues', value: stats?.openIssues ?? 0, sub: stats?.openIssues ? 'Needs attention' : 'All clear', bar: stats?.openIssues ? 'var(--c-red)' : 'var(--c-green)' },
  ];

  const activityColors: Record<string, { bg: string; color: string }> = {
    default: { bg: 'var(--c-purple-bg)', color: 'var(--c-purple)' },
    teal: { bg: 'var(--c-green-bg)', color: 'var(--c-green)' },
    amber: { bg: 'var(--c-amber-bg)', color: 'var(--c-amber)' },
  };

  return (
    <>
      <div className="sp-metrics">
        {kpis.map(k => (
          <div className="sp-metric" key={k.label}>
            <div className="sp-metric-label">{k.label}</div>
            <div className="sp-metric-val">{k.value}</div>
            <div className="sp-metric-sub">{k.sub}</div>
            <div className="sp-metric-bar" style={{ background: k.bar }} />
          </div>
        ))}
      </div>

      <div className="sp-grid-2">
        <Card>
          <CardHead title="Recent registrations" sub="Last 10" />
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr><th>User</th><th>Status</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {farms.length === 0 && (
                  <tr><td colSpan={3}><EmptyState label="No registrations yet" /></td></tr>
                )}
                {farms.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div className="sp-user-cell">
                        <Avatar name={f.name} role={f.role} />
                        <div className="sp-user-cell-info">
                          <span className="td-bold">{f.name}</span>
                          <span className="td-mono td-muted">{f.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {f.registrationStatus === 'pending'
                        ? <Badge label="Pending" color="amber" />
                        : f.isActive
                          ? <Badge label="Active" color="green" />
                          : <Badge label="Inactive" color="red" />}
                    </td>
                    <td className="td-muted">{fmtDateShort(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TableFoot count={farms.length} label="recent registrations" />
        </Card>

        <Card>
          <CardHead title="Recent activity" sub="System events" />
          {/* Static placeholder — swap for real audit feed from API */}
          <div className="sp-activity-item">
            <div className="sp-activity-icon" style={{ background: activityColors.teal.bg, color: activityColors.teal.color }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <div><div className="sp-activity-text">User approved</div><div className="sp-activity-time">just now</div></div>
          </div>
          <div className="sp-activity-item">
            <div className="sp-activity-icon" style={{ background: activityColors.default.bg, color: activityColors.default.color }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
            </div>
            <div><div className="sp-activity-text">New farm registered</div><div className="sp-activity-time">2 hours ago</div></div>
          </div>
          <div className="sp-activity-item">
            <div className="sp-activity-icon" style={{ background: activityColors.amber.bg, color: activityColors.amber.color }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <div><div className="sp-activity-text">Feature flag toggled</div><div className="sp-activity-time">yesterday</div></div>
          </div>
        </Card>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab() {
  return (
    <>
      <div className="sp-grid-3">
        {[
          { label: 'Registrations (30d)', val: '—', sub: 'Fetching…', bar: 'var(--c-purple)' },
          { label: 'Avg logins / day', val: '—', sub: 'Last 7 days', bar: 'var(--c-green)' },
          { label: 'Records created', val: '—', sub: 'All time', bar: '#BA7517' },
        ].map(k => (
          <div className="sp-metric" key={k.label}>
            <div className="sp-metric-label">{k.label}</div>
            <div className="sp-metric-val" style={{ fontSize: 22 }}>{k.val}</div>
            <div className="sp-metric-sub">{k.sub}</div>
            <div className="sp-metric-bar" style={{ background: k.bar }} />
          </div>
        ))}
      </div>
      <Card>
        <CardHead title="Farm registrations over time" sub="Connect your analytics API to populate this chart" />
        <EmptyState label="No analytics data available — wire up /admin/analytics to enable charts" />
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FARMS TAB
// ══════════════════════════════════════════════════════════════════════════════
function FarmsTab() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Farm | null>(null);

  useEffect(() => {
    api.get('/admin/farms')
      .then(({ data }) => setFarms(data.farms || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  if (selected) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Btn onClick={() => setSelected(null)}> Back to farms</Btn>
        </div>
        <Card>
          <CardHead title={selected.name} sub={selected.location || 'No location set'} action={<Badge label="Active" color="green" />} />
          <div style={{ padding: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
              <div className="sp-metric">
                <div className="sp-metric-label">Workers</div>
                <div className="sp-metric-val" style={{ fontSize: 22 }}>{selected.workerCount ?? '—'}</div>
              </div>
              <div className="sp-metric">
                <div className="sp-metric-label">Animals</div>
                <div className="sp-metric-val" style={{ fontSize: 22 }}>{selected.animalCount ?? '—'}</div>
              </div>
              <div className="sp-metric">
                <div className="sp-metric-label">Registered</div>
                <div className="sp-metric-val" style={{ fontSize: 16, marginTop: 6 }}>{fmtDate(selected.createdAt)}</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--c-text-3)' }}>
              Add a <code>/admin/farms/:id</code> endpoint to load full farm details, workers, and animal records here.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="sp-farm-grid">
        {farms.length === 0 && <EmptyState label="No farms registered yet" />}
        {farms.map(f => (
          <div className="sp-farm-card" key={f.id} onClick={() => setSelected(f)}>
            <div className="sp-farm-name">{f.name}</div>
            <div className="sp-farm-meta">
              {f.workerCount != null && <span className="sp-farm-stat">{f.workerCount} workers</span>}
              {f.animalCount != null && <span className="sp-farm-stat"> {f.animalCount} animals</span>}
              {f.location && <span className="sp-farm-stat">{f.location}</span>}
            </div>
            <Badge label={f.status === 'pending' ? 'Pending' : 'Active'} color={f.status === 'pending' ? 'amber' : 'green'} />
          </div>
        ))}
      </div>
      <TableFoot count={farms.length} label="farms" />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════════════════════════
function UsersTab() {
  const [users, setUsers] = useState<FarmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    api.get(`/admin/users?${params}`)
      .then(({ data }) => setUsers(data.users || []))
      .finally(() => setLoading(false));
  }, [search, role]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (path: string, method: 'put' | 'delete', body?: object, msg?: string) => {
    try {
      if (method === 'put') await api.put(path, body);
      else await api.delete(path);
      setToast({ msg: msg || 'Done', type: 'success' });
      load();
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || 'Action failed', type: 'error' });
    }
  };

  const filtered = statusFilter
    ? users.filter(u => {
      if (statusFilter === 'pending') return u.registrationStatus === 'pending';
      if (statusFilter === 'active') return u.isActive && u.registrationStatus !== 'pending';
      if (statusFilter === 'inactive') return !u.isActive;
      return true;
    })
    : users;

  const pendingCount = users.filter(u => u.registrationStatus === 'pending').length;

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <Card>
        <div className="sp-search-row">
          <div className="sp-search-wrap">
            <svg className="sp-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="sp-input sp-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email…"
            />
          </div>
          <select className="sp-select" value={role} onChange={e => setRole(e.target.value)} style={{ height: 32 }}>
            <option value="">All roles</option>
            <option value="superadmin">Superadmin</option>
            <option value="admin">Admin</option>
            <option value="worker">Worker</option>
          </select>
          <select className="sp-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: 32 }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
          {(search || role || statusFilter) && (
            <Btn onClick={() => { setSearch(''); setRole(''); setStatusFilter(''); }}>Clear</Btn>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {pendingCount > 0 && <Badge label={`${pendingCount} pending`} color="amber" />}
            <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{filtered.length} users</span>
          </div>
        </div>

        {loading ? <Spinner /> : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr><th>User</th><th>Farm</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6}><EmptyState label="No users found" /></td></tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} style={u.registrationStatus === 'pending' ? { background: 'color-mix(in srgb, var(--c-amber-bg), transparent 60%)' } : undefined}>
                    <td>
                      <div className="sp-user-cell">
                        <Avatar name={u.name} role={u.role} />
                        <div className="sp-user-cell-info">
                          <span className="td-bold">{u.name}</span>
                          <span className="td-mono td-muted">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="td-muted">{u.farmName || '—'}</td>
                    <td><Badge label={u.role} color={u.role === 'superadmin' ? 'purple' : u.role === 'admin' ? 'blue' : 'gray'} /></td>
                    <td>
                      {u.registrationStatus === 'pending'
                        ? <Badge label="Pending" color="amber" />
                        : u.isActive ? <Badge label="Active" color="green" /> : <Badge label="Inactive" color="red" />}
                    </td>
                    <td className="td-muted">{fmtDate(u.createdAt)}</td>
                    <td>
                      {u.role !== 'superadmin' ? (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {u.registrationStatus === 'pending' && (
                            <Btn variant="success" size="sm"
                              onClick={() => doAction(`/admin/users/${u.id}/status`, 'put', { isActive: true, registrationStatus: 'approved' }, `${u.name} approved`)}>
                              Approve
                            </Btn>
                          )}
                          <Btn variant={u.isActive ? 'amber' : 'success'} size="sm"
                            onClick={() => doAction(`/admin/users/${u.id}/status`, 'put',
                              { isActive: !u.isActive, registrationStatus: u.registrationStatus },
                              u.isActive ? `${u.name} deactivated` : `${u.name} activated`)}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </Btn>
                          <Btn variant="danger" size="sm"
                            onClick={() => {
                              if (confirm(`Permanently delete ${u.name}?\n\nThis will also delete every animal, milk record, health record, breeding record, and financial transaction tied to this account (and any workers under it, if it's a farm account). This cannot be undone.`)) {
                                doAction(`/admin/users/${u.id}`, 'delete', undefined, `${u.name} and all related data deleted`);
                              }
                            }}>
                            Delete
                          </Btn>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--c-text-3)', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TableFoot count={filtered.length} label="users" />
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ISSUES TAB
// ══════════════════════════════════════════════════════════════════════════════
function IssuesTab() {
  const [issues, setIssues] = useState<SystemIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<SystemIssue | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('in_review');
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(null);

  const load = () => {
    api.get('/admin/issues').then(({ data }) => setIssues(data.issues || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const update = async () => {
    try {
      await api.put(`/admin/issues/${reviewing!.id}`, { status, adminNote: note });
      setToast({ msg: 'Issue updated' });
      setReviewing(null);
      load();
    } catch {
      setToast({ msg: 'Update failed', type: 'error' });
    }
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {reviewing && (
        <div className="sp-review-panel">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--c-text)', marginBottom: 6 }}>{reviewing.title}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge label={reviewing.priority} color={priorityColor(reviewing.priority)} />
                <Badge label={reviewing.category} color="blue" />
              </div>
            </div>
            <Btn onClick={() => setReviewing(null)}> Close</Btn>
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6, borderLeft: '3px solid var(--c-border)', paddingLeft: 12, marginBottom: 16 }}>
            {reviewing.description}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="sp-label">Update status</label>
              <select className="sp-select" value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', height: 32 }}>
                <option value="in_review">In review</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="open">Reopen</option>
              </select>
            </div>
            <div>
              <label className="sp-label">Reporter</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
                <Avatar name={reviewing.reporter?.name || '?'} role="worker" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text)' }}>{reviewing.reporter?.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--c-text-3)' }}>{reviewing.reporter?.email}</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="sp-label">Admin note (shown to user on resolve)</label>
            <textarea
              className="sp-textarea"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Describe what was done or found…"
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="success" onClick={update}>Save update</Btn>
            <Btn onClick={() => setReviewing(null)}>Cancel</Btn>
          </div>
        </div>
      )}

      <Card>
        {loading ? <Spinner /> : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr><th>Issue</th><th>Reporter</th><th>Priority</th><th>Status</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {issues.length === 0 && (
                  <tr><td colSpan={6}><EmptyState label="No issues reported — all clear" /></td></tr>
                )}
                {issues.map(iss => (
                  <tr key={iss.id}>
                    <td>
                      <div className="td-bold" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iss.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>{iss.category}</div>
                    </td>
                    <td>
                      <div className="sp-user-cell">
                        <Avatar name={iss.reporter?.name || '?'} role="worker" />
                        <span style={{ fontSize: 12, color: 'var(--c-text-2)' }}>{iss.reporter?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td><Badge label={iss.priority} color={priorityColor(iss.priority)} /></td>
                    <td><Badge label={iss.status.replace('_', ' ')} color={statusColor(iss.status)} /></td>
                    <td className="td-muted">{fmtDateShort(iss.createdAt)}</td>
                    <td>
                      <Btn size="sm" variant="primary"
                        onClick={() => { setReviewing(iss); setNote(iss.adminNote || ''); setStatus('in_review'); }}>
                        Review
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TableFoot count={issues.length} label="issues" />
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS TAB
// ══════════════════════════════════════════════════════════════════════════════
function AnnouncementsTab() {
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(null);
  const [activeReportId, setActiveReportId] = useState<number | null>(null);
  const [report, setReport] = useState<{ total: number; sent: number; failed: number; failures: { email: string; name: string; error: string }[]; done: boolean } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => {
    api.get('/admin/announcements').then(({ data }) => setAnns(data.announcements || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const pollReport = (id: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      api.get(`/admin/announcements/${id}/report`)
        .then(({ data }) => {
          setReport(data.report);
          if (data.report.done && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        })
        .catch(() => { if (pollRef.current) clearInterval(pollRef.current); });
    }, 1500);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/admin/announcements', { title, body, type });
      setTitle(''); setBody('');
      setToast({ msg: `Sending to ${data.emailsQueued} users…` });
      setActiveReportId(data.reportId);
      setReport({ total: data.emailsQueued, sent: 0, failed: 0, failures: [], done: false });
      pollReport(data.reportId);
      load();
    } catch {
      setToast({ msg: 'Failed to publish', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const retryFailed = async () => {
    if (!activeReportId) return;
    setRetrying(true);
    try {
      await api.post(`/admin/announcements/${activeReportId}/retry`);
      pollReport(activeReportId);
    } catch {
      setToast({ msg: 'Retry failed to start', type: 'error' });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <Card>
        <CardHead title="Publish announcement" />
        <form onSubmit={create} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="sp-label">Title</label>
            <input className="sp-input sp-input-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title…" />
          </div>
          <div>
            <label className="sp-label">Message</label>
            <textarea className="sp-textarea" value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message to all users…" rows={3} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select className="sp-select" value={type} onChange={e => setType(e.target.value)} style={{ height: 32 }}>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="update">Update</option>
            </select>
            <Btn type="submit" variant="primary" disabled={submitting || !title.trim() || !body.trim()}>
              {submitting ? 'Publishing…' : 'Publish to all users'}
            </Btn>
          </div>
        </form>

        {report && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--c-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: report.failures.length > 0 ? 10 : 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)' }}>
                {report.done ? 'Delivery complete' : 'Sending…'}
              </span>
              <Badge label={`${report.sent} sent`} color="green" />
              {report.failed > 0 && <Badge label={`${report.failed} failed`} color="red" />}
              <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                {report.sent + report.failed} / {report.total} processed
              </span>
              {report.done && report.failures.length > 0 && (
                <Btn size="sm" variant="amber" onClick={retryFailed} disabled={retrying}>
                  {retrying ? 'Retrying…' : `Retry ${report.failures.length} failed`}
                </Btn>
              )}
            </div>
            {report.failures.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {report.failures.map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                    <span style={{ color: 'var(--c-red)', fontWeight: 500 }}>{f.email}</span> — {f.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardHead title="Published announcements" />
        {loading ? <Spinner /> : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr><th>Title</th><th>Type</th><th>Status</th><th>Author</th><th>Date</th></tr>
              </thead>
              <tbody>
                {anns.length === 0 && (
                  <tr><td colSpan={5}><EmptyState label="No announcements yet" /></td></tr>
                )}
                {anns.map(a => (
                  <tr key={a.id}>
                    <td className="td-bold">{a.title}</td>
                    <td><Badge label={a.type} color={annTypeColor(a.type)} /></td>
                    <td><Badge label={a.isActive ? 'Active' : 'Hidden'} color={a.isActive ? 'green' : 'gray'} /></td>
                    <td className="td-muted">{a.createdByUser?.name || 'System'}</td>
                    <td className="td-muted">{fmtDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TableFoot count={anns.length} label="announcements" />
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS TAB
// ══════════════════════════════════════════════════════════════════════════════
function FeaturesTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(null);

  useEffect(() => {
    api.get('/admin/features').then(({ data }) => setFlags(data.flags || [])).finally(() => setLoading(false));
  }, []);

  const update = async (key: string, value: string) => {
    try {
      await api.put(`/admin/features/${key}`, { value });
      setFlags(f => f.map(ff => ff.flagKey === key ? { ...ff, value } : ff));
      setToast({ msg: `${key} updated` });
    } catch {
      setToast({ msg: 'Update failed', type: 'error' });
    }
  };

  const grouped = flags.reduce((acc, f) => {
    const cat = f.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  if (loading) return <Spinner />;

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {Object.keys(grouped).length === 0 && <EmptyState label="No feature flags configured" />}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <Card>
            <div className="sp-section-cat">{cat}</div>
            {items.map(f => (
              <div className="sp-flag-row" key={f.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sp-flag-name">{f.label}</div>
                  {f.description && <div className="sp-flag-desc">{f.description}</div>}
                  <div className="sp-flag-key">{f.flagKey}</div>
                </div>
                {f.type === 'toggle' ? (
                  <label className="sp-toggle">
                    <input
                      type="checkbox"
                      checked={f.value === '1'}
                      onChange={e => update(f.flagKey, e.target.checked ? '1' : '0')}
                    />
                    <span className="sp-toggle-track" />
                    <span className="sp-toggle-thumb" />
                  </label>
                ) : (
                  <input
                    className="sp-input"
                    value={f.value}
                    onChange={e => update(f.flagKey, e.target.value)}
                    style={{ width: 120, textAlign: 'right' }}
                  />
                )}
              </div>
            ))}
          </Card>
        </div>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG TAB
// ══════════════════════════════════════════════════════════════════════════════
function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    api.get('/admin/audit')
      .then(({ data }) => setEntries(data.entries || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    if (q && !e.action.toLowerCase().includes(q) && !e.actorName.toLowerCase().includes(q) && !e.target.toLowerCase().includes(q)) return false;
    if (actionFilter && !e.action.toLowerCase().includes(actionFilter.toLowerCase())) return false;
    return true;
  });

  const actionColors: Record<string, string> = {
    approved: 'green', activated: 'green', deleted: 'red', deactivated: 'amber',
    toggled: 'blue', published: 'purple', login: 'gray',
  };

  function badgeColorForAction(action: string) {
    const key = Object.keys(actionColors).find(k => action.toLowerCase().includes(k));
    return key ? actionColors[key] : 'gray';
  }

  return (
    <Card>
      <div className="sp-search-row">
        <div className="sp-search-wrap">
          <svg className="sp-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="sp-input sp-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" />
        </div>
        <select className="sp-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ height: 32 }}>
          <option value="">All actions</option>
          <option value="approved">Approved</option>
          <option value="deleted">Deleted</option>
          <option value="deactivated">Deactivated</option>
          <option value="toggled">Feature changed</option>
          <option value="published">Announcement</option>
        </select>
        {(search || actionFilter) && <Btn onClick={() => { setSearch(''); setActionFilter(''); }}>Clear</Btn>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--c-text-3)' }}>{filtered.length} events</span>
      </div>
      {loading ? <Spinner /> : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr><th>Action</th><th>Actor</th><th>Target</th><th>IP</th><th>Time</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5}><EmptyState label="No audit events found" /></td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td><Badge label={e.action} color={badgeColorForAction(e.action)} /></td>
                  <td className="td-bold">{e.actorName}</td>
                  <td className="td-mono td-muted">{e.target}</td>
                  <td className="td-mono td-muted">{e.ip || '—'}</td>
                  <td className="td-muted">{timeAgo(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <TableFoot count={filtered.length} label="events" />
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS TAB
// ══════════════════════════════════════════════════════════════════════════════
function NotificationsTab({ onMarkRead }: { onMarkRead: () => void }) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/notifications')
      .then(({ data }) => setNotifs(data.notifications || []))
      .finally(() => setLoading(false));
  }, []);

  const markAll = async () => {
    try {
      await api.put('/admin/notifications/read-all', {});
      setNotifs(n => n.map(x => ({ ...x, read: true })));
      onMarkRead();
    } catch { /* swallow */ }
  };

  const mark = async (id: number) => {
    try {
      await api.put(`/admin/notifications/${id}/read`, {});
      setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
      if (notifs.filter(x => !x.read).length <= 1) onMarkRead();
    } catch { /* swallow */ }
  };

  const typeColors: Record<string, string> = {
    pending_approval: 'amber', new_farm: 'green', issue: 'red', feature: 'purple', announcement: 'blue',
  };

  return (
    <Card>
      <CardHead title="Notifications" action={<Btn size="sm" onClick={markAll}>Mark all read</Btn>} />
      {loading ? <Spinner /> : notifs.length === 0 ? (
        <EmptyState label="No notifications — you're all caught up" />
      ) : (
        notifs.map(n => (
          <div key={n.id} className={`sp-notif-item${n.read ? '' : ' unread'}`} onClick={() => !n.read && mark(n.id)}>
            <div className={`sp-notif-dot${n.read ? ' read' : ''}`} />
            <div style={{ flex: 1 }}>
              <div className="sp-notif-title">{n.title}</div>
              <div className="sp-notif-body">{n.body}</div>
              <div className="sp-notif-time">{timeAgo(n.createdAt)}</div>
            </div>
            <Badge label={n.type.replace('_', ' ')} color={typeColors[n.type] || 'gray'} />
          </div>
        ))
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL BLAST TAB
// ══════════════════════════════════════════════════════════════════════════════
function EmailBlastTab() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(null);
  const [blastId, setBlastId] = useState<string | null>(null);
  const [report, setReport] = useState<{ total: number; sent: number; failed: number; failures: { email: string; name: string; error: string }[]; done: boolean } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollReport = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      api.get(`/admin/email-blast/${id}/report`)
        .then(({ data }) => {
          setReport(data.report);
          if (data.report.done && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        })
        .catch(() => { if (pollRef.current) clearInterval(pollRef.current); });
    }, 1500);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/admin/email-blast', { subject, body });
      setBlastId(data.blastId);
      setReport({ total: data.emailsQueued, sent: 0, failed: 0, failures: [], done: false });
      setToast({ msg: `Sending to ${data.emailsQueued} users…` });
      pollReport(data.blastId);
      setSubject(''); setBody('');
    } catch {
      setToast({ msg: 'Failed to send', type: 'error' });
    } finally { setSubmitting(false); }
  };

  const retry = async () => {
    if (!blastId) return;
    setRetrying(true);
    try {
      await api.post(`/admin/email-blast/${blastId}/retry`, { subject });
      pollReport(blastId);
    } catch { setToast({ msg: 'Retry failed', type: 'error' }); }
    finally { setRetrying(false); }
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <Card>
        <CardHead title="Send custom email to all users" sub="This sends a direct email — no announcement record is created" />
        <form onSubmit={send} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="sp-label">Subject</label>
            <input className="sp-input sp-input-full" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject…" />
          </div>
          <div>
            <label className="sp-label">Message body</label>
            <textarea className="sp-textarea" value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message… (line breaks are preserved)" rows={6} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Btn type="submit" variant="primary" disabled={submitting || !subject.trim() || !body.trim()}>
              {submitting ? 'Sending…' : ' Send to all users'}
            </Btn>
            {report && !report.done && (
              <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>Sending {report.sent}/{report.total}…</span>
            )}
          </div>
        </form>

        {report && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--c-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: report.failures.length > 0 ? 10 : 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)' }}>
                {report.done ? ' Delivery complete' : '⏳ Sending…'}
              </span>
              <Badge label={`${report.sent} sent`} color="green" />
              {report.failed > 0 && <Badge label={`${report.failed} failed`} color="red" />}
              <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{report.sent + report.failed} / {report.total} processed</span>
              {report.done && report.failures.length > 0 && (
                <Btn size="sm" variant="amber" onClick={retry} disabled={retrying}>
                  {retrying ? 'Retrying…' : `Retry ${report.failures.length} failed`}
                </Btn>
              )}
            </div>
            {report.failures.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {report.failures.map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                    <span style={{ color: 'var(--c-red)', fontWeight: 500 }}>{f.email}</span> — {f.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MARKETPLACE TAB
// ══════════════════════════════════════════════════════════════════════════════
interface MarketStats {
  totalListings: number;
  activeListings: number;
  soldListings: number;
  totalOffers: number;
  pendingReports: number;
}
interface MarketListingRow {
  id: number;
  title: string;
  askingPrice: string;
  status: string;
  createdAt: string;
  animal?: { name: string; breed: string };
  seller?: { id: number; name: string; email: string };
  _count?: { offers: number; favorites: number };
}

function MarketplaceTab() {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [listings, setListings] = useState<MarketListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(null);

  useEffect(() => {
    api.get('/admin/marketplace/stats')
      .then(({ data }) => setStats(data.stats))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/admin/marketplace/listings${params}`)
      .then(({ data }) => setListings(data.listings || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function handleStatusChange(id: number, status: string) {
    try {
      await api.put(`/admin/marketplace/listings/${id}/status`, { status });
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      setToast({ msg: 'Listing status updated', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to update listing', type: 'error' });
    }
  }

  const kpis = stats ? [
    { label: 'Total listings', value: stats.totalListings, sub: 'All time', bar: 'var(--c-green)' },
    { label: 'Active listings', value: stats.activeListings, sub: 'Currently live', bar: 'var(--c-purple)' },
    { label: 'Sold', value: stats.soldListings, sub: 'Completed sales', bar: '#BA7517' },
    { label: 'Pending reports', value: stats.pendingReports, sub: stats.pendingReports ? 'Needs review' : 'All clear', bar: stats.pendingReports ? 'var(--c-red)' : 'var(--c-green)' },
  ] : [];

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {stats && (
        <div className="sp-metrics">
          {kpis.map(k => (
            <div className="sp-metric" key={k.label}>
              <div className="sp-metric-label">{k.label}</div>
              <div className="sp-metric-val">{k.value}</div>
              <div className="sp-metric-sub">{k.sub}</div>
              <div className="sp-metric-bar" style={{ background: k.bar }} />
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHead
          title="All listings"
          sub="Every marketplace listing across all farms"
          action={
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="sp-select">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
              <option value="suspended">Suspended</option>
            </select>
          }
        />
        {loading ? <Spinner /> : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr><th>Animal</th><th>Seller</th><th>Price</th><th>Status</th><th>Offers</th><th>Listed</th><th>Action</th></tr>
              </thead>
              <tbody>
                {listings.length === 0 && (
                  <tr><td colSpan={7}><EmptyState label="No listings found" /></td></tr>
                )}
                {listings.map(l => (
                  <tr key={l.id}>
                    <td>
                      <span className="td-bold">{l.animal?.name || l.title}</span>
                      {l.animal?.breed && <span className="td-mono td-muted"> · {l.animal.breed}</span>}
                    </td>
                    <td>
                      {l.seller && (
                        <div className="sp-user-cell">
                          <Avatar name={l.seller.name} role="admin" />
                          <div className="sp-user-cell-info">
                            <span className="td-bold">{l.seller.name}</span>
                            <span className="td-mono td-muted">{l.seller.email}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="td-bold">KSh {Number(l.askingPrice).toLocaleString()}</td>
                    <td>
                      {l.status === 'active' && <Badge label="Active" color="green" />}
                      {l.status === 'reserved' && <Badge label="Reserved" color="amber" />}
                      {l.status === 'sold' && <Badge label="Sold" color="gray" />}
                      {l.status === 'suspended' && <Badge label="Suspended" color="red" />}
                    </td>
                    <td className="td-muted">{l._count?.offers ?? 0}</td>
                    <td className="td-muted">{fmtDateShort(l.createdAt)}</td>
                    <td>
                      {l.status !== 'suspended' ? (
                        <Btn variant="danger" size="sm" onClick={() => handleStatusChange(l.id, 'suspended')}>Suspend</Btn>
                      ) : (
                        <Btn variant="" size="sm" onClick={() => handleStatusChange(l.id, 'active')}>Reactivate</Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TableFoot count={listings.length} label="listings" />
          </div>
        )}
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NAV CONFIG
// ══════════════════════════════════════════════════════════════════════════════
type TabId = 'overview' | 'analytics' | 'farms' | 'users' | 'issues' | 'announcements' | 'email_blast' | 'features' | 'audit' | 'notifications' | 'marketplace';

const NAV: { section: string; items: { id: TabId; label: string; icon: React.ReactNode }[] }[] = [
  {
    section: 'Platform',
    items: [
      { id: 'overview', label: 'Overview', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
      { id: 'analytics', label: 'Analytics', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><polyline points="7 16 11 12 15 14 20 8" /></svg> },
      { id: 'farms', label: 'Farms', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg> },
    ],
  },
  {
    section: 'Admin',
    items: [
      { id: 'users', label: 'Users', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
      { id: 'issues', label: 'Issues', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
      { id: 'announcements', label: 'Announcements', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
      { id: 'email_blast', label: 'Email Blast', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
      { id: 'features', label: 'Feature Flags', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" /></svg> },
    ],
  },
  {
    section: 'Marketplace',
    items: [
      { id: 'marketplace', label: 'Marketplace', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 22V12h6v10" /></svg> },
    ],
  },
  {
    section: 'System',
    items: [
      { id: 'audit', label: 'Audit Log', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg> },
      { id: 'notifications', label: 'Notifications', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg> },
    ],
  },
];

const TAB_META: Record<TabId, { title: string; sub: string }> = {
  overview: { title: 'Overview', sub: 'Platform-wide statistics and recent activity' },
  analytics: { title: 'Analytics', sub: 'Usage trends, growth, and platform insights' },
  farms: { title: 'Farms', sub: 'All registered farms — click to view details' },
  users: { title: 'Users', sub: 'Manage all registered users and their access' },
  issues: { title: 'Issues', sub: 'Review and resolve system issues reported by users' },
  announcements: { title: 'Announcements', sub: 'Publish system-wide messages to all users' },
  email_blast: { title: 'Email Blast', sub: 'Send a custom email directly to all users' },
  features: { title: 'Feature Flags', sub: 'Toggle platform features and system settings' },
  audit: { title: 'Audit Log', sub: 'Full history of all admin actions and events' },
  notifications: { title: 'Notifications', sub: 'Recent alerts and system events' },
  marketplace: { title: 'Marketplace', sub: 'Listings, offers, and marketplace activity across the platform' },
};

// ══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN SHELL
// ══════════════════════════════════════════════════════════════════════════════
function SuperAdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('overview');
  const [pendingCount, setPendingCount] = useState(0);
  const [issueCount, setIssueCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  // Load badge counts on mount
  useEffect(() => {
    api.get('/admin/users').then(({ data }) => {
      const p = (data.users || []).filter((u: FarmUser) => u.registrationStatus === 'pending').length;
      setPendingCount(p);
    }).catch(() => {});
    api.get('/admin/issues').then(({ data }) => {
      const o = (data.issues || []).filter((i: SystemIssue) => i.status === 'open').length;
      setIssueCount(o);
    }).catch(() => {});
    api.get('/admin/notifications').then(({ data }) => {
      const u = (data.notifications || []).filter((n: Notification) => !n.read).length;
      setNotifCount(u);
    }).catch(() => {});
  }, []);

  function handleLogout() { logout(); navigate('/login'); }

  const meta = TAB_META[tab];

  return (
    <div className="sp-root">
      <style>{CSS}</style>

      {/* Sidebar */}
      <aside className="sp-sidebar">
        <div className="sp-logo">
          <div className="sp-logo-mark"></div>
          <div>
            <div className="sp-logo-name">AgriPulse</div>
            <div className="sp-logo-tag">System</div>
          </div>
        </div>

        {NAV.map(group => (
          <div key={group.section}>
            <div className="sp-nav-section">{group.section}</div>
            {group.items.map(item => {
              const hasBadge =
                (item.id === 'users' && pendingCount > 0) ||
                (item.id === 'issues' && issueCount > 0) ||
                (item.id === 'notifications' && notifCount > 0);
              const badgeVal =
                item.id === 'users' ? pendingCount :
                  item.id === 'issues' ? issueCount : notifCount;
              return (
                <button
                  key={item.id}
                  className={`sp-nav-item${tab === item.id ? ' active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.icon}
                  {item.label}
                  {hasBadge && (
                    <span className={`sp-nav-badge${item.id === 'users' ? ' amber' : ''}`}>{badgeVal}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div className="sp-sidebar-footer">
          <div className="sp-user-row">
            <div className="sp-user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div>
              <div className="sp-user-name">{user?.name}</div>
              <div className="sp-user-role">{user?.role}</div>
            </div>
            <button className="sp-logout-btn" onClick={handleLogout} title="Log out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="sp-main">
        <div className="sp-topbar">
          <div className="sp-topbar-left">
            <div className="sp-topbar-title">{meta.title}</div>
            <div className="sp-topbar-sub">{meta.sub}</div>
          </div>
          <div className="sp-topbar-right">
            <div className="sp-live">
              <div className="sp-live-dot" />
              Live
            </div>
            <button
              className="sp-top-btn"
              onClick={() => { setTab('notifications'); }}
              style={{ position: 'relative' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {notifCount > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--c-red)', border: '1.5px solid var(--c-bg)' }} />
              )}
            </button>
            <a href="/dashboard" style={{ textDecoration: 'none' }}>
              <button className="sp-top-btn"> App</button>
            </a>
          </div>
        </div>

        <div className="sp-content">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'analytics' && <AnalyticsTab />}
          {tab === 'farms' && <FarmsTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'issues' && <IssuesTab />}
          {tab === 'announcements' && <AnnouncementsTab />}
          {tab === 'email_blast' && <EmailBlastTab />}
          {tab === 'features' && <FeaturesTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'marketplace' && <MarketplaceTab />}
          {tab === 'notifications' && <NotificationsTab onMarkRead={() => setNotifCount(0)} />}
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKER PANEL
// ══════════════════════════════════════════════════════════════════════════════
function WorkerPanel() {
  const { user } = useAuth();
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f8f7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: '#EEEDFE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 24,
        }}>—</div>
        <h2 style={{ color: '#111', fontWeight: 600, marginBottom: 8, fontSize: 18 }}>
          Welcome, {user?.name?.split(' ')[0]}
        </h2>
        <p style={{ color: '#999', marginBottom: 24, fontSize: 13, lineHeight: 1.5 }}>
          You have worker access. Use the main app to record farm data.
        </p>
        <a href="/dashboard" style={{
          background: '#534AB7', color: '#fff', padding: '10px 22px',
          borderRadius: 8, textDecoration: 'none', fontWeight: 500, fontSize: 13,
        }}>Go to dashboard </a>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROLE ROUTER — main export
// ══════════════════════════════════════════════════════════════════════════════
export function SystemPanel() {
  useEffect(() => { document.title = 'System Panel — AgriPulse'; }, []);
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f8f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 26, height: 26, border: '2px solid #eee', borderTopColor: '#534AB7', borderRadius: '50%', animation: 'spin .65s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  if (!user) return null;
  if (user.role === 'superadmin' || user.role === 'admin') return <SuperAdminPanel />;
  return <WorkerPanel />;
}
