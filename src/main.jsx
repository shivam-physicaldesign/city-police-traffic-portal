import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDownRight, ArrowRight, BadgeCheck, Bell, Camera, Check,
  CheckCircle2, ChevronDown, CircleHelp, Clock3, FileText, Fingerprint,
  Gauge, Globe2, KeyRound, LayoutDashboard, LogOut, Menu, Monitor, Radio,
  RefreshCw, Search, Settings2, Shield, ShieldCheck, Siren, Users, X,
  Eye, EyeOff, ClipboardList, MapPinned, LockKeyhole
} from 'lucide-react';
import './styles.css';
const API_BASE = import.meta.env.VITE_API_URL || '';
const originalFetch = window.fetch.bind(window);
window.fetch = (url, options = {}) => {
  if (typeof url === 'string' && url.startsWith('/api')) {
    return originalFetch(API_BASE + url, { credentials: 'include', ...options });
  }
  return originalFetch(url, options);
};

const roles = [
  { name: 'Administrator', id: 'admin.demo', password: 'AdminDemo@123', icon: ShieldCheck, detail: 'System-wide oversight, user access, reports and configuration.' },
  { name: 'Traffic Police', id: 'traffic.demo', password: 'TrafficDemo@123', icon: BadgeCheck, detail: 'Assigned field cases, enforcement records and follow-ups.' },
  { name: 'Control Room Operator', id: 'control.demo', password: 'ControlDemo@123', icon: Monitor, detail: 'Camera endpoint status, incident logging and response coordination.' }
];
const iconMap = { camera: Camera, activity: Activity, file: FileText, users: Users, clock: Clock3, check: CheckCircle2, bell: Bell };
const fmt = (s) => s;

