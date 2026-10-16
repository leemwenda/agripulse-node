/** Scoped to .ii-* and built on the Super Admin CSS variables so light and dark themes both work. */
export const IMAGE_INTELLIGENCE_CSS = `
  .ii-root { display: flex; flex-direction: column; gap: 16px; }
  .ii-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .ii-spacer { flex: 1 1 auto; }
  .ii-btn { font: inherit; font-size: 13px; font-weight: 500; padding: 7px 12px; border-radius: var(--radius-md);
    border: 1px solid var(--c-border-med); background: var(--c-bg); color: var(--c-text); cursor: pointer; }
  .ii-btn:hover:not(:disabled) { border-color: var(--c-purple); }
  .ii-btn:disabled { opacity: .55; cursor: not-allowed; }
  .ii-btn.primary { background: var(--c-purple); border-color: var(--c-purple); color: #fff; }
  .ii-btn:focus-visible, .ii-input:focus-visible, .ii-link:focus-visible { outline: 2px solid var(--c-purple); outline-offset: 2px; }
  .ii-input { font: inherit; font-size: 13px; padding: 7px 10px; border-radius: var(--radius-md);
    border: 1px solid var(--c-border-med); background: var(--c-bg); color: var(--c-text); min-width: 0; }
  .ii-search { flex: 1 1 220px; }
  .ii-check { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; color: var(--c-text-2); }
  .ii-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .ii-stat { background: var(--c-bg); border: 1px solid var(--c-border); border-radius: var(--radius-lg); padding: 14px; }
  .ii-stat-label { font-size: 12px; color: var(--c-text-3); }
  .ii-stat-value { font-size: 24px; font-weight: 600; margin-top: 4px; }
  .ii-panel { background: var(--c-bg); border: 1px solid var(--c-border); border-radius: var(--radius-lg); padding: 14px; }
  .ii-panel h3, .ii-section h3 { margin: 0 0 8px; font-size: 13px; font-weight: 600; }
  .ii-muted { color: var(--c-text-3); font-size: 12px; }
  .ii-note { font-size: 12px; color: var(--c-text-2); background: var(--c-blue-bg); border: 1px solid var(--c-blue-border);
    border-radius: var(--radius-md); padding: 8px 10px; }
  .ii-error { font-size: 13px; color: var(--c-red); background: var(--c-red-bg); border: 1px solid var(--c-red-border);
    border-radius: var(--radius-md); padding: 8px 10px; }
  .ii-warn { font-size: 13px; color: var(--c-amber); background: var(--c-amber-bg); border: 1px solid var(--c-amber-border);
    border-radius: var(--radius-md); padding: 8px 10px; }
  .ii-ok { font-size: 13px; color: var(--c-green); }
  .ii-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
  .ii-card { background: var(--c-bg); border: 1px solid var(--c-border); border-radius: var(--radius-lg); overflow: hidden;
    cursor: pointer; display: flex; flex-direction: column; }
  .ii-card:hover { border-color: var(--c-purple); }
  .ii-thumb { position: relative; aspect-ratio: 4 / 3; background: var(--c-surface); display: flex; align-items: center;
    justify-content: center; overflow: hidden; width: 100%; }
  .ii-thumb img { width: 100%; height: 100%; display: block; }
  .ii-thumb-msg { font-size: 12px; color: var(--c-text-2); text-align: center; padding: 10px; display: flex; flex-direction: column; gap: 8px; align-items: center; }
  .ii-skeleton { width: 100%; height: 100%; background: linear-gradient(90deg, var(--c-surface), var(--c-border), var(--c-surface));
    background-size: 200% 100%; animation: ii-shimmer 1.4s linear infinite; }
  @keyframes ii-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { .ii-skeleton { animation: none; } }
  .ii-card-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
  .ii-link { font: inherit; font-size: 13px; font-weight: 600; color: var(--c-text); background: none; border: 0; padding: 0;
    text-align: left; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .ii-badges { display: flex; flex-wrap: wrap; gap: 4px; }
  .ii-badge { font-size: 11px; font-weight: 500; padding: 2px 7px; border-radius: 999px; border: 1px solid var(--c-border-med);
    background: var(--c-surface); color: var(--c-text-2); }
  .ii-badge.green { background: var(--c-green-bg); border-color: var(--c-green-border); color: var(--c-green); }
  .ii-badge.amber { background: var(--c-amber-bg); border-color: var(--c-amber-border); color: var(--c-amber); }
  .ii-badge.red { background: var(--c-red-bg); border-color: var(--c-red-border); color: var(--c-red); }
  .ii-badge.blue { background: var(--c-blue-bg); border-color: var(--c-blue-border); color: var(--c-blue); }
  .ii-badge.purple { background: var(--c-purple-bg); border-color: var(--c-purple-border); color: var(--c-purple); }
  .ii-pager { display: flex; gap: 10px; align-items: center; justify-content: center; font-size: 13px; color: var(--c-text-2); }
  .ii-empty { text-align: center; padding: 36px 12px; color: var(--c-text-2); font-size: 14px; }
  .ii-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 80; }
  .ii-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(640px, 100%); background: var(--c-surface); color: var(--c-text);
    border-left: 1px solid var(--c-border-med); z-index: 81; overflow-y: auto; display: flex; flex-direction: column; }
  .ii-drawer-head { position: sticky; top: 0; z-index: 1; background: var(--c-bg); border-bottom: 1px solid var(--c-border);
    padding: 12px 16px; display: flex; gap: 10px; align-items: center; }
  .ii-drawer-title { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1 1 auto; margin: 0; }
  .ii-drawer-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
  .ii-preview { background: var(--c-bg); border: 1px solid var(--c-border); border-radius: var(--radius-lg); overflow: hidden; }
  .ii-preview .ii-thumb { aspect-ratio: 16 / 10; }
  .ii-kv { display: grid; grid-template-columns: minmax(110px, 36%) 1fr; gap: 6px 12px; font-size: 13px; margin: 0; }
  .ii-kv dt { color: var(--c-text-3); }
  .ii-kv dd { margin: 0; word-break: break-word; }
  .ii-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .ii-list li { font-size: 13px; padding: 8px 10px; background: var(--c-bg); border: 1px solid var(--c-border); border-radius: var(--radius-md); }
  .ii-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ii-compare figure { margin: 0; }
  .ii-compare figcaption { font-size: 12px; color: var(--c-text-3); margin-top: 4px; }
  .ii-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .ii-radio { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--c-border); border-radius: var(--radius-md);
    background: var(--c-bg); font-size: 13px; cursor: pointer; }
  .ii-radio small { display: block; color: var(--c-text-3); }
  .ii-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 90; padding: 9px 14px; font-size: 13px;
    border-radius: var(--radius-md); background: var(--c-text); color: var(--c-bg); }
  .ii-toast.error { background: var(--c-red); color: #fff; }
  @media (max-width: 520px) { .ii-compare { grid-template-columns: 1fr; } .ii-kv { grid-template-columns: 1fr; } }
`;
