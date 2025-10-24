/* Personal Dashboard - Vanilla JS
    Features: To-do, Calendar, Notes, Stopwatch, News, Weather, Clock, Transit Status
    Storage: localStorage
    No build tools. Single-file JS for simplicity.
*/

/* ---------- Utilities & Storage ---------- */
const Storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch(e){ return fallback; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

const State = {
  todos: Storage.get('dash_todos', []),
  notes: Storage.get('dash_notes', []),
  events: Storage.get('dash_events', {}), // keyed by ISO date
  ui: Storage.get('dash_ui', { theme: 'light', collapsed: {} }),
  stopwatch: Storage.get('dash_stopwatch', { laps: [] })
};

/* Save utility */
function persistAll() {
  Storage.set('dash_todos', State.todos);
  Storage.set('dash_notes', State.notes);
  Storage.set('dash_events', State.events);
  Storage.set('dash_ui', State.ui);
  Storage.set('dash_stopwatch', State.stopwatch);
}

/* ---------- Theme & UI ---------- */
const toggleTheme = document.getElementById('toggle-theme');
function applyTheme() {
  document.body.classList.toggle('dark', State.ui.theme === 'dark');
}
toggleTheme.addEventListener('click', () => {
  State.ui.theme = (State.ui.theme === 'dark') ? 'light' : 'dark';
  applyTheme(); persistAll();
});

/* Collapse widget control */
document.querySelectorAll('.widget .collapse').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const widget = e.target.closest('.widget');
    widget.classList.toggle('collapsed');
    const id = widget.id;
    State.ui.collapsed[id] = widget.classList.contains('collapsed');
    persistAll();
  });
});

/* Restore collapsed states */
window.addEventListener('load', () => {
  Object.keys(State.ui.collapsed || {}).forEach(id => {
    if (State.ui.collapsed[id]) document.getElementById(id)?.classList.add('collapsed');
  });
  applyTheme();
});

/* ---------- Clock ---------- */
function startClock(){
  const t = document.getElementById('clock-time');
  const z = document.getElementById('clock-zone');
  function tick(){
    const d = new Date();
    t.textContent = d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    z.textContent = d.toLocaleDateString();
  }
  tick(); setInterval(tick, 1000);
}
startClock();

/* ---------- Transit Status widget (Simulated) ---------- */
function loadTransitStatus(){
  const container = document.getElementById('transit-status');
  const alertsList = document.getElementById('transit-alerts');
  const statuses = [
    { status: "All Lines Operating Normally", color: "#10b981", alerts: ["No major delays reported."] }, // Green
    { status: "Minor Delays on Central Line", color: "#f59e0b", alerts: ["Central Line: 5-10 minute delays due to signal work.", "Metro North: Running on schedule."] }, // Amber
    { status: "Significant Delays on Express Line", color: "#ef4444", alerts: ["Express Line: Major disruption due to switch failure.", "Bus Route 42: Detoured due to road closure."] }, // Red
  ];
  
  // Randomly select a status
  const randomIndex = Math.floor(Math.random() * statuses.length);
  const data = statuses[randomIndex];

  container.querySelector('div:first-child').textContent = data.status;
  container.querySelector('div:first-child').style.color = data.color;
  
  alertsList.innerHTML = data.alerts.map(alert => `<li>${alert}</li>`).join('');
}
document.getElementById('btn-refresh').addEventListener('click', ()=>{
  loadTransitStatus(); loadWeather(); loadNews();
});
loadTransitStatus(); // Initial load

/* ---------- Weather widget (Open-Meteo, geolocation) ---------- */
async function loadWeather(){
  const el = document.getElementById('weather-content');
  el.innerHTML = `<div class="loading">Fetching weather…</div>`;
  if(!navigator.geolocation){
    el.innerHTML = `<div class="muted">Geolocation not supported.</div>`;
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    try{
      const lat = pos.coords.latitude.toFixed(4), lon = pos.coords.longitude.toFixed(4);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      const w = data.current_weather;
      el.innerHTML = `
        <div style="font-weight:700;font-size:18px">${w.temperature}°C • ${w.weathercode}</div>
        <div style="margin-top:6px;font-size:13px;color:var(--muted)">Wind ${w.windspeed} km/h • Updated ${new Date(w.time).toLocaleTimeString()}</div>
      `;
    }catch(e){
      el.innerHTML = `<div class="muted">Could not load weather.</div>`;
    }
  }, err=>{
    el.innerHTML = `<div class="muted">Location denied. Allow location to see weather.</div>`;
  });
}

