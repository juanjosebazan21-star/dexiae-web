// ═══ Revisión asistida del lote de extracción (30/09/2026) ═══════════════════
// La pantalla de la maqueta aprobada (maquetas/modulos-nuevos/revision.html)
// hablando con la API real: rx_abrir, rx_pagina, rx_palabras, rx_decidir,
// rx_corregir, rx_deshacer, rx_generar, rx_cerrar (dexiae_api.py). Cada
// decisión se guarda al tomarla: salir, minimizar o cerrar DEXIAE no pierde nada.
const RX = {est: null, tab: 'datos', sel: null, ident: null, pagina: 1, pg: null, campo: null,
            zModo: 'ancho', zoom: 1, abierto: '', tocar: false, palabras: null, elegidas: [], caja: null,
            docRegla: null, corrigiendo: null};
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
};
const RX_TXT = {lectura: 'Se leyó mal: corregido', documento: 'Confirmado: el documento está mal',
                justificado: 'No es un problema', confirmado: 'Confirmado', sacado: 'Se sacó del lote'};

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
  <div class="rx-franja"><span class="rx-chip ok" id="rx-c-ok"></span><span class="rx-chip rev" id="rx-c-rev"></span><span class="rx-chip err" id="rx-c-err"></span>
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
      <div class="rx-lienzo" id="rx-lienzo"></div>
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
  const primero = rxCasos('datos').find(c => c.pendiente) || rxCasos('reglas').find(c => c.pendiente) || r.casos[0];
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
  const nd = rxCasos('datos').filter(c => c.pendiente), nr = rxCasos('reglas').filter(c => c.pendiente);
  const td = rx$('rx-n-datos'), tr = rx$('rx-n-reglas');
  td.textContent = nd.length; td.className = 'n' + (nd.length ? (nd.some(c => c.severidad === 'bloquea') ? ' b' : '') : ' cero');
  tr.textContent = nr.length; tr.className = 'n' + (nr.length ? (nr.some(c => c.severidad === 'bloquea') ? ' b' : '') : ' cero');
  rx$('rx-t-datos').classList.toggle('act', RX.tab === 'datos');
  rx$('rx-t-reglas').classList.toggle('act', RX.tab === 'reglas');
  rx$('rx-b-gen').disabled = b > 0;
  rx$('rx-b-como').style.display = b > 0 ? '' : 'none';
  rx$('rx-b-deshacer').disabled = !e.decisiones;
  rx$('rx-med').textContent = b ? `Falta decidir ${b} que bloquea${b === 1 ? '' : 'n'} el Excel. Podés dejarlo para después o generarlo como salió.`
    : (r ? `Podés generar el Excel: ${r} quedan para confirmar y salen marcados «sin revisar».` : 'Todo decidido: el Excel sale listo.');
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
    const xs = cs.filter(c => c.pendiente && c.severidad === sev);
    if (!xs.length) return;
    h += `<div class="rx-grupo"><span>${t}</span><span>${xs.length}</span></div>` + xs.map(rxItem).join('');
  });
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
  return `<div class="rx-item ${c.id === RX.sel ? 'sel' : ''} ${c.pendiente ? '' : 'hecho'}" onclick="rxElegir('${rxEsc(c.id).replace(/'/g, "\\'")}')">
    <i class="ti ${ico} ico rx-ico-${c.severidad}"></i><div><div class="nom">${rxEsc(nom)}</div><div class="sub">${rxEsc(sub)}</div></div></div>`;
}

