// INMOBILIARIA CRUMEX · entrega de archivos guardados en MongoDB (cuando no se usa Cloudinary)
//   GET /api/file?id=…   fotos: públicas y con caché larga · documentos: solo con sesión del panel
import { getDB } from './_db.js';
import { HttpError, handle } from './_http.js';
import { requireStaff } from './_auth.js';

export default handle(async (req, res) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.');
  const id = String(req.query.id || ''); if (!/^[\w-]{10,64}$/.test(id)) throw new HttpError(404, 'No encontrado.');
  const db = await getDB();
  const f = await db.collection('files').findOne({ _id: id });
  if (!f) throw new HttpError(404, 'No encontrado.');
  if (f.kind === 'doc') await requireStaff(db, req);
  const buf = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data.buffer || f.data);
  res.setHeader('Content-Type', f.mime || 'application/octet-stream');
  res.setHeader('Content-Length', String(buf.length));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (f.kind === 'doc') {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.name || 'documento')}`);
  } else {
    // el id nunca se reutiliza: la foto se puede guardar en caché para siempre
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  res.status(200).send(buf);
});
