const state = { manifest: null, roomIndex: 0, notes: {}, bookmarks: [] };

const els = {
  roomLabel: document.getElementById('roomLabel'),
  roomContent: document.getElementById('roomContent'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  mapDrawer: document.getElementById('mapDrawer'),
  mapList: document.getElementById('mapList'),
  btnMap: document.getElementById('btnMap'),
  btnCloseMap: document.getElementById('btnCloseMap'),
  btnNotes: document.getElementById('btnNotes'),
  notesPane: document.getElementById('notesPane'),
  notesField: document.getElementById('notesField'),
  btnClearNotes: document.getElementById('btnClearNotes'),
  btnBookmark: document.getElementById('btnBookmark'),
  bubble: document.getElementById('bubble'),
  btnAudio: document.getElementById('btnAudio'),
  audioPanel: document.getElementById('audioPanel'),
  btnCloseAudio: document.getElementById('btnCloseAudio'),
  audio: document.getElementById('audio'),
};

function pad3(n){ return String(n).padStart(3,'0'); }

function loadLocal(){
  const idx = localStorage.getItem('hr_room_index');
  if (idx) state.roomIndex = parseInt(idx,10) || 0;
  try{ state.notes = JSON.parse(localStorage.getItem('hr_notes')||'{}'); }catch{ state.notes = {}; }
  try{ state.bookmarks = JSON.parse(localStorage.getItem('hr_bookmarks')||'[]'); }catch{ state.bookmarks = []; }
}

function saveLocal(){
  localStorage.setItem('hr_room_index', String(state.roomIndex));
  localStorage.setItem('hr_notes', JSON.stringify(state.notes||{}));
  localStorage.setItem('hr_bookmarks', JSON.stringify(state.bookmarks||[]));
}

async function fetchText(url){
  const res = await fetch(url, {cache:'no-cache'});
  if(!res.ok) throw new Error('Failed to load '+url);
  return await res.text();
}

function setRoomLabel(room){
  els.roomLabel.textContent = `Room ${pad3(room.id)} · ${room.archetype}`;
  document.title = `Room ${pad3(room.id)} — The House We Live In`;
}

function bindGlossary(){
  const defs = els.roomContent.querySelectorAll('[data-def]');
  defs.forEach(el=>{
    el.addEventListener('mouseenter', (e)=> showBubble(e, el.getAttribute('data-def')));
    el.addEventListener('mouseleave', hideBubble);
    el.addEventListener('click', (e)=>{
      e.preventDefault();
      showBubble(e, el.getAttribute('data-def'), true);
    });
  });
}

function showBubble(evt, text, sticky=false){
  els.bubble.hidden = false;
  els.bubble.textContent = text;
  const x = evt.clientX + 12;
  const y = evt.clientY + 12;
  els.bubble.style.left = x + 'px';
  els.bubble.style.top = y + 'px';
  if(sticky){
    setTimeout(()=> document.addEventListener('click', hideBubble, {once:true}), 0);
  }
}
function hideBubble(){ els.bubble.hidden = true; }

function loadNotes(roomId){
  const key = String(roomId);
  els.notesField.value = state.notes[key] || '';
}
function saveNotes(roomId){
  const key = String(roomId);
  state.notes[key] = els.notesField.value || '';
  saveLocal();
}

async function renderRoom(){
  const room = state.manifest.rooms[state.roomIndex];
  if(!room) return;
  setRoomLabel(room);

  const html = await fetchText(room.body);
  els.roomContent.innerHTML = html;

  loadNotes(room.id);

  if(room.audio){
    els.audio.src = room.audio;
  }else{
    els.audio.removeAttribute('src');
    els.audio.load();
  }

  bindGlossary();
  saveLocal();
}

function renderMap(){
  els.mapList.innerHTML = '';
  state.manifest.rooms.forEach((r, idx)=>{
    const div = document.createElement('div');
    div.className = 'hr-map-item';
    div.innerHTML = `
      <div>
        <div class="hr-map-title">Room ${pad3(r.id)} — ${r.title}</div>
        <div class="hr-map-meta">${r.act} · ${r.archetype} · target ${r.word_target} words</div>
      </div>
      <div class="hr-map-meta">${idx === state.roomIndex ? '• Here' : ''}</div>
    `;
    div.addEventListener('click', ()=>{
      state.roomIndex = idx;
      closeMap();
      renderRoom();
    });
    els.mapList.appendChild(div);
  });
}

function openMap(){ els.mapDrawer.hidden = false; renderMap(); }
function closeMap(){ els.mapDrawer.hidden = true; }

function toggleNotes(){ els.notesPane.hidden = !els.notesPane.hidden; }

function bookmark(){
  const room = state.manifest.rooms[state.roomIndex];
  if(!room) return;
  const id = room.id;
  if(!state.bookmarks.includes(id)) state.bookmarks.push(id);
  saveLocal();
  els.btnBookmark.textContent = 'Bookmarked';
  setTimeout(()=> els.btnBookmark.textContent = 'Bookmark', 800);
}

function openAudio(){ els.audioPanel.hidden = false; }
function closeAudio(){ els.audioPanel.hidden = true; }

function prev(){ if(state.roomIndex > 0){ state.roomIndex--; renderRoom(); } }
function next(){ if(state.roomIndex < state.manifest.rooms.length - 1){ state.roomIndex++; renderRoom(); } }

function addSwipe(){
  let startX = null;
  document.addEventListener('touchstart', (e)=>{ startX = e.touches[0].clientX; }, {passive:true});
  document.addEventListener('touchend', (e)=>{
    if(startX === null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX;
    if(Math.abs(dx) > 60) dx < 0 ? next() : prev();
    startX = null;
  }, {passive:true});
}

async function init(){
  loadLocal();
  const manifest = await fetch('/data/rooms/manifest.json', {cache:'no-cache'}).then(r=>r.json());
  state.manifest = manifest;
  if(state.roomIndex >= manifest.rooms.length) state.roomIndex = 0;

  els.prevBtn.addEventListener('click', prev);
  els.nextBtn.addEventListener('click', next);
  els.btnMap.addEventListener('click', openMap);
  els.btnCloseMap.addEventListener('click', closeMap);
  els.btnNotes.addEventListener('click', toggleNotes);
  els.btnBookmark.addEventListener('click', bookmark);
  els.btnAudio.addEventListener('click', openAudio);
  els.btnCloseAudio.addEventListener('click', closeAudio);

  els.notesField.addEventListener('input', ()=>{
    const room = state.manifest.rooms[state.roomIndex];
    if(room) saveNotes(room.id);
  });
  els.btnClearNotes.addEventListener('click', ()=>{
    const room = state.manifest.rooms[state.roomIndex];
    if(!room) return;
    els.notesField.value = '';
    saveNotes(room.id);
  });

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') prev();
    if(e.key === 'ArrowRight') next();
    if(e.key === 'Escape'){ closeMap(); closeAudio(); hideBubble(); }
  });

  addSwipe();
  await renderRoom();
}

init().catch(err=>{
  console.error(err);
  els.roomContent.innerHTML = `<p style="color:#ffb4b4">Reader failed to load. Check console for details.</p>`;
});
