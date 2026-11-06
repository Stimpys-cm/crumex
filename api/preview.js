// INMOBILIARIA CRUMEX · vista previa al compartir un enlace (WhatsApp, Facebook, Telegram…)
//
// Esos servicios no ejecutan JavaScript: leen el HTML tal cual llega. Por eso middleware.js
// les manda aquí cuando piden una página del sitio, y esta función responde un HTML pequeño
// con el título, la descripción y la imagen ya escritos (con dirección completa, como lo
// piden). En un inmueble usa su foto de portada, su precio y su zona.
// Las personas nunca ven esta página: el navegador recibe la página normal.
import { getDB, READY } from './_db.js';
import { esc, origin } from './_http.js';
import { PUBLIC_STATUS, slugify } from './_rules.js';

const TYPES = { casa: 'Casa', departamento: 'Departamento', terreno: 'Terreno', nave: 'Nave industrial' };
const OPS = { venta: 'Venta', renta: 'Renta' };
const money = (p) => (p.price_on_request || p.price == null) ? 'Precio a consultar' : '$' + Number(p.price).toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' ' + (p.currency || 'MXN') + (p.operation === 'renta' ? ' al mes' : '');
// Cloudinary: recorte 1200×630 en JPG, que es lo que mejor muestran WhatsApp y Facebook
const CLD = /^(https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/)(.+)$/;
const photoUrl = (path, base) => { if (!path) return ''; const m = CLD.exec(path); if (m) return `${m[1]}c_fill,w_1200,h_630,q_auto,f_jpg/${m[2]}`; return /^https?:\/\//.test(path) ? path : base + (path.startsWith('/') ? '' : '/') + path; };
const PROJ = { projection: { ref_code: 1, title: 1, description: 1, operation: 1, type: 1, status: 1, price: 1, currency: 1, price_on_request: 1, zone_id: 1, public_location: 1, photos: 1, bedrooms: 1, bathrooms: 1, construction_m2: 1, land_m2: 1, attributes: 1 } };

const PAGES = {
  tienda: ['INMOBILIARIA CRUMEX · Propiedades en Reynosa', 'Casas, departamentos, terrenos y naves industriales en venta y renta en Reynosa, Tamaulipas. Visitas sin costo y atención por WhatsApp.'],
  catalogo: ['Catálogo de propiedades | INMOBILIARIA CRUMEX', 'Casas, departamentos, terrenos y naves industriales en venta y renta en Reynosa. Filtra por zona, precio y superficie.'],
  vender: ['Vende o renta tu propiedad | INMOBILIARIA CRUMEX', 'Te ayudamos a vender o rentar tu propiedad en Reynosa: estimación de valor, fotos, publicación y seguimiento hasta la firma.'],
  terminos: ['Términos y aviso de privacidad | INMOBILIARIA CRUMEX', 'Términos de uso del sitio y aviso de privacidad de INMOBILIARIA CRUMEX.'],
  guias: ['Guías para comprar, vender y rentar en Reynosa | INMOBILIARIA CRUMEX', 'Qué revisar antes de comprar, documentos para vender, rentar una nave industrial y más, explicado de forma sencilla.'],
  zona: ['Zonas de Reynosa | INMOBILIARIA CRUMEX', 'Propiedades por zona en Reynosa, Tamaulipas: casas, departamentos, terrenos y naves industriales en venta y renta.'],
  industrial: ['Industrial space for lease and sale in Reynosa, Mexico | INMOBILIARIA CRUMEX', 'Industrial buildings and land in Reynosa, Tamaulipas. Sizes in square feet, clear height, loading docks and power. Free site visits.']
};
const T_PLURAL = { casa: 'Casas', departamento: 'Departamentos', terreno: 'Terrenos', nave: 'Naves industriales' };

function page({ title, desc, image, url, status, type }) {
  return `<!doctype html>
<html lang="es-MX"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${type || (status === 200 ? 'product' : 'website')}">
<meta property="og:site_name" content="INMOBILIARIA CRUMEX">
<meta property="og:locale" content="es_MX">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
${status === 200 ? '' : '<meta name="robots" content="noindex">'}
</head><body>
<h1>${esc(title)}</h1><p>${esc(desc)}</p><p><a href="${esc(url)}">Abrir</a></p>
</body></html>`;
}

export default async function handler(req, res) {
  const base = origin(req);
  const idRaw = String(req.query.id || '').trim();
  const ref = /^\d{1,7}$/.test(idRaw) ? 'CRX-' + idRaw.padStart(5, '0') : String(req.query.ref || '').trim().slice(0, 40);
  const enPage = String(req.query.p || '') === 'industrial';
  const url = /^\d{1,7}$/.test(idRaw) ? `${base}/${enPage ? 'industrial' : 'inmueble'}.html?id=${Number(idRaw)}` : `${base}/inmueble.html${ref ? '?ref=' + encodeURIComponent(ref) : ''}`;
  const generic = { title: 'INMOBILIARIA CRUMEX · Propiedades en Reynosa', desc: 'Casas, departamentos, terrenos y naves industriales en venta y renta en Reynosa, Tamaulipas.', image: `${base}/img/og.png`, url };

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // páginas generales del sitio
  const pg = String(req.query.p || '');
  // página de una zona: zona.html?z=zona-norte(&tipo=casa&op=venta)
  if (pg === 'zona' && req.query.z && READY) {
    try {
      const db = await getDB();
      const zs = await db.collection('zones').find({}, { projection: { name: 1, description: 1 } }).toArray();
      const z = zs.find((x) => slugify(x.name) === slugify(req.query.z));
      if (z) z.listings = await db.collection('properties').countDocuments({ zone_id: z._id, status: { $in: ['disponible', 'apartada'] } });
      if (z) {
        const tipo = T_PLURAL[req.query.tipo] ? req.query.tipo : ''; const op = ['venta', 'renta'].includes(req.query.op) ? req.query.op : '';
        const h = `${tipo ? T_PLURAL[tipo] : 'Propiedades'}${op ? ' en ' + op : ''} en ${z.name}, Reynosa`;
        const q = new URLSearchParams({ z: slugify(z.name) }); if (tipo) q.set('tipo', tipo); if (op) q.set('op', op);
        res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
        return res.status(200).send(page({ title: `${h} | INMOBILIARIA CRUMEX`, desc: String(z.description || `${z.listings || 0} propiedades publicadas en ${z.name}, Reynosa, Tamaulipas. Visitas sin costo y atención por WhatsApp.`).replace(/\s+/g, ' ').slice(0, 200), image: `${base}/img/og.png`, url: `${base}/zona.html?${q}`, status: 200 }));
      }
    } catch (e) { /* cae a la versión general */ }
  }
  // una guía: guias.html?a=que-revisar-antes-de-comprar
  if (pg === 'guias' && req.query.a && READY) {
    try {
      const slug = String(req.query.a).slice(0, 120);
      const db = await getDB();
      const a = await db.collection('articles').findOne({ slug, published: true }, { projection: { title: 1, summary: 1, body: 1, slug: 1 } });
      if (a) {
        res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
        const desc = String(a.summary || a.body || '').replace(/\s+/g, ' ').trim().slice(0, 200);
        return res.status(200).send(page({ title: `${a.title} | Guías INMOBILIARIA CRUMEX`, desc, image: `${base}/img/og.png`, url: `${base}/guias.html?a=${encodeURIComponent(a.slug)}`, status: 200, type: 'article' }));
      }
    } catch (e) { /* cae a la versión general */ }
  }
  // un inmueble en inglés: industrial.html?id=4
  const en = pg === 'industrial' && /^\d{1,7}$/.test(idRaw);
  if (PAGES[pg] && !en) {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(page({ title: PAGES[pg][0], desc: PAGES[pg][1], image: `${base}/img/og.png`, url: `${base}/${pg}.html`, status: 200, type: 'website' }));
  }

  let p = null;
  try {
    if (READY && /^[A-Za-z0-9-]{3,40}$/.test(ref)) {
      const db = await getDB();
      p = await db.collection('properties').findOne({ ref_code: ref, status: { $in: PUBLIC_STATUS } }, PROJ);
      if (p && p.zone_id != null) { const z = await db.collection('zones').findOne({ _id: p.zone_id }, { projection: { name: 1 } }); p.zone = z ? z.name : null; }
    }
  } catch (e) {
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    return res.status(200).send(page(Object.assign({}, generic, { status: 503 })));
  }
  if (!p) {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(READY ? 404 : 200).send(page(Object.assign({}, generic, { status: READY ? 404 : 200 })));
  }

  const zone = p.zone || p.public_location || 'Reynosa';
  const closed = p.status === 'cerrada';
  const facts = [];
  if (p.bedrooms != null) facts.push(`${p.bedrooms} rec.`);
  if (p.bathrooms != null) facts.push(`${Number(p.bathrooms)} baños`);
  if (p.construction_m2) facts.push(`${Number(p.construction_m2).toLocaleString('es-MX')} m² const.`);
  else if (p.land_m2) facts.push(`${Number(p.land_m2).toLocaleString('es-MX')} m² terreno`);
  const head = closed ? (p.operation === 'renta' ? 'RENTADA' : 'VENDIDA') : `${OPS[p.operation] || ''}`.toUpperCase();
  const at = p.attributes || {};
  const title = en ? `${at.title_en || p.title} · ${p.price_on_request || p.price == null ? 'Price on request' : '$' + Number(p.price).toLocaleString('en-US') + ' ' + p.currency + (p.operation === 'renta' ? ' / month' : '')}` : `${p.title} · ${money(p)}`;
  const about = String((en && at.description_en) || p.description || '').replace(/\s+/g, ' ').trim();
  let lead = en ? `${p.operation === 'renta' ? 'FOR LEASE' : 'FOR SALE'} · ${p.type === 'nave' ? 'Industrial building' : 'Industrial land'} in Reynosa, Mexico${p.construction_m2 ? ' · ' + Math.round(p.construction_m2 * 10.7639).toLocaleString('en-US') + ' ft²' : ''}${at.altura_libre_m ? ' · ' + Math.round(at.altura_libre_m * 3.28084) + ' ft clear' : ''}` : `${head} · ${TYPES[p.type] || ''} en ${zone}, Reynosa${facts.length ? ' · ' + facts.join(' · ') : ''}`;
  if (!/\.$/.test(lead)) lead += '.';
  const desc = `${lead} ${about.slice(0, 140)}${about.length > 140 ? '…' : ''}`.trim();
  const photos = Array.isArray(p.photos) ? p.photos : [];
  const image = photos[0] && photos[0].path ? photoUrl(photos[0].path, base) : generic.image;

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  return res.status(200).send(page({ title, desc, image, url, status: 200 }));
}
