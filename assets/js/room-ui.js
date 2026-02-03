(function(){
  const root = document.body;
  if(!root || !root.classList.contains('house-reader')) return;

  // Ensure topbar exists
  if(!document.querySelector('.reader-topbar')){
    const nav = document.createElement('nav');
    nav.className = 'reader-topbar';
    nav.innerHTML = `
      <div class="reader-topbar__inner">
        <div class="reader-breadcrumb">
          <a href="../../pages/book/house-reader/index.html">The House</a>
          <span class="reader-dot">•</span>
          <a href="../../pages/book/house-reader/master-plan.html">Master Plan</a>
          <span class="reader-dot">•</span>
          <a href="../../pages/book/house-reader/reader.html">Reader</a>
        </div>
        <div class="reader-tools">
          <div class="reader-progress" aria-label="Reading progress"><span data-progress-fill></span></div>
          <button class="reader-btn" type="button" data-font="down" aria-label="Decrease font size">A−</button>
          <button class="reader-btn" type="button" data-font="up" aria-label="Increase font size">A+</button>
        </div>
      </div>`;
    document.body.insertBefore(nav, document.body.firstChild);
  }

  // Font size persistence
  const keyFs = 'hr_font_size';
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const saved = parseInt(localStorage.getItem(keyFs)||'',10);
  if(Number.isFinite(saved)){
    document.documentElement.style.setProperty('--fs', clamp(saved,16,22)+'px');
  }
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-font]');
    if(!btn) return;
    const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--fs'),10) || 18;
    const next = clamp(cur + (btn.dataset.font==='up'?1:-1), 16, 22);
    document.documentElement.style.setProperty('--fs', next+'px');
    localStorage.setItem(keyFs, String(next));
  });

  // Progress tracking
  const roomId = root.getAttribute('data-room-id') || '';
  const m = roomId.match(/room(\d+)/);
  const idx = m ? parseInt(m[1],10) : null;
  if(Number.isFinite(idx)){
    const prev = parseInt(localStorage.getItem('hr_room_index')||'0',10) || 0;
    if(idx > prev) localStorage.setItem('hr_room_index', String(idx));

    // Fill bar (assumes 100 rooms)
    const fill = document.querySelector('[data-progress-fill]');
    if(fill){
      const pct = Math.max(0, Math.min(100, (idx/100)*100));
      fill.style.width = pct.toFixed(1)+'%';
    }
  }
})();
