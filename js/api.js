/* INMOBILIARIA CRUMEX · capa de datos
 * Dos modos con la misma interfaz:
 *   - remote: el servidor (/api en Vercel) con MongoDB, cuando config.js tiene USE_SERVER: true
 *   - local : localStorage con datos de demostración (para probar sin servidor)
 * El resto del código solo habla con CRX.api.
 */
(function () {
  const CRX = window.CRX;
  const CFG = window.CRX_CONFIG || {};

  const PROP_COLS = ['id', 'ref_code', 'slug', 'operation', 'type', 'status', 'title', 'description', 'price', 'currency',
    'price_on_request', 'price_reduced', 'featured', 'zone_id', 'public_location', 'address_private', 'lat', 'lng',
    'bedrooms', 'bathrooms', 'parking', 'construction_m2', 'land_m2', 'age_years', 'attributes', 'owner_id', 'advisor_id',
    'exclusive', 'exclusive_until', 'commission_pct'];
  const pk = () => 'id';

  const pick = (o, cols) => { const r = {}; cols.forEach((c) => { if (o[c] !== undefined) r[c] = o[c]; }); return r; };
  const safeName = (n) => String(n || 'documento').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(-80) || 'documento';

  function errMsg(e) {
    const m = (e && e.message) || String(e);
    if (/Invalid login/i.test(m)) return 'Correo o contraseña incorrectos.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sin conexión con el servidor. Intenta de nuevo.';
    return m;
  }

  /* ===================================================================
   *  BACKEND DEL SERVIDOR (funciones de Vercel + MongoDB)
   *  El navegador nunca habla con la base: solo con /api, que revisa
   *  la sesión, los permisos y las reglas de cada dato.
   * =================================================================== */
  function makeServer() {
    const BASE = (CFG.API_BASE || '/api').replace(/\/+$/, '');
    async function call(path, opt) {
      let r;
      try { r = await fetch(BASE + path, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, opt, { headers: Object.assign({ 'Content-Type': 'application/json', 'X-CRX': '1' }, (opt && opt.headers) || {}) })); }
      catch (e) { throw new Error('Sin conexión con el servidor. Intenta de nuevo.'); }
      let data = null; try { data = await r.json(); } catch (e) { data = null; }
      if (!r.ok) { const e = new Error((data && data.error) || `Error del servidor (${r.status}).`); e.status = r.status; e.code = data && data.code; throw e; }
      return data;
    }
    const get = (p) => call(p, { method: 'GET' });
    const post = (p, b) => call(p, { method: 'POST', body: JSON.stringify(b || {}) });

    // todo lo público llega en una sola petición
    let bundle = null;
    const pub = () => (bundle = bundle || call('/public', { method: 'GET', cache: 'default' }).catch((e) => { bundle = null; throw e; }));
    let me = null; let inPanel = false;
    let recoveryToken = null;
    const m = /[#&]reset=([A-Za-z0-9_-]{20,100})/.exec(location.hash);
    if (m) { recoveryToken = m[1]; try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ } }

    // Sube una foto o documento: directo a Cloudinary (con firma del servidor) o a MongoDB
    async function upload(kind, blob, name, extra) {
      const sig = await post('/admin?a=sign', { kind });
      if (blob.size > sig.max_bytes) throw new Error(kind === 'doc' ? `El documento pesa más de ${Math.round(sig.max_bytes / 1048576)} MB.` : 'La foto pesa demasiado.');
      if (sig.storage === 'cloudinary') {
        const f = new FormData();
        f.append('file', blob, name || (kind === 'doc' ? 'documento' : 'foto.webp'));
        ['api_key', 'timestamp', 'signature', 'folder', 'type', 'allowed_formats'].forEach((k) => { if (sig[k] !== undefined && sig[k] !== null) f.append(k, sig[k]); });
        const r = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud}/${sig.resource_type}/upload`, { method: 'POST', body: f });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.secure_url) throw new Error((d.error && d.error.message) || 'No se pudo subir el archivo a Cloudinary.');
        if (kind === 'doc') return post('/admin?a=doc-add', Object.assign({}, extra, { public_id: d.public_id, format: d.format, bytes: d.bytes, mime: blob.type, name }));
        return { path: d.secure_url, public_id: d.public_id };
      }
      const data = await CRX.blobToDataUrl(blob);
      return post('/admin?a=upload', Object.assign({}, extra, { kind, data, name }));
    }

    const api = {
      mode: 'remote',
      get storage() { return (me && me.storage) || 'mongo'; },
      photoUrl: (path) => String(path || ''),
      // foto suelta (por ejemplo, la de una persona del equipo): devuelve { path }
      uploadImage: (blob) => upload('photo', blob, 'perfil.webp'),
      getSettings: async () => (inPanel ? get('/admin?a=settings') : (await pub()).settings),
      listProperties: async () => (await pub()).properties,
      getTeam: async () => (await pub()).team,
      getStats: async () => (await pub()).stats,
      listArticles: async () => (await pub()).articles,
      listTestimonials: async () => (await pub()).testimonials,
      listZones: async () => (await pub()).zones,
      async track(propertyId, kind, visitor) {
        try { await fetch(BASE + '/public?a=track', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CRX': '1' }, body: JSON.stringify({ property_id: propertyId, kind, visitor }) }); } catch (e) { /* nunca rompe la página */ }
      },
      // los formularios del sitio solo llaman aquí después de que la persona aceptó el aviso de privacidad
      createLead: (lead) => post('/public?a=lead', Object.assign({ origin: CRX.origin ? CRX.origin() : null }, lead, { privacy: true })),
      // encuesta después de la visita (opinion.html?t=…)
      visitInfo: (t) => get(`/public?a=visit&t=${encodeURIComponent(t)}`),
      sendFeedback: (o) => post('/public?a=feedback', o),

      auth: {
        async status() { me = await get('/auth?a=me'); return me; },
        async current() {
          const r = await get('/auth?a=me'); me = r; if (!r.user) return null; inPanel = true;
          return { id: r.user.id, email: r.user.email, name: r.user.full_name, role: r.user.role, active: r.user.active };
        },
        async signIn(email, password) { const r = await post('/auth?a=login', { email, password }); inPanel = true; return { id: r.user.id, email: r.user.email, name: r.user.full_name, role: r.user.role, active: r.user.active }; },
        async signOut() { inPanel = false; await post('/auth?a=logout').catch(() => {}); },
        async setup(o) { const r = await post('/auth?a=setup', o); inPanel = true; return { id: r.user.id, email: r.user.email, name: r.user.full_name, role: r.user.role, active: r.user.active }; },
        async resetPassword(email) { await post('/auth?a=forgot', { email }); },
        async updatePassword(password, opt) {
          if (recoveryToken) { await post('/auth?a=reset', { token: recoveryToken, password }); recoveryToken = null; return; }
          await post('/auth?a=password', { current: (opt && opt.current) || '', password });
        },
        onRecovery(cb) { if (recoveryToken) cb(); },
        needsCurrent: true
      },

      async list(table, opts) {
        opts = opts || {};
        const rows = await get(`/admin?a=list&t=${encodeURIComponent(table)}`);
        if (opts.order) rows.sort((a, b) => (String(a[opts.order] ?? '') < String(b[opts.order] ?? '') ? -1 : 1) * (opts.asc ? 1 : -1));
        return rows;
      },
      upsert: (table, row, o) => post(`/admin?a=save&t=${encodeURIComponent(table)}`, { row, isNew: !!(o && o.isNew) }),
      remove: (table, id) => post(`/admin?a=delete&t=${encodeURIComponent(table)}`, { id }),
      async saveSettings(obj) { await post('/admin?a=settings', obj); bundle = null; },

      properties: {
        list: () => get('/admin?a=properties'),
        /* photos: [{id?, path?, alt, blob?}] en el orden final; la primera es la portada */
        async save(row, photos) {
          const list = [];
          for (const p of (photos || [])) {
            if (p.blob) {
              const u = await upload('photo', p.blob, 'foto.webp');
              // guardada en MongoDB: también una miniatura de 640 px para tarjetas y celulares
              let thumb = null;
              if (/^\/api\/file\?/.test(u.path)) { try { const t = await CRX.fileToWebp(p.blob, 640, 0.78); thumb = (await upload('photo', t, 'mini.webp')).path; } catch (e) { thumb = null; } }
              list.push({ path: u.path, thumb, public_id: u.public_id || null, alt: p.alt || '', plan: !!p.plan });
            } else list.push({ id: p.id, path: p.path || p.url, public_id: p.public_id || null, alt: p.alt || '', plan: !!p.plan });
          }
          const body = pick(row, PROP_COLS); delete body.ref_code; delete body.slug; delete body.price_reduced;
          return (await post('/admin?a=property', { row: body, photos: list })).id;
        },
        setStatus: (id, status) => post('/admin?a=status', { id, status }),
        remove: (id) => post('/admin?a=property-delete', { id })
      },
      leads: {
        list: () => api.list('leads', { order: 'created_at' }),
        poll: () => get('/admin?a=poll')
      },
      report: (id) => get(`/admin?a=report&id=${encodeURIComponent(id)}`),
      ownerLink: (id, revoke) => post('/admin?a=owner-link', { id, revoke: !!revoke }),
      ownerNotes: (id, notes) => post('/admin?a=owner-notes', { id, notes }),
      ownerReport: (t) => get(`/public?a=owner-report&t=${encodeURIComponent(t)}`),
      tools: {
        health: () => get('/admin?a=health'),
        test: (what) => post('/admin?a=health-test', { what }),
        digestPreview: () => get('/admin?a=digest-preview'),
        digestTest: () => post('/admin?a=digest-test'),
        alerts: () => get('/admin?a=alerts'),
        alertOff: (id) => post('/admin?a=alert-off', { id }),
        visitToken: async (id) => (await post('/admin?a=visit-token', { id })).token,
        feedUrl: () => location.origin + '/api/public?a=feed',
        lastBackup: async () => (await get('/admin?a=meta')).last_backup,
        // respaldo: colección por colección y en bloques (Vercel limita cada respuesta a 4.5 MB)
        async backup(onStep) {
          const idx = (await get('/admin?a=backup')).collections; const out = { app: 'crumex', version: 1, mode: 'server', created_at: new Date().toISOString(), collections: {} };
          for (const { name, count } of idx) {
            out.collections[name] = [];
            for (let skip = 0; skip < Math.max(count, 1); skip += 1500) { const r = await get(`/admin?a=backup&c=${name}&skip=${skip}`); out.collections[name].push(...r.docs); if (onStep) onStep(name, out.collections[name].length, count); if (r.docs.length < 1500) break; }
          }
          await post('/admin?a=backup-done'); return out;
        },
        async restore(data, onStep) {
          if (!data || data.app !== 'crumex' || !data.collections) throw new Error('El archivo no es un respaldo de CRUMEX.');
          const names = Object.keys(data.collections).filter((n) => n !== 'meta'); let restored = 0, errors = 0;
          for (const [i, name] of names.entries()) {
            const docs = data.collections[name] || [];
            for (let k = 0; k < docs.length; k += 400) {
              const r = await post('/admin?a=restore', { c: name, docs: docs.slice(k, k + 400), last: i === names.length - 1 && k + 400 >= docs.length });
              restored += r.restored; errors += r.errors; if (onStep) onStep(name, Math.min(k + 400, docs.length), docs.length);
            }
          }
          bundle = null; return { restored, errors };
        }
      },
      activity: (o) => get('/admin?a=activity&' + new URLSearchParams(Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v))).toString()),
      stats: {
        summary: () => get('/admin?a=stats&k=summary'),
        daily: () => get('/admin?a=stats&k=daily')
      },
      docs: {
        list: (pid) => get(`/admin?a=docs&p=${encodeURIComponent(pid)}`),
        upload: (pid, file, kind) => upload('doc', file, file.name, { property_id: pid, doc_kind: kind }),
        // expediente de un contacto (identificación, comprobantes…)
        listContact: (cid) => get(`/admin?a=docs&c=${encodeURIComponent(cid)}`),
        uploadContact: (cid, file, kind) => upload('doc', file, file.name, { contact_id: cid, doc_kind: kind }),
        async url(doc) { return (await get(`/admin?a=doc-url&id=${encodeURIComponent(doc.id)}`)).url; },
        remove: (doc) => post('/admin?a=doc-delete', { id: doc.id })
      },
      // Carga todo lo público de una vez (una sola petición al servidor)
      async loadPublic() {
        try { return await pub(); }
        catch (e) { console.warn('[CruMex]', e); return { settings: {}, properties: [], team: [], stats: { closed_deals: 0, active_listings: 0 }, articles: [], testimonials: [], zones: [], wanted: [] }; }
      }
    };
    return api;
  }

  /* ===================================================================
   *  BACKEND LOCAL (localStorage, datos de demostración)
   * =================================================================== */
  function makeLocal() {
    const KEY = 'crx-local-v1';
    let db = null;
    const TABLES = ['properties', 'zones', 'contacts', 'leads', 'visits', 'deals', 'articles', 'testimonials', 'profiles', 'wanted'];

    function load() {
      if (db) return db;
      try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
      if (!db || db.v !== 2) {
        const demo = (window.CRX_DEMO && window.CRX_DEMO()) || {};
        db = { v: 2, seq: 0, settings: {}, files: {}, events: [], docs: [], evseq: 0 };
        TABLES.forEach((t) => { db[t] = (demo[t] || []).map((r) => Object.assign({}, r)); });
        db.settings = Object.assign({ whatsapp: CFG.WHATSAPP, phone: CFG.PHONE }, demo.settings || {});
        db.seq = db.properties.length;
        db.properties.forEach((p, i) => applyRules(p, null, i + 1));
        seedEvents();
        save();
      }
      db.events = db.events || []; db.docs = db.docs || []; db.alerts = db.alerts || [];
      if (!db.wanted) { const demo = (window.CRX_DEMO && window.CRX_DEMO()) || {}; db.wanted = (demo.wanted || []).map((r) => Object.assign({}, r)); }
      return db;
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(db)); }
      catch (e) { throw new Error('El almacenamiento local está lleno. Borra fotos o datos de demostración.'); }
    }

    // Estadísticas de EJEMPLO para que el panel no se vea vacío en la demostración
    function seedEvents() {
      let r = 7; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
      db.properties.filter((p) => p.status !== 'borrador').forEach((p, i) => {
        const days = 30; const base = [9, 4, 6, 7, 2, 3, 5][i % 7];
        for (let d = 0; d < days; d++) {
          const n = Math.round(base * (0.4 + rnd()));
          for (let k = 0; k < n; k++) {
            const at = new Date(Date.now() - d * 864e5 - rnd() * 864e5).toISOString();
            db.events.push({ id: ++db.evseq, property_id: p.id, kind: 'vista', visitor: 'demo', created_at: at });
            const x = rnd();
            if (x < 0.07) db.events.push({ id: ++db.evseq, property_id: p.id, kind: 'whatsapp', visitor: 'demo', created_at: at });
            else if (x < 0.11) db.events.push({ id: ++db.evseq, property_id: p.id, kind: 'favorita', visitor: 'demo', created_at: at });
            else if (x < 0.13) db.events.push({ id: ++db.evseq, property_id: p.id, kind: 'compartir', visitor: 'demo', created_at: at });
          }
        }
      });
    }

    // Imita los triggers de la base (ref_code, slug, fechas, precio rebajado)
    function applyRules(p, old, seq) {
      if (!p.ref_code) p.ref_code = 'CRX-' + String(seq || ++db.seq).padStart(5, '0');
      if (!p.slug) p.slug = CRX.slugify(p.title) + '-' + p.ref_code.toLowerCase();
      if (p.status === 'disponible' && !p.published_at) p.published_at = new Date().toISOString();
      if (p.status === 'cerrada') { if (!old || old.status !== 'cerrada') p.closed_at = new Date().toISOString(); }
      else p.closed_at = null;
      if (old && p.price != null && old.price != null && p.currency === old.currency && p.price < old.price) { p.price_reduced = true; p.price_prev = old.price; p.price_changed_at = new Date().toISOString(); }
      if (old && p.price != null && old.price != null && p.price > old.price) { p.price_reduced = false; p.price_prev = null; p.price_changed_at = null; }
      if (!p.price_on_request && !(Number(p.price) > 0)) throw new Error('Pon un precio mayor a 0 o marca "Precio a consultar".');
      if (!p.title || p.title.length < 3) throw new Error('El título es obligatorio.');
      return p;
    }

    const zoneName = (id) => { const z = db.zones.find((x) => x.id === id); return z ? z.name : null; };
    const zoneOf = (id) => db.zones.find((x) => x.id === id) || {};
    const EVENT_KINDS = ['vista', 'whatsapp', 'favorita', 'compartir', 'ficha'];
    // bitácora del modo demostración (un solo usuario)
    const logLocal = (action, table, id, label, detail) => {
      db.activity = db.activity || [];
      db.activity.unshift({ id: CRX.uuid(), at: new Date().toISOString(), user_id: 'local', user_name: 'Administrador (demo)', action, table, target_id: id ?? null, label: String(label || '').slice(0, 160), detail: detail || null });
      if (db.activity.length > 400) db.activity.length = 400;
    };
    const dayKey = (iso) => { const d = new Date(iso); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const photoUrl = (path) => { if (!path) return ''; load(); return db.files[path] || path; };
    const nextId = (arr) => arr.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;

    const api = {
      mode: 'local',
photoUrl,
      async uploadImage(blob) { load(); const path = 'local/perfil-' + CRX.uuid() + '.webp'; db.files[path] = await CRX.blobToDataUrl(blob); save(); return { path }; },
      async getSettings() { return clone(load().settings); },
      async listProperties() {
        load();
        return db.properties.filter((p) => ['disponible', 'apartada', 'cerrada'].includes(p.status)).map((p) => {
          const o = pick(p, PROP_COLS.filter((c) => !['address_private', 'owner_id', 'advisor_id', 'exclusive', 'exclusive_until', 'commission_pct', 'lat', 'lng'].includes(c)));
          o.published_at = p.published_at; o.price = p.price_on_request ? null : p.price;
          o.zone = zoneName(p.zone_id); o.zone_lat = zoneOf(p.zone_id).lat ?? null; o.zone_lng = zoneOf(p.zone_id).lng ?? null;
          o.is_new = !!p.published_at && Date.now() - new Date(p.published_at) < 14 * 864e5;
          o.photos = (p.photos || []).map((ph, i) => Object.assign({ path: ph.path, alt: ph.alt || '', cover: i === 0 }, ph.plan ? { plan: true } : {}));
          o.closed_at = p.status === 'cerrada' ? (p.closed_at || null) : null;
          o.price_prev = p.price_reduced && !p.price_on_request && p.price_prev != null ? p.price_prev : null; o.price_changed_at = o.price_prev != null ? (p.price_changed_at || null) : null;
          o.demo = !!p.demo;
          return clone(o);
        }).sort((a, b) => (b.featured - a.featured) || String(b.published_at).localeCompare(String(a.published_at)));
      },
      async getTeam() { return clone(load().profiles.filter((p) => p.active && p.show_on_site)); },
      async getStats() {
        load();
        return { closed_deals: db.deals.filter((d) => d.status === 'cerrada').length, active_listings: db.properties.filter((p) => p.status === 'disponible').length };
      },
      async listWanted() { return clone(load().wanted.filter((w) => w.active)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 12); },
      async listArticles() { return clone(load().articles.filter((a) => a.published)).sort((a, b) => String(b.published_at).localeCompare(String(a.published_at))); },
      async listZones() {
        load();
        return clone(db.zones).map((z) => Object.assign(z, { listings: db.properties.filter((p) => p.zone_id === z.id && ['disponible', 'apartada'].includes(p.status)).length })).sort((a, b) => a.name.localeCompare(b.name));
      },
      async track(pid, kind, visitor) {
        try {
          load(); if (!EVENT_KINDS.includes(kind)) return;
          const p = db.properties.find((x) => x.id === pid); if (!p || !['disponible', 'apartada', 'cerrada'].includes(p.status)) return;
          const v = visitor ? String(visitor).slice(0, 40) : null; const now = Date.now();
          if (v && db.events.some((e) => e.property_id === pid && e.kind === kind && e.visitor === v && now - new Date(e.created_at) < 30 * 60e3)) return;
          db.events.push({ id: ++db.evseq, property_id: pid, kind, visitor: v, created_at: new Date().toISOString() });
          if (db.events.length > 6000) db.events.splice(0, db.events.length - 6000);
          save();
        } catch (e) { /* almacenamiento lleno: no pasa nada */ }
      },
      async listTestimonials() { return clone(load().testimonials.filter((t) => t.approved)); },
      async createLead(lead) {
        load();
        if (!lead.full_name || lead.full_name.length < 2) throw new Error('Escribe tu nombre.');
        if (!lead.phone || lead.phone.length < 7) throw new Error('Escribe un teléfono válido.');
        const origin = CRX.origin ? CRX.origin() : null;
        const alert = lead.alert; const row = Object.assign({}, lead); delete row.alert;
        const id = CRX.uuid(); const now = new Date().toISOString();
        db.leads.push(Object.assign({ id, status: 'nuevo', source: 'web', created_at: now, privacy_accepted_at: now, payload: {}, origin, channel: CRX.channelOf(origin) }, row));
        // en la demostración la alerta se guarda, pero no se mandan correos
        if (alert && lead.email) db.alerts.push({ id: CRX.uuid(), email: String(lead.email).toLowerCase(), full_name: lead.full_name, phone: lead.phone, lead_id: id, filters: alert, active: true, created_at: now, last_sent_at: now, sent_count: 0 });
        save();
      },
      async visitInfo(t) {
        load(); const v = db.visits.find((x) => x.feedback_token === t); if (!v) throw new Error('Este enlace no es válido o ya no está activo.');
        const p = db.properties.find((x) => x.id === v.property_id) || {};
        return { ref_code: p.ref_code || null, title: p.title || null, scheduled_at: v.scheduled_at, done: !!v.feedback };
      },
      async sendFeedback(o) {
        load(); const v = db.visits.find((x) => x.feedback_token === o.t); if (!v) throw new Error('Este enlace no es válido o ya no está activo.');
        const rating = Math.round(Number(o.rating)); if (!(rating >= 1 && rating <= 5)) throw new Error('Elige de 1 a 5 estrellas.');
        if (!v.feedback) { v.feedback = { rating, interest: ['si', 'tal_vez', 'no'].includes(o.interest) ? o.interest : null, liked: String(o.liked || '').slice(0, 300) || null, concern: String(o.concern || '').slice(0, 300) || null, at: new Date().toISOString() }; save(); }
        return { ok: true };
      },

      auth: {
        async current() { const u = sessionStorage.getItem('crx-local-user'); return u ? { id: 'local', email: 'demo@crumex.local', name: 'Administrador (demo)', role: 'admin', active: true } : null; },
        async signIn(email, pw) {
          if (email.trim().toLowerCase() !== 'demo@crumex.local' || pw !== 'demo1234') throw new Error('Invalid login credentials');
          sessionStorage.setItem('crx-local-user', '1'); return api.auth.current();
        },
        async signOut() { sessionStorage.removeItem('crx-local-user'); },
        async resetPassword() { throw new Error('En modo demostración no se envían correos. Con el servidor y MongoDB configurados sí funciona.'); },
        async updatePassword(password) { if (String(password).length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.'); throw new Error('En modo demostración la contraseña es fija (demo1234). Con el servidor configurado sí se cambia.'); },
        onRecovery() { /* sin correos en modo local */ },
        async status() { return { user: null, needsSetup: false }; },
        needsCurrent: false
      },

      async list(table, opts) {
        opts = opts || {}; load();
        let rows = clone(db[table] || []);
        if (opts.order) rows.sort((a, b) => (String(a[opts.order] ?? '') < String(b[opts.order] ?? '') ? -1 : 1) * (opts.asc ? 1 : -1));
        return rows;
      },
      tools: {
        async health() { return { demo: true }; },
        async test() { throw new Error('En modo demostración no se mandan correos ni mensajes.'); },
        async digestPreview() { throw new Error('El resumen diario funciona con el servidor y el correo configurados.'); },
        async digestTest() { throw new Error('En modo demostración no se mandan correos.'); },
        async alerts() { load(); return clone(db.alerts).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); },
        async alertOff(id) { load(); const a = db.alerts.find((x) => x.id === id); if (a) { a.active = false; save(); } return { ok: true }; },
        async visitToken(id) { load(); const v = db.visits.find((x) => String(x.id) === String(id)); if (!v) throw new Error('Visita no encontrada.'); if (!v.feedback_token) { v.feedback_token = CRX.uuid().replace(/-/g, ''); save(); } return v.feedback_token; },
        feedUrl: () => '',
        async lastBackup() { try { return localStorage.getItem('crx-last-backup'); } catch (e) { return null; } },
        async backup() { load(); const out = { app: 'crumex', version: 1, mode: 'local', created_at: new Date().toISOString(), local: clone(db) }; try { localStorage.setItem('crx-last-backup', out.created_at); } catch (e) { /* nada */ } return out; },
        async restore(data) {
          if (!data || data.app !== 'crumex') throw new Error('El archivo no es un respaldo de CRUMEX.');
          if (!data.local) throw new Error('Este respaldo es del servidor. Restáuralo con el servidor configurado.');
          db = data.local; save(); return { restored: Object.values(db).filter(Array.isArray).reduce((s, a) => s + a.length, 0), errors: 0 };
        }
      },
      async ownerLink(id, revoke) {
        load(); const p = db.properties.find((x) => x.id === id); if (!p) throw new Error('Propiedad no encontrada.');
        if (revoke) p.owner_token = null; else if (!p.owner_token) p.owner_token = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
        save(); return { token: p.owner_token || null };
      },
      async ownerNotes(id, notes) { load(); const p = db.properties.find((x) => x.id === id); if (!p) throw new Error('Propiedad no encontrada.'); p.owner_notes = String(notes || '').slice(0, 2000); save(); return { ok: true }; },
      async ownerReport(t) {
        load(); const p = db.properties.find((x) => t && x.owner_token === t);
        if (!p) throw new Error('Este enlace no es válido o ya no está activo. Pide uno nuevo a tu asesor.');
        const r = await api.report(p.id); delete r.owner_link; if (r.property.owner) r.property.owner.phone = null; return r;
      },
      async activity(o) {
        load(); o = o || {};
        return clone((db.activity || []).filter((x) => (!o.u || x.user_id === o.u) && (!o.t || x.table === o.t) && (!o.before || x.at < o.before)).slice(0, 150));
      },
      async upsert(table, row, o) {
        load(); const key = pk(table); const arr = db[table];
        const label = (r) => r.title || r.full_name || r.name || r.author_name || ('#' + r[key]);
        if (o && o.isNew) {
          const r = Object.assign({}, row);
          if (r[key] == null) r[key] = (table === 'zones' || table === 'deals') ? nextId(arr) : CRX.uuid();
          if (['articles', 'testimonials', 'leads', 'contacts', 'visits', 'deals'].includes(table) && !r.created_at) r.created_at = new Date().toISOString();
          if (table === 'visits' && !r.feedback_token) r.feedback_token = CRX.uuid().replace(/-/g, '');
          if (table === 'articles' && r.published && !r.published_at) r.published_at = new Date().toISOString();
          if (table === 'testimonials' && r.approved && !r.consent_at) throw new Error('Para aprobar un testimonio necesitas registrar el permiso del cliente (fecha).');
          arr.push(r); logLocal('crear', table, r[key], label(r)); save(); return clone(r);
        }
        const i = arr.findIndex((x) => String(x[key]) === String(row[key]));
        if (i < 0) throw new Error('Registro no encontrado.');
        const r = Object.assign({}, arr[i], row);
        if (table === 'articles' && r.published && !r.published_at) r.published_at = new Date().toISOString();
        if (table === 'testimonials' && r.approved && !r.consent_at) throw new Error('Para aprobar un testimonio necesitas registrar el permiso del cliente (fecha).');
        logLocal('editar', table, r[key], label(r), arr[i].status !== r.status && r.status ? `estado: ${arr[i].status || '—'} → ${r.status}` : '');
        arr[i] = r; save(); return clone(r);
      },
      async remove(table, id) {
        load(); const old = db[table].find((x) => String(x[pk(table)]) === String(id));
        db[table] = db[table].filter((x) => String(x[pk(table)]) !== String(id));
        if (old) logLocal('borrar', table, id, old.title || old.full_name || old.name || old.author_name || '#' + id); save();
      },
      async saveSettings(obj) { load(); Object.assign(db.settings, obj); logLocal('editar', 'settings', null, 'Ajustes del sitio'); save(); },

      properties: {
        async list() {
          load();
          return clone(db.properties).map((p) => {
            p.zone = zoneName(p.zone_id);
            p.photos = (p.photos || []).map((ph) => Object.assign({}, ph, { url: photoUrl(ph.path) }));
            return p;
          }).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        },
        async save(row, photos) {
          load();
          const body = pick(row, PROP_COLS); const isNew = !row.id;
          const outPhotos = [];
          for (const p of (photos || [])) {
            if (p.blob) {
              const path = 'local/' + CRX.uuid() + '.webp';
              db.files[path] = await CRX.blobToDataUrl(p.blob);
              outPhotos.push({ path, alt: p.alt || '', plan: !!p.plan });
            } else outPhotos.push({ path: p.path, alt: p.alt || '', plan: !!p.plan });
          }
          const usedPaths = new Set(outPhotos.map((p) => p.path));
          if (isNew) {
            body.id = CRX.uuid(); body.created_at = new Date().toISOString(); body.photos = outPhotos;
            applyRules(body, null); db.properties.push(body);
          } else {
            const i = db.properties.findIndex((p) => p.id === row.id);
            if (i < 0) throw new Error('Propiedad no encontrada.');
            const old = db.properties[i];
            (old.photos || []).forEach((ph) => { if (!usedPaths.has(ph.path) && db.files[ph.path]) delete db.files[ph.path]; });
            const n = Object.assign({}, old, body, { photos: outPhotos });
            if (old.price !== n.price || old.currency !== n.currency) { db.price_history = db.price_history || []; db.price_history.push({ property_id: old.id, old_price: old.price ?? null, new_price: n.price ?? null, currency: n.currency, changed_at: new Date().toISOString() }); }
            applyRules(n, old); db.properties[i] = n;
          }
          const pp = db.properties.find((x) => x.id === (body.id || row.id));
          logLocal(isNew ? 'crear' : 'editar', 'properties', pp.id, `${pp.ref_code || ''} ${pp.title}`.trim());
          save(); return body.id || row.id;
        },
        async setStatus(id, status) {
          load(); const i = db.properties.findIndex((x) => x.id === id); if (i < 0) throw new Error('Propiedad no encontrada.');
          const old = db.properties[i]; const n = Object.assign({}, old, { status }); applyRules(n, old); db.properties[i] = n;
          if (old.status !== status) logLocal('estado', 'properties', id, `${old.ref_code || ''} ${old.title}`.trim(), `${old.status} → ${status}`); save();
        },
        async remove(id) {
          load(); const p = db.properties.find((x) => x.id === id);
          if (p) (p.photos || []).forEach((ph) => delete db.files[ph.path]);
          if (p) logLocal('borrar', 'properties', id, `${p.ref_code || ''} ${p.title}`.trim());
          db.docs.filter((d) => d.property_id === id).forEach((d) => delete db.files[d.storage_path]);
          db.docs = db.docs.filter((d) => d.property_id !== id); db.events = db.events.filter((e) => e.property_id !== id);
          db.properties = db.properties.filter((x) => x.id !== id); save();
        }
      },
      leads: {
        list: () => api.list('leads', { order: 'created_at' }),
        async poll() {
          db = null; load(); const now = new Date().toISOString(); // relee: otra pestaña pudo guardar un prospecto
          return {
            latest: clone(db.leads).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 25),
            due: clone(db.leads).filter((l) => l.follow_up_at && l.follow_up_at <= now && !['ganado', 'descartado'].includes(l.status)).sort((a, b) => a.follow_up_at.localeCompare(b.follow_up_at))
          };
        }
      },
      async report(id) {
        load(); const p = db.properties.find((x) => x.id === id); if (!p) throw new Error('Propiedad no encontrada.');
        const now = Date.now(); const area = (x) => Number(x.construction_m2) || Number(x.land_m2) || 0;
        const m = {}; db.events.filter((e) => e.property_id === id).forEach((e) => { const k = dayKey(e.created_at) + '|' + e.kind; m[k] = (m[k] || 0) + 1; });
        const peers = db.properties.filter((x) => x.id !== id && x.type === p.type && ['disponible', 'apartada'].includes(x.status));
        const v30 = (pid) => db.events.filter((e) => e.property_id === pid && e.kind === 'vista' && now - new Date(e.created_at) < 30 * 864e5).length;
        const ref = peers.filter((x) => x.zone_id === p.zone_id && x.operation === p.operation && x.currency === 'MXN' && !x.price_on_request && x.price > 0 && area(x) > 0).map((x) => x.price / area(x));
        const prof = (uid) => (db.profiles || []).find((u) => u.id === uid); const ct = (cid) => (db.contacts || []).find((c) => c.id === cid);
        const adv = p.advisor_id && prof(p.advisor_id); const own = p.owner_id && ct(p.owner_id); const ph = (p.photos || [])[0];
        return clone({
          property: Object.assign(pick(p, ['id', 'ref_code', 'title', 'type', 'operation', 'status', 'price', 'currency', 'price_on_request', 'published_at', 'created_at', 'closed_at', 'public_location', 'bedrooms', 'bathrooms', 'construction_m2', 'land_m2']),
            { zone: zoneName(p.zone_id), photo: ph ? { path: ph.path, url: photoUrl(ph.path) } : null, photos: (p.photos || []).length,
              advisor: adv ? { full_name: adv.full_name, phone: adv.phone || null, email: adv.email || null } : null, owner: own ? { full_name: own.full_name, phone: own.phone || null } : null }),
          events: Object.entries(m).map(([k, n]) => { const [day, kind] = k.split('|'); return { day, kind, n }; }),
          leads: db.leads.filter((l) => l.property_id === id).map((l) => ({ created_at: l.created_at, kind: l.kind, status: l.status, source: l.source || null })),
          visits: db.visits.filter((v) => v.property_id === id).map((v) => ({ scheduled_at: v.scheduled_at, status: v.status, feedback: v.feedback || null })),
          price_history: (db.price_history || []).filter((h) => h.property_id === id),
          peers: { n: peers.length, views_30d_avg: peers.length ? Math.round(peers.reduce((s, x) => s + v30(x.id), 0) / peers.length) : null },
          zone_ppm: ref.length >= 2 && p.operation === 'venta' ? { avg: Math.round(ref.reduce((a, b) => a + b, 0) / ref.length), n: ref.length } : null,
          owner_notes: p.owner_notes || '', owner_link: p.owner_token || null,
          generated_at: new Date().toISOString()
        });
      },
      stats: {
        async summary() {
          load(); const now = Date.now(); const D = 864e5;
          return db.properties.map((p) => {
            const ev = db.events.filter((e) => e.property_id === p.id); const age = (e) => now - new Date(e.created_at);
            const c = (k, days) => ev.filter((e) => e.kind === k && (!days || age(e) < days * D)).length;
            const views = ev.filter((e) => e.kind === 'vista').map((e) => e.created_at).sort();
            return { property_id: p.id, views_7d: c('vista', 7), views_30d: c('vista', 30), views_total: c('vista'), wa_30d: c('whatsapp', 30), wa_total: c('whatsapp'), fav_total: c('favorita'), share_total: c('compartir'), sheet_total: c('ficha'), last_view: views[views.length - 1] || null };
          });
        },
        async daily() {
          load(); const m = {}; const lim = Date.now() - 120 * 864e5;
          db.events.forEach((e) => { if (new Date(e.created_at) < lim) return; const k = dayKey(e.created_at) + '|' + e.kind; m[k] = (m[k] || 0) + 1; });
          return Object.entries(m).map(([k, n]) => { const [day, kind] = k.split('|'); return { day, kind, n }; }).sort((a, b) => a.day.localeCompare(b.day));
        }
      },
      docs: {
        async list(pid) { load(); return clone(db.docs.filter((d) => d.property_id === pid)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
        async listContact(cid) { load(); return clone(db.docs.filter((d) => d.contact_id === cid)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
        async uploadContact(cid, file, kind) { const d = await api.docs.upload(null, file, kind); load(); const x = db.docs.find((y) => y.id === d.id); x.property_id = null; x.contact_id = cid; save(); return clone(x); },
        async upload(pid, file, kind) {
          load();
          if (file.size > 2 * 1024 * 1024) throw new Error('En modo demostración cada documento puede pesar hasta 2 MB.');
          if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.type)) throw new Error('Sube PDF, JPG, PNG o WEBP.');
          const path = `${pid}/${CRX.uuid()}-${safeName(file.name)}`;
          db.files[path] = await CRX.blobToDataUrl(file);
          const d = { id: CRX.uuid(), property_id: pid, name: String(file.name).slice(0, 160), kind, storage_path: path, size_bytes: file.size, mime: file.type, uploaded_by: 'local', created_at: new Date().toISOString() };
          db.docs.push(d); save(); return clone(d);
        },
        async url(doc) { load(); return db.files[doc.storage_path] || ''; },
        async remove(doc) { load(); delete db.files[doc.storage_path]; db.docs = db.docs.filter((d) => d.id !== doc.id); save(); }
      },
      reset() { localStorage.removeItem(KEY); db = null; }
    };
    return api;
  }

  /* ===================================================================
   *  Selección de backend
   * =================================================================== */
  CRX.api = CFG.USE_SERVER === true ? makeServer() : makeLocal();
  CRX.api.errMsg = errMsg;

  /* Carga todo lo público de una vez; si una parte falla, el resto sigue. */
  if (!CRX.api.loadPublic) CRX.api.loadPublic = async function () {
    const safe = (p, d) => p.catch((e) => { console.warn('[CruMex]', e); return d; });
    const [settings, properties, team, stats, articles, testimonials, zones, wanted] = await Promise.all([
      safe(CRX.api.getSettings(), {}), safe(CRX.api.listProperties(), []), safe(CRX.api.getTeam(), []),
      safe(CRX.api.getStats(), { closed_deals: 0, active_listings: 0 }), safe(CRX.api.listArticles(), []), safe(CRX.api.listTestimonials(), []),
      safe(CRX.api.listZones(), []), safe(CRX.api.listWanted ? CRX.api.listWanted() : Promise.resolve([]), [])
    ]);
    return { settings, properties, team, stats, articles, testimonials, zones, wanted };
  };
})();
