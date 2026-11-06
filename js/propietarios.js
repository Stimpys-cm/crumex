/* INMOBILIARIA CRUMEX · vender.html: página para propietarios que quieren rentar o vender.
   - Rango de referencia al instante con propiedades parecidas del catálogo (no es avalúo).
   - "Lo que buscan nuestros clientes": lo que el equipo captura en Panel > Lo que buscan.
   - Solicitud por pasos y programa de recomendación → llegan al panel como prospectos de "Captación". */
(function () {
  const CRX = window.CRX; const { $, $$, esc } = CRX; const L = CRX.L; const { fmtN } = L;
  let ui = null, ALL = [], ZONES = [], estOp = 'renta', lastEst = null, want = null;
  const PL = { casa: 'casas', departamento: 'departamentos', terreno: 'terrenos', nave: 'naves industriales' };
  const quant = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  const rnd = (v, op) => (op === 'renta' ? Math.round(v / 100) * 100 : Math.round(v / 10000) * 10000);
  const areaFor = (p, type) => (type === 'terreno' ? Number(p.land_m2) || 0 : Number(p.construction_m2) || Number(p.land_m2) || 0);
  const num = (v) => { const n = Number(String(v || '').replace(/[^\d.]/g, '')); return n > 0 ? n : 0; };

  /* ---------- rango de referencia ---------- */
  function estimate({ op, type, zone, m2, beds }) {
    const base = ALL.filter((p) => p.operation === op && p.type === type && p.currency === 'MXN' && !p.price_on_request && Number(p.price) > 0 && areaFor(p, type) > 0);
    const inZone = zone ? base.filter((p) => p.zone === zone) : [];
    let set = inZone.length >= 3 ? inZone : base;
    const scope = inZone.length >= 3 ? zone : 'Reynosa';
    if (beds && (type === 'casa' || type === 'departamento')) { const b = set.filter((p) => Math.abs((Number(p.bedrooms) || 0) - Number(beds)) <= 1); if (b.length >= 3) set = b; }
    if (set.length < 3) return { none: true, n: set.length };
    const ppm = set.map((p) => Number(p.price) / areaFor(p, type));
    const src = m2 > 0 ? ppm.map((x) => x * m2) : set.map((p) => Number(p.price));
    let min = rnd(quant(src, 0.25), op), max = rnd(quant(src, 0.75), op); if (min > max) [min, max] = [max, min];
    return { n: set.length, scope, min, max, ppm: Math.round(quant(ppm, 0.5)), noArea: !(m2 > 0), fallback: !!zone && scope !== zone };
  }
  function showEstimate() {
    const type = $('#e-type').value, zone = $('#e-zone').value, m2 = num($('#e-m2').value), beds = $('#e-beds').value;
    const r = estimate({ op: estOp, type, zone, m2, beds }); const box = $('#est-res'); box.hidden = false;
    const what = `${PL[type]} en ${estOp === 'renta' ? 'renta' : 'venta'}`;
    lastEst = r.none ? null : Object.assign({ op: estOp, type, zone, m2, beds }, r);
    if (r.none) {
      box.innerHTML = `<p class="o-r-lbl">Aún sin rango</p><p>Todavía no tenemos suficientes ${esc(what)} en nuestro catálogo para darte un rango confiable. Déjanos tus datos y te preparamos una propuesta personalizada.</p><a class="btn btn-gold" href="#solicitud" data-from-est>Quiero una propuesta</a>`;
    } else {
      const unit = estOp === 'renta' ? ' <small>MXN al mes</small>' : ' <small>MXN</small>';
      box.innerHTML = `<p class="o-r-lbl">Rango de referencia${estOp === 'renta' ? ' de renta' : ' de venta'}</p>
        <p class="o-r-val num">${r.min === r.max ? '$' + fmtN(r.min) : `$${fmtN(r.min)} – $${fmtN(r.max)}`}${unit}</p>
        <p class="o-r-n">Con base en ${r.n} ${esc(what)} ${r.scope === 'Reynosa' ? 'de Reynosa' : 'en ' + esc(r.scope)} de nuestro catálogo${r.fallback ? ' (en tu zona aún no hay suficientes, así que usamos toda la ciudad)' : ''}${r.noArea ? '. Pon los m² para afinarlo' : `. Mitad del rango: $${fmtN(r.ppm)} por m²`}.</p>
        <p class="note">Es una referencia, no un avalúo. El precio final depende del estado, la ubicación exacta y los acabados.</p>
        <a class="btn btn-gold" href="#solicitud" data-from-est>Quiero una propuesta con este rango</a>`;
    }
  }

  /* ---------- lo que buscan nuestros clientes ---------- */
  function wantTitle(w) { return `${CRX.TYPES[w.type] || 'Propiedad'}${w.zone ? ' en ' + w.zone : ''}`; }
  function wantLine(w) {
    const bits = [];
    if (w.bedrooms_min) bits.push(`${w.bedrooms_min}+ recámaras`);
    if (w.m2_min) bits.push(`desde ${fmtN(w.m2_min)} m²`);
    if (w.max_price) bits.push(`hasta $${fmtN(w.max_price)} ${w.currency || 'MXN'}${w.operation === 'renta' ? ' al mes' : ''}`);
    return bits.join(' · ');
  }
  function drawWants(list) {
    $('#buscamos').hidden = !list.length;
    $('#wants').innerHTML = list.map((w) => `<article class="want" data-reveal>
        <span class="badge ${w.operation === 'renta' ? 'gold' : 'navy'}">${w.operation === 'renta' ? 'Buscan rentar' : 'Buscan comprar'}</span>
        <h3>${esc(wantTitle(w))}</h3>
        ${wantLine(w) ? `<p class="w-line">${esc(wantLine(w))}</p>` : ''}
        ${w.note ? `<p class="w-note">${esc(w.note)}</p>` : ''}
        <a class="btn btn-line btn-sm" href="#solicitud" data-want-id="${esc(w.id)}">Tengo una así</a>
      </article>`).join('');
  }

  /* ---------- solicitud por pasos ---------- */
  let step = 1;
  const form = () => $('#wiz');
  function syncWiz() {
    const f = form(); const op = (f.querySelector('[name=operacion]:checked') || {}).value || 'Rentar'; const type = f.tipo.value;
    $$('[data-for]', f).forEach((el) => { el.hidden = !el.dataset.for.split(' ').includes(type); });
    $$('[data-for-op]', f).forEach((el) => { el.hidden = !op.includes(el.dataset.forOp); });
    $('#w-price-l').textContent = op === 'Vender' ? 'Precio que esperas (opcional)' : op === 'Rentar' ? 'Renta que esperas al mes (opcional)' : 'Precio o renta que esperas (opcional)';
    const e = lastEst; $('#w-price-h').textContent = e && e.type === type ? `Referencia de nuestro catálogo: $${fmtN(e.min)} – $${fmtN(e.max)}${e.op === 'renta' ? ' al mes' : ''}.` : '';
    $$('fieldset[data-step]', f).forEach((fs) => { fs.hidden = Number(fs.dataset.step) !== step; });
    $('#wiz-step').textContent = `Paso ${step} de 3`; $('.wiz-bar i', f).style.width = `${(step / 3) * 100}%`;
    $('#wiz-back').hidden = step === 1; $('#wiz-next').textContent = step === 3 ? 'Enviar' : 'Siguiente';
  }
  function prefill(o) {
    const f = form();
    if (o.op) { const v = o.op === 'renta' ? 'Rentar' : o.op === 'venta' ? 'Vender' : o.op; const r = f.querySelector(`[name=operacion][value="${v}"]`); if (r) r.checked = true; }
    if (o.type) f.tipo.value = o.type;
    if (o.zone !== undefined && o.zone) f.zona.value = o.zone;
    if (o.m2) (o.type === 'terreno' ? f.m2_terreno : f.m2_aprox).value = o.m2;
    if (o.beds) f.recamaras.value = Number(o.beds) >= 5 ? '5 o más' : String(o.beds);
    step = 1; syncWiz();
  }
  async function submitWiz() {
    const f = form(); const msg = $('#wiz-msg'); const say = (t, c) => { msg.textContent = t; msg.className = 'form-msg ' + (c || ''); };
    if (f.website.value) { say('Gracias.', 'ok'); return; }
    const name = f.full_name.value.trim(), phone = f.phone.value.trim(), email = f.email.value.trim();
    if (name.length < 2) return say('Escribe tu nombre.', 'err');
    if (phone.replace(/\D/g, '').length < 7) return say('Escribe un teléfono válido (mínimo 7 dígitos).', 'err');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say('Revisa tu correo.', 'err');
    if (!f.privacy.checked) return say('Debes aceptar el aviso de privacidad.', 'err');
    const fd = new FormData(f); const payload = {};
    ['operacion', 'zona', 'm2_aprox', 'm2_terreno', 'recamaras', 'banos', 'precio_esperado', 'desocupada', 'amueblada', 'anunciada', 'adeudos', 'horario'].forEach((k) => {
      const el = f.elements[k]; const box = el && el.closest ? el.closest('[data-for][hidden], [data-for-op][hidden]') : null;
      const v = String(fd.get(k) || '').trim(); if (v && !box) payload[k] = v;
    });
    payload.tipo = CRX.TYPES[f.tipo.value] || f.tipo.value; payload.tipo_clave = f.tipo.value;
    if (lastEst && lastEst.type === f.tipo.value) payload.estimado = `$${fmtN(lastEst.min)} – $${fmtN(lastEst.max)}${lastEst.op === 'renta' ? ' al mes' : ''} (${lastEst.n} comparables)`;
    if (want) payload.busqueda = `${want.operation === 'renta' ? 'Buscan rentar' : 'Buscan comprar'}: ${wantTitle(want)}${wantLine(want) ? ' · ' + wantLine(want) : ''}`;
    const btn = $('#wiz-next'); btn.disabled = true; say('Enviando…');
    try {
      await CRX.api.createLead({ kind: 'captacion', full_name: name, phone, email: email || null, message: f.message.value.trim() || null, payload });
      $$('fieldset, .wiz-act, .wiz-bar, .wiz-step', f).forEach((x) => { x.hidden = true; }); say('');
      $('#wiz-done').hidden = false;
      $('#wiz-wa').href = CRX.waLink(`Hola, soy ${name}. Acabo de mandar los datos de mi ${String(payload.tipo).toLowerCase()}${payload.zona ? ' en ' + payload.zona : ''} para ${String(payload.operacion || 'rentar').toLowerCase()}. Les mando unas fotos:`);
      $('#wiz-done').scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (e) { say(CRX.api.errMsg(e), 'err'); }
    btn.disabled = false;
  }
  function bindWiz() {
    const f = form();
    f.tipo.innerHTML = Object.entries(CRX.TYPES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    $('#w-zones').innerHTML = ZONES.map((z) => `<option value="${esc(z.name)}">`).join('');
    f.addEventListener('change', syncWiz);
    $('#wiz-back').addEventListener('click', () => { step = Math.max(1, step - 1); syncWiz(); $('#wiz-msg').textContent = ''; });
    f.addEventListener('submit', (e) => {
      e.preventDefault(); $('#wiz-msg').textContent = '';
      if (step < 3) { step += 1; syncWiz(); const first = f.querySelector(`fieldset[data-step="${step}"] input:not([type=radio]):not(.hp), fieldset[data-step="${step}"] select`); if (first) first.focus(); return; }
      submitWiz();
    });
    syncWiz();
  }

  /* ---------- recomendación ---------- */
  function bindReferral(settings) {
    if (settings.referral_reward) $('#ref-reward').textContent = 'Pásanos sus datos y nosotros lo contactamos. ' + settings.referral_reward;
    const f = $('#ref-form'); const msg = $('.form-msg', f);
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const say = (t, c) => { msg.textContent = t; msg.className = 'form-msg ' + (c || ''); };
      if (f.website.value) return say('Gracias.', 'ok');
      const who = f.recomienda.value.trim(), whoTel = f.recomienda_tel.value.trim(), name = f.full_name.value.trim(), phone = f.phone.value.trim();
      if (who.length < 2 || whoTel.replace(/\D/g, '').length < 7) return say('Escribe tu nombre y tu teléfono.', 'err');
      if (name.length < 2 || phone.replace(/\D/g, '').length < 7) return say('Escribe el nombre y el teléfono del propietario.', 'err');
      if (!f.consent.checked) return say('Confirma que el propietario está de acuerdo en que lo contactemos.', 'err');
      if (!f.privacy.checked) return say('Debes aceptar el aviso de privacidad.', 'err');
      const btn = $('button[type=submit]', f); btn.disabled = true; say('Enviando…');
      try {
        await CRX.api.createLead({ kind: 'captacion', full_name: name, phone, message: f.message.value.trim() || null,
          payload: { recomendado_por: who, recomendante_tel: whoTel, origen_captacion: 'Recomendación', consentimiento: 'Quien recomienda confirma que el propietario está de acuerdo en ser contactado' } });
        say('¡Gracias! Contactaremos al propietario y te avisamos.', 'ok'); f.reset();
      } catch (err) { say(CRX.api.errMsg(err), 'err'); }
      btn.disabled = false;
    });
  }

  async function init() {
    ui = L.chrome({ page: 'vender' });
    const d = await CRX.api.loadPublic();
    ALL = d.properties || []; ZONES = (d.zones || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
    // historial real: propiedades cerradas y cuánto tardaron desde que se publicaron
    const done = ALL.filter((p) => p.status === 'cerrada').sort((a, b) => String(b.closed_at || '').localeCompare(String(a.closed_at || ''))).slice(0, 8);
    if (done.length && $('#hechas')) {
      $('#hechas').hidden = false;
      $('#done-grid').innerHTML = done.map((p) => {
        const days = p.published_at && p.closed_at ? Math.max(1, Math.round((new Date(p.closed_at) - new Date(p.published_at)) / 864e5)) : null;
        const when = p.closed_at ? new Date(p.closed_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) : '';
        return `<article class="done"><span class="done-op">${p.operation === 'renta' ? 'Rentada' : 'Vendida'}</span><b>${esc(CRX.TYPES[p.type] || '')} en ${esc(p.zone || p.public_location || 'Reynosa')}</b>${days ? `<span class="done-days">en ${days} ${days === 1 ? 'día' : 'días'}</span>` : ''}${when ? `<small>${esc(when)}</small>` : ''}</article>`;
      }).join('');
    }
    // estimador
    $('#e-type').innerHTML = Object.entries(CRX.TYPES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    $('#e-zone').innerHTML = '<option value="">Toda Reynosa</option>' + ZONES.map((z) => `<option value="${esc(z.name)}">${esc(z.name)}</option>`).join('');
    const syncEst = () => { const t = $('#e-type').value; $('#e-m2-l').textContent = t === 'terreno' ? 'Terreno (m²)' : 'Construcción (m²)'; $('#e-beds').closest('.field').hidden = !(t === 'casa' || t === 'departamento'); };
    $('#e-type').addEventListener('change', syncEst); syncEst();
    $$('[data-eop]').forEach((b) => b.addEventListener('click', () => { estOp = b.dataset.eop; $$('[data-eop]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); if (!$('#est-res').hidden) showEstimate(); }));
    $('#est-form').addEventListener('submit', (e) => { e.preventDefault(); showEstimate(); });
    // pestañas rentar / vender
    $$('[data-otab]').forEach((b) => b.addEventListener('click', () => { $$('[data-otab]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); }); $$('[data-opane]').forEach((p) => { p.hidden = p.dataset.opane !== b.dataset.otab; }); }));
    drawWants(d.wanted || []);
    bindWiz();
    bindReferral(d.settings || {});
    document.addEventListener('click', (e) => {
      const w = e.target.closest('[data-want]'); if (w) { prefill({ op: w.dataset.want }); want = null; const t = $(`[data-otab="${w.dataset.want}"]`); if (t) t.click(); return; }
      const fe = e.target.closest('[data-from-est]'); if (fe && lastEst) { prefill(lastEst); return; }
      if (fe) { prefill({ op: estOp, type: $('#e-type').value, zone: $('#e-zone').value }); return; }
      const wi = e.target.closest('[data-want-id]');
      if (wi) { want = (d.wanted || []).find((x) => String(x.id) === wi.dataset.wantId) || null; if (want) prefill({ op: want.operation, type: want.type, zone: want.zone || '' }); }
    });
    // ?quiero=renta o ?quiero=venta desde anuncios o publicaciones
    const qq = new URLSearchParams(location.search).get('quiero'); if (qq === 'renta' || qq === 'venta') prefill({ op: qq });
    ui.syncFavs();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
