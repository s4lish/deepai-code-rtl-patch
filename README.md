# DeepAI Code RTL Patch

پشتیبانی از زبان فارسی (RTL) برای برنامه دسکتاپ **DeepAI Code** — بدون دست‌زدن به هیچ فایل اجرایی برنامه.

> **English:** A small community patch that adds Persian/RTL support to the DeepAI Code desktop app. It injects a tiny script + stylesheet into the app's client `index.html` inside `server.asar`. No binaries or app logic are modified. See [README-RTL-PATCH.md](README-RTL-PATCH.md) for full technical details.

---

## چطور کار می‌کند؟

- فایل `apps/server/dist/client/index.html` داخل `server.asar` برنامه هاردکد `<html lang="en">` بود و هیچ‌جا `dir` ست نمی‌شد
- CSS برنامه (Tailwind v4) از قبل RTL-aware بود؛ فقط سیگنال `dir` فعال نبود
- این پچ یک `<script>` + `<style>` کوچک به همان فایل تزریق می‌کند:
  - **متن پیام‌های گفتگو** → هر پاراگراف `dir="auto"` می‌گیرد (فارسی RTL، انگلیسی LTR)
  - **کامپوزر ورودی** → `dir="auto"` + `unicode-bidi: plaintext`
  - **کد، ترمینال، diff، فرمول** → همیشه LTR
  - **سایدبار، تنظیمات، پنل‌های کناری** → کاملاً دست‌نخورده (LTR مثل قبل)
  - یک **sweep هر ثانیه + MutationObserver** پیام‌های جدید/بازیابی‌شده را ترمیم می‌کند

## نصب سریع

پیش‌نیاز: [Node.js](https://nodejs.org) 18+ — برنامه DeepAI Code بسته باشد.

```powershell
# فایل‌های install-rtl-patch.mjs و rtl-inject.snippet.html را کنار هم کپی کنید
node install-rtl-patch.mjs
```

اسکریپت مسیر نصب را خودش پیدا می‌کند، از آرشیو بکاپ می‌گیرد (`server.asar.bak-تاریخ`)، پچ را اعمال و صحت‌سنجی می‌کند. سپس برنامه را باز کنید.

راهنمای قدم‌به‌قدم ساده‌تر: [GUIDE-INSTALL.md](GUIDE-INSTALL.md)

## فایل‌ها

| فایل | نقش |
|---|---|
| `install-rtl-patch.mjs` | اسکریپت نصب قابل‌حمل (استخراج → پچ → بسته‌بندی → صحت‌سنجی → بکاپ) |
| `rtl-inject.snippet.html` | محتوای واقعی پچ (script + style) |
| `disable-auto-updates.mjs` | کنترل آپدیت خودکار برنامه (`off` / `on` / `status`) |
| `README-RTL-PATCH.md` | مستندات فنی کامل + عیب‌یابی + بازگردانی |
| `GUIDE-INSTALL.md` | راهنمای نصب ساده |

## جلوگیری از آپدیت خودکار (که پچ را پاک می‌کند)

آپدیت خودکار برنامه، `server.asar` را بازنویسی می‌کند و پچ را حذف می‌کند. خود برنامه یک راه رسمی برای این کار دارد — متغیر محیطی `T3CODE_DISABLE_AUTO_UPDATE`:

```powershell
node disable-auto-updates.mjs off      # غیرفعال کردن آپدیت خودکار
node disable-auto-updates.mjs on       # دوباره فعال کردن (برای آپدیت دستی)
node disable-auto-updates.mjs status   # وضعیت فعلی
```

بعد از تغییر، برنامه باید کامل بسته و باز شود (اگر اعمال نشد، یک بار از حساب ویندوز خارج و وارد شوید). برای آپدیت دستی: `on` → آپدیت برنامه → `off` → دوباره پچ RTL را نصب کنید.

## تنظیم جهت

در DevTools برنامه (Ctrl+Shift+I):

```js
localStorage.setItem("t3code:ui-direction", "chat"); location.reload(); // پیش‌فرض: فقط محتوای گفتگو
localStorage.setItem("t3code:ui-direction", "rtl");  location.reload(); // کل رابط
localStorage.setItem("t3code:ui-direction", "ltr");  location.reload(); // غیرفعال
```

## نکته‌ها

- بعد از هر **آپدیت خود برنامه**، پچ از بین می‌رود — فقط دوباره اسکریپت را اجرا کنید
- اجرای مجدد اسکریپت بی‌خطر است (idempotent)
- بازگردانی: فایل `server.asar.bak-YYYYMMDD` را روی `server.asar` کپی کنید
- تست‌شده روی Windows؛ در macOS/Linux هم باید کار کند (مسیر resources متفاوت است — با آرگومان مسیر به اسکریپت بدهید)

## محدودیت‌ها

- این پچ غیررسمی است و وابسته به ساختار فعلی `server.asar` است؛ با تغییر ساختار در نسخه‌های بعدی برنامه ممکن است نیاز به به‌روزرسانی داشته باشد
- اگر توسعه‌دهنده برنامه روزی RTL را رسمی اضافه کند، این پچ را حذف کنید
