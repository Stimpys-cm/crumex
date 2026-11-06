// INMOBILIARIA CRUMEX · corre en el borde de Vercel antes de servir las páginas públicas.
//
// Cuando alguien comparte "tudominio.com/inmueble.html?id=3" por WhatsApp o Facebook,
// esos servicios mandan un robot que NO ejecuta JavaScript y que pide la imagen con
// dirección completa. Sin esto, la vista previa saldría genérica o sin foto. Aquí
// reconocemos a esos robots de vista previa y les damos un HTML con la foto, el título
// y el precio ya escritos (api/preview.js).
//
// Las personas y los buscadores (Google, Bing) reciben la página normal, igual que siempre.
import { next, rewrite } from '@vercel/edge';

export const config = { matcher: ['/inmueble.html', '/tienda.html', '/catalogo.html', '/vender.html', '/terminos.html', '/zona.html', '/industrial.html', '/guias.html'] };

// Solo robots de vista previa de enlaces (no buscadores)
const PREVIEW_BOTS = /facebookexternalhit|facebookcatalog|Facebot|WhatsApp|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot|Pinterestbot|SkypeUriPreview|redditbot|Embedly|vkShare|Iframely|bitlybot|MetaInspector|Viber/i;

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!PREVIEW_BOTS.test(ua)) return next();
  const url = new URL(request.url);
  const dest = new URL('/api/preview', url);
  const name = (/\/(\w+)\.html$/.exec(url.pathname) || [])[1];
  if (name === 'inmueble') {
    const id = url.searchParams.get('id'); const ref = url.searchParams.get('ref');
    if (id) dest.searchParams.set('id', id.slice(0, 12));
    if (ref) dest.searchParams.set('ref', ref.slice(0, 40));
  } else {
    dest.searchParams.set('p', name);
    // zona.html?z=…&tipo=…&op=…  ·  industrial.html?id=…  ·  guias.html?a=…
    ['z', 'tipo', 'op', 'id', 'a'].forEach((k) => { const v = url.searchParams.get(k); if (v) dest.searchParams.set(k, v.slice(0, 120)); });
  }
  return rewrite(dest);
}
