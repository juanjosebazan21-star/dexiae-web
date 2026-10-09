/* ═══════════════════════════════════════════════════════════════════════
   /app/ejemplos/<archivo> — cuenta cada Excel de ejemplo que se baja (09/10/2026)
   ═══════════════════════════════════════════════════════════════════════
   El archivo se sirve igual que siempre (context.next()); acá sólo se suma 1
   en `evento:<día>:excel_<archivo>_<desde dónde>` del KV `USO`, sin esperar:
     excel_extracto_web    → desde una página del sitio (en la home, el botón
                             del celular: en compu ese botón no se ve)
     excel_extracto_demo   → desde la demo (/app/)
     excel_extraccion_demo
     …_directo / …_afuera  → link pegado o desde otro sitio
   Los totales se leen con GET /api/evento (ver ahí).

   No cuenta: bots ni vistas previas de links (por el User-Agent), pedidos
   HEAD ni pedidos por partes que no empiezan en el byte 0.
   ⚠️ No se guarda nada del visitante: sólo cuántas veces por día.
   ⚠️ Sin el KV configurado, el archivo se sirve igual y no se cuenta nada.
   ═══════════════════════════════════════════════════════════════════════ */
const VIDA = 365 * 24 * 3600;
const RE_ARCHIVO = /^DEXIAE_ejemplo_([a-z]+)\.xlsx$/;
const RE_BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless/i;

function hoyAR() {
  let d;
  try { d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()); } catch (_) {}
  return /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/* misma función en functions/api/evento.js */
async function sumar(env, evento) {
  const clave = 'evento:' + hoyAR() + ':' + evento;
  const n = (parseInt(await env.USO.get(clave), 10) || 0) + 1;
  await env.USO.put(clave, String(n), { metadata: { n: n }, expirationTtl: VIDA });
}

function origen(request) {
  const ref = request.headers.get('Referer') || '';
  if (!ref) return 'directo';
  try {
    const u = new URL(ref);
    if (u.hostname !== new URL(request.url).hostname && u.hostname !== 'getdexiae.com') return 'afuera';
    return u.pathname.startsWith('/app') ? 'demo' : 'web';
  } catch (_) {
    return 'directo';
  }
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const resp = await context.next();
  const m = RE_ARCHIVO.exec(String(params.archivo || ''));
  const rango = request.headers.get('Range');
  if (env.USO && m && resp.status === 200 && !RE_BOT.test(request.headers.get('User-Agent') || '') &&
      (!rango || /^bytes=0-/.test(rango))) {
    context.waitUntil(sumar(env, 'excel_' + m[1] + '_' + origen(request)).catch(() => {}));
  }
  /* el noindex de _headers puede no aplicarse a lo que devuelve una Function: por las dudas, va acá */
  const r = new Response(resp.body, resp);
  r.headers.set('X-Robots-Tag', 'noindex');
  return r;
}
