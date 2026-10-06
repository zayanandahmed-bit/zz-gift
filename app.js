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

  // =====================================================================
  // saved ♥, share-as-card, quote of the day, search, firsts, countdowns, surprise, secret
  // =====================================================================
  const saved = store.get('vday-saved', { letters: [], lines: [] });
  const persist = () => store.set('vday-saved', saved);
  const lineKey = x => (x.x || '').slice(0, 60);
  const isLineSaved = x => saved.lines.some(l => lineKey(l) === lineKey(x));
  const isLetterSaved = id => saved.letters.includes(id);
  function toggleLine(x) { const i = saved.lines.findIndex(l => lineKey(l) === lineKey(x)); if (i >= 0) saved.lines.splice(i, 1); else saved.lines.push({ w: x.w, d: x.d, x: x.x }); persist(); renderSaved(); }
  function toggleLetter(id) { const i = saved.letters.indexOf(id); if (i >= 0) saved.letters.splice(i, 1); else saved.letters.push(id); persist(); renderSaved(); }
  const whoName = w => (w === 'you' || w === 1 ? 'You' : (C.yourName || 'Zayan'));

  async function copyText(t, btn) {
    try { await navigator.clipboard.writeText(t); } catch { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch {} a.remove(); }
    if (btn) { const o = btn.textContent; btn.textContent = 'Copied ♥'; setTimeout(() => btn.textContent = o, 1400); }
  }
  // pretty card image (canvas → PNG): shares on phones, downloads on computers
  async function shareCard(x, btn) {
    const o = btn && btn.textContent; if (btn) btn.textContent = 'Making…';
    try { await document.fonts.load("italic 60px 'Playfair Display'"); await document.fonts.load("60px 'Dancing Script'"); } catch {}
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#3d0f21'); bg.addColorStop(.55, '#2a0a16'); bg.addColorStop(1, '#5a1431'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W * .8, H * .1, 0, W * .8, H * .1, 700); glow.addColorStop(0, 'rgba(255,77,109,.35)'); glow.addColorStop(1, 'rgba(255,77,109,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    g.font = '60px serif'; for (let i = 0; i < 26; i++) { g.globalAlpha = .06 + rnd() * .12; g.fillStyle = rnd() < .25 ? '#f6c177' : '#ff4d6d'; g.font = (30 + rnd() * 90) + 'px serif'; g.fillText('♥', rnd() * W, rnd() * H); }
    g.globalAlpha = 1; g.fillStyle = '#ff4d6d'; g.font = '120px serif'; g.textAlign = 'center'; g.fillText('♥', W / 2, 250);
    const text = x.x.replace(/\s+/g, ' ').trim(); let size = 74, lines;
    const wrap = s => { g.font = `italic ${s}px 'Playfair Display', Georgia, serif`; const out = []; let line = ''; text.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 200 && line) { out.push(line); line = w; } else line = t; }); out.push(line); return out; };
    do { lines = wrap(size); size -= 4; } while (lines.length * (size + 4) * 1.35 > 720 && size > 30);
    const lh = (size + 4) * 1.35, top = 330 + (720 - lines.length * lh) / 2; g.fillStyle = '#fff5f0'; g.textAlign = 'center';
    lines.forEach((l, i) => g.fillText(l, W / 2, top + i * lh + lh * .7));
    g.font = "60px 'Dancing Script', cursive"; g.fillStyle = '#f6c177'; g.fillText('— ' + whoName(x.w) + (x.d ? ' · ' + x.d : ''), W / 2, 1150);
    g.font = "44px 'Dancing Script', cursive"; g.fillStyle = 'rgba(255,214,224,.85)'; g.fillText('for ' + (C.herName || 'you') + ' ♥', W / 2, 1250);
    cv.toBlob(async blob => {
      const file = new File([blob], 'for-you.png', { type: 'image/png' });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); if (btn) btn.textContent = o; return; } } catch {}
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'for-you.png'; document.body.appendChild(a); a.click(); a.remove();
      if (btn) { btn.textContent = 'Saved ♥'; setTimeout(() => btn.textContent = o, 1500); }
    }, 'image/png');
  }
  function lineButtons(x, parent) {
    const row = document.createElement('div'); row.className = 'lrow';
    const heart = document.createElement('button'); heart.className = 'lbtn' + (isLineSaved(x) ? ' on' : ''); heart.textContent = isLineSaved(x) ? '♥' : '♡'; heart.title = 'Save';
    heart.addEventListener('click', e => { e.stopPropagation(); toggleLine(x); const on = isLineSaved(x); heart.classList.toggle('on', on); heart.textContent = on ? '♥' : '♡'; if (on) burst(e.clientX, e.clientY, 6); });
    const cp = document.createElement('button'); cp.className = 'lbtn'; cp.textContent = 'Copy'; cp.addEventListener('click', e => { e.stopPropagation(); copyText(x.x + ' — ' + whoName(x.w) + (x.d ? ', ' + x.d : ''), cp); });
    const cd = document.createElement('button'); cd.className = 'lbtn'; cd.textContent = 'Card'; cd.title = 'Save as a pretty image'; cd.addEventListener('click', e => { e.stopPropagation(); shareCard(x, cd); });
    row.append(heart, cp, cd); parent.appendChild(row);
  }

  // --- quotes on the Words tab get buttons; quote of the day on top
  const allQuotes = quotes.map(q => ({ w: q.who, d: q.date, x: q.text }));
  $$('#quoteList .quote').forEach((f, i) => lineButtons(allQuotes[i], f));
  (function qotd() {
    if (!allQuotes.length) return; const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000), q = allQuotes[day % allQuotes.length], el = $('#qotd');
    el.innerHTML = '<p class="script small">today\'s line</p><blockquote></blockquote><small></small>'; el.querySelector('blockquote').textContent = q.x; el.querySelector('small').textContent = whoName(q.w) + ' · ' + q.d; lineButtons(q, el);
  })();

  // --- hearts on letter cards
  $$('.lcard').forEach((card, i) => {
    const id = letters[i].id, b = document.createElement('span'); b.className = 'lheart' + (isLetterSaved(id) ? ' on' : ''); b.textContent = isLetterSaved(id) ? '♥' : '♡'; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Save letter');
    b.addEventListener('click', e => { e.stopPropagation(); toggleLetter(id); const on = isLetterSaved(id); b.classList.toggle('on', on); b.textContent = on ? '♥' : '♡'; if (on) burst(e.clientX, e.clientY, 6); });
    card.appendChild(b);
  });

  // --- saved page
  function renderSaved() {
    const body = $('#savedBody'); body.innerHTML = '';
    if (!saved.letters.length && !saved.lines.length) { body.innerHTML = '<p class="demo-note">Nothing saved yet. Tap the ♡ on a letter or a line, and it will wait for you here.</p>'; return; }
    if (saved.letters.length) {
      const h = document.createElement('h3'); h.className = 'sh'; h.textContent = 'Letters'; body.appendChild(h);
      const wrap = document.createElement('div'); wrap.className = 'letters';
      saved.letters.forEach(id => { const n = letters.findIndex(l => l.id === id); if (n < 0) return; const l = letters[n];
        const b = document.createElement('button'); b.className = 'lcard in'; b.innerHTML = '<div class="ld"></div><h3></h3><p></p>'; b.querySelector('.ld').textContent = l.date || '♥'; b.querySelector('h3').textContent = l.title; b.querySelector('p').textContent = l.body.replace(/\s+/g, ' ');
        b.addEventListener('click', () => openReader(n)); wrap.appendChild(b); });
      body.appendChild(wrap);
    }
    if (saved.lines.length) {
      const h = document.createElement('h3'); h.className = 'sh'; h.textContent = 'Lines'; body.appendChild(h);
      const wrap = document.createElement('div'); wrap.className = 'quotes';
      saved.lines.forEach(x => { const f = document.createElement('figure'); f.className = 'quote ' + (x.w === 'you' || x.w === 1 ? 'you' : 'me') + ' in'; f.innerHTML = '<blockquote></blockquote><figcaption></figcaption>';
        f.querySelector('blockquote').textContent = x.x; f.querySelector('figcaption').textContent = whoName(x.w) + (x.d ? ' · ' + x.d : ''); lineButtons(x, f); wrap.appendChild(f); });
      body.appendChild(wrap);
    }
  }
  renderSaved();

  // --- our firsts scrapbook
  (function firsts() {
    const g = $('#scrap'); (window.FIRSTS || []).forEach((f, i) => {
      const c = document.createElement('div'); c.className = 'polaroid reveal'; c.style.setProperty('--rot', ((i * 37) % 7 - 3) + 'deg'); c.dataset.d = (i % 3) * 80;
      c.innerHTML = '<span class="tape"></span><div class="pe"></div><div class="pd"></div><h3></h3><p></p>';
      c.querySelector('.pe').textContent = f.e; c.querySelector('.pd').textContent = f.d; c.querySelector('h3').textContent = f.t; c.querySelector('p').textContent = f.x; g.appendChild(c);
    });
  })();

  // --- search the love notes
  (function search() {
    const data = (window.SEARCH || []), input = $('#q'), res = $('#qres'), info = $('#qinfo'), more = $('#qmore'), chips = $('#qchips'); let shown = 60, hits = [], who = 'all';
    ['marry', 'jannah', 'forever', 'kids', 'miss you', 'jaan', 'proud', 'husband', 'trust'].forEach(w => { const c = document.createElement('button'); c.className = 'chip'; c.textContent = w; c.addEventListener('click', () => { input.value = w; run(); }); chips.appendChild(c); });
    const wh = document.createElement('div'); wh.className = 'qwho'; ['all', 'me', 'you'].forEach(k => { const c = document.createElement('button'); c.className = 'chip' + (k === 'all' ? ' active' : ''); c.textContent = k === 'all' ? 'Both of us' : k === 'me' ? (C.yourName || 'Zayan') : 'You'; c.addEventListener('click', () => { who = k; $$('.qwho .chip').forEach(x => x.classList.toggle('active', x === c)); run(); }); wh.appendChild(c); }); chips.after(wh);
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    function run() {
      const raw = input.value.trim().toLowerCase(); shown = 60; res.innerHTML = ''; more.hidden = true;
      if (raw.length < 2) { info.textContent = data.length ? 'Search ' + data.length.toLocaleString() + ' of our love notes.' : ''; return; }
      const terms = raw.split(/\s+/);
      hits = data.map((r, i) => ({ w: r[0] ? 'you' : 'me', d: r[1], x: r[2], i })).filter(r => (who === 'all' || r.w === who) && terms.every(t => r.x.toLowerCase().includes(t)));
      const me = hits.filter(h => h.w === 'me').length, you = hits.length - me;
      info.textContent = hits.length ? hits.length.toLocaleString() + ' times · ' + (C.yourName || 'Zayan') + ' ' + me.toLocaleString() + ', you ' + you.toLocaleString() + ' · first on ' + hits[0].d : 'Nothing found for "' + raw + '". Try another word.';
      draw(terms);
    }
    function draw(terms) {
      const re = new RegExp('(' + terms.map(esc).join('|') + ')', 'ig');
      hits.slice(res.children.length, shown).forEach(h => {
        const f = document.createElement('figure'); f.className = 'quote ' + (h.w === 'you' ? 'you' : 'me') + ' in'; f.innerHTML = '<blockquote></blockquote><figcaption></figcaption>';
        const bq = f.querySelector('blockquote'); h.x.split(re).forEach((part, k) => { if (k % 2) { const m = document.createElement('mark'); m.textContent = part; bq.appendChild(m); } else bq.appendChild(document.createTextNode(part)); });
        f.querySelector('figcaption').textContent = whoName(h.w) + ' · ' + h.d; lineButtons(h, f); res.appendChild(f);
      });
      more.hidden = hits.length <= shown;
    }
    more.addEventListener('click', () => { shown += 60; draw(input.value.trim().toLowerCase().split(/\s+/)); });
    let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 150); }); run();
  })();

  // --- countdowns
  (function countdowns() {
    const box = $('#counts'), list = (C.countdowns || []).slice(); if (C.meet) list.push({ label: 'Until we meet', exact: C.meet, note: 'Today is the day. I have waited for this for so long. Come here ♥' });
    const today = new Date(); today.setHours(0, 0, 0, 0); const items = [];
    list.forEach(c => { let t; if (c.exact) t = new Date(c.exact + 'T00:00:00'); else { t = new Date(today.getFullYear(), c.month - 1, c.day); if (t < today) t.setFullYear(t.getFullYear() + 1); }
      if (isNaN(t) || (c.exact && t < today)) return; items.push({ ...c, days: Math.round((t - today) / 86400000), t }); });
    items.sort((a, b) => a.days - b.days);
    items.forEach(c => { const d = document.createElement('div'); d.className = 'count reveal' + (c.days === 0 ? ' today' : ''); d.innerHTML = '<b></b><span></span><small></small>';
      d.querySelector('b').textContent = c.days === 0 ? 'Today!' : c.days.toLocaleString(); d.querySelector('span').textContent = c.days === 0 ? c.label : (c.days === 1 ? 'day until ' : 'days until ') + c.label.toLowerCase().replace(/^our /, 'our ').replace(/^until /, '');
      d.querySelector('small').textContent = c.t.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); box.appendChild(d); });
    window.__todayNote = items.find(c => c.days === 0);
  })();

  // --- little surprise heart (floats around; catch it for a random line)
  (function surprise() {
    const heart = $('#surprise'), pop = $('#pop'); if (!heart) return;
    const sweet = /love (you|u)|luv (you|u)|i love|i luv|miss (you|u)|beautiful|proud of|forever|marry|jannah|my life|my world|\bmine\b|only (you|u)\b|\bsafe\b|my wife|my husband|special|meri jaan|my person/i, sour = /sorry|sry|naraz|angry|hurt|cry|sad|stress|problem|fight|mad\b|girls?|boys?|\bex\b|those|them|they|people|but |bhai|\bbro\b|dude|bitch|shut|tf|wtf/i;
    const pool = allQuotes.concat((window.SEARCH || []).filter(r => r[2].length > 24 && r[2].length < 170 && sweet.test(r[2]) && !sour.test(r[2])).map(r => ({ w: r[0] ? 'you' : 'me', d: r[1], x: r[2] })));
    let cur = null, timer;
    const roam = () => { const x = 8 + Math.random() * (innerWidth - 70), y = 90 + Math.random() * (innerHeight - 190); heart.style.transform = `translate(${x}px,${y}px)`; };
    const overlayOpen = () => ['#reader', '#chat', '#pop'].some(s => !$(s).classList.contains('hidden'));
    function appear() { if ($('#app').classList.contains('hidden')) return setTimeout(appear, 2000); heart.classList.remove('hidden'); heart.style.transition = 'none'; roam(); requestAnimationFrame(() => { heart.style.transition = ''; timer = setInterval(() => { if (!overlayOpen()) roam(); }, 5500); }); }
    function show() { cur = pool[Math.floor(Math.random() * pool.length)]; $('#popText').textContent = cur.x; $('#popWho').textContent = whoName(cur.w) + (cur.d ? ' · ' + cur.d : ''); const s = $('#popSave'); s.textContent = isLineSaved(cur) ? '♥' : '♡'; s.classList.toggle('on', isLineSaved(cur)); }
    heart.addEventListener('click', e => { clearInterval(timer); heart.classList.add('hidden'); burst(e.clientX, e.clientY, 12); $('#popHead').textContent = 'you caught it!'; show(); pop.classList.remove('hidden'); });
    $('#popAgain').addEventListener('click', () => { $('#popHead').textContent = 'another one'; show(); });
    $('#popSave').addEventListener('click', e => { toggleLine(cur); const on = isLineSaved(cur); e.currentTarget.textContent = on ? '♥' : '♡'; if (on) burst(e.clientX, e.clientY, 6); });
    $('#popCopy').addEventListener('click', e => copyText(cur.x + ' — ' + whoName(cur.w) + ', ' + cur.d, e.currentTarget));
    $('#popCard').addEventListener('click', e => shareCard(cur, e.currentTarget));
    const close = () => { pop.classList.add('hidden'); setTimeout(appear, 20000); };
    $('#popClose').addEventListener('click', close); pop.addEventListener('click', e => { if (e.target === pop) close(); });
    $('#openBtn').addEventListener('click', () => setTimeout(() => { appear(); if (window.__todayNote) { $('#popHead').textContent = window.__todayNote.label; $('#popText').textContent = window.__todayNote.note; $('#popWho').textContent = (C.yourName || 'Zayan') + ' ♥'; $('#popSave').style.display = 'none'; $('#popCopy').style.display = 'none'; $('#popCard').style.display = 'none'; $('#popAgain').style.display = 'none'; pop.classList.remove('hidden'); burst(innerWidth / 2, innerHeight / 2, 24); } }, 900));
  })();

  // --- secret page: tap the heart in the corner 5 times
  (function secret() {
    const tabs = $('.tabs'), body = $('#secretBody'); (C.secret || []).forEach(p => { const e = document.createElement('p'); e.textContent = p; body.appendChild(e); });
    const sig = document.createElement('p'); sig.className = 'script sign'; sig.textContent = '— ' + (C.yourName || 'Zayan'); body.appendChild(sig);
    function reveal(go) { if (!$('.tab[data-tab=secret]')) { const b = document.createElement('button'); b.className = 'tab'; b.dataset.tab = 'secret'; b.setAttribute('role', 'tab'); b.textContent = '♥ Secret'; b.addEventListener('click', () => setTab('secret')); tabs.appendChild(b); } if (go) setTab('secret'); }
    if (store.get('vday-secret', false)) reveal(false);
    let n = 0, t0 = 0; $('#logoHeart').addEventListener('click', e => { const now = Date.now(); if (now - t0 > 3500) n = 0; t0 = n ? t0 : now; n++; burst(e.clientX, e.clientY, 3); if (n >= 5) { n = 0; store.set('vday-secret', true); burst(innerWidth / 2, innerHeight / 3, 22); reveal(true); } });
  })();
  observe();

})();
