/* Video de YouTube «con fachada» (03/10/2026).
   La página muestra NUESTRA portada con un botón de play; el reproductor de
   YouTube (youtube-nocookie: sin cookies hasta que se reproduce) se carga
   recién cuando alguien toca. Así la página no suma ~1 MB de YouTube al
   abrir y no hay terceros hasta que el visitante lo pide.
   Marcado: <div class="ytv" data-yt="ID" data-titulo="…"><button class="ytv-b">…</button></div> */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.ytv-b');
    if (!b) return;
    var c = b.closest('.ytv'), id = c && c.getAttribute('data-yt');
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    f.title = c.getAttribute('data-titulo') || 'Video de DEXIAE';
    f.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    c.innerHTML = '';
    c.appendChild(f);
    c.classList.add('on');
  });
})();
