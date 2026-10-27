import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-change-this-secret-before-production';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
const evidenceDir = path.resolve(__dirname, '../uploads/evidence');
fs.mkdirSync(dataDir, { recursive: true }); fs.mkdirSync(evidenceDir, { recursive: true });
const storeFile = path.join(dataDir, 'citywatch-store.json');
const initialStore = { cameras: [
 {id:'CAM-Z04-021',name:'Central Avenue North',location:'Central Avenue / Zone 04',zone:'Zone 04',status:'Online',lastActivity:new Date().toISOString()},
 {id:'CAM-Z02-009',name:'Riverside Junction',location:'Riverside Junction / Zone 02',zone:'Zone 02',status:'Online',lastActivity:new Date().toISOString()},
 {id:'CAM-Z07-004',name:'Market Road East',location:'Market Road / Zone 07',zone:'Zone 07',status:'Maintenance',lastActivity:new Date().toISOString()}], violations: [
 {id:'VIO-3021',cameraId:'CAM-Z04-021',timestamp:'2026-10-27T09:42:00.000Z',location:'Central Avenue / Zone 04',type:'Red-light suspected',confidence:0.91,status:'Under Review',reviewer:'',reason:'',evidenceLabel:'DEMO EVIDENCE — illustrative placeholder',evidenceUrl:'',modelVersion:'rule-demo-v1',explanation:'Sample event rule matched a configured red-light pattern; human verification required.',history:[]},
 {id:'VIO-3018',cameraId:'CAM-Z02-009',timestamp:'2026-10-27T09:18:00.000Z',location:'Riverside Junction / Zone 02',type:'Wrong-way suspected',confidence:0.62,status:'Pending',reviewer:'',reason:'',evidenceLabel:'DEMO EVIDENCE — illustrative placeholder',evidenceUrl:'',modelVersion:'rule-demo-v1',explanation:'Low-confidence sample event; verify lane direction and evidence.',history:[]}], accessRequests:[], audit:[], rules:{confidenceThreshold:0.75, categories:['Red-light suspected','Wrong-way suspected','Helmet suspected','Speeding suspected']} };
let store; try { store = JSON.parse(fs.readFileSync(storeFile, 'utf8')); } catch { store = initialStore; fs.writeFileSync(storeFile, JSON.stringify(store,null,2)); }
function audit(actor, action, recordId, details='') { store.audit.unshift({id:randomBytes(8).toString('hex'),actor,action,recordId,details,at:new Date().toISOString()}); store.audit=store.audit.slice(0,5000); persist(); }
function persist(){ fs.writeFileSync(storeFile, JSON.stringify(store,null,2)); }
const canReview = u => ['Administrator','Authority Reviewer'].includes(u.role);
const canManage = u => u.role === 'Administrator';

if (isProduction && SESSION_SECRET === 'dev-only-change-this-secret-before-production') {
  throw new Error('Set a strong SESSION_SECRET environment variable before production.');
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '7mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please wait and try again.' } });
const sessionStore = new Map();
const csrfStore = new Map();

const roleUsers = [
  { id: 'admin.demo', password: 'AdminDemo@123', role: 'Administrator', name: 'Demo Administrator', badge: 'ADM-001' },
  { id: 'traffic.demo', password: 'TrafficDemo@123', role: 'Traffic Police', name: 'Demo Traffic Officer', badge: 'TRF-014' },
  { id: 'control.demo', password: 'ControlDemo@123', role: 'Control Room Operator', name: 'Demo Control Operator', badge: 'CTR-008' }
];
const users = await Promise.all(roleUsers.map(async u => ({ ...u, passwordHash: await bcrypt.hash(u.password, 12) })));
const publicUser = u => ({ id: u.id, role: u.role, name: u.name, badge: u.badge });