async function rxElegir(id) {
  RX.sel = id; RX.abierto = ''; RX.corrigiendo = null; rxSalirTocar(true);
  const c = rxCaso(); if (!c) { rxPintar(); return; }
  RX.tab = c.clase === 'regla' ? 'reglas' : 'datos';
  const ident = c.clase === 'regla' ? (RX.docRegla && (c.docs || []).includes(RX.docRegla) ? RX.docRegla : (c.docs || [])[0]) : c.ident;
  RX.campo = c.columna || (c.columnas || [])[0] || null;
  rxPintar();
  if (ident) await rxCargar(ident, 1, true);
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
  if (irAlDato && RX.campo) {
    const m = (r.marcas || []).find(x => x.columna === RX.campo);
    const pg = m && m.cajas && m.cajas[0] && m.cajas[0].pagina;
    if (pg && pg !== r.pagina) { await rxCargar(ident, pg, false); return; }
  }
  rxPanel(); rxDibujar(true);
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
  rx$('rx-v-arch').textContent = RX.pg.archivo || RX.ident;
  rx$('rx-v-pag').textContent = `${RX.pagina} / ${RX.pg.paginas || 1}`;
  rx$('rx-p-ant').disabled = RX.pagina <= 1; rx$('rx-p-sig').disabled = RX.pagina >= (RX.pg.paginas || 1);
  const c = rxCaso(), marcadas = new Set(c && c.clase === 'regla' ? (c.columnas || []) : []);
  let h = `<div class="rx-hoja" style="width:${ancho}px"><img src="${RX.pg.img}" alt="">`;
  (RX.pg.marcas || []).forEach(m => (m.cajas || []).filter(k => (k.pagina || 1) === RX.pagina).forEach(k => {
    const sel = m.columna === RX.campo || marcadas.has(m.columna);
    h += rxCaja(k, `rx-m ${sel ? 'sel' : 'tenue'} ${m.fuente === 'respaldo' ? 'resp' : ''}`, m.columna,
                `rxElegirCampo('${rxEsc(m.columna).replace(/'/g, "\\'")}')`);
  }));
  if (RX.caja && (RX.caja.pagina || 1) === RX.pagina) h += rxCaja(RX.caja, 'rx-m nuevo', 'lo que tocaste');
  if (RX.tocar && RX.palabras) RX.palabras.forEach((w, i) => { h += rxCaja(w, 'rx-w' + (RX.elegidas.includes(i) ? ' elegida' : ''), '', `rxTocar(${i})`); });
  lz.innerHTML = h + '</div>';
  if (centrar) requestAnimationFrame(() => { const m = lz.querySelector('.rx-m.sel'); if (m) m.scrollIntoView({block: 'center', inline: 'center'}); });
}
function rxElegirCampo(col) { if (RX.tocar) return; RX.campo = col; rxPanel(); rxDibujar(false); }

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
function rxForm(tipo) {
  const c = rxCaso(), ex = `<div class="rx-excel"><i class="ti ti-file-spreadsheet"></i>${RX_OPS[tipo][3]}</div>`;
  if (tipo === 'lectura') return `<div class="rx-form"><label>El valor correcto</label>
      <input type="text" id="rx-valor" value="${rxEsc(RX.valorTocado || '')}" placeholder="Escribilo o tocá el PDF">
      <div class="fila-b"><button class="btn btn-ghost sm" onclick="rxEntrarTocar()"><i class="ti ti-hand-finger"></i> Tocar en el PDF</button>
      <button class="btn btn-primary sm" onclick="rxGuardar('lectura')">Guardar</button></div>${ex}</div>`;
  if (tipo === 'documento') return `<div class="rx-form"><label>Qué tiene mal el documento (y qué se hace, si lo sabés)</label>
      <textarea id="rx-nota" placeholder="Ej.: la nota de crédito no trae el total; se pidió al proveedor"></textarea>
      <label>El valor que va al Excel (vacío = como dice el documento)</label><input type="text" id="rx-valor" value="">
      <button class="btn btn-primary sm" onclick="rxGuardar('documento')">Guardar</button>${ex}</div>`;
  if (tipo === 'sacado') return `<div class="rx-form">${(c.docs || []).length
        ? `<label>¿Cuál sale del lote?</label>` + c.docs.map((d, i) => `<label class="rx-radio"><input type="radio" name="rx-sale" value="${rxEsc(d)}" ${i === 0 ? 'checked' : ''}> ${rxEsc(d)}</label>`).join('')
        : `<label>Sale del lote: <b>${rxEsc(c.ident)}</b></label>`}
      <textarea id="rx-nota" placeholder="Por qué (opcional)"></textarea>
      <button class="btn btn-primary sm" onclick="rxGuardar('sacado')">Sacar del lote</button>${ex}</div>`;
  const oblig = tipo === 'justificado';
  return `<div class="rx-form"><label>${oblig ? 'Por qué no es un problema (sin motivo no se cierra)' : 'Qué se hace (opcional)'}</label>
      <textarea id="rx-nota" placeholder="${oblig ? 'Ej.: el CAE va en el remito' : 'Ej.: se reclamó al proveedor'}"></textarea>
      <button class="btn btn-primary sm" onclick="rxGuardar('${tipo}')">Guardar</button>${ex}</div>`;
}
function rxAbrirOp(t) { RX.abierto = RX.abierto === t ? '' : t; if (t !== 'lectura') RX.caja = null; rxPanel(); }

