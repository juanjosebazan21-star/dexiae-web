/* ═══════════════════════════════════════════════════════════════════════
   /api/evento — contadores anónimos de la web (09/10/2026)
   ═══════════════════════════════════════════════════════════════════════
   POR QUÉ EXISTE: en el celular, «Ver un Excel de ejemplo» baja el archivo
   sin formulario (es la prueba de que sirve, y pedir datos antes espanta), y
   Cloudflare Web Analytics cuenta páginas, no descargas ni toques. No se
   sabía cuántos miraban el Excel ni cuántos tocaban WhatsApp después.

   POST (navigator.sendBeacon desde la página, texto plano): el nombre de un
     evento de EVENTOS. → suma 1 en `evento:<día en Argentina>:<evento>` del
     KV `USO`, con un año de vida.
   Las descargas de /app/ejemplos/* las cuenta functions/app/ejemplos/
   [archivo].js con las mismas claves (excel_<archivo>_<desde dónde>).

   GET con «Authorization: Bearer <USO_CLAVE>» (como /api/lead):
     { ok, dias: { "2026-10-09": { "wa_movil": 3, "excel_extracto_web": 7 } } }

   ⚠️ No se guarda NADA del visitante: ni IP, ni navegador, ni cookie. Sólo
      cuántas veces por día. Declarado en /privacidad (sección 3).
   ⚠️ KV no suma en forma atómica: dos toques en el mismo instante pueden
      contar uno. Para ver la tendencia alcanza.
   ⚠️ Sin el KV configurado responde 204 y no hace nada.
   ═══════════════════════════════════════════════════════════════════════ */
const VIDA = 365 * 24 * 3600;
const EVENTOS = new Set(['wa_movil', 'wa_tras_excel']);

function hoyAR() {
  /* el día en Argentina, no en UTC (igual que /api/uso) */
  let d;
  try { d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()); } catch (_) {}
  return /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/* misma función en functions/app/ejemplos/[archivo].js */
async function sumar(env, evento) {
  const clave = 'evento:' + hoyAR() + ':' + evento;
  const n = (parseInt(await env.USO.get(clave), 10) || 0) + 1;
  await env.USO.put(clave, String(n), { metadata: { n: n }, expirationTtl: VIDA });
}

function autorizado(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return !!(env.USO && env.USO_CLAVE && auth === 'Bearer ' + env.USO_CLAVE);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.USO) return new Response(null, { status: 204 });
  let e = '';
  try { e = (await request.text()).trim().slice(0, 40); } catch (_) {}
  if (!EVENTOS.has(e)) return new Response(null, { status: 400 });
  context.waitUntil(sumar(env, e).catch(() => {}));
  return new Response(null, { status: 204 });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!autorizado(request, env)) return new Response('Not found', { status: 404 });
  const dias = {};
  let cursor;
  do {
    const r = await env.USO.list({ prefix: 'evento:', cursor: cursor });
    for (const k of r.keys) {
      const [, dia, evento] = k.name.split(':');
      (dias[dia] = dias[dia] || {})[evento] = (k.metadata && k.metadata.n) || 0;
    }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return new Response(JSON.stringify({ ok: true, dias: dias }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
