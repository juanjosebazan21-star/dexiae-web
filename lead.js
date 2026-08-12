/* ============================================================
   FORMULARIO DE LEADS — COMPARTIDO POR TODA LA WEB
   ============================================================
   Antes el modal vivía SOLO en index.html. Las páginas internas
   (extractos, casos de uso) mandaban a "/?plan=TRIAL", así que al
   apretar "Descargar prueba gratis" te sacaba de la página que
   estabas leyendo y te dejaba en la home. Perdías el contexto
   justo en el momento de convertir.

   Ahora el modal se inyecta en cualquier página que incluya este
   archivo y se abre EN EL LUGAR, sin navegar.

   Uso:  <script src="/lead.js" defer></script>
         <button onclick="openLead('TRIAL')">…</button>
   También abre solo si la URL trae ?plan=TRIAL (por si queda algún
   enlace viejo apuntando a la home con el parámetro).

   ⚠️ PENDIENTE DE UNIFICAR: index.html todavía tiene SU PROPIA copia
   del modal (markup + CSS + JS inline). Este archivo la replica para
   las páginas internas. Si cambiás precios, textos de plan o links de
   Mercado Pago, HAY QUE TOCAR LOS DOS LADOS hasta que la home migre
   a este archivo. No se migró junto con el resto para no arriesgar el
   camino principal de conversión en el mismo cambio.
   ============================================================ */
