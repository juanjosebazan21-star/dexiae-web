/* ============================================================================
   DEXIAE · Capa DEMO WEB  (se inyecta SOLO en /app de la web, nunca en la app)
   La UI real (ui/index.html) ya trae su modo demo: sin pywebview, PY.call usa
   los stubs DEMO con datos inventados. Esta capa sólo:
   - entra sin onboarding de licencia y dice la versión real;
   - apaga el aviso de «versión nueva» y cambia el mail de contacto;
   - reemplaza el ejemplo de «Buscar en los PDF» por uno inventado;
   - cambia «Abrir Excel / HTML / PDF» (que en la web no hay archivos) por el
     Excel de ejemplo (con formulario a Formspree, que manda _utm) o un aviso;
   - agrega el banner de la demo y el RECORRIDO GUIADO (6 pasos).
   Todo abierto: no hay candados (son datos inventados).
   Nada de esto toca ui/index.html: se resuelve pisando stubs y envolviendo
   funciones globales. Corre DESPUÉS del script principal y ANTES de _init().
   ============================================================================ */
(function () {
  'use strict';

  var VERSION = '2.7.5';
  var CONTACTO = 'contacto@getdexiae.com';
  var FORMSPREE = 'https://formspree.io/f/xyklkprd';
  var TRIAL = '../index.html#planes';
  var XLS = {
    extraccion: { file: 'ejemplos/DEXIAE_ejemplo_extraccion.xlsx', label: 'del lote de facturas' },
    extracto:   { file: 'ejemplos/DEXIAE_ejemplo_extracto.xlsx',   label: 'del extracto bancario con asientos' }
  };
  var ZONA_TOTAL = [372, 528, 752, 578]; // px sobre assets/demo_doc.png (scale=1), la usa el grabador de videos

  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (_) { return null; } }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } }
  function origenCampana() {                       // igual que lead.js: sessionStorage 'dx_utm'
    var q = (location.search || '').replace(/^\?/, '');
    if (q.indexOf('utm_') > -1) ss('dx_utm', q);
    return ss('dx_utm') || '(directo)';
  }
  origenCampana();

  /* ---------- estilos ---------- */
  var css = document.createElement('style');
  css.textContent =
   '#dxw-top{display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap;' +
   'background:linear-gradient(90deg,#0b1120,#132a3a);border-bottom:1px solid rgba(61,217,182,.35);' +
   'padding:8px 16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;flex-shrink:0}' +
   '#dxw-top .b{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:#cfe9df;font-weight:600}' +
   '#dxw-top .b .tag{background:#2563EB;color:#fff;font-size:11px;font-weight:800;letter-spacing:.05em;padding:3px 9px;border-radius:6px}' +
   '#dxw-top .b span.m{color:#8fa3bd;font-weight:500}' +
   '#dxw-top .acc{display:inline-flex;gap:8px;flex-wrap:wrap}' +
   '#dxw-top a.cta,#dxw-top button.cta{background:#2563EB;color:#fff;text-decoration:none;font-size:12.5px;font-weight:700;border:none;cursor:pointer;' +
   'padding:8px 14px;border-radius:8px;white-space:nowrap;transition:background .12s;font-family:inherit}' +
   '#dxw-top a.cta:hover,#dxw-top button.cta:hover{background:#1D4ED8}' +
   '#dxw-top button.cta.g{background:transparent;border:1px solid #3dd9b6;color:#3dd9b6}#dxw-top button.cta.g:hover{background:rgba(61,217,182,.12)}' +
   '@media(max-width:720px){#dxw-top{padding:7px 10px;gap:8px}#dxw-top .b{font-size:12px}#dxw-top .b span.m{display:none}}' +
   /* modales */
   '.dxw-ov{position:fixed;inset:0;background:rgba(6,10,18,.68);z-index:100000;display:none;align-items:center;justify-content:center;padding:18px;' +
   'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}' +
   '.dxw-ov.on{display:flex}' +
   '.dxw-card{width:440px;max-width:96vw;background:#141b24;border:1px solid #2a3644;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden}' +
   '.dxw-card .hd{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid #232e3b}' +
   '.dxw-card .hd i{font-size:20px;color:#3dd9b6}.dxw-card .hd .t{font-size:15px;font-weight:700;color:#eaf2ff}' +
   '.dxw-card .hd .x{margin-left:auto;cursor:pointer;color:#67748a;font-size:18px;background:none;border:none}' +
   '.dxw-card .bd{padding:18px 20px;color:#b8c6da;font-size:13.5px;line-height:1.6}' +
   '.dxw-card .bd b{color:#eaf2ff}' +
   '.dxw-card .ft{padding:14px 20px 18px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}' +
   '.dxw-btn{font-size:13px;font-weight:700;border-radius:9px;padding:10px 16px;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px;font-family:inherit}' +
   '.dxw-btn.p{background:#2563EB;color:#fff}.dxw-btn.p:hover{background:#1D4ED8}' +
   '.dxw-btn.g{background:transparent;color:#9fb0c6;border:1px solid #35424f}.dxw-btn.g:hover{border-color:#60A5FA;color:#60A5FA}' +
   '.dxw-inp{width:100%;box-sizing:border-box;height:40px;background:#0f151d;border:1px solid #2a3644;border-radius:9px;' +
   'padding:0 12px;color:#eaf2ff;font-size:13.5px;margin-top:9px;outline:none;font-family:inherit}' +
   '.dxw-inp:focus{border-color:#2563EB}.dxw-err{color:#e88;font-size:12px;margin-top:8px;min-height:14px}' +
   /* recorrido guiado */
   '#dxw-tour{position:fixed;left:18px;bottom:18px;z-index:100001;width:370px;max-width:calc(100vw - 32px);background:#141b24;' +
   'border:1px solid #2f5b7a;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.55);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;' +
   'color:#b8c6da;display:none}' +
   '#dxw-tour.on{display:block}' +
   '#dxw-tour .th{display:flex;align-items:center;gap:8px;padding:12px 14px 6px}' +
   '#dxw-tour .pn{font-size:11px;font-weight:800;letter-spacing:.06em;color:#3dd9b6;text-transform:uppercase}' +
   '#dxw-tour .x{margin-left:auto;background:none;border:none;color:#67748a;font-size:17px;cursor:pointer}' +
   '#dxw-tour .tt{padding:0 14px;font-size:15px;font-weight:700;color:#eaf2ff}' +
   '#dxw-tour .tx{padding:6px 14px 4px;font-size:13px;line-height:1.55}' +
   '#dxw-tour .tf{display:flex;gap:8px;padding:10px 14px 14px;align-items:center;flex-wrap:wrap}' +
   '#dxw-tour .tf .sp{flex:1}' +
   '#dxw-tour .pts{display:flex;gap:4px}#dxw-tour .pts i{width:6px;height:6px;border-radius:50%;background:#2a3644;display:block}#dxw-tour .pts i.on{background:#3dd9b6}' +
   '.dxw-foco{outline:2px solid #3dd9b6 !important;outline-offset:3px !important;border-radius:10px;animation:dxwPulse 1.6s ease-in-out infinite}' +
   '@keyframes dxwPulse{0%,100%{box-shadow:0 0 0 0 rgba(61,217,182,.35)}50%{box-shadow:0 0 0 8px rgba(61,217,182,0)}}' +
   '@media(max-width:720px){#dxw-tour{left:8px;right:8px;bottom:8px;width:auto}}' +
   '@media(min-width:721px){#dxw-tour.der{left:auto;right:18px}}' +
   /* La UI pausa TODAS las animaciones sin foco (anim-pausa), también la entrada
      de cada pantalla (fadeIn desde opacidad 0): en la web la pantalla quedaba
      en blanco. Acá la entrada corre siempre. */
   'html.anim-pausa .screen{animation-play-state:running !important}';
  document.head.appendChild(css);

  /* ---------- modal ---------- */
  var ov = document.createElement('div'); ov.className = 'dxw-ov'; document.body.appendChild(ov);
  function closeOv() { ov.classList.remove('on'); ov.innerHTML = ''; }
  ov.addEventListener('click', function (e) { if (e.target === ov) closeOv(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOv(); });
  window.__dxwClose = closeOv;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }

  function aviso(titulo, texto) {
    ov.innerHTML =
      '<div class="dxw-card"><div class="hd"><i class="ti ti-info-circle"></i><div class="t">' + esc(titulo) + '</div>' +
      '<button class="x" onclick="__dxwClose()">&times;</button></div><div class="bd">' + texto + '</div>' +
      '<div class="ft"><button class="dxw-btn g" onclick="__dxwClose()">Seguir en la demo</button>' +
      '<a class="dxw-btn p" href="' + TRIAL + '">Probar gratis con mis archivos</a></div></div>';
    ov.classList.add('on');
  }

  /* ---------- Excel de ejemplo (Formspree + descarga) ---------- */
  function descargar(file) {
    var a = document.createElement('a');
    a.href = file; a.download = file.split('/').pop();
    document.body.appendChild(a); a.click(); a.remove();
  }
  function excelListo(kind) {
    ov.innerHTML =
      '<div class="dxw-card"><div class="hd"><i class="ti ti-file-spreadsheet"></i><div class="t">Descarga iniciada</div>' +
      '<button class="x" onclick="__dxwClose()">&times;</button></div>' +
      '<div class="bd">Es el Excel ' + esc(XLS[kind].label) + ' tal como lo genera DEXIAE ' + VERSION + ', con datos inventados.<br><br>' +
      '<b>¿Lo probás con tus propios archivos?</b> En tu computadora DEXIAE procesa todo sin subir nada a internet.</div>' +
      '<div class="ft"><button class="dxw-btn g" onclick="__dxwClose()">Seguir en la demo</button>' +
      '<a class="dxw-btn p" href="' + TRIAL + '">Descargar DEXIAE gratis</a></div></div>';
    ov.classList.add('on');
  }
  function excelGate(kind) {
    if (ss('dxwLead') === '1') { descargar(XLS[kind].file); excelListo(kind); return; }
    ov.innerHTML =
      '<div class="dxw-card"><div class="hd"><i class="ti ti-file-spreadsheet"></i>' +
      '<div class="t">Descargá el Excel de ejemplo</div><button class="x" onclick="__dxwClose()">&times;</button></div>' +
      '<div class="bd">En la web no hay archivos tuyos: podés bajar el Excel ' + esc(XLS[kind].label) +
      ' tal como lo genera DEXIAE ' + VERSION + ', con datos inventados. Dejanos tus datos y la descarga arranca al instante.' +
      '<input class="dxw-inp" id="dxw-nom" placeholder="Tu nombre" autocomplete="name">' +
      '<input class="dxw-inp" id="dxw-est" placeholder="Estudio / empresa (opcional)" autocomplete="organization">' +
      '<input class="dxw-inp" id="dxw-mail" placeholder="Tu email" type="email" autocomplete="email">' +
      '<div class="dxw-err" id="dxw-err"></div></div>' +
      '<div class="ft"><button class="dxw-btn g" onclick="__dxwClose()">Cancelar</button>' +
      '<button class="dxw-btn p" id="dxw-go">Descargar Excel</button></div></div>';
    ov.classList.add('on');
    setTimeout(function () { var n = document.getElementById('dxw-nom'); if (n) n.focus(); }, 40);
    document.getElementById('dxw-go').onclick = function () { enviarLead(kind); };
  }
  async function enviarLead(kind) {
    var nom = (val('dxw-nom') || '').trim(), mail = (val('dxw-mail') || '').trim(), est = (val('dxw-est') || '').trim();
    var err = document.getElementById('dxw-err');
    if (!nom) { err.textContent = 'Poné tu nombre.'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { err.textContent = 'Poné un email válido.'; return; }
    var btn = document.getElementById('dxw-go'); btn.textContent = 'Enviando…'; btn.disabled = true;
    try {
      var fd = new FormData();
      fd.append('nombre', nom); fd.append('email', mail); fd.append('estudio', est);
      fd.append('_origen', 'demo-app'); fd.append('_recurso', XLS[kind].file);
      fd.append('_utm', origenCampana());
      fd.append('_subject', 'Lead demo DEXIAE (Excel ' + kind + ') — ' + nom);
      await fetch(FORMSPREE, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
    } catch (_) { /* no bloquea: igual descarga */ }
    ss('dxwLead', '1');
    descargar(XLS[kind].file);
    excelListo(kind);
  }

  /* ---------- 1) stubs DEMO de la web (antes de _init) ---------- */
  function envolver(nombre, fn) {
    var o = DEMO[nombre]; if (typeof o !== 'function') return;
    DEMO[nombre] = function () { return fn(o.apply(this, arguments), arguments); };
  }
  function patchDemo() {
    if (typeof DEMO === 'undefined' || !DEMO) return false;
    DEMO.lic_estado = function () { return { ok: true, primera_vez: false, edicion: 'TRIAL', dias: 14, valida: true, modo_trial: true, vencido: false, motivo: '', expiry: '', hw_id: 'DEMO' }; };
    envolver('get_estado_inicial', function (r) { if (r) r.version = VERSION; return r; });
    DEMO.actualizacion_estado = function () { return { ok: true, actual: VERSION, ultima: VERSION, hay_nueva: false, revocada: false, motivo: '' }; };
    ['reporte_duda_previa', 'reporte_tecnico_previa'].forEach(function (n) { envolver(n, function (r) { if (r) r.mail = CONTACTO; return r; }); });
    // «Buscar en los PDF»: ejemplo inventado (contratos de alquiler).
    DEMO.herr_buscar_seleccionar = function () { return { ok: true, carpeta: '(demo)/Contratos de alquiler', archivos: 34 }; };
    DEMO.busq_indice_estado = function () { return { ok: true, paginas: 212, archivos: 34, mb: 0.71 }; };
    DEMO.herr_buscar_ejecutar = function (q) {
      q = q || 'actualización';
      return { ok: true, termino: q, archivos: 34, con_hallazgo: 2, total: 3, truncado: false, ocr_usado: 0, desde_indice: 34,
        cancelado: false, duracion: '0.1s', resultados: [
          { archivo: 'Contrato local 12.pdf', ruta: '(demo)/a.pdf', pagina: 2, antes: 'CLÁUSULA CUARTA.- PRECIO.',
            linea: 'El precio se ajustará cada seis meses según ' + q, despues: 'publicado por el organismo oficial.' },
          { archivo: 'Contrato local 12.pdf', ruta: '(demo)/a.pdf', pagina: 3, antes: 'CLÁUSULA SEXTA.-', linea: q, despues: 'se notificará por escrito con treinta días de anticipación.' },
          { archivo: 'Contrato depósito 07.pdf', ruta: '(demo)/b.pdf', pagina: 1, antes: '', linea: 'Las partes acuerdan ' + q, despues: 'en los términos de la cláusula anterior.' }] };
    };
    DEMO.historial_detalle = function () {
      var d = function (n, niv, det, sc) { return { nombre_archivo: 'FC_DEMO_00' + n + '.pdf', ruta_archivo: '(demo)/FC_DEMO_00' + n + '.pdf', estado_proceso: 'OK',
        score_asig: sc, plantilla_asig: 'FC_EJEMPLO_A.json', filas_generadas: 1, validacion_nivel: niv, validacion_detalle: det, embebidos: 0 }; };
      return { ok: true, documentos: [d(1, 'OK', '', 0.94), d(2, 'ALTA', '[ALTA] CUIT con dígito verificador inválido', 0.88),
        d(3, 'OK', '', 0.89), d(4, 'MEDIA', '[MEDIA] El total no coincide con la suma de los importes', 0.81), d(5, 'OK', '', 0.92)] };
    };
    // Laboratorio: factura anónima dibujada (la usa también el grabador de videos)
    DEMO.lab_render_pagina = function () { return { ok: true, img: 'assets/demo_doc.png', w: 800, h: 620, scale: 1 }; };
    return true;
  }
  if (!patchDemo()) { var iv = setInterval(function () { if (patchDemo()) clearInterval(iv); }, 25); setTimeout(function () { clearInterval(iv); }, 5000); }

  /* ---------- 2) cuando _init terminó ---------- */
  function ready(fn) {
    var t = setInterval(function () {
      if (typeof UI !== 'undefined' && UI.nav && typeof PY !== 'undefined' && PY.call && document.getElementById('screen-tools')) { clearInterval(t); fn(); }
    }, 60);
    setTimeout(function () { clearInterval(t); }, 8000);
  }
  ready(function () {
    injectBanner();
    wireAbrir();
    textosViejos();
    var ob = document.getElementById('onboarding'); if (ob) { try { if (typeof OB !== 'undefined' && OB) OB.forzado = false; } catch (e) {} ob.classList.remove('show'); }
    var v = document.getElementById('sb-version'); if (v) v.textContent = 'v' + VERSION;
    if (!ls('dxwTour')) setTimeout(function () { Tour.abrir(0); }, 900);
  });

  function injectBanner() {
    if (document.getElementById('dxw-top')) return;
    var app = document.querySelector('.app'); if (!app) return;
    var bar = document.createElement('div'); bar.id = 'dxw-top';
    bar.innerHTML =
      '<div class="b"><span class="tag">DEMO</span> La interfaz real de DEXIAE ' + VERSION +
      ' <span class="m">· con datos inventados</span></div>' +
      '<div class="acc"><button class="cta g" id="dxw-tour-btn"><i class="ti ti-route"></i> Recorrido guiado</button>' +
      '<a class="cta" href="' + TRIAL + '">Probar gratis con mis archivos →</a></div>';
    app.insertBefore(bar, app.firstChild);
    document.getElementById('dxw-tour-btn').onclick = function () { Tour.abrir(0); };
  }

  // Textos de la app que en la web quedan viejos (mail de soporte, «v2.0»).
  function textosViejos() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n; while ((n = w.nextNode())) {
      var s = n.nodeValue;
      if (s.indexOf('dexiaesoporte@gmail.com') > -1 || s.indexOf('DEXIAE v2.0') > -1)
        n.nodeValue = s.split('dexiaesoporte@gmail.com').join(CONTACTO).split('DEXIAE v2.0').join('DEXIAE ' + VERSION);
    }
  }

  // En la web no hay archivos: «Abrir Excel» baja el ejemplo; HTML/PDF avisan.
  function wireAbrir() {
    var pcall = PY.call.bind(PY);
    PY.call = function (m, a) {
      if (m === 'abrir_excel' || m === 'abrir_path') {
        var ruta = String(a || '');
        if (m === 'abrir_path' && ruta && !/\.xlsx?$/i.test(ruta)) {
          aviso('Se abre en tu computadora', 'En la versión instalada esto abre la carpeta o el archivo en tu equipo. En la web no hay archivos: todo lo que ves son datos inventados.');
        } else {
          excelGate(/extract|asiento|resumen|banco|revis/i.test(ruta) ? 'extracto' : 'extraccion');
        }
        return Promise.resolve({ ok: true });
      }
      if (m === 'abrir_html' || m === 'abrir_pdf') {
        aviso(m === 'abrir_html' ? 'Reporte HTML' : 'Reporte PDF',
          'El reporte de auditoría del lote se genera en tu computadora con la versión instalada. En esta demo podés bajar el <b>Excel de ejemplo</b>.');
        return Promise.resolve({ ok: true });
      }
      return pcall.apply(PY, arguments);
    };
  }

  /* ---------- 3) recorrido guiado ----------
     Cada paso lleva la pantalla, resalta lo importante y tiene «Mostrame», que
     hace lo que haría el usuario (con los datos inventados de la demo). */
  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function llamar(fn) { try { if (typeof window[fn] === 'function') return window[fn].apply(null, [].slice.call(arguments, 1)); } catch (e) {} }
  async function limpiar() {
    closeOv();
    try { if (typeof UI !== 'undefined') { UI.closeModal && UI.closeModal(); UI.closePrevuelo && UI.closePrevuelo(); } } catch (e) {}
    ['extCerrar', 'busqCerrar', 'ocrCerrar', 'divCerrar', 'labCriterioCerrar'].forEach(function (f) { llamar(f); });
    var btnStop = document.getElementById('btn-cent-stop');
    if (btnStop && btnStop.style.display !== 'none') llamar('onDetenerCentinela');
    // La revisión del extracto: se cierra sin la pregunta «Salir sin generar».
    var vista = document.getElementById('rev-vista'), pastilla = document.getElementById('rev-pastilla');
    if ((vista && !vista.hidden) || (pastilla && !pastilla.hidden)) {
      try { await PY.call('revision_cerrar'); } catch (e) {}
      llamar('revOcultar');
    }
    await espera(200);
  }
  function foco(sel) {
    document.querySelectorAll('.dxw-foco').forEach(function (e) { e.classList.remove('dxw-foco'); });
    if (!sel) return;
    var e = document.querySelector(sel); if (!e) return;
    e.classList.add('dxw-foco');
    try { e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
    // si la tarjeta tapa lo resaltado, se corre al otro costado
    var t = document.getElementById('dxw-tour');
    if (t) {
      t.classList.remove('der');
      var r = e.getBoundingClientRect(), c = t.getBoundingClientRect();
      var tapa = r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top;
      t.classList.toggle('der', tapa && r.width < innerWidth * 0.6);
    }
  }
  async function hacerLote() {
    UI.nav('run'); await espera(300);
    llamar('onIniciar'); await espera(900);
    llamar('onProcesarLote'); await espera(900);
    if (document.querySelector('button[onclick="rpCerrar(true)"]')) llamar('rpCerrar', true);
  }
  async function hacerExtracto() {
    UI.nav('tools'); await espera(300);
    llamar('extAbrir'); await espera(500);
    try { await extSeleccionar(); } catch (e) {}
    var s = document.getElementById('ext-cliente');
    if (s) { s.value = 'Estudio Demo SRL'; s.dispatchEvent(new Event('change')); llamar('extHintCliente'); }
    var c = document.getElementById('ext-revisar'); if (c) { c.checked = true; llamar('extRevisarCambio'); }
    await espera(700);
    llamar('extProcesar');
  }
  async function hacerBroker() {
    UI.nav('lab'); await espera(350);
    llamar('labCargarDoc'); await espera(300);
    llamar('labCargarPlantilla', 'Resumen broker - operaciones');
  }
  var PASOS = [
    { t: 'Un lote de facturas', x: 'Elegís una carpeta de facturas y una plantilla. Antes de empezar, el <b>Pre-vuelo</b> muestra qué archivos entran y cómo quedarían renombrados. Al terminar ves cuántas salieron bien, cuáles están <b>duplicadas</b> y cuáles hay que <b>revisar</b>.',
      ir: function () { UI.nav('run'); }, foco: '#btn-iniciar', hacer: hacerLote },
    { t: 'Extracto bancario → revisión → asientos', x: 'Cargás el resumen del banco en PDF y elegís el cliente. Antes de generar el Excel, DEXIAE te muestra lo que no pudo decidir solo (<b>Qué revisar</b>), cómo quedan los asientos (<b>Cómo va a salir</b>) y si el saldo cierra <b>día por día</b>.',
      ir: function () { UI.nav('tools'); }, foco: '#screen-tools .tc-hero', hacer: hacerExtracto },
    { t: 'Plantillas para resúmenes de muchas páginas', x: 'En el <b>Laboratorio</b> armás la plantilla. «Mostrame» carga la de un resumen de broker: lee la tabla de operaciones aunque <b>siga de una página a la otra</b>, y con <b>También aplicar</b> se usa junto con otra plantilla que lee las posiciones.',
      ir: function () { UI.nav('lab'); }, foco: '#screen-lab', hacer: async function () { await hacerBroker(); await espera(500); foco('#lab-tabla-wrap'); } },
    { t: 'Validación', x: 'Definís reglas sobre los datos (CUIT con dígito verificador, sumas, rangos, valores permitidos, condiciones SI → ENTONCES). Corren al cerrar cada lote y lo que no cumple queda marcado en el Excel.',
      ir: function () { UI.nav('val'); }, foco: '#screen-val' },
    { t: 'Centinela y bitácora', x: 'El <b>Centinela</b> vigila una carpeta y procesa cada archivo nuevo que llega. La <b>bitácora</b> deja registro de todo lo que pasó.',
      ir: function () { UI.nav('run'); }, foco: '#btn-cent', hacer: async function () { UI.nav('run'); await espera(250); llamar('onCentinela'); } },
    { t: 'Herramientas PDF', x: 'Unir, dividir, comprimir, pasar escaneados a PDF con texto y <b>buscar dentro de los PDF</b> de una carpeta. En la versión instalada todo corre en tu computadora.',
      ir: function () { UI.nav('tools'); }, foco: '#screen-tools .tool-card:not(.tc-hero):not(.tc-ghost)' }
  ];
  var Tour = {
    i: 0,
    el: null,
    armar: function () {
      if (this.el) return;
      var d = document.createElement('div'); d.id = 'dxw-tour';
      d.innerHTML = '<div class="th"><span class="pn" id="dxw-pn"></span><button class="x" id="dxw-tx" title="Salir del recorrido">&times;</button></div>' +
        '<div class="tt" id="dxw-tt"></div><div class="tx" id="dxw-txt"></div>' +
        '<div class="tf"><div class="pts" id="dxw-pts"></div><span class="sp"></span>' +
        '<button class="dxw-btn g" id="dxw-prev">Anterior</button>' +
        '<button class="dxw-btn g" id="dxw-show"><i class="ti ti-player-play"></i> Mostrame</button>' +
        '<button class="dxw-btn p" id="dxw-next">Siguiente</button></div>';
      document.body.appendChild(d); this.el = d;
      var self = this;
      document.getElementById('dxw-tx').onclick = function () { self.cerrar(); };
      document.getElementById('dxw-prev').onclick = function () { self.ir(self.i - 1); };
      document.getElementById('dxw-next').onclick = function () { if (self.i >= PASOS.length - 1) self.cerrar(); else self.ir(self.i + 1); };
      document.getElementById('dxw-show').onclick = async function () {
        var p = PASOS[self.i]; if (!p.hacer) return;
        foco(null); await limpiar(); await p.hacer();
      };
    },
    abrir: function (i) { this.armar(); this.el.classList.add('on'); this.ir(i || 0); },
    ir: async function (i) {
      if (i < 0 || i >= PASOS.length) return;
      this.i = i; var p = PASOS[i];
      document.getElementById('dxw-pn').textContent = 'Recorrido · paso ' + (i + 1) + ' de ' + PASOS.length;
      document.getElementById('dxw-tt').textContent = p.t;
      document.getElementById('dxw-txt').innerHTML = p.x;
      document.getElementById('dxw-prev').style.visibility = i ? 'visible' : 'hidden';
      document.getElementById('dxw-show').style.display = p.hacer ? '' : 'none';
      document.getElementById('dxw-next').textContent = i >= PASOS.length - 1 ? 'Terminar' : 'Siguiente';
      document.getElementById('dxw-pts').innerHTML = PASOS.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('');
      await limpiar(); p.ir(); await espera(350); foco(p.foco);
    },
    cerrar: function () { if (this.el) this.el.classList.remove('on'); foco(null); ls('dxwTour', '1'); }
  };
  window.dxwTour = Tour;

  /* ---------- Director de video (demo-only): armar una plantilla en vivo ----------
     Lo usa redes/video-sistema/grabar.py (flujo "plantilla"). No afecta la demo
     online: solo expone window.dxwLabDemo, que el grabador llama paso a paso. */
  function _labSet(id, v) { var e = document.getElementById(id); if (e) e.value = v; }
  window.dxwLabDemo = {
    reset: function () {
      function prep() {
        try {
          if (typeof labCargarPlantilla === 'function') labCargarPlantilla('');
          if (typeof labTab === 'function') labTab('visual');
          if (typeof labRenderVisual === 'function') labRenderVisual();
        } catch (e) {}
      }
      try { if (typeof labCargarDoc === 'function') labCargarDoc(); } catch (e) {}
      setTimeout(prep, 120);
      setTimeout(prep, 440);
    },
    scrollTop: function () { var s = document.getElementById('lab-vis-scroll'); if (s) s.scrollTop = 0; },
    scrollToZona: function () { var s = document.getElementById('lab-vis-scroll'); if (s) s.scrollTop = Math.max(0, ZONA_TOTAL[1] - 150); },
    drawZona: function () {
      try {
        var ovl = document.getElementById('lab-vis-overlay'); if (!ovl) return;
        var sc = (typeof LAB !== 'undefined' && LAB.visScale) || 1, z = ZONA_TOTAL;
        var x = Math.min(z[0], z[2]) * sc, y = Math.min(z[1], z[3]) * sc,
            w = Math.abs(z[2] - z[0]) * sc, h = Math.abs(z[3] - z[1]) * sc;
        var scroll = document.getElementById('lab-vis-scroll');
        if (scroll) scroll.scrollTop = Math.max(0, y - 170);
        var d = document.createElement('div'); d.className = 'lab-zona-draw';
        d.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:0;height:0';
        ovl.appendChild(d);
        var t0 = performance.now(), DUR = 680;
        (function anim(t) {
          var k = Math.min(1, (t - t0) / DUR), e = 1 - Math.pow(1 - k, 3);
          d.style.width = (w * e) + 'px'; d.style.height = (h * e) + 'px';
          if (k < 1) { requestAnimationFrame(anim); return; }
          d.remove();
          if (typeof LAB !== 'undefined') LAB._formCoords = [z[0], z[1], z[2], z[3]];
          _labSet('lab-col', 'TOTAL'); _labSet('lab-tag', 'Total');
          var st = document.getElementById('lab-strat'); if (st) st.value = 'ZONA';
          if (typeof labRenderZonas === 'function') labRenderZonas();
        })(t0);
      } catch (e) {}
    },
    fillCampo: function (col, tag, strat) {
      try {
        if (typeof LAB !== 'undefined') LAB._formCoords = null;
        _labSet('lab-col', col); _labSet('lab-tag', tag || '');
        var s = document.getElementById('lab-strat'); if (s) s.value = strat;
      } catch (e) {}
    },
    fillCol: function (col, tag) {
      try { if (typeof LAB !== 'undefined') LAB._formCoords = null; _labSet('lab-col', col); _labSet('lab-tag', tag || ''); } catch (e) {}
    },
    showEstrategias: function (pick) {
      try {
        this.hideEstrategias();
        var ESTR = ['Texto (Derecha)', 'Texto (Izquierda)', 'Texto (Cerca)', 'Entre A y B', 'ZONA', 'Número', 'Moneda ($)', 'Fecha', 'CUIT / DNI', 'Email', 'Patrón (Regex)'];
        var sel = document.getElementById('lab-strat'); if (!sel) return;
        var r = sel.getBoundingClientRect();
        var rowH = 34, padY = 8, h = ESTR.length * rowH + padY * 2;
        var box = document.createElement('div'); box.id = 'dxw-estr';
        box.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + (r.top - h - 6) + 'px;width:' + Math.max(230, r.width) +
          'px;background:#0e1622;border:1px solid #2b425c;border-radius:10px;box-shadow:0 24px 60px rgba(0,0,0,.65);z-index:2147483000;padding:' +
          padY + 'px;font-family:Inter,Segoe UI,sans-serif';
        box.innerHTML = ESTR.map(function (e) {
          var on = e === pick;
          return '<div style="height:' + rowH + 'px;display:flex;align-items:center;padding:0 12px;border-radius:6px;font-size:14.5px;font-weight:' +
            (on ? '600' : '400') + ';color:' + (on ? '#04121a' : '#9db1c9') + ';background:' + (on ? '#3dd9b6' : 'transparent') + '">' + e + '</div>';
        }).join('');
        document.body.appendChild(box);
      } catch (e) {}
    },
    pickEstrategia: function (strat) { try { var sel = document.getElementById('lab-strat'); if (sel) sel.value = strat; this.hideEstrategias(); } catch (e) {} },
    hideEstrategias: function () { var b = document.getElementById('dxw-estr'); if (b) b.remove(); }
  };
})();
