import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare, User } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function VetMessagesInbox() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isVet = user?.role === 'vet';

  const bg = isDark ? '#0d1117' : '#f9fafb';
  const card = isDark ? 'rgba(255,255,255,.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text1 = isDark ? '#e2ede6' : '#111827';
  const text2 = isDark ? '#8aab94' : '#374151';
  const text3 = isDark ? 'rgba(255,255,255,.3)' : '#9ca3af';
  const activeBg = isDark ? 'rgba(255,255,255,.07)' : '#f0fdf4';

  function loadThreads() {
    setLoading(true);
    api.get('/vet-messages').then(r => setThreads(r.data.threads || [])).catch(() => {}).finally(() => setLoading(false));
  }
  function loadMessages(threadId: number) {
    api.get(`/vet-messages/${threadId}`).then(r => {
      setMessages(r.data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    });
  }
  useEffect(() => { loadThreads(); }, []);
  useEffect(() => { if (active) loadMessages(active.id); }, [active]);

  async function send(e: any) {
    e.preventDefault();
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      await api.post(`/vet-messages/${active.id}`, { message: text.trim() });
      setText('');
      loadMessages(active.id);
    } finally { setSending(false); }
  }

  const otherName = (t: any) => isVet ? (t.farmer?.name || 'Farmer') : (t.vet?.user?.name || 'Veterinarian');
  const lastMsg = (t: any) => t.messages?.[0]?.body || 'No messages yet';

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${border}`, background: card, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(isVet ? '/vet-dashboard' : '/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', fontSize: 14 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: text1, margin: 0 }}>Messages</h1>
      </div>

      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 57px)' }}>
        <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${border}`, overflowY: 'auto', background: bg }}>
          {loading ? (
            <div style={{ padding: 24, color: text3, textAlign: 'center', fontSize: 13 }}>Loading…</div>
          ) : threads.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <MessageSquare size={32} color={text3} style={{ margin: '0 auto 10px' }} />
              <p style={{ color: text2, fontSize: 13 }}>No conversations yet</p>
            </div>
          ) : threads.map((t: any) => (
            <div key={t.id} onClick={() => setActive(t)}
              style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, cursor: 'pointer', background: active?.id === t.id ? activeBg : (t.unread ? (isDark ? 'rgba(16,185,129,.05)' : '#f8fffe') : 'transparent') }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#0d9488,#0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={14} color="#fff" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: t.unread ? 800 : 700, fontSize: 13, color: text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherName(t)}</div>
                </div>
                {t.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0d9488', flexShrink: 0 }} />}
              </div>
              <div style={{ fontSize: 12, color: text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 40, fontWeight: t.unread ? 700 : 400 }}>{lastMsg(t)}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: text3 }}>
              <MessageSquare size={44} color={text3} />
              <p style={{ fontSize: 14 }}>Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, background: card }}>
                <div style={{ fontWeight: 700, color: text1, fontSize: 15 }}>{otherName(active)}</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
                {messages.length === 0 && <div style={{ textAlign: 'center', color: text3, fontSize: 13, marginTop: 40 }}>No messages yet — say hello!</div>}
                {messages.map((m: any) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                      <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: mine ? '#0d9488' : (isDark ? 'rgba(255,255,255,.08)' : '#f1f5f9'), color: mine ? '#fff' : text1, fontSize: 14, lineHeight: 1.5 }}>
                        {m.body}
                        <div style={{ fontSize: 10, opacity: .6, marginTop: 4, textAlign: 'right' }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} style={{ display: 'flex', gap: 8, padding: '12px 18px', borderTop: `1px solid ${border}`, background: card }}>
                <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message…"
                  style={{ flex: 1, height: 42, padding: '0 14px', borderRadius: 12, border: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,.06)' : '#f8fafc', color: text1, fontSize: 14, outline: 'none' }} />
                <button type="submit" disabled={sending || !text.trim()}
                  style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: '#0d9488', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sending || !text.trim() ? .5 : 1, flexShrink: 0 }}>
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
