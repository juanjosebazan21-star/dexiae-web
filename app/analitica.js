// ═══ Analítica (30/09/2026) ═════════════════════════════════════════════════
// La pantalla de la maqueta aprobada (maquetas/modulos-nuevos/analitica.html)
// con los datos de analitica_datos (dexiae_analitica.calcular): todo se calcula
// en esta computadora con el historial de lotes. Lo que se declara es lo que
// está medido: el puntaje NO es exactitud y el tiempo manual es una estimación
// con los segundos que pone el usuario (se guardan).
const ANA = {dias: 30, plantilla: '', modo: '', d: null, _tSeg: null};
const ana$ = id => document.getElementById(id);
function anaEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c])); }
function anaNum(n) { return Number(n || 0).toLocaleString('es-AR'); }
function anaPct(v) { return String(Math.round((v || 0) * 10) / 10).replace('.', ',') + ' %'; }
const ANA_COL = {ok: '#2f9e6f', rev: '#c79633', dup: '#2a9db5', err: '#cf5a5a', alerta: '#9b2c2c', azul: '#2563EB'};
const ANA_IC = {plantilla_revision: ['ti-template', 'rev'], puntaje_bajo: ['ti-arrows-shuffle', 'err'],
                set_hallazgos: ['ti-list-check', 'rev'], sin_huella: ['ti-fingerprint', 'info'],
                revision_sin_terminar: ['ti-eye-check', 'rev'], campo_corregido: ['ti-pencil', 'info'],
                sin_plantilla: ['ti-file-unknown', 'rev']};
const ANA_AJ = [
  ['seg_por_doc', 'Segundos de trabajo manual por documento', 'Sólo para la estimación de tiempo.'],
  ['puntaje_umbral', 'Puntaje bajo: menor a', 'Entre 0 y 1. Qué tan seguro estuvo el clasificador al elegir la plantilla.'],
  ['rev_factor', 'Plantilla con más revisión: veces más que el resto', ''],
  ['rev_pct_min', '…y al menos este % a revisión', 'Para no avisar un 2 % contra un 1 %.'],
  ['min_docs', 'Documentos mínimos para opinar de una plantilla', ''],
  ['hallazgos_min', 'Hallazgos de un set de Validación para avisar', ''],
  ['correcciones_min', 'Correcciones de un campo en Revisión para avisar', ''],
];

function anaMontar() {
  const s = ana$('screen-ana'); if (!s || s.dataset.ok) return; s.dataset.ok = '1';
  s.innerHTML = `
  <div class="ana-top">
    <div><h1>Analítica</h1><div class="sub">Qué se repite y dónde conviene actuar. Todo se calcula en esta computadora, con el historial de lotes.</div></div>
    <div class="ana-filtros">
      <div class="ana-seg" id="ana-per">
        <button data-d="7" onclick="anaPeriodo(7)">7 días</button><button data-d="30" onclick="anaPeriodo(30)">30 días</button>
        <button data-d="90" onclick="anaPeriodo(90)">90 días</button><button data-d="0" onclick="anaPeriodo(0)">Todo</button></div>
      <select class="form-select" id="ana-pl" onchange="ANA.plantilla=this.value;anaCargar()"><option value="">Todas las plantillas</option></select>
      <select class="form-select" id="ana-mo" onchange="ANA.modo=this.value;anaCargar()"><option value="">Todos los modos</option></select>
      <button class="btn btn-ghost sm" onclick="anaAjustesAbrir()" title="Umbrales de «Dónde conviene actuar»"><i class="ti ti-adjustments"></i> Ajustes</button>
    </div>
  </div>
  <div class="ana-demo" id="ana-demo" hidden><i class="ti ti-info-circle"></i> Datos de ejemplo (demo): en la app salen del historial de lotes de esta computadora.</div>
  <div id="ana-cuerpo"><div class="hist-empty">Cargando…</div></div>
  <div class="ana-aj" id="ana-aj" hidden onclick="if(event.target===this)anaAjustesCerrar()"><div class="caja" id="ana-aj-caja"></div></div>`;
}
function anaInit() { anaMontar(); anaCargar(); }
function anaPeriodo(d) { ANA.dias = d; anaCargar(); }

