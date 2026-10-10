# عقود API — Workshop Growth OS

## قواعد عامة
- تبدأ المسارات العامة بـ `/api/v1`.
- JSON بترميز UTF-8، والوقت بصيغة ISO 8601 مع منطقة زمنية.
- كل طلب خاص يتطلب جلسة/رمز مصادقة صالحًا، وتُستخرج هوية المستخدم والورشة من سياق موثوق على الخادم، لا من `workshop_id` يرسله العميل.
- تستخدم المدخلات مخططات تحقق مشتركة، مع رفض الحقول غير المسموح بها.
- الاستجابات لا تكشف stack traces أو SQL أو الأسرار.
- تُستخدم مفاتيح idempotency للعمليات المالية والتحويلات والعمليات التي قد يعاد إرسالها.
- تُوثق العقود بصيغة OpenAPI قبل بناء تطبيق جوال أو تكامل خارجي.

## شكل الاستجابة المقترح
نجاح:
```json
{"data": {}, "meta": {"requestId": "opaque-id"}}
```
خطأ:
```json
{"error": {"code": "VALIDATION_ERROR", "message": "راجع البيانات المدخلة", "fields": {}}, "meta": {"requestId": "opaque-id"}}
```
لا تُعاد بيانات حساسة أو تفاصيل داخلية في رسائل الخطأ.

## موارد API الأساسية
- `GET/POST /api/v1/customers`
- `GET/POST /api/v1/vehicles`
- `GET/POST /api/v1/bookings`
- `GET/POST /api/v1/work-orders`
- `GET /api/v1/work-orders/{id}`
- `POST /api/v1/work-orders/{id}/transitions`
- `GET/POST /api/v1/work-orders/{id}/diagnostic-reports`
- `POST /api/v1/estimates` و`POST /api/v1/estimates/{id}/decisions`
- `POST /api/v1/work-orders/{id}/quality-checks`
- `GET/POST /api/v1/invoices`
- `POST /api/v1/payments`
- `GET /api/v1/reports/operations` و`GET /api/v1/reports/finance`
- `GET/POST /api/v1/diagnostic-imports` لملفات معتمدة الصيغة
- `GET /api/v1/subscription` لمسؤولي الورشة، ومسارات إدارة المنصة منفصلة ومحكومة بدور المنصة.
- `POST /api/v1/referrals/attributions` و`GET /api/v1/referrals/settlements` عند تفعيل وحدة الإحالات.

هذه قائمة موارد أولية وليست عقدًا نهائيًا. يجب توثيق لكل مسار: المخطط، المصادقة، الأدوار، رموز HTTP، حدود المعدل، pagination، idempotency، وأحداث التدقيق قبل التنفيذ.

## حالات HTTP
- `200` قراءة أو تحديث ناجح.
- `201` إنشاء ناجح.
- `202` عملية مقبولة غير متزامنة.
- `400` طلب غير صالح.
- `401` غير مصادق.
- `403` الدور/الملكية غير مسموح بها.
- `404` المورد غير موجود أو غير مرئي للمستخدم.
- `409` تعارض حالة أو تكرار idempotency.
- `422` قواعد مجال غير مستوفاة.
- `429` تجاوز حد الطلبات.
- `500` خطأ داخلي عام مع requestId فقط.

## توافق Android وiPhone
يستهلك تطبيق الجوال نفس API وعقود المجال ولا يصل إلى قاعدة البيانات مباشرة. يلزم لاحقًا اعتماد تجديد الجلسة، وإلغاء الأجهزة، والتخزين المحلي المحدود، ورفع الصور/التقارير، والإشعارات، وإدارة انقطاع الشبكة. أي تغيير كاسر يرفع رقم إصدار API أو يمر بفترة توافق موثقة.
