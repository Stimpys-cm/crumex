# INMOBILIARIA CRUMEX · Sitio web y panel

Proyecto completo en HTML, CSS y JavaScript, sin framework y sin paso de compilación. Los datos viven en **MongoDB Atlas** y los maneja un pequeño servidor propio en **Vercel** (carpeta `api/`), igual que stiimpys.store. Las fotos pueden ir en **Cloudinary** (recomendado) o en la misma base de MongoDB.

El navegador **nunca** habla directo con la base: todo pasa por `/api`, que revisa la sesión, los permisos y las reglas de cada dato. En el sitio no hay ninguna clave; todas viven en las variables de entorno de Vercel.

## Direcciones

| Dirección | Qué es |
|---|---|
| `tienda.html` | Página principal |
| `catalogo.html` | Catálogo con filtros laterales. Los filtros quedan en la dirección, por ejemplo `catalogo.html?op=renta&tipo=nave&rec=2&orden=asc` |
| `inmueble.html?id=1` | Cada publicación; el número es el de su clave (`CRX-00001` es `id=1`) |
| `zona.html` | Todas las zonas con cuántas propiedades hay |
| `zona.html?z=zona-norte` | Una zona: cifras, mapa aproximado y propiedades. Acepta `&tipo=casa&op=venta` ("Casas en venta en Zona Norte") |
| `industrial.html` | Sección **en inglés** de naves y terrenos industriales (ft² y m², precio por ft²) |
| `industrial.html?id=4` | Una nave en inglés (mismo número que `inmueble.html?id=4`) |
| `ficha.html?id=1` | Ficha técnica para imprimir o guardar en PDF, con código QR. En inglés: `ficha.html?id=4&lang=en` |
| `vender.html` | **Para propietarios** que quieren rentar o vender: rango de referencia al instante, lo que buscan tus clientes, solicitud por pasos y programa de recomendación. `vender.html?quiero=renta` abre la solicitud lista para rentar (útil en anuncios) |
| `guias.html` | Todas las guías (blog) |
| `guias.html?a=que-revisar-antes-de-comprar` | Cada guía con su propia dirección, lista para Google y para compartir |
| `reporte.html?id=…` | Reporte para el propietario (solo con sesión del panel; se abre desde **Propiedades > Reporte**) |
| `reporte.html?t=…` | El mismo reporte para el dueño, con un enlace privado que creas desde el reporte (sin contraseña; lo puedes quitar cuando quieras) |
| `terminos.html` | Términos de uso y aviso de privacidad (con índice) |
| `404.html` | Página "no encontrada" (Vercel la usa sola) |
| `paginaadminimobi19.html` | Panel del equipo |
| `index.html` | Entrada del dominio; manda sola a `tienda.html` |
| `propiedad.html` | Solo para que funcionen enlaces viejos; manda a `inmueble.html` |
| `/sitemap.xml` | Mapa del sitio para Google (solo en Vercel) |

Filtros que acepta `catalogo.html` (se pueden repetir `tipo` y `zona`):

| Parámetro | Valores |
|---|---|
| `op` | `venta`, `renta` |
| `tipo` | `casa`, `departamento`, `terreno`, `nave` |
| `zona` | nombre de la zona |
| `min`, `max`, `mon` | precio mínimo y máximo; `mon=USD` para dólares |
| `rec`, `banos` | recámaras y baños mínimos |
| `m2` | superficie mínima |
| `fotos=1`, `rebaja=1`, `nuevas=1`, `cerradas=1` | con fotos, precio rebajado, últimos 14 días, incluir vendidas/rentadas |
| `q` | texto libre |
| `orden` | `asc`, `desc`, `m2`, `ppm` (menor precio por m²) |
| `pag` | página |

```
crumex/
├── tienda.html  catalogo.html  inmueble.html  zona.html  industrial.html  ficha.html  guias.html
├── vender.html  terminos.html  404.html  paginaadminimobi19.html  reporte.html  index.html  propiedad.html
├── css/   base.css · site.css · inmueble.css · admin.css · ficha.css · reporte.css
├── fonts/ Roboto Slab y Archivo (alojadas en el sitio; licencias en fonts/)
├── js/
│   ├── config.js        ← USE_SERVER: false (demostración) o true (MongoDB). Sin claves.
│   ├── util.js          utilidades
│   ├── api.js           capa de datos: servidor (/api) o modo local
│   ├── listing.js       piezas compartidas (encabezado, tarjetas, favoritas, formularios, estadísticas)
│   ├── motion.js        animaciones al hacer scroll (respeta "reducir movimiento")
│   ├── map.js           mapas por zona (Leaflet + OpenStreetMap)
│   ├── app.js           tienda, catálogo, vender y términos
│   ├── inmueble.js      página de cada inmueble
│   ├── zona.js          páginas por zona
│   ├── industrial.js    sección en inglés
│   ├── ficha.js         ficha técnica imprimible
│   ├── guias.js         guías (blog)
│   ├── reporte.js       reporte para el propietario
│   ├── propietarios.js  página para propietarios (vender.html)
│   ├── admin.js         panel
│   ├── entrar.js        redirecciones de index.html y propiedad.html
│   ├── demo-data.js     datos de ejemplo (solo modo local)
│   └── vendor/          leaflet/ · qrcode.js
├── api/                 el servidor (funciones de Vercel)
│   ├── public.js        lo público del sitio, formularios y estadísticas anónimas
│   ├── auth.js          entrar, salir, primer administrador, recuperar y cambiar contraseña
│   ├── admin.js         todo lo del panel (requiere sesión)
│   ├── file.js          fotos y documentos guardados en MongoDB
│   ├── preview.js       vista previa al compartir en WhatsApp/Facebook
│   ├── sitemap.js       /sitemap.xml
│   ├── cron.js          resumen diario por correo (lo llama Vercel cada mañana)
│   └── _db.js _http.js _auth.js _rules.js _files.js _mail.js _report.js _digest.js   (piezas internas)
├── middleware.js        reconoce a los robots de WhatsApp/Facebook y les da la vista previa
├── vercel.json          redirección de la raíz, sitemap y cabeceras de seguridad
├── package.json         mongodb · bcryptjs · @vercel/edge (Vercel los instala solo)
├── .env.example         lista de variables de entorno (sin valores)
├── site.webmanifest · panel.webmanifest   para agregar el sitio o el panel a la pantalla de inicio
├── img/   favicon.svg · og.png (imagen al compartir) · icon-180/192/512.png (íconos de la app)
└── robots.txt
```

