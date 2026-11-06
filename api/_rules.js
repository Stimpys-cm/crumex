// INMOBILIARIA CRUMEX · reglas de los datos
//
// Aquí vive lo que antes hacía la base con sus reglas: qué campos acepta cada
// tabla, qué valores son válidos, quién puede borrar, qué se genera solo
// (clave CRX-00001, fechas, "precio rebajado") y qué ve el público.
import { HttpError, bad, uuid, token } from './_http.js';
import { nextSeq, out } from './_db.js';
import { deleteStored } from './_files.js';

export const OPS = ['venta', 'renta'];
export const TYPES = ['casa', 'departamento', 'terreno', 'nave'];
export const PSTATUS = ['borrador', 'disponible', 'apartada', 'cerrada', 'oculta'];
export const PUBLIC_STATUS = ['disponible', 'apartada', 'cerrada'];
export const CUR = ['MXN', 'USD'];
export const LEAD_KINDS = ['contacto', 'visita', 'valuacion', 'captacion', 'credito', 'whatsapp', 'llamada', 'otro'];
export const LEAD_STATUS = ['nuevo', 'contactado', 'seguimiento', 'ganado', 'descartado'];
export const VISIT_STATUS = ['pendiente', 'confirmada', 'realizada', 'cancelada', 'no_asistio'];
export const DEAL_STATUS = ['en_proceso', 'cerrada', 'cancelada'];
export const EVENT_KINDS = ['vista', 'whatsapp', 'favorita', 'compartir', 'ficha'];
export const DOC_KINDS = ['escritura', 'predial', 'identificacion', 'contrato', 'plano', 'avaluo', 'comprobante_domicilio', 'comprobante_ingresos', 'constancia_fiscal', 'acta_constitutiva', 'poder', 'otro'];
export const SETTING_KEYS = ['whatsapp', 'phone', 'email', 'address', 'hours', 'license', 'about', 'privacy', 'terms', 'facebook', 'instagram', 'ticker', 'lead_assign', 'referral_reward', 'auto_reply',
  'razon_social', 'rfc', 'profeco_contrato', 'google_review_url', 'google_maps_url', 'google_rating', 'google_reviews', 'cp', 'gastos'];
const PRIVATE_SETTINGS = ['lead_assign', 'auto_reply']; // solo para el panel; no salen en el sitio
export const LEAD_ASSIGN = ['asesor', 'turnos', 'no'];

