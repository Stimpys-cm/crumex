/* INMOBILIARIA CRUMEX · configuración
 *
 * USE_SERVER: false  → MODO DEMOSTRACIÓN: datos de ejemplo guardados solo en tu navegador.
 * USE_SERVER: true   → usa el servidor (/api en Vercel) con tu base de MongoDB.
 *                      Cámbialo a true cuando ya pusiste MONGODB_URI en Vercel (ver README).
 *
 * Aquí NO va ninguna contraseña ni clave: las claves de MongoDB, Cloudinary y
 * correo viven solo en las variables de entorno de Vercel.
 */
window.CRX_CONFIG = {
  USE_SERVER: false,
  API_BASE: '/api',
  SITE_NAME: 'INMOBILIARIA CRUMEX',
  CITY: 'Reynosa, Tamaulipas',
  // Respaldo mientras no captures estos datos en Panel > Ajustes:
  WHATSAPP: '528992179269',
  PHONE: '8992179269',
  // Quién atiende, mientras no marques a alguien con "Mostrar en el sitio" en Panel > Equipo:
  CONTACT_NAME: 'Lic. Sabino Cruz',
  CONTACT_ROLE: 'Asesor inmobiliario'
};