async function anaCargar() {
  anaMontar();
  document.querySelectorAll('#ana-per button').forEach(b => b.classList.toggle('act', Number(b.dataset.d) === ANA.dias));
  let r; try { r = await PY.call('analitica_datos', {dias: ANA.dias, plantilla: ANA.plantilla, modo: ANA.modo}); } catch (e) { r = null; }
  const c = ana$('ana-cuerpo');
  if (!r || !r.ok) { c.innerHTML = `<div class="hist-empty">${anaEsc((r && r.error) || 'No se pudo calcular la analítica')}</div>`; return; }
  ana$('ana-demo').hidden = !r.demo_ejemplo;
  ANA.d = r;
  if (r.vacio) { c.innerHTML = '<div class="hist-empty">Todavía no hay lotes en el historial de esta computadora.</div>'; return; }
  const pl = ana$('ana-pl'), mo = ana$('ana-mo');
  pl.innerHTML = '<option value="">Todas las plantillas</option>' + (r.plantillas || []).map(p => `<option value="${anaEsc(p)}">${anaEsc(p)}</option>`).join('');
  pl.value = (r.plantillas || []).includes(ANA.plantilla) ? ANA.plantilla : '';
  mo.innerHTML = '<option value="">Todos los modos</option>' + (r.modos || []).map(m => `<option value="${anaEsc(m)}">${anaEsc(m)}</option>`).join('');
  mo.value = (r.modos || []).includes(ANA.modo) ? ANA.modo : '';
  anaPintar();
}

function anaPintar() {
  const r = ANA.d, k = r.conteos || {};
  const dias = r.filtros && r.filtros.dias;
  const var_ = k.docs_var_pct;
  const mods = Object.entries(k.lotes_por_modo || {}).map(([m, n]) => `${n} ${m === 'manual' ? (n === 1 ? 'manual' : 'manuales') : m === 'centinela' ? 'del Centinela' : m}`).join(' · ');
  const okVar = k.ok_pct_var;
  let h = `<div class="ana-kpis">
    <div class="ana-card ana-k"><div class="l">Documentos procesados</div><div class="v">${anaNum(k.docs)}</div>
      <div class="d">${var_ == null ? (dias ? 'sin lotes en los ' + dias + ' días anteriores' : 'todo el historial') : (var_ >= 0 ? '+' : '') + var_ + ' % que los ' + dias + ' días anteriores'}</div></div>
    <div class="ana-card ana-k"><div class="l">Lotes</div><div class="v">${anaNum(k.lotes)}</div><div class="d">${anaEsc(mods) || '—'}</div></div>
    <div class="ana-card ana-k" title="Estado OK: sin ir a revisión, sin duplicado, sin error ni alerta"><div class="l">Salieron OK</div><div class="v">${String(k.ok_pct || 0).replace('.', ',')}<small> %</small></div>
      <div class="d ${okVar > 0 ? 'bien' : okVar < 0 ? 'mal' : ''}">${okVar == null ? anaNum(k.ok) + ' documentos' : (okVar >= 0 ? '+' : '') + String(okVar).replace('.', ',') + ' puntos'}</div></div>
    <div class="ana-card ana-k"><div class="l">Fueron a revisión</div><div class="v">${anaNum(k.rev)}</div>
      <div class="d ${k.rev_top ? 'ojo' : ''}">${k.rev_top ? anaNum(k.rev_top.n) + (k.rev_top.plantilla === '(sin plantilla)' ? ' que ninguna plantilla reconoció' : ' de «' + anaEsc(k.rev_top.plantilla) + '»') : (k.rev ? anaPct(100 * k.rev / Math.max(1, k.docs)) + ' del total' : 'ninguno')}</div></div>
    <div class="ana-card ana-k"><div class="l">Duplicados</div><div class="v">${anaNum(k.dup)}</div><div class="d">marcados DUPLICADO en el Excel</div></div>
    ${k.alerta ? `<div class="ana-card ana-k alerta" title="Firmados y modificados después de la firma"><div class="l">Alerta legal</div><div class="v">${anaNum(k.alerta)}</div><div class="d mal">firmados y alterados</div></div>` : ''}
  </div>
  <div class="ana-fila2">
    <div class="ana-card"><div class="ana-ct"><i class="ti ti-target-arrow"></i>Dónde conviene actuar <span class="h">ordenado por cuántos documentos afecta · <a onclick="anaAjustesAbrir()">umbrales</a></span></div>
      ${anaAcciones(r)}</div>
    <div class="ana-card"><div class="ana-ct"><i class="ti ti-chart-bar"></i>Volumen por semana y parte que fue a revisión</div>
      ${anaSemanas(r.semanas || [])}
      <div class="ana-leyenda"><span style="--c:${ANA_COL.azul}">documentos</span><span style="--c:${ANA_COL.rev}">% a revisión</span></div></div>
  </div>
  <div class="ana-fila3">
    <div class="ana-card"><div class="ana-ct"><i class="ti ti-template"></i>Resultado por plantilla</div>${anaPlantillas(r.por_plantilla || [])}</div>
    <div class="ana-card"><div class="ana-ct"><i class="ti ti-arrows-shuffle"></i>Puntaje al asignar la plantilla</div>${anaPuntaje(r.puntaje || {})}
      <div class="ana-nota"><i class="ti ti-info-circle"></i> Dice qué tan seguro estuvo el clasificador al elegir la plantilla. No mide si los datos salieron bien: eso sólo se sabe revisando.</div></div>
    <div class="ana-card"><div class="ana-ct"><i class="ti ti-shield-check"></i>Trazabilidad</div>${anaTraza(r)}</div>
  </div>`;
  const pie = [];
  if (k.lotes_sin_detalle) pie.push(`${k.lotes_sin_detalle} lote(s) del período no tienen detalle por documento: no entran en estos conteos.`);
  pie.push('Las conversiones de extractos bancarios no entran acá: tienen su tablero en Extractos.');
  if (k.otro) pie.push(`${k.otro} documento(s) con otro estado (omitidos) cuentan en el total pero en ningún grupo.`);
  if (pie.length) h += `<div class="ana-pie"><i class="ti ti-info-circle"></i> ${pie.join(' ')}</div>`;
  ana$('ana-cuerpo').innerHTML = h;
}