function newToken() { return randomBytes(32).toString('hex'); }
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function auth(req, res, next) {
  const sid = req.cookies?.city_session;
  const session = sid && sessionStore.get(sid);
  if (!session || session.expiresAt < Date.now()) {
    if (sid) sessionStore.delete(sid);
    res.clearCookie('city_session', { httpOnly: true, sameSite: 'strict', secure: isProduction, path: '/' });
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  req.user = users.find(u => u.id === session.userId);
  req.sessionId = sid;
  if (!req.user) return res.status(401).json({ error: 'Session user no longer exists.' });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Your role is not authorized to access this resource.' });
}
function csrf(req, res, next) {
  const expected = csrfStore.get(req.sessionId);
  if (!expected || !safeEqual(req.get('X-CSRF-Token'), expected)) return res.status(403).json({ error: 'Security token invalid. Refresh your session and try again.' });
  next();
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'city-police-traffic-portal' }));
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const schema = z.object({ userId: z.string().trim().min(1).max(80), password: z.string().min(1).max(200), role: z.enum(['Administrator', 'Authority Reviewer', 'Traffic Officer', 'Read-Only Viewer', 'Traffic Police', 'Control Room Operator']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid user ID, password, and role.' });
  const { userId, password, role } = parsed.data;
  const user = users.find(u => u.id.toLowerCase() === userId.toLowerCase() && u.role === role);
  // Always run a password hash comparison, including for unknown user IDs.
  const dummyHash = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7wSxP7U1w7V6B1Qp5nG9yZ2Z1eK8Qj6a';
  const valid = await bcrypt.compare(password, user?.passwordHash || dummyHash);
  if (!user || !valid) return res.status(401).json({ error: 'Invalid credentials for the selected role.' });

  const sid = newToken();
  const csrfToken = newToken();
  sessionStore.set(sid, { userId: user.id, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
  csrfStore.set(sid, csrfToken);
  res.cookie('city_session', sid, { httpOnly: true, secure: isProduction, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000, path: '/' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: publicUser(user), csrfToken, demo: true, message: 'Demo sign-in successful.' });
});
app.get('/api/auth/me', auth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: publicUser(req.user), csrfToken: csrfStore.get(req.sessionId), demo: true });
});
app.post('/api/auth/logout', auth, csrf, (req, res) => {
  sessionStore.delete(req.sessionId); csrfStore.delete(req.sessionId);
  res.clearCookie('city_session', { httpOnly: true, sameSite: 'strict', secure: isProduction, path: '/' });
  res.json({ ok: true });
});

const dashboardData = {
  'Administrator': {
    metrics: [{ label: 'Connected cameras', value: '248', trend: 'Demo inventory', icon: 'camera' }, { label: 'Incidents today', value: '36', trend: 'Across monitored zones', icon: 'activity' }, { label: 'Open cases', value: '19', trend: 'Awaiting review', icon: 'file' }, { label: 'Active personnel', value: '84', trend: 'Demo directory', icon: 'users' }],
    permissions: ['System overview', 'Manage users and roles', 'Review audit activity', 'View reports and configuration']
  },
  'Traffic Police': {
    metrics: [{ label: 'Assigned cases', value: '08', trend: 'Demo assignment list', icon: 'file' }, { label: 'Pending follow-ups', value: '03', trend: 'Requires attention', icon: 'clock' }, { label: 'Resolved today', value: '12', trend: 'Demo activity', icon: 'check' }, { label: 'Field units', value: '16', trend: 'Demo directory', icon: 'users' }],
    permissions: ['View assigned cases', 'Record field observations', 'Update case status', 'Review assigned evidence']
  },
  'Control Room Operator': {
    metrics: [{ label: 'Camera endpoints', value: '248', trend: 'Demo inventory', icon: 'camera' }, { label: 'Active alerts', value: '05', trend: 'Illustrative only', icon: 'bell' }, { label: 'Incidents logged', value: '14', trend: 'Demo activity', icon: 'activity' }, { label: 'Open handovers', value: '02', trend: 'Needs coordination', icon: 'clock' }],
    permissions: ['View camera endpoint status', 'Log incidents', 'Route alerts to teams', 'Track response handovers']
  }
};
app.get('/api/dashboard', auth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ role: req.user.role, metrics: dashboardData[req.user.role].metrics, permissions: dashboardData[req.user.role].permissions, events: [
    { time: '09:42', zone: 'Central Avenue / Zone 04', event: 'Congestion alert recorded', status: 'Under review' },
    { time: '09:18', zone: 'Riverside Junction / Zone 02', event: 'Signal fault reported', status: 'Assigned' },
    { time: '08:56', zone: 'Market Road / Zone 07', event: 'Incident report submitted', status: 'Logged' },
    { time: '08:31', zone: 'North Ring Road / Zone 01', event: 'Routine patrol update', status: 'Closed' }
  ], demo: true });
});

