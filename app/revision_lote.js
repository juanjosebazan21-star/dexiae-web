// ═══ Revisión asistida del lote de extracción (30/09/2026) ═══════════════════
// La pantalla de la maqueta aprobada (maquetas/modulos-nuevos/revision.html)
// hablando con la API real: rx_abrir, rx_pagina, rx_palabras, rx_decidir,
// rx_corregir, rx_deshacer, rx_generar, rx_cerrar (dexiae_api.py). Cada
// decisión se guarda al tomarla: salir, minimizar o cerrar DEXIAE no pierde nada.
const RX = {est: null, tab: 'datos', sel: null, ident: null, pagina: 1, pg: null, campo: null,
            zModo: 'ancho', zoom: 1, abierto: '', tocar: false, palabras: null, elegidas: [], caja: null,
            docRegla: null, corrigiendo: null,
            cmp: null,                   // el documento «al lado» (15/10/2026): {ident, pagina, pg, campo, zModo, zoom}
            cambios: null,               // (16/10/2026) qué cambió al volver a evaluar
            cambiando: null, previa: null, // «Cambiar la decisión» de un caso decidido
            noUbico: null,               // el dato con valor que no se encontró en la hoja
            autoCmp: rxLeerAuto()};      // abrir solo el otro lado del cruce
const RX_BASE = 96 / 72;                 // 1 punto PDF = 1,333 px CSS (100 % = tamaño real)

const RX_OPS = {
  lectura: ['ti-pencil', 'Se leyó mal', 'El documento dice otra cosa: corregí el dato. No es un hallazgo.',
            'En el Excel: el dato corregido, con una nota de lo que se había leído.'],
  documento: ['ti-flag', 'El documento está mal', 'Se leyó bien, y lo que dice el documento no está bien.',
              'En el Excel: el dato como dice el documento, marcado como hallazgo confirmado.'],
  justificado: ['ti-circle-check', 'No es un problema', 'Pasa por algo que ya sabés: contá por qué.',
                'En el Excel: queda como está, con tu motivo.'],
  confirmado: ['ti-flag', 'Es un problema real', 'Queda como hallazgo confirmado.',
               'En el Excel: marcado, y en «Validación» la decisión.'],
  sacado: ['ti-file-minus', 'Sacar el documento del lote', 'No tenía que estar en este lote.',
           'En el Excel: el documento no sale.'],
  // (16/10/2026) se guarda: sigue pendiente, con la nota de qué falta
  despues: ['ti-clock', 'Dejar para después', 'Falta algo para decidirlo: anotá qué.',
            'En el Excel: sigue pendiente, en violeta, con tu nota. Lo retomás desde el Historial.'],
};
const RX_TXT = {lectura: 'Se leyó mal: corregido', documento: 'Confirmado: el documento está mal',
                justificado: 'No es un problema', confirmado: 'Confirmado', sacado: 'Se sacó del lote',
                despues: 'Para después', no_aplica: 'No aplica', validado: 'Dato verificado'};
function rxLeerAuto() { try { return localStorage.getItem('rx_auto_cmp') !== '0'; } catch (e) { return true; } }

function rxEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c])); }
const rx$ = id => document.getElementById(id);

function rxMontar() {
  if (rx$('rx-vista')) return;
  const v = document.createElement('div');
  v.id = 'rx-vista'; v.className = 'rx-vista'; v.hidden = true;
  v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', 'Revisar antes de generar el Excel');
  v.innerHTML = `
  <div class="rx-hd">
    <h2>Revisá antes de generar el Excel</h2><span class="rx-ctx" id="rx-ctx"></span>
    <div class="rx-pasos"><span class="hecho">1 · Procesar ✓</span><span class="act">2 · Revisar</span><span>3 · Excel</span></div>
    <div class="rx-der">
      <button class="btn btn-ghost sm" onclick="rxDuda()" title="Armar el paquete para mandarnos este caso"><i class="ti ti-message-report"></i> Esto no me cierra</button>
      <button class="btn btn-ghost sm" id="rx-b-deshacer" onclick="rxDeshacer()" title="Deshacer la última decisión (Ctrl+Z)"><i class="ti ti-arrow-back-up"></i> Deshacer</button>
      <button class="btn btn-ghost sm" onclick="rxMinimizar()" title="Seguir usando DEXIAE y volver después"><i class="ti ti-minus"></i> Minimizar</button>
      <button class="btn btn-ghost sm" onclick="rxSeguirDespues()" aria-label="Cerrar" title="Salir sin generar: lo decidido queda guardado"><i class="ti ti-x"></i></button>
    </div>
  </div>
  <div class="rx-franja"><span class="rx-chip ok" id="rx-c-ok"></span><span class="rx-chip rev" id="rx-c-rev"></span><span class="rx-chip err" id="rx-c-err"></span><span class="rx-chip desp" id="rx-c-desp" hidden></span>
    <span class="nota">Lo que coincide ya está listo. Acá, sólo lo que necesita tu criterio.</span></div>
  <div class="rx-tabs">
    <button class="rx-tab" id="rx-t-datos" onclick="rxPestana('datos')"><i class="ti ti-forms"></i> Datos de los documentos <span class="n" id="rx-n-datos"></span></button>
    <button class="rx-tab" id="rx-t-reglas" onclick="rxPestana('reglas')"><i class="ti ti-list-check"></i> Reglas del set <span class="n" id="rx-n-reglas"></span></button>
    <div class="rx-atajos"><span><kbd>↑</kbd><kbd>↓</kbd> casos</span><span><kbd>+</kbd><kbd>−</kbd> zoom</span><span><kbd>0</kbd> al ancho</span><span><kbd>Ctrl</kbd>+rueda zoom</span></div>
  </div>
  <div class="rx-cuerpo">
    <div class="rx-col" id="rx-lista"></div>
    <div class="rx-col rx-visor">
      <div class="rx-vbar"><span class="arch" id="rx-v-arch"></span><span id="rx-v-meta"></span>
        <div class="der">
          <div class="rx-grp"><button id="rx-p-ant" onclick="rxPagina(-1)" aria-label="Página anterior"><i class="ti ti-chevron-left"></i></button><span class="pct" id="rx-v-pag">1 / 1</span><button id="rx-p-sig" onclick="rxPagina(1)" aria-label="Página siguiente"><i class="ti ti-chevron-right"></i></button></div>
          <div class="rx-grp"><button onclick="rxZoomPaso(-1)" aria-label="Alejar"><i class="ti ti-minus"></i></button><span class="pct" id="rx-v-pct">100 %</span><button onclick="rxZoomPaso(1)" aria-label="Acercar"><i class="ti ti-plus"></i></button></div>
          <div class="rx-grp"><button id="rx-z-ancho" onclick="rxZoomModo('ancho')" title="Al ancho (0)"><i class="ti ti-arrows-horizontal"></i></button><button id="rx-z-pagina" onclick="rxZoomModo('pagina')" title="Página entera"><i class="ti ti-file"></i></button></div>
        </div></div>
      <div class="rx-aviso-tocar"><i class="ti ti-hand-finger"></i> Tocá en la página el valor correcto (podés tocar varias palabras). <kbd>Esc</kbd> cancela.
        <a style="margin-left:auto;color:#bfe8d4;cursor:pointer" onclick="rxSalirTocar()">Cancelar</a></div>
      <div class="rx-lienzos">
        <div class="rx-lienzo" id="rx-lienzo"></div>
        <div class="rx-cmp" id="rx-cmp" hidden>
          <div class="rx-vbar"><i class="ti ti-columns-2" style="color:var(--teal-l)"></i><span class="arch" id="rx-cmp-arch"></span>
            <div class="der"><div class="rx-grp"><button id="rx-cmp-ant" onclick="rxCmpPagina(-1)" aria-label="Página anterior"><i class="ti ti-chevron-left"></i></button><span class="pct" id="rx-cmp-pag">1 / 1</span><button id="rx-cmp-sig" onclick="rxCmpPagina(1)" aria-label="Página siguiente"><i class="ti ti-chevron-right"></i></button></div>
              <div class="rx-grp"><button onclick="rxCmpZoomPaso(-1)" aria-label="Alejar"><i class="ti ti-minus"></i></button><span class="pct" id="rx-cmp-pct">100 %</span><button onclick="rxCmpZoomPaso(1)" aria-label="Acercar"><i class="ti ti-plus"></i></button><button id="rx-cmp-ancho" onclick="rxCmpAncho()" title="Al ancho"><i class="ti ti-arrows-horizontal"></i></button></div>
              <button class="btn btn-ghost sm" onclick="rxIntercambiar()" title="Pasarlo a la izquierda (para corregir sus datos) y el de la izquierda, acá"><i class="ti ti-arrows-exchange"></i></button>
              <button class="btn btn-ghost sm" onclick="rxCmpCerrar()" title="Cerrar la comparación" aria-label="Cerrar la comparación"><i class="ti ti-x"></i></button></div></div>
          <div class="rx-lienzo rx-lienzo-b" id="rx-lienzo-b"></div>
        </div>
      </div>
    </div>
    <div class="rx-col" id="rx-panel"></div>
  </div>
  <div class="rx-pie"><span class="med" id="rx-med"></span>
    <div class="der">
      <button class="btn btn-ghost" onclick="rxSeguirDespues()" title="Salir sin generar: lo decidido queda guardado y la seguís desde el Historial"><i class="ti ti-clock-pause"></i> Seguir después</button>
      <button class="btn btn-ghost" id="rx-b-como" onclick="rxGenerar(true)" title="Generar ahora: lo que falta decidir sale marcado"><i class="ti ti-file-export"></i> Generar como salió</button>
      <button class="btn btn-primary" id="rx-b-gen" onclick="rxGenerar(false)"><i class="ti ti-table-export"></i> Generar Excel</button>
    </div></div>
  <div class="rx-col" id="rx-final" hidden style="flex:1"></div>`;
  document.body.appendChild(v);
  const p = document.createElement('div');
  p.id = 'rx-pastilla'; p.className = 'rx-pastilla'; p.hidden = true;
  p.innerHTML = `<i class="ti ti-list-check" style="color:var(--teal-l)"></i><span id="rx-pastilla-t"></span><button class="btn btn-primary sm" onclick="rxVolver()">Seguir</button>`;
  document.body.appendChild(p);
  rxArrastre();
}

