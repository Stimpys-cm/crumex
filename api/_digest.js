// INMOBILIARIA CRUMEX · resumen diario por correo para cada persona del equipo
//   Visitas de hoy, seguimientos que tocan, prospectos y propietarios sin atender, exclusivas por vencer.
//   El administrador ve todo; un asesor, solo lo suyo. Lo usan api/cron.js (cada mañana) y el panel (vista previa).
import { esc } from './_http.js';
import { localDay } from './_rules.js';

const H = 3600e3;
const fmtTime = (d) => new Date(d).toLocaleTimeString('es-MX', { timeZone: 'America/Matamoros', hour: 'numeric', minute: '2-digit' });
const fmtDay = (d) => new Date(d).toLocaleDateString('es-MX', { timeZone: 'America/Matamoros', weekday: 'long', day: 'numeric', month: 'long' });

export async function buildDigest(db, user, base) {
  const isAdmin = user.role === 'admin'; const now = new Date(); const today = localDay(now);
  const mine = (field) => (isAdmin ? {} : { [field]: user._id });
  const OPEN = { $nin: ['ganado', 'descartado'] };
  const [visitsRaw, follow, fresh, excl, newLeads24, views24] = await Promise.all([
    db.collection('visits').find(Object.assign({ scheduled_at: { $gte: new Date(+now - 14 * H), $lte: new Date(+now + 38 * H) }, status: { $in: ['pendiente', 'confirmada'] } }, mine('advisor_id')), { sort: { scheduled_at: 1 } }).toArray(),
    db.collection('leads').find(Object.assign({ follow_up_at: { $lte: new Date(+now + 24 * H) }, status: OPEN }, mine('assigned_to')), { sort: { follow_up_at: 1 }, limit: 30 }).toArray(),
    db.collection('leads').find(Object.assign({ status: 'nuevo' }, isAdmin ? {} : { assigned_to: user._id }), { sort: { created_at: 1 }, limit: 40 }).toArray(),
    isAdmin ? db.collection('properties').find({ exclusive: true, exclusive_until: { $lte: localDay(new Date(+now + 7 * 24 * H)) }, status: { $in: ['disponible', 'apartada'] } }, { projection: { ref_code: 1, title: 1, exclusive_until: 1 } }).toArray() : [],
    isAdmin ? db.collection('leads').countDocuments({ source: 'web', created_at: { $gt: new Date(+now - 24 * H) } }) : 0,
    isAdmin ? db.collection('events').countDocuments({ kind: 'vista', created_at: { $gt: new Date(+now - 24 * H) } }) : 0
  ]);
  const visits = visitsRaw.filter((v) => localDay(new Date(v.scheduled_at)) === today);
  const follows = follow.filter((l) => localDay(new Date(l.follow_up_at)) <= today);
  const owners = fresh.filter((l) => ['captacion', 'valuacion'].includes(l.kind));
  const buyers = fresh.filter((l) => !['captacion', 'valuacion'].includes(l.kind));
  // nombres de propiedades y prospectos de las visitas
  const pids = [...new Set(visits.map((v) => v.property_id).filter(Boolean))]; const lids = [...new Set(visits.map((v) => v.lead_id).filter(Boolean))];
  const [props, people] = await Promise.all([
    pids.length ? db.collection('properties').find({ _id: { $in: pids } }, { projection: { ref_code: 1, title: 1, address_private: 1, public_location: 1 } }).toArray() : [],
    lids.length ? db.collection('leads').find({ _id: { $in: lids } }, { projection: { full_name: 1, phone: 1 } }).toArray() : []
  ]);
  const P = new Map(props.map((p) => [p._id, p])); const Lm = new Map(people.map((l) => [l._id, l]));
  const ago = (d) => { const h = Math.round((now - new Date(d)) / H); return h < 1 ? 'hace minutos' : h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`; };

  const sections = [];
  if (visits.length) sections.push(['Visitas de hoy', visits.map((v) => { const p = P.get(v.property_id) || {}; const l = Lm.get(v.lead_id); return `<b>${esc(fmtTime(v.scheduled_at))}</b> · ${esc(p.ref_code || '')} ${esc(p.title || 'Propiedad')}${l ? ` · con ${esc(l.full_name)} (${esc(l.phone)})` : ''}${p.address_private ? `<br><small>${esc(p.address_private)}</small>` : ''}`; })]);
  if (follows.length) sections.push(['Seguimientos que tocan hoy o atrasados', follows.map((l) => `<b>${esc(l.full_name)}</b> (${esc(l.phone)})${l.follow_up_note ? ' · ' + esc(l.follow_up_note) : ''} · <small>${localDay(new Date(l.follow_up_at)) < today ? 'atrasado desde ' : ''}${esc(fmtDay(l.follow_up_at))}</small>`)]);
  if (owners.length) sections.push([`Propietarios por atender (${owners.length})`, owners.slice(0, 12).map((l) => { const x = l.payload || {}; return `<b>${esc(l.full_name)}</b> (${esc(l.phone)}) · ${esc([x.operacion, x.tipo, x.zona].filter(Boolean).join(' · ') || 'propiedad')} · <small>${esc(ago(l.created_at))}</small>`; })]);
  if (buyers.length) sections.push([`Prospectos sin atender (${buyers.length})`, buyers.slice(0, 12).map((l) => `<b>${esc(l.full_name)}</b> (${esc(l.phone)})${l.channel && l.channel !== 'Directo' ? ' · vía ' + esc(l.channel) : ''} · <small>${esc(ago(l.created_at))}</small>`)]);
  if (excl.length) sections.push(['Exclusivas que vencen en 7 días o menos', excl.map((p) => `<b>${esc(p.ref_code)}</b> ${esc(p.title)} · vence ${esc(p.exclusive_until)}`)]);
  const count = visits.length + follows.length + fresh.length + excl.length;
  const first = String(user.full_name || '').trim().split(/\s+/)[0];
  const panel = `${base}/paginaadminimobi19.html`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1B2533;max-width:600px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#1A529A;font-weight:bold">INMOBILIARIA CRUMEX · ${esc(fmtDay(now))}</p>
    <h2 style="margin:0 0 6px;color:#0E1E33">Buenos días${first ? ', ' + esc(first) : ''}</h2>
    <p style="margin:0 0 14px;color:#536074">${count ? 'Esto es lo que tienes para hoy:' : 'Hoy no tienes pendientes en el panel.'}${isAdmin ? ` En las últimas 24 horas llegaron <b>${newLeads24}</b> solicitudes del sitio y hubo <b>${views24}</b> vistas de propiedades.` : ''}</p>
    ${sections.map(([t, items]) => `<h3 style="margin:18px 0 6px;font-size:14px;color:#0E1E33;border-bottom:2px solid #1D5BA6;padding-bottom:4px">${esc(t)}</h3><ul style="margin:0;padding-left:18px">${items.map((i) => `<li style="margin:6px 0">${i}</li>`).join('')}</ul>`).join('')}
    <p style="margin:22px 0"><a href="${esc(panel)}" style="background:#0E1E33;color:#fff;padding:11px 18px;border-radius:30px;text-decoration:none;font-weight:bold">Abrir el panel</a></p>
    <p style="font-size:12px;color:#536074">Para dejar de recibir este resumen, apágalo en Panel &gt; Mi cuenta.</p></div>`;
  const text = [`Buenos días${first ? ', ' + first : ''}.`, ...sections.map(([t, items]) => `\n${t}:\n` + items.map((i) => '- ' + i.replace(/<[^>]+>/g, '')).join('\n')), `\nPanel: ${panel}`].join('\n');
  return { count, html, text, subject: count ? `Tu día: ${[visits.length && `${visits.length} visita${visits.length > 1 ? 's' : ''}`, follows.length && `${follows.length} seguimiento${follows.length > 1 ? 's' : ''}`, fresh.length && `${fresh.length} sin atender`].filter(Boolean).join(' · ')} · CRUMEX` : 'Tu día en CRUMEX' };
}
