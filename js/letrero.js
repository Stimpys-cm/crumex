/* INMOBILIARIA CRUMEX · letrero para colgar en la propiedad (letrero.html?id=1)
   "SE RENTA" o "SE VENDE", lo principal de la propiedad, el teléfono y un código QR
   que abre su ficha en el sitio (marcado como origen "letrero" en las estadísticas). */
(function () {
  const CRX = window.CRX; const { $, esc } = CRX; const L = CRX.L;
  const { isOwn, fmtN } = L;
  const q = new URLSearchParams(location.search);
  const qrSvg = (text) => { try { const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make(); return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { return ''; } };

  async function init() {
    const idq = (q.get('id') || '').trim();
    const ref = /^\d{1,7}$/.test(idq) ? 'CRX-' + idq.padStart(5, '0') : (q.get('ref') || '').trim();
    const [s, all] = await Promise.all([L.loadSettings(), L.loadAll()]);
    const p = all.find((x) => x.ref_code === ref);
    if (!p) { $('#lt').innerHTML = '<p class="f-loading">No encontramos esta propiedad.</p>'; return; }
    const n = L.refNum(p.ref_code);
    const page = new URL(`inmueble.html?id=${n}`, location.href);
    $('#f-back').href = page.href;
    const scan = new URL(page.href); scan.searchParams.set('utm_source', 'letrero'); scan.searchParams.set('utm_medium', 'offline');
    const a = p.attributes || {};
    const bits = [];
    if (isOwn(p.bedrooms) && Number(p.bedrooms) > 0) bits.push(`${p.bedrooms} ${Number(p.bedrooms) === 1 ? 'recámara' : 'recámaras'}`);
    if (isOwn(p.bathrooms) && Number(p.bathrooms) > 0) bits.push(`${Number(p.bathrooms)} ${Number(p.bathrooms) === 1 ? 'baño' : 'baños'}`);
    const m2 = p.type === 'terreno' ? p.land_m2 : (isOwn(p.construction_m2) ? p.construction_m2 : p.land_m2);
    if (isOwn(m2)) bits.push(`${fmtN(m2)} m²`);
    if (p.type === 'nave' && isOwn(a.andenes)) bits.push(`${a.andenes} andenes`);
    const extra = p.operation === 'renta' ? (a.amueblado === 'si' ? 'Amueblada' : a.mascotas === 'si' ? 'Acepta mascotas' : '') : ((a.creditos || []).includes('infonavit') ? 'Acepta Infonavit' : '');
    const ph = L.fmtPh(s.phone || s.whatsapp);
    $('#lt').innerHTML = `<div class="lt-sheet">
      <div class="lt-main">
        <h1 class="lt-op">${p.operation === 'renta' ? 'SE RENTA' : 'SE VENDE'}</h1>
        <p class="lt-what">${esc(CRX.TYPES[p.type] || '')}${bits.length ? ' · ' + esc(bits.join(' · ')) : ''}</p>
        ${extra ? `<p class="lt-extra">${esc(extra)}</p>` : ''}
        <p class="lt-phone">${esc(ph)}</p>
        <p class="lt-wa">Llama o escribe por WhatsApp</p>
      </div>
      <div class="lt-side">
        <div class="lt-qr">${qrSvg(scan.href)}</div>
        <p>Escanea para ver fotos, precio y ubicación</p>
        <p class="lt-ref">${esc(p.ref_code)}</p>
      </div>
      <div class="lt-foot"><span class="lt-brand">INMOBILIARIA <b>CRUMEX</b></span>${s.license ? `<span>Registro estatal ${esc(s.license)}</span>` : ''}</div>
    </div>`;
    $('#f-print').disabled = false; $('#f-print').onclick = () => window.print();
    document.title = `Letrero ${p.ref_code} | INMOBILIARIA CRUMEX`;
  }
  init().catch((e) => { $('#lt').innerHTML = `<p class="f-loading">${esc(CRX.api.errMsg(e))}</p>`; });
})();
