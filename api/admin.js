// INMOBILIARIA CRUMEX · todo lo del panel (requiere sesión de un usuario activo)
//   GET  ?a=list&t=tabla            registros de una tabla (zones, contacts, leads, visits, deals, articles, testimonials, profiles)
//   POST ?a=save&t=tabla            { row, isNew }
//   POST ?a=delete&t=tabla          { id }
//   GET  ?a=properties              propiedades con todos sus datos internos
//   POST ?a=property                { row, photos }        crear o editar
//   POST ?a=status                  { id, status }
//   POST ?a=property-delete         { id }
//   GET  ?a=settings · POST ?a=settings
//   GET  ?a=poll                    prospectos recientes y seguimientos vencidos (avisos del panel)
//   GET  ?a=stats&k=summary|daily   estadísticas
//   GET  ?a=docs&p= · POST ?a=doc-add · GET ?a=doc-url&id= · POST ?a=doc-delete
//   POST ?a=sign                    firma para subir a Cloudinary (o indica que se guarda en MongoDB)
//   POST ?a=upload                  subir foto o documento a MongoDB (sin Cloudinary)
//   GET  ?a=report&id=              reporte para el propietario
//   GET  ?a=activity&u=&t=&before=  bitácora (solo administradores)
import { getDB, out } from './_db.js';
import { HttpError, bad, body, handle, requireAjax, sendJSON, uuid, token, origin, esc } from './_http.js';
import { requireStaff, requireAdmin, hashPassword, validPassword, publicUser } from './_auth.js';
import { TABLES, DOC_KINDS, SETTING_KEYS, LEAD_ASSIGN, saveRow, deleteRow, saveProperty, setPropertyStatus, deleteProperty, idOf, logActivity } from './_rules.js';
import { propertyReport } from './_report.js';
import { signUpload, storeFile, deleteStored, privateDownloadUrl, cloudReady, storageMode, cloudPing } from './_files.js';
import { mailReady, sendEmail, sendTelegram } from './_mail.js';
import { buildDigest } from './_digest.js';

