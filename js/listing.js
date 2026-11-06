/* INMOBILIARIA CRUMEX · piezas compartidas por todas las páginas públicas:
   íconos, formato de precios, tarjetas, favoritas, encabezado/pie y formularios. */
(function () {
  const CRX = window.CRX; const { $, $$, esc, money } = CRX;

  const svg = (d, fill) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    casa: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    departamento: svg('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>'),
    terreno: svg('<path d="M3 20l5-9 4 6 3-4 6 7z"/><circle cx="17" cy="6" r="2"/>'),
    nave: svg('<path d="M2 20V9l5 3V9l5 3V9l5 3V5h4v15z"/><path d="M6 20v-3h3v3M14 20v-3h3v3"/>'),
    key: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>'),
    tag: svg('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="8" cy="9" r="1.5"/>'),
    spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'),
    check: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
    bed: svg('<path d="M3 18V7M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>'),
    bath: svg('<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 4 0"/><path d="M7 19l-1 2M17 19l1 2"/>'),
    car: svg('<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13.5" r=".8"/><circle cx="16.5" cy="13.5" r=".8"/>'),
    area: svg('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h3M4 14h3M9 4v3M14 4v3"/>'),
    land: svg('<path d="M3 17l6-3 6 3 6-3"/><path d="M3 12l6-3 6 3 6-3"/>'),
    height: svg('<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>'),
    dock: svg('<rect x="3" y="8" width="18" height="12"/><path d="M7 20v-6h10v6M3 8l9-5 9 5"/>'),
    bolt: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    phone: svg('<path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 7 7L16 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    pin: svg('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    share: svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    camera: svg('<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>'),
    heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
    wa: svg('<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.1-.3.3-.1.5.2.3.8 1.3 1.8 2.1 1.2 1.1 2.2 1.4 2.5 1.6.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/>', true),
    chev: svg('<path d="m6 9 6 6 6-6"/>'),
    doc: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
    play: svg('<path d="M8 5v14l11-7z"/>', true),
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
  };
  const ATTR = { frente_m: 'Frente (m)', fondo_m: 'Fondo (m)', uso_suelo: 'Uso de suelo', servicios: 'Servicios', altura_libre_m: 'Altura libre (m)', andenes: 'Andenes', kva: 'Capacidad (kVA)', parque_industrial: 'Parque industrial', nivel: 'Nivel' };
  // Datos guardados en "attributes" que no son características (no se listan en la ficha)
  const HIDDEN_ATTRS = new Set(['title_en', 'description_en', 'video_url', 'tour_url', 'amenidades', 'creditos', 'niveles', 'mantenimiento', 'amueblado', 'mascotas', 'deposito_meses', 'plazo_min_meses', 'disponible_desde', 'requisitos', 'cerca']);
  const zoneHref = (name, extra) => 'zona.html?z=' + encodeURIComponent(CRX.slugify(name || '')) + (extra ? '&' + extra : '');
  const hasMedia = (p) => { const a = p.attributes || {}; return a.video_url ? 'video' : a.tour_url ? 'tour' : ''; };
  const PLURAL = { casa: 'Casas', departamento: 'Departamentos', terreno: 'Terrenos', nave: 'Naves industriales' };

  /* ---------- formato ---------- */
  const isOwn = (v) => v !== null && v !== undefined && v !== '';
  const img = CRX.img, srcset = CRX.srcset;
  // los planos van aparte: nunca son portada ni entran en la galería
  const pics = (p) => (p.photos || []).filter((x) => !x.plan);
  const plansOf = (p) => (p.photos || []).filter((x) => x.plan);
  const photoOf = (p, i, w) => (pics(p)[i || 0] ? img(pics(p)[i || 0], w || 800) : '');
  const priceTxt = (p) => money(p.price, p.currency, p.price_on_request) + (p.operation === 'renta' && !p.price_on_request ? ' / mes' : '');
  const priceHtml = (p) => `<span class="price">${esc(money(p.price, p.currency, p.price_on_request))}${p.operation === 'renta' && !p.price_on_request ? ' <small>/ mes</small>' : ''}</span>`;
  const waMsg = (p) => `Hola, me interesa la propiedad ${p.ref_code}: ${p.title} (${priceTxt(p)}). ¿Sigue disponible?`;
  // Dirección de cada inmueble: inmueble.html?id=1 (el número de su clave CRX-00001)
  const refNum = (ref) => { const m = /^CRX-0*(\d+)$/i.exec(ref || ''); return m ? m[1] : null; };
  const href = (p) => refNum(p.ref_code) ? 'inmueble.html?id=' + refNum(p.ref_code) : 'inmueble.html?ref=' + encodeURIComponent(p.ref_code || p.id);
  const fmtN = (n) => Number(n).toLocaleString('es-MX');
  const noAcc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const area = (p) => Number(p.construction_m2) || Number(p.land_m2) || 0;
  function ppm(p) { if (p.price_on_request || !(p.price > 0)) return null; const m2 = area(p); return m2 ? p.price / m2 : null; }
  const isRecent = (p, days) => !!p.published_at && Date.now() - new Date(p.published_at) < days * 864e5;
  function specsHtml(p, withIcons) {
    const s = [];
    const ic = (k) => (withIcons ? ICON[k] : '');
    if (isOwn(p.bedrooms)) s.push([ic('bed'), `${p.bedrooms} rec.`]);
    if (isOwn(p.bathrooms)) s.push([ic('bath'), `${Number(p.bathrooms)} baños`]);
    if (isOwn(p.parking)) s.push([ic('car'), `${p.parking} est.`]);
    if (isOwn(p.construction_m2)) s.push([ic('area'), `${fmtN(p.construction_m2)} m² const.`]);
    if (isOwn(p.land_m2)) s.push([ic('land'), `${fmtN(p.land_m2)} m² terreno`]);
    if (p.attributes && isOwn(p.attributes.altura_libre_m)) s.push([ic('height'), `${p.attributes.altura_libre_m} m altura`]);
    return s.map(([i, x]) => `<span>${i}${esc(x)}</span>`).join('');
  }
  function ago(iso) {
    if (!iso) return '';
    const d = Math.floor((Date.now() - new Date(iso)) / 864e5);
    if (d < 1) return 'hoy'; if (d === 1) return 'ayer'; if (d < 7) return `hace ${d} días`;
    if (d < 30) { const w = Math.round(d / 7); return w === 1 ? 'hace 1 semana' : `hace ${w} semanas`; }
    const m = Math.round(d / 30); return m <= 1 ? 'hace 1 mes' : m < 12 ? `hace ${m} meses` : 'hace más de un año';
  }

  /* ---------- almacenamiento del visitante ---------- */
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  const pushSeen = (id) => { const s = store.get('crx-seen'); store.set('crx-seen', [id].concat(s.filter((x) => x !== id)).slice(0, 10)); };
  const favs = {
    list: () => store.get('crx-fav'),
    has: (id) => store.get('crx-fav').includes(id),
    toggle(id) { const l = store.get('crx-fav'); const on = !l.includes(id); store.set('crx-fav', on ? l.concat(id) : l.filter((x) => x !== id)); return on; },
    clear: () => { store.set('crx-fav', []); savePrices({}); }
  };
  /* Precio de cada favorita al momento de guardarla, para avisar si después baja */
  const favPrices = () => { try { return JSON.parse(localStorage.getItem('crx-fav-price') || '{}') || {}; } catch (e) { return {}; } };
  function savePrices(o) { try { localStorage.setItem('crx-fav-price', JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } }
  // { ...propiedad, drop: { from, amount, pct } } si bajó de precio desde que se guardó
  function priceDrop(p, prices) {
    const s = (prices || favPrices())[p.id];
    if (!s || p.price_on_request || !(p.price > 0) || p.currency !== s.currency || !(p.price < s.price)) return null;
    return { from: s.price, amount: s.price - p.price, pct: Math.round((1 - p.price / s.price) * 100), key: p.id + ':' + p.price };
  }

  /* ---------- estadísticas anónimas ----------
     Solo cuenta vistas y clics por propiedad con un número al azar del navegador.
     No guarda nombre, teléfono ni dirección IP. Si el navegador pide no rastrear (GPC), no cuenta. */
  const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|lighthouse|pingdom/i;
  function visitorId() {
    try { let v = localStorage.getItem('crx-vid'); if (!v) { v = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('crx-vid', v); } return v; }
    catch (e) { return null; }
  }
  function track(propertyId, kind) {
    if (!propertyId || BOT.test(navigator.userAgent || '') || navigator.globalPrivacyControl === true) return;
    try { CRX.api.track(propertyId, kind, visitorId()); } catch (e) { /* nunca rompe la página */ }
  }

  /* ---------- sin fotos: el letrero que se pondría en la propiedad ---------- */
  const andJoin = (a) => a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : (a[0] || '');
  const typesTxt = (ts) => andJoin(ts.map((t, i) => (i ? String(PLURAL[t] || t).toLowerCase() : PLURAL[t] || t)));
  const hashN = (t) => { let h = 0; String(t || '').split('').forEach((c) => { h = (h * 31 + c.charCodeAt(0)) | 0; }); return Math.abs(h); };
  function signHtml(p, opt) {
    opt = opt || {}; const en = opt.lang === 'en';
    const op = p.operation === 'renta' ? (en ? 'FOR LEASE' : 'SE RENTA') : (en ? 'FOR SALE' : 'SE VENDE');
    const m2 = p.type === 'terreno' ? p.land_m2 : (isOwn(p.construction_m2) ? p.construction_m2 : p.land_m2);
    const what = en ? (opt.what || '') : `${CRX.TYPES[p.type] || ''}${isOwn(m2) ? ` de ${fmtN(m2)} m²` : ''}`;
    const ph = fmtPh((CRX.settings && (CRX.settings.phone || CRX.settings.whatsapp)) || window.CRX_CONFIG.PHONE);
    const rot = ((hashN(p.id) % 7) - 3) * 0.45;
    return `<span class="sign${opt.lg ? ' lg' : ''}" style="--rot:${rot.toFixed(2)}deg" aria-hidden="true"><b>${op}</b>${what ? `<span>${esc(what)}</span>` : ''}<small>${en ? 'Info' : 'Informes'} ${esc(ph)}</small></span>`;
  }
  // La persona que atiende: el primer integrante marcado "Mostrar en el sitio" en Panel > Equipo,
  // o, si no hay nadie, el nombre de js/config.js (CONTACT_NAME).
  // Los títulos (Lic., Ing., Arq., Dr.…) no cuentan para las iniciales; en el saludo sí se usan: "Hola Lic. Sabino".
  const TITLE = /^(lic|licda|ing|arq|dr|dra|mtro|mtra|c\.?p|sr|sra|srita|prof|profa)\.?$/i;
  function whoOf(team) {
    const m = (team || [])[0]; const C = window.CRX_CONFIG;
    const name = (m && m.full_name) || C.CONTACT_NAME || 'INMOBILIARIA CRUMEX';
    const words = name.split(/\s+/).filter(Boolean); const title = words.length > 1 && TITLE.test(words[0]) ? words[0] : '';
    const rest = title ? words.slice(1) : words;
    return { name, first: title ? `${title} ${rest[0] || ''}`.trim() : rest[0] || name, role: (m && m.job_title) || C.CONTACT_ROLE || 'Asesor inmobiliario', photo: m && m.photo_path ? CRX.api.photoUrl(m.photo_path) : '',
      ini: rest.slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase() };
  }
  // calificación de Google (si se capturó en Ajustes)
  function reviewsHtml(s, compact) {
    if (!s || !(Number(s.google_rating) > 0)) return '';
    const r = Number(s.google_rating); const n = Number(s.google_reviews) || 0;
    const stars = `<span class="gr-stars" aria-hidden="true">${'★'.repeat(Math.round(r))}${'☆'.repeat(5 - Math.round(r))}</span>`;
    return `<span class="greviews${compact ? ' compact' : ''}">${stars}<b>${r.toFixed(1)}</b><span>en Google${n ? ` (${fmtN(n)} reseñas)` : ''}</span>${s.google_maps_url ? `<a href="${esc(s.google_maps_url)}" target="_blank" rel="noopener">Ver reseñas</a>` : ''}</span>`;
  }
  function whoHtml(team, s, kind) {
    const w = whoOf(team); const pic = w.photo ? `<img src="${esc(w.photo)}" alt="${esc(w.name)}">` : `<span class="who-ini" aria-hidden="true">${esc(w.ini)}</span>`;
    const head = `<div class="who-top"><div class="who-ph">${pic}</div><div class="who-t">${kind === 'side' ? '<small>Te atiende</small>' : ''}<b>${esc(w.name)}</b><span>${esc(w.role)}</span></div></div>`;
    const reg = s.license ? `<p class="who-reg">Registro estatal de agente inmobiliario: <b>${esc(s.license)}</b></p>` : '';
    if (kind === 'side') return head + reg;
    const wa = CRX.waLink(`Hola ${w.first}, busco una propiedad en Reynosa.`);
    return head + `<p>Escríbeme por WhatsApp. Te paso fotos, precio y horarios para que vayas a verla.</p>
      <a class="btn btn-wa" href="${esc(wa)}" target="_blank" rel="noopener">${ICON.wa}<span>${esc(fmtPh(s.whatsapp))}</span></a>${reviewsHtml(s, true)}${reg}`;
  }

  // etiquetas cortas para la tarjeta: lo que más se filtra en los portales
  function cardTags(p) {
    const a = p.attributes || {}; const t = []; const cr = a.creditos || [];
    if (p.operation === 'renta') { if (a.amueblado === 'si') t.push('Amueblada'); else if (a.amueblado === 'semi') t.push('Semiamueblada'); if (a.mascotas === 'si') t.push('Acepta mascotas'); }
    else if (cr.includes('infonavit')) t.push('Acepta Infonavit'); else if (cr.length) t.push('Acepta crédito');
    if (CRX.hasFeat(p, 'privada')) t.push('En privada');
    if (Number(a.niveles) === 1 && p.type === 'casa') t.push('Una planta');
    return t.slice(0, 3);
  }

  /* ---------- tarjetas ---------- */
  function cardHtml(p, opt) {
    opt = opt || {};
    const pic = photoOf(p); const fav = favs.has(p.id); const n = pics(p).length; const h = esc(href(p)); const ph0 = pics(p)[0];
    const st = p.status === 'apartada' ? '<span class="chip-st warn">Apartada</span>' : p.status === 'cerrada' ? `<span class="chip-st err">${p.operation === 'renta' ? 'Rentada' : 'Vendida'}</span>` : '';
    const flag = p.status === 'disponible' && p.price_reduced ? '<span class="flag sale">Bajó de precio</span>' : p.status === 'disponible' && p.is_new ? '<span class="flag new">Nueva</span>' : '';
    const media = hasMedia(p); const cmpOn = opt.cmp && opt.cmp.includes(p.id);
    const img = pic
      ? `<img src="${esc(pic)}"${srcset(ph0) ? ` srcset="${esc(srcset(ph0))}" sizes="(max-width: 620px) 92vw, (max-width: 1100px) 46vw, 380px"` : ''} alt="${esc((ph0 && ph0.alt) || p.title)}" loading="lazy" decoding="async">`
      : `<span class="noimg">${signHtml(p)}</span>`;
    const desc = opt.desc && p.description ? String(p.description).replace(/\s+/g, ' ').trim() : '';
    return `<article class="card${opt.cls ? ' ' + opt.cls : ''}" data-id="${esc(p.id)}">
      <a class="card-img" href="${h}" tabindex="-1" aria-hidden="true">
        ${img}
        <span class="chip-op">${esc(CRX.OPS[p.operation] || p.operation)}</span>${st}${flag}
        ${n > 1 || media || !pic ? `<span class="pmeta">${!pic ? '<span class="lite">Fotos próximamente</span>' : ''}${n > 1 ? `<span>${ICON.camera}${n}</span>` : ''}${media ? `<span>${media === 'video' ? '▶ Video' : '360°'}</span>` : ''}</span>` : ''}
      </a>
      <button class="fav" type="button" data-fav="${esc(p.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de favoritas' : 'Guardar en favoritas'}">${ICON.heart}</button>
      <div class="card-b">
        <span class="loc">${ICON.pin || ''}${esc(p.zone || p.public_location || 'Reynosa')}<i>${esc(CRX.TYPES[p.type] || '')}</i></span>
        <h3><a href="${h}">${esc(p.title)}</a></h3>
        ${priceHtml(p)}
        <div class="specs">${specsHtml(p, true)}</div>
        ${cardTags(p).length ? `<div class="ctags">${cardTags(p).map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
        ${desc ? `<p class="card-desc">${esc(desc.length > 190 ? desc.slice(0, 186).replace(/\s+\S*$/, '') + '…' : desc)}</p>` : ''}
        <div class="card-act">
          ${opt.cmp ? `<button class="cmp-btn" type="button" data-cmp="${esc(p.id)}" aria-pressed="${cmpOn}">${cmpOn ? '✓ Comparando' : 'Comparar'}</button>` : `<span class="ref">${esc(p.ref_code || '')}</span>`}
          ${p.status !== 'cerrada' ? `<a class="wa-ic" href="${esc(CRX.waLink(waMsg(p)))}" data-wa-prop="${esc(p.id)}" target="_blank" rel="noopener" aria-label="Preguntar por ${esc(p.ref_code)} en WhatsApp">${ICON.wa}<span>Preguntar</span></a>` : ''}
        </div>
      </div></article>`;
  }
  function miniHtml(p) {
    const pic = photoOf(p, 0, 240);
    return `<a class="mini" href="${esc(href(p))}">${pic ? `<img class="th" src="${esc(pic)}" alt="" loading="lazy">` : `<span class="th th0">${ICON[p.type] || ''}</span>`}<span><b>${esc(p.title)}</b><small>${esc(priceTxt(p))}</small></span></a>`;
  }

  /* ---------- formularios de prospecto ---------- */
  function bindForm(form, kind, extra, opt) {
    opt = opt || {};
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('.form-msg', form); const btn = $('button[type=submit]', form);
      const say = (t, c) => { msg.textContent = t; msg.className = 'form-msg ' + (c || ''); };
      const f = new FormData(form);
      if (f.get('website')) return say('Gracias.', 'ok'); // trampa anti-spam
      const name = String(f.get('full_name') || '').trim(), phone = String(f.get('phone') || '').trim();
      if (name.length < 2) return say('Escribe tu nombre.', 'err');
      if (phone.replace(/\D/g, '').length < 7) return say('Escribe un teléfono válido (mínimo 7 dígitos).', 'err');
      if (!f.get('privacy')) return say('Debes aceptar el aviso de privacidad.', 'err');
      const lead = { kind, full_name: name, phone, email: String(f.get('email') || '').trim() || null, message: String(f.get('message') || '').trim() || null, payload: {} };
      Object.assign(lead, extra ? extra() : {});
      btn.disabled = true; say('Enviando…');
      try {
        await CRX.api.createLead(lead);
        say(opt.ok || '¡Gracias! Recibimos tu solicitud y te contactaremos pronto.', 'ok');
        if (opt.done) opt.done(lead);
        form.reset();
      } catch (err) { say(CRX.api.errMsg(err), 'err'); }
      btn.disabled = false;
    });
  }

  /* ---------- datos públicos compartidos (una sola carga por página) ---------- */
  let _settings = null, _all = null;
  function loadSettings() {
    if (!_settings) _settings = CRX.api.getSettings().catch(() => ({})).then((s) => {
      CRX.settings = Object.assign({ phone: window.CRX_CONFIG.PHONE }, s);
      if (!CRX.settings.whatsapp) CRX.settings.whatsapp = window.CRX_CONFIG.WHATSAPP;
      return CRX.settings;
    });
    return _settings;
  }
  function loadAll() { if (!_all) _all = CRX.api.listProperties().catch(() => []); return _all; }

  /* ---------- encabezado, pie, favoritas y rieles (todas las páginas) ---------- */
  function chrome(opt) {
    opt = opt || {};
    const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if ($('#demo-banner')) $('#demo-banner').hidden = CRX.api.mode !== 'local';
    CRX.captureOrigin();
    $$('[data-year]').forEach((y) => { y.textContent = new Date().getFullYear(); });
    // los buscadores piden la dirección completa en las versiones por idioma
    $$('link[rel="alternate"][hreflang]').forEach((l) => l.setAttribute('href', l.href));

    // flechas de los rieles: solo cuando de verdad hay más tarjetas a los lados
    const syncRails = () => $$('.rail-nav').forEach((n) => { const r = $(n.dataset.rail); if (r) n.classList.toggle('idle', r.scrollWidth <= r.clientWidth + 4); });
    $$('.rail').forEach((r) => {
      if ('ResizeObserver' in window) new ResizeObserver(syncRails).observe(r);
      if ('MutationObserver' in window) new MutationObserver(() => requestAnimationFrame(syncRails)).observe(r, { childList: true });
    });
    window.addEventListener('resize', syncRails);

    // encabezado que se compacta, barra de progreso y "volver arriba"
    const hdr = $('.hdr'); let tick = false;
    const onScroll = () => {
      tick = false; const h = document.documentElement; const max = Math.max(1, h.scrollHeight - h.clientHeight);
      if ($('#progress')) $('#progress').style.setProperty('--sp', Math.min(1, h.scrollTop / max).toFixed(4));
      if (hdr) hdr.classList.toggle('scrolled', h.scrollTop > 10);
      if ($('#totop')) $('#totop').hidden = h.scrollTop < 900;
    };
    window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    if ($('#totop')) $('#totop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

    // búsqueda del encabezado
    const so = $('#search-open');
    if (so) so.addEventListener('click', () => { const on = hdr.classList.toggle('search-on'); so.setAttribute('aria-expanded', on); if (on) $('#hq').focus(); });
    const hs = $('#hsearch');
    if (hs) {
      const q0 = new URLSearchParams(location.search).get('q'); if (q0 && $('#hq')) $('#hq').value = q0;
      hs.addEventListener('submit', (e) => { if (opt.onSearch) { e.preventDefault(); opt.onSearch($('#hq').value.trim()); hdr.classList.remove('search-on'); } });
    }

    // subnavegación: marca la sección actual del catálogo
    if (/catalogo\.html$/.test(location.pathname) || opt.page === 'catalogo') markSubnav();

    // favoritas
    const drawer = $('#drawer');
    const syncFavs = async (bump) => {
      const ids = favs.list(); const all = await loadAll(); const n = ids.filter((id) => all.some((p) => p.id === id)).length;
      // guarda el precio de las favoritas nuevas (o de las que se guardaron antes de esta función)
      const prices = favPrices(); let dirty = false;
      Object.keys(prices).forEach((id) => { if (!ids.includes(id)) { delete prices[id]; dirty = true; } });
      ids.forEach((id) => { const p = all.find((x) => x.id === id); if (p && !prices[id] && p.price > 0 && !p.price_on_request) { prices[id] = { price: Number(p.price), currency: p.currency, at: Date.now() }; dirty = true; } });
      if (dirty) savePrices(prices);
      const drops = ids.map((id) => all.find((x) => x.id === id)).filter(Boolean).map((p) => [p, priceDrop(p, prices)]).filter(([, d]) => d);
      $$('[data-fav-count]').forEach((d) => { d.textContent = n; if (!d.closest('.drawer-h')) d.hidden = !n; d.classList.toggle('drop', !!drops.length); });
      $$('#fav-open, [data-open-favs]').forEach((b) => { if (drops.length) b.title = drops.length === 1 ? 'Bajó de precio una de tus favoritas' : `Bajaron de precio ${drops.length} de tus favoritas`; else b.removeAttribute('title'); });
      // aviso una sola vez por cada baja
      let seen = []; try { seen = JSON.parse(sessionStorage.getItem('crx-drop-seen') || '[]'); } catch (e) { seen = []; }
      const fresh = drops.filter(([, d]) => !seen.includes(d.key));
      if (fresh.length) {
        const [p, d] = fresh[0];
        setTimeout(() => CRX.toast(fresh.length === 1 ? `Bajó de precio una de tus favoritas: ${p.title} (−${d.pct}%)` : `Bajaron de precio ${fresh.length} de tus favoritas. Ábrelas en el corazón.`, 'ok'), 900);
        try { sessionStorage.setItem('crx-drop-seen', JSON.stringify(seen.concat(fresh.map(([, x]) => x.key)).slice(-50))); } catch (e) { /* nada */ }
      }
      $$('[data-fav]').forEach((b) => { const on = ids.includes(b.dataset.fav); b.setAttribute('aria-pressed', on); if (b.classList.contains('fav')) b.setAttribute('aria-label', on ? 'Quitar de favoritas' : 'Guardar en favoritas'); else b.textContent = on ? '♥ Guardada' : '♡ Guardar'; });
      if (bump && $('#fav-open')) { const b = $('#fav-open'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
      if (drawer && !drawer.hidden) renderFavs();
    };
    async function renderFavs() {
      const all = await loadAll(); const list = favs.list().map((id) => all.find((p) => p.id === id)).filter(Boolean); const prices = favPrices();
      $('#fav-foot').hidden = !list.length;
      $('#fav-list').innerHTML = list.length ? list.map((p) => `<div class="fitem">
          <a class="open" href="${esc(href(p))}" aria-label="Ver ${esc(p.title)}">${photoOf(p, 0, 240) ? `<img class="th" src="${esc(photoOf(p, 0, 240))}" alt="">` : `<span class="th th0">${ICON[p.type] || ''}</span>`}</a>
          <div><a class="ftitle" href="${esc(href(p))}"><b>${esc(p.title)}</b></a><small>${esc(p.ref_code)}, ${esc(priceTxt(p))}</small>${(() => { const d = priceDrop(p, prices); return d ? `<span class="fdrop">Bajó $${fmtN(d.amount)} (−${d.pct}%) desde que la guardaste <s>$${fmtN(d.from)}</s></span>` : ''; })()}</div>
          <button type="button" data-unfav="${esc(p.id)}" aria-label="Quitar ${esc(p.title)}">✕</button></div>`).join('')
        : `<div class="fempty"><div class="big">♡</div><p><strong>Aún no guardas propiedades.</strong></p><p>Toca el corazón en cualquier propiedad y la encontrarás aquí, lista para preguntar por WhatsApp.</p><a class="btn btn-navy btn-sm" href="catalogo.html">Ver catálogo</a></div>`;
      if (list.length) $('#fav-send').href = CRX.waLink('Hola, me interesan estas propiedades:\n' + list.map((p) => `• ${p.ref_code}, ${p.title}, ${priceTxt(p)}${priceDrop(p, prices) ? ' (bajó de precio)' : ''}`).join('\n') + '\n¿Me pueden dar más información?');
    }
    const openDrawer = () => { if (!drawer) return; renderFavs(); drawer.hidden = false; $('#scrim').hidden = false; if ($('#fav-open')) $('#fav-open').setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('#dr-close').focus(); };
    const closeDrawer = () => { if (!drawer || drawer.hidden) return; drawer.hidden = true; $('#scrim').hidden = true; if ($('#fav-open')) $('#fav-open').setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
    if (drawer) {
      $('#fav-open') && $('#fav-open').addEventListener('click', openDrawer);
      $('#dr-close').addEventListener('click', closeDrawer);
      $('#scrim').addEventListener('click', closeDrawer);
      $('#fav-clear').addEventListener('click', () => { favs.clear(); syncFavs(); });
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); if (hdr) hdr.classList.remove('search-on'); } });

    document.addEventListener('click', (e) => {
      const t = e.target;
      const w = t.closest('[data-wa-prop]'); if (w) track(w.dataset.waProp, 'whatsapp');
      const f = t.closest('[data-fav]');
      if (f) { const on = favs.toggle(f.dataset.fav); syncFavs(on); if (on) track(f.dataset.fav, 'favorita'); CRX.toast(on ? 'Guardada en tus favoritas' : 'Quitada de tus favoritas'); return; }
      const uf = t.closest('[data-unfav]'); if (uf) { favs.toggle(uf.dataset.unfav); syncFavs(); return; }
      if (t.closest('[data-open-favs]')) { e.preventDefault(); openDrawer(); return; }
      const rn = t.closest('.rail-nav button');
      if (rn) { const r = $(rn.parentElement.dataset.rail); if (r) r.scrollBy({ left: Number(rn.dataset.dir) * r.clientWidth * 0.9, behavior: reduce ? 'auto' : 'smooth' }); return; }
      if (t.closest('dialog [data-close]')) { t.closest('dialog').close(); return; }
      if (t.tagName === 'DIALOG' && !t.classList.contains('lb')) { t.close(); }
    });

    // datos de la empresa en el sitio (WhatsApp, cinta, pie)
    const ready = loadSettings().then((s) => {
      $$('[data-wa-link]').forEach((a) => { a.href = CRX.waLink(a.dataset.waText || 'Hola, me gustaría información.'); a.target = '_blank'; a.rel = 'noopener'; });
      // barra superior: número de WhatsApp, horario y avisos (uno a la vez)
      $$('[data-wa-num]').forEach((el) => { el.textContent = fmtPh(s.whatsapp); });
      $$('[data-phone]').forEach((a) => { const ph = s.phone || s.whatsapp; a.href = CRX.phone.tel(ph); const t = a.querySelector('span'); if (t) t.textContent = fmtPh(ph); });
      if (s.hours && $('#tb-hours')) { $('#tb-hours span').textContent = s.hours; $('#tb-hours').hidden = false; }
      if (s.hours && $('#ftr-hours')) { $('#ftr-hours').textContent = 'Horario: ' + s.hours; $('#ftr-hours').hidden = false; }
      if (s.address && $('#ftr-addr')) { $('#ftr-addr').textContent = s.address; $('#ftr-addr').hidden = false; }
      const tk = $('#ticker');
      if (tk) {
        const own = String(s.ticker || '').split('\n').map((x) => x.trim()).filter(Boolean);
        const msgs = own.length ? own : String(tk.dataset.msgs || tk.textContent).split('|').filter(Boolean);
        tk.textContent = msgs[0] || '';
        if (msgs.length > 1 && !reduce) {
          let i = 0, hold = false;
          tk.addEventListener('mouseenter', () => { hold = true; }); tk.addEventListener('mouseleave', () => { hold = false; });
          setInterval(() => { if (hold || document.hidden) return; tk.classList.add('out'); setTimeout(() => { i = (i + 1) % msgs.length; tk.textContent = msgs[i]; tk.classList.remove('out'); }, 320); }, 6500);
        }
      }
      if (s.license && $('#ftr-license')) $('#ftr-license').textContent = 'Registro estatal de agente inmobiliario: ' + s.license;
      if ($('#ftr-company')) {
        const c = [s.razon_social, s.rfc ? 'RFC ' + s.rfc : '', s.profeco_contrato ? 'Contrato registrado ante PROFECO: ' + s.profeco_contrato : ''].filter(Boolean);
        $('#ftr-company').hidden = !c.length; $('#ftr-company').innerHTML = c.map(esc).join('<br>');
      }
      $$('[data-greviews]').forEach((el) => { const h = reviewsHtml(s); el.innerHTML = h + (s.google_review_url ? `<a class="gr-write" href="${esc(s.google_review_url)}" target="_blank" rel="noopener">Déjanos una reseña</a>` : ''); el.hidden = !h; });
      if ($('[data-who]')) CRX.api.getTeam().catch(() => []).then((team) => { $$('[data-who]').forEach((el) => { el.innerHTML = whoHtml(team, s, el.dataset.who); }); });
      const soc = [];
      if (s.facebook) soc.push(`<a href="${esc(s.facebook)}" target="_blank" rel="noopener">Facebook</a>`);
      if (s.instagram) soc.push(`<a href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
      if ($('#ftr-social')) $('#ftr-social').innerHTML = soc.join('');
      return s;
    });
    syncFavs();
    if (location.hash === '#favoritas') setTimeout(openDrawer, 0);
    return { ready, syncFavs, openDrawer, closeDrawer, markSubnav };
  }
  function markSubnav(params) {
    const q = params || new URLSearchParams(location.search);
    const op = q.get('op'), tipos = q.getAll('tipo').join(',').split(',').filter(Boolean);
    let key = 'catalogo';
    if (tipos.length === 1 && !op) key = tipos[0]; else if (op && !tipos.length) key = op;
    $$('.subnav [data-nav]').forEach((a) => { if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }

  /* ---------- contacto (lista con teléfono, WhatsApp, correo…) ---------- */
  // teléfonos siempre con lada: +52 899 217 9269 · +1 956 123 4567 (js/phone.js)
  const fmtPh = (x) => (CRX.phone ? CRX.phone.format(x) : String(x || ''));
  function contactItems(s) {
    const phone = s.phone || ''; const items = [];
    if (phone) items.push(['phone', 'Teléfono', `<a href="${esc(CRX.phone.tel(phone))}">${esc(fmtPh(phone))}</a>`]);
    items.push(['wa', 'WhatsApp', `<a target="_blank" rel="noopener" href="${esc(CRX.waLink())}">${s.whatsapp ? esc(fmtPh(s.whatsapp)) : 'Escribir por WhatsApp'}</a>`]);
    if (s.email) items.push(['mail', 'Correo', `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`]);
    if (s.address) items.push(['pin', 'Dirección', esc(s.address)]);
    if (s.hours) items.push(['clock', 'Horario', esc(s.hours)]);
    return items.map(([ic, k, v]) => `<li><span class="ci-ic">${ICON[ic] || ''}</span><span><b>${k}</b>${v}</span></li>`).join('');
  }

  CRX.L = { refNum, ICON, ATTR, HIDDEN_ATTRS, PLURAL, isOwn, photoOf, img, srcset, priceTxt, priceHtml, waMsg, href, zoneHref, hasMedia, fmtN, noAcc, area, ppm, isRecent, specsHtml, ago,
    store, pushSeen, favs, track, cardHtml, miniHtml, bindForm, loadSettings, loadAll, chrome, markSubnav, contactItems, fmtPh, signHtml, whoOf, whoHtml, andJoin, typesTxt, cardTags, pics, plansOf, reviewsHtml };
})();
