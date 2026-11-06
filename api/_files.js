// INMOBILIARIA CRUMEX · fotos y documentos
//
// Con Cloudinary configurado (recomendado, igual que en stiimpys):
//   - Las fotos se suben directo del navegador a Cloudinary con una firma que da
//     el servidor, y se sirven desde su red rápida.
//   - Los documentos privados se guardan como "authenticated": nadie los abre sin
//     un enlace temporal que solo genera el panel.
// Sin Cloudinary, todo se guarda en MongoDB (fotos hasta 2 MB, documentos hasta 3 MB).
//
// Variables de entorno: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
import crypto from 'node:crypto';
import { HttpError, bad, token } from './_http.js';

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || '';
const KEY = process.env.CLOUDINARY_API_KEY || '';
const SECRET = process.env.CLOUDINARY_API_SECRET || '';
export const cloudReady = () => !!(CLOUD && KEY && SECRET);
export const storageMode = () => (cloudReady() ? 'cloudinary' : 'mongo');

function sign(params) {
  const s = Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '').sort().map((k) => `${k}=${Array.isArray(params[k]) ? params[k].join(',') : params[k]}`).join('&');
  return crypto.createHash('sha1').update(s + SECRET).digest('hex');
}

// Firma para que el navegador suba directo a Cloudinary
export function signUpload(kind) {
  if (!cloudReady()) return { storage: 'mongo', max_bytes: kind === 'doc' ? 3 * 1024 * 1024 : 2 * 1024 * 1024 };
  const timestamp = Math.floor(Date.now() / 1000);
  const p = kind === 'doc'
    ? { folder: 'crumex/documentos', timestamp, type: 'authenticated' }
    : { folder: 'crumex/fotos', timestamp, allowed_formats: 'webp,jpg,jpeg,png' };
  return Object.assign({ storage: 'cloudinary', cloud: CLOUD, api_key: KEY, signature: sign(p), resource_type: kind === 'doc' ? 'raw' : 'image', max_bytes: 10 * 1024 * 1024 }, p);
}

export async function cloudDestroy(publicId, resourceType, type) {
  if (!cloudReady() || !publicId) return;
  const p = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), type: type || undefined };
  const form = new URLSearchParams(Object.assign({}, Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)), { api_key: KEY, signature: sign(p) }));
  await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType || 'image'}/destroy`, { method: 'POST', body: form });
}

// ¿Las claves de Cloudinary funcionan? (Admin API: /ping)
export async function cloudPing() {
  if (!cloudReady()) return { ok: false, error: 'Sin configurar' };
  try {
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/ping`, { headers: { Authorization: 'Basic ' + Buffer.from(`${KEY}:${SECRET}`).toString('base64') } });
    return r.ok ? { ok: true } : { ok: false, error: r.status === 401 ? 'La API Key o el API Secret no coinciden' : `Cloudinary respondió ${r.status}` };
  } catch (e) { return { ok: false, error: 'No se pudo conectar con Cloudinary' }; }
}

// Enlace de descarga que vence en 2 minutos (documentos privados)
export function privateDownloadUrl(publicId, resourceType, format) {
  const p = { public_id: publicId, type: 'authenticated', timestamp: Math.floor(Date.now() / 1000), expires_at: Math.floor(Date.now() / 1000) + 120, attachment: 'true', format: resourceType === 'raw' ? undefined : format };
  const q = new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)));
  q.set('api_key', KEY); q.set('signature', sign(p));
  return `https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType || 'raw'}/download?${q}`;
}

/* ---------- guardado en MongoDB (sin Cloudinary) ---------- */
const MIMES = { photo: ['image/webp', 'image/jpeg', 'image/png'], doc: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] };
function sniff(buf) {
  if (buf.slice(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}
export async function storeFile(db, user, { kind, data, name }) {
  if (!['photo', 'doc'].includes(kind)) throw bad('Tipo de archivo no válido.');
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(data || ''));
  if (!m) throw bad('Archivo con formato no válido.');
  const buf = Buffer.from(m[2], 'base64'); const mime = sniff(buf);
  if (!mime || !MIMES[kind].includes(mime)) throw bad(kind === 'doc' ? 'Sube PDF, JPG, PNG o WEBP.' : 'Sube fotos JPG, PNG o WEBP.');
  const max = kind === 'doc' ? 3 * 1024 * 1024 : 2 * 1024 * 1024;
  if (buf.length > max) throw new HttpError(413, kind === 'doc' ? 'El documento pesa más de 3 MB. Comprímelo o configura Cloudinary para archivos de hasta 10 MB.' : 'La foto pesa más de 2 MB.');
  const id = token(18);
  await db.collection('files').insertOne({ _id: id, kind, mime, size: buf.length, name: String(name || '').slice(0, 160), data: buf, created_at: new Date(), created_by: user._id });
  return { path: `/api/file?id=${id}`, file_id: id, bytes: buf.length, mime };
}

// Borra un archivo guardado (en MongoDB o en Cloudinary)
export async function deleteStored(db, path, publicId, resourceType, isCloud) {
  const m = /^\/api\/file\?id=([\w-]+)$/.exec(String(path || ''));
  if (m) await db.collection('files').deleteOne({ _id: m[1] });
  else if (publicId) await cloudDestroy(publicId, resourceType, resourceType === 'raw' || isCloud ? (resourceType === 'raw' ? 'authenticated' : undefined) : undefined);
}