> **Sobre la dirección del panel:** un nombre difícil de adivinar ayuda a que no lo encuentren por casualidad. No lo publiques en ningún enlace del sitio ni en `robots.txt` (no aparece en ninguno). Aun así, lo que de verdad protege el panel es el inicio de sesión y las reglas del servidor: aunque alguien llegue a la página, sin una cuenta activa no puede ver ni cambiar nada.

## Probarlo ya (modo demostración)

Sin configurar nada, el proyecto corre en **modo demostración**: datos de ejemplo guardados solo en tu navegador (incluye estadísticas, zonas en el mapa y una operación cerrada de ejemplo).

```bash
cd crumex
npx serve .            # o: python3 -m http.server 8080
```

- Sitio: http://localhost:3000/tienda.html (o :8080)
- Panel: http://localhost:3000/paginaadminimobi19.html, con el correo `demo@crumex.local` y la contraseña `demo1234`

Ábrelo con un servidor y no con doble clic en el archivo, porque el navegador limita algunas funciones en `file://`.

## Conectarlo a MongoDB y publicarlo en Vercel

### 1. Crea la base en MongoDB Atlas (gratis)

1. Entra a https://www.mongodb.com/cloud/atlas y crea una cuenta.
2. Crea un clúster **gratuito (M0)**. Proveedor **AWS**, región **N. Virginia (us-east-1)**: es la más cercana a donde Vercel corre las funciones por defecto, y así el sitio responde más rápido.
3. **Database Access > Add New Database User**: crea un usuario con contraseña. Usa solo letras y números en la contraseña (los símbolos hay que codificarlos en la dirección de conexión). Permiso: *Read and write to any database*.
4. **Network Access > Add IP Address > Allow access from anywhere** (`0.0.0.0/0`). Vercel no tiene una IP fija, así que es necesario; la base queda protegida por el usuario y la contraseña.
5. **Database > Connect > Drivers**: copia la dirección, que se ve así:
   `mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
   Cambia `<db_password>` por la contraseña del paso 3.

No tienes que crear tablas ni colecciones: el servidor las crea solas, con sus índices, la primera vez.

### 2. Publícalo en Vercel

1. Sube la carpeta `crumex/` a un repositorio de GitHub (o usa `npx vercel` dentro de la carpeta).
2. En Vercel: **Add New > Project**, elige el repositorio. *Framework Preset*: **Other**. No necesita comando de compilación ni carpeta de salida.
3. En **Settings > Environment Variables** agrega:

   | Variable | Obligatoria | Valor |
   |---|---|---|
   | `MONGODB_URI` | sí | la dirección de Atlas del paso 1.5 |
   | `SETUP_TOKEN` | sí, al inicio | una frase larga al azar (por ejemplo 30 letras y números). Solo sirve para crear el primer administrador |
   | `MONGODB_DB` | no | nombre de la base; si no la pones se llama `crumex` |
   | `SITE_URL` | no | tu dominio con `https://`, por ejemplo `https://crumex.mx`. Se usa en los enlaces de los correos |

4. En `js/config.js` cambia `USE_SERVER: false` por **`USE_SERVER: true`** y vuelve a publicar.
5. Conecta tu dominio en **Settings > Domains**. El certificado HTTPS es automático.
6. En `robots.txt`, quita el `#` de la línea `Sitemap:` y pon tu dominio. Luego da de alta `https://TU-DOMINIO/sitemap.xml` en Google Search Console.

### 3. Crea tu cuenta de administrador

1. Abre `https://TU-DOMINIO/paginaadminimobi19.html`. Como la base está vacía, sale **"Crea la cuenta del administrador"**.
2. Escribe tu nombre, correo, contraseña y el **código de instalación** (el valor de `SETUP_TOKEN`).
3. Entras directo al panel. Se crean también 3 guías de ejemplo para el blog (puedes editarlas o borrarlas).
4. En **Panel > Zonas**, crea tus zonas o colonias y toca el mapa para marcar su centro aproximado. Con eso se activan el mapa de cada propiedad y las páginas por zona.

Ese formulario ya no vuelve a aparecer: en cuanto existe un usuario, el servidor lo rechaza aunque alguien tenga el código. Si quieres, después borra `SETUP_TOKEN` de Vercel.

Si algo falta, el panel lo dice en la pantalla de entrada (por ejemplo "Falta configurar MONGODB_URI en Vercel").

