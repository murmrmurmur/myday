/* coi-serviceworker - Cross-Origin Isolation via Service Worker */
(function () {
  if (typeof window === 'undefined') {
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
    self.addEventListener('fetch', function (event) {
      if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;
      event.respondWith(
        fetch(event.request).then(function (response) {
          if (response.status === 0) return response;
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
          newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
      );
    });
  } else {
    if (window.crossOriginIsolated) return;
    if (!('serviceWorker' in navigator)) {
      console.warn('coi-serviceworker: not supported');
      return;
    }
    navigator.serviceWorker
      .register(document.currentScript ? document.currentScript.src : '/coi-serviceworker.js')
      .then(function (registration) {
        if (!registration.active) {
          window.location.reload();
        }
      });
  }
})();
