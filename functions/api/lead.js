/* ═══════════════════════════════════════════════════════════════════════
   /api/lead — los leads de la web, para el Centro de control (08/10/2026)
   ═══════════════════════════════════════════════════════════════════════
   POR QUÉ EXISTE: los leads del formulario llegaban SÓLO como mail de
   Formspree, y había que cargarlos a mano en la planilla para seguirlos.
   Ahora lead.js manda, además, una copia acá; el Centro la lee y la pasa a
   la planilla con un botón. Formspree sigue igual (el mail llega igual).
   Declarado en /privacidad (sección 3).

   POST (lead.js, sin esperar la respuesta: la descarga nunca depende de esto):
     { nombre, email, whatsapp, interes, banco, perfil, volumen, como_llego,
       plan, billing, origen, utm }
   → `lead:<fecha ISO>-<azar>` en el KV `USO`, con 180 días de vida: lo que
     no se pasa a la planilla se borra solo.

   GET con «Authorization: Bearer <USO_CLAVE>»: todos (lo usa el Centro).
   DELETE ?id=<clave> con la misma: lo saca (ya pasado o descartado).
   Sin la clave, 404.

   ⚠️ NO se guarda la IP ni nada del pedido fuera de esos campos, recortados.
   ⚠️ Sin el KV configurado responde 204 y no hace nada.
   ═══════════════════════════════════════════════════════════════════════ */
const MAX_BODY = 4096;
const VIDA = 180 * 24 * 3600;
const RE_MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RE_ID = /^lead:\d{4}-\d{2}-\d{2}T[\d:.]+Z-[a-z0-9]{6}$/;
const CAMPOS = { nombre: 120, email: 120, whatsapp: 40, interes: 80, banco: 60, perfil: 60,
                 volumen: 40, como_llego: 80, plan: 40, billing: 20, origen: 120, utm: 200 };

function texto(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function autorizado(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return !!(env.USO && env.USO_CLAVE && auth === 'Bearer ' + env.USO_CLAVE);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.USO) return new Response(null, { status: 204 });
  let d;
  try {
    const crudo = await request.text();
    if (!crudo || crudo.length > MAX_BODY) return new Response(null, { status: 400 });
    d = JSON.parse(crudo);
  } catch (_) {
    return new Response(null, { status: 400 });
  }
  const l = {};
  for (const k in CAMPOS) l[k] = texto(d && d[k], CAMPOS[k]);
  l.email = l.email.toLowerCase();
  if (!RE_MAIL.test(l.email) && !l.whatsapp.replace(/\D/g, '')) return new Response(null, { status: 400 });
  l.fecha = new Date().toISOString();
  const clave = 'lead:' + l.fecha + '-' + Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  await env.USO.put(clave, JSON.stringify(l), { metadata: l, expirationTtl: VIDA });
  return new Response(null, { status: 204 });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!autorizado(request, env)) return new Response('Not found', { status: 404 });
  const leads = [];
  let cursor;
  do {
    const r = await env.USO.list({ prefix: 'lead:', cursor: cursor });
    for (const k of r.keys) leads.push(Object.assign({ id: k.name }, k.metadata || {}));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return new Response(JSON.stringify({ ok: true, leads: leads }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!autorizado(request, env)) return new Response('Not found', { status: 404 });
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!RE_ID.test(id)) return new Response(null, { status: 400 });
  await env.USO.delete(id);
  return new Response(null, { status: 204 });
}
