import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Stethoscope, Syringe, FileText,
  FlaskConical, ShieldCheck, BarChart3, MessageSquare, Star, User,
  Settings, LogOut, Bell, Menu, X, AlertTriangle, CheckCircle, Plus,
  Clock, Search, Sun, Moon, ChevronRight, Activity, Pill, Award,
  TrendingUp, Eye, Phone, MapPin, Edit, Download, Send, Filter
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Theme ──────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: '#f0f4f8', card: '#ffffff', border: '#e2e8f0',
  text: '#0f172a', text2: '#64748b', sidebar: '#0f172a',
  sidebarText: 'rgba(255,255,255,.7)', sidebarActive: 'rgba(255,255,255,.12)',
  input: '#f8fafc',
};
const DARK = {
  bg: '#070d14', card: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)',
  text: '#e2e8f0', text2: '#64748b', sidebar: '#0a1628',
  sidebarText: 'rgba(255,255,255,.6)', sidebarActive: 'rgba(255,255,255,.08)',
  input: 'rgba(255,255,255,.05)',
};

const ACCENT_MAP: Record<string, string> = {
  dashboard: '#0d9488', appointments: '#6366f1', emergency: '#ef4444',
  animals: '#f59e0b', treatments: '#8b5cf6', vaccinations: '#0ea5e9',
  prescriptions: '#ec4899', certificates: '#10b981', labtests: '#f97316',
  verifications: '#14b8a6', reports: '#6366f1', calendar: '#0d9488',
  messages: '#3b82f6', reviews: '#f59e0b', profile: '#10b981', settings: '#64748b',
};

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',      label: 'Dashboard',               icon: LayoutDashboard },
  { id: 'appointments',   label: 'Appointments',            icon: Calendar },
  { id: 'emergency',      label: 'Farm Requests',           icon: AlertTriangle },
  { id: 'animals',        label: 'Animals',                 icon: Activity },
  { id: 'treatments',     label: 'Treatments',              icon: Stethoscope },
  { id: 'vaccinations',   label: 'Vaccinations',            icon: Syringe },
  { id: 'prescriptions',  label: 'Prescriptions',           icon: Pill },
  { id: 'certificates',   label: 'Health Certificates',     icon: ShieldCheck },
  { id: 'labtests',       label: 'Lab Tests',               icon: FlaskConical },
  { id: 'verifications',  label: 'Marketplace Verifications', icon: CheckCircle },
  { id: 'reports',        label: 'Reports',                 icon: BarChart3 },
  { id: 'calendar',       label: 'Calendar',                icon: Calendar },
  { id: 'messages',       label: 'Messages',                icon: MessageSquare },
  { id: 'reviews',        label: 'Reviews',                 icon: Star },
  { id: 'profile',        label: 'Profile',                 icon: User },
  { id: 'settings',       label: 'Settings',                icon: Settings },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    confirmed:  ['rgba(16,185,129,.15)', '#10b981'],
    pending:    ['rgba(234,179,8,.15)',  '#ca8a04'],
    completed:  ['rgba(99,102,241,.15)', '#6366f1'],
    cancelled:  ['rgba(239,68,68,.15)',  '#ef4444'],
    open:       ['rgba(239,68,68,.15)',  '#ef4444'],
    resolved:   ['rgba(16,185,129,.15)','#10b981'],
    active:     ['rgba(16,185,129,.15)','#10b981'],
    inactive:   ['rgba(100,116,139,.15)','#64748b'],
  };
  const [bg, color] = map[status?.toLowerCase()] || ['rgba(100,116,139,.15)', '#64748b'];
  return (
    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:bg, color, textTransform:'capitalize', whiteSpace:'nowrap' }}>
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, value, label, sub, color, trend }: any) {
  return (
    <div style={{ flex:1, minWidth:160, borderRadius:18, padding:'22px', background:`linear-gradient(135deg, ${color}22, ${color}10)`, border:`1px solid ${color}30`, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-10, right:-10, width:80, height:80, borderRadius:'50%', background:`${color}15` }} />
      <div style={{ width:44, height:44, borderRadius:14, background:`${color}25`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ fontSize:32, fontWeight:900, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{sub}</div>}
      {trend && <div style={{ fontSize:11, color:'#10b981', marginTop:6, fontWeight:600 }}>↑ {trend}</div>}
    </div>
  );
}

function SectionHeader({ title, sub, action, onAction }: any) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
      <div>
        <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text)', margin:0 }}>{title}</h2>
        {sub && <p style={{ fontSize:13, color:'var(--text2)', margin:'4px 0 0' }}>{sub}</p>}
      </div>
      {action && (
        <button onClick={onAction} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', background:'linear-gradient(135deg,#0d9488,#0f766e)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', fontSize:13 }}>
          <Plus size={14}/> {action}
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub, color = '#64748b' }: any) {
  return (
    <div style={{ padding:'60px 20px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{ width:64, height:64, borderRadius:20, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={28} color={color} />
      </div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{title}</div>
      <div style={{ fontSize:13, color:'var(--text2)' }}>{sub}</div>
    </div>
  );
}

// ── Dashboard Tab ──────────────────────────────────────────────────────────
function DashboardTab({ user, appointments, emergency, profile }: any) {
  const today = new Date().toDateString();
  const todayAppts = appointments.filter((a: any) => new Date(a.slot?.date).toDateString() === today);
  const pendingEm = emergency.filter((e: any) => e.status === 'open');
  const upcoming = appointments.filter((a: any) => new Date(a.slot?.date) >= new Date()).slice(0,5);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <div>
        <h1 style={{ fontSize:26, fontWeight:900, color:'var(--text)', margin:0, letterSpacing:'-0.5px' }}>
          Welcome back, {user?.name?.split(' ').slice(0,2).join(' ')} 👋
        </h1>
        <p style={{ fontSize:14, color:'var(--text2)', margin:'6px 0 0' }}>Here's what's happening with your practice today.</p>
      </div>

      {!profile && (
        <div style={{ padding:'14px 18px', background:'rgba(234,179,8,.08)', border:'1px solid rgba(234,179,8,.25)', borderRadius:14, fontSize:13, color:'#92400e', display:'flex', alignItems:'center', gap:12 }}>
          <AlertTriangle size={16} color="#ca8a04" />
          <span>Complete your vet profile so farmers can find you in search.</span>
          <span style={{ marginLeft:'auto', fontWeight:700, color:'#0d9488', cursor:'pointer' }}>Complete profile →</span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
        <StatCard icon={Calendar}      value={todayAppts.length} label="Today's Appointments" trend="+2 this week" color="#6366f1" />
        <StatCard icon={AlertTriangle} value={pendingEm.length}  label="Pending Requests"     sub="Farm emergencies"  color="#ef4444" />
        <StatCard icon={Activity}      value={appointments.length} label="Animals Under Care" trend="Updated today"  color="#f59e0b" />
        <StatCard icon={ShieldCheck}   value={0}                  label="Certificates to Issue" sub="This month"    color="#10b981" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Today's appointments table */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>Today's Appointments</div>
              <span style={{ fontSize:12, color:'var(--text2)' }}>{todayAppts.length} scheduled</span>
            </div>
            {todayAppts.length === 0 ? (
              <EmptyState icon={Calendar} title="Nothing today" sub="You have no appointments scheduled for today." color="#6366f1" />
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
                  <thead>
                    <tr style={{ background:'var(--bg)' }}>
                      {['Time','Farmer','Service','Status','Action'].map(h=>(
                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.5px', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayAppts.map((a:any) => (
                      <tr key={a.id} style={{ borderTop:'1px solid var(--border)' }}>
                        <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap' }}>{a.slot?.startTime}</td>
                        <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)' }}>{a.farmer?.name}</td>
                        <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text2)' }}>{a.serviceType}</td>
                        <td style={{ padding:'12px 16px' }}><StatusBadge status={a.status} /></td>
                        <td style={{ padding:'12px 16px' }}>
                          <button style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text2)', fontSize:12, cursor:'pointer', fontWeight:600 }}>View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Emergency */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>Emergency Requests</div>
              {pendingEm.length > 0 && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:10, background:'rgba(239,68,68,.1)', color:'#ef4444', fontWeight:700 }}>{pendingEm.length} OPEN</span>}
            </div>
            {pendingEm.length === 0
              ? <EmptyState icon={CheckCircle} title="All clear" sub="No pending emergency requests." color="#10b981" />
              : pendingEm.slice(0,3).map((e:any) => (
                <div key={e.id} style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:'rgba(239,68,68,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <AlertTriangle size={16} color="#ef4444" />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{e.farmer?.name}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{e.message?.slice(0,70)}...</div>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ))
            }
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Upcoming */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Upcoming</div>
              <button style={{ fontSize:12, color:'#0d9488', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>View All</button>
            </div>
            {upcoming.length === 0
              ? <EmptyState icon={Calendar} title="No upcoming" sub="No scheduled appointments." color="#6366f1" />
              : upcoming.map((a:any) => (
                <div key={a.id} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ textAlign:'center', minWidth:36, padding:'6px', background:'rgba(99,102,241,.08)', borderRadius:10 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'#6366f1', textTransform:'uppercase' }}>{new Date(a.slot?.date).toLocaleDateString('en',{month:'short'})}</div>
                    <div style={{ fontSize:18, fontWeight:900, color:'var(--text)', lineHeight:1 }}>{new Date(a.slot?.date).getDate()}</div>
                  </div>
                  <div style={{ flex:1, overflow:'hidden' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.farmer?.name}</div>
                    <div style={{ fontSize:11, color:'var(--text2)' }}>{a.serviceType}</div>
                    <div style={{ fontSize:11, color:'var(--text2)', display:'flex', alignItems:'center', gap:4, marginTop:2 }}><Clock size={10}/>{a.slot?.startTime}</div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Quick Actions */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'18px' }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:14 }}>Quick Actions</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { icon:Calendar, label:'New Appointment', color:'#6366f1' },
                { icon:Stethoscope, label:'Add Treatment', color:'#8b5cf6' },
                { icon:ShieldCheck, label:'Issue Certificate', color:'#10b981' },
                { icon:FlaskConical, label:'Lab Test', color:'#f97316' },
              ].map(({ icon:Icon, label, color }) => (
                <button key={label} style={{ padding:'12px 8px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all .15s' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={16} color={color}/></div>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text)', textAlign:'center', lineHeight:1.3 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Overview */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'18px' }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:14 }}>Monthly Overview</div>
            <div style={{ display:'flex', justifyContent:'space-around' }}>
              {[
                { value:appointments.length, label:'Appointments', color:'#6366f1' },
                { value:0, label:'Treatments', color:'#8b5cf6' },
                { value:0, label:'Certificates', color:'#10b981' },
              ].map(({ value, label, color }) => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:28, fontWeight:900, color }}>{value}</div>
                  <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Appointments Tab ───────────────────────────────────────────────────────
function AppointmentsTab({ appointments, onRefresh }: any) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? appointments : appointments.filter((a:any) => a.status === filter);
  return (
    <div>
      <SectionHeader title="Appointments" sub={`${appointments.length} total`} action="New Appointment" />
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {['all','confirmed','pending','completed','cancelled'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 14px', borderRadius:20, border:'1px solid var(--border)', background: filter===f?'#6366f1':'var(--card)', color: filter===f?'#fff':'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize' }}>{f}</button>
        ))}
      </div>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
            <thead>
              <tr style={{ background:'var(--bg)' }}>
                {['Date','Time','Farmer','Phone','Service','Notes','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.5px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8}><EmptyState icon={Calendar} title="No appointments" sub="No appointments match this filter." color="#6366f1"/></td></tr>
                : filtered.map((a:any, i:number) => (
                  <tr key={a.id} style={{ borderTop:'1px solid var(--border)', background: i%2===0?'transparent':'var(--bg)' }}>
                    <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap' }}>{new Date(a.slot?.date).toLocaleDateString()}</td>
                    <td style={{ padding:'13px 16px', fontSize:12, color:'var(--text2)', whiteSpace:'nowrap' }}>{a.slot?.startTime}–{a.slot?.endTime}</td>
                    <td style={{ padding:'13px 16px', fontSize:13, color:'var(--text)' }}>{a.farmer?.name}</td>
                    <td style={{ padding:'13px 16px', fontSize:12, color:'var(--text2)' }}>{a.farmer?.phone||'—'}</td>
                    <td style={{ padding:'13px 16px', fontSize:13, color:'var(--text)' }}>{a.serviceType}</td>
                    <td style={{ padding:'13px 16px', fontSize:12, color:'var(--text2)', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.notes||'—'}</td>
                    <td style={{ padding:'13px 16px' }}><StatusBadge status={a.status}/></td>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text2)', fontSize:11, cursor:'pointer' }}>View</button>
                        {a.status==='confirmed' && (
                          <button onClick={()=>api.patch(`/vet/appointments/${a.id}/complete`).then(onRefresh)}
                            style={{ padding:'5px 10px', borderRadius:8, border:'none', background:'#10b981', color:'#fff', fontSize:11, cursor:'pointer', fontWeight:700 }}>Done</button>
                        )}
                        {a.status==='confirmed' && (
                          <button onClick={()=>api.patch(`/vet/appointments/${a.id}/cancel`).then(onRefresh)}
                            style={{ padding:'5px 10px', borderRadius:8, border:'none', background:'rgba(239,68,68,.1)', color:'#ef4444', fontSize:11, cursor:'pointer' }}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Emergency Tab ──────────────────────────────────────────────────────────
function EmergencyTab({ emergency, onRefresh }: any) {
  return (
    <div>
      <SectionHeader title="Farm Emergency Requests" sub={`${emergency.filter((e:any)=>e.status==='open').length} open`} />
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {emergency.length === 0
          ? <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18 }}><EmptyState icon={CheckCircle} title="All clear" sub="No emergency requests at this time." color="#10b981"/></div>
          : emergency.map((e:any) => (
            <div key={e.id} style={{ background:'var(--card)', border:`1px solid ${e.status==='open'?'rgba(239,68,68,.3)':'var(--border)'}`, borderRadius:18, padding:'20px', display:'flex', gap:16, alignItems:'flex-start' }}>
              <div style={{ width:44, height:44, borderRadius:14, background:e.status==='open'?'rgba(239,68,68,.1)':'rgba(16,185,129,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <AlertTriangle size={20} color={e.status==='open'?'#ef4444':'#10b981'}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{e.farmer?.name||'Unknown Farmer'}</div>
                  <StatusBadge status={e.status}/>
                </div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:8 }}>{e.message}</div>
                <div style={{ fontSize:11, color:'var(--text2)' }}>{new Date(e.createdAt).toLocaleString()}</div>
              </div>
              {e.status==='open' && (
                <button onClick={()=>api.patch(`/vet/emergency/${e.id}/resolve`).then(onRefresh)}
                  style={{ padding:'8px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:13, cursor:'pointer', fontWeight:700, flexShrink:0 }}>
                  Resolve
                </button>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Animals Tab ────────────────────────────────────────────────────────────
function AnimalsTab({ appointments }: any) {
  const animals = appointments.filter((a:any)=>a.animalId).reduce((acc:any[], a:any) => {
    if (!acc.find((x:any)=>x.animalId===a.animalId)) acc.push(a);
    return acc;
  }, []);

  return (
    <div>
      <SectionHeader title="Animals Under Care" sub={`${animals.length} animals treated`}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {animals.length === 0
          ? <div style={{ gridColumn:'1/-1', background:'var(--card)', border:'1px solid var(--border)', borderRadius:18 }}>
              <EmptyState icon={Activity} title="No animals yet" sub="Animals will appear here as you treat them." color="#f59e0b"/>
            </div>
          : animals.map((a:any) => (
            <div key={a.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:'rgba(245,158,11,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🐄</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Animal #{a.animalId}</div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>{a.farmer?.name}</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'var(--text2)' }}>Last Service</span>
                  <span style={{ color:'var(--text)', fontWeight:600 }}>{a.serviceType}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'var(--text2)' }}>Date</span>
                  <span style={{ color:'var(--text)', fontWeight:600 }}>{new Date(a.slot?.date).toLocaleDateString()}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'var(--text2)' }}>Status</span>
                  <StatusBadge status={a.status}/>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────────────
function ReportsTab({ appointments, emergency }: any) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const thisMonth = appointments.filter((a:any) => new Date(a.createdAt).getMonth() === now.getMonth());
  const completed = appointments.filter((a:any) => a.status === 'completed');
  const cancelled = appointments.filter((a:any) => a.status === 'cancelled');

  return (
    <div>
      <SectionHeader title="Reports & Analytics" sub="Auto-collected from AgriPulse farmer data"/>
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:20 }}>
        <StatCard icon={Calendar}      value={thisMonth.length} label="This Month"    color="#6366f1" trend="Appointments" />
        <StatCard icon={CheckCircle}   value={completed.length} label="Completed"     color="#10b981" />
        <StatCard icon={X}             value={cancelled.length} label="Cancelled"     color="#ef4444" />
        <StatCard icon={AlertTriangle} value={emergency.filter((e:any)=>e.status==='resolved').length} label="Resolved Emergencies" color="#f59e0b" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'20px' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:16 }}>Appointments by Month</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {months.slice(0, now.getMonth()+1).map((m, i) => {
              const count = appointments.filter((a:any) => new Date(a.createdAt).getMonth() === i).length;
              const max = Math.max(...months.slice(0,now.getMonth()+1).map((_,j) => appointments.filter((a:any) => new Date(a.createdAt).getMonth()===j).length), 1);
              return (
                <div key={m} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:28, fontSize:11, color:'var(--text2)', fontWeight:600 }}>{m}</div>
                  <div style={{ flex:1, height:8, background:'var(--bg)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ width:`${(count/max)*100}%`, height:'100%', background:'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius:4, transition:'width .5s' }}/>
                  </div>
                  <div style={{ width:20, fontSize:11, fontWeight:700, color:'var(--text)', textAlign:'right' }}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'20px' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:16 }}>Service Breakdown</div>
          {['Vaccination','General Checkup','Treatment','Pregnancy Check','Deworming'].map(service => {
            const count = appointments.filter((a:any) => a.serviceType?.toLowerCase().includes(service.toLowerCase())).length;
            return (
              <div key={service} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:13, color:'var(--text)' }}>{service}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:60, height:6, background:'var(--bg)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${Math.min((count/(appointments.length||1))*100,100)}%`, height:'100%', background:'#0d9488', borderRadius:3 }}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', minWidth:20, textAlign:'right' }}>{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Calendar Tab ───────────────────────────────────────────────────────────
function CalendarTab({ appointments }: any) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const apptsByDay: Record<number, any[]> = {};
  appointments.forEach((a:any) => {
    const d = new Date(a.slot?.date);
    if (d.getMonth()===month && d.getFullYear()===year) {
      const day = d.getDate();
      if (!apptsByDay[day]) apptsByDay[day] = [];
      apptsByDay[day].push(a);
    }
  });

  return (
    <div>
      <SectionHeader title="Calendar" sub="Your appointment schedule"/>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'24px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <button onClick={()=>setCurrentDate(new Date(year,month-1,1))}
            style={{ padding:'8px 16px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', cursor:'pointer', fontWeight:700 }}>←</button>
          <div style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{months[month]} {year}</div>
          <button onClick={()=>setCurrentDate(new Date(year,month+1,1))}
            style={{ padding:'8px 16px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', cursor:'pointer', fontWeight:700 }}>→</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
            <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text2)', padding:'6px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
          {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:daysInMonth}).map((_,i) => {
            const day = i+1;
            const hasAppts = apptsByDay[day];
            const isToday = new Date().getDate()===day && new Date().getMonth()===month && new Date().getFullYear()===year;
            return (
              <div key={day} style={{ aspectRatio:'1', borderRadius:10, padding:4, background: isToday?'#6366f1':hasAppts?'rgba(99,102,241,.08)':'var(--bg)', border:`1px solid ${isToday?'#6366f1':hasAppts?'rgba(99,102,241,.3)':'var(--border)'}`, display:'flex', flexDirection:'column', alignItems:'center', cursor: hasAppts?'pointer':'default' }}>
                <span style={{ fontSize:13, fontWeight: isToday||hasAppts?700:400, color: isToday?'#fff':hasAppts?'#6366f1':'var(--text2)' }}>{day}</span>
                {hasAppts && !isToday && <div style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', marginTop:2 }}/>}
                {hasAppts && isToday && <div style={{ fontSize:9, color:'rgba(255,255,255,.8)', fontWeight:700 }}>{hasAppts.length}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab({ user, profile, onRefresh }: any) {
  const [form, setForm] = useState({
    licenseNumber: profile?.licenseNumber||'',
    specialization: profile?.specialization||'',
    clinicName: profile?.clinicName||'',
    bio: profile?.bio||'',
    yearsExperience: profile?.yearsExperience||'',
    consultationFee: profile?.consultationFee||'',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setSaving(true); setMsg('');
    try {
      await api.post('/vet/profile', form);
      setMsg('Profile saved successfully!');
      onRefresh();
    } catch { setMsg('Failed to save.'); }
    finally { setSaving(false); }
  }

  const inp: any = { width:'100%', height:46, padding:'0 14px', border:'1px solid var(--border)', borderRadius:12, fontSize:14, outline:'none', background:'var(--input)', color:'var(--text)', boxSizing:'border-box', caretColor:'var(--text)' };
  const lbl: any = { fontSize:12, fontWeight:600, color:'var(--text2)', display:'block', marginBottom:6 };

  return (
    <div style={{ maxWidth:640 }}>
      <SectionHeader title="Vet Profile" sub="Manage your professional information"/>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28, padding:'16px', background:'rgba(13,148,136,.06)', borderRadius:14, border:'1px solid rgba(13,148,136,.15)' }}>
          <div style={{ width:64, height:64, borderRadius:18, background:'linear-gradient(135deg,#0d9488,#0f766e)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:24, fontWeight:900, color:'#fff' }}>{user?.name?.charAt(0)}</span>
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{user?.name}</div>
            <div style={{ fontSize:13, color:'var(--text2)' }}>{user?.email}</div>
            <div style={{ fontSize:12, color:'#0d9488', fontWeight:600, marginTop:4 }}>
              {profile?.verificationStatus==='verified'?'✓ Verified Veterinarian':'⏳ Pending Verification'}
            </div>
          </div>
          {profile?.rating && (
            <div style={{ marginLeft:'auto', textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:900, color:'#f59e0b' }}>⭐ {profile.rating}</div>
              <div style={{ fontSize:11, color:'var(--text2)' }}>{profile.totalReviews} reviews</div>
            </div>
          )}
        </div>

        {msg && <div style={{ padding:'10px 14px', background: msg.includes('success')?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)', border:`1px solid ${msg.includes('success')?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}`, borderRadius:10, fontSize:13, color: msg.includes('success')?'#10b981':'#ef4444', marginBottom:16 }}>{msg}</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div><label style={lbl}>KVB License Number</label><input style={inp} value={form.licenseNumber} onChange={e=>setForm(p=>({...p,licenseNumber:e.target.value}))} placeholder="KVB/2021/1234"/></div>
            <div><label style={lbl}>Clinic / Practice Name</label><input style={inp} value={form.clinicName} onChange={e=>setForm(p=>({...p,clinicName:e.target.value}))} placeholder="Savanna Vet Clinic"/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div><label style={lbl}>Specialization</label>
              <select style={{ ...inp }} value={form.specialization} onChange={e=>setForm(p=>({...p,specialization:e.target.value}))}>
                <option value="">Select</option>
                {['Large Animals','Small Animals','Poultry','Mixed Practice','Wildlife','Aquatic'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Years of Experience</label><input style={inp} type="number" value={form.yearsExperience} onChange={e=>setForm(p=>({...p,yearsExperience:e.target.value}))} placeholder="5"/></div>
          </div>
          <div><label style={lbl}>Consultation Fee (KSh)</label><input style={inp} type="number" value={form.consultationFee} onChange={e=>setForm(p=>({...p,consultationFee:e.target.value}))} placeholder="2000"/></div>
          <div><label style={lbl}>Bio / About</label>
            <textarea value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} rows={4} placeholder="Tell farmers about your expertise and experience..." style={{ ...inp, height:'auto', padding:'12px 14px', resize:'vertical' as const }}/>
          </div>
          <button onClick={save} disabled={saving} style={{ height:48, background: saving?'rgba(13,148,136,.4)':'linear-gradient(135deg,#0d9488,#0f766e)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:15, cursor: saving?'not-allowed':'pointer' }}>
            {saving?'Saving...':'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reviews Tab ────────────────────────────────────────────────────────────
function ReviewsTab({ profile }: any) {
  const [reviews, setReviews] = useState<any[]>([]);
  useEffect(() => {
    if (profile?.userId) {
      api.get(`/market-reviews/user/${profile.userId}`).then(r => setReviews(r.data.reviews||[])).catch(()=>{});
    }
  }, [profile]);

  return (
    <div>
      <SectionHeader title="Reviews & Ratings" sub={`${reviews.length} reviews received`}/>
      {profile?.rating && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'24px', marginBottom:16, display:'flex', alignItems:'center', gap:24 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, fontWeight:900, color:'#f59e0b', lineHeight:1 }}>{Number(profile.rating).toFixed(1)}</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>Average Rating</div>
          </div>
          <div style={{ flex:1 }}>
            {[5,4,3,2,1].map(star => {
              const count = reviews.filter(r=>r.rating===star).length;
              return (
                <div key={star} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'var(--text2)', minWidth:8 }}>{star}</span>
                  <Star size={12} color="#f59e0b" fill="#f59e0b"/>
                  <div style={{ flex:1, height:6, background:'var(--bg)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${reviews.length?((count/reviews.length)*100):0}%`, height:'100%', background:'#f59e0b', borderRadius:3 }}/>
                  </div>
                  <span style={{ fontSize:11, color:'var(--text2)', minWidth:16, textAlign:'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:800, color:'var(--text)' }}>{profile.totalReviews}</div>
            <div style={{ fontSize:12, color:'var(--text2)' }}>Total Reviews</div>
          </div>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {reviews.length === 0
          ? <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18 }}><EmptyState icon={Star} title="No reviews yet" sub="Reviews from farmers will appear here." color="#f59e0b"/></div>
          : reviews.map((r:any) => (
            <div key={r.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontWeight:700, color:'var(--text)' }}>{r.reviewer?.name}</div>
                <div style={{ display:'flex', gap:2 }}>
                  {Array.from({length:5}).map((_,i)=><Star key={i} size={14} color="#f59e0b" fill={i<r.rating?'#f59e0b':'none'}/>)}
                </div>
              </div>
              {r.comment && <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>{r.comment}</div>}
              <div style={{ fontSize:11, color:'var(--text2)', marginTop:8 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Settings Tab ───────────────────────────────────────────────────────────
function SettingsTab({ user, isDark, toggleDark }: any) {
  return (
    <div style={{ maxWidth:560 }}>
      <SectionHeader title="Settings" sub="Manage your account preferences"/>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {[
          { label:'Account Email', sub:user?.email, action:null },
          { label:'Change Password', sub:'Update your login password', action:<button style={{ padding:'8px 20px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', cursor:'pointer', fontWeight:600, fontSize:13 }}>Change</button> },
          { label:'Notifications', sub:'Email and SMS notification preferences', action:<button style={{ padding:'8px 20px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', cursor:'pointer', fontWeight:600, fontSize:13 }}>Manage</button> },
          { label:'Availability Slots', sub:'Manage your available appointment slots', action:<button style={{ padding:'8px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#0d9488,#0f766e)', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:13 }}>Manage Slots</button> },
        ].map(({ label, sub, action }) => (
          <div key={label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{label}</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{sub}</div>
            </div>
            {action}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Coming Soon ────────────────────────────────────────────────────────────
function ComingSoon({ id }: { id: string }) {
  const nav = NAV.find(n=>n.id===id);
  const Icon = nav?.icon || Stethoscope;
  const color = ACCENT_MAP[id] || '#64748b';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:420, gap:16 }}>
      <div style={{ width:72, height:72, borderRadius:22, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={32} color={color}/>
      </div>
      <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text)', margin:0 }}>{nav?.label}</h2>
      <p style={{ fontSize:14, color:'var(--text2)', margin:0 }}>This module is being built. Coming soon.</p>
      <div style={{ padding:'8px 20px', borderRadius:20, background:`${color}18`, color, fontSize:13, fontWeight:700 }}>In Development</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function VetDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const isDark = false;
  const [appointments, setAppointments] = useState<any[]>([]);
  const [emergency, setEmergency] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const T = isDark ? DARK : LIGHT;

  const load = async () => {
    try {
      const [a, e, p] = await Promise.all([
        api.get('/vet/appointments/mine'),
        api.get('/vet/emergency/mine'),
        api.get('/vet/profile/me').catch(()=>({ data:{ profile:null } })),
      ]);
      setAppointments(a.data.appointments||[]);
      setEmergency(e.data.alerts||[]);
      setProfile(p.data.profile||null);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const openEm = emergency.filter(e=>e.status==='open').length;
  const accentColor = ACCENT_MAP[tab] || '#0d9488';

  const cssVars = `
    :root {
      --bg:${T.bg}; --card:${T.card}; --border:${T.border};
      --text:${T.text}; --text2:${T.text2}; --input:${T.input};
    }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:${T.bg}; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    ::-webkit-scrollbar { width:4px; height:4px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(128,128,128,.3); border-radius:4px; }
    input::placeholder, textarea::placeholder { color:var(--text2); }
    select option { background:${isDark?'#0a1628':'#fff'}; color:${T.text}; }
  `;

  function renderContent() {
    switch(tab) {
      case 'dashboard':     return <DashboardTab user={user} appointments={appointments} emergency={emergency} profile={profile}/>;
      case 'appointments':  return <AppointmentsTab appointments={appointments} onRefresh={load}/>;
      case 'emergency':     return <EmergencyTab emergency={emergency} onRefresh={load}/>;
      case 'animals':       return <AnimalsTab appointments={appointments}/>;
      case 'reports':       return <ReportsTab appointments={appointments} emergency={emergency}/>;
      case 'calendar':      return <CalendarTab appointments={appointments}/>;
      case 'reviews':       return <ReviewsTab profile={profile}/>;
      case 'profile':       return <ProfileTab user={user} profile={profile} onRefresh={load}/>;
      case 'settings':      return <SettingsTab user={user} isDark={isDark} toggleDark={()=>{}}/>;
      default:              return <ComingSoon id={tab}/>;
    }
  }

  return (
    <>
      <style>{cssVars}</style>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:T.bg }}>

        {/* ── Sidebar ── */}
        <div style={{ width:collapsed?68:240, flexShrink:0, background:T.sidebar, display:'flex', flexDirection:'column', transition:'width .2s', overflow:'hidden', position:'relative', zIndex:10 }}>
          {/* Logo */}
          <div style={{ height:64, padding:'0 16px', display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid rgba(255,255,255,.08)`, flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#0d9488,#0f766e)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <div style={{ background:'#fff', borderRadius:8, padding:'4px 6px', display:'flex', alignItems:'center' }}>
                <img src="/agripulse-logo.png" alt="" style={{ height:24, objectFit:'contain', display:'block' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              </div>
            </div>
            {!collapsed && (
              <div style={{ overflow:'hidden' }}>
                <div style={{ fontWeight:900, fontSize:15, color:'#fff', whiteSpace:'nowrap', letterSpacing:'-0.3px' }}>AgriPulse</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.8px' }}>Veterinary</div>
              </div>
            )}
            <button onClick={()=>setCollapsed(p=>!p)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', padding:4, flexShrink:0, display:'flex' }}>
              {collapsed?<Menu size={16}/>:<X size={16}/>}
            </button>
          </div>

          {/* Search */}
          {!collapsed && (
            <div style={{ padding:'12px 12px 6px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(255,255,255,.06)', borderRadius:10, border:'1px solid rgba(255,255,255,.08)' }}>
                <Search size={13} color="rgba(255,255,255,.3)"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ background:'none', border:'none', outline:'none', fontSize:12, color:'#fff', width:'100%', caretColor:'#fff' }}/>
              </div>
            </div>
          )}

          {/* Nav items */}
          <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
            {NAV.filter(n => !search || n.label.toLowerCase().includes(search.toLowerCase())).map(({ id, label, icon:Icon }) => {
              const active = tab===id;
              const color = ACCENT_MAP[id];
              return (
                <button key={id} onClick={()=>{ setTab(id); setSearch(''); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding: collapsed?'10px':'10px 12px', borderRadius:12, background: active?`${color}20`:'transparent', border:`1px solid ${active?`${color}30`:'transparent'}`, cursor:'pointer', marginBottom:2, justifyContent:collapsed?'center':'flex-start', transition:'all .15s', position:'relative' }}>
                  <Icon size={17} color={active?color:'rgba(255,255,255,.45)'} style={{ flexShrink:0 }}/>
                  {!collapsed && <span style={{ fontSize:13, fontWeight:active?700:400, color:active?color:'rgba(255,255,255,.6)', whiteSpace:'nowrap', flex:1, textAlign:'left' }}>{label}</span>}
                  {!collapsed && id==='emergency' && openEm>0 && (
                    <span style={{ fontSize:10, fontWeight:800, background:'#ef4444', color:'#fff', borderRadius:10, padding:'1px 6px', minWidth:18, textAlign:'center' }}>{openEm}</span>
                  )}
                  {collapsed && active && <div style={{ position:'absolute', left:0, top:'25%', bottom:'25%', width:3, background:color, borderRadius:'0 3px 3px 0' }}/>}
                </button>
              );
            })}
          </div>

          {/* User */}
          <div style={{ padding:'10px', borderTop:'1px solid rgba(255,255,255,.08)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px', borderRadius:12, background:'rgba(255,255,255,.05)' }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#0d9488,#0f766e)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:13, fontWeight:800, color:'#fff' }}>{user?.name?.charAt(0)}</span>
              </div>
              {!collapsed && (
                <>
                  <div style={{ flex:1, overflow:'hidden' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
                    <div style={{ fontSize:10, color:'#0d9488', fontWeight:600 }}>● Online</div>
                  </div>
                  <button onClick={()=>{ logout(); navigate('/vet/login'); }} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', padding:4 }}>
                    <LogOut size={14}/>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Main ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Topbar */}
          <div style={{ height:64, background:T.card, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', padding:'0 24px', gap:16, flexShrink:0 }}>
            {/* Search bar */}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:T.input, borderRadius:12, border:`1px solid ${T.border}`, flex:1, maxWidth:340 }}>
              <Search size={15} color={T.text2}/>
              <input placeholder="Search Dashboard..." style={{ background:'none', border:'none', outline:'none', fontSize:13, color:T.text, width:'100%', caretColor:T.text }}/>
            </div>

            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>

              {/* Notifications */}
              <div style={{ position:'relative' }}>
                <button onClick={()=>setNotifOpen(p=>!p)} style={{ width:38, height:38, borderRadius:10, border:`1px solid ${T.border}`, background:'none', cursor:'pointer', color:T.text2, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Bell size={16}/>
                </button>
                {openEm>0 && <span style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:'#ef4444', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{openEm}</span>}
                {notifOpen && (
                  <div style={{ position:'absolute', top:46, right:0, width:280, background:T.card, border:`1px solid ${T.border}`, borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,.2)', zIndex:100, overflow:'hidden' }}>
                    <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, fontWeight:700, fontSize:14, color:T.text }}>Notifications</div>
                    {openEm===0
                      ? <div style={{ padding:'20px', textAlign:'center', fontSize:13, color:T.text2 }}>No new notifications</div>
                      : emergency.filter(e=>e.status==='open').map(e=>(
                        <div key={e.id} onClick={()=>{ setTab('emergency'); setNotifOpen(false); }} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, cursor:'pointer', display:'flex', gap:10 }}>
                          <AlertTriangle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:2 }}/>
                          <div>
                            <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{e.farmer?.name}</div>
                            <div style={{ fontSize:11, color:T.text2 }}>{e.message?.slice(0,50)}...</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* User badge */}
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 14px', borderRadius:12, border:`1px solid ${T.border}`, background:T.card, cursor:'pointer' }}>
                <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#0d9488,#0f766e)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:12, fontWeight:800, color:'#fff' }}>{user?.name?.charAt(0)}</span>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.text, whiteSpace:'nowrap' }}>{user?.name}</div>
                  <div style={{ fontSize:10, color:'#0d9488', fontWeight:600 }}>● Vet • Online</div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:'auto', padding:'24px' }} onClick={()=>notifOpen&&setNotifOpen(false)}>
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
}