// Persistent demo operations API. JSON file storage is used to keep the prototype dependency-light;
// for multi-instance production, replace with PostgreSQL/managed database and object storage.
app.get('/api/cameras', auth, (req,res) => res.json({items:store.cameras, demo:true}));
app.post('/api/cameras', auth, requireRole('Administrator'), (req,res) => {
 const v=z.object({id:z.string().trim().min(3).max(40),name:z.string().trim().min(2).max(100),location:z.string().trim().min(2).max(180),zone:z.string().trim().min(1).max(60),status:z.enum(['Online','Offline','Maintenance'])}).safeParse(req.body);
 if(!v.success) return res.status(400).json({error:'Enter a valid camera ID, name, location, zone, and status.'}); if(store.cameras.some(c=>c.id===v.data.id)) return res.status(409).json({error:'Camera ID already exists.'});
 const item={...v.data,lastActivity:new Date().toISOString()}; store.cameras.push(item); audit(req.user.id,'camera.created',item.id); res.status(201).json({item});
});
app.put('/api/cameras/:id', auth, requireRole('Administrator'), (req,res)=>{ const c=store.cameras.find(x=>x.id===req.params.id); if(!c)return res.status(404).json({error:'Camera not found.'}); const v=z.object({name:z.string().trim().min(2).max(100),location:z.string().trim().min(2).max(180),zone:z.string().trim().min(1).max(60),status:z.enum(['Online','Offline','Maintenance'])}).safeParse(req.body); if(!v.success)return res.status(400).json({error:'Invalid camera details.'}); Object.assign(c,v.data); audit(req.user.id,'camera.updated',c.id); persist(); res.json({item:c}); });
app.delete('/api/cameras/:id', auth, requireRole('Administrator'), (req,res)=>{ const c=store.cameras.find(x=>x.id===req.params.id); if(!c)return res.status(404).json({error:'Camera not found.'}); if(store.violations.some(v=>v.cameraId===c.id)) return res.status(409).json({error:'This camera is linked to violation records. Set its status to Offline or Maintenance instead of deleting it.'}); store.cameras=store.cameras.filter(x=>x.id!==c.id); audit(req.user.id,'camera.deleted',c.id); persist(); res.json({ok:true}); });
app.get('/api/violations', auth, (req,res)=>{ let items=[...store.violations]; const q=String(req.query.q||'').toLowerCase(); if(q)items=items.filter(v=>JSON.stringify(v).toLowerCase().includes(q)); for(const k of ['status','type','cameraId']) if(req.query[k])items=items.filter(v=>v[k]===req.query[k]); res.json({items,demo:true}); });
app.post('/api/violations', auth, requireRole('Administrator','Authority Reviewer','Traffic Officer','Traffic Police'), (req,res)=>{ const v=z.object({cameraId:z.string().min(1),timestamp:z.string().min(1),location:z.string().min(2).max(180),type:z.string().min(2).max(80),confidence:z.coerce.number().min(0).max(1),explanation:z.string().max(1000).optional()}).safeParse(req.body); if(!v.success)return res.status(400).json({error:'Please provide valid violation details.'}); if(!store.cameras.some(c=>c.id===v.data.cameraId))return res.status(400).json({error:'Select a registered camera.'}); const item={...v.data,id:'VIO-'+(Date.now().toString().slice(-8)),status:'Pending',reviewer:'',reason:'',evidenceLabel:'No evidence uploaded',evidenceUrl:'',modelVersion:'manual-entry',history:[]}; store.violations.unshift(item); audit(req.user.id,'violation.created',item.id); persist(); res.status(201).json({item}); });
app.put('/api/violations/:id', auth, requireRole('Administrator','Authority Reviewer','Traffic Officer','Traffic Police'), (req,res)=>{ const v=store.violations.find(x=>x.id===req.params.id); if(!v)return res.status(404).json({error:'Violation not found.'}); if(v.status==='Approved'&&!canManage(req.user))return res.status(403).json({error:'Only an administrator can edit an approved record.'}); if(['Approved','Rejected'].includes(v.status)&&!canManage(req.user))return res.status(403).json({error:'This case is locked after a final decision.'}); const schema=z.object({location:z.string().trim().min(2).max(180),type:z.string().trim().min(2).max(80),confidence:z.coerce.number().min(0).max(1),timestamp:z.string().min(1)}); const parsed=schema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:'Invalid case details.'}); Object.assign(v,parsed.data); audit(req.user.id,'violation.updated',v.id); persist(); res.json({item:v}); });
app.post('/api/violations/:id/review', auth, requireRole('Administrator','Authority Reviewer'), (req,res)=>{ const v=store.violations.find(x=>x.id===req.params.id); if(!v)return res.status(404).json({error:'Violation not found.'}); const p=z.object({decision:z.enum(['Approved','Rejected','Under Review']),reason:z.string().trim().max(500).optional()}).safeParse(req.body); if(!p.success)return res.status(400).json({error:'Invalid review decision.'}); if(p.data.decision==='Rejected'&&(!p.data.reason||p.data.reason.length<5))return res.status(400).json({error:'A rejection reason of at least 5 characters is required.'}); const old=v.status; v.status=p.data.decision; v.reviewer=req.user.id; v.reason=p.data.reason||''; v.history=v.history||[]; v.history.unshift({actor:req.user.id,from:old,to:v.status,reason:v.reason,at:new Date().toISOString()}); audit(req.user.id,'violation.reviewed',v.id,`${old} -> ${v.status}; ${v.reason}`); persist(); res.json({item:v}); });
app.post('/api/violations/:id/evidence', auth, requireRole('Administrator','Authority Reviewer','Traffic Officer','Traffic Police'), (req,res)=>{ const v=store.violations.find(x=>x.id===req.params.id); if(!v)return res.status(404).json({error:'Violation not found.'}); if(!req.body||typeof req.body.data!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(req.body.data))return res.status(400).json({error:'Upload a PNG, JPEG, or WebP image.'}); const raw=Buffer.from(req.body.data.split(',')[1],'base64'); if(raw.length>5*1024*1024)return res.status(413).json({error:'Evidence image must be under 5 MB.'}); const ext=req.body.data.match(/^data:image\/(png|jpeg|webp)/)[1].replace('jpeg','jpg'); const name=`${v.id}-${randomBytes(6).toString('hex')}.${ext}`; fs.writeFileSync(path.join(evidenceDir,name),raw,{flag:'wx'}); v.evidenceUrl=`/evidence/${name}`; v.evidenceLabel='User-uploaded demo evidence'; audit(req.user.id,'evidence.uploaded',v.id,name); persist(); res.status(201).json({item:v}); });
app.get('/evidence/:name', auth, (req,res)=>{ if(!/^[A-Za-z0-9._-]+$/.test(req.params.name))return res.sendStatus(400); const file=path.join(evidenceDir,req.params.name); if(!fs.existsSync(file))return res.sendStatus(404); res.setHeader('Cache-Control','private, no-store'); res.sendFile(file); });
app.get('/api/ai/analyze', auth, requireRole('Administrator','Authority Reviewer','Traffic Officer','Traffic Police'), (req,res)=>{ const items=store.violations.map(v=>({...v,analysis:{mode:'SIMULATED RULE-BASED DEMO — not a trained ML model',predictedCategory:v.type,confidence:v.confidence,lowConfidence:v.confidence<store.rules.confidenceThreshold,explanation:v.explanation||'Category is copied from sample event metadata; no image/video inference was performed.',modelVersion:'rule-demo-v1',flagForReview:v.confidence<store.rules.confidenceThreshold||!v.evidenceUrl}})); res.json({items,threshold:store.rules.confidenceThreshold,mode:'simulated'}); });
app.get('/api/rules', auth, (req,res)=>res.json({rules:store.rules}));
app.put('/api/rules', auth, requireRole('Administrator'), (req,res)=>{const p=z.object({confidenceThreshold:z.coerce.number().min(0).max(1),categories:z.array(z.string().min(2).max(80)).min(1).max(30)}).safeParse(req.body); if(!p.success)return res.status(400).json({error:'Invalid rule configuration.'}); store.rules=p.data; audit(req.user.id,'rules.updated','rules'); persist(); res.json({rules:store.rules});});
app.get('/api/audit', auth, requireRole('Administrator'), (req,res)=>res.json({items:store.audit||[]}));
app.post('/api/access-requests', loginLimiter, (req,res)=>{const p=z.object({userId:z.string().trim().min(3).max(80),name:z.string().trim().min(2).max(100),email:z.string().email().max(160),reason:z.string().trim().min(10).max(500)}).safeParse(req.body); if(!p.success)return res.status(400).json({error:'Enter a valid ID, name, email, and reason (at least 10 characters).'}); if(store.accessRequests.some(x=>x.userId.toLowerCase()===p.data.userId.toLowerCase()&&x.status==='Pending'))return res.status(409).json({error:'A pending request already exists for this ID.'}); const item={...p.data,id:randomBytes(8).toString('hex'),status:'Pending',requestedAt:new Date().toISOString()}; store.accessRequests.unshift(item); audit(item.userId,'access.requested',item.id); persist(); res.status(201).json({item,message:'Request submitted and pending administrator approval.'});});
app.get('/api/access-requests', auth, requireRole('Administrator'), (req,res)=>res.json({items:store.accessRequests}));
app.post('/api/access-requests/:id/decision', auth, requireRole('Administrator'), (req,res)=>{const item=store.accessRequests.find(x=>x.id===req.params.id); if(!item)return res.status(404).json({error:'Request not found.'}); const p=z.object({decision:z.enum(['Approved','Rejected']),role:z.enum(['Authority Reviewer','Traffic Officer','Read-Only Viewer'])}).safeParse(req.body); if(!p.success)return res.status(400).json({error:'Invalid approval decision or role.'}); item.status=p.data.decision; item.assignedRole=p.data.role; item.reviewedBy=req.user.id; item.reviewedAt=new Date().toISOString(); audit(req.user.id,'access.'+item.status.toLowerCase(),item.id,p.data.role); persist(); res.json({item,message:'Request decision recorded. Account provisioning remains a separate secure setup step.'});});
app.get('/api/health', (req,res)=>res.json({ok:true,service:'city-police-traffic-portal',storage:'persistent-json-demo'}));

// Serve the production build if present; Vite handles the development frontend.
if (isProduction) {
  const dist = path.resolve(__dirname, '../dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.listen(PORT, () => console.log(`City Police demo API listening on http://localhost:${PORT}`));