/* narration.js - shared narration + ambience controller (best-possible device TTS)
   Goals:
   - Consistent cadence (older calm male) via fixed rate/pitch + sentence chunking.
   - Consistent voice per device via localStorage-selected voice name.
   - Gentle pauses between sentences to mimic performance sheet.
   - Prerecorded talk track overrides everything if present.
*/
(function () {
  "use strict";

  const DEFAULTS = { ambienceVolume: 0.35, talktrackVolume: 0.95 };
  const qs = (s, r=document) => r.querySelector(s);

  function softFadeIn(){
    try{ document.documentElement.classList.add("js"); }catch(e){}
    const ready = ()=>document.documentElement.classList.add("is-loaded");
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ready, {once:true});
    else ready();
  }

  async function loadJSON(url){
    const res = await fetch(url, {cache:"no-cache"});
    if(!res.ok) throw new Error("Failed to load "+url);
    return await res.json();
  }

  async function headOK(url){
    try{
      const res = await fetch(url, {method:"HEAD", cache:"no-cache"});
      return res.ok;
    }catch(e){ return false; }
  }

  function getRoomId(){
    const b = document.body;
    const attr = b && b.getAttribute("data-room-id");
    if(attr) return attr;
    const m = (location.pathname||"").match(/room0*([0-9]{1,3})/i);
    if(m) return "room"+String(m[1]).padStart(3,"0");
    return "room001";
  }

  function scrollToStart(){
    const p = qs("main p, article p, .reader p, .room p");
    if(p) p.scrollIntoView({behavior:"smooth", block:"start"});
    else window.scrollTo({top:0, behavior:"smooth"});
  }

  function setPressed(btn, pressed){
    if(!btn) return;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  function setText(btn, t){ if(btn) btn.textContent=t; }

  // --- Device TTS helper (sentence chunking + voice persistence) ---
  function ttsAvailable(){
    return ("speechSynthesis" in window) && ("SpeechSynthesisUtterance" in window);
  }

  function normalizeTextForSpeech(text){
    // Keep your words; only add tiny spoken-friendly hints:
    // - Convert fraction slashes if present (already expanded in transcript)
    // - Ensure "WELCOME HOME" and other caps don't get spelled out letter-by-letter on some voices
    return text
      .replace(/\bWELCOME HOME\b/g, "Welcome home")
      .replace(/\bPLEASE BEGIN WHERE YOU ARE\b/g, "Please begin where you are")
      .replace(/\bTHIS HOUSE IS FOR EVERYONE\b/g, "This house is for everyone");
  }

  function chunkIntoSentences(text){
    // Conservative chunking: split on blank lines first, then on sentence endings.
    const blocks = text.split(/\n\s*\n+/).map(b=>b.trim()).filter(Boolean);
    const chunks = [];
    for(const b of blocks){
      // Split on . ! ? followed by space/newline, but keep punctuation.
      const parts = b.split(/(?<=[\.\!\?])\s+/);
      for(const p of parts){
        const s = p.trim();
        if(s) chunks.push(s);
      }
    }
    return chunks;
  }

  function pickBestVoice(voices, lang){
    // 1) previously saved voice name
    // 2) best match: en-US male-ish name
    // 3) en-US
    // 4) any en
    // 5) first
    if(!voices || !voices.length) return null;
    const savedName = window.localStorage && localStorage.getItem("house_narrator_voice_v1");
    if(savedName){
      const saved = voices.find(v => v.name === savedName);
      if(saved) return saved;
    }
    const prefer = voices.find(v => (v.lang===lang) && /male|david|george|matthew|mark|guy|fred/i.test(v.name));
    if(prefer) return prefer;
    const enus = voices.find(v => v.lang===lang);
    if(enus) return enus;
    const en = voices.find(v => /^en/i.test(v.lang));
    if(en) return en;
    return voices[0];
  }

  function buildVoicePicker(panel, voices, activeVoice){
    const holder = qs("[data-voice-picker]", panel);
    const label = qs("[data-voice-name]", panel);
    if(label){
      label.textContent = activeVoice ? activeVoice.name : "Device default";
    }
    if(!holder || !voices || !voices.length) return;

    // Build a compact select (only once)
    if(holder.getAttribute("data-built")==="1") return;
    holder.setAttribute("data-built","1");

    const select = document.createElement("select");
    select.className = "voice-select";
    select.setAttribute("aria-label", "Choose narration voice");

    // Curate list: en-US first, then other en
    const curated = [
      ...voices.filter(v => v.lang === "en-US"),
      ...voices.filter(v => v.lang !== "en-US" && /^en/i.test(v.lang))
    ];
    // De-dup by name
    const seen = new Set();
    const finalList = curated.filter(v => (seen.has(v.name) ? false : (seen.add(v.name), true)));

    for(const v of finalList){
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      if(activeVoice && v.name === activeVoice.name) opt.selected = true;
      select.appendChild(opt);
    }

    select.addEventListener("change", () => {
      try{ localStorage.setItem("house_narrator_voice_v1", select.value); }catch(e){}
      if(label) label.textContent = select.value;
    });

    holder.appendChild(select);
  }

  function stopAllSpeech(){
    try{ window.speechSynthesis.cancel(); }catch(e){}
  }

  function speakChunks(chunks, voice, settings, statusEl, onDone){
    let i = 0;
    let cancelled = false;

    function speakNext(){
      if(cancelled) return;
      if(i >= chunks.length){
        if(statusEl) statusEl.textContent = "";
        if(onDone) onDone();
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i]);
      u.lang = settings.lang || "en-US";
      u.rate = (settings.rate != null) ? settings.rate : 1.0;
      u.pitch = (settings.pitch != null) ? settings.pitch : 1.0;
      u.volume = (settings.volume != null) ? settings.volume : 1.0;
      if(voice) u.voice = voice;

      // A small, consistent "breath" gap between sentences (ms)
      const gap = settings.gap_ms != null ? settings.gap_ms : 220;

      u.onend = () => {
        i++;
        setTimeout(speakNext, gap);
      };
      u.onerror = () => {
        // If a chunk fails, continue
        i++;
        setTimeout(speakNext, gap);
      };

      window.speechSynthesis.speak(u);
    }

    speakNext();

    return () => { cancelled = true; stopAllSpeech(); };
  }

  async function init(){
    softFadeIn();
    const panel = qs(".audio-panel");
    if(!panel) return;

    let manifest;
    try{ manifest = await loadJSON("/data/rooms/narration.json"); }catch(e){ return; }

    const roomId = getRoomId();
    const roomCfg = manifest.rooms && manifest.rooms[roomId] ? manifest.rooms[roomId] : null;
    const voiceProfile = manifest.voice_profile || {};
    const tts = voiceProfile.tts_fallback || { lang:"en-US", rate:0.90, pitch:0.84, volume:0.98 };

    const ambience = qs('audio[data-role="ambience"]', panel);
    const talk = qs('audio[data-role="talktrack"]', panel);

    const startBtn = qs('[data-audio-action="start"]', panel);
    const talkBtn  = qs('[data-audio-action="talk"]', panel);
    const muteBtn  = qs('[data-audio-action="mute"]', panel);
    const volLabel = qs("[data-audio-volume]", panel);
    const statusEl = qs("[data-talktrack-status]", panel);

    const preset = DEFAULTS.ambienceVolume;
    if(volLabel) volLabel.textContent = Math.round(preset*100)+"%";

    // Wire mute
    function anyMuted(){ return (ambience && ambience.muted) || (talk && talk.muted); }
    function setMute(m){
      if(ambience) ambience.muted = m;
      if(talk) talk.muted = m;
      setPressed(muteBtn, m);
      setText(muteBtn, m ? "Unmute" : "Mute");
    }
    setMute(anyMuted());

    if(startBtn && ambience){
      startBtn.addEventListener("click", async ()=>{
        try{
          ambience.volume = preset;
          ambience.muted = false;
          await ambience.play();
          setMute(false);
        }catch(e){}
        scrollToStart();
      });
    }
    if(muteBtn){
      muteBtn.addEventListener("click", ()=> setMute(!anyMuted()));
    }

    // Talktrack detection (prerecorded)
    let talkSrc = roomCfg && roomCfg.audio ? roomCfg.audio.talktrack : "";
    let transcript = roomCfg ? roomCfg.transcript : "";
    if(talk && talkSrc){
      const ok = await headOK(talkSrc);
      const source = qs("source", talk);
      if(ok){
        if(source){
          source.setAttribute("src", talkSrc);
          source.setAttribute("type", "audio/mpeg");
        }
      }else{
        if(source) source.removeAttribute("src");
      }
    }

    // Prepare voice list (async on some browsers)
    let voices = [];
    let activeVoice = null;
    function refreshVoices(){
      if(!ttsAvailable()) return;
      voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      activeVoice = pickBestVoice(voices, tts.lang || "en-US");
      buildVoicePicker(panel, voices, activeVoice);
    }
    if(ttsAvailable()){
      refreshVoices();
      // Some browsers populate voices asynchronously:
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }

    function talkIsPlaying(){ return talk && !talk.paused && !talk.ended; }

    // TTS state
    let stopTTSFn = null;
    let ttsRunning = false;

    function stopTTSUI(){
      if(stopTTSFn) stopTTSFn();
      stopTTSFn = null;
      ttsRunning = false;
      setPressed(talkBtn,false);
      setText(talkBtn,"Play narration");
      if(statusEl) statusEl.textContent="";
    }

    async function startTTSFromTranscript(){
      if(!ttsAvailable()){
        if(statusEl) statusEl.textContent="Narration unavailable on this device.";
        return;
      }
      if(!transcript){
        if(statusEl) statusEl.textContent="Narration not available yet.";
        return;
      }
      try{
        const res = await fetch(transcript, {cache:"no-cache"});
        if(!res.ok) throw new Error("no transcript");
        const raw = await res.text();
        const cleaned = normalizeTextForSpeech(raw);
        const chunks = chunkIntoSentences(cleaned);

        refreshVoices(); // ensure activeVoice set
        if(statusEl) statusEl.textContent = activeVoice ? `Device voice: ${activeVoice.name}` : "Device voice";

        setPressed(talkBtn,true);
        setText(talkBtn,"Pause narration");

        ttsRunning = true;
        stopTTSFn = speakChunks(chunks, activeVoice, {
          lang: tts.lang || "en-US",
          rate: tts.rate ?? 0.90,
          pitch: tts.pitch ?? 0.84,
          volume: tts.volume ?? 0.98,
          gap_ms: 240
        }, statusEl, () => {
          ttsRunning = false;
          setPressed(talkBtn,false);
          setText(talkBtn,"Play narration");
        });

      }catch(e){
        if(statusEl) statusEl.textContent="Narration not available yet.";
        stopTTSUI();
      }
    }

    if(talkBtn){
      talkBtn.addEventListener("click", async ()=>{
        // Prefer prerecorded talk track
        const source = talk ? qs("source", talk) : null;
        const hasSrc = source && source.getAttribute("src");
        if(talk && hasSrc){
          if(talkIsPlaying()){
            talk.pause();
            setPressed(talkBtn,false);
            setText(talkBtn,"Play narration");
            return;
          }
          try{
            talk.volume = DEFAULTS.talktrackVolume;
            talk.muted = false;
            await talk.play();
            setMute(false);
            setPressed(talkBtn,true);
            setText(talkBtn,"Pause narration");
            if(statusEl) statusEl.textContent="";
          }catch(e){
            setPressed(talkBtn,false);
            setText(talkBtn,"Play narration");
          }
          talk.onended = ()=>{ setPressed(talkBtn,false); setText(talkBtn,"Play narration"); };
          return;
        }

        // Device TTS (best possible)
        if(ttsRunning){
          stopTTSUI();
          return;
        }
        await startTTSFromTranscript();
      });
    }
  }

  init();
})();