function App() {
  const [role, setRole] = useState('Administrator');
  const [userId, setUserId] = useState('admin.demo');
  const [password, setPassword] = useState('AdminDemo@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [page, setPage] = useState('Overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async r => { if (!r.ok) throw new Error('No active session'); return r.json(); })
      .then(data => { setUser(data.user); setCsrfToken(data.csrfToken); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!user) return;
    fetch('/api/dashboard', { credentials: 'include' })
      .then(async r => { if (!r.ok) throw new Error('Could not load dashboard'); return r.json(); })
      .then(setDashboard)
      .catch(e => setError(e.message));
  }, [user]);

  function chooseRole(nextRole) {
    const found = roles.find(r => r.name === nextRole);
    setRole(nextRole); setUserId(found.id); setPassword(found.password); setError(''); setNotice('');
  }
  async function signIn(e) {
    e.preventDefault(); setLoading(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password, role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
      setUser(data.user); setCsrfToken(data.csrfToken); setPage('Overview'); setDemoMode(true);
    } catch (err) { setError(err.message || 'Could not reach the server. Run npm run dev.'); }
    finally { setLoading(false); }
  }
  async function signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken } });
    } finally {
      setUser(null); setDashboard(null); setCsrfToken(''); setError(''); setNotice('');
      chooseRole('Administrator');
    }
  }
  function fillDemo() {
    const found = roles.find(r => r.name === role);
    setUserId(found.id); setPassword(found.password); setNotice('Demo credentials filled. These accounts are fictional and for local testing only.');
  }

  if (user) return <Dashboard user={user} dashboard={dashboard} page={page} setPage={setPage} onLogout={signOut} search={search} setSearch={setSearch} mobileNav={mobileNav} setMobileNav={setMobileNav} error={error} />;
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="City Police home">
        <div className="brand-mark"><ShieldCheck size={25}/></div>
        <div><strong>CITY POLICE</strong><span>TRAFFIC COMMAND PORTAL</span></div>
      </a>
      <div className="topbar-right"><span className="secure-label"><LockKeyhole size={14}/> SECURE ACCESS</span><span className="demo-pill">DEMO ENVIRONMENT</span></div>
    </header>
    <main id="top" className="landing">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot"/> INTELLIGENT TRAFFIC MANAGEMENT</div>
          <h1>Smarter traffic.<br/><span>Safer cities.</span></h1>
          <p className="hero-intro">A unified command portal for monitoring traffic operations, coordinating incident response and supporting safer roads across the city.</p>
          <div className="hero-points"><span><Camera size={16}/> Camera operations</span><span><ShieldCheck size={16}/> Role-based access</span><span><Activity size={16}/> Incident coordination</span></div>
          <div className="hero-rule"/>
          <div className="process-title"><span className="mini-label">OPERATIONAL WORKFLOW</span><span className="muted-small">From detection to resolution</span></div>
          <div className="workflow">
            {[['01','Monitor','Watch camera status and traffic alerts.'],['02','Review','Validate incident details and evidence.'],['03','Coordinate','Route tasks to the responsible team.'],['04','Report','Track outcomes and improve operations.']].map(([n,title,desc]) => <div className="workflow-step" key={n}><div className="step-num">{n}</div><strong>{title}</strong><p>{desc}</p></div>)}
          </div>
        </div>
        <aside className="login-card">
          <div className="login-heading"><div><div className="mini-label">STAFF PORTAL</div><h2>Sign in to continue</h2><p>Select your assigned role to access the relevant workspace.</p></div><div className="login-icon"><Fingerprint size={26}/></div></div>
          <div className="role-picker" role="group" aria-label="Select login role">
            {roles.map(item => { const Icon = item.icon; return <button type="button" key={item.name} onClick={() => chooseRole(item.name)} className={`role-option ${role === item.name ? 'selected' : ''}`} aria-pressed={role === item.name}><span className="role-icon"><Icon size={19}/></span><span className="role-text"><strong>{item.name}</strong><small>{item.detail}</small></span><span className="radio-dot">{role === item.name && <span/>}</span></button>; })}
          </div>
          <form onSubmit={signIn} className="login-form">
            <label htmlFor="userId">Official user ID</label><div className="input-wrap"><Users size={17}/><input id="userId" autoComplete="username" value={userId} onChange={e => setUserId(e.target.value)} placeholder="Enter your user ID" required/></div>
            <div className="label-row"><label htmlFor="password">Password</label><span><LockKeyhole size={12}/> Encrypted in transit on HTTPS</span></div>
            <div className="input-wrap"><KeyRound size={17}/><input id="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required/><button className="show-password" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
            {error && <div className="alert error"><X size={16}/>{error}</div>}
            {notice && <div className="alert info"><CheckCircle2 size={16}/>{notice}</div>}
            <button className="primary-button" type="submit" disabled={loading}>{loading ? <><RefreshCw size={17} className="spin"/> Signing in…</> : <>Sign in to workspace <ArrowRight size={17}/></>}</button>
            <button className="demo-button" type="button" onClick={fillDemo}><KeyRound size={15}/> Fill demo credentials</button>
          </form>
          <div className="login-foot"><Shield size={15}/><span>Authorized personnel only. All actions in this demo are illustrative.</span></div>
        </aside>
      </section>
      <section className="role-details">
        <div className="section-head"><div><div className="mini-label">THREE ROLES · ONE PORTAL</div><h2>Built around real responsibilities</h2></div><p>Each role gets a focused workspace. Access restrictions are checked by the server, not just hidden in the interface.</p></div>
        <div className="role-detail-grid">
          <article><div className="detail-icon navy"><ShieldCheck size={21}/></div><h3>Administrator</h3><p>System-wide oversight and configuration for authorized administrators.</p><ul><li>User and role administration</li><li>System reports and audit review</li><li>Configuration and service health</li></ul></article>
          <article><div className="detail-icon blue"><BadgeCheck size={21}/></div><h3>Traffic Police</h3><p>Tools for officers handling assigned field enforcement activities.</p><ul><li>Assigned cases and follow-ups</li><li>Field notes and case status</li><li>Evidence review for assigned cases</li></ul></article>
          <article><div className="detail-icon teal"><Monitor size={21}/></div><h3>Control Room Operator</h3><p>Central monitoring and incident coordination tools.</p><ul><li>Camera endpoint status</li><li>Incident logging and routing</li><li>Response handovers</li></ul></article>
        </div>
      </section>
      <footer className="site-footer"><div className="footer-brand"><ShieldCheck size={18}/> CITY POLICE <span>·</span> TRAFFIC COMMAND PORTAL</div><span>Demonstration interface · Not connected to live city systems</span></footer>
    </main>
  </div>;
}