/* ---------- To-Do widget (No changes needed) ---------- */
const todoInput = document.getElementById('todo-input');
const todoForm = document.getElementById('todo-form');
const todoList = document.getElementById('todo-list');
const todoCount = document.getElementById('todo-count');
let todoFilter = 'all';

function renderTodos(){
  todoList.innerHTML = '';
  const items = State.todos.filter(t=>{
    if(todoFilter==='pending') return !t.completed;
    if(todoFilter==='completed') return t.completed;
    return true;
  });
  items.forEach((t,i)=>{
    const li = document.createElement('li');
    const left = document.createElement('div'); left.className='left';
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = t.completed;
    cb.addEventListener('change', ()=>{
      State.todos[i].completed = cb.checked; persistAll(); renderTodos();
    });
    const span = document.createElement('span'); span.textContent = t.text;
    if(t.tag){ 
      const tag = document.createElement('span'); tag.className='tag'; tag.textContent = t.tag;
      left.appendChild(tag);
    }
    left.appendChild(cb); left.appendChild(span);
    const tools = document.createElement('div');
    const edit = document.createElement('button'); edit.textContent='✎';
    const del = document.createElement('button'); del.textContent='✖';
    edit.addEventListener('click', ()=>{
      const newText = prompt('Edit task', t.text);
      if(newText !== null){ State.todos[i].text = newText; persistAll(); renderTodos(); }
    });
    del.addEventListener('click', ()=>{
      if(confirm('Delete task?')){ State.todos.splice(i,1); persistAll(); renderTodos(); }
    });
    tools.appendChild(edit); tools.appendChild(del);
    li.appendChild(left); li.appendChild(tools);
    if(t.completed) li.classList.add('completed');
    todoList.appendChild(li);
  });
  todoCount.textContent = `${State.todos.length} tasks`;
}
todoForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const txt = todoInput.value.trim();
  const tag = document.getElementById('todo-tag').value;
  if(!txt) return;
  State.todos.unshift({ text:txt, completed:false, tag: tag || '' });
  todoInput.value=''; document.getElementById('todo-tag').value='';
  persistAll(); renderTodos();
});
document.getElementById('todo-clear-completed').addEventListener('click', ()=>{
  State.todos = State.todos.filter(t=>!t.completed); persistAll(); renderTodos();
});
document.getElementById('filter-all').addEventListener('click', ()=>{ todoFilter='all'; setFilterButtons(); renderTodos(); });
document.getElementById('filter-pending').addEventListener('click', ()=>{ todoFilter='pending'; setFilterButtons(); renderTodos(); });
document.getElementById('filter-completed').addEventListener('click', ()=>{ todoFilter='completed'; setFilterButtons(); renderTodos(); });
function setFilterButtons(){
  document.querySelectorAll('#widget-todo .wbody .todo-footer button').forEach(b=>b.classList.remove('active'));
  if(todoFilter==='all') document.getElementById('filter-all').classList.add('active');
  if(todoFilter==='pending') document.getElementById('filter-pending').classList.add('active');
  if(todoFilter==='completed') document.getElementById('filter-completed').classList.add('active');
}

/* ---------- Notes widget (No changes needed) ---------- */
const noteForm = document.getElementById('note-form');
const notesList = document.getElementById('notes-list');
function renderNotes(){
  notesList.innerHTML = '';
  State.notes.forEach((n,i)=>{
    const li = document.createElement('li');
    li.innerHTML = `<strong>${n.title||'Untitled'}</strong><div style="font-size:13px;color:var(--muted);margin-top:6px">${n.body}</div>`;
    const r = document.createElement('div');
    const del = document.createElement('button'); del.textContent='Delete';
    del.addEventListener('click', ()=>{ if(confirm('Delete note?')){ State.notes.splice(i,1); persistAll(); renderNotes(); }});
    r.appendChild(del); li.appendChild(r);
    notesList.appendChild(li);
  });
}
noteForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const t = document.getElementById('note-title').value.trim();
  const b = document.getElementById('note-body').value.trim();
  if(!b && !t) return;
  State.notes.unshift({ title:t, body:b, created: new Date().toISOString() });
  document.getElementById('note-title').value=''; document.getElementById('note-body').value='';
  persistAll(); renderNotes();
});

/* ---------- Stopwatch widget (No changes needed) ---------- */
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;

const swTime = document.getElementById('stopwatch-time');
const swStartBtn = document.getElementById('stopwatch-start');
const swResetBtn = document.getElementById('stopwatch-reset');
const swLapBtn = document.getElementById('stopwatch-lap');
const swLapList = document.getElementById('stopwatch-laps');

