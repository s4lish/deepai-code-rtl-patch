# پچ RTL برای DeepAI Code — مستندات کامل

پشتیبانی از زبان فارسی و متن‌های راست‌به‌چپ (RTL) در برنامه دسکتاپ DeepAI Code.

> آخرین وضعیت: نصب و تأییدشده روی Windows. پچ فقط فایل `index.html` رابط کاربری را تغییر می‌دهد و به `main.cjs`، `preload.cjs` یا هیچ فایل دیگری دست نمی‌زند.

---

## ۱. مشکل چی بود؟

رابط کاربری برنامه (React/Svelte) از این مسیر داخل `server.asar` لود می‌شود:

```
apps/server/dist/client/index.html
```

این فایل هاردکد `<html lang="en">` بود و **هیچ‌جا** attribute دیگری (`dir`) ست نمی‌شد — نه در HTML و نه در باندل‌های JS.

نکته جالب: CSS برنامه (Tailwind v4) از قبل **کاملاً RTL-aware** بود:
- سلکتورهای `[dir=rtl]` و `:lang(ar)` ساخته شده بودند
- بیشتر چیدمان با propertyهای منطقی (`padding-inline`, `margin-inline`, `inset-inline`) نوشته شده بود

یعنی مشکل فقط این بود که سیگنال `dir` هرگز فعال نمی‌شد.

## ۲. راه‌حل

یک بلاک `<style>` + `<script>` به ابتدای `</head>` در `index.html` تزریق شد.

### رفتار (حالت پیش‌فرض `chat`)

| بخش برنامه | وضعیت |
|---|---|
| سایدبار، تب‌ها، پنل‌های کناری، Settings و... | مثل قبل — LTR و دست‌نخورده |
| متن پیام‌های گفتگو (`.chat-markdown`) | هر بلاک متنی (p، li، h1-h6، blockquote، td و...) `dir="auto"` می‌گیرد |
| کامپوزر ورودی (`.ProseMirror`) | `dir="auto"` + `unicode-bidi: plaintext` |
| کد، ترمینال (xterm)، diff، CodeMirror، Monaco، KaTeX | همیشه LTR (CSS قفل شده) |

نکات مهم طراحی (از تجربه چند نسخه قبلی):
- **ریشه (`<html>`) در حالت پیش‌فرض هرگز RTL نمی‌شود** — آینه کردن کل صفحه سایدبار و پنل‌ها را خراب می‌کرد.
- **کانتینر `.chat-markdown` خودش هیچ attribute ای نمی‌گیرد** — چون ممکن است چیدمان flex داشته باشد و فرزندانش به‌هم بریزند. فقط بلاک‌های متنیِ داخلش `dir="auto"` می‌گیرند.
- یک `MutationObserver` تغییرات DOM را زیر نظر دارد و بلاک‌های جدید (مثلاً پیام‌های در حال استریم) را همان لحظه برچسب‌گذاری می‌کند.
- **Sweep دوره‌ای (هر ۱ ثانیه):** یک حامحکمی است که هر بلاک بدون `dir` را ترمیم می‌کند. این برای سناریویی لازم شد که سشن بعد از بستن و بازکردن مجدد، از مسیر رندر دیگری بازسازی می‌شد و متن‌ها LTR می‌ماندند. کانتینر سطح پیام (`.workspace-message-surface` و `.chat-content-lane`) هم به فهرست کانتینرها اضافه شد تا مسیرهای رندر متفاوت پوشش داده شوند.
- نوشتن attribute ها فقط وقتی انجام می‌شود که مقدار موجود نباشد (`hasAttribute`) تا حین استریم بار اضافه روی DOM نیافتد.
- **پوشش متن‌های ساده (Text-Leaf):** علاوه بر بلاک‌های استاندارد، `div`/`span`/`a`هایی که فقط متن یا محتوای inline دارند هم `dir="auto"` می‌گیرند — چون پیام کاربر، خلاصه‌های thinking و متن ابزارها معمولاً داخل div ساده رندر می‌شوند نه `<p>`. برای اطمینان از خراب نشدن چیدمان، کانتینرهای flex/grid از این قاعده مستثنی هستند.

### تنظیم جهت

کلید `t3code:ui-direction` در localStorage (از DevTools با Ctrl+Shift+I):

```js
localStorage.setItem("t3code:ui-direction", "chat"); location.reload(); // پیش‌فرض: فقط محتوای گفتگو
localStorage.setItem("t3code:ui-direction", "rtl");  location.reload(); // کل رابط RTL
localStorage.setItem("t3code:ui-direction", "ltr");  location.reload(); // کاملاً غیرفعال
localStorage.setItem("t3code:ui-direction", "auto"); location.reload(); // تشخیص خودکار مرورگر
```

## ۳. فایل‌های این پروژه

| فایل | کاربرد |
|---|---|
| `rtl-inject.snippet.html` | بلاک تزریق‌شده به `index.html` (تنها محتوای واقعی پچ) |
| `install-rtl-patch.mjs` | نصب‌کننده قابل‌حمل — روی هر سیستمی اجرا می‌شود |
| `apply-rtl-patch.mjs` | نسخه اولیه اسکریپت نصب (مسیرهای هاردکد — دیگر لازم نیست) |
| `verify-patch.mjs` | صحت‌سنجی آرشیو نصب‌شده |
| `README-RTL-PATCH.md` | همین فایل |

## ۴. نصب روی سیستم دیگر

