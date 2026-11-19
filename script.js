(() => {
  'use strict';
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));
  const body = document.body;
  const audio = $('#bgAudio');
  const soundToggle = $('#soundToggle');
  const soundLabel = $('#soundLabel');
  const toast = $('#toast');
  const entry = $('#entry');
  const siteMain = $('#siteMain');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let opened = false;
  let audioEnabled = false;
  let toastTimer;

  function notify(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>toast.classList.remove('show'), 2800);
  }

  async function toggleAudio(on){
    audioEnabled = !!on;
    soundToggle?.setAttribute('aria-pressed', String(audioEnabled));
    soundLabel.textContent = audioEnabled ? 'SOUND ON' : 'SOUND OFF';
    if (audioEnabled){
      try {
        audio.volume = 0;
        await audio.play();
        const started = performance.now();
        const target = 0.46;
        const fade = (t) => {
          if (!audioEnabled) return;
          const p = Math.min(1, (t - started) / 2400);
          audio.volume = target * p;
          if (p < 1) requestAnimationFrame(fade);
        };
        requestAnimationFrame(fade);
      } catch (e) {
        audioEnabled = false;
        soundLabel.textContent = 'SOUND OFF';
        notify('Tap sound again if your device blocks autoplay.');
      }
    } else {
      audio.pause();
    }
  }
  soundToggle?.addEventListener('click', ()=>toggleAudio(!audioEnabled));

  function openInvitation(){
    if (opened) return;
    opened = true;
    body.classList.add('entered');
    siteMain.removeAttribute('inert');
    entry.classList.add('animate');
    toggleAudio(true);
    setTimeout(()=>entry.classList.add('finished'), reduced ? 250 : 1850);
    setTimeout(()=>{
      entry.classList.add('hidden');
      body.classList.remove('locked');
      requestTick();
      fx.burst(innerWidth/2, innerHeight * 0.35, 80);
    }, reduced ? 400 : 2550);
  }
  $('#openBtn')?.addEventListener('click', openInvitation);

  // Reveal observer
  const io = new IntersectionObserver((entries)=>{
    entries.forEach((e)=> e.target.classList.toggle('is-visible', e.isIntersecting));
  }, {threshold: .16});
  $$('.reveal').forEach(el => io.observe(el));

  const sceneEls = $$('.scene');
  const progressBar = $('#progressBar');
  let ticking = false;
  function clamp(n, min=0, max=1){ return Math.max(min, Math.min(max, n)); }
  function ease(p){ return p < .5 ? 4*p*p*p : 1 - Math.pow(-2*p+2,3)/2; }

  function currentTheme(){
    const middle = innerHeight * 0.5;
    let active = 'hero';
    sceneEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < middle && r.bottom > middle) active = el.dataset.theme || 'hero';
    });
    return active;
  }

  function updateScenes(){
    const vh = innerHeight;
    sceneEls.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - vh;
      const scrolled = clamp((-rect.top) / (total || 1));
      const p = clamp(scrolled);
      const ez = ease(clamp((p - .02) / .88));
      el.style.setProperty('--p', p.toFixed(4));
      el.style.setProperty('--ease', ez.toFixed(4));
      if (p > .58 && p < .7) {
        if (!el.dataset.burst) {
          el.dataset.burst = '1';
          const y = el.dataset.theme === 'wedding' ? innerHeight * .72 : innerHeight * .55;
          fx.burst(innerWidth * .5, y, el.dataset.theme === 'baraat' ? 90 : 58);
        }
      } else if (p < .45 || p > .95) {
        el.dataset.burst = '';
      }
    });
  }

  function onScroll(){
    ticking = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - innerHeight;
    progressBar.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
    $('#siteHeader')?.classList.toggle('is-scrolled', scrollY > 28);
    updateScenes();
    fx.setTheme(currentTheme());
  }
  function requestTick(){ if (!ticking){ ticking = true; requestAnimationFrame(onScroll); } }
  addEventListener('scroll', requestTick, {passive:true});
  addEventListener('resize', requestTick, {passive:true});
  requestTick();

  // Countdown
  const target = new Date('2026-12-10T19:00:00+05:30').getTime();
  function updateCountdown(){
    let remaining = Math.max(0, target - Date.now());
    const units = [86400000, 3600000, 60000, 1000];
    const ids = ['days','hours','minutes','seconds'];
    units.forEach((u, i)=>{
      const val = Math.floor(remaining / u);
      remaining -= val * u;
      const node = $('#' + ids[i]);
      if (node) node.textContent = String(val).padStart(2,'0');
    });
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Calendar helpers
  const venueAddress = 'Shivdhara Resort, Chitrasani, Deesa Highway, Palanpur, Gujarat, India';
  const events = {
    sufi:{title:'Sufi Night — Aditya & Shreya', start:'20261210T190000', end:'20261210T220000'},
    haldi:{title:'Haldi Carnival — Aditya & Shreya', start:'20261211T103000', end:'20261211T123000'},
    baraat:{title:'Baraat — Aditya & Shreya', start:'20261211T170000', end:'20261211T193000'},
    reception:{title:'Reception & Dinner — Aditya & Shreya', start:'20261211T193000', end:'20261211T223000'},
    wedding:{title:'Wedding Ceremony — Aditya & Shreya', start:'20261212T000000', end:'20261212T020000'}
  };
  function icalEscape(x){return x.replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');}
  function istToUtcStamp(local){
    const iso = `${local.slice(0,4)}-${local.slice(4,6)}-${local.slice(6,8)}T${local.slice(9,11)}:${local.slice(11,13)}:${local.slice(13,15)}+05:30`;
    return new Date(iso).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  }
  function addCalendar(ids){
    let lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Aditya and Shreya//Royal Wedding Invitation//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Aditya & Shreya'];
    ids.forEach(id => {
      const e = events[id]; if (!e) return;
      lines.push('BEGIN:VEVENT', `UID:${id}-aditya-shreya-2026@invite.local`, 'DTSTAMP:20261119T120000Z', `DTSTART:${istToUtcStamp(e.start)}`, `SUMMARY:${icalEscape(e.title)}`, `LOCATION:${icalEscape(venueAddress)}`, 'DESCRIPTION:With love from the Agrawal and Kothari families.', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], {type:'text/calendar;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'aditya-shreya-wedding.ics'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
    notify('Calendar file downloaded.');
  }
  $$('.save-btn').forEach(btn => btn.addEventListener('click', ()=> addCalendar([btn.dataset.event])));
  $('#calendarAll')?.addEventListener('click', ()=>addCalendar(['sufi','haldi','baraat','reception','wedding']));

  // Share / copy
  $('#copyVenue')?.addEventListener('click', async()=>{
    try { await navigator.clipboard.writeText(venueAddress); notify('Venue copied to clipboard.'); }
    catch { notify(venueAddress); }
  });
  $('#shareInvite')?.addEventListener('click', async()=>{
    const data = { title:'Aditya & Shreya Wedding Invitation', text:'You are warmly invited to the wedding celebrations of Aditya & Shreya.', url: location.href };
    try { if (navigator.share) await navigator.share(data); else throw new Error('share'); }
    catch { try { await navigator.clipboard.writeText(location.href); notify('Invitation link copied.'); } catch { notify('Share this page with your loved ones.'); } }
  });

  // Particle system
  const fx = (() => {
    const canvas = $('#fxCanvas');
    const ctx = canvas.getContext('2d', {alpha:true});
    if (!ctx || reduced) return {setTheme(){}, burst(){}};
    let W = 0, H = 0, DPR = 1, theme = 'hero', particles = [], bursts = [], prev = 0, last = 0;
    const palettes = {
      hero:['#ffecae','#f4ca6a','#f39f42','#fff4d0'],
      sufi:['#ffffff','#e5d8ff','#9fc0ff','#fff2bb'],
      haldi:['#ffe086','#ffc93c','#f1a11b','#fff6cf'],
      baraat:['#ffd274','#f08d2b','#ffefbe','#e35047'],
      reception:['#fff1d6','#f4ca6a','#ffd2a6','#f5f0ff'],
      wedding:['#fff0b8','#ffb54f','#ff7c25','#ffe4c5']
    };
    function rand(a,b){ return a + Math.random() * (b - a); }
    function choose(list){ return list[(Math.random()*list.length)|0]; }
    function resize(){
      DPR = Math.min(devicePixelRatio || 1, 1.5);
      W = innerWidth; H = innerHeight;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
      particles = Array.from({length: W < 700 ? 26 : 40}, ()=>makeParticle(true));
    }
    function makeParticle(seed=false){
      const t = theme;
      return {
        x:Math.random()*W,
        y:seed ? Math.random()*H : (t === 'wedding' ? H + 10 : -20),
        vx:rand(-.25,.25),
        vy:t === 'wedding' ? rand(-1.2,-.4) : rand(.12,.45),
        size:rand(1, 4),
        life:1,
        type:t === 'haldi' ? 'flower' : t === 'baraat' ? 'confetti' : t === 'wedding' ? 'ember' : t === 'sufi' ? 'star' : 'dust',
        phase:Math.random()*Math.PI*2,
        alpha:rand(.18,.55)
      };
    }
    function drawStar(x,y,r,color,a){
      ctx.save(); ctx.translate(x,y); ctx.globalAlpha = a; ctx.fillStyle = color;
      ctx.beginPath();
      for(let i=0;i<8;i++){ const angle = (Math.PI/4) * i; const radius = i % 2 === 0 ? r * 2.4 : r * .6; const px = Math.cos(angle) * radius; const py = Math.sin(angle) * radius; if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function render(t){
      requestAnimationFrame(render);
      if (document.hidden || !body.classList.contains('entered') || t - last < 32) return;
      const dt = Math.min(2.5, (t - prev || 32) / 32); prev = t; last = t;
      ctx.clearRect(0,0,W,H);
      const colors = palettes[theme] || palettes.hero;
      particles.forEach(p => {
        p.x += (p.vx + Math.sin(p.phase + t*.0004)*.12) * dt;
        p.y += p.vy * dt;
        const resetDown = p.vy > 0 && p.y > H + 20;
        const resetUp = p.vy < 0 && p.y < -20;
        if (p.x < -20) p.x = W + 5; if (p.x > W + 20) p.x = -5;
        if (resetDown || resetUp) Object.assign(p, makeParticle());
        const alpha = p.alpha * (.66 + .34*Math.sin(p.phase + t*.002));
        const color = choose(colors);
        if (p.type === 'star') drawStar(p.x, p.y, p.size, color, alpha);
        else {
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.phase + t*.00025);
          ctx.globalAlpha = alpha; ctx.fillStyle = color;
          if (p.type === 'flower') {
            for (let i=0;i<5;i++){ ctx.rotate(Math.PI*2/5); ctx.beginPath(); ctx.ellipse(p.size*.7,0,p.size*.95,p.size*.4,0,0,Math.PI*2); ctx.fill(); }
          } else if (p.type === 'confetti') ctx.fillRect(-p.size*.55,-p.size*1.45,p.size*1.1,p.size*2.9);
          else if (p.type === 'ember') { ctx.shadowColor = '#ff8f38'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.ellipse(0,0,p.size*.7,p.size*1.35,0,0,Math.PI*2); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(0,0,p.size*.6,0,Math.PI*2); ctx.fill(); }
          ctx.restore();
        }
      });
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.vy += (b.gravity || .04) * dt; b.life -= .018 * dt;
        if (b.life <= 0) { bursts.splice(i,1); continue; }
        if (b.type === 'star') drawStar(b.x,b.y,b.size,b.color,b.life*.9);
        else { ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.rot += .06 * dt); ctx.globalAlpha = b.life*.85; ctx.fillStyle = b.color; ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size*1.8); ctx.restore(); }
      }
    }
    function setTheme(next){ if (next && next !== theme){ theme = next; particles = Array.from({length: W < 700 ? 26 : 40}, ()=>makeParticle(true)); } }
    function burst(x, y, count=60){
      const colors = palettes[theme] || palettes.hero;
      const n = Math.min(count, W < 700 ? 66 : 96);
      for (let i=0;i<n;i++) {
        const a = (Math.PI*2) * (i/n) + Math.random()*.35;
        const speed = rand(1, theme === 'baraat' ? 9 : 6.4);
        bursts.push({
          x,y,
          vx:Math.cos(a)*speed,
          vy:Math.sin(a)*speed - (theme === 'wedding' ? 1.4 : 2.3),
          gravity: theme === 'wedding' ? -.012 : .05,
          size:rand(1.2,4.2),
          color:choose(colors),
          life:rand(.55,1.05),
          rot:Math.random()*Math.PI,
          type: i%3===0 ? 'star' : 'confetti'
        });
      }
      if (bursts.length > 240) bursts.splice(0, bursts.length - 240);
    }
    addEventListener('resize', resize, {passive:true});
    resize(); requestAnimationFrame(render);
    return {setTheme, burst};
  })();
})();