function formatTime(ms) {
  const date = new Date(ms);
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const milliseconds = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
  return `${minutes}:${seconds}.${milliseconds}`;
}

function renderStopwatch() {
  swTime.textContent = formatTime(elapsedTime);
  swLapList.innerHTML = '';
  
  // Render laps in reverse order (most recent lap at the top)
  State.stopwatch.laps.slice().reverse().forEach((lap, index) => {
    const li = document.createElement('li');
    // Calculate lap number correctly for the reversed list
    const lapNum = State.stopwatch.laps.length - index;
    const lapTimeFormatted = formatTime(lap.time);
    const overallTime = formatTime(lap.accumulatedTime);
    
    // Add lap number, lap time, and total time
    li.innerHTML = `
      <span style="font-weight:600">Lap ${lapNum}</span> 
      <span style="font-size:12px; color:var(--accent)">${lapTimeFormatted}</span>
      <span>${overallTime}</span>
    `;
    swLapList.appendChild(li);
  });
}

function startStopwatch() {
  if (!timerInterval) {
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(updateStopwatch, 10);
    swStartBtn.textContent = 'Pause';
    swStartBtn.classList.add('active'); 
    swResetBtn.disabled = false;
    swLapBtn.disabled = false;
  } else {
    clearInterval(timerInterval);
    timerInterval = null;
    swStartBtn.textContent = 'Start';
    swStartBtn.classList.remove('active');
  }
}

function updateStopwatch() {
  elapsedTime = Date.now() - startTime;
  renderStopwatch();
}

function resetStopwatch() {
  clearInterval(timerInterval);
  timerInterval = null;
  elapsedTime = 0;
  startTime = 0;
  State.stopwatch.laps = [];
  swStartBtn.textContent = 'Start';
  swStartBtn.classList.remove('active');
  swResetBtn.disabled = true;
  swLapBtn.disabled = true;
  persistAll();
  renderStopwatch();
}

function lapStopwatch() {
  let previousTotalTime = 0;
  if (State.stopwatch.laps.length > 0) {
      previousTotalTime = State.stopwatch.laps[State.stopwatch.laps.length - 1].accumulatedTime;
  }
  
  const currentLapTime = elapsedTime - previousTotalTime;
  
  if (currentLapTime > 0) {
    // Save lap time and the overall time (accumulatedTime)
    State.stopwatch.laps.push({ 
      time: currentLapTime, 
      accumulatedTime: elapsedTime 
    });
    persistAll();
    renderStopwatch();
  }
}

swStartBtn.addEventListener('click', startStopwatch);
swResetBtn.addEventListener('click', resetStopwatch);
swLapBtn.addEventListener('click', lapStopwatch);

// Initial render for stopwatch
renderStopwatch();

/* ---------- News Feed widget (using News API) ---------- */
// ⚠️ ACTION REQUIRED: Replace 'YOUR_NEWS_API_KEY' with your actual key from https://newsapi.org/
const NEWS_API_KEY = 'YOUR_NEWS_API_KEY'; 
const NEWS_API_ENDPOINT = 'https://newsapi.org/v2/top-headlines';

async function loadNews(){
  const category = document.getElementById('news-category').value;
  const ul = document.getElementById('news-list');
  ul.innerHTML = '<li>Loading news…</li>';
  
  if(NEWS_API_KEY === 'YOUR_NEWS_API_KEY') {
    ul.innerHTML = `
      <li><a href="#" onclick="return false;">
        <div style="font-weight:600; color:#d97706;">API Key Required 🔑</div>
        <div style="color:var(--muted);font-size:13px;margin-top:4px">Please get a free key from News API and replace the placeholder in app.js.</div>
      </a></li>
      <li><a href="https://newsapi.org/register" target="_blank">
        <div style="font-weight:600">Get a Free Key Here</div>
      </a></li>`;
    return;
  }
  
  try{
    const url = `${NEWS_API_ENDPOINT}?category=${category}&language=en&country=us&pageSize=10&apiKey=${NEWS_API_KEY}`;
    const res = await fetch(url);
    const j = await res.json();
    
    if(!res.ok || j.status !== 'ok') {
      let message = j.message || 'Failed to fetch news. Check API Key or console.';
      if (j.code === 'apiKeyInvalid' || j.code === 'apiKeyMissing') message = 'API Key is invalid or missing.';
      throw new Error(message);
    }
    
    ul.innerHTML = '';
    
    if (j.articles && j.articles.length > 0) {
      j.articles.forEach(a=>{
        const li = document.createElement('li');
        li.innerHTML = `<a href="${a.url}" target="_blank">
          <div style="font-weight:600">${a.title}</div>
          <div style="color:var(--muted);font-size:13px;margin-top:4px">${a.source.name || 'Unknown Source'}</div>
        </a>`;
        ul.appendChild(li);
      });
    } else {
      ul.innerHTML = '<li>No news found for this category.</li>';
    }

  }catch(e){
    ul.innerHTML = `<li><div style="color:red; font-weight:600;">Error Loading News:</div> ${e.message}</li>`;
  }
}

