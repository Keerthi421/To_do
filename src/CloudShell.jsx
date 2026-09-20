import React, { useEffect, useRef, useState } from 'react';
import { getSession, signInWithEmail, signUpWithEmail, signOut, loadTasks, insertTask, insertRecurringTask, updateTaskRemote, softDeleteTask, subscribeToTasks } from './backend/taskRepository';
import { supabase, supabaseEnabled } from './backend/supabase';
import { requestReminderPermission, syncReminders } from './backend/reminderScheduler';
import { makeRecurringCopy, nextOccurrence } from './backend/recurrence';

const KEY = 'anyday.tasks';
const USER_KEY = userId => `anyday.tasks.${userId}`;
const ACTIVE_USER_KEY = 'anyday.active-user';
const readLocal = () => { try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const writeLocal = tasks => localStorage.setItem(KEY, JSON.stringify(tasks));
const readScoped = userId => { try { const value = JSON.parse(localStorage.getItem(USER_KEY(userId)) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const writeScoped = (userId, tasks) => localStorage.setItem(USER_KEY(userId), JSON.stringify(tasks));

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
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession) await hydrate(nextSession.user.id);
      else {
        known.current = new Map();
        writeLocal([]);
        localStorage.removeItem(ACTIVE_USER_KEY);
      }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  async function hydrate(userId) {
    const previousUser = localStorage.getItem(ACTIVE_USER_KEY);
    const switchingAccount = Boolean(previousUser && previousUser !== userId);
    const scoped = readScoped(userId);
    const local = scoped.length ? scoped : (!previousUser && !switchingAccount ? readLocal() : []);
    writeLocal(local);
    localStorage.setItem(ACTIVE_USER_KEY, userId);
    const remote = await loadTasks();
    if (remote?.length) {
      writeLocal(remote);
      writeScoped(userId, remote);
    } else if (local.length) {
      const demoOnly = local.every(task => typeof task.id === 'number');
      if (demoOnly) { writeLocal([]); writeScoped(userId, []); }
      else {
        for (const task of local) {
          try { const saved = await insertTask(task, userId); if (saved) known.current.set(String(task.id), saved); } catch {}
        }
        const refreshed = await loadTasks();
        if (refreshed) { writeLocal(refreshed); writeScoped(userId, refreshed); }
      }
    }
    writeScoped(userId, readLocal());
    known.current = new Map(readLocal().map(t => [String(t.id), t]));
    syncReminders(readLocal());
    window.dispatchEvent(new CustomEvent('anyday:remote-change'));
  }

  useEffect(() => {
    if (!session) return;
    const unsubscribe = subscribeToTasks(session.user.id, async () => {
      try {
        const remote = await loadTasks();
        if (remote) {
          writeLocal(remote);
          writeScoped(session.user.id, remote);
          known.current = new Map(remote.map(t => [String(t.id), t]));
          syncReminders(remote);
          window.dispatchEvent(new CustomEvent('anyday:remote-change'));
        }
      } catch (e) { setError(e.message); }
    });
    return unsubscribe;
  }, [session]);

  useEffect(() => {
    const tasks = readLocal();
    syncReminders(tasks);
    if (tasks.some(t => t.reminderAt && !t.done)) requestReminderPermission().catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let live = true;
    const flush = async () => {
      if (!live || syncing.current) return;
      const current = readLocal();
      const previous = known.current;
      if (!current.length && !previous.size) return;
      syncing.current = true;
      try {
        for (const task of current) {
          const old = previous.get(String(task.id));
          if (!old) {
            const saved = await insertTask(task, session.user.id);
            if (saved) {
              const replaced = readLocal().map(t => String(t.id) === String(task.id) ? saved : t);
              writeLocal(replaced);
              writeScoped(session.user.id, replaced);
            }
          } else if (JSON.stringify(old) !== JSON.stringify(task)) {
            await updateTaskRemote(task.id, task);
            if (!old.done && task.done && task.recurrenceRule) {
              const dueAt = nextOccurrence(task);
              if (dueAt) {
                const recurringTask = makeRecurringCopy(task, dueAt);
                const saved = await insertRecurringTask(recurringTask, session.user.id, task.id, dueAt);
                if (saved && !current.some(t => String(t.id) === String(saved.id))) {
                  const nextTasks = [saved, ...readLocal()];
                  writeLocal(nextTasks);
                  writeScoped(session.user.id, nextTasks);
                }
              }
            }
          }
        }
        for (const [id] of previous) {
          if (!current.some(t => String(t.id) === String(id))) await softDeleteTask(id);
        }
        const latest = readLocal();
        writeScoped(session.user.id, latest);
        syncReminders(latest);
        known.current = new Map(latest.map(t => [String(t.id), t]));
      } catch (e) {
        setError(e.message);
      } finally {
        syncing.current = false;
      }
    };
    const onLocalChange = () => { flush(); };
    window.addEventListener('anyday:local-change', onLocalChange);
    window.addEventListener('storage', onLocalChange);
    const safetyTimer = setInterval(flush, 15000);
    flush();
    return () => {
      live = false;
      clearInterval(safetyTimer);
      window.removeEventListener('anyday:local-change', onLocalChange);
      window.removeEventListener('storage', onLocalChange);
    };
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

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      known.current = new Map();
      writeLocal([]);
      localStorage.removeItem(ACTIVE_USER_KEY);
      setSession(null);
    } catch (e) {
      setError(e.message || 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }

  if (supabaseEnabled && !ready) return <div style={screenStyle}><div style={cardStyle}><h1>AnyDay</h1><p>Connecting your task workspace…</p></div></div>;
  if (supabaseEnabled && !session) return <div style={screenStyle}><form onSubmit={submit} style={cardStyle}><div style={{fontSize:12,fontWeight:700,letterSpacing:2,textTransform:'uppercase',opacity:.6}}>AnyDay</div><h1 style={{margin:'8px 0 6px'}}>Your day, organized.</h1><p style={{opacity:.7}}>Sign in to keep your complete task history synced across devices.</p><input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/><input required minLength={6} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle}/>{error&&<div style={{color:'#ff8e8e',fontSize:13}}>{error}</div>}<button disabled={busy} style={buttonStyle}>{busy?'Please wait…':authMode==='signin'?'Sign in':'Create account'}</button><button type="button" onClick={()=>{setAuthMode(v=>v==='signin'?'signup':'signin');setError('')}} style={linkButtonStyle}>{authMode==='signin'?'Create a free account':'Already have an account? Sign in'}</button></form></div>;
  return <div style={{minHeight:'100vh'}}>{children}<button disabled={busy} onClick={handleSignOut} style={signOutStyle}>Sign out</button></div>;
}

const screenStyle={minHeight:'100vh',display:'grid',placeItems:'center',background:'#141618',color:'#f7f2e9',fontFamily:'Inter,system-ui,sans-serif',padding:24};
const cardStyle={width:'min(440px,100%)',display:'grid',gap:14,padding:32,borderRadius:24,background:'#1e211f',border:'1px solid rgba(255,255,255,.09)',boxShadow:'0 24px 70px rgba(0,0,0,.35)'};
const inputStyle={padding:'14px 15px',borderRadius:12,border:'1px solid rgba(255,255,255,.12)',background:'#141618',color:'inherit',outline:'none'};
const buttonStyle={padding:'14px',border:0,borderRadius:12,background:'#2e4a3b',color:'#fff',fontWeight:700,cursor:'pointer'};
const linkButtonStyle={background:'none',border:0,color:'#d9c7a7',cursor:'pointer'};
const signOutStyle={position:'fixed',right:18,top:14,zIndex:1000,padding:'8px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'rgba(20,22,24,.85)',color:'#fff',cursor:'pointer'};