function anaAcciones(r) {
  const a = r.acciones || [];
  let h = a.map((x, i) => {
    const [ic, cls] = ANA_IC[x.id] || ['ti-point', 'gris'];
    return `<div class="ana-acc"><div class="ic ${cls}"><i class="ti ${ic}"></i></div>
      <div style="min-width:0"><div class="t">${anaEsc(x.titulo)}</div><div class="s">${anaEsc(x.detalle)}</div></div>
      <button class="btn btn-ghost sm ir" onclick="anaIr(${i})">${anaEsc(x.boton)}</button></div>`;
  }).join('');
  if (!a.length) h = `<div class="ana-vacio"><i class="ti ti-circle-check" style="color:var(--ok-fg)"></i> Nada para señalar en este período con los umbrales de ahora.</div>`;
  const rv = r.revision || {};
  if (!rv.decisiones && (r.ajustes && r.ajustes.acciones && r.ajustes.acciones.campo_corregido))
    h += `<div class="ana-acc futuro"><div class="ic gris"><i class="ti ti-pencil"></i></div>
      <div><div class="t">Qué campo se corrige más</div><div class="s">Aparece cuando revises lotes con «Revisar antes de generar el Excel»: cada corrección queda guardada y acá se ve qué campo de qué plantilla se corrige seguido.</div></div></div>`;
  return h;
}