// ── Abrir y pintar ──────────────────────────────────────────────────────────
async function rxAbrir(loteId) {
  rxMontar();
  // ⚠️ Una revisión minimizada de OTRO lote no se pisa sin avisar (30/09/2026:
  // el usuario minimizó una, corrió otro lote y la perdió de vista). Lo
  // decidido ya está guardado; se pregunta y la anterior queda «sin terminar».
  const prev = RX.est, enFinal = rx$('rx-vista').classList.contains('final');
  if (prev && loteId != null && !enFinal) {
    if (prev.lote_id === loteId) { if (rx$('rx-vista').hidden) rxVolver(); return true; }
    const n = (prev.casos || []).filter(c => c.pendiente).length;
    const ok = await appConfirm('Otra revisión en curso',
      `Tenés sin terminar la revisión de ${prev.nombre || 'Lote #' + prev.lote_id} (${n} por decidir).`
      + '\nLo decidido ya está guardado: la seguís desde el Historial con «Revisar».'
      + '\n¿Abrir la revisión de este lote?');
    if (!ok) return false;
    await PY.call('rx_cerrar');
    RX.est = null; rx$('rx-pastilla').hidden = true;
  }
  const r = await PY.call('rx_abrir', loteId == null ? null : loteId);
  if (!r || !r.ok || !Array.isArray(r.casos)) {
    UI.toast((r && r.error) || 'La revisión se prueba con la maqueta en modo demo.', r && r.error ? 'err' : 'info');
    return false;
  }
  RX.est = r; RX.tab = 'datos'; RX.sel = null; RX.ident = null; RX.pg = null; RX.abierto = '';
  // primero lo que falta decidir; lo que quedó «para después», al final
  const _ya = c => c.pendiente && !c.despues;
  const primero = rxCasos('datos').find(_ya) || rxCasos('reglas').find(_ya)
    || rxCasos('datos').find(c => c.pendiente) || rxCasos('reglas').find(c => c.pendiente) || r.casos[0];
  if (primero) { RX.tab = primero.clase === 'regla' ? 'reglas' : 'datos'; }
  rx$('rx-final').hidden = true; rx$('rx-vista').classList.remove('final'); rxPasos('revisar');
  rx$('rx-vista').hidden = false; rx$('rx-pastilla').hidden = true;
  if (primero) await rxElegir(primero.id); else rxPintar();
  return true;
}
function rxDesdeHistorial(id, ev) { if (ev) ev.stopPropagation(); rxAbrir(id); }
function rxCasos(tab) { return (RX.est && RX.est.casos || []).filter(c => (c.clase === 'regla') === (tab === 'reglas')); }
function rxCaso() { return (RX.est && RX.est.casos || []).find(c => c.id === RX.sel) || null; }
function rxPintar() { rxContar(); rxLista(); rxPanel(); rxDibujar(); }

function rxContar() {
  const e = RX.est; if (!e) return;
  const conCaso = new Set(e.casos.filter(c => c.ident).map(c => c.ident));
  e.casos.filter(c => c.clase === 'regla').forEach(c => (c.docs || []).forEach(d => conCaso.add(d)));
  const pend = e.casos.filter(c => c.pendiente);
  const b = e.bloquean, r = pend.length - b;
  rx$('rx-ctx').textContent = `${e.nombre || 'Lote #' + e.lote_id} · ${e.documentos} fila(s) · ${e.excel}`;
  rx$('rx-c-ok').innerHTML = `<i class="ti ti-circle-check"></i> ${Math.max(0, e.documentos - conCaso.size)} sin dudas`;
  rx$('rx-c-rev').innerHTML = `<i class="ti ti-eye-check"></i> ${r} para confirmar`;
  rx$('rx-c-err').innerHTML = `<i class="ti ti-alert-octagon"></i> ${b} bloquea${b === 1 ? '' : 'n'}`;
  // (16/10/2026) «para después» se guarda y se cuenta aparte (siguen pendientes)
  const nd0 = pend.filter(c => c.despues).length, bd = pend.filter(c => c.despues && c.severidad === 'bloquea').length;
  const cd = rx$('rx-c-desp'); cd.hidden = !nd0; cd.innerHTML = `<i class="ti ti-clock"></i> ${nd0} para después`;
  const nd = rxCasos('datos').filter(c => c.pendiente), nr = rxCasos('reglas').filter(c => c.pendiente);
  const td = rx$('rx-n-datos'), tr = rx$('rx-n-reglas');
  td.textContent = nd.length; td.className = 'n' + (nd.length ? (nd.some(c => c.severidad === 'bloquea') ? ' b' : '') : ' cero');
  tr.textContent = nr.length; tr.className = 'n' + (nr.length ? (nr.some(c => c.severidad === 'bloquea') ? ' b' : '') : ' cero');
  rx$('rx-t-datos').classList.toggle('act', RX.tab === 'datos');
  rx$('rx-t-reglas').classList.toggle('act', RX.tab === 'reglas');
  rx$('rx-b-gen').disabled = b > 0;
  rx$('rx-b-como').style.display = b > 0 ? '' : 'none';
  // lo que bloquea y quedó TODO para después: el Excel sale con esos, anotados
  rx$('rx-b-como').innerHTML = b > 0 && bd === b ? `<i class="ti ti-file-export"></i> Generar con ${nd0} para después`
    : '<i class="ti ti-file-export"></i> Generar como salió';
  rx$('rx-b-deshacer').disabled = !e.decisiones;
  rx$('rx-med').textContent = b ? (bd === b ? `Lo que bloquea quedó para después (${b}): el Excel sale con esos casos en violeta y tu nota.`
      : `Falta decidir ${b - bd} que bloquea${b - bd === 1 ? '' : 'n'} el Excel. Podés dejarlo para después o generarlo como salió.`)
    : (r ? `Podés generar el Excel: ${r} quedan para confirmar y salen marcados «sin revisar»${nd0 ? ` (${nd0} para después, con tu nota)` : ''}.` : 'Todo decidido: el Excel sale listo.');
  if (e.reglas_error) rx$('rx-med').textContent += ` ⚠️ Las reglas no se pudieron volver a evaluar: ${e.reglas_error}`;
}

function rxLista() {
  const cs = rxCasos(RX.tab);
  if (!cs.length) {
    rx$('rx-lista').innerHTML = `<div class="rx-vacio">${RX.tab === 'reglas' ? 'Ninguna regla del set marca nada en este lote.' : 'Ningún dato necesita tu criterio.'}</div>`;
    return;
  }
  const grupos = [['bloquea', 'Bloquean el Excel'], ['confirmar', 'Para confirmar'], ['informativo', 'Para mirar']];
  let h = '';
  grupos.forEach(([sev, t]) => {
    const xs = cs.filter(c => c.pendiente && c.severidad === sev && !c.despues);
    if (!xs.length) return;
    h += `<div class="rx-grupo"><span>${t}</span><span>${xs.length}</span></div>` + xs.map(rxItem).join('');
  });
  const luego = cs.filter(c => c.pendiente && c.despues);
  if (luego.length) h += `<div class="rx-grupo"><span>Para después</span><span>${luego.length}</span></div>` + luego.map(rxItem).join('');
  const hechos = cs.filter(c => !c.pendiente);
  if (hechos.length) h += `<div class="rx-grupo"><span>Decididos</span><span>${hechos.length}</span></div>` + hechos.map(rxItem).join('');
  rx$('rx-lista').innerHTML = h;
}
// El nombre de una regla: su código y el nombre que le dio el usuario; si no
// le dio uno, qué controla (nunca «R1 · R1»).
function rxNombreRegla(c) {
  const t = c.titulo && c.titulo !== c.codigo ? c.titulo : (c.control || c.detalle || '');
  return (c.codigo ? c.codigo + ' · ' : '') + t;
}
function rxItem(c) {
  const ico = c.pendiente ? (c.severidad === 'bloquea' ? 'ti-alert-octagon' : c.severidad === 'confirmar' ? 'ti-eye-check' : 'ti-info-circle') : 'ti-circle-check';
  const nom = c.clase === 'regla' ? rxNombreRegla(c) : c.ident;
  // con Detección automática, de qué plantilla es cada caso
  const pl = RX.est && RX.est.multihoja ? (c.plantilla || (c.clase === 'no_leido' ? 'sin plantilla' : '')) : '';
  const sub = (pl ? pl + ' · ' : '') + (c.clase === 'regla' ? (c.docs || []).join(' · ') : c.titulo + (c.columna ? ' · ' + c.columna : ''));
  // «para después»: con la nota de qué falta, a la vista en la lista
  const desp = c.despues ? `<div class="sub rx-sub-desp"><i class="ti ti-clock"></i> ${rxEsc(c.despues.nota || 'sin nota')}</div>` : '';
  return `<div class="rx-item ${c.id === RX.sel ? 'sel' : ''} ${c.pendiente ? '' : 'hecho'}" onclick="rxElegirClic('${rxEsc(c.id).replace(/'/g, "\\'")}')">
    <i class="ti ${c.despues ? 'ti-clock' : ico} ico rx-ico-${c.despues ? 'desp' : c.severidad}"></i><div><div class="nom">${rxEsc(nom)}</div><div class="sub">${rxEsc(sub)}</div>${desp}</div></div>`;
}
// Un clic del usuario en la lista: lo que había cambiado era del caso anterior.
function rxElegirClic(id) { RX.cambios = null; rxElegir(id); }

async function rxElegir(id) {
  RX.sel = id; RX.abierto = ''; RX.corrigiendo = null; RX.noUbico = null; rxSalirTocar(true);
  if (RX.cambiando !== id) { RX.cambiando = null; RX.previa = null; }
  if (RX.cmp) rxCmpCerrar(true);           // otro caso: lo de al lado era del anterior
  const c = rxCaso(); if (!c) { rxPintar(); return; }
  RX.tab = c.clase === 'regla' ? 'reglas' : 'datos';
  const marc = (c.evidencia || []).find(e => e.rol === 'marcado');
  const todos = [...(c.docs || []), ...(c.otros || []), ...(c.evidencia || []).map(e => e.ident)];
  const ident = c.clase === 'regla' ? (RX.docRegla && todos.includes(RX.docRegla) ? RX.docRegla : (marc ? marc.ident : (c.docs || [])[0])) : c.ident;
  RX.campo = c.columna || (c.columnas || [])[0] || null;
  rxPintar();
  if (ident) await rxCargar(ident, 1, true);
  // (16/10/2026, pedido del usuario: «¿no me tendría que traer la planilla para
  // comparar?») El otro lado del cruce se abre solo, al lado.
  if (RX.autoCmp && RX.sel === id) {
    const o = rxOtroLado(c, ident);
    if (o) rxComparar(o.ident, ((o.valores || [])[0] || [])[0]);
  }
}
// El otro lado del caso: otra plantilla (lo sumado, el posible par, el mismo
// grupo); si no hay, el posible par o lo sumado de la misma.
function rxOtroLado(c, ident) {
  const ev = (c && c.evidencia) || [], yo = ev.find(e => e.ident === ident), pl = yo ? yo.plantilla : '';
  const otros = ev.filter(e => e.ident !== ident);
  return otros.find(e => e.plantilla !== pl && e.rol !== 'marcado') || otros.find(e => e.plantilla !== pl)
    || otros.find(e => e.rol === 'par' || e.rol === 'sumado') || null;
}
function rxAutoCmp(v) {
  RX.autoCmp = !!v;
  try { localStorage.setItem('rx_auto_cmp', v ? '1' : '0'); } catch (e) {}
  if (v && !RX.cmp) { const c = rxCaso(), o = rxOtroLado(c, RX.ident); if (o) rxComparar(o.ident, ((o.valores || [])[0] || [])[0]); }
}

