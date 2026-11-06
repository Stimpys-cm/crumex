// INMOBILIARIA CRUMEX · lo que el servidor manda solo:
//   - alertas de búsqueda: cada mañana, por correo, lo nuevo (o lo que bajó de precio) que coincide con lo que alguien busca
//   - recordatorio al cliente de su visita (un día antes, si dejó correo)
//   - catálogo XML para anuncios de inmuebles de Meta (Facebook / Instagram)
import { esc, token } from './_http.js';
import { sendEmail } from './_mail.js';

const OPS = ['venta', 'renta']; const TYPES = ['casa', 'departamento', 'terreno', 'nave'];
const FEATS = ['infonavit', 'fovissste', 'bancario', 'amueblada', 'mascotas', 'privada', 'una_planta', 'minisplits', 'patio', 'alberca', 'cochera_techada'];
const num = (v, lo, hi) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const refNum = (ref) => Number(String(ref || '').replace(/\D/g, '')) || null;
const money = (v, c) => '$' + Number(v).toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' ' + (c || 'MXN');
const TYPE_ES = { casa: 'Casa', departamento: 'Departamento', terreno: 'Terreno', nave: 'Nave industrial' };

// Lo que llega del formulario de alerta del catálogo → filtros limpios
export function cleanAlert(f) {
  f = f && typeof f === 'object' && !Array.isArray(f) ? f : {};
  const list = (v, allowed, n) => (Array.isArray(v) ? [...new Set(v.map((x) => String(x).slice(0, 80)).filter((x) => !allowed || allowed.includes(x)))].slice(0, n) : []);
  return {
    op: OPS.includes(f.op) ? f.op : '', types: list(f.types, TYPES, 4), zones: list(f.zones, null, 12), cur: f.cur === 'USD' ? 'USD' : 'MXN',
    min: num(f.min, 0, 1e12), max: num(f.max, 0, 1e12), beds: num(f.beds, 0, 9) || 0, baths: num(f.baths, 0, 9) || 0, m2: num(f.m2, 0, 1e8),
    feat: list(f.feat, FEATS, 11), q: String(f.q || '').trim().slice(0, 80)
  };
}

