import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, Ellipsis, Filter, Flag, Folder, Inbox, Menu, MoreHorizontal, Plus,
  Search, Settings, Sparkles, Tag, Target, Trash2, X, Zap, SlidersHorizontal,
  RefreshCw, Headphones, LayoutGrid, ChevronUp, Paperclip, Pin, CheckCircle2
} from 'lucide-react';
import './styles.css';
import './history.css';

const initialTasks = [
  { id: 1, title: 'To-do app completion', date: 'today', time: '', list: 'Personal', tag: '', priority: 'none', pinned: false, done: false },
  { id: 2, title: 'check all the projects to be deployed', date: 'today', time: '', list: 'Personal', tag: '', priority: 'none', pinned: false, done: false },
  { id: 3, title: 'New System design now', date: 'today', time: '', list: 'Personal', tag: '', priority: 'none', pinned: false, done: false },
  { id: 4, title: 'Yesterdays System Design', date: 'today', time: '', list: 'Personal', tag: '', priority: 'none', pinned: false, done: false },
  { id: 5, title: 'Finish resume updates', date: 'today', time: '4:00 PM', list: 'Personal', tag: 'Work', priority: 'high', pinned: true, done: false },
  { id: 6, title: 'Review tomorrow interview plan', date: 'tomorrow', time: '9:00 AM', list: 'Personal', tag: '', priority: 'medium', pinned: false, done: false },
  { id: 7, title: 'Buy groceries', date: 'upcoming', time: '', list: 'Personal', tag: '', priority: 'none', pinned: false, done: false },
];

const lists = ['Personal', 'Work'];
const tags = ['Important', 'Work', 'Personal', 'Health'];
const navItems = [
  ['myday', 'My day', Target],
  ['next7', 'Next 7 days', CalendarDays],
  ['all', 'All my tasks', Inbox],
  ['calendar', 'My Calendar', CalendarDays],
];

const todayLabel = () => new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date());
const dateLabel = (date) => ({ today: 'Today', tomorrow: 'Tomorrow', upcoming: 'Upcoming' }[date] || date || 'No date');

