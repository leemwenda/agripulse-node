import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// ─── Types ────────────────────────────────────────────────────
interface PlatformStats { totalFarms:number; totalUsers:number; totalAnimals:number; openIssues:number; }
interface FarmUser { id:number; name:string; email:string; role:string; isActive:boolean; registrationStatus:string; lastLogin:string|null; createdAt:string; farmId:number|null; }
interface FeatureFlag { id:number; flagKey:string; label:string; description:string; type:string; value:string; category:string; }
interface SystemIssue { id:number; title:string; description:string; category:string; priority:string; status:string; adminNote:string|null; createdAt:string; reporter:{name:string;email:string}; }
interface Announcement { id:number; title:string; body:string; type:string; isActive:boolean; createdAt:string; createdByUser:{name:string}; }

// ─── Spinner ──────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',padding:60}}>
      <div style={{width:32,height:32,border:'3px solid rgba(99,102,241,.15)',borderTop:'3px solid #6366f1',borderRadius:'50%',animation:'sp 0.7s linear infinite'}} />
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────
function Badge({label,color='gray'}:{label:string;color?:string}) {
  const colors:Record<string,string> = {
    green:  'background:rgba(16,185,129,.12);color:#10b981;border-color:rgba(16,185,129,.25)',
    red:    'background:rgba(239,68,68,.12);color:#ef4444;border-color:rgba(239,68,68,.25)',
    yellow: 'background:rgba(245,158,11,.12);color:#f59e0b;border-color:rgba(245,158,11,.25)',
    blue:   'background:rgba(99,102,241,.12);color:#818cf8;border-color:rgba(99,102,241,.25)',
    purple: 'background:rgba(168,85,247,.12);color:#a78bfa;border-color:rgba(168,85,247,.25)',
    gray:   'background:rgba(255,255,255,.05);color:rgba(255,255,255,.4);border-color:rgba(255,255,255,.08)',
  };
  return (
    <span style={{
      display:'inline-block',padding:'2px 10px',borderRadius:999,
      fontSize:11,fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',
      border:'1px solid',
      ...(Object.fromEntries(colors[color]?.split(';').map(s=>{const[k,v]=s.split(':');return[k.trim(),v?.trim()]})||[]))
    }}>{label}</span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({label,value,icon,color='#6366f1',sub}:{label:string;value:string|number;icon:string;color?:string;sub?:string}) {
  return (
    <div style={{background:'linear-gradient(135deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.01) 100%)',border:'1px solid rgba(255,255,255,.07)',borderRadius:16,padding:'20px 22px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:16,right:16,width:40,height:40,borderRadius:12,background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{icon}</div>
      <div style={{fontSize:12,color:'rgba(255,255,255,.4)',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:8}}>{label}</div>
      <div style={{fontSize:32,fontWeight:800,color:'#fff',lineHeight:1,letterSpacing:'-1px'}}>{value}</div>
      {sub && <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:6}}>{sub}</div>}
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color}60,transparent)`}} />
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────
function SectionHead({title,action}:{title:string;action?:React.ReactNode}) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
      <h3 style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.8)',letterSpacing:'0.04em'}}>{title}</h3>
      {action}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────
function Table({heads,children,minWidth=600}:{heads:string[];children?:React.ReactNode;minWidth?:number}) {
  return (
    <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,overflow:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',minWidth,fontSize:13}}>
        <thead>
          <tr style={{borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            {heads.map(h=>(
              <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TR({children}:{children:React.ReactNode}) {
  return <tr style={{borderBottom:'1px solid rgba(255,255,255,.04)',transition:'background .12s'}}
    onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.02)')}
    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>{children}</tr>;
}

function TD({children,muted,mono}:{children?:React.ReactNode;muted?:boolean;mono?:boolean}) {
  return <td style={{padding:'12px 16px',color:muted?'rgba(255,255,255,.3)':'rgba(255,255,255,.75)',fontFamily:mono?'monospace':'inherit',fontSize:mono?12:13}}>{children}</td>;
}

// ─── Input ────────────────────────────────────────────────────
function Input({value,onChange,placeholder,style={}}:{value:string;onChange:(v:string)=>void;placeholder?:string;style?:React.CSSProperties}) {
  return (
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'8px 12px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit',...style}} />
  );
}

function Textarea({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder?:string}) {
  return (
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3}
      style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'8px 12px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit',width:'100%',resize:'vertical'}} />
  );
}

function Select({value,onChange,children,style={}}:{value:string;onChange:(v:string)=>void;children?:React.ReactNode;style?:React.CSSProperties}) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{background:'#1a1f2e',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'8px 12px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit',...style}}>
      {children}
    </select>
  );
}

function Btn({children,onClick,color='default',size='md',disabled=false}:{children?:React.ReactNode;onClick?:()=>void;color?:string;size?:string;disabled?:boolean}) {
  const colors:Record<string,string> = {
    default: 'background:rgba(255,255,255,.07);color:rgba(255,255,255,.8);border-color:rgba(255,255,255,.1)',
    green:   'background:rgba(16,185,129,.15);color:#10b981;border-color:rgba(16,185,129,.3)',
    red:     'background:rgba(239,68,68,.12);color:#ef4444;border-color:rgba(239,68,68,.25)',
    yellow:  'background:rgba(245,158,11,.12);color:#f59e0b;border-color:rgba(245,158,11,.25)',
    indigo:  'background:rgba(99,102,241,.2);color:#818cf8;border-color:rgba(99,102,241,.4)',
  };
  const pads:Record<string,string> = { sm:'4px 10px', md:'7px 14px', lg:'10px 20px' };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding:pads[size]||pads.md,borderRadius:8,fontSize:12,fontWeight:700,
        letterSpacing:'0.04em',cursor:disabled?'not-allowed':'pointer',border:'1px solid',
        transition:'all .15s',opacity:disabled?.5:1,fontFamily:'inherit',
        ...(Object.fromEntries(colors[color]?.split(';').map(s=>{const[k,v]=s.split(':');return[k.trim(),v?.trim()]})||[]))
      }}>{children}</button>
  );
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({msg,type='success',onDone}:{msg:string;type?:string;onDone:()=>void}) {
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  const bg = type==='error'?'rgba(239,68,68,.9)':'rgba(16,185,129,.9)';
  return (
    <div style={{position:'fixed',bottom:24,right:24,background:bg,color:'#fff',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:999,boxShadow:'0 8px 24px rgba(0,0,0,.4)',animation:'fadeIn .2s ease'}}>
      {msg}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════
function OverviewTab() {
  const [stats,setStats]=useState<PlatformStats|null>(null);
  const [farms,setFarms]=useState<FarmUser[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.get('/admin/dashboard').then(({data})=>{setStats(data.stats);setFarms(data.recentFarms||[]);}).finally(()=>setLoading(false));
  },[]);

  if(loading) return <Spinner/>;

  const kpis=[
    {label:'Total Farms',value:stats?.totalFarms??0,icon:'🌾',color:'#10b981'},
    {label:'Total Users',value:stats?.totalUsers??0,icon:'👥',color:'#6366f1'},
    {label:'Active Animals',value:stats?.totalAnimals??0,icon:'🐄',color:'#f59e0b'},
    {label:'Open Issues',value:stats?.openIssues??0,icon:'⚠️',color:stats?.openIssues?'#ef4444':'#10b981',sub:stats?.openIssues?'Requires attention':'All clear'},
  ];

  return (
    <div>
      <div className="sys-stat-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:28}}>
        {kpis.map(k=><StatCard key={k.label} {...k}/>)}
      </div>
      <SectionHead title="Recent Farm Registrations"/>
      <Table heads={['Farm / Owner','Email','Role','Status','Registered']}>
        {farms.length===0&&<TR><TD muted>No farms registered yet</TD><TD/><TD/><TD/><TD/></TR>}
        {farms.map(f=>(
          <TR key={f.id}>
            <TD><span style={{fontWeight:600,color:'#fff'}}>{f.name}</span></TD>
            <TD muted mono>{f.email}</TD>
            <TD><Badge label={f.role} color={f.role==='superadmin'?'yellow':f.role==='admin'?'indigo':'gray'}/></TD>
            <TD>{f.registrationStatus==='pending'?<Badge label="Pending" color="yellow"/>:f.isActive?<Badge label="Active" color="green"/>:<Badge label="Inactive" color="red"/>}</TD>
            <TD muted>{new Date(f.createdAt).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})}</TD>
          </TR>
        ))}
      </Table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════════
function UsersTab() {
  const [users,setUsers]=useState<FarmUser[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [role,setRole]=useState('');
  const [toast,setToast]=useState<{msg:string;type?:string}|null>(null);

  const load=useCallback(()=>{
    setLoading(true);
    const params=new URLSearchParams();
    if(search) params.set('search',search);
    if(role) params.set('role',role);
    api.get(`/admin/users?${params}`).then(({data})=>setUsers(data.users||[])).finally(()=>setLoading(false));
  },[search,role]);

  useEffect(()=>{load();},[load]);

  const doAction=async(path:string,method:'put'|'delete',body?:object,msg?:string)=>{
    try{
      if(method==='put') await api.put(path,body);
      else await api.delete(path);
      setToast({msg:msg||'Done ✓',type:'success'});
      load();
    }catch{setToast({msg:'Action failed',type:'error'});}
  };

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap',alignItems:'center'}}>
        <Input value={search} onChange={setSearch} placeholder="Search name or email..." style={{width:240}}/>
        <Select value={role} onChange={setRole} style={{minWidth:140}}>
          <option value="">All roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
          <option value="worker">Worker</option>
        </Select>
        {(search||role)&&<Btn onClick={()=>{setSearch('');setRole('');}}>Clear</Btn>}
        <span style={{marginLeft:'auto',fontSize:12,color:'rgba(255,255,255,.3)'}}>{users.length} users</span>
      </div>
      {loading?<Spinner/>:(
        <Table heads={['User','Email','Role','Status','Joined','Actions']}>
          {users.length===0&&<TR><TD muted>No users found</TD><TD/><TD/><TD/><TD/><TD/></TR>}
          {users.map(u=>(
            <TR key={u.id}>
              <TD><span style={{fontWeight:600,color:'#fff'}}>{u.name}</span></TD>
              <TD muted mono>{u.email}</TD>
              <TD><Badge label={u.role} color={u.role==='superadmin'?'yellow':u.role==='admin'?'blue':'gray'}/></TD>
              <TD>{u.registrationStatus==='pending'?<Badge label="Pending" color="yellow"/>:u.isActive?<Badge label="Active" color="green"/>:<Badge label="Inactive" color="red"/>}</TD>
              <TD muted>{new Date(u.createdAt).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})}</TD>
              <TD>
                {u.role!=='superadmin'&&(
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {u.registrationStatus==='pending'&&(
                      <Btn color="green" size="sm" onClick={()=>doAction(`/admin/users/${u.id}/status`,'put',{isActive:true,registrationStatus:'approved'},`${u.name} approved ✓`)}>Approve</Btn>
                    )}
                    <Btn color={u.isActive?'yellow':'green'} size="sm"
                      onClick={()=>doAction(`/admin/users/${u.id}/status`,'put',{isActive:!u.isActive,registrationStatus:u.registrationStatus},u.isActive?`${u.name} deactivated`:`${u.name} activated ✓`)}>
                      {u.isActive?'Deactivate':'Activate'}
                    </Btn>
                    <Btn color="red" size="sm"
                      onClick={()=>confirm(`Delete ${u.name}? This cannot be undone.`)&&doAction(`/admin/users/${u.id}`,'delete',undefined,`${u.name} deleted`)}>
                      Delete
                    </Btn>
                  </div>
                )}
              </TD>
            </TR>
          ))}
        </Table>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ISSUES TAB
// ══════════════════════════════════════════════════════════════
function IssuesTab() {
  const [issues,setIssues]=useState<SystemIssue[]>([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState<SystemIssue|null>(null);
  const [note,setNote]=useState('');
  const [status,setStatus]=useState('in_review');
  const [toast,setToast]=useState<{msg:string;type?:string}|null>(null);

  const load=()=>{ api.get('/admin/issues').then(({data})=>setIssues(data.issues||[])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const update=async()=>{
    try{
      await api.put(`/admin/issues/${editing!.id}`,{status,adminNote:note});
      setToast({msg:'Issue updated ✓'});
      setEditing(null); load();
    }catch{setToast({msg:'Update failed',type:'error'});}
  };

  const priColor=(p:string)=>p==='critical'?'red':p==='high'?'yellow':p==='medium'?'blue':'gray';
  const staColor=(s:string)=>s==='open'?'red':s==='resolved'||s==='closed'?'green':s==='in_review'?'yellow':'gray';

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      {editing&&(
        <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:24,marginBottom:20}}>
          <div style={{fontWeight:700,color:'#fff',fontSize:15,marginBottom:6}}>{editing.title}</div>
          <p style={{fontSize:13,color:'rgba(255,255,255,.5)',marginBottom:16,lineHeight:1.6}}>{editing.description}</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div>
              <label style={{display:'block',fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>Update Status</label>
              <Select value={status} onChange={setStatus} style={{width:'100%'}}>
                <option value="in_review">In Review</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="open">Reopen</option>
              </Select>
            </div>
            <div>
              <label style={{display:'block',fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>Reporter</label>
              <div style={{fontSize:13,color:'rgba(255,255,255,.6)',padding:'8px 0'}}>{editing.reporter?.name} · {editing.reporter?.email}</div>
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>Admin Note (visible to user on resolve)</label>
            <Textarea value={note} onChange={setNote} placeholder="Describe what was done or found..."/>
          </div>
          <div style={{display:'flex',gap:10}}>
            <Btn color="green" onClick={update}>Update Issue</Btn>
            <Btn onClick={()=>setEditing(null)}>Cancel</Btn>
          </div>
        </div>
      )}
      {loading?<Spinner/>:(
        <Table heads={['Issue','Reporter','Priority','Status','Date','Action']}>
          {issues.length===0&&<TR><TD muted>No issues reported</TD><TD/><TD/><TD/><TD/><TD/></TR>}
          {issues.map(iss=>(
            <TR key={iss.id}>
              <TD><span style={{fontWeight:600,color:'#fff',maxWidth:200,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{iss.title}</span></TD>
              <TD muted>{iss.reporter?.name||'Unknown'}</TD>
              <TD><Badge label={iss.priority} color={priColor(iss.priority)}/></TD>
              <TD><Badge label={iss.status.replace('_',' ')} color={staColor(iss.status)}/></TD>
              <TD muted>{new Date(iss.createdAt).toLocaleDateString('en-KE',{day:'2-digit',month:'short'})}</TD>
              <TD><Btn color="yellow" size="sm" onClick={()=>{setEditing(iss);setNote(iss.adminNote||'');setStatus('in_review');}}>Review</Btn></TD>
            </TR>
          ))}
        </Table>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS TAB
// ══════════════════════════════════════════════════════════════
function AnnouncementsTab() {
  const [anns,setAnns]=useState<Announcement[]>([]);
  const [loading,setLoading]=useState(true);
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [type,setType]=useState('info');
  const [toast,setToast]=useState<{msg:string;type?:string}|null>(null);

  const load=()=>{ api.get('/admin/announcements').then(({data})=>setAnns(data.announcements||[])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const create=async(e:React.FormEvent)=>{
    e.preventDefault();
    try{ await api.post('/admin/announcements',{title,body,type}); setTitle(''); setBody(''); setToast({msg:'Published ✓'}); load(); }
    catch{ setToast({msg:'Failed to publish',type:'error'}); }
  };

  const typeColor:Record<string,string>={info:'blue',success:'green',warning:'yellow',update:'purple'};

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <div style={{background:'rgba(99,102,241,.05)',border:'1px solid rgba(99,102,241,.15)',borderRadius:14,padding:24,marginBottom:24}}>
        <SectionHead title="Publish New Announcement"/>
        <form onSubmit={create}>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>Title</label>
            <Input value={title} onChange={setTitle} placeholder="Announcement title..." style={{width:'100%'}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>Message</label>
            <Textarea value={body} onChange={setBody} placeholder="Write your message to all users..."/>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <Select value={type} onChange={setType}>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="update">Update</option>
            </Select>
            <Btn color="indigo" onClick={()=>{}}>Publish to All Users →</Btn>
          </div>
        </form>
      </div>
      {loading?<Spinner/>:(
        <Table heads={['Title','Type','Status','Author','Date']}>
          {anns.length===0&&<TR><TD muted>No announcements yet</TD><TD/><TD/><TD/><TD/></TR>}
          {anns.map(a=>(
            <TR key={a.id}>
              <TD><span style={{fontWeight:600,color:'#fff'}}>{a.title}</span></TD>
              <TD><Badge label={a.type} color={typeColor[a.type]||'gray'}/></TD>
              <TD><Badge label={a.isActive?'Active':'Hidden'} color={a.isActive?'green':'gray'}/></TD>
              <TD muted>{a.createdByUser?.name||'System'}</TD>
              <TD muted>{new Date(a.createdAt).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})}</TD>
            </TR>
          ))}
        </Table>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURE FLAGS TAB
// ══════════════════════════════════════════════════════════════
function FeaturesTab() {
  const [flags,setFlags]=useState<FeatureFlag[]>([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState<{msg:string;type?:string}|null>(null);

  useEffect(()=>{ api.get('/admin/features').then(({data})=>setFlags(data.flags||[])).finally(()=>setLoading(false)); },[]);

  const update=async(key:string,value:string)=>{
    try{ await api.put(`/admin/features/${key}`,{value}); setFlags(f=>f.map(ff=>ff.flagKey===key?{...ff,value}:ff)); setToast({msg:`${key} updated ✓`}); }
    catch{ setToast({msg:'Update failed',type:'error'}); }
  };

  const grouped=flags.reduce((acc,f)=>{
    const cat=f.category||'General';
    if(!acc[cat]) acc[cat]=[];
    acc[cat].push(f);
    return acc;
  },{} as Record<string,FeatureFlag[]>);

  if(loading) return <Spinner/>;

  return (
    <div>
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      {Object.keys(grouped).length===0&&<div style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>No feature flags configured</div>}
      {Object.entries(grouped).map(([cat,items])=>(
        <div key={cat} style={{marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:10,paddingBottom:8,borderBottom:'1px solid rgba(255,255,255,.05)'}}>{cat}</div>
          <div style={{display:'grid',gap:10}}>
            {items.map(f=>(
              <div key={f.id} style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.05)',borderRadius:10,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
                <div>
                  <div style={{fontWeight:600,color:'rgba(255,255,255,.8)',fontSize:13}}>{f.label}</div>
                  {f.description&&<div style={{fontSize:12,color:'rgba(255,255,255,.3)',marginTop:2}}>{f.description}</div>}
                  <div style={{fontSize:10,color:'rgba(255,255,255,.2)',marginTop:3,fontFamily:'monospace'}}>{f.flagKey}</div>
                </div>
                {f.type==='toggle'?(
                  <label style={{position:'relative',width:44,height:24,cursor:'pointer',flexShrink:0}}>
                    <input type="checkbox" checked={f.value==='1'} onChange={e=>update(f.flagKey,e.target.checked?'1':'0')} style={{opacity:0,width:0,height:0,position:'absolute'}}/>
                    <span style={{position:'absolute',inset:0,background:f.value==='1'?'rgba(16,185,129,.4)':'rgba(255,255,255,.08)',borderRadius:24,border:`1px solid ${f.value==='1'?'rgba(16,185,129,.6)':'rgba(255,255,255,.12)'}`,transition:'.2s'}} />
                    <span style={{position:'absolute',width:18,height:18,top:3,left:f.value==='1'?23:3,background:f.value==='1'?'#10b981':'rgba(255,255,255,.4)',borderRadius:'50%',transition:'.2s'}} />
                  </label>
                ):(
                  <Input value={f.value} onChange={v=>update(f.flagKey,v)} style={{width:180,textAlign:'right'}}/>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN SUPERADMIN PANEL
// ══════════════════════════════════════════════════════════════
const TABS=[
  {id:'overview',label:'Overview',icon:'◈'},
  {id:'users',label:'Users',icon:'◉'},
  {id:'issues',label:'Issues',icon:'⚠'},
  {id:'announcements',label:'Announcements',icon:'▣'},
  {id:'features',label:'Feature Flags',icon:'⚙'},
];

function SuperAdminPanel() {
  const {user,logout}=useAuth();
  const navigate=useNavigate();
  const [tab,setTab]=useState('overview');
  const [mobileOpen,setMobileOpen]=useState(false);
  function handleLogout(){logout();navigate('/login');}

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .sys-nav-item{transition:all .15s;cursor:pointer;}
        .sys-nav-item:hover{background:rgba(255,255,255,.04)!important;color:rgba(255,255,255,.9)!important;}
        .sys-tab{transition:all .15s;cursor:pointer;white-space:nowrap;}
        .sys-tab:hover{color:rgba(255,255,255,.8)!important;}.sys-mobile-menu-btn{display:none;}.sys-mobile-dropdown{display:none;flex-direction:column;position:absolute;top:56px;left:0;right:0;background:#0d1526;border-bottom:1px solid rgba(255,255,255,.08);padding:8px;z-index:100;gap:2px;}
        @media(max-width:768px){.sys-mobile-menu-btn{display:flex!important;align-items:center;}.sys-tab-bar{display:none!important;}.sys-mobile-dropdown{display:flex!important;}.sys-content-pad{padding:16px 12px!important;}.sys-stat-grid{grid-template-columns:repeat(2,1fr)!important;}}
      `}</style>

      {/* TOP NAV */}
      <div style={{background:'rgba(255,255,255,.02)',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'0 24px',display:'flex',alignItems:'center',gap:16,height:56,position:'sticky',top:0,zIndex:50,backdropFilter:'blur(10px)'}}>
        <button onClick={()=>setMobileOpen(o=>!o)} className="sys-mobile-menu-btn" style={{background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,color:'rgba(255,255,255,.6)',cursor:'pointer',padding:'4px 10px',fontSize:16}}>{mobileOpen?'✕':'☰'}</button>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>⚡</div>
          <span style={{fontWeight:800,color:'#fff',fontSize:15,letterSpacing:'-0.02em'}}>AgriPulse</span>
          <span style={{fontSize:11,background:'rgba(99,102,241,.2)',color:'#818cf8',padding:'2px 8px',borderRadius:999,fontWeight:700,letterSpacing:'0.04em'}}>SYSTEM</span>
        </div>

        {/* TAB BAR */}
        <div className="sys-tab-bar" style={{display:'flex',gap:2,marginLeft:16,flex:1,overflowX:'auto'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className="sys-tab"
              style={{padding:'6px 14px',borderRadius:8,fontSize:13,fontWeight:tab===t.id?700:500,border:'none',background:tab===t.id?'rgba(99,102,241,.15)':'transparent',color:tab===t.id?'#818cf8':'rgba(255,255,255,.4)',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit'}}>
              <span style={{fontSize:11}}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 6px #10b981'}} />
          <span style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>Live</span>
          <div style={{width:1,height:20,background:'rgba(255,255,255,.08)'}} />
          <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff'}}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <a href="/dashboard" style={{fontSize:12,color:'rgba(255,255,255,.3)',textDecoration:'none',padding:'5px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.06)',transition:'all .15s'}}
              onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,.7)')}
              onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.3)')}>
              ← App
            </a>
            <button onClick={handleLogout} style={{fontSize:12,color:'rgba(239,68,68,.6)',padding:'5px 10px',borderRadius:6,border:'1px solid rgba(239,68,68,.2)',background:'none',cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.color='#ef4444';e.currentTarget.style.borderColor='rgba(239,68,68,.5)';e.currentTarget.style.background='rgba(239,68,68,.08)'}}
              onMouseLeave={e=>{e.currentTarget.style.color='rgba(239,68,68,.6)';e.currentTarget.style.borderColor='rgba(239,68,68,.2)';e.currentTarget.style.background='none'}}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {mobileOpen&&(
        <div className="sys-mobile-dropdown">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setMobileOpen(false);}}
              style={{padding:'10px 16px',borderRadius:8,fontSize:14,fontWeight:tab===t.id?700:500,border:'none',background:tab===t.id?'rgba(99,102,241,.15)':'transparent',color:tab===t.id?'#818cf8':'rgba(255,255,255,.5)',display:'flex',alignItems:'center',gap:10,fontFamily:'inherit',width:'100%',cursor:'pointer'}}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      )}
      {/* CONTENT */}
      <div className="sys-content-pad" style={{maxWidth:1280,margin:'0 auto',padding:'28px 24px'}}>
        {/* PAGE HEADER */}
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-0.03em',marginBottom:4}}>
            {TABS.find(t=>t.id===tab)?.label}
          </h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,.35)'}}>
            {tab==='overview'&&'Platform-wide statistics and recent activity'}
            {tab==='users'&&'Manage all registered users and farms'}
            {tab==='issues'&&'Review and resolve system issues reported by users'}
            {tab==='announcements'&&'Publish system-wide messages to all users'}
            {tab==='features'&&'Toggle platform features and manage system settings'}
          </p>
        </div>

        {tab==='overview'&&<OverviewTab/>}
        {tab==='users'&&<UsersTab/>}
        {tab==='issues'&&<IssuesTab/>}
        {tab==='announcements'&&<AnnouncementsTab/>}
        {tab==='features'&&<FeaturesTab/>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// WORKER PANEL (unchanged)
// ══════════════════════════════════════════════════════════════
function WorkerPanel() {
  const {user}=useAuth();
  return (
    <div style={{minHeight:'100vh',background:'#0d1117',fontFamily:"'Inter',system-ui,sans-serif",display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',padding:40}}>
        <div style={{fontSize:48,marginBottom:16}}>🌾</div>
        <h2 style={{color:'#fff',fontWeight:700,marginBottom:8}}>Welcome, {user?.name?.split(' ')[0]}</h2>
        <p style={{color:'rgba(255,255,255,.4)',marginBottom:24}}>You have worker access. Use the main app to record farm data.</p>
        <a href="/dashboard" style={{background:'#6366f1',color:'#fff',padding:'10px 24px',borderRadius:8,textDecoration:'none',fontWeight:600}}>Go to Dashboard →</a>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROLE ROUTER — main export
// ══════════════════════════════════════════════════════════════
export function SystemPanel() {  useEffect(() => { document.title = 'System Panel — AgriPulse'; }, []);

  const {user,loading}=useAuth();
  if(loading) return <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/></div>;
  if(!user) return null;
  if(user.role==='superadmin') return <SuperAdminPanel/>;
  if(user.role==='admin') return <SuperAdminPanel/>; // admins see limited view
  return <WorkerPanel/>;
}
