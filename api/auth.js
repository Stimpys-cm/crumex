// INMOBILIARIA CRUMEX · acceso al panel
//   GET  /api/auth?a=me        quién está conectado (y si falta crear el primer administrador)
//   POST /api/auth?a=login     { email, password }
//   POST /api/auth?a=logout
//   POST /api/auth?a=setup     { setup_token, full_name, email, password }  solo si aún no hay usuarios
//   POST /api/auth?a=forgot    { email }      manda un enlace para crear contraseña nueva
//   POST /api/auth?a=reset     { token, password }
//   POST /api/auth?a=password  { current, password }   cambiar la propia contraseña
//
// SETUP_TOKEN (variable de Vercel): clave de un solo uso para crear al primer administrador.
import { getDB } from './_db.js';
import { HttpError, bad, body, handle, origin, rateLimit, requireAjax, sameText, sendJSON, sha256, token, uuid, esc } from './_http.js';
import { checkPassword, createSession, currentUser, endSession, hashPassword, publicUser, validPassword } from './_auth.js';
import { mailReady, sendEmail } from './_mail.js';
import { storageMode } from './_files.js';
import { logActivity } from './_rules.js';

const normEmail = (e) => String(e || '').trim().toLowerCase();
const okEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 160;

// Guías iniciales del blog (se crean con el primer administrador; se pueden editar o borrar)
const ARTICLES = [
  ['que-revisar-antes-de-comprar', 'Qué revisar antes de comprar una propiedad', 'Una lista corta para no pasar por alto lo importante.', 'Antes de apartar una propiedad conviene revisar:\n\n1. Que el vendedor sea el propietario y que la escritura esté a su nombre.\n2. Que no tenga adeudos de predial, agua o servicios.\n3. Que no existan gravámenes ni embargos (se consulta en el Registro Público de la Propiedad).\n4. Que la superficie real coincida con la escritura.\n5. Que el uso de suelo permita lo que piensas hacer con ella.\n\nUn notario público es quien formaliza la operación; consulta con uno antes de firmar.'],
  ['documentos-para-vender', 'Documentos que necesitas para vender tu propiedad', 'Ten esto listo y la venta avanza más rápido.', 'En general se pide:\n\n- Escritura y, si aplica, el estado de la inscripción en el Registro Público.\n- Identificación oficial del propietario.\n- Recibos de predial y agua al corriente.\n- Planos o medidas, si los tienes.\n- Si hay crédito vigente, la carta de saldo de la institución.\n\nLos requisitos exactos los confirma el notario que formalice la operación.'],
  ['rentar-una-nave-industrial', 'Rentar una nave industrial: puntos clave', 'Lo básico que una empresa debe validar antes de firmar.', 'Antes de rentar una nave valida:\n\n- Altura libre, andenes y capacidad eléctrica (kVA) según tu operación.\n- Uso de suelo y permisos que requiere tu actividad.\n- Condiciones del contrato: plazo, incrementos, depósito y mantenimiento.\n- Accesos y distancia a vías principales.\n\nCada operación tiene detalles propios; pide que el contrato lo revise tu asesor legal.']
];

