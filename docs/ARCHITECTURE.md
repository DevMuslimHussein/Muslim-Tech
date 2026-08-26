# مسلم تك — Muslim Tech
## Product Architecture & Development Plan (v0.1 مسودة)
تاريخ: 2026-08-25

النسخة الكاملة والمصممة بصريًا من هذه الوثيقة منشورة كـ Artifact: راجع رسالة المحادثة للرابط. هذا الملف نسخة نصية دائمة للرجوع إليها داخل المشروع.

---

## 1. التقنيات (Tech Stack)

| الطبقة | الاختيار | السبب |
|---|---|---|
| Desktop | Tauri 2 + React + TypeScript | حجم صغير، ذاكرة أقل، Updater موقّع مدمج |
| لوحة الإدارة | Next.js 15 + React + TypeScript | نشر مستقل، يعيد استخدام نظام التصميم |
| Backend | NestJS (Node.js + TypeScript) | Guards/Pipes جاهزة لـ RBAC، لغة موحّدة عبر المشروع |
| DB | PostgreSQL + Prisma ORM | علاقات واضحة، فهرسة قوية |
| ملفات | Cloudflare R2 | S3-compatible، بدون رسوم إخراج |
| فيديو | Cloudflare Stream | HLS تلقائي، روابط موقّعة |
| Realtime | WebSocket (NestJS Gateway) | تنبيهات لحظية |
| استضافة | VPS (Hetzner/DigitalOcean) + Docker | تحكم بالتكلفة والبيانات |

**Tauri فاز على Electron/Flutter** بسبب الحجم (~10MB مقابل ~150MB)، استهلاك الذاكرة، الأمان (نواة Rust + Capabilities صريحة)، وإعادة استخدام React مع لوحة الإدارة.

**NestJS فاز على Laravel/ASP.NET Core** لأن TypeScript موحّدة عبر الواجهات والخادم تتيح أنواعًا مشتركة (`packages/types`) وتقليل أخطاء الاختلاف بين اللغات.

---

## 2. الهوية البصرية

**الألوان:** لون تمييز واحد — أخضر زيتوني داكن مطفأ.

- Off-white (خلفية فاتحة): `#FAF9F5`
- Ink (نص أساسي): `#1C1A16`
- Ink Soft (نص ثانوي): `#57534A`
- Surface 2 (بطاقات): `#F3F1EA`
- Border: `#E7E3D9`
- Accent (أخضر زيتوني): `#0E5B45`
- Dark BG: `#131210` / Dark Accent: `#49AA88`

**الخطوط:** عائلة IBM Plex الموحّدة لضمان توازن الوزن بين العربية والإنجليزية:
- `IBM Plex Sans Arabic` — عناوين ونصوص عربية
- `IBM Plex Sans` — نصوص لاتينية وواجهة
- `IBM Plex Mono` — كود، أرقام إصدار، بيانات جدولية

**قواعد التخطيط:** Cards عند الحاجة فقط، Focus Mode لمشاهدة المحاضرة، حركة وظيفية فقط (Fade 200ms، Skeleton بدل Spinner).

---

## 3. خريطة المعلومات

**تطبيق الطالب:** تسجيل الدخول → الرئيسية → المواد ← الفصول ← المحاضرات → مشاهدة (Focus Mode) → الإعلانات → مركز التنبيهات → البحث → الحساب.

**لوحة الإدارة:** تسجيل الدخول → Dashboard → إدارة الطلاب → إدارة المواد/الفصول → إدارة المحاضرات (رفع/جدولة/Draft-Publish) → إدارة الإعلانات → إدارة التنبيهات → إصدارات التطبيق.

---

## 4. عمارة النظام

Client (Desktop Tauri + Admin Next.js) ⇄ REST+JWT ⇄ NestJS API ⇄ PostgreSQL
Desktop ⇄ WSS ⇄ WebSocket Gateway (تنبيهات لحظية)
API يُصدر روابط موقّعة إلى Cloudflare R2 (ملفات) وCloudflare Stream (فيديو HLS) — العميل يحمّل/يبث مباشرة من الحافة (Edge) دون المرور بالخادم.

---

## 5. قاعدة البيانات — الجداول الأساسية

- `users` — id, full_name, email, phone, password_hash, avatar_url, role[student|admin], status[active|suspended], created_at, last_login_at
- `subjects` — id, name, description, icon_url, order, is_published
- `chapters` — id, subject_id→subjects, title, order
- `lectures` — id, chapter_id→chapters, title, description, thumbnail_url, video_asset_id, number, status[draft|scheduled|published], publish_at
- `lecture_files` — id, lecture_id→lectures, file_name, file_url, file_type, file_size, is_downloadable, order
- `announcements` — id, title, body, image_url, link_url, publish_at, expires_at, is_active, created_by
- `notifications` — id, title, body, type, deep_link, audience[all|group|user], created_by, created_at
- `notification_reads` — id, notification_id→notifications, user_id→users, read_at
- `watch_progress` — id, user_id→users, lecture_id→lectures, progress_seconds, duration_seconds, completed, updated_at
- `refresh_tokens` — id, user_id→users, token_hash, device_info, ip, expires_at, revoked_at
- `password_resets` — id, user_id→users, token_hash, expires_at, used_at
- `app_releases` — id, platform, version, notes, download_url, signature, is_mandatory, released_at
- `audit_logs` — id, actor_id→users, action, entity_type, entity_id, metadata(jsonb), created_at