### 4. Da de alta a tu equipo

En **Panel > Equipo > + Nuevo**: nombre, correo, rol y una **contraseña temporal**. Pásale sus datos a la persona y que la cambie en **Panel > Mi cuenta** (ahí se pide la contraseña actual).

- **Asesor:** crea y edita propiedades, prospectos, visitas, contactos y operaciones, y saca reportes para propietarios. No puede borrar (salvo visitas), ni cambiar ajustes, ni dar de alta usuarios, ni ver la bitácora.
- **Administrador:** todo.
- Si desactivas una cuenta o le pones contraseña nueva, esa persona sale del panel en ese momento.
- Siempre debe quedar al menos un administrador activo.
- Para que alguien aparezca en "Nosotros" del sitio, marca "Mostrar en la sección Nosotros".

### 5. Fotos y documentos: Cloudinary (recomendado)

**Sin Cloudinary** todo funciona: las fotos se guardan en MongoDB (hasta 2 MB cada una; el panel las comprime solo, normalmente quedan de 200 a 500 KB) y los documentos privados hasta 3 MB. El plan gratuito de Atlas tiene 512 MB, suficiente para empezar (unas mil fotos).

**Con Cloudinary** (igual que en stiimpys) las fotos cargan desde su red rápida, los documentos pueden pesar hasta 10 MB y la base de MongoDB queda ligera:

1. Crea una cuenta gratuita en https://cloudinary.com.
2. En **Settings > API Keys** copia *Cloud name*, *API Key* y *API Secret*.
3. Agrégalos en Vercel como `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` y vuelve a publicar (*Redeploy*).

Las fotos se suben directo del panel a Cloudinary con una firma que da el servidor (el *API Secret* nunca llega al navegador). Los documentos se guardan como **privados**: solo se descargan desde el panel, con un enlace que vence en 2 minutos. Si al descargar un PDF Cloudinary responde con un error, en **Settings > Security** activa *Allow delivery of PDF and ZIP files*.

Puedes empezar sin Cloudinary y agregarlo después: las fotos que ya subiste siguen funcionando y las nuevas se van a Cloudinary.

### Probar el servidor en tu computadora (opcional)

```bash
cd crumex
npm install
cp .env.example .env.local     # y llena MONGODB_URI y SETUP_TOKEN
npx vercel dev
```

Usa una base de pruebas distinta (`MONGODB_DB=crumex-pruebas`) para no mezclar datos.

## Avisos al instante de prospectos

**Con el panel abierto** (ya funciona): cada 45 segundos revisa si llegó un prospecto nuevo o si vence un seguimiento. Muestra un aviso, suena y marca el número en la pestaña. En **Panel > Mi cuenta** activa los "avisos del navegador" para recibirlos aunque estés en otra pestaña.

**Aunque el panel esté cerrado**, por correo y/o Telegram. El servidor los manda en cuanto llega el formulario; no hay que configurar nada más que las variables:

