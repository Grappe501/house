
(function(){
  const KEY = "hr_room_index";

  function pad3(n){
    n = Number(n)||0;
    return String(n).padStart(3,"0");
  }

  function getProgress(){
    try{
      const raw = localStorage.getItem(KEY);
      const idx = Number(raw);
      if(!Number.isFinite(idx) || idx<=0) return null;
      return idx;
    }catch(e){ return null; }
  }

  function attachLanding(){
    const idx = getProgress();
    const btnContinue = document.getElementById("btnContinue");
    const btnEnter = document.getElementById("btnEnter");
    const label = document.getElementById("progressLabel");
    if(!btnContinue || !btnEnter) return;

    if(idx){
      btnContinue.hidden = false;
      btnContinue.href = "./reader.html#room=" + idx;
      if(label){
        label.hidden = false;
        label.textContent = "Continue at Room " + pad3(idx);
      }
      btnEnter.textContent = "Start at Room 001";
      btnEnter.href = "./reader.html#room=1";
    }else{
      btnEnter.textContent = "Enter the House";
      btnEnter.href = "./reader.html";
      if(label) label.hidden = true;
    }
  }

  function attachMaster(){
    const idx = getProgress();
    const fill = document.getElementById("progressFill");
    const text = document.getElementById("progressText");
    const jump = document.getElementById("progressJump");

    if(!fill || !text || !jump) return;

    if(idx){
      // 100 rooms total (v1 assumption); clamp 1..100
      const pct = Math.max(1, Math.min(100, idx)) / 100 * 100;
      fill.style.width = pct.toFixed(1) + "%";
      text.textContent = "Last room on this device: Room " + pad3(idx);
      jump.hidden = false;
      jump.href = "./reader.html#room=" + idx;
      jump.textContent = "Continue →";
    }else{
      fill.style.width = "0%";
      text.textContent = "No local progress yet. Start at Room 001.";
      jump.hidden = true;
    }
  }

  // Run
  attachLanding();
  attachMaster();
})();
