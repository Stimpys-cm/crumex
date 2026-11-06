// INMOBILIARIA CRUMEX · /sitemap.xml para Google y Bing (vercel.json lo dirige aquí).
// Incluye las páginas públicas y cada inmueble disponible o apartado.
import { getDB, READY } from './_db.js';
import { esc, origin } from './_http.js';
import { slugify } from './_rules.js';

const PAGES = [['tienda.html', '1.0', 'daily'], ['catalogo.html', '0.9', 'daily'], ['zona.html', '0.7', 'weekly'], ['industrial.html', '0.7', 'weekly'], ['vender.html', '0.6', 'monthly'], ['guias.html', '0.5', 'weekly'], ['terminos.html', '0.2', 'yearly']];

export default async function handler(req, res) {
  const base = origin(req);
  let rows = []; let guides = [];
  try {
    if (READY) {
      const db = await getDB();
      const [props, zones] = await Promise.all([db.collection('properties').find({ status: { $in: ['disponible', 'apartada'] } }, { projection: { ref_code: 1, published_at: 1, type: 1, operation: 1, zone_id: 1 }, sort: { published_at: -1 }, limit: 2000 }).toArray(), db.collection('zones').find({}, { projection: { name: 1 } }).toArray()]);
      guides = await db.collection('articles').find({ published: true }, { projection: { slug: 1, updated_at: 1, published_at: 1 }, limit: 500 }).toArray();
      const zn = new Map(zones.map((z) => [z._id, z.name]));
      rows = props.map((p) => ({ ref_code: p.ref_code, published_at: p.published_at ? new Date(p.published_at).toISOString() : null, type: p.type, operation: p.operation, zone: zn.get(p.zone_id) || null }));
    }
  } catch (e) { rows = []; guides = []; }
  const urls = PAGES.map(([p, pr, ch]) => `<url><loc>${esc(base + '/' + p)}</loc><changefreq>${ch}</changefreq><priority>${pr}</priority></url>`);
  rows.forEach((r) => {
    const m = /^CRX-0*(\d+)$/i.exec(r.ref_code || ''); if (!m) return;
    const last = r.published_at ? `<lastmod>${esc(String(r.published_at).slice(0, 10))}</lastmod>` : '';
    urls.push(`<url><loc>${esc(`${base}/inmueble.html?id=${m[1]}`)}</loc>${last}<changefreq>weekly</changefreq><priority>0.8</priority></url>`);
    if (r.type === 'nave') urls.push(`<url><loc>${esc(`${base}/industrial.html?id=${m[1]}`)}</loc>${last}<changefreq>weekly</changefreq><priority>0.6</priority></url>`);
  });
  guides.forEach((g) => {
    if (!g.slug) return; const d = g.updated_at || g.published_at;
    urls.push(`<url><loc>${esc(`${base}/guias.html?a=${encodeURIComponent(g.slug)}`)}</loc>${d ? `<lastmod>${esc(new Date(d).toISOString().slice(0, 10))}</lastmod>` : ''}<changefreq>monthly</changefreq><priority>0.5</priority></url>`);
  });
  // páginas por zona, y por zona + tipo + operación cuando hay propiedades
  const combos = new Map();
  rows.forEach((r) => {
    if (!r.zone) return; const z = slugify(r.zone);
    combos.set(`z=${z}`, 0.7);
    combos.set(`z=${z}&tipo=${r.type}`, 0.6);
    combos.set(`z=${z}&tipo=${r.type}&op=${r.operation}`, 0.6);
  });
  combos.forEach((pr, q) => urls.push(`<url><loc>${esc(`${base}/zona.html?${q}`)}</loc><changefreq>weekly</changefreq><priority>${pr}</priority></url>`));
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}