function App() {
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('anyday.tasks') || 'null') || initialTasks);
  const [view, setView] = useState('myday');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [newTask, setNewTask] = useState('');
  const [suggestions, setSuggestions] = useState(true);
  const [settings, setSettings] = useState(false);
  const [notice, setNotice] = useState(true);
  const [dark, setDark] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => localStorage.setItem('anyday.tasks', JSON.stringify(tasks)), [tasks]);

  const matches = useMemo(() => tasks.filter(t => (!query || t.title.toLowerCase().includes(query.toLowerCase())) && (filter === 'all' || t.priority === filter)), [tasks, query, filter]);
  const active = matches.filter(t => !t.done);
  const allTasks = matches;
  const myDay = active.filter(t => t.date === 'today');
  const selectedTask = tasks.find(t => t.id === selected) || null;

  const addTask = e => {
    e?.preventDefault();
    if (!newTask.trim()) return;
    const task = { id: Date.now(), title: newTask.trim(), date: view === 'myday' ? 'today' : 'upcoming', time: '', list: 'Personal', tag: '', priority: 'none', pinned: false, done: false, notes: '' };
    setTasks(v => [task, ...v]); setNewTask(''); setSelected(task.id);
  };
  const updateTask = (id, patch) => setTasks(v => v.map(t => t.id === id ? { ...t, ...patch } : t));
  const toggleTask = id => setTasks(v => v.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = id => { setTasks(v => v.filter(t => t.id !== id)); setSelected(null); };

  return <div className={dark ? 'app dark' : 'app'}>
    {notice && <div className="permission-banner">Any.do needs your permission to <u>enable reminder and calendar notifications</u><button onClick={() => setNotice(false)}><X size={20}/></button></div>}

    <aside className={mobileNav ? 'sidebar mobile-open' : 'sidebar'}>
      <div className="account"><div className="gear-circle"><Settings size={22}/></div><div><strong>Sree</strong><span>All features enabled</span></div></div>
      <button className="primary-add" onClick={() => document.querySelector('.quick-add input')?.focus()}><Plus size={18}/> Add task</button>
      <div className="side-scroll">
        <div className="nav-group">
          {navItems.map(([id, label, Icon]) => <button key={id} className={view === id ? 'nav active' : 'nav'} onClick={() => {setView(id); setMobileNav(false)}}><Icon size={19}/><span>{label}</span>{id === 'myday' && <em>{myDay.length}</em>}{id === 'next7' && <em>{active.length}</em>}{id === 'all' && <em>{allTasks.length}</em>}</button>)}
        </div>
        <div className="side-heading"><span>My lists <span className="lock">⌑</span></span><button><Plus size={19}/></button></div>
        {lists.map((x, i) => <button className="nav list-nav" key={x} onClick={() => setView('list:'+x)}><span className={'list-dot dot-'+i}></span><span>{x}</span><em>{tasks.filter(t => t.list === x && !t.done).length}</em></button>)}
        <div className="side-heading"><span>Tags</span><button><Plus size={19}/></button></div>
        {tags.map(x => <button className="nav tag-nav" key={x}><Tag size={15}/><span>{x}</span></button>)}
        <div className="collab-card"><button className="collab-close">×</button><strong>Everything is available<br/>in your personal workspace<span>.</span></strong><div className="bubbles"><i></i><i></i><i></i></div><button className="try-btn">Explore</button></div>
      </div>
      <div className="side-bottom"><button className="nav"><CircleHelp size={19}/> Help & feedback</button><button className="nav" onClick={() => setSettings(true)}><Settings size={19}/> Settings</button></div>
    </aside>

    <main className="workspace">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(v=>!v)}><Menu size={22}/></button>
        <div className="brand-small">AnyDay</div>
        <div className="top-icons">
          <button title="Sync"><RefreshCw size={19}/></button><button title="Help"><Headphones size={20}/></button><button className="notify" title="Notifications"><Inbox size={20}/><i></i></button><button onClick={() => setDark(v=>!v)} title="Theme">◐</button>
        </div>
      </header>

      <div className="main-grid">
        <section className="day-panel">
          {view === 'myday' ? <>
            <div className="hero-copy"><h1>Good Afternoon, Sree<span>.</span></h1><h2>You are what you do</h2></div>
            <div className="calendar-connect"><div className="date-block"><b>FRI</b><strong>18</strong><span>September</span></div><div className="connect-copy"><strong>Join video meetings with one tap</strong><div><button>📅 Connect Google Calendar</button><button>▣ Connect Outlook Calendar</button><button>☁ Connect iCloud Calendar</button></div></div></div>
            <TaskList tasks={myDay} toggleTask={toggleTask} selectTask={setSelected} />
            <form className="quick-add" onSubmit={addTask}><Plus size={20}/><input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Enter task title"/><button type="submit" aria-label="add"><ArrowUpIcon/></button></form>
          </> : view === 'calendar' ? <Calendar tasks={tasks}/> : <GenericView view={view} tasks={view === 'all' ? allTasks : active} allTasks={allTasks} toggleTask={toggleTask} selectTask={setSelected} addTask={addTask} newTask={newTask} setNewTask={setNewTask}/>} 
        </section>

        <aside className="right-panel">
          <div className="right-tools"><button className="suggestions-title" onClick={() => setSuggestions(v=>!v)}><Sparkles size={19}/> Suggestions</button><button onClick={()=>setShowFilters(v=>!v)}><FilterIcon/></button><button onClick={()=>setSettings(true)}><Settings size={19}/></button></div>
          <div className="filter-row"><span>Filter</span><button onClick={()=>setShowFilters(v=>!v)}><SlidersHorizontal size={17}/></button></div>
          {showFilters && <div className="filter-menu"><button onClick={()=>setFilter('all')}>All tasks</button><button onClick={()=>setFilter('high')}>High priority</button><button onClick={()=>setFilter('medium')}>Medium priority</button></div>}
          {suggestions && <div className="suggestion-stack">
            <Suggestion title="Watch My day tutorial" meta="From 0 days ago" add={()=>updateTask(7,{date:'today'})}/>
            <Suggestion title="Add me to My Day" meta="Recently active" add={()=>updateTask(6,{date:'today'})}/>
          </div>}
          <div className="tutorial-card"><div className="fake-video"><div className="play">▶</div></div><strong>Tap to learn about My day</strong></div>
        </aside>
      </div>
    </main>

    {selectedTask && <TaskDetail task={selectedTask} updateTask={updateTask} deleteTask={deleteTask} close={()=>setSelected(null)}/>} 
    {settings && <SettingsModal close={()=>setSettings(false)} dark={dark} setDark={setDark}/>} 
  </div>;
}

