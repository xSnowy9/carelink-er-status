/* app.js : شاشة إدخال البيانات + إنشاء التقرير + التنزيل + المشاركة */
(function () {
  'use strict';
  var CL = window.CL, K = CL.COLORS;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ================= الحالة ================= */
  function blank() {
    return {
      shiftMode: 'auto',
      showCount: false,
      arrDay: '', arrShift: '',
      acute: { beds: '', wait: '' }, trauma: { beds: '', wait: '' }, fast: { beds: '', wait: '' },
      ras: null, iso: '',
      resus: { count: '', countManual: false, rows: [newRow()] },
      clouded: { count: '', countManual: false, rows: [newRow()] },
      rta: { count: '', action: '' }, crescent: { count: '', action: '' }, transfer: '',
      tech: '', paramedic: null, team: '', reception: '', mgmt: '', remarks: ''
    };
  }
  function newRow() { return { name: '', mrn: '', bed: '' }; }
  var state = blank();

  function getPath(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, path, v) {
    var ks = path.split('.'), last = ks.pop();
    var t = ks.reduce(function (a, k) { return a[k]; }, o);
    t[last] = v;
  }

  /* ================= أقسام النموذج ================= */
  function lbl(ar, en) { return '<span class="lb"><b>' + ar + '</b><i>' + en + '</i></span>'; }

  function numField(path, ar, en, big) {
    return '<label class="f num' + (big ? ' big' : '') + '">' + lbl(ar, en) +
      '<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="next" dir="ltr" placeholder="0" data-nav data-path="' + path + '" data-kind="num"></label>';
  }
  function textArea(path, ar, en, rows, ph) {
    return '<div class="tf">' + '<label class="f" for="ta_' + path.replace(/\./g, '_') + '">' + lbl(ar, en) + '</label>' +
      '<textarea id="ta_' + path.replace(/\./g, '_') + '" data-nav data-path="' + path + '" data-kind="text" dir="auto" rows="' + (rows || 2) + '" placeholder="' + (ph || 'اكتب هنا… / Type here…') + '"></textarea>' +
      '<div class="tools"><span class="cnt" data-cnt hidden></span><span class="sp"></span>' +
      '<button type="button" class="mini" data-act="grow" aria-label="تكبير الخانة">' + CL.icon('expand', 16) + ' تكبير</button>' +
      '<button type="button" class="mini" data-act="shrink" aria-label="تصغير الخانة">' + CL.icon('shrink', 16) + ' تصغير</button></div></div>';
  }
  function seg(path, opts) {
    return '<div class="seg" role="group" data-seg="' + path + '">' + opts.map(function (o) {
      return '<button type="button" data-act="seg" data-path="' + path + '" data-v="' + o.v + '" class="' + o.cls + '" aria-pressed="false">' +
        CL.icon(o.icon, 22, 2.4) + '<span><b>' + o.ar + '</b><i>' + o.en + '</i></span></button>';
    }).join('') + '</div>';
  }
  function section(id, color, icon, ar, en, inner, cls) {
    return '<section class="card sec ' + (cls || '') + '" id="sec_' + id + '" style="--c:' + color + '">' +
      '<header class="cap"><span class="ico">' + CL.icon(icon, 26, 2) + '</span><h2><b>' + ar + '</b><i>' + en + '</i></h2></header>' +
      '<div class="body">' + inner + '</div></section>';
  }
  function patientTable(tbl, color, icon, ar, en) {
    var inner = '<div class="countrow">' + numField(tbl + '.count', 'عدد المستفيدين بالأسرة', 'Beds Count', true) +
      '<p class="hint" data-hint="' + tbl + '"></p></div>' +
      '<div class="ptable" data-tbl="' + tbl + '"><div class="phead"><span>#</span><span>اسم المستفيد<i>Patient Name</i></span><span>رقم الملف<i>MRN</i></span><span>رقم السرير<i>Bed No.</i></span><span></span></div>' +
      '<div class="rows" data-rows="' + tbl + '"></div></div>' +
      '<button type="button" class="addrow" data-act="addrow" data-tbl="' + tbl + '">' + CL.icon('plus', 22, 2.6) + '<span>إضافة صف <i>Add row</i></span></button>';
    return section(tbl, color, icon, ar, en, inner, 'tbl');
  }

  function buildForm() {
    var h = '';
    /* 1) معلومات التقرير */
    h += '<section class="card sec info" id="sec_info" style="--c:' + K.navy + '">' +
      '<header class="cap"><span class="ico">' + CL.icon('calendar', 26) + '</span><h2><b>معلومات التقرير (تحديث تلقائي)</b><i>Report Information – auto updated, Asia/Riyadh UTC+3</i></h2></header>' +
      '<div class="body"><div class="tiles">' +
      '<div class="tile"><span class="t-ico">' + CL.icon('calendar', 26) + '</span><div><small>اليوم · Day</small><b id="vDayAr">—</b><i id="vDayEn">—</i></div></div>' +
      '<div class="tile"><span class="t-ico">' + CL.icon('calendar', 26) + '</span><div><small>التاريخ · Date</small><b id="vDateAr">—</b><i id="vDateEn">—</i></div></div>' +
      '<div class="tile"><span class="t-ico">' + CL.icon('clock', 26) + '</span><div><small>الوقت · Time</small><b id="vTimeAr">—</b><i id="vTimeEn">—</i></div></div>' +
      '<div class="tile"><span class="t-ico" id="vShiftIco">' + CL.icon('sun', 26) + '</span><div><small>الفترة · Shift</small><b id="vShiftAr">—</b><i id="vShiftEn">—</i></div></div>' +
      '</div>' +
      '<div class="shiftpick"><span class="lb"><b>الفترة التشغيلية</b><i>Shift</i></span><div class="chips" id="shiftChips">' +
      [['auto', 'تلقائي', 'Auto'], ['Morning', 'صباحية', 'Morning'], ['Evening', 'مسائية', 'Evening'], ['Night', 'ليلية', 'Night']].map(function (s) {
        return '<button type="button" class="chip" data-act="shift" data-v="' + s[0] + '" aria-pressed="false"><b>' + s[1] + '</b><i>' + s[2] + '</i></button>';
      }).join('') + '</div><p class="hint">صباحية 08:00–16:00 · مسائية 16:00–00:00 · ليلية 00:00–08:00</p></div>' +
      '<label class="switch"><input type="checkbox" id="chkCount"><span class="sw"></span><span>إظهار عدد الأحرف في الخانات النصية <i>Show character count</i></span></label>' +
      '</div></section>';

    /* 2) أعداد المستفيدين */
    h += section('arrivals', K.navy, 'users', 'أعداد المستفيدين', 'ER Arrivals',
      '<div class="grid2">' + numField('arrDay', 'عدد المستفيدين من بداية اليوم', 'Total ER Arrivals (From Start of Day)', true) +
      numField('arrShift', 'عدد المستفيدين بالفترة الحالية', 'Arrivals in Current Shift', true) + '</div>');

    /* 3) الأقسام الطبية */
    h += '<div class="deptgrid">';
    h += section('acute', K.acute, 'bed', 'العناية المتوسطة', 'Acute Care', '<div class="grid2">' + numField('acute.beds', 'بالأسرة', 'Beds') + numField('acute.wait', 'بالانتظار', 'Waiting') + '</div>');
    h += section('trauma', K.trauma, 'stretcher', 'الإصابات', 'Trauma', '<div class="grid2">' + numField('trauma.beds', 'بالأسرة', 'Beds') + numField('trauma.wait', 'بالانتظار', 'Waiting') + '</div>');
    h += section('fast', K.fast, 'fast', 'الفحص السريع', 'Fast Track', '<div class="grid2">' + numField('fast.beds', 'بالأسرة', 'Beds') + numField('fast.wait', 'بالانتظار', 'Waiting') + '</div>');
    h += section('ras', K.ras, 'clipboard', 'غرفة التقييم السريع', 'RAS',
      seg('ras', [{ v: 'on', cls: 'on', icon: 'check', ar: 'مفعل', en: 'ON' }, { v: 'off', cls: 'off', icon: 'x', ar: 'غير مفعل', en: 'OFF' }]));
    h += section('iso', K.iso, 'virus', 'العزل', 'Isolation', numField('iso', 'عدد المستفيدين', 'Total Patients'));
    h += '</div>';

    /* 4) الإنعاش والتنويم السحابي */
    h += '<p class="privacy">' + CL.icon('building', 18) + ' أسماء المستفيدين وأرقام الملفات تبقى في الصفحة المفتوحة فقط ولا تُحفظ في المتصفح. إذا أُعيد تحميل الصفحة ستحتاج لإدخالها من جديد.</p>';
    h += patientTable('resus', K.resus, 'pulse', 'الإنعاش', 'Resus');
    h += patientTable('clouded', K.clouded, 'cloud', 'التنويم السحابي', 'Clouded Bed');

    /* 5) الحالات والحوادث */
    h += section('rta', K.rta, 'car', 'حالات حوادث السير', 'RTA', numField('rta.count', 'عدد المستفيدين', 'Cases Count') + textArea('rta.action', 'الإجراء', 'Action / Procedure', 3));
    h += section('crescent', K.crescent, 'ambulance', 'حالات الهلال الأحمر', 'Red Crescent', numField('crescent.count', 'عدد المستفيدين', 'Cases Count') + textArea('crescent.action', 'الإجراء', 'Action / Procedure', 3));
    h += section('transfer', K.transfer, 'transfer', 'الحالات المحولة لمستشفى آخر', 'Transferred-out Cases', textArea('transfer', 'التفاصيل والإجراءات المتخذة', 'Details / Action', 3));

    /* 6) الأعطال */
    h += section('tech', K.tech, 'monitor', 'الأعطال الفنية والتقنية', 'Technical & IT Issues', textArea('tech', 'الأعطال والملاحظات التشغيلية', 'Faults, systems, devices, notes', 4, 'اكتب الأعطال والأجهزة والأنظمة… / Faults, devices, systems…'));

    /* 7) الكادر */
    h += '<div class="deptgrid staff">';
    h += section('paramedic', K.paramedic, 'medic', 'المسعف', 'Paramedic',
      seg('paramedic', [{ v: 'yes', cls: 'on', icon: 'check', ar: 'متواجد', en: 'Available' }, { v: 'no', cls: 'off', icon: 'x', ar: 'غير متواجد', en: 'Not Available' }]));
    h += section('team', K.team, 'users', 'فريق كيرلينك', 'CareLink Team', numField('team', 'العدد', 'Count'));
    h += section('reception', K.recep, 'bell', 'الاستقبال', 'Receptionist', numField('reception', 'العدد', 'Count'));
    h += '</div>';
    h += section('mgmt', K.mgmt, 'briefcase', 'الإدارة', 'Management', textArea('mgmt', 'التفاصيل الإدارية', 'Management details', 3));

    /* 8) الملاحظات */
    h += section('remarks', K.remarks, 'notes', 'الملاحظات العامة', 'Remarks', textArea('remarks', 'ملاحظات إضافية عن الحالة التشغيلية', 'Additional operational remarks', 4));
    $('#formRoot').innerHTML = h;
  }

  /* ================= صفوف المرضى ================= */
  function renderRows(tbl) {
    var box = $('[data-rows="' + tbl + '"]');
    var rows = state[tbl].rows;
    box.innerHTML = rows.map(function (r, i) {
      return '<div class="prow" data-i="' + i + '"><span class="n">' + (i + 1) + '</span>' +
        '<input class="nm" type="text" data-nav data-tbl="' + tbl + '" data-i="' + i + '" data-f="name" dir="auto" autocomplete="off" spellcheck="false" enterkeyhint="next" placeholder="اسم المستفيد / Patient Name" value="' + esc(r.name) + '">' +
        '<input class="mrn" type="text" inputmode="numeric" data-nav data-tbl="' + tbl + '" data-i="' + i + '" data-f="mrn" dir="ltr" autocomplete="off" enterkeyhint="next" placeholder="MRN" value="' + esc(r.mrn) + '">' +
        '<input class="bed" type="text" data-nav data-tbl="' + tbl + '" data-i="' + i + '" data-f="bed" dir="ltr" autocomplete="off" enterkeyhint="next" placeholder="Bed" value="' + esc(r.bed) + '">' +
        '<button type="button" class="del" data-act="delrow" data-tbl="' + tbl + '" data-i="' + i + '" aria-label="حذف الصف">' + CL.icon('trash', 20) + '</button></div>';
    }).join('');
    updateAutoCount(tbl);
  }
  function filledRows(tbl) {
    return state[tbl].rows.filter(function (r) { return (r.name + r.mrn + r.bed).trim() !== ''; }).length;
  }
  function updateAutoCount(tbl) {
    var t = state[tbl];
    var hint = $('[data-hint="' + tbl + '"]');
    var inp = $('[data-path="' + tbl + '.count"]');
    if (!t.countManual) {
      t.count = filledRows(tbl) ? String(filledRows(tbl)) : '';
      if (inp) inp.value = t.count;
      if (hint) hint.textContent = 'العدد يُحسب تلقائياً من الصفوف المعبأة. اكتب رقماً لتغييره يدوياً.';
    } else if (hint) {
      hint.innerHTML = 'العدد يدوي. <button type="button" class="linkbtn" data-act="autocount" data-tbl="' + tbl + '">العودة للحساب التلقائي</button>';
    }
  }

  /* ================= مزامنة الواجهة مع الحالة ================= */
  function autosize(ta) {
    ta.style.height = 'auto';
    var min = parseInt(ta.dataset.minh || '0', 10);
    ta.style.height = Math.max(ta.scrollHeight + 2, min) + 'px';
  }
  function updateCount(ta) {
    var c = ta.parentNode.querySelector('[data-cnt]');
    if (c) c.textContent = ta.value.length + ' حرف / chars';
  }
  function syncAll() {
    $$('[data-path]').forEach(function (el) {
      if (el.matches('button')) return;
      var v = getPath(state, el.dataset.path);
      el.value = v == null ? '' : v;
      if (el.tagName === 'TEXTAREA') { autosize(el); updateCount(el); }
    });
    $$('[data-seg]').forEach(function (g) {
      var v = getPath(state, g.dataset.seg);
      $$('button', g).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === v)); });
    });
    $$('#shiftChips .chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === state.shiftMode)); });
    $('#chkCount').checked = !!state.showCount;
    document.body.classList.toggle('show-count', !!state.showCount);
    $$('[data-cnt]').forEach(function (c) { c.hidden = !state.showCount; });
    renderRows('resus'); renderRows('clouded');
    tickClock(true);
  }

  /* ================= الوقت الحي ================= */
  var lastClock = '';
  function effectiveShift(now) { return state.shiftMode === 'auto' ? now.shift : state.shiftMode; }
  function tickClock(force) {
    var n = CL.riyadhNow(), sh = effectiveShift(n);
    var key = n.timeAr + n.dateAr + sh;
    if (!force && key === lastClock) return;
    lastClock = key;
    $('#vDayAr').textContent = n.dayAr; $('#vDayEn').textContent = n.dayEn;
    $('#vDateAr').textContent = n.dateAr; $('#vDateEn').textContent = n.dateEn;
    $('#vTimeAr').textContent = n.timeAr; $('#vTimeEn').textContent = n.timeEn;
    var s = CL.SHIFTS[sh];
    $('#vShiftAr').textContent = s.ar; $('#vShiftEn').textContent = s.en + ' · ' + s.range;
    $('#vShiftIco').innerHTML = CL.icon(s.icon, 26);
    var top = $('#topClock'); if (top) top.textContent = n.dayEn + ' ' + n.dateNum + ' · ' + n.timeEn;
  }

  /* ================= المسودة (بدون بيانات المرضى) ================= */
  var DRAFT_KEY = 'carelink-er-draft-v1';
  var saveTimer = null;
  function draftData() {
    var d = JSON.parse(JSON.stringify(state));
    d.resus.rows = [newRow()]; d.clouded.rows = [newRow()];   // لا نحفظ اسم المريض ولا رقم الملف
    return d;
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ t: new Date().toISOString(), d: draftData() }));
        var n = CL.riyadhNow();
        $('#draftStatus').textContent = 'تم حفظ المسودة تلقائياً · ' + n.timeAr;
      } catch (e) { $('#draftStatus').textContent = 'تعذر حفظ المسودة في هذا المتصفح'; }
    }, 500);
  }
  function loadDraft() {
    try { var raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* تجاهل */ } $('#draftStatus').textContent = ''; }
  function hasContent(d) {
    var b = JSON.stringify(blank());
    var x = JSON.parse(JSON.stringify(d)); x.shiftMode = 'auto'; x.showCount = false;
    var y = JSON.parse(b);
    return JSON.stringify(x) !== JSON.stringify(y);
  }

  /* ================= نوافذ التأكيد والتنبيهات ================= */
  function ask(title, html, buttons) {
    return new Promise(function (resolve) {
      var m = $('#modal');
      m.innerHTML = '<div class="mbox" role="dialog" aria-modal="true"><h3>' + title + '</h3><div class="mbody">' + html + '</div><div class="mbtns">' +
        buttons.map(function (b, i) { return '<button type="button" class="btn ' + (b.cls || '') + '" data-i="' + i + '">' + b.label + '</button>'; }).join('') + '</div></div>';
      m.hidden = false;
      function done(v) { m.hidden = true; m.innerHTML = ''; resolve(v); }
      $$('button', m).forEach(function (b) { b.onclick = function () { done(buttons[+b.dataset.i].value); }; });
      var f = $('button', m); if (f) f.focus();
    });
  }
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3800);
  }

  /* ================= إنشاء التقرير ================= */
  var session = null;       // آخر تقرير مُنشأ
  var finalDirty = true;    // تغيّرت البيانات بعد آخر تقرير نهائي
  var busy = false;

  var REQUIRED = [
    ['arrDay', 'عدد المستفيدين من بداية اليوم'], ['arrShift', 'عدد المستفيدين بالفترة الحالية'],
    ['acute.beds', 'العناية المتوسطة – الأسرة'], ['acute.wait', 'العناية المتوسطة – الانتظار'],
    ['trauma.beds', 'الإصابات – الأسرة'], ['trauma.wait', 'الإصابات – الانتظار'],
    ['fast.beds', 'الفحص السريع – الأسرة'], ['fast.wait', 'الفحص السريع – الانتظار'],
    ['ras', 'حالة RAS'], ['iso', 'العزل'],
    ['rta.count', 'عدد حوادث السير'], ['crescent.count', 'عدد حالات الهلال الأحمر'],
    ['paramedic', 'حالة المسعف'], ['team', 'عدد فريق كيرلينك'], ['reception', 'عدد الاستقبال']
  ];
  function missingFields() {
    return REQUIRED.filter(function (r) { var v = getPath(state, r[0]); return v === '' || v == null; }).map(function (r) { return r[1]; });
  }

  function snapshot(preview) {
    var now = CL.riyadhNow(new Date());
    return { data: JSON.parse(JSON.stringify(state)), now: now, shift: effectiveShift(now), preview: !!preview };
  }

  async function generate(preview) {
    if (busy) return false;
    var miss = missingFields();
    if (miss.length) {
      var list = miss.slice(0, 8).map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + (miss.length > 8 ? '<li>… و ' + (miss.length - 8) + ' أخرى</li>' : '');
      var go = await ask('هناك خانات فارغة (' + miss.length + ')', '<p>ستظهر الخانات الفارغة في التقرير بعلامة (—). هل تريد المتابعة؟</p><ul class="mlist">' + list + '</ul>',
        [{ label: 'متابعة وإنشاء التقرير', cls: 'primary', value: true }, { label: 'رجوع للتعبئة', value: false }]);
      if (!go) return false;
    }
    if (!preview && session && !session.preview && !session.saved) {
      var rep = await ask('تقرير سابق لم يُحفظ', '<p>يوجد تقرير نهائي سابق لم تقم بتنزيله أو مشاركته. سيتم استبداله بالتقرير الجديد.</p>',
        [{ label: 'استبدال بالتقرير الجديد', cls: 'primary', value: true }, { label: 'إلغاء', value: false }]);
      if (!rep) return false;
    }
    busy = true; showBusy(true, 0, 0);
    var snap = snapshot(preview);
    var imgs;
    try {
      try {
        imgs = await CL.Report.render(snap, function (i, n) { showBusy(true, i, n); });
      } catch (err) {
        if (err && (err.name === 'SecurityError' || /tainted|toBlob/i.test(String(err.message)))) {
          CL.disableLogos();   // شعار خارجي منع التصدير: نعيد المحاولة بالشعارات المرسومة
          imgs = await CL.Report.render(snap, function (i, n) { showBusy(true, i, n); });
        } else { throw err; }
      }
    } catch (err) {
      busy = false; showBusy(false);
      console.error(err);
      await ask('تعذر إنشاء التقرير', '<p>حدثت مشكلة أثناء رسم الصور. جرّب مرة أخرى، وإذا تكررت المشكلة استخدم متصفحاً حديثاً (Chrome أو Safari).</p><p dir="ltr" class="err">' + esc(err && err.message || err) + '</p>', [{ label: 'حسناً', cls: 'primary', value: 1 }]);
      return false;
    }
    if (session) session.images.forEach(function (im) { URL.revokeObjectURL(im.url); });
    var base = 'ER-REPORT_' + snap.now.fileStamp;
    session = {
      preview: !!preview, snap: snap, saved: false, cur: 0,
      images: imgs.map(function (im) {
        return { blob: im.blob, url: URL.createObjectURL(im.blob), index: im.index, total: im.total, name: im.total > 1 ? base + '_' + im.index + 'of' + im.total + '.png' : base + '.png' };
      })
    };
    if (!preview) finalDirty = false;
    busy = false; showBusy(false);
    openReportScreen();
    return true;
  }

  function showBusy(on, i, n) {
    var b = $('#busy'); b.hidden = !on;
    if (on) $('#busyMsg').textContent = n ? 'جارٍ رسم الصورة ' + i + ' من ' + n + '…' : 'جارٍ إنشاء التقرير…';
  }

  /* ================= شاشة التقرير ================= */
  function openReportScreen() {
    $('#screenEntry').hidden = true; $('#screenReport').hidden = false;
    $('#actionbar').hidden = true;
    window.scrollTo(0, 0);
    renderReport();
  }
  function backToEntry() {
    $('#screenReport').hidden = true; $('#screenEntry').hidden = false; $('#actionbar').hidden = false;
  }
  function renderReport() {
    var s = session, im = s.images[s.cur], n = s.images.length;
    var el = $('#rimg'); el.src = im.url; el.alt = 'ER STATS REPORT ' + im.index + '/' + n;
    $('#pageLabel').textContent = n > 1 ? 'صورة ' + im.index + ' من ' + n + '  ·  ' + im.index + '/' + n : 'صورة واحدة';
    $('#prevBtn').hidden = n < 2; $('#nextBtn').hidden = n < 2;
    $('#prevBtn').disabled = s.cur === 0; $('#nextBtn').disabled = s.cur === n - 1;
    $('#thumbs').innerHTML = n < 2 ? '' : s.images.map(function (x, i) {
      return '<button type="button" class="th" data-act="goto" data-i="' + i + '" aria-pressed="' + (i === s.cur) + '"><img src="' + x.url + '" alt="' + x.index + '"><span>' + x.index + '</span></button>';
    }).join('');
    $('#previewBanner').hidden = !s.preview;
    $('#finalActions').hidden = s.preview; $('#previewActions').hidden = !s.preview;
    $('#dlOne').querySelector('.t').textContent = n > 1 ? 'تنزيل هذه الصورة (PNG)' : 'تنزيل الصورة (PNG)';
    $('#dlZip').hidden = n < 2;
    var t = s.snap.now;
    $('#rmeta').textContent = t.dayEn + ' ' + t.dateEn + ' · ' + t.timeEn + ' · ' + n + (n > 1 ? ' صور' : ' صورة') + ' · 3000×3000';
  }

  function triggerDownload(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
  }
  function downloadCurrent() {
    var im = session.images[session.cur];
    triggerDownload(im.blob, im.name);
    session.saved = true;
    toast('تم تنزيل ' + im.name);
  }
  async function downloadZip() {
    var files = session.images.map(function (im) { return { name: im.name, blob: im.blob }; });
    var zip = await CL.makeZip(files);
    triggerDownload(zip, 'ER-REPORT_' + session.snap.now.fileStamp + '.zip');
    session.saved = true;
    toast('تم تنزيل ملف ZIP');
  }
  async function shareReport() {
    var s = session;
    var files = s.images.map(function (im) { return new File([im.blob], im.name, { type: 'image/png' }); });
    var text = 'ER STATS REPORT – ' + s.snap.now.dateEn + ' ' + s.snap.now.timeEn + '\nتقرير إحصائيات الطوارئ – مستشفى بريدة المركزي';
    if (navigator.canShare && navigator.canShare({ files: files }) && navigator.share) {
      try {
        await navigator.share({ files: files, title: 'ER STATS REPORT', text: text });
        s.saved = true; return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;   // المستخدم أغلق نافذة المشاركة
        console.warn(e);
      }
    }
    /* المتصفح لا يدعم مشاركة الصور مباشرة: ننزّل الصور ثم نفتح واتساب */
    if (files.length > 1) await downloadZip(); else downloadCurrent();
    var go = await ask('أرفق الصورة في واتساب',
      '<p>هذا المتصفح لا يدعم إرسال الصور مباشرة إلى واتساب، لذلك تم <b>تنزيل الصور على جهازك</b>.</p><p>افتح واتساب وأرسل الصورة إلى مدير المستشفى من زر الإرفاق (📎) ← المعرض / الملفات.</p>',
      [{ label: 'فتح واتساب', cls: 'wa', value: true }, { label: 'إغلاق', value: false }]);
    if (go) window.open('https://wa.me/', '_blank', 'noopener');
  }

  /* ================= الأوامر ================= */
  async function clearAll() {
    var ok = await ask('مسح جميع البيانات؟', '<p>سيتم مسح كل الخانات والمسودة المحفوظة ليبدأ تقرير جديد. لا يمكن التراجع.</p>',
      [{ label: 'نعم، امسح الكل', cls: 'danger', value: true }, { label: 'إلغاء', value: false }]);
    if (!ok) return;
    state = blank(); clearDraft(); syncAll(); finalDirty = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('تم مسح البيانات. يمكنك بدء تقرير جديد.');
  }
  async function actionDownload() {
    if (session && !session.preview && !finalDirty) { openReportScreen(); (session.images.length > 1 ? downloadZip : downloadCurrent)(); return; }
    var ok = await generate(false);
    if (ok) toast('تم إنشاء التقرير. اضغط زر التنزيل.');
  }
  async function actionShare() {
    if (session && !session.preview && !finalDirty) { openReportScreen(); return; }
    var ok = await generate(false);
    if (ok) toast('تم إنشاء التقرير. اضغط زر المشاركة عبر واتساب.');
  }

  function focusNext(el) {
    var all = $$('[data-nav]').filter(function (x) { return !x.disabled && x.offsetParent !== null; });
    var i = all.indexOf(el);
    if (i > -1 && i < all.length - 1) { all[i + 1].focus(); if (all[i + 1].select) all[i + 1].select(); }
    else el.blur();
  }

  /* ================= الأحداث ================= */
  function onInput(e) {
    var el = e.target;
    if (el.dataset.f && el.dataset.tbl) {                       // صف مريض
      var v = el.value;
      if (el.dataset.f === 'mrn' || el.dataset.f === 'bed') { var nv = CL.normDigits(v); if (nv !== v) { el.value = nv; v = nv; } }
      state[el.dataset.tbl].rows[+el.dataset.i][el.dataset.f] = v;
      updateAutoCount(el.dataset.tbl);
      finalDirty = true; return;
    }
    if (!el.dataset.path || el.matches('button')) return;
    var path = el.dataset.path, val = el.value;
    if (el.dataset.kind === 'num') {
      var cleaned = CL.normDigits(val).replace(/[^0-9]/g, '');
      if (cleaned !== val) { el.value = cleaned; }
      val = cleaned;
      var m = path.match(/^(resus|clouded)\.count$/);
      if (m) { state[m[1]].countManual = val !== ''; if (val === '') updateAutoCount(m[1]); else updateAutoCount(m[1]); }
    }
    setPath(state, path, val);
    if (el.tagName === 'TEXTAREA') { autosize(el); updateCount(el); }
    finalDirty = true; scheduleSave();
  }

  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    if (act === 'seg') {
      var cur = getPath(state, b.dataset.path);
      setPath(state, b.dataset.path, cur === b.dataset.v ? null : b.dataset.v);
      $$('[data-seg="' + b.dataset.path + '"] button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === getPath(state, b.dataset.path))); });
      finalDirty = true; scheduleSave();
    } else if (act === 'shift') {
      state.shiftMode = b.dataset.v;
      $$('#shiftChips .chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === state.shiftMode)); });
      tickClock(true); finalDirty = true; scheduleSave();
    } else if (act === 'addrow') {
      var t = b.dataset.tbl; state[t].rows.push(newRow()); renderRows(t);
      var rows = $$('[data-rows="' + t + '"] .prow'); var last = rows[rows.length - 1];
      if (last) { var f = last.querySelector('input'); f.focus(); last.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      finalDirty = true;
    } else if (act === 'delrow') {
      var tb = b.dataset.tbl, i = +b.dataset.i, r = state[tb].rows[i];
      var hasData = (r.name + r.mrn + r.bed).trim() !== '';
      (hasData ? ask('حذف الصف؟', '<p>سيتم حذف بيانات هذا الصف.</p>', [{ label: 'حذف', cls: 'danger', value: true }, { label: 'إلغاء', value: false }]) : Promise.resolve(true)).then(function (ok) {
        if (!ok) return;
        state[tb].rows.splice(i, 1); if (!state[tb].rows.length) state[tb].rows.push(newRow());
        renderRows(tb); finalDirty = true;
      });
    } else if (act === 'autocount') {
      state[b.dataset.tbl].countManual = false; updateAutoCount(b.dataset.tbl); scheduleSave();
    } else if (act === 'grow' || act === 'shrink') {
      var ta = b.closest('.tf').querySelector('textarea');
      var h = ta.offsetHeight;
      if (act === 'grow') ta.dataset.minh = String(h + 140);
      else { ta.dataset.minh = '0'; }
      autosize(ta);
    } else if (act === 'goto') {
      session.cur = +b.dataset.i; renderReport();
    }
  }

  function onKeydown(e) {
    var el = e.target;
    if (e.key !== 'Enter' || !el.matches('input[data-nav]') || e.isComposing) return;
    e.preventDefault();
    if (el.dataset.f === 'bed') {
      var tbl = el.dataset.tbl, rows = state[tbl].rows;
      if (+el.dataset.i === rows.length - 1 && (rows[rows.length - 1].name + rows[rows.length - 1].mrn + rows[rows.length - 1].bed).trim() !== '') {
        rows.push(newRow()); renderRows(tbl);
        var ps = $$('[data-rows="' + tbl + '"] .prow'); ps[ps.length - 1].querySelector('input').focus(); return;
      }
    }
    focusNext(el);
  }

  function bindOnce() {
    var root = $('#screenEntry');
    root.addEventListener('input', onInput);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);
    $('#screenReport').addEventListener('click', onClick);
    $('#chkCount').addEventListener('change', function (e) {
      state.showCount = e.target.checked;
      document.body.classList.toggle('show-count', state.showCount);
      $$('[data-cnt]').forEach(function (c) { c.hidden = !state.showCount; });
      scheduleSave();
    });
    /* تعديل حجم الخانة يدوياً بالسحب (سطح المكتب) */
    root.addEventListener('mouseup', function (e) {
      var ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
      if (ta.offsetHeight > ta.scrollHeight + 6) ta.dataset.minh = String(ta.offsetHeight); else ta.dataset.minh = '0';
      autosize(ta);
    });
    $('#btnPreview').onclick = function () { generate(true); };
    $('#btnGenerate').onclick = function () { generate(false); };
    $('#btnDownload').onclick = actionDownload;
    $('#btnShare').onclick = actionShare;
    $('#btnClear').onclick = clearAll;
    $('#backBtn').onclick = backToEntry;
    $('#prevBtn').onclick = function () { if (session.cur > 0) { session.cur--; renderReport(); } };
    $('#nextBtn').onclick = function () { if (session.cur < session.images.length - 1) { session.cur++; renderReport(); } };
    $('#dlOne').onclick = downloadCurrent;
    $('#dlZip').onclick = downloadZip;
    $('#rShare').onclick = shareReport;
    $('#pvFinal').onclick = function () { generate(false); };
    $('#pvBack').onclick = backToEntry;
    $('#newReport').onclick = async function () { backToEntry(); await clearAll(); };
    window.addEventListener('beforeunload', function (e) {
      var any = ['resus', 'clouded'].some(function (t) { return filledRows(t) > 0; });
      if (any) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#modal').hidden) { /* النافذة تُغلق بالأزرار فقط */ }
      if (!$('#screenReport').hidden && session && session.images.length > 1) {
        if (e.key === 'ArrowLeft') { $('#nextBtn').click(); }
        if (e.key === 'ArrowRight') { $('#prevBtn').click(); }
      }
    });
  }

  /* ================= التشغيل ================= */
  async function init() {
    CL.loadLogos();
    buildForm(); bindOnce(); syncAll();
    $$('[data-ic]').forEach(function (e) { e.innerHTML = CL.icon(e.dataset.ic, +e.dataset.s || 22, 2.2); });
    setInterval(function () { tickClock(false); }, 1000);

    var d = loadDraft();
    if (d && d.d && hasContent(d.d)) {
      var when = '';
      try { var t = CL.riyadhNow(new Date(d.t)); when = t.dayAr + ' ' + t.dateAr + ' – ' + t.timeAr; } catch (e) { /* تجاهل */ }
      var restore = await ask('مسودة محفوظة', '<p>تم العثور على مسودة غير مكتملة' + (when ? ' (' + when + ')' : '') + '.</p><p class="small">لا تتضمن أسماء المستفيدين ولا أرقام الملفات.</p>',
        [{ label: 'استعادة المسودة', cls: 'primary', value: true }, { label: 'تجاهل وبدء جديد', value: false }]);
      if (restore) {
        var base = blank(), saved = d.d;
        Object.keys(base).forEach(function (k) { if (saved[k] !== undefined) base[k] = saved[k]; });
        base.resus.rows = [newRow()]; base.clouded.rows = [newRow()];
        state = base; syncAll(); toast('تمت استعادة المسودة');
      } else { clearDraft(); }
    }

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* اختياري */ });
    }
    window.CLApp = { get state() { return state; }, get session() { return session; }, generate: generate };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
