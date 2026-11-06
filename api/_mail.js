// INMOBILIARIA CRUMEX · avisos por correo (Resend) y Telegram
//
// Variables de entorno en Vercel (todas opcionales):
//   RESEND_API_KEY      para correo (https://resend.com)
//   AVISO_EMAIL_TO      a quién llegan los avisos de prospectos (varios separados por coma)
//   AVISO_EMAIL_FROM    remitente verificado en Resend (ej. CRUMEX <avisos@tu-dominio.com>)
//   TELEGRAM_BOT_TOKEN  token de tu bot (lo da @BotFather)
//   TELEGRAM_CHAT_ID    tu chat o grupo
// El correo también se usa para "¿Olvidaste tu contraseña?".
import { esc } from './_http.js';

export const mailReady = () => !!process.env.RESEND_API_KEY;
const FROM = () => process.env.AVISO_EMAIL_FROM || 'CRUMEX <onboarding@resend.dev>';

export async function sendEmail({ to, subject, html, text, reply_to, headers }) {
  if (!mailReady()) return false;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM(), to: Array.isArray(to) ? to : [to], subject, html, text, reply_to: reply_to || undefined, headers: headers || undefined }) });
  return r.ok;
}
export async function sendTelegram(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return false;
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: text.slice(0, 3900), parse_mode: 'HTML', disable_web_page_preview: true }) });
  return r.ok;
}

const KINDS = { contacto: 'Contacto', visita: 'Solicitud de visita', valuacion: 'Estimación de valor', captacion: 'Propietario quiere rentar o vender', credito: 'Crédito', whatsapp: 'WhatsApp', llamada: 'Llamada', otro: 'Otro' };
const PAYLOAD_LABELS = { operacion: 'Operación', tipo: 'Tipo', zona: 'Zona', m2_aprox: 'm² aprox.', fecha_preferida: 'Fecha preferida', horario: 'Horario', modalidad: 'Cómo quiere verla', caracteristicas: 'Características', tipos: 'Tipos', zonas: 'Zonas', recamaras: 'Recámaras', banos: 'Baños', precio_min: 'Precio mín.', precio_max: 'Precio máx.', moneda: 'Moneda', m2_min: 'm² mín.', texto: 'Texto', empresa: 'Empresa', busca: 'Busca', superficie_ft2: 'ft²', superficie_m2: 'm²', idioma: 'Idioma', ref_code: 'Clave',
  m2_terreno: 'Terreno (m²)', precio_esperado: 'Precio esperado', desocupada: 'Desocupada', amueblada: 'Amueblada', anunciada: 'Ya anunciada', adeudos: 'Adeudos o crédito', estimado: 'Rango de referencia',
  busqueda: 'Responde a', recomendado_por: 'Recomendado por', recomendante_tel: 'Tel. de quien recomienda', origen_captacion: 'Origen', canal: 'Llegó desde', campana: 'Campaña' };
const HIDE = ['tipo_clave', 'consentimiento'];
// teléfono con lada para mostrar: 10 dígitos sin lada = México
const fmtPh = (x) => { const t = String(x || '').trim(); const d = t.replace(/\D/g, ''); if (t.startsWith('+')) return t; if (d.length === 10) return `+52 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`; if (d.length === 12 && d.startsWith('52')) return `+52 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`; return t; };
const waUrl = (phone) => { let d = String(phone || '').replace(/\D/g, ''); if (d.length === 10) d = '52' + d; return d.length >= 11 ? `https://wa.me/${d}` : ''; };

