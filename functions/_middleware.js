/* ═══════════════════════════════════════════════════════════════════════
   dexiae.pages.dev  →  getdexiae.com   (301)
   ═══════════════════════════════════════════════════════════════════════
   POR QUÉ EXISTE (30/07/2026):
   Cloudflare Pages sirve el sitio por DOS dominios: el propio
   (getdexiae.com) y el subdominio por defecto del proyecto
   (dexiae.pages.dev). Google indexó los dos y le estaba dando el PRIMER
   puesto a la copia: buscando "DEXIAE" salía dexiae.pages.dev arriba de
   getdexiae.com.

   El <link rel="canonical"> ya apuntaba bien a getdexiae.com — pero el
   canonical es una SUGERENCIA, no una orden, y Google la estaba ignorando.
   La única forma de cerrarlo es que el dominio duplicado deje de servir
   contenido y redirija de verdad.

   Consecuencias de tener el sitio duplicado:
   · la autoridad del dominio se reparte entre los dos
   · el que busca la marca aterriza en un *.pages.dev, que parece staging
   · Google no consolida "DEXIAE" como entidad (de ahí el "¿quisiste decir
     DEXYANE?" en los resultados)

   ⚠️ SOLO el host exacto de producción. Los deploys de preview son
   <hash>.dexiae.pages.dev y tienen que seguir funcionando para poder
   probar antes de publicar — por eso se compara con === y no con
   endsWith('.pages.dev'), que los rompería a todos.

   301 y no 302: es una consolidación permanente, y el 301 es la señal
   más fuerte que entiende Google para fusionar los dos índices en uno.

   Se conservan path y query: /ig?utm_... sigue llegando entero.

   PARA REVERTIR: borrar este archivo y pushear. El sitio vuelve a ser
   estático puro, sin Functions.
   ═══════════════════════════════════════════════════════════════════════ */
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === 'dexiae.pages.dev') {
    url.hostname = 'getdexiae.com';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  /* cualquier otro host (getdexiae.com y los previews) sigue de largo
     hacia los archivos estáticos y las reglas de _redirects */
  return context.next();
}
