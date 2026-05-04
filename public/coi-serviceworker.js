/* coi-serviceworker v0.1.7 - https://github.com/gzuidhof/coi-serviceworker */
(function () {
  if (typeof window === 'undefined') {
    // Service Worker scope
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
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
      );
    });
  } else {
    // Main thread scope
    if (window.crossOriginIsolated) return;
    if (!('serviceWorker' in navigator)) {
      console.warn('coi-serviceworker: Service workers are not supported in this browser');
      return;
    }
    navigator.serviceWorker.register(document.currentScript ? document.currentScript.src : '/coi-serviceworker.js').then(
      function (registration) {
        console.log('coi-serviceworker registered');
        if (!registration.active) {
          window.location.reload();
        }
      },
      function (err) {
        console.error('coi-serviceworker registration failed:', err);
      }
    );
  }
})();