function rxCamposDoc() {
  const ms = (RX.pg && RX.pg.marcas) || [];
  if (!ms.length) return '';
  const c = rxCaso();
  return `<div class="rx-tit">Datos de ${rxEsc(RX.pg.archivo || RX.ident)}</div>` + ms.map(m => {
    const d = !m.valor ? '<i class="ti ti-circle-dashed rx-d-no" title="Vacío"></i>'
      : m.fuente === 'motor' ? '<i class="ti ti-target rx-d-motor" title="Donde leyó el motor"></i>'
      : m.fuente === 'respaldo' ? `<i class="ti ti-target rx-d-resp" title="Ubicado después (${rxEsc(m.por || '')})"></i>`
      : '<i class="ti ti-help-circle rx-d-no" title="No se encontró en la página"></i>';
    const sel = m.columna === RX.campo;
    return `<div class="rx-fila ${sel ? 'sel' : ''}" onclick="rxElegirCampo('${rxEsc(m.columna).replace(/'/g, "\\'")}')">
      <span class="c">${rxEsc(m.columna)}</span><span class="v ${m.valor ? '' : 'vacio'}">${rxEsc(m.valor || 'vacío')}</span>${d}</div>`
      + (sel && c && c.clase === 'regla' && !RX.corrigiendo ? `<div style="padding:0 16px 6px 19px"><a class="rx-duda" style="margin:0" onclick="rxCorregirCampo()"><i class="ti ti-pencil"></i> Se leyó mal este dato</a></div>` : '')
      + (sel && RX.corrigiendo === m.columna ? `<div class="rx-form" style="margin:0 16px 8px"><label>El valor correcto de ${rxEsc(m.columna)}</label>
          <input type="text" id="rx-valor" value="${rxEsc(RX.valorTocado || '')}"><div class="fila-b">
          <button class="btn btn-ghost sm" onclick="rxEntrarTocar()"><i class="ti ti-hand-finger"></i> Tocar en el PDF</button>
          <button class="btn btn-primary sm" onclick="rxGuardarCorreccion()">Guardar</button></div>
          <div class="rx-excel"><i class="ti ti-file-spreadsheet"></i>Se corrige el dato y las reglas se vuelven a evaluar.</div></div>` : '');
  }).join('') + `<div class="rx-leyenda"><span><i class="ti ti-target rx-d-motor"></i> donde leyó el motor</span><span><i class="ti ti-target rx-d-resp"></i> ubicado después</span><span><i class="ti ti-circle-dashed rx-d-no"></i> vacío</span></div>`;
}
function rxPanel() {
  const c = rxCaso(), p = rx$('rx-panel');
  if (!c) { p.innerHTML = '<div class="rx-vacio">Elegí un caso de la lista.</div>'; return; }
  const sevTxt = {bloquea: 'Bloquea', confirmar: 'Para confirmar', informativo: 'Para mirar'}[c.severidad] || '';
  let h = `<div class="rx-caso ${c.severidad}"><div class="cab">${c.clase === 'regla' ? `<span class="rx-tipo ${String(c.tipo || '').startsWith('CONTRADIC') ? 'CONTRADICCION' : ''}">${rxEsc(c.tipo || 'REGLA')}</span>` : '<i class="ti ti-alert-triangle"></i>'}
    <span>${rxEsc(c.clase === 'regla' ? rxNombreRegla(c) : c.titulo)}</span><span class="sev">${sevTxt}</span></div>
    <p>${rxEsc(c.detalle || '')}</p>${c.clase === 'regla' && c.control && c.titulo && c.titulo !== c.codigo ? `<p style="margin-top:-4px">Controla: ${rxEsc(c.control)}</p>` : ''}`;
  if (c.clase === 'regla' && (c.docs || []).length) {
    h += `<div class="rx-docs">${c.docs.map(d => `<a onclick="rxVerDoc('${rxEsc(d).replace(/'/g, "\\'")}')"><i class="ti ti-file-text"></i> ${rxEsc(d)}${d === RX.ident ? ' (a la vista)' : ''}</a>`).join('')}</div>`;
  }
  // el que ninguna plantilla reconoció: ir a ajustar la más parecida
  const cand = c.clase === 'no_leido' ? (String(c.detalle || '').match(/mejor coincidencia fue (.+?)\.json/) || [])[1] : '';
  if (cand) h += `<a class="rx-lab" data-pl="${rxEsc(cand)}" onclick="rxAbrirLab(this.dataset.pl)"><i class="ti ti-flask"></i> Ajustar «${rxEsc(cand)}» en el Laboratorio</a>`;
  h += '</div>';
  if (!c.pendiente && c.decision) {
    const d = c.decision, doc = d.tipo === 'documento' || d.tipo === 'confirmado';
    h += `<div class="rx-decidido ${doc ? 'doc' : ''}"><b>${rxEsc(RX_TXT[d.tipo] || d.tipo)}</b>${d.nota ? ': ' + rxEsc(d.nota) : ''}
      ${d.tipo === 'lectura' ? `<div>Va al Excel: <b>${rxEsc(d.valor_excel)}</b></div>` : ''}
      ${d.tipo === 'sacado' ? `<div>Sale del lote: ${rxEsc(d.nombre_archivo)}</div>` : ''}
      <div class="rastro">${rxRastro(d)}</div></div>`;
    h += rxIgualesHtml(c);
  } else {
    h += `<div style="margin:0 16px"><div class="rx-pregunta">¿Qué pasó?</div><div class="rx-opciones">${(c.opciones || []).map(rxOpcion).join('')}</div></div>`;
  }
  h += rxCamposDoc();
  h += `<a class="rx-duda" onclick="rxDuda('${rxEsc(c.id).replace(/'/g, "\\'")}')"><i class="ti ti-message-report"></i> Este caso no me cierra</a>`;
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
  const sig = rxCasos(RX.tab).find(c => c.pendiente) || rxCasos(RX.tab === 'datos' ? 'reglas' : 'datos').find(c => c.pendiente);
  if (quedarse) { rxPintar(); return antes; }            // ofrece aplicar lo mismo a los iguales
  if (sig && !(rxCaso() && rxCaso().pendiente)) await rxElegir(sig.id);
  else { if (!rxCaso()) RX.sel = sig ? sig.id : null; rxPintar(); if (RX.ident) await rxCargar(RX.ident, RX.pagina, false); }
  return antes;
}
async function rxGuardar(tipo) {
  const c = rxCaso(); if (!c) return;
  const nota = (rx$('rx-nota') || {}).value || '', valor = (rx$('rx-valor') || {}).value;
  const sale = (document.querySelector('input[name=rx-sale]:checked') || {}).value || '';
  const r = await PY.call('rx_decidir', c.id, tipo, valor == null ? null : valor, nota, RX.caja, sale);
  RX.ultimoGrupo = null; RX.iguales = null;
  // ⚠️ Lo mismo para los casos iguales (30/09/2026): no con «se leyó mal» (el
  // valor es de cada documento), ni con «el documento está mal» con un valor
  // escrito, ni «sacar» uno de varios documentos de una regla.
  if (r && r.ok && tipo !== 'lectura' && !(tipo === 'documento' && String(valor || '').trim())
      && !(tipo === 'sacado' && (c.docs || []).length > 1)) {
    const s = await PY.call('rx_similares', c.id);
    if (s && s.ok && s.casos.length) RX.iguales = {origen: c.id, ident: c.ident || c.codigo || '', tipo, nota, que: s.que, casos: s.casos};
  }
  rxAplicar(r, 'Guardado', !!RX.iguales);
}
// La oferta, en el panel del caso recién decidido: todos tildados, se puede destildar.
function rxIgualesHtml(c) {
  const g = RX.iguales; if (!g || g.origen !== c.id) return '';
  const n = g.casos.length;
  return `<div class="rx-iguales"><b>Hay ${n} caso${n === 1 ? '' : 's'} igual${n === 1 ? '' : 'es'}</b> <span>${rxEsc(g.que)}</span>
    <div class="lista">${g.casos.map(x => `<label class="rx-radio"><input type="checkbox" class="rx-igual" value="${rxEsc(x.id)}" checked> ${rxEsc(x.ident || (x.docs || []).join(' · ') || x.titulo)}</label>`).join('')}</div>
    <div class="fila-b"><button class="btn btn-primary sm" onclick="rxAplicarIguales()"><i class="ti ti-copy-check"></i> Aplicar lo mismo</button>
      <button class="btn btn-ghost sm" onclick="rxIgualesNo()">No, sólo este</button></div>
    <div class="nota">Cada documento queda con su propia decisión («${rxEsc(RX_TXT[g.tipo] || g.tipo)}»${g.nota ? ': ' + rxEsc(g.nota) : ''}). «Deshacer» deshace el grupo entero.</div></div>`;
}
async function rxAplicarIguales() {
  const g = RX.iguales; if (!g) return;
  const ids = [...document.querySelectorAll('.rx-igual:checked')].map(x => x.value);
  if (!ids.length) { rxIgualesNo(); return; }
  const r = await PY.call('rx_decidir_varios', ids, g.tipo, g.nota, g.ident);
  RX.iguales = null;
  if (r && r.ok) RX.ultimoGrupo = r.uids || null;
  rxAplicar(r, r && r.ok ? `Aplicado a ${r.aplicados} caso(s)` + (r.saltados ? ` · ${r.saltados} quedaron para decidir uno por uno` : '') : '');
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
  rxAplicar(r, 'Corregido: las reglas se volvieron a evaluar');
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
    const ok = await appConfirm('Generar como salió',
      `Quedan ${e.bloquean} que bloquea${e.bloquean === 1 ? '' : 'n'}${pend - e.bloquean ? ' y ' + (pend - e.bloquean) + ' para confirmar' : ''}. Salen como los leyó DEXIAE, marcados «sin revisar» (y «Sin decidir» en «Validación»).`
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
    <p>${r.pendientes ? `${r.pendientes} caso(s) salen marcados «sin revisar». La revisión queda guardada: la seguís ahora o desde el Historial, y al generar de nuevo el Excel se reemplaza.`
                      : 'Todo decidido. Cada decisión está en la hoja «Revisión» del Excel, con quién, cuándo y la cabeza de la cadena.'}</p>
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
  if (cs[j].id !== RX.sel) rxElegir(cs[j].id);
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
  else if (ev.key === 'Escape') rxSalirTocar();
  else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { rxDeshacer(); ev.preventDefault(); }
});
// Con «Tamaño de texto» ≠ 100 % hay CSS zoom: píxeles de pantalla → de interfaz.
function rxK(el) { return typeof uiK === 'function' ? uiK(el) : 1; }
function rxArrastre() {
  const lz = rx$('rx-lienzo'); let a = null;
  lz.addEventListener('wheel', ev => {
    if (!ev.ctrlKey) return;
    ev.preventDefault();
    const r = lz.getBoundingClientRect(), k = rxK(lz);
    rxZoomPaso(ev.deltaY < 0 ? 1 : -1, {x: (ev.clientX - r.left) * k, y: (ev.clientY - r.top) * k});
  }, {passive: false});
  lz.addEventListener('mousedown', ev => {
    if (RX.tocar || ev.button !== 0 || ev.target.closest('.rx-m,.rx-w')) return;
    a = {x: ev.clientX, y: ev.clientY, sl: lz.scrollLeft, st: lz.scrollTop, k: rxK(lz)}; lz.classList.add('arrastrando');
  });
  window.addEventListener('mousemove', ev => { if (!a) return; lz.scrollLeft = a.sl - (ev.clientX - a.x) * a.k; lz.scrollTop = a.st - (ev.clientY - a.y) * a.k; });
  window.addEventListener('mouseup', () => { if (a) { a = null; lz.classList.remove('arrastrando'); } });
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (RX.zModo !== 'libre' && !rx$('rx-vista').hidden) rxDibujar(false); }, 120); });
}
