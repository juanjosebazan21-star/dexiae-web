/* ═══════════════════════════════════════════════════════════════════════
   /api/uso — la señal de uso de DEXIAE (07/10/2026, desde la 2.9.2)
   ═══════════════════════════════════════════════════════════════════════
   POR QUÉ EXISTE: sin esto no se sabía si alguien que bajó la prueba la
   instaló, ni cuándo un cliente dejó de usar DEXIAE (para preguntarle si le
   pasa algo). Está declarado en la EULA (6.2) y en /privacidad, y se apaga
   desde Preferencias en la app.

   POST (lo manda la app, como mucho una vez por día al abrir):
     { instalacion: 32 hex al azar (se genera en la PC al instalar),
       licencia:    64 hex = código derivado de la clave (no la clave) o "",
       version, edicion,
       registro?:   { nombre, contacto }  ← sólo si la persona lo deja al
                                            empezar la prueba }
   → la ficha de esa instalación en el KV `USO`: primera vez, último día,
     días con uso, versión, edición, licencia y el registro. Con registro,
     además llega un mail (Formspree) para escribirle.

   GET con «Authorization: Bearer <USO_CLAVE>» (lo usa el Centro de control):
     todas las fichas. Sin la clave, 404.

   ⚠️ NO se guarda la IP ni ningún otro dato del pedido: sólo los campos de
   arriba, validados. Un campo con otra forma se descarta.
   ⚠️ Si el KV no está configurado, responde 204 y no hace nada: la app no se
   entera ni se traba.
   ═══════════════════════════════════════════════════════════════════════ */
const MAX_BODY = 2048;
const FORMSPREE_REGISTRO = 'https://formspree.io/f/xyklkprd';
const RE_INST = /^[0-9a-f]{32}$/;
const RE_LIC = /^[0-9a-f]{64}$/;
const RE_VER = /^\d{1,2}\.\d{1,2}\.\d{1,3}$/;
const RE_ED = /^[A-ZÁÉÍÓÚ ()0-9]{3,30}$/;

function texto(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.USO) return new Response(null, { status: 204 });
  let d;
  try {
    const crudo = await request.text();
    if (!crudo || crudo.length > MAX_BODY) return new Response(null, { status: 204 });
    d = JSON.parse(crudo);
  } catch (_) {
    return new Response(null, { status: 400 });
  }
  if (!d || !RE_INST.test(String(d.instalacion || ''))) return new Response(null, { status: 400 });

  /* el día en Argentina, no en UTC: si no, lo usado después de las 21 cae al día siguiente */
  let hoy;
  try {
    hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  } catch (_) {
    hoy = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hoy)) hoy = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const clave = 'inst:' + d.instalacion;
  const f = (await env.USO.get(clave, 'json')) || { primera: hoy, dias: 0 };
  if (f.ultima !== hoy) f.dias = (f.dias || 0) + 1;
  f.ultima = hoy;
  if (RE_VER.test(String(d.version || ''))) f.version = d.version;
  if (RE_ED.test(String(d.edicion || ''))) f.edicion = d.edicion;
  if (RE_LIC.test(String(d.licencia || ''))) f.licencia = d.licencia;

  const reg = d.registro && typeof d.registro === 'object' ? d.registro : null;
  const contacto = reg ? texto(reg.contacto, 120) : '';
  if (contacto) {
    f.registro = { nombre: texto(reg.nombre, 80), contacto: contacto, fecha: hoy };
    /* el mail para escribirle: no espera la respuesta para contestarle a la app */
    context.waitUntil(fetch(FORMSPREE_REGISTRO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: 'Empezó la prueba de DEXIAE y dejó su contacto',
        nombre: f.registro.nombre, contacto: contacto,
        version: f.version || '', instalacion: d.instalacion, _plan: 'TRIAL-APP'
      })
    }).catch(() => {}));
  }
  /* la ficha va también como metadata: el Centro la lista sin una lectura por clave */
  await env.USO.put(clave, JSON.stringify(f), { metadata: f });
  return new Response(null, { status: 204 });
}

function autorizado(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return !!(env.USO && env.USO_CLAVE && auth === 'Bearer ' + env.USO_CLAVE);
}

/* DELETE ?instalacion=<32 hex> con la clave del Centro: borra esa ficha (un
   pedido de baja de datos, o limpiar una prueba). */
export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!autorizado(request, env)) return new Response('Not found', { status: 404 });
  const inst = new URL(request.url).searchParams.get('instalacion') || '';
  if (!RE_INST.test(inst)) return new Response(null, { status: 400 });
  await env.USO.delete('inst:' + inst);
  return new Response(null, { status: 204 });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!autorizado(request, env)) {
    return new Response('Not found', { status: 404 });
  }
  const fichas = [];
  let cursor;
  do {
    const r = await env.USO.list({ prefix: 'inst:', cursor: cursor });
    for (const k of r.keys) {
      fichas.push(Object.assign({ instalacion: k.name.slice(5) }, k.metadata || {}));
    }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return new Response(JSON.stringify({ ok: true, fichas: fichas }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
