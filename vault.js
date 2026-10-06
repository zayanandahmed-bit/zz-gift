(() => {
  const $ = s => document.querySelector(s), b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function unlock(pass) {
    const v = await (await fetch('vault.json', { cache: 'no-cache' })).json();
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(v.s), iterations: v.i, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(v.v) }, key, b64(v.c));
    const s = document.createElement('script'); s.textContent = new TextDecoder().decode(buf); document.head.appendChild(s);
    $('#gate').classList.add('hidden'); $('#intro').classList.remove('hidden');
    const a = document.createElement('script'); a.src = 'app.js'; document.body.appendChild(a);
  }
  const err = $('#gateErr'), input = $('#gateInput');
  async function attempt(p, remember) {
    try { err.textContent = ''; await unlock(p.trim().toLowerCase().replace(/\s+/g, '')); if (remember) { try { localStorage.setItem('vday-k', p.trim().toLowerCase().replace(/\s+/g, '')); } catch {} } return true; }
    catch { return false; }
  }
  $('#gateForm').addEventListener('submit', async e => { e.preventDefault(); err.textContent = 'Checking…'; if (!(await attempt(input.value, true))) { err.textContent = 'Hmm, try again ♥'; input.value = ''; } });
  let saved = null; try { saved = localStorage.getItem('vday-k'); } catch {}
  if (saved) attempt(saved, false).then(ok => { if (!ok) try { localStorage.removeItem('vday-k'); } catch {} });
})();
