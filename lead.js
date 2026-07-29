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
  var DEXIAE_LINKS = {
    installer: 'https://github.com/dexiaesoporte-create/dexiae-releases/releases/download/v2.1.0/DEXIAE_Setup_V2.1.0.exe',
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
      footNote: '100 docs · 3 plantillas · Todas las funciones desbloqueadas · 100% offline',
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

  window.submitLead = async function (e) {
    e.preventDefault();
    var form = document.getElementById('lead-form');
    /* GATE REAL: sin datos válidos no se entrega nada */
    if (form && !form.checkValidity()) { form.reportValidity(); return; }
    var c = planConfig[currentPlan] || planConfig.TRIAL;
    var btn = document.getElementById('m-submit');
    btn.textContent = 'Procesando...'; btn.disabled = true;
    try {
      var fd = new FormData(form);
      fd.append('_plan', currentPlan);
      fd.append('_billing', billing());
      fd.append('_origen', location.pathname);   /* de qué página vino el lead */
      fd.append('_subject', 'Nuevo lead DEXIAE — ' + currentPlan +
        ((currentPlan === 'CORE' || currentPlan === 'PRO') ? ' (' + billing() + ')' : ''));
      await fetch(FORMSPREE_URL, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
    } catch (_) { /* no bloquea: igual mostramos el éxito */ }
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
