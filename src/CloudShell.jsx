import React, { useEffect, useRef, useState } from 'react';
import { getSession, signInWithEmail, signUpWithEmail, signOut, loadTasks, insertTask, updateTaskRemote, softDeleteTask, subscribeToTasks } from './backend/taskRepository';
import { supabaseEnabled } from './backend/supabase';

const KEY = 'anyday.tasks';
const readLocal = () => { try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };

export default function CloudShell({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!supabaseEnabled);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const syncing = useRef(false);
  const known = useRef(new Map());

  useEffect(() => {
    if (!supabaseEnabled) return;
    let mounted = true;
    getSession().then(async current => {
      if (!mounted) return;
      setSession(current);
      if (current) await hydrate(current.user.id);
      setReady(true);
    }).catch(e => { if (mounted) { setError(e.message); setReady(true); } });
    return () => { mounted = false; };
  }, []);

  async function hydrate(userId) {
    const remote = await loadTasks();
    const local = readLocal();
    if (remote?.length) {
      localStorage.setItem(KEY, JSON.stringify(remote));
    } else if (local.length) {
      for (const task of local) {
        try { const saved = await insertTask(task, userId); if (saved) known.current.set(String(task.id), saved.id); } catch { /* keep local fallback */ }
      }
      const refreshed = await loadTasks();
      if (refreshed) localStorage.setItem(KEY, JSON.stringify(refreshed));
    }
    known.current = new Map(readLocal().map(t => [String(t.id), t]));
  }

  useEffect(() => {
    if (!session) return;
    const unsubscribe = subscribeToTasks(session.user.id, async payload => {
      if (payload.eventType === 'DELETE') return;
      const current = readLocal();
      const remote = payload.new;
      if (!remote) return;
      const next = {
        id: remote.id, title: remote.title, notes: remote.notes || '',
        date: remote.due_at ? remote.due_at.slice(0, 10) : 'upcoming',
        time: remote.due_at ? new Date(remote.due_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '',
        list: remote.list_id || 'Personal', tag: '',
        priority: ({0:'none',1:'low',2:'medium',3:'high'})[remote.priority] || 'none',
        pinned: Boolean(remote.pinned), done: Boolean(remote.completed),
        createdAt: remote.created_at, updatedAt: remote.updated_at, completedAt: remote.completed_at
      };
      const without = current.filter(t => String(t.id) !== String(next.id));
      localStorage.setItem(KEY, JSON.stringify([next, ...without]));
      window.dispatchEvent(new CustomEvent('anyday:remote-change'));
    });
    return unsubscribe;
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(async () => {
      if (syncing.current) return;
      const current = readLocal();
      const previous = known.current;
      syncing.current = true;
      try {
        for (const task of current) {
          const old = previous.get(String(task.id));
          if (!old) {
            const saved = await insertTask(task, session.user.id);
            if (saved && String(saved.id) !== String(task.id)) {
              const replaced = readLocal().map(t => String(t.id) === String(task.id) ? saved : t);
              localStorage.setItem(KEY, JSON.stringify(replaced));
            }
          } else if (JSON.stringify(old) !== JSON.stringify(task)) {
            await updateTaskRemote(task.id, task);
          }
        }
        for (const [id, old] of previous) {
          if (!current.some(t => String(t.id) === String(id))) await softDeleteTask(id);
        }
        known.current = new Map(readLocal().map(t => [String(t.id), t]));
      } catch (e) { setError(e.message); }
      finally { syncing.current = false; }
    }, 1500);
    return () => clearInterval(timer);
  }, [session]);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const next = authMode === 'signin' ? await signInWithEmail(email, password) : await signUpWithEmail(email, password);
      if (!next) { setError('Account created. Check your email if confirmation is enabled, then sign in.'); return; }
      setSession(next); await hydrate(next.user.id);
    } catch (e) { setError(e.message || 'Authentication failed.'); }
    finally { setBusy(false); }
  }

  if (!supabaseEnabled) return children;
  if (!ready) return <div style={screenStyle}><div style={cardStyle}><h1>AnyDay</h1><p>Connecting your task workspace…</p></div></div>;
  if (!session) return <div style={screenStyle}><form onSubmit={submit} style={cardStyle}><div style={{fontSize:12,fontWeight:700,letterSpacing:2,textTransform:'uppercase',opacity:.6}}>AnyDay</div><h1 style={{margin:'8px 0 6px'}}>Your day, organized.</h1><p style={{opacity:.7}}>Sign in to keep your complete task history synced across devices.</p><input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/><input required minLength={6} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle}/>{error && <div style={{color:'#ff8e8e',fontSize:13}}>{error}</div>}<button disabled={busy} style={buttonStyle}>{busy ? 'Please wait…' : authMode==='signin' ? 'Sign in' : 'Create account'}</button><button type="button" onClick={()=>{setAuthMode(v=>v==='signin'?'signup':'signin');setError('')}} style={linkButtonStyle}>{authMode==='signin' ? 'Create a free account' : 'Already have an account? Sign in'}</button></form></div>;
  return <div style={{minHeight:'100vh'}}>{children}<button onClick={async()=>{await signOut();setSession(null)}} style={signOutStyle}>Sign out</button></div>;
}

const screenStyle={minHeight:'100vh',display:'grid',placeItems:'center',background:'#141618',color:'#f7f2e9',fontFamily:'Inter,system-ui,sans-serif',padding:24};
const cardStyle={width:'min(440px,100%)',display:'grid',gap:14,padding:32,borderRadius:24,background:'#1e211f',border:'1px solid rgba(255,255,255,.09)',boxShadow:'0 24px 70px rgba(0,0,0,.35)'};
const inputStyle={padding:'14px 15px',borderRadius:12,border:'1px solid rgba(255,255,255,.12)',background:'#141618',color:'inherit',outline:'none'};
const buttonStyle={padding:'14px',border:0,borderRadius:12,background:'#2e4a3b',color:'#fff',fontWeight:700,cursor:'pointer'};
const linkButtonStyle={background:'none',border:0,color:'#d9c7a7',cursor:'pointer'};
const signOutStyle={position:'fixed',right:18,top:14,zIndex:1000,padding:'8px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'rgba(20,22,24,.85)',color:'#fff',cursor:'pointer'};
