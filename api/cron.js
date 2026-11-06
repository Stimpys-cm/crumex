// INMOBILIARIA CRUMEX · tarea diaria (Vercel Cron, ver "crons" en vercel.json)
//   Cada mañana:
//   - manda a cada persona activa del equipo su resumen del día por correo;
//   - manda las alertas de búsqueda con lo nuevo que coincide (a quien dejó su correo);
//   - recuerda a los clientes sus visitas de las próximas 36 horas.
//   Vercel manda la cabecera "Authorization: Bearer <CRON_SECRET>"; sin esa variable no hace nada.
import { getDB } from './_db.js';
import { origin, sendJSON, sameText } from './_http.js';
import { mailReady, sendEmail } from './_mail.js';
import { buildDigest } from './_digest.js';
import { publicBundle } from './_rules.js';
import { sendAlerts, sendVisitReminders } from './_alerts.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET || '';
  if (!secret || !sameText(String(req.headers.authorization || ''), `Bearer ${secret}`)) return sendJSON(res, 401, { error: 'No autorizado.' });
  if (!mailReady()) return sendJSON(res, 200, { ok: true, sent: 0, skipped: 'Falta RESEND_API_KEY' });
  try {
    const db = await getDB(); const base = origin(req); const until = Date.now() + 50e3; // la función tiene 60 s
    const users = await db.collection('users').find({ active: true, digest: { $ne: false } }, { projection: { full_name: 1, email: 1, role: 1 } }).toArray();
    let sent = 0;
    for (const u of users) {
      const d = await buildDigest(db, u, base);
      if (!d.count || !u.email) continue; // si no hay pendientes, no se manda nada
      if (await sendEmail({ to: u.email, subject: d.subject, html: d.html, text: d.text }).catch(() => false)) sent++;
    }
    const bundle = await publicBundle(db); const conf = bundle.settings || {};
    const alerts = await sendAlerts(db, bundle.properties, base, conf, until).catch((e) => { console.error('[crumex] alertas', e); return 0; });
    const reminders = await sendVisitReminders(db, base, conf, until).catch((e) => { console.error('[crumex] recordatorios', e); return 0; });
    return sendJSON(res, 200, { ok: true, sent, users: users.length, alerts, reminders });
  } catch (e) {
    console.error('[crumex] cron', e);
    return sendJSON(res, 500, { error: 'No se pudo armar el resumen.' });
  }
}