- **Correo con Resend** (https://resend.com, tiene plan gratuito): crea una *API key*. Agrega `RESEND_API_KEY`, `AVISO_EMAIL_TO` (tu correo; varios separados por coma) y, cuando verifiques tu dominio en Resend, `AVISO_EMAIL_FROM` (por ejemplo `CRUMEX <avisos@tu-dominio.com>`). Sin dominio verificado, Resend solo deja mandarte correos a la dirección con la que te registraste.
- **Telegram**: habla con **@BotFather**, escribe `/newbot` y copia el *token*. Mándale cualquier mensaje a tu bot. Luego abre `https://api.telegram.org/bot<TOKEN>/getUpdates` y copia el número de `"chat":{"id": …}`. Agrega `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`. Para todo el equipo, agrega el bot a un grupo y usa el id del grupo (empieza con `-`).

Vuelve a publicar (*Redeploy*) para que tome las variables. El aviso trae nombre, teléfono, propiedad, mensaje, botón de WhatsApp y enlace al panel.

### Reparto de prospectos

En **Panel > Ajustes > Prospectos** eliges qué pasa con cada solicitud que llega del sitio:

- **Al asesor de la propiedad** (opción inicial): si la propiedad tiene asesor asignado y su cuenta está activa, el prospecto queda a su nombre.
- **Por turnos:** igual, y si la propiedad no tiene asesor (o el mensaje no es de una propiedad), se reparte por turnos entre los asesores activos.
- **No asignar:** los repartes tú desde el panel.

Con el correo configurado, el asesor asignado también recibe el aviso. En **Prospectos** cada quien puede filtrar "Míos" o "Sin asignar".

`RESEND_API_KEY` también activa **"¿Olvidaste tu contraseña?"** (manda un enlace que vence en 1 hora). Sin correo configurado, un administrador puede poner una contraseña nueva desde **Panel > Equipo**.

> El aviso incluye nombre y teléfono del prospecto. Ya está mencionado en el aviso de privacidad (proveedores de correo y mensajería); si cambias el texto legal, consérvalo.

## Todas las variables de entorno

| Variable | Para qué |
|---|---|
| `MONGODB_URI` | conexión a MongoDB Atlas (obligatoria) |
| `MONGODB_DB` | nombre de la base (opcional, `crumex`) |
| `SETUP_TOKEN` | crear el primer administrador |
| `SITE_URL` | tu dominio, para los enlaces de los correos (opcional) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | fotos y documentos en Cloudinary (opcional) |
| `RESEND_API_KEY`, `AVISO_EMAIL_TO`, `AVISO_EMAIL_FROM` | avisos por correo y recuperar contraseña (opcional) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | avisos por Telegram (opcional) |
| `CRON_SECRET` | una frase larga al azar; activa el resumen diario por correo (opcional, necesita el correo) |

Después de agregar o cambiar una variable, haz *Redeploy* en Vercel.

## Qué agrega Vercel

- **Vista previa al compartir:** al pegar `inmueble.html?id=3` en WhatsApp o Facebook sale la foto de portada, el título, el precio y la zona. También funciona con `industrial.html?id=3` (en inglés) y con las páginas por zona. Para probarlo: https://developers.facebook.com/tools/debug/
- **`/sitemap.xml`** con todas las propiedades disponibles y apartadas, su versión en inglés y las páginas por zona y tipo, siempre al día.
- **Cabeceras de seguridad** (`vercel.json`): solo scripts propios, imágenes solo del sitio, de Cloudinary y de los mapas, solo videos de YouTube, Vimeo y Matterport, bloqueo de incrustar el sitio en otras páginas, y el panel marcado como "no indexar".
- **Caché:** el sitio público pide todo en una sola llamada y Vercel la guarda 30 segundos, así carga rápido aunque haya muchas visitas. Lo que cambies en el panel se ve en el sitio en menos de un minuto. El navegador de cada visitante siempre pide la versión vigente.

## Seguridad del servidor

- Las contraseñas se guardan cifradas con bcrypt; nunca salen del servidor.
- La sesión es una cookie `HttpOnly` y `SameSite=Strict` que dura 7 días. El JavaScript de la página no la puede leer.
- 5 contraseñas equivocadas seguidas bloquean esa cuenta 15 minutos; además hay límite de intentos por conexión.
- Toda acción que cambia datos exige una cabecera que un formulario de otro sitio no puede mandar (protección CSRF).
- Las fotos y documentos que se suben se revisan por su contenido real (no solo por la extensión).
- Límites contra abuso en formularios (8 por conexión cada 10 minutos, con trampa para robots) y en estadísticas.
- Darse de baja de las alertas va en dos pasos (abrir el enlace solo pregunta), porque los antivirus del correo abren los enlaces solos. El botón "Cancelar suscripción" que muestran Gmail y Outlook también funciona (baja en un clic).

**Reglas que pone el servidor (no se pueden saltar desde el navegador):**
- La clave `CRX-00001` y la URL amigable se generan solas, sin huecos en la numeración.
- Si bajas el precio, aparece la etiqueta "Precio rebajado" y queda el historial.
- Cerrar una operación marca la propiedad como cerrada.
- El público solo puede *enviar* formularios, y solo aceptando el aviso de privacidad. No puede leer prospectos.
- La dirección exacta, el propietario, la comisión y los documentos nunca salen en el sitio. La vista pública no expone coordenadas de la propiedad, solo el punto de su zona.
- Las estadísticas filtran duplicados (misma persona en 30 minutos) y abusos; el público no puede leerlas.
- Un testimonio no se publica sin registrar el permiso del cliente.
- Solo un administrador borra, cambia ajustes o da de alta usuarios. Una propiedad con operaciones registradas no se puede borrar.

## Diseño: "Plano de Reynosa"

- **Idea:** la página se ve como una hoja de planos. Las zonas azul marino llevan una retícula fina de dibujo técnico y la portada abre con una cota (línea de medida) con las coordenadas de Reynosa. Las fichas y formularios son blancos, como papel.
- **Colores:** azul marino `#0E1E33` como color principal, azul rey `#1D5BA6` para botones y enlaces, azul claro `#9EC3EC` para líneas y notas sobre el marino, y papel `#F4F6F9` para las secciones claras. El verde de WhatsApp se queda porque la gente lo reconoce. Se cambian en `css/base.css` (`--navy`, `--acc`, `--acc2`…).
- **Tipografías:** Roboto Slab (serif de bloque, gruesa y fácil de leer) en títulos y logotipo; Archivo en texto, precios, datos y botones. Las dos son de Google Fonts y están alojadas en `fonts/`.
- **Movimiento:** al abrir la portada aparece la retícula, se dibuja la cota y el texto entra escalonado; al bajar, los bloques aparecen una sola vez. Si el teléfono o la computadora tienen activado "reducir movimiento", todo se ve quieto. La entrada está en `css/site.css` (sección "movimiento") y los revelados en `js/motion.js`.
- **Portada ordenada para que escriban:** portada con WhatsApp a la vista → lo que pasa cuando nos escribes (respuesta el mismo día, visitas sin costo, reporte en línea para dueños) → propiedades → zonas → dueños → cómo trabajamos → créditos → quiénes somos y testimonios → guías → preguntas → llamada final.
- **Sin datos inventados:** las secciones de reseñas, testimonios y equipo solo aparecen cuando capturas datos reales en el panel; mientras tanto no se muestran.

## Teléfonos con lada por país

- Todos los números se muestran con su lada: **+52 899 217 9269** (México) o **+1 956 123 4567** (Estados Unidos y Canadá), en la barra superior, el pie, el contacto, las fichas, el letrero, el reporte del dueño, los correos y el panel.
- Cada campo de teléfono, del sitio y del panel, trae al lado la lista de **todos los países** con su lada (México, Estados Unidos y Canadá hasta arriba). En la página en inglés empieza en Estados Unidos. Si alguien pega su número con lada (por ejemplo +34…), el país se elige solo.
- El número se guarda completo, con lada ("+1 956 123 4567"), y los botones de WhatsApp del panel abren el chat con la lada correcta.
- Los números que ya tenías guardados sin lada (10 dígitos) se toman como de México (+52).
- Todo vive en `js/phone.js` (la lista de países sale de libphonenumber-js, con nombres en español e inglés).

## Accesibilidad y velocidad

- Revisado con axe (el estándar WCAG 2.1 AA) en todas las páginas públicas y en todas las vistas del panel, en computadora y celular: sin fallas. Los textos tienen contraste suficiente, cada página tiene su título principal y todo se puede usar con teclado.
- Lighthouse en celular, con la compresión que Vercel aplica sola: velocidad de 92 a 100, accesibilidad, buenas prácticas y SEO en 100.
- El aviso amarillo de "Modo demostración" mueve un poco la página al cargar. Con MongoDB conectado ese aviso no aparece.

## Lo que pide una buena inmobiliaria (confianza, captación y seguimiento)

Basado en estudios del sector (lo que más usan los compradores: fotos, planos, recorridos, información de la colonia), en la guía de Google para negocios locales y en la normativa que aplica en Tamaulipas.

**Confianza y lo legal** (se llenan en **Panel > Ajustes**; en el sitio solo aparece lo que captures):
- **Registro estatal de agente inmobiliario:** sale en "Quién te atiende", en cada ficha, en el letrero y en el pie. Tamaulipas tiene una ley de registro y acreditación de agentes; usa tu número real.
- **Razón social, RFC, domicilio y registro del contrato ante PROFECO** (la NOM-247 pide registrar los contratos de quien vende casa habitación): en el pie y en Términos.
- **Reseñas de Google:** calificación, número de reseñas, enlace a tu perfil y enlace para dejar reseña. En el panel, los contactos y prospectos tienen el botón **Pedir reseña**, que abre WhatsApp con el mensaje y el enlace.
- **Lo que ya rentamos y vendimos** (página de propietarios): se arma solo con las propiedades cerradas y cuántos días tardaron desde que se publicaron.

**Para conseguir clientes:**
- **Alertas automáticas:** quien pide una alerta en el catálogo y deja su correo recibe cada mañana lo nuevo (o lo que bajó de precio) que coincide. Cada correo trae un enlace para darse de baja. Las ves y desactivas en **Herramientas**. Necesita el correo configurado (Resend) y `CRON_SECRET`.
- **Guía en PDF a cambio del contacto:** cada guía tiene "Llévatela en PDF"; la persona deja nombre y WhatsApp (llega como prospecto) y la guarda en PDF. Escribe en **Panel > Blog** guías como "Cómo comprar con Infonavit en Reynosa".
- **Catálogo para anuncios de Facebook e Instagram:** en **Herramientas** está la dirección (`/api/public?a=feed`) para crear en Meta un catálogo de inmuebles. Solo van las propiedades disponibles con foto y precio. Pon el código postal en Ajustes.
- **Páginas de colonia más completas:** en **Panel > Zonas**, "Qué hay en la zona" y "Tiempos aproximados" (ej. `Puente Pharr | 25 min`).
- **Letrero con código QR:** en **Propiedades**, botón **Letrero**: "SE RENTA" o "SE VENDE", tu teléfono y un QR que abre la ficha (las visitas que llegan por ahí se ven como origen "letrero"). Tamaño carta horizontal; para la calle, imprímelo en vinil o enmícalo.

**En la ficha:**
- **Planos:** en las fotos de la propiedad marca "Es plano"; se muestran aparte y nunca como portada.
- **Historial de precio:** cuando bajas el precio sale "Bajó de $X a $Y el día…".
- **Gastos de compra aproximados:** en Ajustes escribe un concepto por renglón con su porcentaje (ej. `Impuesto sobre adquisición de inmuebles | 2`). Confirma los porcentajes con tu notario; el sitio aclara que es una estimación.

**Seguimiento:**
- **Recordatorio de visita:** el día anterior le llega un correo al cliente (si dejó correo). En la agenda sigue el botón para confirmar por WhatsApp.
- **Encuesta después de la visita:** en la agenda, **Pedir opinión** manda por WhatsApp un enlace (`opinion.html`) con 3 preguntas. La calificación se ve en la agenda y en el reporte del propietario, sin el nombre de quien la dio.
- **Expediente del cliente:** en cada contacto puedes guardar identificación, comprobante de domicilio, de ingresos, constancia fiscal, acta constitutiva y poder. Son privados. La ley antilavado pide identificar al cliente en operaciones de monto alto (por ejemplo, rentas de naves arriba de cierto monto mensual); revisa los montos con tu contador.

## Qué hace

**Sitio público**
- Encabezado con buscador, favoritas con contador y menú de secciones; arriba, una **barra fija** con Reynosa, tu WhatsApp, tu horario (si lo capturas) y avisos que cambian uno a la vez (se editan en Panel > Ajustes > Sitio web). En celular, barra inferior (Inicio, Catálogo, Favoritas, WhatsApp) y buscador desplegable.
- **Pie de página** con botón de WhatsApp, teléfono, dirección y horario de la oficina (de Panel > Ajustes).
- Portada: buscador con Comprar/Rentar, accesos por tipo con su conteo real y quién te atiende, "Lo nuevo", **destacadas** (una grande con descripción y dos a su lado), **zonas** con su ilustración y conteo, "Precio rebajado", cómo trabajamos en línea de tiempo, calculadora de crédito, propietarios, guías, preguntas y contacto.
- **Catálogo profesional:** filtros laterales que se pliegan (con el número de resultados de cada opción), cajón de filtros en celular, orden, filtros activos que se quitan con un toque, paginación numerada y alerta de búsqueda.
- **Lo que suelen tener los portales (Inmuebles24, Lamudi, Vivanuncios):**
  - **Lo que tiene** cada propiedad: fraccionamiento privado, vigilancia, minisplits, cocina integral, boiler, cisterna, patio, cochera techada, protecciones, alberca y más; en terrenos, servicios (agua, luz, drenaje, pavimento, escriturado) y en naves, oficinas, patio de maniobras, subestación, rociadores o grúa. Se marcan con casillas en el panel.
  - **Créditos que acepta** (Infonavit, Fovissste, bancario) en las ventas de casas y departamentos: sale junto al precio y como etiqueta en la tarjeta.
  - **Condiciones de renta:** amueblada o no, mascotas, depósito, contrato mínimo, desde cuándo está disponible y requisitos (aval, póliza jurídica, comprobantes).
  - **Niveles** (una planta, dos plantas) y **cuota de mantenimiento** en privadas.
  - **Qué hay cerca:** escuelas, súper, parques industriales, uno por renglón.
  - **Filtros nuevos en el catálogo** ("Características"): acepta Infonavit o Fovissste, amueblada, acepta mascotas, en privada, de una planta, con minisplits, con patio, con alberca. Solo aparecen los que tiene al menos una propiedad. Se pueden compartir en el enlace (`catalogo.html?con=infonavit&con=una_planta`).
  - **Catálogo en el mapa:** botón "Ver en el mapa" con un círculo por zona y cuántas hay; al tocar una zona se filtra. Nunca se marca la dirección exacta.
  - **Visita por videollamada:** al pedir una visita se puede elegir "En persona" o "Por videollamada" (útil para quien viene de fuera a trabajar a Reynosa).
  - El comparador y la ficha imprimible también muestran estos datos.
- **Páginas por zona:** título del tipo "Casas en venta en Zona Norte" (útil para Google), cifras de la zona (disponibles, promedio por m², rentas desde), pestañas por tipo, mapa aproximado y otras zonas.
- Ficha de propiedad: galería con lupa, pantalla completa y deslizar en celular; **video** de YouTube/Vimeo que se reproduce ahí mismo (TikTok, Facebook o Instagram se abren en su app); **recorrido 360°** de Matterport; **mapa aproximado** de la zona (un círculo, nunca la dirección exacta); botón **Ficha PDF**; y al final "Más en esta zona", "Similares" y "Lo último".
- **Ficha técnica imprimible** (carta) con fotos, datos, descripción, contacto y **código QR** que lleva a la propiedad.
- **Sección en inglés para naves industriales** (`industrial.html`): medidas en ft² o m², altura libre en pies, andenes, energía, precio por ft², filtros por tamaño, altura y andenes, formulario en inglés y ficha PDF en inglés.
- **Vender mi propiedad**, **comparador**, **favoritas**, **vistas recientemente** y animaciones suaves.
- **Estadísticas anónimas:** vistas, clics a WhatsApp, favoritas, compartidas y fichas descargadas por propiedad. No guarda nombre, teléfono ni IP; respeta la señal de privacidad del navegador (GPC).
- Tipografías alojadas en el propio sitio: carga más rápido y no manda datos a Google. Títulos en **Roboto Slab**; texto, precios y datos en **Archivo**.
- **Cuando una propiedad todavía no tiene fotos** se ve como el letrero que se cuelga en la propiedad ("Se vende" o "Se renta", el tipo, los m² y tu teléfono) con la nota "Fotos próximamente". En cuanto subes fotos desde el panel, se usan las fotos. Lo que más ayuda a que el sitio se vea real son **fotos de verdad** de cada propiedad.
- **Quién te atiende:** en la portada y en cada propiedad sale la persona que atiende, con su foto, su puesto y el WhatsApp. Se toma del primer integrante marcado "Mostrar en el sitio" en **Panel > Equipo**, donde también se sube su foto (botón "Subir foto"). Mientras no marques a nadie, sale el nombre de `CONTACT_NAME` en `js/config.js` ("Lic. Sabino Cruz") con sus iniciales (SC; el título "Lic." no cuenta para las iniciales, pero sí se usa en el saludo de WhatsApp: "Hola Lic. Sabino").
- Sin animaciones al bajar por la página: las secciones se ven desde el principio.
- **Guías con página propia** (`guias.html`): índice, cada guía con su dirección, tiempo de lectura, botón para compartir, preguntas por WhatsApp, otras guías y propiedades relacionadas con el tema (por ejemplo, naves en una guía de naves). Google las encuentra en el `sitemap.xml` y WhatsApp muestra su vista previa.
- **Fotos del tamaño justo:** con Cloudinary, cada tarjeta y cada galería pide la foto al ancho que necesita y en el formato más ligero que acepte el navegador. Sin Cloudinary, al subir una foto el panel guarda también una miniatura de 640 px para tarjetas y celulares. En el celular el catálogo descarga mucho menos.
- **Favoritas con aviso de baja de precio:** el sitio recuerda el precio de cada favorita; si después baja, avisa al visitante y la marca en su lista ("Bajó $150,000 desde que la guardaste").
- **Se puede agregar a la pantalla de inicio** del celular como una app (sitio y panel por separado).

**Panel**
- Menú agrupado (General, Inventario, Clientes, Sitio web, Configuración) que se puede contraer a solo íconos.
- **Resumen** con indicadores, pendientes (incluye seguimientos de hoy y atrasados), próximas visitas, gráfica de prospectos, **lo más visto** e inventario.
- **Estadísticas:** vistas de 7 y 30 días, clics a WhatsApp, tasa de contacto, favoritas, compartidas y prospectos por propiedad, gráfica diaria de 30 días y **sugerencias**.
- **Propiedades:** columna de vistas de 30 días, calidad de la ficha, vista previa en vivo, video y recorrido, **título y descripción en inglés**, **documentos privados** (escrituras, predial, contratos, planos) y botones **Imagen** y **Ficha**.
- **Estudio para redes:** imagen para Instagram/Facebook/estados (publicación, historia o cuadrado) con texto listo para copiar.
- **Prospectos:** tablero o lista y **recordatorios de seguimiento** que avisan cuando vencen.
- **Comisiones:** reporte por año y asesor, comisiones por mes en MXN y USD (por separado), monto operado y exportar a CSV.
- **Equipo:** alta de asesores y administradores con contraseña temporal, activar o desactivar cuentas.
- **Reporte para el propietario** (botón **Reporte** en cada propiedad): vistas, clics a WhatsApp, solicitudes, visitas, favoritas, gráfica por día o semana, del interés a la visita, comparación con propiedades parecidas y precio por m² de referencia en la zona, historial de precio, recomendaciones y un espacio para tus comentarios. Periodo de 30 días, 90 días o desde que se publicó; se imprime o guarda en PDF y tiene botón para mandarlo por WhatsApp al propietario. No incluye ningún dato personal de los interesados.
- **Actividad** (solo administradores): quién creó, editó, borró, cambió un precio o un estado, o entró al panel, con filtros por persona y por tipo. Se guarda 13 meses. En cada propiedad se ve quién la modificó por última vez.
- **Blog** con vista previa en vivo y formato sencillo: `## ` subtítulo, `- ` viñetas, `1. ` pasos, `**negritas**`, `> ` nota y `[texto](https://…)` o `[texto](catalogo.html?tipo=nave)` para enlaces.
- **Zonas** con mapa para marcar el centro y descripción para su página.
- Visitas, operaciones, contactos, blog, testimonios, ajustes (incluye la cinta de mensajes) y **Mi cuenta** (contraseña y avisos del navegador).

## Conseguir propietarios (captación)

Todo está pensado para que quien tiene una casa o un terreno te lo deje para rentar o vender:

- **Página para propietarios** (`vender.html`, en el menú como "Propietarios", y un bloque en la portada):
  - **¿Cuánto podrías cobrar?** Rango de referencia al instante con las propiedades parecidas de tu catálogo (mismo tipo, operación y zona; si en la zona hay menos de 3, usa toda Reynosa; si no hay suficientes, no inventa un rango y pide los datos). Siempre aclara que no es avalúo.
  - **Lo que buscan nuestros clientes:** lo que capturas en **Panel > Lo que buscan** (por ejemplo "Casa en renta en Zona Norte, 3 recámaras, hasta $14,000"). Quien tenga algo así toca "Tengo una así" y la solicitud llega ligada a esa búsqueda.
  - **Solicitud por pasos:** tipo, zona, metros, recámaras, si está desocupada o amueblada, cuánto espera, si ya está anunciada, si tiene adeudos y en qué horario le llamas.
  - **Recomienda y gana:** cualquiera te pasa los datos de un propietario (con su permiso). El texto de la recompensa lo pones en **Ajustes > Prospectos**.
- **Panel > Captación:** tablero solo de propietarios (Nuevo → Contactado → Visita o propuesta → Firmó con nosotros), con lo que espera cobrar, la referencia que vio, quién lo recomendó y de dónde llegó. **Convertir en propiedad** crea el contacto del dueño y la propiedad en borrador con sus datos.
- **Enlace para el propietario:** desde el **Reporte** creas un enlace privado; el dueño ve, cuando quiera, cuántas personas vieron su propiedad, cuántas preguntaron y las visitas, con tus comentarios. Es un gran argumento para que te la deje a ti.

> Revisa los textos de servicios de la página para propietarios ("pedimos identificación y comprobantes al interesado", "entrega con inventario y fotos", "contrato de arrendamiento") y ajústalos a lo que de verdad ofreces. Dime y los cambio.

**Para medir tus anuncios:** agrega al enlace que publiques `?utm_source=facebook&utm_campaign=casas-noviembre` (o instagram, tiktok…). Cada solicitud guarda de dónde llegó (Facebook, Instagram, Google, WhatsApp, directo…) y **Estadísticas** muestra cuántas solicitudes, propietarios y cierres trae cada uno. El Estudio para redes ya lo agrega solo a sus enlaces.

## Herramientas para operar

- **Respuesta automática:** quien deja su correo recibe "Recibimos tu solicitud" con tu WhatsApp y teléfono. Se apaga en Ajustes. Mientras no verifiques tu dominio en Resend, Resend solo deja mandar a tu propio correo.
- **Resumen diario por correo** (cada mañana a las 7): a cada quien le llegan sus visitas del día, los seguimientos que tocan y los prospectos y propietarios sin atender; al administrador, además, las exclusivas por vencer y cuántas solicitudes y vistas hubo. Si no hay pendientes no se manda. Necesita el correo configurado y la variable `CRON_SECRET`. Cada quien lo enciende o apaga en **Mi cuenta**, donde también puede verlo o mandárselo de prueba.
- **Calendario de visitas:** vista de agenda o de mes, y en cada visita los botones **Google Calendar** y **.ics** (iPhone, Outlook) con aviso una hora antes.
- **Panel > Herramientas** (solo administradores):
  - **Estado de las conexiones:** MongoDB, Cloudinary, correo, Telegram, resumen diario, dirección del sitio y si ya puedes borrar `SETUP_TOKEN`, con botones para mandar un correo y un Telegram de prueba. Úsalo el día que publiques.
  - **Respaldo** (ver abajo).
  - **Importar propiedades desde Excel:** descarga la plantilla, llénala, guárdala como CSV y súbela. Ves una vista previa con los errores de cada fila antes de importar; se crean las zonas y los contactos de los dueños que falten.

## Respaldos

El plan gratuito de Atlas (M0) no incluye respaldos automáticos. Haz uno cada semana en **Panel > Herramientas > Descargar respaldo** (el panel te lo recuerda en el Resumen). Se descarga un archivo `.json` con propiedades, prospectos, contactos, visitas, operaciones, ajustes, equipo y estadísticas; guárdalo en un lugar seguro porque trae datos de tus clientes. Con **Restaurar desde un archivo** lo regresas: los registros del archivo reemplazan a los que tengan el mismo identificador y lo que agregaste después se queda.

Las fotos que están en Cloudinary se quedan allá. Las fotos y documentos guardados en MongoDB no van en el archivo; para esos, usa también **MongoDB Compass** (exportar la colección `files`) o `mongodump --uri "TU_MONGODB_URI"`.

## Probado

- **Servidor:** 272 pruebas de la API (incluye alertas automáticas y la baja en un clic, recordatorios (y que se repitan si cambia la fecha), encuesta, catálogo para Meta, planos, expediente, amenidades y condiciones de renta, foto del equipo, captación, enlace del propietario, origen de clientes, respuesta automática, resumen diario, conexiones y respaldo, además de instalación, sesiones, permisos de administrador y asesor, bloqueo por intentos, cambio y recuperación de contraseña, reglas de propiedades, prospectos y avisos, reparto de prospectos, estadísticas, reporte para propietarios, bitácora, guías, miniaturas, documentos privados, Cloudinary, borrados y vista previa).
- **Navegador:** 124 pruebas de punta a punta en modo servidor (incluye reseñas y registro, letrero, encuesta, guía en PDF, amenidades, filtro por características, mapa del catálogo, foto del equipo, estimador, solicitud de propietarios, convertir en propiedad, enlace del dueño, importación, respaldo, calendario y resumen, además de crear el administrador, dar de alta a una asesora, crear zona y propiedad con foto y miniatura, subir y descargar un documento, escribir y publicar una guía, sacar el reporte, ver la bitácora, mandar un formulario desde el sitio, aviso de baja de precio en favoritas, cambiar y recuperar contraseña, permisos de la asesora, pantallas sin base configurada, celular y política de seguridad), más las pruebas del modo demostración.
- Estas pruebas corrieron contra una base compatible con MongoDB en memoria; la conexión con tu Atlas real se comprueba en el paso 3 al crear tu cuenta.

## Pendiente de tu lado

- Crear la base en Atlas, poner las variables en Vercel, cambiar `USE_SERVER` a `true` y crear tu cuenta (pasos 1 a 3).
- Marcar el punto de cada zona en el panel.
- Opcional: Cloudinary para las fotos y los avisos por correo o Telegram. Con el correo, agrega `CRON_SECRET` para el resumen diario.
- En **Panel > Lo que buscan**, anota lo que te piden tus clientes y no tienes; es lo que convence a los propietarios.
- En **Ajustes > Prospectos**, escribe la recompensa por recomendar a un propietario (si la vas a dar).
- Revisa los textos de servicios de la página para propietarios.
- Capturar en **Panel > Ajustes**: correo, dirección, horario, licencia, redes, el texto de "Nosotros" y, si quieres, los mensajes de la cinta.
- **Sección en inglés:** quien escriba ahí espera respuesta en inglés. Captura el título y la descripción en inglés de cada nave.
- **Legal:** el aviso de privacidad y los términos son una plantilla general. Pide a un abogado que los revise. Si los cambias, pégalos en Ajustes.
- Revisar los requisitos de registro para asesores inmobiliarios en Tamaulipas y capturar tu número en Ajustes.
- Capturar en Ajustes razón social, RFC, tu perfil y calificación de Google, y los porcentajes de gastos de compra (confírmalos con tu notario).
- Para que las alertas y recordatorios lleguen a cualquier correo, verifica tu dominio en Resend (sin eso, Resend solo manda a tu propio correo).
- Tu logotipo: hoy el sitio usa un monograma "C". Si tienes logo, se cambia en el encabezado, en `img/favicon.svg`, `img/icon-180.png` e `img/og.png`.
- **Mapas:** usan los mapas gratuitos de OpenStreetMap, con su crédito visible. Si un día el sitio tiene mucho tráfico, conviene cambiar a un proveedor con cuenta (MapTiler o Stadia): es una línea en `js/map.js` y otra en `vercel.json`.