function anaTope(v) {                       // un máximo «redondo» para el eje
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
function anaSemanas(S) {
  if (!S.length) return '<div class="ana-vacio">Sin documentos en el período.</div>';
  const W = 460, H = 210, l = 38, r = 38, t = 14, b = 28;
  const max = anaTope(Math.max(...S.map(s => s.docs))), maxP = Math.max(10, Math.ceil(Math.max(...S.map(s => s.rev_pct)) / 10) * 10);
  const bw = (W - l - r) / S.length, alto = H - t - b;
  let g = '';
  [0, .5, 1].forEach(f => { const y = H - b - f * alto;
    g += `<line x1="${l}" x2="${W - r}" y1="${y}" y2="${y}" stroke="var(--border2)"/><text x="${l - 6}" y="${y + 4}" text-anchor="end">${anaNum(Math.round(max * f))}</text>`
       + `<text x="${W - r + 6}" y="${y + 4}">${Math.round(maxP * f)}%</text>`; });
  const pts = [];
  S.forEach((s, i) => {
    const x = l + i * bw + bw * .22, w = bw * .56, hb = (s.docs / max) * alto;
    g += `<rect x="${x}" y="${H - b - hb}" width="${w}" height="${Math.max(0, hb)}" rx="3" fill="${ANA_COL.azul}" opacity=".85"><title>Semana del ${anaEsc(s.etiqueta)}: ${anaNum(s.docs)} documentos</title></rect>`;
    if (S.length <= 12) g += `<text x="${x + w / 2}" y="${H - 10}" text-anchor="middle">${anaEsc(s.etiqueta)}</text>`;
    pts.push([x + w / 2, H - b - (s.rev_pct / maxP) * alto, s]);
  });
  if (pts.length > 1) g += `<polyline points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}" fill="none" stroke="${ANA_COL.rev}" stroke-width="2"/>`;
  pts.forEach(p => { g += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${ANA_COL.rev}"><title>${anaPct(p[2].rev_pct)} a revisión (${p[2].rev} de ${p[2].docs})</title></circle>`; });
  return `<svg class="ana-svg" viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`;
}
function anaPlantillas(P) {
  if (!P.length) return '<div class="ana-vacio">Sin documentos en el período.</div>';
  const hayAl = P.some(p => p.alerta);
  const seg = (p, k, txt) => p[k] ? `<span style="width:${p[k] / p.docs * 100}%;background:${ANA_COL[k]}" title="${anaNum(p[k])} ${txt}"></span>` : '';
  return `<div class="ana-barras">${P.slice(0, 8).map(p => `<div class="b"><span class="n" title="${anaEsc(p.plantilla)}">${anaEsc(p.plantilla)}</span>
      <div class="ana-pila">${seg(p, 'ok', 'OK')}${seg(p, 'rev', 'a revisión')}${seg(p, 'dup', 'duplicados')}${seg(p, 'err', 'con error')}${seg(p, 'alerta', 'con alerta legal')}</div>
      <span class="tot">${anaNum(p.docs)}</span></div>`).join('')}</div>
    ${P.length > 8 ? `<div class="ana-nota">Y ${P.length - 8} plantilla(s) más; elegí una arriba para verla sola.</div>` : ''}
    <div class="ana-leyenda"><span style="--c:${ANA_COL.ok}">OK</span><span style="--c:${ANA_COL.rev}">revisión</span><span style="--c:${ANA_COL.dup}">duplicado</span><span style="--c:${ANA_COL.err}">error</span>${hayAl ? `<span style="--c:${ANA_COL.alerta}">alerta legal</span>` : ''}</div>`;
}
function anaPuntaje(p) {
  if (!p.n) return '<div class="ana-vacio">Sin puntajes de asignación en este período.</div>';
  const B = (p.tramos || []).map(x => x.n), W = 320, H = 170, l = 10, b = 26, t = 12;
  const max = Math.max(1, ...B), bw = (W - 2 * l) / B.length, u = p.umbral;
  let g = '';
  (p.tramos || []).forEach((x, i) => { const h = x.n ? Math.max(2, (x.n / max) * (H - t - b)) : 0, xx = l + i * bw + 2;
    g += `<rect x="${xx}" y="${H - b - h}" width="${bw - 4}" height="${h}" rx="2" fill="${x.hasta <= u + 1e-9 ? ANA_COL.rev : ANA_COL.azul}" opacity=".85"><title>${String(x.desde).replace('.', ',')}–${String(x.hasta).replace('.', ',')}: ${anaNum(x.n)}</title></rect>`; });
  const xu = l + Math.min(1, Math.max(0, u)) * (W - 2 * l);
  g += `<line x1="${xu}" x2="${xu}" y1="${t}" y2="${H - b}" stroke="${ANA_COL.err}" stroke-dasharray="4 3"/><text x="${Math.min(xu + 4, W - 70)}" y="${t + 10}" style="fill:${ANA_COL.err}">umbral ${String(u).replace('.', ',')}</text>`;
  [0, .5, 1].forEach(v => { g += `<text x="${l + v * (W - 2 * l)}" y="${H - 8}" text-anchor="${v === 0 ? 'start' : v === 1 ? 'end' : 'middle'}">${String(v).replace('.', ',')}</text>`; });
  return `<svg class="ana-svg" viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>
    <div class="ana-nota">${anaNum(p.n)} documento(s) con puntaje · ${anaNum(p.bajo_umbral)} por debajo del umbral.</div>`;
}
function anaTraza(r) {
  const t = r.trazabilidad || {}, tm = r.tiempo || {}, rv = r.revision || {};
  const colFirma = e => /ALTERAD|INVAL|CORRUPT/.test(e) ? 'var(--err-fg)' : /VALIDA|VÁLIDA/.test(e) ? 'var(--ok-fg)' : 'var(--txt)';
  let h = `<div class="ana-traza">
    <span class="k2">Lotes con Excel con huella</span><span class="v2">${anaNum(t.con_huella)} de ${anaNum(t.con_excel)}</span>
    <span class="k2">Informes HTML / PDF generados</span><span class="v2">${anaNum(t.html)} / ${anaNum(t.pdf)}</span>
    <span class="k2">Documentos con peritaje de firmas</span><span class="v2">${anaNum(t.peritados)}</span>
    ${(t.firmas || []).slice(0, 6).map(f => `<span class="k2 sub">${anaEsc(f.estado.toLowerCase())}</span><span class="v2" style="color:${colFirma(f.estado)}">${anaNum(f.n)}</span>`).join('')}
    <span class="k2">Decisiones de Revisión en el período</span><span class="v2">${anaNum(rv.decisiones)}</span>
  </div>
  <div class="ana-est"><i class="ti ti-clock"></i><span>Tiempo manual estimado: <b id="ana-t-est" style="white-space:nowrap">${String(tm.horas || 0).replace('.', ',')} h</b></span>
    <span style="margin-left:auto;white-space:nowrap"><input id="ana-seg" type="number" min="0" step="5" value="${Number(tm.seg_por_doc || 0)}" oninput="anaSegCambia()"> s por doc.</span></div>
  <div class="ana-nota">Es una estimación con el valor que pongas, no una medición.</div>`;
  return h;
}
// Los segundos por documento: se recalcula al tipear y se guarda solo.
function anaSegCambia() {
  const s = Math.max(0, Number(ana$('ana-seg').value) || 0), k = (ANA.d && ANA.d.conteos) || {};
  ana$('ana-t-est').textContent = String(Math.round(k.docs * s / 360) / 10).replace('.', ',') + ' h';
  clearTimeout(ANA._tSeg);
  ANA._tSeg = setTimeout(() => {
    const aj = Object.assign({}, (ANA.d && ANA.d.ajustes) || {}, {seg_por_doc: s});
    PY.call('analitica_ajustes_guardar', aj).then(x => { if (x && x.ok && ANA.d) { ANA.d.ajustes = x.ajustes; ANA.d.tiempo.seg_por_doc = s; } });
  }, 700);
}

// ── Ir a donde se arregla ────────────────────────────────────────────────────
async function anaEsperar(cond, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (cond()) return true; } catch (e) {} await new Promise(r => setTimeout(r, 120)); }
  return false;
}
async function anaIr(i) {
  const a = ANA.d && ANA.d.acciones && ANA.d.acciones[i]; if (!a) return;
  const d = a.destino || {};
  if (d.modulo === 'lab') {
    UI.nav('lab');
    const ok = await anaEsperar(() => [...ana$('lab-sel').options].some(o => o.value === d.plantilla), 3000);
    if (!ok) { UI.toast(`No encuentro «${d.plantilla}» entre las plantillas del Laboratorio`, 'warn'); return; }
    ana$('lab-sel').value = d.plantilla; labCargarPlantilla(d.plantilla);
    if (d.columna) UI.toast(`Mirá el campo ${d.columna}: se corrigió seguido al revisar`, 'info');
  } else if (d.modulo === 'hist') {
    STATE.histIds = (d.lotes || []).slice(); STATE.histIdsDe = 'Analítica';
    UI.nav('hist');
  } else if (d.modulo === 'val') {
    UI.nav('val');
    const ok = await anaEsperar(() => typeof VAL === 'object' && (VAL.sets || []).some(s => s.nombre === d.set), 3000);
    if (ok) valSel(d.set); else UI.toast(`No encuentro el set «${d.set}» en Validación`, 'warn');
  }
}

// ── Ajustes (umbrales de «Dónde conviene actuar») ───────────────────────────
function anaAjustesAbrir() {
  const aj = (ANA.d && ANA.d.ajustes) || {}, ac = aj.acciones || {};
  const nombres = (ANA.d && ANA.d.acciones_txt) || {};
  ana$('ana-aj-caja').innerHTML = `<h3>Ajustes de la analítica</h3>
    <p class="p">Cuándo se avisa en «Dónde conviene actuar». Se guardan en esta computadora.</p>
    <div class="g">${ANA_AJ.map(([k, t, ay]) => `<label for="ana-aj-${k}">${anaEsc(t)}${ay ? `<small>${anaEsc(ay)}</small>` : ''}</label>
      <input type="number" id="ana-aj-${k}" min="0" step="${k === 'puntaje_umbral' ? '0.05' : k === 'rev_factor' ? '0.5' : '1'}" value="${aj[k] != null ? aj[k] : ''}">`).join('')}</div>
    <div class="chks">${Object.keys(ac).map(k => `<label><input type="checkbox" id="ana-ac-${k}" ${ac[k] ? 'checked' : ''}> ${anaEsc(nombres[k] || k)}</label>`).join('')}</div>
    <div class="bts"><button class="btn btn-ghost" onclick="anaAjustesCerrar()">Cancelar</button>
      <button class="btn btn-primary" onclick="anaAjustesGuardar()"><i class="ti ti-device-floppy"></i> Guardar</button></div>`;
  ana$('ana-aj').hidden = false;
}
function anaAjustesCerrar() { ana$('ana-aj').hidden = true; }
async function anaAjustesGuardar() {
  const aj = {acciones: {}};
  ANA_AJ.forEach(([k]) => { const v = ana$('ana-aj-' + k).value; if (v !== '') aj[k] = Number(v); });
  Object.keys(((ANA.d && ANA.d.ajustes) || {}).acciones || {}).forEach(k => { aj.acciones[k] = !!ana$('ana-ac-' + k).checked; });
  const r = await PY.call('analitica_ajustes_guardar', aj);
  if (!r || !r.ok) { UI.toast((r && r.error) || 'No se pudo guardar', 'err'); return; }
  anaAjustesCerrar(); UI.toast('Ajustes guardados', 'ok'); anaCargar();
}

// ── Demo (navegador sin la app): datos de ejemplo, dichos como tales ────────
if (typeof DEMO === 'object' && DEMO) {
  DEMO.analitica_datos = (f) => {
    const sem = [['01/09', 214, 31], ['08/09', 258, 33], ['15/09', 301, 34], ['22/09', 287, 26], ['29/09', 224, 17]];
    const pp = [['Facturas de proveedores.json', 466, 353, 98, 12, 3, 0], ['Recibos de honorarios.json', 218, 199, 13, 6, 0, 0],
                ['Legajos de personal.json', 176, 161, 9, 5, 1, 0], ['Resoluciones.json', 112, 96, 13, 2, 1, 0]];
    const docs = pp.reduce((a, p) => a + p[1], 0);
    return {ok: true, demo_ejemplo: true, filtros: {dias: (f && f.dias) || 0, plantilla: '', modo: ''},
      plantillas: pp.map(p => p[0]), modos: ['centinela', 'manual'],
      conteos: {docs, docs_prev: 820, docs_var_pct: Math.round(100 * (docs - 820) / 820), lotes: 41, lotes_por_modo: {manual: 26, centinela: 15},
                ok: 809, ok_pct: Math.round(1000 * 809 / docs) / 10, ok_pct_var: 3.1, rev: 133, rev_top: {plantilla: pp[0][0], n: 98},
                dup: 25, err: 5, alerta: 0, otro: 0, lotes_sin_detalle: 0},
      semanas: sem.map(([e, n, rv]) => ({semana: e, etiqueta: e, docs: n, rev: rv, rev_pct: Math.round(1000 * rv / n) / 10})),
      por_plantilla: pp.map(p => ({plantilla: p[0], docs: p[1], ok: p[2], rev: p[3], dup: p[4], err: p[5], alerta: p[6], otro: 0, rev_pct: Math.round(1000 * p[3] / p[1]) / 10})),
      puntaje: {n: 972, bajo_umbral: 23, umbral: 0.6, tramos: [1, 1, 2, 3, 6, 10, 96, 211, 402, 240].map((n, i) => ({desde: i / 10, hasta: (i + 1) / 10, n}))},
      trazabilidad: {lotes: 41, con_excel: 41, con_huella: 37, html: 29, pdf: 12, peritados: 312, alerta_legal: 0,
                     firmas: [{estado: 'DIGITAL VALIDA', n: 288}, {estado: 'NO FIRMADO', n: 21}, {estado: 'FIRMADO PERO ALTERADO', n: 3}]},
      revision: {decisiones: 0, corregidos: []},
      tiempo: {seg_por_doc: 90, horas: Math.round(docs * 90 / 360) / 10},
      acciones_txt: {plantilla_revision: 'Una plantilla que manda mucho más a revisión que el resto', puntaje_bajo: 'Documentos asignados con puntaje bajo', set_hallazgos: 'Un set de Validación con muchos hallazgos', sin_huella: 'Lotes sin la huella del Excel', revision_sin_terminar: 'Revisiones sin terminar', campo_corregido: 'Un campo que se corrige seguido al revisar', sin_plantilla: 'Documentos que ninguna plantilla reconoció'},
      ajustes: {seg_por_doc: 90, puntaje_umbral: 0.6, rev_factor: 2, rev_pct_min: 10, min_docs: 10, hallazgos_min: 10, correcciones_min: 3,
                acciones: {plantilla_revision: true, puntaje_bajo: true, set_hallazgos: true, sin_huella: true, revision_sin_terminar: true, campo_corregido: true}},
      acciones: [
        {id: 'plantilla_revision', n: 98, titulo: `«${pp[0][0]}» manda el 21 % a revisión`, detalle: '98 de 466 documentos. El resto de las plantillas manda el 7,3 %. El motivo más común: «DATOS FALTANTES» (71).', boton: 'Abrir en Laboratorio', destino: {modulo: 'lab', plantilla: pp[0][0]}},
        {id: 'puntaje_bajo', n: 23, titulo: '23 documentos se asignaron con puntaje bajo', detalle: 'Puntaje menor a 0,6 al elegir la plantilla. 17 de la carpeta «Octubre». Puede faltar una plantilla o un ancla.', boton: 'Ver en Historial', destino: {modulo: 'hist', lotes: [3, 5]}},
        {id: 'sin_huella', n: 58, titulo: '4 lotes no guardaron la huella del Excel', detalle: 'Del 02/09/2026 al 05/09/2026. Sin huella no se puede probar que el Excel no se tocó.', boton: 'Ver lotes', destino: {modulo: 'hist', lotes: [1, 2]}},
      ].sort((a, b) => b.n - a.n)};
  };
  DEMO.analitica_ajustes_guardar = (a) => ({ok: true, ajustes: a});
}
