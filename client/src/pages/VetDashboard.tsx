import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Stethoscope, Syringe, FileText,
  FlaskConical, ShieldCheck, BarChart3, MessageSquare, Star, User,
  Settings, LogOut, Bell, Menu, X, AlertTriangle, CheckCircle, Plus,
  Clock, Search, Sun, Moon, Activity, Pill
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const LIGHT = {
  bg:'#f0f4f8', card:'#ffffff', border:'#e2e8f0',
  text:'#0f172a', text2:'#64748b', sidebar:'#0f172a', input:'#f8fafc',
};
const DARK = {
  bg:'#070d14', card:'rgba(255,255,255,.04)', border:'rgba(255,255,255,.08)',
  text:'#e2e8f0', text2:'#64748b', sidebar:'#0a1628', input:'rgba(255,255,255,.05)',
};

const ACCENT: Record<string,string> = {
  dashboard:'#0d9488', appointments:'#6366f1', emergency:'#ef4444',
  animals:'#f59e0b', treatments:'#8b5cf6', vaccinations:'#0ea5e9',
  prescriptions:'#ec4899', certificates:'#10b981', labtests:'#f97316',
  verifications:'#14b8a6', reports:'#6366f1', calendar:'#0d9488',
  messages:'#3b82f6', reviews:'#f59e0b', profile:'#10b981', settings:'#64748b',
};

const NAV = [
  { id:'dashboard',     label:'Dashboard',                icon:LayoutDashboard },
  { id:'appointments',  label:'Appointments',             icon:Calendar },
  { id:'emergency',     label:'Farm Requests',            icon:AlertTriangle },
  { id:'animals',       label:'Animals',                  icon:Activity },
  { id:'treatments',    label:'Treatments',               icon:Stethoscope },
  { id:'vaccinations',  label:'Vaccinations',             icon:Syringe },
  { id:'prescriptions', label:'Prescriptions',            icon:Pill },
  { id:'certificates',  label:'Health Certificates',      icon:ShieldCheck },
  { id:'labtests',      label:'Lab Tests',                icon:FlaskConical },
  { id:'verifications', label:'Marketplace Verifications',icon:CheckCircle },
  { id:'reports',       label:'Reports',                  icon:BarChart3 },
  { id:'calendar',      label:'Calendar',                 icon:Calendar },
  { id:'messages',      label:'Messages',                 icon:MessageSquare },
  { id:'reviews',       label:'Reviews',                  icon:Star },
  { id:'profile',       label:'Profile',                  icon:User },
  { id:'settings',      label:'Settings',                 icon:Settings },
];

function StatusBadge({ status }: { status:string }) {
  const m: Record<string,[string,string]> = {
    confirmed:['rgba(16,185,129,.15)','#10b981'],
    pending:  ['rgba(234,179,8,.15)', '#ca8a04'],
    completed:['rgba(99,102,241,.15)','#6366f1'],
    cancelled:['rgba(239,68,68,.15)', '#ef4444'],
    open:     ['rgba(239,68,68,.15)', '#ef4444'],
    resolved: ['rgba(16,185,129,.15)','#10b981'],
  };
  const [bg,color]=m[status?.toLowerCase()]||['rgba(100,116,139,.15)','#64748b'];
  return <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color,textTransform:'capitalize'}}>{status}</span>;
}

function StatCard({icon:Icon,value,label,color}:any){
  return(
    <div style={{flex:1,minWidth:140,borderRadius:18,padding:'20px',background:`linear-gradient(135deg,${color}22,${color}10)`,border:`1px solid ${color}30`,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-10,right:-10,width:70,height:70,borderRadius:'50%',background:`${color}15`}}/>
      <div style={{width:42,height:42,borderRadius:12,background:`${color}25`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
        <Icon size={20} color={color}/>
      </div>
      <div style={{fontSize:28,fontWeight:900,color,lineHeight:1}}>{value}</div>
      <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginTop:4}}>{label}</div>
    </div>
  );
}