export default handle(async (req, res) => {
  const a = String(req.query.a || ''); const t = String(req.query.t || '');
  const db = await getDB();
  const user = await requireStaff(db, req);
  requireAjax(req);
  const b = req.method === 'POST' ? body(req) : {};
  const ok = (data) => sendJSON(res, 200, data);
  const GET = req.method === 'GET', POST = req.method === 'POST';

  /* ---------- tablas ---------- */
  if (GET && a === 'list') {
    if (t === 'profiles') return ok((await db.collection('users').find({}, { sort: { full_name: 1 } }).toArray()).map(publicUser));
    const T = TABLES[t]; if (!T) throw new HttpError(404, 'Tabla desconocida.');
    return ok((await db.collection(t).find({}, { sort: T.sort || { created_at: -1 }, limit: 5000 }).toArray()).map(out));
  }
  if (POST && a === 'save') {
    if (t === 'profiles') return ok(await saveUser(db, user, b.row || {}, !!b.isNew));
    return ok(await saveRow(db, user, t, b.row || {}, !!b.isNew));
  }
  if (POST && a === 'delete') {
    if (t === 'profiles') { await deleteUser(db, user, b.id); return ok({ ok: true }); }
    await deleteRow(db, user, t, b.id); return ok({ ok: true });
  }

  /* ---------- propiedades ---------- */
  if (GET && a === 'properties') {
    const [props, zones, people] = await Promise.all([db.collection('properties').find({}, { sort: { created_at: -1 } }).toArray(), db.collection('zones').find({}).toArray(), db.collection('users').find({}, { projection: { full_name: 1 } }).toArray()]);
    const zn = new Map(zones.map((z) => [z._id, z.name])); const pn = new Map(people.map((u) => [u._id, u.full_name]));
    return ok(props.map((p) => Object.assign(out(p), { zone: zn.get(p.zone_id) || null, updated_by_name: pn.get(p.updated_by) || null, photos: (p.photos || []).map((ph) => ({ id: ph.id, path: ph.path, url: ph.path, thumb: ph.thumb || null, alt: ph.alt || '', public_id: ph.public_id || null })) })));
  }
  if (POST && a === 'property') return ok({ id: await saveProperty(db, user, b.row, b.photos) });
  if (POST && a === 'status') { await setPropertyStatus(db, user, b.id, b.status); return ok({ ok: true }); }
  if (POST && a === 'property-delete') { await deleteProperty(db, user, b.id); return ok({ ok: true }); }

  /* ---------- ajustes del sitio ---------- */
  if (GET && a === 'settings') { const o = {}; (await db.collection('settings').find({}).toArray()).forEach((r) => { o[r._id] = r.value; }); return ok(o); }
  if (POST && a === 'settings') {
    requireAdmin(user);
    const changed = [];
    const prev = {}; (await db.collection('settings').find({}).toArray()).forEach((r) => { prev[r._id] = r.value; });
    for (const [k, v] of Object.entries(b)) {
      if (!SETTING_KEYS.includes(k)) continue;
      const s = String(v ?? '').trim().slice(0, 20000);
      if (k === 'lead_assign' && !LEAD_ASSIGN.includes(s)) throw bad('Reparto de prospectos: opción no válida.');
      if ((prev[k] ?? '') !== s) changed.push(k);
      if (['facebook', 'instagram'].includes(k) && s && !/^https:\/\/[^\s<>"']+$/.test(s)) throw bad(`${k === 'facebook' ? 'Facebook' : 'Instagram'}: pon la dirección completa, empezando con https://`);
      if (['google_review_url', 'google_maps_url'].includes(k) && s && !/^https:\/\/[^\s<>"']+$/.test(s)) throw bad('Los enlaces de Google deben empezar con https://');
      if (k === 'google_rating' && s && !(Number(s) >= 1 && Number(s) <= 5)) throw bad('La calificación de Google va de 1 a 5 (ej. 4.8).');
      if (k === 'google_reviews' && s && !/^\d{1,6}$/.test(s)) throw bad('El número de reseñas debe ser un número entero.');
      if (k === 'cp' && s && !/^\d{5}$/.test(s)) throw bad('El código postal debe tener 5 dígitos.');
      if (k === 'rfc' && s && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(s)) throw bad('El RFC no tiene el formato correcto (12 o 13 caracteres).');
      await db.collection('settings').updateOne({ _id: k }, { $set: { value: s, updated_at: new Date(), updated_by: user._id } }, { upsert: true });
    }
    if (changed.length) await logActivity(db, user, 'editar', 'settings', null, 'Ajustes del sitio', 'cambió: ' + changed.join(', '));
    return ok({ ok: true });
  }

  /* ---------- avisos del panel ---------- */
  if (GET && a === 'poll') {
    const proj = { projection: { full_name: 1, kind: 1, status: 1, created_at: 1, follow_up_at: 1, follow_up_note: 1 } };
    const [latest, due] = await Promise.all([
      db.collection('leads').find({}, Object.assign({ sort: { created_at: -1 }, limit: 25 }, proj)).toArray(),
      db.collection('leads').find({ follow_up_at: { $lte: new Date() }, status: { $nin: ['ganado', 'descartado'] } }, Object.assign({ sort: { follow_up_at: 1 }, limit: 25 }, proj)).toArray()
    ]);
    return ok({ latest: latest.map(out), due: due.map(out) });
  }

  /* ---------- estadísticas ---------- */
  if (GET && a === 'stats') {
    const ev = db.collection('events');
    if (req.query.k === 'daily') {
      const rows = await ev.aggregate([{ $match: { created_at: { $gt: new Date(Date.now() - 120 * 864e5) } } }, { $group: { _id: { day: '$day', kind: '$kind' }, n: { $sum: 1 } } }]).toArray();
      return ok(rows.map((r) => ({ day: r._id.day, kind: r._id.kind, n: r.n })).sort((x, y) => String(x.day).localeCompare(String(y.day))));
    }
    const group = (match) => ev.aggregate([{ $match: match }, { $group: { _id: { p: '$property_id', k: '$kind' }, n: { $sum: 1 }, last: { $max: '$created_at' } } }]).toArray();
    const [all, d30, d7, props] = await Promise.all([group({}), group({ created_at: { $gt: new Date(Date.now() - 30 * 864e5) } }), group({ kind: 'vista', created_at: { $gt: new Date(Date.now() - 7 * 864e5) } }), db.collection('properties').find({}, { projection: { _id: 1 } }).toArray()]);
    const m = new Map(props.map((p) => [p._id, { property_id: p._id, views_7d: 0, views_30d: 0, views_total: 0, wa_30d: 0, wa_total: 0, fav_total: 0, share_total: 0, sheet_total: 0, last_view: null }]));
    const at = (r) => m.get(r._id.p);
    all.forEach((r) => { const x = at(r); if (!x) return; const k = { vista: 'views_total', whatsapp: 'wa_total', favorita: 'fav_total', compartir: 'share_total', ficha: 'sheet_total' }[r._id.k]; if (k) x[k] = r.n; if (r._id.k === 'vista') x.last_view = r.last; });
    d30.forEach((r) => { const x = at(r); if (!x) return; if (r._id.k === 'vista') x.views_30d = r.n; if (r._id.k === 'whatsapp') x.wa_30d = r.n; });
    d7.forEach((r) => { const x = at(r); if (x) x.views_7d = r.n; });
    return ok([...m.values()]);
  }

  /* ---------- reporte para el propietario (solo cifras, sin datos de los interesados) ---------- */
  if (GET && a === 'report') return ok(await propertyReport(db, idOf(req.query.id)));
  // enlace privado para que el propietario vea su reporte sin contraseña (se puede quitar cuando quieras)
  if (POST && a === 'owner-link') {
    const p = await db.collection('properties').findOne({ _id: idOf(b.id) }, { projection: { owner_token: 1, ref_code: 1, title: 1 } }); if (!p) throw new HttpError(404, 'Propiedad no encontrada.');
    if (b.revoke) { await db.collection('properties').updateOne({ _id: p._id }, { $set: { owner_token: null } }); await logActivity(db, user, 'editar', 'properties', p._id, `${p.ref_code} ${p.title}`, 'quitó el enlace del propietario'); return ok({ token: null }); }
    if (p.owner_token) return ok({ token: p.owner_token });
    const t = token(24);
    await db.collection('properties').updateOne({ _id: p._id }, { $set: { owner_token: t, owner_token_at: new Date() } });
    await logActivity(db, user, 'editar', 'properties', p._id, `${p.ref_code} ${p.title}`, 'creó el enlace del propietario');
    return ok({ token: t });
  }
  if (POST && a === 'owner-notes') {
    const notes = String(b.notes ?? '').slice(0, 2000);
    const r = await db.collection('properties').updateOne({ _id: idOf(b.id) }, { $set: { owner_notes: notes } });
    if (!r.matchedCount) throw new HttpError(404, 'Propiedad no encontrada.');
    return ok({ ok: true });
  }

  /* ---------- documentos privados ---------- */
  // documentos privados de una propiedad (?p=) o el expediente de un contacto (?c=)
  const docOwner = async (o) => {
    if (o.contact_id != null && o.contact_id !== '') { const c = await db.collection('contacts').findOne({ _id: idOf(o.contact_id) }, { projection: { _id: 1 } }); if (!c) throw bad('Contacto no encontrado.'); return { property_id: null, contact_id: c._id }; }
    const prop = await db.collection('properties').findOne({ _id: idOf(o.property_id) }, { projection: { _id: 1 } }); if (!prop) throw bad('Propiedad no encontrada.'); return { property_id: prop._id };
  };
  if (GET && a === 'docs') {
    const q = req.query.c ? { contact_id: idOf(req.query.c) } : { property_id: idOf(req.query.p) };
    const rows = await db.collection('documents').find(q, { sort: { created_at: -1 } }).toArray();
    return ok(rows.map(out));
  }
  if (GET && a === 'doc-url') {
    const d = await db.collection('documents').findOne({ _id: idOf(req.query.id) }); if (!d) throw new HttpError(404, 'Documento no encontrado.');
    return ok({ url: d.storage === 'cloudinary' ? privateDownloadUrl(d.public_id, d.resource_type || 'raw', d.format) : `/api/file?id=${d.file_id}` });
  }
  if (POST && a === 'doc-delete') {
    const d = await db.collection('documents').findOne({ _id: idOf(b.id) }); if (!d) return ok({ ok: true });
    if (user.role !== 'admin' && d.uploaded_by !== user._id) throw new HttpError(403, 'Solo quien lo subió o un administrador puede borrarlo.', 'forbidden');
    await deleteStored(db, d.storage === 'mongo' ? `/api/file?id=${d.file_id}` : null, d.public_id, d.resource_type || 'raw', d.storage === 'cloudinary');
    await db.collection('documents').deleteOne({ _id: d._id });
    await logActivity(db, user, 'borrar', 'documents', d._id, d.name, d.contact_id ? 'del expediente del contacto ' + String(d.contact_id) : 'de la propiedad ' + String(d.property_id));
    return ok({ ok: true });
  }
  if (POST && a === 'doc-add') {
    if (!cloudReady()) throw bad('Cloudinary no está configurado.');
    const owner = await docOwner(b);
    const pid = String(b.public_id || ''); if (!/^crumex\/documentos\/[\w\-./]{1,200}$/.test(pid)) throw bad('Documento no válido.');
    const doc = { _id: uuid(), ...owner, name: String(b.name || 'documento').slice(0, 160), kind: DOC_KINDS.includes(b.doc_kind) ? b.doc_kind : 'otro', storage: 'cloudinary', public_id: pid, resource_type: 'raw', format: b.format ? String(b.format).slice(0, 10) : null, size_bytes: Number(b.bytes) || 0, mime: b.mime ? String(b.mime).slice(0, 80) : null, uploaded_by: user._id, created_at: new Date() };
    await db.collection('documents').insertOne(doc); await logActivity(db, user, 'crear', 'documents', doc._id, doc.name); return ok(out(doc));
  }

  /* ---------- subir archivos ---------- */
  if (POST && a === 'sign') return ok(signUpload(b.kind === 'doc' ? 'doc' : 'photo'));
  if (POST && a === 'upload') {
    if (b.kind === 'doc') {
      const owner = await docOwner(b);
      const f = await storeFile(db, user, { kind: 'doc', data: b.data, name: b.name });
      const doc = { _id: uuid(), ...owner, name: String(b.name || 'documento').slice(0, 160), kind: DOC_KINDS.includes(b.doc_kind) ? b.doc_kind : 'otro', storage: 'mongo', file_id: f.file_id, size_bytes: f.bytes, mime: f.mime, uploaded_by: user._id, created_at: new Date() };
      await db.collection('documents').insertOne(doc); await logActivity(db, user, 'crear', 'documents', doc._id, doc.name); return ok(out(doc));
    }
    return ok(await storeFile(db, user, { kind: 'photo', data: b.data, name: b.name }));
  }
  if (GET && a === 'storage') return ok({ storage: storageMode() });

  /* ---------- resumen diario ---------- */
  if (GET && a === 'digest-preview') return ok(await buildDigest(db, user, origin(req)));
  if (POST && a === 'digest-test') {
    if (!mailReady()) throw bad('Para mandar correos falta configurar RESEND_API_KEY en Vercel.');
    const d = await buildDigest(db, user, origin(req));
    const sent = await sendEmail({ to: user.email, subject: d.subject, html: d.html, text: d.text });
    if (!sent) throw new HttpError(502, 'Resend no aceptó el correo. Revisa la API key y el remitente (AVISO_EMAIL_FROM).');
    return ok({ ok: true, to: user.email });
  }

  /* ---------- estado de las conexiones (solo administradores) ---------- */
  // enlace de la encuesta de una visita (las visitas viejas no tenían código)
  if (POST && a === 'visit-token') {
    const v = await db.collection('visits').findOne({ _id: idOf(b.id) }, { projection: { feedback_token: 1 } }); if (!v) throw new HttpError(404, 'Visita no encontrada.');
    if (v.feedback_token) return ok({ token: v.feedback_token });
    const t = token(24); await db.collection('visits').updateOne({ _id: v._id }, { $set: { feedback_token: t } }); return ok({ token: t });
  }
  // alertas de búsqueda que se mandan solas cada mañana
  if (GET && a === 'alerts') {
    const rows = await db.collection('alerts').find({}, { sort: { created_at: -1 }, limit: 300, projection: { token: 0 } }).toArray();
    return ok(rows.map(out));
  }
  if (POST && a === 'alert-off') {
    const r = await db.collection('alerts').findOne({ _id: idOf(b.id) }); if (!r) throw new HttpError(404, 'Alerta no encontrada.');
    await db.collection('alerts').updateOne({ _id: r._id }, { $set: { active: false } });
    await logActivity(db, user, 'editar', 'alerts', r._id, r.email, 'desactivó la alerta'); return ok({ ok: true });
  }

  if (GET && a === 'health') {
    requireAdmin(user);
    const t0 = Date.now(); const counts = {};
    for (const c of ['properties', 'leads', 'users', 'files']) counts[c] = await db.collection(c).countDocuments({});
    const ms = Date.now() - t0;
    const meta = await db.collection('meta').findOne({ _id: 'backup' });
    return ok({ db: { ok: true, ms, counts, name: process.env.MONGODB_DB || 'crumex' }, storage: storageMode(), cloud: cloudReady() ? await cloudPing() : null,
      mail: mailReady(), mail_to: !!process.env.AVISO_EMAIL_TO, mail_from: !!process.env.AVISO_EMAIL_FROM, telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      env: { SITE_URL: process.env.SITE_URL || null, SETUP_TOKEN: !!process.env.SETUP_TOKEN, CRON_SECRET: !!process.env.CRON_SECRET }, site: origin(req), last_backup: meta ? meta.at : null });
  }
  if (POST && a === 'health-test') {
    requireAdmin(user);
    if (b.what === 'mail') {
      if (!mailReady()) throw bad('Falta RESEND_API_KEY en Vercel.');
      const sent = await sendEmail({ to: user.email, subject: 'Correo de prueba · INMOBILIARIA CRUMEX', html: `<p>Hola ${esc(user.full_name || '')}. Si lees esto, los correos del panel funcionan.</p>`, text: 'Si lees esto, los correos del panel funcionan.' });
      if (!sent) throw new HttpError(502, 'Resend no aceptó el correo. Revisa la API key y el remitente (AVISO_EMAIL_FROM).');
      return ok({ ok: true, to: user.email });
    }
    if (b.what === 'telegram') {
      if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) throw bad('Faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en Vercel.');
      if (!(await sendTelegram('✅ Mensaje de prueba de INMOBILIARIA CRUMEX. Los avisos de Telegram funcionan.'))) throw new HttpError(502, 'Telegram no aceptó el mensaje. Revisa el token y el número de chat.');
      return ok({ ok: true });
    }
    throw bad('Prueba no válida.');
  }

  /* ---------- respaldo y restauración (solo administradores) ---------- */
  if (GET && a === 'meta') { const m = await db.collection('meta').findOne({ _id: 'backup' }); return ok({ last_backup: m ? m.at : null }); }
  if (GET && a === 'backup') {
    requireAdmin(user);
    const c = String(req.query.c || '');
    if (!BACKUP.includes(c)) return ok({ collections: await Promise.all(BACKUP.map(async (n) => ({ name: n, count: await db.collection(n).countDocuments({}) }))) });
    const skip = Math.max(0, Math.floor(Number(req.query.skip) || 0));
    const proj = c === 'users' ? { projection: { reset_hash: 0, reset_expires: 0, failed_logins: 0, locked_until: 0 } } : {};
    const docs = await db.collection(c).find({}, Object.assign({ sort: { _id: 1 }, skip, limit: 1500 }, proj)).toArray();
    return ok({ c, skip, docs });
  }
  if (POST && a === 'backup-done') {
    requireAdmin(user);
    await db.collection('meta').updateOne({ _id: 'backup' }, { $set: { at: new Date(), by: user._id } }, { upsert: true });
    await logActivity(db, user, 'crear', 'settings', null, 'Respaldo de la base', 'descargó un respaldo');
    return ok({ ok: true });
  }
  if (POST && a === 'restore') {
    requireAdmin(user);
    const c = String(b.c || ''); if (!BACKUP.includes(c) || c === 'meta') throw bad('Colección no válida.');
    if (!Array.isArray(b.docs) || b.docs.length > 1500) throw bad('Bloque de respaldo no válido.');
    const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;
    const revive = (v) => (Array.isArray(v) ? v.map(revive) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)])) : typeof v === 'string' && ISO.test(v) ? new Date(v) : v);
    let restored = 0, errors = 0;
    for (const raw of b.docs) {
      if (!raw || typeof raw !== 'object' || raw._id === undefined || raw._id === null) { errors++; continue; }
      const { _id, ...rest } = revive(raw);
      if (Object.keys(rest).some((k) => k.startsWith('$') || k.includes('.'))) { errors++; continue; }
      if (c === 'users' && _id === user._id) { delete rest.active; delete rest.role; } // nunca te quitas tu propio acceso al restaurar
      try { await db.collection(c).updateOne({ _id }, { $set: rest }, { upsert: true }); restored++; } catch (e) { errors++; }
    }
    if (b.last) await logActivity(db, user, 'editar', 'settings', null, 'Respaldo de la base', 'restauró un respaldo');
    return ok({ c, restored, errors });
  }

  /* ---------- bitácora ---------- */
  if (GET && a === 'activity') {
    requireAdmin(user);
    const q = {};
    if (req.query.u) q.user_id = String(req.query.u).slice(0, 64);
    if (req.query.t) q.table = String(req.query.t).slice(0, 20);
    if (req.query.before) { const d = new Date(String(req.query.before)); if (!isNaN(d)) q.at = { $lt: d }; }
    const rows = await db.collection('activity').find(q, { sort: { at: -1 }, limit: 150 }).toArray();
    return ok(rows.map(out));
  }
  throw new HttpError(404, 'Acción desconocida.');
});

