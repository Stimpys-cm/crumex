// INMOBILIARIA CRUMEX · lo que usa el sitio público (sin sesión)
//   GET  /api/public            todo lo público de una vez: ajustes, propiedades, zonas, equipo,
//                               guías y testimonios aprobados (sin datos privados)
//   POST /api/public?a=lead     formulario del sitio → prospecto (y aviso por correo/Telegram)
//   POST /api/public?a=track    estadística anónima (vista, whatsapp, favorita, compartir, ficha)
//   GET  /api/public?a=feed     catálogo XML para anuncios de inmuebles de Meta (Facebook / Instagram)
//   GET  /api/public?a=unsub&t= dejar de recibir alertas de búsqueda (confirma con &ok=1; POST = baja en un clic)
//   GET  /api/public?a=visit&t= · POST ?a=feedback   encuesta después de una visita (opinion.html)
import { getDB, nextSeq } from './_db.js';
import { HttpError, bad, body, handle, origin, rateLimit, requireAjax, sendJSON, uuid } from './_http.js';
import { EVENT_KINDS, PUBLIC_STATUS, localDay, publicBundle, cleanOrigin, channelOf } from './_rules.js';
import { notifyLead, replyToLead } from './_mail.js';
import { propertyReport } from './_report.js';
import { cleanAlert, newAlertToken, metaFeed } from './_alerts.js';

const PUBLIC_KINDS = ['contacto', 'visita', 'valuacion', 'captacion', 'credito'];
const str = (v, max) => { const s = String(v ?? '').trim(); return s ? s.slice(0, max) : null; };

