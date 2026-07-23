/* ============================================================================
   DEXIAE · Capa DEMO WEB  (se inyecta SOLO en web/app/, nunca en la app real)
   - Entrada limpia: sin onboarding de licencia.
   - Banner superior con presencia (no tapa botones).
   - Solo 2 funciones vivas: Extractor (lote) y Extracto bancario. El resto,
     candado con descripción + CTA al trial.
   - Al cerrar el lote / el extracto: gate de nombre+email (Formspree) y baja un
     Excel de ejemplo real (datos ficticios).
   - Laboratorio: al entrar, renderiza una factura anónima con una ZONA marcada.
   Nada de esto toca ui/index.html; todo se resuelve overrideando stubs DEMO y
   envolviendo funciones globales, que existen porque este script corre DESPUÉS
   del script principal y ANTES de _init() (que en navegador arranca 1,5s post-load).
   ============================================================================ */
(function () {
  'use strict';

  var FORMSPREE = 'https://formspree.io/f/xyklkprd';
  var XLS = {
    extraccion: { file: 'ejemplos/DEXIAE_ejemplo_extraccion.xlsx', label: 'del lote de facturas' },
    extracto:   { file: 'ejemplos/DEXIAE_ejemplo_extracto.xlsx',   label: 'del extracto bancario' }
  };
  var TRIAL = '../index.html#planes';
  var ZONA_TOTAL = [372, 528, 752, 578]; // px sobre assets/demo_doc.png (scale=1)

  /* ---------- estilos ---------- */
  var css = document.createElement('style');
  css.textContent =
   '#dxw-top{display:flex;align-items:center;gap:14px;justify-content:center;flex-wrap:wrap;' +
   'background:linear-gradient(90deg,#0b1120,#132a3a);border-bottom:1px solid rgba(61,217,182,.35);' +
   'padding:9px 16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;flex-shrink:0}' +
   '#dxw-top .b{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:#cfe9df;font-weight:600}' +
   '#dxw-top .b .tag{background:#0056B3;color:#fff;font-size:11px;font-weight:800;letter-spacing:.05em;padding:3px 9px;border-radius:6px}' +
   '#dxw-top .b span.m{color:#8fa3bd;font-weight:500}' +
   '#dxw-top a.cta{background:#0056B3;color:#fff;text-decoration:none;font-size:12.5px;font-weight:700;' +
   'padding:8px 16px;border-radius:8px;white-space:nowrap;transition:background .12s}' +
   '#dxw-top a.cta:hover{background:#00408a}' +
   '@media(max-width:720px){#dxw-top{padding:8px 10px;gap:8px}#dxw-top .b{font-size:12px}}' +
   /* candados */
   '.dxw-lk{position:relative}' +
   '.dxw-lk.card,.dxw-lk.tool-card{opacity:.62;filter:saturate(.7)}' +
   '.dxw-lk-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;letter-spacing:.04em;' +
   'color:#c79633;background:rgba(199,150,51,.14);border:1px solid rgba(199,150,51,.4);border-radius:20px;padding:2px 8px;margin-left:6px;vertical-align:middle}' +
   '.tool-card.dxw-lk::after{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(10,15,25,.04)}' +
   '.dxw-lk-corner{position:absolute;top:10px;right:10px;font-size:15px;color:#c79633;z-index:2}' +
   /* modales demo */
   '.dxw-ov{position:fixed;inset:0;background:rgba(6,10,18,.68);z-index:100000;display:none;align-items:center;justify-content:center;padding:18px;' +
   'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}' +
   '.dxw-ov.on{display:flex}' +
   '.dxw-card{width:440px;max-width:96vw;background:#141b24;border:1px solid #2a3644;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden}' +
   '.dxw-card .hd{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid #232e3b}' +
   '.dxw-card .hd i{font-size:20px;color:#c79633}.dxw-card .hd .t{font-size:15px;font-weight:700;color:#eaf2ff}' +
   '.dxw-card .hd .x{margin-left:auto;cursor:pointer;color:#67748a;font-size:18px;background:none;border:none}' +
   '.dxw-card .bd{padding:18px 20px;color:#b8c6da;font-size:13.5px;line-height:1.6}' +
   '.dxw-card .bd b{color:#eaf2ff}' +
   '.dxw-card .ft{padding:14px 20px 18px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}' +
   '.dxw-btn{font-size:13px;font-weight:700;border-radius:9px;padding:10px 16px;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}' +
   '.dxw-btn.p{background:#0056B3;color:#fff}.dxw-btn.p:hover{background:#00408a}' +
   '.dxw-btn.g{background:transparent;color:#9fb0c6;border:1px solid #35424f}.dxw-btn.g:hover{border-color:#5b9bef;color:#5b9bef}' +
   '.dxw-inp{width:100%;box-sizing:border-box;height:40px;background:#0f151d;border:1px solid #2a3644;border-radius:9px;' +
   'padding:0 12px;color:#eaf2ff;font-size:13.5px;margin-top:9px;outline:none;font-family:inherit}' +
   '.dxw-inp:focus{border-color:#0056B3}.dxw-err{color:#e88;font-size:12px;margin-top:8px;min-height:14px}';
  document.head.appendChild(css);

  /* ---------- helpers modal ---------- */
  var ov = document.createElement('div'); ov.className = 'dxw-ov'; document.body.appendChild(ov);
  function closeOv() { ov.classList.remove('on'); ov.innerHTML = ''; }
  ov.addEventListener('click', function (e) { if (e.target === ov) closeOv(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOv(); });

  function lockModal(title, desc) {
    ov.innerHTML =
      '<div class="dxw-card"><div class="hd"><i class="ti ti-lock"></i><div class="t">' + esc(title) + '</div>' +
      '<button class="x" onclick="__dxwClose()">&times;</button></div>' +
      '<div class="bd">' + desc + '<div style="margin-top:14px;color:#8fa3bd;font-size:12.5px">' +
      'Esta función está activa en la versión que instalás gratis. En esta demo online dejamos vivo el <b>Extractor</b> y el <b>Extracto bancario</b>.</div></div>' +
      '<div class="ft"><button class="dxw-btn g" onclick="__dxwClose()">Entendido</button>' +
      '<a class="dxw-btn p" href="' + TRIAL + '">Probar gratis 14 días</a></div></div>';
    ov.classList.add('on');
  }
  window.__dxwClose = closeOv;

  /* ---------- gate de Excel (Formspree + descarga) ---------- */
  function descargar(file) {
    var a = document.createElement('a');
    a.href = file; a.download = file.split('/').pop();
    document.body.appendChild(a); a.click(); a.remove();
  }
  function excelSuccess(kind) {
    ov.innerHTML =
      '<div class="dxw-card"><div class="hd" style="border-bottom-color:#1d5b46">' +
      '<i class="ti ti-file-spreadsheet" style="color:#3dd9b6"></i><div class="t">Descarga iniciada</div>' +
      '<button class="x" onclick="__dxwClose()">&times;</button></div>' +
      '<div class="bd">Abrí el Excel ' + esc(XLS[kind].label) + ' en tu computadora y mirá la estructura: ' +
      'columnas limpias, una fila por documento, todo verificado.<br><br>' +
      '<b>¿Lo probás con tus propios archivos?</b> Se procesan 100% en tu equipo, sin que nada salga de tu PC.</div>' +
      '<div class="ft"><button class="dxw-btn g" onclick="__dxwClose()">Seguir en la demo</button>' +
      '<a class="dxw-btn p" href="' + TRIAL + '">Descargar DEXIAE gratis</a></div></div>';
    ov.classList.add('on');
  }
  function excelGate(kind) {
    if (sessionStorage.getItem('dxwLead') === '1') { descargar(XLS[kind].file); excelSuccess(kind); return; }
    ov.innerHTML =
      '<div class="dxw-card"><div class="hd"><i class="ti ti-file-spreadsheet" style="color:#3dd9b6"></i>' +
      '<div class="t">Descargá el Excel de ejemplo</div><button class="x" onclick="__dxwClose()">&times;</button></div>' +
      '<div class="bd">Es el archivo real que genera DEXIAE ' + esc(XLS[kind].label) +
      ' (con datos ficticios). Dejanos tus datos y la descarga arranca al instante.' +
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
      fd.append('_subject', 'Lead demo DEXIAE (Excel ' + kind + ') — ' + nom);
      await fetch(FORMSPREE, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
    } catch (_) { /* no-block: igual descargamos */ }
    sessionStorage.setItem('dxwLead', '1');
    descargar(XLS[kind].file);
    excelSuccess(kind);
  }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* ---------- 1) override de stubs DEMO (antes de _init) ---------- */
  function patchDemo() {
    if (typeof DEMO === 'undefined' || !DEMO) return false;
    // entrada limpia: sin onboarding
    DEMO.lic_estado = function () { return { ok: true, primera_vez: false, edicion: 'DEMO', dias: 14, valida: true, modo_trial: true, vencido: false, motivo: '', hw_id: 'DEMO' }; };
    // Laboratorio: doc anónimo + página renderizable + plantilla con ZONA sobre el TOTAL
    DEMO.lab_render_pagina = function () { return { ok: true, img: 'assets/demo_doc.png', w: 800, h: 620, scale: 1 }; };
    DEMO.lab_cargar_plantilla = function (n) {
      return { ok: true, nombre: n, datos: { campos: [
        { columna: 'CUIT', etiqueta: 'CUIT:', estrategia: 'CUIT / DNI', ancla: true },
        { columna: 'FECHA', etiqueta: 'Fecha de emisión:', estrategia: 'Fecha' },
        { columna: 'TOTAL', etiqueta: 'Total', estrategia: 'ZONA', coords: ZONA_TOTAL.slice() }
      ], auditar_firmas: false, buscar_anclas_en_todo_documento: false, ocr_todas_paginas: false } };
    };
    // Probar: devuelve el valor real por columna (coherente con los campos que
    // tenga la plantilla en ese momento — sirve al armado en vivo del video y
    // a la demo online). Antes devolvía filas fijas con columnas que no matcheaban.
    DEMO.lab_probar = function (campos) {
      var MAP = { CUIT: '30-11111111-9', FECHA: '25/06/2026', TOTAL: '$ 184.525,00', MONTO: '$ 184.525,00' };
      var cs = (campos && campos.length) ? campos : ((typeof LAB !== 'undefined' && LAB.campos) || []);
      return { ok: true, filas: cs.map(function (c) { return { columna: c.columna, etiqueta: c.etiqueta, valor: MAP[c.columna] || '' }; }) };
    };
    // Extracto: ruta SIN 'demo' para que dispare el "¿Abrir Excel?"
    DEMO.herr_extracto_procesar = function () {
      return { ok: true, ruta: 'Extracto_ejemplo.xlsx', movimientos: 12, archivos: 1, hojas: 2,
        bancos: ['Banco de Ejemplo'], no_soportados: [], verificacion: { evaluados: 11, ok: 11, desfases: [] } };
    };
    return true;
  }
  if (!patchDemo()) { var iv = setInterval(function () { if (patchDemo()) clearInterval(iv); }, 25); setTimeout(function () { clearInterval(iv); }, 5000); }

  /* ---------- 2) esperar a que _init termine para envolver funciones/UI ---------- */
  function ready(fn) {
    var t = setInterval(function () {
      if (typeof UI !== 'undefined' && UI.nav && typeof PY !== 'undefined' && PY.call && document.getElementById('screen-tools')) { clearInterval(t); fn(); }
    }, 60);
    setTimeout(function () { clearInterval(t); }, 8000);
  }

  ready(function () {
    injectBanner();
    lockThings();
    wireExcelGate();
    labAuto();
    // por si _init alcanzó a abrir el onboarding antes del patch: cerrarlo
    var ob = document.getElementById('onboarding'); if (ob) { try { if (typeof OB !== 'undefined' && OB) OB.forzado = false; } catch (e) {} ob.classList.remove('show'); }
    var f = document.querySelector('.sb-footer'); if (f) { f.onclick = null; f.style.cursor = 'default'; }
  });

  /* ---------- banner superior ---------- */
  function injectBanner() {
    if (document.getElementById('dxw-top')) return;
    var app = document.querySelector('.app'); if (!app) return;
    var bar = document.createElement('div'); bar.id = 'dxw-top';
    bar.innerHTML =
      '<div class="b"><span class="tag">DEMO ONLINE</span> Esta es la interfaz real de DEXIAE ' +
      '<span class="m">· datos ficticios, todo se procesa en tu equipo</span></div>' +
      '<a class="cta" href="' + TRIAL + '">Probar gratis con mis archivos →</a>';
    app.insertBefore(bar, app.firstChild);
  }

  /* ---------- candados ---------- */
  var L = {
    hist: ['Historial y Analítica', 'Cada lote queda registrado con métricas: documentos procesados, duplicados, tasa de acierto, tiempo ahorrado y gráficos por semana, plantilla y tipo de intervención.'],
    val: ['Validación de datos', 'Definís reglas de negocio (CUIT válido, sumas que cierran, campos obligatorios, valores en lista, fechas en rango) y DEXIAE marca cada documento que no las cumple.'],
    listado: ['Modo Listado', 'Extrae las <b>tablas</b> de cada PDF a Excel <b>sin usar plantilla</b> — ideal para listados y reportes tabulares. En la demo mostramos el modo Extractor por plantilla.'],
    auto: ['Autodetección de plantillas', 'DEXIAE compara cada documento contra las <b>anclas</b> de todas tus plantillas y aplica la de mayor coincidencia, sola. Procesás lotes mezclados sin elegir plantilla a mano.'],
    unir_pdfs: ['Unir PDFs', 'Combina varios PDF en un único documento, en el orden que elijas.'],
    dividir: ['Dividir / Extraer', 'Separá un PDF o extraé un rango de páginas a un archivo nuevo.'],
    pdf_a_word: ['PDF a Word', 'Convertí un PDF a un .docx editable, respetando el texto.'],
    img_a_pdf: ['Imágenes a PDF', 'Convertí fotos y escaneos (JPG, PNG) en un único PDF.'],
    ocr: ['OCR por Lote', 'Convertí PDFs escaneados en texto buscable y seleccionable.'],
    fusionar: ['Fusionar Reportes', 'Consolidá varios Excel en uno solo, sin filas duplicadas.'],
    organizar: ['Organizar PDF', 'Reordená, rotá y eliminá páginas antes de procesar.'],
    comprimir: ['Comprimir PDF', 'Reducí el peso de PDFs y escaneos para mandarlos por mail o subirlos a AFIP.']
  };
  function badge(el, txt) {
    if (!el || el.querySelector('.dxw-lk-badge')) return;
    var b = document.createElement('span'); b.className = 'dxw-lk-badge';
    b.innerHTML = '<i class="ti ti-lock" style="font-size:10px"></i> ' + (txt || 'Trial');
    el.appendChild(b);
  }
  function corner(card) {
    if (!card || card.querySelector('.dxw-lk-corner')) return;
    card.classList.add('dxw-lk');
    var i = document.createElement('i'); i.className = 'ti ti-lock dxw-lk-corner'; card.appendChild(i);
  }
  function lockThings() {
    // sidebar: Historial + Validación
    var sh = document.querySelector('[data-s="hist"]'); if (sh) { badge(sh); }
    var sv = document.querySelector('[data-s="val"]'); if (sv) { badge(sv); }
    var navOrig = UI.nav.bind(UI); var labDone = false;
    UI.nav = function (s) {
      if (s === 'hist') { return lockModal(L.hist[0], L.hist[1]); }
      if (s === 'val') { return lockModal(L.val[0], L.val[1]); }
      navOrig(s);
      if (s === 'lab' && !labDone) { labDone = true; setTimeout(labSetup, 140); }
    };

    // modo Listado + Autodetección
    var bl = document.querySelector('#seg-modo [data-m="listado"]'); if (bl) badge(bl);
    var ba = document.getElementById('seg-fuente-auto'); if (ba) badge(ba);
    var modoOrig = window.onModoChange, fuenteOrig = window.onFuenteChange;
    window.onModoChange = function (m) { if (m === 'listado') return lockModal(L.listado[0], L.listado[1]); return modoOrig.apply(this, arguments); };
    window.onFuenteChange = function (f) { if (f === 'auto') return lockModal(L.auto[0], L.auto[1]); return fuenteOrig.apply(this, arguments); };

    // herramientas: todas menos Extracto (tc-star) y el placeholder (tc-ghost)
    document.querySelectorAll('#screen-tools .tool-card').forEach(function (card) {
      if (card.classList.contains('tc-star') || card.classList.contains('tc-ghost')) return;
      corner(card);
    });
    wrap('onHerr', function (orig, args) { var m = args[0]; var map = { unir_pdfs: 'unir_pdfs', pdf_a_word: 'pdf_a_word', img_a_pdf: 'img_a_pdf' }; var k = map[m]; if (k) return lockModal(L[k][0], L[k][1]); return orig.apply(this, args); });
    wrapLock('divAbrir', 'dividir'); wrapLock('ocrAbrir', 'ocr'); wrapLock('fusAbrir', 'fusionar');
    wrapLock('orgAbrir', 'organizar'); wrapLock('onComprimir', 'comprimir');
  }
  function wrap(name, fn) { var o = window[name]; if (typeof o !== 'function') return; window[name] = function () { return fn.call(this, o, arguments); }; }
  function wrapLock(name, key) { wrap(name, function () { return lockModal(L[key][0], L[key][1]); }); }

  /* ---------- gate de Excel enganchado a los botones reales ---------- */
  function wireExcelGate() {
    // Lote completado → "Abrir Excel"
    wrap('onAbrirExcel', function () { excelGate('extraccion'); });
    // "Ver HTML" / "Abrir PDF" del lote → candado (se generan en la versión instalada)
    wrap('onAbrirHtml', function () { lockModal('Reporte HTML', 'El reporte de auditoría en HTML (con score de riesgo, gaps de numeración y detalle por documento) se genera en la versión instalada.'); });
    wrap('onAbrirPdf', function () { lockModal('Reporte PDF', 'El informe pericial en PDF, listo para presentar, se genera en la versión instalada.'); });
    // Extracto → abre vía PY.call('abrir_path', ruta): lo interceptamos
    var pcall = PY.call.bind(PY);
    PY.call = function (m) {
      if (m === 'abrir_path') { excelGate('extracto'); return Promise.resolve({ ok: true }); }
      return pcall.apply(PY, arguments);
    };
  }

  /* ---------- Laboratorio: render factura + zona ---------- */
  function labAuto() { /* el setup se dispara desde el wrapper de UI.nav (labSetup) */ }
  function labSetup() {
    try {
      if (typeof labCargarDoc === 'function') labCargarDoc();
      setTimeout(function () { if (typeof labCargarPlantilla === 'function') labCargarPlantilla('Facturas_AR.json'); }, 90);
      setTimeout(function () { if (typeof labTab === 'function') labTab('visual'); }, 230);
    } catch (e) { /* noop */ }
  }

  /* ---------- Director de video (demo-only): armar una plantilla en vivo ----------
     Lo usa redes/video-sistema/grabar.py (flujo "plantilla"). No afecta la demo
     online: solo expone window.dxwLabDemo, que el grabador llama paso a paso. */
  function _labSet(id, v) { var e = document.getElementById(id); if (e) e.value = v; }
  window.dxwLabDemo = {
    // arranca el Lab "armando": documento cargado, plantilla VACÍA, Modo Visual
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
      setTimeout(prep, 440); // re-vacía por si labSetup alcanzó a cargar Facturas_AR
    },
    // lleva el visor arriba (encabezado: CUIT y Fecha viven ahí)
    scrollTop: function () {
      var s = document.getElementById('lab-vis-scroll'); if (s) s.scrollTop = 0;
    },
    // re-asegura que la ZONA del total quede a la vista (evita el race de layout:
    // si el img/scroll no asentó al dibujar, la caja queda clippeada y la cámara
    // encuadra mal)
    scrollToZona: function () {
      var s = document.getElementById('lab-vis-scroll');
      if (s) s.scrollTop = Math.max(0, ZONA_TOTAL[1] - 150);
    },
    // dibuja (animada) la ZONA sobre el TOTAL y deja el editor listo para "Agregar"
    drawZona: function () {
      try {
        var ov = document.getElementById('lab-vis-overlay'); if (!ov) return;
        var sc = (typeof LAB !== 'undefined' && LAB.visScale) || 1, z = ZONA_TOTAL;
        var x = Math.min(z[0], z[2]) * sc, y = Math.min(z[1], z[3]) * sc,
            w = Math.abs(z[2] - z[0]) * sc, h = Math.abs(z[3] - z[1]) * sc;
        // el TOTAL está en la parte baja de la factura: scrolleamos el visor
        // para que la zona (y su dibujo) queden a la vista.
        var scroll = document.getElementById('lab-vis-scroll');
        if (scroll) scroll.scrollTop = Math.max(0, y - 170);
        var d = document.createElement('div'); d.className = 'lab-zona-draw';
        d.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:0;height:0';
        ov.appendChild(d);
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
    // completa el editor para un campo por estrategia (CUIT, Fecha...): el
    // grabador luego clickea "Agregar" (para el sonido/cursor del botón real)
    fillCampo: function (col, tag, strat) {
      try {
        if (typeof LAB !== 'undefined') LAB._formCoords = null;
        _labSet('lab-col', col); _labSet('lab-tag', tag || '');
        var s = document.getElementById('lab-strat'); if (s) s.value = strat;
      } catch (e) {}
    },
    // solo columna + etiqueta (la estrategia se elige aparte, con el panel)
    fillCol: function (col, tag) {
      try {
        if (typeof LAB !== 'undefined') LAB._formCoords = null;
        _labSet('lab-col', col); _labSet('lab-tag', tag || '');
      } catch (e) {}
    },
    // despliega un panel con la LISTA REAL de estrategias, con una resaltada.
    // (el desplegable nativo del <select> no se captura en el screencast, así
    // que lo simulamos con el mismo contenido, estilizado como la app.)
    showEstrategias: function (pick) {
      try {
        this.hideEstrategias();
        var ESTR = ['Texto (Derecha)', 'Texto (Izquierda)', 'Texto (Cerca)',
          'Entre A y B', 'ZONA', 'Número', 'Moneda ($)', 'Fecha', 'CUIT / DNI',
          'Email', 'Patrón (Regex)'];
        var sel = document.getElementById('lab-strat'); if (!sel) return;
        var r = sel.getBoundingClientRect();
        var rowH = 34, padY = 8, h = ESTR.length * rowH + padY * 2;
        var box = document.createElement('div'); box.id = 'dxw-estr';
        box.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' +
          (r.top - h - 6) + 'px;width:' + Math.max(230, r.width) +
          'px;background:#0e1622;border:1px solid #2b425c;border-radius:10px;' +
          'box-shadow:0 24px 60px rgba(0,0,0,.65);z-index:2147483000;padding:' +
          padY + 'px;font-family:Inter,Segoe UI,sans-serif';
        box.innerHTML = ESTR.map(function (e) {
          var on = e === pick;
          return '<div style="height:' + rowH + 'px;display:flex;align-items:center;' +
            'padding:0 12px;border-radius:6px;font-size:14.5px;font-weight:' +
            (on ? '600' : '400') + ';color:' + (on ? '#04121a' : '#9db1c9') +
            ';background:' + (on ? '#3dd9b6' : 'transparent') + '">' + e + '</div>';
        }).join('');
        document.body.appendChild(box);
      } catch (e) {}
    },
    pickEstrategia: function (strat) {
      try {
        var sel = document.getElementById('lab-strat'); if (sel) sel.value = strat;
        this.hideEstrategias();
      } catch (e) {}
    },
    hideEstrategias: function () {
      var b = document.getElementById('dxw-estr'); if (b) b.remove();
    }
  };
})();
