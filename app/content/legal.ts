/**
 * Legal page content — GENERATED from content/legal/*.md, then extended.
 *
 * Structured data (headings, paragraphs, lists) instead of HTML, so the
 * pages render it with plain templates and never use v-html.
 * The token {contact} inside a paragraph is rendered as a link to the
 * contact details (see app/components/LegalDocument.vue).
 *
 * This is a drafting aid, not legal advice. Review with a qualified
 * advisor before launch, and bump LEGAL_LAST_UPDATED on every change.
 */

export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }

export interface LegalSection {
  heading: string
  blocks: LegalBlock[]
}

export interface LegalDoc {
  title: string
  sections: LegalSection[]
}

export type Locale = 'ar' | 'en'

/** ISO date, shown on both pages. Update whenever the text changes. */
export const LEGAL_LAST_UPDATED = '2026-09-21'

export const privacyPolicy: Record<Locale, LegalDoc> = {
  "ar": {
    "title": "سياسة الخصوصية — مُنجِز",
    "sections": [
      {
        "heading": "1. مقدمة",
        "blocks": [
          {
            "type": "p",
            "text": "منصة \"مُنجِز\" (يُشار إليها بـ \"المنصة\" أو \"نحن\") تحترم خصوصية زوارها وعملائها. توضح هذه السياسة ما هي البيانات التي نجمعها، لماذا نجمعها، وكيف نحميها، وذلك بما يتوافق مع نظام حماية البيانات الشخصية الصادر عن الهيئة السعودية لتنظيم البيانات (سدايا)."
          }
        ]
      },
      {
        "heading": "2. البيانات التي نجمعها",
        "blocks": [
          {
            "type": "ul",
            "items": [
              "الاسم الكامل",
              "البريد الإلكتروني",
              "رقم الجوال (اختياري)",
              "اسم الشركة أو الجهة (اختياري)",
              "تفاصيل الطلب التي تكتبها بنفسك في نموذج الطلب",
              "بيانات تقنية أساسية (نوع المتصفح، عنوان IP بشكل مجهّل) لأغراض تحليلية وأمنية فقط"
            ]
          },
          {
            "type": "p",
            "text": "لا نجمع: بيانات دفع مباشرة على الموقع، أو معلومات حساسة غير ضرورية لتنفيذ الخدمة."
          }
        ]
      },
      {
        "heading": "3. الغرض من جمع البيانات",
        "blocks": [
          {
            "type": "p",
            "text": "نستخدم بياناتك حصرًا من أجل:"
          },
          {
            "type": "ol",
            "items": [
              "التواصل معك بخصوص طلبك وتقديم عرض السعر",
              "تنفيذ الخدمة المطلوبة وتسليمها",
              "تحسين جودة المنصة (بيانات مجهّلة فقط)",
              "الامتثال لأي التزام نظامي إن وجد"
            ]
          }
        ]
      },
      {
        "heading": "4. مشاركة البيانات",
        "blocks": [
          {
            "type": "p",
            "text": "لا تتم مشاركة بياناتك مع أي طرف ثالث لأغراض تسويقية أو تجارية. قد يتم استخدام مزودي خدمات تقنية موثوقين (مثل استضافة قاعدة البيانات وخدمة البريد الإلكتروني) فقط لتشغيل المنصة، وهم ملزمون تعاقديًا بحماية بياناتك."
          }
        ]
      },
      {
        "heading": "5. مدة الاحتفاظ بالبيانات",
        "blocks": [
          {
            "type": "p",
            "text": "يُحتفظ بسجلات الطلبات المكتملة لمدة 12 شهرًا كحد أقصى لأغراض المتابعة والدعم، وبعدها تُحذف تلقائيًا ما لم يطلب العميل حذفها مسبقًا."
          }
        ]
      },
      {
        "heading": "6. حقوقك",
        "blocks": [
          {
            "type": "p",
            "text": "يحق لك في أي وقت:"
          },
          {
            "type": "ul",
            "items": [
              "طلب الاطلاع على البيانات المرتبطة بك",
              "طلب تصحيح بيانات غير دقيقة",
              "طلب حذف بياناتك بالكامل عبر التواصل معنا على {contact}"
            ]
          }
        ]
      },
      {
        "heading": "7. الأمان",
        "blocks": [
          {
            "type": "p",
            "text": "تُنقل جميع البيانات عبر اتصال مشفّر (HTTPS)، وتُخزّن في قاعدة بيانات محمية بصلاحيات وصول مقيّدة (Row Level Security)، ولا يمكن لأي طرف غير مخوّل الوصول إليها."
          }
        ]
      },
      {
        "heading": "8. مكان تخزين البيانات",
        "blocks": [
          {
            "type": "p",
            "text": "تُخزَّن بياناتك وملفاتك المرفقة لدى مزوّد استضافة سحابية في مركز بيانات خارج المملكة العربية السعودية (منطقة مومباي، الهند)، لعدم توفر منطقة للمزوّد داخل المملكة حاليًا. يتم هذا النقل بضمانات حماية تشمل التشفير أثناء النقل والتخزين، وحصر الوصول بمسؤول واحد موثّق الهوية."
          }
        ]
      },
      {
        "heading": "9. التواصل",
        "blocks": [
          {
            "type": "p",
            "text": "لأي استفسار يخص هذه السياسة أو بياناتك، راسلنا على: {contact}"
          }
        ]
      }
    ]
  },
  "en": {
    "title": "Privacy Policy — Monjiz",
    "sections": [
      {
        "heading": "Introduction",
        "blocks": [
          {
            "type": "p",
            "text": "Monjiz (\"the platform\", \"we\", \"us\") respects the privacy of its visitors and clients. This policy explains what data we collect, why we collect it, and how we protect it, in alignment with Saudi Arabia's Personal Data Protection Law (PDPL) issued by SDAIA."
          }
        ]
      },
      {
        "heading": "Data We Collect",
        "blocks": [
          {
            "type": "ul",
            "items": [
              "Full name",
              "Email address",
              "Phone number (optional)",
              "Company/organization name (optional)",
              "Request details you provide in the request form",
              "Basic technical data (browser type, anonymized IP) for analytics and security purposes only"
            ]
          },
          {
            "type": "p",
            "text": "We do not collect: Direct payment data on-site, or sensitive information not necessary to fulfill the service."
          }
        ]
      },
      {
        "heading": "Purpose of Collection",
        "blocks": [
          {
            "type": "p",
            "text": "We use your data exclusively to:"
          },
          {
            "type": "ol",
            "items": [
              "Contact you regarding your request and provide a price quote",
              "Deliver the requested service",
              "Improve platform quality (anonymized data only)",
              "Comply with any applicable legal obligation"
            ]
          }
        ]
      },
      {
        "heading": "Data Sharing",
        "blocks": [
          {
            "type": "p",
            "text": "Your data is never shared with third parties for marketing or commercial purposes. Trusted technical service providers (such as database hosting and email delivery) may process data solely to operate the platform, and are contractually bound to protect it."
          }
        ]
      },
      {
        "heading": "Data Retention",
        "blocks": [
          {
            "type": "p",
            "text": "Completed request records are retained for a maximum of 12 months for follow-up and support purposes, after which they are automatically deleted unless the client requests earlier deletion."
          }
        ]
      },
      {
        "heading": "Your Rights",
        "blocks": [
          {
            "type": "p",
            "text": "You have the right, at any time, to:"
          },
          {
            "type": "ul",
            "items": [
              "Request access to the data we hold about you",
              "Request correction of inaccurate data",
              "Request full deletion of your data by contacting us at {contact}"
            ]
          }
        ]
      },
      {
        "heading": "Security",
        "blocks": [
          {
            "type": "p",
            "text": "All data is transmitted over an encrypted connection (HTTPS) and stored in a database protected by restricted access controls (Row Level Security); no unauthorized party can access it."
          }
        ]
      },
      {
        "heading": "8. Where your data is stored",
        "blocks": [
          {
            "type": "p",
            "text": "Your data and attached files are stored with a cloud hosting provider in a data center outside Saudi Arabia (Mumbai region, India), as the provider has no region inside the Kingdom at this time. This transfer is protected by encryption in transit and at rest, and access is restricted to a single authenticated administrator."
          }
        ]
      },
      {
        "heading": "Contact",
        "blocks": [
          {
            "type": "p",
            "text": "For any inquiry regarding this policy or your data, contact us at: {contact}"
          }
        ]
      }
    ]
  }
}