export default handle(async (req, res) => {
  const a = String(req.query.a || '');
  const db = await getDB();
  if (req.method === 'GET' && a === 'me') {
    const u = await currentUser(db, req);
    const needsSetup = !u && (await db.collection('users').countDocuments({})) === 0;
    return sendJSON(res, 200, { user: publicUser(u), needsSetup, setupEnabled: needsSetup && !!process.env.SETUP_TOKEN, storage: storageMode(), mail: mailReady() });
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.');
  requireAjax(req);
  const b = body(req);

  if (a === 'login') {
    if (!(await rateLimit(db, req, 'login', 10, 900))) throw new HttpError(429, 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.', 'limit');
    const email = normEmail(b.email);
    const u = await db.collection('users').findOne({ email });
    if (u && u.locked_until && new Date(u.locked_until) > new Date()) throw new HttpError(429, 'La cuenta está bloqueada por varios intentos fallidos. Intenta en 15 minutos.', 'locked');
    const ok = await checkPassword(b.password, u ? u.pass_hash : null);
    if (!u || !ok) {
      if (u) { const n = (u.failed_logins || 0) + 1; await db.collection('users').updateOne({ _id: u._id }, { $set: n >= 5 ? { failed_logins: 0, locked_until: new Date(Date.now() + 15 * 60e3) } : { failed_logins: n } }); }
      throw new HttpError(401, 'Correo o contraseña incorrectos.', 'login');
    }
    if (!u.active) throw new HttpError(403, 'Tu cuenta aún no está activada. Pide a un administrador que la active.', 'inactive');
    await db.collection('users').updateOne({ _id: u._id }, { $set: { failed_logins: 0, locked_until: null, last_login: new Date() } });
    await createSession(db, req, res, u);
    await logActivity(db, u, 'entrar', 'users', u._id, u.full_name || u.email);
    return sendJSON(res, 200, { user: publicUser(u) });
  }
  if (a === 'logout') { await endSession(db, req, res); return sendJSON(res, 200, { ok: true }); }

  if (a === 'setup') {
    if (!(await rateLimit(db, req, 'setup', 8, 900))) throw new HttpError(429, 'Demasiados intentos. Espera 15 minutos.', 'limit');
    if ((await db.collection('users').countDocuments({})) > 0) throw new HttpError(409, 'Ya existe un administrador. Entra con tu correo y contraseña.', 'exists');
    if (!process.env.SETUP_TOKEN) throw new HttpError(503, 'Falta la variable SETUP_TOKEN en Vercel (ver README).', 'no_setup');
    if (!sameText(b.setup_token, process.env.SETUP_TOKEN)) throw new HttpError(403, 'La clave de instalación no coincide con SETUP_TOKEN.', 'setup');
    const email = normEmail(b.email); if (!okEmail(email)) throw bad('Escribe un correo válido.');
    const name = String(b.full_name || '').trim(); if (name.length < 2 || name.length > 120) throw bad('Escribe tu nombre.');
    validPassword(b.password);
    const now = new Date();
    const u = { _id: uuid(), email, full_name: name, role: 'admin', active: true, pass_hash: await hashPassword(b.password), job_title: 'Dirección', phone: null, photo_path: null, show_on_site: false, created_at: now, updated_at: now };
    await db.collection('users').insertOne(u);
    for (const [slug, title, summary, text] of ARTICLES) await db.collection('articles').updateOne({ slug }, { $setOnInsert: { _id: uuid(), slug, title, summary, body: text, published: true, published_at: now, created_at: now, updated_at: now } }, { upsert: true });
    await createSession(db, req, res, u);
    return sendJSON(res, 200, { user: publicUser(u) });
  }

  if (a === 'forgot') {
    if (!(await rateLimit(db, req, 'forgot', 5, 3600))) throw new HttpError(429, 'Demasiadas solicitudes. Intenta en una hora.', 'limit');
    if (!mailReady()) throw new HttpError(503, 'Para recuperar contraseñas por correo falta configurar RESEND_API_KEY. Mientras tanto, un administrador puede ponerte una contraseña nueva desde Equipo.', 'no_mail');
    const email = normEmail(b.email);
    const u = okEmail(email) && await db.collection('users').findOne({ email, active: true });
    if (u) {
      const t = token(32);
      await db.collection('users').updateOne({ _id: u._id }, { $set: { reset_hash: sha256(t), reset_expires: new Date(Date.now() + 3600e3) } });
      const link = `${origin(req)}/paginaadminimobi19.html#reset=${t}`;
      await sendEmail({ to: email, subject: 'Crea tu contraseña nueva · INMOBILIARIA CRUMEX',
        text: `Hola ${u.full_name || ''}.\n\nPara crear una contraseña nueva abre este enlace (vence en 1 hora):\n${link}\n\nSi tú no lo pediste, ignora este correo; tu contraseña sigue igual.`,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1B2533;max-width:520px"><p>Hola ${esc(u.full_name || '')}.</p><p>Para crear una contraseña nueva toca el botón (el enlace vence en 1 hora):</p><p style="margin:22px 0"><a href="${esc(link)}" style="background:#0E1E33;color:#fff;padding:12px 20px;border-radius:30px;text-decoration:none;font-weight:bold">Crear contraseña nueva</a></p><p style="color:#536074;font-size:13px">Si tú no lo pediste, ignora este correo; tu contraseña sigue igual.</p></div>` }).catch((e) => console.error('[crumex] correo', e.message));
    }
    return sendJSON(res, 200, { ok: true });
  }

  if (a === 'reset') {
    if (!(await rateLimit(db, req, 'reset', 10, 3600))) throw new HttpError(429, 'Demasiados intentos. Intenta más tarde.', 'limit');
    const t = String(b.token || ''); if (t.length < 20 || t.length > 100) throw bad('El enlace no es válido.');
    const u = await db.collection('users').findOne({ reset_hash: sha256(t) });
    if (!u || !u.reset_expires || new Date(u.reset_expires) < new Date()) throw new HttpError(400, 'El enlace venció o ya se usó. Pide uno nuevo.', 'expired');
    validPassword(b.password);
    await db.collection('users').updateOne({ _id: u._id }, { $set: { pass_hash: await hashPassword(b.password), reset_hash: null, reset_expires: null, failed_logins: 0, locked_until: null, updated_at: new Date() } });
    await db.collection('sessions').deleteMany({ user_id: u._id });
    if (u.active) await createSession(db, req, res, u);
    return sendJSON(res, 200, { user: u.active ? publicUser(u) : null });
  }

  if (a === 'password') {
    const u = await currentUser(db, req); if (!u) throw new HttpError(401, 'Tu sesión terminó. Vuelve a entrar.', 'auth');
    if (!(await rateLimit(db, req, 'password', 10, 900))) throw new HttpError(429, 'Demasiados intentos. Espera 15 minutos.', 'limit');
    if (!(await checkPassword(b.current, u.pass_hash))) throw bad('La contraseña actual no es correcta.');
    validPassword(b.password);
    await db.collection('users').updateOne({ _id: u._id }, { $set: { pass_hash: await hashPassword(b.password), updated_at: new Date() } });
    await db.collection('sessions').deleteMany({ user_id: u._id });
    await createSession(db, req, res, u);
    return sendJSON(res, 200, { ok: true });
  }
  throw new HttpError(404, 'Acción desconocida.');
});
