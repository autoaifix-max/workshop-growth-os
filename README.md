# Workshop Growth OS

منصة SaaS عربية لإدارة ورش صيانة السيارات، مبنية لتكون متعددة الورش وآمنة وقابلة للتوسع، مع استعداد لتطبيقات Android وiPhone عبر API مشترك.

> **الحالة الحالية:** مرحلة تأسيس المنتج والعقود وجرد الأصول. هذا المستودع لا يحتوي بعد على تطبيق تشغيلي. لا تُعامل أي وحدة على أنها جاهزة قبل تنفيذها واختبارها.

## مبادئ التنفيذ
- العربية وRTL وتجربة جوال أولًا.
- عزل بيانات كل ورشة في الخادم وقاعدة البيانات.
- API بإصدار `/api/v1` ومنطق أعمال مستقل عن الواجهة.
- إعادة استخدام الأصول المثبتة بدل تكرار Runtime أو Router أو Auth أو Database.
- عدم اعتماد تكامل جهاز فحص أو WhatsApp قبل إثبات طريقة الربط وشروط المورد.
- لا إطلاق قبل نجاح اختبارات المجال والأمان والبناء وقبول المستخدم.

## الوثائق الأساسية
- [جرد أصول DiagPro](docs/architecture/asset-audit.md)
- [نطاق المنتج](docs/architecture/product-scope.md)
- [عقود API](docs/architecture/api-contracts.md)
- [عزل بيانات الورش](docs/architecture/tenant-isolation.md)
- [سير عمل الوكلاء والتطوير](docs/development/agent-workflow.md)
- [بوابات الاختبار والإطلاق](docs/development/testing-and-release-gates.md)
- [خطة التنفيذ](docs/roadmap/implementation-plan.md)

## الأصول السابقة التي تجري مراجعتها
- [Digital DiagPro](https://github.com/autoaifix-max/digital-diagpro): مرشح لإعادة استخدام تدفقات الورشة بعد مراجعة العزل والأمان.
- [DiagPro Knowledge](https://github.com/autoaifix-max/diagpro-knowledge): مرشح لخدمة معرفة تشخيصية مستقلة.
- [DiagPro Manager V1](https://github.com/ahmedzohaidz/diagpro-manager-v1): يحتاج إلى فحص محلي إضافي قبل الحكم على حالته.

## الخطوة التالية
فحص نسخة محلية كاملة من Digital DiagPro وتشغيل الاختبارات والتحقق من migrations وRLS. بعد ذلك يصدر قرار موثق لكل وحدة: إعادة استخدام، تعديل، أو إعادة بناء.

## الأسرار
لا ترفع ملفات `.env` أو مفاتيح الخدمة أو بيانات العملاء إلى Git. استخدم `.env.example` بقيم وهمية فقط.
