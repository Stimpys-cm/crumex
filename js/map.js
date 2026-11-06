/* INMOBILIARIA CRUMEX · mapas con Leaflet (incluido en js/vendor/leaflet) y OpenStreetMap.
   - CRX.map.zone(el, {lat, lng, label}) dibuja un círculo aproximado de la zona.
     Nunca se marca la dirección exacta de la propiedad.
   - CRX.map.picker(el, {lat, lng}, onPick) deja elegir el punto de una zona (panel).
   Leaflet solo se descarga cuando el mapa está por aparecer en pantalla. */
(function () {
  const CRX = window.CRX = window.CRX || {};
  const BASE = 'js/vendor/leaflet/';
  const REYNOSA = [26.0508, -98.2979];
  const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  let loading = null;

  function load() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      if (!document.querySelector('link[data-leaflet]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = BASE + 'leaflet.css'; l.dataset.leaflet = '1'; document.head.appendChild(l); }
      const s = document.createElement('script'); s.src = BASE + 'leaflet.js'; s.async = true;
      s.onload = () => res(window.L); s.onerror = () => { loading = null; rej(new Error('No se pudo cargar el mapa.')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  // Espera a que el contenedor esté cerca de la pantalla
  function whenVisible(el) {
    return new Promise((res) => {
      if (!('IntersectionObserver' in window)) return res();
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); res(); } }, { rootMargin: '250px' });
      io.observe(el);
    });
  }
  const valid = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(Number(lat) === 0 && Number(lng) === 0);

  function base(L, el, center, zoom, interactive) {
    const m = L.map(el, { center, zoom, scrollWheelZoom: false, attributionControl: true, zoomControl: true, dragging: interactive !== false, tap: false });
    L.tileLayer(TILES, { maxZoom: 18, attribution: ATTR }).addTo(m);
    // la rueda del mouse solo hace zoom después de hacer clic en el mapa (no estorba al bajar por la página)
    m.on('click', () => m.scrollWheelZoom.enable()); m.on('mouseout', () => m.scrollWheelZoom.disable());
    return m;
  }

  async function zone(el, o) {
    if (!el || !valid(o.lat, o.lng)) return null;
    await whenVisible(el);
    const L = await load();
    const c = [Number(o.lat), Number(o.lng)];
    const m = base(L, el, c, o.zoom || 14);
    L.circle(c, { radius: o.radius || 700, color: '#1D5BA6', weight: 2, fillColor: '#1D5BA6', fillOpacity: 0.18 }).addTo(m)
      .bindTooltip(o.label || 'Zona aproximada', { permanent: !!o.label, direction: 'top', className: 'zmap-tip' });
    el.classList.add('ready');
    setTimeout(() => m.invalidateSize(), 120);
    return m;
  }

  async function picker(el, o, onPick) {
    const L = await load();
    const has = valid(o.lat, o.lng); const c = has ? [Number(o.lat), Number(o.lng)] : REYNOSA;
    const m = base(L, el, c, has ? 14 : 12);
    m.scrollWheelZoom.enable();
    let mk = has ? L.circleMarker(c, { radius: 9, color: '#0E1E33', weight: 3, fillColor: '#1D5BA6', fillOpacity: 1 }).addTo(m) : null;
    m.on('click', (e) => {
      const p = [Math.round(e.latlng.lat * 1e5) / 1e5, Math.round(e.latlng.lng * 1e5) / 1e5];
      if (mk) mk.setLatLng(p); else mk = L.circleMarker(p, { radius: 9, color: '#0E1E33', weight: 3, fillColor: '#1D5BA6', fillOpacity: 1 }).addTo(m);
      onPick(p[0], p[1]);
    });
    setTimeout(() => m.invalidateSize(), 150);
    return m;
  }

  // Varias zonas a la vez (catálogo): un círculo por zona con cuántas hay; al tocarlo se filtra por esa zona.
  async function zones(el, list, onPick) {
    const L = await load();
    const m = base(L, el, REYNOSA, 12); const layer = L.layerGroup().addTo(m);
    const draw = (items) => {
      layer.clearLayers(); const pts = [];
      (items || []).filter((z) => valid(z.lat, z.lng)).forEach((z) => {
        const c = [Number(z.lat), Number(z.lng)]; pts.push(c);
        L.circle(c, { radius: 650 + Math.min(z.count, 20) * 40, color: '#0E1E33', weight: 2, fillColor: '#1D5BA6', fillOpacity: 0.32 }).addTo(layer)
          .bindTooltip(`${z.label}: ${z.count} ${z.count === 1 ? 'propiedad' : 'propiedades'}`, { permanent: true, direction: 'top', className: 'zmap-tip' })
          .on('click', () => onPick && onPick(z.label));
      });
      if (pts.length > 1) m.fitBounds(pts, { padding: [50, 50], maxZoom: 14 }); else if (pts.length) m.setView(pts[0], 14);
    };
    draw(list); el.classList.add('ready'); setTimeout(() => m.invalidateSize(), 120);
    return { update: draw, map: m };
  }

  CRX.map = { load, zone, zones, picker, valid, REYNOSA };
})();