document.getElementById('news-refresh').addEventListener('click', loadNews);
document.getElementById('news-category').addEventListener('change', loadNews);


/* ---------- Simple Calendar (BUG FIX APPLIED) ---------- */
let calDate = new Date();
const calGrid = document.getElementById('calendar-grid');
const calMonthTitle = document.getElementById('cal-month');

function startCalendar(){
  renderCalendar();
  document.getElementById('cal-prev').addEventListener('click', ()=>{ calDate.setMonth(calDate.getMonth()-1); renderCalendar(); });
  document.getElementById('cal-next').addEventListener('click', ()=>{ calDate.setMonth(calDate.getMonth()+1); renderCalendar(); });
}
function renderCalendar(){
  calGrid.innerHTML = '';
  const y = calDate.getFullYear(), m = calDate.getMonth();
  calMonthTitle.textContent = calDate.toLocaleString(undefined,{month:'long',year:'numeric'});
  const first = new Date(y,m,1); const startDay = first.getDay(); // 0..6
  const daysInMonth = new Date(y,m+1,0).getDate();
  // previous month days
  const prevDays = startDay;
  const prevLast = new Date(y,m,0).getDate();
  for(let i=prevLast - prevDays +1; i<=prevLast; i++){
    const d = document.createElement('div'); d.className='day other'; d.textContent = i;
    calGrid.appendChild(d);
  }
  // current month
  for(let d=1; d<=daysInMonth; d++){
    const cell = document.createElement('div'); cell.className='day';
    
    // FIX: Create a date object using UTC midnight and then format it to ISO string
    // This prevents the date from shifting to the previous day due to local timezone offset.
    const tempDate = new Date(Date.UTC(y, m, d)); 
    const iso = tempDate.toISOString().slice(0,10);
    
    cell.textContent = d;
    if(State.events[iso]) cell.classList.add('has-event');
    cell.addEventListener('click', ()=>{ showEventsFor(iso); });
    calGrid.appendChild(cell);
  }
  // next month filler
  const totalCells = calGrid.children.length;
  for(let i=totalCells;i<42;i++){
    const d = document.createElement('div'); d.className='day other'; d.textContent = '';
    calGrid.appendChild(d);
  }
}

function showEventsFor(iso){
  const container = document.getElementById('calendar-events');
  const list = State.events[iso] || [];
  // Use a temporary date for display only
  const displayDate = new Date(iso + 'T00:00:00'); 
  const title = displayDate.toLocaleDateString();
  
  const html = `<h4>${title}</h4>
    <ul>${list.map((ev,idx)=>`<li style="margin-bottom:6px">${ev} <button data-iso="${iso}" data-idx="${idx}">del</button></li>`).join('')}</ul>
    <div style="margin-top:8px">
      <input id="cal-event-input" placeholder="Add event" style="padding:6px;border-radius:6px"> <button id="cal-event-add">Add</button>
    </div>`;
  container.innerHTML = html;
  container.querySelector('#cal-event-add').addEventListener('click', ()=>{
    const v = document.getElementById('cal-event-input').value.trim(); if(!v) return;
    State.events[iso] = State.events[iso] || []; State.events[iso].push(v);
    persistAll(); renderCalendar(); showEventsFor(iso);
  });
  container.querySelectorAll('button[data-iso]').forEach(b=>{
    b.addEventListener('click', (e)=>{
      const iso = e.target.dataset.iso, idx = +e.target.dataset.idx;
      State.events[iso].splice(idx,1);
      if(State.events[iso].length===0) delete State.events[iso];
      persistAll(); renderCalendar(); showEventsFor(iso);
    });
  });
}

/* ---------- Init / boot ---------- */
function boot(){
  renderTodos(); setFilterButtons();
  renderNotes();
  loadNews();
  startCalendar();
  loadWeather();
}
boot();

/* Expose small helper for dev */
window._DASH = { State, persistAll };