export const termsAndConditions: Record<Locale, LegalDoc> = {
  "ar": {
    "title": "الشروط والأحكام — مُنجِز",
    "sections": [
      {
        "heading": "1. طبيعة الخدمة",
        "blocks": [
          {
            "type": "p",
            "text": "\"مُنجِز\" منصة تربط بين طالبي الخدمة (العملاء) ومزوّدي الخدمة، وتشمل خدمات: البرمجة والتطوير، التصميم الجرافيكي وواجهات المستخدم، التسويق الرقمي والمحتوى، وخدمات الأوفيس. جميع الخدمات تُنفَّذ عن بُعد بالكامل دون أي التزام بحضور شخصي."
          }
        ]
      },
      {
        "heading": "2. آلية الطلب والتسعير",
        "blocks": [
          {
            "type": "ol",
            "items": [
              "يقوم العميل بوصف طلبه بدقة عبر النموذج المخصص",
              "تتم مراجعة الطلب وإرسال عرض سعر عادل يعكس حجم العمل ووقت التسليم",
              "لا يبدأ التنفيذ إلا بعد موافقة العميل الصريحة على السعر والموعد",
              "التسعير مرن وليس ثابتًا، ويُحدَّد حسب طبيعة كل طلب على حدة"
            ]
          }
        ]
      },
      {
        "heading": "3. التسليم والتعديلات",
        "blocks": [
          {
            "type": "p",
            "text": "يُتفق على موعد تسليم محدد عند تأكيد السعر. يحق للعميل طلب تعديلات على العمل المُسلَّم طالما كانت متوافقة مع التفاصيل المتفق عليها في الطلب الأصلي. أي تعديل خارج نطاق الطلب الأصلي يُعامل كطلب جديد وقد يخضع لتسعير إضافي."
          }
        ]
      },
      {
        "heading": "4. مسؤولية المحتوى",
        "blocks": [
          {
            "type": "p",
            "text": "يتحمّل العميل مسؤولية دقة وقانونية المعلومات والمواد التي يزوّد بها المنصة لتنفيذ طلبه. تحتفظ المنصة بحق رفض أي طلب يتعارض مع الأنظمة المعمول بها في المملكة العربية السعودية أو ينطوي على محتوى غير قانوني أو ضار."
          }
        ]
      },
      {
        "heading": "5. الإلغاء",
        "blocks": [
          {
            "type": "p",
            "text": "يحق للعميل إلغاء الطلب قبل بدء التنفيذ الفعلي دون أي التزام مالي. بعد بدء التنفيذ، يُتفق على شروط الإلغاء حسب نسبة العمل المُنجز."
          }
        ]
      },
      {
        "heading": "6. حدود المسؤولية",
        "blocks": [
          {
            "type": "p",
            "text": "تبذل المنصة قصارى جهدها لضمان جودة الأعمال المُسلَّمة، لكنها لا تتحمل مسؤولية أي استخدام لاحق للعميل للعمل المُسلَّم يتعارض مع أنظمة الجهة التي يتعامل معها العميل (مثل جهة عمله أو عملائه)."
          }
        ]
      },
      {
        "heading": "7. القانون الواجب التطبيق",
        "blocks": [
          {
            "type": "p",
            "text": "تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وأي نزاع يُحال إلى الجهات القضائية المختصة داخل المملكة."
          }
        ]
      },
      {
        "heading": "8. التواصل",
        "blocks": [
          {
            "type": "p",
            "text": "لأي استفسار يخص هذه الشروط، راسلنا على: {contact}"
          }
        ]
      }
    ]
  },
  "en": {
    "title": "Terms & Conditions — Monjiz",
    "sections": [
      {
        "heading": "Nature of the Service",
        "blocks": [
          {
            "type": "p",
            "text": "Monjiz is a platform connecting service requesters (clients) with service providers, covering: programming & development, graphic/UI-UX design, digital marketing & content, and office services. All services are delivered fully remotely, with no on-site presence involved."
          }
        ]
      },
      {
        "heading": "Request & Pricing Process",
        "blocks": [
          {
            "type": "ol",
            "items": [
              "The client describes their request precisely via the request form",
              "The request is reviewed and a fair price quote is sent, reflecting scope and delivery timeline",
              "Work does not begin until the client explicitly approves the price and timeline",
              "Pricing is flexible, not fixed, and determined per request"
            ]
          }
        ]
      },
      {
        "heading": "Delivery & Revisions",
        "blocks": [
          {
            "type": "p",
            "text": "A specific delivery date is agreed upon at price confirmation. Clients may request revisions to delivered work as long as they align with the originally agreed scope. Modifications outside the original scope are treated as a new request and may incur additional pricing."
          }
        ]
      },
      {
        "heading": "Content Responsibility",
        "blocks": [
          {
            "type": "p",
            "text": "The client is responsible for the accuracy and legality of information and materials provided to fulfill their request. The platform reserves the right to decline any request that conflicts with applicable laws in the Kingdom of Saudi Arabia or involves unlawful or harmful content."
          }
        ]
      },
      {
        "heading": "Cancellation",
        "blocks": [
          {
            "type": "p",
            "text": "Clients may cancel a request before execution begins with no financial obligation. Once execution has started, cancellation terms are agreed upon based on the proportion of work completed."
          }
        ]
      },
      {
        "heading": "Limitation of Liability",
        "blocks": [
          {
            "type": "p",
            "text": "The platform makes every effort to ensure delivered work quality, but is not liable for any subsequent use by the client that conflicts with the policies of the client's own organization or their clients."
          }
        ]
      },
      {
        "heading": "Governing Law",
        "blocks": [
          {
            "type": "p",
            "text": "These terms are governed by the laws of the Kingdom of Saudi Arabia, and any dispute shall be referred to the competent judicial authorities within the Kingdom."
          }
        ]
      },
      {
        "heading": "Contact",
        "blocks": [
          {
            "type": "p",
            "text": "For any inquiry regarding these terms, contact us at: {contact}"
          }
        ]
      }
    ]
  }
}
