/* INMOBILIARIA CRUMEX · teléfonos con lada por país
   - CRX.phone.format(x)  → "+52 899 217 9269", "+1 956 123 4567", "+34 612 345 678"
   - CRX.phone.digits(x)  → solo dígitos con lada (para wa.me)
   - CRX.phone.tel(x)     → "tel:+528992179269"
   - Cada <input type="tel"> (sitio y panel) se acompaña de una lista con todos los países: México,
     Estados Unidos y Canadá arriba, luego el resto en orden alfabético. El número completo, con lada,
     va en un campo oculto que conserva el "name" original, así cada formulario lo manda igual que antes.
   - Números guardados antes sin lada: 10 dígitos se toman como México (+52).
   Lista de países y ladas: libphonenumber-js; nombres en español e inglés. */
(function () {
  'use strict';
  const CRX = window.CRX = window.CRX || {};
  // [código ISO, nombre en español, nombre en inglés, lada]
  const DATA = [["AC","Isla Ascensión","Ascension Island","247"],
  ["AD","Andorra","Andorra","376"],
  ["AE","Emiratos Árabes Unidos","United Arab Emirates","971"],
  ["AF","Afganistán","Afghanistan","93"],
  ["AG","Antigua y Barbuda","Antigua & Barbuda","1"],
  ["AI","Anguila","Anguilla","1"],
  ["AL","Albania","Albania","355"],
  ["AM","Armenia","Armenia","374"],
  ["AO","Angola","Angola","244"],
  ["AR","Argentina","Argentina","54"],
  ["AS","Samoa Americana","American Samoa","1"],
  ["AT","Austria","Austria","43"],
  ["AU","Australia","Australia","61"],
  ["AW","Aruba","Aruba","297"],
  ["AX","Islas Åland","Åland Islands","358"],
  ["AZ","Azerbaiyán","Azerbaijan","994"],
  ["BA","Bosnia y Herzegovina","Bosnia & Herzegovina","387"],
  ["BB","Barbados","Barbados","1"],
  ["BD","Bangladés","Bangladesh","880"],
  ["BE","Bélgica","Belgium","32"],
  ["BF","Burkina Faso","Burkina Faso","226"],
  ["BG","Bulgaria","Bulgaria","359"],
  ["BH","Baréin","Bahrain","973"],
  ["BI","Burundi","Burundi","257"],
  ["BJ","Benín","Benin","229"],
  ["BL","San Bartolomé","St. Barthélemy","590"],
  ["BM","Bermudas","Bermuda","1"],
  ["BN","Brunéi","Brunei","673"],
  ["BO","Bolivia","Bolivia","591"],
  ["BQ","Caribe neerlandés","Caribbean Netherlands","599"],
  ["BR","Brasil","Brazil","55"],
  ["BS","Bahamas","Bahamas","1"],
  ["BT","Bután","Bhutan","975"],
  ["BW","Botsuana","Botswana","267"],
  ["BY","Bielorrusia","Belarus","375"],
  ["BZ","Belice","Belize","501"],
  ["CA","Canadá","Canada","1"],
  ["CC","Islas Cocos","Cocos (Keeling) Islands","61"],
  ["CD","República Democrática del Congo","Congo - Kinshasa","243"],
  ["CF","República Centroafricana","Central African Republic","236"],
  ["CG","República del Congo","Congo - Brazzaville","242"],
  ["CH","Suiza","Switzerland","41"],
  ["CI","Côte d’Ivoire","Côte d’Ivoire","225"],
  ["CK","Islas Cook","Cook Islands","682"],
  ["CL","Chile","Chile","56"],
  ["CM","Camerún","Cameroon","237"],
  ["CN","China","China","86"],
  ["CO","Colombia","Colombia","57"],
  ["CR","Costa Rica","Costa Rica","506"],
  ["CU","Cuba","Cuba","53"],
  ["CV","Cabo Verde","Cape Verde","238"],
  ["CW","Curazao","Curaçao","599"],
  ["CX","Isla de Navidad","Christmas Island","61"],
  ["CY","Chipre","Cyprus","357"],
  ["CZ","Chequia","Czechia","420"],
  ["DE","Alemania","Germany","49"],
  ["DJ","Yibuti","Djibouti","253"],
  ["DK","Dinamarca","Denmark","45"],
  ["DM","Dominica","Dominica","1"],
  ["DO","República Dominicana","Dominican Republic","1"],
  ["DZ","Argelia","Algeria","213"],
  ["EC","Ecuador","Ecuador","593"],
  ["EE","Estonia","Estonia","372"],
  ["EG","Egipto","Egypt","20"],
  ["EH","Sáhara Occidental","Western Sahara","212"],
  ["ER","Eritrea","Eritrea","291"],
  ["ES","España","Spain","34"],
  ["ET","Etiopía","Ethiopia","251"],
  ["FI","Finlandia","Finland","358"],
  ["FJ","Fiyi","Fiji","679"],
  ["FK","Islas Malvinas","Falkland Islands","500"],
  ["FM","Micronesia","Micronesia","691"],
  ["FO","Islas Feroe","Faroe Islands","298"],
  ["FR","Francia","France","33"],
  ["GA","Gabón","Gabon","241"],
  ["GB","Reino Unido","United Kingdom","44"],
  ["GD","Granada","Grenada","1"],
  ["GE","Georgia","Georgia","995"],
  ["GF","Guayana Francesa","French Guiana","594"],
  ["GG","Guernsey","Guernsey","44"],
  ["GH","Ghana","Ghana","233"],
  ["GI","Gibraltar","Gibraltar","350"],
  ["GL","Groenlandia","Greenland","299"],
  ["GM","Gambia","Gambia","220"],
  ["GN","Guinea","Guinea","224"],
  ["GP","Guadalupe","Guadeloupe","590"],
  ["GQ","Guinea Ecuatorial","Equatorial Guinea","240"],
  ["GR","Grecia","Greece","30"],
  ["GT","Guatemala","Guatemala","502"],
  ["GU","Guam","Guam","1"],
  ["GW","Guinea-Bisáu","Guinea-Bissau","245"],
  ["GY","Guyana","Guyana","592"],
  ["HK","RAE de Hong Kong (China)","Hong Kong SAR China","852"],
  ["HN","Honduras","Honduras","504"],
  ["HR","Croacia","Croatia","385"],
  ["HT","Haití","Haiti","509"],
  ["HU","Hungría","Hungary","36"],
  ["ID","Indonesia","Indonesia","62"],
  ["IE","Irlanda","Ireland","353"],
  ["IL","Israel","Israel","972"],
  ["IM","Isla de Man","Isle of Man","44"],
  ["IN","India","India","91"],
  ["IO","Territorio Británico del Océano Índico","British Indian Ocean Territory","246"],
  ["IQ","Irak","Iraq","964"],
  ["IR","Irán","Iran","98"],
  ["IS","Islandia","Iceland","354"],
  ["IT","Italia","Italy","39"],
  ["JE","Jersey","Jersey","44"],
  ["JM","Jamaica","Jamaica","1"],
  ["JO","Jordania","Jordan","962"],
  ["JP","Japón","Japan","81"],
  ["KE","Kenia","Kenya","254"],
  ["KG","Kirguistán","Kyrgyzstan","996"],
  ["KH","Camboya","Cambodia","855"],
  ["KI","Kiribati","Kiribati","686"],
  ["KM","Comoras","Comoros","269"],
  ["KN","San Cristóbal y Nieves","St. Kitts & Nevis","1"],
  ["KP","Corea del Norte","North Korea","850"],
  ["KR","Corea del Sur","South Korea","82"],
  ["KW","Kuwait","Kuwait","965"],
  ["KY","Islas Caimán","Cayman Islands","1"],
  ["KZ","Kazajistán","Kazakhstan","7"],
  ["LA","Laos","Laos","856"],
  ["LB","Líbano","Lebanon","961"],
  ["LC","Santa Lucía","St. Lucia","1"],
  ["LI","Liechtenstein","Liechtenstein","423"],
  ["LK","Sri Lanka","Sri Lanka","94"],
  ["LR","Liberia","Liberia","231"],
  ["LS","Lesoto","Lesotho","266"],
  ["LT","Lituania","Lithuania","370"],
  ["LU","Luxemburgo","Luxembourg","352"],
  ["LV","Letonia","Latvia","371"],
  ["LY","Libia","Libya","218"],
  ["MA","Marruecos","Morocco","212"],
  ["MC","Mónaco","Monaco","377"],
  ["MD","Moldavia","Moldova","373"],
  ["ME","Montenegro","Montenegro","382"],
  ["MF","San Martín","St. Martin","590"],
  ["MG","Madagascar","Madagascar","261"],
  ["MH","Islas Marshall","Marshall Islands","692"],
  ["MK","Macedonia del Norte","North Macedonia","389"],
  ["ML","Mali","Mali","223"],
  ["MM","Myanmar (Birmania)","Myanmar (Burma)","95"],
  ["MN","Mongolia","Mongolia","976"],
  ["MO","RAE de Macao (China)","Macao SAR China","853"],
  ["MP","Islas Marianas del Norte","Northern Mariana Islands","1"],
  ["MQ","Martinica","Martinique","596"],
  ["MR","Mauritania","Mauritania","222"],
  ["MS","Montserrat","Montserrat","1"],
  ["MT","Malta","Malta","356"],
  ["MU","Mauricio","Mauritius","230"],
  ["MV","Maldivas","Maldives","960"],
  ["MW","Malaui","Malawi","265"],
  ["MX","México","Mexico","52"],
  ["MY","Malasia","Malaysia","60"],
  ["MZ","Mozambique","Mozambique","258"],
  ["NA","Namibia","Namibia","264"],
  ["NC","Nueva Caledonia","New Caledonia","687"],
  ["NE","Níger","Niger","227"],
  ["NF","Isla Norfolk","Norfolk Island","672"],
  ["NG","Nigeria","Nigeria","234"],
  ["NI","Nicaragua","Nicaragua","505"],
  ["NL","Países Bajos","Netherlands","31"],
  ["NO","Noruega","Norway","47"],
  ["NP","Nepal","Nepal","977"],
  ["NR","Nauru","Nauru","674"],
  ["NU","Niue","Niue","683"],
  ["NZ","Nueva Zelanda","New Zealand","64"],
  ["OM","Omán","Oman","968"],
  ["PA","Panamá","Panama","507"],
  ["PE","Perú","Peru","51"],
  ["PF","Polinesia Francesa","French Polynesia","689"],
  ["PG","Papúa Nueva Guinea","Papua New Guinea","675"],
  ["PH","Filipinas","Philippines","63"],
  ["PK","Pakistán","Pakistan","92"],
  ["PL","Polonia","Poland","48"],
  ["PM","San Pedro y Miquelón","St. Pierre & Miquelon","508"],
  ["PR","Puerto Rico","Puerto Rico","1"],
  ["PS","Territorios Palestinos","Palestinian Territories","970"],
  ["PT","Portugal","Portugal","351"],
  ["PW","Palaos","Palau","680"],
  ["PY","Paraguay","Paraguay","595"],
  ["QA","Catar","Qatar","974"],
  ["RE","Reunión","Réunion","262"],
  ["RO","Rumania","Romania","40"],
  ["RS","Serbia","Serbia","381"],
  ["RU","Rusia","Russia","7"],
  ["RW","Ruanda","Rwanda","250"],
  ["SA","Arabia Saudita","Saudi Arabia","966"],
  ["SB","Islas Salomón","Solomon Islands","677"],
  ["SC","Seychelles","Seychelles","248"],
  ["SD","Sudán","Sudan","249"],
  ["SE","Suecia","Sweden","46"],
  ["SG","Singapur","Singapore","65"],
  ["SH","Santa Elena","St. Helena","290"],
  ["SI","Eslovenia","Slovenia","386"],
  ["SJ","Svalbard y Jan Mayen","Svalbard & Jan Mayen","47"],
  ["SK","Eslovaquia","Slovakia","421"],
  ["SL","Sierra Leona","Sierra Leone","232"],
  ["SM","San Marino","San Marino","378"],
  ["SN","Senegal","Senegal","221"],
  ["SO","Somalia","Somalia","252"],
  ["SR","Surinam","Suriname","597"],
  ["SS","Sudán del Sur","South Sudan","211"],
  ["ST","Santo Tomé y Príncipe","São Tomé & Príncipe","239"],
  ["SV","El Salvador","El Salvador","503"],
  ["SX","Sint Maarten","Sint Maarten","1"],
  ["SY","Siria","Syria","963"],
  ["SZ","Eswatini","Eswatini","268"],
  ["TA","Tristán de Acuña","Tristan da Cunha","290"],
  ["TC","Islas Turcas y Caicos","Turks & Caicos Islands","1"],
  ["TD","Chad","Chad","235"],
  ["TG","Togo","Togo","228"],
  ["TH","Tailandia","Thailand","66"],
  ["TJ","Tayikistán","Tajikistan","992"],
  ["TK","Tokelau","Tokelau","690"],
  ["TL","Timor Oriental","Timor-Leste","670"],
  ["TM","Turkmenistán","Turkmenistan","993"],
  ["TN","Túnez","Tunisia","216"],
  ["TO","Tonga","Tonga","676"],
  ["TR","Turquía","Türkiye","90"],
  ["TT","Trinidad y Tobago","Trinidad & Tobago","1"],
  ["TV","Tuvalu","Tuvalu","688"],
  ["TW","Taiwán","Taiwan","886"],
  ["TZ","Tanzania","Tanzania","255"],
  ["UA","Ucrania","Ukraine","380"],
  ["UG","Uganda","Uganda","256"],
  ["US","Estados Unidos","United States","1"],
  ["UY","Uruguay","Uruguay","598"],
  ["UZ","Uzbekistán","Uzbekistan","998"],
  ["VA","Ciudad del Vaticano","Vatican City","39"],
  ["VC","San Vicente y las Granadinas","St. Vincent & Grenadines","1"],
  ["VE","Venezuela","Venezuela","58"],
  ["VG","Islas Vírgenes Británicas","British Virgin Islands","1"],
  ["VI","Islas Vírgenes de EE. UU.","U.S. Virgin Islands","1"],
  ["VN","Vietnam","Vietnam","84"],
  ["VU","Vanuatu","Vanuatu","678"],
  ["WF","Wallis y Futuna","Wallis & Futuna","681"],
  ["WS","Samoa","Samoa","685"],
  ["XK","Kosovo","Kosovo","383"],
  ["YE","Yemen","Yemen","967"],
  ["YT","Mayotte","Mayotte","262"],
  ["ZA","Sudáfrica","South Africa","27"],
  ["ZM","Zambia","Zambia","260"],
  ["ZW","Zimbabue","Zimbabwe","263"]];
  const TOP = ['MX', 'US', 'CA'];
  // cuando varios países comparten lada, cuál se elige al leer un número guardado
  const MAIN = { 1: 'US', 7: 'RU', 39: 'IT', 44: 'GB', 47: 'NO', 61: 'AU', 212: 'MA', 262: 'RE', 290: 'SH', 358: 'FI', 590: 'GP', 599: 'CW' };
  const BY = {}; DATA.forEach((r) => { BY[r[0]] = r; });
  const CODES = [...new Set(DATA.map((r) => r[3]))].sort((a, b) => b.length - a.length);

  function parse(x) {
    const raw = String(x || '').trim(); let d = raw.replace(/\D/g, '');
    if (!d) return null;
    if (/^(\+|00)/.test(raw)) {
      if (raw.startsWith('00')) d = d.slice(2);
      const code = CODES.find((c) => d.startsWith(c));
      if (code) return { code, iso: MAIN[code] || (DATA.find((r) => r[3] === code) || [])[0] || '', national: d.slice(code.length) };
    }
    // sin "+": como se guardaban antes
    if (d.length === 10) return { code: '52', iso: 'MX', national: d };
    if (d.length === 12 && d.startsWith('52')) return { code: '52', iso: 'MX', national: d.slice(2) };
    if (d.length === 13 && d.startsWith('521')) return { code: '52', iso: 'MX', national: d.slice(3) };
    if (d.length === 11 && d.startsWith('1')) return { code: '1', iso: 'US', national: d.slice(1) };
    return { code: '', iso: '', national: d };
  }
  // grupos de 3 y el último de hasta 4: 899 217 9269 · 612 345 678
  function group(n) {
    const out = []; let i = 0;
    while (n.length - i > 4) { out.push(n.slice(i, i + 3)); i += 3; }
    if (i < n.length) out.push(n.slice(i));
    return out.join(' ');
  }
  const format = (x) => { const p = parse(x); if (!p) return ''; return p.code ? `+${p.code} ${group(p.national)}` : group(p.national); };
  const digits = (x) => { const p = parse(x); return p ? p.code + p.national : ''; };
  const tel = (x) => { const p = parse(x); return !p ? '' : p.code ? `tel:+${p.code}${p.national}` : 'tel:' + p.national; };

  // ── lista de países junto a cada campo de teléfono ──
  const en = () => (document.documentElement.lang || '').toLowerCase().startsWith('en');
  let OPTS = null;
  function options() {
    if (OPTS) return OPTS;
    const i = en() ? 2 : 1; const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const opt = (r) => `<option value="${r[0]}">${esc(r[i])} (+${r[3]})</option>`;
    const rest = DATA.filter((r) => !TOP.includes(r[0])).sort((a, b) => a[i].localeCompare(b[i], en() ? 'en' : 'es'));
    OPTS = TOP.map((k) => opt(BY[k])).join('') + '<option disabled>──────────</option>' + rest.map(opt).join('');
    return OPTS;
  }
  function enhance(inp) {
    if (inp.dataset.cc || inp.closest('.tel-wrap')) return; inp.dataset.cc = '1';
    const E = en(); const def = inp.dataset.ccDefault || (E ? 'US' : 'MX');
    const hidden = document.createElement('input'); hidden.type = 'hidden';
    if (inp.name) { hidden.name = inp.name; inp.removeAttribute('name'); }
    const box = document.createElement('div'); box.className = 'tel-cc';
    box.innerHTML = `<span class="tel-cc-v" aria-hidden="true"></span><select aria-label="${E ? 'Country and calling code' : 'País y lada'}">${options()}</select>`;
    const sel = box.querySelector('select'); const shown = box.querySelector('.tel-cc-v');
    const wrap = document.createElement('div'); wrap.className = 'tel-wrap';
    inp.parentNode.insertBefore(wrap, inp); wrap.append(box, inp, hidden);
    // se ve igual que el campo de al lado
    const cs = getComputedStyle(inp);
    ['borderTopLeftRadius', 'borderBottomLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderColor', 'borderWidth', 'borderStyle', 'backgroundColor', 'minHeight', 'fontSize'].forEach((k) => { if (cs[k]) box.style[k] = cs[k]; });
    const p = parse(inp.value);
    sel.value = p && p.iso && BY[p.iso] ? p.iso : def;
    if (p && p.code) inp.value = group(p.national);
    if (!inp.placeholder || /^\+/.test(inp.placeholder)) inp.placeholder = sel.value === 'MX' ? '899 123 4567' : sel.value === 'US' || sel.value === 'CA' ? '956 123 4567' : '';
    const sync = () => {
      const r = BY[sel.value] || BY[def]; shown.textContent = `${r[0]} +${r[3]}`;
      const nd = inp.value.replace(/\D/g, '');
      hidden.value = !nd ? '' : nd.length >= 7 ? `+${r[3]} ${group(nd)}` : nd;
    };
    inp.addEventListener('input', () => {
      // si pegan el número con lada (+1 956…), se acomoda solo
      if (/^\s*(\+|00)/.test(inp.value)) { const q = parse(inp.value); if (q && q.code && q.national.length >= 7) { sel.value = q.iso || sel.value; inp.value = group(q.national); } }
      sync();
    });
    inp.addEventListener('blur', () => { const nd = inp.value.replace(/\D/g, ''); if (nd.length >= 7) inp.value = group(nd); sync(); });
    sel.addEventListener('change', () => { sync(); inp.focus(); });
    if (inp.form) inp.form.addEventListener('reset', () => setTimeout(() => { sel.value = def; sync(); }, 0));
    sync();
  }
  const scan = (root) => (root || document).querySelectorAll('input[type="tel"]:not([data-cc])').forEach(enhance);
  const start = () => { scan(); new MutationObserver((list) => { if (list.some((m) => m.addedNodes.length)) scan(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  CRX.phone = { parse, format, digits, tel, group, enhance, scan, countries: DATA };
})();
