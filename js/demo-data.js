/* CruMex · datos de DEMOSTRACIÓN (solo se usan en modo local, sin servidor).
 * Son ejemplos para ver cómo luce el sitio. NO son propiedades reales.
 * En producción (con MongoDB, USE_SERVER: true) estos datos no se usan. */
window.CRX_DEMO = function () {
  const now = Date.now(), day = 864e5;
  const iso = (d) => new Date(now - d * day).toISOString();
  const base = { currency: 'MXN', price_on_request: false, price_reduced: false, featured: false, demo: true, attributes: {}, photos: [] };

  const zones = [
    // Puntos aproximados de EJEMPLO; en el panel se ajustan tocando el mapa.
    { id: 1, name: 'Zona Centro', city: 'Reynosa', state: 'Tamaulipas', lat: 26.0923, lng: -98.2776, description: 'EJEMPLO DE DEMOSTRACIÓN. Zona con comercios, servicios y vialidades principales a la mano.' },
    { id: 2, name: 'Zona Norte', city: 'Reynosa', state: 'Tamaulipas', lat: 26.0780, lng: -98.3050, description: 'EJEMPLO DE DEMOSTRACIÓN. Fraccionamientos residenciales con escuelas y supermercados cerca.', highlights: 'EJEMPLO: escuelas primarias y secundarias\nSupermercados y farmacias\nParques y áreas verdes', commute: 'EJEMPLO: centro de Reynosa | 15 min\nEJEMPLO: puente internacional | 25 min' },
    { id: 3, name: 'Zona Industrial', city: 'Reynosa', state: 'Tamaulipas', lat: 26.0420, lng: -98.2460, description: 'EJEMPLO DE DEMOSTRACIÓN. Parques industriales y naves para manufactura y logística.' },
    { id: 4, name: 'Periferia poniente', city: 'Reynosa', state: 'Tamaulipas', lat: 26.0560, lng: -98.3550, description: '' }
  ];

  const properties = [
    Object.assign({}, base, { id: 'd0000000-0000-4000-8000-000000000001', operation: 'venta', type: 'casa', status: 'disponible', featured: true,
      title: 'Casa de ejemplo en fraccionamiento residencial', description: 'EJEMPLO DE DEMOSTRACIÓN. Casa de dos niveles con cochera para dos autos, cocina integral y patio trasero.',
      price: 2350000, zone_id: 2, public_location: 'Zona Norte', bedrooms: 3, bathrooms: 2.5, parking: 2, construction_m2: 165, land_m2: 160, age_years: 4, published_at: iso(3), created_at: iso(3),
      attributes: { niveles: 2, mantenimiento: 450, creditos: ['infonavit', 'bancario'], amenidades: ['privada', 'vigilancia', 'cocina_integral', 'minisplits', 'patio', 'cochera_techada', 'boiler'], cerca: 'EJEMPLO: escuela primaria a dos cuadras\nSúper a cinco minutos en auto\nParque del fraccionamiento enfrente' } }),
    Object.assign({}, base, { id: 'd0000000-0000-4000-8000-000000000002', operation: 'renta', type: 'casa', status: 'disponible',
      title: 'Casa en renta de ejemplo', description: 'EJEMPLO DE DEMOSTRACIÓN. Casa de un nivel, cerca de vialidades principales.',
      price: 12500, zone_id: 1, public_location: 'Zona Centro', bedrooms: 2, bathrooms: 1, parking: 1, construction_m2: 90, land_m2: 120, age_years: 10, published_at: iso(20), created_at: iso(20),
      attributes: { niveles: 1, amueblado: 'no', mascotas: 'si', deposito_meses: 1, plazo_min_meses: 12, requisitos: 'EJEMPLO: identificación, comprobante de ingresos y aval con propiedad en Reynosa o póliza jurídica.', amenidades: ['minisplits', 'protecciones', 'patio', 'cisterna'], cerca: 'EJEMPLO: paradas de transporte sobre la avenida\nCentro de salud a diez minutos' } }),
    Object.assign({}, base, { id: 'd0000000-0000-4000-8000-000000000003', operation: 'venta', type: 'terreno', status: 'disponible', featured: true,
      title: 'Terreno comercial de ejemplo', description: 'EJEMPLO DE DEMOSTRACIÓN. Terreno plano con frente a avenida.',
      price: 4800000, zone_id: 4, public_location: 'Periferia poniente', land_m2: 600, attributes: { frente_m: 20, fondo_m: 30, uso_suelo: 'Comercial', amenidades: ['agua', 'luz', 'drenaje', 'pavimento', 'escriturado'] }, published_at: iso(40), created_at: iso(40), price_reduced: true }),
    Object.assign({}, base, { id: 'd0000000-0000-4000-8000-000000000004', operation: 'venta', type: 'nave', status: 'disponible', featured: true,
      title: 'Nave industrial de ejemplo', description: 'EJEMPLO DE DEMOSTRACIÓN. Nave con andenes y oficinas.',
      price: 380000, currency: 'USD', zone_id: 3, public_location: 'Zona Industrial', construction_m2: 2400, land_m2: 4000,
      attributes: { altura_libre_m: 9, andenes: 3, kva: 300, parque_industrial: 'Parque de ejemplo', amenidades: ['oficinas', 'banos_nave', 'patio_maniobras', 'subestacion'], title_en: 'Sample industrial building for sale', description_en: 'DEMO LISTING. Industrial building with loading docks and offices.', video_url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' }, published_at: iso(8), created_at: iso(8) }),
    Object.assign({}, base, { id: 'd0000000-0000-4000-8000-000000000005', operation: 'renta', type: 'nave', status: 'disponible',
      title: 'Nave en renta de ejemplo', description: 'EJEMPLO DE DEMOSTRACIÓN. Renta de nave en zona industrial.',
      price: null, price_on_request: true, zone_id: 3, public_location: 'Zona Industrial', construction_m2: 1500, land_m2: 2500, attributes: { altura_libre_m: 8, andenes: 2, kva: 150, title_en: 'Sample industrial building for lease' }, published_at: iso(60), created_at: iso(60) }),
    Object.assign({}, base, { id: 'd0000000-0000-4000-8000-000000000006', operation: 'renta', type: 'departamento', status: 'apartada',
      title: 'Departamento en renta de ejemplo', description: 'EJEMPLO DE DEMOSTRACIÓN. Departamento amueblado.',
      price: 9800, zone_id: 1, public_location: 'Zona Centro', bedrooms: 2, bathrooms: 1, parking: 1, construction_m2: 70, published_at: iso(12), created_at: iso(12),
      attributes: { amueblado: 'si', mascotas: 'no', deposito_meses: 1, amenidades: ['minisplits', 'cocina_integral', 'vigilancia'] } }),
    Object.assign({}, base, { id: 'd0000000-0000-4000-8000-000000000007', operation: 'venta', type: 'casa', status: 'cerrada',
      title: 'Casa vendida de ejemplo', description: 'EJEMPLO DE DEMOSTRACIÓN. Casa de un nivel con patio.',
      price: 1950000, zone_id: 2, public_location: 'Zona Norte', bedrooms: 3, bathrooms: 2, parking: 1, construction_m2: 120, land_m2: 140, published_at: iso(90), created_at: iso(90) })
  ];
  const ymd = (d) => new Date(now - d * day).toISOString().slice(0, 10);
  const deals = [
    { id: 1, demo: true, property_id: 'd0000000-0000-4000-8000-000000000007', operation: 'venta', status: 'cerrada', agreed_price: 1900000, currency: 'MXN', commission_amount: 95000, signed_on: ymd(15), notes: 'EJEMPLO DE DEMOSTRACIÓN', created_at: iso(30) },
    { id: 2, demo: true, property_id: 'd0000000-0000-4000-8000-000000000006', operation: 'renta', status: 'en_proceso', agreed_price: 9800, currency: 'MXN', commission_amount: 9800, notes: 'EJEMPLO DE DEMOSTRACIÓN', created_at: iso(5) }
  ];

  const articles = [
    { id: 'a0000000-0000-4000-8000-000000000001', slug: 'que-revisar-antes-de-comprar', published: true, published_at: iso(10),
      title: 'Qué revisar antes de comprar una propiedad', summary: 'Una lista corta para no pasar por alto lo importante.',
      body: 'Antes de apartar una propiedad conviene revisar:\n\n1. Que el vendedor sea el propietario y que la escritura esté a su nombre.\n2. Que no tenga adeudos de predial, agua o servicios.\n3. Que no existan gravámenes ni embargos (se consulta en el Registro Público de la Propiedad).\n4. Que la superficie real coincida con la escritura.\n5. Que el uso de suelo permita lo que piensas hacer con ella.\n\nUn notario público es quien formaliza la operación; consulta con uno antes de firmar.' },
    { id: 'a0000000-0000-4000-8000-000000000002', slug: 'documentos-para-vender', published: true, published_at: iso(20),
      title: 'Documentos que necesitas para vender tu propiedad', summary: 'Ten esto listo y la venta avanza más rápido.',
      body: 'En general se pide:\n\n- Escritura y, si aplica, el estado de la inscripción en el Registro Público.\n- Identificación oficial del propietario.\n- Recibos de predial y agua al corriente.\n- Planos o medidas, si los tienes.\n- Si hay crédito vigente, la carta de saldo de la institución.\n\nLos requisitos exactos los confirma el notario que formalice la operación.' },
    { id: 'a0000000-0000-4000-8000-000000000003', slug: 'rentar-una-nave-industrial', published: true, published_at: iso(30),
      title: 'Rentar una nave industrial: puntos clave', summary: 'Lo básico que una empresa debe validar antes de firmar.',
      body: 'Antes de rentar una nave valida:\n\n- Altura libre, andenes y capacidad eléctrica (kVA) según tu operación.\n- Uso de suelo y permisos que requiere tu actividad.\n- Condiciones del contrato: plazo, incrementos, depósito y mantenimiento.\n- Accesos y distancia a vías principales.\n\nCada operación tiene detalles propios; pide que el contrato lo revise tu asesor legal.' }
  ];

  // "Lo que buscan nuestros clientes" (EJEMPLO): se muestra a los propietarios en vender.html
  const wanted = [
    { id: 'w0000000-0000-4000-8000-000000000001', operation: 'renta', type: 'casa', zone: 'Zona Norte', bedrooms_min: 3, max_price: 14000, currency: 'MXN', note: 'EJEMPLO DE DEMOSTRACIÓN. Familia con mascota, contrato de un año.', active: true, created_at: iso(2) },
    { id: 'w0000000-0000-4000-8000-000000000002', operation: 'renta', type: 'nave', zone: 'Zona Industrial', m2_min: 1500, max_price: 9000, currency: 'USD', note: 'EJEMPLO DE DEMOSTRACIÓN. Empresa de manufactura, con andenes.', active: true, created_at: iso(4) },
    { id: 'w0000000-0000-4000-8000-000000000003', operation: 'venta', type: 'terreno', zone: '', m2_min: 300, max_price: 1500000, currency: 'MXN', note: 'EJEMPLO DE DEMOSTRACIÓN. Para construir casa habitación.', active: true, created_at: iso(6) }
  ];

  return { zones, properties, articles, wanted, testimonials: [], profiles: [], contacts: [], leads: [], visits: [], deals,
    settings: { email: '', address: '', hours: '', license: '', about: '', privacy: '', terms: '', facebook: '', instagram: '',
      gastos: 'Impuesto sobre adquisición (ejemplo, confírmalo) | 2\nNotario, registro y avalúo (ejemplo, confírmalo) | 3' } };
};
