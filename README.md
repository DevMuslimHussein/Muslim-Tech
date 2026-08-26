# مسلم تك — Muslim Tech

منصة تعليمية: تطبيق ويب للطلاب (نواة تطبيق Desktop المستقبلي) + لوحة إدارة + API. راجع [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) لتفاصيل العمارة والتصميم الكاملة.

## المتطلبات

- Node.js ≥ 20، pnpm (`npm install -g pnpm`)
- PostgreSQL
- Rust + Tauri CLI — مطلوب فقط عند تحويل `apps/student` لتطبيق Desktop عبر Tauri

## الإعداد

```bash
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/student/.env.example apps/student/.env
# عدّل DATABASE_URL في apps/api/.env حسب اتصال Postgres لديك

cd apps/api
pnpm prisma:generate
pnpm prisma migrate deploy   # أو migrate dev في بيئة تفاعلية
pnpm prisma:seed             # ينشئ حساب Admin أولي من ADMIN_EMAIL/ADMIN_PASSWORD في .env
```

## التشغيل

**أمر واحد يشغّل كل شي** (يتحقق من قاعدة البيانات ويشغّلها إذا كانت متوقفة، ثم يشغّل API + الإدارة + تطبيق الطالب معًا):

```bash
pnpm dev
```

- API: http://localhost:4000
- لوحة الإدارة: http://localhost:3000
- تطبيق الطالب: http://localhost:3001

لإيقاف الكل: `Ctrl+C` مرة واحدة بنفس الترمنال.

أو كل تطبيق لحاله عند الحاجة:

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:student
```

## هيكل المشروع

```
apps/
  api/      # NestJS — REST API + Prisma + تخزين ملفات محلي
  admin/    # Next.js — لوحة الإدارة
  student/  # Next.js — تطبيق الطالب (سيُحوَّل لاحقًا إلى Tauri Desktop)
packages/
  types/    # أنواع TypeScript مشتركة
  ui/       # Design tokens ونظام التصميم المشترك
  config/   # إعدادات TypeScript/ESLint مشتركة
infra/      # Docker وإعدادات النشر
docs/       # وثائق العمارة
```

## الحالة الحالية

- ✅ نظام التصميم (ألوان، خطوط، تدرّجات، رسوم بيانية، Dark/Light، RTL) — مطبّق في التطبيقين
- ✅ Prisma schema + قاعدة بيانات حقيقية تعمل
- ✅ Auth: تسجيل دخول (يوزر أو إيميل)، تسجيل ذاتي للطلاب (Sign Up)، تحديث الجلسة، تسجيل خروج، استعادة كلمة المرور
- ✅ إدارة المحتوى: المواد ← الفصول ← المحاضرات (فيديو + ملفات + نشر) — API + لوحة الإدارة، مع صفحة "إدارة المحاضرات" المستقلة
- ✅ الإعلانات — API + لوحة الإدارة + عرض للطالب
- ✅ سجل الطلاب (بحث، إيقاف/تفعيل، حذف) — لوحة الإدارة
- ✅ مركز تنبيهات حقيقي (فوري، مقروء/غير مقروء) — يُرسل تلقائيًا عند نشر محاضرة/إعلان، أو يدويًا من الإدارة
- ✅ تقدّم الطالب: استئناف المشاهدة، نسبة الإكمال، المحفوظات (Bookmarks)
- ✅ لوحة تحكم إدارية بإحصائيات ورسوم بيانية وسجل نشاط (Audit Log)
- ✅ إعدادات الحساب الشخصي (صورة، بيانات، كلمة مرور) — بالإدارة والطالب
- ✅ تطبيق الطالب: تسجيل حساب، دخول، رئيسية، تصفح المواد، مشاهدة محاضرة (Focus Mode)، إعلانات
- ⏳ تحويل `apps/student` إلى تطبيق Desktop عبر Tauri
- ⏳ تخزين الملفات محليًا حاليًا — الانتقال إلى Cloudflare R2/Stream عند توفر حساب