const BACKUP = ['settings', 'users', 'zones', 'properties', 'contacts', 'leads', 'visits', 'deals', 'articles', 'testimonials', 'wanted', 'documents', 'price_history', 'events', 'activity', 'counters', 'meta', 'alerts'];

/* ---------- equipo (usuarios del panel) ---------- */
const USER_SELF = ['full_name', 'phone', 'job_title', 'photo_path', 'show_on_site', 'digest'];
async function activeAdmins(db) { return db.collection('users').countDocuments({ role: 'admin', active: true }); }
async function saveUser(db, me, row, isNew) {
  const isAdmin = me.role === 'admin'; const users = db.collection('users'); const now = new Date();
  const s = (v, max) => { const x = String(v ?? '').trim(); if (x.length > max) throw bad('Texto demasiado largo.'); return x || null; };
  if (isNew) {
    requireAdmin(me);
    const email = String(row.email || '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('Escribe un correo válido.');
    const name = s(row.full_name, 120); if (!name || name.length < 2) throw bad('Escribe el nombre.');
    validPassword(row.password);
    const u = { _id: uuid(), email, full_name: name, role: row.role === 'admin' ? 'admin' : 'agent', active: row.active !== false, pass_hash: await hashPassword(row.password), job_title: s(row.job_title, 80), phone: s(row.phone, 30), photo_path: null, show_on_site: !!row.show_on_site, created_at: now, updated_at: now };
    await users.insertOne(u); await logActivity(db, me, 'crear', 'users', u._id, `${u.full_name} (${u.role === 'admin' ? 'administrador' : 'asesor'})`); return publicUser(u);
  }
  const target = await users.findOne({ _id: idOf(row.id) }); if (!target) throw new HttpError(404, 'Usuario no encontrado.');
  if (!isAdmin && target._id !== me._id) throw new HttpError(403, 'Solo puedes editar tu propio perfil.', 'forbidden');
  const set = { updated_at: now };
  USER_SELF.forEach((k) => { if (k in row) set[k] = k === 'show_on_site' || k === 'digest' ? !!row[k] : s(row[k], k === 'full_name' ? 120 : k === 'photo_path' ? 300 : 80); });
  if ('full_name' in set && (!set.full_name || set.full_name.length < 2)) throw bad('Escribe el nombre.');
  let kick = false;
  if (isAdmin) {
    if ('email' in row) { const e = String(row.email || '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw bad('Escribe un correo válido.'); set.email = e; }
    if ('role' in row) set.role = row.role === 'admin' ? 'admin' : 'agent';
    if ('active' in row) set.active = !!row.active;
    if (target.role === 'admin' && target.active && (set.role === 'agent' || set.active === false) && (await activeAdmins(db)) <= 1) throw bad('Debe quedar al menos un administrador activo.');
    if (row.password) { validPassword(row.password); set.pass_hash = await hashPassword(row.password); set.failed_logins = 0; set.locked_until = null; kick = true; }
    if (set.active === false) kick = true;
  }
  await users.updateOne({ _id: target._id }, { $set: set });
  if (kick && target._id !== me._id) await db.collection('sessions').deleteMany({ user_id: target._id });
  const ch = [];
  if ('role' in set && set.role !== target.role) ch.push(`rol: ${set.role === 'admin' ? 'administrador' : 'asesor'}`);
  if ('active' in set && set.active !== target.active) ch.push(set.active ? 'cuenta activada' : 'cuenta desactivada');
  if (set.pass_hash) ch.push('contraseña nueva');
  await logActivity(db, me, 'editar', 'users', target._id, target.full_name || target.email, ch.join(' · '));
  return publicUser(Object.assign({}, target, set));
}
async function deleteUser(db, me, id) {
  requireAdmin(me);
  const target = await db.collection('users').findOne({ _id: idOf(id) }); if (!target) return;
  if (target._id === me._id) throw bad('No puedes borrar tu propia cuenta.');
  if (target.role === 'admin' && target.active && (await activeAdmins(db)) <= 1) throw bad('Debe quedar al menos un administrador activo.');
  for (const [c, f] of [['leads', 'assigned_to'], ['visits', 'advisor_id'], ['deals', 'advisor_id'], ['properties', 'advisor_id'], ['articles', 'author_id'], ['contacts', 'created_by']]) await db.collection(c).updateMany({ [f]: target._id }, { $set: { [f]: null } });
  await db.collection('sessions').deleteMany({ user_id: target._id });
  await db.collection('users').deleteOne({ _id: target._id });
  await logActivity(db, me, 'borrar', 'users', target._id, target.full_name || target.email);
}