(function () {
  'use strict';
  if (window.__leadListo) return;
  window.__leadListo = true;

  var FORMSPREE_URL = 'https://formspree.io/f/xyklkprd';

  /* ── ORIGEN DE LA CAMPAÑA (UTM) ─────────────────────────────
     Por qué existe: la web NO tiene analítica (ni GA4 ni nada), así que
     un ?utm_source=instagram en la URL no lo leía nadie. Sin esto no hay
     forma de saber qué reel/carrusel trajo qué lead.

     Cómo funciona: se captura en el PRIMER pageview que traiga utm_* y se
     guarda en sessionStorage, así sobrevive a la navegación interna hasta
     que la persona completa el formulario (puede caer en la home con UTM y
     enviar el form desde /extractos-bancarios-excel).

     sessionStorage y no cookies a propósito: nada sale del navegador, no
     hay terceros y no cambia lo que promete /privacidad — o sea que no
     hace falta banner de consentimiento. El dato viaja solo dentro del
     mail de Formspree, junto al lead.

     Convención de utm_campaign: snake_case, igual al nombre de la pieza en
     la planilla de seguimiento (si no coinciden, no se pueden cruzar).  */
  function origenCampana() {
    var q = (location.search || '').replace(/^\?/, '');
    try {
      if (q.indexOf('utm_') > -1) sessionStorage.setItem('dx_utm', q);
      return sessionStorage.getItem('dx_utm') || '(directo)';
    } catch (_) {
      /* modo restringido: sin persistencia, pero si el UTM está en ESTA
         URL igual lo reportamos en vez de perderlo. */
      return q.indexOf('utm_') > -1 ? q : '(directo)';
    }
  }
  origenCampana();   /* captura al cargar, no al enviar */

  var DEXIAE_LINKS = {
    installer: 'https://github.com/dexiaesoporte-create/dexiae-releases/releases/download/v2.3.1/DEXIAE_Setup_V2.3.1.exe',
    whatsapp: 'https://wa.me/5493516574188?text=Hola!%20Quiero%20activar%20DEXIAE'
  };
  var MP_LINKS = {
    CORE: {
      monthly: 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=edd3249cabde4d0aa10001f73bfe7e4f',
      annual: 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=36d4523940f64923a39cc723003d5714'
    },
    PRO: {
      monthly: 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=f739212a89904cadb057722ad9f1e49d',
      annual: 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=bf0b764a56dd4059b7059ee3b89be994'
    }
  };

  /* el toggle mensual/anual sólo existe en la home; en el resto es mensual */
  function billing() {
    try { if (typeof currentBilling !== 'undefined' && currentBilling) return currentBilling; } catch (e) {}
    return 'monthly';
  }
  function mpUrlFor(plan) {
    var l = MP_LINKS[plan];
    return l ? (l[billing()] || l.monthly || '') : '';
  }

  var planConfig = {
    TRIAL: {
      pill: 'TRIAL · 14 DÍAS GRATIS',
      title: 'Probá DEXIAE 14 días gratis',
      sub: 'Dejanos tus datos y descargá el instalador en el acto. Los 14 días arrancan solos al instalar — sin claves, sin emails.',
      submitBtn: 'Descargar instalador y empezar',
      /* Decía "Todas las funciones desbloqueadas" y era falso: según EDICIONES
         en dexiae_license.py, el TRIAL no tiene deteccion_auto ni imputacion —
         son el gancho de upgrade a PRO. Se reemplaza por un beneficio que sí es
         cierto y además no estaba dicho en ningún lado del embudo. */
      footNote: '100 docs · 3 plantillas · Extractos bancarios ilimitados · 100% offline',
      successTitle: '¡Listo! Tu descarga inició',
      successSub: 'Si la descarga no comienza, hacé click en el botón. Una vez instalado, abrí DEXIAE y los 14 días de prueba arrancan automáticamente.',
      primaryLabel: '⇩ Descargar DEXIAE para Windows',
      primaryUrl: function () { return DEXIAE_LINKS.installer; },
      isDownload: true
    },
    CORE: {
      pill: 'PLAN CORE',
      title: 'Activar plan CORE',
      sub: 'Completá tus datos y te llevamos al pago seguro. La clave llega a tu email apenas se acredite.',
      submitBtn: 'Continuar al pago',
      footNote: 'Pago seguro vía Mercado Pago · Tu precio queda fijo',
      successTitle: 'Te llevamos al pago',
      successSub: 'Hacé click para completar tu suscripción en Mercado Pago. Apenas se acredite, recibís la clave por email.',
      primaryLabel: 'Ir a Mercado Pago →',
      primaryUrl: function () { return mpUrlFor('CORE'); },
      isDownload: false
    },
    PRO: {
      pill: 'PLAN PRO',
      title: 'Activar plan PRO',
      sub: 'Completá tus datos y te llevamos al pago seguro. La clave llega a tu email apenas se acredite.',
      submitBtn: 'Continuar al pago',
      footNote: 'Pago seguro vía Mercado Pago · Auditoría completa + Centinela',
      successTitle: 'Te llevamos al pago',
      successSub: 'Hacé click para completar tu suscripción PRO en Mercado Pago. Apenas se acredite, recibís la clave y onboarding.',
      primaryLabel: 'Ir a Mercado Pago →',
      primaryUrl: function () { return mpUrlFor('PRO'); },
      isDownload: false
    },
    SENTINEL: {
      pill: 'SENTINEL · ORGANIZACIONES',
      title: 'Cotización SENTINEL',
      sub: 'Dejanos tus datos y coordinamos una llamada para entender el alcance y armar la propuesta.',
      submitBtn: 'Solicitar cotización',
      footNote: 'Onboarding personal incluido · Soporte prioritario',
      successTitle: 'Solicitud recibida',
      successSub: 'En menos de 24 hs hábiles te escribimos para coordinar la llamada. Si querés acelerar, escribinos por WhatsApp.',
      primaryLabel: 'Escribir por WhatsApp',
      primaryUrl: function () { return DEXIAE_LINKS.whatsapp; },
      isDownload: false
    }
  };

  /* ── estilos: sólo si la página no los trae ya (la home los tiene) ── */
  var CSS = '' +
'.lm-overlay{position:fixed;inset:0;background:rgba(11,17,32,.66);backdrop-filter:blur(4px);z-index:100;display:none;align-items:center;justify-content:center;padding:20px}' +
'.lm-overlay.open{display:flex}' +
'.lm-box{background:#fff;border-radius:16px;width:480px;max-width:100%;max-height:92vh;overflow:auto;box-shadow:0 40px 90px rgba(0,0,0,.4);text-align:left}' +
'.lm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:24px 24px 0}' +
'.lm-pill{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;background:var(--ac-bg);color:var(--ac-deep);border:1px solid rgba(46,109,219,.25);padding:4px 10px;border-radius:100px;margin-bottom:10px}' +
'.lm-title{font-size:21px;font-weight:700;letter-spacing:-.02em;color:var(--ink);line-height:1.15;margin-bottom:6px}' +
'.lm-sub{font-size:13.5px;color:var(--ink2);line-height:1.5}' +
'.lm-close{flex-shrink:0;width:32px;height:32px;border-radius:8px;background:var(--paper);color:var(--ink2);font-size:18px;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer}' +
'.lm-close:hover{background:var(--pline)}' +
'.lm-body{padding:20px 24px 24px}' +
'.f-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
'.field{margin-bottom:12px}' +
'.field label{display:block;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink2);margin-bottom:6px}' +
'.field input,.field select{width:100%;height:42px;padding:0 12px;border:1px solid var(--pline2);border-radius:9px;font-size:14px;font-family:var(--sans);color:var(--ink);background:#fff;outline:none;transition:border-color .15s}' +
'.field input:focus,.field select:focus{border-color:var(--ac)}' +
'.lm-submit{width:100%;padding:13px;border-radius:10px;background:var(--ac);color:#fff;font-weight:600;font-size:14.5px;margin-top:6px;transition:background .18s;border:none;cursor:pointer}' +
'.lm-submit:hover{background:var(--ac2)}' +
'.lm-submit:disabled{opacity:.6;cursor:wait}' +
'.lm-note{margin-top:12px;font-size:11.5px;color:var(--ink3);text-align:center}' +
'.lm-success{padding:8px 24px 26px;display:none}' +
'.lm-ok-ic{width:60px;height:60px;border-radius:50%;background:rgba(31,157,99,.12);color:#1F9D63;display:flex;align-items:center;justify-content:center;font-size:28px;margin:8px auto 14px;border:1px solid rgba(31,157,99,.3)}' +
'.lm-ok-t{font-size:21px;font-weight:700;color:var(--ink);text-align:center;letter-spacing:-.02em;margin-bottom:8px}' +
'.lm-ok-s{font-size:14px;color:var(--ink2);text-align:center;line-height:1.55;max-width:360px;margin:0 auto 20px}' +
'.lm-primary{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;border-radius:10px;background:var(--ac);color:#fff;font-weight:600;font-size:14.5px}' +
'.lm-primary:hover{background:var(--ac2)}' +
'.lm-steps{margin-top:16px;padding:14px;background:var(--paper);border:1px solid var(--pline);border-radius:10px;font-size:13px;color:var(--ink2);line-height:1.55}' +
'.lm-steps b{color:var(--ink)}.lm-steps ol{margin:6px 0 0 18px}';

  var MARKUP = '' +
'<div class="lm-box">' +
' <div class="lm-head"><div>' +
'  <span class="lm-pill" id="m-pill">TRIAL</span>' +
'  <div class="lm-title" id="m-title"></div>' +
'  <div class="lm-sub" id="m-sub"></div>' +
' </div><button class="lm-close" onclick="closeLead()" aria-label="Cerrar">×</button></div>' +
' <div class="lm-body" id="m-form-wrap"><form id="lead-form" onsubmit="submitLead(event)">' +
'  <div class="f-row">' +
'   <div class="field"><label>Nombre</label><input name="name" type="text" required placeholder="Tu nombre" autocomplete="name"></div>' +
'   <div class="field"><label>Email</label><input name="email" type="email" required placeholder="vos@ejemplo.com" autocomplete="email"></div>' +
'  </div>' +
'  <div class="field"><label>¿Cuántos documentos procesás por mes? <span style="opacity:.55;text-transform:none;letter-spacing:0">(opcional)</span></label>' +
'   <select name="volumen" autocomplete="off">' +
'    <option value="">Elegí una opción</option><option>Menos de 100</option><option>Entre 100 y 500</option>' +
'    <option>Entre 500 y 2.000</option><option>Más de 2.000</option><option>No lo tengo medido</option>' +
'   </select></div>' +
'  <button type="submit" class="lm-submit" id="m-submit"></button>' +
'  <div class="lm-note" id="m-foot"></div>' +
' </form></div>' +
' <div class="lm-success" id="m-success">' +
'  <div class="lm-ok-ic">✓</div>' +
'  <div class="lm-ok-t" id="m-success-title"></div>' +
'  <p class="lm-ok-s" id="m-success-sub"></p>' +
'  <a id="m-action-primary" class="lm-primary" target="_blank" rel="noopener noreferrer"></a>' +
'  <div class="lm-steps" id="m-success-note"><b>Próximos pasos:</b><ol>' +
'   <li>Instalá el archivo .exe descargado.</li>' +
'   <li>Abrí DEXIAE — los 14 días de prueba arrancan automáticamente.</li>' +
'   <li>Cuando quieras seguir, elegí un plan desde la app o esta web.</li>' +
'  </ol></div>' +
' </div>';

  /* ══════════════════════════════════════════════════════════════════
     PRE-CHAT DE WHATSAPP — un enrutador, no un chatbot
     ══════════════════════════════════════════════════════════════════
     Antes el botón flotante mandaba a todos al mismo chat con la misma
     frase genérica ("Quiero saber más sobre DEXIAE"), y solo existía en
     la home. Tres problemas:

       · Casi nadie que toca "¿Dudas?" necesita hablar con una persona:
         tiene UNA pregunta que el trial contesta mejor y al instante.
         Cada uno de esos es alguien que no descargó.
       · Un click a WhatsApp no dejaba rastro — sin lead, sin email, sin
         _utm. El mismo punto ciego que tapamos en las descargas.
       · Depende de que haya alguien del otro lado. De noche el lead se
         enfría.

     Ahora el panel contesta la pregunta ahí mismo y lleva a descargar.
     WhatsApp queda para los dos casos donde un humano sí aporta: calibrar
     un banco (se adjunta el PDF en el chat) y las organizaciones.

     REGLAS QUE NO SE TOCAN:
     · La salida directa a WhatsApp está SIEMPRE visible. Un gate en una
       descarga es una cosa; un gate en soporte es otra — si alguien tiene
       un problema y lo metemos en un embudo, lo perdemos y encima queda
       la sensación de que lo manipulamos.
     · Sin "escribiendo…", sin avatar, sin nombre de vendedora inventada.
       DEXIAE se vende sobre confianza y le habla a contadores: simular
       una persona que no existe es el detalle que la quema.
     · El teal (--cta) es SOLO del botón de descargar. WhatsApp usa su
       verde pero en jerarquía secundaria.

     Maqueta aprobada: maquetas/prechat-whatsapp.html
     ══════════════════════════════════════════════════════════════════ */
  var WA_NUM = '5493516574188';

  /* Cada respuesta sale de algo verificable (FAQ de la home, /privacidad,
     la lista de bancos calibrados). Nada inventado. */
  var RAMAS = [
    { id: 'pdfs', q: '¿Sirve para mis documentos?', k: 'Facturas, recibos, remitos…',
      t: 'Sí, si tus PDFs se repiten',
      p: ['Definís la plantilla una vez —CUIT, fecha, número, total— y después procesás la carpeta entera. Hay 11 estrategias de extracción, incluida marcar una zona visual sobre el documento.',
          'Si la carpeta viene mezclada, la autodetección aplica la plantilla que corresponde a cada uno. Lo que no reconoce queda aparte como «Desconocidos»: <b>no se adivina</b>.'],
      dest: 'dl' },
    { id: 'precio', q: '¿Cuánto cuesta?', k: 'Planes y límites',
      t: 'Probalo antes de decidir',
      /* "todas las funciones desbloqueadas" era inexacto (falta autodetección e
         imputación, que son de PRO). Se dice lo que el trial SÍ trae, que ya es
         mucho, en vez de una generalización que no se sostiene. */
      p: ['14 días gratis y 100 documentos, con peritaje, Centinela, reportes y las 9 herramientas incluidos. Sin tarjeta y sin clave: instalás y los días arrancan solos.',
          'Los <b>extractos bancarios no consumen esos 100 documentos</b>: son ilimitados durante la prueba.',
          'Si después te sirve, ahí mirás los planes. Salir a comparar precios antes de saber si te resuelve el trabajo es el orden al revés.'],
      dest: 'dl' },
    { id: 'privacidad', q: '¿Mis datos están seguros?', k: 'Documentos de clientes',
      t: 'No hay nada que subir',
      p: ['Todo el procesamiento ocurre en tu computadora. Los documentos no se suben a ningún servidor, y funciona sin conexión a internet.',
          'No hay telemetría ni recolección de archivos. Está escrito en la <a class="pc-inl" href="/privacidad">política de privacidad</a> y en el EULA.'],
      dest: 'dl' },
    { id: 'banco', q: 'Mi banco no está en la lista', k: 'Extractos bancarios',
      t: 'Lo calibramos, sin costo',
      p: ['Mandanos uno o dos resúmenes de muestra y sumamos tu banco en poco tiempo. <b>Podés tapar los datos</b>: al motor le sirve la estructura del PDF, no los valores.',
          'Es el único caso donde te conviene el chat: adjuntás el PDF ahí mismo.'],
      dest: 'wa',
      wa: 'Hola! Mi banco no está en la lista de DEXIAE y quiero que lo calibren. Les paso un resumen de muestra.' },
    { id: 'org', q: 'Somos un estudio u organismo', k: 'Varios puestos, licencias',
      t: 'Eso lo armamos a medida',
      p: ['Para equipos existe SENTINEL: onboarding personal, soporte prioritario y una propuesta según la cantidad de puestos y el volumen.',
          'Coordinamos una llamada corta para entender el alcance antes de pasarte números.'],
      dest: 'wa',
      wa: 'Hola! Somos un estudio/organismo y queremos una propuesta de DEXIAE para varios puestos.' }
  ];
  var WA_DIRECTO = 'Hola! Quiero hacerles una consulta sobre DEXIAE.';

  function waUrl(txt) { return 'https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent(txt); }

  var PC_CSS = '' +
'.wa{position:fixed;right:22px;bottom:22px;z-index:70;display:flex;align-items:center;gap:10px;cursor:pointer;border:none;background:none;padding:0;font-family:var(--sans)}' +
'.wa-tip{background:#fff;border:1px solid var(--pline2);color:var(--ink);font-size:12.5px;font-weight:500;padding:8px 12px;border-radius:10px;box-shadow:0 8px 24px rgba(20,28,50,.16);opacity:0;transform:translateX(6px);transition:all .2s;pointer-events:none;white-space:nowrap}' +
'.wa:hover .wa-tip{opacity:1;transform:translateX(0)}' +
'.wa-bubble{width:52px;height:52px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(37,211,102,.4);flex-shrink:0}' +
'.wa-bubble svg{width:26px;height:26px;fill:#fff}' +
'.pc{position:fixed;right:22px;bottom:88px;width:352px;max-width:calc(100vw - 32px);z-index:71;background:#fff;border:1px solid var(--pline2);border-radius:14px;overflow:hidden;box-shadow:0 24px 64px rgba(20,28,50,.22);transform-origin:bottom right;display:none;text-align:left}' +
'.pc.open{display:block;animation:pcpop .22s cubic-bezier(.2,.9,.3,1.2)}' +
'@keyframes pcpop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}' +
'.pc-h{padding:15px 17px;border-bottom:1px solid var(--pline);display:flex;align-items:flex-start;gap:11px}' +
'.pc-mark{width:32px;height:32px;flex-shrink:0;object-fit:contain}' +
'.pc-h .t{font-family:var(--disp);font-size:14px;font-weight:600;color:var(--ink);letter-spacing:-.01em}' +
'.pc-h .s{font-size:12px;color:var(--ink3);margin-top:1px}' +
'.pc-x{margin-left:auto;background:none;border:none;color:var(--ink3);font-size:17px;cursor:pointer;line-height:1;padding:2px 4px}' +
'.pc-b{padding:15px 17px;max-height:52vh;overflow:auto}' +
'.pc-q{font-size:13.5px;color:var(--ink2);margin-bottom:11px;line-height:1.5}' +
'.pc-opt{display:block;width:100%;text-align:left;background:var(--paper);border:1px solid var(--pline);color:var(--ink);font-family:var(--sans);font-size:13.5px;font-weight:500;padding:11px 13px;border-radius:9px;margin-bottom:7px;cursor:pointer;transition:border-color .14s,background .14s}' +
'.pc-opt:hover{border-color:var(--ac);background:#fff}' +
'.pc-opt .k{display:block;font-size:11.5px;color:var(--ink3);font-weight:400;margin-top:2px}' +
/* sexta opción: hablar con una persona. Verde sólido de WhatsApp — NO el teal,
   que está reservado al botón de descargar y no debe diluirse. */
'.pc-opt-wa{display:flex;align-items:center;gap:10px;background:#25D366;border-color:#25D366;color:#fff;margin-top:11px}' +
'.pc-opt-wa:hover{background:#1FBA59;border-color:#1FBA59;color:#fff}' +
'.pc-opt-wa svg{width:19px;height:19px;fill:#fff;flex-shrink:0}' +
'.pc-opt-wa .k{color:rgba(255,255,255,.82)}' +
'.pc-ans{animation:pcfade .2s ease}' +
'@keyframes pcfade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}' +
'.pc-back{background:none;border:none;color:var(--ink3);font-size:12px;cursor:pointer;padding:0;margin-bottom:10px;font-family:var(--sans)}' +
'.pc-back:hover{color:var(--ac-deep)}' +
'.pc-ans h4{font-family:var(--disp);font-size:14.5px;font-weight:600;color:var(--ink);margin-bottom:7px;letter-spacing:-.01em}' +
'.pc-ans p{font-size:13.5px;color:var(--ink2);line-height:1.55}' +
'.pc-ans p+p{margin-top:8px}' +
'.pc-inl{color:var(--ac-deep);text-decoration:underline;text-underline-offset:2px}' +
'.pc-cta{margin-top:14px}' +
'.pc-dl{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:var(--cta);color:var(--cta-ink);font-family:var(--sans);font-weight:600;font-size:14px;padding:12px;border:none;border-radius:10px;cursor:pointer}' +
'.pc-dl:hover{background:var(--cta2);color:#fff}' +
'.pc-wa{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:#fff;color:var(--ink);border:1px solid var(--pline2);font-family:var(--sans);font-weight:600;font-size:14px;padding:12px;border-radius:10px;cursor:pointer}' +
'.pc-wa:hover{border-color:#25D366;color:#128C7E}' +
'.pc-wa svg{width:16px;height:16px;fill:#25D366}' +
'.pc-mail{margin-top:11px}' +
'.pc-mail label{display:block;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--ink3);margin-bottom:5px}' +
'.pc-mail input{width:100%;height:38px;padding:0 11px;border:1px solid var(--pline2);border-radius:8px;font-size:13.5px;font-family:var(--sans);color:var(--ink);outline:none}' +
'.pc-mail input:focus{border-color:var(--ac)}' +
'.pc-mail .hint{font-size:11.5px;color:var(--ink3);margin-top:5px}' +
'@media(max-width:520px){.pc{right:12px;left:12px;width:auto;bottom:84px}.wa{right:16px;bottom:16px}.wa-tip{display:none}}';

  var WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  function pcMenu() {
    var h = '<div class="pc-q">Contame qué te frena y te llevo al lugar correcto — sin vueltas.</div>';
    for (var i = 0; i < RAMAS.length; i++) {
      h += '<button type="button" class="pc-opt" data-rama="' + RAMAS[i].id + '">' +
           RAMAS[i].q + '<span class="k">' + RAMAS[i].k + '</span></button>';
    }
    /* La salida directa es una opción más de la lista, no un link al pie:
       ahí abajo se leía como letra chica y es justamente el camino que no
       hay que esconder. Verde sólido para que se lea "acá hablás con una
       persona" y no se confunda con las cinco de arriba. */
    h += '<button type="button" class="pc-opt pc-opt-wa" data-accion="directo">' +
         WA_SVG + '<span>Prefiero escribir directamente' +
         '<span class="k">Te respondemos por WhatsApp</span></span></button>';
    return h;
  }

  function pcAns(r) {
    var cta;
    if (r.dest === 'dl') {
      cta = '<div class="pc-cta"><button type="button" class="pc-dl" data-accion="descargar">⇩ &nbsp;Descargar prueba gratis</button></div>';
    } else {
      cta = '<div class="pc-cta">' +
            '<button type="button" class="pc-wa" data-accion="wa" data-rama="' + r.id + '">' + WA_SVG + 'Abrir WhatsApp</button>' +
            '<div class="pc-mail"><label>Tu email <span style="text-transform:none;letter-spacing:0;font-weight:400">(opcional)</span></label>' +
            /* name="email" además del id: registrarFallo() lee los campos por
               name, así que sin esto un fallo se registraría sin el mail y no
               habría a quién escribirle */
            '<input type="email" id="pc-email" name="email" placeholder="vos@ejemplo.com" autocomplete="email">' +
            '<div class="hint">Por si se corta el chat, para poder retomarlo.</div></div></div>';
    }
    var ps = '';
    for (var i = 0; i < r.p.length; i++) ps += '<p>' + r.p[i] + '</p>';
    return '<div class="pc-ans"><button type="button" class="pc-back" data-accion="volver">← Volver</button>' +
           '<h4>' + r.t + '</h4>' + ps + cta + '</div>';
  }

  /* Si dejó el email, el contacto se registra como lead antes de abrir el
     chat — con _utm, que es la única forma de saber de qué campaña vino
     (WhatsApp no propaga UTM). Si falla, cae en la misma bitácora que el
     resto: no se pierde y la persona igual llega al chat. */
  async function leadDesdeWA(rama, email, form) {
    var fallo = null;
    try {
      var fd = new FormData();
      fd.append('email', email);
      fd.append('_plan', 'WHATSAPP-' + rama);
      fd.append('_origen', location.pathname);
      fd.append('_utm', origenCampana());
      fd.append('_subject', 'Consulta por WhatsApp — ' + rama);
      var res = await fetch(FORMSPREE_URL, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      if (!res.ok) fallo = 'HTTP ' + res.status;
    } catch (err) {
      fallo = 'network-error: ' + ((err && (err.name || err.message)) || 'desconocido');
    }
    if (fallo) registrarFallo(fallo, 'WHATSAPP-' + rama, form);
  }

  function pcRender(html) {
    var b = document.getElementById('pc-body');
    if (b) b.innerHTML = html;
  }
  window.abrirPrechat = function () {
    var p = document.getElementById('prechat');
    if (!p) return;
    pcRender(pcMenu());
    p.classList.add('open');
  };
  window.cerrarPrechat = function () {
    var p = document.getElementById('prechat');
    if (p) p.classList.remove('open');
  };

  function montarPrechat() {
    if (document.getElementById('prechat')) return;

    var st = document.createElement('style');
    st.textContent = PC_CSS;
    document.head.appendChild(st);

    var fab = document.createElement('button');
    fab.className = 'wa';
    fab.type = 'button';
    fab.id = 'wa-fab';
    fab.setAttribute('aria-label', 'Abrir ayuda rápida');
    fab.innerHTML = '<span class="wa-tip">¿Dudas? Te orientamos en 10 segundos</span>' +
                    '<span class="wa-bubble">' + WA_SVG + '</span>';
    fab.addEventListener('click', function () {
      var p = document.getElementById('prechat');
      if (p && p.classList.contains('open')) cerrarPrechat(); else abrirPrechat();
    });
    document.body.appendChild(fab);

    var pc = document.createElement('div');
    pc.className = 'pc';
    pc.id = 'prechat';
    pc.innerHTML =
      '<div class="pc-h"><img class="pc-mark" src="/logo-marca-light.svg" alt="" width="32" height="32">' +
      '<div><div class="t">¿Qué necesitás resolver?</div>' +
      '<div class="s">Elegí una y te llevo al lugar correcto</div></div>' +
      '<button type="button" class="pc-x" data-accion="cerrar" aria-label="Cerrar">&times;</button></div>' +
      '<div class="pc-b" id="pc-body"></div>';   /* la salida directa vive en el menú */
    document.body.appendChild(pc);

    /* un solo listener delegado: el cuerpo se re-renderiza entero en cada
       paso, así que enganchar por elemento obligaría a re-enganchar siempre */
    pc.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-accion],[data-rama]') : null;
      if (!el) return;
      var acc = el.getAttribute('data-accion');
      var rama = el.getAttribute('data-rama');

      if (acc === 'cerrar') return cerrarPrechat();
      if (acc === 'volver') return pcRender(pcMenu());
      if (acc === 'descargar') { cerrarPrechat(); return openLead('TRIAL'); }
      if (acc === 'directo') { window.open(waUrl(WA_DIRECTO), '_blank', 'noopener'); return cerrarPrechat(); }
      if (acc === 'wa') {
        var r = buscarRama(rama);
        var inp = document.getElementById('pc-email');
        var email = inp ? String(inp.value || '').trim() : '';
        /* la ventana se abre SIEMPRE y primero: si esperáramos al fetch, el
           navegador lo trataría como popup no pedido por el usuario */
        window.open(waUrl(r ? r.wa : WA_DIRECTO), '_blank', 'noopener');
        if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) leadDesdeWA(rama, email, pc);
        return cerrarPrechat();
      }
      if (rama && !acc) {
        var rr = buscarRama(rama);
        if (rr) pcRender(pcAns(rr));
      }
    });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarPrechat(); });
  }

  function buscarRama(id) {
    for (var i = 0; i < RAMAS.length; i++) if (RAMAS[i].id === id) return RAMAS[i];
    return null;
  }

  function montar() {
    if (!document.getElementById('lead-modal')) {
      var st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
      var ov = document.createElement('div');
      ov.className = 'lm-overlay';
      ov.id = 'lead-modal';
      ov.innerHTML = MARKUP;
      document.body.appendChild(ov);
    }
    var modal = document.getElementById('lead-modal');
    modal.addEventListener('click', function (e) { if (e.target === modal) closeLead(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLead(); });

    /* enlaces viejos del tipo /?plan=TRIAL siguen funcionando */
    var p = (new URLSearchParams(location.search).get('plan') || '').toUpperCase();
    if (p && planConfig[p]) {
      setTimeout(function () { openLead(p); }, 120);
      history.replaceState({}, '', location.pathname + location.hash);
    }

    /* drena los leads perdidos que hayan quedado encolados en visitas
       anteriores (ej. la persona estaba sin conexión cuando falló) */
    enviarFallosPendientes();

    montarPrechat();
  }

  var currentPlan = 'TRIAL';

  window.openLead = function (plan) {
    currentPlan = planConfig[plan] ? plan : 'TRIAL';
    var c = planConfig[currentPlan];
    document.getElementById('m-pill').textContent = c.pill;
    document.getElementById('m-title').textContent = c.title;
    document.getElementById('m-sub').textContent = c.sub;
    var b = document.getElementById('m-submit');
    b.textContent = c.submitBtn; b.disabled = false;
    document.getElementById('m-foot').textContent = c.footNote;
    document.getElementById('m-form-wrap').style.display = '';
    document.getElementById('m-success').style.display = 'none';
    var f = document.getElementById('lead-form'); if (f) f.reset();
    document.getElementById('lead-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeLead = function () {
    var m = document.getElementById('lead-modal');
    if (m) m.classList.remove('open');
    document.body.style.overflow = '';
  };

  /* ── BITÁCORA DE LEADS PERDIDOS ─────────────────────────────────────
     Espejo de lo mismo en index.html (misma deuda de arriba: tocar LOS DOS).

     La descarga NO se bloquea nunca por un fallo de lead: eso es deliberado
     y sigue igual. Lo que cambia es que el fallo deja rastro. Antes, un
     Formspree que rechazaba el POST (cuota, rate limit, spam) o un
     bloqueador que tumbaba el dominio se veían exactamente igual que un
     envío exitoso, y quedaban descargas en GitHub sin lead que las explique.

     Se postea a /api/lead-fallo — same-origin, así que ningún bloqueador lo
     puede tirar abajo — y esa Function lo reenvía desde el edge a un
     Formspree aparte. El porqué completo está en
     web/functions/api/lead-fallo.js.

     Si ni eso sale (sin conexión), el intento queda en localStorage y se
     reintenta en la próxima carga de página. */
  var FALLOS_URL = '/api/lead-fallo';
  var FALLOS_KEY = 'dx_leads_fallidos';
  var FALLOS_MAX = 20;   /* tope duro: la cola no puede crecer sin límite */

  function campoLead(form, n) {
    var el = form && form.querySelector('[name="' + n + '"]');
    return el ? String(el.value || '').trim() : '';
  }
  function leerFallos() {
    try {
      var c = JSON.parse(localStorage.getItem(FALLOS_KEY) || '[]');
      return Array.isArray(c) ? c : [];
    } catch (_) { return []; }
  }
  function guardarFallos(c) {
    try { localStorage.setItem(FALLOS_KEY, JSON.stringify(c.slice(-FALLOS_MAX))); } catch (_) {}
  }
  function armarFallo(motivo, plan, form) {
    var ahora = new Date(), email = campoLead(form, 'email');
    return {
      evento_id: ahora.getTime() + '-' + Math.random().toString(36).slice(2, 8),
      _subject: '⚠️ LEAD PERDIDO — ' + plan + ' — ' + motivo,
      _replyto: email,   /* "Responder" en la notificación escribe directo a la persona */
      _plan: plan,
      motivo: motivo,
      nombre: campoLead(form, 'name'),
      email: email,
      volumen: campoLead(form, 'volumen'),
      timestamp: ahora.toISOString(),
      /* hour12:false explícito: sin esto algunos navegadores rinden es-AR en
         12h SIN el AM/PM, y "01:52" no se distingue de las 13:52 al leerlo */
      hora_ar: ahora.toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba', hour12: false }),
      _utm: origenCampana(),
      _origen: location.pathname,
      user_agent: navigator.userAgent
    };
  }
  async function enviarFallosPendientes() {
    var cola = leerFallos();
    if (!cola.length) return;
    var entregados = [];
    for (var i = 0; i < cola.length; i++) {
      try {
        var r = await fetch(FALLOS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cola[i]),
          keepalive: true
        });
        if (r.ok) entregados.push(cola[i].evento_id);   /* 502 = no se reenvió: queda encolado */
      } catch (_) { /* sigue en la cola */ }
    }
    if (!entregados.length) return;
    /* releer y filtrar por id en vez de pisar con una foto vieja: puede
       haberse encolado un fallo nuevo mientras drenábamos */
    guardarFallos(leerFallos().filter(function (p) {
      return entregados.indexOf(p.evento_id) === -1;
    }));
  }
  function registrarFallo(motivo, plan, form) {
    guardarFallos(leerFallos().concat([armarFallo(motivo, plan, form)]));
    enviarFallosPendientes();   /* sin await: la descarga no espera a esto */
  }

  window.submitLead = async function (e) {
    e.preventDefault();
    var form = document.getElementById('lead-form');
    /* GATE REAL: sin datos válidos no se entrega nada */
    if (form && !form.checkValidity()) { form.reportValidity(); return; }
    var c = planConfig[currentPlan] || planConfig.TRIAL;
    var btn = document.getElementById('m-submit');
    btn.textContent = 'Procesando...'; btn.disabled = true;
    /* El lead se intenta enviar, pero un fallo NO frena la descarga: sale
       igual y el intento perdido queda registrado para rescatarlo a mano. */
    var fallo = null;
    try {
      var fd = new FormData(form);
      fd.append('_plan', currentPlan);
      fd.append('_billing', billing());
      fd.append('_origen', location.pathname);   /* de qué página vino el lead */
      fd.append('_utm', origenCampana());        /* de qué pieza/campaña vino */
      fd.append('_subject', 'Nuevo lead DEXIAE — ' + currentPlan +
        ((currentPlan === 'CORE' || currentPlan === 'PRO') ? ' (' + billing() + ')' : ''));
      var res = await fetch(FORMSPREE_URL, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      if (!res.ok) fallo = 'HTTP ' + res.status;   /* cuota agotada, rate limit, filtro de spam */
    } catch (err) {
      /* el fetch ni salió: bloqueador, DNS corporativo, o sin conexión */
      fallo = 'network-error: ' + ((err && (err.name || err.message)) || 'desconocido');
    }
    if (fallo) registrarFallo(fallo, currentPlan, form);   /* no bloquea: el éxito se muestra igual */
    var url = c.primaryUrl();
    document.getElementById('m-form-wrap').style.display = 'none';
    document.getElementById('m-success').style.display = 'block';
    document.getElementById('m-success-title').textContent = c.successTitle;
    document.getElementById('m-success-sub').textContent = c.successSub;
    var primary = document.getElementById('m-action-primary');
    primary.textContent = c.primaryLabel;
    if (!url) {
      primary.removeAttribute('href');
      primary.style.opacity = '.55'; primary.style.pointerEvents = 'none';
    } else {
      primary.href = url;
      primary.style.opacity = ''; primary.style.pointerEvents = '';
      if (c.isDownload) primary.setAttribute('download', ''); else primary.removeAttribute('download');
    }
    document.getElementById('m-success-note').style.display = (currentPlan === 'TRIAL') ? '' : 'none';
    if (c.isDownload && url) { try { primary.click(); } catch (_) {} }
    btn.textContent = c.submitBtn; btn.disabled = false;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
