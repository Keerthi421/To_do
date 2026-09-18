import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, Ellipsis, Filter, Flag, Folder, Inbox, LayoutGrid, ListChecks, Menu,
  MoreHorizontal, Plus, Search, Settings, Sparkles, Tag, Target, Trash2, X, Zap
} from 'lucide-react';
import './styles.css';

const seedTasks = [
  { id: 1, title: 'Finish system design notes', date: 'today', time: '10:30 AM', list: 'Personal', tag: 'Work', priority: 'high', pinned: true, subtasks: 3, done: false },
  { id: 2, title: 'Review pull request', date: 'today', time: '1:00 PM', list: 'Work', tag: 'Work', priority: 'medium', pinned: false, subtasks: 0, done: false },
  { id: 3, title: 'Go for a 30 minute walk', date: 'today', time: '6:30 PM', list: 'Personal', tag: 'Health', priority: 'low', pinned: false, subtasks: 0, done: false },
  { id: 4, title: 'Prepare tomorrow\'s interview plan', date: 'tomorrow', time: '9:00 AM', list: 'Personal', tag: 'Important', priority: 'high', pinned: false, subtasks: 2, done: false },
  { id: 5, title: 'Buy groceries', date: 'tomorrow', time: '', list: 'Groceries', tag: '', priority: 'none', pinned: false, subtasks: 0, done: false },
  { id: 6, title: 'Read 20 pages', date: 'upcoming', time: '', list: 'Personal', tag: 'Personal', priority: 'none', pinned: false, subtasks: 0, done: false },
];

const navItems = [
  ['myday', 'My Day', Target], ['next7', 'Next 7 Days', CalendarDays], ['all', 'All Tasks', ListChecks], ['calendar', 'Calendar', CalendarDays]
];

function formatDate() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}

