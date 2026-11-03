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

   (03/11/2026) AVISO POR TELEGRAM: el Centro de control sólo avisa mientras
   está abierto; desde acá el aviso llega al celular en el momento, con la PC
   apagada. Se manda con la primera señal de una instalación nueva, con la
   que vuelve después de TELEGRAM_RETORNO_DIAS días sin uso (3 si no está) y
   cuando alguien deja su contacto al empezar la prueba. El mensaje lleva
   edición, versión y días: ni el código de la instalación, ni la licencia,
   ni el nombre o el contacto. Si sale bien se anota en la ficha
   (`avisos_web`) y el Centro, al leerla, guarda el evento sin volver a
   mandarlo. Sin TELEGRAM_TOKEN y TELEGRAM_CHAT no se manda nada.
   ═══════════════════════════════════════════════════════════════════════ */
const MAX_BODY = 2048;
const FORMSPREE_REGISTRO = 'https://formspree.io/f/xyklkprd';
const RE_INST = /^[0-9a-f]{32}$/;
const RE_LIC = /^[0-9a-f]{64}$/;
const RE_VER = /^\d{1,2}\.\d{1,2}\.\d{1,3}$/;
const RE_ED = /^[A-ZÁÉÍÓÚ ()0-9]{3,30}$/;
const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;

function texto(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function diasEntre(desde, hasta) {
  if (!RE_DIA.test(String(desde || '')) || !RE_DIA.test(String(hasta || ''))) return null;
  return Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 86400000);
}

/* Qué avisar con esta señal. `previa` es la ficha antes de esta señal (null si
   es la primera vez); `f`, la ficha ya actualizada. */
export function avisosDeLaSenal(previa, f, hoy, conRegistro, env) {
  if (f.apagada === hoy) return [];
  const avisos = [];
  const detalle = [f.edicion || 'sin edición', f.version ? 'versión ' + f.version : ''].filter(Boolean).join(' · ');
  if (!previa) {
    avisos.push({ tipo: 'nueva', texto: 'DEXIAE · instalación nueva\n' + detalle });
  } else if (previa.ultima !== hoy) {
    const n = parseInt(env.TELEGRAM_RETORNO_DIAS || '3', 10);
    const umbral = Number.isFinite(n) && n >= 0 ? n : 3;
    const salto = diasEntre(previa.ultima, hoy);
    const sinUso = salto == null ? null : salto - 1;
    if (sinUso != null && sinUso >= umbral) {
      avisos.push({ tipo: 'retorno', texto: 'DEXIAE · volvió a usarse después de ' + sinUso +
        (sinUso === 1 ? ' día' : ' días') + ' sin uso\n' + detalle });
    }
  }
  if (conRegistro) {
    avisos.push({ tipo: 'registro', texto: 'DEXIAE · alguien empezó la prueba y dejó su contacto\n' +
      detalle + '\nEl contacto está en el mail.' });
  }
  return avisos;
}

async function avisarPorTelegram(env, clave, f, avisos, hoy) {
  try {
    const r = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(env.TELEGRAM_CHAT),
        text: avisos.map(a => a.texto).join('\n\n') + '\n\nQueda en el Centro, en Clientes y licencias.' })
    });
    if (!r.ok) return;
    /* recién con el envío confirmado: si falla, el Centro sigue avisando como antes */
    f.avisos_web = Object.assign({}, f.avisos_web);
    for (const a of avisos) f.avisos_web[a.tipo] = hoy;
    await env.USO.put(clave, JSON.stringify(f), { metadata: f });
  } catch (_) { /* sin Telegram no se traba nada */ }
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
  const guardada = await env.USO.get(clave, 'json');
  const previa = guardada ? { ultima: guardada.ultima } : null;
  const f = guardada || { primera: hoy, dias: 0 };
  if (f.ultima !== hoy) f.dias = (f.dias || 0) + 1;
  f.ultima = hoy;
  if (RE_VER.test(String(d.version || ''))) f.version = d.version;
  if (RE_ED.test(String(d.edicion || ''))) f.edicion = d.edicion;
  if (RE_LIC.test(String(d.licencia || ''))) f.licencia = d.licencia;
  /* (20/10/2026) La persona apagó la señal y ELIGIÓ avisarlo (una sola vez):
     así el Centro no lo confunde con «dejó de usarlo». Si la vuelve a
     prender, la próxima señal normal lo borra. Sin esto, no se sabe. */
  if (d.apagada === true) f.apagada = hoy; else delete f.apagada;

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
  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT) {
    const avisos = avisosDeLaSenal(previa, f, hoy, !!contacto, env);
    if (avisos.length) context.waitUntil(avisarPorTelegram(env, clave, f, avisos, hoy));
  }
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