function EmptyState({icon:Icon,title,sub,color='#64748b',T}:any){
  return(
    <div style={{padding:'48px 20px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{width:60,height:60,borderRadius:18,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={26} color={color}/></div>
      <div style={{fontSize:15,fontWeight:700,color:T?T.text:'var(--text)'}}>{title}</div>
      <div style={{fontSize:13,color:T?T.text2:'var(--text2)'}}>{sub}</div>
    </div>
  );
}

function DashboardTab({user,appointments,emergency,profile,isMobile}:any){
  const today=new Date().toDateString();
  const todayAppts=appointments.filter((a:any)=>new Date(a.slot?.date).toDateString()===today);
  const pendingEm=emergency.filter((e:any)=>e.status==='open');
  const upcoming=appointments.filter((a:any)=>new Date(a.slot?.date)>=new Date()).slice(0,5);
  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div>
        <h1 style={{fontSize:isMobile?20:26,fontWeight:900,color:'var(--text)',margin:0}}>Welcome back, {user?.name?.split(' ')[0]} </h1>
        <p style={{fontSize:13,color:'var(--text2)',margin:'6px 0 0'}}>Here's what's happening with your practice today.</p>
      </div>
      {!profile&&(
        <div style={{padding:'12px 16px',background:'rgba(234,179,8,.08)',border:'1px solid rgba(234,179,8,.25)',borderRadius:12,fontSize:13,color:'#92400e',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <AlertTriangle size={16} color="#ca8a04"/>
          <span>Complete your vet profile so farmers can find you.</span>
        </div>
      )}
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon={Calendar}      value={todayAppts.length} label="Today's Appointments" color="#6366f1"/>
        <StatCard icon={AlertTriangle} value={pendingEm.length}  label="Pending Requests"     color="#ef4444"/>
        <StatCard icon={Activity}      value={appointments.length} label="Animals Under Care" color="#f59e0b"/>
        <StatCard icon={ShieldCheck}   value={0}                  label="Certificates"        color="#10b981"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 300px',gap:16}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>Today's Appointments</div>
              <span style={{fontSize:12,color:'var(--text2)'}}>{todayAppts.length} scheduled</span>
            </div>
            {todayAppts.length===0
              ?<EmptyState icon={Calendar} title="Nothing today" sub="No appointments scheduled." color="#6366f1"/>
              :<div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:400}}>
                  <thead><tr style={{background:'var(--bg)'}}>
                    {['Time','Farmer','Service','Status','Action'].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {todayAppts.map((a:any)=>(
                      <tr key={a.id} style={{borderTop:'1px solid var(--border)'}}>
                        <td style={{padding:'11px 14px',fontSize:13,fontWeight:600,color:'var(--text)',whiteSpace:'nowrap'}}>{a.slot?.startTime}</td>
                        <td style={{padding:'11px 14px',fontSize:13,color:'var(--text)'}}>{a.farmer?.name}</td>
                        <td style={{padding:'11px 14px',fontSize:12,color:'var(--text2)'}}>{a.serviceType}</td>
                        <td style={{padding:'11px 14px'}}><StatusBadge status={a.status}/></td>
                        <td style={{padding:'11px 14px'}}><button style={{padding:'4px 10px',borderRadius:7,border:'1px solid var(--border)',background:'none',color:'var(--text2)',fontSize:11,cursor:'pointer'}}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </div>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>Emergency Requests</div>
              {pendingEm.length>0&&<span style={{fontSize:11,padding:'3px 8px',borderRadius:10,background:'rgba(239,68,68,.1)',color:'#ef4444',fontWeight:700}}>{pendingEm.length} OPEN</span>}
            </div>
            {pendingEm.length===0
              ?<EmptyState icon={CheckCircle} title="All clear" sub="No pending emergencies." color="#10b981"/>
              :pendingEm.slice(0,3).map((e:any)=>(
                <div key={e.id} style={{padding:'13px 18px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{width:36,height:36,borderRadius:10,background:'rgba(239,68,68,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><AlertTriangle size={15} color="#ef4444"/></div>
                  <div style={{flex:1,overflow:'hidden'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{e.farmer?.name}</div>
                    <div style={{fontSize:12,color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.message}</div>
                  </div>
                  <StatusBadge status={e.status}/>
                </div>
              ))
            }
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:13,color:'var(--text)'}}>Upcoming Appointments</div>
            {upcoming.length===0
              ?<EmptyState icon={Calendar} title="No upcoming" sub="No scheduled appointments." color="#6366f1"/>
              :upcoming.map((a:any)=>(
                <div key={a.id} style={{padding:'11px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'center'}}>
                  <div style={{textAlign:'center',minWidth:34,padding:'5px',background:'rgba(99,102,241,.08)',borderRadius:9}}>
                    <div style={{fontSize:9,fontWeight:700,color:'#6366f1',textTransform:'uppercase'}}>{new Date(a.slot?.date).toLocaleDateString('en',{month:'short'})}</div>
                    <div style={{fontSize:16,fontWeight:900,color:'var(--text)',lineHeight:1}}>{new Date(a.slot?.date).getDate()}</div>
                  </div>
                  <div style={{flex:1,overflow:'hidden'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.farmer?.name}</div>
                    <div style={{fontSize:11,color:'var(--text2)'}}>{a.serviceType}</div>
                    <div style={{fontSize:11,color:'var(--text2)',display:'flex',alignItems:'center',gap:3,marginTop:2}}><Clock size={9}/>{a.slot?.startTime}</div>
                  </div>
                </div>
              ))
            }
          </div>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,padding:'16px'}}>
            <div style={{fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:12}}>Quick Actions</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[{icon:Calendar,label:'New Appointment',color:'#6366f1'},{icon:Stethoscope,label:'Add Treatment',color:'#8b5cf6'},{icon:ShieldCheck,label:'Issue Certificate',color:'#10b981'},{icon:FlaskConical,label:'Lab Test',color:'#f97316'}].map(({icon:Icon,label,color})=>(
                <button key={label} style={{padding:'10px 6px',borderRadius:11,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <div style={{width:32,height:32,borderRadius:9,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={15} color={color}/></div>
                  <span style={{fontSize:10,fontWeight:600,color:'var(--text)',textAlign:'center',lineHeight:1.3}}>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,padding:'16px'}}>
            <div style={{fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:12}}>Monthly Overview</div>
            <div style={{display:'flex',justifyContent:'space-around'}}>
              {[{value:appointments.length,label:'Appointments',color:'#6366f1'},{value:0,label:'Treatments',color:'#8b5cf6'},{value:0,label:'Certificates',color:'#10b981'}].map(({value,label,color})=>(
                <div key={label} style={{textAlign:'center'}}>
                  <div style={{fontSize:26,fontWeight:900,color}}>{value}</div>
                  <div style={{fontSize:10,color:'var(--text2)',marginTop:2}}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentDetailModal({appt,onClose,onRefresh,T,isMobile}:any){
  async function act(action:'complete'|'cancel'){
    await api.patch(`/vet/appointments/${appt.id}/${action}`);
    onRefresh();
    onClose();
  }
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,padding:'22px',width:'100%',maxWidth:420,maxHeight:'85vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <h3 style={{fontSize:17,fontWeight:800,color:T.text,margin:0}}>Appointment Details</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:T.text2,padding:4}}><X size={18}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:18}}>
          {[
            ['Farmer',appt.farmer?.name],
            ['Phone',appt.farmer?.phone||'Not provided'],
            ['County',appt.farmer?.county||'—'],
            ['Date',new Date(appt.slot?.date).toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})],
            ['Time',`${appt.slot?.startTime} - ${appt.slot?.endTime}`],
            ['Service',appt.serviceType],
            ['Notes',appt.notes||'None provided'],
          ].map(([k,v])=>(
            <div key={k as string}>
              <div style={{fontSize:10,fontWeight:700,color:T.text2,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:2}}>{k}</div>
              <div style={{fontSize:14,color:T.text}}>{v as string}</div>
            </div>
          ))}
          <div>
            <div style={{fontSize:10,fontWeight:700,color:T.text2,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Status</div>
            <StatusBadge status={appt.status}/>
          </div>
        </div>
        {appt.status==='confirmed'&&(
          <div style={{display:'flex',gap:8,flexDirection:isMobile?'column':'row'}}>
            <button onClick={()=>act('complete')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Mark Complete</button>
            <button onClick={()=>act('cancel')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'rgba(239,68,68,.12)',color:'#ef4444',fontWeight:700,fontSize:13,cursor:'pointer'}}>Cancel Appointment</button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewSlotModal({onClose,onRefresh,T,isMobile}:any){
  const [date,setDate]=useState('');
  const [startTime,setStartTime]=useState('');
  const [endTime,setEndTime]=useState('');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  async function submit(){
    if(!date||!startTime||!endTime){setError('All fields are required.');return;}
    if(startTime>=endTime){setError('End time must be after start time.');return;}
    setSaving(true);setError('');
    try{
      await api.post('/vet/slots',{date,startTime,endTime});
      onRefresh();
      onClose();
    }catch(err:any){
      setError(err?.response?.data?.error||'Failed to add slot.');
    }finally{setSaving(false);}
  }

  const inputStyle:any={width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${T.border}`,background:T.input,color:T.text,fontSize:13,outline:'none',boxSizing:'border-box'};
  const labelStyle:any={fontSize:11,fontWeight:600,color:T.text2,marginBottom:5,display:'block'};

  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,padding:'22px',width:'100%',maxWidth:380}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <h3 style={{fontSize:17,fontWeight:800,color:T.text,margin:0}}>Add Availability Slot</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:T.text2,padding:4}}><X size={18}/></button>
        </div>
        <p style={{fontSize:12,color:T.text2,marginBottom:16,lineHeight:1.5}}>Farmers book directly from your open slots — appointments appear here automatically once booked.</p>
        {error&&<div style={{padding:'9px 12px',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:9,color:'#ef4444',fontSize:12,marginBottom:12}}>{error}</div>}
        <div style={{marginBottom:12}}>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18}}>
          <div>
            <label style={labelStyle}>Start Time</label>
            <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>End Time</label>
            <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} style={inputStyle}/>
          </div>
        </div>
        <button onClick={submit} disabled={saving} style={{width:'100%',padding:'11px',borderRadius:10,border:'none',background:'#6366f1',color:'#fff',fontWeight:700,fontSize:13,cursor:saving?'not-allowed':'pointer',opacity:saving?.6:1}}>
          {saving?'Adding...':'Add Slot'}
        </button>
      </div>
    </div>
  );
}

function AppointmentsTab({appointments,onRefresh,isMobile,T}:any){
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  const [sortBy,setSortBy]=useState<'date'|'farmer'>('date');
  const [detail,setDetail]=useState<any>(null);
  const [showSlotModal,setShowSlotModal]=useState(false);

  let list=filter==='all'?appointments:appointments.filter((a:any)=>a.status===filter);
  if(search.trim()){
    const q=search.trim().toLowerCase();
    list=list.filter((a:any)=>(a.farmer?.name||'').toLowerCase().includes(q)||(a.serviceType||'').toLowerCase().includes(q));
  }
  list=[...list].sort((a:any,b:any)=>
    sortBy==='farmer'
      ? (a.farmer?.name||'').localeCompare(b.farmer?.name||'')
      : new Date(a.slot?.date||0).getTime()-new Date(b.slot?.date||0).getTime()
  );

  return(
    <div>
      <div style={{display:'flex',flexDirection:isMobile?'column':'row',alignItems:isMobile?'stretch':'center',gap:isMobile?12:0,justifyContent:'space-between',marginBottom:18}}>
        <div><h2 style={{fontSize:isMobile?18:20,fontWeight:800,color:T.text,margin:0}}>Appointments</h2><p style={{fontSize:12,color:T.text2,margin:'3px 0 0'}}>{appointments.length} total</p></div>
        <button onClick={()=>setShowSlotModal(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 16px',background:'#6366f1',color:'#fff',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:13,width:isMobile?'100%':'auto'}}><Plus size={14}/>New Slot</button>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:isMobile?'1 1 100%':'0 1 220px'}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.text2}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search farmer or service..."
            style={{width:'100%',padding:'8px 12px 8px 32px',borderRadius:9,border:`1px solid ${T.border}`,background:T.input,color:T.text,fontSize:12,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)}
          style={{padding:'8px 12px',borderRadius:9,border:`1px solid ${T.border}`,background:T.input,color:T.text,fontSize:12,outline:'none',cursor:'pointer'}}>
          <option value="date">Sort: Date</option>
          <option value="farmer">Sort: Farmer Name</option>
        </select>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {['all','confirmed','pending','completed','cancelled'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${T.border}`,background:filter===f?'#6366f1':T.card,color:filter===f?'#fff':T.text2,fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{f}</button>
        ))}
      </div>

      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:500}}>
            <thead><tr style={{background:T.bg}}>
              {['Date','Time','Farmer','Service','Status','Actions'].map(h=>(
                <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:T.text2,textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {list.length===0
                ?<tr><td colSpan={6}><EmptyState icon={Calendar} title="No appointments" sub="No appointments match this filter." color="#6366f1" T={T}/></td></tr>
                :list.map((a:any,i:number)=>(
                  <tr key={a.id}
                    style={{borderTop:`1px solid ${T.border}`,background:i%2===0?'transparent':T.bg,cursor:'pointer'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=T.input;}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=i%2===0?'transparent':T.bg;}}
                    onClick={()=>setDetail(a)}>
                    <td style={{padding:'12px 14px',fontSize:12,fontWeight:600,color:T.text,whiteSpace:'nowrap'}}>{new Date(a.slot?.date).toLocaleDateString()}</td>
                    <td style={{padding:'12px 14px',fontSize:12,color:T.text2,whiteSpace:'nowrap'}}>{a.slot?.startTime}</td>
                    <td style={{padding:'12px 14px',fontSize:13,color:T.text}}>{a.farmer?.name}</td>
                    <td style={{padding:'12px 14px',fontSize:12,color:T.text2}}>{a.serviceType}</td>
                    <td style={{padding:'12px 14px'}}><StatusBadge status={a.status}/></td>
                    <td style={{padding:'12px 14px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>setDetail(a)} style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${T.border}`,background:'none',color:T.text2,fontSize:11,cursor:'pointer'}}>View</button>
                        {a.status==='confirmed'&&<button onClick={()=>api.patch(`/vet/appointments/${a.id}/complete`).then(onRefresh)} style={{padding:'4px 9px',borderRadius:7,border:'none',background:'#10b981',color:'#fff',fontSize:11,cursor:'pointer',fontWeight:700}}>Done</button>}
                        {a.status==='confirmed'&&<button onClick={()=>api.patch(`/vet/appointments/${a.id}/cancel`).then(onRefresh)} style={{padding:'4px 9px',borderRadius:7,border:'none',background:'rgba(239,68,68,.1)',color:'#ef4444',fontSize:11,cursor:'pointer'}}>Cancel</button>}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {detail&&<AppointmentDetailModal appt={detail} onClose={()=>setDetail(null)} onRefresh={onRefresh} T={T} isMobile={isMobile}/>}
      {showSlotModal&&<NewSlotModal onClose={()=>setShowSlotModal(false)} onRefresh={onRefresh} T={T} isMobile={isMobile}/>}
    </div>
  );
}

function EmergencyTab({emergency,onRefresh}:any){
  return(
    <div>
      <div style={{marginBottom:18}}><h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',margin:0}}>Farm Emergency Requests</h2><p style={{fontSize:12,color:'var(--text2)',margin:'3px 0 0'}}>{emergency.filter((e:any)=>e.status==='open').length} open</p></div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {emergency.length===0
          ?<div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18}}><EmptyState icon={CheckCircle} title="All clear" sub="No emergency requests." color="#10b981"/></div>
          :emergency.map((e:any)=>(
            <div key={e.id} style={{background:'var(--card)',border:`1px solid ${e.status==='open'?'rgba(239,68,68,.3)':'var(--border)'}`,borderRadius:18,padding:'18px',display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
              <div style={{width:42,height:42,borderRadius:12,background:e.status==='open'?'rgba(239,68,68,.1)':'rgba(16,185,129,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><AlertTriangle size={18} color={e.status==='open'?'#ef4444':'#10b981'}/></div>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}><div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{e.farmer?.name||'Unknown'}</div><StatusBadge status={e.status}/></div>
                <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginBottom:6}}>{e.message}</div>
                <div style={{fontSize:11,color:'var(--text2)'}}>{new Date(e.createdAt).toLocaleString()}</div>
              </div>
              {e.status==='open'&&<button onClick={()=>api.patch(`/vet/emergency/${e.id}/resolve`).then(onRefresh)} style={{padding:'8px 16px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:700,flexShrink:0}}>Resolve</button>}
            </div>
          ))
        }
      </div>
    </div>
  );
}

function AnimalsTab({appointments}:any){
  const animals=appointments.filter((a:any)=>a.animalId).reduce((acc:any[],a:any)=>{if(!acc.find((x:any)=>x.animalId===a.animalId))acc.push(a);return acc;},[]);
  return(
    <div>
      <div style={{marginBottom:18}}><h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',margin:0}}>Animals Under Care</h2><p style={{fontSize:12,color:'var(--text2)',margin:'3px 0 0'}}>{animals.length} animals</p></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
        {animals.length===0
          ?<div style={{gridColumn:'1/-1',background:'var(--card)',border:'1px solid var(--border)',borderRadius:18}}><EmptyState icon={Activity} title="No animals yet" sub="Animals will appear as you treat them." color="#f59e0b"/></div>
          :animals.map((a:any)=>(
            <div key={a.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,padding:'18px'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{width:46,height:46,borderRadius:12,background:'rgba(245,158,11,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Activity size={20} color="#f59e0b"/></div>
                <div><div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>Animal #{a.animalId}</div><div style={{fontSize:12,color:'var(--text2)'}}>{a.farmer?.name}</div></div>
              </div>
              {[['Last Service',a.serviceType],['Date',new Date(a.slot?.date).toLocaleDateString()],['Status',a.status]].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                  <span style={{color:'var(--text2)'}}>{k}</span>
                  {k==='Status'?<StatusBadge status={v}/>:<span style={{color:'var(--text)',fontWeight:600}}>{v}</span>}
                </div>
              ))}
            </div>
          ))
        }
      </div>
    </div>
  );
}

function ReportsTab({appointments,emergency}:any){
  const now=new Date();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const thisMonth=appointments.filter((a:any)=>new Date(a.createdAt).getMonth()===now.getMonth()).length;
  const completed=appointments.filter((a:any)=>a.status==='completed').length;
  const resolved=emergency.filter((e:any)=>e.status==='resolved').length;
  return(
    <div>
      <div style={{marginBottom:18}}><h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',margin:0}}>Reports & Analytics</h2><p style={{fontSize:12,color:'var(--text2)',margin:'3px 0 0'}}>Auto-collected from AgriPulse farmer data</p></div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:18}}>
        <StatCard icon={Calendar}      value={thisMonth}  label="This Month"         color="#6366f1"/>
        <StatCard icon={CheckCircle}   value={completed}  label="Completed"          color="#10b981"/>
        <StatCard icon={AlertTriangle} value={resolved}   label="Resolved Emergencies" color="#f59e0b"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,padding:'20px'}}>
          <div style={{fontWeight:700,fontSize:14,color:'var(--text)',marginBottom:14}}>Appointments by Month</div>
          {months.slice(0,now.getMonth()+1).map((m,i)=>{
            const count=appointments.filter((a:any)=>new Date(a.createdAt).getMonth()===i).length;
            const max=Math.max(...months.slice(0,now.getMonth()+1).map((_,j)=>appointments.filter((a:any)=>new Date(a.createdAt).getMonth()===j).length),1);
            return(
              <div key={m} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <div style={{width:26,fontSize:11,color:'var(--text2)',fontWeight:600}}>{m}</div>
                <div style={{flex:1,height:7,background:'var(--bg)',borderRadius:4,overflow:'hidden'}}><div style={{width:`${(count/max)*100}%`,height:'100%',background:'linear-gradient(90deg,#6366f1,#8b5cf6)',borderRadius:4}}/></div>
                <div style={{width:18,fontSize:11,fontWeight:700,color:'var(--text)',textAlign:'right'}}>{count}</div>
              </div>
            );
          })}
        </div>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,padding:'20px'}}>
          <div style={{fontWeight:700,fontSize:14,color:'var(--text)',marginBottom:14}}>Service Breakdown</div>
          {['Vaccination','General Checkup','Treatment','Pregnancy Check','Deworming'].map(service=>{
            const count=appointments.filter((a:any)=>a.serviceType?.toLowerCase().includes(service.toLowerCase())).length;
            return(
              <div key={service} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{fontSize:12,color:'var(--text)'}}>{service}</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:60,height:5,background:'var(--bg)',borderRadius:3,overflow:'hidden'}}><div style={{width:`${Math.min((count/(appointments.length||1))*100,100)}%`,height:'100%',background:'#0d9488',borderRadius:3}}/></div>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--text)',minWidth:16,textAlign:'right'}}>{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarTab({appointments}:any){
  const [cur,setCur]=useState(new Date());
  const year=cur.getFullYear(),month=cur.getMonth();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const byDay:Record<number,any[]>={};
  appointments.forEach((a:any)=>{const d=new Date(a.slot?.date);if(d.getMonth()===month&&d.getFullYear()===year){const day=d.getDate();if(!byDay[day])byDay[day]=[];byDay[day].push(a);}});
  return(
    <div>
      <div style={{marginBottom:18}}><h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',margin:0}}>Calendar</h2></div>
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,padding:'20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <button onClick={()=>setCur(new Date(year,month-1,1))} style={{padding:'7px 14px',borderRadius:9,border:'1px solid var(--border)',background:'none',color:'var(--text)',cursor:'pointer',fontWeight:700}}>←</button>
          <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>{MONTHS[month]} {year}</div>
          <button onClick={()=>setCur(new Date(year,month+1,1))} style={{padding:'7px 14px',borderRadius:9,border:'1px solid var(--border)',background:'none',color:'var(--text)',cursor:'pointer',fontWeight:700}}>→</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:6}}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><div key={d} style={{textAlign:'center',fontSize:11,fontWeight:700,color:'var(--text2)',padding:'5px 0'}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const day=i+1,has=byDay[day];
            const isToday=new Date().getDate()===day&&new Date().getMonth()===month&&new Date().getFullYear()===year;
            return(
              <div key={day} style={{aspectRatio:'1',borderRadius:9,padding:3,background:isToday?'#6366f1':has?'rgba(99,102,241,.08)':'var(--bg)',border:`1px solid ${isToday?'#6366f1':has?'rgba(99,102,241,.3)':'var(--border)'}`,display:'flex',flexDirection:'column',alignItems:'center',cursor:has?'pointer':'default'}}>
                <span style={{fontSize:12,fontWeight:isToday||has?700:400,color:isToday?'#fff':has?'#6366f1':'var(--text2)'}}>{day}</span>
                {has&&!isToday&&<div style={{width:5,height:5,borderRadius:'50%',background:'#6366f1',marginTop:1}}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({user,profile,onRefresh}:any){
  const [form,setForm]=useState({licenseNumber:profile?.licenseNumber||'',specialization:profile?.specialization||'',clinicName:profile?.clinicName||'',bio:profile?.bio||'',yearsExperience:profile?.yearsExperience||'',consultationFee:profile?.consultationFee||''});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');
  async function save(){setSaving(true);setMsg('');try{await api.post('/vet/profile',form);setMsg('Saved!');onRefresh();}catch{setMsg('Failed.');}finally{setSaving(false);}}
  const inp:any={width:'100%',height:46,padding:'0 14px',border:'1px solid var(--border)',borderRadius:12,fontSize:14,outline:'none',background:'var(--input)',color:'var(--text)',boxSizing:'border-box',caretColor:'var(--text)'};
  const lbl:any={fontSize:11,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:5};
  return(
    <div style={{maxWidth:600}}>
      <div style={{marginBottom:18}}><h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',margin:0}}>Vet Profile</h2></div>
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,padding:'24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,padding:'14px',background:'rgba(13,148,136,.06)',borderRadius:14,border:'1px solid rgba(13,148,136,.15)'}}>
          <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#0d9488,#0f766e)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:22,fontWeight:900,color:'#fff'}}>{user?.name?.charAt(0)}</span></div>
          <div><div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>{user?.name}</div><div style={{fontSize:13,color:'var(--text2)'}}>{user?.email}</div><div style={{fontSize:12,color:'#0d9488',fontWeight:600,marginTop:3}}>{profile?.verificationStatus==='verified'?'✓ Verified':'⏳ Pending Verification'}</div></div>
        </div>
        {msg&&<div style={{padding:'10px 14px',background:msg==='Saved!'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',border:`1px solid ${msg==='Saved!'?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}`,borderRadius:10,fontSize:13,color:msg==='Saved!'?'#10b981':'#ef4444',marginBottom:14}}>{msg}</div>}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={lbl}>KVB License No.</label><input style={inp} value={form.licenseNumber} onChange={e=>setForm(p=>({...p,licenseNumber:e.target.value}))} placeholder="KVB/2021/1234"/></div>
            <div><label style={lbl}>Clinic Name</label><input style={inp} value={form.clinicName} onChange={e=>setForm(p=>({...p,clinicName:e.target.value}))} placeholder="Savanna Vet Clinic"/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={lbl}>Specialization</label><select style={{...inp}} value={form.specialization} onChange={e=>setForm(p=>({...p,specialization:e.target.value}))}><option value="">Select</option>{['Large Animals','Small Animals','Poultry','Mixed Practice','Wildlife'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div><label style={lbl}>Years Experience</label><input style={inp} type="number" value={form.yearsExperience} onChange={e=>setForm(p=>({...p,yearsExperience:e.target.value}))} placeholder="5"/></div>
          </div>
          <div><label style={lbl}>Consultation Fee (KSh)</label><input style={inp} type="number" value={form.consultationFee} onChange={e=>setForm(p=>({...p,consultationFee:e.target.value}))} placeholder="2000"/></div>
          <div><label style={lbl}>Bio</label><textarea value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} rows={3} placeholder="Tell farmers about your expertise..." style={{...inp,height:'auto',padding:'10px 14px',resize:'vertical' as const}}/></div>
          <button onClick={save} disabled={saving} style={{height:46,background:saving?'rgba(13,148,136,.4)':'linear-gradient(135deg,#0d9488,#0f766e)',color:'#fff',border:'none',borderRadius:11,fontWeight:700,fontSize:14,cursor:saving?'not-allowed':'pointer'}}>{saving?'Saving...':'Save Profile'}</button>
        </div>
      </div>
    </div>
  );
}

function ReviewsTab({profile}:any){
  const [reviews,setReviews]=useState<any[]>([]);
  useEffect(()=>{if(profile?.id)api.get(`/vet-reviews/vet/${profile.id}`).then(r=>setReviews(r.data.reviews||[])).catch(()=>{});},[profile]);
  return(
    <div>
      <div style={{marginBottom:18}}><h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',margin:0}}>Reviews</h2><p style={{fontSize:12,color:'var(--text2)',margin:'3px 0 0'}}>{reviews.length} received</p></div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {reviews.length===0
          ?<div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18}}><EmptyState icon={Star} title="No reviews yet" sub="Reviews from farmers will appear here." color="#f59e0b"/></div>
          :reviews.map((r:any)=>(
            <div key={r.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18,padding:'18px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div style={{fontWeight:700,color:'var(--text)'}}>{r.farmer?.name}</div>
                <div style={{display:'flex',gap:2}}>{Array.from({length:5}).map((_,i)=><Star key={i} size={13} color="#f59e0b" fill={i<r.rating?'#f59e0b':'none'}/>)}</div>
              </div>
              {r.comment&&<div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>{r.comment}</div>}
              <div style={{fontSize:11,color:'var(--text2)',marginTop:8}}>{new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function MedicalRecordTab({appointments,endpoint,dataKey,title,icon:Icon,color,fields,renderSummary,renderActions,isMobile}:any){
  const animals=appointments.filter((a:any)=>a.animalId).reduce((acc:any[],a:any)=>{if(!acc.find((x:any)=>x.animalId===a.animalId))acc.push(a);return acc;},[]);
  const [records,setRecords]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [form,setForm]=useState<any>({animalId:''});

  const load=async()=>{
    setLoading(true);
    try{ const r=await api.get(`/${endpoint}/mine`); setRecords(r.data[dataKey]||[]); }
    catch{ setRecords([]); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  function selectAnimal(animalId:string){
    const picked=animals.find((a:any)=>String(a.animalId)===animalId);
    setForm((p:any)=>({...p,animalId,farmerId:picked?.farmer?.id||'',appointmentId:picked?.id||''}));
  }

  async function submit(){
    if(!form.animalId||!form.farmerId){ setError('Please select an animal.'); return; }
    for(const f of fields){ if(f.required && !form[f.key]){ setError(`${f.label} is required.`); return; } }
    setSaving(true); setError('');
    try{
      await api.post(`/${endpoint}`, form);
      setForm({animalId:''}); setShowForm(false); load();
    }catch(err:any){ setError(err?.response?.data?.error||'Failed to save.'); }
    finally{ setSaving(false); }
  }

  const inp:any={width:'100%',height:42,padding:'0 12px',border:'1px solid var(--border)',borderRadius:10,fontSize:13,outline:'none',background:'var(--input)',color:'var(--text)',boxSizing:'border-box'};
  const lbl:any={fontSize:11,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:5};

  return(
    <div>
      <div style={{display:'flex',flexDirection:isMobile?'column':'row',alignItems:isMobile?'stretch':'center',gap:isMobile?12:0,justifyContent:'space-between',marginBottom:18}}>
        <div>
          <h2 style={{fontSize:isMobile?18:20,fontWeight:800,color:'var(--text)',margin:0}}>{title}</h2>
          <p style={{fontSize:12,color:'var(--text2)',margin:'3px 0 0'}}>{records.length} recorded</p>
        </div>
        <button onClick={()=>setShowForm(p=>!p)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 18px',background:`linear-gradient(135deg,${color},${color}cc)`,color:'#fff',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:13,width:isMobile?'100%':'auto'}}>
          <Plus size={14}/> {showForm?'Cancel':'Log New'}
        </button>
      </div>

      {showForm && (
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:'20px',marginBottom:18}}>
          {error && <div style={{padding:'9px 12px',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,color:'#ef4444',fontSize:12,marginBottom:12}}>{error}</div>}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <label style={lbl}>Animal *</label>
              <select style={inp} value={form.animalId} onChange={e=>selectAnimal(e.target.value)}>
                <option value="">Select animal</option>
                {animals.map((a:any)=>(<option key={a.animalId} value={a.animalId}>Animal #{a.animalId} — {a.farmer?.name}</option>))}
              </select>
            </div>
            {fields.map((f:any)=>(
              <div key={f.key}>
                <label style={lbl}>{f.label}{f.required?' *':''}</label>
                {f.type==='textarea'
                  ? <textarea style={{...inp,height:'auto',padding:'10px 12px',resize:'vertical' as const}} rows={2} value={form[f.key]||''} onChange={e=>setForm((p:any)=>({...p,[f.key]:e.target.value}))}/>
                  : f.type==='select'
                  ? <select style={inp} value={form[f.key]||''} onChange={e=>setForm((p:any)=>({...p,[f.key]:e.target.value}))}>
                      <option value="">Select</option>
                      {f.options.map((o:string)=>(<option key={o} value={o}>{o}</option>))}
                    </select>
                  : <input style={inp} type={f.type||'text'} value={form[f.key]||''} onChange={e=>setForm((p:any)=>({...p,[f.key]:e.target.value}))}/>
                }
              </div>
            ))}
          </div>
          <button onClick={submit} disabled={saving} style={{padding:'10px 20px',borderRadius:10,background:color,color:'#fff',border:'none',fontWeight:700,fontSize:13,cursor:saving?'not-allowed':'pointer',width:isMobile?'100%':'auto'}}>
            {saving?'Saving...':'Save Record'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{padding:40,textAlign:'center',color:'var(--text2)'}}>Loading...</div>
      ) : records.length===0 ? (
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:18}}>
          <EmptyState icon={Icon} title={`No ${title.toLowerCase()} yet`} sub="Records will appear here once logged." color={color}/>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {records.map((r:any)=>(
            <div key={r.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:isMobile?'14px':'16px 18px'}}>
              {renderSummary(r)}
              {renderActions&&renderActions(r,load)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TreatmentsTab({appointments,isMobile}:any){
  return <MedicalRecordTab appointments={appointments} isMobile={isMobile} endpoint="vet-treatments" dataKey="treatments" title="Treatments" icon={Stethoscope} color="#0d9488"
    fields={[
      {key:'diagnosis',label:'Diagnosis',type:'textarea',required:true},
      {key:'treatmentGiven',label:'Treatment Given',type:'textarea',required:true},
      {key:'medication',label:'Medication',type:'text'},
      {key:'followUpDate',label:'Follow-up Date',type:'date'},
    ]}
    renderSummary={(r:any)=>(
      <div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontWeight:700,color:'var(--text)',fontSize:13}}>{r.animal?.name||`Animal #${r.animalId}`} · {r.farmer?.name}</span>
          <span style={{fontSize:11,color:'var(--text2)'}}>{new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
        <div style={{fontSize:12,color:'var(--text2)'}}>{r.diagnosis}</div>
        {r.followUpDate && <div style={{fontSize:11,color:'#f59e0b',marginTop:4}}>Follow-up: {new Date(r.followUpDate).toLocaleDateString()}</div>}
      </div>
    )}/>;
}

function VaccinationsTab({appointments,isMobile}:any){
  return <MedicalRecordTab appointments={appointments} isMobile={isMobile} endpoint="vet-vaccinations" dataKey="vaccinations" title="Vaccinations" icon={Syringe} color="#3b82f6"
    fields={[
      {key:'vaccineName',label:'Vaccine Name',type:'text',required:true},
      {key:'doseNumber',label:'Dose Number',type:'number'},
      {key:'dateAdministered',label:'Date Administered',type:'date',required:true},
      {key:'nextDueDate',label:'Next Due Date',type:'date'},
      {key:'batchNumber',label:'Batch Number',type:'text'},
    ]}
    renderSummary={(r:any)=>(
      <div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontWeight:700,color:'var(--text)',fontSize:13}}>{r.animal?.name||`Animal #${r.animalId}`} · {r.vaccineName}</span>
          <span style={{fontSize:11,color:'var(--text2)'}}>{new Date(r.dateAdministered).toLocaleDateString()}</span>
        </div>
        {r.nextDueDate && <div style={{fontSize:11,color:'#f59e0b'}}>Next due: {new Date(r.nextDueDate).toLocaleDateString()}</div>}
      </div>
    )}/>;
}

function PrescriptionsTab({appointments,isMobile}:any){
  return <MedicalRecordTab appointments={appointments} isMobile={isMobile} endpoint="vet-prescriptions" dataKey="prescriptions" title="Prescriptions" icon={Pill} color="#8b5cf6"
    fields={[
      {key:'medicationName',label:'Medication',type:'text',required:true},
      {key:'dosage',label:'Dosage',type:'text',required:true},
      {key:'frequency',label:'Frequency',type:'text',required:true},
      {key:'durationDays',label:'Duration (days)',type:'number'},
      {key:'instructions',label:'Instructions',type:'textarea'},
    ]}
    renderSummary={(r:any)=>(
      <div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontWeight:700,color:'var(--text)',fontSize:13}}>{r.animal?.name||`Animal #${r.animalId}`} · {r.medicationName}</span>
          <span style={{fontSize:11,color:'var(--text2)'}}>{new Date(r.issuedDate).toLocaleDateString()}</span>
        </div>
        <div style={{fontSize:12,color:'var(--text2)'}}>{r.dosage} · {r.frequency}</div>
      </div>
    )}/>;
}

function CertificatesTab({appointments,isMobile}:any){
  return <MedicalRecordTab appointments={appointments} isMobile={isMobile} endpoint="vet-certificates" dataKey="certificates" title="Health Certificates" icon={ShieldCheck} color="#10b981"
    fields={[
      {key:'certificateType',label:'Certificate Type',type:'select',required:true,options:['health','movement','export','vaccination']},
      {key:'expiryDate',label:'Expiry Date',type:'date'},
    ]}
    renderSummary={(r:any)=>(
      <div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontWeight:700,color:'var(--text)',fontSize:13}}>{r.animal?.name||`Animal #${r.animalId}`} · {r.certificateType}</span>
          <span style={{fontSize:11,color:'var(--text2)'}}>{new Date(r.issueDate).toLocaleDateString()}</span>
        </div>
        <div style={{fontSize:11,color:'var(--text2)'}}>#{r.certificateNumber}</div>
      </div>
    )}/>;
}

function LabResultEditor({record,onSaved}:any){
  const [open,setOpen]=useState(false);
  const [results,setResults]=useState(record.results||'');
  const [resultDate,setResultDate]=useState(record.resultDate?String(record.resultDate).slice(0,10):'');
  const [saving,setSaving]=useState(false);
  async function save(){
    setSaving(true);
    try{ await api.patch(`/vet-labtests/${record.id}/results`,{results,resultDate}); setOpen(false); onSaved(); }
    catch{} finally{ setSaving(false); }
  }
  const inp:any={width:'100%',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:8,fontSize:12,background:'var(--input)',color:'var(--text)',boxSizing:'border-box' as const};
  return(
    <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)'}}>
      {!open ? (
        <button onClick={()=>setOpen(true)} style={{fontSize:11,fontWeight:700,color:'#ec4899',background:'none',border:'none',cursor:'pointer',padding:0}}>
          {record.results?'Edit Results':'Add Results'}
        </button>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <textarea style={{...inp,height:'auto',padding:'8px 10px',resize:'vertical' as const}} rows={2} value={results} onChange={e=>setResults(e.target.value)} placeholder="Test results..."/>
          <input style={inp} type="date" value={resultDate} onChange={e=>setResultDate(e.target.value)}/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={save} disabled={saving} style={{padding:'6px 14px',borderRadius:8,background:'#ec4899',color:'#fff',border:'none',fontWeight:700,fontSize:12,cursor:saving?'not-allowed':'pointer'}}>{saving?'Saving...':'Save'}</button>
            <button onClick={()=>setOpen(false)} style={{padding:'6px 14px',borderRadius:8,background:'none',border:'1px solid var(--border)',color:'var(--text2)',fontWeight:600,fontSize:12,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LabTestsTab({appointments,isMobile}:any){
  return <MedicalRecordTab appointments={appointments} isMobile={isMobile} endpoint="vet-labtests" dataKey="labTests" title="Lab Tests" icon={FlaskConical} color="#ec4899"
    fields={[
      {key:'testType',label:'Test Type',type:'text',required:true},
      {key:'sampleDate',label:'Sample Date',type:'date',required:true},
      {key:'resultDate',label:'Result Date',type:'date'},
      {key:'results',label:'Results',type:'textarea'},
    ]}
    renderSummary={(r:any)=>(
      <div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontWeight:700,color:'var(--text)',fontSize:13}}>{r.animal?.name||`Animal #${r.animalId}`} · {r.testType}</span>
          <span style={{fontSize:11,color:'var(--text2)'}}>{new Date(r.sampleDate).toLocaleDateString()}</span>
        </div>
        {r.results ? <div style={{fontSize:12,color:'var(--text2)'}}>{r.results}</div> : <div style={{fontSize:11,color:'#f59e0b'}}>Awaiting results</div>}
      </div>
    )}
    renderActions={(r:any,onRefresh:any)=><LabResultEditor record={r} onSaved={onRefresh}/>}
    />;
}

function SettingsTab({user,isDark,toggleDark}:any){
  return(
    <div style={{maxWidth:520}}>
      <div style={{marginBottom:18}}><h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',margin:0}}>Settings</h2></div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {[
          {label:'Dark Mode',sub:'Toggle dark/light theme',action:<button onClick={toggleDark} style={{padding:'7px 18px',borderRadius:9,border:'1px solid var(--border)',background:isDark?'#0d9488':'var(--bg)',color:isDark?'#fff':'var(--text)',cursor:'pointer',fontWeight:700,fontSize:13}}>{isDark?'On':'Off'}</button>},
          {label:'Account Email',sub:user?.email,action:null},
          {label:'Change Password',sub:'Update your login password',action:<button style={{padding:'7px 18px',borderRadius:9,border:'1px solid var(--border)',background:'none',color:'var(--text)',cursor:'pointer',fontWeight:600,fontSize:13}}>Change</button>},
          {label:'Availability Slots',sub:'Manage appointment slots',action:<button style={{padding:'7px 18px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#0d9488,#0f766e)',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:13}}>Manage</button>},
        ].map(({label,sub,action})=>(
          <div key={label} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14}}>
            <div><div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{label}</div><div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{sub}</div></div>
            {action}
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({id}:{id:string}){
  const nav=NAV.find(n=>n.id===id);
  const Icon=nav?.icon||Stethoscope;
  const color=ACCENT[id]||'#64748b';
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:380,gap:14}}>
      <div style={{width:68,height:68,borderRadius:20,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={30} color={color}/></div>
      <h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',margin:0}}>{nav?.label}</h2>
      <p style={{fontSize:13,color:'var(--text2)',margin:0}}>This module is coming soon.</p>
      <div style={{padding:'7px 18px',borderRadius:20,background:`${color}18`,color,fontSize:12,fontWeight:700}}>In Development</div>
    </div>
  );
}

export default function VetDashboard(){
  const navigate=useNavigate();
  const {user,logout}=useAuth();
  const [tab,setTab]=useState('dashboard');
  const [collapsed,setCollapsed]=useState(false);
  const [isDark,setIsDark]=useState(true);
  const [appointments,setAppointments]=useState<any[]>([]);
  const [emergency,setEmergency]=useState<any[]>([]);
  const [profile,setProfile]=useState<any>(null);
  const [search,setSearch]=useState('');
  const [notifOpen,setNotifOpen]=useState(false);
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  const [drawerOpen,setDrawerOpen]=useState(false);

  useEffect(()=>{
    const h=()=>{setIsMobile(window.innerWidth<768);if(window.innerWidth>=768)setDrawerOpen(false);};
    window.addEventListener('resize',h);
    return()=>window.removeEventListener('resize',h);
  },[]);

  const load=async()=>{
    try{
      const [a,e,p]=await Promise.all([
        api.get('/vet/appointments/mine'),
        api.get('/vet/emergency/mine'),
        api.get('/vet/profile/me').catch(()=>({data:{profile:null}})),
      ]);
      setAppointments(a.data.appointments||[]);
      setEmergency(e.data.alerts||[]);
      setProfile(p.data.profile||null);
    }catch{}
  };
  useEffect(()=>{load();},[]);

  const T=isDark?DARK:LIGHT;
  const openEm=emergency.filter(e=>e.status==='open').length;
  const sidebarWidth=isMobile?240:collapsed?68:240;

  const css=`
    :root{--bg:${T.bg};--card:${T.card};--border:${T.border};--text:${T.text};--text2:${T.text2};--input:${T.input};}
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-thumb{background:rgba(128,128,128,.3);border-radius:4px;}
    input::placeholder,textarea::placeholder{color:var(--text2);}
    select option{background:${isDark?'#0a1628':'#fff'};color:${T.text};}
    .vet-nav-btn{background:transparent!important;}
    .vet-nav-btn:hover{background:rgba(255,255,255,.06)!important;}
    .vet-nav-btn.active{background:var(--nav-active)!important;}
    button{-webkit-appearance:none;}
  `;

  function renderContent(){
    switch(tab){
      case 'dashboard':    return <DashboardTab user={user} appointments={appointments} emergency={emergency} profile={profile} isMobile={isMobile}/>;
      case 'appointments': return <AppointmentsTab appointments={appointments} onRefresh={load} isMobile={isMobile} T={T}/>;
      case 'emergency':    return <EmergencyTab emergency={emergency} onRefresh={load}/>;
      case 'animals':      return <AnimalsTab appointments={appointments}/>;
      case 'reports':      return <ReportsTab appointments={appointments} emergency={emergency}/>;
      case 'calendar':     return <CalendarTab appointments={appointments}/>;
      case 'reviews':      return <ReviewsTab profile={profile}/>;
      case 'profile':      return <ProfileTab user={user} profile={profile} onRefresh={load}/>;
      case 'messages':     navigate('/vet-messages'); return null;
      case 'treatments':    return <TreatmentsTab appointments={appointments} isMobile={isMobile}/>;
      case 'vaccinations':  return <VaccinationsTab appointments={appointments} isMobile={isMobile}/>;
      case 'prescriptions': return <PrescriptionsTab appointments={appointments} isMobile={isMobile}/>;
      case 'certificates':  return <CertificatesTab appointments={appointments} isMobile={isMobile}/>;
      case 'labtests':      return <LabTestsTab appointments={appointments} isMobile={isMobile}/>;
      case 'settings':     return <SettingsTab user={user} isDark={isDark} toggleDark={()=>setIsDark(p=>!p)}/>;
      default:             return <ComingSoon id={tab}/>;
    }
  }

  const Sidebar=(
    <div style={{width:sidebarWidth,background:T.sidebar,display:'flex',flexDirection:'column',height:'100%',transition:'width .2s',overflow:'hidden',position:'relative'}}>
      {/* Logo */}
      <div style={{height:60,padding:'0 14px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid rgba(255,255,255,.08)',flexShrink:0}}>
        <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#0d9488,#0f766e)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <img src="/agripulse-logo.png" alt="" style={{height:22,objectFit:'contain'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        </div>
        {(!collapsed||isMobile)&&<div style={{overflow:'hidden'}}><div style={{fontWeight:900,fontSize:14,color:'#fff',whiteSpace:'nowrap'}}>AgriPulse</div><div style={{fontSize:9,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.8px'}}>Veterinary</div></div>}
        {!isMobile&&<button onClick={()=>setCollapsed(p=>!p)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.4)',padding:4,flexShrink:0,display:'flex'}}>{collapsed?<Menu size={15}/>:<X size={15}/>}</button>}
        {isMobile&&<button onClick={()=>setDrawerOpen(false)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.4)',padding:4,flexShrink:0,display:'flex'}}><X size={15}/></button>}
      </div>
      {/* Search */}
      {(!collapsed||isMobile)&&(
        <div style={{padding:'10px 10px 4px'}}>
          <div style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',background:'rgba(255,255,255,.06)',borderRadius:9,border:'1px solid rgba(255,255,255,.08)'}}>
            <Search size={12} color="rgba(255,255,255,.3)"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{background:'none',border:'none',outline:'none',fontSize:12,color:'#fff',width:'100%',caretColor:'#fff'}}/>
          </div>
        </div>
      )}
      {/* Nav */}
      <div style={{flex:1,overflowY:'auto',padding:'6px'}}>
        {NAV.filter(n=>!search||n.label.toLowerCase().includes(search.toLowerCase())).map(({id,label,icon:Icon})=>{
          const active=tab===id,color=ACCENT[id];
          return(
            <button key={id} onClick={()=>{setTab(id);setSearch('');if(isMobile)setDrawerOpen(false);}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:9,padding:collapsed&&!isMobile?'9px':'9px 11px',borderRadius:11,background:active?`${color}20`:'transparent',border:`1px solid ${active?`${color}30`:'transparent'}`,cursor:'pointer',marginBottom:2,justifyContent:collapsed&&!isMobile?'center':'flex-start',position:'relative',outline:'none'}} onMouseEnter={e=>{if(!active)(e.currentTarget as HTMLButtonElement).style.background=`rgba(255,255,255,.06)`;}} onMouseLeave={e=>{if(!active)(e.currentTarget as HTMLButtonElement).style.background='transparent';}}>'
              <Icon size={16} color={active?color:'rgba(255,255,255,.45)'} style={{flexShrink:0}}/>
              {(!collapsed||isMobile)&&<span style={{fontSize:12,fontWeight:active?700:400,color:active?color:'rgba(255,255,255,.6)',whiteSpace:'nowrap',flex:1,textAlign:'left'}}>{label}</span>}
              {(!collapsed||isMobile)&&id==='emergency'&&openEm>0&&<span style={{fontSize:9,fontWeight:800,background:'#ef4444',color:'#fff',borderRadius:10,padding:'1px 5px',minWidth:16,textAlign:'center'}}>{openEm}</span>}
              {collapsed&&!isMobile&&active&&<div style={{position:'absolute',left:0,top:'25%',bottom:'25%',width:3,background:color,borderRadius:'0 3px 3px 0'}}/>}
            </button>
          );
        })}
      </div>
      {/* User */}
      <div style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,.08)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:9,padding:'9px',borderRadius:11,background:'rgba(255,255,255,.05)'}}>
          <div style={{width:30,height:30,borderRadius:9,background:'linear-gradient(135deg,#0d9488,#0f766e)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:12,fontWeight:800,color:'#fff'}}>{user?.name?.charAt(0)}</span></div>
          {(!collapsed||isMobile)&&<><div style={{flex:1,overflow:'hidden'}}><div style={{fontSize:11,fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.name}</div><div style={{fontSize:9,color:'#0d9488',fontWeight:600}}>● Online</div></div><button onClick={()=>logout('vet')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.4)',padding:3}}><LogOut size={13}/></button></>}
        </div>
      </div>
    </div>
  );

  return(
    <>
      <style>{css}</style>
      <div style={{display:'flex',height:'100vh',overflow:'hidden',background:T.bg}}>
        {/* Mobile overlay */}
        {isMobile&&drawerOpen&&<div onClick={()=>setDrawerOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:40}}/>}
        {/* Sidebar — desktop fixed, mobile drawer */}
        {isMobile?(
          <div style={{position:'fixed',top:0,left:drawerOpen?0:-240,width:240,height:'100vh',zIndex:50,transition:'left .25s',boxShadow:drawerOpen?'4px 0 32px rgba(0,0,0,.5)':'none'}}>
            {Sidebar}
          </div>
        ):(
          <div style={{width:collapsed?68:240,flexShrink:0,transition:'width .2s'}}>
            {Sidebar}
          </div>
        )}
        {/* Main */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
          {/* Topbar */}
          <div style={{height:60,background:T.card,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 16px',gap:10,flexShrink:0}}>
            {isMobile&&<button onClick={()=>setDrawerOpen(p=>!p)} style={{width:36,height:36,borderRadius:9,border:`1px solid ${T.border}`,background:'none',cursor:'pointer',color:T.text2,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Menu size={17}/></button>}
            {!isMobile&&<div style={{display:'flex',alignItems:'center',gap:7,padding:'7px 14px',background:T.input,borderRadius:11,border:`1px solid ${T.border}`,flex:1,maxWidth:320}}>
              <Search size={14} color={T.text2}/>
              <input placeholder="Search Dashboard..." style={{background:'none',border:'none',outline:'none',fontSize:13,color:T.text,width:'100%',caretColor:T.text}}/>
            </div>}
            {isMobile&&<div style={{fontWeight:700,fontSize:14,color:T.text,flex:1}}>{NAV.find(n=>n.id===tab)?.label}</div>}
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>setIsDark(p=>!p)} style={{width:36,height:36,borderRadius:9,border:`1px solid ${T.border}`,background:'none',cursor:'pointer',color:T.text2,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {isDark?<Sun size={15}/>:<Moon size={15}/>}
              </button>
              <div style={{position:'relative'}}>
                <button onClick={()=>setNotifOpen(p=>!p)} style={{width:36,height:36,borderRadius:9,border:`1px solid ${T.border}`,background:'none',cursor:'pointer',color:T.text2,display:'flex',alignItems:'center',justifyContent:'center'}}><Bell size={15}/></button>
                {openEm>0&&<span style={{position:'absolute',top:-4,right:-4,width:15,height:15,borderRadius:'50%',background:'#ef4444',color:'#fff',fontSize:8,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{openEm}</span>}
                {notifOpen&&(
                  <div style={{position:'absolute',top:44,right:0,width:260,background:T.card,border:`1px solid ${T.border}`,borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.2)',zIndex:100,overflow:'hidden'}}>
                    <div style={{padding:'12px 14px',borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13,color:T.text}}>Notifications</div>
                    {openEm===0
                      ?<div style={{padding:'18px',textAlign:'center',fontSize:12,color:T.text2}}>No new notifications</div>
                      :emergency.filter(e=>e.status==='open').map(e=>(
                        <div key={e.id} onClick={()=>{setTab('emergency');setNotifOpen(false);if(isMobile)setDrawerOpen(false);}} style={{padding:'11px 14px',borderBottom:`1px solid ${T.border}`,cursor:'pointer',display:'flex',gap:9}}>
                          <AlertTriangle size={13} color="#ef4444" style={{flexShrink:0,marginTop:2}}/>
                          <div><div style={{fontSize:12,fontWeight:600,color:T.text}}>{e.farmer?.name}</div><div style={{fontSize:11,color:T.text2}}>{e.message?.slice(0,45)}...</div></div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
              {!isMobile&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',borderRadius:11,border:`1px solid ${T.border}`,background:T.card}}>
                <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#0d9488,#0f766e)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:11,fontWeight:800,color:'#fff'}}>{user?.name?.charAt(0)}</span></div>
                <div><div style={{fontSize:11,fontWeight:700,color:T.text,whiteSpace:'nowrap'}}>{user?.name}</div><div style={{fontSize:9,color:'#0d9488',fontWeight:600}}>● Vet</div></div>
              </div>}
            </div>
          </div>
          {/* Content */}
          <div style={{flex:1,overflowY:'auto',padding:isMobile?'14px':'22px'}} onClick={()=>{notifOpen&&setNotifOpen(false);}}>
            {renderContent()}
          </div>
          {/* Mobile bottom nav */}
          {isMobile&&(()=>{
            const NAV_ITEMS=[
              {id:'dashboard',icon:LayoutDashboard},
              {id:'appointments',icon:Calendar},
              {id:'emergency',icon:AlertTriangle},
              {id:'profile',icon:User},
              {id:'settings',icon:Settings},
            ];
            const activeIdx=NAV_ITEMS.findIndex(n=>n.id===tab);
            const idx=activeIdx===-1?0:activeIdx;
            const activeColor=ACCENT[NAV_ITEMS[idx].id];
            return(
              <div style={{height:64,background:T.card,borderTop:`1px solid ${T.border}`,flexShrink:0,paddingBottom:'env(safe-area-inset-bottom)',position:'relative'}}>
                <div style={{position:'relative',display:'flex',height:'100%'}}>
                  {/* Sliding frosted glass bubble */}
                  <div style={{
                    position:'absolute',top:'50%',left:`calc(${(idx/NAV_ITEMS.length)*100}% + ${100/NAV_ITEMS.length/2}%)`,
                    transform:'translate(-50%,-50%)',width:44,height:44,borderRadius:16,
                    background:`${activeColor}18`,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
                    border:`1px solid ${activeColor}30`,boxShadow:`0 4px 16px ${activeColor}25, inset 0 1px 0 rgba(255,255,255,.15)`,
                    transition:'left .35s cubic-bezier(.34,1.56,.64,1), background .3s, border-color .3s, box-shadow .3s',
                    pointerEvents:'none',
                  }}/>
                  {NAV_ITEMS.map(({id,icon:Icon})=>{
                    const active=tab===id,color=ACCENT[id];
                    return(
                      <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,background:'none',border:'none',cursor:'pointer',position:'relative',transition:'transform .25s',transform:active?'scale(1.08)':'scale(1)'}}>
                        <Icon size={20} color={active?color:T.text2} style={{transition:'color .25s'}}/>
                        {id==='emergency'&&openEm>0&&<span style={{position:'absolute',top:8,right:'28%',width:14,height:14,borderRadius:'50%',background:'#ef4444',color:'#fff',fontSize:8,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{openEm}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
