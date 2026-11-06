// INMOBILIARIA CRUMEX · reporte para el propietario (lo usan el panel y el enlace privado del propietario)
// Solo cifras: nunca incluye nombres, teléfonos ni correos de los interesados.
import { HttpError } from './_http.js';

/* ---------- reporte para el propietario ---------- */
const AREA = (p) => Number(p.construction_m2) || Number(p.land_m2) || 0;
export async function propertyReport(db, id, forOwner) {
  const p = await db.collection('properties').findOne({ _id: id });
  if (!p) throw new HttpError(404, 'Propiedad no encontrada.');
  const now = Date.now(); const since = new Date(Math.max(now - 365 * 864e5, new Date(p.published_at || p.created_at || now).getTime() - 864e5));
  const [zone, advisor, owner, evRows, leads, visits, history, peers] = await Promise.all([
    p.zone_id != null ? db.collection('zones').findOne({ _id: p.zone_id }, { projection: { name: 1 } }) : null,
    p.advisor_id ? db.collection('users').findOne({ _id: p.advisor_id }, { projection: { full_name: 1, phone: 1, email: 1 } }) : null,
    p.owner_id ? db.collection('contacts').findOne({ _id: p.owner_id }, { projection: { full_name: 1, phone: 1 } }) : null,
    db.collection('events').aggregate([{ $match: { property_id: p._id, created_at: { $gt: since } } }, { $group: { _id: { day: '$day', kind: '$kind' }, n: { $sum: 1 } } }]).toArray(),
    db.collection('leads').find({ property_id: p._id }, { projection: { created_at: 1, kind: 1, status: 1, source: 1 }, sort: { created_at: 1 } }).toArray(),
    db.collection('visits').find({ property_id: p._id }, { projection: { scheduled_at: 1, status: 1, feedback: 1 }, sort: { scheduled_at: 1 } }).toArray(),
    db.collection('price_history').find({ property_id: p._id }, { sort: { changed_at: 1 } }).toArray(),
    db.collection('properties').find({ _id: { $ne: p._id }, type: p.type, status: { $in: ['disponible', 'apartada'] } }, { projection: { _id: 1, zone_id: 1, operation: 1, currency: 1, price: 1, price_on_request: 1, construction_m2: 1, land_m2: 1 } }).toArray()
  ]);
  // vistas de 30 días de propiedades del mismo tipo (para comparar)
  const ids = peers.map((x) => x._id); let avg30 = null;
  if (ids.length) {
    const rows = await db.collection('events').aggregate([{ $match: { kind: 'vista', property_id: { $in: ids }, created_at: { $gt: new Date(now - 30 * 864e5) } } }, { $group: { _id: '$property_id', n: { $sum: 1 } } }]).toArray();
    avg30 = Math.round(rows.reduce((s, r) => s + r.n, 0) / ids.length);
  }
  // precio por m² de referencia en la misma zona (mismo tipo y operación, en pesos)
  const ref = peers.filter((x) => x.zone_id === p.zone_id && x.operation === p.operation && x.currency === 'MXN' && !x.price_on_request && x.price > 0 && AREA(x) > 0).map((x) => x.price / AREA(x));
  const ph = (p.photos || [])[0];
  return {
    property: { id: p._id, ref_code: p.ref_code, title: p.title, type: p.type, operation: p.operation, status: p.status, price: p.price ?? null, currency: p.currency, price_on_request: !!p.price_on_request,
      published_at: p.published_at || null, created_at: p.created_at || null, closed_at: p.closed_at || null, zone: zone ? zone.name : null, public_location: p.public_location || null,
      bedrooms: p.bedrooms ?? null, bathrooms: p.bathrooms ?? null, construction_m2: p.construction_m2 ?? null, land_m2: p.land_m2 ?? null,
      photo: ph ? { path: ph.path, thumb: ph.thumb || null } : null, photos: (p.photos || []).length,
      advisor: advisor ? { full_name: advisor.full_name, phone: advisor.phone || null, email: advisor.email || null } : null,
      owner: owner ? { full_name: owner.full_name, phone: forOwner ? null : (owner.phone || null) } : null },
    events: evRows.map((r) => ({ day: r._id.day, kind: r._id.kind, n: r.n })),
    leads: leads.map((l) => ({ created_at: l.created_at, kind: l.kind, status: l.status, source: l.source || null })),
    visits: visits.map((v) => ({ scheduled_at: v.scheduled_at, status: v.status, feedback: v.feedback ? { rating: v.feedback.rating, interest: v.feedback.interest || null, liked: v.feedback.liked || null, concern: v.feedback.concern || null, at: v.feedback.at } : null })),
    price_history: history.map((h) => ({ changed_at: h.changed_at, old_price: h.old_price, new_price: h.new_price, currency: h.currency })),
    peers: { n: ids.length, views_30d_avg: avg30 },
    zone_ppm: ref.length >= 2 && p.operation === 'venta' ? { avg: Math.round(ref.reduce((a, b) => a + b, 0) / ref.length), n: ref.length } : null,
    owner_notes: p.owner_notes || '',
    owner_link: forOwner ? undefined : (p.owner_token || null),
    generated_at: new Date()
  };
}

