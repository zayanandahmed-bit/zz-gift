(() => {
  const $ = s => document.querySelector(s), b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function unlock(pass) {
    const v = await (await fetch('vault.json', { cache: 'no-cache' })).json();
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(v.s), iterations: v.i, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(v.v) }, key, b64(v.c));
    const s = document.createElement('script'); s.textContent = new TextDecoder().decode(buf); document.head.appendChild(s);
    $('#gate').classList.add('hidden'); $('#intro').classList.remove('hidden');
    const a = document.createElement('script'); a.src = 'app.js?v=1791326359147'; document.body.appendChild(a);
  }
  const err = $('#gateErr'), input = $('#gateInput');
  const clean = p => p.trim().toLowerCase().replace(/\s+/g, '');
  // never remember the word: reloading or coming back to the page always asks again
  try { localStorage.removeItem('vday-k'); sessionStorage.clear(); } catch {}
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  $('#gateForm').addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = 'Checking…';
    try { await unlock(clean(input.value)); input.value = ''; } catch { err.textContent = 'Hmm, try again ♥'; input.value = ''; }
  });
})();
