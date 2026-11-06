/* INMOBILIARIA CRUMEX · lógica de tienda.html, catalogo.html, vender.html, terminos.html y 404.html */
(function () {
  const CRX = window.CRX; const { $, $$, esc, num } = CRX; const L = CRX.L;
  const { ICON, PLURAL, isOwn, photoOf, priceTxt, href, fmtN, noAcc, area, ppm, isRecent, store } = L;
  const PAGE = $('#hero-search') ? 'tienda' : $('#grid') ? 'catalogo' : $('#form-val') ? 'vender' : $('[data-legal-sec]') ? 'terminos' : 'otra';
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let ALL = []; let cmp = []; const CMP_MAX = 3; let ui = null;
  const on = (s, ev, fn) => { const el = $(s); if (el) el.addEventListener(ev, fn); };
  const setH = (s, h) => { const el = $(s); if (el) el.innerHTML = h; };
  const avail = () => ALL.filter((p) => p.status === 'disponible');

  /* ════════════════ comparar (tienda y catálogo) ════════════════ */
  function toggleCmp(id) {
    if (cmp.includes(id)) cmp = cmp.filter((x) => x !== id);
    else if (cmp.length >= CMP_MAX) { CRX.toast(`Puedes comparar hasta ${CMP_MAX} propiedades. Quita una para agregar otra.`); return; }
    else cmp = cmp.concat(id);
    syncCmp();
  }
  function syncCmp() {
    if (!$('#cmp-bar')) return;
    $$('[data-cmp]').forEach((b) => { const sel = cmp.includes(b.dataset.cmp); b.setAttribute('aria-pressed', sel); if (b.classList.contains('cmp-btn')) b.textContent = sel ? '✓ Comparando' : '+ Comparar'; });
    const list = cmp.map((id) => ALL.find((p) => p.id === id)).filter(Boolean);
    $('#cmp-bar').hidden = !list.length; document.body.classList.toggle('has-cmp', !!list.length);
    $('#cmp-thumbs').innerHTML = list.map((p) => `<span>${photoOf(p) ? `<img src="${esc(photoOf(p, 0, 240))}" alt="">` : ICON[p.type]}</span>`).join('');
    $('#cmp-txt').textContent = list.length === 1 ? '1 propiedad · agrega otra para comparar' : `${list.length} propiedades seleccionadas`;
    $('#cmp-go').disabled = list.length < 2;
    if ($('#dlg-cmp').open) { if (list.length < 2) $('#dlg-cmp').close(); else openCmp(); }
  }
  function openCmp() {
    const list = cmp.map((id) => ALL.find((p) => p.id === id)).filter(Boolean);
    if (list.length < 2) return;
    const best = (vals, pick) => { const v = vals.filter((x) => x != null); if (v.length < 2) return null; return pick === 'min' ? Math.min(...v) : Math.max(...v); };
    const sameCur = new Set(list.map((p) => p.currency)).size === 1;
    const own = (k) => (p) => isOwn(p[k]) ? Number(p[k]) : null;
    const rows = [
      ['Precio', (p) => priceTxt(p), sameCur ? list.map((p) => p.price_on_request ? null : Number(p.price)) : null, 'min'],
      ['Precio por m²', (p) => ppm(p) ? '$' + fmtN(Math.round(ppm(p))) + ' ' + p.currency : '—', sameCur ? list.map((p) => ppm(p) || null) : null, 'min'],
      ['Operación', (p) => CRX.OPS[p.operation]], ['Tipo', (p) => CRX.TYPES[p.type]], ['Zona', (p) => p.zone || p.public_location || '—'],
      ['Construcción', (p) => isOwn(p.construction_m2) ? fmtN(p.construction_m2) + ' m²' : '—', list.map(own('construction_m2')), 'max'],
      ['Terreno', (p) => isOwn(p.land_m2) ? fmtN(p.land_m2) + ' m²' : '—', list.map(own('land_m2')), 'max'],
      ['Recámaras', (p) => isOwn(p.bedrooms) ? String(p.bedrooms) : '—', list.map(own('bedrooms')), 'max'],
      ['Baños', (p) => isOwn(p.bathrooms) ? String(Number(p.bathrooms)) : '—', list.map(own('bathrooms')), 'max'],
      ['Estacionamientos', (p) => isOwn(p.parking) ? String(p.parking) : '—'],
      ['Altura libre', (p) => p.attributes && isOwn(p.attributes.altura_libre_m) ? p.attributes.altura_libre_m + ' m' : '—'],
      ['Andenes', (p) => p.attributes && isOwn(p.attributes.andenes) ? String(p.attributes.andenes) : '—'],
      ['Antigüedad', (p) => isOwn(p.age_years) ? p.age_years + ' años' : '—'],
      ['Niveles', (p) => p.attributes && isOwn(p.attributes.niveles) ? String(p.attributes.niveles) : '—'],
      ['Mantenimiento', (p) => p.attributes && isOwn(p.attributes.mantenimiento) ? '$' + fmtN(p.attributes.mantenimiento) + ' al mes' : '—'],
      ['Acepta crédito', (p) => { const c = (p.attributes && p.attributes.creditos) || []; return c.length ? c.map((k) => (CRX.FEAT.creditos.find((x) => x[0] === k) || [k, k])[1]).join(', ') : '—'; }],
      ['Amueblada', (p) => { const v = p.attributes && p.attributes.amueblado; return v ? (CRX.FEAT.amueblado.find((x) => x[0] === v) || [v, v])[1] : '—'; }],
      ['Mascotas', (p) => { const v = p.attributes && p.attributes.mascotas; return v === 'si' ? 'Sí' : v === 'no' ? 'No' : v ? 'Preguntar' : '—'; }],
      ['Lo que tiene', (p) => { const am = CRX.amenFor(p.type).filter(([k]) => ((p.attributes && p.attributes.amenidades) || []).includes(k)).map(([, l]) => l); return am.length ? am.join(', ') : '—'; }],
      ['Estado', (p) => CRX.STATUS[p.status]]
    ].filter(([, fn]) => list.some((p) => fn(p) !== '—'));
    $('#dc-body').innerHTML = `<div class="cmp-wrap"><table class="cmp"><thead><tr><th></th>${list.map((p) => `<th>${photoOf(p) ? `<img src="${esc(photoOf(p, 0, 480))}" alt="">` : `<span class="ph0">${ICON[p.type]}</span>`}<b>${esc(p.title)}</b><div class="cmp-act"><a class="btn btn-line btn-sm" href="${esc(href(p))}">Ver ficha</a> <button class="btn btn-line btn-sm" type="button" data-cmp="${esc(p.id)}">Quitar</button></div></th>`).join('')}</tr></thead>
      <tbody>${rows.map(([label, fn, vals, pick]) => { const b = vals ? best(vals, pick) : null; return `<tr><th scope="row">${esc(label)}</th>${list.map((p, i) => `<td class="${b != null && vals[i] === b ? 'best' : ''}">${esc(fn(p))}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>
      <p class="note" style="margin-top:14px">En verde, el mejor valor de cada fila (menor precio, mayor superficie). El precio solo se compara cuando todas están en la misma moneda.</p>
      <div class="act"><a class="btn btn-wa" target="_blank" rel="noopener" href="${esc(CRX.waLink('Hola, estoy comparando estas propiedades:\n' + list.map((p) => `• ${p.ref_code} · ${p.title} · ${priceTxt(p)}`).join('\n') + '\n¿Me ayudan a decidir?'))}">${ICON.wa}Preguntar por estas en WhatsApp</a></div>`;
    if (!$('#dlg-cmp').open) $('#dlg-cmp').showModal();
  }

  /* ════════════════ vistas recientemente ════════════════ */
  function renderSeen() {
    if (!$('#recientes')) return;
    const list = store.get('crx-seen').map((id) => ALL.find((p) => p.id === id)).filter(Boolean);
    $('#recientes').hidden = !list.length;
    $('#seen-row').innerHTML = list.map(L.miniHtml).join('');
  }

  /* ════════════════ portada ════════════════ */
  function renderHome(d) {
    const av = avail(); const card = (p) => L.cardHtml(p, { cmp });
    // accesos por tipo debajo del buscador, con cuántas hay disponibles
    if ($('#hero-types')) {
      const n = (t) => av.filter((p) => p.type === t).length;
      $('#hero-types').innerHTML = [['casa', 'Casas'], ['departamento', 'Departamentos'], ['terreno', 'Terrenos'], ['nave', 'Naves industriales']]
        .map(([t, l]) => `<a href="catalogo.html?tipo=${t}">${l}${n(t) ? `<small>${n(t)}</small>` : ''}</a>`).join('');
    }

    const recent = av.slice().sort((a, b) => String(b.published_at).localeCompare(String(a.published_at))).slice(0, 8);
    $('#nuevas').hidden = !recent.length; $('#rail-new').innerHTML = recent.map(card).join('');

    // destacadas: una grande con descripción y las demás en horizontal a su lado
    const feat = av.filter((p) => p.featured).slice(0, 3);
    $('#destacadas').hidden = !feat.length;
    $('#featured').className = 'feat feat-' + feat.length;
    $('#featured').innerHTML = feat.map((p, i) => L.cardHtml(p, { cmp, cls: i ? 'h' : 'big', desc: i === 0 })).join('');

    // bajaron de precio: si son pocas, en horizontal junto al título en vez de un riel casi vacío
    const sale = av.filter((p) => p.price_reduced).slice(0, 8); const few = sale.length < 3;
    $('#rebajas').hidden = !sale.length; $('#rebajas').classList.toggle('few', few);
    $('#rail-sale').innerHTML = sale.map((p) => L.cardHtml(p, { cmp, cls: few ? 'h' : '' })).join('');

    // zonas con su ilustración (o la foto de una de sus propiedades)
    const live = ALL.filter((p) => p.status === 'disponible' || p.status === 'apartada'); const zm = {};
    live.forEach((p) => { if (p.zone) (zm[p.zone] = zm[p.zone] || []).push(p); });
    const zones = Object.entries(zm).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, 4);
    $('#zonas').hidden = !zones.length;
    $('#zone-cards').innerHTML = zones.map(([z, list]) => {
      const ph = list.find((p) => photoOf(p)); const img = ph ? photoOf(ph, 0, 640) : '';
      const types = [...new Set(list.map((p) => p.type))]; const n = list.length;
      return `<a class="zcard${img ? ' has-img' : ''}" href="${esc(L.zoneHref(z))}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}<span class="zc-b"><span class="zc-n">${ICON.pin}${esc(z)}</span><b>${n} ${n === 1 ? 'propiedad' : 'propiedades'}</b><small>${esc(L.typesTxt(types))}</small></span></a>`;
    }).join('');
  }
  function renderCompany(s, d) {
    setH('#contact-list', L.contactItems(s));
    setH('#about-txt', s.about ? String(s.about).split(/\n{2,}/).map((t) => `<p>${esc(t)}</p>`).join('')
      : '<p>Somos una inmobiliaria de Reynosa. Rentamos y vendemos casas, departamentos, terrenos y naves industriales, y te acompañamos desde la primera visita hasta la firma.</p><p>Si buscas algo que no ves en el catálogo, dinos qué necesitas y te avisamos cuando llegue algo así.</p>');
    if ($('#facts')) {
      const zones = [...new Set(ALL.map((p) => p.zone).filter(Boolean))];
      const f = [['Oficina', esc(s.address || 'Reynosa, Tamaulipas')], ['WhatsApp', `<a target="_blank" rel="noopener" href="${esc(CRX.waLink('Hola, me gustaría información.'))}">${esc(L.fmtPh(s.whatsapp || s.phone))}</a>`]];
      if (s.hours) f.push(['Horario', esc(s.hours)]);
      f.push(['Zonas', esc(zones.length ? (zones.length > 4 ? zones.slice(0, 4).join(', ') + ' y más' : L.andJoin(zones)) : 'Reynosa y alrededores')]);
      $('#facts').innerHTML = f.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    }
    if (!d) return;
    const team = d.team || [];
    if ($('[data-who="card"]')) $('[data-who="card"]').hidden = team.length > 1;
    if ($('#team')) { $('#team').hidden = team.length < 2; $('#team').innerHTML = team.map((m) => `<div class="member">${m.photo_path ? `<img src="${esc(CRX.api.photoUrl(m.photo_path))}" alt="${esc(m.full_name)}" loading="lazy">` : `<div class="avatar" aria-hidden="true">${esc((m.full_name || '?').trim().charAt(0).toUpperCase())}</div>`}<h3>${esc(m.full_name)}</h3><p>${esc(m.job_title || '')}</p>${m.phone ? `<p><a href="tel:${esc(String(m.phone).replace(/\D/g, ''))}">${esc(m.phone)}</a></p>` : ''}</div>`).join(''); }
    const q = d.testimonials || [];
    if ($('#testimonios')) { $('#testimonios').hidden = !q.length; $('#quotes').innerHTML = q.map((t) => `<blockquote><p>${esc(t.body)}</p><cite>${esc(t.author_name)}</cite></blockquote>`).join(''); }
    const a = d.articles || [];
    // propietarios: lo que buscan nuestros clientes (de Panel > Lo que buscan)
    if ($('#ot-wants')) {
      const w = (d.wanted || []).slice(0, 3);
      const line = (x) => [x.bedrooms_min ? `${x.bedrooms_min}+ rec.` : '', x.m2_min ? `desde ${fmtN(x.m2_min)} m²` : '', x.max_price ? `hasta $${fmtN(x.max_price)} ${x.currency || 'MXN'}${x.operation === 'renta' ? '/mes' : ''}` : ''].filter(Boolean).join(' · ');
      $('#ot-wants').innerHTML = w.length ? `<p class="ot-h">Clientes buscando ahora</p>${w.map((x) => `<a class="ot-w" href="vender.html#buscamos"><span class="badge ${x.operation === 'renta' ? 'gold' : 'navy'}">${x.operation === 'renta' ? 'Buscan rentar' : 'Buscan comprar'}</span><b>${esc(CRX.TYPES[x.type] || 'Propiedad')}${x.zone ? ' en ' + esc(x.zone) : ''}</b>${line(x) ? `<small>${esc(line(x))}</small>` : ''}</a>`).join('')}<a class="more-link" href="vender.html#buscamos">Ver todo lo que nos piden</a>`
        : '<div class="ot-empty"><b>Tu propiedad, en buenas manos</b><p>Estimación sin compromiso, filtro de interesados y un reporte en línea para que veas cómo va.</p></div>';
    }
    if ($('#blog')) {
      $('#blog').hidden = !a.length;
      $('#articles').innerHTML = a.slice(0, 3).map((x) => `<a class="art" href="guias.html?a=${encodeURIComponent(x.slug || x.id)}"><h3>${esc(x.title)}</h3><p>${esc(x.summary || '')}</p><span class="btn btn-line btn-sm">Leer guía</span></a>`).join('');
    }
  }
  function calc() {
    if (!$('#c-price')) return;
    const price = num($('#c-price').value) || 0, down = Math.min(Math.max(num($('#c-down').value) || 0, 0), 100);
    const loan = price * (1 - down / 100); const pay = CRX.monthly(loan, Math.max(num($('#c-rate').value) || 0, 0), num($('#c-years').value) || 0);
    $('#c-out').textContent = pay > 0 ? '$' + fmtN(Math.round(pay)) : '—';
    $('#c-sub').textContent = loan > 0 ? 'Monto a financiar: $' + fmtN(Math.round(loan)) + ' MXN' : '';
    $('#c-wa').href = CRX.waLink(`Hola, quiero asesoría de crédito. Propiedad de $${fmtN(price)}, enganche ${down}%, ${$('#c-years').value} años.`);
  }

  /* ════════════════ catálogo ════════════════ */
  const PER = 12;
  const F0 = () => ({ op: '', types: [], zones: [], cur: 'MXN', min: null, max: null, beds: 0, baths: 0, m2: null, feat: [], photos: false, sale: false, fresh: false, closed: false, q: '', sort: 'rec', page: 1 });
  let F = F0();
  const SORTS = { rec: 'Más recientes', asc: 'Precio: menor a mayor', desc: 'Precio: mayor a menor', m2: 'Mayor superficie', ppm: 'Menor precio por m²' };
  const closedBlocks = new Set(store.get('crx-fclosed'));
  const fkey = (f) => JSON.stringify(Object.assign({}, f, { sort: 0, page: 0, cur: f.min != null || f.max != null ? f.cur : 0 }));

  function match(p, skip) {
    if (!F.closed && p.status === 'cerrada') return false;
    if (skip !== 'op' && F.op && p.operation !== F.op) return false;
    if (skip !== 'types' && F.types.length && !F.types.includes(p.type)) return false;
    if (skip !== 'zones' && F.zones.length && !F.zones.includes(p.zone)) return false;
    if (F.min != null || F.max != null) {
      if (p.price_on_request || p.currency !== F.cur) return false;
      if (F.min != null && !(Number(p.price) >= F.min)) return false;
      if (F.max != null && !(Number(p.price) <= F.max)) return false;
    }
    if (F.beds && !(Number(p.bedrooms) >= F.beds)) return false;
    if (F.baths && !(Number(p.bathrooms) >= F.baths)) return false;
    if (F.m2 && !(area(p) >= F.m2)) return false;
    if (F.feat.length && !F.feat.every((k) => skip === 'feat:' + k || CRX.hasFeat(p, k))) return false;
    if (F.photos && !photoOf(p)) return false;
    if (F.sale && !p.price_reduced) return false;
    if (F.fresh && !isRecent(p, 14)) return false;
    if (F.q) {
      const hay = noAcc([p.title, p.zone, p.public_location, p.description, CRX.TYPES[p.type], CRX.OPS[p.operation], p.ref_code].join(' '));
      if (!noAcc(F.q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  function results() {
    const r = ALL.filter((p) => match(p));
    const pv = (p) => (p.price_on_request ? null : Number(p.price));
    const closedLast = (a, b) => (a.status === 'cerrada') - (b.status === 'cerrada');
    const by = {
      asc: (a, b) => (pv(a) ?? Infinity) - (pv(b) ?? Infinity),
      desc: (a, b) => (pv(b) ?? -1) - (pv(a) ?? -1),
      m2: (a, b) => (area(b) || 0) - (area(a) || 0),
      ppm: (a, b) => (ppm(a) || Infinity) - (ppm(b) || Infinity),
      rec: (a, b) => String(b.published_at).localeCompare(String(a.published_at))
    };
    const fn = by[F.sort] || by.rec;
    return r.sort((a, b) => closedLast(a, b) || fn(a, b));
  }
  function catUrl() {
    const q = new URLSearchParams();
    if (F.op) q.set('op', F.op); F.types.forEach((t) => q.append('tipo', t)); F.zones.forEach((z) => q.append('zona', z));
    if (F.min != null) q.set('min', F.min); if (F.max != null) q.set('max', F.max); if ((F.min != null || F.max != null) && F.cur !== 'MXN') q.set('mon', F.cur);
    if (F.beds) q.set('rec', F.beds); if (F.baths) q.set('banos', F.baths); if (F.m2) q.set('m2', F.m2);
    F.feat.forEach((k) => q.append('con', k));
    if (F.photos) q.set('fotos', 1); if (F.sale) q.set('rebaja', 1); if (F.fresh) q.set('nuevas', 1); if (F.closed) q.set('cerradas', 1);
    if (F.q) q.set('q', F.q); if (F.sort !== 'rec') q.set('orden', F.sort); if (F.page > 1) q.set('pag', F.page);
    const s = q.toString(); return location.pathname + (s ? '?' + s : '');
  }
  function fromUrl(q) {
    const f = F0();
    if (CRX.OPS[q.get('op')]) f.op = q.get('op');
    f.types = [...new Set(q.getAll('tipo').join(',').split(',').filter((t) => CRX.TYPES[t]))];
    f.zones = [...new Set(q.getAll('zona').filter(Boolean))];
    if (q.get('mon') === 'USD') f.cur = 'USD';
    f.min = num(q.get('min')); f.max = num(q.get('max')); f.m2 = num(q.get('m2'));
    f.beds = Math.max(0, Math.min(9, parseInt(q.get('rec'), 10) || 0)); f.baths = Math.max(0, Math.min(9, parseInt(q.get('banos'), 10) || 0));
    f.feat = [...new Set(q.getAll('con').filter((k) => CRX.FEAT_FILTERS[k]))];
    f.photos = q.get('fotos') === '1'; f.sale = q.get('rebaja') === '1'; f.fresh = q.get('nuevas') === '1'; f.closed = q.get('cerradas') === '1';
    f.q = (q.get('q') || '').trim().slice(0, 80); if (SORTS[q.get('orden')]) f.sort = q.get('orden');
    f.page = Math.max(1, parseInt(q.get('pag'), 10) || 1);
    return f;
  }
  function filtersHtml() {
    const block = (key, title, body) => `<div class="fblock${closedBlocks.has(key) ? ' closed' : ''}" data-block="${key}"><button class="ftoggle" type="button" aria-expanded="${!closedBlocks.has(key)}">${title}${ICON.chev}</button><div class="freveal"><div>${body}</div></div></div>`;
    const pills = (key, opts) => `<div class="fpills">${opts.map(([v, l]) => `<button type="button" class="fpill" data-pill="${key}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
    const check = (key, v, l) => `<label class="fcheck" data-cbox="${key}" data-v="${esc(v)}"><input type="checkbox" data-chk="${key}" value="${esc(v)}"><span class="fbox">${ICON.tick}</span><span class="ftxt">${esc(l)}</span><span class="fn"></span></label>`;
    const zones = [...new Set(ALL.filter((p) => p.status !== 'cerrada' || F.closed).map((p) => p.zone).concat(F.zones).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    // solo las características que tiene al menos una propiedad (o que ya vienen en el enlace)
    const feats = Object.keys(CRX.FEAT_FILTERS).filter((k) => F.feat.includes(k) || ALL.some((p) => p.status !== 'cerrada' && CRX.hasFeat(p, k)));
    return block('q', 'Palabra clave', `<div class="field" style="margin:0"><input data-in="q" type="search" placeholder="Zona, clave o palabra" aria-label="Palabra clave" maxlength="80"></div>`)
      + block('op', 'Operación', pills('op', [['', 'Todas'], ['venta', 'Venta'], ['renta', 'Renta']]))
      + block('types', 'Tipo de propiedad', Object.entries(CRX.TYPES).map(([k, v]) => check('types', k, v)).join(''))
      + (zones.length ? block('zones', 'Zona', zones.map((z) => check('zones', z, z)).join('')) : '')
      + block('price', 'Precio', pills('cur', [['MXN', 'MXN'], ['USD', 'USD']]) + `<div class="fprice"><input data-in="min" inputmode="numeric" placeholder="Mínimo" aria-label="Precio mínimo"><span aria-hidden="true">–</span><input data-in="max" inputmode="numeric" placeholder="Máximo" aria-label="Precio máximo"></div><p class="fhint">Al poner un precio solo se muestran propiedades en esa moneda.</p>`)
      + block('beds', 'Recámaras', pills('beds', [['0', 'Todas'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+']]))
      + block('baths', 'Baños', pills('baths', [['0', 'Todos'], ['1', '1+'], ['2', '2+'], ['3', '3+']]))
      + block('m2', 'Superficie mínima', `<div class="field" style="margin:0"><input data-in="m2" inputmode="numeric" placeholder="m² de construcción o terreno" aria-label="Superficie mínima en metros cuadrados"></div>`)
      + (feats.length ? block('feat', 'Características', feats.map((k) => check('feat', k, CRX.FEAT_FILTERS[k])).join('')) : '')
      + block('more', 'Más opciones', check('flag', 'photos', 'Con fotografías') + check('flag', 'sale', 'Precio rebajado') + check('flag', 'fresh', 'Publicadas en los últimos 14 días') + check('flag', 'closed', 'Incluir vendidas y rentadas'));
  }
  function syncFilters() {
    $$('[data-filters]').forEach((box) => {
      $$('[data-pill]', box).forEach((b) => { const k = b.dataset.pill; const cur = k === 'op' ? F.op : k === 'cur' ? F.cur : String(F[k]); b.setAttribute('aria-pressed', cur === b.dataset.v); });
      $$('[data-chk]', box).forEach((c) => { const k = c.dataset.chk; c.checked = k === 'flag' ? !!F[c.value] : F[k].includes(c.value); });
      $$('[data-in]', box).forEach((i) => { if (document.activeElement === i) return; const v = F[i.dataset.in]; i.value = v == null ? '' : v; });
      $$('[data-cbox]', box).forEach((l) => {
        const k = l.dataset.cbox; if (k === 'flag') return;
        const v = l.dataset.v;
        const n = k === 'feat' ? ALL.filter((p) => match(p, 'feat:' + v) && CRX.hasFeat(p, v)).length : ALL.filter((p) => match(p, k) && (k === 'types' ? p.type === v : p.zone === v)).length;
        $('.fn', l).textContent = n; l.classList.toggle('zero', !n && !$('input', l).checked);
      });
    });
  }
  function activeChips() {
    const c = [];
    if (F.op) c.push(['op', '', CRX.OPS[F.op]]);
    F.types.forEach((t) => c.push(['types', t, CRX.TYPES[t]]));
    F.zones.forEach((z) => c.push(['zones', z, z]));
    if (F.min != null) c.push(['min', '', `Desde $${fmtN(F.min)} ${F.cur}`]);
    if (F.max != null) c.push(['max', '', `Hasta $${fmtN(F.max)} ${F.cur}`]);
    if (F.beds) c.push(['beds', '', `${F.beds}+ recámaras`]);
    if (F.baths) c.push(['baths', '', `${F.baths}+ baños`]);
    if (F.m2) c.push(['m2', '', `Desde ${fmtN(F.m2)} m²`]);
    F.feat.forEach((k) => c.push(['feat', k, CRX.FEAT_FILTERS[k]]));
    if (F.photos) c.push(['photos', '', 'Con fotos']); if (F.sale) c.push(['sale', '', 'Precio rebajado']);
    if (F.fresh) c.push(['fresh', '', 'Nuevas']); if (F.closed) c.push(['closed', '', 'Incluye vendidas']);
    if (F.q) c.push(['q', '', `“${F.q}”`]);
    return c;
  }
  function renderCatalog(opts) {
    opts = opts || {};
    const list = results(); const pages = Math.max(1, Math.ceil(list.length / PER));
    if (mapOn) drawCatMap();
    if (F.page > pages) F.page = pages;
    const slice = list.slice((F.page - 1) * PER, F.page * PER);
    $('#grid').innerHTML = slice.map((p) => L.cardHtml(p, { cmp })).join('');
    $('#grid').hidden = !list.length; $('#empty').hidden = !!list.length;
    $('#count').innerHTML = list.length ? `<b class="num">${fmtN(list.length)}</b> ${list.length === 1 ? 'propiedad' : 'propiedades'}${pages > 1 ? ` <span class="muted">· página ${F.page} de ${pages}</span>` : ''}` : 'Sin resultados';
    $('#fd-n').textContent = fmtN(list.length);
    const chips = activeChips();
    $('#f-n').hidden = !chips.length; $('#f-n').textContent = chips.length;
    $('#active-chips').hidden = !chips.length;
    $('#active-chips').innerHTML = chips.map(([k, v, l]) => `<span class="chip">${esc(l)}<button type="button" data-chip="${k}" data-v="${esc(v)}" aria-label="Quitar filtro ${esc(l)}">×</button></span>`).join('') + (chips.length ? '<button class="clear" type="button" data-fclear>Limpiar todo</button>' : '') + (F.zones.length === 1 ? `<a class="zone-page" href="${esc(L.zoneHref(F.zones[0]))}">${ICON.pin}Ver la página de ${esc(F.zones[0])}</a>` : '');
    // paginación numerada
    if (pages < 2) $('#pager').innerHTML = '';
    else {
      const nums = []; for (let i = 1; i <= pages; i++) { if (i === 1 || i === pages || Math.abs(i - F.page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…'); }
      $('#pager').innerHTML = `<button type="button" data-page="${F.page - 1}" ${F.page === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>` + nums.map((n) => n === '…' ? '<span class="gap">…</span>' : `<button type="button" data-page="${n}" ${n === F.page ? 'aria-current="page"' : ''} aria-label="Página ${n}">${n}</button>`).join('') + `<button type="button" data-page="${F.page + 1}" ${F.page === pages ? 'disabled' : ''} aria-label="Página siguiente">›</button>`;
    }
    $('#sort-lbl').textContent = SORTS[F.sort];
    $$('#sort-menu [data-sort]').forEach((b) => b.setAttribute('aria-checked', b.dataset.sort === F.sort));
    setH('#cat-n', fmtN(ALL.filter((p) => p.status !== 'cerrada').length));
    syncFilters();
    const url = catUrl();
    if (ui) ui.markSubnav(new URLSearchParams(url.split('?')[1] || ''));
    const cur = fkey(F);
    $$('#quick-links a').forEach((a) => { a.classList.toggle('on', fkey(fromUrl(new URL(a.href).searchParams)) === cur); });
    document.title = (F.types.length === 1 && !F.op ? PLURAL[F.types[0]] : F.op && !F.types.length ? 'Propiedades en ' + CRX.OPS[F.op].toLowerCase() : 'Catálogo de propiedades') + ' en Reynosa · INMOBILIARIA CRUMEX';
    try { history.replaceState(null, '', url + location.hash); } catch (e) { /* file:// u otros */ }
    syncCmp(); ui.syncFavs();
    if (opts.scroll) { const y = $('#catalogo').getBoundingClientRect().top + window.scrollY - 130; if (window.scrollY > y) window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' }); }
  }
  // mapa de zonas con los resultados actuales
  let catMap = null, mapOn = false;
  function zoneGroups() {
    const g = {}; results().forEach((p) => { if (!p.zone || !CRX.map || !CRX.map.valid(p.zone_lat, p.zone_lng)) return; (g[p.zone] = g[p.zone] || { label: p.zone, lat: p.zone_lat, lng: p.zone_lng, count: 0 }).count++; });
    return Object.values(g);
  }
  async function drawCatMap() {
    if (!mapOn || !CRX.map) return;
    const groups = zoneGroups();
    if (catMap) { catMap.update(groups); return; }
    try { catMap = await CRX.map.zones($('#cat-map-el'), groups, (z) => { setF({ zones: [z] }, { scroll: false }); }); }
    catch (e) { $('#cat-map').innerHTML = '<p class="note">No se pudo cargar el mapa. Revisa tu conexión e inténtalo de nuevo.</p>'; }
  }
  function setF(patch, opts) { Object.assign(F, patch); if (!('page' in patch)) F.page = 1; renderCatalog(opts); }

  function bindCatalog() {
    $$('[data-filters]').forEach((box) => {
      box.addEventListener('click', (e) => {
        const tg = e.target.closest('.ftoggle');
        if (tg) { const b = tg.closest('.fblock'); b.classList.toggle('closed'); tg.setAttribute('aria-expanded', !b.classList.contains('closed')); if (b.classList.contains('closed')) closedBlocks.add(b.dataset.block); else closedBlocks.delete(b.dataset.block); store.set('crx-fclosed', [...closedBlocks]); return; }
        const pl = e.target.closest('[data-pill]');
        if (pl) { const k = pl.dataset.pill, v = pl.dataset.v; setF({ [k]: k === 'op' || k === 'cur' ? v : Number(v) }); }
      });
      box.addEventListener('change', (e) => {
        const c = e.target.closest('[data-chk]'); if (!c) return;
        const k = c.dataset.chk;
        if (k === 'flag') setF({ [c.value]: c.checked });
        else setF({ [k]: c.checked ? F[k].concat(c.value) : F[k].filter((x) => x !== c.value) });
      });
      box.addEventListener('input', CRX.debounce((e) => {
        const i = e.target.closest('[data-in]'); if (!i) return;
        const k = i.dataset.in; setF({ [k]: k === 'q' ? i.value.trim().slice(0, 80) : num(i.value) });
        if (k === 'q' && $('#hq')) $('#hq').value = F.q;
      }, 320));
    });
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-fclear]')) { setF(Object.assign(F0(), { sort: F.sort })); if ($('#hq')) $('#hq').value = ''; return; }
      const ch = t.closest('[data-chip]');
      if (ch) {
        const k = ch.dataset.chip, v = ch.dataset.v; const p = {};
        if (k === 'types' || k === 'zones' || k === 'feat') p[k] = F[k].filter((x) => x !== v);
        else if (['photos', 'sale', 'fresh', 'closed'].includes(k)) p[k] = false;
        else if (k === 'op' || k === 'q') p[k] = '';
        else if (k === 'beds' || k === 'baths') p[k] = 0;
        else p[k] = null;
        setF(p); if (k === 'q' && $('#hq')) $('#hq').value = ''; return;
      }
      const pg = t.closest('[data-page]'); if (pg && !pg.disabled) { setF({ page: Number(pg.dataset.page) }, { scroll: true }); return; }
      const so = t.closest('[data-sort]'); if (so) { closeSort(); setF({ sort: so.dataset.sort }); $('#sort-btn').focus(); return; }
      if (t.closest('#sort-btn')) { const m = $('#sort-menu'); m.hidden = !m.hidden; $('#sort-btn').setAttribute('aria-expanded', String(!m.hidden)); if (!m.hidden) { const sel = $('[aria-checked="true"]', m) || $('[data-sort]', m); sel.focus(); } return; }
      if (!t.closest('.sort')) closeSort();
      if (t.closest('[data-alert-open]')) { openAlert(); return; }
      // los enlaces a catalogo.html?… filtran sin recargar la página
      const a = t.closest('a[href]');
      if (a && !e.defaultPrevented && !e.ctrlKey && !e.metaKey && !e.shiftKey && a.target !== '_blank') {
        const u = new URL(a.href, location.href);
        if (u.origin === location.origin && /\/catalogo(\.html)?$/.test(u.pathname) && !u.hash) {
          e.preventDefault(); F = fromUrl(u.searchParams); if ($('#hq')) $('#hq').value = F.q;
          closeF(); renderCatalog({ scroll: true });
        }
      }
    });
    function closeSort() { $('#sort-menu').hidden = true; $('#sort-btn').setAttribute('aria-expanded', 'false'); }
    $('#sort-menu').addEventListener('keydown', (e) => {
      const items = $$('[data-sort]', $('#sort-menu')); const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
      if (e.key === 'Escape') { closeSort(); $('#sort-btn').focus(); }
    });
    // filtros en celular (cajón)
    const openF = () => { $('#fdrawer').hidden = false; $('#fscrim').hidden = false; $('#f-open').setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('#fd-close').focus(); };
    function closeF() { if ($('#fdrawer').hidden) return; $('#fdrawer').hidden = true; $('#fscrim').hidden = true; $('#f-open').setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
    on('#f-open', 'click', openF); on('#fd-close', 'click', closeF); on('#fscrim', 'click', closeF);
    on('#fd-apply', 'click', () => { closeF(); renderCatalog({ scroll: true }); });
    on('#map-toggle', 'click', () => {
      mapOn = !mapOn; $('#cat-map').hidden = !mapOn; $('#map-toggle').setAttribute('aria-pressed', String(mapOn)); $('#map-toggle').textContent = mapOn ? 'Ocultar el mapa' : 'Ver en el mapa';
      if (mapOn) drawCatMap(); else if (catMap) setTimeout(() => catMap.map.invalidateSize(), 0);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeF(); closeSort(); } });
    window.addEventListener('popstate', () => { F = fromUrl(new URLSearchParams(location.search)); renderCatalog(); });
    if ($('#form-alert')) L.bindForm($('#form-alert'), 'contacto', () => {
      const c = activeChips().map((x) => x[2]); const extra = $('#form-alert').message.value.trim();
      return { alert: { op: F.op, types: F.types, zones: F.zones, cur: F.cur, min: F.min, max: F.max, beds: F.beds, baths: F.baths, m2: F.m2, feat: F.feat, q: F.q },
        message: 'Alerta de búsqueda: ' + (c.join(', ') || 'cualquier propiedad') + (extra ? '\n' + extra : ''),
        payload: { alerta: true, operacion: F.op || null, tipos: F.types.join(', ') || null, zonas: F.zones.join(', ') || null, recamaras: F.beds || null, banos: F.baths || null, caracteristicas: F.feat.map((k) => CRX.FEAT_FILTERS[k]).join(', ') || null, moneda: F.cur, precio_min: F.min, precio_max: F.max, m2_min: F.m2, texto: F.q || null } };
    }, { ok: '¡Listo! Si dejaste tu correo, cada mañana te llega lo nuevo que coincida. También te avisamos por WhatsApp.' });
  }
  function openAlert() {
    const c = activeChips().map((x) => x[2]);
    $('#alert-chips').innerHTML = c.length ? c.map((x) => `<span class="chip">${esc(x)}</span>`).join('') : '<span class="chip">Cualquier propiedad</span>';
    const m = $('#form-alert .form-msg'); if (m) { m.textContent = ''; m.className = 'form-msg'; }
    $('#dlg-alert').showModal();
  }

  /* ════════════════ términos ════════════════ */
  function renderLegal(s) {
    const co = [['Razón social', s.razon_social], ['RFC', s.rfc], ['Domicilio', s.address], ['Registro estatal de agente inmobiliario', s.license], ['Contrato registrado ante PROFECO', s.profeco_contrato]].filter(([, v]) => v);
    if ($('#legal-company')) { $('#legal-company').hidden = !co.length; $('#legal-company').innerHTML = co.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join(''); }
    $$('[data-legal-sec]').forEach((sec) => {
      const txt = s[sec.dataset.legalSec]; if (!txt) return;
      $('[data-legal-body]', sec).innerHTML = String(txt).split(/\n{2,}/).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('');
    });
    setH('#contact-list', L.contactItems(s));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) $$('.toc a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-35% 0px -60% 0px' });
      $$('.legal-sec[id]').forEach((x) => io.observe(x));
    }
  }

  /* ════════════════ arranque ════════════════ */
  async function init() {
    // enlaces viejos: tienda.html#propiedad=CRX-00001
    const m = /propiedad=([^&]+)/.exec(location.hash); if (m) { location.replace(href({ ref_code: decodeURIComponent(m[1]) })); return; }
    ui = L.chrome({ page: PAGE, onSearch: PAGE === 'catalogo' ? (q) => setF(Object.assign(F0(), { sort: F.sort, q: q.slice(0, 80) }), { scroll: true }) : null });
    document.addEventListener('click', (e) => {
      const cb = e.target.closest('[data-cmp]'); if (cb) { e.preventDefault(); toggleCmp(cb.dataset.cmp); return; }
      const sp = e.target.closest('[data-sop]'); if (sp) { $$('[data-sop]').forEach((b) => { b.classList.toggle('on', b === sp); b.setAttribute('aria-pressed', b === sp); }); $('#s-op').value = sp.dataset.sop; return; }
      const st = e.target.closest('[data-steps]'); if (st) { $$('[data-steps]').forEach((b) => { const sel = b === st; b.classList.toggle('on', sel); b.setAttribute('aria-selected', sel); }); $('#steps-buy').hidden = st.dataset.steps !== 'buy'; $('#steps-sell').hidden = st.dataset.steps !== 'sell'; }
    });
    on('#cmp-go', 'click', openCmp); on('#cmp-clear', 'click', () => { cmp = []; syncCmp(); });
    on('#seen-clear', 'click', () => { store.set('crx-seen', []); renderSeen(); });
    const fillTypes = (sel, byKey) => { const el = $(sel); if (el) el.insertAdjacentHTML('beforeend', Object.entries(CRX.TYPES).map(([k, v]) => `<option value="${byKey ? k : esc(v)}">${esc(v)}</option>`).join('')); };
    fillTypes('#s-type', true); fillTypes('#v-type', false);
    on('#hero-search', 'submit', (e) => {
      e.preventDefault(); const q = new URLSearchParams();
      if ($('#s-op').value) q.set('op', $('#s-op').value); if ($('#s-type').value) q.set('tipo', $('#s-type').value); if ($('#s-q').value.trim()) q.set('q', $('#s-q').value.trim().slice(0, 80));
      location.href = 'catalogo.html' + (q.toString() ? '?' + q : '');
    });
    ['#c-price', '#c-down', '#c-rate', '#c-years'].forEach((q) => on(q, 'input', calc)); on('#calc', 'submit', (e) => e.preventDefault()); calc();
    if ($('#form-contact')) L.bindForm($('#form-contact'), 'contacto');
    if ($('#form-val')) L.bindForm($('#form-val'), 'valuacion', () => {
      const f = $('#form-val');
      return { payload: { operacion: f.operacion.value, tipo: f.tipo.value, zona: f.zona.value.trim() || null, m2_aprox: num(f.m2.value) } };
    });

    if (PAGE === 'catalogo') { F = fromUrl(new URLSearchParams(location.search)); bindCatalog(); }
    const needData = PAGE === 'tienda' || PAGE === 'catalogo';
    const [s, d] = await Promise.all([ui.ready, needData ? CRX.api.loadPublic() : Promise.resolve(null)]);
    ALL = d ? (d.properties || []) : await L.loadAll();
    if (PAGE === 'tienda') { renderHome(d); renderCompany(s, d); }
    if (PAGE === 'catalogo') { $$('[data-filters]').forEach((b) => { b.innerHTML = filtersHtml(); }); renderCatalog(); }
    if (PAGE === 'terminos') renderLegal(s);
    renderSeen(); syncCmp(); ui.syncFavs();
    if (PAGE === 'tienda') {
      const tel = s.phone ? '+52' + String(s.phone).replace(/\D/g, '').slice(-10) : undefined;
      const ld = { '@context': 'https://schema.org', '@graph': [
        { '@type': 'RealEstateAgent', name: 'INMOBILIARIA CRUMEX', url: location.origin + '/', areaServed: 'Reynosa, Tamaulipas, México', telephone: tel, email: s.email || undefined, address: { '@type': 'PostalAddress', addressLocality: 'Reynosa', addressRegion: 'Tamaulipas', addressCountry: 'MX', streetAddress: s.address || undefined } },
        { '@type': 'WebSite', name: 'INMOBILIARIA CRUMEX', url: location.origin + '/', inLanguage: 'es-MX', potentialAction: { '@type': 'SearchAction', target: location.origin + '/catalogo.html?q={q}', 'query-input': 'required name=q' } }] };
      const el = document.createElement('script'); el.type = 'application/ld+json'; el.textContent = JSON.stringify(ld); document.head.appendChild(el);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