// Aviso de prospecto nuevo. Nunca rompe el guardado: si falla, solo se registra.
export async function notifyLead(r, prop, base, advisor) {
  const to = String(process.env.AVISO_EMAIL_TO || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  // el asesor al que se le asignó también recibe el aviso
  if (advisor && advisor.email && !to.includes(String(advisor.email).toLowerCase())) to.push(String(advisor.email).toLowerCase());
  const wantsMail = mailReady() && to.length; const wantsTg = process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID;
  if (!wantsMail && !wantsTg) return [];
  const propLink = prop ? `${base}/inmueble.html?id=${Number(String(prop.ref_code).replace(/\D/g, ''))}` : '';
  const kind = KINDS[r.kind] || r.kind || 'Prospecto';
  const extra = Object.entries(r.payload || {}).filter(([k, v]) => !HIDE.includes(k) && v !== null && v !== '' && v !== false && v !== true).map(([k, v]) => [PAYLOAD_LABELS[k] || k, String(v).slice(0, 120)]);
  if (r.payload && r.payload.alerta) extra.unshift(['Alerta de búsqueda', 'sí']);
  const wa = waUrl(r.phone); const panel = `${base}/paginaadminimobi19.html#/leads`;
  const subject = `Nuevo prospecto: ${r.full_name} · ${kind}`;
  if (advisor) extra.push(['Asignado a', advisor.full_name || advisor.email]);
  if (r.channel && r.channel !== 'Directo') extra.push(['Llegó desde', r.channel + (r.origin && r.origin.campaign ? ` (${r.origin.campaign})` : '')]);
  const lines = [`Nuevo prospecto · ${kind}`, `Nombre: ${r.full_name}`, `Teléfono: ${fmtPh(r.phone)}`, r.email ? `Correo: ${r.email}` : '', prop ? `Propiedad: ${prop.ref_code} · ${prop.title}` : '', ...extra.map(([k, v]) => `${k}: ${v}`), r.message ? `\nMensaje:\n${String(r.message).slice(0, 1200)}` : '', '', wa ? `WhatsApp: ${wa}` : '', `Panel: ${panel}`].filter((x) => x !== '');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1B2533;max-width:560px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#1A529A;font-weight:bold">INMOBILIARIA CRUMEX · ${esc(kind)}</p>
    <h2 style="margin:0 0 14px;color:#0E1E33">${esc(r.full_name)}</h2>
    <table style="border-collapse:collapse;width:100%">${[['Teléfono', esc(fmtPh(r.phone))], r.email ? ['Correo', esc(r.email)] : null, prop ? ['Propiedad', `<a href="${esc(propLink)}">${esc(prop.ref_code)} · ${esc(prop.title)}</a>`] : null, ...extra.map(([k, v]) => [esc(k), esc(v)])].filter(Boolean).map(([k, v]) => `<tr><td style="padding:6px 0;color:#536074;width:150px;vertical-align:top">${k}</td><td style="padding:6px 0">${v}</td></tr>`).join('')}</table>
    ${r.message ? `<p style="margin:14px 0;padding:12px 14px;background:#F4F5F7;border-radius:8px;white-space:pre-wrap">${esc(String(r.message).slice(0, 1200))}</p>` : ''}
    <p style="margin:18px 0">${wa ? `<a href="${esc(wa)}" style="background:#128045;color:#fff;padding:11px 18px;border-radius:30px;text-decoration:none;font-weight:bold">Escribir por WhatsApp</a> &nbsp; ` : ''}<a href="${esc(panel)}" style="color:#0E1E33;font-weight:bold">Abrir el panel</a></p>
    <p style="font-size:12px;color:#536074">Recibido ${esc(new Date(r.created_at || Date.now()).toLocaleString('es-MX', { timeZone: 'America/Matamoros' }))}. Responder rápido aumenta mucho la probabilidad de cerrar.</p></div>`;
  const tasks = [];
  if (wantsMail) tasks.push(sendEmail({ to: to.slice(0, 10), subject, html, text: lines.join('\n'), reply_to: r.email }).then((ok) => (ok ? 'correo' : null)));
  if (wantsTg) tasks.push(sendTelegram(`<b>${esc(subject)}</b>\n\n${lines.slice(1).map(esc).join('\n')}`).then((ok) => (ok ? 'telegram' : null)));
  const res = await Promise.race([Promise.allSettled(tasks), new Promise((r2) => setTimeout(() => r2([]), 4500))]);
  return (res || []).map((x) => x && x.value).filter(Boolean);
}

// Respuesta automática a quien llenó el formulario (si dejó correo). Se apaga en Panel > Ajustes.
// Ojo: mientras no verifiques tu dominio en Resend, Resend solo deja mandar a tu propio correo.
export async function replyToLead(r, prop, conf, base) {
  if (!mailReady() || !r.email || (conf && conf.auto_reply === 'no')) return false;
  const first = String(r.full_name || '').trim().split(/\s+/)[0];
  const owner = r.kind === 'captacion' || r.kind === 'valuacion';
  const wa = conf && conf.whatsapp ? `https://wa.me/${String(conf.whatsapp).replace(/\D/g, '')}` : '';
  const what = owner ? 'los datos de tu propiedad' : prop ? `tu solicitud sobre ${prop.ref_code} · ${prop.title}` : 'tu mensaje';
  const next = owner ? 'Un asesor te va a llamar para platicar de tu propiedad y prepararte una propuesta.' : 'Un asesor te va a contactar muy pronto.';
  const when = r.payload && r.payload.horario ? ` Elegiste: ${r.payload.horario}.` : '';
  const link = prop ? `${base}/inmueble.html?id=${Number(String(prop.ref_code).replace(/\D/g, ''))}` : `${base}/catalogo.html`;
  const subject = owner ? 'Recibimos los datos de tu propiedad · INMOBILIARIA CRUMEX' : 'Recibimos tu solicitud · INMOBILIARIA CRUMEX';
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1B2533;max-width:560px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#1A529A;font-weight:bold">INMOBILIARIA CRUMEX</p>
    <h2 style="margin:0 0 12px;color:#0E1E33">Hola ${esc(first)}, gracias por escribirnos</h2>
    <p>Recibimos ${esc(what)}. ${esc(next)}${esc(when)}</p>
    <p style="margin:18px 0">${wa ? `<a href="${esc(wa)}" style="background:#128045;color:#fff;padding:11px 18px;border-radius:30px;text-decoration:none;font-weight:bold">Escribir por WhatsApp</a> &nbsp; ` : ''}<a href="${esc(owner ? base + '/vender.html' : link)}" style="color:#0E1E33;font-weight:bold">${owner ? 'Cómo trabajamos con propietarios' : prop ? 'Ver la propiedad' : 'Ver el catálogo'}</a></p>
    ${conf && conf.phone ? `<p style="font-size:13px;color:#536074">Teléfono: ${esc(fmtPh(conf.phone))}</p>` : ''}
    <p style="font-size:12px;color:#536074">Te escribimos porque dejaste tu correo en nuestro sitio. Si no fuiste tú, ignora este mensaje.</p></div>`;
  const text = `Hola ${first}, gracias por escribirnos.\n\nRecibimos ${what}. ${next}${when}\n${wa ? '\nWhatsApp: ' + wa : ''}${conf && conf.phone ? '\nTeléfono: ' + fmtPh(conf.phone) : ''}\n\nINMOBILIARIA CRUMEX`;
  const replyTo = (conf && conf.email) || String(process.env.AVISO_EMAIL_TO || '').split(',')[0].trim() || undefined;
  return Promise.race([sendEmail({ to: r.email, subject, html, text, reply_to: replyTo }), new Promise((ok) => setTimeout(() => ok(false), 4500))]);
}
