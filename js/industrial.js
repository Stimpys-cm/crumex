/* INMOBILIARIA CRUMEX · industrial.html (English)
   industrial.html              → industrial buildings and land, filters in ft² or m²
   industrial.html?id=4         → one listing in English (same id as inmueble.html?id=4)
   Uses the English fields from the panel (title_en, description_en) when available. */
(function () {
  const CRX = window.CRX; const { $, $$, esc } = CRX; const L = CRX.L;
  const { ICON, isOwn, photoOf } = L;
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const FT2 = 10.7639, FT = 3.28084;
  let ALL = [], ui = null, P = null, photos = [], cur = 0;
  const S = { units: 'ft', deal: '', min: null, h: null, docks: 0, sort: 'new' };
  try { if (localStorage.getItem('crx-units') === 'm') S.units = 'm'; } catch (e) { /* none */ }

  const n0 = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const n2 = (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (v) => { const x = Number(String(v ?? '').replace(/[^\d.]/g, '')); return Number.isFinite(x) && String(v ?? '').trim() !== '' ? x : null; };
  const isIndustrial = (p) => p.type === 'nave' || (p.type === 'terreno' && /industri/i.test(String((p.attributes || {}).uso_suelo || '') + ' ' + p.title + ' ' + (p.zone || '')));
  const deal = (p) => (p.operation === 'renta' ? 'lease' : 'sale');
  const bArea = (p) => Number(p.construction_m2) || 0; const lArea = (p) => Number(p.land_m2) || 0;
  const mainArea = (p) => bArea(p) || lArea(p);
  const areaTxt = (m2) => (S.units === 'ft' ? `${n0(m2 * FT2)} ft²` : `${n0(m2)} m²`);
  const areaBoth = (m2) => (S.units === 'ft' ? `${n0(m2 * FT2)} ft² <small>(${n0(m2)} m²)</small>` : `${n0(m2)} m² <small>(${n0(m2 * FT2)} ft²)</small>`);
  const lenTxt = (m) => (S.units === 'ft' ? `${n2(m * FT).replace(/\.00$/, '')} ft` : `${m} m`);
  const titleOf = (p) => (p.attributes && p.attributes.title_en) || p.title;
  const typeOf = (p) => (p.type === 'nave' ? 'Industrial building' : 'Industrial land');
  const priceTxt = (p) => {
    if (p.price_on_request || !(p.price > 0)) return 'Price on request';
    return `${p.currency === 'USD' ? 'USD' : 'MXN'} $${n0(p.price)}${p.operation === 'renta' ? ' / month' : ''}`;
  };
  const ppsf = (p) => { const a = mainArea(p); if (p.price_on_request || !(p.price > 0) || !a) return null; return p.price / (a * FT2); };
  const ppsfTxt = (p) => { const v = ppsf(p); if (v == null) return ''; return S.units === 'ft' ? `${p.currency} $${n2(v)} / ft²${p.operation === 'renta' ? ' / month' : ''}` : `${p.currency} $${n2(v * FT2)} / m²${p.operation === 'renta' ? ' / month' : ''}`; };
  const waMsg = (p) => `Hello, I am interested in listing ${p.ref_code}: ${titleOf(p)} (${priceTxt(p)}). Is it still available?`;
  const idOf = (p) => L.refNum(p.ref_code);
  const setMeta = (sel, attr, val) => { let el = document.head.querySelector(sel); if (!el) { el = document.createElement('meta'); const [k, v] = sel.match(/\[(\w+)="([^"]+)"\]/).slice(1); el.setAttribute(k, v); document.head.appendChild(el); } el.setAttribute(attr, val); };

  /* ---------- list ---------- */
  function specs(p) {
    const a = p.attributes || {}; const out = [];
    if (bArea(p)) out.push([ICON.area, areaTxt(bArea(p)) + (p.type === 'nave' ? ' building' : '')]);
    if (lArea(p) && (!bArea(p) || p.type === 'terreno')) out.push([ICON.land, areaTxt(lArea(p)) + ' land']);
    if (isOwn(a.altura_libre_m)) out.push([ICON.height, lenTxt(Number(a.altura_libre_m)) + ' clear']);
    if (isOwn(a.andenes)) out.push([ICON.dock, `${a.andenes} dock${Number(a.andenes) === 1 ? '' : 's'}`]);
    if (isOwn(a.kva)) out.push([ICON.bolt, `${n0(a.kva)} kVA`]);
    return out.map(([i, t]) => `<span>${i}${esc(t)}</span>`).join('');
  }
  function card(p) {
    const img = photoOf(p); const h = `industrial.html?id=${idOf(p)}`;
    const tags = [`<span class="badge gold">${p.operation === 'renta' ? 'For lease' : 'For sale'}</span>`];
    if (p.status === 'apartada') tags.push('<span class="badge warn">Under offer</span>');
    return `<article class="card" data-id="${esc(p.id)}">
      <a class="card-img" href="${esc(h)}" aria-label="View ${esc(titleOf(p))}">${img ? `<img src="${esc(img)}" alt="${esc(titleOf(p))}" loading="lazy">` : `<span class="noimg">${L.signHtml(p, { lang: 'en', what: typeOf(p) })}</span>`}<span class="tags">${tags.join('')}</span>${(p.photos || []).length > 1 ? `<span class="pcount">${ICON.camera}${p.photos.length}</span>` : ''}</a>
      <div class="card-b">
        <span class="loc">${esc(typeOf(p))}, ${esc((p.attributes && p.attributes.parque_industrial) || p.zone || 'Reynosa')}</span>
        <h3><a href="${esc(h)}">${esc(titleOf(p))}</a></h3>
        <span class="price">${esc(priceTxt(p))}</span>${ppsf(p) ? `<span class="ppsf">${esc(ppsfTxt(p))}</span>` : ''}
        <div class="specs">${specs(p)}</div>
        <div class="card-act"><a class="btn btn-line btn-sm" href="${esc(h)}">View details</a><a class="btn btn-wa btn-sm" href="${esc(CRX.waLink(waMsg(p)))}" data-wa-prop="${esc(p.id)}" target="_blank" rel="noopener" aria-label="Ask about ${esc(p.ref_code)} on WhatsApp">${ICON.wa}</a></div>
      </div></article>`;
  }
  function filtered() {
    const minM2 = S.min != null ? (S.units === 'ft' ? S.min / FT2 : S.min) : null;
    const minH = S.h != null ? (S.units === 'ft' ? S.h / FT : S.h) : null;
    const r = ALL.filter((p) => (!S.deal || deal(p) === S.deal) && (minM2 == null || mainArea(p) >= minM2)
      && (minH == null || Number((p.attributes || {}).altura_libre_m) >= minH) && (!S.docks || Number((p.attributes || {}).andenes) >= S.docks));
    const by = { new: (a, b) => String(b.published_at).localeCompare(String(a.published_at)), size: (a, b) => mainArea(b) - mainArea(a), ppsf: (a, b) => (ppsf(a) ?? Infinity) - (ppsf(b) ?? Infinity) };
    return r.sort(by[S.sort] || by.new);
  }
  function renderList() {
    $$('[data-units]').forEach((b) => b.classList.toggle('on', b.dataset.units === S.units));
    $$('[data-deal]').forEach((b) => b.classList.toggle('on', b.dataset.deal === S.deal));
    $$('[data-u-area]').forEach((x) => { x.textContent = S.units === 'ft' ? 'ft²' : 'm²'; });
    $$('[data-u-len]').forEach((x) => { x.textContent = S.units === 'ft' ? 'ft' : 'm'; });
    $('#in-sort option[value="ppsf"]').textContent = S.units === 'ft' ? 'Lowest price per ft²' : 'Lowest price per m²';
    const list = filtered();
    $('#in-cards').innerHTML = list.map(card).join(''); $('#in-cards').hidden = !list.length; $('#in-empty').hidden = !!list.length;
    $('#in-count').innerHTML = list.length ? `<b class="num">${list.length}</b> ${list.length === 1 ? 'listing' : 'listings'}` : 'No results';
    const total = ALL.reduce((s, p) => s + bArea(p), 0);
    const cells = [[ALL.length, 'Available listings']];
    if (total) cells.push([S.units === 'ft' ? n0(total * FT2) : n0(total), S.units === 'ft' ? 'ft² of buildings' : 'm² of buildings']);
    const lease = ALL.filter((p) => p.operation === 'renta').length, sale = ALL.length - lease;
    if (lease) cells.push([lease, 'For lease']); if (sale) cells.push([sale, 'For sale']);
    $('#in-stats').hidden = !ALL.length;
    $('#in-stats').innerHTML = cells.map(([v, l]) => `<div><b class="num">${typeof v === 'number' ? n0(v) : v}</b><span>${esc(l)}</span></div>`).join('');
    const q = new URLSearchParams(); if (S.deal) q.set('deal', S.deal); if (S.min != null) q.set('min', S.min); if (S.h != null) q.set('h', S.h); if (S.docks) q.set('docks', S.docks); if (S.sort !== 'new') q.set('sort', S.sort); if (S.units === 'm') q.set('units', 'm');
    try { history.replaceState(null, '', 'industrial.html' + (q.toString() ? '?' + q : '') + location.hash); } catch (e) { /* none */ }
    ui.syncFavs();
  }

  /* ---------- one listing ---------- */
  function go(i, instant) {
    const n = photos.length; if (!n) return; cur = (i + n) % n;
    const tr = $('#track'); tr.style.transition = instant || reduce ? 'none' : ''; tr.style.transform = `translateX(-${cur * 100}%)`;
    $('#g-count').textContent = `${cur + 1} / ${n}`;
    $$('[data-th]').forEach((b) => b.toggleAttribute('aria-current', Number(b.dataset.th) === cur));
  }
  function showLb() { const ph = photos[cur]; $('#lb-img').src = ph.full; $('#lb-img').alt = ph.alt; $('#lb-cap').textContent = photos.length > 1 ? `${cur + 1} of ${photos.length}` : ''; $('#lb-prev').hidden = $('#lb-next').hidden = photos.length < 2; }
  function renderDetail() {
    const p = P; const a = p.attributes || {}; const n = idOf(p);
    $('#in-hero').hidden = true; $('#listings').hidden = true; $('#why').hidden = true; $('#faq-en').hidden = true; $('#in-detail').hidden = false;
    $('#lang-es').href = `inmueble.html?id=${n}`;
    photos = L.pics(p).map((ph) => ({ url: CRX.img(ph, 1600), set: CRX.srcset(ph), th: CRX.img(ph, 240), full: CRX.img(ph, 2400), alt: ph.alt || titleOf(p) }));
    const rows = [['Listing ID', esc(p.ref_code)], ['Type', typeOf(p)], ['Deal', p.operation === 'renta' ? 'For lease' : 'For sale'], ['Location', esc(`${p.zone || p.public_location || 'Reynosa'}, Reynosa, Tamaulipas`)]];
    if (a.parque_industrial) rows.push(['Industrial park', esc(a.parque_industrial)]);
    if (bArea(p)) rows.push(['Building area', areaBoth(bArea(p))]);
    if (lArea(p)) rows.push(['Land area', areaBoth(lArea(p))]);
    if (isOwn(a.altura_libre_m)) rows.push(['Clear height', S.units === 'ft' ? `${esc(lenTxt(Number(a.altura_libre_m)))} <small>(${esc(Number(a.altura_libre_m))} m)</small>` : `${esc(Number(a.altura_libre_m))} m <small>(${n2(a.altura_libre_m * FT)} ft)</small>`]);
    if (isOwn(a.andenes)) rows.push(['Loading docks', esc(a.andenes)]);
    if (isOwn(a.kva)) rows.push(['Electrical capacity', `${n0(a.kva)} kVA`]);
    if (isOwn(a.frente_m) && isOwn(a.fondo_m)) rows.push(['Lot frontage × depth', esc(`${a.frente_m} × ${a.fondo_m} m`)]);
    if (a.uso_suelo) rows.push(['Land use', esc(a.uso_suelo)]); if (a.servicios) rows.push(['Utilities', esc(a.servicios)]);
    if (isOwn(p.age_years)) rows.push(['Building age', Number(p.age_years) === 0 ? 'New' : `${esc(Number(p.age_years))} years`]);
    { const EN = { oficinas: 'Offices', banos_nave: 'Restrooms', patio_maniobras: 'Truck yard', subestacion: 'Electrical substation', rociadores: 'Fire sprinklers', grua: 'Overhead crane', caseta: 'Guard house',
        agua: 'Water', luz: 'Power', drenaje: 'Sewer', pavimento: 'Paved street', escriturado: 'Clear title', bardeado: 'Fenced', esquina: 'Corner lot' };
      const am = (a.amenidades || []).map((k) => EN[k]).filter(Boolean); if (am.length) rows.push(['Features', esc(am.join(', '))]); }
    rows.push(['Price', esc(priceTxt(p))]); if (ppsf(p)) rows.push(['Price per area', esc(ppsfTxt(p))]);
    rows.push(['Status', p.status === 'apartada' ? 'Under offer' : 'Available']);
    const desc = a.description_en || p.description || '';
    const wa = CRX.waLink(waMsg(p));
    $('#in-detail').innerHTML = `<nav class="crumbs" aria-label="Breadcrumb"><a href="industrial.html">Industrial space</a><span>/</span><a href="industrial.html?deal=${deal(p)}">${p.operation === 'renta' ? 'For lease' : 'For sale'}</a><span>/</span><b aria-current="page">${esc(titleOf(p))}</b></nav>
      <div class="pp-grid">
        <section class="gal" aria-label="Photos"><div class="stage" id="stage"><div class="stage-track" id="track">${photos.length ? photos.map((ph, i) => `<figure class="slide"><img src="${esc(ph.url)}"${ph.set ? ` srcset="${esc(ph.set)}" sizes="(max-width: 900px) 100vw, 860px"` : ''} alt="${esc(ph.alt)}" ${i ? 'loading="lazy"' : ''}></figure>`).join('') : `<div class="noph noimg">${L.signHtml(p, { lg: 1, lang: 'en', what: typeOf(p) })}<span class="noph-note"><b>Photos available on request</b><small>Ask us on WhatsApp</small></span></div>`}</div>
          <button class="nav-btn prev" id="g-prev" aria-label="Previous photo"${photos.length < 2 ? ' hidden' : ''}>‹</button><button class="nav-btn next" id="g-next" aria-label="Next photo"${photos.length < 2 ? ' hidden' : ''}>›</button>
          <span class="g-count" id="g-count"${photos.length < 2 ? ' hidden' : ''}></span><span class="g-tags"><span class="badge gold">${p.operation === 'renta' ? 'For lease' : 'For sale'}</span></span>${photos.length ? `<button class="g-zoom" id="g-zoom">${ICON.expand}<span>Enlarge</span></button>` : ''}</div>
          ${photos.length > 1 ? `<div class="g-thumbs">${photos.map((ph, i) => `<button type="button" data-th="${i}" aria-label="Photo ${i + 1}"><img src="${esc(ph.th)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}</section>
        <aside class="pp-info" aria-labelledby="d-title"><div class="info-in">
          <p class="meta"><span>${esc(p.ref_code)}</span><span>${esc(typeOf(p))}</span></p>
          <h1 id="d-title">${esc(titleOf(p))}</h1>
          <p class="where">${ICON.pin}<span>${esc(p.zone || p.public_location || 'Reynosa')}, Reynosa, Tamaulipas, Mexico</span></p>
          <div class="pricebox"><span class="price">${esc(priceTxt(p))}</span><span class="ppm2">${esc(ppsfTxt(p))}</span></div>
          <ul class="keys">${[[ICON.area, bArea(p) ? areaTxt(bArea(p)) : lArea(p) ? areaTxt(lArea(p)) : '', bArea(p) ? 'Building' : 'Land'], [ICON.height, isOwn(a.altura_libre_m) ? lenTxt(Number(a.altura_libre_m)) : '', 'Clear height'], [ICON.dock, isOwn(a.andenes) ? a.andenes : '', 'Loading docks'], [ICON.bolt, isOwn(a.kva) ? n0(a.kva) + ' kVA' : '', 'Power'], [ICON.land, bArea(p) && lArea(p) ? areaTxt(lArea(p)) : '', 'Land']].filter((k) => k[1] !== '').map(([i, v, l]) => `<li>${i}<b>${esc(v)}</b><small>${l}</small></li>`).join('')}</ul>
          <div class="cta-col"><a class="btn btn-wa big" href="${esc(wa)}" data-wa-prop="${esc(p.id)}" target="_blank" rel="noopener">${ICON.wa}<span>Ask on WhatsApp</span></a><a class="btn btn-navy big" href="#contact">${ICON.cal}<span>Request a site visit</span></a>
            <div class="cta-row three"><button class="btn btn-line btn-sm" id="b-share" type="button">${ICON.share}<span>Share</span></button><a class="btn btn-line btn-sm" id="b-sheet" href="ficha.html?id=${n}&amp;lang=en" target="_blank" rel="noopener">${ICON.doc}<span>Spec sheet</span></a><a class="btn btn-line btn-sm" href="inmueble.html?id=${n}" hreflang="es" lang="es"><span>Español</span></a></div></div>
          <div class="seg seg-light" role="group" aria-label="Units"><button type="button" data-units="ft"${S.units === 'ft' ? ' class="on"' : ''}>ft²</button><button type="button" data-units="m"${S.units === 'm' ? ' class="on"' : ''}>m²</button></div>
        </div></aside>
      </div>
      <div class="pp-body"><div class="pp-col">
        <section class="blk" aria-labelledby="h-sp"><h2 id="h-sp">Specifications</h2><dl class="det">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl></section>
        ${desc ? `<section class="blk" aria-labelledby="h-de"><h2 id="h-de">Description</h2>${a.description_en ? '' : '<p class="note">Description available in Spanish.</p>'}<div class="desc"${a.description_en ? '' : ' lang="es"'}>${String(desc).split(/\n{2,}/).map((t) => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('')}</div></section>` : ''}
        <section class="blk" aria-labelledby="h-lo"><h2 id="h-lo">Location</h2><div class="loc-card"><span class="ic">${ICON.pin}</span><div><b>${esc(p.zone || 'Reynosa')}</b><span>Reynosa, Tamaulipas, Mexico</span><small>The exact address is shared when the site visit is scheduled.</small></div></div><div class="zmap" id="d-map" hidden aria-label="Approximate area map"></div></section>
      </div><div class="pp-col"><aside class="before"><b>Before you commit</b><p>Price, areas and availability are confirmed in writing before any transaction. Ask for every document and measurement you need. Never send a payment without a receipt or before visiting the building.</p></aside></div></div>`;
    if (CRX.map.valid(p.zone_lat, p.zone_lng)) { $('#d-map').hidden = false; CRX.map.zone($('#d-map'), { lat: p.zone_lat, lng: p.zone_lng, label: p.zone }).catch(() => { $('#d-map').hidden = true; }); }
    go(0, true);
    const title = `${titleOf(p)} · ${priceTxt(p)} | INMOBILIARIA CRUMEX`;
    document.title = title; setMeta('meta[property="og:title"]', 'content', title);
    const md = `${typeOf(p)} ${p.operation === 'renta' ? 'for lease' : 'for sale'} in Reynosa, Tamaulipas${bArea(p) ? ` · ${n0(bArea(p) * FT2)} ft²` : ''}. ${String(desc).replace(/\s+/g, ' ').slice(0, 110)}`;
    setMeta('meta[name="description"]', 'content', md); setMeta('meta[property="og:description"]', 'content', md);
    const el = document.createElement('script'); el.type = 'application/ld+json';
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'RealEstateListing', inLanguage: 'en', name: titleOf(p), url: new URL(`industrial.html?id=${n}`, location.href).href, description: desc || md, image: photos.map((x) => x.url).filter((u) => /^https?:/.test(u)), offers: p.price_on_request ? undefined : { '@type': 'Offer', price: p.price, priceCurrency: p.currency } });
    document.head.appendChild(el);
    $('#e-msg').value = `I am interested in ${p.ref_code} (${titleOf(p)}). `;
    $('#e-deal').value = p.operation === 'renta' ? 'lease' : 'buy';
    L.track(p.id, 'vista');
    window.scrollTo(0, 0);
  }

  function bindForm() {
    const f = $('#form-en'); const msg = $('.form-msg', f);
    const say = (t, c) => { msg.textContent = t; msg.className = 'form-msg ' + (c || ''); };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = new FormData(f); if (d.get('website')) return say('Thank you.', 'ok');
      const name = String(d.get('full_name') || '').trim(), phone = String(d.get('phone') || '').trim();
      if (name.length < 2) return say('Please enter your name.', 'err');
      if (phone.replace(/\D/g, '').length < 7) return say('Please enter a valid phone number.', 'err');
      if (!d.get('privacy')) return say('Please accept the privacy notice.', 'err');
      const company = String(d.get('company') || '').trim(); const size = num(d.get('size'));
      const btn = $('button[type=submit]', f); btn.disabled = true; say('Sending…');
      try {
        await CRX.api.createLead({ kind: 'contacto', full_name: name, phone, email: String(d.get('email') || '').trim() || null,
          message: `[English · industrial] ${String(d.get('message') || '').trim()}`.slice(0, 2000), property_id: P ? P.id : null,
          payload: { idioma: 'en', empresa: company || null, busca: d.get('deal'), superficie_ft2: size, superficie_m2: size ? Math.round(size / FT2) : null, ref_code: P ? P.ref_code : null } });
        say('Thank you! We received your request and will contact you soon.', 'ok'); f.reset();
      } catch (ex) { say('We could not send your request. Please try again or write to us on WhatsApp.', 'err'); }
      btn.disabled = false;
    });
  }

  async function init() {
    ui = L.chrome({ page: 'industrial' });
    const q = new URLSearchParams(location.search);
    if (['lease', 'sale'].includes(q.get('deal'))) S.deal = q.get('deal');
    S.min = num(q.get('min')); S.h = num(q.get('h')); S.docks = parseInt(q.get('docks'), 10) || 0; if (['size', 'ppsf'].includes(q.get('sort'))) S.sort = q.get('sort');
    if (q.get('units') === 'm') S.units = 'm';
    bindForm();
    document.addEventListener('click', (e) => {
      const u = e.target.closest('[data-units]');
      if (u) { S.units = u.dataset.units; try { localStorage.setItem('crx-units', S.units); } catch (er) { /* none */ } if (P) renderDetail(); else renderList(); return; }
      const dl = e.target.closest('[data-deal]'); if (dl) { S.deal = dl.dataset.deal; renderList(); return; }
      if (e.target.closest('#in-clear')) { Object.assign(S, { deal: '', min: null, h: null, docks: 0, sort: 'new' }); ['#in-min', '#in-h'].forEach((x) => { $(x).value = ''; }); $('#in-docks').value = ''; $('#in-sort').value = 'new'; renderList(); return; }
      const th = e.target.closest('[data-th]'); if (th) { go(Number(th.dataset.th)); return; }
      if (e.target.closest('#g-prev')) { go(cur - 1); return; } if (e.target.closest('#g-next')) { go(cur + 1); return; }
      if (e.target.closest('#g-zoom') || e.target.closest('#track .slide')) { if (photos.length) { $('#lb').showModal(); showLb(); } return; }
      if (e.target.closest('#lb-x')) { $('#lb').close(); return; }
      if (e.target.closest('#lb-prev')) { cur = (cur - 1 + photos.length) % photos.length; showLb(); go(cur, true); return; }
      if (e.target.closest('#lb-next')) { cur = (cur + 1) % photos.length; showLb(); go(cur, true); return; }
      if (e.target.id === 'lb') { $('#lb').close(); return; }
      if (e.target.closest('#b-sheet') && P) L.track(P.id, 'ficha');
      if (e.target.closest('#b-share') && P) {
        L.track(P.id, 'compartir'); const url = new URL(`industrial.html?id=${idOf(P)}`, location.href).href;
        if (navigator.share) navigator.share({ title: titleOf(P), url }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => CRX.toast('Link copied', 'ok'), () => CRX.toast('Copy the link from the address bar'));
      }
    });
    const onIn = CRX.debounce(() => { S.min = num($('#in-min').value); S.h = num($('#in-h').value); renderList(); }, 300);
    $('#in-min').addEventListener('input', onIn); $('#in-h').addEventListener('input', onIn);
    $('#in-docks').addEventListener('change', (e) => { S.docks = Number(e.target.value) || 0; renderList(); });
    $('#in-sort').addEventListener('change', (e) => { S.sort = e.target.value; renderList(); });
    if (S.min != null) $('#in-min').value = S.min; if (S.h != null) $('#in-h').value = S.h; if (S.docks) $('#in-docks').value = S.docks; $('#in-sort').value = S.sort;

    const [s, all] = await Promise.all([ui.ready, L.loadAll()]);
    $('#contact-list').innerHTML = L.contactItems(s).replace('Teléfono', 'Phone').replace('Escribir por WhatsApp', 'Write on WhatsApp').replace('Correo', 'Email').replace('Dirección', 'Address').replace('Horario', 'Hours');
    ALL = all.filter((p) => isIndustrial(p) && (p.status === 'disponible' || p.status === 'apartada'));
    const idq = (q.get('id') || '').trim();
    if (idq) {
      const ref = /^\d{1,7}$/.test(idq) ? 'CRX-' + idq.padStart(5, '0') : idq;
      P = all.find((p) => p.ref_code === ref && isIndustrial(p) && p.status !== 'borrador') || null;
      if (P) { renderDetail(); return; }
      CRX.toast('That listing is not available. Here are the current ones.');
    }
    renderList();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