function ArrowUpIcon(){ return <span className="arrow-up">↑</span> }
function FilterIcon(){ return <span className="filter-lines">≡</span> }

function TaskList({tasks,toggleTask,selectTask}) { return <div className="task-list">{tasks.length ? tasks.map(t => <TaskRow key={t.id} task={t} toggleTask={toggleTask} selectTask={selectTask}/>) : <div className="empty-state">Your day is clear. Add a task below.</div>}</div> }
function TaskRow({task,toggleTask,selectTask}) { return <div className={'task-row '+(task.pinned?'pinned ':'')+(task.done?'completed':'')} onClick={()=>selectTask(task.id)}><button className="circle-check" onClick={e=>{e.stopPropagation();toggleTask(task.id)}}>{task.done && <Check size={14}/>}</button><div className="task-text"><div>{task.title}</div>{(task.time||task.tag||task.priority!=='none') && <small>{task.time}{task.tag && ` · ${task.tag}`}{task.priority!=='none' && ` · ${task.priority}`}</small>}</div><div className="task-end">{task.pinned && <Pin size={13}/>}<MoreHorizontal size={20}/></div></div> }
function Suggestion({title,meta,add}) { return <div className="suggestion-card"><button className="plus-suggest" onClick={add}><Plus size={19}/></button><div><div className="suggestion-source">⌑ My lists &gt; Personal</div><strong>{title}</strong><small>{meta}</small></div></div> }

function GenericView({view,tasks,allTasks,toggleTask,selectTask,addTask,newTask,setNewTask}) {
  const title = view==='next7'?'Next 7 days':view==='all'?'All my tasks':view.startsWith('list:')?view.split(':')[1]:'My Calendar';
  return <>
    <div className="generic-head"><div><h1>{title}</h1><p>{view === 'all' ? `${allTasks.length} task${allTasks.length === 1 ? '' : 's'} across all entered days` : 'Plan, organize and get things done.'}</p></div><button><Filter size={17}/></button></div>
    {view === 'all' ? <AllTasksHistory tasks={tasks} toggleTask={toggleTask} selectTask={selectTask}/> : <TaskList tasks={tasks} toggleTask={toggleTask} selectTask={selectTask}/>} 
    <form className="quick-add" onSubmit={addTask}><Plus size={20}/><input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Enter task title"/><button type="submit"><ArrowUpIcon/></button></form>
  </>
}

function AllTasksHistory({tasks,toggleTask,selectTask}) {
  const groups = ['today','tomorrow','upcoming'];
  const known = groups.map(date => ({date, tasks: tasks.filter(t => t.date === date)})).filter(g => g.tasks.length);
  const dated = tasks.filter(t => !groups.includes(t.date));
  if (dated.length) known.push({date:'other', tasks:dated});
  if (!known.length) return <div className="history-empty"><CheckCircle2 size={34}/><h3>No tasks yet</h3><p>Every task you enter will remain here, including completed tasks and tasks from previous days.</p></div>;
  return <div className="all-history">
    <div className="history-summary"><span><CheckCircle2 size={16}/> All entered tasks</span><strong>{tasks.length}</strong><span className="history-done">{tasks.filter(t=>t.done).length} completed</span></div>
    {known.map(group => <section className="history-group" key={group.date}><div className="history-heading"><span>{dateLabel(group.date)}</span><em>{group.tasks.length}</em></div>{group.tasks.map(t=><TaskRow key={t.id} task={t} toggleTask={toggleTask} selectTask={selectTask}/>)}</section>)}
  </div>
}

