/* INMOBILIARIA CRUMEX · página de cada inmueble: inmueble.html?id=1 (o ?ref=CRX-00001) */
(function () {
  const CRX = window.CRX; const { $, $$, esc } = CRX; const L = CRX.L;
  const { ICON, ATTR, HIDDEN_ATTRS, PLURAL, isOwn, priceTxt, priceHtml, waMsg, ppm, ago, fmtN, favs } = L;
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const finePointer = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  let P = null; let photos = []; let cur = 0; let ui = null;

  const setMeta = (sel, attr, val) => { let el = document.head.querySelector(sel); if (!el) { el = document.createElement('meta'); const [k, v] = sel.match(/\[(\w+)="([^"]+)"\]/).slice(1); el.setAttribute(k, v); document.head.appendChild(el); } el.setAttribute(attr, val); };
  const setCanon = (url) => { let l = document.head.querySelector('link[rel="canonical"]'); if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); } l.href = url; };

  /* ---------- galería ---------- */
  function drawGallery() {
    const n = photos.length;
    $('#track').innerHTML = n ? photos.map((ph, i) => `<figure class="slide" aria-hidden="${i !== 0}"><img src="${esc(ph.url)}"${ph.set ? ` srcset="${esc(ph.set)}" sizes="(max-width: 900px) 100vw, 860px"` : ''} alt="${esc(ph.alt)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></figure>`).join('')
      : `<div class="noph noimg">${L.signHtml(P, { lg: 1 })}<span class="noph-note"><b>Todavía no subimos fotos</b><small>Pídelas por WhatsApp y te las mandamos</small></span></div>`;
    $('#thumbs').innerHTML = n > 1 ? photos.map((ph, i) => `<button type="button" data-th="${i}" aria-label="Ver foto ${i + 1} de ${n}"${i === 0 ? ' aria-current="true"' : ''}><img src="${esc(ph.th)}" alt="" loading="lazy"></button>`).join('') : '';
    $('#g-prev').hidden = $('#g-next').hidden = n < 2; $('#g-count').hidden = n < 2; $('#g-zoom').hidden = !n;
    $('#g-zoom').innerHTML = ICON.expand + '<span>Ampliar</span>';
    $('#track').style.cursor = n ? '' : 'default';
    $('#lens').hidden = !(n && finePointer && !reduce);
    go(0, true);
  }
  function go(i, instant) {
    const n = photos.length; if (!n) return;
    cur = (i + n) % n;
    const tr = $('#track'); tr.style.transition = instant || reduce ? 'none' : ''; tr.style.transform = `translateX(-${cur * 100}%)`;
    $$('.slide', tr).forEach((s, k) => s.setAttribute('aria-hidden', k !== cur));
    $('#g-count').textContent = `${cur + 1} / ${n}`;
    $$('[data-th]').forEach((b) => b.toggleAttribute('aria-current', Number(b.dataset.th) === cur));
    const t = $(`[data-th="${cur}"]`); const box = $('#thumbs');
    if (t && box) box.scrollTo({ left: t.offsetLeft - box.clientWidth / 2 + t.clientWidth / 2, behavior: instant || reduce ? 'auto' : 'smooth' });
    $('#lens').style.backgroundImage = `url("${String(photos[cur].full).replace(/"/g, '%22')}")`;
  }
  // lupa: muestra el detalle de la foto bajo el mouse (solo computadora)
  function bindLens() {
    const st = $('#stage'); const lens = $('#lens');
    st.addEventListener('mousemove', (e) => {
      if (lens.hidden || e.target.closest('button')) { st.classList.remove('zooming'); return; }
      const r = st.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * 100; const y = ((e.clientY - r.top) / r.height) * 100;
      lens.style.backgroundPosition = `${x}% ${y}%`; st.classList.add('zooming');
    });
    st.addEventListener('mouseleave', () => st.classList.remove('zooming'));
  }
  function openLb(i) { if (!photos.length) return; cur = i; $('#stage').classList.remove('zooming'); $('#lb').showModal(); showLb(); }
  function showLb() { const ph = photos[cur]; $('#lb-img').src = ph.full; $('#lb-img').alt = ph.alt; $('#lb-cap').textContent = (photos.length > 1 ? `${cur + 1} de ${photos.length}` : '') + (ph.alt && ph.alt !== P.title ? ' · ' + ph.alt : ''); $('#lb-prev').hidden = $('#lb-next').hidden = photos.length < 2; }
  const stepLb = (d) => { cur = (cur + d + photos.length) % photos.length; showLb(); go(cur, true); };
  function swipe(el, onStep) {
    let x0 = null, y0 = null;
    el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1); x0 = null; });
  }

  /* ---------- contenido ---------- */
  function render(all) {
    const p = P;
    const typeName = CRX.TYPES[p.type] || ''; const opName = CRX.OPS[p.operation] || '';
    const zone = p.zone || p.public_location || 'Reynosa';
    const closed = p.status === 'cerrada';

    // SEO y vista previa (los robots de WhatsApp/Facebook reciben su versión desde el servidor)
    const rn = L.refNum(p.ref_code);
    const canon = new URL(rn ? `inmueble.html?id=${rn}` : L.href(p), location.href).href;
    const title = `${p.title} · ${opName} en ${zone}, Reynosa`;
    document.title = `${p.title} | INMOBILIARIA CRUMEX`;
    const desc = `${typeName} en ${opName.toLowerCase()} en ${zone}, Reynosa. ${priceTxt(p)}. ${String(p.description || '').replace(/\s+/g, ' ').slice(0, 120)}`.trim();
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', canon);
    setMeta('meta[property="og:type"]', 'content', 'product');
    const abs = (u) => (/^data:/.test(u) ? '' : new URL(u, location.href).href);
    if (photos[0] && abs(photos[0].url)) setMeta('meta[property="og:image"]', 'content', abs(photos[0].url));
    setCanon(canon);
    const ld = { '@context': 'https://schema.org', '@type': 'RealEstateListing', name: p.title, description: p.description || desc, url: canon, datePosted: p.published_at || undefined,
      image: photos.map((x) => abs(x.url)).filter(Boolean),
      offers: p.price_on_request ? undefined : { '@type': 'Offer', price: p.price, priceCurrency: p.currency, availability: closed ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', businessFunction: p.operation === 'renta' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell' },
      contentLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Reynosa', addressRegion: 'Tamaulipas', addressCountry: 'MX' } } };
    const crumbsLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      ['Inicio', 'tienda.html'], ['Catálogo', 'catalogo.html'], [PLURAL[p.type] || typeName, `catalogo.html?tipo=${p.type}`], [p.title, null]].map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: u ? new URL(u, location.href).href : canon })) };
    [ld, crumbsLd].forEach((o) => { const el = document.createElement('script'); el.type = 'application/ld+json'; el.textContent = JSON.stringify(o); document.head.appendChild(el); });

    // ruta
    $('#crumbs').innerHTML = `<a href="tienda.html">Inicio</a><span>/</span><a href="catalogo.html">Catálogo</a><span>/</span><a href="catalogo.html?op=${esc(p.operation)}">${esc(opName)}</a><span>/</span><a href="catalogo.html?op=${esc(p.operation)}&amp;tipo=${esc(p.type)}">${esc(PLURAL[p.type] || typeName)}</a><span>/</span><b aria-current="page">${esc(p.title)}</b>`;

    // galería
    const tags = [`<span class="badge gold">${esc(opName)}</span>`];
    if (p.status === 'apartada') tags.push('<span class="badge warn">Apartada</span>');
    if (closed) tags.push(`<span class="badge err">${p.operation === 'renta' ? 'Rentada' : 'Vendida'}</span>`);
    if (L.isRecent(p, 14) && p.status === 'disponible') tags.push('<span class="badge ok">Nueva</span>');
    if (p.price_reduced && p.status === 'disponible') tags.push('<span class="badge">Precio rebajado</span>');
    $('#g-tags').innerHTML = tags.join('');
    drawGallery();

    // resumen
    $('#pp-meta').innerHTML = `<span>${esc(p.ref_code)}</span>${p.published_at ? `<span>Publicada ${esc(ago(p.published_at))}</span>` : ''}`;
    $('#pp-title').textContent = p.title;
    $('#pp-where').innerHTML = `${ICON.pin}<span>${esc(typeName)} en ${esc(zone)}, Reynosa</span>`;
    $('#pp-price').innerHTML = priceHtml(p);
    const pm = ppm(p);
    // historial de precio a la vista
    if (p.price_prev && p.status === 'disponible') {
      const when = p.price_changed_at ? new Date(p.price_changed_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }) : '';
      $('#pp-drop').hidden = false;
      $('#pp-drop').innerHTML = `Bajó de <s>$${fmtN(p.price_prev)}</s> a <b>$${fmtN(p.price)}</b>${when ? ` el ${esc(when)}` : ''} (${fmtN(Math.round((1 - p.price / p.price_prev) * 100))}% menos)`;
    }
    { const cr = ((p.attributes || {}).creditos || []).map((k) => (CRX.FEAT.creditos.find((c) => c[0] === k) || [k, k])[1]);
      $('#pp-cred').hidden = !cr.length || p.operation !== 'venta'; $('#pp-cred').innerHTML = cr.length ? `${ICON.check}<span>Acepta ${esc(L.andJoin(cr.map((x, i) => (i && x.startsWith('Crédito') ? x.toLowerCase() : x))))}</span>` : ''; }
    $('#pp-ppm').textContent = pm ? `$${fmtN(Math.round(pm))} ${p.currency}/m²${p.operation === 'renta' ? ' al mes' : ''}` : '';
    const keys = [];
    if (isOwn(p.bedrooms)) keys.push([ICON.bed, p.bedrooms, 'Recámaras']);
    if (isOwn(p.bathrooms)) keys.push([ICON.bath, Number(p.bathrooms), 'Baños']);
    if (isOwn(p.parking)) keys.push([ICON.car, p.parking, 'Estacionamientos']);
    if (isOwn(p.construction_m2)) keys.push([ICON.area, fmtN(p.construction_m2) + ' m²', 'Construcción']);
    if (isOwn(p.land_m2)) keys.push([ICON.land, fmtN(p.land_m2) + ' m²', 'Terreno']);
    const a = p.attributes || {};
    if (isOwn(a.altura_libre_m)) keys.push([ICON.height, a.altura_libre_m + ' m', 'Altura libre']);
    if (isOwn(a.andenes)) keys.push([ICON.dock, a.andenes, 'Andenes']);
    if (isOwn(a.kva)) keys.push([ICON.bolt, fmtN(a.kva) + ' kVA', 'Energía']);
    if (isOwn(a.frente_m) && isOwn(a.fondo_m)) keys.push([ICON.area, `${a.frente_m} × ${a.fondo_m} m`, 'Frente × fondo']);
    $('#pp-keys').innerHTML = keys.slice(0, 6).map(([ic, v, l]) => `<li>${ic}<b>${esc(v)}</b><small>${esc(l)}</small></li>`).join('');
    $('#pp-keys').hidden = !keys.length;

    const wa = CRX.waLink(waMsg(p));
    const fav = favs.has(p.id);
    const n = L.refNum(p.ref_code);
    const sheet = n ? `ficha.html?id=${n}` : `ficha.html?ref=${encodeURIComponent(p.ref_code)}`;
    const shareRow = `<div class="cta-row three"><button class="btn btn-line btn-sm" id="b-share" type="button">${ICON.share}<span>Compartir</span></button><button class="btn btn-line btn-sm" type="button" data-fav="${esc(p.id)}" aria-pressed="${fav}">${fav ? '♥ Guardada' : '♡ Guardar'}</button><a class="btn btn-line btn-sm" id="b-sheet" href="${esc(sheet)}" target="_blank" rel="noopener">${ICON.doc}<span>Ficha PDF</span></a></div>`
      + (p.type === 'nave' && n ? `<a class="en-link" href="industrial.html?id=${n}" hreflang="en" lang="en">View this listing in English</a>` : '');
    $('#pp-cta').innerHTML = closed
      ? `<p class="note">Esta propiedad ya se ${p.operation === 'renta' ? 'rentó' : 'vendió'}. Te ayudamos a encontrar una parecida.</p><a class="btn btn-wa big" target="_blank" rel="noopener" href="${esc(CRX.waLink(`Hola, vi la propiedad ${p.ref_code} (${p.title}) y busco algo similar.`))}">${ICON.wa}<span>Buscar una similar por WhatsApp</span></a>${shareRow}`
      : `<a class="btn btn-wa big" target="_blank" rel="noopener" href="${esc(wa)}" data-wa-prop="${esc(p.id)}">${ICON.wa}<span>${p.status === 'apartada' ? 'Preguntar si se liberó' : 'Preguntar por WhatsApp'}</span></a>
         ${p.status === 'disponible' ? `<a class="btn btn-navy big" href="#agendar">${ICON.cal}<span>Agendar visita sin costo</span></a>` : ''}${shareRow}`;

    // gastos aproximados de compra con los porcentajes de Panel > Ajustes
    if (p.operation === 'venta' && p.currency === 'MXN' && !p.price_on_request && p.price > 0 && p.status === 'disponible') L.loadSettings().then((s) => {
      const rows = String(s.gastos || '').split('\n').map((x) => x.split('|').map((y) => y.trim())).filter(([c, v]) => c && Number(String(v).replace(',', '.')) > 0)
        .map(([c, v]) => [c, Number(String(v).replace(',', '.'))]);
      if (!rows.length) return;
      const tot = rows.reduce((a, [, v]) => a + v, 0);
      $('#pp-costs').innerHTML = `<details class="costs"><summary><span>Gastos de compra aproximados</span><b>$${fmtN(Math.round(p.price * tot / 100))}</b></summary>
        <table>${rows.map(([c, v]) => `<tr><td>${esc(c)} <small>${esc(String(v))}%</small></td><td>$${fmtN(Math.round(p.price * v / 100))}</td></tr>`).join('')}</table>
        <small>Estimación con porcentajes de referencia (${esc(String(Math.round(tot * 100) / 100))}% del precio). El notario te da la cifra exacta según tu caso y tu crédito.</small></details>`;
    }).catch(() => {});
    if (p.operation === 'venta' && p.currency === 'MXN' && !p.price_on_request && p.price > 0 && p.status === 'disponible') {
      const pay = CRX.monthly(p.price * 0.8, 11, 20);
      $('#pp-fin').innerHTML = `<div class="fin"><small>Con crédito, mensualidad estimada desde</small><b class="num">$${fmtN(Math.round(pay))} al mes</b><small>Referencia: 20% de enganche, tasa fija de 11% anual a 20 años. El monto real depende de la institución.</small><a href="tienda.html#creditos">Calcular con otros datos</a></div>`;
    }

    // características
    const det = [['Clave', p.ref_code], ['Operación', opName], ['Tipo', typeName], ['Zona', zone],
      ['Precio', priceTxt(p)], ['Precio por m²', pm ? `$${fmtN(Math.round(pm))} ${p.currency}` : null],
      ['Recámaras', p.bedrooms], ['Baños', isOwn(p.bathrooms) ? Number(p.bathrooms) : null], ['Estacionamientos', p.parking],
      ['Construcción', isOwn(p.construction_m2) ? fmtN(p.construction_m2) + ' m²' : null], ['Terreno', isOwn(p.land_m2) ? fmtN(p.land_m2) + ' m²' : null],
      ['Antigüedad', isOwn(p.age_years) ? (Number(p.age_years) === 0 ? 'A estrenar' : p.age_years + ' años') : null],
      ['Niveles', isOwn(a.niveles) ? (Number(a.niveles) === 1 ? 'Una planta' : a.niveles + ' plantas') : null],
      ['Mantenimiento', isOwn(a.mantenimiento) ? `$${fmtN(a.mantenimiento)} MXN al mes` : null]]
      .concat(Object.entries(a).filter(([k, v]) => isOwn(v) && !HIDDEN_ATTRS.has(k)).map(([k, v]) => [ATTR[k] || k, k === 'kva' ? fmtN(v) : v]))
      .concat([['Disponibilidad', p.status === 'disponible' ? 'Disponible' : CRX.STATUS[p.status]]]);
    $('#pp-det').innerHTML = det.filter(([, v]) => isOwn(v)).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

    // condiciones de renta
    const lab = (list, k) => (list.find((x) => x[0] === k) || [k, ''])[1];
    if (p.operation === 'renta') {
      const r = [];
      if (a.amueblado) r.push(['Amueblada', lab(CRX.FEAT.amueblado, a.amueblado)]);
      if (a.mascotas) r.push(['Mascotas', a.mascotas === 'si' ? 'Sí se aceptan' : a.mascotas === 'no' ? 'No se aceptan' : 'Pregúntanos']);
      if (isOwn(a.deposito_meses)) r.push(['Depósito', Number(a.deposito_meses) === 1 ? 'Un mes de renta' : `${a.deposito_meses} meses de renta`]);
      if (isOwn(a.plazo_min_meses)) r.push(['Contrato mínimo', Number(a.plazo_min_meses) === 12 ? 'Un año' : `${a.plazo_min_meses} meses`]);
      if (a.disponible_desde) r.push(['Disponible desde', new Date(a.disponible_desde + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })]);
      $('#blk-rent').hidden = !r.length && !a.requisitos;
      $('#pp-rent').innerHTML = (r.length ? `<dl class="det">${r.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '')
        + (a.requisitos ? `<div class="req"><b>Requisitos</b><p>${esc(a.requisitos)}</p></div>` : '');
    }
    // planos (fotos marcadas como plano en el panel)
    const plans = L.plansOf(p);
    $('#blk-plans').hidden = !plans.length;
    $('#pp-plans').innerHTML = plans.map((ph, i) => `<a href="${esc(CRX.img(ph, 2400))}" target="_blank" rel="noopener"><img src="${esc(CRX.img(ph, 900))}" alt="${esc(ph.alt || 'Plano ' + (i + 1))}" loading="lazy"><span>${esc(ph.alt || 'Plano ' + (i + 1))}</span></a>`).join('');
    // lo que tiene
    const am = CRX.amenFor(p.type).filter(([k]) => (a.amenidades || []).includes(k));
    $('#blk-amen').hidden = !am.length;
    $('#pp-amen').innerHTML = am.map(([, l]) => `<li>${ICON.check}<span>${esc(l)}</span></li>`).join('');
    // qué hay cerca
    const near = String(a.cerca || '').split('\n').map((x) => x.trim()).filter(Boolean);
    $('#pp-near').hidden = !near.length;
    $('#pp-near').innerHTML = near.length ? `<b>Qué hay cerca</b><ul>${near.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';

    $('#blk-desc').hidden = !p.description;
    $('#pp-desc').innerHTML = String(p.description || '').split(/\n{2,}/).map((t) => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('');

    const hasMap = CRX.map && CRX.map.valid(p.zone_lat, p.zone_lng);
    $('#pp-loc').innerHTML = `<div class="loc-card"><span class="ic">${ICON.pin}</span><div><b>${p.zone ? `<a href="${esc(L.zoneHref(p.zone))}">${esc(zone)}</a>` : esc(zone)}</b><span>Reynosa, Tamaulipas</span><small>Por seguridad del propietario, la dirección exacta se comparte al agendar la visita.${hasMap ? ' El círculo del mapa marca la zona aproximada.' : ''}</small></div>${!hasMap && (p.public_location || p.zone) ? `<a class="btn btn-line btn-sm" target="_blank" rel="noopener" href="${esc(CRX.mapsLink(p.public_location || p.zone))}">Ver zona en el mapa</a>` : p.zone ? `<a class="btn btn-line btn-sm" href="${esc(L.zoneHref(p.zone))}">Más en ${esc(p.zone)}</a>` : ''}</div>`;
    if (hasMap) { $('#pp-map').hidden = false; CRX.map.zone($('#pp-map'), { lat: p.zone_lat, lng: p.zone_lng, label: p.zone }).catch(() => { $('#pp-map').hidden = true; }); }

    renderVideo(p);

    const steps = p.operation === 'renta'
      ? [['Pregunta', 'Confirma disponibilidad, requisitos y fecha de entrada.'], ['Visita', 'Agendamos sin costo para que la conozcas.'], ['Requisitos', 'Revisamos documentos, depósito y, si aplica, aval o póliza.'], ['Contrato', 'Firmas el contrato y recibes la propiedad con inventario.']]
      : [['Pregunta', 'Confirma disponibilidad, condiciones y formas de pago.'], ['Visita', 'Agendamos sin costo para que la conozcas.'], ['Documentos', 'Revisamos escritura, adeudos y tu crédito si lo necesitas.'], ['Firma', 'Te acompañamos hasta la firma ante notario.']];
    $('#pp-proc').innerHTML = steps.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('');

    $('#pp-before').innerHTML = `<b>Antes de decidir</b><p>Precio, medidas y disponibilidad se confirman por escrito antes de cualquier operación. Pide todas las fotos, medidas y documentos que necesites. Nunca entregues dinero sin recibo ni sin haber visto la propiedad.</p><a href="terminos.html#terminos" target="_blank" rel="noopener">Ver términos de uso</a>`;

    // visita
    $('#agendar').innerHTML = p.status === 'disponible' ? `<form class="card-form" id="form-visit" novalidate>
        <h2 id="h-visit">Agenda una visita</h2>
        <p class="muted-p">Sin costo. Te confirmamos fecha y hora por WhatsApp.</p>
        <div class="field"><label for="p-name">Nombre</label><input id="p-name" name="full_name" required autocomplete="name"></div>
        <div class="field"><label for="p-phone">Teléfono / WhatsApp</label><input id="p-phone" name="phone" type="tel" required autocomplete="tel"></div>
        <div class="grid2">
          <div class="field"><label for="p-date">Fecha preferida</label><input id="p-date" name="fecha" type="date" min="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="field"><label for="p-time">Horario</label><select id="p-time" name="horario"><option value="">Cualquiera</option><option>Mañana</option><option>Tarde</option><option>Fin de semana</option></select></div>
        </div>
        <div class="field"><span class="lbl" id="p-mode-l">¿Cómo quieres verla?</span><div class="seg seg-light mode-seg" role="radiogroup" aria-labelledby="p-mode-l"><label><input type="radio" name="modo" value="presencial" checked><span>En persona</span></label><label><input type="radio" name="modo" value="videollamada"><span>Por videollamada</span></label></div><small class="muted">Si estás fuera de Reynosa, te la enseñamos en vivo por WhatsApp.</small></div>
        <div class="field"><label for="p-msg">Comentarios (opcional)</label><textarea id="p-msg" name="message" rows="3" maxlength="600" placeholder="Ej. busco crédito Infonavit, necesito mudarme en enero…"></textarea></div>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="check"><input type="checkbox" name="privacy" required><span>Acepto el <a href="terminos.html#privacidad" target="_blank" rel="noopener">aviso de privacidad</a>.</span></label>
        <button class="btn btn-gold" type="submit">Solicitar visita</button><p class="form-msg" role="status"></p></form>`
      : `<div class="card-form"><h2 id="h-visit">¿Te interesa algo así?</h2><p class="muted-p">Escríbenos y te avisamos cuando tengamos una propiedad parecida.</p><a class="btn btn-wa" target="_blank" rel="noopener" href="${esc(CRX.waLink(`Hola, me interesa algo parecido a ${p.ref_code} (${p.title}).`))}">${ICON.wa}<span>Escribir por WhatsApp</span></a></div>`;
    const form = $('#form-visit');
    if (form) L.bindForm(form, 'visita', () => ({ property_id: p.id, message: `Solicitud de visita${form.modo.value === 'videollamada' ? ' por videollamada' : ''}: ${p.ref_code}, ${p.title}` + (form.message.value.trim() ? '\n' + form.message.value.trim() : ''), payload: { ref_code: p.ref_code, fecha_preferida: form.fecha.value || null, horario: form.horario.value || null, modalidad: form.modo.value || 'presencial' } }));

    renderRails(all);

    // barra en celular
    $('#mb-ref').textContent = p.ref_code; $('#mb-price').textContent = priceTxt(p);
    $('#mb-wa').href = closed ? CRX.waLink(`Hola, busco algo similar a ${p.ref_code}.`) : wa;
    $('#mb-wa').dataset.waProp = p.id;
    $('#mb-wa').innerHTML = ICON.wa + '<span>WhatsApp</span>';
  }

  /* ---------- video y recorrido virtual ----------
     YouTube y Vimeo se ven aquí mismo (se cargan solo al tocar "reproducir");
     Matterport se abre aquí; TikTok, Facebook, Instagram u otros se abren en su app. */
  function mediaInfo(url) {
    let u; try { u = new URL(String(url || '').trim()); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (h === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (/(^|\.)youtube\.com$/.test(h)) id = u.searchParams.get('v') || (u.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/) || [])[2];
    if (id && /^[\w-]{6,20}$/.test(id)) return { kind: 'youtube', id, url: u.href, embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
    if (h === 'vimeo.com' && /^\/\d+/.test(u.pathname)) { const v = u.pathname.split('/')[1]; return { kind: 'vimeo', id: v, url: u.href, embed: `https://player.vimeo.com/video/${v}?autoplay=1` }; }
    if (h === 'my.matterport.com' && u.searchParams.get('m')) return { kind: 'matterport', url: u.href, embed: `https://my.matterport.com/show/?m=${encodeURIComponent(u.searchParams.get('m'))}&play=1` };
    const name = /tiktok/.test(h) ? 'TikTok' : /facebook|fb\.watch/.test(h) ? 'Facebook' : /instagram/.test(h) ? 'Instagram' : h;
    return { kind: 'link', url: u.href, name };
  }
  function renderVideo(p) {
    const a = p.attributes || {}; const items = [mediaInfo(a.video_url), mediaInfo(a.tour_url)].filter(Boolean);
    $('#blk-video').hidden = !items.length; $('#g-video').hidden = !items.length;
    if (!items.length) return;
    $('#g-video').textContent = items[0].kind === 'matterport' || (!a.video_url && a.tour_url) ? '360° Recorrido' : '▶ Video';
    $('#pp-video').innerHTML = items.map((m, i) => {
      const label = i === 0 && a.video_url ? 'Video' : 'Recorrido virtual';
      if (m.kind === 'link') return `<a class="media-link" href="${esc(m.url)}" target="_blank" rel="noopener">${ICON.expand}<span><b>${label}</b><small>Abrir en ${esc(m.name)}</small></span><em aria-hidden="true">↗</em></a>`;
      return `<div class="media" data-embed="${esc(m.embed)}" data-title="${esc(label + ' de ' + p.title)}">${m.thumb ? `<img src="${esc(m.thumb)}" alt="" loading="lazy">` : ''}<button type="button" class="media-play" aria-label="Reproducir ${esc(label.toLowerCase())}"><span>▶</span>${esc(label)}${m.kind === 'matterport' ? ' 360°' : ''}</button></div>`;
    }).join('');
  }

  /* ---------- rieles: misma zona, similares, lo último ---------- */
  function renderRails(all) {
    const p = P; const shown = new Set([p.id]);
    const pool = all.filter((x) => x.id !== p.id && x.status === 'disponible');
    const take = (arr, max) => { const out = arr.filter((x) => !shown.has(x.id)).slice(0, max); out.forEach((x) => shown.add(x.id)); return out; };
    const near = (x) => Math.abs((Number(x.price) || 0) - (Number(p.price) || 0));
    const card = (x) => L.cardHtml(x);

    const zoneList = p.zone ? take(pool.filter((x) => x.zone === p.zone).sort((x, y) => (x.type === p.type ? 0 : 1) - (y.type === p.type ? 0 : 1) || near(x) - near(y)), 8) : [];
    $('#sec-zone').hidden = !zoneList.length;
    if (zoneList.length) { $('#zone-name').textContent = p.zone; $('#zone-more').href = L.zoneHref(p.zone); $('#rail-zone').innerHTML = zoneList.map(card).join(''); }

    let simList = take(pool.filter((x) => x.type === p.type && x.operation === p.operation && (p.currency === x.currency)).sort((x, y) => near(x) - near(y)), 8);
    if (simList.length < 3) simList = simList.concat(take(pool.filter((x) => x.operation === p.operation).sort((x, y) => near(x) - near(y)), 4 - simList.length));
    $('#sec-sim').hidden = !simList.length;
    $('#sim-more').href = `catalogo.html?op=${encodeURIComponent(p.operation)}&tipo=${encodeURIComponent(p.type)}`;
    $('#rail-sim').innerHTML = simList.map(card).join('');

    const newList = take(pool.slice().sort((x, y) => String(y.published_at).localeCompare(String(x.published_at))), 8);
    $('#sec-new').hidden = newList.length < 2;
    $('#rail-new').innerHTML = newList.map(card).join('');
    ui.syncFavs();
  }

  /* ---------- no encontrada / error de carga ---------- */
  function notFound(ref, failed) {
    $('#pp-loading').hidden = true; $('#pp').hidden = true; $('#pp-404').hidden = false;
    $('#nf-title').textContent = failed ? 'No pudimos cargar la propiedad' : 'No encontramos esta propiedad';
    $('#nf-text').textContent = failed ? 'Revisa tu conexión a internet e inténtalo de nuevo. Si el problema sigue, escríbenos por WhatsApp.' : 'Puede que ya no esté publicada o que el enlace esté incompleto.';
    $('#nf-retry').hidden = !failed;
    $('#nf-wa').href = CRX.waLink(ref ? `Hola, busco la propiedad ${ref}.` : 'Hola, busco una propiedad.');
    document.title = (failed ? 'Error al cargar' : 'Propiedad no encontrada') + ' | INMOBILIARIA CRUMEX';
    setMeta('meta[name="robots"]', 'content', 'noindex');
  }

  function bind() {
    $('#g-prev').addEventListener('click', (e) => { e.stopPropagation(); go(cur - 1); });
    $('#g-next').addEventListener('click', (e) => { e.stopPropagation(); go(cur + 1); });
    $('#g-zoom').addEventListener('click', (e) => { e.stopPropagation(); openLb(cur); });
    $('#track').addEventListener('click', () => openLb(cur));
    swipe($('#stage'), (d) => go(cur + d));
    bindLens();
    $('#lb-x').addEventListener('click', () => $('#lb').close());
    $('#lb-prev').addEventListener('click', () => stepLb(-1));
    $('#lb-next').addEventListener('click', () => stepLb(1));
    $('#lb').addEventListener('click', (e) => { if (e.target.id === 'lb') $('#lb').close(); });
    swipe($('#lb'), stepLb);
    $('#nf-retry').addEventListener('click', () => location.reload());
    document.addEventListener('keydown', (e) => {
      if (!P) return;
      if ($('#lb').open) { if (e.key === 'ArrowRight') stepLb(1); if (e.key === 'ArrowLeft') stepLb(-1); return; }
      if (document.querySelector('dialog[open]') || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable],.rail'))) return;
      if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1);
    });
    document.addEventListener('click', (e) => {
      const th = e.target.closest('[data-th]'); if (th) { go(Number(th.dataset.th)); return; }
      const mp = e.target.closest('.media-play');
      if (mp) { const box = mp.closest('.media'); const f = document.createElement('iframe'); f.src = box.dataset.embed; f.title = box.dataset.title; f.allow = 'autoplay; fullscreen; picture-in-picture; xr-spatial-tracking'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin'; box.innerHTML = ''; box.appendChild(f); box.classList.add('on'); return; }
      if (e.target.closest('#g-video')) { $('#blk-video').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); return; }
      if (e.target.closest('#b-sheet')) L.track(P.id, 'ficha');
      if (e.target.closest('#b-share')) {
        L.track(P.id, 'compartir');
        const url = new URL(L.href(P), location.href).href;
        if (navigator.share) navigator.share({ title: P.title, text: `${P.title} · ${priceTxt(P)}`, url }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => CRX.toast('Enlace copiado', 'ok'), () => CRX.toast('Copia el enlace de la barra de direcciones'));
        else CRX.toast('Copia el enlace de la barra de direcciones');
      }
    });
    // barra fija en celular: aparece cuando ya pasaste los botones principales
    const cta = $('#pp-cta');
    if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { $('#mbar').hidden = !P || en.isIntersecting || en.boundingClientRect.top > 0; }).observe(cta);
  }

  function wanted() {
    // inmueble.html?id=1 → CRX-00001 · también ?ref=CRX-00001 y /inmueble/1
    const q = new URLSearchParams(location.search);
    const pm = /\/inmueble\/(\d+)\/?$/.exec(location.pathname);
    const idNum = (q.get('id') || (pm && pm[1]) || '').trim();
    return /^\d{1,7}$/.test(idNum) ? 'CRX-' + idNum.padStart(5, '0') : (q.get('ref') || idNum).trim().slice(0, 120);
  }

  async function init() {
    ui = L.chrome({ page: 'inmueble' });
    bind();
    const ref = wanted();
    if (!ref) { notFound('', false); return; }
    let timer; const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), 15000); });
    let all;
    try {
      [, all] = await Promise.race([Promise.all([ui.ready, CRX.api.listProperties()]), timeout]);
    } catch (e) { clearTimeout(timer); notFound(ref, true); return; }
    clearTimeout(timer);
    const R = ref.toUpperCase();
    P = all.find((x) => String(x.ref_code).toUpperCase() === R || x.slug === ref || x.id === ref) || null;
    if (!P) { notFound(ref, false); return; }
    photos = L.pics(P).map((ph) => ({ url: CRX.img(ph, 1600), set: CRX.srcset(ph), th: CRX.img(ph, 240), full: CRX.img(ph, 2400), alt: ph.alt || P.title }));
    $('#pp-loading').hidden = true;
    $('#pp').hidden = false;
    render(all);
    L.pushSeen(P.id);
    L.track(P.id, 'vista');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
