/* nav-bancos.js — 13/10/2026
   «Extractos bancarios» del menú despliega las páginas de cada banco al pasar
   el mouse (o al llegar con Tab). Sólo en escritorio: en el celular esos
   enlaces del menú no se muestran. Un solo lugar para todas las páginas: lo
   carga lead.js, y las que no cargan lead.js (guia-contable) lo traen solo. */
(function () {
  var BANCOS = [
    ['Banco Galicia', '/extracto-galicia-excel'],
    ['Santander', '/extracto-santander-excel'],
    ['Banco Macro', '/extracto-macro-excel'],
    ['ICBC', '/extracto-icbc-excel'],
    ['Banco Credicoop', '/extracto-credicoop-excel'],
    ['Banco Patagonia', '/extracto-patagonia-excel'],
    ['Banco del Chubut', '/extracto-banco-chubut-excel'],
    ['Mercado Pago', '/mercado-pago-asientos-excel']
  ];
  var CSS = '' +
    '.nav-dd{position:relative;display:inline-flex;align-items:center}' +
    '.nav-dd>a::after{content:"";display:inline-block;width:5px;height:5px;margin-left:7px;' +
      'border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-2px) rotate(45deg);opacity:.6}' +
    '.nav-dd-p{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:16px;display:none;z-index:70}' +
    '.nav-dd:hover .nav-dd-p,.nav-dd:focus-within .nav-dd-p{display:block}' +
    '.nav-dd-c{background:var(--navy,#0B1120);border:1px solid var(--line2,rgba(150,180,235,.2));border-radius:12px;' +
      'padding:16px 16px 12px;width:380px;box-shadow:0 24px 48px rgba(0,0,0,.4);text-align:left}' +
    '.nav-dd-t{font-size:12.5px;color:var(--md,#A9B4C9);margin:0 4px 10px}' +
    '.nav-dd-g{display:grid;grid-template-columns:1fr 1fr;gap:2px}' +
    '.nav-l .nav-dd-g a{display:block;padding:8px 10px;border-radius:8px;font-size:14px;color:var(--hi,#F3F6FC)}' +
    '.nav-l .nav-dd-g a:hover,.nav-l .nav-dd-g a.on{background:rgba(37,99,235,.16);color:var(--hi,#F3F6FC)}' +
    '.nav-l .nav-dd-todos{display:block;margin:10px 4px 0;padding-top:10px;border-top:1px solid var(--line2,rgba(150,180,235,.2));' +
      'font-size:13px;color:var(--ac,#60A5FA)}' +
    '.nav-l .nav-dd-todos:hover{color:var(--hi,#F3F6FC)}' +
    /* (23/10/2026) con «Control documental» el menú no entra a 1366: nada se
       parte en dos renglones, se achica el aire y la demo sale del menú
       (sigue en el hero) en anchos medianos */
    '.nav-l>a,.nav-dd>a{white-space:nowrap}.nav-dd{flex:none}' +
    '@media(max-width:1440px){.nav-l{gap:18px!important}.nav-l>a:not(.btn),.nav-dd>a{font-size:14px!important}}' +
    '@media(max-width:1300px){.nav-l .nav-demo{display:none!important}}' +
    '@media(max-width:1160px){.nav-l a[href="/#capturas"],.nav-l a[href="/#demo"],.nav-l a[href="/#faq"]{display:none!important}}';

  function montar() {
    var a = document.querySelector('.nav-l a[href="/extractos-bancarios-excel"]');
    if (!a || (a.parentNode && a.parentNode.classList && a.parentNode.classList.contains('nav-dd'))) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    var dd = document.createElement('span');
    dd.className = 'nav-dd';
    a.parentNode.insertBefore(dd, a);
    dd.appendChild(a);
    var aqui = location.pathname.replace(/\.html$/, '');
    var links = BANCOS.map(function (b) {
      return '<a href="' + b[1] + '"' + (aqui === b[1] ? ' class="on" aria-current="page"' : '') + '>' + b[0] + '</a>';
    }).join('');
    var p = document.createElement('div');
    p.className = 'nav-dd-p';
    p.innerHTML = '<div class="nav-dd-c"><div class="nav-dd-t">Del PDF de tu banco al Excel con asientos</div>' +
      '<div class="nav-dd-g">' + links + '</div>' +
      '<a class="nav-dd-todos" href="/extractos-bancarios-excel">Cómo funciona con todos los bancos →</a></div>';
    dd.appendChild(p);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
