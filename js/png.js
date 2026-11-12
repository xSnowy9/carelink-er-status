/* png.js : ترميز PNG على دفعات (شرائح أفقية)
   الهدف: إنتاج صورة PNG واحدة طويلة جداً (3000 × ارتفاع كبير) دون الاعتماد على حد حجم الـ Canvas في المتصفح.
   كل شريحة تُرسم في Canvas صغير، ثم تُضغط وتُضاف إلى نفس ملف PNG. */
(function () {
  'use strict';
  var CL = (window.CL = window.CL || {});

  var TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    var len = data.length;
    var out = new Uint8Array(12 + len);
    var dv = new DataView(out.buffer);
    dv.setUint32(0, len);
    for (var i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + len, crc32(out.subarray(4, 8 + len)));
    return out;
  }

  CL.canStreamPng = function () { return typeof CompressionStream !== 'undefined'; };

  /* draw(ctx, y0, y1) : يرسم الجزء من y0 إلى y1 داخل ctx (حجمه W × (y1-y0)) */
  CL.encodePngStrips = async function (W, H, STRIP, draw, onProgress) {
    var cs = new CompressionStream('deflate');
    var writer = cs.writable.getWriter();
    var chunks = [], total = 0;
    var reading = (async function () {
      var r = cs.readable.getReader();
      for (;;) {
        var x = await r.read();
        if (x.done) break;
        chunks.push(x.value); total += x.value.length;
      }
    })();

    var cv = document.createElement('canvas');
    cv.width = W;
    var n = Math.ceil(H / STRIP);
    var rowBytes = W * 3;
    for (var i = 0; i < n; i++) {
      var y0 = i * STRIP, sh = Math.min(STRIP, H - y0);
      cv.height = sh;
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      draw(ctx, y0, y0 + sh);
      var img = ctx.getImageData(0, 0, W, sh).data;
      var buf = new Uint8Array(sh * (1 + rowBytes));
      for (var r = 0; r < sh; r++) {
        var o = r * (1 + rowBytes), s = r * W * 4;
        buf[o] = 1;                                  // فلتر Sub: يحسّن الضغط كثيراً
        buf[o + 1] = img[s]; buf[o + 2] = img[s + 1]; buf[o + 3] = img[s + 2];
        for (var px = 1; px < W; px++) {
          var a = s + px * 4, b = a - 4, q = o + 1 + px * 3;
          buf[q] = (img[a] - img[b]) & 255;
          buf[q + 1] = (img[a + 1] - img[b + 1]) & 255;
          buf[q + 2] = (img[a + 2] - img[b + 2]) & 255;
        }
      }
      await writer.write(buf);
      if (onProgress) onProgress(i + 1, n);
      await new Promise(function (res) { setTimeout(res, 0); });
    }
    cv.width = 1; cv.height = 1;
    await writer.close();
    await reading;

    var all = new Uint8Array(total), p = 0;
    chunks.forEach(function (c) { all.set(c, p); p += c.length; });

    var ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
    dv.setUint32(0, W); dv.setUint32(4, H);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8 بت، RGB

    var parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr)];
    var CH = 1 << 20;
    for (var k = 0; k < all.length; k += CH) parts.push(chunk('IDAT', all.subarray(k, Math.min(k + CH, all.length))));
    parts.push(chunk('IEND', new Uint8Array(0)));
    return new Blob(parts, { type: 'image/png' });
  };
})();