export default handle(async (req, res) => {
  const a = String(req.query.a || '');
  const db = await getDB();

  if (req.method === 'GET' && !a) {
    // El navegador siempre pide la versión vigente (sin "stale-while-revalidate", que le mostraría datos viejos al recargar);
    // la red de Vercel sí la guarda 30 s y puede servir la anterior mientras se actualiza.
    res.setHeader('CDN-Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    return sendJSON(res, 200, await publicBundle(db), 'public, max-age=0, s-maxage=30');
  }
  // reporte del propietario con su enlace privado: reporte.html?t=…
  if (req.method === 'GET' && a === 'owner-report') {
    if (!(await rateLimit(db, req, 'owner', 60, 600))) throw new HttpError(429, 'Demasiadas consultas. Intenta en unos minutos.', 'limit');
    const t = String(req.query.t || ''); if (!/^[\w-]{24,64}$/.test(t)) throw new HttpError(404, 'Este enlace no es válido o ya no está activo.');
    const p = await db.collection('properties').findOne({ owner_token: t }, { projection: { _id: 1 } });
    if (!p) throw new HttpError(404, 'Este enlace no es válido o ya no está activo. Pide uno nuevo a tu asesor.');
    return sendJSON(res, 200, await propertyReport(db, p._id, true), 'private, no-store');
  }
  // catálogo para anuncios de Meta
  if (req.method === 'GET' && a === 'feed') {
    const bundle = await publicBundle(db); const base = origin(req);
    const imgUrl = (path) => (/^https:\/\//.test(path) ? path : base + path);
    const xmlOut = metaFeed(bundle.properties, base, Object.assign({ site: 'INMOBILIARIA CRUMEX' }, bundle.settings), imgUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8'); res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900');
    return res.status(200).send(xmlOut);
  }
  // dejar de recibir alertas (enlace en cada correo). Va en dos pasos porque los antivirus del correo abren
  // los enlaces solos; el botón "darse de baja" del propio Gmail/Outlook llega por POST (un clic, RFC 8058).
  if (a === 'unsub' && (req.method === 'GET' || req.method === 'POST')) {
    const t = String(req.query.t || ''); const valid = /^[\w-]{24,64}$/.test(t);
    const go = req.method === 'POST' || req.query.ok === '1';
    if (valid && go) await db.collection('alerts').updateOne({ token: t, active: true }, { $set: { active: false, unsubscribed_at: new Date() } });
    if (req.method === 'POST') return sendJSON(res, 200, { ok: true });
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex');
    const page = (title, inner) => `<!doctype html><html lang="es-MX"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><body style="font-family:system-ui,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#18212E;line-height:1.5">${inner}</body></html>`;
    if (!valid) return res.status(200).send(page('Enlace no válido', '<h1 style="font-size:1.5rem">Este enlace no es válido</h1><p>Si te siguen llegando alertas, responde el correo y te damos de baja a mano.</p>'));
    if (!go) return res.status(200).send(page('Dejar de recibir alertas', `<h1 style="font-size:1.5rem">¿Ya no quieres recibir alertas?</h1><p>Dejarás de recibir los correos con propiedades nuevas que coinciden con tu búsqueda.</p><p style="margin:24px 0"><a href="/api/public?a=unsub&amp;t=${encodeURIComponent(t)}&amp;ok=1" style="background:#0E1E33;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Sí, darme de baja</a></p><p><a href="/catalogo.html" style="color:#0E1E33">No, seguir recibiéndolas</a></p>`));
    return res.status(200).send(page('Alertas canceladas', '<h1 style="font-size:1.5rem">Listo, ya no te mandaremos alertas</h1><p>Si cambias de opinión, puedes crear una nueva desde el <a href="/catalogo.html" style="color:#0E1E33">catálogo</a>.</p>'));
  }
  // encuesta después de la visita: datos mínimos para mostrar la propiedad
  if (req.method === 'GET' && a === 'visit') {
    const t = String(req.query.t || ''); if (!/^[\w-]{24,64}$/.test(t)) throw new HttpError(404, 'Este enlace no es válido.');
    const v = await db.collection('visits').findOne({ feedback_token: t }, { projection: { property_id: 1, scheduled_at: 1, feedback: 1 } });
    if (!v) throw new HttpError(404, 'Este enlace no es válido o ya no está activo.');
    const p = await db.collection('properties').findOne({ _id: v.property_id }, { projection: { ref_code: 1, title: 1 } });
    return sendJSON(res, 200, { ref_code: p ? p.ref_code : null, title: p ? p.title : null, scheduled_at: v.scheduled_at, done: !!v.feedback }, 'private, no-store');
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.');
  requireAjax(req);
  const b = body(req);

  if (a === 'lead') {
    if (!(await rateLimit(db, req, 'lead', 8, 600))) throw new HttpError(429, 'Recibimos varios mensajes seguidos desde tu conexión. Espera unos minutos o escríbenos por WhatsApp.', 'limit');
    if (b.website) return sendJSON(res, 200, { ok: true }); // trampa para robots
    const kind = PUBLIC_KINDS.includes(b.kind) ? b.kind : 'contacto';
    const full_name = str(b.full_name, 120); const phone = str(b.phone, 30);
    if (!full_name || full_name.length < 2) throw bad('Escribe tu nombre.');
    if (!phone || phone.replace(/\D/g, '').length < 7) throw bad('Escribe un teléfono válido (mínimo 7 dígitos).');
    if (!b.privacy) throw bad('Debes aceptar el aviso de privacidad.');
    const email = str(b.email, 160); if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('Escribe un correo válido.');
    let prop = null;
    if (b.property_id) { prop = await db.collection('properties').findOne({ _id: String(b.property_id).slice(0, 64), status: { $in: PUBLIC_STATUS } }, { projection: { ref_code: 1, title: 1, advisor_id: 1 } }); }
    const payload = {};
    if (b.payload && typeof b.payload === 'object' && !Array.isArray(b.payload)) Object.entries(b.payload).slice(0, 25).forEach(([k, v]) => { if (/^\w{1,40}$/.test(k) && v !== null && v !== undefined && v !== '') payload[k] = typeof v === 'number' || typeof v === 'boolean' ? v : String(v).slice(0, 300); });
    if (Buffer.byteLength(JSON.stringify(payload)) > 4000) throw bad('El formulario trae demasiados datos.');
    const now = new Date();
    const lead = { _id: uuid(), kind, status: 'nuevo', full_name, phone, email: email ? email.toLowerCase() : null, message: str(b.message, 2000), property_id: prop ? prop._id : null, contact_id: null, payload, source: 'web', privacy_accepted_at: now, assigned_to: null, notes: null, created_at: now, updated_at: now };
    lead.origin = cleanOrigin(b.origin); lead.channel = channelOf(lead.origin);
    const advisor = await assignLead(db, prop);
    if (advisor) lead.assigned_to = advisor._id;
    await db.collection('leads').insertOne(lead);
    // alerta de búsqueda: si dejó correo, cada mañana le llega lo nuevo que coincida
    if (b.alert && lead.email) {
      const filters = cleanAlert(b.alert); const same = await db.collection('alerts').findOne({ email: lead.email, active: true, filters });
      if (!same && (await db.collection('alerts').countDocuments({ email: lead.email, active: true })) < 10)
        await db.collection('alerts').insertOne({ _id: uuid(), email: lead.email, full_name, phone, lead_id: lead._id, filters, token: newAlertToken(), active: true, created_at: now, last_sent_at: now, sent_count: 0 });
    }
    const conf = {}; (await db.collection('settings').find({ _id: { $in: ['email', 'phone', 'whatsapp', 'auto_reply'] } }).toArray()).forEach((r) => { conf[r._id] = r.value; });
    await Promise.all([
      notifyLead(lead, prop, origin(req), advisor).catch((e) => console.error('[crumex] aviso', e.message)),
      replyToLead(lead, prop, conf, origin(req)).catch((e) => console.error('[crumex] respuesta', e.message))
    ]);
    return sendJSON(res, 200, { ok: true });
  }

  if (a === 'feedback') {
    if (!(await rateLimit(db, req, 'feedback', 10, 600))) throw new HttpError(429, 'Demasiados envíos. Intenta en unos minutos.', 'limit');
    const t = String(b.t || ''); if (!/^[\w-]{24,64}$/.test(t)) throw new HttpError(404, 'Este enlace no es válido.');
    const v = await db.collection('visits').findOne({ feedback_token: t }, { projection: { _id: 1, feedback: 1 } });
    if (!v) throw new HttpError(404, 'Este enlace no es válido o ya no está activo.');
    if (v.feedback) return sendJSON(res, 200, { ok: true, already: true });
    const rating = Math.round(Number(b.rating)); if (!(rating >= 1 && rating <= 5)) throw bad('Elige de 1 a 5 estrellas.');
    const interest = ['si', 'tal_vez', 'no'].includes(b.interest) ? b.interest : null;
    const fb = { rating, interest, liked: str(b.liked, 300), concern: str(b.concern, 300), at: new Date() };
    await db.collection('visits').updateOne({ _id: v._id }, { $set: { feedback: fb } });
    return sendJSON(res, 200, { ok: true });
  }

  if (a === 'track') {
    // Anónimo: número al azar del navegador, sin nombre, teléfono ni IP guardada
    if (!(await rateLimit(db, req, 'track', 120, 60))) return sendJSON(res, 200, { ok: false });
    const kind = String(b.kind || ''); const pid = String(b.property_id || '').slice(0, 64);
    if (!EVENT_KINDS.includes(kind) || !pid) return sendJSON(res, 200, { ok: false });
    const visitor = /^[a-f0-9]{8,40}$/.test(String(b.visitor || '')) ? String(b.visitor) : null;
    const p = await db.collection('properties').findOne({ _id: pid, status: { $in: PUBLIC_STATUS } }, { projection: { _id: 1 } });
    if (!p) return sendJSON(res, 200, { ok: false });
    const ev = db.collection('events');
    if (visitor && await ev.findOne({ property_id: pid, kind, visitor, created_at: { $gt: new Date(Date.now() - 30 * 60e3) } }, { projection: { _id: 1 } })) return sendJSON(res, 200, { ok: true, dup: true });
    if ((await ev.countDocuments({ property_id: pid, created_at: { $gt: new Date(Date.now() - 3600e3) } })) >= 400) return sendJSON(res, 200, { ok: false });
    const now = new Date();
    await ev.insertOne({ _id: uuid(), property_id: pid, kind, visitor, created_at: now, day: localDay(now) });
    return sendJSON(res, 200, { ok: true });
  }
  throw new HttpError(404, 'Acción desconocida.');
});

// A quién le toca el prospecto (Panel > Ajustes > Reparto de prospectos):
//   asesor  → al asesor de la propiedad, si tiene y su cuenta está activa (opción por defecto)
//   turnos  → igual, y si la propiedad no tiene asesor, por turnos entre los asesores activos
//   no      → nadie; se reparten a mano en el panel
async function assignLead(db, prop) {
  try {
    const s = await db.collection('settings').findOne({ _id: 'lead_assign' });
    const mode = (s && s.value) || 'asesor';
    if (mode === 'no') return null;
    const users = db.collection('users'); const proj = { projection: { full_name: 1, email: 1, role: 1 } };
    if (prop && prop.advisor_id) { const u = await users.findOne(Object.assign({ _id: prop.advisor_id, active: true }), proj); if (u) return u; }
    if (mode !== 'turnos') return null;
    const team = await users.find({ active: true, role: 'agent' }, Object.assign({ sort: { created_at: 1 } }, proj)).toArray();
    if (!team.length) return null;
    return team[(await nextSeq(db, 'lead_turn') - 1) % team.length];
  } catch (e) { console.warn('[crumex] reparto', e.message); return null; }
}