const noAcc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function hasFeat(p, k) {
  const a = p.attributes || {}; const am = a.amenidades || []; const cr = a.creditos || [];
  if (k === 'infonavit' || k === 'fovissste' || k === 'bancario') return cr.includes(k);
  if (k === 'amueblada') return a.amueblado === 'si' || a.amueblado === 'semi';
  if (k === 'mascotas') return a.mascotas === 'si';
  if (k === 'privada') return am.includes('privada') || am.includes('vigilancia');
  if (k === 'una_planta') return Number(a.niveles) === 1;
  return am.includes(k);
}
// p: propiedad como la ve el público (publicProperty)
export function matchAlert(f, p) {
  if (p.status !== 'disponible') return false;
  if (f.op && p.operation !== f.op) return false;
  if (f.types.length && !f.types.includes(p.type)) return false;
  if (f.zones.length && !f.zones.includes(p.zone)) return false;
  if (f.min != null || f.max != null) {
    if (p.price_on_request || p.price == null || p.currency !== f.cur) return false;
    if (f.min != null && !(Number(p.price) >= f.min)) return false;
    if (f.max != null && !(Number(p.price) <= f.max)) return false;
  }
  if (f.beds && !(Number(p.bedrooms) >= f.beds)) return false;
  if (f.baths && !(Number(p.bathrooms) >= f.baths)) return false;
  if (f.m2 && !(Math.max(Number(p.construction_m2) || 0, Number(p.land_m2) || 0) >= f.m2)) return false;
  if (f.feat.length && !f.feat.every((k) => hasFeat(p, k))) return false;
  if (f.q) { const hay = noAcc([p.title, p.zone, p.public_location, p.description, TYPE_ES[p.type], p.ref_code].join(' ')); if (!noAcc(f.q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false; }
  return true;
}
export const newAlertToken = () => token(24);

function listingRows(list, base) {
  return list.map((p) => {
    const url = `${base}/inmueble.html?id=${refNum(p.ref_code)}`;
    const price = p.price_on_request || p.price == null ? 'Precio a consultar' : money(p.price, p.currency) + (p.operation === 'renta' ? ' al mes' : '');
    const drop = p.price_prev ? ` <span style="color:#B3261E">(antes ${esc(money(p.price_prev, p.currency))})</span>` : '';
    return `<tr><td style="padding:10px 0;border-bottom:1px solid #E3E8EE"><a href="${esc(url)}" style="color:#0E1E33;font-weight:bold;text-decoration:none">${esc(p.title)}</a><br>
      <span style="color:#536074;font-size:13px">${esc(TYPE_ES[p.type] || '')} en ${esc(p.zone || p.public_location || 'Reynosa')} · ${esc(p.ref_code)}</span><br>
      <b style="color:#0E1E33">${esc(price)}</b>${drop}</td></tr>`;
  }).join('');
}

// Manda las alertas que tengan algo nuevo. Devuelve cuántos correos salieron.
// until: hora límite (ms); lo que no alcance a salir se manda mañana
export async function sendAlerts(db, props, base, conf, until) {
  const alerts = await db.collection('alerts').find({ active: true, email: { $ne: null } }, { sort: { last_sent_at: 1 } }).toArray();
  let sent = 0;
  for (const al of alerts) {
    if (until && Date.now() > until) break;
    const since = new Date(al.last_sent_at || al.created_at || 0);
    const fresh = props.filter((p) => matchAlert(al.filters || cleanAlert({}), p)
      && ((p.published_at && new Date(p.published_at) > since) || (p.price_changed_at && new Date(p.price_changed_at) > since)));
    if (!fresh.length) continue;
    const first = String(al.full_name || '').trim().split(/\s+/)[0];
    const off = `${base}/api/public?a=unsub&t=${encodeURIComponent(al.token)}`;
    const wa = conf.whatsapp ? `https://wa.me/${String(conf.whatsapp).replace(/\D/g, '')}` : '';
    const subject = fresh.length === 1 ? `Nueva propiedad que coincide con tu búsqueda · ${fresh[0].ref_code}` : `${fresh.length} propiedades nuevas que coinciden con tu búsqueda`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1B2533;max-width:560px">
      <p style="margin:0 0 4px;font-size:13px;color:#1A529A;font-weight:bold">INMOBILIARIA CRUMEX</p>
      <h2 style="margin:0 0 12px;color:#0E1E33">Hola ${esc(first)}, esto llegó para ti</h2>
      <p>Estas propiedades coinciden con la búsqueda que nos dejaste:</p>
      <table style="width:100%;border-collapse:collapse">${listingRows(fresh.slice(0, 8), base)}</table>
      ${fresh.length > 8 ? `<p><a href="${esc(base)}/catalogo.html">Ver las ${fresh.length} en el catálogo</a></p>` : ''}
      <p style="margin:18px 0">${wa ? `<a href="${esc(wa)}" style="background:#128045;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Preguntar por WhatsApp</a>` : ''}</p>
      <p style="font-size:12px;color:#536074">Te escribimos porque pediste una alerta en nuestro sitio. <a href="${esc(off)}" style="color:#536074">Ya no quiero recibir estas alertas</a>.</p></div>`;
    const text = `Hola ${first}, estas propiedades coinciden con tu búsqueda:\n\n` + fresh.slice(0, 8).map((p) => `${p.title} (${p.ref_code})\n${base}/inmueble.html?id=${refNum(p.ref_code)}`).join('\n\n') + `\n\nPara dejar de recibir alertas: ${off}`;
    const headers = { 'List-Unsubscribe': `<${off}&ok=1>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
    if (await sendEmail({ to: al.email, subject, html, text, reply_to: conf.email || undefined, headers }).catch(() => false)) {
      sent++; await db.collection('alerts').updateOne({ _id: al._id }, { $set: { last_sent_at: new Date() }, $inc: { sent_count: 1 } });
    }
  }
  return sent;
}

// Recordatorio al cliente: visitas de las próximas 36 horas que aún no se recordaron
export async function sendVisitReminders(db, base, conf, until) {
  const now = Date.now();
  const visits = await db.collection('visits').find({ status: { $in: ['pendiente', 'confirmada'] }, reminded_at: null, scheduled_at: { $gt: new Date(now), $lt: new Date(now + 36 * 3600e3) } }, { sort: { scheduled_at: 1 } }).toArray();
  let sent = 0;
  for (const v of visits) {
    if (until && Date.now() > until) break;
    const lead = v.lead_id ? await db.collection('leads').findOne({ _id: v.lead_id }, { projection: { full_name: 1, email: 1 } }) : null;
    const contact = v.contact_id ? await db.collection('contacts').findOne({ _id: v.contact_id }, { projection: { full_name: 1, email: 1 } }) : null;
    const who = (lead && lead.email) ? lead : (contact && contact.email) ? contact : null;
    if (!who) continue;
    const p = await db.collection('properties').findOne({ _id: v.property_id }, { projection: { ref_code: 1, title: 1 } }); if (!p) continue;
    const when = new Date(v.scheduled_at).toLocaleString('es-MX', { timeZone: 'America/Matamoros', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
    const wa = conf.whatsapp ? `https://wa.me/${String(conf.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, sobre mi visita a ${p.ref_code} el ${when}:`)}` : '';
    const first = String(who.full_name || '').trim().split(/\s+/)[0];
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1B2533;max-width:560px">
      <p style="margin:0 0 4px;font-size:13px;color:#1A529A;font-weight:bold">INMOBILIARIA CRUMEX</p>
      <h2 style="margin:0 0 12px;color:#0E1E33">Hola ${esc(first)}, te esperamos</h2>
      <p>Te recordamos tu visita a <b>${esc(p.ref_code)} · ${esc(p.title)}</b> el <b>${esc(when)}</b>.</p>
      <p>Si ya no puedes ir o quieres cambiar la hora, avísanos y la movemos.</p>
      ${wa ? `<p style="margin:18px 0"><a href="${esc(wa)}" style="background:#128045;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Escribir por WhatsApp</a></p>` : ''}
      <p style="font-size:13px;color:#536074"><a href="${esc(base)}/inmueble.html?id=${refNum(p.ref_code)}">Ver la propiedad</a></p></div>`;
    const text = `Hola ${first}, te recordamos tu visita a ${p.ref_code} · ${p.title} el ${when}.\nSi ya no puedes ir, avísanos.${wa ? '\nWhatsApp: ' + wa : ''}`;
    if (await sendEmail({ to: who.email, subject: `Tu visita a ${p.ref_code} es ${when}`, html, text, reply_to: conf.email || undefined }).catch(() => false)) {
      sent++; await db.collection('visits').updateOne({ _id: v._id }, { $set: { reminded_at: new Date() } });
    }
  }
  return sent;
}

// Catálogo para anuncios de inmuebles de Meta (formato XML "listings"). Solo propiedades disponibles y con foto.
const xml = (s) => String(s ?? '').replace(/[<>&'"\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] || ''));
const META_TYPE = { casa: 'house', departamento: 'apartment', terreno: 'land', nave: 'other' };
export function metaFeed(props, base, conf, imgUrl) {
  const items = props.filter((p) => p.status === 'disponible' && (p.photos || []).some((ph) => !ph.plan) && !p.price_on_request && p.price != null && p.zone_lat != null && p.zone_lng != null);
  const one = (p) => {
    const n = refNum(p.ref_code); const imgs = p.photos.filter((ph) => !ph.plan).slice(0, 20);
    const t = (k, v) => (v === null || v === undefined || v === '' ? '' : `<${k}>${xml(v)}</${k}>`);
    return `<listing>${t('home_listing_id', p.ref_code)}${t('name', p.title)}${t('availability', p.operation === 'renta' ? 'for_rent' : 'for_sale')}
<address format="simple"><component name="addr1">${xml(p.public_location || p.zone || 'Reynosa')}</component><component name="city">Reynosa</component><component name="region">Tamaulipas</component><component name="country">Mexico</component>${conf.cp ? `<component name="postal_code">${xml(conf.cp)}</component>` : ''}</address>
${t('latitude', p.zone_lat)}${t('longitude', p.zone_lng)}${t('neighborhood', p.zone || p.public_location)}${t('description', String(p.description || p.title).slice(0, 5000))}
${t('price', `${Math.round(Number(p.price))} ${p.currency}`)}${t('property_type', META_TYPE[p.type] || 'other')}${t('listing_type', p.operation === 'renta' ? 'for_rent_by_agent' : 'for_sale_by_agent')}
${t('num_beds', p.bedrooms)}${t('num_baths', p.bathrooms)}${p.construction_m2 || p.land_m2 ? t('area_size', p.construction_m2 || p.land_m2) + '<area_unit>sq_m</area_unit>' : ''}${t('year_built', p.age_years != null ? new Date().getFullYear() - Number(p.age_years) : null)}
${imgs.map((ph) => `<image><url>${xml(imgUrl(ph.path, base))}</url></image>`).join('')}${t('url', `${base}/inmueble.html?id=${n}`)}</listing>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>\n<listings>\n<title>${xml(conf.site || 'INMOBILIARIA CRUMEX')}</title>\n<link rel="self" href="${xml(base)}/api/public?a=feed"/>\n${items.map(one).join('\n')}\n</listings>\n`;
}
