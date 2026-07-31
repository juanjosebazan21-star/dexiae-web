/* ═══════════════════════════════════════════════════════════════════════
   /api/lead-fallo  —  BITÁCORA DE LOS LEADS QUE NO LLEGARON
   ═══════════════════════════════════════════════════════════════════════
   POR QUÉ EXISTE (31/07/2026):
   submitLead() manda el lead a Formspree y, pase lo que pase, dispara la
   descarga del instalador. Eso es intencional y no se toca: preferimos
   entregar el producto antes que perder al que ya se decidió.

   El problema era que el fallo no dejaba rastro. Había descargas confirmadas
   en GitHub Releases sin lead correspondiente y no había forma de saber si
   eran gente que se perdió o descargas de fuera del embudo. Dos modos de
   falla, los dos silenciosos:

     1. Formspree contesta pero rechaza (cuota agotada, rate limit, filtro
        de spam). El código hacía `await fetch(...)` y descartaba la
        respuesta, así que un 429 se veía igual que un 200.
     2. El fetch ni sale: uBlock, Brave o el DNS corporativo de un estudio
        bloquean el dominio formspree.io. El catch estaba vacío.

   POR QUÉ ESTA RUTA Y NO UN SEGUNDO POST DIRECTO A FORMSPREE:
   un POST de respaldo desde el navegador a otro formulario de Formspree
   arregla el modo 1 pero es CIEGO al modo 2 — el bloqueador tumba el
   dominio entero, no un formulario. Esta ruta es same-origin: para
   bloquearla habría que bloquear getdexiae.com, o sea la página que la
   persona está mirando. El salto a Formspree lo hace el edge, servidor a
   servidor, fuera del alcance de extensiones y proxies.

   El formulario de destino es DISTINTO del de los leads (xyklkprd) a
   propósito: si el modo 1 fue "cuota agotada", escribir al mismo form
   fallaría igual. Cuota separada = el fallo queda registrado.

   Formspree ya está declarado en /privacidad como el servicio que recibe
   los datos del formulario, así que un segundo formulario del MISMO
   proveedor y para la misma finalidad no suma un tercero nuevo.

   NO se registra IP ni país, aunque Cloudflare los tenga a mano: el
   argumento de venta del producto es que no recolectamos nada, y para
   diagnosticar un lead perdido no hacen falta. El user_agent sí viaja,
   porque es lo que distingue "se cayó Formspree" de "esta persona tiene
   un bloqueador".

   CÓDIGOS DE RESPUESTA (los lee la cola de reintento del cliente):
     204 → entregado, el cliente puede borrarlo de su cola
     502 → no se pudo reenviar, el cliente lo conserva y reintenta después
   Todo lo descartable (origen ajeno, cuerpo roto) devuelve 204: no tiene
   sentido que el navegador reintente algo que va a fallar siempre igual.

   PARA REVERTIR: borrar este archivo. El resto del sitio no lo necesita;
   el cliente trata la ruta caída como un fallo más y encola sin romperse.
   ═══════════════════════════════════════════════════════════════════════ */

const FORMSPREE_FALLOS = 'https://formspree.io/f/mgogbbrn';

/* El cuerpo son ~10 campos cortos más el user_agent. 4 KB es holgado y
   evita que alguien use la ruta para empujar basura a la bandeja. */
const MAX_BODY = 4096;

/* Producción, el www por si alguna vez se sirve, y los deploys de preview
   (<hash>.dexiae.pages.dev) para poder probar esto antes de publicar. */
const ORIGENES_OK = /^https:\/\/(www\.)?getdexiae\.com$|^https:\/\/([a-z0-9-]+\.)?dexiae\.pages\.dev$/;

export async function onRequestPost(context) {
  /* Origen ausente se ACEPTA a propósito: hay extensiones de privacidad que
     borran el header, y son justo las de la gente cuyo lead más nos importa
     rescatar. Perder un fallo real es peor que aceptar uno espurio — del
     otro lado hay una bandeja de Formspree con su propio filtro de spam. */
  const origin = context.request.headers.get('Origin');
  if (origin && !ORIGENES_OK.test(origin)) {
    return new Response(null, { status: 204 });
  }

  let payload;
  try {
    const crudo = await context.request.text();
    if (!crudo || crudo.length > MAX_BODY) return new Response(null, { status: 204 });
    payload = JSON.parse(crudo);
  } catch (_) {
    return new Response(null, { status: 204 });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return new Response(null, { status: 204 });
  }

  try {
    const r = await fetch(FORMSPREE_FALLOS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        /* Formshield (el filtro ML de Formspree) mandó a spam los dos primeros
           envíos de prueba, y un fallo en spam no genera notificación — o sea
           que el aviso no llega y volvemos a estar ciegos. Un POST servidor a
           servidor llega sin Origin ni Referer, que es exactamente la huella
           que un clasificador lee como bot. Los dos headers son ciertos: el
           envío SÍ se originó en una página de getdexiae.com. */
        Origin: 'https://getdexiae.com',
        Referer: 'https://getdexiae.com/'
      },
      body: JSON.stringify(payload),
      /* sin timeout, un Formspree colgado deja la Function esperando y el
         reintento del cliente nunca sabe si mandarlo de nuevo */
      signal: AbortSignal.timeout(5000)
    });
    return new Response(null, { status: r.ok ? 204 : 502 });
  } catch (_) {
    return new Response(null, { status: 502 });
  }
}
