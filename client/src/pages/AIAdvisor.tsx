import { useEffect, useState, useRef, FormEvent } from 'react';
import { Plus, Send, Trash2, Bot, User, Loader2, MessageSquare, Zap, ChevronLeft, Menu } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { AiSession, AiMessage } from '../types';
import { ConfirmDialog } from '../components/ui';

function renderMd(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, m => `<ul>${m}</ul>`)
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}

function MessageBubble({ msg, isDark }: { msg: AiMessage; isDark: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
        ${isUser ? 'bg-farm-green' : isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className={`w-3.5 h-3.5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed
          ${isUser
            ? 'bg-farm-green text-white rounded-tr-sm whitespace-pre-wrap'
            : isDark
              ? 'rounded-tl-sm ai-bubble'
              : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm ai-bubble'
          }`}
        style={!isUser && isDark ? {
          background: 'linear-gradient(135deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.03) 100%)',
          border: '1px solid rgba(255,255,255,.08)',
          color: 'rgba(255,255,255,.85)',
        } : {}}
        {...(!isUser ? { dangerouslySetInnerHTML: { __html: renderMd(msg.message) } } : { children: msg.message })}
      />
    </div>
  );
}

interface FarmContext { animals: number; milk7: string; health: number; breeding: number; }

const QUICK_CHIPS = [
  { label: 'Analyse my milk yield',       action: 'yield_predict' },
  { label: 'Breeding advice for my herd', action: 'breeding_check' },
  { label: 'How to improve farm profit',  action: 'financial_check' },
  { label: 'Full farm health report',     action: 'farm_summary' },
];

export function AIAdvisorPage() {  useEffect(() => { document.title = 'AI Farm Advisor — AgriPulse'; }, []);

  const [sessions, setSessions]             = useState<AiSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AiSession | null>(null);
  const [messages, setMessages]             = useState<AiMessage[]>([]);
  const [input, setInput]                   = useState('');
  const [sending, setSending]               = useState(false);
  const [loadingMsgs, setLoadingMsgs]       = useState(false);
  const [deleteId, setDeleteId]             = useState<number | null>(null);
  const [farmCtx, setFarmCtx]               = useState<FarmContext | null>(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const { isDark } = useTheme();
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadSessions() {
    const { data } = await api.get('/ai/sessions');
    setSessions(data.sessions);
  }
  async function loadFarmContext() {
    try { const { data } = await api.get('/ai/context'); setFarmCtx(data); } catch { }
  }
  async function newSession() {
    const { data } = await api.post('/ai/sessions');
    setSessions(p => [data.session, ...p]);
    selectSession(data.session);
    setSidebarOpen(false);
  }
  async function selectSession(s: AiSession) {
    setCurrentSession(s);
    setLoadingMsgs(true);
    setSidebarOpen(false);
    try { const { data } = await api.get(`/ai/sessions/${s.id}/messages`); setMessages(data.messages); }
    finally { setLoadingMsgs(false); }
  }
  async function deleteSession() {
    if (!deleteId) return;
    await api.delete(`/ai/sessions/${deleteId}`);
    setSessions(p => p.filter(s => s.id !== deleteId));
    if (currentSession?.id === deleteId) { setCurrentSession(null); setMessages([]); }
    setDeleteId(null);
  }
  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !currentSession || sending) return;
    await doSend(input, undefined);
  }
  async function doSend(msg: string, quickAction?: string) {
    if (!currentSession || sending) return;
    const userMsg: AiMessage = { id: Date.now(), role: 'user', message: msg, createdAt: new Date().toISOString() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setSending(true);
    try {
      const payload: Record<string, unknown> = { sessionId: currentSession.id, message: msg };
      if (quickAction) payload.quickAction = quickAction;
      const { data } = await api.post('/ai/chat', payload);
      setMessages(p => [...p, { id: Date.now() + 1, role: 'assistant', message: data.reply, createdAt: new Date().toISOString() }]);
      if (messages.length === 0) loadSessions();
    } catch {
      setMessages(p => [...p, { id: Date.now() + 1, role: 'assistant', message: 'Failed to get a response. Please try again.', createdAt: new Date().toISOString() }]);
    } finally { setSending(false); }
  }
  async function runQuickChip(label: string, action: string) {
    let sess = currentSession;
    if (!sess) {
      const { data } = await api.post('/ai/sessions');
      setSessions(p => [data.session, ...p]);
      setCurrentSession(data.session);
      setMessages([]);
      sess = data.session;
    }
    if (!sess) return;
    setSending(true);
    setSidebarOpen(false);
    setMessages(p => [...p, { id: Date.now(), role: 'user', message: label, createdAt: new Date().toISOString() }]);
    try {
      const { data } = await api.post('/ai/chat', { sessionId: sess.id, message: label, quickAction: action });
      setMessages(p => [...p, { id: Date.now() + 1, role: 'assistant', message: data.reply, createdAt: new Date().toISOString() }]);
      loadSessions();
    } catch {
      setMessages(p => [...p, { id: Date.now() + 1, role: 'assistant', message: 'Failed to get a response. Please try again.', createdAt: new Date().toISOString() }]);
    } finally { setSending(false); }
  }

  useEffect(() => { loadSessions(); loadFarmContext(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const Sidebar = () => (
    <div className="flex flex-col gap-3 h-full">
      {farmCtx && (
        <div className="card p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Farm Overview</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Animals',  value: farmCtx.animals },
              { label: 'Milk (7d)',value: farmCtx.milk7 },
              { label: 'Health',   value: farmCtx.health },
              { label: 'Breeding', value: farmCtx.breeding },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-2">
                <div className="text-base font-bold text-farm-green">{s.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button className="btn-primary w-full justify-center" onClick={newSession}>
        <Plus className="w-4 h-4" /> New Chat
      </button>
      <div className="card flex-1 overflow-y-auto p-2 min-h-0">
        {sessions.length === 0 ? (
          <p className={`text-xs text-center py-6 ${isDark ? "text-white/25" : "text-gray-400"}`}>No conversations yet</p>
        ) : sessions.map(s => (
          <div
            key={s.id}
            className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${currentSession?.id === s.id ? isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-primary-50 text-farm-green' : isDark ? 'hover:bg-white/5 text-white/60' : 'hover:bg-gray-50'}`}
            onClick={() => selectSession(s)}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
            <span className="text-sm truncate flex-1">{s.title}</span>
            <button
              onClick={e => { e.stopPropagation(); setDeleteId(s.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 text-gray-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="card p-3">
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1 ${isDark ? "text-white/40" : "text-gray-500"}`}>
          <Zap className="w-3 h-3" /> Quick Analysis
        </p>
        <div className="flex flex-col gap-1.5">
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip.action}
              onClick={() => runQuickChip(chip.label, chip.action)}
              disabled={sending}
              className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 hover:border-farm-green hover:text-farm-green ${isDark ? "text-white/50 border-white/10 hover:bg-white/5" : "text-gray-600 border-gray-200"}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .ai-bubble p { margin: 4px 0; }
        .ai-bubble p:first-child { margin-top: 0; }
        .ai-bubble p:last-child  { margin-bottom: 0; }
        .ai-bubble ul { padding-left: 16px; margin: 4px 0; }
        .ai-bubble li { margin: 2px 0; }
        .ai-bubble strong { color: #166534; }
        .dark .ai-bubble strong { color: #6ee7b7; }
        .inline-code { background: rgba(22,101,52,.08); color: #166534; padding: 1px 5px; border-radius: 4px; font-size: 12px; font-family: monospace; }
        .dark .inline-code { background: rgba(110,231,183,.1); color: #6ee7b7; }
      `}</style>

      <div className="flex h-[calc(100vh-8rem)] gap-4 animate-in relative">

        {/* ── Mobile sidebar overlay ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar — desktop fixed, mobile drawer ── */}
        <div className={`
          lg:relative lg:flex lg:w-64 lg:flex-shrink-0 lg:flex-col
          fixed inset-y-0 left-0 z-40 w-72 flex flex-col
          p-3 lg:p-0
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}
        style={sidebarOpen ? {background: isDark ? '#0d1526' : '#f9fafb'} : {}}>
          {/* Mobile close button */}
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <span className={`font-semibold ${isDark ? "text-white/80" : "text-gray-800"}`}>AI Advisor</span>
            <button onClick={() => setSidebarOpen(false)} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-white/10" : "hover:bg-gray-200"}`}>
              <ChevronLeft className={`w-5 h-5 ${isDark ? "text-white/50" : "text-gray-600"}`} />
            </button>
          </div>
          <Sidebar />
        </div>

        {/* ── Chat area ── */}
        <div className="flex-1 card flex flex-col overflow-hidden min-w-0">

          {/* Mobile topbar */}
          <div className={`flex items-center gap-2 p-3 border-b lg:hidden ${isDark ? "border-white/5" : "border-gray-200"}`}>
            <button onClick={() => setSidebarOpen(true)} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-white/5 text-white/50" : "hover:bg-gray-100"}`}>
              <Menu className="w-5 h-5" />
            </button>
            <span className={`text-sm font-medium truncate ${isDark ? "text-white/70" : "text-gray-700"}`}>
              {currentSession ? currentSession.title : 'AI Advisor'}
            </span>
          </div>

          {!currentSession ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDark ? "bg-indigo-500/15" : "bg-primary-50"}`}>
                <Bot className="w-7 h-7 text-farm-green" />
              </div>
              <h2 className={`text-lg font-bold mb-2 ${isDark ? "text-white/90" : "text-gray-900"}`}>AgriPulse AI Advisor</h2>
              <p className={`text-sm max-w-xs mb-4 ${isDark ? "text-white/40" : "text-gray-500"}`}>
                Get personalised advice about milk production, animal health, breeding, and finances.
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                <button className="btn-primary" onClick={newSession}>
                  <Plus className="w-4 h-4" />Start a conversation
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-4 h-4" /> Quick Analysis
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMsgs ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-farm-green" /></div>
                ) : messages.length === 0 ? (
                  <div className={`text-center py-10 text-sm ${isDark ? "text-white/25" : "text-gray-400"}`}>
                    Send a message or pick a quick analysis
                    <button className={`block mx-auto mt-3 underline text-xs lg:hidden ${isDark ? "text-indigo-400" : "text-farm-green"}`} onClick={() => setSidebarOpen(true)}>
                      Open quick analysis →
                    </button>
                  </div>
                ) : (
                  messages.map(m => <MessageBubble key={m.id} msg={m} isDark={isDark} />)
                )}
                {sending && (
                  <div className="flex gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
                      <Bot className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={isDark ? {background:"linear-gradient(135deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.03) 100%)",border:"1px solid rgba(255,255,255,.08)"} : {background:"#fff",border:"1px solid #e5e7eb",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
                      <div className="flex gap-1 items-center py-1">
                        <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? "bg-white/40" : "bg-gray-400"}`} style={{ animationDelay: "0ms" }} />
                        <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? "bg-white/40" : "bg-gray-400"}`} style={{ animationDelay: "150ms" }} />
                        <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? "bg-white/40" : "bg-gray-400"}`} style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className={`border-t p-3 ${isDark ? "border-white/5" : "border-gray-200"}`}>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    className="input flex-1 min-w-0"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask about your farm..."
                    disabled={sending}
                  />
                  <button type="submit" className="btn-primary px-3 flex-shrink-0" disabled={!input.trim() || sending} style={isDark && (!input.trim() || sending) ? {opacity:.4} : {}}>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        <ConfirmDialog
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={deleteSession}
          title="Delete Conversation"
          message="This will permanently delete the conversation and all messages."
          danger
        />
      </div>
    </>
  );
}
