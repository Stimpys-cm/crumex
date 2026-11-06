/* CruMex · utilidades compartidas */
(function () {
  const CRX = (window.CRX = window.CRX || {});

  CRX.$ = (s, r) => (r || document).querySelector(s);
  CRX.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  CRX.esc = (v) =>
    String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  CRX.num = (v) => {
    if (v === '' || v == null) return null;
    const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  CRX.money = (price, cur, onRequest) => {
    if (onRequest || price == null) return 'Precio a consultar';
    const s = Number(price).toLocaleString('es-MX', { maximumFractionDigits: 0 });
    return '$' + s + ' ' + (cur || 'MXN');
  };

  CRX.slugify = (t) =>
    String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

  CRX.uuid = () =>
    (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });

  CRX.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 200); }; };

  CRX.TYPES = { casa: 'Casa', departamento: 'Departamento', terreno: 'Terreno', nave: 'Nave industrial' };
  CRX.OPS = { venta: 'Venta', renta: 'Renta' };
  // Lo que suelen mostrar los portales: amenidades por tipo, créditos que acepta y condiciones de renta.
  // Las claves se guardan en attributes (amenidades, creditos, amueblado, mascotas…); el servidor valida las mismas.
  CRX.FEAT = {
    hogar: [['privada', 'Fraccionamiento privado'], ['vigilancia', 'Vigilancia o caseta'], ['minisplits', 'Minisplits o aire acondicionado'], ['cocina_integral', 'Cocina integral'],
      ['boiler', 'Boiler o calentador solar'], ['cisterna', 'Cisterna'], ['patio', 'Patio o jardín'], ['cochera_techada', 'Cochera techada'], ['protecciones', 'Protecciones en ventanas'],
      ['cuarto_servicio', 'Cuarto de servicio'], ['terraza', 'Terraza'], ['alberca', 'Alberca'], ['area_juegos', 'Área de juegos o parque'], ['gimnasio', 'Gimnasio']],
    terreno: [['agua', 'Toma de agua'], ['luz', 'Luz'], ['drenaje', 'Drenaje'], ['pavimento', 'Calle pavimentada'], ['escriturado', 'Escriturado'], ['bardeado', 'Bardeado'], ['esquina', 'En esquina']],
    nave: [['oficinas', 'Oficinas'], ['banos_nave', 'Baños'], ['patio_maniobras', 'Patio de maniobras'], ['subestacion', 'Subestación eléctrica'], ['rociadores', 'Rociadores contra incendio'],
      ['grua', 'Grúa viajera'], ['caseta', 'Caseta de vigilancia']],
    creditos: [['infonavit', 'Infonavit'], ['fovissste', 'Fovissste'], ['bancario', 'Crédito bancario']],
    amueblado: [['no', 'Sin amueblar'], ['semi', 'Semiamueblada'], ['si', 'Amueblada']],
    mascotas: [['si', 'Sí'], ['no', 'No'], ['consultar', 'Preguntar']]
  };
  CRX.amenFor = (type) => CRX.FEAT[type === 'casa' || type === 'departamento' ? 'hogar' : type] || [];
  // filtros del catálogo que salen de esos datos
  CRX.FEAT_FILTERS = { infonavit: 'Acepta Infonavit', fovissste: 'Acepta Fovissste', bancario: 'Acepta crédito bancario', amueblada: 'Amueblada o semiamueblada', mascotas: 'Acepta mascotas',
    privada: 'En privada o con vigilancia', una_planta: 'De una planta', minisplits: 'Con minisplits', patio: 'Con patio o jardín', alberca: 'Con alberca', cochera_techada: 'Con cochera techada' };
  CRX.hasFeat = (p, k) => {
    const a = (p && p.attributes) || {}; const am = a.amenidades || []; const cr = a.creditos || [];
    if (k === 'infonavit' || k === 'fovissste' || k === 'bancario') return cr.includes(k);
    if (k === 'amueblada') return a.amueblado === 'si' || a.amueblado === 'semi';
    if (k === 'mascotas') return a.mascotas === 'si';
    if (k === 'privada') return am.includes('privada') || am.includes('vigilancia');
    if (k === 'una_planta') return Number(a.niveles) === 1;
    return am.includes(k);
  };
  CRX.STATUS = { borrador: 'Borrador', disponible: 'Disponible', apartada: 'Apartada', cerrada: 'Cerrada', oculta: 'Oculta' };
  CRX.LEAD_KINDS = { contacto: 'Contacto', visita: 'Visita', valuacion: 'Estimación de valor', captacion: 'Propietario', credito: 'Crédito', whatsapp: 'WhatsApp', llamada: 'Llamada', otro: 'Otro' };
  CRX.LEAD_STATUS = { nuevo: 'Nuevo', contactado: 'Contactado', seguimiento: 'En seguimiento', ganado: 'Ganado', descartado: 'Descartado' };

  CRX.toast = (msg, kind) => {
    let box = CRX.$('.toast-box');
    if (!box) { box = document.createElement('div'); box.className = 'toast-box'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), kind === 'err' ? 6000 : 3500);
  };

  CRX.waLink = (text) => {
    const n = (CRX.settings && CRX.settings.whatsapp) || window.CRX_CONFIG.WHATSAPP;
    return 'https://wa.me/' + String(n).replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : '');
  };

  CRX.mapsLink = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q + ', Reynosa, Tamaulipas');

  /* Comprime una imagen a WebP (máx. 1600px) en el navegador */
  CRX.fileToWebp = (file, max, quality) =>
    new Promise((resolve, reject) => {
      max = max || 1600; quality = quality || 0.82;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen')); }, 'image/webp', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Archivo de imagen no válido')); };
      img.src = url;
    });

  CRX.blobToDataUrl = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });

  CRX.fmtDate = (d) => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '';

  /* Clave de contenido legible desde el texto de ajustes: "valor | descripción" por línea */
  CRX.lines = (txt, n) => String(txt || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split('|').map((x) => x.trim()); while (p.length < (n || 2)) p.push(''); return p;
  });

  /* Confirmación dentro de la página (sin confirm() del navegador). Devuelve Promise<boolean>. */
  CRX.ask = (message, opts) => new Promise((resolve) => {
    opts = opts || {};
    let d = document.getElementById('crx-ask');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'crx-ask'; d.className = 'ask';
      d.innerHTML = '<div class="dlg-body"><p class="ask-msg"></p><div class="ask-act"><button type="button" class="btn btn-line btn-sm" data-v="0">Cancelar</button><button type="button" class="btn btn-sm" data-v="1"></button></div></div>';
      document.body.appendChild(d);
    }
    d.querySelector('.ask-msg').textContent = message;
    const ok = d.querySelector('[data-v="1"]');
    ok.textContent = opts.ok || 'Aceptar';
    ok.className = 'btn btn-sm ' + (opts.danger ? 'btn-danger' : 'btn-navy');
    const done = (v) => { d.onclick = null; d.oncancel = null; if (d.open) d.close(); resolve(v); };
    d.onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) done(b.dataset.v === '1'); else if (e.target === d) done(false); };
    d.oncancel = (e) => { e.preventDefault(); done(false); };
    d.showModal(); ok.focus();
  });

  /* ¿De dónde llegó? Se guarda en este navegador el último origen externo (anuncio, red social, buscador)
     de los últimos 30 días y se manda con la solicitud. No incluye datos personales. */
  CRX.captureOrigin = () => {
    try {
      const q = new URLSearchParams(location.search); let ref = null;
      try { const r = document.referrer ? new URL(document.referrer) : null; if (r && r.host && r.host !== location.host) ref = r.host.replace(/^www\./, ''); } catch (e) { ref = null; }
      const o = { source: q.get('utm_source'), medium: q.get('utm_medium'), campaign: q.get('utm_campaign'), click: q.get('fbclid') ? 'fb' : q.get('gclid') ? 'g' : null, ref, landing: (location.pathname.split('/').pop() || 'tienda.html') + (q.get('id') ? '?id=' + q.get('id') : ''), at: Date.now() };
      if (o.source || o.medium || o.campaign || o.click || o.ref) localStorage.setItem('crx-origin', JSON.stringify(o));
    } catch (e) { /* sin almacenamiento */ }
  };
  // misma regla que el servidor (api/_rules.js); aquí solo se usa en el modo demostración
  CRX.channelOf = (o) => {
    if (!o) return 'Directo';
    const t = [o.source, o.medium, o.ref].filter(Boolean).join(' ').toLowerCase();
    if (/instagram|\big\b/.test(t)) return 'Instagram';
    if (o.click === 'fb' || /facebook|\bfb\b|\bmeta\b/.test(t)) return 'Facebook';
    if (/whatsapp|wa\.me|\bwa\b|l\.wl\.co/.test(t)) return 'WhatsApp';
    if (/tiktok/.test(t)) return 'TikTok';
    if (o.click === 'g' || /google/.test(t)) return o.click === 'g' || /cpc|ads|paid|ppc/.test(t) ? 'Google (anuncio)' : 'Google';
    if (/redes|social/.test(t)) return 'Redes sociales';
    if (o.source || o.campaign) return 'Campaña: ' + (o.source || o.campaign);
    if (o.ref) return 'Otro sitio: ' + o.ref;
    return 'Directo';
  };
  CRX.origin = () => { try { const o = JSON.parse(localStorage.getItem('crx-origin') || 'null'); return o && Date.now() - o.at < 30 * 864e5 ? o : null; } catch (e) { return null; } };

  /* Mensualidad aproximada con tasa fija */
  CRX.monthly = (loan, ratePct, years) => {
    const r = ratePct / 100 / 12, n = Math.round(years * 12);
    if (!(loan > 0) || !(n > 0)) return 0;
    return r === 0 ? loan / n : loan * r / (1 - Math.pow(1 + r, -n));
  };
  /* Texto de una guía → HTML seguro (sitio y vista previa del panel).
     Todo se escapa primero; solo después se convierten las marcas permitidas:
     ## subtítulo · - viñetas · 1. numerada · **negritas** · > nota · [texto](https://… o página.html) */
  const LINK = /\[([^\]]{1,120})\]\(((?:https:\/\/|(?:tienda|catalogo|inmueble|zona|vender|guias|industrial|terminos)\.html)[^)\s]{0,300})\)/g;
  const inline = (t) => t
    .replace(/\*\*([^*]{1,200})\*\*/g, '<strong>$1</strong>')
    .replace(LINK, (m, txt, url) => `<a href="${url}"${/^https:/.test(url) ? ' target="_blank" rel="noopener"' : ''}>${txt}</a>`);
  CRX.guideHtml = function (body) {
    const lines = String(body || '').replace(/\r/g, '').split('\n');
    let html = ''; let list = null; let para = [];
    const flushP = () => { if (para.length) { html += `<p>${para.map((l) => inline(CRX.esc(l))).join('<br>')}</p>`; para = []; } };
    const flushL = () => { if (list) { html += `<${list.t}>${list.items.map((i) => `<li>${inline(CRX.esc(i))}</li>`).join('')}</${list.t}>`; list = null; } };
    const toList = (t, item) => { flushP(); if (!list || list.t !== t) { flushL(); list = { t, items: [] }; } list.items.push(item); };
    for (const raw of lines) {
      const l = raw.trim(); let m;
      if (!l) { flushP(); flushL(); continue; }
      if ((m = /^#{2,3}\s+(.+)$/.exec(l))) { flushP(); flushL(); html += `<h2>${inline(CRX.esc(m[1]))}</h2>`; continue; }
      if ((m = /^[-*•]\s+(.+)$/.exec(l))) { toList('ul', m[1]); continue; }
      if ((m = /^\d{1,2}[.)]\s+(.+)$/.exec(l))) { toList('ol', m[1]); continue; }
      if ((m = /^>\s?(.+)$/.exec(l))) { flushP(); flushL(); html += `<p class="g-note">${inline(CRX.esc(m[1]))}</p>`; continue; }
      flushL(); para.push(l);
    }
    flushP(); flushL();
    return html;
  };
  /* Fotos del tamaño justo: con Cloudinary se pide el ancho exacto (y el formato más ligero que acepte
     el navegador); con fotos guardadas en MongoDB se usa la miniatura de 640 px cuando basta. */
  const CLD = /^(https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/)(.+)$/;
  const img = (ph, w) => {
    if (!ph) return ''; const path = String(ph.path || ''); const m = CLD.exec(path);
    if (m) return `${m[1]}f_auto,q_auto,c_limit,w_${w || 1600}/${m[2]}`;
    if (w && w <= 900 && ph.thumb) return CRX.api.photoUrl(ph.thumb);
    return ph.url || CRX.api.photoUrl(path);
  };
  const srcset = (ph) => {
    const m = CLD.exec(String((ph && ph.path) || ''));
    if (m) return [480, 800, 1200, 1600].map((w) => `${m[1]}f_auto,q_auto,c_limit,w_${w}/${m[2]} ${w}w`).join(', ');
    if (ph && ph.thumb) return `${CRX.api.photoUrl(ph.thumb)} 640w, ${ph.url || CRX.api.photoUrl(ph.path)} 1600w`;
    return '';
  };
  CRX.img = img; CRX.srcset = srcset;
})();
