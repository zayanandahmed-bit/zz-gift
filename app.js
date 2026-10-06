(() => {
  const C = window.CONFIG || {}, D = window.DATA || { photos: [], videos: [], letters: [] };
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  const letters = D.letters, quotes = D.quotes || [];

  // ---------- text ----------
  const name = C.herName || 'My Love';
  $('#herName').textContent = name; $('#logoName').textContent = name; $('#signName').textContent = C.yourName || '';
  $('#heroLine').textContent = C.heroLine || ''; $('#finaleText').textContent = C.finale || '';
  $('#letterCount').textContent = letters.length;
  document.title = `For ${name} ♥`;

  // ---------- counter ----------
  const start = C.startDate && new Date(C.startDate + 'T00:00:00');
  if (start && !isNaN(start)) {
    $('#counter').hidden = false; $('#counterLabel').hidden = false;
    const tick = () => { let s = Math.max(0, Math.floor((Date.now() - start) / 1000));
      $('#cDays').textContent = Math.floor(s / 86400).toLocaleString(); $('#cHours').textContent = Math.floor(s % 86400 / 3600);
      $('#cMins').textContent = Math.floor(s % 3600 / 60); $('#cSecs').textContent = s % 60; };
    tick(); setInterval(tick, 1000);
  }

  // ---------- gate / intro ----------
  function showIntro() { $('#gate').classList.add('hidden'); $('#intro').classList.remove('hidden'); }
  if (C.passcode) {
    $('#intro').classList.add('hidden'); $('#gate').classList.remove('hidden');
    if (store.get('vday-unlocked', false)) showIntro();
    $('#gateForm').addEventListener('submit', e => { e.preventDefault();
      if ($('#gateInput').value.trim() === String(C.passcode)) { store.set('vday-unlocked', true); showIntro(); }
      else { $('#gateErr').textContent = 'Hmm, try again ♥'; $('#gateInput').value = ''; } });
  }
  document.body.classList.add('lock');
  $('#openBtn').addEventListener('click', () => {
    burst(innerWidth / 2, innerHeight * .7, 14);
    $('#intro').classList.add('leaving');
    setTimeout(() => { $('#intro').classList.add('hidden'); $('#app').classList.remove('hidden'); document.body.classList.remove('lock'); scrollTo(0, 0); observe(); }, 700);
  });

  // ---------- tabs ----------
  function setTab(t) {
    $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    $$('.pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + t));
    scrollTo({ top: 0 }); observe(); if (t === 'words') watchStats();
    const a = $('.tab.active'); a.parentElement.scrollTo({ left: a.offsetLeft - 24, behavior: 'smooth' });
  }
  $$('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  // ---------- scroll reveal ----------
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), (e.target.dataset.d | 0)); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  function observe() { $$('.tile:not(.in),.vtile:not(.in),.lcard:not(.in),.reveal:not(.in)').forEach(el => io.observe(el)); }

  // ---------- letters ----------
  const words = t => t.trim().split(/\s+/).length;
  function renderLetters() {
    const g = $('#letterList');
    if (!letters.length) { g.innerHTML = '<p class="demo-note">Put .txt files in the <b>letters</b> folder, run <b>node scan.js</b>, and they appear here.</p>'; return; }
    letters.forEach((l, n) => {
      const b = document.createElement('button'); b.className = 'lcard'; b.dataset.d = (n % 6) * 80;
      b.innerHTML = `<div class="ld"></div><h3></h3><p></p><div class="meta"></div>`;
      b.querySelector('.ld').textContent = l.date || '♥'; b.querySelector('h3').textContent = l.title;
      b.querySelector('p').textContent = l.body.replace(/\s+/g, ' '); b.querySelector('.meta').textContent = `${Math.max(1, Math.round(words(l.body) / 200))} min read · ${words(l.body).toLocaleString()} words`;
      b.addEventListener('click', () => openReader(n)); g.appendChild(b);
    });
  }
  let cur = 0, rlist = letters, rscale = store.get('vday-rs', 1.15);
  const reader = $('#reader'), rs = $('#rScroll');
  function openReader(i, list) { rlist = list || letters; cur = i; reader.classList.remove('hidden'); document.body.classList.add('lock'); showLetter(); }
  function showLetter() {
    const l = rlist[cur];
    $('#rDate').textContent = l.date; $('#rTitle').textContent = l.title; $('#rPos').textContent = (rlist.length > 1 ? `Letter ${cur + 1} of ${rlist.length}` : '♥');
    const body = $('#rBody'); body.innerHTML = '';
    l.body.split(/\n\s*\n/).forEach(par => { const p = document.createElement('p'); p.textContent = par.trim(); body.appendChild(p); });
    body.style.setProperty('--rs', rscale + 'rem'); $('.paper').style.setProperty('--rs', rscale + 'rem');
    $('#rPrev').style.visibility = cur ? 'visible' : 'hidden';
    $('#rNext').style.display = rlist.length > 1 ? '' : 'none';
    $('#rNext').textContent = cur < rlist.length - 1 ? 'Next letter ›' : 'Back to start ♥';
    rs.scrollTop = 0; $('#rProg').style.width = '0';
  }
  rs.addEventListener('scroll', () => { const m = rs.scrollHeight - rs.clientHeight; $('#rProg').style.width = (m > 0 ? rs.scrollTop / m * 100 : 100) + '%'; });
  $('#rClose').addEventListener('click', () => { reader.classList.add('hidden'); document.body.classList.remove('lock'); });
  $('#rPrev').addEventListener('click', () => { if (cur) { cur--; showLetter(); } });
  $('#rNext').addEventListener('click', () => { cur = (cur + 1) % rlist.length; showLetter(); });
  const size = d => { rscale = Math.min(1.9, Math.max(.9, +(rscale + d).toFixed(2))); store.set('vday-rs', rscale); $('.paper').style.setProperty('--rs', rscale + 'rem'); };
  $('#rBig').addEventListener('click', () => size(.1)); $('#rSmall').addEventListener('click', () => size(-.1));

  // ---------- rushing ticker (left → right) ----------
  function buildTickers() {
    const t = C.ticker || []; if (!t.length) return;
    const row = t.map(([w, n]) => `<span><b>${n}</b> ${w}</span><i>♥</i>`).join('');
    $$('.ticker .track').forEach(tr => { tr.innerHTML = row + row; tr.style.animationDuration = Math.max(40, t.length * 3.2) + 's'; });
  }
  buildTickers();

  // ---------- words (stats + quotes) ----------
  function renderWords() {
    const st = $('#stats');
    (C.stats || []).forEach(s => { const d = document.createElement('div'); d.className = 'stat reveal'; d.innerHTML = '<b></b><span></span>'; d.querySelector('b').dataset.n = s.n; d.querySelector('b').textContent = '0'; d.querySelector('span').textContent = s.label; st.appendChild(d); });
    const q = $('#quoteList');
    quotes.forEach((x, n) => {
      const f = document.createElement('figure'); f.className = 'quote ' + x.who + ' reveal'; f.dataset.d = (n % 3) * 60;
      f.innerHTML = '<blockquote></blockquote><figcaption></figcaption>';
      f.querySelector('blockquote').textContent = x.text;
      f.querySelector('figcaption').textContent = (x.who === 'you' ? 'You' : (C.yourName || 'Me')) + (x.date ? ' · ' + x.date : '');
      q.appendChild(f);
    });
  }
  const cio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; cio.unobserve(e.target); const b = e.target.querySelector('b'), n = +b.dataset.n, t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / 1600); b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))).toLocaleString(); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }), { threshold: .6 });
  function watchStats() { $$('.stat').forEach(s => cio.observe(s)); }

  // ---------- keyboard ----------
  addEventListener('keydown', e => {
    if (!reader.classList.contains('hidden')) { if (e.key === 'Escape') $('#rClose').click(); }
    else if (!$('#chat').classList.contains('hidden')) { if (e.key === 'Escape') $('#chatClose').click(); }
  });

  // ---------- heart effects ----------
  function burst(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      const h = document.createElement('span'); h.className = 'burst'; h.textContent = ['♥', '♡', '❤'][i % 3];
      h.style.left = x + 'px'; h.style.top = y + 'px'; h.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); h.style.setProperty('--dy', (-60 - Math.random() * 130) + 'px');
      h.style.fontSize = (14 + Math.random() * 18) + 'px'; document.body.appendChild(h); setTimeout(() => h.remove(), 1000);
    }
  }
  const cv = $('#hearts'), cx = cv.getContext('2d'); let W, H, hs = [];
  const fit = () => { const r = devicePixelRatio || 1; W = cv.width = innerWidth * r; H = cv.height = innerHeight * r; };
  fit(); addEventListener('resize', fit);
  const mk = init => ({ x: Math.random() * W, y: init ? Math.random() * H : H + 40, s: (8 + Math.random() * 20) * (devicePixelRatio || 1), v: .25 + Math.random() * .7, a: .08 + Math.random() * .22, ph: Math.random() * 6.28, c: Math.random() < .25 ? '#f6c177' : '#ff4d6d' });
  for (let i = 0; i < (innerWidth < 600 ? 22 : 40); i++) hs.push(mk(true));
  function frame(t) {
    cx.clearRect(0, 0, W, H);
    hs.forEach((h, i) => {
      h.y -= h.v * (devicePixelRatio || 1); h.x += Math.sin(t / 1500 + h.ph) * .4;
      if (h.y < -40) hs[i] = mk(false);
      cx.globalAlpha = h.a; cx.fillStyle = h.c; cx.font = `${h.s}px serif`; cx.fillText('♥', h.x, h.y);
    });
    requestAnimationFrame(frame);
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(frame);
  addEventListener('pointerdown', e => { if (!e.target.closest('input,.reader,.chatview')) burst(e.clientX, e.clientY, 4); });

  // ---------- story: timeline, month chart, nicknames ----------
  function renderStory() {
    const S = window.STORY; if (!S) return;
    const tl = $('#timeline');
    let side = 0, ci = -1;
    S.timeline.forEach(e => {
      if (e.h) { const c = document.createElement('div'); c.className = 'tl-chapter reveal'; c.innerHTML = '<b></b><span></span>'; c.querySelector('b').textContent = e.h; c.querySelector('span').textContent = e.x; tl.appendChild(c); side = 0; return; }
      ci++;
      const d = document.createElement('div'); d.className = 'tl-item reveal ' + (side++ % 2 ? 'r' : 'l'); d.dataset.d = 40;
      d.innerHTML = '<span class="dot">♥</span><div class="tl-card"><div class="ld"></div><h3></h3><p></p></div>';
      d.querySelector('.ld').textContent = e.d; d.querySelector('h3').textContent = e.t; d.querySelector('p').textContent = e.x;
      const chat = (window.CHATS || [])[ci];
      if (chat && chat.m && chat.m.length) { const card = d.querySelector('.tl-card'); card.classList.add('has-chat'); card.insertAdjacentHTML('beforeend', '<span class="see">See the chat ›</span>'); card.addEventListener('click', () => openChat(e, chat)); }
      tl.appendChild(d);
    });
    const mx = Math.max(...S.months.map(m => m[1])), mc = $('#monthChart');
    S.months.forEach(([l, n]) => { const c = document.createElement('div'); c.className = 'bar'; c.title = l + ': ' + n.toLocaleString() + ' messages';
      c.innerHTML = '<i></i><span></span>'; c.querySelector('i').style.height = Math.max(4, n / mx * 100) + '%'; c.querySelector('span').textContent = l.split(' ')[0].slice(0, 1) + (l.includes(' ') ? "'" + l.split(' ')[1] : ''); mc.appendChild(c); });
    const ng = $('#nickGrid');
    S.nicknames.forEach(n => { const c = document.createElement('div'); c.className = 'nick reveal';
      c.innerHTML = '<h3></h3><div class="nrow"><span>me</span><b></b></div><div class="nrow"><span>you</span><b></b></div><small></small>';
      c.querySelector('h3').textContent = n.n; const bs = c.querySelectorAll('b'); bs[0].textContent = n.me.toLocaleString(); bs[1].textContent = n.her.toLocaleString();
      c.querySelector('small').textContent = 'first used ' + n.first; ng.appendChild(c); });
  }

  // ---------- chat view: from her side (her = right, "You") ----------
  function openChat(e, chat) {
    $('#chatTitle').textContent = e.t; $('#chatDate').textContent = e.d + ' · our real chat';
    const body = $('#chatBody'); body.innerHTML = ''; let lastDay = '', anchorEl = null;
    chat.m.forEach(m => {
      if (m.d !== lastDay) { const s = document.createElement('div'); s.className = 'cday'; s.textContent = m.d; body.appendChild(s); lastDay = m.d; }
      const b = document.createElement('div'); b.className = 'bub ' + (m.w === 'her' ? 'mine' : 'theirs') + (m.a ? ' anchor' : '');
      const who = document.createElement('small'); who.className = 'who'; who.textContent = m.w === 'her' ? 'You' : (C.yourName || 'Zayan'); b.appendChild(who);
      if (m.k) { const k = document.createElement('div'); k.className = 'media'; k.textContent = { voice: '🎤 Voice note', photo: '📷 Photo', video: '🎬 Video', shared: '🔗 Shared a post' }[m.k]; b.appendChild(k); }
      if (m.x) { const t = document.createElement('div'); t.className = 'txt'; t.textContent = m.x; b.appendChild(t); }
      const tm = document.createElement('small'); tm.className = 'tm'; tm.textContent = m.t; b.appendChild(tm);
      if (m.a) { b.insertAdjacentHTML('afterbegin', '<span class="tag">♥ this moment</span>'); anchorEl = b; }
      body.appendChild(b);
    });
    $('#chat').classList.remove('hidden'); document.body.classList.add('lock');
    requestAnimationFrame(() => { if (anchorEl) anchorEl.scrollIntoView({ block: 'center' }); else body.scrollTop = 0; });
  }
  $('#chatClose').addEventListener('click', () => { $('#chat').classList.add('hidden'); document.body.classList.remove('lock'); });

  // ---------- open when… ----------
  function renderOpen() {
    const g = $('#openGrid');
    (window.OPENWHEN || []).forEach((o, n) => {
      const b = document.createElement('button'); b.className = 'env reveal'; b.dataset.d = (n % 4) * 70;
      b.innerHTML = '<span class="seal"></span><h3></h3><p></p>'; b.querySelector('.seal').textContent = o.e; b.querySelector('h3').textContent = o.t; b.querySelector('p').textContent = o.hint;
      b.addEventListener('click', () => {
        const body = o.parts.map(([w, t]) => (w === 'you' ? 'You wrote: ' : '') + t).join('\n\n');
        openReader(0, [{ title: o.t, date: o.hint, body }]);
      });
      g.appendChild(b);
    });
  }

  renderLetters(); renderWords(); renderStory(); renderOpen();
})();
