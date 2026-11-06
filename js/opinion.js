/* INMOBILIARIA CRUMEX · encuesta después de la visita (opinion.html?t=…)
   El enlace lo manda el asesor por WhatsApp desde el panel. La opinión se ve en el panel
   y en el reporte del propietario, sin el nombre de quien la dio. */
(function () {
  const CRX = window.CRX; const { $, $$, esc } = CRX; const L = CRX.L;
  const t = new URLSearchParams(location.search).get('t') || '';
  L.chrome();
  const fail = (m) => { $('#op-prop').textContent = m; $('#op-form').hidden = true; };
  async function init() {
    if (!/^[\w-]{20,64}$/.test(t)) return fail('Este enlace no es válido. Pide uno nuevo a tu asesor.');
    let v; try { v = await CRX.api.visitInfo(t); } catch (e) { return fail(CRX.api.errMsg(e)); }
    $('#op-prop').innerHTML = `${esc(v.ref_code || '')} · <b>${esc(v.title || 'La propiedad que visitaste')}</b>`;
    if (v.done) { $('#op-done').hidden = false; $('.op-h').hidden = true; return; }
    $('#op-form').hidden = false;
    const stars = $$('.stars label');
    const paint = () => { const val = Number(($('.stars input:checked') || {}).value || 0); stars.forEach((l, i) => l.classList.toggle('on', i < val)); };
    $('.stars').addEventListener('change', paint);
    $('#op-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = new FormData(e.target); const msg = $('.form-msg', e.target); const btn = $('button[type=submit]', e.target);
      if (!f.get('rating')) { msg.textContent = 'Elige de 1 a 5 estrellas.'; msg.className = 'form-msg err'; return; }
      btn.disabled = true; msg.textContent = 'Enviando…'; msg.className = 'form-msg';
      try {
        await CRX.api.sendFeedback({ t, rating: Number(f.get('rating')), interest: f.get('interest') || null, liked: String(f.get('liked') || '').trim(), concern: String(f.get('concern') || '').trim() });
        $('#op-form').hidden = true; $('.op-h').hidden = true; $('#op-done').hidden = false;
      } catch (err) { msg.textContent = CRX.api.errMsg(err); msg.className = 'form-msg err'; btn.disabled = false; }
    });
  }
  init();
})();