function Calendar({tasks}) { const d = new Date(); return <div className="calendar-view"><div className="generic-head"><div><h1>My Calendar</h1><p>See your tasks and events together.</p></div><div className="month-nav"><button><ChevronLeft size={17}/></button><strong>{d.toLocaleString('en-US',{month:'long',year:'numeric'})}</strong><button><ChevronRight size={17}/></button></div></div><div className="calendar-grid">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><div className="calendar-day-name" key={x}>{x}</div>)}{Array.from({length:35},(_,i)=>{const n=i-1; return <div className={'calendar-cell '+(n===18?'today':'')} key={i}><b>{n>0&&n<=30?n:''}</b>{n===18 && tasks.filter(t=>t.date==='today').slice(0,2).map(t=><div className="calendar-task" key={t.id}>{t.title}</div>)}</div>})}</div></div> }

function TaskDetail({task,updateTask,deleteTask,close}) { const [note,setNote]=useState(task.notes||''); const [subtasks,setSubtasks]=useState([]); const [sub,setSub]=useState(''); useEffect(()=>setNote(task.notes||''),[task.id]); const addSub=()=>{if(sub.trim()){setSubtasks(v=>[...v,sub.trim()]);setSub('')}}; return <aside className="detail-panel"><div className="detail-top"><button onClick={close}><X size={19}/></button><div><button><Bell size={15}/> Remind me</button><button><Tag size={15}/> {task.tag||'Tags'}</button></div><button onClick={()=>deleteTask(task.id)}><Trash2 size={17}/></button></div><input className="detail-title" value={task.title} onChange={e=>updateTask(task.id,{title:e.target.value})}/><DetailSection label="LIST"><button className="select-detail"><Folder size={15}/>{task.list}<ChevronDown size={15}/></button></DetailSection><DetailSection label="DUE DATE"><div className="date-options"><button className={task.date==='today'?'chosen':''} onClick={()=>updateTask(task.id,{date:'today'})}>Today</button><button className={task.date==='tomorrow'?'chosen':''} onClick={()=>updateTask(task.id,{date:'tomorrow'})}>Tomorrow</button><button className={task.date==='upcoming'?'chosen':''} onClick={()=>updateTask(task.id,{date:'upcoming'})}>Upcoming</button></div></DetailSection><DetailSection label={`SUBTASKS ${subtasks.length?subtasks.length:0}`}><div className="sub-add"><Plus size={16}/><input value={sub} onChange={e=>setSub(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSub()} placeholder="Add a new subtask"/></div>{subtasks.map((s,i)=><div className="sub-item" key={i}><CheckCircle2 size={15}/>{s}</div>)}</DetailSection><DetailSection label="NOTES"><textarea value={note} onChange={e=>{setNote(e.target.value);updateTask(task.id,{notes:e.target.value})}} placeholder="Insert your notes here..."/></DetailSection><DetailSection label="ATTACHMENTS"><div className="attachment"><Paperclip size={16}/> Drop files here or <b>browse</b></div></DetailSection><div className="detail-bottom"><button><Clock3 size={15}/> Focus</button><button><Flag size={15}/> Priority</button><button><MoreHorizontal size={16}/></button></div></aside> }
function DetailSection({label,children}){return <div className="detail-section"><div className="detail-label">{label}</div>{children}</div>}
function SettingsModal({close,dark,setDark}) { return <div className="overlay" onMouseDown={close}><div className="settings-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>Settings</h2><button onClick={close}><X size={19}/></button></div><div className="settings-tabs"><b>My Day</b><span>General</span><span>Notifications</span><span>Integrations</span></div><label>My Day reset time<input type="time" defaultValue="00:00"/></label><label>Smart Suggestions<div className="switch on"></div></label><label>Daily push notifications<div className="switch on"></div></label><label>Appearance<button className="appearance" onClick={()=>setDark(v=>!v)}>{dark?'Dark':'Light'} <ChevronDown size={14}/></button></label><button className="close-settings" onClick={close}>Done</button></div></div> }

createRoot(document.getElementById('root')).render(<App/>);
