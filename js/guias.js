/* INMOBILIARIA CRUMEX · guías (blog)
   guias.html                 → todas las guías
   guias.html?a=slug-de-guia  → una guía, con su propia dirección para Google y para compartir

   Formato que se puede usar al escribir una guía en el panel:
     ## Subtítulo          - lista con viñetas        1. lista numerada
     **negritas**          [texto](https://enlace)    [texto](catalogo.html?tipo=nave)   */
(function () {
  const CRX = window.CRX; const { $, esc } = CRX; const L = CRX.L;
  let ui = null;

  const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  const mins = (a) => Math.max(1, Math.round(words(a.body) / 200));
  const fdate = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const href = (a) => 'guias.html?a=' + encodeURIComponent(a.slug || a.id);
  const live = (p) => p.status === 'disponible' || p.status === 'apartada';
  const setMeta = (sel, val) => {
    let el = document.head.querySelector(sel);
    if (!el) { el = document.createElement('meta'); const [k, v] = sel.match(/\[([\w:]+)="([^"]+)"\]/).slice(1); el.setAttribute(k, v); document.head.appendChild(el); }
    el.setAttribute('content', val);
  };
  const setCanon = (url) => { let l = document.head.querySelector('link[rel="canonical"]'); if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); } l.href = url; };

  // tema de la guía (para la etiqueta y la ilustración), a partir de su título
  function topic(a) {
    const t = L.noAcc(String(a.slug || '') + ' ' + a.title);
    if (/nave|industrial|bodega/.test(t)) return ['Naves industriales', 'nave'];
    if (/terreno|lote/.test(t)) return ['Terrenos', 'terreno'];
    if (/vend/.test(t)) return ['Para vender', 'departamento'];
    if (/rent|arrend/.test(t)) return ['Para rentar', 'departamento'];
    if (/credit|infonavit|hipotec/.test(t)) return ['Créditos', 'casa'];
    return ['Para comprar', 'casa'];
  }

  /* ---------- índice ---------- */
  function renderIndex(arts) {
    $('#g-index').hidden = false; $('#g-article').hidden = true;
    $('#g-list').innerHTML = arts.length ? arts.map((a) => { const tp = topic(a); return `<a class="gcard" href="${esc(href(a))}">
        <span class="gc-n">${esc(tp[0])}</span>
        <h2>${esc(a.title)}</h2>
        ${a.summary ? `<p>${esc(a.summary)}</p>` : ''}
        <span class="gc-f"><span>${mins(a)} min de lectura</span><span class="gc-go">Leer</span></span>
      </a>`; }).join('') : '<p class="muted-p">Pronto publicaremos guías aquí.</p>';
    setCanon(new URL('guias.html', location.href).href);
  }

  /* ---------- propiedades relacionadas con el tema ---------- */
  function related(a, all) {
    const t = (String(a.slug || '') + ' ' + a.title).toLowerCase();
    const av = all.filter(live);
    const by = (f) => av.filter(f);
    let pick = [], title = 'Propiedades <em>disponibles</em>', more = 'catalogo.html';
    if (/nave|industrial|bodega/.test(t)) { pick = by((p) => p.type === 'nave'); title = 'Naves <em>disponibles</em>'; more = 'catalogo.html?tipo=nave'; }
    else if (/terreno/.test(t)) { pick = by((p) => p.type === 'terreno'); title = 'Terrenos <em>disponibles</em>'; more = 'catalogo.html?tipo=terreno'; }
    else if (/rent/.test(t)) { pick = by((p) => p.operation === 'renta'); title = 'Propiedades <em>en renta</em>'; more = 'catalogo.html?op=renta'; }
    else if (/compr|credito|crédito|infonavit|fovissste/.test(t)) { pick = by((p) => p.operation === 'venta'); title = 'Propiedades <em>en venta</em>'; more = 'catalogo.html?op=venta'; }
    if (!pick.length) pick = av;
    pick = pick.slice().sort((x, y) => Number(!!y.featured) - Number(!!x.featured) || String(y.published_at).localeCompare(String(x.published_at))).slice(0, 8);
    return { pick, title, more, sell: /vend/.test(t) };
  }

  /* ---------- una guía ---------- */
  function renderArticle(a, arts, all) {
    $('#g-index').hidden = true; $('#g-article').hidden = false;
    const url = new URL(href(a), location.href).href;
    $('#g-crumbs').innerHTML = `<a href="tienda.html">Inicio</a><span>/</span><a href="guias.html">Guías</a><span>/</span><b aria-current="page">${esc(a.title)}</b>`;
    $('#h-g').textContent = a.title;
    $('#g-lead').textContent = a.summary || '';
    $('#g-lead').hidden = !a.summary;
    $('#g-meta').hidden = false;
    $('#g-meta').innerHTML = `${a.published_at ? `<time datetime="${esc(new Date(a.published_at).toISOString())}">${esc(fdate(a.published_at))}</time><span aria-hidden="true">·</span>` : ''}<span>${mins(a)} min de lectura</span>`;
    $('#g-body').innerHTML = CRX.guideHtml(a.body) + '<p class="g-disc">Esta guía es informativa y general. Cada operación tiene sus particularidades: confirma los detalles con tu asesor, tu notario o la institución que corresponda.</p>';

    const rel = related(a, all);
    $('#g-sell').hidden = !rel.sell;
    // guía en PDF a cambio del contacto (se recuerda en este navegador)
    const gp = $('#g-pdf'); const okKey = 'crx-guide-ok';
    const canPrint = () => { try { return localStorage.getItem(okKey) === '1'; } catch (e) { return false; } };
    const unlock = () => { try { localStorage.setItem(okKey, '1'); } catch (e) { /* nada */ } $('#g-pdf-form').hidden = true; $('#g-print').hidden = false; };
    if (gp) {
      gp.hidden = false;
      if (canPrint()) unlock();
      if (!gp.dataset.bound) {
        gp.dataset.bound = '1';
        L.bindForm($('#g-pdf-form'), 'contacto', () => ({ message: `Pidió la guía en PDF: ${a.title}`, payload: { guia: a.slug || String(a.id) } }), { ok: '¡Listo! Ya puedes guardarla en PDF.', done: unlock });
        $('#g-print').addEventListener('click', () => window.print());
      }
    }
    $('#g-wa').href = CRX.waLink(`Hola, leí la guía "${a.title}" y tengo una duda.`);
    $('#g-sh-wa').href = 'https://wa.me/?text=' + encodeURIComponent(`${a.title}\n${url}`);
    const others = arts.filter((x) => x !== a).slice(0, 5);
    $('#g-more').hidden = !others.length;
    $('#g-more-list').innerHTML = others.map((x) => `<a href="${esc(href(x))}"><b>${esc(x.title)}</b><small>${mins(x)} min</small></a>`).join('');

    $('#g-props').hidden = !rel.pick.length;
    $('#h-gp').innerHTML = rel.title;
    $('#g-props-more').href = rel.more;
    $('#g-rail').innerHTML = rel.pick.map((p) => L.cardHtml(p)).join('');
    ui.syncFavs();

    // SEO y al compartir
    const title = `${a.title} | Guías INMOBILIARIA CRUMEX`;
    const desc = a.summary || String(a.body || '').replace(/\s+/g, ' ').slice(0, 155);
    document.title = title;
    setMeta('meta[name="description"]', desc); setMeta('meta[property="og:title"]', a.title); setMeta('meta[property="og:description"]', desc); setMeta('meta[property="og:type"]', 'article');
    setCanon(url);
    const ld = document.getElementById('g-ld') || Object.assign(document.createElement('script'), { id: 'g-ld', type: 'application/ld+json' });
    const org = { '@type': 'RealEstateAgent', name: 'INMOBILIARIA CRUMEX', url: new URL('tienda.html', location.href).href };
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: a.title, description: desc, inLanguage: 'es-MX', mainEntityOfPage: url, url, image: new URL('img/og.png', location.href).href,
        datePublished: a.published_at || undefined, dateModified: a.updated_at || a.published_at || undefined, author: org, publisher: org, wordCount: words(a.body) },
      { '@type': 'BreadcrumbList', itemListElement: [['Inicio', 'tienda.html'], ['Guías', 'guias.html'], [a.title, href(a)]].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: new URL(u, location.href).href })) }] });
    if (!ld.parentNode) document.head.appendChild(ld);
  }

  async function init() {
    ui = L.chrome({ page: 'guias' });
    const d = await CRX.api.loadPublic();
    const arts = (d.articles || []).slice().sort((x, y) => String(y.published_at || '').localeCompare(String(x.published_at || '')));
    const q = (new URLSearchParams(location.search).get('a') || '').trim();
    if (!q) { renderIndex(arts); return; }
    const a = arts.find((x) => x.slug === q || String(x.id) === q);
    if (!a) {
      renderIndex(arts);
      $('#h-g').innerHTML = 'No encontramos <em>esa guía</em>';
      $('#g-lead').textContent = 'Puede que la hayamos quitado o cambiado de nombre. Estas son las guías que tenemos:';
      setMeta('meta[name="robots"]', 'noindex');
      return;
    }
    renderArticle(a, arts, d.properties || []);
    $('#g-copy').addEventListener('click', async () => {
      const link = location.href.split('#')[0];
      try { await navigator.clipboard.writeText(link); CRX.toast('Enlace copiado', 'ok'); }
      catch (e) { CRX.toast(link); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
