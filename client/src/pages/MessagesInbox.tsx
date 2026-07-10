import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function MessagesInbox() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const bg = isDark ? '#0d1117' : '#f9fafb';
  const card = isDark ? 'rgba(255,255,255,.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text1 = isDark ? '#e2ede6' : '#111827';
  const text2 = isDark ? '#8aab94' : '#374151';

  function loadThreads() {
    api.get('/market-messages')
      .then(r => setThreads(r.data.threads || []))
      .finally(() => setLoading(false));
  }

  function loadMessages(threadId: number) {
    api.get(`/market-messages/${threadId}`)
      .then(r => setMessages(r.data.messages || []))
      .then(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }

  useEffect(() => { loadThreads(); }, []);
  useEffect(() => { if (activeThread) loadMessages(activeThread.id); }, [activeThread]);

  async function sendMessage() {
    if (!text.trim() || !activeThread) return;
    setSending(true);
    try {
      await api.post('/market-messages', { threadId: activeThread.id, message: text.trim() });
      setText('');
      loadMessages(activeThread.id);
    } finally { setSending(false); }
  }

  async function acceptOffer() {
    if (!activeThread) return;
    if (!confirm('Accept this offer and create agreement?')) return;
    try {
      // Try to find offerId from thread or listing
      const offerId = activeThread.offer?.id || activeThread.listing?.pendingOfferId;
      if (!offerId) {
        alert('No pending offer found for this conversation.');
        return;
      }
      await api.patch(`/market-offers/${offerId}`, { action: 'accept' });
      alert('Offer accepted! Agreement created.');
      loadMessages(activeThread.id);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to accept offer');
    }
  }

  const isSeller = (t: any) => t.listing?.sellerId === user?.id;

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column' }}>
      {(!isMobile || !activeThread) && (
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, background: card, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => navigate('/marketplace')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: text1 }}>Messages</h1>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Threads List */}
        <div style={{
          width: isMobile ? '100%' : 320,
          display: isMobile && activeThread ? 'none' : 'block',
          borderRight: `1px solid ${border}`, overflowY: 'auto', background: bg,
        }}>
          {threads.map(t => (
            <div key={t.id} onClick={() => setActiveThread(t)}
              style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, cursor: 'pointer', background: activeThread?.id === t.id ? (isDark ? 'rgba(255,255,255,.08)' : '#f0fdf4') : 'transparent' }}>
              <div style={{ fontWeight: 700 }}>{t.listing?.animal?.name}</div>
              <div style={{ fontSize: 13, color: text2 }}>with {isSeller(t) ? t.buyer?.name : t.listing?.seller?.name}</div>
            </div>
          ))}
        </div>

        {/* Chat Area */}
        <div style={{
          flex: 1, display: isMobile && !activeThread ? 'none' : 'flex', flexDirection: 'column', minWidth: 0,
        }}>
          {activeThread ? (
            <>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, background: card, display: 'flex', alignItems: 'center', gap: 10 }}>
                {isMobile && (
                  <button onClick={() => setActiveThread(null)} style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text2, flexShrink: 0 }}>
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div>
                  <div style={{ fontWeight: 700 }}>{activeThread.listing?.animal?.name}</div>
                  <div style={{ fontSize: 13, color: text2 }}>Conversation with {isSeller(activeThread) ? activeThread.buyer?.name : activeThread.listing?.seller?.name}</div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.map(m => (
                  <div key={m.id} style={{ alignSelf: m.senderId === user?.id ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                    <div style={{ background: m.senderId === user?.id ? '#15803d' : card, color: m.senderId === user?.id ? '#fff' : text1, padding: '10px 14px', borderRadius: 12 }}>
                      {m.body}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply Box */}
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${border}`, background: card }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,.06)' : '#fff' }}
                  />
                  <button onClick={sendMessage} disabled={!text.trim()} style={{ padding: '12px 20px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 12 }}>
                    Send
                  </button>
                </div>

                {/* Accept Offer Button - Show for Seller if thread has pending offer */}
                {isSeller(activeThread) && (
                  <button onClick={acceptOffer} style={{ width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15 }}>
                    Accept Offer & Create Agreement
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: text2 }}>
              Select a conversation from the left
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