// ── La página ───────────────────────────────────────────────────────────────
async function rxCargar(ident, pagina, irAlDato) {
  const r = await PY.call('rx_pagina', ident, pagina || 1, 2);
  if (!r || !r.ok) {
    RX.pg = null; RX.ident = ident;
    rx$('rx-lienzo').innerHTML = `<div class="rx-sin-pdf">${rxEsc((r && r.error) || 'No se pudo mostrar la página')}</div>`;
    rx$('rx-v-arch').textContent = ident; rxPanel(); return;
  }
  RX.pg = r; RX.ident = ident; RX.pagina = r.pagina; RX.palabras = null;
  // ⚠️ el de al lado nunca es el mismo que está a la izquierda
  if (RX.cmp && RX.cmp.ident === ident) rxCmpCerrar(true);
  if (irAlDato && RX.campo) {
    const m = (r.marcas || []).find(x => x.columna === RX.campo);
    // (16/10/2026) un dato con valor que no se encontró en la hoja: se dice
    // (antes era sólo un ícono gris con un globito)
    // sólo si se pidió ir a ESE dato (al abrir un caso, su columna puede ser un
    // aviso que arma DEXIAE y no está en la hoja)
    RX.noUbico = RX.pedido === RX.campo ? rxNoUbico(m) : null;
    RX.pedido = null;
    const pg = m && m.cajas && m.cajas[0] && m.cajas[0].pagina;
    if (pg && pg !== r.pagina) { await rxCargar(ident, pg, false); return; }
  }
  rxPanel(); rxDibujar(true);
}
// Un dato que se puede buscar a ojo en la hoja (un número, un código, una
// fecha) y no se encontró. Los textos largos que arma DEXIAE (un aviso, un
// control) no están escritos en la hoja: no se avisa.
function rxNoUbico(m) {
  const v = String((m && (m.ver || m.valor)) || '').trim();
  if (!m || !v || (m.cajas || []).length || v.length > 30 || !/\d/.test(v) || v.split(/\s+/).length > 4) return null;
  return {columna: m.columna, ver: v};
}
// Ir a un dato de un documento (desde «Dónde mirar»): si está al lado, ahí;
// si no, a la izquierda, en la página del dato y resaltado.
async function rxIrA(ident, col) {
  if (RX.cmp && RX.cmp.ident === ident && ident !== RX.ident) {
    RX.cmp.campo = col || RX.cmp.campo; await rxCmpCargar(1, true); rxPanel(); return;
  }
  RX.campo = col || RX.campo; RX.corrigiendo = null;
  if (ident === RX.ident && RX.pg) {
    const m = (RX.pg.marcas || []).find(x => x.columna === RX.campo);
    RX.noUbico = rxNoUbico(m);
    const pg = m && m.cajas && m.cajas[0] && m.cajas[0].pagina;
    if (pg && pg !== RX.pagina) { await rxCargar(ident, pg, false); return; }
    rxPanel(); rxDibujar(true); return;
  }
  RX.docRegla = ident; RX.pedido = RX.campo;
  await rxCargar(ident, 1, true);
}
async function rxCopiarTexto(t) {
  try { await navigator.clipboard.writeText(t); }
  catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
  UI.toast('Copiado', 'ok');
}
function rxPagina(k) {
  if (!RX.pg || !RX.ident) return;
  const p = RX.pagina + k;
  if (p < 1 || p > (RX.pg.paginas || 1)) return;
  rxCargar(RX.ident, p, false);
}
function rxAnchoPts() { return RX.pg ? RX.pg.w / RX.pg.scale : 595; }
function rxAltoPts() { return RX.pg ? RX.pg.h / RX.pg.scale : 842; }
function rxZoomReal() {
  const lz = rx$('rx-lienzo'), w = rxAnchoPts() * RX_BASE, h = rxAltoPts() * RX_BASE;
  // 44 de márgenes + lo que ocupa la barra vertical cuando la página no entra
  if (RX.zModo === 'ancho') return Math.max(.25, (lz.clientWidth - 62) / w);
  if (RX.zModo === 'pagina') return Math.max(.2, Math.min((lz.clientWidth - 62) / w, (lz.clientHeight - 44) / h));
  return RX.zoom;
}
function rxZoomModo(m) { RX.zModo = m; rxDibujar(true); }
function rxZoomPaso(k, ancla) {
  const z0 = rxZoomReal(), pasos = [.5, .67, .75, .9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
  let z = k > 0 ? pasos.find(p => p > z0 + .01) : [...pasos].reverse().find(p => p < z0 - .01);
  if (!z) return;
  const lz = rx$('rx-lienzo'), f = z / z0;
  const ax = ancla ? ancla.x : lz.clientWidth / 2, ay = ancla ? ancla.y : lz.clientHeight / 2;
  const sx = (lz.scrollLeft + ax) * f - ax, sy = (lz.scrollTop + ay) * f - ay;
  RX.zModo = 'libre'; RX.zoom = z; rxDibujar(false);
  lz.scrollLeft = sx; lz.scrollTop = sy;
}
function rxCaja(u, cls, et, onclick) {
  return `<div class="${cls}" style="left:${u.x0 * 100}%;top:${u.y0 * 100}%;width:${(u.x1 - u.x0) * 100}%;height:${(u.y1 - u.y0) * 100}%"${onclick ? ` onclick="${onclick}"` : ''}>${et ? `<span class="et">${rxEsc(et)}</span>` : ''}</div>`;
}
function rxDibujar(centrar) {
  const lz = rx$('rx-lienzo');
  if (!RX.pg) { if (!RX.ident) lz.innerHTML = ''; return; }
  const z = rxZoomReal(), ancho = Math.round(rxAnchoPts() * RX_BASE * z);
  rx$('rx-v-pct').textContent = Math.round(z * 100) + ' %';
  rx$('rx-z-ancho').classList.toggle('act', RX.zModo === 'ancho');
  rx$('rx-z-pagina').classList.toggle('act', RX.zModo === 'pagina');
  rx$('rx-v-arch').textContent = rxNombreDoc(RX.ident);
  rx$('rx-v-pag').textContent = `${RX.pagina} / ${RX.pg.paginas || 1}`;
  rx$('rx-p-ant').disabled = RX.pagina <= 1; rx$('rx-p-sig').disabled = RX.pagina >= (RX.pg.paginas || 1);
  const nu = RX.noUbico;
  rx$('rx-v-meta').innerHTML = nu ? `<span class="rx-noubico" title="El valor está en el Excel pero no lo encuentro escrito igual en esta hoja"><i class="ti ti-search"></i> No ubico ${rxEsc(nu.columna)} en la hoja: buscá <b>${rxEsc(nu.ver)}</b>`
    + ` <button class="rx-mini" onclick="rxCopiarTexto(RX.noUbico.ver)" title="Copiar"><i class="ti ti-copy"></i></button></span>` : '';
  const c = rxCaso(), marcadas = new Set(rxColsDe(RX.ident));
  let h = `<div class="rx-hoja" style="width:${ancho}px"><img src="${RX.pg.img}" alt="">`;
  // (06/10/2026, auditoría 1.B) un dato corregido se marca donde lo marcó el
  // usuario (verde) y lo que había leído el motor queda tenue y tachado
  (RX.pg.marcas || []).forEach(m => {
    const sel = m.columna === RX.campo || marcadas.has(m.columna);
    const clic = `rxElegirCampo('${rxEsc(m.columna).replace(/'/g, "\\'")}')`;
    const corr = String(m.fuente || '').startsWith('usuario');
    if (corr && sel) ((m.antes && m.antes.cajas) || []).filter(k => (k.pagina || 1) === RX.pagina)
      .forEach(k => { h += rxCaja(k, 'rx-m antes', 'se había leído', clic); });
    (m.cajas || []).filter(k => (k.pagina || 1) === RX.pagina).forEach(k => {
      h += rxCaja(k, `rx-m ${sel ? 'sel' : 'tenue'} ${m.fuente === 'respaldo' || m.fuente === 'usuario_ubicado' ? 'resp' : ''} ${corr ? 'corr' : ''}`,
                  corr ? `${m.columna} · corregido` : (m.columna === RX.campo && m.ver ? `${m.columna} · ${m.ver}` : m.columna), clic);
    });
  });
  if (RX.caja && (RX.caja.pagina || 1) === RX.pagina) h += rxCaja(RX.caja, 'rx-m nuevo', 'lo que tocaste');
  if (RX.tocar && RX.palabras) RX.palabras.forEach((w, i) => { h += rxCaja(w, 'rx-w' + (RX.elegidas.includes(i) ? ' elegida' : ''), '', `rxTocar(${i})`); });
  lz.innerHTML = h + '</div>';
  if (centrar) requestAnimationFrame(() => { const m = lz.querySelector('.rx-m.sel'); if (m) m.scrollIntoView({block: 'center', inline: 'center'}); });
}
function rxElegirCampo(col) { if (RX.tocar) return; RX.campo = col; rxPanel(); rxDibujar(false); }

// ── Comparar: otro documento al lado (15/10/2026, pedido del usuario) ───────
// Un caso que cruza documentos (la planilla contra sus comprobantes, una
// transferencia contra su factura) se mira con los dos a la vista. El de al
// lado se ve al ancho, con sus marcas; las columnas del caso, resaltadas.
// (16/10/2026) Con zoom, Ctrl+rueda y manito, en la página del dato, y
// «intercambiar» para corregir el de la derecha. Nunca el mismo documento.
async function rxComparar(ident, col) {
  if (!ident || ident === RX.ident) return;
  const prev = RX.cmp;
  RX.cmp = {ident, pagina: 1, pg: null, campo: col || null,
            zModo: prev ? prev.zModo : 'ancho', zoom: prev ? prev.zoom : 1};
  rx$('rx-cmp').hidden = false; rx$('rx-vista').classList.add('comparando');
  rx$('rx-cmp-arch').textContent = rxNombreDoc(ident);
  rx$('rx-lienzo-b').innerHTML = '<div class="rx-sin-pdf">Cargando…</div>';
  rxDibujar(true);                         // el principal se angosta: se recalcula
  rxPanel();
  await rxCmpCargar(1, true);
}
// Las columnas a resaltar en un documento: el dato elegido, las del caso y las
// que «Dónde mirar» muestra de ese documento.
function rxColsDe(ident) {
  const c = rxCaso(), s = new Set();
  if (RX.cmp && RX.cmp.ident === ident && RX.cmp.campo) s.add(RX.cmp.campo);
  if (c && c.clase === 'regla') (c.columnas || []).forEach(x => s.add(x));
  ((c && c.evidencia) || []).filter(e => e.ident === ident).forEach(e => (e.valores || []).forEach(([col]) => s.add(col)));
  return [...s];
}
async function rxCmpCargar(pagina, irAlDato) {
  const k = RX.cmp; if (!k) return;
  const r = await PY.call('rx_pagina', k.ident, pagina || 1, 2);
  if (RX.cmp !== k) return;                // se cerró o se cambió mientras cargaba
  if (!r || !r.ok) {
    k.pg = null;
    rx$('rx-lienzo-b').innerHTML = `<div class="rx-sin-pdf">${rxEsc((r && r.error) || 'No se pudo mostrar la página')}</div>`;
    return;
  }
  k.pg = r; k.pagina = r.pagina;
  if (irAlDato) {
    const cols = rxColsDe(k.ident);
    const m = (r.marcas || []).find(x => x.columna === k.campo && (x.cajas || []).length)
      || (r.marcas || []).find(x => cols.includes(x.columna) && (x.cajas || []).length);
    const pg = m && m.cajas[0].pagina;
    if (pg && pg !== r.pagina) { await rxCmpCargar(pg, false); return; }
  }
  rxCmpDibujar(true);
}
function rxCmpPagina(d) {
  const k = RX.cmp; if (!k || !k.pg) return;
  const p = k.pagina + d;
  if (p < 1 || p > (k.pg.paginas || 1)) return;
  rxCmpCargar(p);
}
function rxCmpCerrar(silencio) {
  RX.cmp = null;
  const b = rx$('rx-cmp'); if (b) b.hidden = true;
  const v = rx$('rx-vista'); if (v) v.classList.remove('comparando');
  const l = rx$('rx-lienzo-b'); if (l) l.innerHTML = '';
  if (!silencio) { rxDibujar(true); rxPanel(); }
}
function rxCmpZoomReal() {
  const k = RX.cmp, lz = rx$('rx-lienzo-b');
  if (!k || !k.pg) return 1;
  const w = k.pg.w / k.pg.scale * RX_BASE;
  return k.zModo === 'ancho' ? Math.max(.2, (lz.clientWidth - 62) / w) : k.zoom;
}
function rxCmpAncho() { if (RX.cmp) { RX.cmp.zModo = 'ancho'; rxCmpDibujar(true); } }
function rxCmpZoomPaso(d, ancla) {
  const k = RX.cmp; if (!k || !k.pg) return;
  const z0 = rxCmpZoomReal(), pasos = [.5, .67, .75, .9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
  const z = d > 0 ? pasos.find(p => p > z0 + .01) : [...pasos].reverse().find(p => p < z0 - .01);
  if (!z) return;
  const lz = rx$('rx-lienzo-b'), f = z / z0;
  const ax = ancla ? ancla.x : lz.clientWidth / 2, ay = ancla ? ancla.y : lz.clientHeight / 2;
  const sx = (lz.scrollLeft + ax) * f - ax, sy = (lz.scrollTop + ay) * f - ay;
  k.zModo = 'libre'; k.zoom = z; rxCmpDibujar(false);
  lz.scrollLeft = sx; lz.scrollTop = sy;
}
function rxCmpDibujar(centrar) {
  const k = RX.cmp, lz = rx$('rx-lienzo-b');
  if (!k || !k.pg || !lz) return;
  const w = k.pg.w / k.pg.scale * RX_BASE, z = rxCmpZoomReal(), ancho = Math.round(w * z);
  rx$('rx-cmp-arch').textContent = k.pg.archivo ? rxNombreDoc(k.ident) : k.ident;
  rx$('rx-cmp-pag').textContent = `${k.pagina} / ${k.pg.paginas || 1}`;
  rx$('rx-cmp-pct').textContent = Math.round(z * 100) + ' %';
  rx$('rx-cmp-ancho').classList.toggle('act', k.zModo === 'ancho');
  rx$('rx-cmp-ant').disabled = k.pagina <= 1; rx$('rx-cmp-sig').disabled = k.pagina >= (k.pg.paginas || 1);
  const marcadas = new Set(rxColsDe(k.ident));
  let h = `<div class="rx-hoja" style="width:${ancho}px"><img src="${k.pg.img}" alt="">`;
  (k.pg.marcas || []).forEach(m => (m.cajas || []).filter(q => (q.pagina || 1) === k.pagina).forEach(q => {
    const sel = m.columna === k.campo || marcadas.has(m.columna);
    h += rxCaja(q, `rx-m ${sel ? 'sel' : 'tenue'} ${m.fuente === 'respaldo' ? 'resp' : ''}`, sel && m.ver ? `${m.columna} · ${m.ver}` : m.columna, '');
  }));
  lz.innerHTML = h + '</div>';
  if (centrar) requestAnimationFrame(() => { const m = lz.querySelector('.rx-m.sel'); if (m) m.scrollIntoView({block: 'center', inline: 'center'}); });
}
// El de la derecha pasa a la izquierda (ahí se corrigen sus datos) y al revés.
async function rxIntercambiar() {
  const k = RX.cmp; if (!k || !RX.ident) return;
  const izq = RX.ident, izqCampo = RX.campo;
  RX.docRegla = k.ident; RX.campo = k.campo || RX.campo; RX.corrigiendo = null;
  rxCmpCerrar(true);
  await rxCargar(k.ident, 1, true);
  await rxComparar(izq, izqCampo);
}
// «Planilla · rendición.pdf · fila 14»: el documento con su plantilla y, si dio
// varias filas, cuál.
function rxNombreDoc(ident, plantilla) {
  const m = String(ident || '').match(/^(.*)#(\d+)$/);
  const pl = plantilla != null ? plantilla : ((rxCaso() && (rxCaso().evidencia || []).find(e => e.ident === ident)) || {}).plantilla || '';
  return (pl ? pl + ' · ' : '') + (m ? `${m[1]} · fila ${m[2]}` : ident);
}

// ── El panel ────────────────────────────────────────────────────────────────
function rxRastro(d) {
  if (!d) return '';
  const hora = d.hora_utc ? new Date(d.hora_utc).toLocaleString('es-AR', {dateStyle: 'short', timeStyle: 'short'}) : '';
  return `${rxEsc(d.usuario)} · ${rxEsc(d.equipo)} · ${hora}${d.huella ? ' · huella ' + rxEsc(d.huella) : ''}`;
}
function rxOpcion(tipo) {
  const [ico, t, s] = RX_OPS[tipo];
  return `<button class="rx-op ${RX.abierto === tipo ? 'abierta' : ''}" onclick="rxAbrirOp('${tipo}')"><i class="ti ${ico}"></i><div><b>${t}</b><span>${s}</span></div></button>`
    + (RX.abierto === tipo ? rxForm(tipo) : '');
}
// (15/10/2026, pedido del usuario) Todo formulario abierto se puede cerrar sin
// decidir nada: el botón «Cancelar» y la tecla Esc.
const RX_CANCELAR = `<button class="btn btn-ghost sm" onclick="rxCancelarForm()">Cancelar</button>`;
function rxForm(tipo) {
  const c = rxCaso(), ex = `<div class="rx-excel"><i class="ti ti-file-spreadsheet"></i>${RX_OPS[tipo][3]}</div>`;
  if (tipo === 'lectura') return `<div class="rx-form"><label>El valor correcto</label>
      <input type="text" id="rx-valor" value="${rxEsc(RX.valorTocado || '')}" placeholder="Escribilo o tocá el PDF">
      <div class="fila-b"><button class="btn btn-ghost sm" onclick="rxEntrarTocar()"><i class="ti ti-hand-finger"></i> Tocar en el PDF</button>
      ${RX_CANCELAR}<button class="btn btn-primary sm" onclick="rxGuardar('lectura')">Guardar</button></div>${ex}</div>`;
  if (tipo === 'documento') return `<div class="rx-form"><label>Qué tiene mal el documento (y qué se hace, si lo sabés)</label>
      <textarea id="rx-nota" placeholder="Ej.: la nota de crédito no trae el total; se pidió al proveedor"></textarea>
      <label>El valor que va al Excel (vacío = como dice el documento)</label><input type="text" id="rx-valor" value="">
      <div class="fila-b">${RX_CANCELAR}<button class="btn btn-primary sm" onclick="rxGuardar('documento')">Guardar</button></div>${ex}</div>`;
  if (tipo === 'sacado') return `<div class="rx-form">${(c.docs || []).length
        ? `<label>¿Cuál sale del lote?</label>` + c.docs.map((d, i) => `<label class="rx-radio"><input type="radio" name="rx-sale" value="${rxEsc(d)}" ${i === 0 ? 'checked' : ''}> ${rxEsc(d)}</label>`).join('')
        : `<label>Sale del lote: <b>${rxEsc(c.ident)}</b></label>`}
      <textarea id="rx-nota" placeholder="Por qué (opcional)"></textarea>
      <div class="fila-b">${RX_CANCELAR}<button class="btn btn-primary sm" onclick="rxGuardar('sacado')">Sacar del lote</button></div>${ex}</div>`;
  if (tipo === 'despues') return `<div class="rx-form"><label>Qué falta para decidirlo (opcional)</label>
      <textarea id="rx-nota" placeholder="Ej.: pedir la factura al proveedor">${rxEsc((rxCaso().despues || {}).nota || '')}</textarea>
      <div class="fila-b">${RX_CANCELAR}<button class="btn btn-primary sm" onclick="rxGuardar('despues')">Dejar para después</button></div>${ex}</div>`;
  const oblig = tipo === 'justificado';
  return `<div class="rx-form"><label>${oblig ? 'Por qué no es un problema (sin motivo no se cierra)' : 'Qué se hace (opcional)'}</label>
      <textarea id="rx-nota" placeholder="${oblig ? 'Ej.: el CAE va en el remito' : 'Ej.: se reclamó al proveedor'}"></textarea>
      <div class="fila-b">${RX_CANCELAR}<button class="btn btn-primary sm" onclick="rxGuardar('${tipo}')">Guardar</button></div>${ex}</div>`;
}
function rxAbrirOp(t) { RX.abierto = RX.abierto === t ? '' : t; if (t !== 'lectura') RX.caja = null; rxPanel(); }
// Cierra el formulario que esté abierto (decisión o «Se leyó mal este dato») sin
// guardar nada. Devuelve si había alguno.
function rxCancelarForm() {
  const habia = !!(RX.abierto || RX.corrigiendo || RX.cambiando);
  RX.abierto = ''; RX.corrigiendo = null; RX.caja = null; RX.valorTocado = '';
  RX.cambiando = null; RX.previa = null;
  rxSalirTocar(true);
  rxPanel();
  if (typeof rxDibujar === 'function') rxDibujar(false);
  return habia;
}

function rxCamposDoc() {
  const ms = (RX.pg && RX.pg.marcas) || [];
  if (!ms.length) return '';
  const nv = ms.filter(m => m.campo && m.campo.tipo === 'validado').length;
  return `<div class="rx-tit">Datos de ${rxEsc(rxNombreDoc(RX.ident))}${nv ? ` <span class="rx-tit-n">${nv} de ${ms.length} verificado${nv === 1 ? '' : 's'}</span>` : ''}</div>` + ms.map(m => {
    const antes = m.antes ? ` · se había leído «${m.antes.valor || 'vacío'}»` : '';
    const d = m.fuente === 'usuario' ? `<i class="ti ti-hand-finger rx-d-corr" title="Lo marcaste vos${rxEsc(antes)}"></i>`
      : m.fuente === 'usuario_ubicado' ? `<i class="ti ti-pencil rx-d-corr" title="Corregido (escrito); ubicado después en la página${rxEsc(antes)}"></i>`
      : m.fuente === 'usuario_sin_lugar' ? `<i class="ti ti-pencil rx-d-corr" title="Corregido (escrito); no está en la página${rxEsc(antes)}"></i>`
      : !m.valor ? '<i class="ti ti-circle-dashed rx-d-no" title="Vacío"></i>'
      : m.fuente === 'motor' ? '<i class="ti ti-target rx-d-motor" title="Donde leyó el motor"></i>'
      : m.fuente === 'respaldo' ? `<i class="ti ti-target rx-d-resp" title="Ubicado después (${rxEsc(m.por || '')})"></i>`
      : '<i class="ti ti-help-circle rx-d-no" title="No lo encuentro escrito igual en la hoja"></i>';
    // (16/10/2026) la marca del campo: «dato verificado» o «no aplica»
    const t = m.campo && m.campo.tipo;
    const mc = t === 'validado' ? `<i class="ti ti-circle-check rx-d-ok" title="Dato verificado por vos (${rxEsc(rxRastro(m.campo))})"></i>`
      : t === 'no_aplica' ? `<span class="rx-na" title="No aplica (${rxEsc(rxRastro(m.campo))})">N/A</span>` : '';
    const sel = m.columna === RX.campo;
    return `<div class="rx-fila ${sel ? 'sel' : ''} ${t === 'no_aplica' ? 'na' : ''}" data-c="${rxEsc(m.columna)}" onclick="rxElegirCampo(this.dataset.c)">
      <span class="c">${rxEsc(m.columna)}</span><span class="v ${m.valor ? '' : 'vacio'}">${rxEsc(m.valor ? (m.ver || m.valor) : 'vacío')}</span>${mc || d}</div>`
      + (sel && RX.corrigiendo !== m.columna ? rxAccionesCampo(m) : '')
      + (sel && RX.corrigiendo === m.columna ? `<div class="rx-form" style="margin:0 16px 8px"><label>El valor correcto de ${rxEsc(m.columna)}</label>
          <input type="text" id="rx-valor" value="${rxEsc(RX.valorTocado || '')}"><div class="fila-b">
          <button class="btn btn-ghost sm" onclick="rxEntrarTocar()"><i class="ti ti-hand-finger"></i> Tocar en el PDF</button>
          ${RX_CANCELAR}<button class="btn btn-primary sm" onclick="rxGuardarCorreccion()">Guardar</button></div>
          <div class="rx-excel"><i class="ti ti-file-spreadsheet"></i>Se corrige el dato y las reglas se vuelven a controlar: te digo qué cambió.</div></div>` : '');
  }).join('') + `<div class="rx-leyenda"><span><i class="ti ti-target rx-d-motor"></i> donde leyó el motor</span><span><i class="ti ti-target rx-d-resp"></i> ubicado después</span>${ms.some(m => m.antes) ? '<span><i class="ti ti-hand-finger rx-d-corr"></i> corregido por vos</span>' : ''}<span><i class="ti ti-circle-check rx-d-ok"></i> verificado</span><span><i class="ti ti-circle-dashed rx-d-no"></i> vacío</span></div>`;
}
// (16/10/2026, pedido del usuario: «un check para validar el dato y un no
// aplica») Las acciones del dato elegido, para cualquier caso.
function rxAccionesCampo(m) {
  const t = m.campo && m.campo.tipo;
  return `<div class="rx-campo-acc">
    <button class="rx-mini ${t === 'validado' ? 'act' : ''}" onclick="rxCampo('validado')" title="${t === 'validado' ? 'Quitar la marca' : 'Lo comparaste con el documento y está bien leído'}"><i class="ti ti-circle-check"></i> Verificado</button>
    <button class="rx-mini ${t === 'no_aplica' ? 'act' : ''}" onclick="rxCampo('no_aplica')" title="${t === 'no_aplica' ? 'Quitar la marca' : 'Este dato no corresponde a este documento (p. ej., el CAE en una factura de servicios). Cierra lo que sólo marca este dato.'}"><i class="ti ti-ban"></i> No aplica</button>
    <button class="rx-mini" onclick="rxCorregirCampo()" title="El documento dice otra cosa: corregilo y se vuelve a controlar"><i class="ti ti-pencil"></i> Se leyó mal</button></div>`;
}
// (16/10/2026) Qué cambió al volver a controlar las reglas, a la vista hasta
// que se elige otro caso (antes: un aviso de 3 segundos que no decía nada).
function rxCambiosHtml() {
  const k = RX.cambios; if (!k) return '';
  const res = k.resueltos || [], sig = k.siguen || [], nue = k.nuevos || [];
  if (k.de === 'campo' && !res.length && !nue.length) return '';
  let h = '';
  res.forEach(n => { h += `<div class="ok"><i class="ti ti-circle-check"></i><div>Se resolvió: <b>${rxEsc(n)}</b></div></div>`; });
  sig.forEach(s => { h += `<div class="${s.cambio ? 'sigue' : 'igual'}"><i class="ti ti-${s.cambio ? 'refresh' : 'equal'}"></i><div>${s.cambio ? 'Sigue, ahora' : 'Sigue igual'}: <b>${rxEsc(s.nombre)}</b><span>${rxEsc(s.cuenta || s.detalle)}</span></div></div>`; });
  nue.forEach(n => { h += `<div class="nuevo"><i class="ti ti-alert-triangle"></i><div>Apareció: <b>${rxEsc(n.nombre)}</b><span>${rxEsc(n.detalle)}</span></div></div>`; });
  if (!h) h = '<div class="igual"><i class="ti ti-info-circle"></i><div>Ningún hallazgo pendiente toca este documento.</div></div>';
  return `<div class="rx-cambios"><div class="t"><span>Al volver a controlar</span><button class="rx-mini" onclick="RX.cambios=null;rxPanel()" aria-label="Cerrar"><i class="ti ti-x"></i></button></div>${h}</div>`;
}
// (16/10/2026, pedido del usuario: «que sea más claro dónde mirar y cómo
// llegar al hallazgo») Cada documento del caso con su papel y los valores que
// importan: un clic lleva al dato; el botón, al lado.
function rxRolTxt(e) {
  return ({marcado: 'Lo marcó la regla', sumado: 'Lo que se sumó', este: 'Este documento',
           par: e.ref_col ? `Mismo ${e.ref_col}: posible par` : 'Con el que se compara',
           grupo: `Del mismo grupo · ${e.clave || ''}`})[e.rol] || e.rol;
}
function rxDondeHtml(c) {
  const ev = c.evidencia || [];
  if (!ev.length) return '';
  let h = '', prev = '';
  ev.forEach(e => {
    const r = rxRolTxt(e);
    if (r !== prev) { h += `<div class="rx-ev-t">${rxEsc(r)}</div>`; prev = r; }
    const vista = e.ident === RX.ident, lado = RX.cmp && RX.cmp.ident === e.ident;
    const c0 = ((e.valores || [])[0] || [])[0] || '';
    const vals = (e.valores || []).map(([col, v]) => `<button class="rx-ev-v ${(vista && col === RX.campo) || (lado && col === RX.cmp.campo) ? 'act' : ''}" data-i="${rxEsc(e.ident)}" data-c="${rxEsc(col)}" onclick="rxIrA(this.dataset.i,this.dataset.c)" title="Ir a ${rxEsc(col)} en el documento"><span>${rxEsc(col)}</span><b class="${v ? '' : 'vacio'}">${rxEsc(v || 'vacío')}</b></button>`).join('');
    h += `<div class="rx-ev ${vista ? 'vista' : ''} ${lado ? 'lado' : ''}"><div class="doc"><a data-i="${rxEsc(e.ident)}" data-c="${rxEsc(c0)}" onclick="rxIrA(this.dataset.i,this.dataset.c)" title="Abrirlo a la izquierda"><i class="ti ti-file-text"></i> ${rxEsc(rxNombreDoc(e.ident, e.plantilla))}</a>`
      + (vista ? '<span class="rx-ev-tag">a la izquierda</span>' : lado ? '<span class="rx-ev-tag">al lado</span>'
         : `<button class="rx-al-lado" data-i="${rxEsc(e.ident)}" data-c="${rxEsc(c0)}" onclick="rxComparar(this.dataset.i,this.dataset.c)" title="Verlo al lado del que está a la vista"><i class="ti ti-columns-2"></i></button>`)
      + `</div>${vals ? `<div class="vals">${vals}</div>` : ''}</div>`;
  });
  return `<div class="rx-donde"><div class="rx-donde-cab"><span><i class="ti ti-map-pin"></i> Dónde mirar</span>
    <label class="rx-auto" title="Al elegir un caso, abrir al lado el otro lado del cruce"><input type="checkbox" ${RX.autoCmp ? 'checked' : ''} onchange="rxAutoCmp(this.checked)"> Abrir el otro lado</label></div>${h}</div>`;
}
function rxPanel() {
  const c = rxCaso(), p = rx$('rx-panel');
  if (!c) { p.innerHTML = rxCambiosHtml() + '<div class="rx-vacio">Elegí un caso de la lista.</div>'; return; }
  const sevTxt = {bloquea: 'Bloquea', confirmar: 'Para confirmar', informativo: 'Para mirar'}[c.severidad] || '';
  let h = rxCambiosHtml() + `<div class="rx-caso ${c.severidad}"><div class="cab">${c.clase === 'regla' ? `<span class="rx-tipo ${String(c.tipo || '').startsWith('CONTRADIC') ? 'CONTRADICCION' : ''}">${rxEsc(c.tipo || 'REGLA')}</span>` : c.clase === 'correccion' ? '<i class="ti ti-pencil rx-d-corr"></i>' : '<i class="ti ti-alert-triangle"></i>'}
    <span>${rxEsc(c.clase === 'regla' ? rxNombreRegla(c) : c.titulo)}</span><span class="sev">${sevTxt}</span></div>
    <p>${rxEsc(c.detalle || '')}</p>`
    // (15/10/2026) la cuenta del cruce a la vista
    + (c.cuenta ? `<div class="rx-cuenta"><i class="ti ti-calculator"></i> ${rxEsc(c.cuenta)}</div>` : '')
    // (16/10/2026) «para después» guardado, con su nota
    + (c.despues ? `<div class="rx-desp"><i class="ti ti-clock"></i><div><b>Para después</b>${c.despues.nota ? ': ' + rxEsc(c.despues.nota) : ''}<div class="rastro">${rxRastro(c.despues)}</div>
        <button class="rx-mini" onclick="rxQuitarDespues()" title="Vuelve a la lista de pendientes"><i class="ti ti-arrow-back-up"></i> Sacar de para después</button></div></div>` : '')
    + (c.clase === 'regla' && c.control && c.control !== rxNombreRegla(c).replace(/^[^·]*·\s*/, '')
        ? `<details class="rx-como"><summary>¿Cómo lo controla?</summary><p>${rxEsc(c.control)}</p></details>` : '')
    + `<div class="rx-acc"><button class="btn btn-ghost sm" onclick="rxCopiar()" title="Copiar el texto del hallazgo para buscarlo en la fuente"><i class="ti ti-copy"></i> Copiar</button></div>`;
  h += rxDondeHtml(c);
  if (!(c.evidencia || []).length && c.clase === 'regla' && ((c.docs || []).length || (c.otros || []).length)) {
    const doc = d => `<div class="rx-doc"><a data-i="${rxEsc(d)}" onclick="rxVerDoc(this.dataset.i)"><i class="ti ti-file-text"></i> ${rxEsc(d)}${d === RX.ident ? ' (a la vista)' : ''}</a>`
      + (d === RX.ident ? '' : `<button class="rx-al-lado ${RX.cmp && RX.cmp.ident === d ? 'act' : ''}" data-i="${rxEsc(d)}" onclick="rxComparar(this.dataset.i)" title="Verlo al lado del que está a la vista"><i class="ti ti-columns-2"></i></button>`) + '</div>';
    if ((c.docs || []).length) h += `<div class="rx-docs">${c.docs.map(doc).join('')}</div>`;
    if ((c.otros || []).length) h += `<div class="rx-docs-t">Del otro lado del cruce</div><div class="rx-docs">${c.otros.map(doc).join('')}</div>`;
  }
  // el que ninguna plantilla reconoció: ir a ajustar la más parecida
  const cand = c.clase === 'no_leido' ? (String(c.detalle || '').match(/mejor coincidencia fue (.+?)\.json/) || [])[1] : '';
  if (cand) h += `<a class="rx-lab" data-pl="${rxEsc(cand)}" onclick="rxAbrirLab(this.dataset.pl)"><i class="ti ti-flask"></i> Ajustar «${rxEsc(cand)}» en el Laboratorio</a>`;
  h += '</div>';
  h += rxIgualesHtml(c);
  if (!c.pendiente && c.decision && RX.cambiando !== c.id) {
    const d = c.decision, doc = d.tipo === 'documento' || d.tipo === 'confirmado';
    h += `<div class="rx-decidido ${doc ? 'doc' : ''}"><b>${rxEsc(RX_TXT[d.tipo] || d.tipo)}</b>${d.nota ? ': ' + rxEsc(d.nota) : ''}
      ${d.tipo === 'lectura' ? `<div>Va al Excel: <b>${rxEsc(d.valor_excel)}</b></div>` : ''}
      ${d.tipo === 'sacado' ? `<div>Sale del lote: ${rxEsc(d.nombre_archivo)}</div>` : ''}
      ${d.tipo === 'no_aplica' ? `<div>Lo cerró «No aplica» en ${rxEsc(d.columna || 'el dato')}.</div>` : ''}
      <div class="rastro">${rxRastro(d)}</div>`
      // (16/10/2026) una decisión se cambia sin deshacer todo lo de después
      + ((c.opciones || []).length && d.tipo !== 'no_aplica' ? `<button class="btn btn-ghost sm rx-cambiar" onclick="rxCambiarDecision()"><i class="ti ti-arrows-shuffle"></i> Cambiar la decisión</button>` : '')
      + `</div>`;
  } else if ((c.opciones || []).length) {
    const ops = [...c.opciones, 'despues'];
    const pista = c.pendiente && c.campos_caso && c.verificados === c.campos_caso
      ? `<div class="rx-pista"><i class="ti ti-circle-check"></i> Verificaste los datos del caso: están bien leídos. Queda decidir si el documento está mal, si es un problema real o si no lo es.</div>` : '';
    const camb = RX.cambiando === c.id
      ? `<div class="rx-pista"><i class="ti ti-arrows-shuffle"></i> Antes: «${rxEsc(RX_TXT[(c.decision || {}).tipo] || '')}${(c.decision || {}).nota ? ': ' + rxEsc(c.decision.nota) : ''}». Elegí la nueva. <a onclick="rxCambiarCancelar()">Cancelar</a></div>` : '';
    h += `<div style="margin:0 16px">${camb}${pista}<div class="rx-pregunta">${RX.cambiando === c.id ? 'Cambiar por…' : '¿Qué pasó?'}</div><div class="rx-opciones">${ops.map(rxOpcion).join('')}</div></div>`;
  }
  h += rxCamposDoc();
  h += `<a class="rx-duda" onclick="rxDuda()"><i class="ti ti-message-report"></i> Este caso no me cierra</a>`;
  p.innerHTML = h;
}
function rxVerDoc(ident) { RX.docRegla = ident; RX.corrigiendo = null; rxCargar(ident, 1, true); }
function rxCorregirCampo() { RX.corrigiendo = RX.campo; RX.valorTocado = ''; RX.caja = null; rxPanel(); const i = rx$('rx-valor'); if (i) i.focus(); }

// ── Decidir ─────────────────────────────────────────────────────────────────
async function rxAplicar(r, msg, quedarse) {
  if (!r || !r.ok) {
    UI.toast((r && r.error) || 'No se pudo guardar', 'warn');
    const f = r && r.falta && rx$(r.falta === 'nota' ? 'rx-nota' : 'rx-valor'); if (f) { f.focus(); f.style.borderColor = 'var(--err-fg)'; }
    return false;
  }
  const antes = RX.sel;
  RX.est = r; RX.abierto = ''; RX.caja = null; RX.valorTocado = ''; RX.corrigiendo = null; rxSalirTocar(true);
  if (msg) UI.toast(msg, 'ok');
  // el siguiente pendiente de la misma pestaña; si no queda, el caso sigue a la vista
  const _p = c => c.pendiente && !c.despues;
  const sig = rxCasos(RX.tab).find(_p) || rxCasos(RX.tab === 'datos' ? 'reglas' : 'datos').find(_p)
    || rxCasos(RX.tab).find(c => c.pendiente);
  // (15/10/2026) Al corregir un dato, se sigue en el MISMO documento: en su caso si
  // sigue, o en otro caso de ese documento; si no queda ninguno, el siguiente.
  if (quedarse === 'doc') {
    const doc = RX.ident, mismo = rxCaso();
    if (!mismo) { const otro = (RX.est.casos || []).find(c => c.pendiente && ((c.docs || []).includes(doc) || (c.otros || []).includes(doc) || c.ident === doc)); if (otro) RX.sel = otro.id; }
    if (rxCaso()) { rxPintar(); if (doc) await rxCargar(doc, RX.pagina, false); return antes; }
  }
  if (quedarse && quedarse !== 'doc') {                  // ofrece aplicar lo mismo a los iguales
    rxPintar();
    // la página se vuelve a pedir: la corrección tiene que quedar marcada donde se tocó
    if (RX.ident) await rxCargar(RX.ident, RX.pagina, false);
    return antes;
  }
  // «para después» también deja pasar al siguiente
  if (sig && !(rxCaso() && rxCaso().pendiente && !rxCaso().despues)) await rxElegir(sig.id);
  else { if (!rxCaso()) RX.sel = sig ? sig.id : null; rxPintar(); if (RX.ident) await rxCargar(RX.ident, RX.pagina, false); }
  return antes;
}
async function rxGuardar(tipo) {
  const c = rxCaso(); if (!c) return;
  const nota = (rx$('rx-nota') || {}).value || '', valor = (rx$('rx-valor') || {}).value;
  const sale = (document.querySelector('input[name=rx-sale]:checked') || {}).value || '';
  const previa = RX.cambiando === c.id ? RX.previa : null;
  const r = tipo === 'despues' ? await PY.call('rx_despues', [c.id], nota)
    : await PY.call('rx_decidir', c.id, tipo, valor == null ? null : valor, nota, RX.caja, sale);
  RX.ultimoGrupo = null; RX.iguales = null;
  if (r && r.ok) { RX.cambiando = null; RX.previa = null; RX.cambios = r.cambios ? Object.assign({de: 'decision'}, r.cambios) : null; }
  if (r && r.ok && previa && (previa.casos || []).length && tipo !== 'lectura' && tipo !== 'sacado') {
    // (16/10/2026) se cambió una decisión: los que tienen la MISMA de antes
    // (los 16 «No es un problema: lo veo después»), para cambiarlos juntos
    const antes = (RX_TXT[previa.tipo] || previa.tipo) + (previa.nota ? ': ' + previa.nota : '');
    RX.iguales = {origen: c.id, ident: c.ident || c.codigo || '', tipo, nota, cambiar: true,
                  que: `con la misma decisión que tenía éste («${antes}»)`, casos: previa.casos};
  // ⚠️ Lo mismo para los casos iguales (30/09/2026): no con «se leyó mal» (el
  // valor es de cada documento), ni con «el documento está mal» con un valor
  // escrito, ni «sacar» uno de varios documentos de una regla.
  } else if (r && r.ok && tipo !== 'lectura' && !(tipo === 'documento' && String(valor || '').trim())
      && !(tipo === 'sacado' && (c.docs || []).length > 1)) {
    const s = await PY.call('rx_similares', c.id);
    if (s && s.ok && s.casos.length) RX.iguales = {origen: c.id, ident: c.ident || c.codigo || '', tipo, nota, que: s.que, casos: s.casos};
  }
  // con un dato corregido que cambió algún hallazgo, se queda para mostrarlo
  const k = RX.cambios, algo = k && ((k.resueltos || []).length || (k.nuevos || []).length || (k.siguen || []).length);
  if (!algo) RX.cambios = null;
  rxAplicar(r, tipo === 'despues' ? 'Queda para después: se guardó con tu nota' : 'Guardado', RX.iguales ? true : (algo ? 'doc' : false));
}
// (16/10/2026) «Cambiar la decisión» de un caso ya decidido: se agrega una
// decisión nueva (la cadena guarda las dos); se ofrecen los que tenían la misma.
async function rxCambiarDecision() {
  const c = rxCaso(); if (!c) return;
  const s = await PY.call('rx_con_decision', c.id);
  RX.cambiando = c.id; RX.previa = s && s.ok ? s : null; RX.abierto = ''; RX.iguales = null;
  rxPanel();
}
function rxCambiarCancelar() { RX.cambiando = null; RX.previa = null; RX.abierto = ''; rxPanel(); }
async function rxQuitarDespues() {
  const c = rxCaso(); if (!c || !c.despues) return;
  const r = await PY.call('rx_deshacer', [c.despues.uid]);
  if (r && r.ok) { RX.est = r; rxPintar(); UI.toast('Volvió a la lista de pendientes', 'info'); }
  else UI.toast((r && r.error) || 'No se pudo', 'warn');
}
// (16/10/2026) «Dato verificado» / «No aplica» en el dato elegido (un segundo
// clic lo quita). «No aplica» cierra lo que sólo marca ese dato.
async function rxCampo(tipo) {
  if (!RX.ident || !RX.campo) return;
  const r = await PY.call('rx_campo', RX.ident, RX.campo, tipo);
  if (r && r.ok) RX.cambios = r.cambios ? Object.assign({de: 'campo'}, r.cambios) : null;
  await rxAplicar(r, '', 'doc');
}
// La oferta, en el panel del caso recién decidido: todos tildados, se puede destildar.
// (15/10/2026) Cada uno con LO QUE DICE (el valor de su campo) y para verlo al
// lado antes de aplicar: con sólo el nombre del archivo, una decisión en bloque
// cerró avisos que no eran iguales.
function rxValoresTxt(x) { return (x.valores || []).map(([col, v]) => `${col}: ${v || 'vacío'}`).join(' · '); }
// lo destildado se recuerda: abrir uno al lado redibuja el panel
function rxIgualMarcar(el) {
  const g = RX.iguales; if (!g) return;
  g.fuera = g.fuera || new Set();
  if (el.checked) g.fuera.delete(el.value); else g.fuera.add(el.value);
}
function rxIgualesHtml(c) {
  const g = RX.iguales; if (!g || g.origen !== c.id) return '';
  const n = g.casos.length;
  return `<div class="rx-iguales"><b>Hay ${n} caso${n === 1 ? '' : 's'} ${g.cambiar ? 'más' : 'igual' + (n === 1 ? '' : 'es')}</b> <span>${rxEsc(g.que)}</span>
    <div class="lista">${g.casos.map(x => {
      const doc = x.ident || (x.docs || [])[0] || '';
      const v = rxValoresTxt(x);
      return `<div class="rx-igual-f"><label class="rx-radio"><input type="checkbox" class="rx-igual" value="${rxEsc(x.id)}" ${g.fuera && g.fuera.has(x.id) ? '' : 'checked'} onchange="rxIgualMarcar(this)">
        <span>${rxEsc(x.ident || (x.docs || []).join(' · ') || x.titulo)}${v ? `<span class="rx-igual-v">${rxEsc(v)}</span>` : ''}</span></label>`
        + (doc && doc !== RX.ident ? `<button class="rx-al-lado" data-i="${rxEsc(doc)}" onclick="rxComparar(this.dataset.i)" title="Verlo al lado antes de aplicar"><i class="ti ti-columns-2"></i></button>` : '') + `</div>`;
    }).join('')}</div>
    <div class="fila-b"><button class="btn btn-primary sm" onclick="rxAplicarIguales()"><i class="ti ti-copy-check"></i> ${g.cambiar ? 'Cambiarlos también' : 'Aplicar lo mismo'}</button>
      <button class="btn btn-ghost sm" onclick="rxIgualesNo()">No, sólo este</button></div>
    <div class="nota">Cada documento queda con su propia decisión («${rxEsc(RX_TXT[g.tipo] || g.tipo)}»${g.nota ? ': ' + rxEsc(g.nota) : ''}). «Deshacer» deshace el grupo entero.</div></div>`;
}
async function rxAplicarIguales() {
  const g = RX.iguales; if (!g) return;
  const ids = [...document.querySelectorAll('.rx-igual:checked')].map(x => x.value);
  if (!ids.length) { rxIgualesNo(); return; }
  // «para después» en bloque va por su propio camino (sigue pendiente)
  const r = g.tipo === 'despues' ? await PY.call('rx_despues', ids, g.nota)
    : await PY.call('rx_decidir_varios', ids, g.tipo, g.nota, g.ident, !!g.cambiar);
  RX.iguales = null;
  if (r && r.ok) RX.ultimoGrupo = r.uids || null;
  rxAplicar(r, r && r.ok ? `Aplicado a ${r.aplicados} caso(s)` + (r.saltados ? ` · ${r.saltados} quedaron para decidir uno por uno` : '') : '');
}
// Copiar el texto del hallazgo (para ir a buscarlo a la fuente): con cada
// documento, su papel y sus valores.
async function rxCopiar() {
  const c = rxCaso(); if (!c) return;
  const ev = (c.evidencia || []).map(e => `${rxRolTxt(e)} · ${rxNombreDoc(e.ident, e.plantilla)}`
    + ((e.valores || []).length ? ' · ' + rxValoresTxt(e) : ''));
  const t = [c.clase === 'regla' ? rxNombreRegla(c) : c.titulo, c.detalle, c.cuenta,
             ev.length ? '' : rxValoresTxt(c), ev.length ? ev.join('\n') : [...(c.docs || []), ...(c.otros || [])].join('\n')]
    .filter(Boolean).join('\n');
  await rxCopiarTexto(t);
}
function rxIgualesNo() { RX.iguales = null; rxAplicar(RX.est, ''); }
// Minimiza la revisión (la pastilla la vuelve a abrir) y abre la plantilla.
async function rxAbrirLab(nombre) {
  rxMinimizar();
  UI.nav('lab');
  const sel = () => rx$('lab-sel');
  const hallar = () => [...((sel() || {}).options || [])].find(o => o.value === nombre || o.value === nombre + '.json');
  const t0 = Date.now();
  while (Date.now() - t0 < 3000 && !hallar()) await new Promise(r => setTimeout(r, 120));
  const op = hallar();
  if (!op) { UI.toast(`No encuentro «${nombre}» entre las plantillas del Laboratorio`, 'warn'); return; }
  sel().value = op.value; labCargarPlantilla(op.value);
  UI.toast('La revisión quedó abierta: volvé con «Seguir» (abajo a la derecha)', 'info');
}
async function rxGuardarCorreccion() {
  const valor = (rx$('rx-valor') || {}).value || '';
  const r = await PY.call('rx_corregir', RX.ident, RX.corrigiendo, valor, RX.caja);
  // (16/10/2026) qué cambió al volver a controlar, a la vista en el panel
  if (r && r.ok) RX.cambios = r.cambios ? Object.assign({de: 'correccion'}, r.cambios) : null;
  rxAplicar(r, '', 'doc');
}
async function rxDeshacer() {
  const grupo = RX.ultimoGrupo && RX.ultimoGrupo.length ? RX.ultimoGrupo : null;
  const r = await PY.call('rx_deshacer', grupo);
  RX.ultimoGrupo = null; RX.iguales = null;
  if (r && r.ok) { RX.est = r; rxPintar(); if (RX.ident) rxCargar(RX.ident, RX.pagina, false); UI.toast(grupo ? `Deshecho en ${r.deshechos || grupo.length} caso(s)` : 'Deshecho', 'info'); }
  else UI.toast((r && r.error) || 'No se pudo deshacer', 'warn');
}

// ── Tocar en el PDF ─────────────────────────────────────────────────────────
async function rxEntrarTocar() {
  if (!RX.ident) return;
  const r = await PY.call('rx_palabras', RX.ident, RX.pagina);
  if (!r || !r.ok) { UI.toast((r && r.error) || 'Esta página no tiene texto para tocar', 'warn'); return; }
  RX.palabras = r.palabras; RX.tocar = true; RX.elegidas = [];
  rx$('rx-vista').classList.add('tocando'); rxDibujar(false);
}
function rxSalirTocar(silencio) {
  const ya = RX.tocar; RX.tocar = false; RX.elegidas = [];
  const v = rx$('rx-vista'); if (v) v.classList.remove('tocando');
  if (!silencio && ya) rxDibujar(false);
}
function rxTocar(i) {
  const k = RX.elegidas.indexOf(i);
  if (k >= 0) RX.elegidas.splice(k, 1); else RX.elegidas.push(i);
  const ws = RX.elegidas.map(j => RX.palabras[j]).sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));
  RX.valorTocado = ws.map(w => w.t).join(' ');
  RX.caja = ws.length ? {pagina: RX.pagina, x0: Math.min(...ws.map(w => w.x0)), x1: Math.max(...ws.map(w => w.x1)),
                         y0: Math.min(...ws.map(w => w.y0)), y1: Math.max(...ws.map(w => w.y1))} : null;
  const inp = rx$('rx-valor'); if (inp) inp.value = RX.valorTocado;
  rxDibujar(false);
}

// ── Salir, minimizar, generar ───────────────────────────────────────────────
function rxMinimizar() {
  rx$('rx-vista').hidden = true;
  const e = RX.est || {}, n = (e.casos || []).filter(c => c.pendiente).length;
  rx$('rx-pastilla-t').textContent = `Revisión en curso · ${n} por decidir`;
  rx$('rx-pastilla').hidden = false;
}
function rxVolver() { rx$('rx-pastilla').hidden = true; rx$('rx-vista').hidden = false; rxDibujar(false); }
async function rxSeguirDespues() {
  const e = RX.est || {}, n = (e.casos || []).filter(c => c.pendiente).length;
  if (n) {
    const ok = await appConfirm('Seguir después',
      `Salís sin generar el Excel. Lo decidido (${e.decisiones || 0}) ya está guardado, con quién y cuándo, aunque cierres DEXIAE.`
      + `\nEn el Historial el lote queda como «Revisión sin terminar · ${n} por decidir», con «Revisar» para seguir.`);
    if (!ok) return;
  }
  await PY.call('rx_cerrar');
  rx$('rx-vista').hidden = true; rx$('rx-pastilla').hidden = true; RX.est = null;
  if (typeof cargarHistorial === 'function') { try { cargarHistorial(); } catch (e) {} }
}
async function rxGenerar(comoSalio) {
  const e = RX.est || {}, pend = (e.casos || []).filter(c => c.pendiente).length;
  if (comoSalio) {
    const nd = (e.casos || []).filter(c => c.pendiente && c.despues).length;
    const ok = await appConfirm('Generar como salió',
      `Quedan ${e.bloquean} que bloquea${e.bloquean === 1 ? '' : 'n'}${pend - e.bloquean ? ' y ' + (pend - e.bloquean) + ' para confirmar' : ''}. Salen como los leyó DEXIAE, marcados «sin revisar» (y «Sin decidir» en «Validación»)`
      + (nd ? `; los ${nd} para después, en violeta y con tu nota («Para después: …»).` : '.')
      + '\nLa revisión queda guardada: la terminás desde el Historial y, al generar de nuevo, el Excel se reemplaza.');
    if (!ok) return;
  }
  const r = await PY.call('rx_generar', !!comoSalio);
  if (!r || !r.ok) { UI.toast((r && r.error) || 'No se pudo generar el Excel', 'err'); return; }
  rxFinal(r);
}
// Los pasos de la cabecera: 1 Procesar ✓ · 2 Revisar · 3 Excel.
function rxPasos(en) {
  const h = rx$('rx-vista').querySelector('.rx-hd h2');
  if (h) h.textContent = en === 'excel' ? 'Revisión del lote' : 'Revisá antes de generar el Excel';
  const s = rx$('rx-vista').querySelectorAll('.rx-pasos span');
  if (s.length < 3) return;
  s[1].className = en === 'excel' ? 'hecho' : 'act'; s[1].textContent = '2 · Revisar' + (en === 'excel' ? ' ✓' : '');
  s[2].className = en === 'excel' ? 'act' : ''; s[2].textContent = '3 · Excel';
}
function rxAbrirArchivo(ruta) {
  PY.call('abrir_path', ruta).then(x => { if (x && x.ok === false) UI.toast(x.error || 'No se pudo abrir', 'warn'); });
}
// La pantalla final (30/09/2026): sólo lo que sigue — abrir el Excel y el
// informe, y «Listo» para cerrar. Sin la lista, el visor ni los botones de
// decidir, que ya no hacen nada. Si se generó «como salió», además «Seguir
// revisando» (la revisión queda guardada y el Excel se reemplaza otra vez).
// (06/10/2026, auditoría 1.C) Qué detectó DEXIAE y qué decidiste, en números
// (los arma `resumen_revision`, con el mismo cálculo que escribe el Excel).
function rxResumenHtml(s) {
  if (!s || s.filas == null) return '';
  const t = (n, txt, cls) => `<div class="rx-res-t ${cls || ''}"><b>${n}</b><span>${txt}</span></div>`;
  const pl = (n, uno, varios) => n === 1 ? uno : varios;
  let h = '<div class="rx-res">'
    + t(s.filas, pl(s.filas, 'fila revisada', 'filas revisadas'))
    + t(s.sin_dudas_al_abrir, 'sin dudas al abrir', 'ok')
    + t(s.casos_al_abrir, pl(s.casos_al_abrir, 'caso detectado', 'casos detectados'))
    + t(s.corregidos, pl(s.corregidos, 'dato corregido', 'datos corregidos'), s.corregidos ? 'corr' : '')
    + t(s.documento_mal, 'con el documento mal', s.documento_mal ? 'hall' : '')
    + t(s.no_era_problema, pl(s.no_era_problema, 'no era un problema', 'no eran un problema'))
    + (s.sacados ? t(s.sacados, pl(s.sacados, 'sacado del lote', 'sacados del lote')) : '')
    + t(s.pendientes, 'sin decidir', s.pendientes ? 'pend' : 'ok')
    // (16/10/2026)
    + (s.para_despues ? t(s.para_despues, 'para después', 'desp') : '')
    + (s.verificados ? t(s.verificados, pl(s.verificados, 'dato verificado', 'datos verificados'), 'ok') : '')
    + (s.no_aplica ? t(s.no_aplica, 'no aplica', '') : '')
    + '</div>';
  const extra = [s.aplicados_a_iguales ? `${s.aplicados_a_iguales} aplicada${s.aplicados_a_iguales === 1 ? '' : 's'} a casos iguales` : '',
    s.deshechas ? `${s.deshechas} deshecha${s.deshechas === 1 ? '' : 's'}` : '',
    (s.quienes || []).length ? 'decidió ' + s.quienes.join(', ') : ''].filter(Boolean);
  if (extra.length) h += `<p class="rx-res-pie">${rxEsc(extra.join(' · '))}</p>`;
  return h;
}
function rxFinal(r) {
  RX.fin = r;
  rx$('rx-vista').classList.add('final'); rxPasos('excel');
  const f = rx$('rx-final'); f.hidden = false;
  const q = s => JSON.stringify(s).replace(/"/g, '&quot;');
  const inf = r.informe_pdf ? [r.informe_pdf, 'ti-file-type-pdf', 'Abrir informe PDF'] : (r.informe_html ? [r.informe_html, 'ti-world', 'Ver informe HTML'] : null);
  const infHtml = r.informe_pdf && r.informe_html ? r.informe_html : '';
  f.innerHTML = `<div class="rx-final">
    <h3>${r.pendientes ? '<i class="ti ti-file-export" style="color:var(--rev-fg)"></i> Excel generado sin terminar'
                       : '<i class="ti ti-circle-check" style="color:var(--ok-fg)"></i> Excel listo'}</h3>
    <p>${r.pendientes ? `${r.pendientes} caso(s) salen marcados «sin revisar»${(r.resumen || {}).para_despues ? ` (${r.resumen.para_despues} para después, en violeta y con tu nota)` : ''}. La revisión queda guardada: la seguís ahora o desde el Historial, y al generar de nuevo el Excel se reemplaza.`
                      : 'Todo decidido. Cada decisión está en la hoja «Revisión» del Excel, con quién, cuándo y la cabeza de la cadena.'}</p>
    ${rxResumenHtml(r.resumen)}
    ${r.cadena && !r.cadena.ok ? `<div class="aviso">⚠️ La cadena de decisiones no verifica: ${rxEsc(r.cadena.motivo)}.</div>` : ''}
    ${(r.informes_rehechos || []).length ? `<p>El informe del lote se rehízo con el Excel revisado (${rxEsc(r.informes_rehechos.join(', '))}): su huella es la del Excel de ahora.</p>` : ''}
    ${(r.informes_viejos || []).length ? `<div class="aviso">No se pudo rehacer el informe (${rxEsc(r.informes_viejos.join(', '))}): es de antes de la revisión y su huella es la del Excel anterior.</div>` : ''}
    <div class="bts">
      <button class="btn btn-primary" onclick="rxAbrirArchivo(${q(r.ruta)})"><i class="ti ti-file-spreadsheet"></i> Abrir Excel</button>
      ${inf ? `<button class="btn btn-ghost" onclick="rxAbrirArchivo(${q(inf[0])})"><i class="ti ${inf[1]}"></i> ${inf[2]}</button>` : ''}
      ${infHtml ? `<button class="btn btn-ghost" onclick="rxAbrirArchivo(${q(infHtml)})"><i class="ti ti-world"></i> Ver informe HTML</button>` : ''}
      ${r.pendientes ? `<button class="btn btn-ghost listo" onclick="rxSeguirRevisando()"><i class="ti ti-arrow-back-up"></i> Seguir revisando</button>` : ''}
      <button class="btn ${r.pendientes ? 'btn-ghost' : 'btn-ghost listo'}" onclick="rxCerrarFinal()"><i class="ti ti-check"></i> Listo</button>
    </div></div>`;
}
function rxSeguirRevisando() { const id = RX.est && RX.est.lote_id; if (id != null) rxAbrir(id); }
async function rxCerrarFinal() {
  await PY.call('rx_cerrar');
  const v = rx$('rx-vista'); v.hidden = true; v.classList.remove('final'); rx$('rx-final').hidden = true;
  rx$('rx-pastilla').hidden = true; RX.est = null; RX.fin = null;
  if (typeof cargarHistorial === 'function') { try { cargarHistorial(); } catch (e) {} }
}
function rxPestana(t) { RX.tab = t; const c = rxCasos(t).find(x => x.pendiente) || rxCasos(t)[0]; if (c) rxElegir(c.id); else { RX.sel = null; rxPintar(); } }
function rxMover(k) {
  const cs = rxCasos(RX.tab); if (!cs.length) return;
  const i = cs.findIndex(c => c.id === RX.sel);
  const j = Math.max(0, Math.min(cs.length - 1, (i < 0 ? 0 : i + k)));
  if (cs[j].id !== RX.sel) rxElegirClic(cs[j].id);
}
function rxDuda(casoId) {
  // El «Esto no me cierra» del lote (el mismo del Historial): el registro del
  // día que viaja en el paquete ya tiene cada decisión de esta revisión (qué,
  // caso, huella). Las piezas propias de la revisión van en un paso aparte.
  const id = RX.est && RX.est.lote_id;
  if (id && typeof dudaAbrir === 'function') { dudaAbrir(id); return; }
  UI.toast('No se pudo abrir «Esto no me cierra»: probá desde el Historial.', 'warn');
}

// ── Teclado, rueda y arrastre ───────────────────────────────────────────────
document.addEventListener('keydown', ev => {
  const v = rx$('rx-vista'); if (!v || v.hidden || v.classList.contains('final')) return;   // en la final, Ctrl+Z no deshace nada
  if (/INPUT|TEXTAREA/.test(ev.target.tagName) && ev.key !== 'Escape') return;
  if ((ev.ctrlKey || ev.metaKey) && ['+', '=', '-', '_', '0'].includes(ev.key)) return;   // tamaño de la app
  if (ev.key === 'ArrowDown') { rxMover(1); ev.preventDefault(); }
  else if (ev.key === 'ArrowUp') { rxMover(-1); ev.preventDefault(); }
  else if (ev.key === '+' || ev.key === '=') rxZoomPaso(1);
  else if (ev.key === '-') rxZoomPaso(-1);
  else if (ev.key === '0') rxZoomModo('ancho');
  else if (ev.key === 'Escape') { if (RX.tocar) rxSalirTocar(); else rxCancelarForm(); }
  else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { rxDeshacer(); ev.preventDefault(); }
});
// Con «Tamaño de texto» ≠ 100 % hay CSS zoom: píxeles de pantalla → de interfaz.
function rxK(el) { return typeof uiK === 'function' ? uiK(el) : 1; }
// Ctrl+rueda = zoom y la «manito» (arrastrar para mover la hoja), en el
// documento de la izquierda y, desde el 16/10/2026, también en el de al lado.
function rxPanear(lz, zoomPaso, esPrincipal) {
  let a = null;
  lz.addEventListener('wheel', ev => {
    if (!ev.ctrlKey) return;
    ev.preventDefault();
    const r = lz.getBoundingClientRect(), k = rxK(lz);
    zoomPaso(ev.deltaY < 0 ? 1 : -1, {x: (ev.clientX - r.left) * k, y: (ev.clientY - r.top) * k});
  }, {passive: false});
  lz.addEventListener('mousedown', ev => {
    if ((esPrincipal && RX.tocar) || ev.button !== 0 || ev.target.closest(esPrincipal ? '.rx-m,.rx-w' : '.rx-w')) return;
    a = {x: ev.clientX, y: ev.clientY, sl: lz.scrollLeft, st: lz.scrollTop, k: rxK(lz)}; lz.classList.add('arrastrando');
    ev.preventDefault();
  });
  window.addEventListener('mousemove', ev => { if (!a) return; lz.scrollLeft = a.sl - (ev.clientX - a.x) * a.k; lz.scrollTop = a.st - (ev.clientY - a.y) * a.k; });
  window.addEventListener('mouseup', () => { if (a) { a = null; lz.classList.remove('arrastrando'); } });
}
function rxArrastre() {
  rxPanear(rx$('rx-lienzo'), rxZoomPaso, true);
  rxPanear(rx$('rx-lienzo-b'), rxCmpZoomPaso, false);
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (RX.zModo !== 'libre' && !rx$('rx-vista').hidden) rxDibujar(false); if (RX.cmp && !rx$('rx-vista').hidden) rxCmpDibujar(); }, 120); });
}
