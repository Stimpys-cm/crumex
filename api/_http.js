// INMOBILIARIA CRUMEX · utilidades HTTP para las funciones del servidor
import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
export const bad = (msg) => new HttpError(400, msg, 'invalid');

export function sendJSON(res, status, data, cache) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.status(status).send(JSON.stringify(data));
}

// Envuelve un manejador: errores conocidos salen con su mensaje; los demás, con uno genérico
export function handle(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) {
      if (e instanceof HttpError) return sendJSON(res, e.status, { error: e.message, code: e.code });
      if (e && e.code === 11000) return sendJSON(res, 409, { error: 'Ya existe un registro con ese valor (clave, correo o nombre repetido).', code: 'duplicate' });
      console.error('[crumex]', e);
      const conn = /ECONNREFUSED|ENOTFOUND|Server selection|timed out|MongoNetwork|querySrv/i.test(String(e && (e.message || e)));
      return sendJSON(res, conn ? 503 : 500, { error: conn ? 'No se pudo conectar con la base de datos. Intenta de nuevo en un momento.' : 'Ocurrió un error en el servidor. Intenta de nuevo.' });
    }
  };
}

export function body(req) {
  const b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  if (typeof b === 'string' || Buffer.isBuffer(b)) { try { return JSON.parse(String(b)); } catch (e) { throw bad('Datos con formato inválido.'); } }
  return {};
}

export function ip(req) {
  const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (f || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '0').slice(0, 64);
}

export function cookies(req) {
  const o = {};
  String(req.headers.cookie || '').split(';').forEach((p) => { const i = p.indexOf('='); if (i > 0) { const k = p.slice(0, i).trim(); try { o[k] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { o[k] = ''; } } });
  return o;
}

// Las acciones que cambian datos exigen esta cabecera: un formulario de otro sitio no puede ponerla (protección CSRF)
export function requireAjax(req) {
  if (req.method !== 'GET' && req.headers['x-crx'] !== '1') throw new HttpError(403, 'Solicitud no permitida.', 'csrf');
}

export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
export const token = (n) => crypto.randomBytes(n || 32).toString('base64url');
export const uuid = () => crypto.randomUUID();
export function sameText(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

// Límite de intentos por IP (o por llave): devuelve false si ya se pasó
export async function rateLimit(db, req, key, max, windowSec) {
  const slot = Math.floor(Date.now() / (windowSec * 1000));
  const id = `${key}:${sha256(ip(req)).slice(0, 24)}:${slot}`;
  const r = await db.collection('limits').findOneAndUpdate({ _id: id }, { $inc: { n: 1 }, $setOnInsert: { expires_at: new Date((slot + 1) * windowSec * 1000 + 60000) } }, { upsert: true, returnDocument: 'after' });
  return !r || r.n <= max;
}

export function origin(req) {
  if (process.env.SITE_URL) return String(process.env.SITE_URL).replace(/\/+$/, '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return 'https://localhost';
  const proto = /^localhost(:\d+)?$|^127\.0\.0\.1/.test(host) ? 'http' : 'https';
  return `${proto}://${host}`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
