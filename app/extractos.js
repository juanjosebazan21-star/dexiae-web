// ═══ Módulo Extractos (30/09/2026) ═══════════════════════════════════════════
// El conversor de extractos sale del cuadro de Herramientas a su pantalla
// (maqueta aprobada: maquetas/modulos-nuevos/extractos.html). Arriba se
// convierte; abajo, lo convertido: conteos, últimas conversiones, cuentas del
// cliente, cómo se clasificó, el borrador de asientos y lo que conviene
// resolver. Todo sale del Historial de esta computadora (extractos_panel →
// dexiae_extractos_panel.armar_panel). Lo que no se guardaba antes de esta
// versión dice «—»: no se estima.
//
// El cliente se elige UNA vez, arriba: filtra el tablero y es el de los
// asientos de la próxima conversión. «Todos los clientes» = sin asientos.
const EXT = {archivos: [], corriendo: false, dias: 90, d: null, histClientes: [], bancos: [],
             leyendo: null, pidiendo: false};   // leyendo: {nombres, res, total} mientras se reconoce el banco
const xt$ = id => document.getElementById(id);
function xtNum(n) { return n == null ? '—' : Number(n).toLocaleString('es-AR'); }
function xtPesos(v) { return v == null ? '—' : '$ ' + Number(v).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
function xtPl(n, uno, varios) { return `${xtNum(n)} ${n === 1 ? uno : varios}`; }
function xtPct(v) { return v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', ','); }
function xtFecha(iso) {
  const d = new Date(String(iso || '').slice(0, 19)); if (isNaN(d)) return '';
  const p = n => ('0' + n).slice(-2), hoy = new Date();
  return d.getFullYear() === hoy.getFullYear()
    ? `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
    : `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function _extActiva() { const s = xt$('screen-ext'); return !!(s && s.classList.contains('active')); }
function _extCliente() { return (xt$('ext-cliente') || {}).value || ''; }
function _extCap() { return !!(typeof IMPUT === 'object' && IMPUT.cap); }

// ── La pantalla ─────────────────────────────────────────────────────────────
function extMontar() {
  const s = xt$('screen-ext'); if (!s || s.dataset.ok) return; s.dataset.ok = '1';
  s.innerHTML = `
  <div class="xt-top">
    <div style="min-width:0"><h1>Extractos bancarios</h1>
      <div class="sub">Del resumen del banco al Excel, clasificado y con el borrador de asientos. Todo en esta computadora.</div></div>
    <div class="xt-acc">
      <label class="xt-cli" title="Filtra lo de abajo y es el cliente de los asientos de la próxima conversión">
        <i class="ti ti-briefcase"></i>
        <select class="form-select" id="ext-cliente" onchange="extClienteCambio()"><option value="">Todos los clientes</option></select></label>
      <!-- ⚠️ Con acento y no gris: es la ÚNICA puerta a la Configuración Contable
           y una usuaria no la encontraba cuando era un botón chico y gris (10/08/2026). -->
      <button class="btn btn-accent sm" id="ext-cli-btn" onclick="extConfigurar(_extCliente())"
        title="Plan de cuentas, categorías, CUITs · importar y exportar clientes"><i class="ti ti-settings"></i> Configurar clientes</button>
    </div>
  </div>

  <div class="ana-card xt-conv" id="xt-conv">
    <div class="xt-drop" id="xt-drop" onclick="extSeleccionar()" role="button" tabindex="0"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();extSeleccionar();}">
      <div class="xt-drop-ic"><i class="ti ti-file-upload"></i></div>
      <div style="min-width:0">
        <div class="t">Soltá los resúmenes en PDF o hacé clic para elegirlos</div>
        <div class="s">Se detecta el banco solo · la cadena de saldos se controla día por día · <b>no gasta tu cupo de documentos</b></div>
        <div class="xt-bancos" id="xt-bancos"></div>
      </div>
    </div>
    <div class="xt-lado">
      <div class="xt-lista" id="ext-list"></div>
      <div class="opt-hint xt-hint" id="ext-cliente-hint"></div>
      <label class="chk-row xt-rev" id="ext-rev-row">
        <input type="checkbox" id="ext-revisar" checked onchange="extRevisarCambio()">
        <span><b>Revisar antes de generar el Excel</b><br>
          <span class="opt-hint" id="ext-rev-hint" style="margin:0"></span></span>
      </label>
      <div id="ext-prog" class="xt-prog" style="display:none">
        <div class="xt-prog-t"><span id="ext-prog-lbl">Procesando…</span><span id="ext-prog-n"></span></div>
        <div class="xt-prog-bar"><div id="ext-prog-bar"></div></div>
      </div>
      <div class="xt-bts">
        <a class="xt-link" onclick="extQueGenera()"><i class="ti ti-chevron-down" id="ext-gen-arrow"></i> <span id="ext-gen-lbl">Qué hojas trae el Excel</span></a>
        <button class="btn btn-ghost sm" id="xt-limpiar" onclick="extLimpiar()" hidden>Quitar todos</button>
        <button class="btn btn-primary" id="ext-run" onclick="extProcesar()" disabled><i class="ti ti-table-export"></i> Convertir</button>
      </div>
      <div id="ext-gen" class="xt-gen" hidden></div>
    </div>
  </div>

  <div class="xt-sec">
    <div class="xt-sec-t" id="xt-sec-t">Lo convertido</div>
    <div class="ana-seg" id="xt-per">
      <button data-d="30" onclick="extPeriodo(30)">30 días</button><button data-d="90" onclick="extPeriodo(90)">90 días</button>
      <button data-d="365" onclick="extPeriodo(365)">12 meses</button><button data-d="0" onclick="extPeriodo(0)">Todo</button></div>
  </div>
  <div class="ana-demo" id="xt-demo" hidden><i class="ti ti-info-circle"></i> Datos de ejemplo (demo): en la app salen del Historial de esta computadora.</div>
  <div id="xt-cuerpo"><div class="hist-empty">Cargando…</div></div>`;
}

function extInit() {
  extMontar();
  extCargarClientes();
  extBancosRender();
  extRenderLista();
  extPanelCargar();
}
// Las entradas de antes (Herramientas, el menú de soltar archivos, la revisión)
// abren la pantalla. Lo que ya estaba en la lista se conserva.
function extAbrir() { UI.nav('ext'); }
function extCerrar() { /* el conversor ya no es un cuadro: no hay nada que cerrar */ }

async function extBancosRender() {
  const box = xt$('xt-bancos'); if (!box) return;
  if (!EXT.bancos.length) {
    try { const r = await PY.call('herr_extracto_bancos'); EXT.bancos = (r && r.bancos) || []; } catch (e) { EXT.bancos = []; }
  }
  // La lista sale del registro que ejecuta el motor (_PARSERS), nunca escrita a mano.
  box.innerHTML = `<b class="xt-bl">Bancos calibrados</b>` + EXT.bancos.map(b => `<span>${_he(b)}</span>`).join('')
    + `<em onclick="event.stopPropagation()">¿Tu banco no está? Mandanos un resumen de muestra a contacto@getdexiae.com (podés tapar nombres y CUIT) y lo calibramos.</em>`;
}
function extQueGenera() {
  const d = xt$('ext-gen'); if (!d) return;
  if (!d.innerHTML) d.innerHTML = `<b>Siempre:</b> una hoja por resumen con fecha, detalle, CUIT, importe, saldo y el control de la cadena de saldos (+ «Resumen» si son varios) y «Acerca de este archivo».<br>
    <b>Con clasificación</b> (Contable, PRO): la columna Categoría y la hoja «Categorías».<br>
    <b>Con un cliente elegido:</b> el borrador de asientos — «Asientos (borrador)», «Para importar» y, si hace falta, «Pendientes» y «A revisar».`;
  d.hidden = !d.hidden;
  xt$('ext-gen-arrow').className = 'ti ti-chevron-' + (d.hidden ? 'down' : 'up');
}

// ── Los archivos ────────────────────────────────────────────────────────────
function extRenderLista() {
  const w = xt$('ext-list'); if (!w) return;
  const sop = EXT.archivos.filter(a => a.soportado).length, no = EXT.archivos.length - sop;
  const lbl = a => a.soportado
    ? `<span class="xt-st ok">${_he((a.banco || '').toUpperCase())}</span>`
    : `<span class="xt-st rev" title="Se omite al convertir">${a.banco ? _he(a.banco.toUpperCase()) + ' · sin calibrar' : 'banco no reconocido'}</span>`;
  const fila = (a, x) => `<div class="xt-arch"><i class="ti ti-file-type-pdf"></i><span class="n" title="${_he(a.nombre)}">${_he(a.nombre)}</span>${lbl(a)}${x}</div>`;
  // Mientras se reconoce el banco de lo que entró: cada archivo ya está en la
  // lista y arriba va cuántos faltan. Se lee UNO por vez: ése dice «leyendo…»
  // con sus segundos (un PDF pesado puede tardar varios), los demás «en cola».
  // Antes no se veía nada hasta el final y parecía colgada (01/10/2026).
  const L = EXT.leyendo;
  let lee = '';
  if (L) {
    const n = L.res.length, t = Math.max(1, L.total);
    const seg = Math.floor((Date.now() - (L.t0 || Date.now())) / 1000);
    lee = `<div class="xt-lista-t xt-lee"><span><i class="ti ti-loader-2 xt-gira"></i> Reconociendo el banco · ${Math.min(n + 1, t)} de ${t}</span>`
      + `<span class="xt-mini"><i style="width:${Math.round(100 * n / t)}%"></i></span></div>`
      + L.res.map(a => fila(a, '')).join('')
      + L.nombres.slice(n).map((nm, k) => `<div class="xt-arch lee"><i class="ti ti-file-type-pdf"></i><span class="n" title="${_he(nm)}">${_he(nm)}</span>`
        + (k === 0 ? `<span class="xt-st lee act">leyendo…${seg >= 2 ? ` ${seg} s` : ''}</span>` : '<span class="xt-st lee">en cola</span>') + '</div>').join('');
  }
  w.innerHTML = lee + (EXT.archivos.length
    ? (L ? '' : `<div class="xt-lista-t">${sop} ${sop === 1 ? 'resumen' : 'resúmenes'} para convertir${no ? ` · <span style="color:var(--rev-fg)">${no} se omite${no === 1 ? '' : 'n'}</span>` : ''}</div>`)
      + EXT.archivos.map((a, i) => fila(a, `<button class="xt-x" onclick="extQuitar(${i})" title="Quitar" ${EXT.corriendo || L ? 'disabled' : ''}><i class="ti ti-x"></i></button>`)).join('')
    : (L ? '' : '<div class="xt-lista-vacia">Todavía no elegiste resúmenes.</div>'));
  const lim = xt$('xt-limpiar'); if (lim) lim.hidden = EXT.archivos.length < 2 || EXT.corriendo;
  const dz = xt$('xt-drop'); if (dz) dz.classList.toggle('con', EXT.archivos.length > 0);
  extRevisarPintar();
}
function extQuitar(i) { if (EXT.corriendo) return; EXT.archivos.splice(i, 1); extRenderLista(); }
function extLimpiar() { if (EXT.corriendo) return; EXT.archivos = []; extRenderLista(); }
// Lo llama Python mientras reconoce el banco: {archivos:[nombres]} al empezar
// y {listo:{nombre,banco,soportado,ruta}} por cada uno que termina. También la
// pantalla al soltar, con los nombres, para que aparezcan en el acto.
function extLeyendo(d) {
  if (!d) return;
  if (d.archivos) {
    // Python repite la lista que la pantalla ya mostró al soltar: no se reinicia el reloj.
    const mismo = EXT.leyendo && !EXT.leyendo.res.length && EXT.leyendo.nombres.join('|') === d.archivos.join('|');
    if (!mismo) EXT.leyendo = {nombres: d.archivos.slice(), res: [], total: d.archivos.length, t0: Date.now()};
  } else if (d.listo && EXT.leyendo) { EXT.leyendo.res.push(d.listo); EXT.leyendo.t0 = Date.now(); }
  clearTimeout(EXT._tLee);
  // Los segundos del que se está leyendo corren solos, sin esperar a Python.
  if (EXT.leyendo && !EXT._tSeg) EXT._tSeg = setInterval(() => { if (EXT.leyendo) extRenderLista(); else { clearInterval(EXT._tSeg); EXT._tSeg = null; } }, 1000);
  // Si lo soltado nunca llega a leerse (no debería), no queda «leyendo…» para siempre.
  if (EXT.leyendo && !EXT.pidiendo) EXT._tLee = setTimeout(() => { if (!EXT.pidiendo) { EXT.leyendo = null; extRenderLista(); } }, 8000);
  extRenderLista();
}
async function extSeleccionar(nombres) {
  if (EXT.corriendo) { UI.toast('Esperá a que termine la conversión en curso', 'warn'); return; }
  if (EXT.pidiendo) { UI.toast('Estoy leyendo los resúmenes que agregaste: un momento', 'info'); return; }
  EXT.pidiendo = true;
  if (nombres && nombres.length) extLeyendo({archivos: nombres});
  let r; try { r = await PY.call('herr_extracto_seleccionar'); } catch (e) { r = null; }
  EXT.pidiendo = false; EXT.leyendo = null; clearTimeout(EXT._tLee);
  if (!r || !r.ok) { extRenderLista(); if (r && !r.cancelled) UI.toast((r && r.error) || 'No se pudo seleccionar', 'err'); return; }
  const exist = new Set(EXT.archivos.map(a => a.ruta || a.nombre));
  let nuevos = 0;
  (r.archivos || []).forEach(a => { if (!exist.has(a.ruta || a.nombre)) { EXT.archivos.push(a); nuevos++; } });
  extRenderLista();
  const noSop = (r.archivos || []).filter(a => !a.soportado).length;
  if (noSop) UI.toast(noSop === 1 ? 'Un archivo no es de un banco calibrado: se omite al convertir' : `${noSop} archivos no son de bancos calibrados: se omiten al convertir`, 'warn');
  else if (!nuevos && (r.archivos || []).length) UI.toast('Esos resúmenes ya estaban en la lista', 'info');
}

// ── El cliente ──────────────────────────────────────────────────────────────
async function extCargarClientes() {
  let r; try { r = await PY.call('imput_estado'); } catch (e) { r = null; }
  IMPUT.cap = !!(r && r.cap); IMPUT.clientes = (r && r.clientes) || [];
  extClientesPintar();
}
function extClientesPintar() {
  const s = xt$('ext-cliente'), b = xt$('ext-cli-btn'); if (!s) return;
  const cur = s.value;
  const viejos = (EXT.histClientes || []).filter(c => !IMPUT.clientes.includes(c));
  s.innerHTML = '<option value="">Todos los clientes</option>'
    + IMPUT.clientes.map(c => `<option value="${_he(c)}">${_he(c)}</option>`).join('')
    + (viejos.length ? `<optgroup label="Sólo en el Historial">${viejos.map(c => `<option value="${_he(c)}">${_he(c)}</option>`).join('')}</optgroup>` : '');
  if ([...s.options].some(o => o.value === cur)) s.value = cur;
  if (b) {
    b.innerHTML = _extCap() ? '<i class="ti ti-settings"></i> Configurar clientes' : '<i class="ti ti-lock"></i> Configurar clientes';
    b.classList.toggle('xt-lock', !_extCap());
  }
  extHintCliente();
}
function extClienteCambio() { extHintCliente(); extPanelCargar(); }
function extHintCliente() {
  const h = xt$('ext-cliente-hint'); if (!h) return;
  const cli = _extCliente();
  if (!_extCap()) {
    h.innerHTML = '<i class="ti ti-lock"></i> El Excel sale con los movimientos y la cadena de saldos controlada. La clasificación y el borrador de asientos están en DEXIAE Contable y PRO. <a onclick="UI.upsell(\'imputacion\')">Ver qué suma</a>';
  } else if (!IMPUT.clientes.length) {
    h.innerHTML = '<b>Todavía no configuraste ningún cliente.</b> Entrá a <a onclick="extConfigurar()">Configurar clientes</a> para crear el primero (o para traer uno que te pasaron en un archivo). Sin cliente, el Excel sale igual, pero sin el borrador de asientos.';
  } else if (!cli) {
    h.innerHTML = 'Sin cliente elegido: el Excel sale con los movimientos clasificados, <b>sin asientos</b>. Elegí el cliente arriba para sumar su borrador de asientos.';
  } else if (!IMPUT.clientes.includes(cli)) {
    h.innerHTML = `<span style="color:var(--rev-fg)">«${_he(cli)}» ya no está en tu Configuración Contable</span>: el Excel sale sin asientos.`;
  } else {
    h.innerHTML = `<b>Asientos para «${_he(cli)}»</b>, con su plan de cuentas. Convertí juntos sólo los resúmenes de este cliente.`;
  }
  extRevisarPintar();
}
function extConfigurar(cli, tab) {
  if (!_extCap()) { UI.upsell('imputacion'); return; }
  xt$('modal-imput').classList.add('show');
  imRenderSel(cli && IMPUT.clientes.includes(cli) ? cli : undefined);
  imCargar();
  if (tab) setTimeout(() => { try { imTab(tab); } catch (e) {} }, 250);
}

// «Revisar antes de generar»: recordada POR CLIENTE (15/09/2026).
async function extRevisarPintar() {
  const ch = xt$('ext-revisar'), row = xt$('ext-rev-row'), hint = xt$('ext-rev-hint'), btn = xt$('ext-run');
  if (!ch) return;
  if (REV.prefs === null) { try { const c = await PY.call('config_get'); REV.prefs = (c && c.revision_previa) || {}; } catch (e) { REV.prefs = {}; } }
  const cli = _extCliente(), valido = _extCap() && cli && IMPUT.clientes.includes(cli);
  row.hidden = !valido;
  ch.checked = valido ? (REV.prefs[cli] !== false) : false;
  hint.textContent = 'Te muestra lo que DEXIAE no pudo decidir y lo corregís ahí. Si no hay nada, genera directo.';
  const n = EXT.archivos.filter(a => a.soportado).length;
  if (btn) {
    btn.disabled = !n || EXT.corriendo || !!EXT.leyendo;
    const que = n > 1 ? ` ${n} resúmenes` : '';
    btn.innerHTML = (valido && ch.checked)
      ? `<i class="ti ti-list-check"></i> Convertir${que} y revisar`
      : `<i class="ti ti-table-export"></i> Convertir${que}`;
  }
}
async function extRevisarCambio() {
  const cli = _extCliente(); if (!cli) return;
  REV.prefs = REV.prefs || {}; REV.prefs[cli] = !!xt$('ext-revisar').checked;
  try { await PY.call('config_set', 'revision_previa', REV.prefs); } catch (e) {}
  extRevisarPintar();
}

// ── Convertir ───────────────────────────────────────────────────────────────
function _extOcupado(on) {
  EXT.corriendo = on;
  const c = xt$('xt-conv'); if (c) c.classList.toggle('ocupado', on);
  ['ext-cliente', 'ext-cli-btn', 'ext-revisar'].forEach(id => { const e = xt$(id); if (e) e.disabled = on; });
  extRenderLista();
}
async function extProcesar() {
  if (EXT.corriendo) return;
  if (!EXT.archivos.some(a => a.soportado)) { UI.toast('No hay resúmenes de bancos calibrados', 'warn'); return; }
  // Una revisión por vez. Si hay una minimizada, se decide antes de leer nada.
  if (REV.activa) {
    const seguir = await appConfirm('Revisión sin terminar',
      'Tenés una revisión sin terminar. ¿La continuás? Si elegís Cancelar, se descarta y se convierten estos resúmenes.');
    if (seguir) { revVolver(); return; }
    await PY.call('revision_cerrar'); revOcultar();
  }
  // Sólo los reconocidos: la lista ya dice que los otros «se omiten», y
  // mandarlos era volver a leerlos (un PDF pesado tarda varios segundos) para
  // terminar anotándolos como «resúmenes que no se pudieron leer» (01/10/2026).
  const van = EXT.archivos.filter(a => a.soportado), omitidos = EXT.archivos.filter(a => !a.soportado);
  _extOcupado(true);
  UI.extProgreso({actual: 0, total: van.length, nombre: 'Preparando…'});
  const cli = _extCliente() || null;
  const rev = !!(cli && !xt$('ext-rev-row').hidden && xt$('ext-revisar').checked);
  let r; try { r = await PY.call('herr_extracto_procesar', van.map(a => a.ruta), cli, rev); }
  catch (e) { r = {ok: false, error: 'Error inesperado'}; }
  UI.extProgreso(null); _extOcupado(false);
  if (!r || !r.ok) {
    if (r && !r.cancelled) UI.toast((r && r.error) || 'No se pudo convertir', 'err');
    return;   // la lista queda: se puede corregir y volver a intentar
  }
  EXT.archivos = []; extRenderLista();
  extPanelCargar(true);
  if (omitidos.length && (r.revision || r.paso3))
    UI.toast(omitidos.length === 1 ? 'Un archivo quedó afuera: no es de un banco calibrado' : `${omitidos.length} archivos quedaron afuera: no son de bancos calibrados`, 'info');
  if (r.revision) { revAbrir(r.revision); return; }
  if (r.paso3) { revFinal(r, {modal: true}); return; }
  extFinal(r, omitidos);
}
// Sin cliente (sin asientos): el cuadro del final, como el de la conversión con
// cliente. Antes era un cartel de texto que, además, no salía si la ruta del
// Excel tenía la palabra «demo» (01/10/2026: el Excel se generaba y no se veía).
// (07/10/2026) Entraron, pero el banco se reconoció con muy pocas filas: con
// tan pocas la cadena de saldos no controla nada. Lo usan las dos pantallas
// finales (sin cliente y con cliente / después de revisar).
function extPocasHtml(r) {
  const p = (r && r.pocas_filas) || [];
  if (!p.length) return '';
  return `<div class="rev-caja" style="margin-top:12px;border-color:var(--rev-fg)">
    <h3 style="color:var(--rev-fg)"><i class="ti ti-alert-triangle"></i> ${p.length === 1 ? 'Un resumen salió con muy pocas filas' : `${p.length} resúmenes salieron con muy pocas filas`}</h3>
    <ul>${p.slice(0, 6).map(x => `<li><b>${_he(x.nombre)}</b> (${_he(String(x.banco || '').toUpperCase())}): ${_he(x.motivo)}</li>`).join('')}</ul>
    <div class="opt-hint" style="margin:6px 0 0">Entró al Excel igual; el aviso queda también en la hoja «Acerca de este archivo».</div></div>`;
}

function extFinal(r, omitidos) {
  const v = r.verificacion || {}, des = v.desfases || [], arch = (r.ruta || '').split(/[\\/]/).pop();
  const fuera = (omitidos || []).map(a => ({nombre: a.nombre, motivo: a.banco ? `${String(a.banco).toUpperCase()}: banco sin calibrar` : 'no es de un banco calibrado'}))
    .concat((r.no_soportados || []).map(x => ({nombre: x.nombre, motivo: x.motivo || 'no se pudo leer'})));
  const cad = des.length
    ? `<h3 style="color:var(--err-fg)">La cadena de saldos no cierra en ${xtPl(des.length, 'punto', 'puntos')}</h3>
       <ul>${des.slice(0, 6).map(d => `<li>${_he(d.archivo || '')} · fila ${d.fila} (${_he(d.fecha || '')}): diferencia ${xtPesos(d.diferencia)}</li>`).join('')}</ul>
       ${des.length > 6 ? `<div class="opt-hint">…y ${des.length - 6} más.</div>` : ''}
       <div class="opt-hint" style="margin:6px 0 0">Revisá la columna «Verif. Saldo» del Excel antes de conciliar.</div>`
    : v.evaluados
      ? `<h3>La cadena de saldos cierra</h3><div class="opt-hint" style="margin:0">Los ${xtNum(v.evaluados)} saldos que imprime el banco coinciden con la suma de los movimientos.</div>`
      : '<h3>Cadena de saldos</h3><div class="opt-hint" style="margin:0">El resumen no trae saldos para controlar.</div>';
  const out = fuera.length
    ? `<h3>${fuera.length === 1 ? 'Quedó 1 archivo afuera' : `Quedaron ${fuera.length} archivos afuera`}</h3>
       <ul>${fuera.slice(0, 6).map(x => `<li><b>${_he(x.nombre)}</b> — ${_he(x.motivo)}</li>`).join('')}</ul>
       ${fuera.length > 6 ? `<div class="opt-hint">…y ${fuera.length - 6} más.</div>` : ''}`
    : '<h3>Entraron todos</h3><div class="opt-hint" style="margin:0">Todos los resúmenes se convirtieron.</div>';
  const sinAsi = _extCap() && !_extCliente()
    ? `<div class="opt-hint" style="margin:12px 0 0"><i class="ti ti-info-circle"></i> Salió sin el borrador de asientos porque no elegiste cliente. Elegilo arriba${IMPUT.clientes.length ? '' : ' (o crealo en «Configurar clientes»)'} y convertí de nuevo para sumarlo.</div>` : '';
  EXT.ultimo = {ruta: r.ruta || '', lote: r.lote_id || null};
  const html = `
    <h2 style="margin:0 0 4px;color:var(--txt)">✓ Excel generado</h2>
    <div class="opt-hint" style="margin:0">${_he(arch)} · ${xtPl(r.movimientos || 0, 'movimiento', 'movimientos')} · ${xtPl(r.hojas || 1, 'resumen', 'resúmenes')} (${_he((r.bancos || []).map(b => (EXT.bancos.find(x => x.toLowerCase().replace(/\s/g, '') === b) || b)).join(', '))})</div>
    <div class="cajas"><div class="rev-caja">${cad}</div><div class="rev-caja">${out}</div></div>
    ${extPocasHtml(r)}
    ${sinAsi}
    <div class="rev-ga" style="margin-top:14px">
      <button class="btn btn-primary" onclick="extAbrirExcel(EXT.ultimo.ruta)"><i class="ti ti-file-spreadsheet"></i> Abrir Excel</button>
      <button class="btn btn-ghost" onclick="extAbrirCarpeta(EXT.ultimo.ruta)"><i class="ti ti-folder"></i> Abrir carpeta</button>
      ${r.lote_id ? `<button class="btn btn-ghost" onclick="extFinalCerrar();extVerHist([EXT.ultimo.lote])"><i class="ti ti-history"></i> Ver en el Historial</button>` : ''}
      <button class="btn btn-ghost" style="margin-left:auto" onclick="extFinalCerrar()">Cerrar</button>
    </div>`;
  let m = xt$('modal-ext-fin');
  if (!m) {
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'modal-ext-fin';
    m.innerHTML = '<div class="modal" style="width:760px;max-height:calc(100vh - 32px);overflow:auto"><div class="modal-body rev-final" id="ext-fin-body"></div></div>';
    document.body.appendChild(m);
  }
  xt$('ext-fin-body').innerHTML = html;
  m.classList.add('show');
}
function extFinalCerrar() { const m = xt$('modal-ext-fin'); if (m) m.classList.remove('show'); }
function extAbrirCarpeta(ruta) { if (ruta) extAbrirExcel(ruta.replace(/[\\/][^\\/]*$/, '')); }
function extAbrirExcel(ruta) {
  if (!ruta) return;
  PY.call('abrir_path', ruta).then(rr => { if (rr && !rr.ok) UI.toast(rr.error || 'No se pudo abrir el Excel: abrilo desde la carpeta donde lo guardaste', 'warn'); })
    .catch(() => UI.toast('No se pudo abrir el Excel', 'warn'));
}

// ── El tablero ──────────────────────────────────────────────────────────────
function extPeriodo(d) { EXT.dias = d; extPanelCargar(); }
async function extPanelCargar(silencioso) {
  if (!xt$('xt-cuerpo')) return;
  document.querySelectorAll('#xt-per button').forEach(b => b.classList.toggle('act', Number(b.dataset.d) === EXT.dias));
  const cli = _extCliente();
  xt$('xt-sec-t').innerHTML = cli ? `Lo convertido de <b>${_he(cli)}</b>` : 'Lo convertido · <b>todos los clientes</b>';
  if (!silencioso && !EXT.d) xt$('xt-cuerpo').innerHTML = '<div class="hist-empty">Cargando…</div>';
  let r; try { r = await PY.call('extractos_panel', {cliente: cli, dias: EXT.dias}); } catch (e) { r = null; }
  if (!r || !r.ok) { xt$('xt-cuerpo').innerHTML = `<div class="hist-empty">${_he((r && r.error) || 'No se pudo armar el tablero')}</div>`; return; }
  EXT.d = r;
  xt$('xt-demo').hidden = !r.demo_ejemplo;
  const hc = r.clientes_historial || [];
  if (hc.join('|') !== (EXT.histClientes || []).join('|')) { EXT.histClientes = hc; extClientesPintar(); }
  extPintar(r);
}

function extPintar(r) {
  const c = xt$('xt-cuerpo'), k = r.kpis || {}, cap = !!r.clasifica, cli = (r.filtros || {}).cliente || '';
  if (r.vacio) {
    c.innerHTML = `<div class="ana-card xt-vacio"><i class="ti ti-building-bank"></i>
      <div><b>Todavía no convertiste resúmenes en esta computadora.</b>
      <div class="s">Soltá uno arriba. Después de cada conversión, acá ves los movimientos, cuánto se clasificó solo, los saldos de cada cuenta, el borrador de asientos y lo que conviene resolver.</div></div></div>`;
    return;
  }
  if (!k.conversiones) {
    c.innerHTML = `<div class="ana-card xt-vacio"><i class="ti ti-calendar-off"></i>
      <div><b>Sin conversiones ${cli ? 'de este cliente ' : ''}en este período.</b>
      <div class="s">${EXT.dias ? `<a onclick="extPeriodo(0)">Ver todo el historial</a>` : ''}${cli ? `${EXT.dias ? ' · ' : ''}<a onclick="xt$('ext-cliente').value='';extClienteCambio()">Ver todos los clientes</a>` : ''}</div></div></div>`;
    return;
  }
  const lock = (txt) => cap ? '' : ` xt-k-lock" onclick="UI.upsell('imputacion')" title="${_he(txt)}`;
  const cad = k.cadena_eval ? (k.cadena_ok === k.cadena_eval
      ? '<div class="d bien">todas cierran día por día</div>'
      : `<div class="d mal">${k.cadena_eval - k.cadena_ok} no cierra${k.cadena_eval - k.cadena_ok === 1 ? '' : 'n'}</div>`)
    : '<div class="d">sin saldos para controlar</div>';
  let h = `<div class="ana-kpis xt-kpis">
    <div class="ana-card ana-k"><div class="l">Resúmenes convertidos</div><div class="v">${xtNum(k.extractos)}</div>
      <div class="d">${xtNum(k.conversiones)} conversión${k.conversiones === 1 ? '' : 'es'}${k.cuentas ? ` · ${k.cuentas} cuenta${k.cuentas === 1 ? '' : 's'}` : ''}</div></div>
    <div class="ana-card ana-k"><div class="l">Movimientos</div><div class="v">${xtNum(k.movimientos)}</div>
      <div class="d">${k.sin_dato ? `${k.sin_dato} conversión${k.sin_dato === 1 ? '' : 'es'} anterior${k.sin_dato === 1 ? '' : 'es'} sin este dato` : 'leídos de los resúmenes'}</div></div>
    <div class="ana-card ana-k${lock('La clasificación está en DEXIAE Contable y PRO')}" title="Movimientos que tomaron una categoría por tus reglas al leer el resumen, antes de revisar">
      <div class="l">Clasificados solos${cap ? '' : ' <i class="ti ti-lock"></i>'}</div>
      <div class="v">${cap && k.clasificados_pct != null ? xtPct(k.clasificados_pct) + '<small> %</small>' : '—'}</div>
      <div class="d ${cap && k.sin_categoria ? 'ojo' : ''}">${!cap ? 'Contable y PRO' : k.clasificados_pct == null ? 'sin este dato en el período' : `${xtNum(k.clasificados)} de ${xtNum(k.clasif_base)}${k.sin_categoria ? ` · ${xtNum(k.sin_categoria)} sin categoría` : ''}`}</div></div>
    <div class="ana-card ana-k${lock('Los asientos están en DEXIAE Contable y PRO')}" title="Asientos pendientes o con la cuenta por defecto, al cerrar cada conversión">
      <div class="l">Para revisar${cap ? '' : ' <i class="ti ti-lock"></i>'}</div><div class="v">${cap ? xtNum(k.para_revisar) : '—'}</div>
      <div class="d ${cap && k.para_revisar ? 'ojo' : ''}">${cap ? (k.para_revisar ? 'asientos pendientes o con la cuenta por defecto' : 'nada quedó para revisar') : 'Contable y PRO'}</div></div>
    <div class="ana-card ana-k ${k.cadena_eval && k.cadena_ok < k.cadena_eval ? 'alerta' : ''}" title="Resúmenes cuyo saldo impreso coincide con la suma de los movimientos, día por día">
      <div class="l">Cadena de saldos</div><div class="v">${xtNum(k.cadena_ok)}<small> de ${xtNum(k.cadena_eval)}</small></div>${cad}</div>
    <div class="ana-card ana-k${lock('El borrador de asientos está en DEXIAE Contable y PRO')}">
      <div class="l">Asientos en borrador${cap ? '' : ' <i class="ti ti-lock"></i>'}</div><div class="v">${cap ? xtNum(k.asientos) : '—'}</div>
      <div class="d">${!cap ? 'Contable y PRO' : k.asientos == null ? 'elegí un cliente al convertir' : `${xtNum(k.importables)} para importar${k.pendientes ? ` · ${xtNum(k.pendientes)} pendientes` : ''}`}</div></div>
  </div>
  <div class="ana-fila2 xt-fila2">
    <div class="ana-card">${extUltimas(r)}</div>
    <div class="ana-card">${extCuentas(r)}</div>
  </div>
  <div class="ana-fila3">
    <div class="ana-card${cap ? '' : ' xt-bloq'}">${extClasif(r)}${cap ? '' : extVelo('Clasificación por categoría')}</div>
    <div class="ana-card${cap ? '' : ' xt-bloq'}">${extAsientos(r)}${cap ? '' : extVelo('Borrador de asientos')}</div>
    <div class="ana-card">${extAtender(r)}</div>
  </div>`;
  if (k.sin_dato) h += `<div class="ana-pie"><i class="ti ti-info-circle"></i> ${k.sin_dato} conversión${k.sin_dato === 1 ? '' : 'es'} del período ${k.sin_dato === 1 ? 'es' : 'son'} de antes de esta versión: muestra${k.sin_dato === 1 ? '' : 'n'} «—» en movimientos, clasificación y asientos porque no se guardaban. Desde ahora cada conversión los guarda.</div>`;
  c.innerHTML = h;
}
function extVelo(que) {
  return `<div class="xt-velo"><i class="ti ti-lock"></i><b>${_he(que)}</b>
    <div class="s">Está en DEXIAE Contable y PRO. El conversor a Excel sigue sin límite en tu plan.</div>
    <button class="btn btn-ghost sm" onclick="UI.upsell('imputacion')">Ver qué suma</button></div>`;
}

function extUltimas(r) {
  const U = r.ultimas || [], todas = (r.ids_periodo || []).length, cli = (r.filtros || {}).cliente || '', cap = !!r.clasifica;
  let h = `<div class="ana-ct"><i class="ti ti-history"></i>Últimas conversiones
    <span class="h">${todas > U.length ? `${U.length} de ${todas} · ` : ''}<a onclick="extVerHist(EXT.d.ids_periodo)">ver en el Historial</a></span></div>`;
  // El período va abajo del banco (con el cliente): con la tarjeta a media
  // pantalla, una columna más no entraba a 1366 px (01/10/2026).
  h += `<div class="xt-tabla"><table><thead><tr><th>Fecha</th><th>Banco · ${cli ? 'período' : 'cliente · período'}</th><th class="num">Movs.</th><th>Estado</th><th></th></tr></thead><tbody>`;
  h += U.map(u => {
    const acc = [];
    if (cap && (u.estado_revision === 'en_revision' || u.estado_revision === 'sin_terminar'))
      acc.push(`<button class="xt-ib" title="Revisar" onclick="extRevisar(${u.id})"><i class="ti ti-list-check"></i></button>`);
    acc.push(u.excel_existe
      ? `<button class="xt-ib" title="Abrir el Excel" onclick="extAbrirExcel(EXT.d.ultimas.find(x=>x.id===${u.id}).ruta_excel)"><i class="ti ti-file-spreadsheet"></i></button>`
      : `<button class="xt-ib" disabled title="${u.ruta_excel ? 'El Excel ya no está donde se guardó' : 'Todavía no tiene Excel'}"><i class="ti ti-file-spreadsheet"></i></button>`);
    acc.push(`<button class="xt-ib" title="Ver el detalle en el Historial" onclick="extVerHist([${u.id}])"><i class="ti ti-arrow-up-right"></i></button>`);
    const bancos = (u.bancos || []).join(' · ') || '—';
    return `<tr><td class="nw">${_he(xtFecha(u.fecha))}</td>
      <td><div class="xt-b">${_he(bancos)}${u.extractos > 1 ? ` <span class="xt-g">(${u.extractos})</span>` : ''}</div>
        <div class="xt-g">${[cli ? '' : (u.cliente ? _he(u.cliente) : 'sin cliente'), u.periodo ? _he(u.periodo) : ''].filter(Boolean).join(' · ') || '—'}</div></td>
      <td class="num">${xtNum(u.movimientos)}</td>
      <td><span class="xt-est ${u.estado}">${_he(u.estado_txt)}</span></td><td class="xt-acc-c">${acc.join('')}</td></tr>`;
  }).join('');
  return h + '</tbody></table></div>';
}

function extCuentas(r) {
  const cli = (r.filtros || {}).cliente || '';
  let h = `<div class="ana-ct"><i class="ti ti-building-bank"></i>Cuentas${cli ? ' del cliente' : ''} <span class="h">último resumen de cada una</span></div>`;
  if (!cli) {
    const cs = r.clientes_historial || [];
    return h + `<div class="ana-vacio">Elegí un cliente arriba para ver sus cuentas con el último saldo y si la cadena cierra.</div>`
      + (cs.length ? `<div class="xt-chips">${cs.slice(0, 8).map(c => `<button class="xt-chip" onclick="extElegir(${_he(JSON.stringify(c))})">${_he(c)}</button>`).join('')}</div>` : '');
  }
  const C = r.cuentas || [];
  if (!C.length) return h + '<div class="ana-vacio">Sin saldos guardados de este cliente: aparecen desde la próxima conversión.</div>';
  h += C.map(x => {
    const nom = _he(x.banco) + (x.de > 1 ? ` · cuenta ${x.cuenta} de ${x.de}` : '');
    const cad = x.sin_saldos ? '<span class="g"><i class="ti ti-minus"></i> el resumen no trae saldos</span>'
      : x.desfases ? `<span class="m"><i class="ti ti-alert-triangle"></i> ${x.desfases} punto${x.desfases === 1 ? '' : 's'} donde la cadena no cierra — ver «Verif. Saldo» en el Excel</span>`
      : x.evaluados ? '<span class="b"><i class="ti ti-circle-check"></i> la cadena de saldos cierra día por día</span>' : '';
    return `<div class="xt-cuenta"><div style="min-width:0"><div class="n">${nom}</div>
        <div class="s">${_he(x.periodo || '—')}${x.movimientos != null ? ` · ${xtNum(x.movimientos)} movimientos` : ''} · convertido ${_he(xtFecha(x.fecha))}</div></div>
      <div class="sal"><div class="s">saldo final</div>${x.sin_saldos ? '—' : xtPesos(x.final)}</div>
      <div class="cad">${cad}</div></div>`;
  }).join('');
  return h + '<div class="ana-nota"><i class="ti ti-info-circle"></i> Es el lado del banco listo para conciliar: DEXIAE no cruza contra el sistema contable del estudio.</div>';
}
function extElegir(c) { const s = xt$('ext-cliente'); if (!s) return; s.value = c; extClienteCambio(); }

function extClasif(r) {
  const L = r.clasificacion || [];
  let h = '<div class="ana-ct"><i class="ti ti-tags"></i>Cómo se clasificó <span class="h">al leer, antes de revisar</span></div>';
  if (!r.clasifica) L.length = 0;
  if (!L.length) return h + `<div class="ana-vacio">${r.clasifica ? 'Sin este dato en el período: se guarda desde esta versión.' : 'Cada movimiento con su categoría, por tus reglas.'}</div>`;
  // Las 7 que más movimientos tienen (y «Sin clasificar» siempre); «Ver todas»
  // despliega el resto acá mismo (01/10/2026).
  const max = Math.max(...L.map(x => x.movimientos), 1);
  const top = EXT.clasifTodas ? L.slice() : L.slice(0, 7), resto = EXT.clasifTodas ? [] : L.slice(7);
  const sin = L.find(x => x.sin);
  if (sin && !top.includes(sin)) { top.pop(); top.push(sin); }
  h += '<div class="ana-barras">' + top.map(x => `<div class="b"><span class="n" title="${_he(x.categoria)}">${_he(x.categoria)}</span>
      <div class="ana-pila"><span style="width:${Math.max(2, 100 * x.movimientos / max)}%;background:${x.sin ? 'var(--err-fg)' : '#2563EB'}"></span></div>
      <span class="tot">${xtNum(x.movimientos)}</span></div>`).join('') + '</div>';
  const nr = resto.filter(x => !top.includes(x));
  if (nr.length) h += `<div class="ana-nota">…y ${nr.length} categoría${nr.length === 1 ? '' : 's'} más (${xtNum(nr.reduce((a, x) => a + x.movimientos, 0))} movimientos). <a class="xt-mas" onclick="EXT.clasifTodas=true;extPintar(EXT.d)">Ver todas</a></div>`;
  else if (EXT.clasifTodas && L.length > 7) h += `<div class="ana-nota"><a class="xt-mas" onclick="EXT.clasifTodas=false;extPintar(EXT.d)">Ver menos</a></div>`;
  return h + `<div class="ana-leyenda"><span style="--c:#2563EB">por tus reglas</span><span style="--c:var(--err-fg)">sin categoría</span></div>`;
}

function extAsientos(r) {
  const a = r.asientos;
  let h = '<div class="ana-ct"><i class="ti ti-notebook"></i>Borrador de asientos <span class="h">última conversión con asientos</span></div>';
  if (!r.clasifica || !a) return h + '<div class="ana-vacio">Elegí un cliente arriba y convertí: el borrador de asientos de esa conversión aparece acá.</div>';
  const max = Math.max(a.generados || 0, 1);
  const fila = (n, txt, col) => `<div class="b"><span class="n">${txt}</span><div class="ana-pila"><span style="width:${n ? Math.max(2, 100 * n / max) : 0}%;background:${col}"></span></div><span class="tot">${xtNum(n)}</span></div>`;
  h += `<div class="ana-barras">${fila(a.generados, 'Generados', 'var(--ok-fg)')}${fila(a.importables, 'Para importar', '#2563EB')}
    ${fila(a.a_revisar, 'Con la cuenta por defecto', 'var(--rev-fg)')}${fila(a.pendientes, 'Pendientes (sin cuenta)', 'var(--err-fg)')}</div>`;
  h += `<div class="ana-nota">${a.desde ? `Asientos Nº ${xtNum(a.desde)} al ${xtNum(a.hasta)} · ` : ''}${a.cliente ? _he(a.cliente) + ' · ' : ''}${_he(xtFecha(a.fecha))}</div>`;
  if (a.excel_existe) h += `<div style="margin-top:8px"><button class="btn btn-ghost sm" onclick="extAbrirExcel(EXT.d.asientos.ruta_excel)"><i class="ti ti-file-spreadsheet"></i> Abrir el Excel</button></div>`;
  return h;
}

const XT_IC = {sin_cuenta: 'ti-list-check', banco_sin_config: 'ti-building-bank', cadena: 'ti-alert-triangle', revision: 'ti-eye-check', sin_leer: 'ti-file-alert'};
function extAtender(r) {
  const A = r.atender || [];
  let h = '<div class="ana-ct"><i class="ti ti-target-arrow"></i>Lo que conviene resolver</div>';
  if (!A.length) return h + '<div class="ana-vacio"><i class="ti ti-circle-check" style="color:var(--ok-fg)"></i> Nada pendiente en este período.</div>';
  return h + A.map((a, i) => `<div class="ana-acc"><div class="ic ${a.nivel === 'err' ? 'err' : 'rev'}"><i class="ti ${XT_IC[a.id] || 'ti-point'}"></i></div>
    <div style="min-width:0"><div class="t">${_he(a.titulo)}</div><div class="s">${_he(a.detalle)}</div></div>
    <button class="btn btn-ghost sm ir" onclick="extAccion(${i})">${_he(a.boton)}</button></div>`).join('');
}
function extAccion(i) {
  const a = EXT.d && (EXT.d.atender || [])[i]; if (!a) return;
  const x = a.accion || {};
  if (x.tipo === 'config') extConfigurar(x.cliente, x.tab);
  else if (x.tipo === 'historial') extVerHist(x.ids);
  else if (x.tipo === 'revisar') extRevisar(x.id);
}
function extVerHist(ids) {
  if (!ids || !ids.length) return;
  STATE.histIds = ids.slice(); STATE.histIdsDe = 'Extractos';
  UI.nav('hist');
}
function extRevisar(id) {
  if (REV.activa && REV.est && REV.est.lote_id === id) { revVolver(); return; }
  histRevisarDeNuevo(id, null);
}

// ── Arrastrar sobre la pantalla: el destino es el recuadro ya dibujado ─────
// (01/10/2026: antes se abría además el cartel del medio de toda la app.)
function extArrastre(on) {
  const dz = xt$('xt-drop'); if (!dz) return;
  dz.classList.toggle('arrastrando', !!on);
  const t = dz.querySelector('.t'), sb = dz.querySelector('.s');
  if (!t || !sb) return;
  if (on) {
    if (!dz.dataset.t) { dz.dataset.t = t.innerHTML; dz.dataset.s = sb.innerHTML; }
    t.textContent = 'Soltá los resúmenes acá';
    sb.textContent = 'Se suman a la lista para convertir';
  } else if (dz.dataset.t) {
    t.innerHTML = dz.dataset.t; sb.innerHTML = dz.dataset.s;
  }
}
// ── Soltar archivos con la pantalla abierta: van directo a la lista ─────────
function extSoltar() {
  if (typeof UI !== 'undefined' && !_extActiva()) UI.nav('ext');
  extSeleccionar();
}

// ── Demo del navegador: datos de ejemplo, dichos como tales ────────────────
if (typeof DEMO === 'object' && DEMO) {
  DEMO.extractos_panel = (f) => {
    const cli = (f && f.cliente) || '', dias = f && f.dias != null ? f.dias : 90;
    const hace = (d, h) => { const t = new Date(Date.now() - d * 864e5); t.setHours(h || 10, 15, 0, 0); return t.toISOString().slice(0, 19); };
    const U = [
      {id: 41, fecha: hace(1, 16), cliente: 'Estudio Demo SRL', bancos: ['Santander'], extractos: 1, periodo: '09/2026', movimientos: 1742, estado: 'rev', estado_txt: '38 para revisar', estado_revision: 'generado', ruta_excel: '(demo)/Extractos.xlsx', excel_existe: true},
      {id: 40, fecha: hace(2, 11), cliente: 'Estudio Demo SRL', bancos: ['Galicia'], extractos: 1, periodo: '09/2026', movimientos: 286, estado: 'ok', estado_txt: 'Listo', estado_revision: '', ruta_excel: '(demo)/Extractos.xlsx', excel_existe: true},
      {id: 39, fecha: hace(2, 11), cliente: 'Estudio Demo SRL', bancos: ['Mercado Pago'], extractos: 1, periodo: '09/2026', movimientos: 93, estado: 'err', estado_txt: 'La cadena de saldos no cierra', estado_revision: '', ruta_excel: '(demo)/Extractos.xlsx', excel_existe: true},
      {id: 37, fecha: hace(5, 9), cliente: 'Comercio Ejemplo SA', bancos: ['Macro'], extractos: 2, periodo: '09/2026', movimientos: 512, estado: 'rev', estado_txt: 'En revisión', estado_revision: 'en_revision', ruta_excel: '', excel_existe: false},
      {id: 31, fecha: hace(31, 9), cliente: 'Estudio Demo SRL', bancos: ['Santander'], extractos: 1, periodo: '08/2026', movimientos: 1655, estado: 'ok', estado_txt: 'Listo', estado_revision: '', ruta_excel: '(demo)/Extractos.xlsx', excel_existe: true},
      {id: 12, fecha: hace(70, 18), cliente: '', bancos: ['Galicia'], extractos: 1, periodo: '', movimientos: null, estado: 'ok', estado_txt: 'Listo', estado_revision: '', ruta_excel: '(demo)/Extractos.xlsx', excel_existe: false},
    ].filter(u => (!cli || u.cliente === cli) && (!dias || (Date.now() - new Date(u.fecha)) / 864e5 <= dias));
    const n = U.length, sd = U.filter(u => u.movimientos == null).length;
    const movs = U.reduce((a, u) => a + (u.movimientos || 0), 0);
    return {ok: true, demo_ejemplo: true, vacio: false, clasifica: true, filtros: {cliente: cli, dias},
      clientes_historial: ['Comercio Ejemplo SA', 'Estudio Demo SRL'],
      kpis: {conversiones: n, extractos: U.reduce((a, u) => a + u.extractos, 0), cuentas: cli ? 4 : 6, movimientos: n - sd ? movs : null, sin_dato: sd,
             clasificados: Math.round(movs * .913), clasif_base: movs, sin_categoria: Math.round(movs * .087), clasificados_pct: n - sd ? 91.3 : null,
             para_revisar: U.reduce((a, u) => a + (parseInt(u.estado_txt) || 0), 0), cadena_eval: U.reduce((a, u) => a + u.extractos, 0),
             cadena_ok: U.reduce((a, u) => a + u.extractos, 0) - U.filter(u => u.estado === 'err').length,
             asientos: n - sd ? Math.round(movs * .62) : null, importables: Math.round(movs * .6), pendientes: Math.round(movs * .02)},
      ultimas: U, ids_periodo: U.map(u => u.id),
      cuentas: cli === 'Estudio Demo SRL' ? [
        {banco: 'Galicia', cuenta: 1, de: 1, periodo: '09/2026', movimientos: 286, final: 1904220.4, sin_saldos: false, desfases: 0, evaluados: 30, lote_id: 40, fecha: hace(2, 11)},
        {banco: 'Mercado Pago', cuenta: 1, de: 1, periodo: '09/2026', movimientos: 93, final: 381004, sin_saldos: false, desfases: 1, evaluados: 20, lote_id: 39, fecha: hace(2, 11)},
        {banco: 'Santander', cuenta: 1, de: 2, periodo: '09/2026', movimientos: null, final: 4218330.15, sin_saldos: false, desfases: 0, evaluados: 22, lote_id: 41, fecha: hace(1, 16)},
        {banco: 'Santander', cuenta: 2, de: 2, periodo: '09/2026', movimientos: null, final: 12905117.8, sin_saldos: false, desfases: 0, evaluados: 22, lote_id: 41, fecha: hace(1, 16)}] : [],
      clasificacion: n - sd ? [{categoria: 'Proveedores', movimientos: 1402}, {categoria: 'Impuestos', movimientos: 861}, {categoria: 'Cobranzas', movimientos: 779},
        {categoria: 'Gastos bancarios', movimientos: 610}, {categoria: 'Transferencias', movimientos: 412}, {categoria: 'Sueldos', movimientos: 160},
        {categoria: 'Sin clasificar', movimientos: 106, sin: true}] : [],
      asientos: U.some(u => u.cliente === 'Estudio Demo SRL') ? {lote_id: 41, fecha: hace(1, 16), cliente: 'Estudio Demo SRL', generados: 1126, importables: 1077, pendientes: 49, a_revisar: 264, desde: 1203, hasta: 2328, sin_cuenta: [], ruta_excel: '(demo)/Extractos.xlsx', excel_existe: true} : null,
      atender: [
        {id: 'cadena', nivel: 'err', n: 1, titulo: '1 conversión con la cadena de saldos cortada', detalle: 'El saldo que imprime el banco no coincide con la suma de los movimientos en algún día: el Excel marca dónde, en la columna «Verif. Saldo».', boton: 'Ver en el Historial', accion: {tipo: 'historial', ids: [39]}},
        {id: 'sin_cuenta', nivel: 'rev', n: 264, cliente: 'Estudio Demo SRL', titulo: '2 categorías sin cuenta en Estudio Demo SRL', detalle: '«Transferencias» (212), «Sueldos» (52): en la última conversión fueron a la cuenta por defecto.', boton: 'Asignar cuentas', accion: {tipo: 'config', cliente: 'Estudio Demo SRL', tab: 'cats'}},
        {id: 'revision', nivel: 'rev', n: 1, titulo: '1 revisión sin terminar', detalle: 'Se procesaron con «Revisar antes de generar el Excel» y todavía no tienen su Excel.', boton: 'Revisar de nuevo', accion: {tipo: 'revisar', id: 37}},
      ].filter(a => !cli || !a.cliente || a.cliente === cli)};
  };
}
