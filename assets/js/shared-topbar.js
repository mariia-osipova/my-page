(function () {
  var basePath = location.pathname.indexOf('/my-page/') === 0 ? '/my-page/' : '/';

  var topbarInnerHTML =
    '<a class="logo" href="' + basePath + '">Mariia Osipova</a>' +
    '<nav class="navbar js-navbar">' +
    '<button class="navbar__toggle js-toggle" aria-label="Menu" aria-haspopup="true" aria-expanded="false">' +
    '<span class="navbar__toggle-box"><span class="navbar__toggle-inner">Menu</span></span>' +
    '</button>' +
    '<ul class="navbar__menu">' +
    '<li><a href="' + basePath + '" title="home" target="_self"><span class="nav-link__label">home</span></a></li>' +
    '<li><a href="' + basePath + 'playgrounds/" target="_self"><span class="nav-link__label">playgrounds</span></a></li>' +
    '<li><a href="' + basePath + 'about/" target="_self"><span class="nav-link__label">about</span></a></li>' +
    '<li><a href="' + basePath + 'contact/" target="_self"><span class="nav-link__label">contact</span></a></li>' +
    '<li><a href="' + basePath + 'cv/" target="_self"><span class="nav-link__label">CV</span></a></li>' +
    '</ul>' +
    '</nav>';

  function normalizePath(pathname) {
    return pathname.replace(/index\.html$/, '').replace(/\/+$/, '/') || '/';
  }

  function syncTopbar() {
    var header = document.querySelector('header.top.js-header');
    if (!header) {
      return;
    }

    header.innerHTML = topbarInnerHTML;

    var currentPath = normalizePath(location.pathname);
    var links = header.querySelectorAll('.navbar__menu a[href]');

    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var linkPath = normalizePath(new URL(link.getAttribute('href'), location.href).pathname);
      if (linkPath === currentPath) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncTopbar, { once: true });
  } else {
    syncTopbar();
  }
})();
