// INMOBILIARIA CRUMEX · sesiones del panel
//
// - La contraseña se guarda con bcrypt (nunca en texto).
// - Al entrar se crea una sesión al azar; en la base solo queda su huella (sha256),
//   y el navegador la guarda en una cookie HttpOnly que JavaScript no puede leer.
// - Cada petición del panel revisa que la sesión exista, no haya vencido y que el
//   usuario siga activo. Desactivar a alguien lo saca de inmediato.
import bcrypt from 'bcryptjs';
import { HttpError, cookies, sha256, token } from './_http.js';

export const COOKIE = 'crx_s';
const DAYS = 7;

export const hashPassword = (pw) => bcrypt.hash(String(pw), 11);
// Si el usuario no existe se compara contra una huella falsa, para tardar lo mismo
// y no revelar qué correos están registrados.
let dummy = null;
export async function checkPassword(pw, hash) {
  if (!hash) { dummy = dummy || bcrypt.hash('crumex-sin-usuario', 11); await bcrypt.compare(String(pw || ''), await dummy); return false; }
  return bcrypt.compare(String(pw || ''), hash);
}

export function validPassword(pw) {
  const s = String(pw || '');
  if (s.length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.', 'weak');
  if (s.length > 200) throw new HttpError(400, 'La contraseña es demasiado larga.', 'weak');
  if (/^(.)\1+$/.test(s) || /^(12345678|password|contraseña|crumex123|qwerty12)/i.test(s)) throw new HttpError(400, 'Esa contraseña es muy fácil de adivinar. Elige otra.', 'weak');
}

function cookieHeader(req, value, maxAge) {
  const host = String(req.headers.host || '');
  const local = /^localhost(:\d+)?$|^127\.0\.0\.1/.test(host);
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${local ? '' : '; Secure'}`;
}

export async function createSession(db, req, res, user) {
  const t = token(32);
  await db.collection('sessions').insertOne({ _id: sha256(t), user_id: user._id, created_at: new Date(), expires_at: new Date(Date.now() + DAYS * 864e5), ua: String(req.headers['user-agent'] || '').slice(0, 160) });
  res.setHeader('Set-Cookie', cookieHeader(req, t, DAYS * 86400));
}

export async function endSession(db, req, res) {
  const t = cookies(req)[COOKIE];
  if (t) await db.collection('sessions').deleteOne({ _id: sha256(t) });
  res.setHeader('Set-Cookie', cookieHeader(req, '', 0));
}

// Usuario de la sesión actual (o null)
export async function currentUser(db, req) {
  const t = cookies(req)[COOKIE];
  if (!t || t.length < 20 || t.length > 100) return null;
  const s = await db.collection('sessions').findOne({ _id: sha256(t) });
  if (!s || new Date(s.expires_at) < new Date()) return null;
  const u = await db.collection('users').findOne({ _id: s.user_id });
  if (!u || !u.active) return null;
  return u;
}

export async function requireStaff(db, req) {
  const u = await currentUser(db, req);
  if (!u) throw new HttpError(401, 'Tu sesión terminó. Vuelve a entrar.', 'auth');
  return u;
}
export function requireAdmin(u) {
  if (!u || u.role !== 'admin') throw new HttpError(403, 'Solo un administrador puede hacer esto.', 'forbidden');
}

// Lo que el navegador puede ver de un usuario
export const publicUser = (u) => u && ({ id: u._id, email: u.email, name: u.full_name || '', full_name: u.full_name || '', role: u.role, active: !!u.active, job_title: u.job_title || null, phone: u.phone || null, photo_path: u.photo_path || null, show_on_site: !!u.show_on_site, digest: u.digest !== false, created_at: u.created_at });