function Dashboard({ user, dashboard, page, setPage, onLogout, search, setSearch, mobileNav, setMobileNav, error }) {
  const navItems = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Camera Network', icon: Camera },
    { label: 'Violation Review', icon: ClipboardList },
    { label: 'AI Analysis', icon: Activity },
    ...(user.role === 'Administrator' ? [{ label: 'Access Requests', icon: ShieldCheck }, { label: 'Audit Logs', icon: FileText }, { label: 'User Management', icon: Users }, { label: 'System Settings', icon: Settings2 }] : [{ label: user.role === 'Traffic Police' ? 'Assigned Cases' : 'Incidents & Reports', icon: ClipboardList }]),
    { label: 'Incidents & Reports', icon: FileText },
    ...(user.role === 'Administrator' ? [{ label: 'System Settings', icon: Settings2 }] : []),
    { label: 'Help & Procedures', icon: CircleHelp }
  ];
  const titleMap = {
    'Overview': 'Operations overview',
    'User Management': 'User management',
    'Assigned Cases': 'Assigned cases',
    'Camera Monitoring': 'Camera monitoring',
    'Camera Network': 'Camera network',
    'Violation Review': 'Violation review',
    'AI Analysis': 'AI-assisted analysis',
    'Access Requests': 'Authority access requests',
    'Audit Logs': 'Audit logs',
    'Incidents & Reports': 'Incidents & reports',
    'System Settings': 'System settings',
    'Help & Procedures': 'Help & procedures'
  };
  return <div className="dashboard-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <a className="brand side-brand" href="#dashboard"><div className="brand-mark"><ShieldCheck size={24}/></div><div><strong>CITY POLICE</strong><span>TRAFFIC COMMAND</span></div></a>
      <div className="side-label">WORKSPACE</div>
      <nav>{navItems.map(({label, icon: Icon}) => <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => {setPage(label); setMobileNav(false);}}><Icon size={18}/><span>{label}</span>{page === label && <span className="nav-active-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="demo-note"><div><Radio size={15}/> Demo data</div><p>Sample figures only. No live camera feeds or police records are connected.</p></div><button className="nav-item logout" onClick={onLogout}><LogOut size={18}/><span>Sign out</span></button></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <main className="dash-main">
      <header className="dash-topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu">{mobileNav ? <X size={20}/> : <Menu size={20}/>}</button><div className="breadcrumb">Traffic Command <span>/</span> <strong>{page}</strong></div><div className="dash-top-actions"><label className="dash-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search this view…"/></label><button className="icon-button" title="Notifications" onClick={() => alert('Demo portal: no live notifications are connected.')}><Bell size={18}/><i/></button><div className="user-chip"><div className="avatar">{user.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><strong>{user.name}</strong><span>{user.role}</span></div><ChevronDown size={14}/></div></div></header>
      <div className="dash-content">
        <div className="dash-page-heading"><div><div className="mini-label">CITY OPERATIONS / {user.role.toUpperCase()}</div><h1>{titleMap[page] || page}</h1><p>Welcome back, {user.name}. Here is your role-specific workspace.</p></div><div className="status-chip"><span/> Demo system online</div></div>
        {error && <div className="alert error">{error}</div>}
        {page === 'Overview' ? <Overview user={user} dashboard={dashboard} /> : <SectionPage user={user} page={page} dashboard={dashboard} search={search} />}
        <footer className="dash-footer"><span>City Police Traffic Command Portal</span><span>Demo environment · Sample records only</span></footer>
      </div>
    </main>
  </div>;
}

function Overview({ user, dashboard }) {
  if (!dashboard) return <div className="loading-panel"><RefreshCw className="spin"/> Loading authorized workspace…</div>;
  return <>
    <div className="welcome-banner"><div className="welcome-symbol"><Gauge size={25}/></div><div><div className="mini-label">SHIFT SNAPSHOT</div><h2>{user.role === 'Administrator' ? 'Citywide operations at a glance' : user.role === 'Traffic Police' ? 'Your field activity at a glance' : 'Monitoring desk at a glance'}</h2><p>Illustrative dashboard data for demonstrating role-based access and navigation.</p></div><div className="welcome-date"><span>ENVIRONMENT</span><strong>LOCAL DEMO</strong></div></div>
    <div className="metric-grid">{dashboard.metrics.map(m => {const Icon = iconMap[m.icon] || Activity; return <article className="metric-card" key={m.label}><div className="metric-top"><span>{m.label}</span><div className="metric-icon"><Icon size={18}/></div></div><div className="metric-value">{m.value}</div><div className="metric-trend"><ArrowDownRight size={14}/>{m.trend}</div></article>;})}</div>
    <div className="dash-grid"><section className="panel events-panel"><div className="panel-head"><div><h3>Recent activity log</h3><p>Sample events · not live incident data</p></div><span className="table-count">04 RECORDS</span></div><div className="activity-list">{dashboard.events.map((event,i)=><div className="activity-row" key={event.time}><div className="event-time">{event.time}</div><div className="event-marker"><span/></div><div className="event-body"><strong>{event.event}</strong><span><MapPinned size={13}/>{event.zone}</span></div><span className={`event-status status-${event.status.toLowerCase().replaceAll(' ','-')}`}>{event.status}</span></div>)}</div><div className="panel-bottom-note"><ShieldCheck size={15}/> Evidence review and enforcement decisions require authorized human review.</div></section>
      <section className="panel permissions-panel"><div className="panel-head"><div><h3>Your access scope</h3><p>Role permissions summary</p></div><LockKeyhole size={18}/></div><div className="permission-list">{dashboard.permissions.map(p=><div key={p}><CheckCircle2 size={16}/><span>{p}</span></div>)}</div><div className="scope-note"><LockKeyhole size={16}/><p>Server-side role checks protect API routes. This is a local demo, not an operational police system.</p></div></section></div>
    <div className="system-disclaimer"><div className="disclaimer-icon"><CircleHelp size={18}/></div><div><strong>Demonstration data only</strong><p>Metrics, events, zones and account names are fictional examples. No real CCTV, geolocation, citizen records, payment services or challan issuance is connected.</p></div></div>
  </>;
}
function SectionPage({ user, page, dashboard, search }) {
  const [items,setItems]=useState([]), [cameras,setCameras]=useState([]), [violations,setViolations]=useState([]), [error,setError]=useState(''), [notice,setNotice]=useState(''), [busy,setBusy]=useState(false), [selected,setSelected]=useState(null), [edit,setEdit]=useState(null);
  const [form,setForm]=useState({id:'',name:'',location:'',zone:'Zone 01',status:'Online',cameraId:'',timestamp:new Date().toISOString().slice(0,16),type:'Red-light suspected',confidence:'0.80',explanation:'Demo event submitted for human review.'});
  const api=async(url,opts={})=>{const r=await fetch(url,{credentials:'include',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;};
  const load=async()=>{setBusy(true);setError('');try{if(page==='Camera Network'||page==='Camera Monitoring'){const d=await api('/api/cameras');setItems(d.items);setCameras(d.items);setViolations((await api('/api/violations')).items);}else if(['Violation Review','Assigned Cases','Incidents & Reports'].includes(page)){const d=await api('/api/violations');setItems(d.items);setCameras((await api('/api/cameras')).items);}else if(page==='AI Analysis'){setItems((await api('/api/ai/analyze')).items);}else if(page==='Audit Logs'){setItems((await api('/api/audit')).items);}else if(page==='Access Requests'){setItems((await api('/api/access-requests')).items);}else if(page==='System Settings'){setItems([(await api('/api/rules')).rules]);}else {setItems([]);}}catch(e){setError(e.message);}finally{setBusy(false);}};
  useEffect(()=>{load();},[page]);
  const run=async(fn,msg)=>{setError('');setNotice('');try{await fn();setNotice(msg);setEdit(null);setSelected(null);await load();}catch(e){setError(e.message);}};
  const isAdmin=user.role==='Administrator';
  const filtered=items.filter(x=>JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));
  const input=(key,label,type='text')=><label className="cw-field">{label}<input type={type} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})} required /></label>;
  const field=(key,label,options)=><label className="cw-field">{label}<select value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}>{options.map(x=><option key={x} value={x}>{x}</option>)}</select></label>;
  const cameraForm=()=> <form className="cw-form" onSubmit={e=>{e.preventDefault();run(async()=>{const editing=edit?.kind==='camera';const url=editing?`/api/cameras/${encodeURIComponent(edit.id)}`:'/api/cameras';await api(url,{method:editing?'PUT':'POST',body:JSON.stringify(editing?{name:form.name,location:form.location,zone:form.zone,status:form.status}:form)});},edit?.kind==='camera'?'Camera updated.':'Camera created.')}}><h3>{edit?.kind==='camera'?'Edit camera':'Register camera'}</h3>{edit?.kind!=='camera'&&input('id','Camera ID')}{input('name','Camera name')}{input('location','Location')}{input('zone','Zone')}{field('status','Operational status',['Online','Offline','Maintenance'])}<button className="primary-button" type="submit">{edit?.kind==='camera'?'Save changes':'Add camera'}</button><button type="button" className="secondary-button" onClick={()=>setEdit(null)}>Cancel</button></form>;
  const violationForm=()=> <form className="cw-form" onSubmit={e=>{e.preventDefault();run(async()=>{const editing=Boolean(edit?.id);await api(editing?`/api/violations/${edit.id}`:'/api/violations',{method:editing?'PUT':'POST',body:JSON.stringify(editing?{location:form.location,type:form.type,confidence:Number(form.confidence),timestamp:new Date(form.timestamp).toISOString()}:{cameraId:form.cameraId,timestamp:new Date(form.timestamp).toISOString(),location:form.location,type:form.type,confidence:Number(form.confidence),explanation:form.explanation})});},edit?.id?'Case updated.':'Violation recorded for review.')}}><h3>{edit?.id?'Edit case':'Record a violation'}</h3>{!edit?.id&&field('cameraId','Camera',['',...cameras.map(c=>c.id)])}{input('timestamp','Timestamp','datetime-local')}{input('location','Location')}{field('type','Violation category',['Red-light suspected','Wrong-way suspected','Helmet suspected','Speeding suspected'])}{input('confidence','Confidence (0–1)','number')}{!edit?.id&&input('explanation','Analysis explanation')}<button className="primary-button" type="submit">Save case</button><button type="button" className="secondary-button" onClick={()=>setEdit(null)}>Cancel</button></form>;
  const status=(v)=><span className={`event-status status-${String(v).toLowerCase().replaceAll(' ','-')}`}>{v}</span>;
  return <section className="panel table-panel cw-workspace">
    <div className="panel-head"><div><h3>{page}</h3><p>CityWatch operational workspace · sample/demo records only</p></div><span className="table-count">{filtered.length} RECORDS</span></div>
    {error&&<div className="cw-alert error">{error}</div>}{notice&&<div className="cw-alert success">{notice}</div>}{busy&&<p>Loading records…</p>}
    {['Camera Network','Camera Monitoring'].includes(page)&&<><div className="cw-toolbar">{isAdmin&&<button className="primary-button" onClick={()=>{setEdit({kind:'new-camera'});setForm({id:'',name:'',location:'',zone:'Zone 01',status:'Online'});}}>+ Add camera</button>}</div><div className="cw-record-grid">{filtered.map(c=><article className="cw-record" key={c.id}><div className="cw-record-top"><Camera size={22}/>{status(c.status)}</div><h3>{c.name}</h3><p><b>{c.id}</b></p><p>{c.location} · {c.zone}</p><small>Last activity: {new Date(c.lastActivity).toLocaleString()}</small><p>Linked violations: {violations.filter(v=>v.cameraId===c.id).length}</p><div className="cw-actions"><button onClick={()=>setSelected(selected?.id===c.id?null:c)}>Details</button>{isAdmin&&<button onClick={()=>{setEdit({...c,kind:'camera'});setForm(c);}}>Edit</button>}{isAdmin&&<button onClick={()=>confirm('Delete this camera? Linked cameras cannot be deleted.')&&run(()=>api(`/api/cameras/${encodeURIComponent(c.id)}`,{method:'DELETE'}),'Camera deleted.')}>Delete</button>}</div>{selected?.id===c.id&&<div className="cw-detail"><b>Camera detail</b><p>Zone: {c.zone} · Status: {c.status}</p><p>Linked cases: {violations.filter(v=>v.cameraId===c.id).length}</p></div>}</article>)}</div>{edit?.kind?.includes('camera')&&cameraForm()}</>}
    {['Violation Review','Assigned Cases','Incidents & Reports'].includes(page)&&<><div className="cw-toolbar">{['Administrator','Authority Reviewer','Traffic Officer','Traffic Police'].includes(user.role)&&<button className="primary-button" onClick={()=>{setEdit({kind:'new-violation'});setForm({...form,cameraId:cameras[0]?.id||'',confidence:'0.80',timestamp:new Date().toISOString().slice(0,16)});}}>+ Add violation</button>}</div>{edit&&violationForm()}<div className="responsive-table"><table><thead><tr><th>Violation / time</th><th>Camera / location</th><th>Category</th><th>Confidence</th><th>Status</th><th>Evidence / actions</th></tr></thead><tbody>{filtered.map(v=><tr key={v.id}><td><b>{v.id}</b><br/>{new Date(v.timestamp).toLocaleString()}</td><td>{v.cameraId}<br/>{v.location}</td><td>{v.type}</td><td>{Math.round(v.confidence*100)}%</td><td>{status(v.status)}</td><td>{v.evidenceUrl?<a href={v.evidenceUrl} target="_blank" rel="noreferrer">View evidence</a>:<span>{v.evidenceLabel||'No evidence'}</span>}<div className="cw-actions"><button onClick={()=>setSelected(selected?.id===v.id?null:v)}>Details</button><button onClick={()=>{setEdit(v);setForm({...form,...v,timestamp:new Date(v.timestamp).toISOString().slice(0,16),confidence:String(v.confidence)});}}>Edit</button><label className="cw-upload">Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){setError('Image must be under 5 MB.');return;}const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});run(()=>api(`/api/violations/${v.id}/evidence`,{method:'POST',body:JSON.stringify({data})}),'Evidence uploaded.');}}/></label>{['Administrator','Authority Reviewer'].includes(user.role)&&<><button onClick={()=>run(()=>api(`/api/violations/${v.id}/review`,{method:'POST',body:JSON.stringify({decision:'Approved'})}),'Case approved.')}>Approve</button><button onClick={()=>{const reason=prompt('Reason for rejecting this case (required):');if(reason)run(()=>api(`/api/violations/${v.id}/review`,{method:'POST',body:JSON.stringify({decision:'Rejected',reason})}),'Case rejected with reason.');}}>Reject</button><button onClick={()=>run(()=>api(`/api/violations/${v.id}/review`,{method:'POST',body:JSON.stringify({decision:'Under Review',reason:'Requires additional human verification.'})}),'Case returned for review.')}>Review</button></>}</div>{selected?.id===v.id&&<div className="cw-detail"><b>Case explanation</b><p>{v.explanation||'No explanation recorded.'}</p><p>Reviewer: {v.reviewer||'Not yet reviewed'} · Model/rule: {v.modelVersion||'manual-entry'}</p>{v.evidenceUrl&&<img className="cw-evidence" src={v.evidenceUrl} alt="Uploaded demo evidence"/>}<p>Decision history: {(v.history||[]).map(h=>`${h.from} → ${h.to} by ${h.actor}`).join('; ')||'No decisions yet'}</p></div>}</td></tr>)}{!filtered.length&&<tr><td colSpan="6" className="empty-state">No matching records.</td></tr>}</tbody></table></div></>}
    {page==='AI Analysis'&&<><div className="cw-alert">SIMULATED RULE-BASED ANALYSIS — no trained ML model, live video, or computer-vision inference is connected.</div><p>Review low-confidence events and cases without evidence before making a decision.</p><div className="responsive-table"><table><thead><tr><th>Case</th><th>Predicted category</th><th>Confidence</th><th>Explanation</th><th>Flag</th></tr></thead><tbody>{filtered.map(v=><tr key={v.id}><td>{v.id}</td><td>{v.analysis?.predictedCategory||v.type}</td><td>{Math.round((v.analysis?.confidence??v.confidence)*100)}%</td><td>{v.analysis?.explanation||v.explanation}</td><td>{v.analysis?.flagForReview?'Human review required':'Review recommended'}</td></tr>)}</tbody></table></div></>}
    {page==='Access Requests'&&<div className="responsive-table"><table><thead><tr><th>Applicant</th><th>Reason</th><th>Status</th><th>Decision</th></tr></thead><tbody>{filtered.map(a=><tr key={a.id}><td>{a.name}<br/>{a.userId}<br/>{a.email}</td><td>{a.reason}</td><td>{status(a.status)}</td><td>{a.status==='Pending'&&<div className="cw-actions"><button onClick={()=>{const role=prompt('Assign role: Authority Reviewer, Traffic Officer, or Read-Only Viewer','Traffic Officer');if(role&&['Authority Reviewer','Traffic Officer','Read-Only Viewer'].includes(role))run(()=>api(`/api/access-requests/${a.id}/decision`,{method:'POST',body:JSON.stringify({decision:'Approved',role})}),'Request approved; account provisioning still required.');}}>Approve</button><button onClick={()=>run(()=>api(`/api/access-requests/${a.id}/decision`,{method:'POST',body:JSON.stringify({decision:'Rejected',role:'Read-Only Viewer'})}),'Request rejected.')}>Reject</button></div>}</td></tr>)}</tbody></table></div>}
    {page==='Audit Logs'&&<div className="responsive-table"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Record</th><th>Details</th></tr></thead><tbody>{filtered.map(a=><tr key={a.id}><td>{new Date(a.at).toLocaleString()}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.recordId}</td><td>{a.details}</td></tr>)}</tbody></table></div>}
    {page==='System Settings'&&<><div className="cw-alert">Enforcement policy configuration is demo-only. No fines or notices are issued.</div><form className="cw-form" onSubmit={e=>{e.preventDefault();run(()=>api('/api/rules',{method:'PUT',body:JSON.stringify({confidenceThreshold:Number(form.confidenceThreshold),categories:form.categories.split(',').map(x=>x.trim()).filter(Boolean)})}),'Rules saved.')}}><h3>Review rules</h3><label className="cw-field">Confidence threshold (0–1)<input type="number" min="0" max="1" step="0.05" value={form.confidenceThreshold??items[0]?.confidenceThreshold??0.75} onChange={e=>setForm({...form,confidenceThreshold:e.target.value})}/></label><label className="cw-field">Violation categories, comma separated<textarea value={form.categories??(items[0]?.categories||[]).join(', ')} onChange={e=>setForm({...form,categories:e.target.value})}/></label><button className="primary-button">Save rules</button></form></>}
    {!['Camera Network','Camera Monitoring','Violation Review','Assigned Cases','Incidents & Reports','AI Analysis','Access Requests','Audit Logs','System Settings'].includes(page)&&<p>Use the navigation to manage camera records, review violations, inspect simulated AI analysis, and view administrative logs.</p>}
    <div className="panel-bottom-note"><ShieldCheck size={15}/> {user.role} permissions are checked by the server. Demo data only; no real enforcement action occurs.</div>
  </section>;
}

createRoot(document.getElementById('root')).render(<App />);