import { PHOTOPEA_ORIGIN } from './photopea-transport'

export function createPhotopeaHostHtml(): string {
  const origin = JSON.stringify(PHOTOPEA_ORIGIN)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      html, body, #photopea { width: 100%; height: 100%; margin: 0; border: 0; }
      body { overflow: hidden; }
    </style>
  </head>
  <body>
    <iframe id="photopea" title="Photopea"></iframe>
    <script>
      (function () {
        var PHOTOPEA_ORIGIN = ${origin};
        var frame = document.getElementById('photopea');
        var messages = [];
        window.__layerhandPhotopeaMessages = messages;

        window.addEventListener('message', function (event) {
          if (event.source !== frame.contentWindow) return;
          if (event.origin !== PHOTOPEA_ORIGIN) return;

          if (typeof event.data === 'string') {
            messages.push({ type: 'text', value: event.data });
          } else if (event.data instanceof ArrayBuffer) {
            // The transport encodes the bytes as it reads them out of the page.
            messages.push({ type: 'bytes', value: new Uint8Array(event.data) });
          }
        });

        window.__layerhandSendToPhotopea = function (message) {
          var payload = message.value;
          if (message.type === 'bytes') {
            payload = new Uint8Array(message.value).buffer;
          }
          frame.contentWindow.postMessage(payload, PHOTOPEA_ORIGIN);
        };

        frame.src = PHOTOPEA_ORIGIN + '/#' + window.location.hash.slice(1);
      }());
    </script>
  </body>
</html>`
}
