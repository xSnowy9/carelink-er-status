/* report.js : محرك رسم تقرير ER STATS REPORT
   - يرسم مباشرة على Canvas بدقة 3000×3000 (ليس لقطة شاشة).
   - يقيس النصوص فعلياً، ويوزع الأقسام تلقائياً على صورة واحدة أو عدة صور.
   - لا يحذف ولا يختصر ولا يصغّر الخط: إذا زاد المحتوى تُنشأ صفحة إضافية. */
(function () {
  'use strict';
  var CL = window.CL;
  var K = CL.COLORS;
  var FF = CL.FONT;

  var PW = 3000, PH = 4500;      // أبعاد كل صورة
  var MX = 90;                   // الهامش الجانبي
  var CW = PW - MX * 2;          // عرض المحتوى
  var GAP = 36;                  // المسافة الموحدة بين البطاقات
  var GG = 64;                   // المسافة قبل عنوان مجموعة جديدة
  var BANDH = 104;               // ارتفاع شريط عنوان المجموعة
  var HDRH = 132;                // ارتفاع رأس البطاقة
  var PADX = 40, PADT = 30, PADB = 30;
  var R = 40;                    // استدارة البطاقات
  var HDR1 = 550;                // بداية المحتوى في الصفحة الأولى
  var HDRN = 345;                // بداية المحتوى في الصفحات التالية
  var FOOT = 370;
  var CH = PH;                   // ارتفاع الصورة الحالي (ديناميكي)
  var RY0 = -1e9, RY1 = 1e9;     // نطاق الرسم الحالي (للرسم على شرائح)
  var SAFE_AREA = 16000000;      // مساحة آمنة لـ Canvas واحد على كل الأجهزة
  var STRIP = 500;               // ارتفاع الشريحة عند الرسم المقسّم

  var INK = K.ink, MUTE = K.mute;
  var BODY = 56, LH = 74;        // خط النصوص وارتفاع السطر

  var mctx = document.createElement('canvas').getContext('2d');

  /* ---------- أدوات الألوان ---------- */
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(hex, to, p) {
    var a = rgb(hex), b = to;
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * p) + ',' + Math.round(a[1] + (b[1] - a[1]) * p) + ',' + Math.round(a[2] + (b[2] - a[2]) * p) + ')';
  }
  function tint(hex, p) { return mix(hex, [255, 255, 255], p); }
  function shade(hex, p) { return mix(hex, [0, 0, 0], p); }

  /* ---------- أدوات النصوص ---------- */
  var AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  function dirOf(s) {
    var ar = 0, la = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (AR.test(ch)) ar++;
      else if (/[A-Za-z]/.test(ch)) la++;
    }
    if (!ar && !la) return 'rtl';
    return ar >= la ? 'rtl' : 'ltr';
  }
  function fnt(w, s) { return w + ' ' + Math.round(s) + 'px ' + FF; }

  function fitSize(ctx, text, weight, size, maxW, min) {
    ctx.font = fnt(weight, size);
    var w = ctx.measureText(text).width;
    if (maxW && w > maxW) return Math.max(min || 20, Math.floor(size * maxW / w));
    return size;
  }

  /* رسم نص: o = {size, weight, color, align, dir, maxW, min} */
  function T(ctx, text, x, y, o) {
    text = String(text);
    var size = o.maxW ? fitSize(ctx, text, o.weight || '500', o.size, o.maxW, o.min) : o.size;
    ctx.font = fnt(o.weight || '500', size);
    ctx.fillStyle = o.color || INK;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.direction = o.dir || dirOf(text);
    ctx.fillText(text, x, y);
  }

  /* تقسيم النص إلى أسطر حسب العرض المتاح (يدعم الأسطر الجديدة والكلمات الطويلة) */
  function wrap(text, f, maxW) {
    mctx.font = f;
    var out = [];
    var paras = String(text).replace(/\r/g, '').split('\n');
    paras.forEach(function (p, pi) {
      if (p.trim() === '') { out.push({ t: '', para: pi, blank: true }); return; }
      var words = p.split(/[ \t]+/).filter(Boolean);
      var cur = '';
      words.forEach(function (w) {
        var t = cur ? cur + ' ' + w : w;
        if (mctx.measureText(t).width <= maxW) { cur = t; return; }
        if (cur) { out.push({ t: cur, para: pi }); cur = ''; }
        if (mctx.measureText(w).width <= maxW) { cur = w; return; }
        var seg = '';
        Array.from(w).forEach(function (ch) {
          if (seg && mctx.measureText(seg + ch).width > maxW) { out.push({ t: seg, para: pi }); seg = ch; }
          else seg += ch;
        });
        cur = seg;
      });
      if (cur) out.push({ t: cur, para: pi });
    });
    while (out.length && out[out.length - 1].blank) out.pop();
    return out;
  }
  function restParas(lines, k) {
    var res = [], last = null;
    lines.slice(k).forEach(function (l) {
      if (l.para === last && !l.blank && res.length) res[res.length - 1] += ' ' + l.t;
      else res.push(l.t);
      last = l.para;
    });
    return res;
  }

  function rr(ctx, x, y, w, h, r) {
    var tl, tr, br, bl;
    if (typeof r === 'number') { tl = tr = br = bl = r; } else { tl = r[0]; tr = r[1]; br = r[2]; bl = r[3]; }
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.arcTo(x + w, y, x + w, y + tr, tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + bl, y + h);
    ctx.arcTo(x, y + h, x, y + h - bl, bl);
    ctx.lineTo(x, y + tl);
    ctx.arcTo(x, y, x + tl, y, tl);
    ctx.closePath();
  }

  function sum(a) { var s = 0; a.forEach(function (u) { s += u.h; }); return s; }

  /* ========================================================
     الوحدات (Units): كل وحدة عنصر مرسوم له ارتفاع ثابت.
     ======================================================== */
  function lineUnit(line, cMute) {
    var h = line.blank ? Math.round(LH * 0.55) : LH;
    return {
      h: h,
      draw: function (ctx, x, y, w) {
        if (line.blank) return;
        var d = dirOf(line.t);
        T(ctx, line.t, d === 'rtl' ? x + w : x, y + LH * 0.74, { size: BODY, weight: '500', color: cMute ? MUTE : INK, align: d === 'rtl' ? 'right' : 'left', dir: d });
      }
    };
  }
  function emptyUnit(textAr, textEn) {
    return {
      h: 100,
      draw: function (ctx, x, y, w) {
        T(ctx, textAr || '—', x + w / 2, y + 64, { size: 46, weight: '500', color: '#8A97AD', align: 'center', dir: 'rtl' });
        if (textEn) { /* السطر الإنجليزي اختياري */ }
      }
    };
  }
  function labelUnit(ar, en) {
    return {
      h: 88,
      draw: function (ctx, x, y, w, c) {
        T(ctx, ar, x + w, y + 48, { size: 46, weight: '700', color: c, align: 'right', dir: 'rtl', maxW: w * 0.58, min: 28 });
        T(ctx, en, x, y + 48, { size: 34, weight: '500', color: MUTE, align: 'left', dir: 'ltr', maxW: w * 0.4, min: 20 });
        ctx.strokeStyle = tint(c, 0.6); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, y + 70); ctx.lineTo(x + w, y + 70); ctx.stroke();
      }
    };
  }
  /* صناديق الأرقام: items من اليمين إلى اليسار */
  function statUnit(items, sh, compact) {
    sh = sh || 240;
    return {
      h: sh,
      draw: function (ctx, x, y, w, c) {
        if (compact) {
          var it0 = items[0], has0 = it0.val !== '—';
          ctx.fillStyle = tint(c, 0.92); rr(ctx, x, y, w, sh, 28); ctx.fill();
          ctx.strokeStyle = tint(c, 0.6); ctx.lineWidth = 3; rr(ctx, x, y, w, sh, 28); ctx.stroke();
          var mid = y + sh / 2;
          T(ctx, it0.val, x + w * 0.25, mid + 46, { size: has0 ? 132 : 96, weight: '800', color: has0 ? c : '#9AA7BD', maxW: w * 0.40, min: 56, dir: 'ltr' });
          T(ctx, it0.ar, x + w - 30, mid - 4, { size: 46, weight: '700', color: INK, align: 'right', maxW: w * 0.5, min: 26, dir: 'rtl' });
          T(ctx, it0.en, x + w - 30, mid + 44, { size: 34, weight: '500', color: MUTE, align: 'right', maxW: w * 0.5, min: 20, dir: 'ltr' });
          return;
        }
        var n = items.length, gap = 18, bw = (w - gap * (n - 1)) / n;
        items.forEach(function (it, i) {
          var bx = x + w - (i + 1) * bw - i * gap;
          ctx.fillStyle = tint(c, 0.92); rr(ctx, bx, y, bw, sh, 30); ctx.fill();
          ctx.strokeStyle = tint(c, 0.6); ctx.lineWidth = 3; rr(ctx, bx, y, bw, sh, 30); ctx.stroke();
          T(ctx, it.ar, bx + bw / 2, y + 56, { size: 44, weight: '700', color: INK, maxW: bw - 24, min: 24, dir: 'rtl' });
          T(ctx, it.en, bx + bw / 2, y + 98, { size: 33, weight: '500', color: MUTE, maxW: bw - 24, min: 20, dir: 'ltr' });
          var has = it.val !== '—';
          T(ctx, it.val, bx + bw / 2, y + sh - 34, { size: has ? 136 : 96, weight: '800', color: has ? c : '#9AA7BD', maxW: bw - 28, min: 56, dir: 'ltr' });
        });
      }
    };
  }
  /* حالة (مفعل/غير مفعل، متواجد/غير متواجد) */
  function toggleUnit(val, onAr, onEn, offAr, offEn, th) {
    th = th || 240;
    return {
      h: th,
      draw: function (ctx, x, y, w, c) {
        var on = val === 'on' || val === 'yes', off = val === 'off' || val === 'no';
        var col = on ? K.ok : off ? K.bad : '#9AA7BD';
        ctx.fillStyle = on || off ? tint(col, 0.9) : '#F1F4F9';
        rr(ctx, x, y, w, th, 30); ctx.fill();
        ctx.strokeStyle = on || off ? col : '#CBD3E1'; ctx.lineWidth = 4; rr(ctx, x, y, w, th, 30); ctx.stroke();
        var cy = y + th / 2, rad = Math.min(60, th * 0.3);
        if (!on && !off) { T(ctx, '—', x + w / 2, cy + 30, { size: 110, weight: '700', color: '#9AA7BD', dir: 'ltr' }); return; }
        var cx = x + w - 28 - rad;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
        CL.drawIcon(ctx, on ? 'check' : 'x', cx, cy, rad * 1.12, '#fff', 3);
        var tx = cx - rad - 20, mw = tx - (x + 16);
        T(ctx, on ? onAr : offAr, tx, cy - 4, { size: 60, weight: '800', color: INK, align: 'right', dir: 'rtl', maxW: mw, min: 30 });
        T(ctx, on ? onEn : offEn, tx, cy + 48, { size: 42, weight: '600', color: MUTE, align: 'right', dir: 'ltr', maxW: mw, min: 22 });
      }
    };
  }

  /* ---------- جدول المرضى ---------- */
  function tableHead(iw) {
    return {
      h: 108,
      draw: function (ctx, x, y, w, c) {
        var cols = tableCols(w);
        ctx.fillStyle = tint(c, 0.86); rr(ctx, x, y, w, 108, 20); ctx.fill();
        function cell(col, ar, en) {
          T(ctx, ar, x + col.x + col.w / 2, y + 46, { size: 38, weight: '700', color: INK, maxW: col.w - 12, min: 22, dir: 'rtl' });
          T(ctx, en, x + col.x + col.w / 2, y + 88, { size: 30, weight: '500', color: MUTE, maxW: col.w - 12, min: 18, dir: 'ltr' });
        }
        cell(cols.num, '#', '');
        cell(cols.name, 'اسم المستفيد', 'Patient Name');
        cell(cols.mrn, 'رقم الملف', 'MRN');
        cell(cols.bed, 'رقم السرير', 'Bed No.');
      }
    };
  }
  function tableCols(w) {
    var num = 90, mrn = 320, bed = 230;
    var name = w - num - mrn - bed;
    var x = w; // مرسوم من اليمين
    var out = {};
    out.num = { x: 0, w: num }; out.name = { x: 0, w: name }; out.mrn = { x: 0, w: mrn }; out.bed = { x: 0, w: bed };
    var cx = w;
    ['num', 'name', 'mrn', 'bed'].forEach(function (k) { cx -= out[k].w; out[k].x = cx; });
    /* الإحداثيات نسبية؛ تُضاف x الأساسية عند الرسم */
    return out;
  }
  function rowUnit(row, w) {
    var nameW = tableCols(w).name.w - 28;
    var lines = wrap(row.name || '', fnt('500', 50), nameW);
    if (!lines.length) lines = [{ t: '' }];
    var h = Math.max(100, lines.length * 68 + 32);
    return {
      h: h,
      draw: function (ctx, x, y, ww, c) {
        var cols = tableCols(ww);
        if (row.idx % 2 === 0) { ctx.fillStyle = tint(c, 0.95); rr(ctx, x, y, ww, h, 14); ctx.fill(); }
        ctx.strokeStyle = tint(c, 0.82); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 10, y + h); ctx.lineTo(x + ww - 10, y + h); ctx.stroke();
        T(ctx, row.idx, x + cols.num.x + cols.num.w / 2, y + 66, { size: 42, weight: '700', color: c, dir: 'ltr' });
        lines.forEach(function (l, i) {
          if (!l.t) return;
          var d = dirOf(l.t);
          T(ctx, l.t, d === 'rtl' ? x + cols.name.x + cols.name.w - 14 : x + cols.name.x + 14, y + 66 + i * 68, { size: 50, weight: '500', color: INK, align: d === 'rtl' ? 'right' : 'left', dir: d });
        });
        T(ctx, row.mrn || '—', x + cols.mrn.x + cols.mrn.w / 2, y + 66, { size: 50, weight: '600', color: row.mrn ? INK : '#9AA7BD', maxW: cols.mrn.w - 16, min: 22, dir: 'ltr' });
        T(ctx, row.bed || '—', x + cols.bed.x + cols.bed.w / 2, y + 66, { size: 50, weight: '800', color: row.bed ? c : '#9AA7BD', maxW: cols.bed.w - 16, min: 22, dir: 'ltr' });
      }
    };
  }

  /* ---------- جدول المسؤولين (Management) ---------- */
  function mgrCols(w) {
    var num = 90, title = Math.floor((w - num) * 0.46), name = w - num - title;
    var cx = w, o = {};
    [['num', num], ['title', title], ['name', name]].forEach(function (c) { cx -= c[1]; o[c[0]] = { x: cx, w: c[1] }; });
    return o;
  }
  function mgrHead(iw) {
    return {
      h: 108,
      draw: function (ctx, x, y, w, c) {
        var cols = mgrCols(w);
        ctx.fillStyle = tint(c, 0.86); rr(ctx, x, y, w, 108, 20); ctx.fill();
        function cell(col, ar, en) {
          T(ctx, ar, x + col.x + col.w / 2, y + 46, { size: 38, weight: '700', color: INK, maxW: col.w - 12, min: 22, dir: 'rtl' });
          if (en) T(ctx, en, x + col.x + col.w / 2, y + 88, { size: 30, weight: '500', color: MUTE, maxW: col.w - 12, min: 18, dir: 'ltr' });
        }
        cell(cols.num, '#', '');
        cell(cols.title, 'المسمى الوظيفي', 'Position / Title');
        cell(cols.name, 'الاسم', 'Name');
      }
    };
  }
  function mgrRow(row, w) {
    var cols = mgrCols(w);
    var f = fnt('500', 50);
    var tl = wrap(row.title || '', f, cols.title.w - 28), nl = wrap(row.name || '', f, cols.name.w - 28);
    var n = Math.max(1, tl.length, nl.length);
    var h = Math.max(100, n * 68 + 32);
    return {
      h: h,
      draw: function (ctx, x, y, ww, c) {
        var cs = mgrCols(ww);
        if (row.idx % 2 === 0) { ctx.fillStyle = tint(c, 0.95); rr(ctx, x, y, ww, h, 14); ctx.fill(); }
        ctx.strokeStyle = tint(c, 0.82); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 10, y + h); ctx.lineTo(x + ww - 10, y + h); ctx.stroke();
        T(ctx, row.idx, x + cs.num.x + cs.num.w / 2, y + 66, { size: 42, weight: '700', color: c, dir: 'ltr' });
        function col(lines, cc, bold) {
          lines.forEach(function (l, i) {
            if (!l.t) return;
            var d = dirOf(l.t);
            T(ctx, l.t, d === 'rtl' ? x + cc.x + cc.w - 14 : x + cc.x + 14, y + 66 + i * 68, { size: 50, weight: bold ? '700' : '500', color: INK, align: d === 'rtl' ? 'right' : 'left', dir: d });
          });
        }
        col(tl, cs.title, true); col(nl, cs.name, false);
      }
    };
  }

  /* ========================================================
     بناء اللوحات (Panels) من الوحدات
     ======================================================== */
  function buildPanel(p, w) {
    var iw = w - 2 * PADX;
    var pre = [], head = [], body = [], rest = function () { return null; };
    if (p.hero) return { pre: pre, head: head, body: body, rest: rest };
    if (!p.cont && p.pre) pre = p.pre(iw);
    if (p.head) head = p.head(iw);
    if (p.type === 'text') {
      var text = p.paras.join('\n').replace(/\s+$/, '');
      if (!text.trim()) {
        body = [emptyUnit('—')];
      } else {
        var lines = wrap(text, fnt('500', BODY), iw);
        body = lines.map(function (l) { return lineUnit(l); });
        rest = function (k) {
          return k >= lines.length ? null : Object.assign({}, p, { cont: true, chip: null, paras: restParas(lines, k) });
        };
      }
    } else if (p.type === 'mgr') {
      if (!p.rows.length) {
        body = [emptyUnit('لا توجد أسماء مسجلة')];
      } else {
        head = [mgrHead(iw)];
        body = p.rows.map(function (r) { return mgrRow(r, iw); });
      }
    } else if (p.type === 'table') {
      if (!p.rows.length) {
        body = [emptyUnit('لا توجد حالات مسجلة')];
      } else {
        head = [tableHead(iw)];
        body = p.rows.map(function (r) { return rowUnit(r, iw); });
        rest = function (k) {
          return k >= p.rows.length ? null : Object.assign({}, p, { cont: true, chip: null, rows: p.rows.slice(k) });
        };
      }
    }
    return { pre: pre, head: head, body: body, rest: rest };
  }

  /* تخطيط كتلة (صف من اللوحات) ضمن مساحة متاحة A */
  function layoutBlock(b, A, fresh) {
    var cols = b.cols, n = cols.length;
    var tw = CW - GAP * (n - 1);
    var sw = 0; cols.forEach(function (c) { sw += c.weight || 1; });
    var built = cols.map(function (p) {
      var w = Math.floor(tw * (p.weight || 1) / sw);
      var o = buildPanel(p, w); o.p = p; o.w = w; return o;
    });
    var hdr = built.some(function (o) { return !o.p.hero; }) ? HDRH : 0;
    built.forEach(function (o) {
      o.fixed = o.p.hero ? o.p.fixedH : hdr + PADT + sum(o.pre) + sum(o.head) + PADB;
    });
    var allFit = built.every(function (o) { return o.fixed + sum(o.body) <= A; });
    var ks;
    if (allFit) {
      ks = built.map(function (o) { return o.body.length; });
    } else if (b.atomic) {
      if (!fresh) return null;
      ks = built.map(function (o) { return o.body.length; });
    } else {
      ks = [];
      for (var i = 0; i < built.length; i++) {
        var o = built[i], k = 0, hh = o.fixed;
        while (k < o.body.length && hh + o.body[k].h <= A) { hh += o.body[k].h; k++; }
        var minK = Math.min(2, o.body.length);
        if (k < o.body.length && k < minK) { if (!fresh) return null; k = minK; }
        ks.push(k);
      }
    }
    var h = 0;
    built.forEach(function (o, i) {
      var tot = o.fixed + sum(o.body.slice(0, ks[i]));
      if (tot > h) h = tot;
    });
    if (h > A && !fresh) return null;
    var restPanels = [];
    built.forEach(function (o, i) {
      if (ks[i] < o.body.length) { var r = o.rest(ks[i]); if (r) restPanels.push(r); }
    });
    var items = [];
    var xr = MX + CW;
    built.forEach(function (o, i) {
      xr -= o.w;
      items.push({
        p: o.p, w: o.w, x: xr,
        units: o.pre.concat(o.head, o.body.slice(0, ks[i])),
        hasBody: o.body.length > 0,
        nat: o.fixed + sum(o.body.slice(0, ks[i])),
        compact: !!o.p.noStretch
      });
      xr -= GAP;
    });
    return { items: items, hdr: hdr, h: h, rest: restPanels.length ? { cols: restPanels, atomic: false } : null };
  }

  /* ========================================================
     رسم اللوحات
     ======================================================== */
  function drawPanel(ctx, it, y, H, hdr) {
    var p = it.p, x = it.x, w = it.w, c = p.color;
    if (y > RY1 + 60 || y + H < RY0 - 60) return;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.38)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#FFFFFF'; rr(ctx, x, y, w, H, R); ctx.fill();
    ctx.restore();

    if (p.hero) { drawHero(ctx, p, x, y, w, H); return; }

    /* رأس البطاقة */
    var g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, shade(c, 0.32)); g.addColorStop(1, c);
    ctx.fillStyle = g; rr(ctx, x, y, w, hdr, [R, R, 0, 0]); ctx.fill();

    var icx = x + w - 30 - 44, icy = y + hdr / 2;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(icx, icy, 44, 0, Math.PI * 2); ctx.fill();
    CL.drawIcon(ctx, p.icon, icx, icy, 54, c, 2);

    var chipW = 0;
    if (p.chip) chipW = w > 1200 ? 440 : (p.chipW || 340);
    var tr = icx - 44 - 20;
    var maxW = tr - (x + 40 + (chipW ? chipW + 18 : 0));
    var ar = p.title.ar + (p.cont ? ' (تابع)' : '');
    var en = p.title.en + (p.cont ? ' (cont.)' : '');
    T(ctx, ar, tr, icy - 6, { size: 54, weight: '800', color: '#fff', align: 'right', dir: 'rtl', maxW: maxW, min: 30 });
    T(ctx, en, tr, icy + 40, { size: 36, weight: '500', color: 'rgba(255,255,255,.86)', align: 'right', dir: 'ltr', maxW: maxW, min: 20 });

    if (p.chip) {
      var cx0 = x + 22, ch = 80, cy0 = y + (hdr - ch) / 2;
      ctx.fillStyle = '#fff'; rr(ctx, cx0, cy0, chipW, ch, 22); ctx.fill();
      T(ctx, p.chip.val, cx0 + 66, cy0 + 62, { size: 58, weight: '800', color: c, maxW: 108, min: 30, dir: 'ltr' });
      T(ctx, p.chip.ar, cx0 + chipW - 16, cy0 + 34, { size: 27, weight: '700', color: INK, align: 'right', dir: 'rtl', maxW: chipW - 140, min: 18 });
      T(ctx, p.chip.en, cx0 + chipW - 16, cy0 + 64, { size: 22, weight: '500', color: MUTE, align: 'right', dir: 'ltr', maxW: chipW - 140, min: 15 });
    }

    /* حدّ ملوّن حول البطاقة */
    ctx.strokeStyle = c; ctx.lineWidth = 6; rr(ctx, x, y, w, H, R); ctx.stroke();

    /* الوحدات */
    var total = sum(it.units);
    var yy = y + hdr + PADT;
    if (!it.hasBody) yy = y + hdr + Math.max(PADT, (H - hdr - total) / 2);
    it.units.forEach(function (u) {
      if (yy + u.h >= RY0 - 20 && yy <= RY1 + 20) u.draw(ctx, x + PADX, yy, w - 2 * PADX, c);
      yy += u.h;
    });
  }

  function drawHero(ctx, p, x, y, w, H) {
    var c = p.color;
    ctx.strokeStyle = tint(c, 0.55); ctx.lineWidth = 4; rr(ctx, x, y, w, H, R); ctx.stroke();
    var cy = y + H / 2;
    var icx = x + w - 44 - 74;
    var g = ctx.createLinearGradient(icx - 74, cy - 74, icx + 74, cy + 74);
    g.addColorStop(0, '#2B7BE0'); g.addColorStop(1, K.navy);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(icx, cy, 74, 0, Math.PI * 2); ctx.fill();
    CL.drawIcon(ctx, p.icon, icx, cy, 84, '#fff', 1.9);
    var bw = 430, bh = Math.min(184, H - 40), bx = x + 40;
    ctx.fillStyle = tint(c, 0.93); rr(ctx, bx, cy - bh / 2, bw, bh, 28); ctx.fill();
    ctx.strokeStyle = tint(c, 0.55); ctx.lineWidth = 3; rr(ctx, bx, cy - bh / 2, bw, bh, 28); ctx.stroke();
    var has = p.val !== '—';
    T(ctx, p.val, bx + bw / 2, cy + 54, { size: has ? 150 : 100, weight: '800', color: has ? c : '#9AA7BD', maxW: bw - 40, min: 60, dir: 'ltr' });
    var tr = icx - 74 - 30, mw = tr - (bx + bw + 28);
    T(ctx, p.label.ar, tr, cy - 6, { size: 54, weight: '800', color: INK, align: 'right', dir: 'rtl', maxW: mw, min: 30 });
    T(ctx, p.label.en, tr, cy + 48, { size: 38, weight: '500', color: MUTE, align: 'right', dir: 'ltr', maxW: mw, min: 20 });
  }

  /* ========================================================
     خلفية وترويسة وتذييل
     ======================================================== */
  function drawBg(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, CH);
    g.addColorStop(0, '#0C3C86'); g.addColorStop(0.5, '#082A66'); g.addColorStop(1, '#051640');
    ctx.fillStyle = g; ctx.fillRect(0, 0, PW, CH);
    for (var gy0 = 250; gy0 < CH + 1000; gy0 += 2600) {
      if (gy0 + 1000 < RY0 || gy0 - 1000 > RY1) continue;
      var r1 = ctx.createRadialGradient(PW * 0.85, gy0, 50, PW * 0.85, gy0, 1000);
      r1.addColorStop(0, 'rgba(60,150,255,.30)'); r1.addColorStop(1, 'rgba(60,150,255,0)');
      ctx.fillStyle = r1; ctx.fillRect(0, gy0 - 1000, PW, 2000);
      var gy1 = gy0 + 1300;
      var r2 = ctx.createRadialGradient(PW * 0.1, gy1, 50, PW * 0.1, gy1, 1100);
      r2.addColorStop(0, 'rgba(0,200,220,.16)'); r2.addColorStop(1, 'rgba(0,200,220,0)');
      ctx.fillStyle = r2; ctx.fillRect(0, gy1 - 1100, PW, 2200);
    }
    /* صلبان طبية خافتة */
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    for (var gy = 60; gy < CH; gy += 170) {
      if (gy < RY0 - 40 || gy > RY1 + 40) continue;
      for (var gx = (gy / 170 % 2 ? 60 : 145); gx < PW; gx += 170) {
        ctx.fillRect(gx - 4, gy - 16, 8, 32); ctx.fillRect(gx - 16, gy - 4, 32, 8);
      }
    }
  }

  function ecgLine(ctx, x0, x1, y, amp, color, lw, glow) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    ctx.beginPath(); ctx.moveTo(x0, y);
    var x = x0, step = 360;
    while (x < x1) {
      var nx = Math.min(x + step, x1);
      ctx.lineTo(x + step * 0.30, y);
      ctx.lineTo(x + step * 0.36, y - amp * 0.25);
      ctx.lineTo(x + step * 0.42, y);
      ctx.lineTo(x + step * 0.50, y + amp * 0.2);
      ctx.lineTo(x + step * 0.56, y - amp);
      ctx.lineTo(x + step * 0.63, y + amp * 0.45);
      ctx.lineTo(x + step * 0.70, y);
      ctx.lineTo(nx, y);
      x = nx;
    }
    ctx.stroke(); ctx.restore();
  }

  function seeded(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function skyline(ctx, x0, base, w, hmax) {
    var rnd = seeded(11), x = x0;
    while (x < x0 + w) {
      var bw = 90 + rnd() * 150, bh = hmax * (0.35 + rnd() * 0.65);
      ctx.fillStyle = 'rgba(14,52,118,.92)'; ctx.fillRect(x, base - bh, bw, bh);
      ctx.fillStyle = 'rgba(255,205,110,.85)';
      for (var wy = base - bh + 14; wy < base - 18; wy += 26) {
        for (var wx = x + 12; wx < x + bw - 16; wx += 24) { if (rnd() > 0.5) ctx.fillRect(wx, wy, 10, 13); }
      }
      x += bw + 8;
    }
  }

  function drawAmbulance(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#F4F7FC'; rr(ctx, 0, 20, 190, 92, 14); ctx.fill();
    ctx.fillStyle = '#E5ECF7'; ctx.beginPath(); ctx.moveTo(190, 46); ctx.lineTo(236, 46); ctx.lineTo(262, 80); ctx.lineTo(262, 112); ctx.lineTo(190, 112); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7CC4FF'; ctx.beginPath(); ctx.moveTo(200, 54); ctx.lineTo(232, 54); ctx.lineTo(250, 78); ctx.lineTo(200, 78); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#D32F2F'; ctx.fillRect(0, 80, 262, 12);
    ctx.fillStyle = '#D32F2F'; ctx.fillRect(72, 34, 14, 40); ctx.fillRect(59, 47, 40, 14);
    ctx.fillStyle = '#FF3B3B'; ctx.shadowColor = '#FF3B3B'; ctx.shadowBlur = 22; ctx.fillRect(40, 8, 34, 14);
    ctx.fillStyle = '#3B8BFF'; ctx.shadowColor = '#3B8BFF'; ctx.fillRect(84, 8, 34, 14);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#10264A';
    [50, 206].forEach(function (wx) { ctx.beginPath(); ctx.arc(wx, 114, 22, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#C8D3E6';
    [50, 206].forEach(function (wx) { ctx.beginPath(); ctx.arc(wx, 114, 9, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  function drawLogo(ctx, x, y, size, align) {
    /* شعار CareLink: قلب + مخطط نبض. إذا وُجد ملف assets/logos/carelink.png يُستخدم بدلاً منه */
    var img = CL.logos && CL.logos.carelink;
    if (img) {
      var h = size * 1.7, w = img.width * h / img.height;
      var lx = align === 'right' ? x - w : x;
      ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(ctx, lx - 14, y - 6, w + 28, h + 12, 24); ctx.fill();
      ctx.drawImage(img, lx, y, w, h);
      return w + 28;
    }
    var hx = x + size / 2;
    ctx.save(); ctx.shadowColor = 'rgba(80,170,255,.9)'; ctx.shadowBlur = 24;
    CL.drawIcon(ctx, 'heart', hx, y + size * 0.52, size, '#FFFFFF', 1.5);
    ctx.restore();
    CL.drawIcon(ctx, 'pulse', hx, y + size * 0.55, size * 0.78, '#FF3B4E', 2.1);
    var tx = x + size + 22;
    ctx.font = fnt('800', size * 0.74); ctx.direction = 'ltr'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF'; ctx.fillText('Care', tx, y + size * 0.62);
    var cw = ctx.measureText('Care').width;
    ctx.fillStyle = '#7CC4FF'; ctx.fillText('Link', tx + cw, y + size * 0.62);
    T(ctx, 'كيرلينك', tx + 6, y + size * 1.1, { size: size * 0.44, weight: '700', color: '#DCEBFF', align: 'left', dir: 'rtl' });
    return size + 22 + cw + ctx.measureText('Link').width;
  }

  function drawCluster(ctx, xr, y, scale) {
    var cl = CL.logos && CL.logos.cluster;
    var s = scale || 1;
    if (cl) {
      var h = 150 * s, w = cl.width * h / cl.height;
      ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(ctx, xr - w - 14, y - 6, w + 28, h + 12, 22); ctx.fill();
      ctx.drawImage(cl, xr - w, y, w, h);
    } else {
      CL.drawIcon(ctx, 'palm', xr - 40 * s, y + 52 * s, 92 * s, '#9FD0FF', 1.5);
      var tr = xr - 100 * s;
      T(ctx, 'تجمع القصيم الصحي', tr, y + 42 * s, { size: 46 * s, weight: '800', color: '#fff', align: 'right', dir: 'rtl' });
      T(ctx, 'Qassim Health Cluster', tr, y + 84 * s, { size: 32 * s, weight: '500', color: '#CFE3FF', align: 'right', dir: 'ltr' });
    }
    var hy = y + 150 * s;
    var hos = CL.logos && CL.logos.hospital;
    if (hos) {
      var hh = 120 * s, hw = hos.width * hh / hos.height;
      ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(ctx, xr - hw - 14, hy - 6, hw + 28, hh + 12, 22); ctx.fill();
      ctx.drawImage(hos, xr - hw, hy, hw, hh);
    } else {
      T(ctx, 'مستشفى بريدة المركزي', xr, hy + 42 * s, { size: 46 * s, weight: '800', color: '#fff', align: 'right', dir: 'rtl' });
      T(ctx, 'Buraidah Central Hospital', xr, hy + 84 * s, { size: 32 * s, weight: '500', color: '#CFE3FF', align: 'right', dir: 'ltr' });
    }
  }

  function drawDateStrip(ctx, snap, y, h) {
    var n = snap.now, sh = CL.SHIFTS[snap.shift];
    var s = h / 140;
    var cells = [
      { w: 1.0, icon: 'calendar', ar: n.dayAr, en: n.dayEn },
      { w: 1.35, icon: 'calendar', ar: n.dateAr, en: n.dateEn },
      { w: 1.0, icon: 'clock', ar: n.timeAr, en: n.timeEn },
      { w: 1.25, icon: sh.icon, ar: sh.ar, en: sh.en + ' Shift' }
    ];
    var gap = 22, tw = CW - gap * 3, sw = 0; cells.forEach(function (c) { sw += c.w; });
    var xr = MX + CW;
    cells.forEach(function (c) {
      var w = Math.floor(tw * c.w / sw); xr -= w;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#fff'; rr(ctx, xr, y, w, h, 30 * s); ctx.fill(); ctx.restore();
      ctx.strokeStyle = tint('#1E6FD9', 0.5); ctx.lineWidth = 3; rr(ctx, xr, y, w, h, 30 * s); ctx.stroke();
      var icx = xr + w - 26 * s - 36 * s;
      ctx.fillStyle = tint('#1E6FD9', 0.9); ctx.beginPath(); ctx.arc(icx, y + h / 2, 38 * s, 0, Math.PI * 2); ctx.fill();
      CL.drawIcon(ctx, c.icon, icx, y + h / 2, 44 * s, '#1E6FD9', 2);
      var tr = icx - 38 * s - 16 * s, mw = tr - (xr + 18 * s);
      T(ctx, c.ar, tr, y + h / 2 - 6 * s, { size: 44 * s, weight: '800', color: INK, align: 'right', dir: 'rtl', maxW: mw, min: 20 });
      T(ctx, c.en, tr, y + h / 2 + 34 * s, { size: 32 * s, weight: '500', color: MUTE, align: 'right', dir: 'ltr', maxW: mw, min: 16 });
    });
  }

  function drawHeader(ctx, snap, pi, total) {
    var multi = total > 1;
    if (pi === 0) {
      /* مشهد المستشفى */
      var hg = ctx.createLinearGradient(0, 0, 0, 335);
      hg.addColorStop(0, 'rgba(8,36,92,.0)'); hg.addColorStop(1, 'rgba(8,36,92,.55)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, PW, 335);
      skyline(ctx, 0, 335, PW, 170);
      ctx.fillStyle = '#D32F2F'; rr(ctx, 1280, 250, 440, 62, 10); ctx.fill();
      T(ctx, 'EMERGENCY  الطوارئ', 1500, 294, { size: 40, weight: '800', color: '#fff', dir: 'ltr' });
      drawAmbulance(ctx, 110, 222, 0.52);
      ecgLine(ctx, 0, PW, 345, 38, 'rgba(255,70,90,.55)', 6, 18);

      drawLogo(ctx, MX, 34, 126, 'left');
      drawCluster(ctx, PW - MX, 28, 1);

      /* لافتة العنوان */
      var bw = 1260, bh = 190, bx = (PW - bw) / 2, by = 36;
      var bg = ctx.createLinearGradient(bx, by, bx, by + bh);
      bg.addColorStop(0, '#0B2F6E'); bg.addColorStop(1, '#061D48');
      ctx.save(); ctx.shadowColor = 'rgba(90,180,255,.7)'; ctx.shadowBlur = 40;
      ctx.fillStyle = bg; rr(ctx, bx, by, bw, bh, 44); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#8CC8FF'; ctx.lineWidth = 5; rr(ctx, bx, by, bw, bh, 44); ctx.stroke();
      T(ctx, 'ER STATS REPORT', PW / 2, by + 98, { size: 100, weight: '800', color: '#fff', dir: 'ltr', maxW: bw - 140, min: 50 });
      T(ctx, 'تقرير إحصائيات الطوارئ', PW / 2, by + 164, { size: 56, weight: '700', color: '#CFE3FF', dir: 'rtl' });
      if (multi) {
        ctx.fillStyle = '#D32F2F'; rr(ctx, bx + bw - 190, by - 18, 170, 58, 29); ctx.fill();
        T(ctx, (pi + 1) + ' / ' + total, bx + bw - 105, by + 24, { size: 38, weight: '800', color: '#fff', dir: 'ltr' });
      }
      drawDateStrip(ctx, snap, 350, 140);
    } else {
      drawLogo(ctx, MX, 30, 96, 'left');
      drawCluster(ctx, PW - MX, 18, 0.68);
      var bw2 = 1160, bh2 = 150, bx2 = (PW - bw2) / 2, by2 = 28;
      var bg2 = ctx.createLinearGradient(bx2, by2, bx2, by2 + bh2);
      bg2.addColorStop(0, '#0B2F6E'); bg2.addColorStop(1, '#061D48');
      ctx.save(); ctx.shadowColor = 'rgba(90,180,255,.6)'; ctx.shadowBlur = 30;
      ctx.fillStyle = bg2; rr(ctx, bx2, by2, bw2, bh2, 38); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#8CC8FF'; ctx.lineWidth = 4; rr(ctx, bx2, by2, bw2, bh2, 38); ctx.stroke();
      T(ctx, 'ER REPORT – ' + (pi + 1) + '/' + total, PW / 2, by2 + 80, { size: 82, weight: '800', color: '#fff', dir: 'ltr' });
      T(ctx, 'تقرير إحصائيات الطوارئ – تابع', PW / 2, by2 + 130, { size: 42, weight: '600', color: '#CFE3FF', dir: 'rtl' });
      ecgLine(ctx, 0, PW, 205, 30, 'rgba(255,70,90,.45)', 5, 14);
      drawDateStrip(ctx, snap, 214, 110);
    }
  }

  function drawFooter(ctx, snap, pi, total) {
    var y0 = CH - FOOT;
    if (RY1 < y0 - 40) return;
    /* آخر تحديث: اليوم والتاريخ والوقت والوردية */
    ctx.fillStyle = 'rgba(255,255,255,.10)'; rr(ctx, MX, y0 + 6, CW, 70, 26); ctx.fill();
    T(ctx, 'آخر تحديث', PW / 2 + 30, y0 + 56, { size: 46, weight: '800', color: '#fff', align: 'left', dir: 'rtl' });
    T(ctx, 'LAST UPDATE', PW / 2 + 12, y0 + 56, { size: 36, weight: '600', color: '#CFE3FF', align: 'right', dir: 'ltr' });
    drawDateStrip(ctx, snap, y0 + 96, 140);
    /* الشريط السفلي */
    var y = CH - 100;
    ctx.fillStyle = 'rgba(4,16,48,.78)'; ctx.fillRect(0, y, PW, 100);
    ecgLine(ctx, 0, PW, y, 22, 'rgba(255,70,90,.7)', 5, 12);
    var cy = y + 66;
    T(ctx, 'CareLink – ER STATS REPORT', PW / 2, cy, { size: 40, weight: '800', color: '#fff', dir: 'ltr' });
    CL.drawIcon(ctx, 'heart', PW / 2 - 440, cy - 12, 46, '#fff', 1.6);
    T(ctx, 'Qassim Health Cluster · Buraidah Central Hospital', MX, cy, { size: 30, weight: '500', color: '#CFE3FF', align: 'left', dir: 'ltr' });
    var n = snap.now;
    var right = 'Generated ' + n.dateEn + ' · ' + n.timeEn + ' (Asia/Riyadh)';
    T(ctx, right, PW - MX, cy, { size: 30, weight: '500', color: '#CFE3FF', align: 'right', dir: 'ltr' });
  }

  /* شريط عنوان مجموعة */
  function drawBand(ctx, b, y) {
    if (y > RY1 + 40 || y + BANDH < RY0 - 40) return;
    ctx.fillStyle = 'rgba(255,255,255,.10)'; rr(ctx, MX, y, CW, BANDH, 32); ctx.fill();
    ctx.strokeStyle = 'rgba(140,200,255,.5)'; ctx.lineWidth = 3; rr(ctx, MX, y, CW, BANDH, 32); ctx.stroke();
    ctx.fillStyle = '#4FA8FF'; rr(ctx, MX + CW - 44, y + 24, 14, BANDH - 48, 7); ctx.fill();
    T(ctx, b.ar, MX + CW - 70, y + 68, { size: 56, weight: '800', color: '#fff', align: 'right', dir: 'rtl', maxW: CW * 0.55, min: 32 });
    T(ctx, b.en, MX + 44, y + 66, { size: 38, weight: '600', color: '#CFE3FF', align: 'left', dir: 'ltr', maxW: CW * 0.36, min: 22 });
  }

  function drawWatermark(ctx) {
    for (var cy = 1500; cy - 1500 < CH; cy += 3000) {
      if (cy + 1100 < RY0 || cy - 1100 > RY1) continue;
      ctx.save();
      ctx.translate(PW / 2, cy); ctx.rotate(-Math.PI / 6);
      ctx.globalAlpha = 0.16;
      T(ctx, 'PREVIEW', 0, 0, { size: 520, weight: '800', color: '#FFFFFF', dir: 'ltr' });
      T(ctx, 'معاينة – غير نهائي', 0, 290, { size: 230, weight: '800', color: '#FFFFFF', dir: 'rtl' });
      ctx.restore();
    }
  }

  /* ========================================================
     بناء كتل التقرير من البيانات
     ======================================================== */
  function nv(v) { return v === '' || v == null ? '—' : String(v); }
  function cleanRows(rows) {
    var out = [];
    (rows || []).forEach(function (r) {
      if ((r.name || '').trim() || (r.mrn || '').trim() || (r.bed || '').trim()) {
        out.push({ name: (r.name || '').trim(), mrn: (r.mrn || '').trim(), bed: (r.bed || '').trim(), idx: out.length + 1 });
      }
    });
    return out;
  }

  function cleanMgrs(rows) {
    var out = [];
    (rows || []).forEach(function (m) {
      var t = (m.title || '').trim(), n = (m.name || '').trim();
      if (t || n) out.push({ title: t, name: n, idx: out.length + 1 });
    });
    return out;
  }

  function buildBlocks(snap) {
    var d = snap.data, a = snap.arrivals || {};
    var sh = CL.SHIFTS[snap.shift];
    var staticP = function (o) { return Object.assign({ type: 'static', weight: 1 }, o); };
    var blocks = [];
    var band = function (ar, en) { blocks.push({ band: { ar: ar, en: en } }); };

    band('المؤشرات الرئيسية', 'KEY STATISTICS');
    blocks.push({
      atomic: true,
      cols: [
        { hero: true, fixedH: 230, color: K.navy, icon: 'users', label: { ar: 'عدد المستفيدين من بداية اليوم', en: 'Total ER Arrivals (From Start of Day)' }, val: nv(d.arrDay), type: 'static', weight: 1 },
        { hero: true, fixedH: 230, color: K.navy, icon: 'users', label: { ar: 'عدد المستفيدين بالفترة الحالية', en: 'Arrivals in Current Shift' }, val: nv(d.arrShift), type: 'static', weight: 1 }
      ]
    });

    var bedsWait = function (o) {
      return [statUnit([{ ar: 'بالأسرة', en: 'Beds', val: nv(o.beds) }, { ar: 'بالانتظار', en: 'Waiting', val: nv(o.wait) }])];
    };
    band('أقسام الطوارئ', 'ER DEPARTMENTS');
    blocks.push({
      atomic: true,
      cols: [
        staticP({ color: K.acute, icon: 'bed', title: { ar: 'العناية المتوسطة', en: 'Acute Care' }, pre: function () { return bedsWait(d.acute); } }),
        staticP({ color: K.trauma, icon: 'stretcher', title: { ar: 'الإصابات', en: 'Trauma' }, pre: function () { return bedsWait(d.trauma); } }),
        staticP({ color: K.fast, icon: 'fast', title: { ar: 'الفحص السريع', en: 'Fast Track' }, pre: function () { return bedsWait(d.fast); } }),
        staticP({ color: K.ras, icon: 'clipboard', title: { ar: 'غرفة التقييم السريع', en: 'RAS' }, pre: function () { return [toggleUnit(d.ras, 'مفعل', 'ON', 'غير مفعل', 'OFF', 240)]; } }),
        staticP({ color: K.iso, icon: 'virus', title: { ar: 'العزل', en: 'Isolation' }, pre: function () { return [statUnit([{ ar: 'عدد المستفيدين', en: 'Total Patients', val: nv(d.iso) }])]; } })
      ]
    });

    function countUnit(label, val) { return statUnit([{ ar: label[0], en: label[1], val: nv(val) }], 200, true); }
    /* لوحة عدد فقط (عند إيقاف التفاصيل): رقم كبير بدون مساحة فارغة */
    function countOnly(color, icon, title, label, val, wt) {
      return staticP({ weight: wt || 1, noStretch: true, color: color, icon: icon, title: title, pre: function () { return [countUnit(label, val)]; } });
    }
    var resusOn = !!d.resus.details, cloudOn = !!d.clouded.details, rtaOn = !!d.rta.details, rcOn = !!d.crescent.details, trOn = !!d.transferDetails;
    var bedsLbl = ['عدد المستفيدين بالأسرة', 'Beds Count'], caseLbl = ['عدد المستفيدين', 'Cases Count'];
    var actHead = function () { return [labelUnit('الإجراء', 'Action / Procedure')]; };

    band('الإنعاش والتنويم السحابي', 'RESUS & CLOUDED BED');
    blocks.push({
      atomic: false,
      cols: [
        resusOn
          ? { type: 'table', weight: 1, color: K.resus, icon: 'pulse', title: { ar: 'الإنعاش', en: 'Resus' }, pre: function () { return [countUnit(bedsLbl, d.resus.count)]; }, rows: cleanRows(d.resus.rows) }
          : countOnly(K.resus, 'pulse', { ar: 'الإنعاش', en: 'Resus' }, bedsLbl, d.resus.count),
        cloudOn
          ? { type: 'table', weight: 1, color: K.clouded, icon: 'cloud', title: { ar: 'التنويم السحابي', en: 'Clouded Bed' }, pre: function () { return [countUnit(bedsLbl, d.clouded.count)]; }, rows: cleanRows(d.clouded.rows) }
          : countOnly(K.clouded, 'cloud', { ar: 'التنويم السحابي', en: 'Clouded Bed' }, bedsLbl, d.clouded.count)
      ]
    });

    band('الحوادث والحالات المحولة', 'INCIDENTS & TRANSFERRED CASES');
    blocks.push({
      atomic: false,
      cols: [
        rtaOn
          ? { type: 'text', weight: 1, color: K.rta, icon: 'car', title: { ar: 'حوادث السير', en: 'RTA' }, pre: function () { return [countUnit(caseLbl, d.rta.count)]; }, paras: [d.rta.action || ''], head: actHead }
          : countOnly(K.rta, 'car', { ar: 'حوادث السير', en: 'RTA' }, caseLbl, d.rta.count),
        rcOn
          ? { type: 'text', weight: 1, color: K.crescent, icon: 'ambulance', title: { ar: 'حالات الهلال الأحمر', en: 'Red Crescent' }, pre: function () { return [countUnit(caseLbl, d.crescent.count)]; }, paras: [d.crescent.action || ''], head: actHead }
          : countOnly(K.crescent, 'ambulance', { ar: 'حالات الهلال الأحمر', en: 'Red Crescent' }, caseLbl, d.crescent.count),
        trOn
          ? { type: 'text', weight: 1, color: K.transfer, icon: 'transfer', title: { ar: 'الحالات المحولة لمستشفى آخر', en: 'Transferred-out Cases' }, pre: function () { return [countUnit(['عدد الحالات المحولة', 'Total Transferred Cases'], d.transferCount)]; }, paras: [d.transfer || ''], head: function () { return [labelUnit('تفاصيل التحويل والإجراءات', 'Transfer Details / Actions')]; } }
          : countOnly(K.transfer, 'transfer', { ar: 'الحالات المحولة لمستشفى آخر', en: 'Transferred-out Cases' }, ['عدد الحالات المحولة', 'Total Transferred Cases'], d.transferCount, 1)
      ]
    });

    band('الأعطال والإدارة', 'TECHNICAL ISSUES & MANAGEMENT');
    blocks.push({
      atomic: false,
      cols: [
        { type: 'text', weight: 1, color: K.tech, icon: 'monitor', title: { ar: 'الأعطال الفنية والتقنية', en: 'Technical & IT Issues' }, paras: [d.tech || ''] },
        { type: 'mgr', weight: 1, color: K.mgmt, icon: 'briefcase', title: { ar: 'الإدارة', en: 'Management' }, rows: cleanMgrs(d.managers) }
      ]
    });

    band('الكوادر والخدمات', 'STAFF & SERVICES');
    blocks.push({
      atomic: false,
      cols: [
        staticP({ weight: 1, color: K.paramedic, icon: 'medic', title: { ar: 'المسعف', en: 'Paramedic' }, pre: function () { return [toggleUnit(d.paramedic, 'متواجد', 'Available', 'غير متواجد', 'Not Available', 200)]; } }),
        staticP({ weight: 1, color: K.team, icon: 'users', title: { ar: 'فريق كيرلينك', en: 'CareLink Team' }, pre: function () { return [statUnit([{ ar: 'العدد', en: 'Count', val: nv(d.team) }], 200, true)]; } }),
        staticP({ weight: 1, color: K.recep, icon: 'bell', title: { ar: 'الاستقبال', en: 'Receptionist' }, pre: function () { return [statUnit([{ ar: 'العدد', en: 'Count', val: nv(d.reception) }], 200, true)]; } })
      ]
    });

    band('الملاحظات', 'REMARKS');
    blocks.push({
      atomic: false,
      cols: [
        { type: 'text', weight: 1, color: K.remarks, icon: 'notes', title: { ar: 'الملاحظات', en: 'Remarks' }, paras: [d.remarks || ''] }
      ]
    });
    return blocks;
  }

  /* ========================================================
     التخطيط: صورة واحدة طويلة (الارتفاع ديناميكي، لا تقسيم أبداً)
     ======================================================== */
  function buildLayout(snap) {
    var blocks = buildBlocks(snap), items = [], y = HDR1;
    blocks.forEach(function (b, bi) {
      if (b.band) { items.push({ band: b.band, h: BANDH, extra: 0 }); return; }
      var L = layoutBlock(b, Infinity, true);
      items.push({ L: L, h: L.h, extra: 0 });
    });
    items.forEach(function (it, i) {
      var nx = items[i + 1];
      it.gap = !nx ? 0 : it.band ? 26 : (nx.band ? GG : GAP);
      y += it.h + it.gap;
    });
    var end = y;
    var BOT = 56;
    var H = Math.max(PH, Math.ceil(end + BOT + FOOT));
    var top = 0;
    if (H === PH) {                       /* محتوى قليل: نوزّع المساحة الزائدة بشكل متوازن (مسافات وبطاقات أريح) */
      var left = PH - FOOT - BOT - end;
      var blocksN = items.filter(function (it) { return !it.band; }).length;
      var gaps = items.filter(function (it) { return it.gap > 0; });
      if (left > 0) {
        var gx = Math.min(left * 0.4 / Math.max(1, gaps.length), 40);
        gaps.forEach(function (it) { it.gap += gx; }); left -= gx * gaps.length;
        var e = Math.min(left * 0.6 / Math.max(1, blocksN), 90);
        items.forEach(function (it) { if (!it.band) it.extra = e; }); left -= e * blocksN;
        top = Math.min(left, 40) * 0.5;
        var more = Math.max(0, left - top * 2) / Math.max(1, gaps.length);
        gaps.forEach(function (it) { it.gap += more; });
      }
    }
    return { items: items, H: H, top: top };
  }

  function drawAll(ctx, lay, snap) {
    drawBg(ctx);
    if (RY0 < 600) drawHeader(ctx, snap, 0, 1);
    var y = HDR1 + lay.top;
    lay.items.forEach(function (it) {
      if (it.band) { drawBand(ctx, it.band, y); y += it.h + it.gap; return; }
      it.L.items.forEach(function (pn) {
        drawPanel(ctx, pn, y, pn.p.hero ? it.h + it.extra : pn.nat + it.extra, it.L.hdr);   // كل بطاقة بارتفاعها الطبيعي: لا تتأثر بجاراتها
      });
      y += it.h + it.extra + it.gap;
    });
    drawFooter(ctx, snap, 0, 1);
    if (snap.preview) drawWatermark(ctx);
  }

  function canvasOK(w, h) {
    try {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d'); if (!x) return false;
      x.fillStyle = '#123456'; x.fillRect(w - 2, h - 2, 2, 2);
      var d = x.getImageData(w - 1, h - 1, 1, 1).data;
      c.width = 1; c.height = 1;
      return d[3] === 255;
    } catch (e) { return false; }
  }
  function toBlob(cv) {
    return new Promise(function (res, rej) {
      try { cv.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob failed')); }, 'image/png'); } catch (e) { rej(e); }
    });
  }

  /* snap = {data, now, shift, preview} → Promise<[{blob, index:1, total:1, w, h, mode}]> دائماً صورة واحدة */
  async function render(snap, onProgress) {
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.all([document.fonts.load('700 40px "CL Sans"', 'ابجد Abc'), document.fonts.load('400 40px "CL Sans"', 'ابجد Abc')]);
        if (document.fonts.ready) await document.fonts.ready;      /* الخطوط جاهزة قبل بدء الرسم */
      } catch (e) { /* تجاهل */ }
    }
    var lay = buildLayout(snap), W = PW, H = lay.H, blob, mode, outW = W, outH = H;
    CH = H;
    try {
      if (!CL.Report._forceStrips && W * H <= SAFE_AREA && canvasOK(W, H)) {
        mode = 'canvas';
        RY0 = -1e9; RY1 = 1e9;
        var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        drawAll(cv.getContext('2d'), lay, snap);
        blob = await toBlob(cv); cv.width = 1; cv.height = 1;
        if (onProgress) onProgress(1, 1);
      } else if (CL.canStreamPng && CL.canStreamPng()) {
        mode = 'strips';
        blob = await CL.encodePngStrips(W, H, STRIP, function (ctx, y0, y1) {
          RY0 = y0; RY1 = y1; ctx.translate(0, -y0); drawAll(ctx, lay, snap);
        }, onProgress);
      } else {
        /* متصفح قديم: نبقي الصورة واحدة ونقلّل دقتها فقط بالقدر اللازم */
        mode = 'scaled';
        var s = Math.min(1, Math.sqrt(SAFE_AREA / (W * H)));
        outW = Math.round(W * s); outH = Math.round(H * s);
        RY0 = -1e9; RY1 = 1e9;
        var cv2 = document.createElement('canvas'); cv2.width = outW; cv2.height = outH;
        var c2 = cv2.getContext('2d'); c2.scale(s, s);
        drawAll(c2, lay, snap);
        blob = await toBlob(cv2); cv2.width = 1; cv2.height = 1;
        if (onProgress) onProgress(1, 1);
      }
    } finally { RY0 = -1e9; RY1 = 1e9; }
    return [{ blob: blob, index: 1, total: 1, w: outW, h: outH, mode: mode }];
  }

  CL.Report = { render: render, SIZE: PW, _forceStrips: false, _layoutHeight: function (snap) { return buildLayout(snap).H; } };
})();
