/* CareLink – ER STATS REPORT
   config.js : الألوان، الأيقونات، دوال التوقيت السعودي (Asia/Riyadh) */
(function () {
  'use strict';
  var CL = (window.CL = window.CL || {});

  CL.FONT = 'system-ui, -apple-system, "Segoe UI", Tahoma, "Noto Sans Arabic", "Geeza Pro", "CL Sans", Arial, sans-serif';

  /* هوية الألوان الثابتة لكل قسم */
  CL.COLORS = {
    acute: '#D32F2F',     // أحمر
    trauma: '#F57C00',    // برتقالي
    fast: '#1E6FD9',      // أزرق
    ras: '#8E44D0',       // بنفسجي
    iso: '#2E9E4F',       // أخضر
    resus: '#4B1F8F',     // بنفسجي داكن
    clouded: '#12347A',   // أزرق داكن
    rta: '#9B1B1B',       // أحمر داكن
    crescent: '#E53935',  // أحمر
    transfer: '#0CA3D2',  // أزرق سماوي
    tech: '#4F6D86',      // رمادي مزرق
    team: '#1E6FD9',      // أزرق
    mgmt: '#0F2F6B',      // أزرق داكن
    paramedic: '#0F9D8A',
    recep: '#3F8CE8',
    remarks: '#3D5A80',
    navy: '#0A2A5E',
    ink: '#10264A',
    mute: '#5B6B86',
    ok: '#1F9D57',
    bad: '#D32F2F'
  };

  /* أيقونات على شبكة 24×24 (خطوط فقط) – تُستخدم في الواجهة وفي رسم التقرير بنفس الشكل */
  CL.ICONS = {
    bed: 'M2 6v13 M2 15h20v4 M22 19v-5a3 3 0 0 0-3-3h-8v4 M6.5 12a1.8 1.8 0 1 0 .001 0',
    stretcher: 'M2 14h20 M4 14l1-4h14l1 4 M6 14v4 M18 14v4 M9 10V7h6v3',
    fast: 'M4 6l6 6-6 6 M12 6l6 6-6 6',
    clipboard: 'M9 4h6v3H9z M7 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-1 M8.5 14l2.5 2.5 5-5',
    virus: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M18.4 5.6l-2.1 2.1 M7.7 16.3l-2.1 2.1',
    heart: 'M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21.6l8.8-8.6a5.2 5.2 0 0 0 0-7.4z',
    pulse: 'M2 12h5l2-6 4 12 2-6h7',
    cloud: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9.5 3.8 3.8 0 0 1 17.5 18z',
    car: 'M4 16v-3l2-5h12l2 5v3 M2 16h20 M4 16v2 M20 16v2 M6 13h12 M7.5 16.5h.01 M16.5 16.5h.01',
    ambulance: 'M2 17V7h12v10 M14 10h4l4 3v4 M2 17h20 M6.5 19.5a1.8 1.8 0 1 0 .01 0 M17.5 19.5a1.8 1.8 0 1 0 .01 0 M8 9v4 M6 11h4',
    transfer: 'M3 21V8l7-4v17 M10 21h5 M14 12h8 M19 9l3 3-3 3 M6 10h1 M6 14h1',
    monitor: 'M3 4h18v12H3z M8 20h8 M12 16v4 M12 7v4 M12 13.2h.01',
    medic: 'M12 8m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M5 21a7 7 0 0 1 14 0 M12 13v4 M10 15h4',
    users: 'M9 8m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M3 20a6 6 0 0 1 12 0 M16 5.5a3 3 0 0 1 0 5.5 M17 14.5a6 6 0 0 1 4 5.5',
    bell: 'M4 17h16 M6 17a6 6 0 0 1 12 0 M12 8V6 M10 6h4',
    briefcase: 'M3 8h18v12H3z M9 8V5h6v3 M3 13h18',
    notes: 'M6 3h9l4 4v14H6z M15 3v4h4 M9 12h7 M9 16h7',
    calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
    clock: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 7v5l3 2',
    sun: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.4 1.4 M17.6 17.6L19 19 M19 5l-1.4 1.4 M6.4 17.6L5 19',
    sunset: 'M5 18a7 7 0 0 1 14 0 M2 18h20 M12 6v3 M4.5 10l1.8 1.8 M19.5 10l-1.8 1.8',
    moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
    download: 'M12 4v11 M7 11l5 5 5-5 M4 20h16',
    whatsapp: 'M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z M9 8.8c-.3 1.6 1.7 4.2 4.2 5.2.8.3 1.6-.2 2-.9l-1.5-1-.8.6c-1-.4-2-1.4-2.4-2.4l.6-.8-1-1.5c-.2.1-.9.3-1.1.8z',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    image: 'M3 4h18v16H3z M3 16l5-5 4 4 3-3 6 6 M16 9h.01',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
    plus: 'M12 5v14 M5 12h14',
    minus: 'M5 12h14',
    check: 'M5 12l5 5 9-10',
    x: 'M6 6l12 12 M18 6L6 18',
    expand: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',
    shrink: 'M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5',
    palm: 'M12 21c0-6 .5-9 1-11 M13 10c-2-3-5-3-8-2 M13 10c1-3 4-5 7-4 M13 10c-1-3-1-5 0-7 M13 10c3-1 6 0 7 3 M13 10c-3 0-5 2-5 5',
    building: 'M4 21V6l8-3 8 3v15 M2 21h20 M9 21v-5h6v5 M8 9h2 M14 9h2 M8 12.5h2 M14 12.5h2',
    refresh: 'M20 12a8 8 0 1 1-2.5-5.8 M20 4v5h-5',
    save: 'M5 4h12l3 3v13H5z M8 4v5h7V4 M8 20v-6h8v6',
    arrowRight: 'M5 12h14 M13 6l6 6-6 6',
    zip: 'M5 3h10l4 4v14H5z M12 3v8 M10 7h2 M10 10h2 M11 14h2v4h-2z',
    share: 'M18 8m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M18 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M8.7 10.6l6.6-3.2 M8.7 13.4l6.6 3.2',
    cross: 'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z'
  };

  /* يرجع نص SVG لأيقونة */
  CL.icon = function (name, size, sw) {
    size = size || 24;
    sw = sw || 2;
    var d = CL.ICONS[name] || '';
    return '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  };

  var pathCache = {};
  /* رسم أيقونة على Canvas */
  CL.drawIcon = function (ctx, name, cx, cy, size, color, lw) {
    var d = CL.ICONS[name];
    if (!d) return;
    var p = pathCache[name] || (pathCache[name] = new Path2D(d));
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(p);
    ctx.restore();
  };

  /* ===== التوقيت: دائماً بتوقيت السعودية Asia/Riyadh (UTC+3) ===== */
  var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  CL.SHIFTS = {
    Morning: { ar: 'الفترة الصباحية', arShort: 'صباحية', en: 'Morning', range: '08:00–16:00', icon: 'sun' },
    Evening: { ar: 'الفترة المسائية', arShort: 'مسائية', en: 'Evening', range: '16:00–00:00', icon: 'sunset' },
    Night: { ar: 'الفترة الليلية', arShort: 'ليلية', en: 'Night', range: '00:00–08:00', icon: 'moon' }
  };

  var fmt = null;
  function riyadhParts(date) {
    var p;
    try {
      fmt = fmt || new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'
      });
      p = {};
      fmt.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
      var o = {
        y: +p.year, m: +p.month, d: +p.day,
        h: +p.hour % 24, mi: +p.minute, s: +p.second
      };
      if (isNaN(o.y) || isNaN(o.h)) throw new Error('bad parts');
      return o;
    } catch (e) {
      /* احتياط: UTC + 3 ساعات */
      var t = new Date(date.getTime() + 3 * 3600 * 1000);
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() };
    }
  }

  function two(n) { return (n < 10 ? '0' : '') + n; }

  CL.shiftForHour = function (h) {
    if (h >= 8 && h < 16) return 'Morning';
    if (h >= 16) return 'Evening';
    return 'Night';
  };

  /* يرجع كل صيغ اليوم والتاريخ والوقت بالعربية والإنجليزية */
  CL.riyadhNow = function (date) {
    date = date || new Date();
    var p = riyadhParts(date);
    var wd = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
    var h12 = p.h % 12 === 0 ? 12 : p.h % 12;
    var pm = p.h >= 12;
    return {
      date: date,
      y: p.y, m: p.m, d: p.d, h: p.h, mi: p.mi,
      dayEn: DAYS_EN[wd], dayAr: DAYS_AR[wd],
      dateEn: p.d + ' ' + MONTHS_EN[p.m - 1] + ' ' + p.y,
      dateAr: p.d + ' ' + MONTHS_AR[p.m - 1] + ' ' + p.y,
      dateNum: two(p.d) + '/' + two(p.m) + '/' + p.y,
      timeEn: two(h12) + ':' + two(p.mi) + ' ' + (pm ? 'PM' : 'AM'),
      timeAr: two(h12) + ':' + two(p.mi) + ' ' + (pm ? 'م' : 'ص'),
      time24: two(p.h) + ':' + two(p.mi),
      shift: CL.shiftForHour(p.h),
      fileStamp: p.y + '-' + two(p.m) + '-' + two(p.d) + '_' + two(p.h) + two(p.mi)
    };
  };

  /* يحوّل الأرقام العربية/الفارسية إلى أرقام لاتينية */
  CL.normDigits = function (s) {
    return String(s)
      .replace(/[\u0660-\u0669]/g, function (c) { return c.charCodeAt(0) - 0x0660; })
      .replace(/[\u06F0-\u06F9]/g, function (c) { return c.charCodeAt(0) - 0x06F0; });
  };

  /* شعارات اختيارية: ضع ملفات PNG في assets/logos ليتم استخدامها تلقائياً */
  CL.logos = { carelink: null, cluster: null, hospital: null };
  CL.USE_CUSTOM_LOGOS = false;   // غيّرها إلى true بعد وضع ملفات الشعارات في assets/logos
  CL.loadLogos = function () {
    if (!CL.USE_CUSTOM_LOGOS) return;
    ['carelink', 'cluster', 'hospital'].forEach(function (k) {
      var img = new Image();
      img.onload = function () { CL.logos[k] = img; };
      img.onerror = function () { CL.logos[k] = null; };
      img.src = 'assets/logos/' + k + '.png';
    });
  };
  CL.disableLogos = function () { CL.logos = { carelink: null, cluster: null, hospital: null }; };
})();
