/* INMOBILIARIA CRUMEX · ficha técnica imprimible (ficha.html?id=1, en inglés con &lang=en)
   Se imprime en tamaño carta o se guarda como PDF desde el cuadro de impresión.
   Incluye un código QR que lleva a la página de la propiedad. */
(function () {
  const CRX = window.CRX; const { $, esc } = CRX; const L = CRX.L;
  const { ICON, isOwn, fmtN, photoOf, ATTR, HIDDEN_ATTRS } = L;
  const q = new URLSearchParams(location.search);
  const EN = q.get('lang') === 'en';
  const FT2 = 10.7639, FT = 3.28084;
  const T = EN ? {
    sheet: 'Spec sheet', back: 'Back to the listing', hint: 'In the print dialog choose “Save as PDF”.', print: 'Print or save PDF',
    sale: 'For sale', lease: 'For lease', month: '/ month', onreq: 'Price on request', facts: 'Key facts', desc: 'Description', more: 'More details',
    contact: 'Contact', scan: 'Scan for photos and details', note: 'Information for reference only. Price, areas and availability are confirmed in writing before any transaction.',
    nf: 'Listing not found.', building: 'Building', land: 'Land', clear: 'Clear height', docks: 'Loading docks', power: 'Power', beds: 'Bedrooms', baths: 'Bathrooms', parking: 'Parking', age: 'Age', years: 'years', newb: 'New', zone: 'Area',
    types: { casa: 'House', departamento: 'Apartment', terreno: 'Land', nave: 'Industrial building' }, generated: 'Generated'
  } : {
    sheet: 'Ficha técnica', back: 'Volver a la propiedad', hint: 'En el cuadro de impresión elige “Guardar como PDF”.', print: 'Imprimir o guardar PDF',
    sale: 'En venta', lease: 'En renta', month: '/ mes', onreq: 'Precio a consultar', facts: 'Datos principales', desc: 'Descripción', more: 'Más características',
    contact: 'Contacto', scan: 'Escanea para ver fotos y detalles', note: 'Información de referencia. Precio, medidas y disponibilidad se confirman por escrito antes de cualquier operación.',
    nf: 'No encontramos esta propiedad.', building: 'Construcción', land: 'Terreno', clear: 'Altura libre', docks: 'Andenes', power: 'Energía', beds: 'Recámaras', baths: 'Baños', parking: 'Estacionamientos', age: 'Antigüedad', years: 'años', newb: 'A estrenar', zone: 'Zona',
    types: CRX.TYPES, generated: 'Generada'
  };
  const nf = (v) => Number(v).toLocaleString(EN ? 'en-US' : 'es-MX', { maximumFractionDigits: 2 });
  const area = (m2) => EN ? `${nf(Math.round(m2 * FT2))} ft² (${nf(m2)} m²)` : `${nf(m2)} m²`;
  const priceTxt = (p) => (p.price_on_request || p.price == null) ? T.onreq : `$${Number(p.price).toLocaleString(EN ? 'en-US' : 'es-MX', { maximumFractionDigits: 0 })} ${p.currency}${p.operation === 'renta' ? ' ' + T.month : ''}`;

  function qrSvg(text) {
    try { const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make(); return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { return ''; }
  }

  async function init() {
    $('#f-back-t').textContent = T.back; $('#f-hint').textContent = T.hint; $('#f-print').textContent = T.print;
    document.documentElement.lang = EN ? 'en' : 'es-MX';
    const idq = (q.get('id') || '').trim();
    const ref = /^\d{1,7}$/.test(idq) ? 'CRX-' + idq.padStart(5, '0') : (q.get('ref') || '').trim();
    const [s, all] = await Promise.all([L.loadSettings(), L.loadAll()]);
    const p = all.find((x) => x.ref_code === ref);
    if (!p) { $('#sheet').innerHTML = `<p class="f-loading">${esc(T.nf)}</p>`; return; }
    const n = L.refNum(p.ref_code);
    const pageUrl = new URL(EN && p.type === 'nave' ? `industrial.html?id=${n}` : `inmueble.html?id=${n}`, location.href).href;
    $('#f-back').href = pageUrl;
    const a = p.attributes || {};
    const title = (EN && a.title_en) || p.title;
    const desc = (EN && a.description_en) || p.description || '';
    const zone = p.zone || p.public_location || 'Reynosa';
    const imgs = L.pics(p).slice(0, 4).map((ph, i) => photoOf(p, i, i ? 700 : 1400)).filter(Boolean);

    const facts = [];
    if (isOwn(p.bedrooms)) facts.push([ICON.bed, p.bedrooms, T.beds]);
    if (isOwn(p.bathrooms)) facts.push([ICON.bath, Number(p.bathrooms), T.baths]);
    if (isOwn(p.parking)) facts.push([ICON.car, p.parking, T.parking]);
    if (isOwn(p.construction_m2)) facts.push([ICON.area, area(Number(p.construction_m2)), T.building]);
    if (isOwn(p.land_m2)) facts.push([ICON.land, area(Number(p.land_m2)), T.land]);
    if (isOwn(a.altura_libre_m)) facts.push([ICON.height, EN ? `${nf(Math.round(a.altura_libre_m * FT * 10) / 10)} ft (${a.altura_libre_m} m)` : `${a.altura_libre_m} m`, T.clear]);
    if (isOwn(a.andenes)) facts.push([ICON.dock, a.andenes, T.docks]);
    if (isOwn(a.kva)) facts.push([ICON.bolt, fmtN(a.kva) + ' kVA', T.power]);
    const extra = Object.entries(a).filter(([k, v]) => isOwn(v) && !HIDDEN_ATTRS.has(k) && !['altura_libre_m', 'andenes', 'kva'].includes(k)).map(([k, v]) => [ATTR[k] || k, v]);
    if (isOwn(p.age_years)) extra.push([T.age, Number(p.age_years) === 0 ? T.newb : `${p.age_years} ${T.years}`]);
    extra.unshift([T.zone, `${zone}, Reynosa, Tamaulipas`]);
    if (!EN) {
      if (isOwn(a.niveles)) extra.push(['Niveles', Number(a.niveles) === 1 ? 'Una planta' : a.niveles + ' plantas']);
      if (isOwn(a.mantenimiento)) extra.push(['Mantenimiento', `$${nf(a.mantenimiento)} MXN al mes`]);
      const cr = (a.creditos || []).map((k) => (CRX.FEAT.creditos.find((x) => x[0] === k) || [k, k])[1]); if (cr.length && p.operation === 'venta') extra.push(['Acepta', cr.join(', ')]);
      if (p.operation === 'renta') {
        if (a.amueblado) extra.push(['Amueblada', (CRX.FEAT.amueblado.find((x) => x[0] === a.amueblado) || ['', a.amueblado])[1]]);
        if (a.mascotas) extra.push(['Mascotas', a.mascotas === 'si' ? 'Sí' : a.mascotas === 'no' ? 'No' : 'Preguntar']);
        if (isOwn(a.deposito_meses)) extra.push(['Depósito', `${a.deposito_meses} ${Number(a.deposito_meses) === 1 ? 'mes' : 'meses'} de renta`]);
      }
      const am = CRX.amenFor(p.type).filter(([k]) => (a.amenidades || []).includes(k)).map(([, l]) => l); if (am.length) extra.push(['Lo que tiene', am.join(', ')]);
    }
    const phone = s.phone || window.CRX_CONFIG.PHONE || '';
    const contacts = [phone ? `<li><b>${EN ? 'Phone / WhatsApp' : 'Teléfono / WhatsApp'}</b>${esc(phone)}</li>` : '', s.email ? `<li><b>${EN ? 'Email' : 'Correo'}</b>${esc(s.email)}</li>` : '', s.address ? `<li><b>${EN ? 'Office' : 'Oficina'}</b>${esc(s.address)}</li>` : '', `<li><b>Web</b>${esc(location.host || '')}</li>`].join('');
    const dateTxt = new Date().toLocaleDateString(EN ? 'en-US' : 'es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

    $('#sheet').innerHTML = `
      <header class="s-head">
        <div class="s-brand"><span class="mark">C</span><span><small>Inmobiliaria</small><b>CRUMEX</b></span></div>
        <div class="s-meta"><b>${esc(T.sheet)}</b><span>${esc(p.ref_code)} · ${esc(T.generated)} ${esc(dateTxt)}</span></div>
      </header>
      <section class="s-title">
        <p class="s-eyebrow">${esc(T.types[p.type] || p.type)} ${esc(EN ? (p.operation === 'renta' ? 'for lease' : 'for sale') : (p.operation === 'renta' ? 'en renta' : 'en venta'))}</p>
        <h1>${esc(title)}</h1>
        <p class="s-where">${ICON.pin}<span>${esc(zone)}, Reynosa, Tamaulipas</span></p>
        <p class="s-price">${esc(priceTxt(p))}</p>
      </section>
      <section class="s-photos n${imgs.length}">${imgs.length ? imgs.map((u, i) => `<img src="${esc(u)}" alt="" class="${i ? '' : 'main'}">`).join('') : `<div class="s-noph noimg">${L.signHtml(p, { lg: 1, lang: EN ? 'en' : '', what: EN ? T.types[p.type] : '' })}</div>`}</section>
      ${facts.length ? `<section class="s-facts" aria-label="${esc(T.facts)}">${facts.slice(0, 8).map(([i, v, l]) => `<div>${i}<b>${esc(v)}</b><small>${esc(l)}</small></div>`).join('')}</section>` : ''}
      <section class="s-body">
        <div>${desc ? `<h2>${esc(T.desc)}</h2>${String(desc).slice(0, 1400).split(/\n{2,}/).map((t) => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('')}${desc.length > 1400 ? '<p>…</p>' : ''}` : ''}
          <h2>${esc(T.more)}</h2><dl>${extra.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
        <div class="s-side"><div class="s-qr">${qrSvg(pageUrl)}</div><p class="s-scan">${esc(T.scan)}</p><h2>${esc(T.contact)}</h2><ul>${contacts}</ul></div>
      </section>
      <footer class="s-foot">${esc(T.note)}</footer>`;
    document.title = `${T.sheet} ${p.ref_code} · ${title}`;
    // espera a que carguen las fotos antes de permitir imprimir
    const pending = Array.from(document.querySelectorAll('.s-photos img')).map((im) => im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; })).filter(Boolean);
    await Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, 6000))]);
    $('#f-print').disabled = false;
    $('#f-print').onclick = () => window.print();
    if (q.get('print') === '1') setTimeout(() => window.print(), 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
