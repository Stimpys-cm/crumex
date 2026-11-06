/* INMOBILIARIA CRUMEX · páginas por zona
   zona.html                         → todas las zonas con cuántas propiedades hay
   zona.html?z=zona-norte            → la zona: cifras, mapa aproximado y propiedades
   zona.html?z=zona-norte&tipo=casa&op=venta → "Casas en venta en Zona Norte" (útil para Google) */
(function () {
  const CRX = window.CRX; const { $, $$, esc } = CRX; const L = CRX.L;
  const { ICON, PLURAL, fmtN, photoOf, area } = L;
  let ALL = [], ZONES = [], Z = null, ui = null;
  const st = { tipo: '', op: '' };
  const live = (p) => p.status === 'disponible' || p.status === 'apartada';
  const slug = (n) => CRX.slugify(n || '');
  const setMeta = (sel, attr, val) => { let el = document.head.querySelector(sel); if (!el) { el = document.createElement('meta'); const [k, v] = sel.match(/\[(\w+)="([^"]+)"\]/).slice(1); el.setAttribute(k, v); document.head.appendChild(el); } el.setAttribute(attr, val); };
  const setCanon = (url) => { let l = document.head.querySelector('link[rel="canonical"]'); if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); } l.href = url; };
  const SING = { casa: 'Casas', departamento: 'Departamentos', terreno: 'Terrenos', nave: 'Naves industriales' };
  const OPW = { venta: 'en venta', renta: 'en renta' };

  function headline() {
    const what = st.tipo ? SING[st.tipo] : 'Propiedades';
    return `${what}${st.op ? ' ' + OPW[st.op] : ''} en ${Z.name}`;
  }
  function url() {
    const q = new URLSearchParams(); q.set('z', slug(Z.name)); if (st.tipo) q.set('tipo', st.tipo); if (st.op) q.set('op', st.op);
    return 'zona.html?' + q.toString();
  }

  /* ---------- índice de zonas ---------- */
  function renderIndex() {
    $('#z-index').hidden = false; $('#z-detail').hidden = true; $('#z-others').hidden = true;
    const rows = ZONES.map((z) => {
      const list = ALL.filter((p) => p.zone === z.name && live(p));
      return { z, list, n: list.length, types: Object.keys(CRX.TYPES).filter((t) => list.some((p) => p.type === t)) };
    }).sort((a, b) => b.n - a.n || a.z.name.localeCompare(b.z.name, 'es'));
    const total = rows.reduce((s, r) => s + r.n, 0);
    $('#z-stats').hidden = !rows.length;
    $('#z-stats').innerHTML = `<div><b class="num">${fmtN(rows.filter((r) => r.n).length)}</b><span>Zonas con propiedades</span></div><div><b class="num">${fmtN(total)}</b><span>Propiedades publicadas</span></div>`;
    $('#z-grid').innerHTML = rows.length ? rows.map(({ z, list, n, types }) => {
      const img = list.map(photoOf).find(Boolean) || '';
      return `<a class="zcard${img ? ' has-img' : ''}" href="${esc(L.zoneHref(z.name))}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}<span class="zc-b"><span class="zc-n">${ICON.pin}${esc(z.name)}</span><b>${n ? `${n} ${n === 1 ? 'propiedad' : 'propiedades'}` : 'Pregunta por disponibilidad'}</b><small>${types.length ? esc(L.typesTxt(types)) : esc(z.city || 'Reynosa')}</small></span></a>`;
    }).join('') : '<p class="muted-p">Aún no hay zonas registradas.</p>';
    document.title = 'Zonas de Reynosa | INMOBILIARIA CRUMEX';
    setCanon(new URL('zona.html', location.href).href);
  }

  /* ---------- una zona ---------- */
  function renderZone(first) {
    $('#z-index').hidden = true; $('#z-detail').hidden = false;
    const inZone = ALL.filter((p) => p.zone === Z.name && live(p));
    const list = inZone.filter((p) => (!st.tipo || p.type === st.tipo) && (!st.op || p.operation === st.op))
      .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
    const h = headline();
    $('#z-crumbs').innerHTML = `<a href="tienda.html">Inicio</a><span>/</span><a href="zona.html">Zonas</a><span>/</span>${st.tipo || st.op ? `<a href="${esc(L.zoneHref(Z.name))}">${esc(Z.name)}</a><span>/</span><b aria-current="page">${esc(h.replace(' en ' + Z.name, ''))}</b>` : `<b aria-current="page">${esc(Z.name)}</b>`}`;
    $('#h-z').innerHTML = `${esc(h.replace(' en ' + Z.name, ''))} en <em>${esc(Z.name)}</em>`;
    $('#z-lead').textContent = `${Z.city || 'Reynosa'}, Tamaulipas. ${inZone.length ? `Tenemos ${inZone.length} ${inZone.length === 1 ? 'propiedad publicada' : 'propiedades publicadas'} en esta zona.` : 'Por ahora no tenemos propiedades publicadas aquí; escríbenos y te avisamos.'}`;

    // cifras de la zona
    const cells = [[inZone.length, 'Disponibles']];
    const sale = inZone.filter((p) => p.operation === 'venta'), rent = inZone.filter((p) => p.operation === 'renta');
    if (sale.length) cells.push([sale.length, 'En venta']); if (rent.length) cells.push([rent.length, 'En renta']);
    const ppmList = sale.filter((p) => p.currency === 'MXN' && !p.price_on_request && p.price > 0 && area(p) && ['casa', 'departamento'].includes(p.type)).map((p) => p.price / area(p));
    if (ppmList.length) cells.push(['$' + fmtN(Math.round(ppmList.reduce((a, b) => a + b, 0) / ppmList.length)), 'Promedio por m² (casas y deptos. en venta)']);
    const rentMin = rent.filter((p) => p.currency === 'MXN' && !p.price_on_request && p.price > 0).map((p) => Number(p.price));
    if (rentMin.length) cells.push(['$' + fmtN(Math.min(...rentMin)), 'Rentas desde (MXN/mes)']);
    $('#z-stats').hidden = false;
    $('#z-stats').innerHTML = cells.slice(0, 4).map(([v, l]) => `<div><b class="num">${typeof v === 'number' ? fmtN(v) : esc(v)}</b><span>${esc(l)}</span></div>`).join('');

    // pestañas por tipo y operación (con conteos)
    const cnt = (t, o) => inZone.filter((p) => (!t || p.type === t) && (!o || p.operation === o)).length;
    $('#z-tabs').innerHTML = [['', 'Todas']].concat(Object.keys(CRX.TYPES).map((t) => [t, PLURAL[t]])).filter(([t]) => !t || cnt(t, '') || st.tipo === t)
      .map(([t, l]) => `<a class="ztab" href="${esc(withParams({ tipo: t }))}" data-tipo="${t}"${st.tipo === t ? ' aria-current="page"' : ''}>${esc(l)}<small>${cnt(t, st.op)}</small></a>`).join('');
    $('#z-ops').innerHTML = [['', 'Todas'], ['venta', 'Venta'], ['renta', 'Renta']].map(([o, l]) => `<button type="button" data-op="${o}" class="${st.op === o ? 'on' : ''}" aria-pressed="${st.op === o}">${l}</button>`).join('');

    $('#z-count').innerHTML = list.length ? `<b class="num">${list.length}</b> ${list.length === 1 ? 'resultado' : 'resultados'}` : '';
    $('#z-cards').innerHTML = list.map((p) => L.cardHtml(p)).join('');
    $('#z-cards').hidden = !list.length; $('#z-empty').hidden = !!list.length;
    $('#z-cat').href = 'catalogo.html?zona=' + encodeURIComponent(Z.name) + (st.tipo ? '&tipo=' + st.tipo : '') + (st.op ? '&op=' + st.op : '');
    $('#z-wa2').href = CRX.waLink(`Hola, busco ${h.toLowerCase()}, Reynosa. ¿Me avisan cuando tengan algo?`);

    // sobre la zona
    const desc = Z.description ? String(Z.description) : `Conoce las propiedades que tenemos en ${Z.name}, ${Z.city || 'Reynosa'}. Si buscas algo que no ves aquí, escríbenos: también trabajamos con propiedades que todavía no publicamos.`;
    const lines = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const hl = lines(Z.highlights); const cm = lines(Z.commute).map((x) => x.split('|').map((y) => y.trim()));
    $('#z-about').innerHTML = `<h3>Sobre ${esc(Z.name)}</h3>${desc.split(/\n{2,}/).map((t) => `<p>${esc(t)}</p>`).join('')}
      ${hl.length ? `<h4 class="z-sub">Qué hay en la zona</h4><ul class="z-list">${hl.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${cm.length ? `<h4 class="z-sub">Tiempos aproximados en auto</h4><dl class="z-times">${cm.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b || '')}</dd></div>`).join('')}</dl>` : ''}
      <div class="z-act"><a class="btn btn-wa" href="${esc(CRX.waLink(`Hola, busco una propiedad en ${Z.name}, Reynosa.`))}" target="_blank" rel="noopener">${ICON.wa}<span>Busco en esta zona</span></a><a class="btn btn-line" href="catalogo.html?zona=${encodeURIComponent(Z.name)}">Filtrar en el catálogo</a></div>
      <p class="note">La ubicación del mapa es aproximada. La dirección exacta de cada propiedad se comparte al agendar la visita.</p>`;
    if (first && CRX.map.valid(Z.lat, Z.lng)) { $('#z-map').hidden = false; CRX.map.zone($('#z-map'), { lat: Z.lat, lng: Z.lng, label: Z.name, radius: 900, zoom: 14 }).catch(() => { $('#z-map').hidden = true; }); }

    // otras zonas
    const others = ZONES.filter((z) => z.name !== Z.name).map((z) => [z, ALL.filter((p) => p.zone === z.name && live(p)).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
    $('#z-others').hidden = !others.length;
    $('#z-other-chips').innerHTML = others.map(([z, n]) => `<a class="zchip" href="${esc(L.zoneHref(z.name))}">${ICON.pin}${esc(z.name)}<small>${n}</small></a>`).join('');

    // SEO
    const title = `${h}, Reynosa | INMOBILIARIA CRUMEX`;
    const mdesc = `${h}, Reynosa, Tamaulipas. ${list.length ? `${list.length} ${list.length === 1 ? 'opción disponible' : 'opciones disponibles'}` : 'Pregunta por disponibilidad'} con INMOBILIARIA CRUMEX: fotos, precios y visitas sin costo.`;
    document.title = title; setMeta('meta[name="description"]', 'content', mdesc); setMeta('meta[property="og:title"]', 'content', title); setMeta('meta[property="og:description"]', 'content', mdesc);
    const canon = new URL(url(), location.href).href; setCanon(canon);
    const ld = document.getElementById('z-ld') || Object.assign(document.createElement('script'), { id: 'z-ld', type: 'application/ld+json' });
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [['Inicio', 'tienda.html'], ['Zonas', 'zona.html'], [Z.name, L.zoneHref(Z.name)]].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: new URL(u, location.href).href })) },
      { '@type': 'ItemList', name: h, itemListElement: list.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: new URL(L.href(p), location.href).href, name: p.title })) }] });
    if (!ld.parentNode) document.head.appendChild(ld);
    try { history.replaceState(null, '', url()); } catch (e) { /* nada */ }
    ui.syncFavs();
  }
  function withParams(patch) {
    const o = Object.assign({}, st, patch); const q = new URLSearchParams(); q.set('z', slug(Z.name)); if (o.tipo) q.set('tipo', o.tipo); if (o.op) q.set('op', o.op);
    return 'zona.html?' + q.toString();
  }

  async function init() {
    ui = L.chrome({ page: 'zona' });
    const q = new URLSearchParams(location.search);
    st.tipo = CRX.TYPES[q.get('tipo')] ? q.get('tipo') : ''; st.op = CRX.OPS[q.get('op')] ? q.get('op') : '';
    const d = await CRX.api.loadPublic();
    ALL = d.properties || [];
    ZONES = (d.zones || []).slice();
    // zonas que solo vienen en las propiedades (por si la vista de zonas no respondió)
    [...new Set(ALL.map((p) => p.zone).filter(Boolean))].forEach((n) => { if (!ZONES.some((z) => z.name === n)) ZONES.push({ name: n, city: 'Reynosa' }); });
    const zq = (q.get('z') || '').trim();
    Z = zq ? ZONES.find((z) => slug(z.name) === CRX.slugify(zq)) : null;
    if (zq && !Z) {
      renderIndex();
      $('#h-z').innerHTML = 'No encontramos <em>esa zona</em>';
      $('#z-lead').textContent = 'Revisa las zonas donde tenemos propiedades:';
      setMeta('meta[name="robots"]', 'content', 'noindex');
      return;
    }
    if (!Z) { renderIndex(); return; }
    renderZone(true);
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tipo]');
      if (tab && !e.ctrlKey && !e.metaKey) { e.preventDefault(); st.tipo = tab.dataset.tipo; renderZone(false); return; }
      const op = e.target.closest('[data-op]'); if (op) { st.op = op.dataset.op; renderZone(false); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
