/* INMOBILIARIA CRUMEX · redirecciones de direcciones viejas (sin código en línea, para la política de seguridad)
   - index.html            → tienda.html (conserva ?búsqueda y #sección)
   - propiedad.html?ref=…  → inmueble.html?id=N */
(function () {
  var q = new URLSearchParams(location.search);
  if (/propiedad\.html$/.test(location.pathname)) {
    var m = /^CRX-0*(\d+)$/i.exec(q.get('ref') || '');
    location.replace(m ? 'inmueble.html?id=' + m[1] : 'inmueble.html' + location.search);
  } else {
    location.replace('tienda.html' + location.search + location.hash);
  }
})();
