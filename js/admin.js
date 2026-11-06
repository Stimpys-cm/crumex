/* CruMex · panel de administración */
(function () {
  const CRX = window.CRX; const { $, $$, esc, num, money } = CRX; const api = CRX.api;
  let user = null; let cache = {};

  const ROLE_ADMIN = () => user && user.role === 'admin';
  const yesno = (v) => (v ? 'Sí' : 'No');
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const DAY = 864e5;
  function ago(iso) {
    if (!iso) return '';
    const m = Math.round((Date.now() - new Date(iso)) / 6e4);
    if (m < 1) return 'ahora'; if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24); return d === 1 ? 'ayer' : `hace ${d} días`;
  }
  const waUrl = (phone, text) => 'https://wa.me/' + CRX.phone.digits(phone) + (text ? '?text=' + encodeURIComponent(text) : '');
  const fph = (x) => CRX.phone.format(x); // teléfonos con lada: +52 899 123 4567
  const pref = { get: (k, d) => { try { return localStorage.getItem('crx-adm-' + k) || d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('crx-adm-' + k, v); } catch (e) { /* sin almacenamiento */ } } };

  /* ===================== definiciones ===================== */
  const OPT = (o) => Object.entries(o).map(([value, label]) => ({ value, label }));
  const LISTS = {
    properties: { label: (r) => `${r.ref_code} · ${r.title}` },
    contacts: { label: (r) => r.full_name },
    profiles: { label: (r) => r.full_name || r.id },
    leads: { label: (r) => `${r.full_name} (${fph(r.phone)})` },
    zones: { label: (r) => r.name }
  };
  const VISIT_STATUS = { pendiente: 'Pendiente', confirmada: 'Confirmada', realizada: 'Realizada', cancelada: 'Cancelada', no_asistio: 'No asistió' };

  const RES = {
    leads: {
      title: 'Prospectos', order: 'created_at', singular: 'prospecto', pk: 'id',
      cols: [['Fecha', (r) => CRX.fmtDate(r.created_at)], ['Tipo', (r) => CRX.LEAD_KINDS[r.kind] || r.kind], ['Nombre', (r) => r.full_name], ['Teléfono', (r) => fph(r.phone)], ['Llegó desde', (r) => r.channel || (r.source === 'panel' ? 'Panel' : '—')],
        ['Estado', (r) => `<span class="badge ${r.status === 'nuevo' ? 'warn' : r.status === 'ganado' ? 'ok' : ''}">${esc(CRX.LEAD_STATUS[r.status] || r.status)}</span>`, true]],
      filters: [['status', 'Estado', CRX.LEAD_STATUS], ['kind', 'Tipo', CRX.LEAD_KINDS]],
      fields: [
        { k: 'full_name', label: 'Nombre', req: 1 }, { k: 'phone', label: 'Teléfono', type: 'tel', req: 1 }, { k: 'email', label: 'Correo', type: 'email' },
        { k: 'kind', label: 'Tipo', type: 'select', opts: OPT(CRX.LEAD_KINDS), def: 'llamada' },
        { k: 'status', label: 'Estado', type: 'select', opts: OPT(CRX.LEAD_STATUS), def: 'nuevo' },
        { k: 'property_id', label: 'Propiedad', type: 'ref', ref: 'properties' },
        { k: 'assigned_to', label: 'Asignado a', type: 'ref', ref: 'profiles' },
        { k: 'follow_up_at', label: 'Recordarme dar seguimiento', type: 'datetime' },
        { k: 'follow_up_note', label: 'Qué hacer en el seguimiento', ph: 'Ej. mandarle opciones con patio' },
        { k: 'message', label: 'Mensaje', type: 'textarea', full: 1 },
        { k: 'payload', label: 'Datos del formulario', type: 'json-ro', full: 1 },
        { k: 'notes', label: 'Notas internas', type: 'textarea', full: 1 },
        { k: 'privacy_accepted_at', label: 'Se entregó/aceptó el aviso de privacidad', type: 'boolts', full: 1, req: 1, onlyNew: true }
      ]
    },
    contacts: {
      title: 'Contactos', order: 'created_at', singular: 'contacto',
      cols: [['Nombre', (r) => r.full_name], ['Teléfono', (r) => fph(r.phone)], ['Correo', (r) => r.email || ''], ['Tipo', (r) => (r.kinds || []).join(', ')]],
      fields: [{ k: 'full_name', label: 'Nombre', req: 1 }, { k: 'phone', label: 'Teléfono', type: 'tel' }, { k: 'email', label: 'Correo', type: 'email' },
        { k: 'kinds', label: 'Es...', type: 'multi', opts: OPT({ propietario: 'Propietario', comprador: 'Comprador', inquilino: 'Inquilino', otro: 'Otro' }) },
        { k: 'notes', label: 'Notas', type: 'textarea', full: 1 }],
      before: (r) => { if (!r.phone && !r.email) throw new Error('Captura al menos un teléfono o un correo.'); return r; }
    },
    visits: {
      title: 'Visitas', order: 'scheduled_at', singular: 'visita', fem: true,
      cols: [['Fecha', (r) => CRX.fmtDate(r.scheduled_at)], ['Propiedad', (r, c) => refLabel(c, 'properties', r.property_id)], ['Estado', (r) => VISIT_STATUS[r.status] || r.status]],
      fields: [{ k: 'property_id', label: 'Propiedad', type: 'ref', ref: 'properties', req: 1 }, { k: 'scheduled_at', label: 'Fecha y hora', type: 'datetime', req: 1 },
        { k: 'status', label: 'Estado', type: 'select', opts: OPT(VISIT_STATUS), def: 'pendiente' },
        { k: 'lead_id', label: 'Prospecto', type: 'ref', ref: 'leads' }, { k: 'advisor_id', label: 'Asesor', type: 'ref', ref: 'profiles' },
        { k: 'notes', label: 'Notas', type: 'textarea', full: 1 }]
    },
    deals: {
      title: 'Operaciones', order: 'created_at', singular: 'operación', fem: true,
      cols: [['Propiedad', (r, c) => refLabel(c, 'properties', r.property_id)], ['Operación', (r) => CRX.OPS[r.operation]], ['Estado', (r) => r.status], ['Precio', (r) => money(r.agreed_price, r.currency)], ['Comisión', (r) => r.commission_amount != null ? money(r.commission_amount, r.currency) : '']],
      fields: [{ k: 'property_id', label: 'Propiedad', type: 'ref', ref: 'properties', req: 1 }, { k: 'operation', label: 'Operación', type: 'select', opts: OPT(CRX.OPS), req: 1, def: 'venta' },
        { k: 'status', label: 'Estado', type: 'select', opts: OPT({ en_proceso: 'En proceso', cerrada: 'Cerrada', cancelada: 'Cancelada' }), def: 'en_proceso' },
        { k: 'client_contact_id', label: 'Cliente (comprador/inquilino)', type: 'ref', ref: 'contacts' }, { k: 'advisor_id', label: 'Asesor', type: 'ref', ref: 'profiles' },
        { k: 'agreed_price', label: 'Precio pactado', type: 'number' }, { k: 'currency', label: 'Moneda', type: 'select', opts: OPT({ MXN: 'MXN', USD: 'USD' }), def: 'MXN' },
        { k: 'commission_amount', label: 'Comisión', type: 'number' }, { k: 'signed_on', label: 'Fecha de firma', type: 'date' },
        { k: 'notes', label: 'Notas', type: 'textarea', full: 1 }],
      hint: 'Al marcar una operación como "Cerrada", la propiedad pasa a "Cerrada" automáticamente.'
    },
    zones: {
      title: 'Zonas', order: 'name', asc: true, singular: 'zona', fem: true,
      cols: [['Nombre', (r) => r.name], ['Ciudad', (r) => r.city || ''], ['En el mapa', (r) => yesno(r.lat != null && r.lng != null)], ['Página', (r) => `<a href="zona.html?z=${esc(CRX.slugify(r.name))}" target="_blank" rel="noopener">Ver ↗</a>`, true]],
      fields: [{ k: 'name', label: 'Colonia o zona', req: 1 }, { k: 'city', label: 'Ciudad', def: 'Reynosa' }, { k: 'state', label: 'Estado', def: 'Tamaulipas' },
        { k: 'description', label: 'Descripción para la página de la zona (qué hay cerca, tipo de propiedades)', type: 'textarea', full: 1 },
        { k: 'highlights', label: 'Qué hay en la zona (uno por renglón: escuelas, súper, hospitales, parques)', type: 'textarea', full: 1 },
        { k: 'commute', label: 'Tiempos aproximados (uno por renglón, ej. "Puente Pharr | 25 min")', type: 'textarea', full: 1 },
        { k: 'lat', label: 'Latitud', type: 'number' }, { k: 'lng', label: 'Longitud', type: 'number' }],
      hint: 'Toca el mapa para marcar el centro aproximado de la zona. En el sitio se dibuja un círculo, nunca la dirección exacta de una propiedad.'
    },
    articles: {
      title: 'Blog', order: 'created_at', singular: 'artículo',
      cols: [['Título', (r) => r.title], ['Publicado', (r) => yesno(r.published)], ['Fecha', (r) => CRX.fmtDate(r.published_at)]],
      fields: [{ k: 'title', label: 'Título', req: 1, full: 1 }, { k: 'summary', label: 'Resumen', full: 1 }, { k: 'body', label: 'Contenido', type: 'textarea', rows: 12, req: 1, full: 1, hint: 'Separa párrafos con una línea en blanco. Formato: "## " para subtítulos, "- " para viñetas, "1. " para pasos, **negritas**, "> " para una nota y [texto](https://…) o [texto](catalogo.html?tipo=nave) para enlaces.' },
        { k: 'published', label: 'Publicado en el sitio', type: 'bool' }],
      // la dirección (guias.html?a=…) sale del título y no cambia al editar, para no romper enlaces ya compartidos
      before: (r, isNew) => { if (isNew) r.slug = CRX.slugify(r.title) || 'guia'; if (r.published && !r.published_at) r.published_at = new Date().toISOString(); return r; }
    },
    wanted: {
      title: 'Lo que buscan', order: 'created_at', singular: 'búsqueda', fem: true,
      cols: [['Buscan', (r) => `${r.operation === 'renta' ? 'Rentar' : 'Comprar'} · ${CRX.TYPES[r.type] || r.type}`], ['Zona', (r) => r.zone || 'Cualquiera'], ['Hasta', (r) => (r.max_price ? '$' + Number(r.max_price).toLocaleString('es-MX') + ' ' + (r.currency || '') : '—')], ['En el sitio', (r) => yesno(r.active)]],
      fields: [{ k: 'operation', label: 'Buscan', type: 'select', opts: OPT({ renta: 'Rentar', venta: 'Comprar' }), def: 'renta', req: 1 }, { k: 'type', label: 'Tipo', type: 'select', opts: OPT(CRX.TYPES), def: 'casa', req: 1 },
        { k: 'zone', label: 'Zona (vacío = cualquiera)' }, { k: 'max_price', label: 'Presupuesto máximo', type: 'number' }, { k: 'currency', label: 'Moneda', type: 'select', opts: OPT({ MXN: 'MXN', USD: 'USD' }), def: 'MXN' },
        { k: 'bedrooms_min', label: 'Recámaras mínimas', type: 'number' }, { k: 'm2_min', label: 'm² mínimos', type: 'number' },
        { k: 'note', label: 'Nota pública (sin nombres ni teléfonos)', full: 1, ph: 'Ej. Familia con mascota, contrato de un año' }, { k: 'internal', label: 'Nota interna (solo el equipo)', type: 'textarea', full: 1 },
        { k: 'active', label: 'Mostrar en la página de propietarios', type: 'bool', defTrue: 1, full: 1 }],
      hint: 'Anota aquí lo que te piden tus clientes y no tienes en el catálogo. Se muestra en la página para propietarios ("Lo que buscan nuestros clientes") para que quien tenga algo así te lo deje. No pongas datos personales en la nota pública.'
    },
    testimonials: {
      title: 'Testimonios', order: 'created_at', singular: 'testimonio',
      cols: [['Autor', (r) => r.author_name], ['Texto', (r) => esc(String(r.body).slice(0, 70)) + '…', true], ['Publicado', (r) => yesno(r.approved)]],
      fields: [{ k: 'author_name', label: 'Nombre del cliente', req: 1 }, { k: 'body', label: 'Testimonio (textual)', type: 'textarea', req: 1, full: 1 },
        { k: 'consent_at', label: 'El cliente dio permiso por escrito de publicarlo', type: 'boolts', full: 1 },
        { k: 'approved', label: 'Mostrar en el sitio', type: 'bool' }],
      hint: 'Solo agrega opiniones reales de clientes que aceptaron que se publiquen. La base impide publicar sin registrar el permiso.'
    },
    profiles: {
      title: 'Equipo', order: 'full_name', asc: true, singular: 'integrante', adminNew: true,
      cols: [['Nombre', (r) => r.full_name || '(sin nombre)'], ['Correo', (r) => r.email || ''], ['Puesto', (r) => r.job_title || ''], ['Rol', (r) => (r.role === 'admin' ? 'Administrador' : 'Asesor')], ['Activo', (r) => yesno(r.active)], ['En el sitio', (r) => yesno(r.show_on_site)]],
      fields: [{ k: 'full_name', label: 'Nombre', req: 1 }, { k: 'email', label: 'Correo (con este entra al panel)', type: 'email', req: 1, adminOnly: 1 },
        { k: 'role', label: 'Rol', type: 'select', opts: OPT({ agent: 'Asesor (crea y edita)', admin: 'Administrador (todo)' }), def: 'agent', adminOnly: 1 },
        { k: 'active', label: 'Cuenta activa (puede entrar al panel)', type: 'bool', adminOnly: 1, defTrue: 1 },
        { k: 'password', label: 'Contraseña temporal (mínimo 8). En edición, déjala vacía para no cambiarla', type: 'password', adminOnly: 1, full: 1 },
        { k: 'job_title', label: 'Puesto' }, { k: 'phone', label: 'Teléfono', type: 'tel' }, { k: 'show_on_site', label: 'Mostrar en el sitio ("Quién te atiende" en la portada, en cada propiedad y en "Nosotros")', type: 'bool', full: 1 }],
      before: (r, isNew) => { if (api.mode === 'local') delete r.password; else if (isNew && !r.password) throw new Error('Pon una contraseña temporal de al menos 8 caracteres.'); return r; },
      hint: 'Da de alta a tu equipo aquí. Cada persona entra con su correo y la contraseña temporal que le pongas, y la cambia en Mi cuenta. Un asesor puede crear y editar, pero no borrar ni cambiar ajustes. Si desactivas una cuenta, esa persona sale del panel de inmediato.'
    }
  };

  const SETTINGS = [
    ['Contacto', [['whatsapp', 'WhatsApp', 'tel'], ['phone', 'Teléfono', 'tel'], ['email', 'Correo'], ['address', 'Dirección de la oficina'], ['hours', 'Horario']]],
    ['Empresa y registro', [['license', 'Número de registro estatal de agente inmobiliario (Tamaulipas)'], ['razon_social', 'Razón social o nombre del titular'], ['rfc', 'RFC'],
      ['profeco_contrato', 'Registro del contrato de adhesión ante PROFECO (si vendes casas; NOM-247)'], ['about', 'Texto de "Nosotros"', 'textarea']]],
    ['Reseñas de Google', [['google_maps_url', 'Enlace a tu perfil en Google Maps'], ['google_review_url', 'Enlace para dejar reseña (en tu perfil de Google: "Pedir reseñas")'],
      ['google_rating', 'Calificación que tienes en Google (ej. 4.8)'], ['google_reviews', 'Número de reseñas en Google']]],
    ['Gastos de compra (aparecen en la ficha de las casas en venta)', [['gastos', 'Un concepto por renglón: Concepto | porcentaje del precio. Ej. "Impuesto sobre adquisición de inmuebles | 2". Déjalo vacío para no mostrarlo.', 'textarea']]],
    ['Catálogo para anuncios de Facebook e Instagram', [['cp', 'Código postal que se pone en el catálogo (5 dígitos)']]],
    ['Redes', [['facebook', 'Facebook (URL completa)'], ['instagram', 'Instagram (URL completa)']]],
    ['Prospectos', [['lead_assign', 'Reparto de los prospectos que llegan del sitio', 'select', [['asesor', 'Al asesor de la propiedad (si tiene uno asignado)'], ['turnos', 'Al asesor de la propiedad; si no tiene, por turnos entre los asesores'], ['no', 'No asignar: los reparto yo']]], ['auto_reply', 'Respuesta automática por correo a quien deja sus datos', 'select', [['si', 'Sí, mandarle un correo de "recibimos tu solicitud"'], ['no', 'No mandar']]], ['referral_reward', 'Recompensa por recomendar a un propietario (se muestra en la página de propietarios). Ej. "Si se cierra la operación, te damos el 10% de nuestra comisión."', 'textarea']]],
    ['Sitio web', [['ticker', 'Avisos de la barra superior (uno por línea; se muestran uno a la vez; vacío = avisos base)', 'textarea']]],
    ['Legal (déjalo vacío para usar el texto base)', [['privacy', 'Aviso de privacidad', 'textarea'], ['terms', 'Términos de uso', 'textarea']]]
  ];

  const ATTRS = {
    departamento: [['nivel', 'Nivel / piso']],
    terreno: [['frente_m', 'Frente (m)', 'number'], ['fondo_m', 'Fondo (m)', 'number'], ['uso_suelo', 'Uso de suelo'], ['servicios', 'Servicios']],
    nave: [['altura_libre_m', 'Altura libre (m)', 'number'], ['andenes', 'Andenes', 'number'], ['kva', 'Capacidad eléctrica (kVA)', 'number'], ['parque_industrial', 'Parque industrial']]
  };

  /* Calificación de la ficha: qué tan lista está para publicarse */
  function quality(p, photosN) {
    const n = photosN != null ? photosN : (p.photos || []).length;
    const checks = [
      [n >= 5, 30, n >= 5 ? '5 fotos o más' : `Fotos: ${n} de 5 recomendadas`],
      [String(p.description || '').trim().length >= 120, 20, 'Descripción de al menos 120 caracteres'],
      [!!p.zone_id, 15, 'Zona asignada'],
      [!!p.public_location, 10, 'Ubicación visible en el sitio'],
      [!!(p.price_on_request || Number(p.price) > 0), 10, 'Precio o "a consultar"'],
      [!!(Number(p.construction_m2) || Number(p.land_m2)), 15, 'Superficie en m²']
    ];
    const score = checks.reduce((s, [ok, w]) => s + (ok ? w : 0), 0);
    return { score, missing: checks.filter(([ok]) => !ok).map(([, , t]) => t) };
  }
  const qBar = (q) => `<span class="qbar ${q.score >= 80 ? 'good' : q.score >= 50 ? 'mid' : 'low'}" title="${esc(q.missing.length ? 'Falta: ' + q.missing.join(', ') : 'Ficha completa')}"><i style="width:${q.score}%"></i></span><small>${q.score}%</small>`;

  /* ===================== utilidades ===================== */
  function refLabel(c, table, id) { if (!id) return ''; const r = (c[table] || []).find((x) => String(x.id) === String(id)); return r ? LISTS[table].label(r) : '—'; }
  async function loadRefs(tables) {
    const out = {};
    await Promise.all(tables.map(async (t) => { try { out[t] = t === 'properties' ? await api.properties.list() : await api.list(t, { order: t === 'zones' ? 'name' : 'created_at', asc: t === 'zones' }); } catch (e) { out[t] = []; } }));
    Object.assign(cache, out);
    return out;
  }
  const guard = async (fn, okMsg) => { try { const r = await fn(); if (okMsg) CRX.toast(okMsg, 'ok'); return { ok: true, r }; } catch (e) { CRX.toast(api.errMsg(e), 'err'); return { ok: false }; } };

  /* ----- diálogo de edición con aviso de cambios sin guardar ----- */
  const dlg = () => $('#dlg');
  let dirty = false;
  function openDlg(title, html, wide) {
    $('#dlg-title').textContent = title; $('#dlg-body').innerHTML = html; dirty = false;
    dlg().classList.toggle('wide', !!wide);
    const f = $('#dlg-body form'); if (f) { f.addEventListener('input', () => { dirty = true; }); f.addEventListener('change', () => { dirty = true; }); }
    if (!dlg().open) dlg().showModal();
  }
  function closeDlg() { dirty = false; if (dlg().open) dlg().close(); }
  async function tryClose() {
    if (dirty && !(await CRX.ask('Tienes cambios sin guardar. ¿Salir sin guardar?', { ok: 'Salir sin guardar', danger: true }))) return;
    closeDlg();
  }

  /* ----- generador de campos ----- */
  function fieldHtml(f, v, refs, isNew) {
    const id = 'f-' + f.k; const cls = f.full ? ' full' : '';
    const req = f.req ? ' required' : '';
    if (f.onlyNew && !isNew) return '';
    switch (f.type) {
      case 'textarea': return `<div class="field${cls}"><label for="${id}">${esc(f.label)}</label><textarea id="${id}" name="${f.k}" rows="${f.rows || 4}"${req}>${esc(v)}</textarea>${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
      case 'select': return `<div class="field${cls}"><label for="${id}">${esc(f.label)}</label><select id="${id}" name="${f.k}">${f.opts.map((o) => `<option value="${esc(o.value)}"${String(v ?? f.def ?? '') === String(o.value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>`;
      case 'ref': { const list = (refs[f.ref] || []); return `<div class="field${cls}"><label for="${id}">${esc(f.label)}</label><select id="${id}" name="${f.k}"${req}><option value="">—</option>${list.map((r) => `<option value="${esc(r.id)}"${String(v ?? '') === String(r.id) ? ' selected' : ''}>${esc(LISTS[f.ref].label(r))}</option>`).join('')}</select></div>`; }
      case 'bool': return `<label class="sw${cls}"><input type="checkbox" name="${f.k}"${v || (isNew && f.defTrue) ? ' checked' : ''}> ${esc(f.label)}</label>`;
      case 'password': return `<div class="field${cls}"><label for="${id}">${esc(f.label)}</label><input id="${id}" name="${f.k}" type="password" autocomplete="new-password" minlength="8"></div>`;
      case 'boolts': return `<label class="sw${cls}"><input type="checkbox" name="${f.k}"${v ? ' checked' : ''}${f.req && isNew ? ' required' : ''}> ${esc(f.label)}</label>`;
      case 'multi': return `<div class="field${cls}"><label>${esc(f.label)}</label><div class="chk-row">${f.opts.map((o) => `<label class="sw" style="margin:0"><input type="checkbox" name="${f.k}" value="${esc(o.value)}"${(v || []).includes(o.value) ? ' checked' : ''}> ${esc(o.label)}</label>`).join('')}</div></div>`;
      case 'json-ro': return Object.keys(v || {}).length ? `<div class="field${cls}"><label>${esc(f.label)}</label><div class="ro">${esc(Object.entries(v).filter(([, x]) => x != null && x !== '').map(([k, x]) => `${k}: ${x}`).join('\n'))}</div></div>` : '';
      case 'datetime': return `<div class="field${cls}"><label for="${id}">${esc(f.label)}</label><input id="${id}" name="${f.k}" type="datetime-local" value="${esc(toLocalInput(v))}"${req}></div>`;
      case 'date': return `<div class="field${cls}"><label for="${id}">${esc(f.label)}</label><input id="${id}" name="${f.k}" type="date" value="${esc(v || '')}"${req}></div>`;
      case 'number': return `<div class="field${cls}"><label for="${id}">${esc(f.label)}</label><input id="${id}" name="${f.k}" inputmode="decimal" value="${esc(v ?? '')}"${req}></div>`;
      default: return `<div class="field${cls}"><label for="${id}">${esc(f.label)}</label><input id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${esc(v ?? f.def ?? '')}"${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}${req}></div>`;
    }
  }
  function readFields(fields, form, isNew) {
    const out = {};
    for (const f of fields) {
      if (f.type === 'json-ro' || (f.onlyNew && !isNew)) continue;
      const el = form.elements[f.k]; if (!el) continue;
      if (f.type === 'bool') out[f.k] = el.checked;
      else if (f.type === 'boolts') out[f.k] = el.checked ? (f._prev || new Date().toISOString()) : null;
      else if (f.type === 'multi') out[f.k] = $$(`input[name="${f.k}"]:checked`, form).map((x) => x.value);
      else if (f.type === 'number') out[f.k] = num(el.value);
      else if (f.type === 'datetime') out[f.k] = el.value ? new Date(el.value).toISOString() : null;
      else out[f.k] = el.value.trim() === '' ? null : el.value.trim();
    }
    return out;
  }

  /* ===================== navegación ===================== */
  const ICO = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const VIEWS = [
    ['resumen', 'Resumen', ICO('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'), 'General'],
    ['propiedades', 'Propiedades', ICO('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'), 'Inventario'],
    ['stats', 'Estadísticas', ICO('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>'), 'Inventario'],
    ['estudio', 'Estudio para redes', ICO('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>'), 'Inventario'],
    ['leads', 'Prospectos', ICO('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>'), 'Clientes'],
    ['captacion', 'Captación', ICO('<path d="M3 11l9-7 9 7"/><path d="M9 21v-6h6v6"/><path d="M19 3v4M17 5h4"/>'), 'Clientes'],
    ['wanted', 'Lo que buscan', ICO('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6M11 8v6"/>'), 'Clientes'],
    ['visits', 'Visitas', ICO('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'), 'Clientes'],
    ['deals', 'Operaciones', ICO('<path d="M4 12l5 5L20 6"/>'), 'Clientes'],
    ['comisiones', 'Comisiones', ICO('<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.5 0-2.6-.6-3.1-1.6M12 6v2M12 16v2"/>'), 'Clientes'],
    ['contacts', 'Contactos', ICO('<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17c.7-2 2.2-3 4-3s3.3 1 4 3"/>'), 'Clientes'],
    ['zones', 'Zonas', ICO('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'), 'Sitio web'],
    ['articles', 'Blog', ICO('<path d="M5 4h14v16H5z"/><path d="M9 8h6M9 12h6M9 16h4"/>'), 'Sitio web'],
    ['testimonials', 'Testimonios', ICO('<path d="M4 5h16v11H9l-5 4z"/>'), 'Sitio web'],
    ['profiles', 'Equipo', ICO('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6"/>'), 'Configuración'],
    ['ajustes', 'Ajustes', ICO('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'), 'Configuración'],
    ['herramientas', 'Herramientas', ICO('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'), 'Configuración', true],
    ['actividad', 'Actividad', ICO('<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>'), 'Configuración', true],
    ['cuenta', 'Mi cuenta', ICO('<circle cx="12" cy="8" r="4"/><path d="M5 21c.9-3.8 3.6-6 7-6s6.1 2.2 7 6"/><path d="M16.5 3.5l1.5 1.5 3-3"/>'), 'Configuración']
  ];
  let newLeads = 0, newOwners = 0;

  function navRender(cur) {
    let g0 = '';
    $('#side-nav').innerHTML = VIEWS.filter((v) => !v[4] || ROLE_ADMIN()).map(([k, l, ic, g]) => {
      const head = g !== g0 ? `<small class="nav-g">${esc(g)}</small>` : ''; g0 = g;
      return head + `<a href="#/${k}" title="${esc(l)}"${k === cur ? ' aria-current="page"' : ''}>${ic}<span class="nl">${esc(l)}</span>${k === 'leads' && newLeads ? `<span class="n">${newLeads}</span>` : ''}${k === 'captacion' && newOwners ? `<span class="n">${newOwners}</span>` : ''}</a>`;
    }).join('');
  }
  async function route() {
    const cur = (location.hash.replace('#/', '').split('?')[0] || 'resumen');
    const key = VIEWS.some(([k]) => k === cur) ? cur : 'resumen';
    $('#side').classList.remove('open'); $('#side-scrim').hidden = true;
    $('#view-title').textContent = (VIEWS.find(([k]) => k === key) || [])[1];
    $('#view-actions').innerHTML = '';
    navRender(key);
    $('#view').innerHTML = '<div class="panel"><div class="skel" style="height:18px;width:30%;margin-bottom:12px"></div><div class="skel" style="height:120px"></div></div>';
    try {
      if (key === 'resumen') await viewDashboard();
      else if (key === 'propiedades') await viewProperties();
      else if (key === 'leads') await viewLeads();
      else if (key === 'visits') await viewVisits();
      else if (key === 'ajustes') await viewSettings();
      else if (key === 'estudio') await viewStudio();
      else if (key === 'stats') await viewStats();
      else if (key === 'comisiones') await viewCommissions();
      else if (key === 'cuenta') await viewAccount();
      else if (key === 'actividad') await viewActivity();
      else if (key === 'captacion') await viewCaptacion();
      else if (key === 'herramientas') await viewTools();
      else await viewResource(key);
    } catch (e) { $('#view').innerHTML = `<div class="panel"><p class="form-msg err">${esc(api.errMsg(e))}</p></div>`; }
  }

  /* ===================== Resumen ===================== */
  async function viewDashboard() {
    const refs = await loadRefs(['properties', 'leads', 'visits', 'deals']);
    const props = refs.properties, leads = refs.leads, visits = refs.visits, deals = refs.deals;
    const by = (s) => props.filter((p) => p.status === s).length;
    newLeads = leads.filter((l) => l.status === 'nuevo' && !OWNER_KINDS.includes(l.kind)).length; newOwners = leads.filter((l) => l.status === 'nuevo' && OWNER_KINDS.includes(l.kind)).length; navRender('resumen');
    const now = Date.now();
    const upcoming = visits.filter((v) => ['pendiente', 'confirmada'].includes(v.status) && new Date(v.scheduled_at) >= new Date(new Date().toDateString()) && new Date(v.scheduled_at) - now < 7 * DAY).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const closedMonth = deals.filter((d) => d.status === 'cerrada' && d.signed_on && new Date(d.signed_on + 'T12:00') >= monthStart);
    const commMXN = closedMonth.filter((d) => d.currency === 'MXN').reduce((s, d) => s + (Number(d.commission_amount) || 0), 0);

    // prospectos por semana (8 semanas)
    const weeks = []; const w0 = new Date(); w0.setHours(0, 0, 0, 0); w0.setDate(w0.getDate() - ((w0.getDay() + 6) % 7));
    for (let i = 7; i >= 0; i--) { const s = new Date(w0 - i * 7 * DAY); weeks.push({ s, n: 0 }); }
    leads.forEach((l) => { const t = new Date(l.created_at); for (let i = weeks.length - 1; i >= 0; i--) { if (t >= weeks[i].s) { weeks[i].n++; break; } } });
    const maxW = Math.max(1, ...weeks.map((w) => w.n));
    const kinds = Object.entries(leads.reduce((o, l) => { o[l.kind] = (o[l.kind] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
    const maxK = Math.max(1, ...kinds.map((k) => k[1]));

    // pendientes
    const todo = [];
    const stale = leads.filter((l) => l.status === 'nuevo' && now - new Date(l.created_at) > DAY);
    if (stale.length) todo.push(['err', `${stale.length} prospecto${stale.length > 1 ? 's' : ''} sin atender desde hace más de 24 h`, '#/leads']);
    const today = upcoming.filter((v) => new Date(v.scheduled_at).toDateString() === new Date().toDateString());
    const ownNew = leads.filter((l) => OWNER_KINDS.includes(l.kind) && l.status === 'nuevo').length;
    if (ROLE_ADMIN()) { const lb = await api.tools.lastBackup().catch(() => null); if (!lb || Date.now() - new Date(lb) > 7 * DAY) todo.push(['', lb ? `Tu último respaldo fue ${ago(lb)}: descarga uno nuevo` : 'Aún no descargas ningún respaldo de tus datos', '#/herramientas']); }
    if (ownNew) todo.unshift(['warn', `${ownNew} propietario${ownNew > 1 ? 's' : ''} por atender (quieren rentar o vender)`, '#/captacion']);
    if (today.length) todo.push(['warn', `${today.length} visita${today.length > 1 ? 's' : ''} hoy`, '#/visits']);
    const excl = props.filter((p) => p.exclusive && p.exclusive_until && ['disponible', 'apartada'].includes(p.status) && new Date(p.exclusive_until) - now < 30 * DAY);
    if (excl.length) todo.push(['warn', `${excl.length} exclusiva${excl.length > 1 ? 's' : ''} vence${excl.length > 1 ? 'n' : ''} en menos de 30 días`, '#/propiedades']);
    const weak = props.filter((p) => p.status === 'disponible' && quality(p).score < 60);
    if (weak.length) todo.push(['', `${weak.length} propiedad${weak.length > 1 ? 'es' : ''} publicada${weak.length > 1 ? 's' : ''} con ficha incompleta`, '#/propiedades?q=incompletas']);
    const drafts = by('borrador');
    if (drafts) todo.push(['', `${drafts} borrador${drafts > 1 ? 'es' : ''} sin publicar`, '#/propiedades']);
    const dueF = leads.filter((l) => l.follow_up_at && new Date(l.follow_up_at) <= new Date(new Date().setHours(23, 59, 59, 999)) && !['ganado', 'descartado'].includes(l.status));
    if (dueF.length) todo.unshift([dueF.some((l) => new Date(l.follow_up_at) < now) ? 'err' : 'warn', `${dueF.length} seguimiento${dueF.length > 1 ? 's' : ''} para hoy o atrasado${dueF.length > 1 ? 's' : ''}`, '#/leads']);
    let top = [];
    try { const st = await api.stats.summary(); top = st.filter((x) => Number(x.views_30d) > 0).sort((a, b) => b.views_30d - a.views_30d).slice(0, 5).map((x) => [props.find((pp) => pp.id === x.property_id), x]).filter(([pp]) => pp); } catch (e) { top = []; }

    $('#view').innerHTML = `<div class="kpis">
      <a class="kpi" href="#/propiedades"><span>Disponibles</span><b>${by('disponible')}</b><small>${by('apartada')} apartadas · ${drafts} borradores</small></a>
      <a class="kpi ${newLeads ? 'hot' : ''}" href="#/leads"><span>Prospectos nuevos</span><b>${newLeads}</b><small>${leads.length} en total</small></a>
      <a class="kpi" href="#/visits"><span>Visitas próximos 7 días</span><b>${upcoming.length}</b><small>${today.length} hoy</small></a>
      <a class="kpi" href="#/deals"><span>Cerradas este mes</span><b>${closedMonth.length}</b><small>${commMXN ? 'Comisiones ' + money(commMXN, 'MXN') : 'Sin comisiones registradas'}</small></a></div>
      <div class="dash">
        <div class="panel"><h2>Pendientes</h2>${todo.length ? `<ul class="todo">${todo.map(([c, t, h]) => `<li class="${c}"><a href="${h}">${esc(t)}<span aria-hidden="true">→</span></a></li>`).join('')}</ul>` : '<p class="muted">Todo al día. Buen trabajo.</p>'}
          <h2 style="margin-top:18px">Próximas visitas</h2>${upcoming.length ? `<ul class="agenda-mini">${upcoming.slice(0, 5).map((v) => `<li><b>${esc(new Date(v.scheduled_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }))}</b><span>${esc(new Date(v.scheduled_at).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }))} · ${esc(refLabel(refs, 'properties', v.property_id))}</span></li>`).join('')}</ul>` : '<p class="muted">No hay visitas agendadas.</p>'}
        </div>
        <div class="panel"><h2>Prospectos por semana</h2>
          <div class="chart" role="img" aria-label="Prospectos por semana, últimas 8 semanas">${weeks.map((w, i) => `<div class="col${i === weeks.length - 1 ? ' cur' : ''}"><span class="v">${w.n || ''}</span><i style="height:${Math.max(2, (w.n / maxW) * 100)}%"></i><small>${w.s.getDate()}/${w.s.getMonth() + 1}</small></div>`).join('')}</div>
          <h2 style="margin-top:18px">Por origen</h2>${kinds.length ? `<div class="hbars">${kinds.map(([k, n]) => `<div><span>${esc(CRX.LEAD_KINDS[k] || k)}</span><i style="width:${(n / maxK) * 100}%"></i><b>${n}</b></div>`).join('')}</div>` : '<p class="muted">Aún no hay prospectos.</p>'}
        </div>
      </div>
      ${top.length ? `<div class="panel"><div class="ph-row"><h2>Lo más visto · 30 días</h2><a class="more" href="#/stats">Ver estadísticas →</a></div><ol class="toplist">${top.map(([pp, x]) => `<li><span class="tl-t"><b>${esc(pp.title)}</b><small class="muted">${esc(pp.ref_code)} · ${esc(CRX.TYPES[pp.type])}</small></span><span class="num"><b>${Number(x.views_30d)}</b> vistas</span><span class="num muted">${Number(x.wa_30d)} WhatsApp</span></li>`).join('')}</ol></div>` : ''}
      <div class="panel"><h2>Inventario</h2><div class="tbl-wrap flat"><table><thead><tr><th>Tipo</th><th>Venta</th><th>Renta</th><th>Apartadas</th><th>Cerradas</th></tr></thead><tbody>${Object.entries(CRX.TYPES).map(([t, l]) => { const ps = props.filter((p) => p.type === t); return `<tr><td>${esc(l)}</td><td class="num">${ps.filter((p) => p.status === 'disponible' && p.operation === 'venta').length}</td><td class="num">${ps.filter((p) => p.status === 'disponible' && p.operation === 'renta').length}</td><td class="num">${ps.filter((p) => p.status === 'apartada').length}</td><td class="num">${ps.filter((p) => p.status === 'cerrada').length}</td></tr>`; }).join('')}</tbody></table></div></div>`;
    $('#view-actions').innerHTML = '<button class="btn btn-gold btn-sm" id="np">+ Nueva propiedad</button>';
    $('#np').onclick = () => editProperty(null);
  }

  /* ===================== Propiedades ===================== */
  async function viewProperties() {
    const rows = await api.properties.list(); cache.properties = rows;
    const stats = {}; try { (await api.stats.summary()).forEach((x) => { stats[x.property_id] = x; }); } catch (e) { /* estadísticas aún no activadas */ }
    const views = (p) => { const x = stats[p.id]; return x ? `<b class="num">${Number(x.views_30d)}</b><small class="muted"> · ${Number(x.wa_30d)} WA</small>` : '<span class="muted">—</span>'; };
    const viewMode = pref.get('pview', 'table');
    $('#view-actions').innerHTML = `<div class="seg" role="group" aria-label="Vista"><button type="button" data-pv="table" class="${viewMode === 'table' ? 'on' : ''}">Lista</button><button type="button" data-pv="grid" class="${viewMode === 'grid' ? 'on' : ''}">Fotos</button></div><button class="btn btn-gold btn-sm" id="np">+ Nueva propiedad</button>`;
    $('#np').onclick = () => editProperty(null);
    const onlyWeak = /q=incompletas/.test(location.hash);
    $('#view').innerHTML = `<div class="bar"><input type="search" id="q" class="grow" placeholder="Buscar por título o clave" aria-label="Buscar"><select id="fs" aria-label="Estado"><option value="">Todos los estados</option>${OPT(CRX.STATUS).map((o) => `<option value="${o.value}">${o.label}</option>`).join('')}</select><select id="fo" aria-label="Operación"><option value="">Venta y renta</option>${OPT(CRX.OPS).map((o) => `<option value="${o.value}">${o.label}</option>`).join('')}</select><label class="sw sm"><input type="checkbox" id="fw"${onlyWeak ? ' checked' : ''}> Solo fichas incompletas</label></div><p class="muted count" id="pcount"></p><div id="tb"></div>`;
    const statusSel = (p) => `<select class="st-sel st-${p.status}" data-st="${esc(p.id)}" aria-label="Estado de ${esc(p.ref_code)}">${OPT(CRX.STATUS).map((o) => `<option value="${o.value}"${o.value === p.status ? ' selected' : ''}>${o.label}</option>`).join('')}</select>`;
    const actions = (p) => `<button class="btn btn-line btn-sm" data-edit="${esc(p.id)}">Editar</button> <a class="btn btn-line btn-sm" href="#/estudio?p=${esc(p.id)}" title="Crear imagen para redes sociales">Imagen</a>${p.ref_code && p.status !== 'borrador' ? ` <a class="btn btn-line btn-sm" href="ficha.html?id=${Number(String(p.ref_code).replace(/\D/g, ''))}" target="_blank" rel="noopener" title="Ficha técnica para imprimir o guardar en PDF">Ficha</a> <a class="btn btn-line btn-sm" href="letrero.html?id=${Number(String(p.ref_code).replace(/\D/g, ''))}" target="_blank" rel="noopener" title="Letrero con código QR para colgar en la propiedad">Letrero</a> <a class="btn btn-line btn-sm" href="reporte.html?id=${encodeURIComponent(p.id)}" target="_blank" rel="opener" title="Reporte de vistas y contactos para el propietario">Reporte</a>` : ''} <button class="btn btn-line btn-sm" data-dup="${esc(p.id)}">Duplicar</button>${ROLE_ADMIN() ? ` <button class="btn btn-danger btn-sm" data-del="${esc(p.id)}">Borrar</button>` : ''}`;
    const draw = () => {
      const q = $('#q').value.toLowerCase(), s = $('#fs').value, o = $('#fo').value, w = $('#fw').checked;
      const l = rows.filter((p) => (!s || p.status === s) && (!o || p.operation === o) && (!w || quality(p).score < 80) && (!q || (p.title + ' ' + p.ref_code + ' ' + (p.zone || '')).toLowerCase().includes(q)));
      $('#pcount').textContent = `${l.length} de ${rows.length} propiedades`;
      if (!l.length) { $('#tb').innerHTML = `<div class="empty">${rows.length ? 'Sin resultados con estos filtros.' : 'No hay propiedades. Crea la primera con "+ Nueva propiedad".'}</div>`; return; }
      if (pref.get('pview', 'table') === 'grid') {
        $('#tb').innerHTML = `<div class="pgrid">${l.map((p) => `<article class="pcard"><button class="pimg" data-edit="${esc(p.id)}" aria-label="Editar ${esc(p.title)}">${p.photos[0] ? `<img src="${esc(CRX.img(p.photos[0], 640))}" alt="" loading="lazy">` : '<span>Sin fotos</span>'}<em>${p.photos.length} foto${p.photos.length === 1 ? '' : 's'}</em></button><div class="pb"><small class="muted">${esc(p.ref_code || '')} · ${esc(CRX.TYPES[p.type])} · ${esc(CRX.OPS[p.operation])}</small><b>${esc(p.title)}</b><span class="pr">${esc(money(p.price, p.currency, p.price_on_request))}</span><div class="qrow">${qBar(quality(p))}</div><div class="prow">${statusSel(p)}<span>${actions(p)}</span></div></div></article>`).join('')}</div>`;
      } else {
        $('#tb').innerHTML = `<div class="tbl-wrap"><table><thead><tr><th><span class="sr-only">Foto</span></th><th>Clave</th><th>Propiedad</th><th>Precio</th><th>Ficha</th><th title="Vistas y clics a WhatsApp en 30 días">Vistas 30 d</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${l.map((p) => `<tr>
          <td>${p.photos[0] ? `<img class="thumb" src="${esc(CRX.img(p.photos[0], 160))}" alt="" loading="lazy">` : '<div class="thumb"></div>'}</td><td>${esc(p.ref_code || '')}</td>
          <td><b>${esc(p.title)}</b>${p.demo ? ' <span class="badge">demo</span>' : ''}<br><span class="muted">${esc(CRX.TYPES[p.type])} · ${esc(CRX.OPS[p.operation])} · ${esc(p.zone || 'Sin zona')}</span></td>
          <td>${esc(money(p.price, p.currency, p.price_on_request))}</td><td class="qcell">${qBar(quality(p))}</td><td class="qcell">${views(p)}</td><td>${statusSel(p)}</td>
          <td class="act">${actions(p)}</td></tr>`).join('')}</tbody></table></div>`;
      }
    };
    ['q', 'fs', 'fo', 'fw'].forEach((i) => $('#' + i).addEventListener('input', draw)); draw();
    $$('[data-pv]').forEach((b) => b.addEventListener('click', () => { pref.set('pview', b.dataset.pv); $$('[data-pv]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    $('#tb').onchange = async (e) => {
      const sel = e.target.closest('[data-st]'); if (!sel) return;
      const p = rows.find((x) => x.id === sel.dataset.st); const prev = p.status;
      if (sel.value === 'disponible' && !p.photos.length && !(await CRX.ask('Esta propiedad no tiene fotos. ¿Publicarla así?', { ok: 'Publicar sin fotos' }))) { sel.value = prev; return; }
      const r = await guard(() => api.properties.setStatus(p.id, sel.value), 'Estado actualizado: ' + CRX.STATUS[sel.value]);
      if (r.ok) { p.status = sel.value; sel.className = 'st-sel st-' + p.status; } else sel.value = prev;
    };
    $('#tb').onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.edit) editProperty(rows.find((p) => p.id === b.dataset.edit));
      if (b.dataset.dup) { const p = Object.assign({}, rows.find((x) => x.id === b.dataset.dup)); editProperty(Object.assign(p, { id: null, ref_code: null, slug: null, status: 'borrador', title: p.title + ' (copia)', photos: [], published_at: null, created_at: null })); }
      if (b.dataset.del && await CRX.ask('¿Borrar esta propiedad y sus fotos? No se puede deshacer.', { ok: 'Borrar', danger: true })) { await guard(() => api.properties.remove(b.dataset.del), 'Propiedad borrada'); viewProperties(); }
    };
  }

  async function editProperty(p) {
    const isNew = !p || !p.id; p = p || {};
    const refs = await loadRefs(['zones', 'contacts', 'profiles']);
    const photos = (p.photos || []).map((x) => Object.assign({}, x));
    const attrs = Object.assign({}, p.attributes || {});
    const sel = (name, opts, val) => `<div class="field"><label for="p-${name}">${esc(opts.label)}</label><select id="p-${name}" name="${name}">${opts.list.map(([v, l]) => `<option value="${esc(v)}"${String(val) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    const inp = (name, label, val, extra) => `<div class="field"><label for="p-${name}">${esc(label)}</label><input id="p-${name}" name="${name}" value="${esc(val ?? '')}" ${extra || ''}></div>`;
    openDlg(isNew ? 'Nueva propiedad' : 'Editar ' + p.ref_code, `<form id="pf" novalidate>
      <div class="qhead"><div><b>Calidad de la ficha</b> <span id="q-score"></span><div class="qbar big" id="q-bar"><i></i></div></div><p class="muted" id="q-miss"></p>${!isNew && p.ref_code && ['disponible', 'apartada', 'cerrada'].includes(p.status) ? `<a class="btn btn-line btn-sm" href="inmueble.html?id=${Number(String(p.ref_code).replace(/\D/g, ''))}" target="_blank" rel="noopener">Ver en el sitio ↗</a>` : ''}</div>
      ${!isNew && p.updated_at ? `<p class="pf-upd">Última modificación ${esc(ago(p.updated_at))}${p.updated_by_name ? ' por <b>' + esc(p.updated_by_name) + '</b>' : ''}</p>` : ''}
      <div class="pf-layout"><div class="fgrid">
      <div class="fsec">Datos principales</div>
      ${sel('operation', { label: 'Operación', list: Object.entries(CRX.OPS) }, p.operation || 'venta')}
      ${sel('type', { label: 'Tipo', list: Object.entries(CRX.TYPES) }, p.type || 'casa')}
      ${sel('status', { label: 'Estado', list: Object.entries(CRX.STATUS) }, p.status || 'borrador')}
      <div class="field full"><label for="p-title">Título</label><input id="p-title" name="title" value="${esc(p.title || '')}" maxlength="120" required><span class="hint"><span id="t-len">0</span>/120 · Ejemplo: "Casa de 3 recámaras con patio en Zona Norte"</span></div>
      <div class="field full"><label for="p-description">Descripción</label><textarea id="p-description" name="description" rows="5" maxlength="4000">${esc(p.description || '')}</textarea><span class="hint"><span id="d-len">0</span> caracteres. Describe lo que sí tiene la propiedad; evita promesas que no puedas cumplir.</span></div>
      <div class="fsec">Precio</div>
      ${inp('price', 'Precio', p.price, 'inputmode="decimal"')}
      ${sel('currency', { label: 'Moneda', list: [['MXN', 'MXN'], ['USD', 'USD']] }, p.currency || 'MXN')}
      <label class="sw"><input type="checkbox" name="price_on_request"${p.price_on_request ? ' checked' : ''}> Precio a consultar</label>
      <label class="sw"><input type="checkbox" name="featured"${p.featured ? ' checked' : ''}> Destacada en la portada</label>
      <div class="fsec">Ubicación</div>
      ${sel('zone_id', { label: 'Zona / colonia', list: [['', '—']].concat((refs.zones || []).map((z) => [z.id, z.name])) }, p.zone_id ?? '')}
      ${inp('public_location', 'Ubicación visible en el sitio', p.public_location, 'placeholder="Ej. Zona Norte"')}
      <div class="field full"><label for="p-address_private">Dirección exacta (PRIVADA, no se publica)</label><input id="p-address_private" name="address_private" value="${esc(p.address_private || '')}"></div>
      <div class="fsec">Características</div>
      ${inp('bedrooms', 'Recámaras', p.bedrooms, 'inputmode="numeric"')}${inp('bathrooms', 'Baños', p.bathrooms, 'inputmode="decimal"')}${inp('parking', 'Estacionamientos', p.parking, 'inputmode="numeric"')}
      ${inp('construction_m2', 'Construcción (m²)', p.construction_m2, 'inputmode="decimal"')}${inp('land_m2', 'Terreno (m²)', p.land_m2, 'inputmode="decimal"')}${inp('age_years', 'Antigüedad (años, 0 = a estrenar)', p.age_years, 'inputmode="numeric"')}
      <div class="field" id="w-niveles"><label for="p-x_niveles">Niveles o plantas</label><input id="p-x_niveles" name="x_niveles" inputmode="numeric" value="${esc(attrs.niveles ?? '')}"></div>
      <div class="field" id="w-mant"><label for="p-x_mant">Mantenimiento al mes (MXN)</label><input id="p-x_mant" name="x_mant" inputmode="decimal" value="${esc(attrs.mantenimiento ?? '')}" placeholder="Si es privada con cuota"></div>
      <div class="fsec">Lo que tiene</div><div class="full chk-grid" id="amen-box" style="grid-column:1/-1"></div>
      <div class="fsec" id="cred-title">Créditos que acepta</div><div class="full chk-grid" id="cred-box" style="grid-column:1/-1">${CRX.FEAT.creditos.map(([k, l]) => `<label class="sw sm"><input type="checkbox" name="x_cred" value="${k}"${(attrs.creditos || []).includes(k) ? ' checked' : ''}> ${esc(l)}</label>`).join('')}<span class="hint" style="grid-column:1/-1">Los compradores filtran por esto en el catálogo, sobre todo Infonavit.</span></div>
      <div class="fsec" id="rent-title">Condiciones de renta</div><div class="fgrid full" id="rent-box" style="grid-column:1/-1">
        ${sel('x_amueblado', { label: 'Amueblada', list: [['', '—']].concat(CRX.FEAT.amueblado) }, attrs.amueblado ?? '')}
        ${sel('x_mascotas', { label: 'Acepta mascotas', list: [['', '—']].concat(CRX.FEAT.mascotas) }, attrs.mascotas ?? '')}
        ${inp('x_dep', 'Depósito (meses de renta)', attrs.deposito_meses, 'inputmode="decimal"')}
        ${inp('x_plazo', 'Contrato mínimo (meses)', attrs.plazo_min_meses, 'inputmode="numeric"')}
        <div class="field"><label for="p-x_desde">Disponible desde</label><input id="p-x_desde" name="x_desde" type="date" value="${esc(attrs.disponible_desde || '')}"></div>
        <div class="field full"><label for="p-x_req">Requisitos</label><textarea id="p-x_req" name="x_req" rows="2" maxlength="400" placeholder="Ej. Identificación, comprobante de ingresos y aval con propiedad en Reynosa o póliza jurídica">${esc(attrs.requisitos || '')}</textarea></div>
      </div>
      <div class="field full"><label for="p-x_cerca">Qué hay cerca (uno por renglón)</label><textarea id="p-x_cerca" name="x_cerca" rows="3" maxlength="800" placeholder="Ej. Escuela primaria a dos cuadras&#10;Súper a 5 minutos&#10;A 15 minutos del parque industrial">${esc(attrs.cerca || '')}</textarea><span class="hint">Lo que de verdad está cerca. Ayuda mucho a quien no conoce la zona.</span></div>
      <div class="fsec" id="attr-title">Datos específicos</div><div class="fgrid full" id="attrs" style="grid-column:1/-1"></div>
      <div class="fsec">Video y recorrido virtual (opcional)</div>
      <div class="field full"><label for="p-video_url">Video (YouTube, Vimeo, TikTok, Facebook o Instagram)</label><input id="p-video_url" name="video_url" type="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" value="${esc(attrs.video_url || '')}"><span class="hint">YouTube y Vimeo se reproducen dentro de la ficha; los demás se abren en su app.</span></div>
      <div class="field full"><label for="p-tour_url">Recorrido virtual 360° (Matterport u otro)</label><input id="p-tour_url" name="tour_url" type="url" inputmode="url" placeholder="https://my.matterport.com/show/?m=…" value="${esc(attrs.tour_url || '')}"></div>
      <div class="fsec" id="en-title">Versión en inglés (sección industrial)</div>
      <div class="fgrid full" id="en-box" style="grid-column:1/-1"><div class="field full"><label for="p-title_en">Title in English</label><input id="p-title_en" name="title_en" maxlength="120" value="${esc(attrs.title_en || '')}" placeholder="Ej. Industrial building with 3 docks in Reynosa"></div>
        <div class="field full"><label for="p-description_en">Description in English</label><textarea id="p-description_en" name="description_en" rows="4" maxlength="4000">${esc(attrs.description_en || '')}</textarea><span class="hint">Aparece en industrial.html. Si lo dejas vacío, se muestra el texto en español con un aviso.</span></div></div>
      <div class="fsec">Fotografías</div>
      <div style="grid-column:1/-1"><label class="drop" id="drop"><input type="file" id="pf-files" accept="image/*" multiple><b>Arrastra fotos aquí o haz clic para elegirlas</b><span>Se comprimen solas. La primera es la portada; arrástralas para cambiar el orden.</span></label><div class="photos" id="ph-list"></div></div>
      <div class="fsec">Documentos privados (no se publican)</div>
      <div class="full" id="docs-box" style="grid-column:1/-1"></div>
      <div class="fsec">Uso interno (no se publica)</div>
      ${sel('owner_id', { label: 'Propietario', list: [['', '—']].concat((refs.contacts || []).map((c) => [c.id, c.full_name])) }, p.owner_id ?? '')}
      ${sel('advisor_id', { label: 'Asesor', list: [['', '—']].concat((refs.profiles || []).map((c) => [c.id, c.full_name || c.id])) }, p.advisor_id ?? '')}
      ${inp('commission_pct', 'Comisión %', p.commission_pct, 'inputmode="decimal"')}
      <label class="sw"><input type="checkbox" name="exclusive"${p.exclusive ? ' checked' : ''}> Exclusiva</label>
      <div class="field"><label for="p-exclusive_until">Exclusiva hasta</label><input id="p-exclusive_until" name="exclusive_until" type="date" value="${esc(p.exclusive_until || '')}"></div>
      </div>
      <aside class="pf-prev" aria-label="Vista previa">
        <p class="pv-h">Vista previa <span id="pv-state" class="muted"></span></p>
        <div class="pv-card" id="pv-card"></div>
        <p class="pv-h">Así se ve al compartir el enlace</p>
        <div class="pv-share" id="pv-share"></div>
        <p class="muted pv-note">Se actualiza mientras escribes. La foto de portada es la primera de la lista.</p>
      </aside></div><p class="form-msg err" id="pf-err" role="alert"></p>
      <div class="dlg-foot"><button type="button" class="btn btn-line" data-close>Cancelar</button><button class="btn btn-gold" type="submit" id="pf-save">Guardar</button></div></form>`, true);

    const form = $('#pf'); const g = (n) => form.elements[n];
    const refreshQ = () => {
      const q = quality({ description: g('description').value, zone_id: g('zone_id').value, public_location: g('public_location').value.trim(), price: num(g('price').value), price_on_request: g('price_on_request').checked, construction_m2: num(g('construction_m2').value), land_m2: num(g('land_m2').value) }, photos.length);
      $('#q-score').textContent = q.score + '%';
      const bar = $('#q-bar'); bar.className = 'qbar big ' + (q.score >= 80 ? 'good' : q.score >= 50 ? 'mid' : 'low'); $('i', bar).style.width = q.score + '%';
      $('#q-miss').textContent = q.missing.length ? 'Para mejorarla: ' + q.missing.join(' · ') : 'Ficha completa. Lista para publicarse.';
      $('#t-len').textContent = g('title').value.length; $('#d-len').textContent = g('description').value.length;
    };
    form.addEventListener('input', refreshQ);

    // vista previa en vivo: tarjeta del catálogo y vista al compartir por WhatsApp
    const drawPrev = () => {
      const op = g('operation').value, ty = g('type').value, st = g('status').value;
      const onReq = g('price_on_request').checked; const price = num(g('price').value);
      const priceT = CRX.money(price > 0 ? price : null, g('currency').value, onReq) + (op === 'renta' && !onReq && price > 0 ? ' / mes' : '');
      const zo = g('zone_id').selectedOptions[0]; const zone = (zo && zo.value ? zo.textContent : '') || g('public_location').value.trim() || 'Reynosa';
      const ph = photos[0]; const img = ph ? (ph.preview || ph.url) : '';
      const title = g('title').value.trim() || 'Título de la propiedad';
      const sp = []; const v = (n) => num(g(n).value);
      if (v('bedrooms') != null) sp.push(v('bedrooms') + ' rec.'); if (v('bathrooms') != null) sp.push(v('bathrooms') + ' baños');
      if (v('parking') != null) sp.push(v('parking') + ' est.'); if (v('construction_m2')) sp.push(v('construction_m2').toLocaleString('es-MX') + ' m² const.');
      if (v('land_m2')) sp.push(v('land_m2').toLocaleString('es-MX') + ' m² terreno');
      const tags = [`<span class="badge gold">${esc(CRX.OPS[op])}</span>`];
      if (st === 'apartada') tags.push('<span class="badge warn">Apartada</span>');
      if (st === 'cerrada') tags.push(`<span class="badge err">${op === 'renta' ? 'Rentada' : 'Vendida'}</span>`);
      $('#pv-card').innerHTML = `<div class="pv-img">${img ? `<img src="${esc(img)}" alt="">` : `<span>${esc(CRX.TYPES[ty])}<small>Sin foto de portada</small></span>`}<span class="pv-tags">${tags.join('')}</span>${photos.length > 1 ? `<em>${photos.length} fotos</em>` : ''}</div>
        <div class="pv-b"><small>${esc(CRX.TYPES[ty])} · ${esc(zone)}</small><b>${esc(title)}</b><span class="pv-price">${esc(priceT)}</span>${sp.length ? `<span class="pv-specs">${sp.map(esc).join(' · ')}</span>` : ''}</div>`;
      const d = (g('description').value.trim() || `${CRX.TYPES[ty]} en ${CRX.OPS[op].toLowerCase()} en ${zone}, Reynosa.`).replace(/\s+/g, ' ');
      $('#pv-share').innerHTML = `<div class="pv-bubble">${img ? `<img src="${esc(img)}" alt="">` : '<div class="pv-noimg">INMOBILIARIA CRUMEX</div>'}<div><b>${esc(title)} · ${esc(CRX.OPS[op])} en ${esc(zone)}</b><p>${esc(priceT)}. ${esc(d.slice(0, 110))}${d.length > 110 ? '…' : ''}</p><small>${esc(location.host || 'tu-sitio.com')}</small></div></div>`;
      $('#pv-state').textContent = st === 'disponible' ? '· publicada' : st === 'borrador' ? '· borrador, aún no se ve en el sitio' : st === 'apartada' ? '· se ve como apartada' : '· se ve como cerrada';
    };
    form.addEventListener('input', drawPrev); form.addEventListener('change', drawPrev);

    const drawAttrs = () => {
      const t = g('type').value; const list = ATTRS[t] || [];
      $('#attr-title').hidden = !list.length; $('#attrs').innerHTML = list.map(([k, l]) => `<div class="field"><label for="a-${k}">${esc(l)}</label><input id="a-${k}" data-attr="${k}" value="${esc(attrs[k] ?? '')}"></div>`).join('');
      $$('[data-attr]', form).forEach((i) => i.addEventListener('input', () => { attrs[i.dataset.attr] = i.value; }));
    };
    const drawEn = () => { const on = ['nave', 'terreno'].includes(g('type').value); $('#en-title').hidden = !on; $('#en-box').hidden = !on; };
    // amenidades según el tipo; créditos solo en venta de vivienda; condiciones solo en renta
    const amenSel = new Set(attrs.amenidades || []);
    const drawFeat = () => {
      const ty = g('type').value, op = g('operation').value; const home = ty === 'casa' || ty === 'departamento';
      $('#amen-box').innerHTML = CRX.amenFor(ty).map(([k, l]) => `<label class="sw sm"><input type="checkbox" name="x_amen" value="${k}"${amenSel.has(k) ? ' checked' : ''}> ${esc(l)}</label>`).join('');
      $('#cred-title').hidden = $('#cred-box').hidden = !(op === 'venta' && home);
      $('#rent-title').hidden = $('#rent-box').hidden = op !== 'renta';
      $('#w-niveles').hidden = ty === 'terreno'; $('#w-mant').hidden = !home;
    };
    $('#amen-box').addEventListener('change', (e) => { if (e.target.name === 'x_amen') { if (e.target.checked) amenSel.add(e.target.value); else amenSel.delete(e.target.value); } });
    g('type').addEventListener('change', drawFeat); g('operation').addEventListener('change', drawFeat); drawFeat();
    g('type').addEventListener('change', drawAttrs); g('type').addEventListener('change', drawEn); drawAttrs(); drawEn();
    if (p.id) drawDocs(p); else $('#docs-box').innerHTML = '<p class="muted">Guarda la propiedad para poder subir escrituras, predial, planos y otros documentos.</p>';

    let dragFrom = null;
    const drawPhotos = () => {
      $('#ph-list').innerHTML = photos.map((ph, i) => `<div class="ph" draggable="true" data-i="${i}">${i === 0 ? '<span class="badge gold cv">Portada</span>' : ''}<img src="${esc(ph.preview || ph.url)}" alt=""><input data-alt="${i}" value="${esc(ph.alt || '')}" placeholder="Describe la foto (ej. cocina)" aria-label="Descripción de la foto ${i + 1}"><div class="ph-b"><button type="button" data-mv="${i}:-1" aria-label="Mover antes">←</button>${i ? `<button type="button" data-cover="${i}" title="Hacer portada">★</button>` : ''}<button type="button" data-mv="${i}:1" aria-label="Mover después">→</button><button type="button" data-rm="${i}" aria-label="Quitar foto">✕</button></div><label class="ph-plan"><input type="checkbox" data-plan="${i}"${ph.plan ? ' checked' : ''}> Es plano</label></div>`).join('');
      refreshQ(); drawPrev();
    };
    drawPhotos();
    const addFiles = async (files) => {
      const imgs = Array.from(files).filter((f) => /^image\//.test(f.type));
      if (!imgs.length) return;
      $('#drop').classList.add('busy');
      for (const f of imgs) {
        try { const blob = await CRX.fileToWebp(f); photos.push({ blob, preview: URL.createObjectURL(blob), alt: '' }); dirty = true; }
        catch (err) { CRX.toast(f.name + ': ' + err.message, 'err'); }
      }
      $('#drop').classList.remove('busy'); drawPhotos();
    };
    const list = $('#ph-list');
    list.addEventListener('input', (e) => { if (e.target.dataset.alt != null) photos[+e.target.dataset.alt].alt = e.target.value; });
    list.addEventListener('change', (e) => { if (e.target.dataset.plan != null) { photos[+e.target.dataset.plan].plan = e.target.checked; dirty = true; } });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; dirty = true;
      if (b.dataset.rm != null) photos.splice(+b.dataset.rm, 1);
      if (b.dataset.cover != null) photos.unshift(photos.splice(+b.dataset.cover, 1)[0]);
      if (b.dataset.mv) { const [i, d] = b.dataset.mv.split(':').map(Number); const j = i + d; if (j >= 0 && j < photos.length) [photos[i], photos[j]] = [photos[j], photos[i]]; }
      drawPhotos();
    });
    list.addEventListener('dragstart', (e) => { const el = e.target.closest('.ph'); if (el) { dragFrom = +el.dataset.i; el.classList.add('dragging'); } });
    list.addEventListener('dragend', () => { dragFrom = null; $$('.ph', list).forEach((x) => x.classList.remove('dragging', 'over')); });
    list.addEventListener('dragover', (e) => { const el = e.target.closest('.ph'); if (el && dragFrom != null) { e.preventDefault(); $$('.ph', list).forEach((x) => x.classList.toggle('over', x === el)); } });
    list.addEventListener('drop', (e) => { const el = e.target.closest('.ph'); if (el && dragFrom != null) { e.preventDefault(); const to = +el.dataset.i; photos.splice(to, 0, photos.splice(dragFrom, 1)[0]); dirty = true; drawPhotos(); } });
    $('#pf-files').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
    const drop = $('#drop');
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { if (dragFrom == null) { e.preventDefault(); drop.classList.add('hover'); } }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('hover')));
    drop.addEventListener('drop', (e) => { if (dragFrom == null) { e.preventDefault(); addFiles(e.dataTransfer.files); } });

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); const err = $('#pf-err'); err.textContent = '';
      const title = g('title').value.trim();
      if (title.length < 3) { g('title').focus(); return (err.textContent = 'Escribe un título (mínimo 3 letras).'); }
      const onReq = g('price_on_request').checked; const price = num(g('price').value);
      if (!onReq && !(price > 0)) { g('price').focus(); return (err.textContent = 'Pon un precio mayor a 0 o marca "Precio a consultar".'); }
      const a = {}; (ATTRS[g('type').value] || []).forEach(([k, , ty]) => { const v = attrs[k]; if (v !== undefined && v !== '' && v !== null) a[k] = ty === 'number' ? num(v) : String(v).trim(); });
      for (const k of ['video_url', 'tour_url']) { const v = g(k).value.trim(); if (!v) continue; if (!/^https:\/\/[^\s]+$/i.test(v)) { g(k).focus(); return (err.textContent = 'El enlace del video o recorrido debe empezar con https://'); } a[k] = v.slice(0, 500); }
      if (['nave', 'terreno'].includes(g('type').value)) ['title_en', 'description_en'].forEach((k) => { const v = g(k).value.trim(); if (v) a[k] = v; });
      { const ty = g('type').value, op = g('operation').value; const home = ty === 'casa' || ty === 'departamento';
        const allowed = new Set(CRX.amenFor(ty).map(([k]) => k)); const am = [...amenSel].filter((k) => allowed.has(k)); if (am.length) a.amenidades = am;
        if (op === 'venta' && home) { const cr = $$('[name=x_cred]:checked', form).map((i) => i.value); if (cr.length) a.creditos = cr; }
        if (ty !== 'terreno' && num(g('x_niveles').value) != null) a.niveles = num(g('x_niveles').value);
        if (home && num(g('x_mant').value) != null) a.mantenimiento = num(g('x_mant').value);
        if (op === 'renta') {
          if (g('x_amueblado').value) a.amueblado = g('x_amueblado').value; if (g('x_mascotas').value) a.mascotas = g('x_mascotas').value;
          if (num(g('x_dep').value) != null) a.deposito_meses = num(g('x_dep').value); if (num(g('x_plazo').value) != null) a.plazo_min_meses = num(g('x_plazo').value);
          if (g('x_desde').value) a.disponible_desde = g('x_desde').value; if (g('x_req').value.trim()) a.requisitos = g('x_req').value.trim();
        }
        if (g('x_cerca').value.trim()) a.cerca = g('x_cerca').value.trim(); }
      const row = {
        id: p.id || undefined, title, description: g('description').value.trim() || null, operation: g('operation').value, type: g('type').value, status: g('status').value,
        price: onReq && !price ? null : price, currency: g('currency').value, price_on_request: onReq, featured: g('featured').checked, price_reduced: !!p.price_reduced,
        zone_id: g('zone_id').value ? (isNaN(g('zone_id').value) ? g('zone_id').value : Number(g('zone_id').value)) : null,
        public_location: g('public_location').value.trim() || null, address_private: g('address_private').value.trim() || null,
        bedrooms: num(g('bedrooms').value), bathrooms: num(g('bathrooms').value), parking: num(g('parking').value),
        construction_m2: num(g('construction_m2').value), land_m2: num(g('land_m2').value), age_years: num(g('age_years').value), attributes: a,
        owner_id: g('owner_id').value || null, advisor_id: g('advisor_id').value || null,
        commission_pct: num(g('commission_pct').value), exclusive: g('exclusive').checked, exclusive_until: g('exclusive').checked ? (g('exclusive_until').value || null) : null,
        ref_code: p.ref_code || undefined, slug: p.slug || undefined, demo: p.demo || undefined, published_at: p.published_at || undefined, created_at: p.created_at || undefined
      };
      if (row.status === 'disponible' && !photos.length && !(await CRX.ask('No agregaste fotos. ¿Publicar sin fotografías?', { ok: 'Publicar sin fotos' }))) return;
      const btn = $('#pf-save'); btn.disabled = true; btn.textContent = photos.some((x) => x.blob) ? 'Subiendo fotos…' : 'Guardando…';
      try { await api.properties.save(row, photos); CRX.toast('Propiedad guardada', 'ok'); closeDlg(); if (/propiedades/.test(location.hash)) viewProperties(); else route(); }
      catch (ex) { err.textContent = api.errMsg(ex); btn.disabled = false; btn.textContent = 'Guardar'; }
    });
  }

  /* ===================== Prospectos (tablero y lista) ===================== */
  async function viewLeads() {
    const refs = await loadRefs(Object.keys(LISTS));
    const rows = refs.leads.filter((r) => !OWNER_KINDS.includes(r.kind)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    newLeads = rows.filter((r) => r.status === 'nuevo').length; navRender('leads');
    const mode = pref.get('lview', 'board');
    $('#view-actions').innerHTML = `<div class="seg" role="group" aria-label="Vista"><button type="button" data-lv="board" class="${mode === 'board' ? 'on' : ''}">Tablero</button><button type="button" data-lv="list" class="${mode === 'list' ? 'on' : ''}">Lista</button></div><button class="btn btn-line btn-sm" id="csv">Exportar CSV</button><button class="btn btn-gold btn-sm" id="nr">+ Nuevo</button>`;
    $('#nr').onclick = () => editRow('leads', null, refs);
    $('#csv').onclick = () => exportCsv(rows);
    $$('[data-lv]').forEach((b) => b.addEventListener('click', () => { pref.set('lview', b.dataset.lv); viewLeads(); }));
    if (mode === 'list') return viewResource('leads', { rows, refs, keepActions: true });

    $('#view').innerHTML = `<div class="bar"><input type="search" id="q" class="grow" placeholder="Buscar por nombre, teléfono o mensaje" aria-label="Buscar"><select id="fk" aria-label="Tipo"><option value="">Todos los tipos</option>${OPT(CRX.LEAD_KINDS).map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join('')}</select><select id="fa" aria-label="Asignados"><option value="">Todos</option><option value="me">Míos</option><option value="none">Sin asignar</option>${(refs.profiles || []).map((u) => `<option value="${esc(u.id)}">${esc(u.full_name || u.email || 'Usuario')}</option>`).join('')}</select></div><div class="board" id="board"></div>`;
    $('#fa').value = pref.get('lassign', '');
    if (![...$('#fa').options].some((o) => o.value === $('#fa').value)) $('#fa').value = '';
    const draw = () => {
      const q = $('#q').value.toLowerCase(), k = $('#fk').value, fa = $('#fa').value;
      const mine = (r) => fa === '' || (fa === 'me' ? String(r.assigned_to) === String(user.id) : fa === 'none' ? !r.assigned_to : String(r.assigned_to) === fa);
      const l = rows.filter((r) => mine(r) && (!k || r.kind === k) && (!q || [r.full_name, r.phone, r.email, r.message].join(' ').toLowerCase().includes(q)));
      $('#board').innerHTML = Object.entries(CRX.LEAD_STATUS).map(([st, label]) => {
        const items = l.filter((r) => r.status === st);
        return `<section class="lane" data-lane="${st}"><header><b>${esc(label)}</b><span>${items.length}</span></header><div class="lane-b">${items.map((r) => {
          const prop = r.property_id ? refLabel(refs, 'properties', r.property_id) : '';
          const late = st === 'nuevo' && Date.now() - new Date(r.created_at) > DAY;
          return `<article class="lcard${late ? ' late' : ''}" draggable="true" data-id="${esc(r.id)}">
            <div class="lc-top"><span class="badge">${esc(CRX.LEAD_KINDS[r.kind] || r.kind)}</span><small title="${esc(CRX.fmtDate(r.created_at))}">${esc(ago(r.created_at))}</small></div>
            <b>${esc(r.full_name)}</b><span class="muted">${esc(fph(r.phone))}</span>
            ${prop ? `<small class="lc-prop">${esc(prop)}</small>` : ''}
            ${r.assigned_to ? `<small class="lc-who" title="Asignado a">👤 ${esc(refLabel(refs, 'profiles', r.assigned_to))}</small>` : ''}
            ${r.channel && r.channel !== 'Directo' ? `<small class="lc-who" title="Llegó desde">↗ ${esc(r.channel)}</small>` : ''}
            ${r.message ? `<p>${esc(String(r.message).slice(0, 90))}${String(r.message).length > 90 ? '…' : ''}</p>` : ''}
            ${r.follow_up_at ? `<span class="lc-fu${new Date(r.follow_up_at) < Date.now() ? ' late' : ''}" title="${esc(r.follow_up_note || '')}">⏰ ${esc(new Date(r.follow_up_at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}${r.follow_up_note ? ' · ' + esc(String(r.follow_up_note).slice(0, 40)) : ''}</span>` : ''}
            <div class="lc-act"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waUrl(r.phone, `Hola ${r.full_name.split(' ')[0]}, te escribo de INMOBILIARIA CRUMEX por tu solicitud${prop ? ' de ' + prop : ''}.`))}">WhatsApp</a><button class="btn btn-line btn-sm" data-open="${esc(r.id)}">Abrir</button>
            <select data-move="${esc(r.id)}" aria-label="Mover a">${Object.entries(CRX.LEAD_STATUS).map(([v, t]) => `<option value="${v}"${v === st ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
            <select data-remind="${esc(r.id)}" aria-label="Recordarme" title="Recordarme dar seguimiento"><option value="">⏰ Recordar…</option><option value="1">Mañana 10:00</option><option value="3">En 3 días</option><option value="7">En una semana</option>${r.follow_up_at ? '<option value="x">Quitar recordatorio</option>' : ''}</select></div>
          </article>`;
        }).join('') || '<p class="lane-empty">Arrastra aquí</p>'}</div></section>`;
      }).join('');
    };
    $('#q').addEventListener('input', draw); $('#fk').addEventListener('change', draw); $('#fa').addEventListener('change', () => { pref.set('lassign', $('#fa').value); draw(); }); draw();
    const move = async (id, status) => {
      const r = rows.find((x) => x.id === id); if (!r || r.status === status) return;
      const prev = r.status; r.status = status; draw();
      const res = await guard(() => api.upsert('leads', { id, status }, { isNew: false }), `Movido a ${CRX.LEAD_STATUS[status]}`);
      if (!res.ok) { r.status = prev; draw(); }
      newLeads = rows.filter((x) => x.status === 'nuevo').length; navRender('leads');
    };
    const board = $('#board'); let dragId = null;
    board.addEventListener('dragstart', (e) => { const c = e.target.closest('.lcard'); if (c) { dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; } });
    board.addEventListener('dragend', () => { dragId = null; $$('.lane', board).forEach((x) => x.classList.remove('over')); });
    board.addEventListener('dragover', (e) => { const lane = e.target.closest('.lane'); if (lane && dragId) { e.preventDefault(); $$('.lane', board).forEach((x) => x.classList.toggle('over', x === lane)); } });
    board.addEventListener('drop', (e) => { const lane = e.target.closest('.lane'); if (lane && dragId) { e.preventDefault(); move(dragId, lane.dataset.lane); } });
    board.addEventListener('change', async (e) => {
      const s = e.target.closest('[data-move]'); if (s) { move(s.dataset.move, s.value); return; }
      const rm = e.target.closest('[data-remind]'); if (!rm || !rm.value) return;
      const r = rows.find((x) => x.id === rm.dataset.remind); let at = null;
      if (rm.value !== 'x') { const d = new Date(); d.setDate(d.getDate() + Number(rm.value)); d.setHours(10, 0, 0, 0); at = d.toISOString(); }
      const res = await guard(() => api.upsert('leads', { id: r.id, follow_up_at: at }, { isNew: false }), at ? 'Te lo recordaremos ' + new Date(at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Recordatorio quitado');
      if (res.ok) { r.follow_up_at = at; draw(); }
    });
    board.addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) editRow('leads', rows.find((r) => r.id === b.dataset.open), refs); });
  }

  async function leadToContact(lead) {
    const contacts = cache.contacts || await api.list('contacts');
    const dup = contacts.find((c) => (c.phone && lead.phone && c.phone.replace(/\D/g, '').slice(-10) === lead.phone.replace(/\D/g, '').slice(-10)) || (c.email && lead.email && c.email.toLowerCase() === lead.email.toLowerCase()));
    let contactId = dup && dup.id;
    if (dup && !(await CRX.ask(`Ya existe el contacto "${dup.full_name}" con ese teléfono o correo. ¿Vincular el prospecto a ese contacto?`, { ok: 'Vincular' }))) return;
    if (!dup) {
      const kind = lead.kind === 'valuacion' ? 'propietario' : 'comprador';
      const r = await guard(() => api.upsert('contacts', { full_name: lead.full_name, phone: lead.phone, email: lead.email || null, kinds: [kind], notes: lead.message ? 'Desde prospecto: ' + lead.message : null }, { isNew: true }));
      if (!r.ok) return; contactId = r.r.id;
    }
    const r2 = await guard(() => api.upsert('leads', { id: lead.id, contact_id: contactId, status: lead.status === 'nuevo' ? 'contactado' : lead.status }, { isNew: false }), dup ? 'Prospecto vinculado al contacto' : 'Contacto creado');
    if (r2.ok) { closeDlg(); route(); }
  }

  /* ===================== Visitas (agenda) ===================== */
  async function viewVisits() {
    const refs = await loadRefs(Object.keys(LISTS).concat('visits'));
    const rows = refs.visits.slice().sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
    const showPast = pref.get('vpast', '0') === '1';
    $('#view-actions').innerHTML = `<label class="sw sm"><input type="checkbox" id="vpast"${showPast ? ' checked' : ''}> Mostrar pasadas</label><button class="btn btn-gold btn-sm" id="nr">+ Agendar visita</button>`;
    $('#nr').onclick = () => editRow('visits', null, refs);
    $('#vpast').onchange = (e) => { pref.set('vpast', e.target.checked ? '1' : '0'); viewVisits(); };
    const vmode = pref.get('vmode', 'list');
    $('#view-actions').insertAdjacentHTML('afterbegin', `<div class="seg" role="group" aria-label="Vista"><button type="button" data-vm="list" class="${vmode === 'list' ? 'on' : ''}">Agenda</button><button type="button" data-vm="month" class="${vmode === 'month' ? 'on' : ''}">Mes</button></div>`);
    $$('[data-vm]').forEach((b) => b.addEventListener('click', () => { pref.set('vmode', b.dataset.vm); viewVisits(); }));
    if (vmode === 'month') { $('#vpast').closest('label').hidden = true; return visitsMonth(rows, refs); }
    const today0 = new Date(new Date().toDateString());
    const list = rows.filter((v) => showPast || new Date(v.scheduled_at) >= today0);
    if (!list.length) { $('#view').innerHTML = `<div class="empty panel">${rows.length ? 'No hay visitas próximas.' : 'Aún no hay visitas. Agenda la primera con "+ Agendar visita" o desde un prospecto.'}</div>`; return; }
    const groups = {}; list.forEach((v) => { const k = new Date(v.scheduled_at).toDateString(); (groups[k] = groups[k] || []).push(v); });
    const dayLabel = (k) => { const d = new Date(k); const diff = Math.round((d - today0) / DAY); const base = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }); const cap = base.charAt(0).toUpperCase() + base.slice(1); return diff === 0 ? 'Hoy · ' + base : diff === 1 ? 'Mañana · ' + base : cap; };
    $('#view').innerHTML = `<div class="agenda">${Object.entries(groups).map(([k, vs]) => `<section class="day${new Date(k) < today0 ? ' past' : ''}${new Date(k).getTime() === today0.getTime() ? ' today' : ''}"><h2>${esc(dayLabel(k))}</h2>${vs.map((v) => {
      const lead = v.lead_id ? (refs.leads || []).find((l) => l.id === v.lead_id) : null;
      return `<article class="visit st-${v.status}"><time>${esc(new Date(v.scheduled_at).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }))}</time><div><b>${esc(refLabel(refs, 'properties', v.property_id))}</b><span class="muted">${lead ? esc(lead.full_name + ' · ' + lead.phone) : 'Sin prospecto vinculado'}${v.notes ? ' · ' + esc(v.notes) : ''}</span></div><span class="badge vs-${v.status}">${esc(VISIT_STATUS[v.status])}</span><div class="v-act">${lead ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waUrl(lead.phone, `Hola ${lead.full_name.split(' ')[0]}, te confirmo la visita del ${new Date(v.scheduled_at).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}.`))}">Confirmar por WhatsApp</a>` : ''}${lead && (v.status === 'realizada' || new Date(v.scheduled_at) < new Date()) && !v.feedback ? `<button class="btn btn-line btn-sm" data-fb="${esc(v.id)}" title="Manda por WhatsApp una encuesta corta de 3 preguntas">Pedir opinión</button>` : ''}${v.feedback ? `<span class="fb-stars" title="Opinión del cliente">${'★'.repeat(v.feedback.rating)}${'☆'.repeat(5 - v.feedback.rating)}</span>` : ''}<a class="btn btn-line btn-sm" target="_blank" rel="noopener" href="${esc(gcalUrl(v, refs))}" title="Agregar a Google Calendar">Google Calendar</a><button class="btn btn-line btn-sm" data-ics="${esc(v.id)}" title="Descargar para el calendario del celular o de Outlook">.ics</button><button class="btn btn-line btn-sm" data-edit="${esc(v.id)}">Abrir</button></div></article>`;
    }).join('')}</section>`).join('')}</div>`;
    $('#view').addEventListener('click', async (e) => {
      const f = e.target.closest('[data-fb]'); if (!f) return;
      const v = rows.find((x) => String(x.id) === f.dataset.fb); const lead = v && v.lead_id ? (refs.leads || []).find((l) => l.id === v.lead_id) : null; if (!lead) return;
      const w = window.open('', '_blank');
      try { const t = await api.tools.visitToken(v.id); const p = (refs.properties || []).find((x) => x.id === v.property_id) || {};
        const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}opinion.html?t=${encodeURIComponent(t)}`;
        const msg = `Hola ${lead.full_name.split(' ')[0]}, gracias por ir a ver ${p.ref_code || 'la propiedad'}. ¿Qué te pareció? Son 3 preguntas: ${url}`;
        if (w) w.location = waUrl(lead.phone, msg); else window.open(waUrl(lead.phone, msg), '_blank'); }
      catch (ex) { if (w) w.close(); CRX.toast(api.errMsg(ex), 'err'); }
    });
    $('#view').onclick = (e) => { const b = e.target.closest('[data-edit]'); if (b) editRow('visits', rows.find((v) => String(v.id) === b.dataset.edit), refs); const i = e.target.closest('[data-ics]'); if (i) downloadIcs(rows.find((v) => String(v.id) === i.dataset.ics), refs); };
  }

  /* calendario de visitas: mes, Google Calendar y archivo .ics */
  let calMonth = null;
  function visitsMonth(rows, refs) {
    const now = new Date(); calMonth = calMonth || new Date(now.getFullYear(), now.getMonth(), 1);
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const start = new Date(y, m, 1); const offset = (start.getDay() + 6) % 7; // lunes primero
    const days = []; for (let i = 0; i < 42; i++) days.push(new Date(y, m, 1 - offset + i));
    const key = (d) => d.toDateString(); const by = {};
    rows.filter((v) => v.status !== 'cancelada').forEach((v) => { const k = key(new Date(v.scheduled_at)); (by[k] = by[k] || []).push(v); });
    const label = calMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    $('#view').innerHTML = `<div class="panel cal"><div class="cal-h"><button class="btn btn-line btn-sm" data-cm="-1" aria-label="Mes anterior">‹</button><h2>${esc(label.charAt(0).toUpperCase() + label.slice(1))}</h2><button class="btn btn-line btn-sm" data-cm="1" aria-label="Mes siguiente">›</button><button class="btn btn-line btn-sm" data-cm="0">Hoy</button></div>
      <div class="cal-g">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<div class="cal-dn">${d}</div>`).join('')}
      ${days.slice(0, days[35].getMonth() === m ? 42 : 35).map((d) => { const vs = (by[key(d)] || []).sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
        return `<div class="cal-d${d.getMonth() !== m ? ' out' : ''}${key(d) === key(now) ? ' today' : ''}"><span class="cal-n">${d.getDate()}</span>${vs.map((v) => { const p = (refs.properties || []).find((x) => x.id === v.property_id);
          return `<button type="button" class="cal-v st-${esc(v.status)}" data-edit="${esc(v.id)}" title="${esc(refLabel(refs, 'properties', v.property_id))}">${esc(new Date(v.scheduled_at).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }))} ${esc(p ? p.ref_code : 'Visita')}</button>`; }).join('')}</div>`; }).join('')}</div></div>`;
    $('#view').onclick = (e) => {
      const c = e.target.closest('[data-cm]'); if (c) { const n = Number(c.dataset.cm); calMonth = n ? new Date(y, m + n, 1) : new Date(now.getFullYear(), now.getMonth(), 1); visitsMonth(rows, refs); return; }
      const b = e.target.closest('[data-edit]'); if (b) editRow('visits', rows.find((v) => String(v.id) === b.dataset.edit), refs);
    };
  }
  const calText = (v, refs) => {
    const p = (refs.properties || []).find((x) => x.id === v.property_id) || {}; const l = v.lead_id ? (refs.leads || []).find((x) => x.id === v.lead_id) : null;
    return { title: `Visita · ${p.ref_code || ''} ${p.title || ''}`.trim(), where: p.address_private || p.public_location || p.zone || 'Reynosa, Tamaulipas',
      details: [l ? `Con: ${l.full_name} (${fph(l.phone)})` : '', v.notes || '', 'INMOBILIARIA CRUMEX'].filter(Boolean).join('\n') };
  };
  const icsDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  function gcalUrl(v, refs) {
    const t = calText(v, refs); const a = new Date(v.scheduled_at); const b = new Date(+a + 3600e3);
    return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: t.title, dates: `${icsDate(a)}/${icsDate(b)}`, details: t.details, location: t.where }).toString();
  }
  function downloadIcs(v, refs) {
    if (!v) return; const t = calText(v, refs); const a = new Date(v.scheduled_at);
    const e = (x) => String(x).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CRUMEX//Panel//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${v.id}@crumex`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(a)}`, `DTEND:${icsDate(new Date(+a + 3600e3))}`,
      `SUMMARY:${e(t.title)}`, `LOCATION:${e(t.where)}`, `DESCRIPTION:${e(t.details)}`, 'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${e(t.title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' })); link.download = 'visita.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 3000);
  }

  /* ===================== Herramientas: conexiones, respaldo e importación ===================== */
  async function viewTools() {
    if (!ROLE_ADMIN()) { $('#view').innerHTML = '<div class="panel"><p>Solo un administrador puede usar las herramientas.</p></div>'; return; }
    $('#view').innerHTML = `<div class="panel" id="t-health"><h2>Estado de las conexiones</h2><p class="muted">Revisando…</p></div>
      <div class="panel" id="t-backup"><h2>Respaldo</h2>
        <p class="muted">Descarga todos tus datos en un archivo y guárdalo en tu computadora o en Google Drive. El plan gratuito de MongoDB Atlas no guarda respaldos solo: hazlo cada semana.</p>
        <p id="t-last" class="muted"></p>
        <div class="row-act"><button class="btn btn-gold" id="t-dl" type="button">Descargar respaldo</button><label class="btn btn-line"><input type="file" id="t-up" accept="application/json,.json" hidden>Restaurar desde un archivo…</label></div>
        <p class="form-msg" id="t-bmsg" role="status"></p>
        <p class="note muted">El respaldo incluye propiedades, prospectos, contactos, visitas, operaciones, ajustes, equipo y estadísticas. Las fotos que están en Cloudinary se quedan allá; las fotos y documentos guardados en MongoDB no van en el archivo. Guárdalo en un lugar seguro: trae los datos de tus clientes.</p></div>
      <div class="panel" id="t-import"><h2>Importar propiedades desde Excel</h2>
        <p class="muted">Llena la plantilla en Excel o Google Sheets, guárdala como CSV y súbela aquí. Se crean como <b>borrador</b> para que les agregues fotos antes de publicar.</p>
        <div class="row-act"><button class="btn btn-line" id="t-tpl" type="button">Descargar plantilla</button><label class="btn btn-navy"><input type="file" id="t-csv" accept=".csv,text/csv,text/plain" hidden>Subir CSV…</label></div>
        <div id="t-prev"></div></div>
      <div class="panel" id="t-alerts"><h2>Alertas de búsqueda</h2>
        <p class="muted">Quien pide una alerta en el catálogo y deja su correo recibe cada mañana lo nuevo (o lo que bajó de precio) que coincide con lo que busca. Cada correo trae un enlace para darse de baja.</p><div id="t-alist"><p class="muted">Cargando…</p></div></div>
      <div class="panel" id="t-feed"><h2>Catálogo para anuncios de Facebook e Instagram</h2>
        <p class="muted">Meta puede leer tus propiedades disponibles (con foto y precio) desde esta dirección y armar anuncios de cada una. En el Administrador de comercio de Meta crea un catálogo de tipo "Inmuebles" y agrega esta dirección como fuente de datos programada (diaria).</p>
        <div id="t-feedbox"></div><p class="note muted">Meta revisa en qué países está disponible este tipo de anuncio; si tu cuenta no te deja crear un catálogo de inmuebles, se puede usar la misma lista para anuncios normales.</p></div>`;
    (async () => {
      const fu = api.tools.feedUrl();
      $('#t-feedbox').innerHTML = fu ? `<div class="copy-row"><input readonly value="${esc(fu)}" aria-label="Dirección del catálogo" id="t-feedurl"><button class="btn btn-line btn-sm" type="button" id="t-feedcp">Copiar</button><a class="btn btn-line btn-sm" href="${esc(fu)}" target="_blank" rel="noopener">Ver</a></div>` : '<p class="muted">Disponible cuando el sitio funciona con el servidor (USE_SERVER: true).</p>';
      if ($('#t-feedcp')) $('#t-feedcp').onclick = () => { navigator.clipboard.writeText(fu).then(() => CRX.toast('Copiada', 'ok')).catch(() => { $('#t-feedurl').select(); }); };
      const drawAlerts = async () => {
        let rows = []; try { rows = await api.tools.alerts(); } catch (e) { $('#t-alist').innerHTML = `<p class="muted">${esc(api.errMsg(e))}</p>`; return; }
        const F = (f) => { f = f || {}; return [f.op ? CRX.OPS[f.op] : '', (f.types || []).map((t) => CRX.TYPES[t]).join(', '), (f.zones || []).join(', '), f.max ? `hasta $${Number(f.max).toLocaleString('es-MX')} ${f.cur || 'MXN'}` : '', f.beds ? f.beds + '+ rec.' : '', (f.feat || []).map((k) => CRX.FEAT_FILTERS[k] || k).join(', '), f.q ? `"${f.q}"` : ''].filter(Boolean).join(' · ') || 'Cualquier propiedad'; };
        $('#t-alist').innerHTML = rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>Correo</th><th>Busca</th><th>Creada</th><th>Correos mandados</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.email)}<br><small class="muted">${esc(r.full_name || '')}</small></td><td>${esc(F(r.filters))}</td><td>${esc(CRX.fmtDate(r.created_at))}</td><td>${Number(r.sent_count || 0)}</td><td>${r.active ? `<button class="btn btn-line btn-sm" data-aoff="${esc(r.id)}">Desactivar</button>` : '<span class="badge">Inactiva</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Todavía no hay alertas.</p>';
      };
      $('#t-alist').onclick = async (e) => { const b = e.target.closest('[data-aoff]'); if (b) { const r = await guard(() => api.tools.alertOff(b.dataset.aoff), 'Alerta desactivada'); if (r.ok) drawAlerts(); } };
      drawAlerts();
    })();
    // conexiones
    try { drawHealth(await api.tools.health()); } catch (e) { $('#t-health').innerHTML = `<h2>Estado de las conexiones</h2><p class="form-msg err">${esc(api.errMsg(e))}</p>`; }
    const last = await api.tools.lastBackup().catch(() => null);
    $('#t-last').textContent = last ? `Último respaldo: ${CRX.fmtDate(last)} (${ago(last)}).` : 'Todavía no has descargado ningún respaldo.';
    $('#t-dl').onclick = async () => {
      const msg = $('#t-bmsg'); msg.className = 'form-msg'; msg.textContent = 'Preparando…'; $('#t-dl').disabled = true;
      try {
        const data = await api.tools.backup((c, n, total) => { msg.textContent = `Copiando ${c}: ${n} de ${total}…`; });
        const day = new Date().toLocaleDateString('en-CA');
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })); link.download = `crumex-respaldo-${day}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 4000);
        msg.className = 'form-msg ok'; msg.textContent = 'Listo. Guarda el archivo en un lugar seguro.'; $('#t-last').textContent = `Último respaldo: ${CRX.fmtDate(new Date().toISOString())} (ahora).`;
      } catch (e) { msg.className = 'form-msg err'; msg.textContent = api.errMsg(e); }
      $('#t-dl').disabled = false;
    };
    $('#t-up').onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return; const msg = $('#t-bmsg');
      let data; try { data = JSON.parse(await f.text()); } catch (ex) { msg.className = 'form-msg err'; msg.textContent = 'El archivo no se pudo leer. ¿Es un respaldo de CRUMEX (.json)?'; return; }
      const created = data && data.created_at ? CRX.fmtDate(data.created_at) : 'fecha desconocida';
      const how = api.mode === 'local' ? 'Los datos de demostración de este navegador se reemplazan por los del archivo.' : 'Los registros del archivo reemplazan a los que tengan el mismo identificador; lo que agregaste después se queda.';
      if (!(await CRX.ask(`¿Restaurar el respaldo del ${created}? ${how}`, { ok: 'Restaurar', danger: true }))) return;
      msg.className = 'form-msg'; msg.textContent = 'Restaurando…';
      try { const r = await api.tools.restore(data, (c, n, total) => { msg.textContent = `Restaurando ${c}: ${n} de ${total}…`; }); msg.className = 'form-msg ok'; msg.textContent = `Restauración terminada: ${r.restored} registros${r.errors ? `, ${r.errors} con error` : ''}.`; }
      catch (ex) { msg.className = 'form-msg err'; msg.textContent = api.errMsg(ex); }
    };
    bindImport();
  }
  function drawHealth(h) {
    const box = $('#t-health');
    if (h.demo) { box.innerHTML = '<h2>Estado de las conexiones</h2><p class="muted">Estás en modo demostración: no hay servidor ni base conectada. Cuando pongas <code>USE_SERVER: true</code> aquí verás si MongoDB, Cloudinary, el correo y Telegram funcionan.</p>'; return; }
    const week = h.last_backup && Date.now() - new Date(h.last_backup) < 7 * DAY;
    const rows = [
      ['Base de datos (MongoDB)', 'ok', `Conectada a “${h.db.name}” · ${h.db.counts.properties} propiedades, ${h.db.counts.leads} prospectos · respondió en ${h.db.ms} ms`],
      ['Fotos y documentos', h.cloud ? (h.cloud.ok ? 'ok' : 'err') : 'info', h.cloud ? (h.cloud.ok ? 'Cloudinary conectado' : 'Cloudinary: ' + h.cloud.error) : `Se guardan en MongoDB (${h.db.counts.files} archivos). Para fotos más rápidas y archivos de hasta 10 MB configura Cloudinary.`],
      ['Correo (Resend)', h.mail ? (h.mail_to ? 'ok' : 'warn') : 'off', h.mail ? (h.mail_to ? `Listo${h.mail_from ? '' : ' · falta AVISO_EMAIL_FROM: mientras tanto sale desde onboarding@resend.dev'}` : 'Falta AVISO_EMAIL_TO: los avisos de prospectos no tienen a quién llegar') : 'Sin configurar: no hay avisos por correo, ni respuesta automática, ni "¿Olvidaste tu contraseña?"'],
      ['Telegram', h.telegram ? 'ok' : 'off', h.telegram ? 'Listo' : 'Sin configurar (opcional)'],
      ['Resumen diario por correo', h.env.CRON_SECRET && h.mail ? 'ok' : 'off', h.env.CRON_SECRET ? (h.mail ? 'Se manda cada mañana a las 7:00' : 'Falta configurar el correo') : 'Falta la variable CRON_SECRET en Vercel'],
      ['Dirección del sitio', h.env.SITE_URL ? 'ok' : 'warn', h.env.SITE_URL ? h.env.SITE_URL : `Sin SITE_URL; los correos usan ${h.site}. Ponla cuando tengas tu dominio.`],
      ['Código de instalación', h.env.SETUP_TOKEN ? 'warn' : 'ok', h.env.SETUP_TOKEN ? 'SETUP_TOKEN sigue en Vercel. Ya no se usa: puedes borrarlo.' : 'Ya no está; bien.'],
      ['Respaldo', week ? 'ok' : 'warn', h.last_backup ? `Último: ${CRX.fmtDate(h.last_backup)}${week ? '' : ' · ya toca otro'}` : 'Nunca. Descarga uno abajo.']
    ];
    const IC = { ok: '✓', warn: '!', err: '✕', off: '–', info: 'i' };
    box.innerHTML = `<h2>Estado de las conexiones</h2><ul class="health">${rows.map(([t, st, d]) => `<li class="h-${st}"><span class="h-i" aria-hidden="true">${IC[st]}</span><div><b>${esc(t)}</b><small>${esc(d)}</small></div></li>`).join('')}</ul>
      <div class="row-act"><button class="btn btn-line btn-sm" data-test="mail"${h.mail ? '' : ' disabled'}>Mandarme un correo de prueba</button><button class="btn btn-line btn-sm" data-test="telegram"${h.telegram ? '' : ' disabled'}>Mandar Telegram de prueba</button><span class="form-msg" id="t-tmsg" role="status"></span></div>`;
    box.onclick = async (e) => { const b = e.target.closest('[data-test]'); if (!b) return; const m = $('#t-tmsg'); m.className = 'form-msg'; m.textContent = 'Mandando…';
      try { const r = await api.tools.test(b.dataset.test); m.className = 'form-msg ok'; m.textContent = r.to ? `Enviado a ${r.to}. Revisa tu bandeja (y la de spam).` : 'Enviado.'; } catch (ex) { m.className = 'form-msg err'; m.textContent = api.errMsg(ex); } };
  }

  /* importar propiedades desde CSV (Excel → Guardar como CSV) */
  const CSV_COLS = ['titulo', 'operacion', 'tipo', 'estado', 'precio', 'moneda', 'zona', 'ubicacion_visible', 'direccion_privada', 'recamaras', 'banos', 'estacionamientos', 'construccion_m2', 'terreno_m2', 'antiguedad', 'descripcion', 'propietario', 'telefono_propietario'];
  function parseCsv(text) {
    text = String(text || '').replace(/^\uFEFF/, ''); const first = text.split(/\r?\n/)[0] || '';
    const sep = [';', ',', '\t'].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
      if (ch === '"') q = true; else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const head = (rows.shift() || []).map((h) => CRX.slugify(h).replace(/-/g, '_'));
    return rows.filter((r) => r.some((c) => String(c).trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, String(r[i] ?? '').trim()])));
  }
  function csvRow(o, zones) {
    const n = (v) => { const x = Number(String(v || '').replace(/[^\d.]/g, '')); return x > 0 ? x : null; };
    const op = /rent/i.test(o.operacion) ? 'renta' : /vent|vend/i.test(o.operacion) ? 'venta' : '';
    const t = CRX.slugify(o.tipo); const type = /depa|depto/.test(t) ? 'departamento' : /nave|bodega|industrial/.test(t) ? 'nave' : /terreno|lote/.test(t) ? 'terreno' : /casa/.test(t) ? 'casa' : '';
    const errs = [];
    if (!o.titulo || o.titulo.length < 3) errs.push('falta el título'); if (!op) errs.push('operación: venta o renta'); if (!type) errs.push('tipo: casa, departamento, terreno o nave');
    const price = n(o.precio); const status = /disp|public/i.test(o.estado) ? 'disponible' : 'borrador';
    if (status === 'disponible' && !price) errs.push('para publicar necesita precio');
    const zone = o.zona ? (zones || []).find((z) => CRX.slugify(z.name) === CRX.slugify(o.zona)) : null;
    return { errs, zoneName: o.zona || '', newZone: !!o.zona && !zone, owner: o.propietario || '', ownerPhone: o.telefono_propietario || '',
      row: { title: String(o.titulo || '').slice(0, 120), operation: op, type, status, price, price_on_request: !price, currency: /usd|d[oó]lar/i.test(o.moneda) ? 'USD' : 'MXN', zone_id: zone ? zone.id : null,
        public_location: o.ubicacion_visible || o.zona || null, address_private: o.direccion_privada || null, bedrooms: n(o.recamaras) ? Math.round(n(o.recamaras)) : null, bathrooms: n(o.banos), parking: n(o.estacionamientos) ? Math.round(n(o.estacionamientos)) : null,
        construction_m2: n(o.construccion_m2), land_m2: n(o.terreno_m2), age_years: n(o.antiguedad) ? Math.round(n(o.antiguedad)) : null, description: o.descripcion || '' } };
  }
  function bindImport() {
    $('#t-tpl').onclick = () => {
      const ex = ['Casa de 3 recámaras con patio', 'venta', 'casa', 'borrador', '1850000', 'MXN', 'Zona Norte', 'Zona Norte, Reynosa', 'Calle Ejemplo 123', '3', '2', '2', '140', '160', '8', 'Casa en esquina, cerca de escuelas.', 'Nombre del dueño', '8990000000'];
      const csv = '\uFEFF' + CSV_COLS.join(',') + '\n' + ex.map((x) => `"${x}"`).join(',') + '\n';
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'plantilla-propiedades-crumex.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    };
    $('#t-csv').onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const refs = await loadRefs(['zones', 'properties', 'contacts']);
      const items = parseCsv(await f.text()).slice(0, 500).map((o) => csvRow(o, refs.zones));
      const titles = new Set((refs.properties || []).map((p) => CRX.slugify(p.title)));
      items.forEach((it) => { if (!it.errs.length && titles.has(CRX.slugify(it.row.title))) it.dup = true; });
      const good = items.filter((it) => !it.errs.length && !it.dup);
      const newZones = [...new Set(good.filter((it) => it.newZone).map((it) => it.zoneName))];
      $('#t-prev').innerHTML = items.length ? `<p><b>${good.length}</b> de ${items.length} filas listas para importar${newZones.length ? ` · se crearán las zonas: ${esc(newZones.join(', '))}` : ''}.</p>
        <div class="tbl-wrap"><table><thead><tr><th><span class="sr-only">Foto</span></th><th>Título</th><th>Operación</th><th>Tipo</th><th>Precio</th><th>Zona</th><th>Propietario</th></tr></thead><tbody>${items.slice(0, 60).map((it) => `<tr class="${it.errs.length ? 'imp-err' : it.dup ? 'imp-dup' : ''}"><td>${it.errs.length ? '✕' : it.dup ? '=' : '✓'}</td><td>${esc(it.row.title)}${it.errs.length ? `<br><small>${esc(it.errs.join(' · '))}</small>` : it.dup ? '<br><small>Ya existe una con ese título; se omite</small>' : ''}</td><td>${esc(it.row.operation)}</td><td>${esc(CRX.TYPES[it.row.type] || '')}</td><td>${it.row.price ? '$' + Number(it.row.price).toLocaleString('es-MX') + ' ' + it.row.currency : 'A consultar'}</td><td>${esc(it.zoneName)}</td><td>${esc(it.owner)}</td></tr>`).join('')}</tbody></table></div>
        ${items.length > 60 ? `<p class="muted">Se muestran 60 de ${items.length} filas.</p>` : ''}
        <div class="row-act"><button class="btn btn-gold" id="t-go"${good.length ? '' : ' disabled'}>Importar ${good.length} propiedades</button><span class="form-msg" id="t-imsg" role="status"></span></div>` : '<p class="form-msg err">El archivo no tiene filas. Usa la plantilla.</p>';
      const go = $('#t-go'); if (!go) return;
      go.onclick = async () => {
        go.disabled = true; const m = $('#t-imsg'); let done = 0, fail = 0;
        const zoneId = {}; (refs.zones || []).forEach((z) => { zoneId[CRX.slugify(z.name)] = z.id; });
        const byPhone = {}; (refs.contacts || []).forEach((c) => { if (c.phone) byPhone[String(c.phone).replace(/\D/g, '')] = c.id; });
        for (const it of good) {
          try {
            if (it.zoneName && !zoneId[CRX.slugify(it.zoneName)]) zoneId[CRX.slugify(it.zoneName)] = (await api.upsert('zones', { name: it.zoneName }, { isNew: true })).id;
            if (it.zoneName) it.row.zone_id = zoneId[CRX.slugify(it.zoneName)];
            const ph = it.ownerPhone.replace(/\D/g, '');
            if (it.owner && (ph.length >= 7)) { if (!byPhone[ph]) byPhone[ph] = (await api.upsert('contacts', { full_name: it.owner, phone: it.ownerPhone, kinds: ['propietario'], notes: 'Importado desde CSV' }, { isNew: true })).id; it.row.owner_id = byPhone[ph]; }
            await api.properties.save(it.row, []); done++;
          } catch (ex) { fail++; }
          m.className = 'form-msg'; m.textContent = `Importando… ${done + fail} de ${good.length}`;
        }
        m.className = 'form-msg ' + (fail ? 'err' : 'ok'); m.textContent = `Listo: ${done} propiedades importadas${fail ? `, ${fail} con error` : ''}. Las que no decían "disponible" quedaron como borrador.`;
        CRX.toast(`${done} propiedades importadas`, 'ok');
      };
    };
  }

  /* ===================== Tablas genéricas ===================== */
  async function viewResource(key, pre) {
    const R = RES[key]; pre = pre || {};
    const refs = pre.refs || await loadRefs(Object.keys(LISTS));
    const rows = pre.rows || await api.list(key, { order: R.order, asc: R.asc });
    if (!pre.keepActions) {
      if (!R.editOnly && (!R.adminNew || ROLE_ADMIN())) { $('#view-actions').innerHTML = '<button class="btn btn-gold btn-sm" id="nr">+ Nuevo</button>'; $('#nr').onclick = () => editRow(key, null, refs); }
      else $('#view-actions').innerHTML = '';
    }
    const filters = (R.filters || []).map(([k, l, o]) => `<select data-f="${k}" aria-label="${esc(l)}"><option value="">${esc(l)}: todos</option>${OPT(o).map((x) => `<option value="${x.value}">${esc(x.label)}</option>`).join('')}</select>`).join('');
    $('#view').innerHTML = `${R.hint ? `<p class="note muted">${esc(R.hint)}</p>` : ''}<div class="bar"><input type="search" id="q" class="grow" placeholder="Buscar…" aria-label="Buscar">${filters}</div><div id="tb"></div>`;
    const draw = () => {
      const q = $('#q').value.toLowerCase(); const fs = $$('[data-f]').map((s) => [s.dataset.f, s.value]).filter(([, v]) => v);
      const l = rows.filter((r) => fs.every(([k, v]) => r[k] === v) && (!q || JSON.stringify(r).toLowerCase().includes(q)));
      $('#tb').innerHTML = l.length ? `<div class="tbl-wrap"><table><thead><tr>${R.cols.map((c) => `<th>${esc(c[0])}</th>`).join('')}<th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${l.map((r) => `<tr>${R.cols.map((c) => `<td>${c[2] ? c[1](r, refs) : esc(c[1](r, refs))}</td>`).join('')}<td class="act"><button class="btn btn-line btn-sm" data-edit="${esc(r[R.pk || 'id'])}">${R.editOnly ? 'Editar' : 'Abrir'}</button>${ROLE_ADMIN() && !R.editOnly ? ` <button class="btn btn-danger btn-sm" data-del="${esc(r[R.pk || 'id'])}">Borrar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${rows.length ? 'Sin resultados.' : 'Aún no hay registros.'}</div>`;
    };
    $('#q').addEventListener('input', draw); $$('[data-f]').forEach((s) => s.addEventListener('change', draw)); draw();
    $('#tb').onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.edit) editRow(key, rows.find((r) => String(r[R.pk || 'id']) === b.dataset.edit), refs);
      if (b.dataset.del && await CRX.ask('¿Borrar este registro? No se puede deshacer.', { ok: 'Borrar', danger: true })) { await guard(() => api.remove(key, b.dataset.del), 'Registro borrado'); route(); }
    };
  }

  function editRow(key, row, refs, preset) {
    const R0 = RES[key]; const isNew = !row; row = row || Object.assign({}, preset || {});
    const R = Object.assign({}, R0, { fields: R0.fields.filter((f) => !f.adminOnly || ROLE_ADMIN()) });
    R.fields.forEach((f) => { if (f.type === 'boolts') f._prev = row[f.k] || null; });
    let extra = '';
    if (key === 'leads' && !isNew) {
      const linked = row.contact_id ? refLabel(refs, 'contacts', row.contact_id) : '';
      extra = `<div class="quick"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waUrl(row.phone, `Hola ${String(row.full_name).split(' ')[0]}, te escribo de INMOBILIARIA CRUMEX.`))}">WhatsApp</a>
        <span class="tel">Tel. <b>${esc(fph(row.phone))}</b></span>
        ${linked ? `<span class="badge ok">Contacto: ${esc(linked)}</span>` : '<button type="button" class="btn btn-line btn-sm" id="to-contact">Convertir en contacto</button>'}
        <button type="button" class="btn btn-line btn-sm" id="to-visit">Agendar visita</button>
        <button type="button" class="btn btn-line btn-sm" data-review="${esc(row.id)}">Pedir reseña</button>
        <small class="muted">Recibido ${esc(CRX.fmtDate(row.created_at))} · ${esc(ago(row.created_at))}</small></div>`;
    }
    if (key === 'contacts' && !isNew) extra = `<div class="quick">${row.phone ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waUrl(row.phone, `Hola ${String(row.full_name || '').split(' ')[0]}, te escribo de INMOBILIARIA CRUMEX.`))}">WhatsApp</a><button type="button" class="btn btn-line btn-sm" data-review="${esc(row.id)}">Pedir reseña en Google</button>` : ''}<small class="muted">Su expediente (identificación y comprobantes) está abajo.</small></div>`;
    if (key === 'articles' && !isNew && row.slug) extra = `<div class="quick"><span class="muted">Dirección en el sitio: <b>guias.html?a=${esc(row.slug)}</b></span>${row.published ? `<a class="btn btn-line btn-sm" href="guias.html?a=${encodeURIComponent(row.slug)}" target="_blank" rel="noopener">Ver en el sitio ↗</a>` : ''}</div>`;
    if (key === 'profiles') {
      const ph = row.photo_path ? api.photoUrl(row.photo_path) : '';
      extra = `<div class="quick pf-photo"><span class="pf-av" id="pf-av">${ph ? `<img src="${esc(ph)}" alt="">` : esc(String(row.full_name || '?').trim().charAt(0).toUpperCase())}</span>
        <label class="btn btn-line btn-sm">Subir foto<input type="file" accept="image/*" id="pf-file" hidden></label>
        <button type="button" class="btn btn-line btn-sm" id="pf-del"${ph ? '' : ' hidden'}>Quitar foto</button>
        <small class="muted" id="pf-msg">Foto de frente y con buena luz. Sale en el sitio, en "Quién te atiende".</small></div>`;
    }
    if (key === 'zones') extra = `<div class="zpick" id="zpick" aria-label="Mapa para elegir el punto de la zona"></div><p class="muted" style="margin:6px 0 14px;font-size:.85rem">Toca el mapa para marcar el centro aproximado de la zona.</p>`;
    openDlg((isNew ? (R.fem ? 'Nueva ' : 'Nuevo ') : 'Editar ') + R.singular, `<form id="rf" novalidate>${extra}<div class="fgrid">${R.fields.map((f) => fieldHtml(f, row[f.k], refs, isNew)).join('')}</div><p class="form-msg err" id="rf-err" role="alert"></p><div class="dlg-foot"><button type="button" class="btn btn-line" data-close>Cancelar</button><button class="btn btn-gold" type="submit">Guardar</button></div></form>`, key === 'zones');
    if (key === 'zones' && CRX.map) CRX.map.picker($('#zpick'), { lat: row.lat, lng: row.lng }, (la, ln) => { $('#f-lat').value = la; $('#f-lng').value = ln; dirty = true; }).catch(() => { $('#zpick').innerHTML = '<p class="muted" style="padding:20px">No se pudo cargar el mapa. Escribe la latitud y longitud (en Google Maps, clic derecho sobre el punto).</p>'; });
    if (key === 'articles') {
      const ta = $('#f-body'); const pv = document.createElement('div'); pv.className = 'art-prev full';
      pv.innerHTML = '<div class="art-prev-h">Vista previa</div><div class="prose" id="art-prev"></div>';
      ta.closest('.field').after(pv);
      const upd = () => { $('#art-prev').innerHTML = CRX.guideHtml(ta.value) || '<p class="muted">Escribe el contenido para ver cómo se verá en el sitio.</p>'; };
      ta.addEventListener('input', upd); upd();
    }
    if (key === 'profiles') {
      $('#pf-file').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return; $('#pf-msg').textContent = 'Subiendo…';
        try { const blob = await CRX.fileToWebp(f, 600, 0.82); const u = await api.uploadImage(blob); row.photo_path = u.path; dirty = true;
          $('#pf-av').innerHTML = `<img src="${esc(api.photoUrl(u.path))}" alt="">`; $('#pf-del').hidden = false; $('#pf-msg').textContent = 'Lista. Guarda para que se vea en el sitio.'; }
        catch (err) { $('#pf-msg').textContent = api.errMsg(err); }
      };
      $('#pf-del').onclick = () => { row.photo_path = null; dirty = true; $('#pf-av').textContent = String(row.full_name || '?').trim().charAt(0).toUpperCase(); $('#pf-del').hidden = true; $('#pf-msg').textContent = 'Guarda para quitarla del sitio.'; };
    }
    $$('[data-review]').forEach((b) => { b.onclick = () => askReview(row.full_name, row.phone); });
    if (key === 'contacts' && !isNew) {
      $('#rf .fgrid').insertAdjacentHTML('afterend', `<div class="fsec">Expediente del cliente (privado)</div><p class="muted" style="font-size:.85rem;margin:0 0 8px">Para compraventas y rentas de monto alto, la ley antilavado pide identificar al cliente: identificación, comprobante de domicilio, constancia de situación fiscal y, si es empresa, acta constitutiva y poder del representante. Revisa los montos con tu contador.</p><div id="cdocs-box"></div>`);
      drawDocs({ id: row.id, contact: true }, '#cdocs-box');
    }
    if (key === 'visits' && !isNew && row.feedback) {
      const f = row.feedback; $('#rf .fgrid').insertAdjacentHTML('beforebegin', `<div class="quick fb-view"><b>${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</b><span>Le interesa: ${esc({ si: 'Sí', tal_vez: 'Tal vez', no: 'No' }[f.interest] || '—')}</span>${f.liked ? `<span>Le gustó: ${esc(f.liked)}</span>` : ''}${f.concern ? `<span>Le preocupa: ${esc(f.concern)}</span>` : ''}</div>`);
    }
    const tc = $('#to-contact'); if (tc) tc.onclick = () => leadToContact(row);
    const tv = $('#to-visit'); if (tv) tv.onclick = () => { const d = new Date(Date.now() + DAY); d.setHours(11, 0, 0, 0); editRow('visits', null, refs, { lead_id: row.id, property_id: row.property_id || (row.payload && null), scheduled_at: d.toISOString() }); };
    $('#rf').addEventListener('submit', async (e) => {
      e.preventDefault(); const err = $('#rf-err'); err.textContent = '';
      let data = readFields(R.fields, e.target, isNew);
      const miss = R.fields.find((f) => f.req && !f.onlyNew && f.type !== 'boolts' && (data[f.k] == null || data[f.k] === ''));
      if (miss) return (err.textContent = 'Falta: ' + miss.label);
      if (isNew && R.fields.find((f) => f.type === 'boolts' && f.req && f.onlyNew) && !data.privacy_accepted_at) return (err.textContent = 'Confirma lo del aviso de privacidad.');
      try {
        data = Object.assign({}, row, data);
        if (R.before) data = R.before(data, isNew);
        if (R.updateCols) { const d = {}; R.updateCols.forEach((c) => { d[c] = data[c]; }); d.id = row.id; data = d; }
        await api.upsert(key, data, { isNew }); CRX.toast('Guardado', 'ok'); closeDlg(); route();
      } catch (ex) { err.textContent = api.errMsg(ex); }
    });
  }
  function exportCsv(rows) {
    const cols = ['created_at', 'kind', 'status', 'full_name', 'phone', 'email', 'message', 'source'];
    const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const txt = '﻿' + [cols.join(',')].concat(rows.map((r) => cols.map((c) => cell(r[c])).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = 'prospectos.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ===================== Captación de propietarios ===================== */
  const OWNER_KINDS = ['captacion', 'valuacion'];
  const OWNER_STAGE = { nuevo: 'Nuevo', contactado: 'Contactado', seguimiento: 'Visita o propuesta', ganado: 'Firmó con nosotros', descartado: 'Descartado' };
  async function viewCaptacion() {
    const refs = await loadRefs(['leads', 'profiles', 'zones', 'properties', 'contacts']);
    const rows = refs.leads.filter((l) => OWNER_KINDS.includes(l.kind)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const month = rows.filter((r) => Date.now() - new Date(r.created_at) < 30 * DAY);
    const won = rows.filter((r) => r.status === 'ganado');
    newOwners = rows.filter((r) => r.status === 'nuevo').length; navRender('captacion');
    $('#view-actions').innerHTML = '<a class="btn btn-line btn-sm" href="#/wanted">Lo que buscan</a> <a class="btn btn-line btn-sm" href="vender.html" target="_blank" rel="noopener">Ver página ↗</a> <button class="btn btn-gold btn-sm" id="nr">+ Nuevo propietario</button>';
    $('#nr').onclick = () => editRow('leads', null, refs, { kind: 'captacion', source: 'panel', privacy_accepted_at: new Date().toISOString() });
    $('#view').innerHTML = `<div class="kpis">
        <div class="kpi"><b class="num">${rows.filter((r) => r.status === 'nuevo').length}</b><span>Sin atender</span></div>
        <div class="kpi"><b class="num">${month.length}</b><span>Propietarios en 30 días</span></div>
        <div class="kpi"><b class="num">${month.filter((r) => r.payload && r.payload.recomendado_por).length}</b><span>Por recomendación (30 días)</span></div>
        <div class="kpi"><b class="num">${won.length}</b><span>Firmaron con nosotros</span></div></div>
      <div class="bar"><input type="search" id="cq" class="grow" placeholder="Buscar por nombre, teléfono o zona" aria-label="Buscar"><select id="cop" aria-label="Operación"><option value="">Rentar y vender</option><option value="rent">Quieren rentar</option><option value="vend">Quieren vender</option></select><select id="cas" aria-label="Asignados"><option value="">Todos</option><option value="me">Míos</option><option value="none">Sin asignar</option></select></div>
      <div class="board" id="cboard"></div>
      <p class="note muted">Llegan aquí las solicitudes de la página de propietarios (por pasos, estimador y recomendaciones). Con <b>Convertir en propiedad</b> se crea el contacto del propietario y la propiedad en borrador con sus datos.</p>`;
    const val = (r, k) => (r.payload && r.payload[k]) || '';
    const draw = () => {
      const q = $('#cq').value.toLowerCase(), op = $('#cop').value, fa = $('#cas').value;
      const l = rows.filter((r) => (!q || [r.full_name, r.phone, val(r, 'zona'), r.message].join(' ').toLowerCase().includes(q))
        && (!op || String(val(r, 'operacion')).toLowerCase().includes(op))
        && (fa === '' || (fa === 'me' ? String(r.assigned_to) === String(user.id) : fa === 'none' ? !r.assigned_to : true)));
      $('#cboard').innerHTML = Object.entries(OWNER_STAGE).map(([st, label]) => {
        const items = l.filter((r) => r.status === st);
        return `<section class="lane"><header><b>${esc(label)}</b><span>${items.length}</span></header><div class="lane-b">${items.map((r) => {
          const facts = [val(r, 'tipo'), val(r, 'zona'), val(r, 'm2_aprox') && val(r, 'm2_aprox') + ' m²', val(r, 'm2_terreno') && val(r, 'm2_terreno') + ' m² terreno', val(r, 'recamaras') && val(r, 'recamaras') + ' rec.'].filter(Boolean).join(' · ');
          const late = st === 'nuevo' && Date.now() - new Date(r.created_at) > DAY;
          return `<article class="lcard ocard${late ? ' late' : ''}" data-id="${esc(r.id)}">
            <div class="lc-top"><span class="badge ${/vend/i.test(val(r, 'operacion')) && !/rent/i.test(val(r, 'operacion')) ? 'navy' : 'gold'}">${esc(val(r, 'operacion') || CRX.LEAD_KINDS[r.kind])}</span><small title="${esc(CRX.fmtDate(r.created_at))}">${esc(ago(r.created_at))}</small></div>
            <b>${esc(r.full_name)}</b><span class="muted">${esc(fph(r.phone))}</span>
            ${facts ? `<small class="lc-prop">${esc(facts)}</small>` : ''}
            ${val(r, 'precio_esperado') ? `<small>Espera: <b>$${esc(val(r, 'precio_esperado'))}</b></small>` : ''}
            ${val(r, 'estimado') ? `<small class="muted">Referencia: ${esc(val(r, 'estimado'))}</small>` : ''}
            ${val(r, 'recomendado_por') ? `<small class="lc-ref">🤝 Recomendó ${esc(val(r, 'recomendado_por'))} (${esc(val(r, 'recomendante_tel'))})</small>` : ''}
            ${val(r, 'busqueda') ? `<small class="lc-ref">🎯 ${esc(val(r, 'busqueda'))}</small>` : ''}
            ${r.assigned_to ? `<small class="lc-who">👤 ${esc(refLabel(refs, 'profiles', r.assigned_to))}</small>` : ''}
            ${r.channel && r.channel !== 'Directo' ? `<small class="lc-who" title="Llegó desde">↗ ${esc(r.channel)}</small>` : ''}
            <div class="lc-act"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waUrl(r.phone, `Hola ${String(r.full_name).split(' ')[0]}, te escribo de INMOBILIARIA CRUMEX por tu ${val(r, 'tipo') ? String(val(r, 'tipo')).toLowerCase() : 'propiedad'}${val(r, 'zona') ? ' en ' + val(r, 'zona') : ''}.`))}">WhatsApp</a><button class="btn btn-line btn-sm" data-open="${esc(r.id)}">Abrir</button>
              ${r.property_id ? `<a class="btn btn-line btn-sm" href="#/propiedades" data-goprop="${esc(r.property_id)}">Ver propiedad</a>` : `<button class="btn btn-gold btn-sm" data-conv="${esc(r.id)}">Convertir en propiedad</button>`}</div>
            <select data-cmove="${esc(r.id)}" aria-label="Mover a">${Object.entries(OWNER_STAGE).map(([v, t]) => `<option value="${v}"${v === st ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
          </article>`;
        }).join('') || '<p class="lane-empty">Sin propietarios aquí</p>'}</div></section>`;
      }).join('');
    };
    ['#cq', '#cop', '#cas'].forEach((x) => $(x).addEventListener(x === '#cq' ? 'input' : 'change', draw)); draw();
    $('#cboard').addEventListener('change', async (e) => {
      const m = e.target.closest('[data-cmove]'); if (!m) return; const r = rows.find((x) => x.id === m.dataset.cmove);
      const res = await guard(() => api.upsert('leads', { id: r.id, status: m.value }, { isNew: false }), 'Movido a ' + OWNER_STAGE[m.value]); if (res.ok) { r.status = m.value; draw(); }
    });
    $('#cboard').addEventListener('click', async (e) => {
      const o = e.target.closest('[data-open]'); if (o) { editRow('leads', rows.find((x) => x.id === o.dataset.open), refs); return; }
      const c = e.target.closest('[data-conv]'); if (c) { await ownerToProperty(rows.find((x) => x.id === c.dataset.conv), refs); return; }
      const g = e.target.closest('[data-goprop]'); if (g) { e.preventDefault(); location.hash = '#/propiedades'; await new Promise((ok) => setTimeout(ok, 350)); const p = (await api.properties.list()).find((x) => x.id === g.dataset.goprop); if (p) editProperty(p); }
    });
  }
  // prospecto de captación → contacto propietario + propiedad en borrador
  async function ownerToProperty(lead, refs) {
    if (!lead) return;
    if (!(await CRX.ask(`Se creará el contacto de ${lead.full_name} como propietario y una propiedad en borrador con sus datos. ¿Continuar?`, { ok: 'Convertir' }))) return;
    const p = lead.payload || {};
    const n = (v) => { const x = Number(String(v || '').replace(/[^\d.]/g, '')); return x > 0 ? x : null; };
    try {
      let contactId = lead.contact_id;
      if (!contactId) {
        const c = await api.upsert('contacts', { full_name: lead.full_name, phone: lead.phone || null, email: lead.email || null, kinds: ['propietario'], notes: 'Captado desde ' + (lead.source === 'web' ? 'el sitio' : 'el panel') + (p.recomendado_por ? ` · lo recomendó ${p.recomendado_por} (${p.recomendante_tel || ''})` : '') }, { isNew: true });
        contactId = c.id;
      }
      const op = /vend/i.test(p.operacion || '') && !/rent/i.test(p.operacion || '') ? 'venta' : 'renta';
      const type = CRX.TYPES[p.tipo_clave] ? p.tipo_clave : ((Object.entries(CRX.TYPES).find(([, v]) => v === p.tipo) || ['casa'])[0]);
      const zone = (refs.zones || []).find((z) => CRX.slugify(z.name) === CRX.slugify(p.zona || ''));
      const price = n(p.precio_esperado);
      const where = zone ? zone.name : (p.zona || 'Reynosa');
      const row = { operation: op, type, status: 'borrador', title: `${CRX.TYPES[type]} en ${op} en ${where}`.slice(0, 120), description: lead.message || '', price, price_on_request: !price, currency: 'MXN',
        zone_id: zone ? zone.id : null, public_location: where, construction_m2: n(p.m2_aprox), land_m2: n(p.m2_terreno), bedrooms: n(p.recamaras) ? Math.round(n(p.recamaras)) : null, bathrooms: n(p.banos),
        owner_id: contactId, advisor_id: lead.assigned_to || user.id };
      const id = await api.properties.save(row, []);
      await api.upsert('leads', { id: lead.id, status: 'ganado', contact_id: contactId, property_id: id }, { isNew: false });
      CRX.toast('Propiedad creada en borrador. Completa fotos y descripción.', 'ok');
      location.hash = '#/propiedades'; await new Promise((ok) => setTimeout(ok, 400));
      const prop = (await api.properties.list()).find((x) => x.id === id); if (prop) editProperty(prop);
    } catch (ex) { CRX.toast(api.errMsg(ex), 'err'); }
  }

  /* ===================== Actividad (bitácora) ===================== */
  async function viewActivity() {
    if (!ROLE_ADMIN()) { $('#view').innerHTML = '<div class="panel"><p>Solo un administrador puede ver la actividad del equipo.</p></div>'; return; }
    const refs = await loadRefs(['profiles']);
    const T = { '': 'Todo', properties: 'Propiedades', leads: 'Prospectos', visits: 'Visitas', deals: 'Operaciones', contacts: 'Contactos', users: 'Equipo y accesos', settings: 'Ajustes', documents: 'Documentos', articles: 'Guías', zones: 'Zonas', testimonials: 'Testimonios' };
    const NOUN = { properties: 'la propiedad', leads: 'el prospecto', visits: 'la visita', deals: 'la operación', contacts: 'el contacto', users: 'el usuario', settings: 'los', documents: 'el documento', articles: 'la guía', zones: 'la zona', testimonials: 'el testimonio' };
    const VERB = { crear: 'creó', editar: 'editó', borrar: 'borró', estado: 'cambió el estado de' };
    $('#view').innerHTML = `<div class="bar"><select id="au" aria-label="Persona"><option value="">Todo el equipo</option>${(refs.profiles || []).map((u) => `<option value="${esc(u.id)}">${esc(u.full_name || u.email || 'Usuario')}</option>`).join('')}</select><select id="at" aria-label="Tipo">${Object.entries(T).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></div>
      <div class="panel"><div id="act"></div><p class="muted" id="act-empty" hidden>No hay movimientos con estos filtros.</p><button class="btn btn-line btn-sm" id="act-more" type="button" hidden>Ver anteriores</button></div>
      <p class="note muted">Aquí queda quién creó, editó, borró o entró al panel, de los últimos 13 meses. Sirve para saber quién cambió un precio o un estado y para cuidar los accesos.</p>`;
    let rows = [];
    const line = (x) => {
      const who = `<b>${esc(x.user_name || 'Alguien')}</b>`;
      const what = x.action === 'entrar' ? `${who} entró al panel`
        : x.table === 'settings' ? `${who} cambió los ajustes del sitio`
        : `${who} ${VERB[x.action] || x.action} ${NOUN[x.table] || x.target || ''} <span class="act-l">${esc(x.label || '')}</span>`;
      return `<li class="act-i a-${esc(x.action)}"><time datetime="${esc(x.at)}">${esc(new Date(x.at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))}</time><span class="act-av" aria-hidden="true">${esc(String(x.user_name || '?').trim().charAt(0).toUpperCase())}</span><div>${what}${x.detail ? `<small>${esc(x.detail)}</small>` : ''}</div></li>`;
    };
    const draw = () => {
      let day = ''; let html = '';
      rows.forEach((x) => {
        const d = new Date(x.at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (d !== day) { html += (day ? '</ol>' : '') + `<h3 class="act-day">${esc(d)}</h3><ol class="act">`; day = d; }
        html += line(x);
      });
      $('#act').innerHTML = html + (day ? '</ol>' : '');
      $('#act-empty').hidden = !!rows.length;
    };
    const load = async (more) => {
      const before = more && rows.length ? rows[rows.length - 1].at : '';
      const r = await api.activity({ u: $('#au').value, t: $('#at').value, before });
      rows = more ? rows.concat(r) : r; $('#act-more').hidden = r.length < 150; draw();
    };
    $('#au').onchange = () => load(false); $('#at').onchange = () => load(false); $('#act-more').onclick = () => load(true);
    await load(false);
  }

  /* ===================== Ajustes ===================== */
  async function viewSettings() {
    const s = await api.getSettings();
    if (!ROLE_ADMIN()) { $('#view').innerHTML = '<div class="panel"><p>Solo un administrador puede cambiar los ajustes del sitio.</p></div>'; return; }
    $('#view').innerHTML = `<form id="sf" class="panel" novalidate>${SETTINGS.map(([t, fs]) => `<div class="fsec">${esc(t)}</div><div class="fgrid">${fs.map(([k, l, ty, opts]) => ty === 'select' ? `<div class="field full"><label for="s-${k}">${esc(l)}</label><select id="s-${k}" name="${k}">${opts.map(([v, t]) => `<option value="${v}"${(s[k] || opts[0][0]) === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>${k === 'lead_assign' ? '<span class="hint">El asesor asignado también recibe el aviso por correo si está configurado.</span>' : k === 'auto_reply' ? '<span class="hint">Mientras no verifiques tu dominio en Resend, Resend solo deja mandar correos a tu propia dirección.</span>' : ''}</div>` : ty === 'textarea' ? `<div class="field full"><label for="s-${k}">${esc(l)}</label><textarea id="s-${k}" name="${k}" rows="6">${esc(s[k] || '')}</textarea></div>` : `<div class="field"><label for="s-${k}">${esc(l)}</label><input id="s-${k}" name="${k}"${ty === 'tel' ? ' type="tel"' : ''} value="${esc(s[k] || '')}"></div>`).join('')}</div>`).join('')}
      <p class="note muted">Los textos legales base del sitio son una plantilla general. Pide a un abogado que revise tu aviso de privacidad y tus términos antes de publicar.</p>
      <div class="sticky-save"><button class="btn btn-gold" type="submit">Guardar ajustes</button><span class="muted" id="sf-state"></span></div></form>`;
    $('#sf').addEventListener('input', () => { $('#sf-state').textContent = 'Cambios sin guardar'; });
    $('#sf').addEventListener('submit', async (e) => {
      e.preventDefault(); const o = {}; SETTINGS.forEach(([, fs]) => fs.forEach(([k]) => { o[k] = e.target.elements[k].value.trim(); })); setTimeout(loadSite, 800);
      o.whatsapp = o.whatsapp.replace(/\D/g, '');
      if (o.whatsapp && o.whatsapp.length < 12) { CRX.toast('El WhatsApp debe llevar lada de país, por ejemplo 52 + 10 dígitos.', 'err'); return; }
      const r = await guard(() => api.saveSettings(o), 'Ajustes guardados');
      if (r.ok) $('#sf-state').textContent = 'Guardado';
    });
  }

  /* ===================== Estudio de publicaciones ===================== */
  // Arma una imagen lista para Instagram / Facebook / estados de WhatsApp con la foto, precio y datos de la propiedad.
  const FORMATS = { post: [1080, 1350, 'Publicación'], story: [1080, 1920, 'Historia'], square: [1080, 1080, 'Cuadrado'] };
  const imgCache = {};
  function loadImg(url) {
    if (!url) return Promise.resolve(null);
    if (!imgCache[url]) imgCache[url] = new Promise((res) => {
      const im = new Image(); if (/^https?:/.test(url)) im.crossOrigin = 'anonymous';
      im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
    });
    return imgCache[url];
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function wrap(ctx, text, maxW, maxLines) {
    const words = String(text).split(/\s+/).filter(Boolean); const lines = []; let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !line) line = t; else { lines.push(line); line = w; }
      if (lines.length === maxLines) break;
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && lines.join(' ').length < words.join(' ').length) {
      let last = lines[maxLines - 1]; while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last.replace(/[\s,.;:]+$/, '') + '…';
    }
    return lines;
  }
  function spaced(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
  function drawCover(ctx, im, x, y, w, h) {
    const r = Math.max(w / im.naturalWidth, h / im.naturalHeight); const sw = w / r, sh = h / r;
    ctx.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }
  function drawBrand(ctx, x, y, light) {
    ctx.save(); roundRect(ctx, x, y, 76, 76, 18); ctx.fillStyle = '#0E1E33'; ctx.fill(); ctx.strokeStyle = 'rgba(158,195,236,.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#9EC3EC'; ctx.font = '700 46px "Roboto Slab", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('C', x + 38, y + 41);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    spaced(ctx, 6); ctx.font = '700 17px Archivo, system-ui, sans-serif'; ctx.fillStyle = '#9EC3EC'; ctx.fillText('INMOBILIARIA', x + 96, y + 30);
    spaced(ctx, 3); ctx.font = '700 36px "Roboto Slab", Georgia, serif'; ctx.fillStyle = light ? '#0E1E33' : '#FFFFFF'; ctx.fillText('CRUMEX', x + 96, y + 68);
    spaced(ctx, 0); ctx.restore();
  }
  function pill(ctx, text, x, y, bg, fg, font, padX, h) {
    ctx.save(); ctx.font = font; spaced(ctx, 4); const w = ctx.measureText(text).width + padX * 2;
    roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, x + padX, y + h / 2 + 1);
    spaced(ctx, 0); ctx.restore(); return w;
  }
  async function drawPoster(cv, o) {
    const [W, H] = FORMATS[o.fmt]; cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const im = await loadImg(o.photo);
    const light = o.style === 'claro'; const pad = 72;
    const titleSize = o.fmt === 'square' ? 60 : 70; const priceSize = o.fmt === 'square' ? 78 : 92;
    ctx.fillStyle = '#0E1E33'; ctx.fillRect(0, 0, W, H);
    // fondo: foto o retícula de marca
    const photoH = light ? Math.round(H * (o.fmt === 'story' ? 0.6 : o.fmt === 'square' ? 0.56 : 0.6)) : H;
    if (im) drawCover(ctx, im, 0, 0, W, photoH);
    else {
      const gr = ctx.createLinearGradient(0, 0, W, photoH); gr.addColorStop(0, '#1f3a63'); gr.addColorStop(1, '#0E1E33'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, photoH);
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 2; for (let gx = 0; gx < W; gx += 54) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, photoH); ctx.stroke(); } for (let gy = 0; gy < photoH; gy += 54) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      ctx.fillStyle = 'rgba(158,195,236,.85)'; ctx.font = '600 44px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(CRX.TYPES[o.p.type] || '', W / 2, photoH / 2); ctx.textAlign = 'left';
    }
    // marca arriba
    if (!light) { const tg = ctx.createLinearGradient(0, 0, 0, 260); tg.addColorStop(0, 'rgba(14,30,51,.72)'); tg.addColorStop(1, 'rgba(14,30,51,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 260); }
    if (light) { ctx.save(); roundRect(ctx, pad - 18, pad - 18, 400, 112, 22); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill(); ctx.restore(); }
    drawBrand(ctx, pad, pad, light);
    ctx.save(); ctx.font = '700 22px Archivo, sans-serif'; spaced(ctx, 3); const rw = ctx.measureText(o.p.ref_code).width + 40;
    roundRect(ctx, W - pad - rw, pad + 16, rw, 46, 23); ctx.fillStyle = light ? 'rgba(255,255,255,.94)' : 'rgba(14,30,51,.6)'; ctx.fill();
    ctx.fillStyle = light ? '#0E1E33' : '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(o.p.ref_code, W - pad - rw + 20, pad + 40); spaced(ctx, 0); ctx.restore();

    // bloque de texto
    ctx.font = `700 ${titleSize}px "Roboto Slab", Georgia, serif`;
    const tLines = wrap(ctx, o.title, W - pad * 2, o.fmt === 'square' ? 2 : 3);
    const specs = o.specs ? o.specList.slice(0, 4) : [];
    const blockH = 60 + 28 + tLines.length * (titleSize * 1.12) + 20 + 40 + (o.price ? priceSize + 26 : 0) + (specs.length ? 86 : 0) + 110;
    let y;
    if (light) {
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, photoH, W, H - photoH);
      ctx.fillStyle = '#1D5BA6'; ctx.fillRect(0, photoH, W, 8);
      y = photoH + 64;
    } else {
      const top = Math.max(H * 0.28, H - blockH - 40);
      const bg = ctx.createLinearGradient(0, top - 220, 0, H); bg.addColorStop(0, 'rgba(14,30,51,0)'); bg.addColorStop(0.35, 'rgba(14,30,51,.86)'); bg.addColorStop(1, 'rgba(14,30,51,.98)');
      ctx.fillStyle = bg; ctx.fillRect(0, top - 220, W, H - top + 220);
      y = top;
    }
    const ink = light ? '#0E1E33' : '#FFFFFF'; const mut = light ? '#536074' : '#C9D3E0';
    if (o.badge) { pill(ctx, o.badge.toUpperCase(), pad, y, '#1D5BA6', '#FFFFFF', '800 24px Archivo, sans-serif', 26, 54); y += 54 + 30; }
    ctx.fillStyle = ink; ctx.font = `700 ${titleSize}px "Roboto Slab", Georgia, serif`; ctx.textBaseline = 'alphabetic';
    tLines.forEach((ln) => { y += titleSize * 1.02; ctx.fillText(ln, pad, y); y += titleSize * 0.1; });
    y += 22; ctx.fillStyle = mut; ctx.font = '500 32px Archivo, sans-serif';
    ctx.fillText(`${CRX.TYPES[o.p.type] || ''} · ${o.zone}, Reynosa`, pad, y + 30); y += 40;
    if (o.price) { y += 24 + priceSize * 0.84; ctx.fillStyle = light ? '#0E1E33' : '#9EC3EC'; ctx.font = `700 ${priceSize}px "Roboto Slab", Georgia, serif`; ctx.fillText(o.priceText, pad, y); }
    if (specs.length) {
      y += 34; let x = pad;
      specs.forEach((t) => {
        ctx.font = '600 28px Archivo, sans-serif'; const w = ctx.measureText(t).width + 44; if (x + w > W - pad) return;
        roundRect(ctx, x, y, w, 58, 29); ctx.fillStyle = light ? '#F4F5F7' : 'rgba(255,255,255,.1)'; ctx.fill(); ctx.strokeStyle = light ? '#E1E5EB' : 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = ink; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 22, y + 30); ctx.textBaseline = 'alphabetic'; x += w + 12;
      });
      y += 58;
    }
    // pie con contacto
    const fy = H - 74;
    ctx.strokeStyle = light ? '#E1E5EB' : 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, fy - 52); ctx.lineTo(W - pad, fy - 52); ctx.stroke();
    ctx.fillStyle = light ? '#128045' : '#5fd08f'; ctx.font = '700 30px Archivo, sans-serif'; ctx.fillText(o.footer, pad, fy);
    ctx.textAlign = 'right'; ctx.fillStyle = mut; ctx.font = '500 26px Archivo, sans-serif'; ctx.fillText(o.site, W - pad, fy); ctx.textAlign = 'left';
  }
  function captionFor(p, s, url) {
    const own = (v) => v !== null && v !== undefined && v !== '';
    const sp = [];
    if (own(p.bedrooms)) sp.push(`${p.bedrooms} recámaras`); if (own(p.bathrooms)) sp.push(`${Number(p.bathrooms)} baños`);
    if (own(p.parking)) sp.push(`${p.parking} estacionamientos`); if (own(p.construction_m2)) sp.push(`${Number(p.construction_m2).toLocaleString('es-MX')} m² de construcción`);
    if (own(p.land_m2)) sp.push(`${Number(p.land_m2).toLocaleString('es-MX')} m² de terreno`);
    const a = p.attributes || {}; if (own(a.altura_libre_m)) sp.push(`${a.altura_libre_m} m de altura libre`); if (own(a.andenes)) sp.push(`${a.andenes} andenes`);
    const price = CRX.money(p.price, p.currency, p.price_on_request) + (p.operation === 'renta' && !p.price_on_request ? ' al mes' : '');
    const zone = p.zone || p.public_location || 'Reynosa';
    const tagType = { casa: p.operation === 'renta' ? '#CasaEnRenta' : '#CasaEnVenta', departamento: p.operation === 'renta' ? '#DepartamentoEnRenta' : '#DepartamentoEnVenta', terreno: '#TerrenoEnVenta', nave: '#NaveIndustrial' }[p.type] || '';
    const d = String(p.description || '').replace(/\s+/g, ' ').trim();
    const phone = fph(s.phone || window.CRX_CONFIG.PHONE || '');
    return [`${p.operation === 'renta' ? 'EN RENTA' : 'EN VENTA'} · ${p.title}`, '', `📍 ${zone}, Reynosa`, `💰 ${price}`, sp.length ? '✅ ' + sp.join(' · ') : '', d ? '\n' + (d.length > 220 ? d.slice(0, 220).replace(/\s\S*$/, '') + '…' : d) : '',
      '', `Clave ${p.ref_code}. Fotos y detalles:`, url, phone ? `📲 WhatsApp ${phone}` : '', '', ['#Reynosa', '#BienesRaicesReynosa', tagType, '#InmobiliariaCrumex'].filter(Boolean).join(' ')]
      .filter((x, i, arr) => !(x === '' && arr[i - 1] === '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  async function viewStudio() {
    const [all, s] = await Promise.all([api.properties.list(), api.getSettings().catch(() => ({}))]);
    const list = all.filter((p) => p.status !== 'borrador').concat(all.filter((p) => p.status === 'borrador'));
    if (!list.length) { $('#view').innerHTML = '<div class="panel empty">Primero agrega una propiedad. Aquí podrás crear la imagen para tus redes.</div>'; return; }
    const pre = new URLSearchParams(location.hash.split('?')[1] || '').get('p');
    const st = { id: (list.find((p) => p.id === pre) || list[0]).id, fmt: 'post', style: 'marino', photo: 0, price: true, specs: true };
    const phone = fph(s.phone || window.CRX_CONFIG.PHONE || '');
    $('#view').innerHTML = `<div class="studio">
      <form class="panel studio-ctl" id="st-form" novalidate>
        <div class="field"><label for="st-p">Propiedad</label><select id="st-p">${list.map((p) => `<option value="${esc(p.id)}">${esc(p.ref_code)} · ${esc(p.title)}${p.status === 'borrador' ? ' (borrador)' : ''}</option>`).join('')}</select></div>
        <div class="field"><span class="lbl">Formato</span><div class="seg" id="st-fmt">${Object.entries(FORMATS).map(([k, v]) => `<button type="button" data-fmt="${k}" title="${v[0]} × ${v[1]} px">${esc(v[2])}</button>`).join('')}</div></div>
        <div class="field"><span class="lbl">Estilo</span><div class="seg" id="st-style"><button type="button" data-style="marino">Marino</button><button type="button" data-style="claro">Claro</button></div></div>
        <div class="field"><span class="lbl">Foto</span><div class="st-photos" id="st-photos"></div></div>
        <div class="field"><label for="st-badge">Etiqueta</label><input id="st-badge" maxlength="28"></div>
        <div class="field"><label for="st-title">Título en la imagen</label><input id="st-title" maxlength="90"></div>
        <div class="chk-row"><label class="sw sm"><input type="checkbox" id="st-price" checked> Mostrar precio</label><label class="sw sm"><input type="checkbox" id="st-specs" checked> Mostrar datos</label></div>
        <div class="field" style="margin-top:12px"><label for="st-foot">Contacto al pie</label><input id="st-foot" maxlength="48" value="${esc(phone ? 'WhatsApp ' + phone : 'Escríbenos por WhatsApp')}"></div>
        <div class="st-act"><button class="btn btn-gold" type="button" id="st-dl">Descargar imagen</button><span class="muted" id="st-size"></span></div>
        <div class="field" style="margin-top:18px"><label for="st-cap">Texto para la publicación</label><textarea id="st-cap" rows="10"></textarea><span class="hint">Puedes editarlo antes de copiarlo.</span></div>
        <button class="btn btn-line btn-sm" type="button" id="st-copy">Copiar texto</button>
      </form>
      <div class="studio-prev"><canvas id="st-cv" aria-label="Vista previa de la imagen para redes"></canvas><p class="muted" id="st-note"></p></div></div>`;
    const P = () => list.find((p) => p.id === st.id);
    const urlOf = (p) => { const n = String(p.ref_code || '').replace(/\D/g, ''); return new URL(n ? `inmueble.html?id=${Number(n)}&utm_source=redes&utm_medium=social&utm_campaign=estudio` : `inmueble.html?ref=${encodeURIComponent(p.ref_code)}&utm_source=redes&utm_medium=social&utm_campaign=estudio`, location.href).href; };
    const defaults = () => {
      const p = P(); st.photo = 0;
      $('#st-badge').value = p.status === 'cerrada' ? (p.operation === 'renta' ? 'Rentada' : 'Vendida') : p.price_reduced ? 'Precio rebajado' : p.operation === 'renta' ? 'En renta' : 'En venta';
      $('#st-title').value = p.title;
      $('#st-cap').value = captionFor(p, s, urlOf(p));
      $('#st-photos').innerHTML = (p.photos || []).length ? p.photos.map((ph, i) => `<button type="button" data-ph="${i}" aria-label="Usar foto ${i + 1}"><img src="${esc(CRX.img(ph, 240))}" alt=""></button>`).join('') : '<span class="muted">Esta propiedad no tiene fotos: se usará un fondo de marca.</span>';
      $('#st-note').textContent = p.status === 'borrador' ? 'Esta propiedad es un borrador: publícala antes de compartir el enlace.' : '';
    };
    const sync = () => {
      $$('#st-fmt [data-fmt]').forEach((b) => b.classList.toggle('on', b.dataset.fmt === st.fmt));
      $$('#st-style [data-style]').forEach((b) => b.classList.toggle('on', b.dataset.style === st.style));
      $$('#st-photos [data-ph]').forEach((b) => b.classList.toggle('on', Number(b.dataset.ph) === st.photo));
    };
    let pending = 0;
    const render = async () => {
      sync(); const p = P(); const my = ++pending;
      const own = (v) => v !== null && v !== undefined && v !== '';
      const specList = []; if (own(p.bedrooms)) specList.push(`${p.bedrooms} rec.`); if (own(p.bathrooms)) specList.push(`${Number(p.bathrooms)} baños`);
      if (own(p.construction_m2)) specList.push(`${Number(p.construction_m2).toLocaleString('es-MX')} m² const.`); if (own(p.land_m2)) specList.push(`${Number(p.land_m2).toLocaleString('es-MX')} m² terreno`);
      if (p.attributes && own(p.attributes.altura_libre_m)) specList.push(`${p.attributes.altura_libre_m} m altura`); if (own(p.parking)) specList.push(`${p.parking} est.`);
      const ph = (p.photos || [])[st.photo];
      const o = { p, fmt: st.fmt, style: st.style, photo: ph ? ph.url : '', badge: $('#st-badge').value.trim(), title: $('#st-title').value.trim() || p.title,
        zone: p.zone || p.public_location || 'Reynosa', price: st.price && $('#st-price').checked, priceText: CRX.money(p.price, p.currency, p.price_on_request) + (p.operation === 'renta' && !p.price_on_request ? ' / mes' : ''),
        specs: $('#st-specs').checked, specList, footer: $('#st-foot').value.trim(), site: location.host || 'INMOBILIARIA CRUMEX' };
      const off = document.createElement('canvas'); await drawPoster(off, o);
      if (my !== pending) return; const cv = $('#st-cv'); if (!cv) return;
      cv.width = off.width; cv.height = off.height; cv.getContext('2d').drawImage(off, 0, 0);
      cv.dataset.fmt = st.fmt; $('#st-size').textContent = `${off.width} × ${off.height} px`;
    };
    try { await Promise.all([document.fonts.load('700 70px "Roboto Slab"'), document.fonts.load('600 30px Archivo'), document.fonts.load('800 24px Archivo')]); } catch (e) { /* sin fuentes: usa las del sistema */ }
    $('#st-p').value = st.id; defaults(); render();
    $('#st-p').addEventListener('change', (e) => { st.id = e.target.value; defaults(); render(); });
    $('#st-form').addEventListener('click', (e) => {
      const f = e.target.closest('[data-fmt]'); if (f) { st.fmt = f.dataset.fmt; render(); return; }
      const y = e.target.closest('[data-style]'); if (y) { st.style = y.dataset.style; render(); return; }
      const ph = e.target.closest('[data-ph]'); if (ph) { st.photo = Number(ph.dataset.ph); render(); }
    });
    ['#st-badge', '#st-title', '#st-foot'].forEach((q) => $(q).addEventListener('input', CRX.debounce(render, 200)));
    ['#st-price', '#st-specs'].forEach((q) => $(q).addEventListener('change', render));
    $('#st-dl').addEventListener('click', () => {
      const cv = $('#st-cv');
      try {
        cv.toBlob((b) => {
          if (!b) { CRX.toast('No se pudo crear la imagen.', 'err'); return; }
          const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${P().ref_code}-${st.fmt}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
        }, 'image/png');
      } catch (e) { CRX.toast('No se pudo exportar la imagen: la foto viene de un servidor que no lo permite.', 'err'); }
    });
    $('#st-copy').addEventListener('click', async () => {
      const t = $('#st-cap');
      try { await navigator.clipboard.writeText(t.value); CRX.toast('Texto copiado', 'ok'); } catch (e) { t.focus(); t.select(); CRX.toast('Selecciona el texto y cópialo (Ctrl + C)'); }
    });
  }


  /* ===================== Documentos privados de una propiedad ===================== */
  const DOC_KINDS = { escritura: 'Escritura', predial: 'Predial', identificacion: 'Identificación', contrato: 'Contrato', plano: 'Plano', avaluo: 'Avalúo',
    comprobante_domicilio: 'Comprobante de domicilio', comprobante_ingresos: 'Comprobante de ingresos', constancia_fiscal: 'Constancia de situación fiscal', acta_constitutiva: 'Acta constitutiva', poder: 'Poder del representante', otro: 'Otro' };
  const kb = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  async function drawDocs(p, sel) {
    const box = $(sel || '#docs-box'); if (!box) return;
    let docs = [];
    try { docs = p.contact ? await api.docs.listContact(p.id) : await api.docs.list(p.id); } catch (e) { box.innerHTML = `<p class="muted">${esc(api.errMsg(e))}</p>`; return; }
    box.innerHTML = `<div class="docs-up"><select id="doc-kind" aria-label="Tipo de documento">${Object.entries(DOC_KINDS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><label class="btn btn-line btn-sm"><input type="file" id="doc-file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden>Subir documento</label><span class="muted" id="doc-msg">PDF o imagen, hasta ${api.mode === 'local' ? '2' : api.storage === 'cloudinary' ? '10' : '3'} MB. Solo el equipo puede verlos.</span></div>
      ${docs.length ? `<ul class="docs-list">${docs.map((d) => `<li><span class="badge">${esc(DOC_KINDS[d.kind] || d.kind)}</span><span class="dn"><b>${esc(d.name)}</b><small class="muted">${esc(kb(d.size_bytes || 0))} · ${esc(CRX.fmtDate(d.created_at))}</small></span><button type="button" class="btn btn-line btn-sm" data-doc-get="${esc(d.id)}">Descargar</button>${ROLE_ADMIN() || d.uploaded_by === user.id || api.mode === 'local' ? `<button type="button" class="btn btn-danger btn-sm" data-doc-del="${esc(d.id)}">Borrar</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Sin documentos todavía.</p>'}`;
    $('#doc-file').onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      $('#doc-msg').textContent = 'Subiendo…';
      try { if (p.contact) await api.docs.uploadContact(p.id, f, $('#doc-kind', box).value); else await api.docs.upload(p.id, f, $('#doc-kind', box).value); CRX.toast('Documento guardado', 'ok'); drawDocs(p, sel); }
      catch (ex) { $('#doc-msg').textContent = api.errMsg(ex); }
    };
    box.onclick = async (e) => {
      const g = e.target.closest('[data-doc-get]'), d = e.target.closest('[data-doc-del]');
      const id = g ? g.dataset.docGet : d ? d.dataset.docDel : null; const doc = id && docs.find((x) => x.id === id);
      if (g && doc) {
        try {
          let url = await api.docs.url(doc);
          if (/^data:/.test(url)) { const [h, b64] = url.split(','); const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); url = URL.createObjectURL(new Blob([u8], { type: (/^data:([^;,]+)/.exec(h) || [])[1] || 'application/octet-stream' })); }
          const a = document.createElement('a'); a.href = url; a.download = doc.name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
          if (/^blob:/.test(url)) setTimeout(() => URL.revokeObjectURL(url), 4000);
        } catch (ex) { CRX.toast(api.errMsg(ex), 'err'); }
      }
      if (d && doc && await CRX.ask(`¿Borrar "${doc.name}"? No se puede deshacer.`, { ok: 'Borrar', danger: true })) { const r = await guard(() => api.docs.remove(doc), 'Documento borrado'); if (r.ok) drawDocs(p, sel); }
    };
  }

  /* ===================== Estadísticas ===================== */
  async function viewStats() {
    let sum, daily;
    try { [sum, daily] = await Promise.all([api.stats.summary(), api.stats.daily()]); }
    catch (e) { $('#view').innerHTML = `<div class="panel"><h2>Estadísticas</h2><p class="muted">${esc(api.errMsg(e))}</p></div>`; return; }
    const refs = await loadRefs(['properties', 'leads']);
    const props = refs.properties.filter((p) => p.status !== 'borrador');
    const leads30 = refs.leads.filter((l) => Date.now() - new Date(l.created_at) < 30 * DAY);
    const by = {}; sum.forEach((x) => { by[x.property_id] = x; });
    const tot = (k) => props.reduce((s2, p) => s2 + Number((by[p.id] || {})[k] || 0), 0);
    const v30 = tot('views_30d'), w30 = tot('wa_30d');
    // serie de 30 días
    const days = []; for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * DAY); days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')); }
    const cnt = (day, kind) => daily.filter((r) => String(r.day).slice(0, 10) === day && r.kind === kind).reduce((s2, r) => s2 + Number(r.n), 0);
    const series = days.map((d) => ({ d, v: cnt(d, 'vista'), w: cnt(d, 'whatsapp') }));
    const maxV = Math.max(1, ...series.map((x) => x.v));
    const leadsBy = {}; refs.leads.forEach((l) => { if (l.property_id) leadsBy[l.property_id] = (leadsBy[l.property_id] || 0) + 1; });
    const rows = props.map((p) => {
      const x = by[p.id] || {}; const age = p.published_at ? Math.max(1, Math.round((Date.now() - new Date(p.published_at)) / DAY)) : null;
      const rate = Number(x.views_30d) ? (Number(x.wa_30d) / Number(x.views_30d)) * 100 : null;
      let tip = '';
      if (p.status === 'disponible') {
        if (Number(x.views_30d) >= 30 && rate != null && rate < 2) tip = 'Muchas vistas y pocos contactos: revisa precio, fotos o descripción.';
        else if (Number(x.views_30d) < 5 && age && age > 14) tip = 'Pocas vistas: compártela en redes (Estudio para redes).';
        else if (quality(p).score < 60) tip = 'Ficha incompleta: más fotos y descripción ayudan.';
      }
      return { p, x, age, rate, tip, leads: leadsBy[p.id] || 0 };
    });
    const sortKey = pref.get('ssort', 'views_30d');
    const val = (r, k) => k === 'rate' ? (r.rate ?? -1) : k === 'leads' ? r.leads : k === 'age' ? (r.age ?? -1) : Number(r.x[k] || 0);
    rows.sort((a, b) => val(b, sortKey) - val(a, sortKey));
    const th = (k, l, t) => `<th><button type="button" class="th-sort${sortKey === k ? ' on' : ''}" data-ssort="${k}" title="${esc(t || 'Ordenar')}">${esc(l)}${sortKey === k ? ' ↓' : ''}</button></th>`;
    $('#view').innerHTML = `<div class="kpis">
        <div class="kpi"><span>Vistas · 30 días</span><b>${v30.toLocaleString('es-MX')}</b><small>${tot('views_7d').toLocaleString('es-MX')} en los últimos 7 días</small></div>
        <div class="kpi"><span>Clics a WhatsApp · 30 días</span><b>${w30.toLocaleString('es-MX')}</b><small>desde fichas y tarjetas</small></div>
        <div class="kpi"><span>Tasa de contacto</span><b>${v30 ? ((w30 / v30) * 100).toFixed(1) + '%' : '—'}</b><small>clics a WhatsApp por cada 100 vistas</small></div>
        <div class="kpi"><span>Prospectos · 30 días</span><b>${leads30.length}</b><small>${tot('fav_total')} favoritas · ${tot('share_total')} compartidas</small></div></div>
      <div class="panel"><div class="ph-row"><h2>Vistas por día · últimos 30 días</h2><span class="legend"><i class="lv"></i> Vistas <i class="lw"></i> WhatsApp</span></div>
        <div class="chart30" role="img" aria-label="Vistas por día en los últimos 30 días">${series.map((x, i) => `<div class="c30" title="${esc(new Date(x.d + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }))}: ${x.v} vistas · ${x.w} WhatsApp"><i class="bv" style="height:${(x.v / maxV) * 100}%"></i>${x.w ? `<i class="bw" style="height:${Math.max(4, (x.w / maxV) * 100)}%"></i>` : ''}${i % 5 === 4 || i === 29 ? `<small>${Number(x.d.slice(8))}/${Number(x.d.slice(5, 7))}</small>` : ''}</div>`).join('')}</div>
        ${!v30 ? '<p class="muted" style="margin-top:28px">Todavía no hay visitas registradas. Se empiezan a contar en cuanto el sitio esté publicado.</p>' : ''}</div>
      ${channelsHtml(refs.leads)}
      <div class="panel"><h2>Por propiedad</h2><p class="muted" style="margin-top:-6px">Las visitas se cuentan de forma anónima: una por persona cada 30 minutos.</p>
        <div class="tbl-wrap flat"><table class="stats-tbl"><thead><tr><th>Propiedad</th>${th('views_7d', '7 días')}${th('views_30d', '30 días')}${th('views_total', 'Total')}${th('wa_total', 'WhatsApp')}${th('rate', 'Tasa', 'Clics a WhatsApp por cada 100 vistas en 30 días')}${th('fav_total', 'Favoritas')}${th('share_total', 'Compart.')}${th('leads', 'Prospectos')}${th('age', 'Días publ.')}</tr></thead>
        <tbody>${rows.map(({ p, x, age, rate, tip, leads }) => `<tr><td><b>${esc(p.title)}</b><br><small class="muted">${esc(p.ref_code)} · ${esc(CRX.STATUS[p.status])}</small>${tip ? `<br><small class="tip">💡 ${esc(tip)}</small>` : ''}</td>
          <td class="num">${Number(x.views_7d || 0)}</td><td class="num"><b>${Number(x.views_30d || 0)}</b></td><td class="num">${Number(x.views_total || 0)}</td><td class="num">${Number(x.wa_total || 0)}</td><td class="num">${rate == null ? '—' : rate.toFixed(1) + '%'}</td><td class="num">${Number(x.fav_total || 0)}</td><td class="num">${Number(x.share_total || 0)}</td><td class="num">${leads}</td><td class="num">${age ?? '—'}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">Sin propiedades publicadas.</td></tr>'}</tbody></table></div></div>`;
    $('#view').onclick = (e) => { const b = e.target.closest('[data-ssort]'); if (b) { pref.set('ssort', b.dataset.ssort); viewStats(); } };
  }

  // ¿De dónde llegan los clientes? (solicitudes del sitio de los últimos 90 días)
  function channelsHtml(leads) {
    const web = leads.filter((l) => l.source === 'web' && Date.now() - new Date(l.created_at) < 90 * DAY);
    if (!web.length) return '<div class="panel"><h2>¿De dónde llegan los clientes?</h2><p class="muted">Cuando lleguen solicitudes del sitio verás aquí si vinieron de Facebook, Instagram, Google, WhatsApp u otro lugar. Para medir tus anuncios, agrega <code>?utm_source=facebook&amp;utm_campaign=nombre</code> al enlace que publiques.</p></div>';
    const m = {}; web.forEach((l) => { const c = l.channel || 'Directo'; const x = m[c] = m[c] || { n: 0, own: 0, won: 0 }; x.n++; if (['captacion', 'valuacion'].includes(l.kind)) x.own++; if (l.status === 'ganado') x.won++; });
    const rows = Object.entries(m).sort((a, b) => b[1].n - a[1].n); const max = rows[0][1].n;
    return `<div class="panel"><h2>¿De dónde llegan los clientes?</h2><p class="muted" style="margin-top:-6px">Solicitudes del sitio de los últimos 90 días (${web.length}). "Directo" es quien escribió la dirección o llegó sin anuncio ni red social.</p>
      <div class="tbl-wrap flat"><table class="stats-tbl ch-tbl"><thead><tr><th>Llegó desde</th><th class="num">Solicitudes</th><th class="num">Propietarios</th><th class="num">Ganados</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>
      ${rows.map(([c, x]) => `<tr><td><b>${esc(c)}</b></td><td class="num">${x.n}</td><td class="num">${x.own}</td><td class="num">${x.won}</td><td class="ch-bar"><i style="width:${Math.round((x.n / max) * 100)}%"></i></td></tr>`).join('')}
      </tbody></table></div><p class="note muted">Para saber qué publicación o anuncio funciona mejor, agrega al enlace <code>?utm_source=facebook&amp;utm_campaign=casas-noviembre</code> (o instagram, tiktok…). El Estudio para redes ya lo agrega solo.</p></div>`;
  }

  /* ===================== Comisiones ===================== */
  async function viewCommissions() {
    const refs = await loadRefs(['deals', 'properties', 'profiles']);
    const closed = refs.deals.filter((d) => d.status === 'cerrada');
    const dateOf = (d) => new Date((d.signed_on ? d.signed_on + 'T12:00' : d.created_at));
    const years = [...new Set(closed.map((d) => dateOf(d).getFullYear()).concat(new Date().getFullYear()))].sort((a, b) => b - a);
    const st = { y: Number(pref.get('cyear', new Date().getFullYear())), adv: pref.get('cadv', '') };
    if (!years.includes(st.y)) st.y = years[0];
    const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const draw = () => {
      const list = closed.filter((d) => dateOf(d).getFullYear() === st.y && (!st.adv || String(d.advisor_id || '') === st.adv));
      const months = MES.map((m, i) => { const l = list.filter((d) => dateOf(d).getMonth() === i); const sumC = (c) => l.filter((d) => d.currency === c); return { m, n: l.length, v: l.filter((d) => d.operation === 'venta').length, r: l.filter((d) => d.operation === 'renta').length, opMXN: sumC('MXN').reduce((s2, d) => s2 + (Number(d.agreed_price) || 0), 0), cMXN: sumC('MXN').reduce((s2, d) => s2 + (Number(d.commission_amount) || 0), 0), cUSD: sumC('USD').reduce((s2, d) => s2 + (Number(d.commission_amount) || 0), 0) }; });
      const T = months.reduce((o, x) => ({ n: o.n + x.n, v: o.v + x.v, r: o.r + x.r, opMXN: o.opMXN + x.opMXN, cMXN: o.cMXN + x.cMXN, cUSD: o.cUSD + x.cUSD }), { n: 0, v: 0, r: 0, opMXN: 0, cMXN: 0, cUSD: 0 });
      const maxC = Math.max(1, ...months.map((x) => x.cMXN));
      const advs = {}; list.forEach((d) => { const k = d.advisor_id || ''; advs[k] = advs[k] || { n: 0, cMXN: 0, cUSD: 0 }; advs[k].n++; advs[k][d.currency === 'USD' ? 'cUSD' : 'cMXN'] += Number(d.commission_amount) || 0; });
      const advName = (id) => id ? refLabel(refs, 'profiles', id) : 'Sin asesor asignado';
      const m$ = (v, c) => v ? money(v, c) : '—';
      $('#cm-body').innerHTML = `<div class="kpis">
          <div class="kpi"><span>Operaciones cerradas ${st.y}</span><b>${T.n}</b><small>${T.v} ventas · ${T.r} rentas</small></div>
          <div class="kpi"><span>Comisiones MXN</span><b>${esc(m$(T.cMXN, 'MXN'))}</b><small>promedio ${T.n ? esc(money(Math.round(T.cMXN / Math.max(1, list.filter((d) => d.currency === 'MXN').length)), 'MXN')) : '—'} por operación</small></div>
          <div class="kpi"><span>Comisiones USD</span><b>${esc(m$(T.cUSD, 'USD'))}</b><small>se suman aparte, sin convertir</small></div>
          <div class="kpi"><span>Monto operado MXN</span><b>${esc(m$(T.opMXN, 'MXN'))}</b><small>precio pactado de las cerradas</small></div></div>
        <div class="dash"><div class="panel"><h2>Comisiones MXN por mes</h2><div class="chart" role="img" aria-label="Comisiones por mes">${months.map((x, i) => `<div class="col${i === new Date().getMonth() && st.y === new Date().getFullYear() ? ' cur' : ''}"><span class="v">${x.cMXN ? '$' + Math.round(x.cMXN / 1000) + 'k' : ''}</span><i style="height:${Math.max(2, (x.cMXN / maxC) * 100)}%"></i><small>${x.m}</small></div>`).join('')}</div></div>
          <div class="panel"><h2>Por asesor</h2>${Object.keys(advs).length ? `<div class="tbl-wrap flat"><table><thead><tr><th>Asesor</th><th>Cerradas</th><th>MXN</th><th>USD</th></tr></thead><tbody>${Object.entries(advs).sort((a, b) => b[1].cMXN - a[1].cMXN).map(([id, x]) => `<tr><td>${esc(advName(id))}</td><td class="num">${x.n}</td><td class="num">${esc(m$(x.cMXN, 'MXN'))}</td><td class="num">${esc(m$(x.cUSD, 'USD'))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin operaciones cerradas en este periodo.</p>'}</div></div>
        <div class="panel"><h2>Detalle por mes</h2><div class="tbl-wrap flat"><table><thead><tr><th>Mes</th><th>Cerradas</th><th>Ventas</th><th>Rentas</th><th>Monto operado MXN</th><th>Comisión MXN</th><th>Comisión USD</th></tr></thead><tbody>${months.map((x) => `<tr${x.n ? '' : ' class="dim"'}><td>${x.m}</td><td class="num">${x.n}</td><td class="num">${x.v}</td><td class="num">${x.r}</td><td class="num">${esc(m$(x.opMXN, 'MXN'))}</td><td class="num">${esc(m$(x.cMXN, 'MXN'))}</td><td class="num">${esc(m$(x.cUSD, 'USD'))}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="num">${T.n}</td><td class="num">${T.v}</td><td class="num">${T.r}</td><td class="num">${esc(m$(T.opMXN, 'MXN'))}</td><td class="num">${esc(m$(T.cMXN, 'MXN'))}</td><td class="num">${esc(m$(T.cUSD, 'USD'))}</td></tr></tbody></table></div>
          <p class="muted" style="margin-top:10px">Cuenta las operaciones en estado "Cerrada" por su fecha de firma. Para que aparezcan aquí, captura el precio pactado y la comisión en <a href="#/deals">Operaciones</a>.</p></div>`;
      $('#cm-csv').onclick = () => {
        const cell = (v) => { let x = String(v ?? ''); if (/^[=+\-@]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };
        const lines = [['Fecha de firma', 'Clave', 'Propiedad', 'Operación', 'Asesor', 'Moneda', 'Precio pactado', 'Comisión'].join(',')].concat(list.map((d) => { const pr = refs.properties.find((x) => x.id === d.property_id) || {}; return [d.signed_on || String(d.created_at).slice(0, 10), pr.ref_code || '', pr.title || '', CRX.OPS[d.operation], advName(d.advisor_id), d.currency, d.agreed_price ?? '', d.commission_amount ?? ''].map(cell).join(','); }));
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = `comisiones-${st.y}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      };
    };
    $('#view-actions').innerHTML = `<select id="cm-y" aria-label="Año">${years.map((y) => `<option${y === st.y ? ' selected' : ''}>${y}</option>`).join('')}</select><select id="cm-a" aria-label="Asesor"><option value="">Todos los asesores</option>${(refs.profiles || []).map((x) => `<option value="${esc(x.id)}"${String(x.id) === st.adv ? ' selected' : ''}>${esc(x.full_name || x.id)}</option>`).join('')}</select><button class="btn btn-line btn-sm" id="cm-csv">Exportar CSV</button>`;
    $('#view').innerHTML = '<div id="cm-body"></div>';
    $('#cm-y').onchange = (e) => { st.y = Number(e.target.value); pref.set('cyear', st.y); draw(); };
    $('#cm-a').onchange = (e) => { st.adv = e.target.value; pref.set('cadv', st.adv); draw(); };
    draw();
  }

  /* ===================== Avisos en vivo (con el panel abierto) ===================== */
  const alerts = { known: null, dueSeen: new Set(), timer: null, baseTitle: document.title };
  function beep() {
    if (pref.get('asound', '1') !== '1') return;
    try { const C = window.AudioContext || window.webkitAudioContext; const c = new C(); const o = c.createOscillator(); const g = c.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.55); setTimeout(() => c.close(), 800); } catch (e) { /* sin audio */ }
  }
  function notify(title, body) {
    try { if ('Notification' in window && Notification.permission === 'granted') { const n = new Notification(title, { body, icon: 'img/icon-180.png', tag: 'crx-' + title }); n.onclick = () => { window.focus(); location.hash = '#/leads'; n.close(); }; } } catch (e) { /* nada */ }
  }
  async function pollLeads() {
    if (!user || document.hidden) return;
    let r; try { r = await api.leads.poll(); } catch (e) { return; }
    const ids = new Set(r.latest.map((l) => l.id));
    if (alerts.known) {
      const fresh = r.latest.filter((l) => !alerts.known.has(l.id) && l.status === 'nuevo');
      if (fresh.length) {
        newLeads += fresh.length; navRender((location.hash.replace('#/', '').split('?')[0]) || 'resumen');
        CRX.toast(fresh.length === 1 ? `Nuevo prospecto: ${fresh[0].full_name} (${CRX.LEAD_KINDS[fresh[0].kind] || fresh[0].kind})` : `${fresh.length} prospectos nuevos`, 'ok');
        beep(); notify('Nuevo prospecto · CRUMEX', fresh.map((l) => `${l.full_name} · ${CRX.LEAD_KINDS[l.kind] || l.kind}`).join('\n'));
        if (/^#\/(leads|resumen)?$/.test(location.hash || '#/')) route();
      }
    }
    alerts.known = new Set([...(alerts.known || []), ...ids]);
    const due = r.due.filter((l) => !alerts.dueSeen.has(l.id));
    due.forEach((l) => alerts.dueSeen.add(l.id));
    if (due.length) { CRX.toast(`⏰ Seguimiento: ${due.map((l) => l.full_name).slice(0, 3).join(', ')}${due.length > 3 ? '…' : ''}`); notify('Seguimiento pendiente · CRUMEX', due.map((l) => l.full_name + (l.follow_up_note ? ' — ' + l.follow_up_note : '')).join('\n')); }
    document.title = (newLeads ? `(${newLeads}) ` : '') + alerts.baseTitle;
  }
  function startAlerts() { if (alerts.timer) return; pollLeads(); alerts.timer = setInterval(pollLeads, 45000); document.addEventListener('visibilitychange', () => { if (!document.hidden) pollLeads(); }); }
  function stopAlerts() { clearInterval(alerts.timer); alerts.timer = null; alerts.known = null; document.title = alerts.baseTitle; }

  /* ===================== Mi cuenta ===================== */
  function pwStrength(v) { let n = 0; if (v.length >= 8) n++; if (v.length >= 12) n++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++; if (/\d/.test(v) && /[^\w\s]/.test(v)) n++; return n; }
  function bindPwForm(form, onDone) {
    const p1 = $('[data-pw1]', form), p2 = $('[data-pw2]', form), msg = $('.form-msg', form), meter = $('.pw-meter', form);
    const say = (t, c) => { msg.textContent = t; msg.className = 'form-msg ' + (c || ''); };
    p1.addEventListener('input', () => { const n = pwStrength(p1.value); meter.dataset.n = p1.value ? n : ''; $('small', meter.parentElement).textContent = p1.value ? ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Muy buena'][n] : ''; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (p1.value.length < 8) return say('Usa al menos 8 caracteres.', 'err');
      if (p1.value !== p2.value) return say('Las dos contraseñas no coinciden.', 'err');
      const btn = $('button[type=submit]', form);
      if ($('[data-pwc]', form) && !$('[data-pwc]', form).value) return say('Escribe tu contraseña actual.', 'err');
      btn.disabled = true; say('Guardando…');
      const cur = $('[data-pwc]', form);
      if (cur && !cur.value) return say('Escribe tu contraseña actual.', 'err');
      try { await api.auth.updatePassword(p1.value, { current: cur ? cur.value : '' }); form.reset(); meter.dataset.n = ''; say('Contraseña actualizada.', 'ok'); if (onDone) onDone(); }
      catch (ex) { say(api.errMsg(ex), 'err'); }
      btn.disabled = false;
    });
  }
  const PW_FIELDS = (pre) => `<div class="field"><label for="${pre}1">Contraseña nueva</label><input id="${pre}1" data-pw1 type="password" autocomplete="new-password" required><span class="hint">Mínimo 8 caracteres. Usa una frase que no uses en otros sitios.</span></div>
      <div class="pw-wrap"><div class="pw-meter" data-n=""><i></i><i></i><i></i><i></i></div><small class="muted"></small></div>
      <div class="field"><label for="${pre}2">Repite la contraseña</label><input id="${pre}2" data-pw2 type="password" autocomplete="new-password" required></div>`;
  async function viewAccount() {
    $('#view').innerHTML = `<div class="acc">
      <section class="panel"><h2>Tu perfil</h2><dl class="kv"><div><dt>Nombre</dt><dd>${esc(user.name || '—')}</dd></div><div><dt>Correo</dt><dd>${esc(user.email || '—')}</dd></div><div><dt>Rol</dt><dd>${user.role === 'admin' ? 'Administrador' : 'Asesor'}</dd></div></dl>
        <p class="muted">Tu nombre, puesto y foto pública se editan en <a href="#/profiles">Equipo</a>${ROLE_ADMIN() ? '' : ' (pídeselo a un administrador)'}.</p></section>
      <form class="panel" id="pw-form" novalidate><h2>Cambiar contraseña</h2>${api.auth.needsCurrent ? '<div class="field"><label for="pwc">Contraseña actual</label><input id="pwc" data-pwc type="password" autocomplete="current-password" required></div>' : ''}${PW_FIELDS('pw')}<button class="btn btn-navy" type="submit">Guardar contraseña</button><p class="form-msg" role="status"></p></form>
      <section class="panel"><h2>Avisos de prospectos</h2>
        <p class="muted">Con el panel abierto, revisamos cada 45 segundos si llegó alguien nuevo o si toca un seguimiento.</p>
        <div class="chk-row" style="margin-bottom:12px"><label class="sw sm"><input type="checkbox" id="a-sound"${pref.get('asound', '1') === '1' ? ' checked' : ''}> Sonido al llegar un prospecto</label></div>
        <button class="btn btn-navy btn-sm" type="button" id="a-notif">Activar avisos del navegador</button> <span class="muted" id="a-state"></span>
        <p class="note muted" style="margin-top:12px">Para recibir un correo o un mensaje de Telegram aunque el panel esté cerrado, configura los avisos del servidor (ver README, "Avisos al instante").</p></section>
      <section class="panel" id="acc-digest"><h2>Resumen diario por correo</h2>
        <p class="muted">Cada mañana te llega un correo con tus visitas del día, los seguimientos que tocan y los prospectos y propietarios sin atender. Si no tienes pendientes, no te llega nada.</p>
        <label class="sw"><input type="checkbox" id="acc-dg"> Recibir mi resumen diario</label>
        <div class="row-act"><button class="btn btn-line btn-sm" type="button" id="acc-dg-prev">Ver cómo se ve hoy</button><button class="btn btn-line btn-sm" type="button" id="acc-dg-send">Mandármelo ahora</button><span class="form-msg" id="acc-dg-msg" role="status"></span></div>
      </section>
      <section class="panel"><h2>El panel en tu celular</h2>
        <p class="muted">Agrégalo a la pantalla de inicio y ábrelo como una app, sin buscar la dirección.</p>
        <ul class="steps-mini"><li><b>iPhone (Safari):</b> toca Compartir <span aria-hidden="true">⬆︎</span> y luego “Agregar a inicio”.</li><li><b>Android (Chrome):</b> abre el menú <span aria-hidden="true">⋮</span> y toca “Instalar app” o “Agregar a la pantalla principal”.</li></ul>
      </section>
      <section class="panel"><h2>Sesión</h2><p class="muted">Si usaste el panel en una computadora ajena, cierra la sesión al terminar.</p><button class="btn btn-line" type="button" id="acc-out">Cerrar sesión</button>
        ${api.mode === 'local' ? '<p class="note muted" style="margin-top:14px">Modo demostración: la contraseña es fija. Con el servidor configurado el cambio es real.</p>' : ''}</section></div>`;
    bindPwForm($('#pw-form'));
    $('#acc-out').onclick = () => $('#logout').click();
    const nstate = () => { const p2 = 'Notification' in window ? Notification.permission : 'unsupported'; $('#a-state').textContent = p2 === 'granted' ? 'Activados en este navegador.' : p2 === 'denied' ? 'Bloqueados: actívalos en la configuración del navegador.' : p2 === 'unsupported' ? 'Este navegador no los permite.' : ''; $('#a-notif').hidden = p2 === 'granted' || p2 === 'unsupported'; };
    nstate();
    $('#a-notif').onclick = async () => { try { await Notification.requestPermission(); } catch (e) { /* nada */ } nstate(); if (Notification.permission === 'granted') notify('Avisos activados', 'Te avisaremos aquí cuando llegue un prospecto.'); };
    $('#a-sound').onchange = (e) => { pref.set('asound', e.target.checked ? '1' : '0'); if (e.target.checked) beep(); };
    // resumen diario: preferencia guardada en tu cuenta
    (async () => {
      const me = ((await api.list('profiles').catch(() => [])) || []).find((u) => String(u.id) === String(user.id));
      $('#acc-dg').checked = !me || me.digest !== false;
      $('#acc-dg').disabled = api.mode === 'local';
      $('#acc-dg').onchange = async (e) => { const r = await guard(() => api.upsert('profiles', { id: user.id, digest: e.target.checked }, { isNew: false }), e.target.checked ? 'Te llegará el resumen cada mañana' : 'Ya no te llegará el resumen'); if (!r.ok) e.target.checked = !e.target.checked; };
    })();
    const dmsg = (t, c) => { $('#acc-dg-msg').textContent = t; $('#acc-dg-msg').className = 'form-msg ' + (c || ''); };
    $('#acc-dg-prev').onclick = async () => { try { const d = await api.tools.digestPreview(); openDlg('Tu resumen de hoy', `<p class="muted">Asunto: <b>${esc(d.subject)}</b></p><div class="digest-prev">${d.html}</div>`); } catch (e) { dmsg(api.errMsg(e), 'err'); } };
    $('#acc-dg-send').onclick = async () => { dmsg('Mandando…'); try { const r = await api.tools.digestTest(); dmsg(`Enviado a ${r.to}.`, 'ok'); } catch (e) { dmsg(api.errMsg(e), 'err'); } };
  }

  /* ===================== Búsqueda global ===================== */
  async function globalSearch(q) {
    const box = $('#gresults'); q = q.trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; return; }
    if (!cache._gs || Date.now() - cache._gs > 30000) { await loadRefs(['properties', 'leads', 'contacts']); cache._gs = Date.now(); }
    const hit = (o, fields) => fields.some((f) => String(o[f] || '').toLowerCase().includes(q));
    const props = (cache.properties || []).filter((p) => hit(p, ['title', 'ref_code', 'zone', 'public_location'])).slice(0, 5);
    const leads = (cache.leads || []).filter((l) => hit(l, ['full_name', 'phone', 'email'])).slice(0, 5);
    const contacts = (cache.contacts || []).filter((c) => hit(c, ['full_name', 'phone', 'email'])).slice(0, 5);
    const sec = (t, items, fn) => items.length ? `<div class="gs-sec"><small>${t}</small>${items.map(fn).join('')}</div>` : '';
    box.innerHTML = (sec('Propiedades', props, (p) => `<button type="button" data-gs="properties:${esc(p.id)}"><b>${esc(p.ref_code)}</b> ${esc(p.title)}</button>`)
      + sec('Prospectos', leads, (l) => `<button type="button" data-gs="leads:${esc(l.id)}"><b>${esc(l.full_name)}</b> ${esc(fph(l.phone))}</button>`)
      + sec('Contactos', contacts, (c) => `<button type="button" data-gs="contacts:${esc(c.id)}"><b>${esc(c.full_name)}</b> ${esc(c.phone ? fph(c.phone) : c.email || '')}</button>`)) || '<p class="gs-none">Sin resultados</p>';
    box.hidden = false;
  }
  async function openFromSearch(spec) {
    const [t, id] = spec.split(':'); $('#gresults').hidden = true; $('#gsearch').value = '';
    if (t === 'properties') return editProperty(cache.properties.find((p) => p.id === id));
    const refs = await loadRefs(Object.keys(LISTS));
    editRow(t, (refs[t] || []).find((r) => String(r.id) === id), refs);
  }

  /* ===================== acceso ===================== */
  let SITE = {};
  const loadSite = () => api.getSettings().then((s) => { SITE = s || {}; }).catch(() => { SITE = SITE || {}; });
  const askReview = (name, phone) => {
    if (!SITE.google_review_url) { CRX.toast('Primero pon en Ajustes el enlace para dejar reseña en Google.', 'err'); return; }
    window.open(waUrl(phone, `Hola ${String(name || '').trim().split(' ')[0]}, gracias por confiar en INMOBILIARIA CRUMEX. ¿Nos ayudas con una reseña en Google? Nos toma un minuto y ayuda mucho a otras familias: ${SITE.google_review_url}`), '_blank', 'noopener');
  };
  async function showApp() {
    loadSite();
    $('#login').hidden = true; $('#app').hidden = false;
    const demo = $('#demo-banner'); if (demo && demo.parentElement !== $('.main')) $('.main').prepend(demo);
    $('#who').innerHTML = `<span class="av">${esc((user.name || user.email || '?').trim()[0].toUpperCase())}</span><span><b>${esc(user.name || user.email)}</b><small>${user.role === 'admin' ? 'Administrador' : 'Asesor'}</small></span>`;
    try { const leads = await api.leads.list(); newLeads = leads.filter((l) => l.status === 'nuevo').length; } catch (e) { newLeads = 0; }
    route(); startAlerts();
  }
  function showLogin(msg) {
    $('#app').hidden = true; $('#login').hidden = false; $('#login-msg').textContent = msg || ''; $('#login-msg').className = 'form-msg' + (msg ? ' err' : '');
    const demo = $('#demo-banner'); if (demo && demo.parentElement !== document.body) document.body.prepend(demo);
    $('#login-demo').hidden = api.mode !== 'local';
  }
  async function init() {
    $('#demo-banner').hidden = api.mode !== 'local';
    document.addEventListener('click', (e) => {
      if (e.target.closest('#dlg [data-close]')) { tryClose(); return; }
      if (e.target === dlg()) { tryClose(); return; }
      const gs = e.target.closest('[data-gs]'); if (gs) { openFromSearch(gs.dataset.gs); return; }
      if (!e.target.closest('.gsearch')) $('#gresults').hidden = true;
    });
    dlg().addEventListener('cancel', (e) => { if (dirty) { e.preventDefault(); tryClose(); } });
    const sideOpen = (on) => { $('#side').classList.toggle('open', on); $('#side-scrim').hidden = !on; };
    $('#side-btn').onclick = () => sideOpen(!$('#side').classList.contains('open'));
    $('#side-scrim').onclick = () => sideOpen(false);
    $('#gsearch').addEventListener('input', CRX.debounce((e) => globalSearch(e.target.value), 200));
    $('#gsearch').addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#gresults').hidden = true; e.target.blur(); } if (e.key === 'Enter') { e.preventDefault(); const f = $('#gresults [data-gs]'); if (f) openFromSearch(f.dataset.gs); } });
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && user) { e.preventDefault(); $('#gsearch').focus(); } });
    window.addEventListener('hashchange', () => { if (user) route(); });
    // tablas y tableros que se desplazan de lado: que también se puedan mover con el teclado
    const markScroll = CRX.debounce(() => $$('#view .tbl-wrap, #view .board, #dlg .tbl-wrap').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2) { if (!el.hasAttribute('tabindex')) { el.tabIndex = 0; el.setAttribute('role', 'region'); el.setAttribute('aria-label', el.classList.contains('board') ? 'Tablero, desplázate de lado' : 'Tabla, desplázate de lado'); } }
      else if (el.getAttribute('role') === 'region') { el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label'); }
    }, 150));
    new MutationObserver(markScroll).observe($('#view'), { childList: true, subtree: true });
    window.addEventListener('resize', markScroll);
    $('#logout').onclick = async () => { stopAlerts(); await api.auth.signOut(); user = null; showLogin(); };
    // colapsar menú lateral (computadora)
    const side = $('#side-collapse');
    const setMini = (on) => { $('#app').classList.toggle('mini', on); side.setAttribute('aria-pressed', on); side.setAttribute('aria-label', on ? 'Expandir menú' : 'Contraer menú'); try { localStorage.setItem('crx-adm-mini', on ? '1' : ''); } catch (e) { /* sin almacenamiento */ } };
    try { setMini(localStorage.getItem('crx-adm-mini') === '1'); } catch (e) { setMini(false); }
    side.onclick = () => setMini(!$('#app').classList.contains('mini'));

    // acceso: entrar, olvidé mi contraseña, crear contraseña nueva
    const show = (id) => ['#login-form', '#reset-form', '#newpass-form', '#setup-form'].forEach((f) => { $(f).hidden = f !== id; });
    $('#setup-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const m = $('#setup-msg'); const f = e.target;
      const say = (t, c) => { m.textContent = t; m.className = 'form-msg ' + (c || ''); };
      if (f.full_name.value.trim().length < 2) return say('Escribe tu nombre.', 'err');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) return say('Escribe tu correo completo.', 'err');
      if (f.password.value.length < 8) return say('La contraseña debe tener al menos 8 caracteres.', 'err');
      if (f.password.value !== f.password2.value) return say('Las dos contraseñas no coinciden.', 'err');
      say('Creando tu cuenta…');
      try { user = await api.auth.setup({ full_name: f.full_name.value.trim(), email: f.email.value.trim(), password: f.password.value, setup_token: f.setup_token.value.trim() }); f.reset(); show('#login-form'); CRX.toast('Cuenta de administrador creada', 'ok'); showApp(); }
      catch (ex) { say(api.errMsg(ex), 'err'); }
    });
    $('#forgot').onclick = () => { show('#reset-form'); $('#r-mail').value = $('#l-mail').value; $('#reset-msg').textContent = ''; $('#r-mail').focus(); };
    $$('[data-back-login]').forEach((b) => { b.onclick = () => { show('#login-form'); $('#l-mail').focus(); }; });
    $('#reset-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const m = $('#reset-msg'); const mail = $('#r-mail').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { m.className = 'form-msg err'; m.textContent = 'Escribe tu correo completo.'; return; }
      const b = $('#reset-form button[type=submit]'); b.disabled = true; m.className = 'form-msg'; m.textContent = 'Enviando…';
      try { await api.auth.resetPassword(mail); m.className = 'form-msg ok'; m.textContent = 'Listo. Si ese correo tiene cuenta, te llegará un enlace para crear una contraseña nueva. Revisa también tu carpeta de spam.'; }
      catch (ex) { m.className = 'form-msg err'; m.textContent = api.errMsg(ex); }
      b.disabled = false;
    });
    let recovering = false;
    api.auth.onRecovery(() => {
      recovering = true; $('#app').hidden = true; $('#login').hidden = false; show('#newpass-form'); $('#login-demo').hidden = true;
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ }
    });
    bindPwForm($('#newpass-form'), async () => {
      recovering = false; CRX.toast('Contraseña nueva guardada', 'ok');
      const u = await api.auth.current().catch(() => null);
      if (u && u.active) { user = u; show('#login-form'); showApp(); } else { show('#login-form'); showLogin('Contraseña guardada. Entra con tu correo y la contraseña nueva.'); }
    });

    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const m = $('#login-msg'); m.textContent = 'Entrando…'; m.className = 'form-msg';
      try {
        const u = await api.auth.signIn($('#l-mail').value.trim(), $('#l-pass').value);
        if (!u || !u.active) { await api.auth.signOut(); m.className = 'form-msg err'; m.textContent = 'Tu cuenta aún no está activada. Pide a un administrador que la active.'; return; }
        user = u; $('#l-pass').value = ''; showApp();
      } catch (ex) { m.className = 'form-msg err'; m.textContent = api.errMsg(ex); }
    });
    let u = null, startErr = '';
    try { u = await api.auth.current(); } catch (ex) { startErr = api.errMsg(ex); }
    if (recovering) return;
    if (u && u.active) { user = u; showApp(); return; }
    showLogin(startErr || (u && !u.active ? 'Tu cuenta aún no está activada.' : ''));
    if (!startErr && api.mode === 'remote') {
      const st = await api.auth.status().catch(() => null);
      if (st && st.needsSetup) { show('#setup-form'); $('#setup-hint').hidden = !!st.setupEnabled; }
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