### پیش‌نیازها
- [Node.js](https://nodejs.org) نسخه ۱۸ یا بالاتر (npm همراهش نصب می‌شود)
- برنامه DeepAI Code نصب‌شده باشد
- **برنامه را قبل از اجرای اسکریپت ببندید** (بعداً یک بار هم ری‌استارت لازم است)

### مراحل نصب

1. این سه فایل را کنار هم کپی کنید (مثلاً در `Desktop\rtl-patch`):
   - `install-rtl-patch.mjs`
   - `rtl-inject.snippet.html`
   - `README-RTL-PATCH.md` (اختیاری)

2. PowerShell یا CMD را باز کنید و اجرا کنید:

   ```powershell
   cd "$env:USERPROFILE\Desktop\rtl-patch"
   node install-rtl-patch.mjs
   ```

   اسکریپت خودش مسیر نصب را پیدا می‌کند:
   `%LOCALAPPDATA%\Programs\deepai-code-desktop\resources\server.asar`

   اگر برنامه در مسیر دیگری نصب شده، مسیر پوشه `resources` را به‌صورت آرگومان بدهید:

   ```powershell
   node install-rtl-patch.mjs "D:\Apps\deepai-code-desktop\resources"
   ```

3. صبر کنید تا `DONE` چاپ شود (حدود ۱ تا ۲ دقیقه — استخراج و بسته‌بندی ~۲۰۰MB).

4. **برنامه DeepAI Code را باز کنید** — تمام.

### خروجی مورد انتظار

```
[rtl-patch] installing to: C:\Users\...\resources
[rtl-patch] ensuring @electron/asar is installed (npm) ...
[rtl-patch] extracting archive ...
[rtl-patch] index.html patched
[rtl-patch] packing ...
[rtl-patch] verification: total=15515 unpacked=26
[rtl-patch] round-trip content check OK
[rtl-patch] server.asar installed
[rtl-patch] DONE. Restart DeepAI Code to activate the RTL patch.
```

### اسکریپت در پشت صحنه چه می‌کند؟

1. کل `server.asar` را به پوشه موقت استخراج می‌کند
2. اسنیپت RTL را قبل از `</head>` در `apps/server/dist/client/index.html` درج می‌کند
3. آرشیو را دوباره می‌بندد (فایل‌های `.node/.exe/.dll/.so` مثل قبل در `server.asar.unpacked` جدا می‌مانند)
4. صحت آرشیو جدید را تأیید می‌کند (تعداد فایل‌ها + محتوای پچ‌شده)
5. از آرشیو قبلی در همان پوشه resources بکاپ می‌گیرد (`server.asar.bak-YYYYMMDD`)
6. آرشیو جدید را جایگزین می‌کند

اجرای مجدد اسکریپت بی‌خطر است (idempotent).

## ۵. عیب‌یابی

**پچ فعال نشده (چیزی RTL نشد):**
- برنامه را کامل ببندید و دوباره باز کنید (یکبار ری‌استارت الزامی است).
- در DevTools بررسی کنید:
  ```js
  document.querySelectorAll(".chat-markdown p[dir]").length  // باید > 0 باشد
  ```

**سایدبار/پنل کناری به‌هم‌ریخت:**
- احتمالاً حالت `rtl` (کل رابط) فعال است. برگردانید به `chat`:
  ```js
  localStorage.setItem("t3code:ui-direction", "chat"); location.reload();
  ```

**بعد از آپدیت برنامه، RTL از کار افتاد:**
- آپدیت‌های برنامه `server.asar` را بازنویسی می‌کنند؛ کافی است اسکریپت نصب را دوباره اجرا کنید.

**نصب با خطا مواجه شد (`</head> marker not found`):**
- نسخه جدید برنامه ساختار `index.html` را عوض کرده. باید اسنیپت را با نسخه جدید هماهنگ کنید — مارکر `</head>` یا `<title>` را در فایل استخراج‌شده چک کنید.

## ۶. بازگردانی (Rollback)

بکاپ‌ها در پوشه resources کنار خود آرشیو هستند:

```
%LOCALAPPDATA%\Programs\deepai-code-desktop\resources\server.asar.bak-YYYYMMDD
%LOCALAPPDATA%\Programs\deepai-code-desktop\resources\server.asar.unpacked.bak-YYYYMMDD   (فقط اگر جایگزین شده باشد)
```

برای بازگردانی: برنامه را ببندید، فایل بکاپ را روی `server.asar` کپی کنید (بازنویسی) و برنامه را باز کنید:

```powershell
$R = "$env:LOCALAPPDATA\Programs\deepai-code-desktop\resources"
Copy-Item "$R\server.asar.bak-YYYYMMDD" "$R\server.asar" -Force
```

## ۷. نکته فنی برای توسعه‌دهندگان

- پچ فقط یک فایل از `server.asar` را تغییر می‌دهد؛ بقیه آرشیو byte-to-byte یکسان بازسازی می‌شود.
- فایل‌های unpacked (باینری‌های native) با الگوی `**/*.{node,exe,dll,so}` دوباره جدا بسته‌بندی می‌شوند.
- در حال حاضر هیچ مکانیزم آپدیت خودکاری وجود ندارد؛ هر آپدیت برنامه نیاز به اجرای مجدد اسکریپت دارد.
- اگر روزی توسعه‌دهنده برنامه `dir` یا تنظیم زبان را خودش اضافه کرد، این پچ را می‌توان حذف کرد (بخش Rollback بالا).