`watch_progress` و`notification_reads` موجودة من MVP رغم بساطة واجهتها الحالية — لأن ميزات مستقبلية (شهادات، تحليلات) تُبنى فوقها مباشرة.

---

## 6. نقاط الـ API الرئيسية

- **Auth:** `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me`
- **Subjects/Lectures:** `GET /subjects`, `/subjects/:id/chapters`, `/chapters/:id/lectures`, `/lectures/:id`, `PATCH /lectures/:id/progress`
- **Announcements/Notifications:** `GET /announcements`, `GET /notifications`, `PATCH /notifications/:id/read`, `/notifications/read-all`
- **Search:** `GET /search?q=`
- **Updates:** `GET /updates/latest?platform=windows`
- **Admin:** CRUD كامل تحت `/admin/students`, `/admin/subjects`, `/admin/chapters`, `/admin/lectures` (+ `/publish`, `/upload-url`), `/admin/announcements`, `/admin/notifications/send`

كل نقطة إدارية محمية بـ `JwtAuthGuard` + `RolesGuard(admin)` على الخادم — لا اعتماد على الواجهة للتحقق من الصلاحية.

---

## 7. هيكل المجلدات (Monorepo)

```
muslim-tech/
├─ apps/
│  ├─ desktop/     # Tauri + React
│  ├─ admin/       # Next.js
│  └─ api/         # NestJS
├─ packages/
│  ├─ ui/          # نظام التصميم المشترك
│  ├─ types/       # DTOs مشتركة
│  └─ config/      # eslint/tsconfig/tailwind مشترك
├─ infra/
│  ├─ docker/
│  └─ nginx/
└─ docs/
```

---

## 8. الحسابات والصلاحيات

- كلمات المرور: Argon2id.
- Access Token قصير (15 دقيقة) + Refresh Token (30 يومًا) كـ hash قابل للإبطال.
- أدوار: `student`, `admin` (قابلة للتوسّع لاحقًا).
- Rate limiting على `/auth/*` (5 محاولات/دقيقة).

## 9. الفيديو والملفات

رفع مباشر إلى Cloudflare Stream/R2 عبر روابط موقّعة (لا يمر عبر خادم Nest). تشغيل عبر روابط موقّعة قصيرة الصلاحية تمنع المشاركة خارج التطبيق.

## 10. التنبيهات

نشر محتوى → سجل في `notifications` → بث فوري عبر WebSocket → تحديث Badge دون إعادة تحميل.

## 11. التحديث التلقائي

Tauri updater المدمج: بناء وتوقيع في CI → بيان `latest.json` → فحص هادئ عند الإقلاع → إشعار أنيق → تنزيل خلفي → تثبيت عند إعادة التشغيل.

## 12. النشر

API على VPS (Docker Compose خلف Cloudflare) | لوحة الإدارة على Vercel | تطبيق Desktop عبر GitHub Actions موقّع → صفحة تنزيل + تحديث تلقائي | CI/CD عبر GitHub Actions.

## 13. الأمان

Prisma يمنع SQL Injection · React + تنظيف مدخلات يمنع XSS · SameSite Cookies + CSRF token للوحة الإدارة · روابط موقّعة قصيرة لكل ملف/فيديو · لا أسرار داخل تطبيق Desktop · تحقق صلاحيات من الخادم دائمًا.

## 14. النسخ الاحتياطي والمراقبة

`pg_dump` يومي مشفّر → R2 منفصل (احتفاظ 30 يومًا) + اختبار استعادة ربع سنوي · Versioning على R2 · Sentry لتتبع الأخطاء · `/health` مراقَب خارجيًا · Grafana/Prometheus مؤجّلة لـ V1.

---

## 15. خارطة الطريق

**MVP:** تسجيل دخول، تصفح مواد/محاضرات، مشاهدة/تحميل، إعلانات وتنبيهات أساسية، لوحة إدارة كاملة الوظائف الأساسية، نظام التصميم + Dark/Light + RTL من اليوم الأول.

**V1:** بحث، استئناف المشاهدة، استهداف التنبيهات، تحليلات مبسّطة، تفعيل كامل للتحديث التلقائي الموقّع.

**مستقبلًا:** اختبارات/واجبات/درجات، اشتراكات وأكواد تفعيل، بث مباشر وتعليقات، شهادات، مفضّلة، تنزيل دون اتصال، تطبيق موبايل يعيد استخدام نفس الـ API.
