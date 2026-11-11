# CareLink – ER STATS REPORT
تقرير الحالة التشغيلية لقسم الطوارئ – مستشفى بريدة المركزي – تجمع القصيم الصحي

موقع جاهز للنشر مباشرة على GitHub Pages. **لا يحتاج Build ولا Terminal ولا تثبيت أي شيء.**

## النشر على GitHub Pages (بدون أوامر)
1. أنشئ حساباً على https://github.com ثم اضغط **New repository**.
2. اكتب اسماً مثل `er-stats-report`، واختر **Public**، ثم **Create repository**.
3. اضغط **uploading an existing file**.
4. فكّ ضغط ملف ZIP على جهازك، ثم **اسحب كل الملفات والمجلدات الموجودة داخله** (index.html و css و js و assets …) إلى صفحة GitHub.
   - يجب أن يظهر `index.html` في المستوى الأول من المستودع (وليس داخل مجلد فرعي).
   - الملف المخفي `.nojekyll` مهم؛ إن لم يظهر في الرفع أنشئه من **Add file ← Create new file** باسم `.nojekyll` (ملف فارغ).
5. اضغط **Commit changes**.
6. من **Settings ← Pages**: اختر Source = **Deploy from a branch**، Branch = **main**، Folder = **/(root)** ثم **Save**.
7. بعد دقيقة أو دقيقتين يظهر الرابط: `https://اسم-حسابك.github.io/er-stats-report/`

## طريقة الاستخدام
افتح الرابط ← اضغط على الخانة واكتب ← **إنشاء التقرير** ← **مشاركة عبر واتساب** (أو **تحميل PNG**).

## الشعارات الرسمية (اختياري)
ضع ملفات `carelink.png` و `cluster.png` و `hospital.png` في `assets/logos/` ثم غيّر في `js/config.js` السطر
`CL.USE_CUSTOM_LOGOS = false;` إلى `true`.

## الخصوصية
أسماء المستفيدين وأرقام الملفات لا تُحفظ في المتصفح ولا تُرسل لأي خدمة. كل المعالجة تتم على جهاز المستخدم، ولا يوجد أي خادم أو مكتبة خارجية.
المسودة التلقائية تحفظ الأرقام والملاحظات النصية فقط على نفس الجهاز، فتجنّب كتابة أسماء المرضى داخل الملاحظات الحرة.