/* ---------- ¿de dónde llegó cada cliente? ---------- */
export function cleanOrigin(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const s = (v, n) => { if (typeof v !== 'string' && typeof v !== 'number') return null; const x = String(v).replace(/[\u0000-\u001f<>"]/g, '').trim().slice(0, n); return x || null; };
  const r = { source: s(o.source, 40), medium: s(o.medium, 40), campaign: s(o.campaign, 80), ref: s(o.ref, 80), landing: s(o.landing, 120), click: o.click === 'fb' || o.click === 'g' ? o.click : null };
  return Object.values(r).some(Boolean) ? r : null;
}
export function channelOf(o) {
  if (!o) return 'Directo';
  const t = [o.source, o.medium, o.ref].filter(Boolean).join(' ').toLowerCase();
  if (/instagram|^ig\b|\big\b/.test(t)) return 'Instagram';
  if (o.click === 'fb' || /facebook|^fb\b|\bfb\b|\bmeta\b/.test(t)) return 'Facebook';
  if (/whatsapp|wa\.me|\bwa\b|l\.wl\.co/.test(t)) return 'WhatsApp';
  if (/tiktok/.test(t)) return 'TikTok';
  if (o.click === 'g' || /google/.test(t)) return o.click === 'g' || /cpc|ads|paid|ppc/.test(t) ? 'Google (anuncio)' : 'Google';
  if (/bing|yahoo|duckduckgo/.test(t)) return 'Otro buscador';
  if (/inmuebles24|vivanuncios|lamudi|mercadolibre|propiedades\.com|icasas/.test(t)) return 'Portal inmobiliario';
  if (/redes|social/.test(t)) return 'Redes sociales';
  if (o.source || o.campaign) return 'Campaña: ' + (o.source || o.campaign);
  if (o.ref) return 'Otro sitio: ' + o.ref;
  return 'Directo';
}

/* ---------- bitácora: quién hizo qué ---------- */
const TARGET = { wanted: 'búsqueda', zones: 'zona', contacts: 'contacto', leads: 'prospecto', visits: 'visita', deals: 'operación', articles: 'guía', testimonials: 'testimonio', properties: 'propiedad', users: 'usuario', settings: 'ajustes', alerts: 'alerta', documents: 'documento' };
export const labelOf = (table, d) => !d ? '' : table === 'properties' ? `${d.ref_code || ''} ${d.title || ''}`.trim()
  : table === 'deals' ? `Operación #${d._id ?? d.id}` : table === 'visits' ? 'Visita ' + (d.scheduled_at ? new Date(d.scheduled_at).toLocaleString('es-MX', { timeZone: 'America/Matamoros', dateStyle: 'medium', timeStyle: 'short' }) : '')
  : String(d.title || d.full_name || d.name || d.author_name || d.email || (d._id ?? d.id) || '');
export async function logActivity(db, user, action, table, id, label, detail) {
  try {
    await db.collection('activity').insertOne({ _id: uuid(), at: new Date(), user_id: user ? user._id : null, user_name: user ? (user.full_name || user.email) : 'Sitio web',
      action, target: TARGET[table] || table, table, target_id: id ?? null, label: String(label || '').slice(0, 160), detail: detail ? String(detail).slice(0, 300) : null });
  } catch (e) { console.warn('[crumex] bitácora', e.message); }
}
const money = (v, c) => (v == null ? '—' : '$' + Number(v).toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' ' + (c || ''));

export const slugify = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/* ---------- validadores de campos ---------- */
const S = (label, min, max, req, def) => ({ label, req, def, f(v) { const s = String(v).trim(); if (s.length < (min || 0)) throw bad(`${label}: mínimo ${min} caracteres.`); if (s.length > max) throw bad(`${label}: máximo ${max} caracteres.`); return s; } });
const E = (label) => ({ label, f(v) { const s = String(v).trim().toLowerCase(); if (s.length > 160 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) throw bad(`${label}: escribe un correo válido.`); return s; } });
const EN = (label, list, def, req) => ({ label, req, def, f(v) { if (!list.includes(v)) throw bad(`${label}: valor no válido.`); return v; } });
const N = (label, min, max, req, int) => ({ label, req, f(v) { const n = Number(v); if (!Number.isFinite(n)) throw bad(`${label}: debe ser un número.`); if (n < min || n > max) throw bad(`${label}: fuera de rango.`); if (int && !Number.isInteger(n)) throw bad(`${label}: debe ser un número entero.`); return n; } });
const B = (label) => ({ label, f: (v) => v === true || v === 'true' || v === 1 });
const D = (label, req) => ({ label, req, f(v) { const d = new Date(v); if (isNaN(d)) throw bad(`${label || 'Fecha'}: fecha no válida.`); return d; } });
const DS = (label) => ({ label, f(v) { const s = String(v).slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(new Date(s + 'T12:00:00Z'))) throw bad(`${label}: fecha no válida.`); return s; } });
const R = (label, req) => ({ label, req, f(v) { const s = String(v).trim(); if (!/^[\w-]{1,64}$/.test(s)) throw bad(`${label || 'Referencia'}: no válida.`); return /^\d+$/.test(s) ? Number(s) : s; } });
const A = (label, list) => ({ label, def: [], f(v) { const a = Array.isArray(v) ? v : [v]; if (a.some((x) => !list.includes(x))) throw bad(`${label}: valor no válido.`); return [...new Set(a)]; } });
const O = (label, maxBytes) => ({ label, def: {}, f(v) { if (typeof v !== 'object' || Array.isArray(v)) throw bad(`${label}: formato no válido.`); const o = {}; Object.entries(v).slice(0, 40).forEach(([k, x]) => { if (!/^[\w]{1,40}$/.test(k) || x === null || x === undefined || x === '') return; o[k] = typeof x === 'number' || typeof x === 'boolean' ? x : Array.isArray(x) ? x.slice(0, 40).map((y) => String(y).slice(0, 60)) : String(x).slice(0, 4000); }); if (Buffer.byteLength(JSON.stringify(o)) > maxBytes) throw bad(`${label}: demasiado largo.`); return o; } });

// Limpia y valida un registro según su especificación
export function clean(spec, input, isNew) {
  const o = {};
  for (const [k, v] of Object.entries(spec)) {
    const has = Object.prototype.hasOwnProperty.call(input, k);
    if (!has) { if (isNew && v.def !== undefined) o[k] = v.def; if (isNew && v.req) throw bad(`Falta: ${v.label}.`); continue; }
    const val = input[k];
    if (isEmpty(val) || (Array.isArray(val) && !val.length && v.def === undefined)) { if (v.req) throw bad(`Falta: ${v.label}.`); o[k] = v.def !== undefined && Array.isArray(v.def) ? [] : null; continue; }
    o[k] = v.f(val);
  }
  return o;
}

/* ---------- tablas del panel ---------- */
export const TABLES = {
  zones: { id: 'seq', del: 'admin', sort: { name: 1 }, unique: ['name', 'city'],
    fields: { name: S('Nombre', 2, 120, true), city: S('Ciudad', 0, 80, false, 'Reynosa'), state: S('Estado', 0, 80, false, 'Tamaulipas'), lat: N('Latitud', -90, 90), lng: N('Longitud', -180, 180), description: S('Descripción', 0, 2000), highlights: S('Qué hay en la zona', 0, 1200), commute: S('Tiempos aproximados', 0, 800) },
    refs: [['properties', 'zone_id']] },
  contacts: { id: 'uuid', del: 'admin', stamp: 'created_by',
    fields: { full_name: S('Nombre', 2, 120, true), phone: S('Teléfono', 0, 30), email: E('Correo'), kinds: A('Tipo', ['propietario', 'comprador', 'inquilino', 'otro']), notes: S('Notas', 0, 4000) },
    check: (r) => { if (!r.phone && !r.email) throw bad('Captura al menos un teléfono o un correo.'); },
    refs: [['leads', 'contact_id'], ['visits', 'contact_id'], ['deals', 'client_contact_id'], ['properties', 'owner_id']] },
  leads: { id: 'uuid', del: 'admin',
    fields: { kind: EN('Tipo', LEAD_KINDS, 'contacto'), status: EN('Estado', LEAD_STATUS, 'nuevo'), full_name: S('Nombre', 2, 120, true), phone: S('Teléfono', 7, 30, true), email: E('Correo'), message: S('Mensaje', 0, 2000),
      property_id: R('Propiedad'), contact_id: R('Contacto'), payload: O('Datos del formulario', 4000), source: S('Origen', 0, 40, false, 'panel'), privacy_accepted_at: D('Aviso de privacidad'),
      assigned_to: R('Asignado a'), notes: S('Notas', 0, 4000), handled_at: D('Atendido'), follow_up_at: D('Seguimiento'), follow_up_note: S('Nota de seguimiento', 0, 300) },
    check: (r) => { if (!r.privacy_accepted_at) throw bad('Confirma que se entregó y aceptó el aviso de privacidad.'); },
    refs: [['visits', 'lead_id']] },
  visits: { id: 'uuid', del: 'staff', sort: { scheduled_at: 1 },
    fields: { property_id: R('Propiedad', true), lead_id: R('Prospecto'), contact_id: R('Contacto'), advisor_id: R('Asesor'), scheduled_at: D('Fecha y hora', true), status: EN('Estado', VISIT_STATUS, 'pendiente'), notes: S('Notas', 0, 4000) } },
  deals: { id: 'seq', del: 'admin',
    fields: { property_id: R('Propiedad', true), operation: EN('Operación', OPS, undefined, true), status: EN('Estado', DEAL_STATUS, 'en_proceso'), client_contact_id: R('Cliente'), advisor_id: R('Asesor'),
      agreed_price: N('Precio pactado', 0, 1e12), currency: EN('Moneda', CUR, 'MXN'), commission_amount: N('Comisión', 0, 1e12), signed_on: DS('Fecha de firma'), notes: S('Notas', 0, 4000) },
    after: async (db, r) => { if (r.status === 'cerrada') await db.collection('properties').updateOne({ _id: r.property_id, status: { $ne: 'cerrada' } }, { $set: { status: 'cerrada', closed_at: new Date(), updated_at: new Date() } }); } },
  articles: { id: 'uuid', del: 'admin', sort: { created_at: -1 }, stamp: 'author_id',
    fields: { slug: S('Dirección', 3, 120, true), title: S('Título', 3, 160, true), summary: S('Resumen', 0, 500), body: S('Contenido', 1, 20000, true), published: B('Publicado'), published_at: D('Fecha de publicación') },
    check: (r) => { r.slug = slugify(r.slug); if (r.slug.length < 3) throw bad('Dirección del artículo no válida.'); if (r.published && !r.published_at) r.published_at = new Date(); } },
  // "Lo que buscan nuestros clientes": se muestra a los propietarios en vender.html
  wanted: { id: 'uuid', del: 'staff', sort: { created_at: -1 },
    fields: { operation: EN('Operación', OPS, undefined, true), type: EN('Tipo', TYPES, undefined, true), zone: S('Zona', 0, 80), max_price: N('Presupuesto máximo', 0, 1e12), currency: EN('Moneda', CUR, 'MXN'),
      bedrooms_min: N('Recámaras mínimas', 0, 20, false, true), m2_min: N('m² mínimos', 0, 1e8), note: S('Nota pública', 0, 200), internal: S('Nota interna', 0, 1000), active: B('Mostrar en el sitio') } },
  testimonials: { id: 'uuid', del: 'admin', sort: { position: 1, created_at: -1 },
    fields: { author_name: S('Nombre del cliente', 2, 120, true), body: S('Testimonio', 2, 2000, true), consent_at: D('Permiso del cliente'), approved: B('Publicado'), position: N('Orden', 0, 9999, false, true) },
    check: (r) => { if (r.approved && !r.consent_at) throw bad('Para publicar un testimonio necesitas registrar el permiso del cliente.'); } }
};

// Guarda un registro de una tabla del panel (crear o editar)
export async function saveRow(db, user, table, row, isNew) {
  const T = TABLES[table]; if (!T) throw new HttpError(404, 'Tabla desconocida.');
  const data = clean(T.fields, row || {}, isNew);
  const col = db.collection(table); const now = new Date();
  let doc;
  if (isNew) {
    doc = Object.assign({}, data, { created_at: now, updated_at: now });
    if (T.stamp) doc[T.stamp] = user._id;
    if (table === 'leads' && !doc.source) doc.source = 'panel';
    if (table === 'visits') doc.feedback_token = token(24);
    if (T.check) T.check(doc);
    // guías: si ya existe una con la misma dirección, se agrega -2, -3…
    if (table === 'articles') { const base = doc.slug; let n = 1; while (await col.findOne({ slug: doc.slug }, { projection: { _id: 1 } })) doc.slug = `${base}-${++n}`.slice(0, 120); }
    if (T.unique && await col.findOne(Object.fromEntries(T.unique.map((k) => [k, doc[k] ?? null])), { projection: { _id: 1 } })) throw new HttpError(409, 'Ya existe un registro con ese nombre.', 'duplicate');
    doc = Object.assign({ _id: T.id === 'seq' ? await nextSeq(db, table) : uuid() }, doc);
    await col.insertOne(doc);
    await logActivity(db, user, 'crear', table, doc._id, labelOf(table, doc));
  } else {
    const id = idOf(row && row.id); const old = await col.findOne({ _id: id });
    if (!old) throw new HttpError(404, 'Registro no encontrado.');
    doc = Object.assign({}, old, data, { updated_at: now });
    if (table === 'visits' && old.reminded_at && +new Date(old.scheduled_at) !== +new Date(doc.scheduled_at)) doc.reminded_at = null; // nueva fecha → nuevo recordatorio
    if (T.check) T.check(doc);
    const { _id, ...set } = doc; await col.updateOne({ _id: id }, { $set: set });
    const ch = [];
    if (old.status !== doc.status && doc.status) ch.push(`estado: ${old.status || '—'} → ${doc.status}`);
    if (table === 'leads' && String(old.assigned_to ?? '') !== String(doc.assigned_to ?? '')) ch.push('cambió la persona asignada');
    await logActivity(db, user, 'editar', table, doc._id, labelOf(table, doc), ch.join(' · '));
  }
  if (T.after) await T.after(db, doc);
  return out(doc);
}

export async function deleteRow(db, user, table, id) {
  const T = TABLES[table]; if (!T) throw new HttpError(404, 'Tabla desconocida.');
  if (T.del === 'admin' && user.role !== 'admin') throw new HttpError(403, 'Solo un administrador puede borrar.', 'forbidden');
  id = idOf(id);
  if (table === 'properties') throw bad('Usa el borrado de propiedades.');
  const old = await db.collection(table).findOne({ _id: id });
  // el expediente de un contacto se borra con él
  if (table === 'contacts') {
    for (const d of await db.collection('documents').find({ contact_id: id }).toArray()) await deleteStored(db, d.storage === 'mongo' ? `/api/file?id=${d.file_id}` : null, d.public_id, 'raw', d.storage === 'cloudinary').catch(() => {});
    await db.collection('documents').deleteMany({ contact_id: id });
  }
  for (const [c, f] of (T.refs || [])) await db.collection(c).updateMany({ [f]: id }, { $set: { [f]: null } });
  await db.collection(table).deleteOne({ _id: id });
  if (old) await logActivity(db, user, 'borrar', table, id, labelOf(table, old));
}

export const idOf = (v) => { const s = String(v ?? '').trim(); if (!/^[\w-]{1,64}$/.test(s)) throw bad('Identificador no válido.'); return /^\d+$/.test(s) ? Number(s) : s; };

/* ---------- propiedades ---------- */
const ATTR_KEYS = ['nivel', 'frente_m', 'fondo_m', 'uso_suelo', 'servicios', 'altura_libre_m', 'andenes', 'kva', 'parque_industrial', 'title_en', 'description_en', 'video_url', 'tour_url',
  'amenidades', 'creditos', 'niveles', 'mantenimiento', 'amueblado', 'mascotas', 'deposito_meses', 'plazo_min_meses', 'disponible_desde', 'requisitos', 'cerca'];
// Mismas claves que CRX.FEAT en js/util.js
const AMEN_KEYS = new Set(['privada', 'vigilancia', 'minisplits', 'cocina_integral', 'boiler', 'cisterna', 'patio', 'cochera_techada', 'protecciones', 'cuarto_servicio', 'terraza', 'alberca', 'area_juegos', 'gimnasio',
  'agua', 'luz', 'drenaje', 'pavimento', 'escriturado', 'bardeado', 'esquina', 'oficinas', 'banos_nave', 'patio_maniobras', 'subestacion', 'rociadores', 'grua', 'caseta']);
const CRED_KEYS = new Set(['infonavit', 'fovissste', 'bancario']);
function cleanFeatures(o) {
  const list = (v, keys) => (Array.isArray(v) ? [...new Set(v.map(String).filter((k) => keys.has(k)))] : []);
  if ('amenidades' in o) o.amenidades = list(o.amenidades, AMEN_KEYS);
  if ('creditos' in o) o.creditos = list(o.creditos, CRED_KEYS);
  if ('amueblado' in o && !['no', 'semi', 'si'].includes(o.amueblado)) delete o.amueblado;
  if ('mascotas' in o && !['si', 'no', 'consultar'].includes(o.mascotas)) delete o.mascotas;
  [['niveles', 0, 30], ['mantenimiento', 0, 1e7], ['deposito_meses', 0, 24], ['plazo_min_meses', 0, 120]].forEach(([k, lo, hi]) => {
    if (!(k in o)) return; const n = Number(o[k]); if (o[k] === null || o[k] === '' || !Number.isFinite(n) || n < lo || n > hi) delete o[k]; else o[k] = n;
  });
  if ('disponible_desde' in o && !/^\d{4}-\d{2}-\d{2}$/.test(String(o.disponible_desde))) delete o.disponible_desde;
  [['requisitos', 400], ['cerca', 800]].forEach(([k, max]) => { if (k in o) { const t = String(o[k] ?? '').trim().slice(0, max); if (t) o[k] = t; else delete o[k]; } });
}
const PROP = {
  operation: EN('Operación', OPS, undefined, true), type: EN('Tipo', TYPES, undefined, true), status: EN('Estado', PSTATUS, 'borrador'),
  title: S('Título', 3, 120, true), description: S('Descripción', 0, 4000), price: N('Precio', 0, 1e12), currency: EN('Moneda', CUR, 'MXN'),
  price_on_request: B('Precio a consultar'), featured: B('Destacada'), zone_id: R('Zona'), public_location: S('Ubicación visible', 0, 160), address_private: S('Dirección exacta', 0, 300),
  lat: N('Latitud', -90, 90), lng: N('Longitud', -180, 180), bedrooms: N('Recámaras', 0, 50, false, true), bathrooms: N('Baños', 0, 50), parking: N('Estacionamientos', 0, 100, false, true),
  construction_m2: N('Construcción', 0.01, 1e7), land_m2: N('Terreno', 0.01, 1e8), age_years: N('Antigüedad', 0, 300, false, true), attributes: O('Datos específicos', 12000),
  owner_id: R('Propietario'), advisor_id: R('Asesor'), exclusive: B('Exclusiva'), exclusive_until: DS('Exclusiva hasta'), commission_pct: N('Comisión %', 0, 100)
};
const PHOTO_PATH = /^(https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/[\w\-./%]+|\/api\/file\?id=[\w-]{10,64})$/;

function cleanPhotos(list) {
  if (!Array.isArray(list)) return [];
  if (list.length > 40) throw bad('Máximo 40 fotos por propiedad.');
  return list.map((p) => {
    const path = String((p && p.path) || '').trim();
    if (!PHOTO_PATH.test(path)) throw bad('Una de las fotos no es válida. Vuelve a subirla.');
    const thumb = /^\/api\/file\?id=[\w-]{10,64}$/.test(String((p && p.thumb) || '')) ? String(p.thumb) : null;
    return { id: /^[\w-]{1,64}$/.test(String(p.id || '')) ? String(p.id) : uuid(), path, thumb, alt: String(p.alt || '').trim().slice(0, 200), public_id: p.public_id ? String(p.public_id).slice(0, 200) : null, plan: p.plan === true };
  });
}
function checkProperty(r) {
  if (!r.price_on_request && !(Number(r.price) > 0)) throw bad('Pon un precio mayor a 0 o marca "Precio a consultar".');
  const a = r.attributes || {}; const o = {};
  Object.keys(a).forEach((k) => { if (ATTR_KEYS.includes(k)) o[k] = a[k]; });
  ['video_url', 'tour_url'].forEach((k) => { if (o[k] && !/^https:\/\/[^\s<>"']{4,500}$/.test(o[k])) throw bad('El enlace del video o recorrido debe empezar con https://'); });
  cleanFeatures(o);
  r.attributes = o;
}
// Reglas que antes hacía la base: fechas, cierre y precio rebajado
function applyRules(n, old) {
  const now = new Date();
  if (n.status === 'disponible' && !n.published_at) n.published_at = now;
  if (n.status === 'cerrada') { if (!old || old.status !== 'cerrada') n.closed_at = now; } else n.closed_at = null;
  if (old && n.price != null && old.price != null && n.currency === old.currency && Number(n.price) < Number(old.price)) { n.price_reduced = true; n.price_prev = Number(old.price); n.price_changed_at = now; }
  if (old && n.price != null && old.price != null && Number(n.price) > Number(old.price)) { n.price_reduced = false; n.price_prev = null; n.price_changed_at = null; }
  if (!n.exclusive) n.exclusive_until = null;
}

export async function saveProperty(db, user, row, photos) {
  row = row || {}; const isNew = !row.id;
  const data = clean(PROP, row, isNew); const col = db.collection('properties'); const now = new Date();
  let old = null, doc;
  if (isNew) doc = Object.assign({ _id: uuid(), price_reduced: false, published_at: null, closed_at: null, created_at: now, created_by: user._id }, data);
  else {
    old = await col.findOne({ _id: idOf(row.id) }); if (!old) throw new HttpError(404, 'Propiedad no encontrada.');
    doc = Object.assign({}, old, data);
  }
  checkProperty(doc);
  const ph = cleanPhotos(photos);
  // la clave CRX-00001 se asigna hasta que todo es válido (así no quedan huecos en la numeración)
  if (isNew) { const ref = 'CRX-' + String(await nextSeq(db, 'property')).padStart(5, '0'); doc.ref_code = ref; doc.slug = slugify(doc.title) + '-' + ref.toLowerCase(); }
  // conserva el public_id de Cloudinary de las fotos que ya existían
  // y la miniatura de las que ya existían (el navegador no tiene que mandarla de nuevo)
  if (old) ph.forEach((p) => { const o = (old.photos || []).find((x) => x.path === p.path); if (o) { if (!p.public_id) p.public_id = o.public_id || null; if (!p.thumb) p.thumb = o.thumb || null; } });
  doc.photos = ph; doc.updated_at = now; doc.updated_by = user._id;
  applyRules(doc, old);
  if (old && (old.price !== doc.price || old.currency !== doc.currency)) await db.collection('price_history').insertOne({ _id: uuid(), property_id: doc._id, old_price: old.price ?? null, new_price: doc.price ?? null, currency: doc.currency, changed_by: user._id, changed_at: now });
  if (isNew) await col.insertOne(doc); else { const { _id, ...set } = doc; await col.updateOne({ _id: doc._id }, { $set: set }); }
  // fotos que ya no se usan
  if (old) {
    const keep = new Set(ph.flatMap((p) => [p.path, p.thumb]).filter(Boolean));
    for (const p of (old.photos || [])) {
      if (!keep.has(p.path)) await deleteStored(db, p.path, p.public_id, 'image').catch(() => {});
      if (p.thumb && !keep.has(p.thumb)) await deleteStored(db, p.thumb).catch(() => {});
    }
  }
  const ch = [];
  if (old && (old.price !== doc.price || old.currency !== doc.currency)) ch.push(`precio ${money(old.price, old.currency)} → ${money(doc.price, doc.currency)}`);
  if (old && old.status !== doc.status) ch.push(`estado: ${old.status} → ${doc.status}`);
  if (old && (old.photos || []).length !== ph.length) ch.push(`fotos: ${(old.photos || []).length} → ${ph.length}`);
  await logActivity(db, user, isNew ? 'crear' : 'editar', 'properties', doc._id, labelOf('properties', doc), ch.join(' · '));
  return doc._id;
}

export async function setPropertyStatus(db, user, id, status) {
  if (!PSTATUS.includes(status)) throw bad('Estado no válido.');
  const col = db.collection('properties'); const old = await col.findOne({ _id: idOf(id) });
  if (!old) throw new HttpError(404, 'Propiedad no encontrada.');
  const doc = Object.assign({}, old, { status, updated_at: new Date() }); applyRules(doc, old);
  await col.updateOne({ _id: old._id }, { $set: { status, published_at: doc.published_at, closed_at: doc.closed_at, updated_at: doc.updated_at, updated_by: user._id } });
  if (old.status !== status) await logActivity(db, user, 'estado', 'properties', old._id, labelOf('properties', old), `${old.status} → ${status}`);
}

export async function deleteProperty(db, user, id) {
  if (user.role !== 'admin') throw new HttpError(403, 'Solo un administrador puede borrar propiedades.', 'forbidden');
  const p = await db.collection('properties').findOne({ _id: idOf(id) }); if (!p) return;
  if (await db.collection('deals').countDocuments({ property_id: p._id })) throw new HttpError(409, 'Esta propiedad tiene operaciones registradas y no se puede borrar. Márcala como cerrada u oculta.', 'in_use');
  for (const ph of (p.photos || [])) { await deleteStored(db, ph.path, ph.public_id, 'image').catch(() => {}); if (ph.thumb) await deleteStored(db, ph.thumb).catch(() => {}); }
  const docs = await db.collection('documents').find({ property_id: p._id }).toArray();
  for (const d of docs) await deleteStored(db, d.storage === 'mongo' ? `/api/file?id=${d.file_id}` : null, d.public_id, 'raw', d.storage === 'cloudinary').catch(() => {});
  await Promise.all([
    db.collection('documents').deleteMany({ property_id: p._id }), db.collection('events').deleteMany({ property_id: p._id }),
    db.collection('visits').deleteMany({ property_id: p._id }), db.collection('price_history').deleteMany({ property_id: p._id }),
    db.collection('leads').updateMany({ property_id: p._id }, { $set: { property_id: null } })
  ]);
  await db.collection('properties').deleteOne({ _id: p._id });
  await logActivity(db, user, 'borrar', 'properties', p._id, labelOf('properties', p));
}

/* ---------- lo que ve el público ---------- */
export function publicProperty(p, zones) {
  const z = zones.get(p.zone_id) || {};
  return { id: p._id, ref_code: p.ref_code, slug: p.slug, operation: p.operation, type: p.type, status: p.status, title: p.title, description: p.description || null,
    price: p.price_on_request ? null : (p.price ?? null), currency: p.currency, price_on_request: !!p.price_on_request, price_reduced: !!p.price_reduced, featured: !!p.featured,
    zone: z.name || null, public_location: p.public_location || null, zone_lat: z.lat ?? null, zone_lng: z.lng ?? null,
    bedrooms: p.bedrooms ?? null, bathrooms: p.bathrooms ?? null, parking: p.parking ?? null, construction_m2: p.construction_m2 ?? null, land_m2: p.land_m2 ?? null, age_years: p.age_years ?? null,
    attributes: p.attributes || {}, published_at: p.published_at || null, is_new: !!p.published_at && Date.now() - new Date(p.published_at) < 14 * 864e5,
    closed_at: p.status === 'cerrada' ? (p.closed_at || null) : null,
    price_prev: p.price_reduced && !p.price_on_request && p.price_prev != null ? p.price_prev : null, price_changed_at: p.price_reduced && p.price_prev != null ? (p.price_changed_at || null) : null,
    photos: (p.photos || []).map((ph, i) => (Object.assign({ path: ph.path, alt: ph.alt || '', cover: i === 0 }, ph.thumb ? { thumb: ph.thumb } : {}, ph.plan ? { plan: true } : {}))) };
}

export async function publicBundle(db) {
  const [settingsRows, props, zoneRows, team, articles, testimonials, closed, wanted] = await Promise.all([
    db.collection('settings').find({}).toArray(),
    db.collection('properties').find({ status: { $in: PUBLIC_STATUS } }, { projection: { address_private: 0, owner_id: 0, advisor_id: 0, commission_pct: 0, exclusive: 0, exclusive_until: 0, lat: 0, lng: 0, created_by: 0 } }).toArray(),
    db.collection('zones').find({}).toArray(),
    db.collection('users').find({ active: true, show_on_site: true }, { projection: { full_name: 1, job_title: 1, phone: 1, photo_path: 1 } }).toArray(),
    db.collection('articles').find({ published: true }, { projection: { slug: 1, title: 1, summary: 1, body: 1, published_at: 1, updated_at: 1 }, sort: { published_at: -1 } }).toArray(),
    db.collection('testimonials').find({ approved: true }, { projection: { author_name: 1, body: 1, position: 1 }, sort: { position: 1 } }).toArray(),
    db.collection('deals').countDocuments({ status: 'cerrada' }),
    db.collection('wanted').find({ active: true }, { projection: { operation: 1, type: 1, zone: 1, max_price: 1, currency: 1, bedrooms_min: 1, m2_min: 1, note: 1 }, sort: { created_at: -1 }, limit: 12 }).toArray()
  ]);
  const zones = new Map(zoneRows.map((z) => [z._id, z]));
  const properties = props.map((p) => publicProperty(p, zones))
    .sort((a, b) => (Number(b.featured) - Number(a.featured)) || String(b.published_at ? new Date(b.published_at).toISOString() : '').localeCompare(String(a.published_at ? new Date(a.published_at).toISOString() : '')));
  const settings = {}; settingsRows.forEach((r) => { if (SETTING_KEYS.includes(r._id) && !PRIVATE_SETTINGS.includes(r._id)) settings[r._id] = r.value; });
  return {
    settings, properties,
    team: team.map((u) => ({ id: u._id, full_name: u.full_name || '', job_title: u.job_title || null, phone: u.phone || null, photo_path: u.photo_path || null })),
    stats: { closed_deals: closed, active_listings: properties.filter((p) => p.status === 'disponible').length },
    articles: articles.map(out), testimonials: testimonials.map((t) => ({ id: t._id, author_name: t.author_name, body: t.body })),
    zones: zoneRows.map((z) => ({ id: z._id, name: z.name, city: z.city || 'Reynosa', description: z.description || null, highlights: z.highlights || null, commute: z.commute || null, lat: z.lat ?? null, lng: z.lng ?? null, listings: properties.filter((p) => p.zone === z.name && (p.status === 'disponible' || p.status === 'apartada')).length })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    wanted: wanted.map(out)
  };
}

// Día local (Reynosa) para agrupar estadísticas
export const localDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Matamoros', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date());
