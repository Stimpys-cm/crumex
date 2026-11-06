/* INMOBILIARIA CRUMEX · reporte para el propietario: reporte.html?id=<id de la propiedad>
   Solo para el equipo (pide sesión del panel). Muestra cifras de la publicación —vistas, contactos,
   prospectos, visitas, historial de precio— sin ningún dato personal de los interesados. */
(function () {
  const CRX = window.CRX; const { $, esc } = CRX; const L = CRX.L;
  const { fmtN, priceTxt, PLURAL } = L;
  const D = 864e5;
  const pad = (n) => String(n).padStart(2, '0');
  const dayStr = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fdate = (t, long) => new Date(t).toLocaleDateString('es-MX', long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
  const area = (p) => Number(p.construction_m2) || Number(p.land_m2) || 0;
  const STATUS = { borrador: 'Borrador', disponible: 'Disponible', apartada: 'Apartada', cerrada: 'Cerrada', oculta: 'Oculta' };
  let R = null, S = {}, period = '30', OWNER = false, TOKEN = '';
  let saveT = null;
  const ownerUrl = (t) => new URL('reporte.html?t=' + encodeURIComponent(t), location.href).href;

  function range() {
    const now = Date.now(); const p = R.property;
    // "desde que se publicó": desde la publicación (o el primer registro, si es anterior)
    const pub = new Date(p.published_at || p.created_at || now).getTime();
    const first = R.events.length ? new Date(R.events.map((e) => e.day).sort()[0] + 'T00:00:00').getTime() : pub;
    const from = period === 'all' ? Math.min(pub, first) : now - Number(period) * D;
    return { from: Math.min(from, now), to: now };
  }
  function numbers() {
    const { from } = range(); const f = dayStr(from);
    const ev = R.events.filter((e) => e.day >= f);
    const sum = (k) => ev.filter((e) => e.kind === k).reduce((s, e) => s + e.n, 0);
    const leads = R.leads.filter((l) => new Date(l.created_at).getTime() >= from);
    const visits = R.visits.filter((v) => new Date(v.scheduled_at).getTime() >= from && v.status !== 'cancelada');
    const v30 = R.events.filter((e) => e.kind === 'vista' && e.day >= dayStr(Date.now() - 30 * D)).reduce((s, e) => s + e.n, 0);
    return { views: sum('vista'), wa: sum('whatsapp'), fav: sum('favorita'), share: sum('compartir'), sheet: sum('ficha'), leads, visits, done: visits.filter((v) => v.status === 'realizada').length, v30, ev };
  }

  /* gráfica: barras por día (hasta 45 días) o por semana */
  function chart(n) {
    const { from, to } = range();
    const days = Math.max(1, Math.ceil((to - from) / D));
    const weekly = days > 45;
    const buckets = [];
    for (let t = from; t <= to; t += (weekly ? 7 : 1) * D) buckets.push({ t, v: 0, w: 0 });
    if (!buckets.length) buckets.push({ t: from, v: 0, w: 0 });
    n.ev.forEach((e) => {
      const t = new Date(e.day + 'T12:00:00').getTime(); let i = Math.floor((t - from) / ((weekly ? 7 : 1) * D));
      i = Math.max(0, Math.min(buckets.length - 1, i));
      if (e.kind === 'vista') buckets[i].v += e.n; if (e.kind === 'whatsapp') buckets[i].w += e.n;
    });
    const W = 680, H = 170, P = 26, max = Math.max(4, ...buckets.map((b) => b.v));
    const bw = (W - P) / buckets.length;
    const y = (v) => H - 20 - (v / max) * (H - 34);
    const bars = buckets.map((b, i) => {
      const x = P + i * bw; const h = H - 20 - y(b.v);
      return `<rect x="${(x + bw * 0.15).toFixed(1)}" y="${y(b.v).toFixed(1)}" width="${Math.max(1, bw * 0.7).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2" class="b-v"><title>${esc(fdate(b.t))}: ${b.v} vistas, ${b.w} WhatsApp</title></rect>`
        + (b.w ? `<circle cx="${(x + bw / 2).toFixed(1)}" cy="${(y(b.v) - 7).toFixed(1)}" r="3.4" class="b-w"/>` : '');
    }).join('');
    const step = Math.max(1, Math.ceil(buckets.length / 8));
    const labels = buckets.map((b, i) => (i % step ? '' : `<text x="${(P + i * bw + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">${esc(fdate(b.t))}</text>`)).join('');
    const grid = [0, 0.5, 1].map((k) => { const v = Math.round(max * k); return `<line x1="${P}" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text x="${P - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vistas por ${weekly ? 'semana' : 'día'}"><g class="g-grid">${grid}</g>${bars}<g class="g-lab">${labels}</g></svg>
      <p class="r-legend"><span class="lg-v"></span>Vistas por ${weekly ? 'semana' : 'día'} <span class="lg-w"></span>Hubo clics a WhatsApp</p>`;
  }

  function advice(n) {
    const p = R.property; const out = [];
    const contacts = n.wa + n.leads.length;
    const avg = R.peers && R.peers.views_30d_avg;
    if (p.status === 'cerrada') return [`La operación se cerró${p.closed_at ? ' el ' + fdate(p.closed_at, true) : ''}. Gracias por tu confianza.`];
    if (avg && n.v30 < avg * 0.6) out.push(`En los últimos 30 días tuvo menos vistas que otras ${PLURAL[p.type].toLowerCase()} disponibles (${fmtN(n.v30)} contra ${fmtN(avg)} en promedio). Proponemos renovar la foto de portada y volver a compartirla en redes.`);
    if (n.views >= 60 && pct(contacts, n.views) < 2) out.push('Muchas personas la ven, pero pocas escriben. Suele pasar cuando el precio queda por arriba de lo que espera quien busca en la zona; vale la pena revisarlo juntos.');
    if (R.zone_ppm && p.currency === 'MXN' && p.price > 0 && area(p)) {
      const d = Math.round(((p.price / area(p)) / R.zone_ppm.avg - 1) * 100);
      if (d >= 15) out.push(`Su precio por m² está ${d}% arriba de la referencia de ${p.zone || 'la zona'} en nuestro catálogo. Es una referencia, no un avalúo, pero ayuda a decidir.`);
    }
    if ((p.photos || 0) < 10) out.push(`Tiene ${p.photos || 0} ${p.photos === 1 ? 'foto' : 'fotos'}. Con más fotos (al menos 10, de día y con buena luz) quien la ve se anima más a escribir.`);
    if (n.done > 0) out.push(`Ya hubo ${n.done} ${n.done === 1 ? 'visita' : 'visitas'}. Pedimos la opinión de cada visitante para ajustar lo que haga falta.`);
    if (!out.length) out.push('La publicación va bien. Seguimos promoviéndola y te avisamos de cada persona interesada.');
    return out;
  }

  function render() {
    const p = R.property; const n = numbers(); const { from, to } = range();
    const contacts = n.wa + n.leads.length;
    const company = S.company_name || 'INMOBILIARIA CRUMEX';
    const phone = S.phone || (window.CRX_CONFIG && window.CRX_CONFIG.PHONE) || '';
    const pubDays = p.published_at ? Math.max(0, Math.round((Date.now() - new Date(p.published_at)) / D)) : null;
    const photo = p.photo ? CRX.img(p.photo, 640) : '';
    const kpi = (v, l, sub) => `<div class="r-kpi"><b class="num">${fmtN(v)}</b><span>${esc(l)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
    const byKind = {}; n.leads.forEach((l) => { byKind[l.kind] = (byKind[l.kind] || 0) + 1; });
    const KIND = { contacto: 'formulario de contacto', visita: 'solicitud de visita', valuacion: 'estimación', credito: 'crédito', whatsapp: 'WhatsApp', llamada: 'llamada', otro: 'otro' };
    const step = (v, l, base) => `<div class="r-step"><b class="num">${fmtN(v)}</b><span>${esc(l)}</span>${base !== undefined ? `<small>${base > 0 ? pct(v, base) + '% de la etapa anterior' : '—'}</small>` : ''}</div>`;
    const ppm = p.currency === 'MXN' && p.price > 0 && area(p) ? Math.round(p.price / area(p)) : null;
    const notes = R.owner_notes || '';

    $('#sheet').innerHTML = `
      <header class="s-head">
        <div class="s-brand"><span class="mark">C</span><div><small>Inmobiliaria</small><b>CRUMEX</b></div></div>
        <div class="s-meta"><b>Reporte para el propietario</b><span>Generado el ${esc(fdate(Date.now(), true))}</span></div>
      </header>
      <section class="r-prop">
        ${photo ? `<img src="${esc(photo)}" alt="">` : '<div class="r-noph"></div>'}
        <div>
          <p class="s-eyebrow">${esc(p.ref_code || '')} · ${esc(CRX.TYPES[p.type] || p.type)} en ${esc(CRX.OPS[p.operation] ? CRX.OPS[p.operation].toLowerCase() : p.operation)}</p>
          <h1>${esc(p.title)}</h1>
          <p class="r-sub">${esc(p.zone || p.public_location || 'Reynosa')} · <b>${esc(priceTxt(p))}</b>${ppm ? ` · $${fmtN(ppm)} por m²` : ''}</p>
          <p class="r-sub"><span class="r-st st-${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span>${pubDays !== null ? ` Publicada hace ${fmtN(pubDays)} ${pubDays === 1 ? 'día' : 'días'} (${esc(fdate(p.published_at, true))})` : ' Aún no se publica'}</p>
        </div>
      </section>
      ${OWNER ? `<p class="r-hello">Hola${p.owner && p.owner.full_name ? ' ' + esc(String(p.owner.full_name).trim().split(/\s+/)[0]) : ''}, este es el reporte de tu propiedad. Se actualiza solo cada vez que lo abres.</p>` : ''}
      <p class="r-period"><b>Periodo del reporte:</b> del ${esc(fdate(from, true))} al ${esc(fdate(to, true))}</p>

      <section class="r-kpis" aria-label="Resumen">
        ${kpi(n.views, 'Vistas de la publicación', 'Personas distintas, cada 30 min')}
        ${kpi(n.wa, 'Clics para escribir por WhatsApp')}
        ${kpi(n.leads.length, 'Solicitudes recibidas', Object.entries(byKind).map(([k, v]) => `${v} ${KIND[k] || k}`).join(' · '))}
        ${kpi(n.visits.length, 'Visitas agendadas', n.done ? `${n.done} realizadas` : '')}
        ${kpi(n.fav, 'La guardaron en favoritas')}
        ${kpi(n.share + n.sheet, 'Compartida o ficha descargada')}
      </section>

      <section class="r-block"><h2>Cómo se ha visto</h2>${chart(n)}</section>

      <div class="r-two">
        <section class="r-block"><h2>Del interés a la visita</h2>
          <div class="r-funnel">${step(n.views, 'Vistas')}${step(contacts, 'Contactos', n.views)}${step(n.visits.length, 'Visitas', contacts)}</div>
        </section>
        <section class="r-block"><h2>Comparación</h2>
          <dl class="r-dl">
            <div><dt>Vistas en los últimos 30 días</dt><dd>${fmtN(n.v30)}</dd></div>
            ${R.peers && R.peers.views_30d_avg !== null && R.peers.n ? `<div><dt>Promedio de ${esc(PLURAL[p.type].toLowerCase())} disponibles (${R.peers.n})</dt><dd>${fmtN(R.peers.views_30d_avg)}</dd></div>` : ''}
            ${ppm ? `<div><dt>Precio por m² de tu propiedad</dt><dd>$${fmtN(ppm)}</dd></div>` : ''}
            ${R.zone_ppm ? `<div><dt>Referencia en ${esc(p.zone || 'la zona')} (${R.zone_ppm.n} en catálogo)</dt><dd>$${fmtN(R.zone_ppm.avg)}</dd></div>` : ''}
          </dl>
        </section>
      </div>

      ${(() => { const fb = R.visits.filter((v) => v.feedback); if (!fb.length) return '';
        const avg = fb.reduce((s, v) => s + v.feedback.rating, 0) / fb.length; const yes = fb.filter((v) => v.feedback.interest === 'si').length;
        return `<section class="r-block"><h2>Lo que opinaron quienes la visitaron</h2><p class="r-fb-sum"><b>${avg.toFixed(1)} de 5</b> en promedio, ${fb.length} ${fb.length === 1 ? 'opinión' : 'opiniones'}${yes ? `; ${yes} ${yes === 1 ? 'dijo' : 'dijeron'} que sí le interesa` : ''}.</p>
          <ul class="r-fb">${fb.map((v) => `<li><span class="r-st">${'★'.repeat(v.feedback.rating)}${'☆'.repeat(5 - v.feedback.rating)}</span><small>${esc(fdate(v.scheduled_at, true))} · ${esc({ si: 'Le interesa', tal_vez: 'Tal vez', no: 'No le interesa' }[v.feedback.interest] || '')}</small>${v.feedback.liked ? `<p><b>Le gustó:</b> ${esc(v.feedback.liked)}</p>` : ''}${v.feedback.concern ? `<p><b>Le preocupó:</b> ${esc(v.feedback.concern)}</p>` : ''}</li>`).join('')}</ul></section>`; })()}
      ${R.price_history.length ? `<section class="r-block"><h2>Cambios de precio</h2><table class="r-tbl"><thead><tr><th>Fecha</th><th>Antes</th><th>Después</th><th>Cambio</th></tr></thead><tbody>
        ${R.price_history.map((h) => `<tr><td>${esc(fdate(h.changed_at, true))}</td><td>$${fmtN(h.old_price || 0)} ${esc(h.currency || '')}</td><td>$${fmtN(h.new_price || 0)} ${esc(h.currency || '')}</td><td>${h.old_price ? (h.new_price > h.old_price ? '+' : '') + pct(h.new_price - h.old_price, h.old_price) + '%' : '—'}</td></tr>`).join('')}
      </tbody></table></section>` : ''}

      <section class="r-block"><h2>Siguientes pasos que recomendamos</h2><ul class="r-adv">${advice(n).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>

      <section class="r-block r-notes"><h2>Comentarios de tu asesor</h2>
        ${OWNER ? '' : `<textarea id="r-notes" class="no-print" rows="4" placeholder="Escribe aquí lo que quieras contarle al propietario (por ejemplo, la opinión de quienes la visitaron). Se imprime con el reporte y lo ve el propietario en su enlace.">${esc(notes)}</textarea><small class="no-print r-saved" id="r-saved"></small>`}
        <p class="r-notes-p ${OWNER ? '' : 'print-only'}" id="r-notes-p">${esc(notes)}</p>
      </section>

      <footer class="s-foot r-foot">
        <div>${p.advisor ? `<b>Tu asesor:</b> ${esc(p.advisor.full_name)}${p.advisor.phone ? ' · ' + esc(p.advisor.phone) : ''}${p.advisor.email ? ' · ' + esc(p.advisor.email) : ''}` : `<b>${esc(company)}</b>${phone ? ' · Tel. ' + esc(phone) : ''}`}</div>
        <div>Las cifras salen del sitio web de ${esc(company)}: una misma persona cuenta una sola vez cada 30 minutos y no se guarda ningún dato personal de quien la ve. Los contactos por llamada o en persona que no se registraron en el panel no aparecen aquí.</div>
      </footer>`;

    $('.r-notes').classList.toggle('empty', !notes.trim());
    if (OWNER) { $('.r-notes').hidden = !notes.trim(); }
    else {
      // los comentarios se guardan con la propiedad (el propietario los ve en su enlace)
      const ta = $('#r-notes'); const pn = $('#r-notes-p');
      ta.addEventListener('input', () => {
        pn.textContent = ta.value.trim(); $('.r-notes').classList.toggle('empty', !ta.value.trim()); R.owner_notes = ta.value; $('#r-saved').textContent = 'Guardando…';
        clearTimeout(saveT); saveT = setTimeout(async () => { try { await CRX.api.ownerNotes(p.id, ta.value); $('#r-saved').textContent = 'Guardado'; } catch (e) { $('#r-saved').textContent = CRX.api.errMsg(e); } }, 900);
      });
    }
    if (OWNER) { $('#f-print').disabled = false; document.title = `Tu propiedad ${p.ref_code || ''} · ${p.title} | INMOBILIARIA CRUMEX`; return; }

    // WhatsApp al propietario con el resumen
    let digits = String((p.owner && p.owner.phone) || '').replace(/\D/g, ''); if (digits.length === 10) digits = '52' + digits;
    const first = p.owner && p.owner.full_name ? ' ' + String(p.owner.full_name).trim().split(/\s+/)[0] : '';
    const txt = `Hola${first}, te comparto cómo va tu propiedad "${p.title}" (${p.ref_code}) del ${fdate(from, true)} al ${fdate(to, true)}: ${fmtN(n.views)} vistas, ${fmtN(n.wa)} clics a WhatsApp, ${fmtN(n.leads.length)} solicitudes y ${fmtN(n.visits.length)} visitas agendadas. ${R.owner_link ? ` Aquí puedes verlo cuando quieras, siempre actualizado: ${ownerUrl(R.owner_link)}` : ' Te mando el reporte completo en PDF por aquí.'}`;
    $('#r-wa').href = (digits.length >= 11 ? `https://wa.me/${digits}` : 'https://wa.me/') + '?text=' + encodeURIComponent(txt);
    $('#r-wa').title = digits.length >= 11 ? 'Abrir WhatsApp con el propietario' : 'Elige el contacto en WhatsApp (la propiedad no tiene propietario con teléfono)';
    document.title = `Reporte ${p.ref_code || ''} · ${p.title} | INMOBILIARIA CRUMEX`;
    $('#f-print').disabled = false;
  }

  // enlace privado del propietario (lo crea el asesor; se puede quitar cuando quieras)
  function drawLink() {
    const box = $('#r-linkbox'); const t = R.owner_link;
    $('#r-link').textContent = t ? 'Enlace del propietario ✓' : 'Crear enlace para el propietario';
    box.hidden = !t || box.dataset.open !== '1';
    if (t) box.innerHTML = `<p>El propietario abre este enlace y ve su reporte siempre actualizado, sin contraseña. No muestra datos de los interesados.</p>
      <div class="r-lrow"><input id="r-url" readonly value="${esc(ownerUrl(t))}" aria-label="Enlace del propietario"><button class="btn btn-navy btn-sm" type="button" id="r-copy">Copiar</button><button class="btn btn-line btn-sm" type="button" id="r-revoke">Quitar enlace</button></div>`;
  }
  async function linkClick(e) {
    const p = R.property;
    if (e.target.closest('#r-link')) {
      if (!R.owner_link) { try { R.owner_link = (await CRX.api.ownerLink(p.id)).token; } catch (ex) { CRX.toast(CRX.api.errMsg(ex), 'err'); return; } }
      $('#r-linkbox').dataset.open = $('#r-linkbox').dataset.open === '1' && R.owner_link ? '0' : '1'; drawLink(); render(); return;
    }
    if (e.target.closest('#r-copy')) { const v = $('#r-url').value; try { await navigator.clipboard.writeText(v); CRX.toast('Enlace copiado', 'ok'); } catch (ex) { $('#r-url').select(); } return; }
    if (e.target.closest('#r-revoke')) {
      if (!(await CRX.ask('¿Quitar el enlace? El propietario ya no podrá abrirlo. Puedes crear uno nuevo después.', { ok: 'Quitar enlace', danger: true }))) return;
      try { await CRX.api.ownerLink(p.id, true); R.owner_link = null; $('#r-linkbox').dataset.open = '0'; drawLink(); render(); CRX.toast('Enlace quitado', 'ok'); } catch (ex) { CRX.toast(CRX.api.errMsg(ex), 'err'); }
    }
  }

  async function init() {
    const qs = new URLSearchParams(location.search);
    const id = (qs.get('id') || '').trim(); TOKEN = (qs.get('t') || '').trim();
    const fail = (html) => { $('#sheet').innerHTML = `<div class="f-loading">${html}</div>`; };
    if (TOKEN) {
      // vista del propietario: sin sesión, solo lectura
      OWNER = true; document.body.classList.add('owner-view');
      try { history.replaceState(null, '', location.pathname + '?t=' + encodeURIComponent(TOKEN)); } catch (e) { /* nada */ }
      try { [R, S] = await Promise.all([CRX.api.ownerReport(TOKEN), CRX.api.getSettings().catch(() => ({}))]); S = S || {}; }
      catch (e) { return fail(esc(CRX.api.errMsg ? CRX.api.errMsg(e) : e.message)); }
      render(); bindPeriod();
      return;
    }
    if (!id) return fail('Abre el reporte desde <b>Panel &gt; Propiedades</b>.');
    const u = await CRX.api.auth.current().catch(() => null);
    if (!u || !u.active) return fail('Para ver el reporte entra primero al <a href="paginaadminimobi19.html">panel</a>.');
    try { [R, S] = await Promise.all([CRX.api.report(id), CRX.api.getSettings().catch(() => ({}))]); S = S || {}; }
    catch (e) { return fail(esc(CRX.api.errMsg ? CRX.api.errMsg(e) : e.message)); }
    render(); bindPeriod(); drawLink();
    document.addEventListener('click', linkClick);
  }
  function bindPeriod() {
    $('#r-period').addEventListener('click', (e) => {
      const b = e.target.closest('[data-per]'); if (!b) return;
      period = b.dataset.per; document.querySelectorAll('#r-period [data-per]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render();
    });
    $('#f-print').addEventListener('click', () => window.print());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