function App() {
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('anyday.tasks') || 'null') || seedTasks);
  const [view, setView] = useState('myday');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [newTask, setNewTask] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => localStorage.setItem('anyday.tasks', JSON.stringify(tasks)), [tasks]);

  const active = tasks.filter(t => !t.done && (!query || t.title.toLowerCase().includes(query.toLowerCase())));
  const today = active.filter(t => t.date === 'today');
  const tomorrow = active.filter(t => t.date === 'tomorrow');
  const upcoming = active.filter(t => t.date === 'upcoming');
  const selectedTask = tasks.find(t => t.id === selected) || null;

  function addTask(e) {
    e?.preventDefault();
    if (!newTask.trim()) return;
    const task = { id: Date.now(), title: newTask.trim(), date: view === 'myday' ? 'today' : 'upcoming', time: '', list: 'Personal', tag: '', priority: 'none', pinned: false, subtasks: 0, done: false, notes: '' };
    setTasks(v => [task, ...v]); setNewTask(''); setSelected(task.id);
  }
  function toggleTask(id) { setTasks(v => v.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function updateTask(id, patch) { setTasks(v => v.map(t => t.id === id ? { ...t, ...patch } : t)); }
  function deleteTask(id) { setTasks(v => v.filter(t => t.id !== id)); setSelected(null); }

  return <div className={dark ? 'app dark' : 'app'}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">✓</span><span>AnyDay</span></div>
      <button className="add-main" onClick={() => document.querySelector('.quick-add input')?.focus()}><Plus size={18}/> Add task</button>
      <div className="side-scroll">
        <div className="nav-group">
          {navItems.map(([id, label, Icon]) => <button key={id} className={view === id ? 'nav active' : 'nav'} onClick={() => setView(id)}><Icon size={18}/><span>{label}</span>{id === 'myday' && <span className="count">{today.length}</span>}</button>)}
        </div>
        <div className="side-label">MY LISTS <Plus size={14}/></div>
        {['Personal','Work','Groceries','Ideas'].map((x, i) => <button className="nav" key={x} onClick={() => setView('list:'+x)}><span className="list-dot" style={{'--dot': ['#f1b955','#72a7ff','#71c48c','#c18cff'][i]}}></span><span>{x}</span><span className="count">{tasks.filter(t=>t.list===x&&!t.done).length}</span></button>)}
        <div className="side-label">TAGS <Plus size={14}/></div>
        {['Important','Work','Personal','Health'].map(x => <button className="nav tag-nav" key={x}><Tag size={15}/><span>{x}</span></button>)}
        <div className="premium-card"><div className="premium-icon"><Sparkles size={16}/></div><div><strong>Unlock Premium</strong><p>Focus mode, AI, smart reminders & more.</p></div><ChevronRight size={15}/></div>
      </div>
      <div className="sidebar-bottom"><button className="nav"><CircleHelp size={18}/> Help & feedback</button><button className="nav" onClick={() => setShowSettings(true)}><Settings size={18}/> Settings</button><div className="profile"><div className="avatar">SK</div><div><strong>Keerthi</strong><small>Personal space</small></div><MoreHorizontal size={18}/></div></div>
    </aside>

    <main className="workspace">
      <header className="topbar">
        <div className="mobile-menu"><Menu size={20}/></div>
        <div className="crumb"><span>{view === 'myday' ? 'My Day' : view === 'next7' ? 'Next 7 Days' : view === 'all' ? 'All Tasks' : view === 'calendar' ? 'Calendar' : view.split(':')[1]}</span></div>
        <div className="top-actions"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search"/><kbd>⌘ K</kbd></div><button className="icon-btn" title="Notifications"><Bell size={19}/></button><button className="icon-btn" onClick={()=>setDark(v=>!v)} title="Toggle theme">◐</button></div>
      </header>

      {view === 'calendar' ? <Calendar tasks={tasks}/> : <div className="content">
        <section className={selectedTask ? 'task-area with-detail' : 'task-area'}>
          <div className="day-header"><div><h1>{view === 'myday' ? 'Good morning, Keerthi' : view === 'next7' ? 'Next 7 Days' : view === 'all' ? 'All Tasks' : view.split(':')[1]}</h1><p>{view === 'myday' ? formatDate() : 'Stay organized and keep moving forward.'}</p></div><div className="header-actions"><button className="soft-btn" onClick={()=>setShowSuggestions(true)}><Sparkles size={16}/> Suggestions</button><button className="icon-btn"><Filter size={17}/></button><button className="icon-btn"><Ellipsis size={18}/></button></div></div>
          {view === 'myday' && <div className="focus-strip"><div><Zap size={17}/><strong>Make today count</strong><span>Pick a few things you can realistically finish.</span></div><button onClick={()=>setShowSuggestions(true)}>Plan my day</button></div>}
          <TaskSection title="Today" tasks={view==='myday'?today:active} toggleTask={toggleTask} setSelected={setSelected}/>
          {view === 'myday' && <><TaskSection title="Tomorrow" tasks={tomorrow} toggleTask={toggleTask} setSelected={setSelected}/><TaskSection title="Upcoming" tasks={upcoming} toggleTask={toggleTask} setSelected={setSelected}/></>}
          <form className="quick-add" onSubmit={addTask}><Plus size={19}/><input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Add a task..."/><button type="submit">Add</button></form>
        </section>
        {selectedTask && <TaskDetail task={selectedTask} updateTask={updateTask} deleteTask={deleteTask} close={()=>setSelected(null)}/>} 
      </div>}
    </main>

    {showSuggestions && <Modal title="Smart suggestions" close={()=>setShowSuggestions(false)}><div className="suggestions"><p className="muted">Based on due dates, priorities and what is already planned.</p>{tasks.filter(t=>!t.done && t.date!=='today').slice(0,4).map(t=><div className="suggestion" key={t.id}><button onClick={()=>{updateTask(t.id,{date:'today'});setShowSuggestions(false)}}><Plus size={16}/></button><div><strong>{t.title}</strong><small>{t.date} · {t.list}</small></div><Sparkles size={15}/></div>)}</div></Modal>}
    {showSettings && <Modal title="Settings" close={()=>setShowSettings(false)}><div className="settings-list"><label>Default view<select><option>My Day</option><option>All Tasks</option><option>Next 7 Days</option></select></label><label>My Day reset time<input type="time" defaultValue="00:00"/></label><label>Daily planning reminders<input type="checkbox" defaultChecked/></label><label>Notifications<input type="checkbox" defaultChecked/></label></div></Modal>}
  </div>
}

function TaskSection({title,tasks,toggleTask,setSelected}) { return <section className="task-section"><div className="section-title"><span>{title}</span><span className="section-line"></span><span className="section-count">{tasks.length}</span></div>{tasks.length ? tasks.map(t=><TaskRow key={t.id} task={t} toggleTask={toggleTask} setSelected={setSelected}/>) : <div className="empty">Nothing here yet</div>}</section> }
function TaskRow({task,toggleTask,setSelected}) { return <div className={'task-row '+(task.pinned?'pinned':'')} onClick={()=>setSelected(task.id)}><button className="check" onClick={e=>{e.stopPropagation();toggleTask(task.id)}}>{task.done && <Check size={14}/>}</button><div className="task-copy"><div className="task-title">{task.title}</div><div className="task-meta">{task.time && <span><Clock3 size={12}/>{task.time}</span>}{task.tag && <span className="tag-pill">{task.tag}</span>}{task.subtasks>0 && <span>{task.subtasks} subtasks</span>}</div></div><div className="row-actions"><Flag size={15} className={task.priority==='high'?'flag-high':''}/><MoreHorizontal size={18}/></div></div> }

function TaskDetail({task,updateTask,deleteTask,close}) { const [note,setNote]=useState(task.notes||''); useEffect(()=>setNote(task.notes||''),[task.id]); return <aside className="detail"><div className="detail-head"><button className="icon-btn" onClick={close}><X size={18}/></button><div><button className="detail-chip"><Bell size={14}/> Remind me</button><button className="detail-chip"><Tag size={14}/> {task.tag||'Tags'}</button></div><button className="icon-btn" onClick={()=>deleteTask(task.id)}><Trash2 size={17}/></button></div><input className="detail-title" value={task.title} onChange={e=>updateTask(task.id,{title:e.target.value})}/><div className="detail-section"><div className="detail-label">LIST</div><button className="detail-select"><Folder size={15}/>{task.list}<ChevronDown size={15}/></button></div><div className="detail-section"><div className="detail-label">DUE DATE</div><div className="date-grid"><button className={task.date==='today'?'selected':''} onClick={()=>updateTask(task.id,{date:'today'})}>Today</button><button className={task.date==='tomorrow'?'selected':''} onClick={()=>updateTask(task.id,{date:'tomorrow'})}>Tomorrow</button><button className={task.date==='upcoming'?'selected':''} onClick={()=>updateTask(task.id,{date:'upcoming'})}>Upcoming</button></div></div><div className="detail-section"><div className="detail-label">SUBTASKS <span>{task.subtasks||0}/0</span></div><div className="subtask-input"><Plus size={16}/><input placeholder="Add a new subtask"/></div></div><div className="detail-section"><div className="detail-label">NOTES</div><textarea value={note} onChange={e=>{setNote(e.target.value);updateTask(task.id,{notes:e.target.value})}} placeholder="Insert your notes here..."/></div><div className="detail-section"><div className="detail-label">ATTACHMENTS</div><div className="attachment">Drop files here or <strong>browse</strong></div></div><div className="detail-footer"><button><Clock3 size={15}/> Focus</button><button><Flag size={15}/> Priority</button><button><MoreHorizontal size={15}/></button></div></aside> }

function Calendar({tasks}) { return <div className="calendar"><div className="calendar-top"><div><h1>Calendar</h1><p>Plan tasks and events in one place.</p></div><div className="month-nav"><button className="icon-btn"><ChevronLeft size={18}/></button><strong>{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date())}</strong><button className="icon-btn"><ChevronRight size={18}/></button></div></div><div className="week"><div className="calendar-head"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div><div className="calendar-grid">{Array.from({length:35},(_,i)=>{const d=i-1;return <div className={'cal-cell '+(d===new Date().getDate()?'today-cell':'')} key={i}><b>{d>0&&d<=31?d:''}</b>{d===new Date().getDate()&&tasks.filter(t=>t.date==='today').slice(0,2).map(t=><div className="cal-task" key={t.id}>{t.title}</div>)}</div>})}</div></div></div> }
function Modal({title,close,children}) { return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={close}><X size={18}/></button></div>{children}</div></div> }

createRoot(document.getElementById('root')).render(<App/>);
