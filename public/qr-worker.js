/* Web Worker para decodificação QR — roda fora da main thread */
importScripts('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');

self.onmessage = function (e) {
  const { data, width, height } = e.data;
  const result = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
  self.postMessage(result ? result.data : null);
};
